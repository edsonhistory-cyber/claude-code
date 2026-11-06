// The rear axle centre of a TL-class tractor (TL80 family) as an assembly lesson: the 9 x 43 spiral-bevel pinion and
// crown (as listed for the TL60...TL100 rear axle by parts sellers), the differential (case halves, two side gears -
// "planetárias" - two spider gears - "satélites" - on their cross pin, bronze thrust washers), its bearings, the
// mechanical differential lock (dog collar, fork, spring), the half shafts with 24 splines. No three.js here. Generic
// shapes and a typical sequence; NOT the factory drawing. Torques, preloads and backlash: manual de serviço.
//
// World frame = the tractor's: the axle along x (+x = the tractor's left), the pinion along z (+z forward), the
// axle centre at y = AXLE.

export const AXLE = 0.77;
export const Z = {pin: 9, crown: 43, side: 16, spider: 10};
export const BEVEL = Z.crown / Z.pin; // 4.78
export const PIN_R = 0.03; // pinion heel pitch radius
export const CROWN_R = (PIN_R * Z.crown) / Z.pin; // 0.143
export const CROWN_BOLTS = 12;
export const CROSS12 = [0, 6, 3, 9, 1, 7, 4, 10, 2, 8, 5, 11];

const P = [];
const part = (o) => (P.push(o), o);
part({id: 'carcaca', kind: 'centreHousing', grp: 'base', name: 'Carcaça central do eixo traseiro', qty: 1, step: 0, ex: [0, 0, 0]});
part({id: 'trombetaD', kind: 'rightSide', grp: 'base', name: 'Lado direito (já montado)', qty: 1, step: 0, ex: [0, 0, 0]});
// the pinion, built on the bench in front of the housing
part({id: 'pinhao', kind: 'pinion', grp: 'pin', name: 'Pinhão 9 dentes (par com a coroa 43)', qty: 1, step: 1, ex: [0, 0, 0]});
part({id: 'conePinT', kind: 'taperCone', grp: 'pin', at: 0.2, r: [0.024, 0.045], name: 'Cone do rolamento traseiro do pinhão', qty: 1, step: 2, ex: [0, 0, 0.45]});
part({id: 'capasPin', kind: 'pinCups', grp: 'base', name: 'Capas dos rolamentos do pinhão', qty: 2, step: 3, ex: [0, 0, 0.75]});
part({id: 'calcoPin', kind: 'shim', grp: 'base', at: 0.188, name: 'Calço de regulagem da altura do pinhão', qty: 1, step: 3, ex: [0, 0, 0.66]});
// the differential, built on the bench to the left
part({id: 'caixaA', kind: 'caseHalf', grp: 'diff', side: -1, name: 'Carcaça do diferencial (metade da coroa)', qty: 1, step: 4, ex: [0, 0, 0]});
part({id: 'arruelaPlE', kind: 'sideWasher', grp: 'diff', side: -1, name: 'Arruela de encosto de bronze (planetária)', qty: 1, step: 5, ex: [0.32, 0, 0]});
part({id: 'planetE', kind: 'sideGear', grp: 'diff', side: -1, name: 'Engrenagem planetária 16 D (24 estrias)', qty: 1, step: 5, ex: [0.4, 0, 0]});
part({id: 'cruzeta', kind: 'crossPin', grp: 'diff', name: 'Eixo dos satélites (cruzeta)', qty: 1, step: 6, ex: [0, 0.4, 0]});
part({id: 'satelite0', kind: 'spider', grp: 'diff', side: 1, name: 'Satélite cônico 10 D', qty: 1, step: 6, ex: [0.0, 0.3, 0]});
part({id: 'satelite1', kind: 'spider', grp: 'diff', side: -1, name: 'Satélite cônico 10 D', qty: 1, step: 6, ex: [0.0, -0.3, 0]});
part({id: 'arruelaSat0', kind: 'spiderWasher', grp: 'diff', side: 1, name: 'Arruela esférica de bronze (satélite)', qty: 1, step: 6, ex: [0, 0.36, 0]});
part({id: 'arruelaSat1', kind: 'spiderWasher', grp: 'diff', side: -1, name: 'Arruela esférica de bronze (satélite)', qty: 1, step: 6, ex: [0, -0.36, 0]});
part({id: 'planetD', kind: 'sideGear', grp: 'diff', side: 1, name: 'Engrenagem planetária 16 D (24 estrias)', qty: 1, step: 7, ex: [0.5, 0, 0]});
part({id: 'arruelaPlD', kind: 'sideWasher', grp: 'diff', side: 1, name: 'Arruela de encosto de bronze (planetária)', qty: 1, step: 7, ex: [0.56, 0, 0]});
part({id: 'caixaB', kind: 'caseHalf', grp: 'diff', side: 1, name: 'Carcaça do diferencial (outra metade)', qty: 1, step: 8, ex: [0.66, 0, 0]});
part({id: 'coroa', kind: 'crown', grp: 'diff', name: 'Coroa 43 dentes', qty: 1, step: 9, ex: [-0.42, 0, 0]});
for (let i = 0; i < CROWN_BOLTS; i++) {
  const a = (i / CROWN_BOLTS) * Math.PI * 2;
  part({id: `parafCoroa${i}`, kind: 'crownBolt', grp: 'diff', bolt: i, name: 'Parafuso da coroa', qty: 1, step: 9, ex: [0.3, Math.sin(a) * 0.06, Math.cos(a) * 0.06], stagger: CROSS12.indexOf(i)});
}
part({id: 'coneDifE', kind: 'taperConeX', grp: 'diff', side: -1, name: 'Cone do rolamento do diferencial (esq.)', qty: 1, step: 10, ex: [-0.62, 0, 0]});
part({id: 'coneDifD', kind: 'taperConeX', grp: 'diff', side: 1, name: 'Cone do rolamento do diferencial (dir.)', qty: 1, step: 10, ex: [0.78, 0, 0]});
part({id: 'luvaBloq', kind: 'lockCollar', grp: 'diff', name: 'Luva do bloqueio do diferencial', qty: 1, step: 11, ex: [0.9, 0, 0]});
// into the housing
part({id: 'conePinF', kind: 'taperCone', grp: 'base', at: 0.31, r: [0.024, 0.042], name: 'Cone do rolamento dianteiro do pinhão', qty: 1, step: 13, ex: [0, 0, 0.5]});
part({id: 'arruelaPin', kind: 'pinWasher', grp: 'base', name: 'Arruela-trava do pinhão', qty: 1, step: 13, ex: [0, 0, 0.58]});
part({id: 'porcaPin', kind: 'pinNut', grp: 'base', name: 'Porca do pinhão', qty: 1, step: 13, ex: [0, 0, 0.64]});
part({id: 'capasDif', kind: 'diffCups', grp: 'base', name: 'Capas dos rolamentos do diferencial', qty: 2, step: 14, ex: [0.5, 0, 0]});
part({id: 'calcosDif', kind: 'diffShims', grp: 'base', name: 'Calços de ajuste da folga coroa-pinhão', qty: 2, step: 15, ex: [0.56, 0, 0]});
part({id: 'garfoBloq', kind: 'lockFork', grp: 'base', name: 'Garfo e haste do bloqueio', qty: 1, step: 16, ex: [0.3, 0.3, 0]});
part({id: 'molaBloq', kind: 'lockSpring', grp: 'base', name: 'Mola de retorno do bloqueio', qty: 1, step: 16, ex: [0.3, 0.4, 0]});
part({id: 'semieixoE', kind: 'halfShaft', grp: 'base', side: 1, name: 'Semieixo esquerdo (24 estrias)', qty: 1, step: 17, ex: [0.8, 0, 0]});
export const PARTS = P;

