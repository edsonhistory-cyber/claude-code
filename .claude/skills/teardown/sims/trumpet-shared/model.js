// The final drive (trombeta) of a utility tractor in the class of the TL80, as an assembly lesson: every part with its
// name, quantity, where it sits and the step that puts it there, and the steps with what to do, why, the tool and the
// care point. No three.js here. Typical construction (Fiat/New Holland family): wet disc brakes on the half shaft inside
// the centre housing, an epicyclic reduction at the inner end of the trumpet (sun on the half shaft, planets on a
// carrier splined to the wheel axle, ring gear clamped between centre housing and trumpet), the wheel axle on two
// tapered roller bearings, a seal at the outer end. NOT the factory drawing: generic shapes and a typical sequence.
// Torques, preloads and clearances are not published here; the steps say "conforme manual de serviço".
//
// Axis z points outboard (toward the wheel). The centre housing face is at z = 0.095. Metres throughout.

export const Z = {sun: 18, planet: 36, ring: 90};
export const FD_M = 0.0028; // module of the reduction
export const RATIO = 1 + Z.ring / Z.sun; // 6 : 1, carrier output, ring fixed
export const PLANET_R = (FD_M * (Z.sun + Z.planet)) / 2; // 0.0756
export const BOLT_R = 0.175;
export const NUTS = 10;
// tightening order across the flange (star pattern for 10 bolts)
export const CROSS = [0, 5, 2, 7, 4, 9, 1, 6, 3, 8];

