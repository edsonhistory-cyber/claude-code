# Sherlock Engine — 1.0.0

Jogo de detetive cooperativo, **offline**, pt‑BR — motor multi-caso completo (M1–M5)
com a **campanha "Sherlock Chronicles" inteira jogável (4 episódios)**:

| # | Caso | Fio da campanha |
|---|------|-----------------|
| CASE001 | **A Última Parada** (CWB‑1447) — Linha Turismo, Curitiba | Corrupção |
| CASE002 | **Silêncio na Serra** (SRR‑0904) — trem Serra Verde → Morretes | Lavagem de dinheiro |
| CASE003 | **Operação Eclipse** (ECL‑2112) — apagão no Fórum | Manipulação de provas |
| CASE004 | **O Colecionador** (COL‑0077) — leilão no Batel | A rede criminosa (final) |

Os quatro casos se conectam: os codinomes MUSEU · JARDINEIRO · RODAS · MAQUINISTA
atravessam a campanha até o desmascaramento do Colecionador no episódio final.

## Como jogar (jogo completo ✅ — M1 + M2)
```bash
cd SHERLOCK_ENGINE
python3 -m http.server 8080     # ou: npx serve
# abrir http://localhost:8080
```
Boot → Login → cinemática de abertura → **Central de Operações** com as 9 telas funcionais:

| Tela | O que faz |
|---|---|
| **Mapa** | Rota da Linha Turismo; visite as paradas e colete evidências nos hotspots. |
| **Laboratório** | Toxicologia, digitais, **fibras (EN007)** e documentoscopia — laudos reais. |
| **Interrogatórios** | Depoimentos, estresse (HUMINT), apresentação de provas, **quebra de álibi (EN005)**. |
| **OSINT** | Motor de busca (SB Fretamentos, 2019, Otávio…), desbloqueia documentos, **EN008**. |
| **GEOINT** | Gráfico do tacógrafo (**EN003**) e satélite para marcar o KM18 (**EN004**). |
| **Evidências** | Inventário + documentos; **EN001 (QR)**, **EN002 (cifra)**, **EN006 (vídeo)**, **EN009 (manifesto)**. |
| **Linha do Tempo** | Reordene os 8 eventos do caso (+80 pts). |
| **Mural** | Suspeição MMO por suspeito (motor de dedução) e conexões validadas pelo grafo. |
| **Sala do Júri** | Cofre com os 4 códigos (PER-77 · INT-40 · CAM-19 · ARQ-02) e o veredito final. |

O ciclo de tokens dos dossiês (Perícia→Inteligência→Arquivo→Campo→Perícia, CAFE/RODAS/ROTAS/KM18)
gateia os enigmas sem deadlock. A solução fica **lacrada em base64** e só é decodificada no clique
de "Emitir Veredito". A.R.I.A. dá dicas (-20 pts), SFX são sintetizados via Web Audio e as vozes
usam SpeechSynthesis pt-BR — **zero rede em runtime**.

Validação headless (mesmos checks do boot, para CI/build):
```bash
node tools/validate_case.mjs CASE001
```

## Visual colorido + fotos reais
A interface é **colorida por módulo** (cada tela da Central tem sua cor) e **cheia de
imagens**: cards da Central, episódios do QG, locais do mapa e cinemáticas mostram
cenas ilustradas dos pontos do caso, e os retratos dos personagens são coloridos.
Rodando `node tools/fetch_assets.mjs` com internet, as **fotos reais** (Wikimedia/
Openverse) entram em `assets/images/scenes/manifest.json` e **substituem as
ilustrações automaticamente** — sem tocar em código. Vale para os 4 casos:
Linha Turismo (CASE001), trem/estação/túnel da Serra (CASE002), Palácio da
Justiça e Teatro do Paiol (CASE003) e Castelo do Batel (CASE004).
Os **retratos dos 29 personagens são gerados por IA** (Pollinations.ai, modelo
FLUX — sem rostos reais, prompts neutros sem spoiler) e entram em
`assets/images/portraits/manifest.json`, sobrepondo as silhuetas SVG.

## Assets (opcional, build-time)
A arte atual é 100% procedural (SVG). Com internet, baixe fotos reais de Curitiba e áudios CC0:
```bash
node tools/fetch_assets.mjs            # Wikimedia/Openverse; FREESOUND_TOKEN/PIXABAY_KEY p/ áudio
```
Cada download é registrado em `assets/CREDITS.md` (fonte, autor, licença, URL).

