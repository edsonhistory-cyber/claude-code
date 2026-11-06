// The front-drive (PDM) transfer box of a TL-class tractor as an assembly lesson: the box bolted under the
// transmission that takes the drive off the pinion shaft and sends it forward, through a splined output shaft, to the
// cardan and the front axle. This is the version with the mechanical command seen on the assembly line: on the side
// of the box a notched command disc on the selector shaft, a bent arm clamped by a bolt, a torsion spring, and a lower
// lever with an eye for the command rod. The inside (input gear free on needles, hub and sliding dog sleeve, fork on
// the selector shaft, detent ball and spring, two ball bearings, seal) is a typical construction: NOT the factory
// drawing. Torques: manual de serviço.
//
// World frame = the tractor's: +z forward. The box axis is the tractor's transfer axis (y = AXLE - CD), its input gear
// meshes the transfer gear on the pinion shaft above it.

export const AXLE = 0.77;
export const Y = AXLE - 0.12; // the box axis
export const ZG = 0.3; // the input gear's plane
export const ZH = 0.345; // the hub's plane
export const SX = 0.0; // selector shaft along x, at ...
export const SY = Y - 0.045;
export const TRAVEL = 0.012;
export const TOP_BOLTS = 6;
export const CROSS6 = [0, 3, 1, 4, 2, 5];
export const Z = {drive: 30, input: 30};

