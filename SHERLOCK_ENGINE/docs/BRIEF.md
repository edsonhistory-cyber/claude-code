# Sherlock Engine — Brief de Implementação para o Claude Code
### Caso 001 · "A Última Parada" (CWB‑1447) · Curitiba‑PR · pt‑BR

> **Como usar:** coloque este arquivo na raiz do repositório como `docs/BRIEF.md` e cole o "Prompt de Início" (última seção) no Claude Code. Todos os JSONs de design já existentes são a **fonte de verdade** — o Claude Code lê, valida e implementa a partir deles; não deve reinventar o caso.

---

## 0. Regras de ouro (não violar)

1. **Solução lacrada.** O culpado/motivo/método NÃO podem aparecer em nenhuma tela, log de console, comentário de código ou arquivo lido pelo jogador. Os campos `*_SPOILER` / `final_solution` ficam **codificados em base64** e só são decodificados no momento do veredito, dentro da Sala do Júri. O dono do projeto joga — ele não pode ver a resposta.
2. **Offline no produto final.** Nada de chamada de rede em runtime. Toda busca na web acontece **em tempo de build** (scripts em `tools/`), baixando os arquivos para `assets/` e referenciando localmente. O jogo roda abrindo `index.html` sem internet.
3. **pt‑BR** em tudo que é voltado ao jogador. Strings via `SHERLOCK_ENGINE_LOCALIZATION.json`.
4. **Licença rastreada.** Todo asset baixado gera uma linha em `assets/CREDITS.md` (fonte, autor, licença, URL). Preferir CC0 / Domínio Público; aceitar CC BY / CC BY‑SA registrando a atribuição.

---

## 1. Realidade de escopo (ler antes de codar)

Os JSONs descrevem o **sonho da engine** (WebGPU, PBR, ray tracing, servidores dedicados, 1.000+ imagens 8K, cinemáticas renderizadas). Isso **não** é o jogo que 4 amigos vão jogar numa TV, offline. Traduza o sonho para o que é entregável:

| No design (JSON) | O que realmente construir |
|---|---|
| WebGPU / PBR / Three.js | **DOM + CSS + Canvas 2D + Vanilla JS.** É uma UI investigativa, não um mundo 3D. |
| Cinemáticas renderizadas em vídeo | Sequências **CSS/Canvas** (Ken Burns, fades, luz, partículas). Sem `.mp4`. |
| 1.000+ imagens 8K | **~80–150 imagens curadas** (fotos reais de Curitiba da web + arte‑chave pontual + SVG/CSS procedural pro resto). |
| Vozes gravadas | **`SpeechSynthesis`** do navegador (já no design). Zero arquivos de voz. |
| SFX/ambiente em arquivos | **Web Audio API sintetizando** os SFX de UI + **alguns arquivos CC0** de ambiente baixados na web. |
| Servidor dedicado / matchmaking | **Local:** 1 Central (TV) + 4 dossiês. Multiplayer real fica pra depois. |

Resultado: mais rico do que o que existe hoje (é o que o dono pediu), sem virar um projeto de estúdio AAA impossível de terminar.

---

## 2. Stack e decisões técnicas

- **Runtime:** HTML5 + CSS3 + JavaScript (ES Modules), sem framework pesado. Sem build obrigatório para rodar (funciona via `file://` ou servidor estático simples).
- **Estado/save:** `localStorage` para dev; formato `.ssave` (do design) fica como fase futura.
- **Áudio:** `audioManager.js` com Web Audio API (SFX procedurais) + carregamento de arquivos `.ogg/.mp3` de ambiente.
- **Voz:** `SpeechSynthesis` (pt‑BR) para narrador, A.R.I.A. e legista.
- **Dados:** todos os JSONs carregados por `database.js` com validação de schema e checagem de referências cruzadas (IDs órfãos, culpado único, pistas sem uso).
- **Dev server:** um `npx serve` / `python -m http.server` já basta para testar.

---

## 3. Estrutura de pastas a criar (alinhada ao REPOSITORY.json, enxuta)