## Sherlock Studio — editor de casos (M3 ✅)
Abra `http://localhost:8080/editor/` (mesmo servidor). Painéis do CASE_EDITOR.json:
Caso & Atos, **Linha do Tempo** (reordenar, editar horários, conflitos em vermelho),
Personagens, Evidências, Documentos, **Diálogos** (árvore com condições/desbloqueios),
**Solução lacrada** (só abre após confirmação de spoiler e relacra em base64) e JSON bruto.
O **Console de Validação** roda ao vivo os mesmos checks do boot (`js/validators.js`).
`✚ Novo Caso` cria os 7 JSONs a partir dos templates do `SHERLOCK_CASE_CREATOR_SDK`.
Exportação: JSONs individuais ou **ZIP do Caso** (gerador próprio, offline).

## Campanha "Sherlock Chronicles" (M4 ✅)
Depois do login você chega ao **QG da campanha**: carreira persistente (XP, patentes
Recruta→Lenda, conquistas com bônus de XP, reputação em 4 eixos), seleção de episódios
com desbloqueio sequencial (concluir o CASE001 libera o CASE002 "Silêncio na Serra"),
sala de troféus e arquivo de casos com melhores pontuações. A carreira vive em
`localStorage` separada do save do caso (carry_over do CAMPAIGN.json). Episódios
futuros apontam para o Sherlock Studio, onde o conteúdo pode ser criado.

## Motor multi-caso (M5 ✅ — Release Candidate)
Todo o conteúdo de um caso vive num **CONTENT_PACK** (`cases/<caso>/CASEXXX_CONTENT_PACK.json`):
paradas do mapa e hotspots, resultados de OSINT, bancadas do laboratório, GEOINT
(gráfico + satélite), elenco/depoimentos/contradições, fatores de dedução MMO,
ciclo de tokens dos dossiês, enigmas (tipos genéricos: `sequence`, `input`,
`choice`, `frames`, `compare`) e opções do júri. As telas são 100% data-driven —
para criar um caso novo: 7 JSONs + 1 pack (o Sherlock Studio ajuda), registrar em
`js/database.js` (CASE_DIRS/CASE_FILES) e no CAMPAIGN.json.

Validação por caso: `node tools/validate_case.mjs CASE001 … CASE004` (0 erros nos quatro).

## Contexto do projeto
1. `docs/BRIEF.md` — regras de ouro, plano de milestones e estratégia de assets.
2. Roadmap completo: M1 motor · M2 gameplay · M3 Sherlock Studio · M4 Campanha · M5 multi-caso — e os 4 episódios autorados.
3. Casos novos (CASE005+): 7 JSONs + 1 content pack (o Studio ajuda) + registro em `js/database.js` e no CAMPAIGN.json.

## Estrutura
- `docs/BRIEF.md` — instruções de implementação (a fonte do plano).
- `engine-data/` — todos os `SHERLOCK_*` (config global da engine).
- `cases/CASE001_A_Ultima_Parada/` — conteúdo do caso (`CASE001_*`, `SHERLOCK_ENGINE_CASE001_FULL`).
  - `design_source/` — design original (`jogo_a_ultima_parada`, `P1..P4`). **Contém a solução — não abrir se for jogar.**
- `assets/` — vazio; `manifest.assets.json` lista o que baixar da web na build.
- `tools/` — `fetch_assets.mjs` (esqueleto do baixador de assets).
- `css/ js/ tests/ editor/ sdk/ mods/` — pastas do código (a preencher).

## Regras de ouro (detalhe no BRIEF)
1. **Solução lacrada** — nunca exibir culpado/motivo/método; manter em base64, só no veredito.
2. **Offline no final** — buscar assets só em tempo de build; runtime sem rede.
3. **pt‑BR** e **licença registrada** (`assets/CREDITS.md`).

## Pendências
- ~~`SHERLOCK_ENGINE_CAMPAIGN.json` referenciado no MASTER_PROJECT mas não incluído~~ — **resolvido**: arquivo recebido e adicionado em `engine-data/`.

Veja `MANIFEST.txt` para a lista completa de arquivos.