const P = [];
const part = (o) => (P.push(o), o);
part({id: 'cambioBase', kind: 'gearboxStub', grp: 'case', name: 'Carcaça da transmissão (no trator)', qty: 1, step: 0, ex: [0, 0, 0]});
// the shaft group, built on the bench
part({id: 'eixoSaida', kind: 'outShaft', grp: 'shaft', name: 'Eixo de saída estriado (para o cardã)', qty: 1, step: 2, ex: [0, 0, 0]});
part({id: 'rolT', kind: 'ballBrg', grp: 'shaft', at: 0.215, name: 'Rolamento traseiro', qty: 1, step: 2, ex: [0, 0, -0.32]});
part({id: 'cubo', kind: 'hub', grp: 'shaft', name: 'Cubo de engate (estriado no eixo)', qty: 1, step: 3, ex: [0, 0, 0.36]});
part({id: 'anelCubo', kind: 'snap', grp: 'shaft', at: ZH + 0.012, name: 'Anel-trava do cubo', qty: 1, step: 3, ex: [0, 0, 0.42]});
part({id: 'luva', kind: 'sleeve', grp: 'shaft', name: 'Luva de engate da tração', qty: 1, step: 4, ex: [0, 0, 0.5]});
part({id: 'bucha', kind: 'needleBush', grp: 'shaft', name: 'Bucha de agulhas da engrenagem', qty: 1, step: 5, ex: [0, 0, -0.42]});
part({id: 'engEntrada', kind: 'inputGear', grp: 'shaft', name: 'Engrenagem de entrada 30 D (dentes de engate)', qty: 1, step: 5, ex: [0, 0, -0.5]});
part({id: 'arruela', kind: 'thrustW', grp: 'shaft', at: ZG - 0.018, name: 'Arruela de encosto', qty: 1, step: 6, ex: [0, 0, -0.56]});
part({id: 'anelEng', kind: 'snap', grp: 'shaft', at: ZG - 0.021, name: 'Anel-trava da engrenagem', qty: 1, step: 6, ex: [0, 0, -0.6]});
// the box
part({id: 'carcaca', kind: 'boxHousing', grp: 'box', name: 'Carcaça da caixa da PDM', qty: 1, step: 1, ex: [0, 0, 0]});
part({id: 'rolF', kind: 'ballBrg', grp: 'box', at: 0.462, name: 'Rolamento dianteiro', qty: 1, step: 8, ex: [0, 0, 0.42]});
part({id: 'anelRolF', kind: 'boreSnap', grp: 'box', at: 0.476, name: 'Anel elástico do rolamento dianteiro', qty: 1, step: 8, ex: [0, 0, 0.48]});
part({id: 'retentor', kind: 'seal', grp: 'box', name: 'Retentor do eixo de saída', qty: 1, step: 9, ex: [0, 0, 0.55]});
part({id: 'tampaF', kind: 'frontCover', grp: 'box', name: 'Tampa dianteira usinada', qty: 1, step: 9, ex: [0, 0, 0.62]});
for (let i = 0; i < 3; i++) part({id: `parafF${i}`, kind: 'frontBolt', grp: 'box', bolt: i, name: 'Parafuso da tampa dianteira', qty: 1, step: 9, ex: [0, 0, 0.7], stagger: i});
part({id: 'eixoSel', kind: 'selShaft', grp: 'box', name: 'Eixo seletor com anel O-ring', qty: 1, step: 10, ex: [0.42, 0, 0]});
part({id: 'garfo', kind: 'fork', grp: 'box', name: 'Garfo de engate', qty: 1, step: 10, ex: [0, -0.22, 0]});
part({id: 'pinoGarfo', kind: 'rollPin', grp: 'box', name: 'Pino elástico do garfo', qty: 1, step: 10, ex: [0, -0.3, 0.1]});
part({id: 'esferaTrava', kind: 'detentBall', grp: 'box', name: 'Esfera de trava', qty: 1, step: 11, ex: [0, -0.3, -0.1]});
part({id: 'molaTrava', kind: 'detentSpring', grp: 'box', name: 'Mola da esfera', qty: 1, step: 11, ex: [0, -0.36, -0.1]});
part({id: 'bujaoTrava', kind: 'detentPlug', grp: 'box', name: 'Bujão da trava com arruela', qty: 1, step: 11, ex: [0, -0.42, -0.1]});
part({id: 'juntaT', kind: 'rearGasket', grp: 'box', name: 'Junta da tampa traseira', qty: 1, step: 12, ex: [0, 0, -0.36]});
part({id: 'tampaT', kind: 'rearCover', grp: 'box', name: 'Tampa traseira', qty: 1, step: 12, ex: [0, 0, -0.42]});
for (let i = 0; i < 4; i++) part({id: `parafT${i}`, kind: 'rearBolt', grp: 'box', bolt: i, name: 'Parafuso da tampa traseira', qty: 1, step: 12, ex: [0, 0, -0.5], stagger: [0, 2, 1, 3][i]});
part({id: 'disco', kind: 'camDisc', grp: 'box', name: 'Disco de comando (com entalhes)', qty: 1, step: 13, ex: [0.3, 0, 0]});
part({id: 'molaTorcao', kind: 'torsionSpring', grp: 'box', name: 'Mola de torção de retorno', qty: 1, step: 14, ex: [0.36, 0.06, 0]});
part({id: 'braco', kind: 'arm', grp: 'box', name: 'Braço dobrado do comando', qty: 1, step: 15, ex: [0.42, 0.12, 0]});
part({id: 'parafBraco', kind: 'clampBolt', grp: 'box', name: 'Parafuso de aperto do braço', qty: 1, step: 15, ex: [0.48, 0.12, 0.06]});
part({id: 'alavanca', kind: 'lowerLever', grp: 'box', name: 'Alavanca com olhal da haste', qty: 1, step: 15, ex: [0.46, -0.16, 0]});
// up to the tractor
part({id: 'pinosGuia', kind: 'dowels', grp: 'case', name: 'Pinos-guia', qty: 2, step: 16, ex: [0, -0.45, 0]});
part({id: 'juntaS', kind: 'topGasket', grp: 'case', name: 'Junta da caixa', qty: 1, step: 16, ex: [0, -0.5, 0]});
for (let i = 0; i < TOP_BOLTS; i++) part({id: `parafS${i}`, kind: 'topBolt', grp: 'box', bolt: i, name: 'Parafuso de fixação na transmissão', qty: 1, step: 17, ex: [0, -0.18, 0], stagger: CROSS6.indexOf(i)});
part({id: 'haste', kind: 'rod', grp: 'case', name: 'Haste de comando com pino e contrapino', qty: 1, step: 18, ex: [0.35, -0.2, 0]});
part({id: 'bujaoDreno', kind: 'drainPlug', grp: 'box', name: 'Bujão de dreno de latão com arruela', qty: 1, step: 19, ex: [0, -0.25, 0]});
export const PARTS = P;

