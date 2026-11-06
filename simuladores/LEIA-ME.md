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

## Treinamento de montagem: eixo traseiro e diferencial (TL80)

- `eixo-traseiro-tl80-montagem.html`: no TRATOR (no cavalete, sem roda/trombeta esquerda e sem o engate de 3 pontos).
  DESTACAR esconde o trator. 17 passos: pinhão 9 D com cone traseiro; calço de altura e capas na carcaça; carcaça do
  diferencial em 2 metades, arruelas de encosto de bronze, planetárias 16 D (24 estrias), cruzeta com 2 satélites e
  arruelas esféricas de bronze; coroa 43 D com 12 parafusos em cruz numerada; cones do diferencial; luva do bloqueio;
  pinhão na carcaça com cone dianteiro, arruela-trava e porca; capas e calços de ajuste da folga; garfo, haste e mola
  do bloqueio; semieixo esquerdo.
  FUNCIONAMENTO: RETA (satélites parados, rodas iguais), CURVA (satélites giram, uma roda +30 %, a outra −30 %),
  BLOQUEIO (a luva trava: rodas iguais mesmo na curva). Teclas R, C, B.
- `eixo-traseiro-tl80-bancada.html`: a mesma lição só na bancada.
- Dados do site de peças: coroa e pinhão 9 × 43; carcaça do diferencial, planetárias, satélites e arruelas de
  encosto de bronze da linha TL; semieixo 24 estrias. Dentes de planetária/satélite (16/10), formas e sequência:
  construção típica. Torques, pré-carga e folga: manual de serviço.

## Transmissão completa em corte (TL80)

- `transmissao-completa-tl80.html`: o trem de força inteiro em corte, no acabamento de desenho técnico (carcaças
  azul-petróleo, face de corte clara, contornos): motor, embreagem dupla, reversor, 4 marchas, gamas, coroa e
  diferencial, trombetas com redução final, PDM e TDP, tudo funcionando com os mesmos comandos do trator (reversor,
  marchas, gamas, acelerador, freio, TDP, 4×4). DESTACAR: TUDO · MOTOR · REVERSOR · 4 MARCHAS · GAMAS ·
  COROA · DIFERENCIAL · TROMBETAS · PDM · TDP deixa só aquele conjunto girando dentro da carcaça.
- As lições de montagem (trombeta, câmbio, eixo traseiro) ganharam o mesmo acabamento.

## Treinamento de montagem: caixa da PDM (tração 4×4), comando mecânico

- `pdm-tl80-montagem.html`: a caixa de transferência laranja que fica sob a transmissão e manda força ao cardã do
  eixo dianteiro (como nas fotos da linha). No trator ou só na bancada (`pdm-tl80-bancada.html`). 19 passos: carcaça;
  eixo de saída estriado com rolamento traseiro, cubo e anel-trava, luva de engate, bucha de agulhas e engrenagem de
  entrada 30 D com arruela e anel; eixo na carcaça; rolamento dianteiro e anel; retentor, tampa dianteira usinada e
  3 parafusos; eixo seletor com O-ring, garfo e pino elástico; esfera, mola e bujão da trava; junta, tampa traseira
  e 4 parafusos; por fora, disco de comando com entalhes, mola de torção, braço dobrado com parafuso de aperto e
  alavanca com olhal; pinos-guia, junta e 6 parafusos em cruz numerada na transmissão; haste de comando com pino e
  contrapino; bujão de dreno de latão.
  FUNCIONAMENTO: LIGAR 4×4 / DESLIGAR (tecla Q): a alavanca, o disco e o garfo giram, a luva prende a engrenagem
  no cubo e o eixo de saída e o cardã passam a girar.
- O lado de fora segue as fotos da linha; o interior é construção típica (não é o desenho oficial).
  A versão com comando eletro-hidráulico (bloco de válvula, tubos, solenoide) fica para a próxima.
- Correção nas 4 lições: o corte agora acompanha o lado da câmera em todas as peças.

## Treinamento de montagem: levantador hidráulico (TL80)

- `levante-tl80-montagem.html` (no trator) e `levante-tl80-bancada.html` (só na bancada). 15 passos: carcaça do
  levante; camisa do cilindro e O-ring; anel de vedação e anel de encosto do pistão; pistão no cilindro (com ar
  comprimido para segurar na posição, se precisar); buchas, eixo do levante e braço interno com parafuso-trava; biela
  e pino; retentores; came de posição, alavanca e mola de realimentação; válvula de controle com carretel e mola;
  junta e levante sobre a carcaça central; 8 parafusos em cruz numerada; braços externos; hastes de levante até as
  barras inferiores; haste de comando e ajuste de altura.
  FUNCIONAMENTO: SUBIR, PARAR, DESCER (setas ↑ ↓) e a ALAVANCA DE POSIÇÃO: o levante vai até a altura pedida e o
  came fecha a válvula ali (controle de posição). Mostra altura, ângulo dos braços, curso do pistão e estado da válvula.
- Referências: vídeo "2º Levantador Hidráulico – Ajuste de Altura" (Unapel New Holland) e "Câmbio TL 75" (Trator
  Peças), vistos só pelos quadros de capa, como referência do arranjo; nada copiado deles. Construção típica;
  medidas e ajustes: manual de serviço.