```
/
├─ index.html                 # boot + roteador de telas
├─ css/
│   ├─ theme.css              # Dark Ops (cores/fonts do UI.json)
│   └─ screens.css
├─ js/
│   ├─ engine.js              # boot(), loadCase(), startGame(), loop, estados
│   ├─ database.js            # loadModule(), query(), validação de schema
│   ├─ eventManager.js        # emit/subscribe, fila, triggers
│   ├─ worldManager.js        # relógio, locais, NPCs, estado do mundo
│   ├─ deductionEngine.js     # hipóteses, suspeição (MMO), inferência
│   ├─ dialogManager.js       # árvores de diálogo, interrogatório
│   ├─ uiManager.js           # HUD, inventário, mapa, mural, júri
│   ├─ audioManager.js        # Web Audio (SFX) + ambientes + SpeechSynthesis
│   └─ saveManager.js         # autosave/load localStorage
├─ cases/
│   └─ CASE001_A_Ultima_Parada/
│       └─ *.json             # copiar/derivar dos JSONs de design existentes
├─ engine-data/               # os SHERLOCK_ENGINE_*.json (config global)
├─ assets/
│   ├─ images/                # baixadas na web (build) + arte pontual
│   ├─ audio/ambience/        # .ogg/.mp3 CC0 baixados
│   ├─ fonts/                 # Bebas Neue, Oswald, Special Elite, Courier Prime
│   ├─ icons/                 # SVG
│   ├─ manifest.assets.json   # lista curada a baixar (ver §5)
│   └─ CREDITS.md             # atribuição/licença de cada asset
├─ tools/
│   ├─ fetch_assets.mjs       # baixa imagens/áudio da web -> assets/ (build-time)
│   └─ validate_case.mjs      # roda os validadores de integridade
├─ tests/
└─ docs/
    └─ BRIEF.md               # este arquivo
```

---

## 4. Milestone 1 — "Motor de pé" (fazer primeiro)

**Objetivo:** ver a engine bootar e carregar o caso, **antes de qualquer arte**.

Entregar:
1. `index.html` com sequência de boot (do UI.json: logo → checando banco → módulos → IA → acesso).
2. `database.js` que carrega TODOS os `SHERLOCK_ENGINE_*.json` + `CASE001_*` e valida: schemas presentes, IDs únicos, referências cruzadas resolvidas, **culpado único**, pistas alcançáveis. Cospe um relatório no boot log.
3. `engine.js` com `boot()`, `loadCase("CASE001")`, `startGame()` e máquina de estados (BOOT→LOGIN→CENTRAL→INVESTIGAÇÃO→JÚRI→RESULTADO).
4. `eventManager.js` (event bus com os eventos do CORE/API.json).
5. Central de Operações mínima (grid 3×3 do UI.json) só com navegação — cards levam a telas placeholder.
6. `saveManager.js` com autosave em `localStorage`.

**Critério de aceite:** abrir `index.html` num servidor local, ver o boot, cair na Central, navegar entre telas placeholder, e o console mostrar "Caso CASE001 validado: 0 erros de integridade". Sem imagens ainda — placeholders sólidos.

**Milestones seguintes** (não fazer agora, só planejar): M2 Gameplay (enigmas + laboratório funcional + MMO + linha do tempo + júri com solução lacrada), M3 Editor, M4 Campanha, M5 RC.

---

## 5. Buscar assets na web (o que o dono pediu) — build‑time

O Claude Code **pode acessar a web**. A regra é: **baixar na build, servir local.** Fluxo:

1. Preencher `assets/manifest.assets.json` com a lista curada (abaixo).
2. `tools/fetch_assets.mjs` percorre o manifest, baixa cada item para `assets/`, gera thumbnail, e escreve a atribuição em `assets/CREDITS.md`.
3. O jogo referencia só caminhos locais (`assets/images/...`).

### 5.1 Imagens — fontes e alvos

**Fonte principal: Wikimedia Commons** (fotos reais de Curitiba, licenças livres). Use a **API do Commons** (`https://commons.wikimedia.org/w/api.php`) para resolver, por categoria/busca, os arquivos e pegar a URL original + autor + licença. Alvos (termos/categorias reais):

- `Jardim Botânico de Curitiba` (estufa, jardins)
- `Museu Oscar Niemeyer` (o "olho")
- `Ópera de Arame`
- `Parque Barigui` (lago, capivaras)
- `Parque Tanguá` (mirante, cascata, pôr do sol)
- `Rua 24 Horas, Curitiba`
- `Linha Turismo (Curitiba)` (ônibus verde/amarelo de 2 andares)
- `Curitiba` (skyline/centro para telas de mapa)

**Fonte secundária (agregador):** Openverse (`https://api.openverse.org`) filtrando `license_type=commercial,modification` para pegar CC0/CC BY de várias fontes de uma vez.

**Meta:** ~6–12 imagens boas por local (≈ 60–100 no total), mais 10–20 de UI/textura. Nada de 1.000. Priorizar 1 "hero shot" por local + variações.

**Retratos de suspeitos:** NÃO baixar rostos reais de pessoas (privacidade/licença de imagem). Usar arte‑chave gerada (RunComfy/Canva/Stable Diffusion) a partir dos prompts que já estão em `SHERLOCK_ENGINE_PROMPTS.json`, ou silhuetas estilizadas + ficha. O dono já tem esse pipeline.

