// The tractor's numbers: the New Holland TL80 (series 1999-2004) with its 12-speed transmission and mechanical
// shuttle: an in-line reverser (F/R), four synchronised gears and three ranges (L/M/H), a spiral-bevel pinion and crown
// wheel with the differential, planetary final drives, the front drive axle (4WD) with its own bevel and planetary
// hubs, and an independent PTO with its own disc of the double clutch.
//
// Published (TractorData, Tractorista, OECD-based sheets; Brazilian dealer pages): Iveco 8045 diesel, 4 cylinders,
// 3.9 L, bore x stroke 104 x 115 mm, 82 cv (Brazilian TL80, naturally aspirated) at 2500 rpm; rear crown and pinion
// 9 x 43; 12x4 synchronised as standard, 12x12 with the mechanical reverser as an option; dual dry disc clutch; 12-speed with mechanical shuttle;
// independent PTO 540 rpm at 2199 engine rpm (1000 optional); planetary final drives; wet brakes; tyres 380/70R24 front
// (4WD), 480/70R34 rear; wheelbase 2310 mm (4WD); about 3500 kg operating. NOT published: the tooth counts or the
// speed table. The ones below are this model's own: every pair on a 120 mm centre distance (tooth sum 60 at a 4 mm
// module), speeds from 2.6 km/h in L1 to 28.9 km/h in H4 at 2500 rpm.
//
// Shaft line (front to rear, top and bottom alternate): S0 primary (top, from the clutch) -> reverser -> S1 (bottom)
// -> 4-speed -> S2 (top) -> ranges -> S3 (bottom, the pinion shaft) -> crown wheel -> differential -> final drives.

export const MOD = 0.004;
export const CD = 0.12;
export const rp = (z, m = MOD) => (m * z) / 2;
export const AXLE_Y = 0.77; // rear axle centre = the 480/70R34 loaded radius
export const RW = 0.77; // rear rolling radius
export const RF = 0.57; // front rolling radius, 380/70R24
export const WHEELBASE = 2.31;
export const TOP = AXLE_Y + CD; // S0, S2 and the crank
export const BOT = AXLE_Y; // S1, S3: the pinion meets the crown on the axle centre

export const Z = {
  sF: 30, s1F: 30, // reverser forward pair, S0 free gear -> S1 fixed gear
  sR: 27, s1R: 30, idR: 20, // reverser reverse pair through an idler
  c1: 19, m1: 41, c2: 23, m2: 37, c3: 28, m3: 32, c4: 32, m4: 28, // 4-speed: S1 fixed c, S2 free m
  dL: 11, gL: 49, dM: 18, gM: 42, dH: 30, gH: 30, // ranges: S2 fixed d, S3 free g
  pin: 9, crown: 43, // spiral bevel, 9 x 43 as listed for the TL60...TL100 rear axle
  sun: 18, planet: 36, ring: 90, // final drive, carrier output: 1 + 90/18 = 6
  fPin: 9, fCrown: 34, fSun: 18, fPlanet: 26, fRing: 70, // PDM: bevel 34/9, hubs 1 + 70/18; 4 planets
  ptoA: 19, ptoB: 77, // PTO reduction at the rear: 2199 / (77/19) = 543, the published 540 at 2199
};
// the engine: Iveco/NH 8045, bore 104 x stroke 115 mm, 4 inline, firing 1-3-4-2
export const ENGINE = {bore: 0.104, stroke: 0.115, rod: 0.19, cyl: 4, pitch: 0.125, z0: 1.6725};
export const SHUTTLE = {F: Z.s1F / Z.sF, R: Z.s1R / Z.sR, N: 0}; // S0 turns this many times per S1 turn
export const GEAR = {1: Z.m1 / Z.c1, 2: Z.m2 / Z.c2, 3: Z.m3 / Z.c3, 4: Z.m4 / Z.c4};
export const RANGE = {L: Z.gL / Z.dL, M: Z.gM / Z.dM, H: Z.gH / Z.dH};
export const BEVEL = Z.crown / Z.pin;
export const FINAL = 1 + Z.ring / Z.sun;
export const PTO_RATIO = Z.ptoB / Z.ptoA; // 4.05: 2199 rpm -> 543
export const FRONT_TOTAL = (Z.fCrown / Z.fPin) * (1 + Z.fRing / Z.fSun); // prop turns per front wheel turn
// the front wheels are geared about 2 % faster than the rear (the usual lead of a front-wheel assist)
export const LEAD = (BEVEL * FINAL * (RF / RW)) / FRONT_TOTAL - 1;
export const IDLE = 850;
export const RATED = 2500;
export const total = (sh, g, r) => SHUTTLE[sh] * GEAR[g] * RANGE[r] * BEVEL * FINAL;
export const kmhAt = (rpm, sh, g, r) => (sh === 'N' ? 0 : ((rpm / total(sh, g, r)) * 2 * Math.PI * RW * 3.6) / 60);

