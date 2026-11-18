package com.monitorrede.app

import android.Manifest
import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.location.LocationManager
import android.net.Uri
import android.net.wifi.WifiManager
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

class MainActivity : Activity() {

    private val corFundo = Color.parseColor("#0B1220")
    private val corCard = Color.parseColor("#151F32")
    private val corTexto = Color.parseColor("#E5E7EB")
    private val corSuave = Color.parseColor("#94A3B8")
    private val corVerde = Color.parseColor("#22C55E")
    private val corAmarelo = Color.parseColor("#F59E0B")
    private val corVermelho = Color.parseColor("#EF4444")
    private val corAzul = Color.parseColor("#0EA5E9")

    private lateinit var status: TextView
    private lateinit var corpoDiag: LinearLayout
    private lateinit var corpoConexao: LinearLayout
    private lateinit var corpoVizinhos: LinearLayout
    private lateinit var corpoAparelhos: LinearLayout
    private lateinit var corpoVelocidade: LinearLayout
    private lateinit var corpoHistorico: LinearLayout
    private lateinit var corpoAtalhos: LinearLayout
    private val botoes = mutableListOf<Button>()

    @Volatile private var ocupado = false

    private var con: MinhaConexao? = null
    private var vizinhos: List<RedeVizinha> = emptyList()
    private var aparelhos: List<Aparelho>? = null
    private var vel: ResultadoVelocidade? = null
    private var dns: List<ResultadoDns>? = null

    private val prefs by lazy { getSharedPreferences("monitor", Context.MODE_PRIVATE) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = corFundo
        window.navigationBarColor = corFundo
        montarTela()
        pedirPermissoes()
        atualizarConexaoNaTela()
    }

    override fun onResume() {
        super.onResume()
        if (!ocupado) atualizarConexaoNaTela()
    }

    // ================= Permissões =================

    private fun temLocalizacao() =
        checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED

    private fun pedirPermissoes() {
        val lista = mutableListOf<String>()
        if (!temLocalizacao()) lista += Manifest.permission.ACCESS_FINE_LOCATION
        if (Build.VERSION.SDK_INT >= 33 &&
            checkSelfPermission(Manifest.permission.NEARBY_WIFI_DEVICES) != PackageManager.PERMISSION_GRANTED
        ) lista += Manifest.permission.NEARBY_WIFI_DEVICES
        if (lista.isNotEmpty()) requestPermissions(lista.toTypedArray(), 1)
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        atualizarConexaoNaTela()
        if (!temLocalizacao()) {
            setStatus("Sem a permissão de localização o Android não deixa ver as redes vizinhas nem o nome do seu Wi-Fi. O app não guarda nem envia sua localização.")
        }
    }

    private fun localizacaoLigada(): Boolean {
        if (Build.VERSION.SDK_INT < 28) return true
        val lm = getSystemService(Context.LOCATION_SERVICE) as LocationManager
        return lm.isLocationEnabled
    }

    // ================= Tela =================

    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()

    private fun texto(t: String, tam: Float = 15f, cor: Int = corTexto, negrito: Boolean = false): TextView =
        TextView(this).apply {
            text = t
            textSize = tam
            setTextColor(cor)
            if (negrito) setTypeface(typeface, Typeface.BOLD)
            setLineSpacing(0f, 1.15f)
        }

    private fun fundo(cor: Int, raio: Int = 14) = GradientDrawable().apply {
        setColor(cor); cornerRadius = dp(raio).toFloat()
    }

    private fun botao(t: String, cor: Int = Color.parseColor("#1E293B"), acao: () -> Unit): Button =
        Button(this).apply {
            text = t
            isAllCaps = false
            setTextColor(Color.WHITE)
            textSize = 14f
            background = fundo(cor, 12)
            setPadding(dp(10), dp(10), dp(10), dp(10))
            setOnClickListener { acao() }
        }