### 5.2 Áudio — mais do que temos hoje

- **SFX de UI** (clique, scanner, unlock, cofre, câmera): **sintetizar** no `audioManager.js` com Web Audio (osciladores/envelopes). Zero arquivos, zero licença.
- **Ambientes por local** (pássaros no Jardim Botânico, água/capivaras no Barigui, cascata no Tanguá, cidade na Rua 24h): baixar **CC0** de:
  - **Freesound** (`https://freesound.org`) — filtrar por `license:"Creative Commons 0"` para evitar exigência de atribuição (a API precisa de token gratuito; registrar em `CREDITS.md`).
  - **Pixabay Audio** (`https://pixabay.com`) — licença permissiva, sem atribuição obrigatória.
- **Trilha/música** (suspense, investigação, júri): buscar loops CC0/royalty‑free nas mesmas fontes; 3–5 faixas curtas em loop já dão o clima.
- **Vozes:** `SpeechSynthesis` pt‑BR — sem download.

### 5.3 `manifest.assets.json` (esquema que o fetch script consome)

```json
{
  "images": [
    { "id": "loc_tangua_hero", "query": "Parque Tanguá Curitiba mirante", "source": "wikimedia", "max": 8, "target": "assets/images/locations/tangua/" }
  ],
  "audio": [
    { "id": "amb_barigui", "query": "park water birds ambience", "source": "freesound", "license": "cc0", "max": 2, "target": "assets/audio/ambience/" }
  ]
}
```

Cada item baixado vira entrada em `CREDITS.md`: `id | arquivo | fonte | autor | licença | url`.

> **Rede:** se o ambiente do Claude Code tiver a rede restrita, liberar os domínios: `commons.wikimedia.org`, `upload.wikimedia.org`, `api.openverse.org`, `freesound.org`, `cdn.freesound.org`, `pixabay.com`, `cdn.pixabay.com`.

---

## 6. Validadores de integridade (rodar sempre)

`tools/validate_case.mjs` implementa os checks já previstos no design (CASE_EDITOR/COMPILER/SDK): IDs duplicados, referências inválidas, **múltiplos culpados = erro**, pistas sem uso, eventos inalcançáveis, linha do tempo inconsistente, e o **ciclo de dependência sem deadlock** dos 4 dossiês (Perícia↔Inteligência↔Campo↔Arquivo trocam tokens CAFE/RODAS/KM18/ROTAS). Boot aborta se um módulo `required` faltar.

---

## 7. O que está faltando / decisões pro dono

- `SHERLOCK_ENGINE_CAMPAIGN.json` é referenciado pelo MASTER_PROJECT mas **ainda não foi enviado** — está marcado `required: false`, então o boot não quebra; tratar como opcional por ora.
- Confirmar orçamento de arte‑chave (quantos retratos de suspeito gerar) e se haverá geração de imagem por IA ou só fotos reais + SVG.

---

## 8. Prompt de Início (colar no Claude Code)

```
Você é o programador da "Sherlock Engine" (jogo de detetive offline, pt-BR, caso
CWB-1447 "A Última Parada", em Curitiba). Leia docs/BRIEF.md e os JSONs de design
na raiz — eles são a fonte de verdade; não reinvente o caso.

REGRAS: (1) a solução do caso é LACRADA — nunca exiba culpado/motivo/método em tela,
console ou comentário; mantenha os campos *_SPOILER em base64, decodificados só no
veredito. (2) Produto final 100% OFFLINE: toda busca na web é em tempo de build
(tools/fetch_assets.mjs), baixando para assets/ e servindo local. (3) Stack: HTML +
CSS + Vanilla JS (ES Modules), DOM/Canvas 2D — sem WebGPU/Three. (4) Registre licença
de cada asset em assets/CREDITS.md.

TAREFA AGORA (Milestone 1): crie a estrutura de pastas do BRIEF §3 e implemente
database.js (carrega e valida todos os JSONs, com relatório de integridade),
engine.js (boot + máquina de estados + loadCase), eventManager.js, saveManager.js
(localStorage) e um index.html com a sequência de boot e a Central de Operações
(grid 3x3) navegando para telas placeholder. Sem arte ainda.

CRITÉRIO DE ACEITE: rodar num servidor local, ver o boot, chegar na Central, navegar,
e o console mostrar "Caso CASE001 validado: 0 erros de integridade".

Comece listando os arquivos que vai criar e, se algo no design estiver ambíguo,
pergunte antes de codar. Trabalhe em partes, mostrando o que fez a cada etapa.
```
