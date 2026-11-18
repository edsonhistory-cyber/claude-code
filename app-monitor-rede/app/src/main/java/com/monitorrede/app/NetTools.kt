package com.monitorrede.app

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.wifi.ScanResult
import android.net.wifi.WifiManager
import android.os.Build
import java.io.ByteArrayOutputStream
import java.net.ConnectException
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.HttpURLConnection
import java.net.Inet4Address
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.Socket
import java.net.SocketTimeoutException
import java.net.URL
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong
import kotlin.math.abs
import kotlin.math.min
import kotlin.random.Random

data class MinhaConexao(
    val ssid: String,
    val bssid: String,
    val rssi: Int,
    val freq: Int,
    val canal: Int,
    val linkMbps: Int,
    val ip: String,
    val prefixo: Int,
    val gateway: String,
    val dns: List<String>,
    val dnsPrivado: String?
)

data class RedeVizinha(
    val ssid: String,
    val bssid: String,
    val rssi: Int,
    val freq: Int,
    val canal: Int,
    val largura: Int,
    val minha: Boolean
)

data class Aparelho(
    val ip: String,
    val nome: String?,
    val tipo: String,
    val portas: List<Int>,
    var novo: Boolean = false
)

data class ResultadoPing(val media: Double, val jitter: Double, val perda: Int, val respostas: Int) {
    val ok get() = respostas > 0
}

data class ResultadoVelocidade(
    val pingRoteador: ResultadoPing?,
    val pingInternet: ResultadoPing,
    val pingCarregado: ResultadoPing?,
    val download: Double,
    val upload: Double
)

data class ResultadoDns(val nome: String, val ip: String, val ms: Double?, val atual: Boolean)

object NetTools {

    private const val URL_DOWN = "https://speed.cloudflare.com/__down?bytes=25000000"
    private const val URL_UP = "https://speed.cloudflare.com/__up"

    // ---------- Wi-Fi ----------

    fun canalDe(freq: Int): Int = when {
        freq == 2484 -> 14
        freq in 2412..2472 -> (freq - 2407) / 5
        freq in 5150..5895 -> (freq - 5000) / 5
        freq in 5955..7115 -> (freq - 5950) / 5
        else -> 0
    }

    fun bandaDe(freq: Int): String = when {
        freq < 3000 -> "2,4 GHz"
        freq < 5925 -> "5 GHz"
        else -> "6 GHz"
    }

    private fun larguraMhz(cw: Int): Int = when (cw) {
        ScanResult.CHANNEL_WIDTH_40MHZ -> 40
        ScanResult.CHANNEL_WIDTH_80MHZ -> 80
        ScanResult.CHANNEL_WIDTH_160MHZ, ScanResult.CHANNEL_WIDTH_80MHZ_PLUS_MHZ -> 160
        else -> 20
    }

    fun baseSsid(s: String): String =
        s.trim().removeSuffix("_5G").removeSuffix("-5G").removeSuffix("_5GHz").removeSuffix("_2.4G").uppercase()

