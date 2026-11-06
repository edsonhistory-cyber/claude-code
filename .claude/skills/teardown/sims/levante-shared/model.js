// The hydraulic lift (levantador hidráulico) of a TL-class tractor as an assembly lesson: the lift housing on top of
// the rear axle centre housing; inside, a single-acting cylinder whose piston pushes a connecting rod against the inner
// arm of the rockshaft; outside, the two lift arms, the lift rods down to the lower links of the 3-point hitch; the
// control valve with its spool, and the position-control linkage (cam on the rockshaft, feedback lever, spring) that
// closes the valve when the arms reach the height asked for, with its height adjustment. Lift capacity of the TL line
// as published: 3600 kgf at the ball ends. Shapes and sequence: typical construction (NOT the factory drawing; the
// manufacturer's animation of the TL lift was used only to see the arrangement). Torques and settings: manual de serviço.
//
// World frame = the tractor's: +z forward, +x the tractor's left, the rear axle centre at y = 0.77.

export const AXLE = 0.77;
export const CYL = {y: 1.06, z0: -0.02, z1: 0.2, r: 0.05}; // the cylinder, along z
export const ROCK = {y: 1.08, z: -0.2, r: 0.026}; // the rockshaft, along x
export const CRANK = 0.075; // inner arm radius
export const ROD = 0.16; // connecting rod length
export const ARM = 0.32; // outer lift arm length
export const PHI = [0.5, 1.45]; // inner arm angle (from +z, turning upward) arms down .. arms up
export const COVER_BOLTS = 8;
export const CROSS8 = [0, 4, 2, 6, 1, 5, 3, 7];

const P = [];
const part = (o) => (P.push(o), o);
part({id: 'carcacaCentral', kind: 'centreTop', grp: 'case', name: 'Carcaça central do eixo traseiro (no trator)', qty: 1, step: 0, ex: [0, 0, 0]});
part({id: 'carcaca', kind: 'liftHousing', grp: 'lift', name: 'Carcaça do levante', qty: 1, step: 1, ex: [0, 0, 0]});
part({id: 'camisa', kind: 'liner', grp: 'lift', name: 'Camisa do cilindro', qty: 1, step: 2, ex: [0, 0, 0.55]});
part({id: 'oringCamisa', kind: 'linerOring', grp: 'lift', name: 'Anel O-ring da camisa', qty: 1, step: 2, ex: [0, 0, 0.62]});
part({id: 'anelPistao', kind: 'pistonSeal', grp: 'lift', name: 'Anel de vedação do pistão', qty: 1, step: 3, ex: [0, 0.18, 0.6]});
part({id: 'anelEncosto', kind: 'backupRing', grp: 'lift', name: 'Anel de encosto (anti-extrusão)', qty: 1, step: 3, ex: [0, 0.22, 0.64]});
part({id: 'pistao', kind: 'piston', grp: 'lift', name: 'Pistão do levante', qty: 1, step: 4, ex: [0, 0, 0.7]});
part({id: 'buchas', kind: 'bushes', grp: 'lift', name: 'Buchas do eixo do levante', qty: 2, step: 5, ex: [0.5, 0, 0]});
part({id: 'eixoLev', kind: 'rockshaft', grp: 'lift', name: 'Eixo do levante (estriado nas pontas)', qty: 1, step: 6, ex: [0.75, 0, 0]});
part({id: 'braco', kind: 'innerArm', grp: 'lift', name: 'Braço interno (manivela) do eixo', qty: 1, step: 6, ex: [0, 0.3, 0]});
part({id: 'parafBraco', kind: 'innerArmBolt', grp: 'lift', name: 'Parafuso-trava do braço interno', qty: 1, step: 6, ex: [0, 0.36, 0.05]});
part({id: 'biela', kind: 'conRod', grp: 'lift', name: 'Biela do pistão', qty: 1, step: 7, ex: [0, 0.32, 0.25]});
part({id: 'pinoBiela', kind: 'rodPin', grp: 'lift', name: 'Pino da biela com trava', qty: 1, step: 7, ex: [0.25, 0.3, 0.1]});
part({id: 'retentores', kind: 'shaftSeals', grp: 'lift', name: 'Retentores do eixo do levante', qty: 2, step: 8, ex: [0.6, 0, 0]});
part({id: 'came', kind: 'cam', grp: 'lift', name: 'Came de posição no eixo do levante', qty: 1, step: 9, ex: [0.35, 0.2, 0]});
part({id: 'alavancaRe', kind: 'feedbackLever', grp: 'lift', name: 'Alavanca de realimentação (controle de posição)', qty: 1, step: 9, ex: [-0.3, 0.25, 0]});
part({id: 'molaRe', kind: 'feedbackSpring', grp: 'lift', name: 'Mola da alavanca de realimentação', qty: 1, step: 9, ex: [-0.36, 0.3, 0]});
part({id: 'valvula', kind: 'valveBody', grp: 'lift', name: 'Corpo da válvula de controle', qty: 1, step: 10, ex: [-0.42, 0, 0]});
part({id: 'carretel', kind: 'spool', grp: 'lift', name: 'Carretel da válvula', qty: 1, step: 10, ex: [-0.5, 0, 0.2]});
part({id: 'molaCarretel', kind: 'spoolSpring', grp: 'lift', name: 'Mola do carretel', qty: 1, step: 10, ex: [-0.56, 0, 0.26]});
part({id: 'juntaLev', kind: 'liftGasket', grp: 'case', name: 'Junta do levante', qty: 1, step: 11, ex: [0, 0.32, 0]});
for (let i = 0; i < COVER_BOLTS; i++) part({id: `paraf${i}`, kind: 'bolt', grp: 'lift', bolt: i, name: 'Parafuso de fixação do levante', qty: 1, step: 12, ex: [0, 0.22, 0], stagger: CROSS8.indexOf(i)});
for (const s of [1, -1]) {
  const k = s > 0 ? 'E' : 'D';
  part({id: `bracoExt${k}`, kind: 'liftArm', grp: 'lift', side: s, name: 'Braço de levante externo', qty: 1, step: 13, ex: [s * 0.35, 0.1, 0]});
  part({id: `parafExt${k}`, kind: 'armBolt', grp: 'lift', side: s, name: 'Arruela e parafuso do braço externo', qty: 1, step: 13, ex: [s * 0.45, 0.1, 0]});
  part({id: `haste${k}`, kind: 'liftRod', grp: 'case', side: s, name: 'Haste de levante com regulagem', qty: 1, step: 14, ex: [s * 0.3, 0, -0.3]});
}
part({id: 'barras', kind: 'lowerLinks', grp: 'case', name: 'Barras inferiores do engate de 3 pontos (no trator)', qty: 2, step: 0, ex: [0, 0, 0]});
part({id: 'hasteCmd', kind: 'controlRod', grp: 'lift', name: 'Haste de comando com porca de ajuste de altura', qty: 1, step: 15, ex: [-0.3, 0.2, 0.3]});
export const PARTS = P;

