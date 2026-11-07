# Skills de motion design para Claude

Cópias de 5 skills open source (todas com licença MIT, cada pasta mantém o `LICENSE` original).
Galerias de demonstração (GIFs/JPGs renderizados) foram removidas para manter o repositório leve.

| Pasta | Origem | Commit | O que faz |
|---|---|---|---|
| `bang-motion/` | [bangtutorial/bang-motion](https://github.com/bangtutorial/bang-motion) | `c1aa65e` | Motion graphics cinematográficos e animação de texto (HTML) |
| `vox-explainer-skill/` | [CK42BB/vox-explainer-skill](https://github.com/CK42BB/vox-explainer-skill) | `7003225` | Um tópico → vídeo explicativo estilo Vox/documentário |
| `huashu-art-motion/` | [alchaincyf/huashu-art-motion](https://github.com/alchaincyf/huashu-art-motion) | `8a0d7d7` | Pinturas animadas em 35+ estilos de arte (sem `assets/showcase`) |
| `claude-drawing-skill/` | [cloveric/claude-drawing-skill](https://github.com/cloveric/claude-drawing-skill) | `4220b2d` | Ilustração procedural que se desenha traço a traço (GIFs) — `examples/` só com os `.py` |
| `lemo-opuscar/` | [lemomo-ai/lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar) | `5c05490` | Caixa de 66 estilos de filme feitos em código (óleo, aquarela, ukiyo-e, briefing de satélite, telejornal…). Imagens de referência >200 KB removidas |

## Instalar no Claude Code

```bash
mkdir -p ~/.claude/skills
cp -r skills/bang-motion skills/vox-explainer-skill skills/huashu-art-motion skills/claude-drawing-skill ~/.claude/skills/
# lemo-opuscar: a skill fica em plugin/skills/lemo-opuscar e usa a biblioteca inteira como $LIB
cp -r skills/lemo-opuscar ~/lemo-opuscar
cp -r skills/lemo-opuscar/plugin/skills/lemo-opuscar ~/.claude/skills/
```

Veja o `README.md` de cada skill para dependências (ex.: ffmpeg, Playwright, chaves de API).
