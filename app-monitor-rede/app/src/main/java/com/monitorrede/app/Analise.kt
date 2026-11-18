package com.monitorrede.app

import java.util.Locale
import kotlin.math.abs
import kotlin.math.max

/** nivel: 0 = tudo certo, 1 = atenção, 2 = problema */
data class Achado(
    val nivel: Int,
    val titulo: String,
    val detalhe: String,
    val botao: String? = null,
    val acao: String? = null
)

data class NotaCanal(val canal: Int, val pontos: Double, val redes: Int)

fun f0(v: Double) = String.format(Locale("pt", "BR"), "%.0f", v)
fun f1(v: Double) = String.format(Locale("pt", "BR"), "%.1f", v)

object Analise {

    private fun peso(rssi: Int): Double = max(0.0, (rssi + 95).toDouble())

    /** Quanto cada canal "livre" de 2,4 GHz (1, 6, 11) está ocupado pelos vizinhos. Menor = melhor. */
    fun canais24(viz: List<RedeVizinha>): List<NotaCanal> {
        val outras = viz.filter { !it.minha && it.freq < 3000 }
        return listOf(1, 6, 11).map { c ->
            var p = 0.0
            var n = 0
            for (v in outras) {
                val d = abs(v.canal - c)
                val alcance = if (v.largura >= 40) 6 else 4
                if (d <= alcance) {
                    p += peso(v.rssi) * (alcance + 1 - d) / (alcance + 1)
                    n++
                }
            }
            NotaCanal(c, p, n)
        }.sortedBy { it.pontos }
    }

    private fun bloco5(c: Int): Int = when (c) {
        in 36..48 -> 1
        in 52..64 -> 2
        in 100..112 -> 3
        in 116..128 -> 4
        in 132..144 -> 5
        in 149..161 -> 6
        else -> 7
    }

    /** Canais de 5 GHz sem radar (DFS), que funcionam em qualquer roteador. Menor = melhor. */
    fun canais5(viz: List<RedeVizinha>): List<NotaCanal> {
        val outras = viz.filter { !it.minha && it.freq in 5000..5925 }
        return listOf(36, 40, 44, 48, 149, 153, 157, 161).map { c ->
            var p = 0.0
            var n = 0
            for (v in outras) {
                if (bloco5(v.canal) == bloco5(c)) {
                    p += peso(v.rssi) * (if (v.canal == c) 1.0 else 0.5)
                    n++
                }
            }
            NotaCanal(c, p, n)
        }.sortedBy { it.pontos }
    }

    fun qualidadeSinal(rssi: Int): Pair<Int, String> = when {
        rssi >= -60 -> 0 to "Ótimo"
        rssi >= -70 -> 0 to "Bom"
        rssi >= -78 -> 1 to "Fraco"
        else -> 2 to "Muito fraco"
    }