// the idler: 20 T between the 27 T on S0 and the 30 T on S1, off to the left (-x)
{
  const dA = rp(Z.sR) + rp(Z.idR);
  const dB = rp(Z.s1R) + rp(Z.idR);
  // S0 at (0, CD) relative to S1 at (0, 0)
  const y = (dB * dB - dA * dA + CD * CD) / (2 * CD);
  Z.idlerXY = [-Math.sqrt(dB * dB - y * y), y];
}

// ------------------------------------------------------------ the layout along z (metres, rear axle at z = 0, +z forward)
export const ZP = {
  sF: 1.09, hubS: 1.05, sR: 1.01, // reverser
  m4: 0.9, hub34: 0.866, m3: 0.832, m2: 0.782, hub12: 0.748, m1: 0.714, // 4-speed
  gH: 0.62, hubH: 0.586, gM: 0.536, hubLM: 0.502, gL: 0.468, // ranges
};
export const FACE = 0.024;
export const TRAVEL = 0.011;
export const DOG = 0.021; // dog ring centre from its hub
// the five sliding sleeves: where they sit, which gear each end takes (+1 = toward +z)
export const HUBS = [
  {key: 'S', shaft: 0, z: ZP.hubS, plus: 'F', minus: 'R', name: 'REVERSOR'},
  {key: '34', shaft: 2, z: ZP.hub34, plus: 4, minus: 3, name: '3–4'},
  {key: '12', shaft: 2, z: ZP.hub12, plus: 2, minus: 1, name: '1–2'},
  {key: 'H', shaft: 3, z: ZP.hubH, plus: 'H', minus: null, name: 'H'},
  {key: 'LM', shaft: 3, z: ZP.hubLM, plus: 'M', minus: 'L', name: 'L–M'},
];
/** sleeve targets (-1..1) for a selection */
export const targets = ({sh, g, r}) => [sh === 'F' ? 1 : sh === 'R' ? -1 : 0, g === 4 ? 1 : g === 3 ? -1 : 0, g === 2 ? 1 : g === 1 ? -1 : 0, r === 'H' ? 1 : 0, r === 'M' ? 1 : r === 'L' ? -1 : 0];

// ------------------------------------------------------------ shifting
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const sm = (x) => {
  const u = clamp01(x);
  return u * u * u * (u * (u * 6 - 15) + 10);
};
export const ss = (a, b, t) => sm((t - a) / (b - a));
export const SHIFT_DUR = 1.15;
export const PH = {clutchOut: 0.14, outOf: 0.36, cone: 0.5, sync1: 0.74, dogs: 0.88};
/** a sleeve going from a to b (-1, 0, 1) at shift progress p; the clutch over the shift */
export const sleeveAt = (a, b, p) => {
  if (a === b) return a;
  const out = a * (1 - ss(PH.clutchOut, PH.outOf, p));
  if (p < PH.outOf || b === 0) return out;
  return b * (0.6 * ss(PH.outOf, PH.cone, p) + 0.4 * ss(PH.sync1, PH.dogs, p));
};
export const clutchAt = (p) => 1 - ss(0, PH.clutchOut, p) + ss(PH.dogs, 1, p);
export const LEVER = {sh: 'REVERSOR', g: 'MARCHA', r: 'GAMA'};
export const phaseOf = (lever, p, to) => {
  if (p < PH.clutchOut) return 'EMBREAGEM ACIONADA';
  if (p < PH.outOf) return `${LEVER[lever]}: LUVA SAI DO ENGATE`;
  if (to === 'N') return 'REVERSOR EM NEUTRO';
  if (p < PH.sync1) return 'SINCRONIZADOR IGUALA AS ROTAÇÕES';
  if (p < PH.dogs) return 'LUVA ENGATA NOS DENTES';
  return 'EMBREAGEM SOLTA';
};
export const label = (sel) => `${sel.sh === 'N' ? 'N' : sel.sh} · ${sel.r}${sel.g}`;