// ------------------------------------------------------------ the parts (kind -> geometry in build.js)
// grp: 'base' (stays at the centre housing) or 'sub' (the trumpet sub-assembly, built on the bench first)
// ex: exploded offset [x, y, z] in the group frame, where the part waits before its step
const P = [];
const part = (o) => (P.push(o), o);
part({id: 'carcaca', kind: 'centreHousing', grp: 'base', name: 'Carcaça central (lado esquerdo)', qty: 1, step: 0, ex: [0, 0, 0]});
part({id: 'prisioneiros', kind: 'studs', grp: 'base', name: 'Prisioneiros M16', qty: 10, step: 0, ex: [0, 0, 0]});
// --- the trumpet sub-assembly (on the bench)
part({id: 'trombeta', kind: 'trumpet', grp: 'sub', name: 'Trombeta (carcaça do eixo)', qty: 1, step: 1, ex: [0, 0, 0]});
part({id: 'capaInt', kind: 'cupInner', grp: 'sub', name: 'Capa do rolamento interno', qty: 1, step: 2, ex: [0, 0, -0.32]});
part({id: 'capaExt', kind: 'cupOuter', grp: 'sub', name: 'Capa do rolamento externo', qty: 1, step: 2, ex: [0, 0, 0.42]});
part({id: 'retentor', kind: 'seal', grp: 'sub', name: 'Retentor do eixo da roda', qty: 1, step: 3, ex: [0, 0, 0.5]});
part({id: 'coneExt', kind: 'coneOuter', grp: 'sub', name: 'Cone do rolamento externo (rolos cônicos)', qty: 1, step: 4, ex: [0, 0.18, 0.62]});
part({id: 'eixoRoda', kind: 'axle', grp: 'sub', name: 'Eixo da roda com cubo e 8 prisioneiros', qty: 1, step: 5, ex: [0, 0, 0.62]});
part({id: 'coneInt', kind: 'coneInner', grp: 'sub', name: 'Cone do rolamento interno (rolos cônicos)', qty: 1, step: 6, ex: [0, 0, -0.42]});
part({id: 'arruelaTrava', kind: 'tabWasher', grp: 'sub', name: 'Arruela-trava com aba', qty: 1, step: 7, ex: [0, 0, -0.5]});
part({id: 'porcaAjuste', kind: 'ringNut', grp: 'sub', name: 'Porca de ajuste do rolamento', qty: 1, step: 7, ex: [0, 0, -0.56]});
part({id: 'portaSat', kind: 'carrier', grp: 'sub', name: 'Porta-satélites', qty: 1, step: 8, ex: [0, 0, -0.66]});
part({id: 'anelPorta', kind: 'snapCarrier', grp: 'sub', name: 'Anel-trava do porta-satélites', qty: 1, step: 8, ex: [0, 0, -0.74]});
for (let i = 0; i < 3; i++) {
  const a = (2 * Math.PI * i) / 3;
  const out = [Math.cos(a) * 0.12, Math.sin(a) * 0.12];
  part({id: `agulhas${i}`, kind: 'needles', grp: 'sub', planet: i, name: 'Roletes-agulha do satélite (24)', qty: 24, step: 9, ex: [out[0] * 1.9, out[1] * 1.9, -0.62]});
  part({id: `arruelaA${i}`, kind: 'thrust', grp: 'sub', planet: i, side: -1, name: 'Arruela de encosto (lado interno)', qty: 1, step: 10, ex: [out[0], out[1], -0.6]});
  part({id: `arruelaB${i}`, kind: 'thrust', grp: 'sub', planet: i, side: 1, name: 'Arruela de encosto (lado externo)', qty: 1, step: 10, ex: [out[0], out[1], -0.52]});
  part({id: `satelite${i}`, kind: 'planet', grp: 'sub', planet: i, name: 'Satélite 36 dentes', qty: 1, step: 10, ex: [out[0] * 1.4, out[1] * 1.4, -0.56]});
  part({id: `pino${i}`, kind: 'planetPin', grp: 'sub', planet: i, name: 'Eixo do satélite', qty: 1, step: 11, ex: [out[0] * 0.6, out[1] * 0.6, -0.86]});
  part({id: `pinoTrava${i}`, kind: 'rollPin', grp: 'sub', planet: i, name: 'Pino-trava elástico', qty: 1, step: 12, ex: [out[0] * 0.8, out[1] * 0.8, -0.95]});
}
// --- the centre housing side
part({id: 'semieixo', kind: 'halfShaft', grp: 'base', name: 'Semieixo (vem do diferencial)', qty: 1, step: 13, ex: [0, 0, -0.55]});
part({id: 'disco1', kind: 'brakeDisc', grp: 'base', name: 'Disco de freio interno', qty: 1, step: 14, ex: [0, 0, 0.3]});
part({id: 'atuadorA', kind: 'actuatorPlate', grp: 'base', side: -1, name: 'Placa do atuador (interna)', qty: 1, step: 15, ex: [0, 0, 0.42]});
part({id: 'esferas', kind: 'balls', grp: 'base', name: 'Esferas do atuador', qty: 5, step: 15, ex: [0, 0.2, 0.5]});
part({id: 'molas', kind: 'springs', grp: 'base', name: 'Molas de retorno do atuador', qty: 3, step: 15, ex: [0, -0.2, 0.52]});
part({id: 'atuadorB', kind: 'actuatorPlate', grp: 'base', side: 1, name: 'Placa do atuador (externa)', qty: 1, step: 15, ex: [0, 0, 0.58]});
part({id: 'disco2', kind: 'brakeDisc', grp: 'base', name: 'Disco de freio externo', qty: 1, step: 16, ex: [0, 0, 0.66]});
part({id: 'contraplaca', kind: 'reactionPlate', grp: 'base', name: 'Contraplaca do freio', qty: 1, step: 17, ex: [0, 0, 0.74]});
part({id: 'sol', kind: 'sun', grp: 'base', name: 'Engrenagem solar 18 dentes', qty: 1, step: 18, ex: [0, 0, 0.86]});
part({id: 'anelSol', kind: 'snapSun', grp: 'base', name: 'Anel-trava da solar', qty: 1, step: 18, ex: [0, 0, 0.94]});
part({id: 'junta', kind: 'gasket', grp: 'base', name: 'Junta da trombeta', qty: 1, step: 19, ex: [0, 0, 1.0]});
part({id: 'pinosGuia', kind: 'dowels', grp: 'base', name: 'Pinos-guia', qty: 2, step: 19, ex: [0, 0, 1.06]});
part({id: 'coroa', kind: 'ring', grp: 'base', name: 'Coroa interna 90 dentes', qty: 1, step: 20, ex: [0, 0, 1.14]});
// --- joining: the sub-assembly comes over; washers and nuts one by one, then the plugs
for (let i = 0; i < NUTS; i++) {
  const a = (2 * Math.PI * i) / NUTS;
  part({id: `arruela${i}`, kind: 'washer', grp: 'base', bolt: i, name: 'Arruela lisa M16', qty: 1, step: 22, ex: [Math.cos(a) * 0.13, Math.sin(a) * 0.13, 0.2], stagger: i});
  part({id: `porca${i}`, kind: 'nut', grp: 'base', bolt: i, name: 'Porca sextavada M16', qty: 1, step: 23, ex: [Math.cos(a) * 0.17, Math.sin(a) * 0.17, 0.28], stagger: CROSS.indexOf(i)});
}
part({id: 'bujaoDreno', kind: 'plug', grp: 'sub', at: 'drain', name: 'Bujão de dreno com arruela de vedação', qty: 1, step: 24, ex: [0, -0.2, 0]});
part({id: 'bujaoNivel', kind: 'plug', grp: 'sub', at: 'level', name: 'Bujão de nível com arruela de vedação', qty: 1, step: 24, ex: [-0.2, 0, 0]});
export const PARTS = P;
// the trumpet sub-assembly is built on the bench: above the centre housing row, a little outboard
export const BENCH = {y: 0.62, z: 0.5};

