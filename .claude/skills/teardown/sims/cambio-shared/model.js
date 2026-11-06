// The 4-speed synchronised gearbox of a TL-class tractor (TL80 family) as an assembly lesson. No three.js here.
// From parts-seller listings for the TL family: the pilot (input) shaft has 23 teeth and is 264 mm long; the
// synchronised gear / sleeve has 23 teeth (100 x 80 x 20). The rest is this model's own, on the 120 mm centre distance
// of the tractor model (tooth sum 60 at a 4 mm module): pilot 23 -> countershaft head 37; 1st 19/41, 2nd 23/37,
// 3rd 28/32, 4th direct (the 3-4 sleeve locks the pilot shaft to the main shaft). Generic shapes, a typical sequence;
// NOT the factory drawing. Torques: manual de serviço.
//
// World frame = the tractor's: shafts along z (+z forward), main shaft at TOP, countershaft at BOT.

export const MOD = 0.004;
export const AXLE = 0.77;
export const CD = 0.12;
export const TOP = AXLE + CD;
export const BOT = AXLE;
export const Z = {pilot: 23, head: 37, c1: 19, m1: 41, c2: 23, m2: 37, c3: 28, m3: 32};
export const K = Z.head / Z.pilot; // countershaft turns this much slower than the pilot
export const RATIO = {N: 0, 1: K * (Z.m1 / Z.c1), 2: K * (Z.m2 / Z.c2), 3: K * (Z.m3 / Z.c3), 4: 1};
export const ZP = {pilotGear: 0.93, hub34: 0.866, m3: 0.832, m2: 0.782, hub12: 0.748, m1: 0.714};
export const TRAVEL = 0.011;
export const DOG = 0.021;
export const COVER_BOLTS = 8;
export const FRONT_BOLTS = 6;
export const CROSS8 = [0, 4, 2, 6, 1, 5, 3, 7];
export const CROSS6 = [0, 3, 1, 4, 2, 5];

