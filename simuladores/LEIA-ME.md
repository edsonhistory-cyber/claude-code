# Trator TL80 New Holland — transmissão 12×12 (estudo interativo, não oficial)

- `trator-tl80-interativo.html`: abra no navegador (funciona offline). Comandos: reversor F/N/R, marchas 1–4, gamas L/M/H,
  TDP, 4×4, acelerador, freio; vistas (motor, reversor, câmbio, gamas, tampa de comando, trombeta, TDP, PDM) e modos
  (corte, só mecânica, carcaça vidro, fluxo de força, rótulos, órbita). Teclas: F N R · 1 2 3 4 · L M H · ↑↓ · espaço · T · Q.
  Parado por 25 s, ele volta ao tour automático.
- `trator-tl80-filme.html`: o tour de 36 s que vira vídeo.
- `trator-tl80-trilha.wav`: trilha sincronizada com o filme.

Dados públicos do TL80 (1999–2004; TractorData, Tractorista, fichas OCDE): motor Iveco/NH 8045 turbo, 4 cilindros,
3,9 L, 104 × 115 mm, 80 cv a 2.500 rpm; embreagem de disco duplo a seco; 12 marchas com reversor mecânico; TDP
independente 540 rpm a 2.199 rpm do motor; redução final planetária; freios em banho de óleo; pneus 380/70R24 e
480/70R34 (4×4); entre-eixos 2.310 mm; cerca de 3.500 kg. As contagens de dentes e a tabela de velocidades NÃO são
publicadas: as do modelo são próprias (pares de 60 dentes, módulo 4 mm) e dão de 2,6 a 28,9 km/h a 2.500 rpm.
Mande fotos do catálogo de peças para afinar as peças pelo desenho real.

Para gerar o vídeo (num PC com placa de vídeo, na pasta `.claude/skills/teardown`):

    npm install && npx playwright install chromium
    node sims/build.mjs tractor-film
    node sims/capture.mjs tractor-film --size 1600x900 --dpr 1.2 --out teardown-out/tl80-mudo.mp4
    python run_sfx.py sims/tractor-shared/score.py
    ffmpeg -y -i teardown-out/tl80-mudo.mp4 -i teardown-out/tractor-score.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart teardown-out/tl80.mp4

## Treinamento de montagem: trombeta e redução final (TL80)

- `trombeta-tl80-montagem.html`: a montagem no TRATOR COMPLETO (no cavalete, roda traseira esquerda fora). Botão
  DESTACAR: esmaece e esconde o trator e deixa só a trombeta. 25 passos, peça por peça (75 peças: rolamentos, rolos, retentor, porca e
  arruela-trava, porta-satélites, 72 roletes-agulha, arruelas de encosto, satélites, eixos e pinos-trava,
  semieixo, discos e atuador do freio com esferas e molas, solar, junta, pinos-guia, coroa, 10 arruelas e
  10 porcas apertadas em cruz numerada, bujões, roda com 8 porcas em cruz).
- `trombeta-tl80-bancada.html`: a mesma lição só com o conjunto na bancada, sem o trator. Botões ◀ ANTERIOR / PRÓXIMO ▶ (ou setas do teclado),
  AUTO, DESMONTAR TUDO, MONTAR TUDO e a barra de passos para ir e voltar (a volta é a desmontagem).
  FUNCIONAMENTO: gire o semieixo e segure FREIO (ou espaço) para ver a redução 6:1 e o freio atuando.
- Construção típica, não o desenho oficial. Torques, pré-carga e folgas: manual de serviço.

### Dados de peças usados (lojas de peças da linha TL, como referência de nomes e medidas; desenhos não copiados)
- Coroa e pinhão do eixo traseiro 9 × 43 (TL60…TL100); semieixo da ponta do eixo traseiro TL80/90/100 Iveco, 24 estrias.
- Rolamentos do eixo traseiro 6212 (60×110×22) e 6215 (75×130×25), de esferas.
- Freio hidráulico: pistão anular com anel quadrado pequeno e grande (210×80 mm).
- Câmbio: eixo piloto 23 dentes, 264 mm; engrenagem sincronizada 23 dentes, 100×80×20 (para o próximo módulo).
- TL80 brasileiro: Iveco 8045, 4 cil., 82 cv, aspirado; câmbio 12×4 sincronizado de série, 12×12 com inversor mecânico opcional.

## Treinamento de montagem: caixa de câmbio 4 marchas (TL80)

- `cambio-tl80-montagem.html`: no TRATOR (aberto entre motor e câmbio; a frente volta no último passo). DESTACAR
  esconde o trator. 24 passos, peça por peça: eixo intermediário e rolamentos; eixo secundário com buchas de agulhas,
  engrenagens 1ª/2ª/3ª, 4 anéis sincronizadores de bronze, cubos 1–2 e 3–4 com chavetas e molas, luvas, arruela,
  anel-trava, rolamento-guia e rolamento traseiro; eixo piloto 23 dentes (264 mm) com rolamento e anel; tampa
  dianteira com junta, retentor e 6 parafusos em cruz numerada; tampa de comando com trilhos, garfos, parafusos-trava,
  esferas e molas de trava, pino de intertravamento, junta e 8 parafusos em cruz numerada.
  FUNCIONAMENTO: botões N, 1ª, 2ª, 3ª, 4ª (ou teclas N 1 2 3 4): a luva sai, o anel de bronze sincroniza (brilha),
  a luva engata, o garfo e o trilho andam junto, o caminho da força acende e as rotações aparecem.
- `cambio-tl80-bancada.html`: a mesma lição só na bancada.
- Dados do site de peças usados: eixo piloto 23 dentes, 264 mm; engrenagem sincronizada 23 dentes. Demais dentes,
  formas e sequência: construção típica (não é o desenho oficial). Torques: manual de serviço.