    private fun lp(topo: Int = 0, peso: Float = 0f): LinearLayout.LayoutParams =
        if (peso > 0f) LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, peso).apply {
            setMargins(dp(3), dp(topo), dp(3), 0)
        } else LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
            setMargins(0, dp(topo), 0, 0)
        }

    private fun card(raiz: LinearLayout, titulo: String): LinearLayout {
        val c = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = fundo(corCard)
            setPadding(dp(16), dp(14), dp(16), dp(16))
        }
        c.addView(texto(titulo, 18f, Color.WHITE, true))
        val corpo = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        c.addView(corpo, lp(8))
        raiz.addView(c, lp(14))
        return corpo
    }

    private fun montarTela() {
        val scroll = ScrollView(this).apply { setBackgroundColor(corFundo) }
        val raiz = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(16), dp(28), dp(16), dp(40))
        }
        scroll.addView(raiz)

        raiz.addView(texto("Monitor de Rede", 28f, Color.WHITE, true))
        raiz.addView(texto("Wi-Fi, vizinhos, aparelhos e velocidade", 14f, corSuave))

        val principal = botao("VERIFICAR TUDO", corAzul) { verificarTudo() }.apply {
            textSize = 18f; setTypeface(typeface, Typeface.BOLD); setPadding(dp(12), dp(18), dp(12), dp(18))
        }
        botoes += principal
        raiz.addView(principal, lp(18))

        val linha = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        listOf(
            "Vizinhos" to { executar { etapaConexao(); etapaVizinhos(); etapaDiagnostico() } },
            "Aparelhos" to { executar { etapaConexao(); etapaAparelhos(); etapaDiagnostico() } },
            "Velocidade" to { executar { etapaConexao(); etapaVelocidade(); etapaDiagnostico() } }
        ).forEach { (t, a) ->
            val b = botao(t) { a() }
            botoes += b
            linha.addView(b, lp(8, 1f))
        }
        raiz.addView(linha, lp(4))

        status = texto("Toque em VERIFICAR TUDO. Leva cerca de 1 minuto.", 14f, corSuave)
        raiz.addView(status, lp(12))

        corpoDiag = card(raiz, "Diagnóstico: o que está pesando")
        corpoDiag.addView(texto("Ainda não verificado.", 14f, corSuave))
        corpoConexao = card(raiz, "Minha conexão")
        corpoVizinhos = card(raiz, "Redes dos vizinhos e canais")
        corpoVizinhos.addView(texto("Toque em Vizinhos.", 14f, corSuave))
        corpoAparelhos = card(raiz, "Aparelhos conectados na sua rede")
        corpoAparelhos.addView(texto("Toque em Aparelhos.", 14f, corSuave))
        corpoVelocidade = card(raiz, "Velocidade")
        corpoVelocidade.addView(texto("Toque em Velocidade.", 14f, corSuave))
        corpoHistorico = card(raiz, "Histórico de testes")
        corpoAtalhos = card(raiz, "Atalhos e ajustes")
        montarAtalhos()
        mostrarHistorico()

        setContentView(scroll)
    }

    private fun setStatus(t: String) = runOnUiThread { status.text = t }

    private fun setBotoes(ativos: Boolean) = runOnUiThread {
        botoes.forEach { it.isEnabled = ativos; it.alpha = if (ativos) 1f else 0.5f }
    }

    private fun executar(acao: () -> Unit) {
        if (ocupado) return
        ocupado = true
        setBotoes(false)
        Thread {
            try {
                acao()
            } catch (e: Exception) {
                setStatus("Erro: ${e.message}")
            } finally {
                ocupado = false
                setBotoes(true)
            }
        }.start()
    }

    private fun verificarTudo() = executar {
        etapaConexao()
        if (con == null) {
            etapaDiagnostico(); return@executar
        }
        etapaVizinhos()
        etapaAparelhos()
        etapaVelocidade()
        etapaDiagnostico()
        setStatus("Pronto! Veja o diagnóstico abaixo. Faça as correções sugeridas e verifique de novo.")
    }

    // ================= Etapas =================

    private fun atualizarConexaoNaTela() {
        if (ocupado) return
        Thread { etapaConexao() }.start()
    }

    private fun etapaConexao() {
        con = NetTools.lerConexao(this)
        runOnUiThread { mostrarConexao() }
    }

    @Suppress("DEPRECATION")
    private fun etapaVizinhos() {
        if (!temLocalizacao()) {
            runOnUiThread { pedirPermissoes() }
            setStatus("Permita a localização para ver as redes vizinhas.")
            return
        }
        if (!localizacaoLigada()) {
            setStatus("Ligue a Localização (GPS) do celular. O Android exige isso para procurar redes Wi-Fi.")
            runOnUiThread {
                Toast.makeText(this, "Ligue a Localização para ver os vizinhos", Toast.LENGTH_LONG).show()
                startActivity(Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS))
            }
            return
        }
        setStatus("Procurando redes Wi-Fi dos vizinhos…")
        val wm = applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
        val latch = CountDownLatch(1)
        val rec = object : BroadcastReceiver() {
            override fun onReceive(c: Context?, i: Intent?) = latch.countDown()
        }
        val filtro = IntentFilter(WifiManager.SCAN_RESULTS_AVAILABLE_ACTION)
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(rec, filtro, Context.RECEIVER_NOT_EXPORTED)
        else registerReceiver(rec, filtro)
        try {
            if (wm.startScan()) latch.await(12, TimeUnit.SECONDS)
        } finally {
            try { unregisterReceiver(rec) } catch (_: Exception) {}
        }
        vizinhos = NetTools.lerVizinhos(wm, con?.ssid ?: "")
        runOnUiThread { mostrarVizinhos() }
    }

    private fun etapaAparelhos() {
        val c = con ?: return
        setStatus("Procurando aparelhos na rede… 0%")
        val lista = NetTools.descobrirAparelhos(c) { feito, total ->
            if (feito % 10 == 0) setStatus("Procurando aparelhos na rede… ${feito * 100 / total}%")
        }
        // Marca aparelhos novos (comparando com a última verificação)
        val conhecidos = prefs.getStringSet("conhecidos", emptySet()) ?: emptySet()
        val primeira = conhecidos.isEmpty()
        val chaves = mutableSetOf<String>()
        lista.forEach { a ->
            val chave = a.nome ?: a.ip
            chaves += chave
            a.novo = !primeira && chave !in conhecidos && a.ip != c.ip && a.ip != c.gateway
        }
        prefs.edit().putStringSet("conhecidos", conhecidos + chaves).apply()
        aparelhos = lista
        runOnUiThread { mostrarAparelhos(primeira) }
    }

    private fun etapaVelocidade() {
        val c = con ?: run { setStatus("Conecte no Wi-Fi primeiro (o teste não usa seus dados móveis)."); return }
        setStatus("Medindo o Wi-Fi até o roteador…")
        val gw = if (c.gateway.isNotEmpty()) NetTools.ping(c.gateway, 15, 80) else null
        setStatus("Medindo o tempo de resposta da internet…")
        val net = NetTools.ping("1.1.1.1", 15, 443)

        setStatus("Testando download…")
        var carregado: ResultadoPing? = null
        val pinger = Thread {
            try { Thread.sleep(2500) } catch (_: InterruptedException) {}
            carregado = NetTools.ping("1.1.1.1", 12, 443)
        }
        pinger.start()
        val down = NetTools.testeDownload(10, 4) { setStatus("Testando download… ${f0(it)} Mbps") }
        pinger.join(8000)

        setStatus("Testando upload…")
        val up = NetTools.testeUpload(8, 3) { setStatus("Testando upload… ${f0(it)} Mbps") }

        setStatus("Comparando servidores DNS…")
        dns = NetTools.testarDns(c)

        val r = ResultadoVelocidade(gw, net, carregado, down, up)
        vel = r
        salvarHistorico(r)
        runOnUiThread { mostrarVelocidade(); mostrarHistorico() }
    }

    private fun etapaDiagnostico() {
        val achados = Analise.diagnosticar(con, vizinhos, aparelhos, vel, dns, prefs.getInt("plano", 0))
        runOnUiThread { mostrarDiagnostico(achados) }
        if (!status.text.startsWith("Erro")) setStatus("Pronto! Veja o diagnóstico abaixo.")
    }

    // ================= Exibição =================

    private fun corNivel(n: Int) = when (n) {
        0 -> corVerde
        1 -> corAmarelo
        else -> corVermelho
    }

    private fun mostrarDiagnostico(achados: List<Achado>) {
        corpoDiag.removeAllViews()
        val problemas = achados.count { it.nivel == 2 }
        val atencao = achados.count { it.nivel == 1 }
        corpoDiag.addView(
            texto(
                when {
                    problemas > 0 -> "$problemas problema(s) e $atencao ponto(s) de atenção"
                    atencao > 0 -> "Nenhum problema grave, $atencao ponto(s) para melhorar"
                    else -> "Tudo certo com a sua rede 👍"
                }, 15f, corSuave
            )
        )
        achados.forEach { a ->
            val bloco = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                background = fundo(Color.parseColor("#0F172A"), 10)
                setPadding(dp(12), dp(10), dp(12), dp(12))
            }
            val simbolo = when (a.nivel) { 0 -> "✔"; 1 -> "⚠"; else -> "✖" }
            bloco.addView(texto("$simbolo  ${a.titulo}", 15f, corNivel(a.nivel), true))
            bloco.addView(texto(a.detalhe, 14f, corTexto), lp(4))
            if (a.botao != null && a.acao != null) {
                bloco.addView(botao(a.botao, Color.parseColor("#334155")) { abrirAtalho(a.acao) }, lp(8))
            }
            corpoDiag.addView(bloco, lp(10))
        }
    }

    private fun mostrarConexao() {
        corpoConexao.removeAllViews()
        val c = con
        if (c == null) {
            corpoConexao.addView(texto("O celular não está conectado ao Wi-Fi.", 15f, corVermelho))
            corpoConexao.addView(botao("Abrir Wi-Fi") { abrirAtalho("wifi") }, lp(8))
            return
        }
        val nomeRede = if (c.ssid.isBlank() || c.ssid.contains("unknown")) "(permita a localização para ver o nome)" else c.ssid
        val (nivel, q) = Analise.qualidadeSinal(c.rssi)
        corpoConexao.addView(texto(nomeRede, 17f, Color.WHITE, true))
        corpoConexao.addView(texto("Sinal: $q (${c.rssi} dBm)", 15f, corNivel(nivel)), lp(4))
        val linhas = listOf(
            "Faixa: ${NetTools.bandaDe(c.freq)}, canal ${c.canal}",
            "Ligação Wi-Fi: ${c.linkMbps} Mbps",
            "IP do celular: ${c.ip}",
            "Roteador: ${c.gateway}",
            "DNS: " + (c.dnsPrivado?.let { "privado ($it)" } ?: c.dns.joinToString(", "))
        )
        linhas.forEach { corpoConexao.addView(texto(it, 14f, corTexto), lp(2)) }
    }

    private fun barra(valor: Int, max: Int): String {
        val n = if (max <= 0) 0 else (valor * 12 + max - 1) / max
        return "█".repeat(n.coerceAtMost(12))
    }

    private fun mostrarVizinhos() {
        corpoVizinhos.removeAllViews()
        if (vizinhos.isEmpty()) {
            corpoVizinhos.addView(texto("Nenhuma rede encontrada. Ligue a Localização e tente de novo daqui a 30 segundos (o Android limita as buscas).", 14f, corAmarelo))
            return
        }
        val outras = vizinhos.filter { !it.minha }
        corpoVizinhos.addView(texto("${outras.size} redes de vizinhos encontradas", 15f, corTexto, true))

        // 2,4 GHz
        val n24 = Analise.canais24(vizinhos)
        corpoVizinhos.addView(texto("2,4 GHz: melhor canal agora = ${n24.first().canal}", 15f, corVerde, true), lp(10))
        val porCanal24 = outras.filter { it.freq < 3000 }.groupingBy { it.canal }.eachCount()
        val max24 = porCanal24.values.maxOrNull() ?: 0
        for (canal in 1..13) {
            val q = porCanal24[canal] ?: 0
            if (q == 0 && canal !in listOf(1, 6, 11)) continue
            val minhaAqui = vizinhos.any { it.minha && it.freq < 3000 && it.canal == canal }
            corpoVizinhos.addView(
                texto(
                    "Canal ${canal.toString().padStart(2)}  ${barra(q, max24).padEnd(12)} $q" + if (minhaAqui) "  ← sua rede" else "",
                    13f, if (minhaAqui) corAzul else corSuave
                ).apply { typeface = Typeface.MONOSPACE }
            )
        }

        // 5 GHz
        val tem5 = vizinhos.any { it.freq > 5000 }
        if (tem5) {
            val n5 = Analise.canais5(vizinhos)
            corpoVizinhos.addView(
                texto("5 GHz: melhores canais = ${n5.take(3).joinToString(", ") { it.canal.toString() }}", 15f, corVerde, true), lp(12)
            )
            val porCanal5 = outras.filter { it.freq in 5000..5925 }.groupingBy { it.canal }.eachCount()
            val max5 = porCanal5.values.maxOrNull() ?: 0
            porCanal5.keys.union(vizinhos.filter { it.minha && it.freq > 5000 }.map { it.canal }).sorted().forEach { canal ->
                val q = porCanal5[canal] ?: 0
                val minhaAqui = vizinhos.any { it.minha && it.freq > 5000 && it.canal == canal }
                corpoVizinhos.addView(
                    texto(
                        "Canal ${canal.toString().padStart(3)} ${barra(q, max5).padEnd(12)} $q" + if (minhaAqui) "  ← sua rede" else "",
                        13f, if (minhaAqui) corAzul else corSuave
                    ).apply { typeface = Typeface.MONOSPACE }
                )
            }
        }

        corpoVizinhos.addView(texto("Redes perto de você (mais forte primeiro):", 14f, corTexto, true), lp(12))
        vizinhos.take(30).forEach { v ->
            val forca = when {
                v.rssi >= -60 -> "forte"
                v.rssi >= -75 -> "média"
                else -> "fraca"
            }
            corpoVizinhos.addView(
                texto(
                    (if (v.minha) "★ " else "• ") + "${v.ssid}\n   ${NetTools.bandaDe(v.freq)} • canal ${v.canal} • ${v.largura} MHz • ${v.rssi} dBm ($forca)",
                    13f, if (v.minha) corAzul else corTexto
                ), lp(4)
            )
        }
        corpoVizinhos.addView(texto("Redes fortes no mesmo canal que o seu atrapalham mais. Na rede 5 GHz quase não há disputa.", 13f, corSuave), lp(10))
    }

    private fun mostrarAparelhos(primeira: Boolean) {
        corpoAparelhos.removeAllViews()
        val lista = aparelhos ?: return
        corpoAparelhos.addView(texto("${lista.size} aparelhos encontrados", 15f, corTexto, true))
        if (primeira) corpoAparelhos.addView(texto("Primeira verificação: lista salva. Nas próximas, aparelhos novos aparecem marcados como NOVO.", 13f, corSuave), lp(4))
        lista.forEach { a ->
            val bloco = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                background = fundo(Color.parseColor("#0F172A"), 10)
                setPadding(dp(12), dp(8), dp(12), dp(10))
            }
            val cab = (if (a.novo) "🆕 NOVO  " else "") + a.tipo
            bloco.addView(texto(cab, 14f, if (a.novo) corAmarelo else Color.WHITE, true))
            bloco.addView(texto("IP ${a.ip}" + (a.nome?.let { " • $it" } ?: ""), 13f, corTexto))
            if (a.portas.isNotEmpty()) bloco.addView(texto("Serviços abertos: ${a.portas.joinToString(", ")}", 12f, corSuave))
            corpoAparelhos.addView(bloco, lp(8))
        }
        corpoAparelhos.addView(
            texto(
                "Celulares modernos escondem o nome e alguns não respondem, então podem ficar de fora. Para a lista completa com nomes, veja \"Lista de dispositivos\" no roteador.",
                13f, corSuave
            ), lp(10)
        )
        corpoAparelhos.addView(botao("Ver lista no roteador") { abrirAtalho("roteador") }, lp(8))
    }

    private fun mostrarVelocidade() {
        corpoVelocidade.removeAllViews()
        val r = vel ?: return
        corpoVelocidade.addView(texto("⬇ Download: ${f1(r.download)} Mbps", 20f, Color.WHITE, true))
        corpoVelocidade.addView(texto("⬆ Upload: ${f1(r.upload)} Mbps", 18f, Color.WHITE, true), lp(4))
        r.pingRoteador?.let {
            corpoVelocidade.addView(
                texto("Celular → roteador: ${f0(it.media)} ms (variação ${f0(it.jitter)} ms, perda ${it.perda}%)", 14f, corTexto), lp(10)
            )
        }
        val n = r.pingInternet
        corpoVelocidade.addView(texto("Celular → internet: ${f0(n.media)} ms (variação ${f0(n.jitter)} ms, perda ${n.perda}%)", 14f, corTexto), lp(4))
        r.pingCarregado?.let {
            val nota = if (n.ok && it.ok) " • nota ${Analise.notaTravamento(it.media, n.media)}" else ""
            corpoVelocidade.addView(texto("Com a rede cheia (durante o download): ${f0(it.media)} ms$nota", 14f, corTexto), lp(4))
        }
        dns?.let { lista ->
            corpoVelocidade.addView(texto("Rapidez do DNS (abre sites mais rápido):", 14f, corTexto, true), lp(10))
            lista.sortedBy { it.ms ?: 9999.0 }.forEach { d ->
                corpoVelocidade.addView(
                    texto("${d.nome} (${d.ip}): " + (d.ms?.let { "${f0(it)} ms" } ?: "sem resposta") + if (d.atual) "  ← em uso" else "", 13f, corSuave)
                )
            }
        }
    }

    // ================= Histórico =================

    private fun salvarHistorico(r: ResultadoVelocidade) {
        val data = SimpleDateFormat("dd/MM HH:mm", Locale("pt", "BR")).format(Date())
        val linha = "$data|${f0(r.download)}|${f0(r.upload)}|${f0(r.pingInternet.media)}"
        val hist = (prefs.getString("historico", "") ?: "").split("\n").filter { it.isNotBlank() }
        val novo = (listOf(linha) + hist).take(20)
        prefs.edit().putString("historico", novo.joinToString("\n")).apply()
    }

    private fun mostrarHistorico() {
        corpoHistorico.removeAllViews()
        val hist = (prefs.getString("historico", "") ?: "").split("\n").filter { it.isNotBlank() }
        if (hist.isEmpty()) {
            corpoHistorico.addView(texto("Nenhum teste ainda. Teste em horários diferentes para descobrir quando a internet piora.", 14f, corSuave))
            return
        }
        corpoHistorico.addView(texto("Data         ⬇Mbps  ⬆Mbps  ms", 13f, corSuave).apply { typeface = Typeface.MONOSPACE })
        hist.forEach { l ->
            val p = l.split("|")
            if (p.size >= 4) corpoHistorico.addView(
                texto("${p[0].padEnd(12)} ${p[1].padStart(5)}  ${p[2].padStart(5)}  ${p[3].padStart(3)}", 13f, corTexto).apply { typeface = Typeface.MONOSPACE }
            )
        }
    }

    // ================= Atalhos =================

    private fun montarAtalhos() {
        corpoAtalhos.addView(texto("Velocidade do seu plano (Mbps):", 14f, corTexto))
        val linha = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
        val campo = EditText(this).apply {
            inputType = InputType.TYPE_CLASS_NUMBER
            setTextColor(Color.WHITE)
            setHintTextColor(corSuave)
            hint = "ex.: 500"
            val p = prefs.getInt("plano", 0)
            if (p > 0) setText(p.toString())
        }
        linha.addView(campo, lp(0, 2f))
        linha.addView(botao("Salvar") {
            val v = campo.text.toString().toIntOrNull() ?: 0
            prefs.edit().putInt("plano", v).apply()
            Toast.makeText(this, if (v > 0) "Plano de $v Mbps salvo" else "Plano apagado", Toast.LENGTH_SHORT).show()
        }, lp(0, 1f))
        corpoAtalhos.addView(linha, lp(4))

        listOf(
            "Abrir configuração do roteador (mwlogin.net)" to "roteador",
            "Abrir aparelho da fibra (192.168.1.1)" to "fibra",
            "Trocar de rede Wi-Fi (use a _5G)" to "wifi",
            "Configurar DNS privado" to "dns"
        ).forEach { (t, a) -> corpoAtalhos.addView(botao(t) { abrirAtalho(a) }, lp(8)) }

        corpoAtalhos.addView(
            texto(
                "Dica: reiniciar o aparelho da fibra e o roteador uma vez por semana ajuda. Desligue os dois, espere 30 s, ligue primeiro a fibra e depois de 1 minuto o roteador.",
                13f, corSuave
            ), lp(12)
        )
    }

    private fun abrirAtalho(acao: String) {
        try {
            when (acao) {
                "roteador" -> startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("http://mwlogin.net")))
                "fibra" -> startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("http://192.168.1.1")))
                "wifi" -> startActivity(
                    if (Build.VERSION.SDK_INT >= 29) Intent(Settings.Panel.ACTION_WIFI) else Intent(Settings.ACTION_WIFI_SETTINGS)
                )
                "dns" -> {
                    Toast.makeText(this, "Procure por \"DNS privado\" e digite one.one.one.one", Toast.LENGTH_LONG).show()
                    startActivity(Intent(Settings.ACTION_WIRELESS_SETTINGS))
                }
            }
        } catch (e: Exception) {
            Toast.makeText(this, "Não foi possível abrir: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    @Suppress("unused")
    private fun esconder(v: View) { v.visibility = View.GONE }
}