export const STEPS = [
  {title: 'Peças separadas, trator no cavalete', text: 'A caixa da PDM é montada na bancada e depois sobe por baixo da transmissão. Confira as peças pela lista.', why: 'A caixa tira força do eixo do pinhão e manda para a frente, para o cardã e o eixo dianteiro (PDM).', tool: 'Bancada, macaco de transmissão', care: 'Retentor, juntas, anel O-ring e pinos elásticos novos.', view: 'geral'},
  {title: 'Carcaça na bancada', text: 'Apoie a carcaça da caixa na bancada, com a face de fixação para cima.', why: 'A carcaça segura os rolamentos do eixo e o eixo seletor.', tool: 'Bancada limpa', care: 'Faces sem rebarba; furos roscados limpos.', view: 'box'},
  {title: 'Rolamento traseiro no eixo de saída', text: 'Prense o rolamento traseiro no eixo de saída até o encosto.', why: 'O eixo de saída gira apoiado em dois rolamentos.', tool: 'Prensa, bucha no anel interno', care: 'Força só no anel interno.', view: 'shaft'},
  {title: 'Cubo de engate e anel-trava', text: 'Prense o cubo nas estrias do eixo e trave com o anel-trava.', why: 'O cubo gira sempre junto com o eixo de saída.', tool: 'Prensa, alicate de anel', care: 'Anel todo no canal.', view: 'shaft'},
  {title: 'Luva de engate', text: 'Deslize a luva de engate sobre o cubo, com o canal do garfo voltado para o lado do eixo seletor.', why: 'É a luva que liga e desliga a tração: andando para a engrenagem, ela prende a engrenagem no cubo.', tool: '—', care: 'Luva deslizando livre.', view: 'shaft'},
  {title: 'Bucha de agulhas e engrenagem de entrada', text: 'Lubrifique a bucha de agulhas e monte a engrenagem de entrada (30 dentes), dentes de engate voltados para a luva.', why: 'A engrenagem gira sempre, puxada pela transmissão; com a tração desligada ela gira solta sobre as agulhas.', tool: 'Óleo de transmissão', care: 'Gira livre com a mão.', view: 'shaft'},
  {title: 'Arruela e anel-trava da engrenagem', text: 'Coloque a arruela de encosto e trave a engrenagem com o anel-trava.', why: 'Segura a engrenagem no lugar contra o empuxo dos dentes.', tool: 'Alicate de anel', care: 'Folga axial conforme o manual de serviço.', view: 'shaft'},
  {title: 'Eixo montado na carcaça', text: 'Desça o conjunto do eixo na carcaça, com o rolamento traseiro no alojamento.', why: 'A engrenagem fica no alto, saindo pela abertura de cima para engrenar na transmissão.', tool: '—', care: 'Rolamento assentado por igual.', view: 'box'},
  {title: 'Rolamento dianteiro e anel elástico', text: 'Monte o rolamento dianteiro no eixo e no alojamento e trave com o anel elástico.', why: 'O apoio dianteiro aguenta o peso e a força do cardã.', tool: 'Batedor, alicate de anel interno', care: '—', view: 'front'},
  {title: 'Retentor, tampa dianteira e parafusos', text: 'Monte o retentor com o lábio para dentro e a tampa dianteira usinada com os 3 parafusos.', why: 'O retentor segura o óleo em volta do eixo de saída estriado.', tool: 'Batedor de retentor, chave', care: 'Lábio com graxa. Torque: manual de serviço.', view: 'front'},
  {title: 'Eixo seletor, garfo e pino elástico', text: 'Passe o eixo seletor, com o anel O-ring, pela lateral da carcaça; encaixe o garfo no canal da luva e prenda o garfo no eixo com o pino elástico.', why: 'Girando o eixo seletor, o garfo empurra a luva para a frente e para trás.', tool: 'Saca-pino, martelo', care: 'O-ring lubrificado para não cortar.', view: 'sel'},
  {title: 'Esfera, mola e bujão da trava', text: 'Coloque a esfera e a mola no furo da trava e feche com o bujão e a arruela.', why: 'A esfera cai nos entalhes do eixo seletor e segura a posição: tração ligada ou desligada (o "clique").', tool: 'Chave', care: 'Teste: o eixo seletor para firme nas duas posições.', view: 'sel'},
  {title: 'Junta e tampa traseira', text: 'Junta nova, tampa traseira e os 4 parafusos em cruz.', why: 'Fecha a caixa por trás.', tool: 'Chave, torquímetro', care: 'Torque: manual de serviço.', view: 'rear'},
  {title: 'Disco de comando', text: 'Encaixe o disco de comando, com os entalhes, na ponta do eixo seletor.', why: 'O disco é a peça que se vê do lado de fora: ele mostra e trava a posição do comando.', tool: '—', care: 'Marca do disco alinhada com a marca do eixo.', view: 'cmd'},
  {title: 'Mola de torção', text: 'Monte a mola de torção em volta do eixo, com as pontas nos batentes.', why: 'A mola devolve o comando para a posição de repouso.', tool: 'Alicate', care: 'Pontas da mola nos batentes certos.', view: 'cmd'},
  {title: 'Braço dobrado, parafuso e alavanca', text: 'Monte o braço dobrado e aperte o parafuso de aperto; monte a alavanca com o olhal para baixo.', why: 'O braço e a alavanca recebem o movimento da haste que vem da alavanca da tração.', tool: 'Chave', care: 'Braço sem folga no eixo.', view: 'cmd'},
  {title: 'Pinos-guia e junta na transmissão', text: 'Coloque os 2 pinos-guia e a junta na face de baixo da transmissão.', why: 'Os pinos centralizam a caixa para a engrenagem engrenar certo.', tool: '—', care: 'Junta nova.', view: 'under'},
  {title: 'Caixa na transmissão, parafusos em cruz', text: 'Suba a caixa por baixo, encaixando nos pinos-guia e engrenando a engrenagem de entrada; aperte os 6 parafusos em cruz.', why: 'Agora a engrenagem de entrada gira com o eixo do pinhão.', tool: 'Macaco de transmissão, torquímetro', care: 'Gire o eixo de saída para engrenar; nunca force.', view: 'under'},
  {title: 'Haste de comando', text: 'Ligue a haste de comando no olhal da alavanca com o pino e o contrapino.', why: 'A haste traz o movimento da alavanca de tração do posto do operador.', tool: 'Alicate', care: 'Regule a haste para os dois cliques baterem com a alavanca.', view: 'cmdUp'},
  {title: 'Bujão de dreno e óleo', text: 'Monte o bujão de dreno de latão com a arruela nova e complete o óleo pelo nível.', why: 'As engrenagens e a luva trabalham banhadas em óleo.', tool: 'Chave do bujão', care: 'Óleo especificado no manual.', view: 'geral'},
];
export const N = STEPS.length - 1;

