// The tractor film: the operator starts in neutral, drops the body and the housings to glass, takes F in L1, runs up
// through 1-2-3-4, stops, changes to range H, drives off in F H4 to 30 km/h with the power flow lit, engages 4WD and
// the PTO, stops again and backs off in R L1. Every frame comes from one table simulated at load from the SCRIPT by
// kin.step, so the gauges, the sleeves, the gears and the ground can never disagree. render(t) is a pure lookup.
import * as THREE from 'three';
import {runSim} from '../kit/runtime.js';
import {createConsole, DISPLAY} from './console.js';
import {IDLE, label, newState, PTO_RATIO, RATED, request, ss, step} from './kin.js';
import {createStage} from './stage.js';

export const ROT = 1 / 12;
export const SLOW = '1/12';
export const DURATION = 36;
export const DEFAULTS = {duration: DURATION, fps: 60, theme: 'light', hud: {enabled: false, title: 'trator TL80', subtitle: ''}, director: {enabled: false}, watermark: ''};
const D2R = Math.PI / 180;

export const SCRIPT = [
  {t: 0, view: 'geral'},
  {t: 1.1, throttle: 0.25},
  {t: 1.9, display: 'body'},
  {t: 2.7, display: 'cut'},
  {t: 3.1, view: 'reversor'},
  {t: 3.9, sh: 'F'},
  {t: 5.3, throttle: 1},
  {t: 6.0, view: 'cambio'},
  {t: 6.6, g: 2},
  {t: 7.1, display: 'labels'},
  {t: 8.6, g: 3},
  {t: 10.4, g: 4},
  {t: 11.4, display: 'labels'},
  {t: 12.0, sh: 'N'},
  {t: 12.2, brake: 1},
  {t: 12.5, view: 'gamas'},
  {t: 13.5, brake: 0},
  {t: 13.8, r: 'H'},
  {t: 15.0, view: 'lado'},
  {t: 15.4, sh: 'F'},
  {t: 16.2, display: 'power'},
  {t: 17.6, fwd4: 1},
  {t: 18.4, view: 'pdm'},
  {t: 19.0, display: 'labels'},
  {t: 20.4, view: 'eixo'},
  {t: 21.4, pto: 1},
  {t: 22.2, view: 'tdp'},
  {t: 24.0, view: 'motor'},
  {t: 25.6, view: 'tampa'},
  {t: 27.0, display: 'labels'},
  {t: 27.2, sh: 'N'},
  {t: 27.4, brake: 1},
  {t: 28.7, brake: 0},
  {t: 28.9, r: 'L'},
  {t: 29.4, view: 'reversor'},
  {t: 30.2, g: 1},
  {t: 31.6, sh: 'R'},
  {t: 32.4, view: 'geral'},
  {t: 32.8, display: 'body'},
  {t: 33.2, display: 'cut'},
  {t: 33.6, display: 'power'},
];

// ------------------------------------------------------------ the table: kin.step over the script, once
const DT = 1 / 240;
function simulate() {
  const s = newState({sh: 'N', g: 1, r: 'L'});
  s.fwd4 = 0;
  const T = [];
  let dist = 0;
  let k = 0;
  const ev = SCRIPT.filter((e) => e.sh || e.g || e.r || e.throttle !== undefined || e.brake !== undefined || e.pto !== undefined || e.fwd4 !== undefined);
  for (let i = 0; i * DT <= DURATION + 0.5; i++) {
    while (k < ev.length && ev[k].t <= s.t + 1e-9) {
      const e = ev[k++];
      if (e.sh) request(s, 'sh', e.sh);
      if (e.g) request(s, 'g', e.g);
      if (e.r) request(s, 'r', e.r);
      if (e.throttle !== undefined) s.throttle = e.throttle;
      if (e.brake !== undefined) s.brake = e.brake;
      if (e.pto !== undefined) s.pto = e.pto;
      if (e.fwd4 !== undefined) s.fwd4 = e.fwd4;
    }
    step(s, DT, ROT);
    dist += s.v * DT * ROT;
    T.push({th: {...s.th}, pose: s.pose, eng: s.eng, v: s.v, w: [...s.w], wheel: s.wheel, dist, sel: {...s.sel}, shift: s.shift ? {...s.shift} : null, throttle: s.throttle, brake: s.brake, pto: s.pto, ptoOn: s.ptoOn, fwd4: s.fwd4, msg: s.msg, msgT: s.msgT, t: s.t});
  }
  return T;
}
export const TABLE = simulate();
export const sampleAt = (t) => {
  const u = Math.max(0, Math.min(TABLE.length - 2, t / DT - 1));
  const i = Math.floor(u);
  const f = u - i;
  const a = TABLE[i];
  const b = TABLE[i + 1];
  const th = {};
  for (const key in a.th) th[key] = a.th[key] + (b.th[key] - a.th[key]) * f;
  return {...a, th, dist: a.dist + (b.dist - a.dist) * f};
};
/** the console's speed trace: [km/h, engine rpm] over the 10 s before t */
export const traceAt = (t) => Array.from({length: 48}, (_, i) => {
  const x = sampleAt(Math.max(0, t - 10 + (i / 47) * 10));
  return [x.v * 3.6, x.eng];
});