// ------------------------------------------------------------ the state and one step of it
export const newState = (sel = {sh: 'N', g: 1, r: 'L'}) => ({
  t: 0, sel: {...sel}, shift: null, throttle: 0, brake: 0, pto: 0, fwd: 1,
  eng: IDLE, v: 0, w: [IDLE, 0, 0, 0], msg: '', msgT: -9, ptoOn: 0, slip: false, wheel: 0,
  th: {eng: 0, s0: 0, s1: 0, s2: 0, s3: 0, wheel: 0, front: 0, prop: 0, pto: 0, ptoL: 0},
});
/** why the box refuses a selection now ('' if it takes it) */
export function refuse(s, lever, val) {
  const kmh = Math.abs(s.v) * 3.6;
  if (lever === 'r' && kmh > 3) return 'REDUZA A MENOS DE 3 KM/H PARA TROCAR A GAMA';
  if (lever === 'sh' && val !== 'N' && kmh > 6 && Math.sign(s.v) !== (val === 'F' ? 1 : -1)) return 'REDUZA A MENOS DE 6 KM/H PARA INVERTER';
  return '';
}
export function request(s, lever, val) {
  if (s.shift || s.sel[lever] === val) return false;
  const why = refuse(s, lever, val);
  if (why) {
    s.msg = why;
    s.msgT = s.t;
    return false;
  }
  const to = {...s.sel, [lever]: val};
  s.shift = {lever, from: targets(s.sel), to: targets(to), sel: to, t0: s.t, val};
  return true;
}
/** the pose of the state: sleeve positions, clutch, what is engaged */
export function poseOf(s) {
  let sl = targets(s.sel);
  let clutch = 1;
  let phase = '';
  let p = 1;
  let sync = -1;
  if (s.shift) {
    p = clamp01((s.t - s.shift.t0) / SHIFT_DUR);
    sl = s.shift.from.map((a, i) => sleeveAt(a, s.shift.to[i], p));
    clutch = clutchAt(p);
    phase = phaseOf(s.shift.lever, p, s.shift.val);
    if (p >= PH.cone && p < PH.dogs) sync = s.shift.from.findIndex((a, i) => a !== s.shift.to[i] && s.shift.to[i] !== 0);
  }
  const on = (i) => Math.abs(sl[i]) > 0.97;
  const sh = on(0) ? (sl[0] > 0 ? 'F' : 'R') : null;
  const g = on(1) ? (sl[1] > 0 ? 4 : 3) : on(2) ? (sl[2] > 0 ? 2 : 1) : null;
  const r = on(3) ? 'H' : on(4) ? (sl[4] > 0 ? 'M' : 'L') : null;
  return {sl, clutch, phase, p, sync, syncSide: sync >= 0 ? Math.sign(s.shift.to[sync]) : 0, sh, g, r, chain: !!(sh && g && r)};
}

const RPM = (2 * Math.PI) / 60;
/**
 * advance s by dt (real seconds). rot scales only the drawn rotation (slow motion): every readout stays real.
 * Signed speeds in rpm; a mesh turns the next shaft the other way, the idler turns it back.
 */
export function step(s, dt, rot) {
  s.t += dt;
  if (s.shift && s.t - s.shift.t0 >= SHIFT_DUR) {
    s.sel = s.shift.sel;
    s.shift = null;
  }
  const P = poseOf(s);
  // the engine: governed to the hand throttle, idle with it closed
  const want = IDLE + (RATED - IDLE) * s.throttle;
  s.eng += (want - s.eng) * Math.min(1, dt / 0.45);
  // the tractor: pulled to the speed the chain sets while the clutch bites, otherwise rolling to a stop in the field
  if (P.chain && P.clutch > 0.02) {
    const dir = P.sh === 'F' ? 1 : -1;
    const target = ((dir * s.eng) / total(P.sh, P.g, P.r)) * RPM * RW;
    s.v += (target - s.v) * Math.min(1, (dt * P.clutch) / 0.9);
  } else s.v -= s.v * Math.min(1, dt / 1.3);
  if (s.brake > 0) s.v -= Math.sign(s.v) * Math.min(Math.abs(s.v), 3.2 * s.brake * dt);
  // shafts from the wheels up through whatever is engaged
  const wheel = (s.v / RW) / RPM; // rpm, + forward
  const w = [null, null, null, null];
  w[3] = -wheel * FINAL * BEVEL; // the pinion shaft turns so the crown drives the wheels forward
  if (P.r) w[2] = -w[3] * RANGE[P.r];
  if (w[2] !== null && P.g) w[1] = -w[2] * GEAR[P.g];
  if (w[1] !== null && P.sh) w[0] = (P.sh === 'F' ? -1 : 1) * w[1] * SHUTTLE[P.sh];
  // ... and from the engine down through the clutch. With the clutch out the primary side runs free, spinning down,
  // unless a blocker ring is pressed: then it is dragged to the speed of the gear about to lock
  const dirSh = (sh) => (sh === 'F' ? -1 : 1);
  if (w[0] === null) {
    let w0t = null;
    const nv = s.shift ? s.shift.sel : null;
    if (P.sync === 0 && w[1] !== null) w0t = dirSh(nv.sh) * w[1] * SHUTTLE[nv.sh];
    if ((P.sync === 1 || P.sync === 2) && w[2] !== null && P.sh) w0t = dirSh(P.sh) * (-w[2] * GEAR[nv.g]) * SHUTTLE[P.sh];
    if ((P.sync === 3 || P.sync === 4) && P.g && P.sh) w0t = dirSh(P.sh) * (w[3] * RANGE[nv.r] * GEAR[P.g]) * SHUTTLE[P.sh];
    if (P.clutch > 0.5) w[0] = s.eng;
    else if (w0t !== null) w[0] = s.w[0] + (w0t - s.w[0]) * Math.min(1, dt / 0.07);
    else w[0] = s.w[0] - s.w[0] * Math.min(1, dt / 1.5);
  }
  if (w[1] === null) w[1] = P.sh ? dirSh(P.sh) * (w[0] / SHUTTLE[P.sh]) : s.w[1] - s.w[1] * Math.min(1, dt / 1.2);
  if (w[2] === null) w[2] = P.g ? -w[1] / GEAR[P.g] : s.w[2] - s.w[2] * Math.min(1, dt / 1.2);
  s.w = w;
  // with the clutch in and the chain complete but the tractor slower than the gear wants, the clutch slips: the engine
  // stays governed, the primary runs with the wheels
  s.slip = P.chain && P.clutch > 0.5 && Math.abs(Math.abs(w[0]) - s.eng) > 40;
  s.wheel = wheel;
  s.pose = P;
  const k = RPM * rot * dt;
  s.th.eng += s.eng * k;
  s.th.s0 += w[0] * k;
  s.th.s1 += w[1] * k;
  s.th.s2 += w[2] * k;
  s.th.s3 += w[3] * k;
  s.th.wheel += wheel * k;
  s.th.front += wheel * (RW / RF) * k;
  s.th.prop += -w[3] * k; // the front drive shaft runs off the pinion shaft through the transfer gears, 1:1
  s.ptoOn += ((s.pto ? 1 : 0) - s.ptoOn) * Math.min(1, dt / 0.5);
  s.th.pto += (s.eng / PTO_RATIO) * s.ptoOn * k;
  s.th.ptoL += s.eng * s.ptoOn * k; // the PTO line shaft, behind its own clutch
  return s;
}

