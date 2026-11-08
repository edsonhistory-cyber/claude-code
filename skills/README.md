# Skills de motion design para Claude

Cópias de 13 skills open source (todas com licença MIT, cada pasta mantém o `LICENSE` original).
Galerias de demonstração (GIFs/vídeos de README) foram removidas ou reduzidas para manter o repositório leve; o código, os guias e as licenças originais estão intactos.

| Pasta | Origem | Commit | O que faz |
|---|---|---|---|
| `bang-motion/` | [bangtutorial/bang-motion](https://github.com/bangtutorial/bang-motion) | `c1aa65e` | Motion graphics cinematográficos e animação de texto (HTML) |
| `vox-explainer-skill/` | [CK42BB/vox-explainer-skill](https://github.com/CK42BB/vox-explainer-skill) | `7003225` | Um tópico → vídeo explicativo estilo Vox/documentário |
| `huashu-art-motion/` | [alchaincyf/huashu-art-motion](https://github.com/alchaincyf/huashu-art-motion) | `8a0d7d7` | Pinturas animadas em 35+ estilos de arte (sem `assets/showcase`) |
| `claude-drawing-skill/` | [cloveric/claude-drawing-skill](https://github.com/cloveric/claude-drawing-skill) | `4220b2d` | Ilustração procedural que se desenha traço a traço (GIFs) — `examples/` só com os `.py` |
| `lemo-opuscar/` | [lemomo-ai/lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar) | `5c05490` | Caixa de 66 estilos de filme feitos em código (óleo, aquarela, ukiyo-e, briefing de satélite, telejornal…). Imagens de referência >200 KB removidas |
| `video-talkcraft/` | [Vincentwei1021/video-talkcraft](https://github.com/Vincentwei1021/video-talkcraft) | `a7c29ed` | Vídeo guiado pela narração: sincronia palavra a palavra, 108 receitas de animação, efeitos presos à voz. ⚠️ Licença **PolyForm Noncommercial**: gratuita só para uso não comercial. Galeria removida |
| `video-illustrator/` | [axtonliu/video-illustrator](https://github.com/axtonliu/video-illustrator) | `f02ecf4` | Sua narração + seu material real (capa, desenhos) → curta de 20–60 s em vários estilos (papel recortado, nanquim, 3D…). MIT |
| `ClaudeAnimationBase/` | [JohnHeibel/ClaudeAnimationBase](https://github.com/JohnHeibel/ClaudeAnimationBase) | `0ac8bf2` | Kit para animar personagens pintados à mão (p5.js + p5.brush), 31 emoções. MIT |
| `story-to-handdrawn-video/` | [gnipbao/story-to-handdrawn-video](https://github.com/gnipbao/story-to-handdrawn-video) | `198aefa` | História ou imagens em ordem → animação estilo diário/quadrinho desenhado à mão. MIT. Exemplos de estilo reduzidos (676 MB → 37 MB) |
| `anidoodle/` | [alexgreensh/anidoodle](https://github.com/alexgreensh/anidoodle) | `4ae27d2` | Arte e animação em código, dezenas de estilos, filmes com trilha. Apache-2.0 |
| `b-roll-skills/` | [iart-ai/b-roll-skills](https://github.com/iart-ai/b-roll-skills) | `a51e34b` | Animações geradas a partir do que é dito, com transcrição temporizada por palavra. MIT |
| `sfx/` | [sxhzju/sfx](https://github.com/sxhzju/sfx) | `fb4ae3c` | Skill `sfx-sources`: busca e baixa efeitos sonoros gratuitos no Mixkit, Pixabay, Kenney e Freesound (indica quando o som precisa de crédito). MIT |
| `soundfetch/` | [Losera/soundfetch](https://github.com/Losera/soundfetch) | `ea25a14` | CLI, API Python e servidor MCP para buscar e baixar áudio com licença aberta (Internet Archive, Openverse, Freesound), registrando licença e atribuição de cada arquivo. MIT |

## Instalar no Claude Code

```bash
mkdir -p ~/.claude/skills
cp -r skills/bang-motion skills/vox-explainer-skill skills/huashu-art-motion skills/claude-drawing-skill ~/.claude/skills/
# lemo-opuscar: a skill fica em plugin/skills/lemo-opuscar e usa a biblioteca inteira como $LIB
cp -r skills/lemo-opuscar ~/lemo-opuscar
cp -r skills/lemo-opuscar/plugin/skills/lemo-opuscar ~/.claude/skills/
# sfx: a skill fica em skills/sfx/skills/sfx-sources
cp -r skills/sfx/skills/sfx-sources ~/.claude/skills/
# soundfetch: ferramenta de linha de comando (pip install soundfetch, ou pip install -e skills/soundfetch)
```

Veja o `README.md` de cada skill para dependências (ex.: ffmpeg, Playwright, chaves de API).
