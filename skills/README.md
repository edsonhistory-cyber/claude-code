# Skills de motion design para Claude

Cópias de 4 skills open source (todas com licença MIT, cada pasta mantém o `LICENSE` original).
Galerias de demonstração (GIFs/JPGs renderizados) foram removidas para manter o repositório leve.

| Pasta | Origem | Commit | O que faz |
|---|---|---|---|
| `bang-motion/` | [bangtutorial/bang-motion](https://github.com/bangtutorial/bang-motion) | `c1aa65e` | Motion graphics cinematográficos e animação de texto (HTML) |
| `vox-explainer-skill/` | [CK42BB/vox-explainer-skill](https://github.com/CK42BB/vox-explainer-skill) | `7003225` | Um tópico → vídeo explicativo estilo Vox/documentário |
| `huashu-art-motion/` | [alchaincyf/huashu-art-motion](https://github.com/alchaincyf/huashu-art-motion) | `8a0d7d7` | Pinturas animadas em 35+ estilos de arte (sem `assets/showcase`) |
| `claude-drawing-skill/` | [cloveric/claude-drawing-skill](https://github.com/cloveric/claude-drawing-skill) | `4220b2d` | Ilustração procedural que se desenha traço a traço (GIFs) — `examples/` só com os `.py` |

## Instalar no Claude Code

```bash
mkdir -p ~/.claude/skills
cp -r skills/bang-motion skills/vox-explainer-skill skills/huashu-art-motion skills/claude-drawing-skill ~/.claude/skills/
```

Veja o `README.md` de cada skill para dependências (ex.: ffmpeg, Playwright, chaves de API).