// ------------------------------------------------------------ parts
// grp: 'case' (in place), 'cs' (countershaft, built on the bench), 'main' (main shaft, on the bench), 'cover' (the
// shift cover, on the bench), 'front' (the tractor's front half, rolled away while the box is open)
const P = [];
const part = (o) => (P.push(o), o);
part({id: 'carcaca', kind: 'case', grp: 'case', name: 'Carcaça do câmbio', qty: 1, step: 0, ex: [0, 0, 0]});
part({id: 'frente', kind: 'tractorFront', grp: 'front', name: 'Motor e frente do trator (separados)', qty: 1, step: 24, ex: [0, 0, 2.6]});
// countershaft
part({id: 'eixoInt', kind: 'cluster', grp: 'cs', name: 'Eixo intermediário (engrenagens 37·28·23·19)', qty: 1, step: 1, ex: [0, 0, 0]});
part({id: 'rolIntF', kind: 'rollerBrg', grp: 'cs', at: 0.975, name: 'Rolamento de rolos dianteiro do intermediário', qty: 1, step: 1, ex: [0, 0, 0.5]});
part({id: 'rolIntT', kind: 'rollerBrg', grp: 'cs', at: 0.68, name: 'Rolamento de rolos traseiro do intermediário', qty: 1, step: 2, ex: [0, 0, -0.45]});
part({id: 'anelIntT', kind: 'snapShaft', grp: 'cs', at: 0.664, name: 'Anel-trava do intermediário', qty: 1, step: 2, ex: [0, 0, -0.55]});
// main shaft, from the rear forward
part({id: 'eixoSec', kind: 'mainShaft', grp: 'main', name: 'Eixo secundário (estriado)', qty: 1, step: 3, ex: [0, 0, 0.000]});
part({id: 'bucha1', kind: 'needleBush', grp: 'main', at: ZP.m1, name: 'Bucha + rolamento de agulhas da 1ª', qty: 1, step: 4, ex: [0, 0, 0.252]});
part({id: 'eng1', kind: 'freeGear', grp: 'main', gear: 1, name: 'Engrenagem da 1ª (41 dentes)', qty: 1, step: 4, ex: [0, 0, 0.330]});
part({id: 'anelS1', kind: 'synchroRing', grp: 'main', at: ZP.hub12 - 0.016, name: 'Anel sincronizador (bronze) da 1ª', qty: 1, step: 5, ex: [0, 0, 0.360]});
part({id: 'cubo12', kind: 'hub', grp: 'main', at: ZP.hub12, name: 'Cubo do sincronizador 1–2', qty: 1, step: 6, ex: [0, 0, 0.396]});
part({id: 'chav12', kind: 'struts', grp: 'main', at: ZP.hub12, name: 'Chavetas do sincronizador 1–2', qty: 3, step: 6, ex: [0, 0.12, 0.420]});
part({id: 'mola12', kind: 'strutSprings', grp: 'main', at: ZP.hub12, name: 'Molas das chavetas 1–2', qty: 2, step: 6, ex: [0, -0.12, 0.432]});
part({id: 'luva12', kind: 'sleeve', grp: 'main', at: ZP.hub12, hub: 0, name: 'Luva de engate 1–2', qty: 1, step: 7, ex: [0, 0, 0.468]});
part({id: 'anelS2', kind: 'synchroRing', grp: 'main', at: ZP.hub12 + 0.016, name: 'Anel sincronizador (bronze) da 2ª', qty: 1, step: 8, ex: [0, 0, 0.504]});
part({id: 'bucha2', kind: 'needleBush', grp: 'main', at: ZP.m2, name: 'Bucha + rolamento de agulhas da 2ª', qty: 1, step: 9, ex: [0, 0, 0.540]});
part({id: 'eng2', kind: 'freeGear', grp: 'main', gear: 2, name: 'Engrenagem da 2ª (37 dentes)', qty: 1, step: 9, ex: [0, 0, 0.588]});
part({id: 'arruela23', kind: 'thrustW', grp: 'main', at: 0.8075, name: 'Arruela de encosto entre 2ª e 3ª', qty: 1, step: 10, ex: [0, 0, 0.612]});
part({id: 'bucha3', kind: 'needleBush', grp: 'main', at: ZP.m3, name: 'Bucha + rolamento de agulhas da 3ª', qty: 1, step: 10, ex: [0, 0, 0.636]});
part({id: 'eng3', kind: 'freeGear', grp: 'main', gear: 3, name: 'Engrenagem da 3ª (32 dentes)', qty: 1, step: 10, ex: [0, 0, 0.672]});
part({id: 'anelS3', kind: 'synchroRing', grp: 'main', at: ZP.hub34 - 0.016, name: 'Anel sincronizador (bronze) da 3ª', qty: 1, step: 11, ex: [0, 0, 0.696]});
part({id: 'cubo34', kind: 'hub', grp: 'main', at: ZP.hub34, name: 'Cubo do sincronizador 3–4', qty: 1, step: 12, ex: [0, 0, 0.732]});
part({id: 'chav34', kind: 'struts', grp: 'main', at: ZP.hub34, name: 'Chavetas do sincronizador 3–4', qty: 3, step: 12, ex: [0, 0.12, 0.756]});
part({id: 'mola34', kind: 'strutSprings', grp: 'main', at: ZP.hub34, name: 'Molas das chavetas 3–4', qty: 2, step: 12, ex: [0, -0.12, 0.768]});
part({id: 'anelCubo', kind: 'snapShaft', grp: 'main', at: 0.879, name: 'Anel-trava do cubo 3–4', qty: 1, step: 12, ex: [0, 0, 0.792]});
part({id: 'luva34', kind: 'sleeve', grp: 'main', at: ZP.hub34, hub: 1, name: 'Luva de engate 3–4', qty: 1, step: 13, ex: [0, 0, 0.828]});
part({id: 'anelS4', kind: 'synchroRing', grp: 'main', at: ZP.hub34 + 0.016, name: 'Anel sincronizador (bronze) da 4ª', qty: 1, step: 14, ex: [0, 0, 0.864]});
part({id: 'rolGuia', kind: 'pilotNeedle', grp: 'main', at: 0.897, name: 'Rolamento-guia de agulhas (ponta do secundário)', qty: 1, step: 14, ex: [0, 0, 0.900]});
part({id: 'rolSec', kind: 'ballBrg', grp: 'main', at: 0.678, r: [0.022, 0.045], name: 'Rolamento traseiro do eixo secundário', qty: 1, step: 15, ex: [0, 0, -0.252]});
// into the case
part({id: 'pinosInt', kind: 'csSnaps', grp: 'case', name: 'Anéis elásticos dos rolamentos do intermediário', qty: 2, step: 16, ex: [0.28, 0, 0.6]});
part({id: 'anelSec', kind: 'boreSnap', grp: 'case', at: 0.661, y: TOP, r: 0.045, name: 'Anel elástico do rolamento traseiro', qty: 1, step: 17, ex: [0, 0.2, -0.4]});
part({id: 'eixoPiloto', kind: 'pilotShaft', grp: 'case', name: 'Eixo piloto 23 dentes (264 mm)', qty: 1, step: 18, ex: [0, -0.3, 0.75]});
part({id: 'rolPiloto', kind: 'ballBrg', grp: 'case', at: 1.005, y: TOP, r: [0.022, 0.05], name: 'Rolamento do eixo piloto', qty: 1, step: 18, ex: [0, -0.3, 0.62]});
part({id: 'anelPiloto', kind: 'snapShaft', grp: 'case', at: 1.022, y: TOP, name: 'Anel-trava do eixo piloto', qty: 1, step: 18, ex: [0, -0.3, 0.68]});
part({id: 'juntaF', kind: 'frontGasket', grp: 'case', name: 'Junta da tampa dianteira', qty: 1, step: 19, ex: [0, -0.3, 0.5]});
part({id: 'tampaF', kind: 'frontCover', grp: 'case', name: 'Tampa dianteira (guia do rolamento da embreagem)', qty: 1, step: 19, ex: [0, -0.3, 0.58]});
part({id: 'retF', kind: 'frontSeal', grp: 'case', name: 'Retentor do eixo piloto', qty: 1, step: 19, ex: [0, -0.3, 0.66]});
for (let i = 0; i < FRONT_BOLTS; i++) {
  const a = (i / FRONT_BOLTS) * Math.PI * 2;
  part({id: `parafF${i}`, kind: 'bolt', grp: 'case', bolt: i, face: 'front', name: 'Parafuso M10 com arruela (tampa dianteira)', qty: 1, step: 19, ex: [Math.cos(a) * 0.1, Math.sin(a) * 0.1 - 0.3, 0.4], stagger: CROSS6.indexOf(i)});
}
// the shift cover (built on the bench)
part({id: 'tampaC', kind: 'shiftCover', grp: 'cover', name: 'Tampa de comando', qty: 1, step: 20, ex: [0, 0, 0]});
for (const [i, n] of [[0, '1–2'], [1, '3–4']]) {
  part({id: `trilho${i}`, kind: 'rail', grp: 'cover', rail: i, name: `Trilho seletor ${n}`, qty: 1, step: 20, ex: [0, 0, 0.55 + i * 0.06]});
  part({id: `garfo${i}`, kind: 'fork', grp: 'cover', rail: i, name: `Garfo ${n}`, qty: 1, step: 20, ex: [0, -0.12, 0.3 + i * 0.06]});
  part({id: `parGarfo${i}`, kind: 'forkScrew', grp: 'cover', rail: i, name: 'Parafuso-trava do garfo', qty: 1, step: 20, ex: [0, 0.12, 0.3 + i * 0.06]});
  part({id: `esfera${i}`, kind: 'detentBall', grp: 'cover', rail: i, name: 'Esfera de trava', qty: 1, step: 21, ex: [0, 0.2, 0.1 + i * 0.04]});
  part({id: `molaT${i}`, kind: 'detentSpring', grp: 'cover', rail: i, name: 'Mola da esfera de trava', qty: 1, step: 21, ex: [0, 0.28, 0.1 + i * 0.04]});
}
part({id: 'pinoInter', kind: 'interlock', grp: 'cover', name: 'Pino de intertravamento', qty: 1, step: 21, ex: [0.15, 0.1, 0.15]});
part({id: 'juntaC', kind: 'coverGasket', grp: 'case', name: 'Junta da tampa de comando', qty: 1, step: 22, ex: [0, 0.45, 0]});
for (let i = 0; i < COVER_BOLTS; i++) part({id: `parafC${i}`, kind: 'bolt', grp: 'case', bolt: i, face: 'top', name: 'Parafuso M10 com arruela (tampa de comando)', qty: 1, step: 23, ex: [0, 0.32, 0], stagger: CROSS8.indexOf(i)});
export const PARTS = P;