export const STEPS = [
  {title: 'Peças separadas', text: 'O levante é montado na bancada e depois vai para cima da carcaça central do eixo traseiro. Confira as peças pela lista.', why: 'O levante sobe e desce o engate de 3 pontos com força hidráulica (até 3.600 kgf nas rótulas, na linha TL).', tool: 'Bancada, talha', care: 'Anéis de vedação, retentores e junta novos.', view: 'geral'},
  {title: 'Carcaça do levante na bancada', text: 'Apoie a carcaça do levante na bancada, com a face de baixo para o lado de cima.', why: 'A carcaça é ao mesmo tempo a tampa do eixo traseiro e o corpo do cilindro hidráulico.', tool: 'Bancada limpa', care: 'Faces e alojamentos sem rebarba.', view: 'lift'},
  {title: 'Camisa do cilindro e O-ring', text: 'Lubrifique e monte o O-ring; prense a camisa no alojamento do cilindro.', why: 'A camisa é o tubo liso onde o pistão anda.', tool: 'Prensa, óleo hidráulico', care: 'Camisa sem riscos: risco = vazamento interno e levante que "cai".', view: 'cyl'},
  {title: 'Anéis do pistão', text: 'Monte o anel de vedação no canal do pistão e o anel de encosto do lado da pressão contrária.', why: 'O anel de vedação segura a pressão do óleo; o anel de encosto impede que ele seja esmagado para dentro da folga.', tool: 'Ferramenta de anel (sem ponta)', care: 'Lado certo do anel de encosto: conforme manual.', view: 'cyl'},
  {title: 'Pistão no cilindro', text: 'Lubrifique e empurre o pistão na camisa, por igual. Se precisar, use ar comprimido pela entrada de óleo para mantê-lo na posição.', why: 'O óleo sob pressão entra atrás do pistão e o empurra: é a força do levante.', tool: 'Ar comprimido com bico, óleo', care: 'Nunca bata no pistão; anel cortado = levante fraco.', view: 'cyl'},
  {title: 'Buchas do eixo do levante', text: 'Prense as duas buchas nos alojamentos laterais da carcaça.', why: 'O eixo do levante gira dentro das buchas.', tool: 'Batedor de bucha', care: 'Furo de lubrificação da bucha alinhado.', view: 'rock'},
  {title: 'Eixo do levante e braço interno', text: 'Passe o eixo do levante pelas buchas e pelo braço interno, nas estrias, e trave o braço com o parafuso.', why: 'O braço interno é a manivela: o pistão empurra o braço e o eixo gira.', tool: 'Chave, trava-rosca', care: 'Marcas das estrias do eixo e do braço alinhadas.', view: 'rock'},
  {title: 'Biela e pino', text: 'Ligue a biela entre o pistão e o braço interno com o pino e a trava.', why: 'A biela transforma o empurrão reto do pistão em giro do eixo.', tool: 'Alicate de anel', care: 'Pino lubrificado; trava no canal.', view: 'rock'},
  {title: 'Retentores do eixo', text: 'Monte os dois retentores nas pontas do eixo, lábio para dentro.', why: 'Seguram o óleo dentro do levante em volta do eixo que gira.', tool: 'Batedor de retentor', care: 'Proteja o lábio das estrias com fita ou luva.', view: 'rock'},
  {title: 'Came, alavanca e mola de realimentação', text: 'Monte o came de posição no eixo, a alavanca de realimentação e a mola.', why: 'É o "controle de posição": quando o eixo gira até a altura pedida, o came move a alavanca e fecha a válvula — o levante para ali.', tool: '—', care: 'Rolete da alavanca encostado no came.', view: 'ctrl'},
  {title: 'Válvula de controle: carretel e mola', text: 'Monte o carretel com a mola no corpo da válvula e fixe a válvula na carcaça.', why: 'O carretel abre o óleo para o cilindro (subir), segura (parar) ou libera o óleo de volta (descer).', tool: 'Chave, óleo hidráulico', care: 'Carretel desliza livre, sem prender.', view: 'ctrl'},
  {title: 'Junta e levante na carcaça central', text: 'Coloque a junta nova e desça o levante sobre a carcaça central do eixo traseiro.', why: 'O óleo da transmissão é o mesmo do levante: a bomba o manda para a válvula.', tool: 'Talha', care: 'Junta nova; faces limpas.', view: 'join'},
  {title: 'Parafusos em cruz', text: 'Aperte os 8 parafusos em cruz, na ordem mostrada.', why: 'Aperto em cruz assenta a carcaça por igual, sem vazar.', tool: 'Torquímetro', care: 'Torque: conforme manual de serviço.', view: 'bolts'},
  {title: 'Braços de levante externos', text: 'Monte os braços externos nas estrias das pontas do eixo, com arruela e parafuso.', why: 'Os braços externos levantam as barras do engate pelas hastes.', tool: 'Chave, torquímetro', care: 'Os dois braços na mesma posição (marcas das estrias).', view: 'arms'},
  {title: 'Hastes de levante', text: 'Ligue as hastes de levante entre os braços e as barras inferiores e regule o comprimento das duas igual.', why: 'As hastes levam o movimento do braço até as barras onde o implemento é engatado.', tool: 'Chave', care: 'Comprimentos iguais: implemento nivelado.', view: 'arms'},
  {title: 'Haste de comando e ajuste de altura', text: 'Ligue a haste de comando na alavanca da válvula. Com o comando na posição máxima, regule a porca da haste até os braços pararem na altura máxima indicada no manual, sem bater no batente.', why: 'Se o braço bater no batente com a válvula aberta, a pressão fica no máximo e o óleo esquenta. O ajuste deixa uma folga antes do batente.', tool: 'Chave, escala', care: 'Altura e folga: conforme manual de serviço.', view: 'ctrl2'},
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
// the lift is built on a bench above and behind the tractor, then lowered on at step 11
export const BENCH = {lift: {y: 0.55, z: -0.9, step: 11}};
export const groupAt = (g, u) => {
  const b = BENCH[g];
  if (!b) return {y: 0, z: 0};
  const k = clamp01(u - (b.step - 1));
  return {y: b.y * (1 - ease((k - 0.4) / 0.6)), z: b.z * (1 - ease(k / 0.55))};
};
export const stepAt = (u) => {
  const s = Math.min(N, Math.max(0, Math.ceil(u - 1e-6)));
  return {s, p: s === 0 ? 1 : clamp01(u - (s - 1))};
};
export const activeParts = (u) => PARTS.filter((p) => p.step === stepAt(u).s);

// ------------------------------------------------------------ the mechanism from one number: the lift height h (0 down .. 1 up)
export function lift(h) {
  const phi = PHI[0] + (PHI[1] - PHI[0]) * h; // inner arm angle, from +z turning up
  // the inner arm points forward and down; the piston pushing it back turns the shaft and swings the outer arms up
  const pin = {z: ROCK.z + CRANK * Math.cos(phi), y: ROCK.y - CRANK * Math.sin(phi)};
  const dy = CYL.y - pin.y;
  const pz = pin.z + Math.sqrt(Math.max(0, ROD * ROD - dy * dy)); // the piston pin on the cylinder axis
  const rod = Math.atan2(dy, pz - pin.z);
  const arm = -0.45 + 0.95 * h; // the outer arms' angle above horizontal (rad)
  return {phi, pin, pz, rod, arm};
}