// ------------------------------------------------------------ display toggles
export const displayAt = (t) => {
  const out = Object.fromEntries(DISPLAY.map((k) => [k, 0]));
  for (const e of SCRIPT) if (e.display && e.t <= t) out[e.display] = out[e.display] ? 0 : 1;
  return out;
};
const lastFlip = (key, t) => SCRIPT.filter((e) => e.display === key && e.t <= t).pop()?.t ?? -9;
export const easedDisplay = (key, t, dur = 0.7) => {
  const on = displayAt(t)[key];
  const k = ss(lastFlip(key, t), lastFlip(key, t) + dur, t);
  return on ? k : 1 - k;
};

// ------------------------------------------------------------ views (world space; the tractor stays put, the field slides)
export const VIEW_FN = {
  geral: (u) => ({tx: 0, ty: 1.05, tz: 1.2, az: 38 + 2.2 * u, el: 15, d: 10.5, sx: 0, sy: -20}),
  lado: (u) => ({tx: 0, ty: 0.95, tz: 1.2, az: 90 + 1.2 * u, el: 5, d: 9.4, sx: 0, sy: -20}),
  cambio: (u) => ({tx: 0, ty: 0.83, tz: 0.8, az: 82 + 1.5 * u, el: 16, d: 2.1, sx: 0, sy: -24}),
  reversor: (u) => ({tx: 0, ty: 0.84, tz: 1.04, az: 78 + 1.5 * u, el: 22, d: 1.75, sx: 0, sy: -24}),
  gamas: (u) => ({tx: 0, ty: 0.8, tz: 0.6, az: 84 + 1.5 * u, el: 32, d: 1.9, sx: 0, sy: -24}),
  eixo: (u) => ({tx: 0.25, ty: 0.78, tz: 0.05, az: 155 + 2 * u, el: 24, d: 3.0, sx: 0, sy: -24}),
  frente: (u) => ({tx: 0, ty: 1.0, tz: 1.2, az: 6 + 1.5 * u, el: 9, d: 10, sx: 0, sy: -20}),
  motor: (u) => ({tx: 0, ty: 1.02, tz: 1.75, az: 84 + 1.5 * u, el: 14, d: 2.2, sx: 0, sy: -24}),
  tampa: (u) => ({tx: 0, ty: 0.98, tz: 0.85, az: 60 + 1.5 * u, el: 48, d: 1.7, sx: 0, sy: -24}),
  tdp: (u) => ({tx: 0, ty: 0.6, tz: -0.2, az: 205 + 1.5 * u, el: 10, d: 2.1, sx: 0, sy: -24}),
  pdm: (u) => ({tx: 0, ty: 0.58, tz: 2.3, az: 22 + 1.5 * u, el: 20, d: 2.9, sx: 0, sy: -24}),
};
const VIEWS = SCRIPT.filter((e) => e.view).map((e) => [e.t, e.view]);
const blend = (a, b, k) => {
  const o = {};
  for (const key in b) o[key] = key === 'az' ? a.az + ((((b.az - a.az + 540) % 360) - 180) * k) : a[key] + (b[key] - a[key]) * k;
  // big moves pull back a little on the way so the camera never cuts through the tractor
  const far = Math.max(a.d, b.d);
  o.d += Math.max(0, Math.min(far, 4) * 0.35 * Math.sin(Math.PI * k));
  return o;
};
export const camAt = (t, orbit = 0) => {
  let i = 0;
  while (i < VIEWS.length - 1 && VIEWS[i + 1][0] <= t) i++;
  const cur = VIEW_FN[VIEWS[i][1]](t - VIEWS[i][0]);
  let o = cur;
  if (i > 0) {
    const k = ss(VIEWS[i][0], VIEWS[i][0] + 1.6, t);
    if (k < 1) o = blend(VIEW_FN[VIEWS[i - 1][1]](t - VIEWS[i - 1][0]), cur, k);
  }
  if (orbit > 0) o = {...o, az: o.az + 16 * Math.max(0, t - lastFlip('orbit', t)) * orbit};
  return o;
};
export const viewAt = (t) => VIEWS.filter(([a]) => a <= t).pop();