    fun diagnosticar(
        con: MinhaConexao?,
        viz: List<RedeVizinha>,
        aparelhos: List<Aparelho>?,
        vel: ResultadoVelocidade?,
        dns: List<ResultadoDns>?,
        planoMbps: Int
    ): List<Achado> {
        val r = mutableListOf<Achado>()
        if (con == null) {
            r += Achado(2, "Celular fora do Wi-Fi", "Conecte o celular na sua rede MERCUSYS para o app conseguir medir.", "Abrir Wi-Fi", "wifi")
            return r
        }

        // 1. Sinal
        val (nivelSinal, txtSinal) = qualidadeSinal(con.rssi)
        r += when (nivelSinal) {
            0 -> Achado(0, "Sinal do Wi-Fi: $txtSinal (${con.rssi} dBm)", "O celular recebe bem o sinal do roteador neste lugar.")
            1 -> Achado(1, "Sinal do Wi-Fi: $txtSinal (${con.rssi} dBm)",
                "Paredes ou distância estão enfraquecendo o sinal. Deixe o roteador no alto, no meio da casa, longe de micro-ondas, espelhos e aquários.")
            else -> Achado(2, "Sinal do Wi-Fi: $txtSinal (${con.rssi} dBm)",
                "Aqui o sinal chega muito fraco e a internet fica lenta mesmo com plano bom. Aproxime-se do roteador, mude-o de lugar ou use um repetidor/mesh.")
        }

        // 2. Banda 2,4 x 5 GHz
        val em24 = con.freq in 1..3000
        val minha5 = viz.filter { it.minha && it.freq > 5000 }.maxByOrNull { it.rssi }
        if (em24 && minha5 != null && minha5.rssi >= -75) {
            r += Achado(1, "Você está na rede 2,4 GHz (mais lenta)",
                "A rede ${minha5.ssid} (5 GHz) chega aqui com ${minha5.rssi} dBm. Ela é bem mais rápida e sofre menos com os vizinhos. Conecte nela.",
                "Abrir Wi-Fi", "wifi")
        }

        // 3. Canais / vizinhos
        if (viz.isNotEmpty() && con.canal > 0) {
            if (em24) {
                val notas = canais24(viz)
                val melhor = notas.first()
                val mesmoCanal = viz.count { !it.minha && it.freq < 3000 && abs(it.canal - con.canal) <= 4 }
                val atual = notas.firstOrNull { it.canal == con.canal }
                if (atual == null || atual.pontos > melhor.pontos * 1.3 + 10) {
                    r += Achado(if (mesmoCanal >= 4) 2 else 1, "Vizinhos atrapalhando: $mesmoCanal redes perto do canal ${con.canal}",
                        "Troque o canal 2,4 GHz do roteador para o canal ${melhor.canal} (o mais livre agora). No roteador: Wi-Fi/Wireless > 2,4 GHz > Canal.",
                        "Abrir roteador", "roteador")
                } else {
                    r += Achado(0, "Canal 2,4 GHz (${con.canal}) já é dos mais livres", "$mesmoCanal redes vizinhas por perto, mas não há canal melhor agora.")
                }
            } else {
                val notas = canais5(viz)
                val melhor = notas.first()
                val atual = notas.firstOrNull { it.canal == con.canal }
                val mesmoBloco = viz.count { !it.minha && it.freq in 5000..5925 && bloco5(it.canal) == bloco5(con.canal) }
                if (atual != null && atual.pontos > melhor.pontos * 1.3 + 10) {
                    r += Achado(1, "Vizinhos no seu canal 5 GHz: $mesmoBloco redes",
                        "Troque o canal 5 GHz do roteador para ${melhor.canal}. Se o roteador não aceitar esse canal, use o próximo da lista no cartão de canais.",
                        "Abrir roteador", "roteador")
                } else {
                    r += Achado(0, "Canal 5 GHz (${con.canal}) está bom", "$mesmoBloco redes vizinhas na mesma faixa. A rede 5 GHz quase não sofre com vizinhos.")
                }
            }
        }

        // 4. Velocidade e latência
        if (vel != null) {
            val gw = vel.pingRoteador
            val wifiRuim = gw != null && gw.ok && (gw.media > 25 || gw.jitter > 15 || gw.perda > 0)
            if (gw != null && gw.ok) {
                if (wifiRuim) {
                    r += Achado(2, "O Wi-Fi da casa está instável",
                        "Celular → roteador: ${f0(gw.media)} ms, variação ${f0(gw.jitter)} ms, perda ${gw.perda}%. O normal é menos de 10 ms sem perda. A culpa é do sinal/interferência, não da operadora.")
                } else {
                    r += Achado(0, "Wi-Fi da casa estável", "Celular → roteador: ${f0(gw.media)} ms, sem perdas.")
                }
            }
            val net = vel.pingInternet
            if (!net.ok) {
                r += Achado(2, "Internet não respondeu", "O roteador está ok, mas a internet não responde. Reinicie o aparelho da fibra (TP-Link) e depois o roteador. Se continuar, ligue para a operadora.")
            } else if (!wifiRuim && (net.media > 60 || net.perda >= 3)) {
                r += Achado(2, "Problema vindo da operadora",
                    "Internet: ${f0(net.media)} ms e ${net.perda}% de perda, mesmo com o Wi-Fi bom. Reinicie o aparelho da fibra. Se continuar, reclame com a operadora informando esses números.")
            } else {
                r += Achado(0, "Tempo de resposta da internet: ${f0(net.media)} ms", "Bom para jogos, chamadas de vídeo e streaming.")
            }

            val carga = vel.pingCarregado
            if (carga != null && carga.ok && net.ok) {
                val aumento = carga.media - net.media
                if (aumento > 100) {
                    r += Achado(2, "Internet trava quando alguém baixa algo (+${f0(aumento)} ms)",
                        "Quando a rede está cheia, o tempo de resposta vai de ${f0(net.media)} para ${f0(carga.media)} ms. Isso trava vídeo-chamadas e jogos. Ative QoS / Controle de banda no roteador ou limite downloads grandes.",
                        "Abrir roteador", "roteador")
                } else if (aumento > 40) {
                    r += Achado(1, "Rede fica um pouco lenta sob uso (+${f0(aumento)} ms)", "Normal em muitas casas. Se jogos ou chamadas travarem quando alguém assiste vídeo, ative QoS no roteador.")
                }
            }

            if (planoMbps > 0) {
                val pct = vel.download * 100 / planoMbps
                if (pct < 50) {
                    val limiteWifi = con.linkMbps in 1 until planoMbps
                    r += Achado(if (pct < 30) 2 else 1, "Recebendo ${f0(pct)}% do seu plano (${f0(vel.download)} de $planoMbps Mbps)",
                        if (limiteWifi) "A ligação Wi-Fi do celular está em ${con.linkMbps} Mbps, menor que o plano. Use a rede 5 GHz e fique mais perto do roteador."
                        else if (wifiRuim || nivelSinal > 0) "O Wi-Fi está limitando. Melhore o sinal (veja acima) e teste de novo."
                        else "O Wi-Fi está bom, então a perda pode ser da operadora. Teste com cabo no computador. Se der o mesmo, reclame com a operadora.")
                } else {
                    r += Achado(0, "Recebendo ${f0(pct)}% do seu plano", "${f0(vel.download)} Mbps de $planoMbps Mbps contratados. Pelo Wi-Fi, acima de 60% já é bom.")
                }
            } else {
                r += Achado(1, "Informe a velocidade do seu plano", "Em \"Atalhos e ajustes\", digite quantos Mbps você contratou para o app comparar.")
            }
        }

        // 5. DNS
        if (dns != null) {
            val validos = dns.filter { it.ms != null }
            val melhor = validos.minByOrNull { it.ms!! }
            val atual = validos.firstOrNull { it.atual } ?: validos.firstOrNull { it.ip == con.gateway }
            if (con.dnsPrivado != null) {
                r += Achado(0, "DNS privado ativo (${con.dnsPrivado})", "O celular já usa um DNS escolhido por você.")
            } else if (melhor != null && atual != null && melhor.ip != atual.ip &&
                atual.ms!! - melhor.ms!! > 15 && melhor.ms < atual.ms * 0.7
            ) {
                val host = when (melhor.ip) {
                    "1.1.1.1" -> "one.one.one.one"
                    "8.8.8.8" -> "dns.google"
                    else -> "dns.quad9.net"
                }
                r += Achado(1, "DNS mais rápido disponível: ${melhor.nome} (${f0(melhor.ms)} ms x ${f0(atual.ms)} ms)",
                    "Sites e apps abrem mais rápido. Em Configurações > Conexões > Mais configurações > DNS privado, escolha \"Nome do host\" e digite: $host",
                    "Abrir configurações", "dns")
            } else if (atual != null) {
                r += Achado(0, "DNS da operadora está rápido (${f0(atual.ms!!)} ms)", "Não precisa trocar.")
            }
        }

        // 6. Aparelhos
        if (aparelhos != null) {
            val outros = aparelhos.filter { it.ip != con.ip && it.ip != con.gateway }
            val novos = outros.filter { it.novo }
            if (novos.isNotEmpty()) {
                r += Achado(1, "${novos.size} aparelho(s) novo(s) na rede",
                    "Confira na lista abaixo (marcados NOVO). Se não reconhecer algum, troque a senha do Wi-Fi no roteador.",
                    "Abrir roteador", "roteador")
            }
            r += Achado(if (outros.size > 15) 1 else 0, "${outros.size} outro(s) aparelho(s) conectado(s)",
                if (outros.size > 15) "Muitos aparelhos dividindo a internet. Desconecte os que não usa ou dê prioridade aos importantes (QoS)."
                else "Quantidade normal de aparelhos.")
        }

        return r.sortedByDescending { it.nivel }
    }
}