const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const ease = (x) => {
  const u = clamp01(x);
  return u * u * u * (u * (u * 6 - 15) + 10);
};
export function installed(p, u) {
  if (p.step === 0) return 1;
  const s0 = p.step - 1;
  const n = PARTS.filter((q) => q.step === p.step && q.stagger !== undefined).length;
  if (p.stagger !== undefined && n > 1) return ease((u - (s0 + 0.15 + (p.stagger / n) * 0.65)) / 0.2);
  return ease(u - s0);
}
// the box and the shaft are built on a bench in front of and below the transmission; the shaft drops into the box
// at step 7, the box goes up under the tractor at step 17
export const BENCH = {box: {y: -0.42, z: 0.55, step: 17}, shaft: {y: -0.42 + 0.3, z: 0.55, step: 7}};
export const groupAt = (g, u) => {
  if (g === 'shaft') {
    const k = clamp01(u - 6);
    const box = groupAt('box', u);
    return {y: box.y + 0.3 * (1 - ease(k)), z: box.z};
  }
  const b = BENCH[g];
  if (!b) return {y: 0, z: 0};
  const k = clamp01(u - (b.step - 1));
  return {y: b.y * (1 - ease((k - 0.35) / 0.65)), z: b.z * (1 - ease(k / 0.5))};
};
export const stepAt = (u) => {
  const s = Math.min(N, Math.max(0, Math.ceil(u - 1e-6)));
  return {s, p: s === 0 ? 1 : clamp01(u - (s - 1))};
};
export const activeParts = (u) => PARTS.filter((p) => p.step === stepAt(u).s);