// ------------------------------------------------------------ the angles of the free gears from their shafts
// gear B meshing gear A along direction phi (A to B) turns at -zA/zB, phased so a tooth of A meets a gap of B
export const meshed = (thA, zA, zB, phi) => -(zA / zB) * (thA - phi) + phi + Math.PI - Math.PI / zB;
const UP = Math.PI / 2;
const DOWN = -Math.PI / 2;
const ID = Z.idlerXY;
const PHI_S1_ID = Math.atan2(ID[1], ID[0]);
const PHI_ID_S0 = Math.atan2(CD - ID[1], -ID[0]);
export function gearAngles(th) {
  const idl = meshed(th.s1, Z.s1R, Z.idR, PHI_S1_ID);
  const o = {
    sF: meshed(th.s1, Z.s1F, Z.sF, UP),
    idl,
    sR: meshed(idl, Z.idR, Z.sR, PHI_ID_S0),
    m1: meshed(th.s1, Z.c1, Z.m1, UP),
    m2: meshed(th.s1, Z.c2, Z.m2, UP),
    m3: meshed(th.s1, Z.c3, Z.m3, UP),
    m4: meshed(th.s1, Z.c4, Z.m4, UP),
    gL: meshed(th.s2, Z.dL, Z.gL, DOWN),
    gM: meshed(th.s2, Z.dM, Z.gM, DOWN),
    gH: meshed(th.s2, Z.dH, Z.gH, DOWN),
  };
  // the final drives: the carrier is the wheel; planets phased against the fixed ring, the sun offset half a tooth
  const planetary = (carrier, zs, zp, zr, n) => ({
    carrier,
    sun: carrier * (1 + zr / zs) + Math.PI / zs,
    planets: Array.from({length: n}, (_, k) => {
      const phi = (2 * Math.PI * k) / n;
      return (zr / zp) * (-carrier - phi) + phi;
    }),
  });
  o.rear = planetary(th.wheel, Z.sun, Z.planet, Z.ring, 3);
  o.front = planetary(th.front, Z.fSun, Z.fPlanet, Z.fRing, 4);
  o.carrier = th.wheel;
  // the engine: crank angle, pistons 1 and 4 together, 2 and 3 half a turn later
  const r = ENGINE.stroke / 2;
  o.pistons = [0, Math.PI, Math.PI, 0].map((ph) => {
    const a = th.eng + ph;
    const y = r * Math.cos(a) + Math.sqrt(ENGINE.rod * ENGINE.rod - r * r * Math.sin(a) * Math.sin(a));
    return {a, y, rodAng: Math.asin((r * Math.sin(a)) / ENGINE.rod)};
  });
  return o;
}