    @Suppress("DEPRECATION")
    fun lerConexao(ctx: Context): MinhaConexao? {
        val app = ctx.applicationContext
        val wm = app.getSystemService(Context.WIFI_SERVICE) as WifiManager
        val cm = app.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        var redeWifi: Network? = null
        for (n in cm.allNetworks) {
            val caps = cm.getNetworkCapabilities(n) ?: continue
            if (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) {
                redeWifi = n; break
            }
        }
        if (redeWifi == null) return null
        val lp = cm.getLinkProperties(redeWifi)
        var ip = ""
        var prefixo = 24
        var gw = ""
        lp?.linkAddresses?.forEach { la ->
            if (la.address is Inet4Address) {
                ip = la.address.hostAddress ?: ""; prefixo = la.prefixLength
            }
        }
        lp?.routes?.forEach { r ->
            val g = r.gateway
            if (r.isDefaultRoute && g is Inet4Address) gw = g.hostAddress ?: ""
        }
        val dns = lp?.dnsServers?.filterIsInstance<Inet4Address>()?.mapNotNull { it.hostAddress } ?: emptyList()
        val dnsPriv = if (Build.VERSION.SDK_INT >= 28 && lp?.isPrivateDnsActive == true)
            (lp!!.privateDnsServerName ?: "automático") else null
        val info = wm.connectionInfo
        val ssid = info?.ssid?.removeSurrounding("\"") ?: ""
        val freq = info?.frequency ?: 0
        return MinhaConexao(
            ssid = ssid,
            bssid = info?.bssid ?: "",
            rssi = info?.rssi ?: -100,
            freq = freq,
            canal = canalDe(freq),
            linkMbps = info?.linkSpeed ?: 0,
            ip = ip,
            prefixo = prefixo,
            gateway = gw,
            dns = dns,
            dnsPrivado = dnsPriv
        )
    }

    @Suppress("DEPRECATION")
    fun lerVizinhos(wm: WifiManager, minhaSsid: String): List<RedeVizinha> {
        val base = baseSsid(minhaSsid)
        return wm.scanResults.map { sr ->
            val s = sr.SSID ?: ""
            RedeVizinha(
                ssid = if (s.isBlank()) "(rede oculta)" else s,
                bssid = sr.BSSID ?: "",
                rssi = sr.level,
                freq = sr.frequency,
                canal = canalDe(sr.frequency),
                largura = larguraMhz(sr.channelWidth),
                minha = base.isNotEmpty() && s.isNotBlank() && baseSsid(s) == base
            )
        }.sortedByDescending { it.rssi }
    }

    // ---------- Ping ----------

    private fun calcular(tempos: List<Double>, enviados: Int): ResultadoPing {
        if (tempos.isEmpty()) return ResultadoPing(0.0, 0.0, 100, 0)
        val media = tempos.average()
        val jitter = if (tempos.size > 1) tempos.zipWithNext { a, b -> abs(a - b) }.average() else 0.0
        val perda = ((enviados - tempos.size).coerceAtLeast(0) * 100) / enviados
        return ResultadoPing(media, jitter, perda, tempos.size)
    }

    fun ping(host: String, n: Int = 10, portaTcp: Int = 443): ResultadoPing {
        try {
            val p = ProcessBuilder("/system/bin/ping", "-c", "$n", "-i", "0.3", "-W", "1", "-w", "${n + 3}", host)
                .redirectErrorStream(true).start()
            val saida = p.inputStream.bufferedReader().readText()
            p.waitFor()
            val tempos = Regex("time[=<]([0-9.]+)").findAll(saida).map { it.groupValues[1].toDouble() }.toList()
            if (tempos.isNotEmpty() || saida.contains("transmitted")) return calcular(tempos, n)
        } catch (_: Exception) {
        }
        // Alternativa: tempo de conexão TCP
        val tempos = mutableListOf<Double>()
        repeat(n) {
            val t0 = System.nanoTime()
            if (tcpResponde(host, portaTcp, 1000)) tempos += (System.nanoTime() - t0) / 1e6
            try { Thread.sleep(200) } catch (_: InterruptedException) {}
        }
        return calcular(tempos, n)
    }

    // ---------- Velocidade ----------