// ------------------------------------------------------------ the operator's pointer
const REST = [[860, 470], [760, 430], [960, 520], [820, 400]];
export const spotOf = (ui, e) => {
  if (e.view) return ui.spots[e.view];
  if (e.display) return ui.spots[e.display];
  if (e.sh) return ui.spots['sh' + e.sh];
  if (e.g) return ui.spots['g' + e.g];
  if (e.r) return ui.spots['r' + e.r];
  if (e.pto !== undefined) return ui.spots.pto;
  if (e.fwd4 !== undefined) return ui.spots.fwd4;
  if (e.brake !== undefined) return ui.spots.brake;
  if (e.throttle !== undefined) return ui.throttleAt(e.throttle);
  return null;
};
export function makeCursor(ui) {
  const EV = SCRIPT.filter((e) => e.t > 0 && !(e.brake === 0)).map((e) => ({t: e.t, spot: spotOf(ui, e)}));
  const WP = [[0, 900, 600]];
  EV.forEach((e, i) => {
    WP.push([e.t - 0.16, ...e.spot], [e.t + 0.2, ...e.spot]);
    const next = EV[i + 1];
    if (!next || next.t - e.t > 1.0) WP.push([e.t + 0.9, ...REST[i % REST.length]]);
  });
  WP.sort((a, b) => a[0] - b[0]);
  return (t) => {
    let i = 0;
    while (i < WP.length - 2 && t > WP[i + 1][0]) i++;
    const [t0, x0, y0] = WP[i];
    const [t1, x1, y1] = WP[i + 1];
    const k = ss(t0, t1, t);
    const len = Math.hypot(x1 - x0, y1 - y0);
    const bow = Math.sin(Math.PI * k) * Math.min(24, len * 0.07);
    let press = false;
    let ring = 0;
    let rx = 0;
    let ry = 0;
    for (const e of EV) {
      if (t >= e.t - 0.07 && t < e.t + 0.09) press = true;
      if (t >= e.t && t < e.t + 0.55) {
        ring = 1 - (t - e.t) / 0.55;
        [rx, ry] = e.spot;
      }
    }
    return {x: x0 + (x1 - x0) * k + (len ? (-(y1 - y0) / len) * bow : 0), y: y0 + (y1 - y0) * k + (len ? ((x1 - x0) / len) * bow : 0), press, ring, ringX: rx, ringY: ry};
  };
}

// ------------------------------------------------------------ the labels
const PARTS = [
  {key: 'engine', name: 'MOTOR IVECO/NH 8045', sub: '3,9 L · 82 CV A 2.500 RPM'},
  {key: 'pistons', name: 'PISTÕES E BIELAS', sub: '104 × 115 MM · ORDEM 1-3-4-2'},
  {key: 'timing', name: 'DISTRIBUIÇÃO POR ENGRENAGENS', sub: 'VIRABREQUIM 30 → COMANDO 60'},
  {key: 'pump', name: 'BOMBA INJETORA MECÂNICA', sub: 'BOMBA DE INJEÇÃO · 4 BICOS'},
  {key: 'bolster', name: 'SUPORTE DIANTEIRO', sub: 'MOTOR É O CHASSI · EIXO DIANTEIRO OSCILA'},
  {key: 'clutch', name: 'EMBREAGEM DUPLA', sub: '1º DISCO: CÂMBIO · 2º DISCO: TDP'},
  {key: 'shuttle', name: 'REVERSOR SINCRONIZADO', sub: 'F 30/30 · R 27→20→30'},
  {key: 'idler', name: 'ENGRENAGEM INTERMEDIÁRIA', sub: 'INVERTE O SENTIDO NA RÉ'},
  {key: 'cover', name: 'TAMPA DE COMANDO', sub: 'TRILHOS, GARFOS E SELETOR'},
  {key: 'hub34', name: 'SINCRONIZADOR 3–4', sub: 'LUVA + ANEL DE BRONZE'},
  {key: 'gears', name: 'CÂMBIO 4 MARCHAS', sub: '19/41 · 23/37 · 28/32 · 32/28'},
  {key: 'hub12', name: 'SINCRONIZADOR 1–2', sub: 'LUVA DESLIZA NO CUBO'},
  {key: 'range', name: 'GAMAS L · M · H', sub: '11/49 · 18/42 · 30/30'},
  {key: 'crown', name: 'PINHÃO E COROA', sub: '9/43 · DIFERENCIAL'},
  {key: 'trumpet', name: 'EIXO DA TROMBETA', sub: 'SEMIEIXO ATÉ O SOL'},
  {key: 'brakes', name: 'FREIOS EM BANHO DE ÓLEO', sub: 'DISCOS NO SEMIEIXO'},
  {key: 'final', name: 'SATÉLITES DA TROMBETA', sub: 'SOL 18 · 3 × 36 · ANEL 90 = 6 : 1'},
  {key: 'prop', name: 'CARDÃ DA PDM', sub: 'TRANSFERÊNCIA 30/30'},
  {key: 'pdm', name: 'PDM · DIFERENCIAL DIANTEIRO', sub: 'COROA 34/9'},
  {key: 'pdmHub', name: 'SATÉLITES DO CUBO', sub: 'SOL 18 · 4 × 26 · ANEL 70'},
  {key: 'ptoClutch', name: 'EIXO DA TDP', sub: 'DO 2º DISCO À TRASEIRA'},
  {key: 'ptoRed', name: 'REDUÇÃO DA TDP', sub: '19/77 → 540 RPM A 2.199'},
  {key: 'pto', name: 'PONTA DA TDP', sub: '6 ESTRIAS · 1 3/8"'},
  {key: 'levers', name: 'ALAVANCAS', sub: 'MARCHA · GAMA · REVERSOR'},
];
export function makeLabels(st) {
  return (o) => {
    if (o < 0.02) return [];
    const pts = PARTS.map((p) => ({p, at: st.project(st.tractor.anchors[p.key]())})).filter((x) => x.at && x.at[0] > 330 && x.at[0] < 1290 && x.at[1] > 130 && x.at[1] < 740);
    const L = pts.filter((x) => x.at[0] < 800).sort((a, b) => a.at[1] - b.at[1]);
    const R = pts.filter((x) => x.at[0] >= 800).sort((a, b) => a.at[1] - b.at[1]);
    const out = [];
    const stack = (col, x, w) => {
      let y = 140;
      for (const c of col) {
        y = Math.max(y, Math.min(706, c.at[1] - 10));
        out.push({name: c.p.name, sub: c.p.sub, at: c.at, label: [x, y], w, o});
        y += 32;
      }
    };
    stack(L, 336, 190);
    stack(R, 1104, 190);
    return out;
  };
}

