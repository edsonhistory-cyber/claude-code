# Trator TL5 — transmissão 12×12 (estudo interativo, não oficial)

- `trator-tl5-interativo.html`: abra no navegador (funciona offline). Comandos: reversor F/N/R, marchas 1–4, gamas L/M/H,
  TDP, 4×4, acelerador, freio; vistas (motor, reversor, câmbio, gamas, tampa de comando, trombeta, TDP, PDM) e modos
  (corte, só mecânica, carcaça vidro, fluxo de força, rótulos, órbita). Teclas: F N R · 1 2 3 4 · L M H · ↑↓ · espaço · T · Q.
  Parado por 25 s, ele volta ao tour automático.
- `trator-tl5-filme.html`: o tour de 36 s que vira vídeo.
- `trator-tl5-trilha.wav`: trilha sincronizada com o filme.

Dados públicos (folheto TL5, Revista Cultivar): FPT S8000 3.908 cm³ turbo intercooler, 90 cv a 2.400 rpm, 330 Nm a
1.400 rpm, bomba injetora Delphi; 12×12 sincronizada, reversor mecânico, alavancas laterais; embreagem de disco duplo;
TDP 540, eixo 1 3/8" 6 estrias; TDA com diferencial autoblocante; freios a disco em banho de óleo; 3.470 kg.
As contagens de dentes NÃO são publicadas: as do modelo são próprias (pares de 60 dentes, módulo 4 mm, 120 mm entre
eixos) e reproduzem a faixa de 2,8 a 30,5 km/h a 2.400 rpm.

Para gerar o vídeo (num PC com placa de vídeo, na pasta `.claude/skills/teardown`):

    npm install && npx playwright install chromium
    node sims/build.mjs tractor-film
    node sims/capture.mjs tractor-film --size 1600x900 --dpr 1.2 --out teardown-out/tl5-mudo.mp4
    python run_sfx.py sims/tractor-shared/score.py
    ffmpeg -y -i teardown-out/tl5-mudo.mp4 -i teardown-out/tractor-score.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart teardown-out/tl5.mp4