export const STEPS = [
  {title: 'Eixo traseiro aberto, peças separadas', text: 'O trator está no cavalete, sem a roda e a trombeta do lado esquerdo. A carcaça central está limpa; o lado direito continua montado.', why: 'O diferencial entra e sai pela abertura lateral da carcaça central.', tool: 'Cavalete, talha', care: 'Confira as peças pela lista; arruelas de bronze e rolamentos novos.', view: 'geral'},
  {title: 'Pinhão na bancada', text: 'Pinhão de 9 dentes na bancada, dentes para baixo.', why: 'O pinhão recebe a força da caixa (o eixo de saída das gamas) e a vira 90° para a coroa.', tool: 'Morsa com mordente macio', care: 'Coroa e pinhão são um par: sempre trocados juntos.', view: 'pin'},
  {title: 'Cone traseiro no pinhão', text: 'Prense o cone do rolamento traseiro no pinhão, até encostar no ressalto da cabeça.', why: 'É o rolamento que aguenta o empurrão da coroa contra o pinhão.', tool: 'Prensa, bucha no anel interno', care: 'Força só no anel interno.', view: 'pin'},
  {title: 'Calço e capas na carcaça', text: 'Coloque o calço de regulagem e prense as duas capas dos rolamentos do pinhão no alojamento da carcaça central.', why: 'O calço define a altura do pinhão: é ele que põe o pinhão no centro dos dentes da coroa.', tool: 'Batedor de capas, micrômetro', care: 'Espessura do calço: conforme medição e manual de serviço.', view: 'pinIn'},
  {title: 'Metade da carcaça do diferencial', text: 'Na bancada, apoie a metade da carcaça do diferencial do lado da coroa, com a face aberta para cima.', why: 'A carcaça do diferencial gira com a coroa e carrega a cruzeta com os satélites.', tool: 'Bancada', care: 'Limpe as faces de apoio das arruelas.', view: 'dif'},
  {title: 'Arruela de bronze e planetária', text: 'Lubrifique a arruela de encosto de bronze e a engrenagem planetária e coloque-as na metade da carcaça.', why: 'A planetária é presa no semieixo pelas 24 estrias. A arruela de bronze é onde ela encosta e gira quando o trator faz curva.', tool: 'Óleo de transmissão', care: 'Lado liso da arruela contra a planetária.', view: 'dif'},
  {title: 'Cruzeta, satélites e arruelas esféricas', text: 'Monte os dois satélites com as arruelas esféricas de bronze e passe a cruzeta por eles e pela carcaça.', why: 'Os satélites são o coração do diferencial: andando com a carcaça, empurram as duas planetárias por igual; na curva giram no próprio eixo e deixam uma roda ir mais rápido que a outra.', tool: 'Martelo de borracha', care: 'Satélites girando livres na cruzeta.', view: 'dif'},
  {title: 'Planetária do outro lado', text: 'Coloque a segunda planetária, engrenada nos dois satélites, e a arruela de bronze dela.', why: 'Agora as duas planetárias estão ligadas pelos satélites.', tool: 'Óleo', care: 'Gire: tudo deve rodar sem prender.', view: 'dif'},
  {title: 'Fechar a carcaça do diferencial', text: 'Feche com a outra metade da carcaça, alinhando as marcas.', why: 'As duas metades seguram a cruzeta e as arruelas.', tool: '—', care: 'Marcas de montagem alinhadas.', view: 'dif'},
  {title: 'Coroa e parafusos, em cruz', text: 'Encoste a coroa de 43 dentes na carcaça e aperte os 12 parafusos em cruz, na ordem mostrada.', why: 'A coroa recebe a força do pinhão e gira a carcaça do diferencial.', tool: 'Torquímetro, trava-rosca', care: 'Torque: conforme manual de serviço.', view: 'difBolts'},
  {title: 'Cones dos rolamentos do diferencial', text: 'Prense os cones dos rolamentos nos dois lados da carcaça do diferencial.', why: 'O diferencial inteiro gira apoiado nesses dois rolamentos.', tool: 'Prensa', care: 'Força só no anel interno.', view: 'dif'},
  {title: 'Luva do bloqueio', text: 'Monte a luva do bloqueio no lado direito, nas estrias.', why: 'Quando o pedal do bloqueio é acionado, a luva prende a planetária na carcaça: as duas rodas giram juntas, sem diferencial.', tool: '—', care: 'Dentes da luva voltados para os dentes da carcaça.', view: 'dif'},
  {title: 'Pinhão na carcaça central', text: 'Passe o pinhão, com o cone traseiro, pela frente até assentar na capa.', why: 'O pinhão fica de frente para a coroa, no centro do eixo.', tool: 'Talha', care: 'Rolamento lubrificado.', view: 'pinIn'},
  {title: 'Cone dianteiro, arruela-trava e porca', text: 'Monte o cone dianteiro, a arruela-trava e a porca. Aperte até a pré-carga do manual, girando o pinhão. Dobre a arruela.', why: 'A pré-carga segura o pinhão firme contra o empurrão da coroa.', tool: 'Torquímetro de giro, chave', care: 'Pré-carga: conforme manual de serviço.', view: 'pinIn'},
  {title: 'Capas dos rolamentos do diferencial', text: 'Monte as capas nos alojamentos laterais.', why: 'São as pistas onde o diferencial vai girar.', tool: 'Batedor', care: '—', view: 'side'},
  {title: 'Diferencial na carcaça e ajuste da folga', text: 'Desça o diferencial pela abertura lateral, engrene a coroa no pinhão e monte os calços de ajuste. Meça a folga entre os dentes e a marca de contato.', why: 'Folga e contato certos = coroa e pinhão silenciosos e duráveis.', tool: 'Talha, relógio comparador, azul da Prússia', care: 'Folga e pré-carga: conforme manual de serviço.', view: 'join'},
  {title: 'Garfo e mola do bloqueio', text: 'Monte o garfo do bloqueio no canal da luva, a haste e a mola de retorno.', why: 'A mola desliga o bloqueio sozinha quando o pedal é solto.', tool: '—', care: 'Teste: luva entra e volta livre.', view: 'side'},
  {title: 'Semieixo esquerdo', text: 'Passe o semieixo esquerdo até as 24 estrias entrarem na planetária. Depois monte freio, trombeta e roda (lição da trombeta).', why: 'O semieixo leva a força da planetária até a redução final na trombeta.', tool: '—', care: 'Estrias limpas; entre sem forçar.', view: 'side'},
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
  if (p.kind === 'crown') return ease((u - s0) / 0.3);
  return ease(u - s0);
}
// the bench sub-assemblies: the pinion in front (installed at step 12), the differential to the left (step 15)
export const BENCH = {pin: {x: 0, y: 0, z: 0.55, step: 12}, diff: {x: 1.0, y: 0.25, z: 0, step: 15}};
export const groupAt = (g, u) => {
  const b = BENCH[g];
  if (!b) return {x: 0, y: 0, z: 0};
  const k = clamp01(u - (b.step - 1));
  return {x: b.x * (1 - ease(k / 0.7)), y: b.y * (1 - ease((k - 0.3) / 0.7)), z: b.z * (1 - ease(k))};
};
export const stepAt = (u) => {
  const s = Math.min(N, Math.max(0, Math.ceil(u - 1e-6)));
  return {s, p: s === 0 ? 1 : clamp01(u - (s - 1))};
};
export const activeParts = (u) => PARTS.filter((p) => p.step === stepAt(u).s);

// ------------------------------------------------------------ how it works
/** from the pinion angle, the curve split k (-0.4..0.4: the left wheel k faster, the right k slower) and the lock */
export function diffAngles(thPin, thSplit) {
  const crown = thPin / BEVEL;
  // left and right side gears: crown +- split; spiders turn about the cross pin with the difference
  const L = crown + thSplit;
  const R = crown - thSplit;
  const spider = (thSplit * Z.side) / Z.spider;
  return {pin: thPin, crown, L, R, spider};
}