    private fun medir(segundos: Int, fluxos: Int, prog: (Double) -> Unit, trabalho: (AtomicLong, Long) -> Unit): Double {
        val total = AtomicLong(0)
        val inicio = System.nanoTime()
        val fim = inicio + segundos * 1_000_000_000L
        val aquecimento = inicio + 1_500_000_000L
        val threads = List(fluxos) {
            Thread {
                while (System.nanoTime() < fim) {
                    try {
                        trabalho(total, fim)
                    } catch (_: Exception) {
                        try { Thread.sleep(300) } catch (_: InterruptedException) {}
                    }
                }
            }
        }
        threads.forEach { it.isDaemon = true; it.start() }
        var marcoT = 0L
        var marcoB = 0L
        var finalMbps = 0.0
        while (System.nanoTime() < fim) {
            Thread.sleep(400)
            val agora = System.nanoTime()
            if (marcoT == 0L && agora >= aquecimento) {
                marcoT = agora; marcoB = total.get()
            }
            val t0 = if (marcoT != 0L) marcoT else inicio
            val b0 = if (marcoT != 0L) marcoB else 0L
            val dt = (agora - t0) / 1e9
            if (dt > 0.3) {
                finalMbps = (total.get() - b0) * 8 / dt / 1e6
                prog(finalMbps)
            }
        }
        threads.forEach { it.join(2000) }
        return finalMbps
    }

    fun testeDownload(segundos: Int = 10, fluxos: Int = 4, prog: (Double) -> Unit): Double =
        medir(segundos, fluxos, prog) { total, fim ->
            val c = URL(URL_DOWN).openConnection() as HttpURLConnection
            c.connectTimeout = 5000; c.readTimeout = 5000
            c.useCaches = false
            try {
                c.inputStream.use { ins ->
                    val buf = ByteArray(64 * 1024)
                    while (System.nanoTime() < fim) {
                        val r = ins.read(buf)
                        if (r < 0) break
                        total.addAndGet(r.toLong())
                    }
                }
            } finally {
                c.disconnect()
            }
        }

    fun testeUpload(segundos: Int = 8, fluxos: Int = 3, prog: (Double) -> Unit): Double {
        val buf = ByteArray(64 * 1024).also { Random.nextBytes(it) }
        return medir(segundos, fluxos, prog) { total, fim ->
            val tamanho = 20_000_000
            val c = URL(URL_UP).openConnection() as HttpURLConnection
            c.doOutput = true
            c.requestMethod = "POST"
            c.connectTimeout = 5000; c.readTimeout = 10000
            c.setFixedLengthStreamingMode(tamanho)
            c.setRequestProperty("Content-Type", "application/octet-stream")
            try {
                val out = c.outputStream
                var enviado = 0
                while (enviado < tamanho && System.nanoTime() < fim) {
                    val n = min(buf.size, tamanho - enviado)
                    out.write(buf, 0, n)
                    enviado += n
                    total.addAndGet(n.toLong())
                }
                if (enviado >= tamanho) {
                    out.close()
                    c.responseCode
                }
            } finally {
                c.disconnect()
            }
        }
    }

    // ---------- DNS ----------

    private fun montarConsulta(id: Int, nome: String, tipo: Int, recursiva: Boolean): ByteArray {
        val out = ByteArrayOutputStream()
        out.write(id shr 8 and 0xff); out.write(id and 0xff)
        out.write(if (recursiva) 0x01 else 0x00); out.write(0x00)
        out.write(0); out.write(1)
        repeat(6) { out.write(0) }
        for (parte in nome.trimEnd('.').split('.')) {
            val b = parte.toByteArray(Charsets.UTF_8)
            out.write(b.size); out.write(b)
        }
        out.write(0)
        out.write(0); out.write(tipo)
        out.write(0); out.write(1)
        return out.toByteArray()
    }

    private fun u16(b: ByteArray, i: Int): Int = ((b[i].toInt() and 0xff) shl 8) or (b[i + 1].toInt() and 0xff)

    private fun lerNome(buf: ByteArray, inicio: Int, limite: Int): Pair<String, Int> {
        val partes = mutableListOf<String>()
        var pos = inicio
        var saltou = false
        var depois = -1
        var guarda = 0
        while (guarda++ < 128 && pos < limite) {
            val len = buf[pos].toInt() and 0xff
            if (len == 0) { pos++; break }
            if ((len and 0xC0) == 0xC0) {
                val ptr = ((len and 0x3f) shl 8) or (buf[pos + 1].toInt() and 0xff)
                if (!saltou) depois = pos + 2
                saltou = true
                pos = ptr
                continue
            }
            if (pos + 1 + len > limite) break
            partes += String(buf, pos + 1, len, Charsets.UTF_8)
            pos += len + 1
        }
        return partes.joinToString(".") to (if (saltou) depois else pos)
    }

