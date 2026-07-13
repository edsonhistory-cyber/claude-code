# assets/audio — trilha e efeitos por ambiente

Pipeline **plug-and-play**: o jogo toca uma faixa por módulo **se o arquivo existir**;
se não existir, cai automaticamente na ambiência **procedural** (Web Audio, já embutida).

## Regras de licença (IMPORTANTE)
Só coloque aqui áudio com licença compatível com jogos e **redistribuível**:
- **CC0 / Domínio Público** (ideal — FreePD, Kenney, OpenGameArt CC0, Freesound CC0)
- **Pixabay Content License** (uso comercial ok; confira faixa a faixa)

Evite qualquer faixa "só para uso pessoal" ou que exija licença paga.
Registre a origem/licença de cada arquivo em `CREDITS.md` (modelo abaixo).

> Observação: este repositório **não** inclui as faixas — o ambiente de
> desenvolvimento onde ele foi montado bloqueia o acesso aos sites de áudio.
> Baixe você mesmo e solte nas pastas com os nomes abaixo.

## Estrutura e nomes esperados (formatos: .mp3 ou .ogg)
```
menu/menu_theme.mp3            → tela inicial / login (mistério, cinematográfico)
map/map_ambient.mp3            → Mapa (urbano leve, cidade viva)
laboratory/laboratory_ambient.mp3  → Laboratório (limpo, tenso, tecnológico)
interrogation/interrogation_ambient.mp3 → Interrogatório (tenso, sombrio)
jury/jury_theme.mp3            → Sala do Júri (dramático, orquestral)
ambience/ambience_city.mp3     → QG / Central (leito neutro de fundo)
sfx/                           → efeitos avulsos (o jogo já sintetiza os principais)
```

## Como ligar uma faixa
1. Baixe o arquivo (CC0/Pixabay) e salve com o nome acima na pasta certa.
2. Aponte no manifesto `assets/audio/manifest.audio.json`, ex.:
   ```json
   { "tracks": { "lab": "laboratory/laboratory_ambient.mp3" } }
   ```
   Chaves aceitas: `menu, central, campanha, mapa, lab, interrogatorio,
   juri, evidencias, mural, osint, geoint, tempo, ambience`.
3. Pronto — ao abrir o módulo, a faixa toca em loop e substitui o drone
   procedural. Sem arquivo/entrada, o jogo mantém a ambiência procedural.

## CREDITS.md (modelo)
```
laboratory_ambient.mp3 — "Nome da faixa" por Autor — CC0 — fonte: URL
```