// ------------------------------------------------------------ steps
export const STEPS = [
  {title: 'Trator aberto, peças separadas', text: 'O trator foi separado entre o motor e o câmbio. A carcaça do câmbio está limpa e as peças conferidas pela lista.', why: 'Para tirar e pôr o câmbio, o trator é "aberto" no meio: o motor vai para a frente sobre cavaletes ou carrinho.', tool: 'Carrinho/cavaletes de separação, talha', care: 'Calce bem as duas metades antes de soltar os parafusos.', view: 'geral'},
  {title: 'Rolamento dianteiro do intermediário', text: 'Prense o rolamento de rolos na ponta dianteira do eixo intermediário.', why: 'O eixo intermediário gira sempre: recebe a força do eixo piloto e a distribui para as engrenagens das marchas.', tool: 'Prensa, bucha no anel interno', care: 'Força só no anel interno.', view: 'cs'},
  {title: 'Rolamento traseiro e anel-trava', text: 'Prense o rolamento traseiro e trave com o anel-trava no canal do eixo.', why: 'Dois rolamentos seguram o intermediário alinhado com o eixo secundário.', tool: 'Prensa, alicate de anel', care: 'Anel-trava todo no canal.', view: 'cs'},
  {title: 'Eixo secundário na bancada', text: 'Prenda o eixo secundário de pé, com a ponta traseira para baixo.', why: 'O secundário é a saída do câmbio. As engrenagens das marchas ficam soltas nele, sobre agulhas; só o cubo do sincronizador é preso nas estrias.', tool: 'Morsa com mordente macio', care: 'Estrias limpas, sem rebarba.', view: 'main'},
  {title: 'Bucha de agulhas e engrenagem da 1ª', text: 'Lubrifique a bucha de agulhas e monte a engrenagem da 1ª (41 dentes) com os dentes de engate voltados para cima (para o cubo 1–2).', why: 'A engrenagem gira livre no eixo enquanto a marcha não está engatada.', tool: 'Óleo de transmissão', care: 'Engrenagem gira livre com a mão.', view: 'main'},
  {title: 'Anel sincronizador da 1ª', text: 'Coloque o anel de bronze sobre o cone da engrenagem da 1ª.', why: 'O anel é um freio pequeno: antes de engatar, ele iguala a rotação da engrenagem com a do eixo, e a luva entra sem arranhar.', tool: '—', care: 'Rasgos do anel alinhados com as chavetas do cubo.', view: 'main'},
  {title: 'Cubo 1–2 com chavetas e molas', text: 'Prense o cubo 1–2 nas estrias do eixo. Monte as 3 chavetas nos rasgos e as 2 molas de arame (pontas em chavetas diferentes).', why: 'O cubo gira sempre junto com o eixo. As chavetas empurram o anel de bronze contra o cone no começo do engate.', tool: 'Prensa', care: 'Lado do cubo: rebaixo voltado para a engrenagem indicada no manual.', view: 'main'},
  {title: 'Luva de engate 1–2', text: 'Deslize a luva sobre o cubo, encaixando-a nas chavetas, com o canal do garfo para cima.', why: 'A luva é quem engata a marcha: deslizando para a 1ª ou para a 2ª, ela prende a engrenagem no cubo e no eixo.', tool: '—', care: 'Marcas da luva e do cubo alinhadas.', view: 'main'},
  {title: 'Anel sincronizador da 2ª', text: 'Coloque o anel de bronze da 2ª sobre o cubo, rasgos nas chavetas.', why: 'Mesmo trabalho do anel da 1ª, do outro lado do cubo.', tool: '—', care: '—', view: 'main'},
  {title: 'Bucha de agulhas e engrenagem da 2ª', text: 'Monte a bucha de agulhas e a engrenagem da 2ª (37 dentes), dentes de engate para baixo (para o cubo 1–2).', why: 'Engrenagem livre sobre agulhas, como a da 1ª.', tool: 'Óleo de transmissão', care: 'Gira livre.', view: 'main'},
  {title: 'Arruela, bucha e engrenagem da 3ª', text: 'Coloque a arruela de encosto, a bucha de agulhas e a engrenagem da 3ª (32 dentes), dentes de engate para cima.', why: 'A arruela separa as duas engrenagens livres e aguenta o empuxo dos dentes helicoidais.', tool: '—', care: 'Face lisa da arruela para a engrenagem.', view: 'main'},
  {title: 'Anel sincronizador da 3ª', text: 'Coloque o anel de bronze sobre o cone da engrenagem da 3ª.', why: '—', tool: '—', care: 'Rasgos alinhados.', view: 'main'},
  {title: 'Cubo 3–4, chavetas, molas e anel-trava', text: 'Prense o cubo 3–4 nas estrias, monte chavetas e molas e trave o cubo com o anel-trava.', why: 'O anel-trava segura todo o pacote de engrenagens no eixo.', tool: 'Prensa, alicate de anel', care: 'Folga axial das engrenagens: conforme manual de serviço.', view: 'main'},
  {title: 'Luva de engate 3–4', text: 'Deslize a luva 3–4 sobre o cubo.', why: 'Para a 3ª ela prende a engrenagem da 3ª; para a 4ª ela prende o eixo piloto direto no secundário (4ª direta, 1 : 1).', tool: '—', care: 'Canal do garfo para cima.', view: 'main'},
  {title: 'Anel da 4ª e rolamento-guia', text: 'Coloque o anel de bronze da 4ª e, na ponta do secundário, o rolamento-guia de agulhas.', why: 'A ponta do secundário entra dentro do eixo piloto e gira apoiada nesse rolamento.', tool: 'Graxa', care: '—', view: 'main'},
  {title: 'Rolamento traseiro do secundário', text: 'Prense o rolamento de esferas na ponta traseira do eixo secundário.', why: 'É o apoio traseiro do secundário na carcaça.', tool: 'Prensa', care: 'Força só no anel interno.', view: 'main'},
  {title: 'Intermediário na carcaça', text: 'Desça o eixo intermediário na carcaça, rolamentos nos alojamentos, e trave com os anéis elásticos.', why: 'O intermediário fica embaixo, engrenado com todas as marchas ao mesmo tempo.', tool: 'Talha, alicate de anel', care: 'Gire com a mão: deve rodar livre.', view: 'case'},
  {title: 'Secundário na carcaça', text: 'Desça o eixo secundário montado, engrenando as marchas no intermediário, e trave o rolamento traseiro com o anel elástico.', why: 'Agora cada engrenagem livre do secundário está engrenada com a sua no intermediário: todas giram, mas só a engatada pela luva passa força.', tool: 'Talha', care: 'Não force: gire o intermediário até engrenar.', view: 'case'},
  {title: 'Eixo piloto com rolamento', text: 'Pela frente, passe o eixo piloto (23 dentes, 264 mm) com o rolamento, encaixando a ponta do secundário no rolamento-guia, e trave com o anel.', why: 'O eixo piloto recebe a força do motor pela embreagem e engrena no intermediário. Na 4ª ele é preso direto no secundário.', tool: 'Batedor', care: 'Ponta do secundário bem centrada no rolamento-guia.', view: 'front'},
  {title: 'Tampa dianteira, retentor e parafusos', text: 'Junta nova, tampa dianteira com o retentor e os 6 parafusos com arruela, apertados em cruz na ordem mostrada.', why: 'A tampa segura o rolamento do piloto e serve de guia para o rolamento da embreagem.', tool: 'Chave 16 mm, torquímetro', care: 'Torque: manual de serviço. Lábio do retentor para dentro.', view: 'front'},
  {title: 'Trilhos e garfos na tampa de comando', text: 'Na bancada, passe os 2 trilhos pela tampa e pelos garfos e trave cada garfo com o parafuso-trava.', why: 'A alavanca empurra um trilho; o garfo preso nele empurra a luva.', tool: 'Chave, trava-rosca', care: 'Garfo 1–2 no trilho 1–2.', view: 'cover'},
  {title: 'Esferas, molas e pino de intertravamento', text: 'Monte as esferas e molas de trava sobre os trilhos e o pino de intertravamento entre eles.', why: 'As esferas seguram o trilho em neutro ou na marcha (o "clique"). O pino impede engatar duas marchas ao mesmo tempo.', tool: 'Graxa', care: 'Teste: só um trilho pode sair do neutro por vez.', view: 'cover'},
  {title: 'Junta e tampa de comando', text: 'Com câmbio e luvas em neutro, coloque a junta e desça a tampa: os garfos entram nos canais das luvas.', why: 'Agora a alavanca comanda as luvas pelos trilhos e garfos.', tool: '—', care: 'Tudo em neutro antes de baixar a tampa.', view: 'case'},
  {title: 'Parafusos da tampa, em cruz', text: 'Os 8 parafusos com arruela, apertados em cruz na ordem mostrada.', why: 'Aperto em cruz assenta a tampa por igual, sem vazar.', tool: 'Chave 16 mm, torquímetro', care: 'Torque: manual de serviço.', view: 'top'},
  {title: 'Fechar o trator', text: 'Aproxime o motor do câmbio, encaixando as estrias do eixo piloto no disco da embreagem, e aperte os parafusos da união.', why: 'O motor volta a tocar o câmbio pela embreagem.', tool: 'Carrinho, talha, pinos-guia', care: 'Nunca deixe o peso pendurado no eixo piloto.', view: 'geral'},
];
export const N = STEPS.length - 1;