    private fun consultar(servidor: String, porta: Int, nome: String, tipo: Int, timeoutMs: Int): Pair<ByteArray, Int>? {
        try {
            DatagramSocket().use { s ->
                s.soTimeout = timeoutMs
                val id = Random.nextInt(1, 65535)
                val q = montarConsulta(id, nome, tipo, porta == 53)
                s.send(DatagramPacket(q, q.size, InetAddress.getByName(servidor), porta))
                val buf = ByteArray(1500)
                val fim = System.currentTimeMillis() + timeoutMs
                while (System.currentTimeMillis() < fim) {
                    val p = DatagramPacket(buf, buf.size)
                    try {
                        s.receive(p)
                    } catch (e: SocketTimeoutException) {
                        return null
                    }
                    if (p.length >= 12 && u16(buf, 0) == id) return buf to p.length
                }
            }
        } catch (_: Exception) {
        }
        return null
    }

    private fun extrairPtr(buf: ByteArray, len: Int): String? {
        try {
            val qd = u16(buf, 4)
            val an = u16(buf, 6)
            var pos = 12
            repeat(qd) { pos = lerNome(buf, pos, len).second + 4 }
            repeat(an) {
                pos = lerNome(buf, pos, len).second
                val tipo = u16(buf, pos)
                val rdlen = u16(buf, pos + 8)
                pos += 10
                if (tipo == 12) return lerNome(buf, pos, len).first.removeSuffix(".local").ifBlank { null }
                pos += rdlen
            }
        } catch (_: Exception) {
        }
        return null
    }

    fun nomeDoAparelho(ip: String, gateway: String): String? {
        val rev = ip.split(".").reversed().joinToString(".") + ".in-addr.arpa"
        if (gateway.isNotEmpty()) {
            consultar(gateway, 53, rev, 12, 700)?.let { (b, l) -> extrairPtr(b, l)?.let { return it } }
        }
        consultar(ip, 5353, rev, 12, 700)?.let { (b, l) -> extrairPtr(b, l)?.let { return it } }
        return null
    }

    fun tempoDns(servidor: String, dominio: String): Double? {
        val t0 = System.nanoTime()
        consultar(servidor, 53, dominio, 1, 2000) ?: return null
        return (System.nanoTime() - t0) / 1e6
    }

    fun testarDns(con: MinhaConexao): List<ResultadoDns> {
        val servidores = mutableListOf<Pair<String, String>>()
        if (con.gateway.isNotEmpty()) servidores += "Roteador / operadora" to con.gateway
        con.dns.filter { it != con.gateway && it !in listOf("1.1.1.1", "8.8.8.8", "9.9.9.9") }
            .forEach { servidores += "DNS atual" to it }
        servidores += "Cloudflare" to "1.1.1.1"
        servidores += "Google" to "8.8.8.8"
        servidores += "Quad9" to "9.9.9.9"
        val dominios = listOf("google.com", "youtube.com", "instagram.com", "whatsapp.net", "netflix.com", "globo.com", "tiktok.com", "uol.com.br")
        return servidores.map { (nome, ip) ->
            val tempos = dominios.mapNotNull { tempoDns(ip, it) }.sorted()
            val mediana = if (tempos.size >= 3) tempos[tempos.size / 2] else null
            ResultadoDns(nome, ip, mediana, con.dns.contains(ip))
        }
    }

    // ---------- Aparelhos na rede ----------

    private val PORTAS = listOf(80, 443, 22, 53, 139, 445, 554, 631, 1900, 5000, 7000, 8008, 8009, 8080, 8443, 9100, 62078)