/** the console's frame from a sample of the state */
export function makeConsoleFrame(ui, st) {
  const labels = makeLabels(st);
  return (x, extra) => {
    const P = x.pose;
    const sel = x.shift ? x.shift.sel : x.sel;
    const sub = x.shift ? P.phase : P.chain ? (P.clutch > 0.5 ? (x.v < -0.05 ? 'ANDANDO DE RÉ' : x.v > 0.05 ? 'TRANSMITINDO FORÇA' : 'ENGATADO') : 'EMBREAGEM ACIONADA') : x.sel.sh === 'N' ? 'REVERSOR EM NEUTRO · MOTOR LIVRE' : 'NEUTRO';
    ui.update({
      pose: P,
      shift: x.shift,
      sel,
      title: label(sel),
      sub,
      eng: x.eng,
      w: x.w,
      wheel: x.wheel,
      ptoRpm: (x.eng / PTO_RATIO) * x.ptoOn,
      v: x.v,
      trace: extra.trace,
      slow: SLOW,
      pto: x.pto,
      fwd4: x.fwd4,
      brake: x.brake,
      throttle: x.throttle,
      engWant: IDLE + (RATED - IDLE) * x.throttle,
      view: extra.view,
      display: extra.display,
      toast: extra.toast,
      callouts: labels(extra.labels),
      cursor: extra.cursor,
      gPlane: extra.gPlane,
    });
  };
}
/** the stage state for a sample */
export const stageState = (x, disp) => ({th: x.th, pose: x.pose, fwd4: x.fwd4, ptoOn: x.ptoOn, dist: x.dist, ...disp});

export function makeFilm() {
  return async ({canvas, capture}) => {
    const st = createStage({canvas});
    const resize = () => st.resize(1600, 900, capture ? devicePixelRatio || 1 : Math.min(devicePixelRatio || 1, 2));
    resize();
    const ui = createConsole(document.getElementById('app'));
    const cursorAt = makeCursor(ui);
    const frame = makeConsoleFrame(ui, st);
    window.CS = st;
    void THREE;
    return {
      resize,
      render(t) {
        const x = sampleAt(t);
        const disp = displayAt(t);
        const cam = camAt(t, disp.orbit);
        st.frame(stageState(x, {body: easedDisplay('body', t), cut: easedDisplay('cut', t, 1.0), housing: easedDisplay('housing', t) * 0.86, power: easedDisplay('power', t)}), {...cam, az: cam.az * D2R, el: cam.el * D2R});
        const [vt0, view] = viewAt(t);
        frame(x, {trace: traceAt(t), view, display: disp, labels: easedDisplay('labels', t, 0.5) * ss(vt0 + 1.1, vt0 + 1.7, t), cursor: cursorAt(t)});
        return {};
      },
    };
  };
}

export const run = () => runSim(DEFAULTS, makeFilm());