// ------------------------------------------------------------ the pose at u
const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const ease = (x) => {
  const u = clamp01(x);
  return u * u * u * (u * (u * 6 - 15) + 10);
};
export function installed(p, u) {
  if (p.step === 0) return 1;
  const s0 = p.step - 1;
  const n = PARTS.filter((q) => q.step === p.step && q.stagger !== undefined).length;
  if (p.stagger !== undefined && n > 1) return ease((u - (s0 + (p.stagger / n) * 0.75)) / 0.25);
  return ease(u - s0);
}
// where each bench sub-assembly sits until it is put in: in front of the case (the engine is away), lifted over the
// case and lowered in through the top opening
export const BENCH = {cs: {y: 0.0, z: 1.45, step: 16}, main: {y: 0.42, z: 1.45, step: 17}, cover: {y: 0.62, z: 0.0, step: 22}};
export const groupAt = (g, u) => {
  const b = BENCH[g];
  if (!b) return {y: 0, z: 0};
  const k = clamp01(u - (b.step - 1));
  const lift = b.z ? 0.36 : 0;
  const k1 = ease(k / 0.55);
  const k2 = ease((k - 0.45) / 0.55);
  return {y: b.y * (1 - k2) + lift * k1 * (1 - k2), z: b.z * (1 - k1)};
};
export const stepAt = (u) => {
  const s = Math.min(N, Math.max(0, Math.ceil(u - 1e-6)));
  return {s, p: s === 0 ? 1 : clamp01(u - (s - 1))};
};
export const activeParts = (u) => PARTS.filter((p) => p.step === stepAt(u).s);

// ------------------------------------------------------------ how it works
const RPM = (2 * Math.PI) / 60;
export const meshed = (thA, zA, zB, phi) => -(zA / zB) * (thA - phi) + phi + Math.PI - Math.PI / zB;
/** angles of everything from the pilot angle and the output angle */
export function angles(thIn, thOut) {
  const cs = meshed(thIn, Z.pilot, Z.head, -Math.PI / 2);
  return {pilot: thIn, cs, out: thOut, m1: meshed(cs, Z.c1, Z.m1, Math.PI / 2), m2: meshed(cs, Z.c2, Z.m2, Math.PI / 2), m3: meshed(cs, Z.c3, Z.m3, Math.PI / 2)};
}
export {RPM};