    fun tcpResponde(ip: String, porta: Int, timeout: Int): Boolean {
        return try {
            Socket().use { it.connect(InetSocketAddress(ip, porta), timeout) }
            true
        } catch (e: ConnectException) {
            val m = e.message ?: ""
            m.contains("ECONNREFUSED") || m.contains("refused", ignoreCase = true)
        } catch (_: Exception) {
            false
        }
    }

    private fun aberta(ip: String, porta: Int, timeout: Int): Boolean = try {
        Socket().use { it.connect(InetSocketAddress(ip, porta), timeout) }
        true
    } catch (_: Exception) {
        false
    }

    private fun estaVivo(ip: String): Boolean {
        try {
            if (InetAddress.getByName(ip).isReachable(600)) return true
        } catch (_: Exception) {
        }
        return listOf(80, 443, 62078, 445, 8009).any { tcpResponde(ip, it, 250) }
    }

    private fun adivinharTipo(ip: String, nome: String?, portas: List<Int>, con: MinhaConexao): String {
        val n = (nome ?: "").lowercase()
        return when {
            ip == con.gateway -> "Roteador (Mercusys)"
            ip == con.ip -> "Este celular"
            n.contains("iphone") || n.contains("ipad") -> "iPhone / iPad"
            n.contains("macbook") || n.contains("imac") || n.contains("mac-") -> "Computador Mac"
            62078 in portas -> "iPhone / iPad (Apple)"
            n.contains("galaxy") || n.contains("android") || n.contains("samsung") || n.contains("moto") ||
                n.contains("redmi") || n.contains("xiaomi") || n.contains("poco") -> "Celular Android"
            8008 in portas || 8009 in portas -> "TV / Chromecast / caixa de som Google"
            n.contains("tv") || n.contains("roku") || n.contains("fire") || n.contains("webos") -> "TV / TV Box"
            7000 in portas -> "Aparelho Apple (AirPlay)"
            9100 in portas || 631 in portas -> "Impressora"
            554 in portas -> "Câmera / DVR"
            445 in portas || 139 in portas -> "Computador Windows"
            22 in portas -> "Computador / servidor"
            n.contains("desktop") || n.contains("laptop") || n.contains("notebook") || n.contains("pc") -> "Computador"
            80 in portas || 443 in portas || 8080 in portas -> "Aparelho com página web (TV, câmera, repetidor, smart)"
            else -> "Desconhecido (geralmente celular, que esconde tudo)"
        }
    }

    fun descobrirAparelhos(con: MinhaConexao, progresso: (Int, Int) -> Unit): List<Aparelho> {
        val partes = con.ip.split(".")
        if (partes.size != 4) return emptyList()
        val base = "${partes[0]}.${partes[1]}.${partes[2]}."
        val pool = Executors.newFixedThreadPool(48)
        try {
            val feitos = AtomicInteger(0)
            val vivos = ConcurrentLinkedQueue<String>()
            val t1 = (1..254).map { h ->
                pool.submit {
                    val ip = base + h
                    if (ip == con.ip || estaVivo(ip)) vivos.add(ip)
                    progresso(feitos.incrementAndGet(), 254)
                }
            }
            t1.forEach { try { it.get() } catch (_: Exception) {} }
            val resultado = ConcurrentLinkedQueue<Aparelho>()
            val t2 = vivos.map { ip ->
                pool.submit {
                    val portas = if (ip == con.ip) emptyList() else PORTAS.filter { aberta(ip, it, 300) }
                    val nome = if (ip == con.ip) null else nomeDoAparelho(ip, con.gateway)
                    resultado.add(Aparelho(ip, nome, adivinharTipo(ip, nome, portas, con), portas))
                }
            }
            t2.forEach { try { it.get() } catch (_: Exception) {} }
            return resultado.sortedBy { it.ip.substringAfterLast('.').toIntOrNull() ?: 0 }
        } finally {
            pool.shutdownNow()
        }
    }
}
