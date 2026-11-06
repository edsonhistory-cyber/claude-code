// The tractor as a page you drive: the film's tractor, field and console in real time. The reverser (F N R), the four
// gears, the three ranges, the PTO and 4WD are buttons (and keys); the throttle is a slider; the brake is held. Every
// change goes through kin.request, so the box refuses what a real one would (a range change on the move, reversing
// at speed) and shows why. Seven views, five display modes, orbit by drag, zoom on the wheel. Left alone it plays the
// film's script as an auto tour with the operator's cursor; a click, drag, wheel or key hands control to the visitor
// right where the tour was, 25 s of quiet hands it back.
import {warmComposer} from '../kit/warm.js';
import {CMD, createConsole, DISPLAY, VIEWS} from './console.js';
import {camAt, displayAt, DURATION, makeConsoleFrame, makeCursor, ROT, sampleAt, stageState, traceAt, viewAt, VIEW_FN} from './film.js';
import {newState, request, ss, step} from './kin.js';
import {createStage} from './stage.js';

const W = 1600;
const H = 900;
const IDLE_S = 25;
const D2R = Math.PI / 180;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const wrap = (d) => ((((d + 180) % 360) + 360) % 360) - 180;

const CSS = `
html,body{background:#e9e6df;overflow:hidden}
#app{position:absolute!important;inset:auto!important;left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0}
#gl{touch-action:none;cursor:grab}
#gl.drag{cursor:grabbing}
.bt{pointer-events:auto;cursor:pointer;user-select:none}
.bt:hover{filter:brightness(.95)}
.hit{position:absolute;pointer-events:auto;cursor:ew-resize}
.tourchip{position:absolute;left:800px;top:146px;transform:translateX(-50%);display:flex;align-items:center;gap:7px;height:22px;padding:0 11px;border:1px solid #e3e4e7;border-radius:4px;background:rgba(250,250,251,.95);color:#23262c;font:700 9px 'JetBrains Mono',monospace;letter-spacing:1.3px;white-space:nowrap;cursor:pointer;pointer-events:auto}
.tourchip i{display:block;width:6px;height:6px;border-radius:50%;background:#f2661c}
.tourchip.on i{animation:blink 1.2s steps(2) infinite}
@keyframes blink{50%{opacity:.15}}
.keys{position:absolute;left:800px;top:728px;transform:translateX(-50%);font:500 8.4px 'JetBrains Mono',monospace;letter-spacing:1.2px;color:#8c8f96;white-space:nowrap}
.turn{position:fixed;left:0;right:0;bottom:18px;text-align:center;font:600 12px/1.4 'JetBrains Mono',monospace;letter-spacing:1px;color:#8c8f96;text-transform:uppercase;display:none}
@media (orientation:portrait) and (max-width:820px){.turn{display:block}}
`;