// ------------------------------------------------------------ the steps
export const STEPS = [
  {title: 'Peças separadas na bancada', text: 'Todas as peças da trombeta e do freio, limpas e conferidas pela lista. A carcaça central já está no trator, com os 10 prisioneiros.', why: 'Montagem começa pela conferência: peça faltando ou danificada se descobre aqui, não depois de fechar.', tool: 'Bancada limpa, pano sem fiapo, óleo de transmissão', care: 'Não reaproveite junta, retentor, arruelas-trava nem pinos elásticos.', view: 'geral'},
  {title: 'Trombeta na bancada', text: 'Apoie a trombeta com o flange para baixo, na bancada.', why: 'A trombeta é a carcaça que segura o eixo da roda e prende tudo na carcaça central.', tool: 'Apoio de madeira', care: 'Confira se as faces de assento estão limpas e sem rebarba.', view: 'sub'},
  {title: 'Prensar as capas dos rolamentos', text: 'Prense a capa interna e a capa externa nos alojamentos da trombeta, até encostar no ressalto.', why: 'As capas são as pistas externas dos rolamentos cônicos: o eixo vai girar dentro delas.', tool: 'Prensa ou batedor de capas', care: 'Capa torta prende o rolamento. Bata por igual, nunca na pista.', view: 'sub'},
  {title: 'Instalar o retentor', text: 'Monte o retentor no alojamento externo com o lábio voltado para dentro (para o óleo).', why: 'O retentor segura o óleo dentro da trombeta e não deixa entrar barro.', tool: 'Batedor de retentor, graxa no lábio', care: 'Lábio virado ao contrário = vazamento.', view: 'subOut'},
  {title: 'Cone externo no eixo da roda', text: 'Prense o cone do rolamento externo no eixo da roda até o encosto do cubo.', why: 'O cone, com os rolos cônicos, roda sobre a capa externa e aguenta o peso do trator e o empuxo lateral.', tool: 'Prensa, bucha de apoio no anel interno', care: 'Apoie só no anel interno do cone, nunca nos rolos.', view: 'subOut'},
  {title: 'Passar o eixo da roda pela trombeta', text: 'Lubrifique o rolamento e passe o eixo de fora para dentro, até o cone assentar na capa externa.', why: 'O eixo da roda leva a força da redução até o cubo onde a roda é presa.', tool: 'Talha ou ajudante: o eixo é pesado', care: 'Entre reto para não cortar o lábio do retentor.', view: 'sub'},
  {title: 'Cone interno', text: 'Pelo lado de dentro, monte o cone do rolamento interno no eixo, até assentar na capa interna.', why: 'Dois rolamentos cônicos opostos seguram o eixo nos dois sentidos.', tool: 'Batedor tubular', care: 'Lubrifique os rolos com óleo de transmissão.', view: 'subIn'},
  {title: 'Arruela-trava e porca de ajuste', text: 'Monte a arruela-trava e a porca. Aperte girando o eixo até eliminar a folga, com a pré-carga conforme o manual de serviço. Dobre uma aba da arruela no rasgo da porca.', why: 'A porca aperta os dois cones contra as capas: sem folga o eixo não bate; com aperto demais o rolamento esquenta.', tool: 'Chave de porca ranhurada, torquímetro', care: 'Pré-carga: conforme manual de serviço. Sempre arruela-trava nova.', view: 'subIn'},
  {title: 'Porta-satélites nas estrias', text: 'Encaixe o porta-satélites nas estrias da ponta do eixo e trave com o anel-trava.', why: 'O porta-satélites é a saída da redução: quando os satélites rodam em volta do sol, ele gira e leva o eixo da roda junto.', tool: 'Alicate de anel-trava', care: 'Anel-trava todo dentro do canal.', view: 'subIn'},
  {title: 'Roletes-agulha nos satélites', text: 'Passe graxa no furo de cada satélite e cole os 24 roletes-agulha em volta, como uma gaiola.', why: 'Os roletes deixam o satélite girar livre no seu eixo, sem atrito.', tool: 'Graxa', care: 'Conte: 24 por satélite. Faltando um, os outros quebram.', view: 'planets'},
  {title: 'Satélites e arruelas de encosto', text: 'Coloque cada satélite no porta-satélites entre as duas arruelas de encosto.', why: 'As arruelas impedem o satélite de raspar nas paredes do porta-satélites.', tool: '—', care: 'Face lisa da arruela voltada para o satélite.', view: 'planets'},
  {title: 'Eixos dos satélites', text: 'Passe o eixo de cada satélite pelo porta-satélites, pelas arruelas e pelos roletes, alinhando o furo do pino-trava.', why: 'Cada satélite gira no seu eixo; os três eixos são presos no porta-satélites.', tool: 'Martelo de borracha', care: 'Furo do eixo alinhado com o furo do porta-satélites.', view: 'planets'},
  {title: 'Pinos-trava', text: 'Bata um pino elástico em cada eixo de satélite.', why: 'O pino não deixa o eixo do satélite sair nem girar.', tool: 'Saca-pino, martelo', care: 'Pino novo, rente à face.', view: 'planets'},
  {title: 'Semieixo', text: 'Do lado do diferencial, passe o semieixo até as estrias aparecerem na saída da carcaça central.', why: 'O semieixo traz a força do diferencial; ele gira junto com a engrenagem solar.', tool: '—', care: 'Estrias limpas, sem batida.', view: 'base'},
  {title: 'Disco de freio interno', text: 'Encaixe o primeiro disco de freio nas estrias do semieixo.', why: 'Os discos giram com o semieixo; o freio trava o semieixo antes da redução, por isso precisa de 6× menos força.', tool: '—', care: 'Disco molhado em óleo de transmissão antes de montar.', view: 'brake'},
  {title: 'Atuador: placas, esferas e molas', text: 'Monte a placa interna, as 5 esferas nas rampas, as 3 molas de retorno e a placa externa.', why: 'Ao pisar no pedal, as placas giram uma contra a outra; as esferas sobem nas rampas e afastam as placas, apertando os discos.', tool: 'Graxa para segurar as esferas', care: 'Cada esfera no fundo da sua rampa.', view: 'brake'},
  {title: 'Disco de freio externo', text: 'Encaixe o segundo disco nas estrias do semieixo.', why: 'Dois discos = o dobro da área de atrito.', tool: '—', care: 'Disco molhado em óleo.', view: 'brake'},
  {title: 'Contraplaca', text: 'Monte a contraplaca fixa contra o disco externo.', why: 'É a parede onde o disco externo é apertado.', tool: '—', care: 'Confira a folga do freio conforme o manual de serviço.', view: 'brake'},
  {title: 'Engrenagem solar e anel-trava', text: 'Encaixe a engrenagem solar nas estrias da ponta do semieixo e trave com o anel-trava.', why: 'A solar é a entrada da redução: ela empurra os três satélites.', tool: 'Alicate de anel-trava', care: 'Anel todo no canal.', view: 'base'},
  {title: 'Junta e pinos-guia', text: 'Coloque a junta nova na face da carcaça central e os 2 pinos-guia.', why: 'A junta veda o óleo; os pinos centralizam a coroa e a trombeta.', tool: 'Vedante, se o manual pedir', care: 'Junta sempre nova.', view: 'base'},
  {title: 'Coroa interna', text: 'Encaixe a coroa interna nos pinos-guia, sobre os prisioneiros.', why: 'A coroa fica presa, parada: os satélites rolam por dentro dela. É por ela estar parada que a redução multiplica a força.', tool: '—', care: 'Dentes para dentro, assentada por igual.', view: 'base'},
  {title: 'Unir a trombeta à carcaça central', text: 'Traga a trombeta montada. Gire o cubo devagar até os satélites engrenarem na solar e na coroa, e encoste o flange nos pinos-guia.', why: 'Agora o caminho da força está completo: semieixo → solar → satélites → porta-satélites → eixo da roda.', tool: 'Talha', care: 'Nunca force: gire o cubo até engrenar.', view: 'join'},
  {title: 'Arruelas', text: 'Coloque as 10 arruelas lisas nos prisioneiros.', why: 'A arruela espalha a força da porca e protege o flange.', tool: '—', care: 'Uma por prisioneiro.', view: 'nuts'},
  {title: 'Porcas, em cruz', text: 'Rosqueie as 10 porcas e aperte em cruz, na ordem mostrada, em duas passadas, com o torque do manual de serviço.', why: 'Apertar em cruz assenta o flange por igual: sem empenar e sem vazar.', tool: 'Chave 24 mm, torquímetro', care: 'Torque: conforme manual de serviço.', view: 'nuts'},
  {title: 'Bujões de dreno e nível', text: 'Monte o bujão de dreno (embaixo) e o de nível (lado) com arruelas de vedação novas. Complete o óleo até o nível.', why: 'Os satélites e os freios trabalham banhados em óleo.', tool: 'Chave do bujão', care: 'Óleo especificado no manual.', view: 'geral'},
];
export const N = STEPS.length - 1; // the last step index; u runs 0..N

