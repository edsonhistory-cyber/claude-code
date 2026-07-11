# Sherlock Engine — Pacote de Projeto

Jogo de detetive cooperativo, offline, pt‑BR. Caso 001: **"A Última Parada"** (CWB‑1447), em Curitiba.
Este pacote reúne **o brief de implementação + todos os JSONs de design** já organizados na árvore de pastas, prontos para abrir no **Claude Code**.

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

## Assets (opcional, build-time)
A arte atual é 100% procedural (SVG). Com internet, baixe fotos reais de Curitiba e áudios CC0:
```bash
node tools/fetch_assets.mjs            # Wikimedia/Openverse; FREESOUND_TOKEN/PIXABAY_KEY p/ áudio
```
Cada download é registrado em `assets/CREDITS.md` (fonte, autor, licença, URL).

## Contexto do projeto
1. `docs/BRIEF.md` — regras de ouro, plano de milestones e estratégia de assets.
2. M1 (motor) e M2 (gameplay completo) implementados em `js/`, `js/screens/`, `css/`, `index.html`.
3. Próximos: M3 Editor de casos, M4 Campanha (CASE002 "Silêncio na Serra"), M5 RC.

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