export function runLive() {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const app = document.getElementById('app');
  const canvas = document.createElement('canvas');
  canvas.id = 'gl';
  app.appendChild(canvas);
  const st = createStage({canvas});
  const ui = createConsole(app);
  const tourCursor = makeCursor(ui);
  const frameConsole = makeConsoleFrame(ui, st);

  // ------------------------------------------------------------ quality tiers
  const TIERS = [
    {samples: 8, ao: true, shadow: 4096, pr: 2},
    {samples: 4, ao: false, shadow: 2048, pr: 1.5},
    {samples: 2, ao: false, shadow: 1024, pr: 1},
  ];
  const light = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 700;
  let tier = light ? 2 : 0;
  let scale = 1;
  const fit = () => {
    scale = Math.min(innerWidth / W, innerHeight / H);
    app.style.transform = `translate(${(innerWidth - W * scale) / 2}px, ${(innerHeight - H * scale) / 2}px) scale(${scale})`;
    st.resize(W, H, clamp((devicePixelRatio || 1) * scale, 0.75, TIERS[tier].pr));
  };
  const applyTier = () => {
    const {pr, ...q} = TIERS[tier];
    void pr;
    st.setQuality(q);
    fit();
  };
  applyTier();
  addEventListener('resize', fit);
  const toStage = (cx, cy) => {
    const r = app.getBoundingClientRect();
    return [(cx - r.left) / scale, (cy - r.top) / scale];
  };
  const tourChip = document.createElement('div');
  tourChip.className = 'tourchip';
  ui.root.appendChild(tourChip);
  const keys = document.createElement('div');
  keys.className = 'keys';
  keys.textContent = 'TECLAS: F N R · 1 2 3 4 · L M H · ↑↓ ACELERADOR · ESPAÇO FREIO · T TDP · Q 4×4';
  ui.root.appendChild(keys);
  const note = document.createElement('div');
  note.className = 'turn';
  note.textContent = 'Gire o celular para ver o painel inteiro';
  document.body.appendChild(note);

  // ------------------------------------------------------------ state
  let T = 0;
  let s = newState();
  s.fwd4 = 0;
  let dist = 0;
  let gPlane = 0;
  let view = 'geral';
  let viewAt0 = 0;
  const disp = Object.fromEntries(DISPLAY.map((k) => [k, {on: 0, t: -9}]));
  const off = {az: 0, el: 0, k: 1};
  const cam = {...VIEW_FN.geral(0)};
  let ring = {t: -9, x: 0, y: 0};
  const trace = [];
  let traceT = 0;
  const eased = (k, dur = 0.7) => {
    const d = disp[k];
    const x = ss(d.t, d.t + dur, T);
    return d.on ? x : 1 - x;
  };
  const pulse = (k) => ui.spots[k] && (ring = {t: T, x: ui.spots[k][0], y: ui.spots[k][1]});

  // ------------------------------------------------------------ the tour, and taking over from it
  const AP = {on: true, t0: 0};
  let lastInput = 0;
  const startTour = () => {
    AP.on = true;
    AP.t0 = T;
    Object.assign(off, {az: 0, el: 0, k: 1});
  };
  const takeOver = () => {
    lastInput = T;
    if (!AP.on) return;
    AP.on = false;
    const cyc = (T - AP.t0) % DURATION;
    // the live state starts exactly where the tour's table is
    const x = sampleAt(cyc);
    s = newState(x.sel);
    Object.assign(s, {t: x.t, shift: x.shift ? {...x.shift} : null, throttle: x.throttle, brake: 0, pto: x.pto, ptoOn: x.ptoOn, fwd4: x.fwd4, eng: x.eng, v: x.v, w: [...x.w], th: {...x.th}, pose: x.pose, wheel: x.wheel});
    dist = x.dist;
    const [t0, v] = viewAt(cyc);
    view = v;
    viewAt0 = T - (cyc - t0);
    trace.length = 0;
    for (const p of traceAt(cyc)) trace.push(p);
  };
  tourChip.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    lastInput = T;
    if (AP.on) takeOver();
    else startTour();
  });
  addEventListener('pointerdown', (e) => {
    if (e.target !== tourChip) takeOver();
  });
  const syncDisplay = (cyc) => {
    const want = displayAt(cyc);
    for (const k of DISPLAY) {
      if (disp[k].on !== want[k]) {
        disp[k].on = want[k];
        disp[k].t = T;
      }
    }
  };

  // ------------------------------------------------------------ controls
  // a command given while another shift is still running waits for it
  let pending = null;
  const ask = (lever, v) => {
    takeOver();
    pulse(lever + v);
    if (s.shift) pending = {lever, v};
    else request(s, lever, v);
    if (lever === 'g') gPlane = v > 2 ? 1 : 0;
  };
  for (const lever of ['sh', 'g', 'r']) for (const [v] of CMD[lever]) ui.btn[lever + v].addEventListener('click', () => ask(lever, v));
  ui.btn.pto.addEventListener('click', () => {
    takeOver();
    pulse('pto');
    s.pto = s.pto ? 0 : 1;
  });
  ui.btn.fwd4.addEventListener('click', () => {
    takeOver();
    pulse('fwd4');
    s.fwd4 = s.fwd4 ? 0 : 1;
  });
  const brake = (on) => {
    s.brake = on ? 1 : 0;
    lastInput = T;
  };
  ui.btn.brake.addEventListener('pointerdown', (e) => {
    takeOver();
    pulse('brake');
    brake(true);
    ui.btn.brake.setPointerCapture(e.pointerId);
  });
  for (const ev of ['pointerup', 'pointercancel']) ui.btn.brake.addEventListener(ev, () => brake(false));
  for (const k of VIEWS)
    ui.btn[k].addEventListener('click', () => {
      takeOver();
      pulse(k);
      view = k;
      viewAt0 = T;
      Object.assign(off, {az: 0, el: 0, k: 1});
    });
  for (const k of DISPLAY)
    ui.btn[k].addEventListener('click', () => {
      takeOver();
      pulse(k);
      disp[k].on = disp[k].on ? 0 : 1;
      disp[k].t = T;
    });
  {
    const d = document.createElement('div');
    d.className = 'hit';
    const {x: x0, w} = ui.TH;
    Object.assign(d.style, {left: `${x0 - 8}px`, top: '804px', width: `${w + 16}px`, height: '24px'});
    const move = (e) => {
      const [x] = toStage(e.clientX, e.clientY);
      s.throttle = clamp((x - x0) / w, 0, 1);
      lastInput = T;
    };
    d.addEventListener('pointerdown', (e) => {
      takeOver();
      d.setPointerCapture(e.pointerId);
      const up = () => {
        removeEventListener('pointermove', move);
        removeEventListener('pointerup', up);
      };
      addEventListener('pointermove', move);
      addEventListener('pointerup', up);
      move(e);
    });
    ui.root.appendChild(d);
  }
  addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key.toLowerCase();
    if (e.repeat && k !== 'arrowup' && k !== 'arrowdown') return;
    if (k === 'f' || k === 'n' || k === 'r') ask('sh', k.toUpperCase());
    else if ('1234'.includes(k) && k.length === 1) ask('g', Number(k));
    else if (k === 'l' || k === 'm' || k === 'h') ask('r', k.toUpperCase());
    else if (k === 'arrowup' || k === 'arrowdown') {
      takeOver();
      s.throttle = clamp(s.throttle + (k === 'arrowup' ? 0.08 : -0.08), 0, 1);
    } else if (k === ' ') {
      takeOver();
      brake(true);
    } else if (k === 't') ui.btn.pto.click();
    else if (k === 'q') ui.btn.fwd4.click();
    else return;
    e.preventDefault();
  });
  addEventListener('keyup', (e) => e.key === ' ' && brake(false));
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    drag = {x: e.clientX, y: e.clientY};
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('drag');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    off.az += ((e.clientX - drag.x) / scale) * 0.3;
    off.el = clamp(off.el + ((e.clientY - drag.y) / scale) * 0.2, -10, 70);
    drag = {x: e.clientX, y: e.clientY};
    lastInput = T;
  });
  const endDrag = () => {
    drag = null;
    canvas.classList.remove('drag');
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      takeOver();
      off.k = clamp(off.k * Math.exp(e.deltaY * 0.0012), 0.35, 2.6);
    },
    {passive: false},
  );

  // ------------------------------------------------------------ the frame
  startTour();
  let last = performance.now();
  const perf = {n: 0, sum: 0, slow: 0, age: 0};
  const frame = (now) => {
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    T += dt;
    if (tier < TIERS.length - 1) {
      perf.age += dt;
      if (perf.age > 0.6) {
        perf.sum += dt;
        perf.n++;
        if (perf.sum >= 0.5 && perf.n >= 6) {
          perf.slow = perf.sum / perf.n > 0.022 ? perf.slow + 1 : 0;
          perf.sum = 0;
          perf.n = 0;
          if (perf.slow >= (perf.age < 6 ? 1 : 2)) {
            tier++;
            applyTier();
            Object.assign(perf, {age: 0, slow: 0});
          }
        }
      }
    }
    let x;
    let tgt;
    let cursor;
    let since;
    let tr;
    let toast = '';
    if (AP.on) {
      const cyc = (T - AP.t0) % DURATION;
      x = sampleAt(cyc);
      syncDisplay(cyc);
      tgt = camAt(cyc, displayAt(cyc).orbit);
      const [t0, v] = viewAt(cyc);
      view = v;
      since = cyc - t0;
      cursor = tourCursor(cyc);
      tr = traceAt(cyc);
      if (x.sel.g) gPlane = x.sel.g > 2 ? 1 : 0;
    } else {
      if (T - lastInput > IDLE_S) startTour();
      step(s, dt, ROT);
      if (pending && !s.shift) {
        request(s, pending.lever, pending.v);
        pending = null;
      }
      dist += s.v * dt * ROT;
      x = {...s, dist};
      traceT += dt;
      if (traceT > 10 / 47) {
        traceT = 0;
        trace.push([s.v * 3.6, s.eng]);
        while (trace.length > 48) trace.shift();
      }
      tr = trace;
      since = T - viewAt0;
      tgt = VIEW_FN[view](since);
      tgt.az += off.az + (disp.orbit.on ? 16 * (T - disp.orbit.t) : 0);
      tgt.el = clamp(tgt.el + off.el, -8, 85);
      tgt.d *= off.k;
      const rk = Math.max(0, 1 - (T - ring.t) / 0.55);
      cursor = {x: -99, y: -99, press: false, ring: rk, ringX: ring.x, ringY: ring.y};
      if (s.msg && s.t - s.msgT < 2.6) toast = s.msg;
    }
    const k = 1 - Math.exp(-dt / (AP.on ? 0.18 : 0.4));
    cam.az += wrap(tgt.az - cam.az) * k;
    for (const key of ['tx', 'ty', 'tz', 'el', 'd', 'sx', 'sy']) cam[key] += (tgt[key] - cam[key]) * k;
    st.frame(stageState(x, {body: eased('body'), cut: eased('cut', 1.0), housing: eased('housing') * 0.86, power: eased('power')}), {...cam, az: cam.az * D2R, el: cam.el * D2R});
    const display = Object.fromEntries(DISPLAY.map((d) => [d, disp[d].on]));
    frameConsole(x, {trace: tr, view, display, labels: eased('labels', 0.5) * ss(1.1, 1.7, since), cursor, toast, gPlane});
    if (tourChip.classList.contains('on') !== AP.on || !tourChip.firstChild) {
      tourChip.classList.toggle('on', AP.on);
      tourChip.innerHTML = AP.on ? '<i></i>TOUR AUTOMÁTICO · CLIQUE PARA ASSUMIR' : '▶ VOLTAR AO TOUR';
    }
    if (!window.SIM_SHOWN) {
      window.SIM_SHOWN = true;
      dispatchEvent(new Event('simframe'));
    }
    requestAnimationFrame(frame);
  };
  warmComposer(st.renderer, st.composer, st.scene, st.camera).then(() => requestAnimationFrame(frame));
  window.LIVE = {st, cam, startTour, takeOver, get s() {
    return s;
  }, get tier() {
    return tier;
  }};
}
