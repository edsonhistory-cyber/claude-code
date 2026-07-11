# Sherlock Engine — Pacote de Projeto

Jogo de detetive cooperativo, offline, pt‑BR. Caso 001: **"A Última Parada"** (CWB‑1447), em Curitiba.
Este pacote reúne **o brief de implementação + todos os JSONs de design** já organizados na árvore de pastas, prontos para abrir no **Claude Code**.

## Como rodar (Milestone 1 pronto ✅)
```bash
cd SHERLOCK_ENGINE
python3 -m http.server 8080     # ou: npx serve
# abrir http://localhost:8080
```
Boot → Login → Central de Operações (grid 3×3) → telas placeholder.
O console mostra `Caso CASE001 validado: 0 erros de integridade`.

Validação headless (mesmos checks do boot, para CI/build):
```bash
node tools/validate_case.mjs CASE001
```

## Por onde começar (contexto do projeto)
1. Leia `docs/BRIEF.md` (tem as regras de ouro, o plano dos milestones e a estratégia de assets).
2. O Milestone 1 ("Motor de pé") está implementado em `js/` + `css/` + `index.html`.
3. Próximo: M2 Gameplay (enigmas, laboratório, MMO, linha do tempo, júri com solução lacrada).

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