// ------------------------------------------------------------ the pose of the assembly at step position u (0..N)
const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const ease = (x) => {
  const u = clamp01(x);
  return u * u * u * (u * (u * 6 - 15) + 10);
};
/** 0..1: how far a part is into its place at u (0 waiting exploded, 1 installed) */
export function installed(p, u) {
  if (p.step === 0) return 1;
  const s0 = p.step - 1;
  const n = PARTS.filter((q) => q.step === p.step && q.stagger !== undefined).length;
  if (p.stagger !== undefined && n > 1) {
    const a = s0 + (p.stagger / n) * 0.75;
    return ease((u - a) / 0.25);
  }
  if (p.planet !== undefined) return ease((u - s0 - p.planet * 0.25) / 0.45);
  return ease(u - s0);
}
/** where the trumpet sub-assembly is: on the bench until step 21, then down in line and slid home along the axle */
export const subAt = (u) => {
  const k = Math.min(1, Math.max(0, u - 20));
  return {y: BENCH.y * (1 - ease(k / 0.5)), z: BENCH.z * (1 - ease((k - 0.5) / 0.5))};
};
/** the step that is running at u and its progress */
export const stepAt = (u) => {
  const s = Math.min(N, Math.max(0, Math.ceil(u - 1e-6)));
  return {s, p: s === 0 ? 1 : clamp01(u - (s - 1))};
};
/** the parts the step at u is moving */
export const activeParts = (u) => {
  const {s} = stepAt(u);
  return PARTS.filter((p) => p.step === s);
};

// ------------------------------------------------------------ how it works: the epicyclic and the brake
/** angles from the half shaft (sun) angle: the carrier at 1/6, the planets about their pins (phased to the ring) */
export function epicyclic(thSun) {
  const carrier = thSun / RATIO;
  const planets = [0, 1, 2].map((k) => {
    const phi = (2 * Math.PI * k) / 3;
    return (Z.ring / Z.planet) * (-carrier - phi) + phi;
  });
  return {sun: thSun + Math.PI / Z.sun, carrier, planets};
}
