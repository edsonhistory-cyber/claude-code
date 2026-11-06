// The hydraulic lift lesson as one app: the film (every step in order, then the lift raised, held, lowered part way and
// down) and the live page (step forward and back, play, take apart; in "funcionamento" raise, hold and lower with the
// buttons or ask for a height with the position lever, and watch the spool, the piston, the conrod, the rockshaft,
// the arms, the rods and the lower links, and the feedback that closes the valve). The console: the step card (what,
// why, tool, care), the parts of this step, the full parts list ticking off as they go in, the mode and display
// toggles, the step bar or the drive controls, labels with leaders on the parts that matter now.
import {runSim} from '../kit/runtime.js';
import {warmComposer} from '../kit/warm.js';
import {activeParts, CROSS8, ease, installed, lift, N, PARTS, stepAt, STEPS} from './model.js';
import {createStage} from './stage.js';

const W = 1600;
const H = 900;
const D2R = Math.PI / 180;
export const ROT = 1 / 12; // drawn rotation vs real
const C = {ink: '#23262c', mute: '#8c8f96', faint: '#d6d8dc', line: '#e3e4e7', panel: 'rgba(250,250,251,.96)', or: '#f2661c', blue: '#1c46bd', green: '#2a9d61'};
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const ss = (a, b, t) => ease((t - a) / (b - a));
const nf = (n, d = 0) => Number(n).toLocaleString('pt-BR', {minimumFractionDigits: d, maximumFractionDigits: d});
let CTX = 'trator';
const toWorld = (c) => c;
// views in the tractor's frame (shafts along z): from the left (+x), outside the rear wheel, looking into the opening
const VIEW = {
  // from behind the tractor, between the rear wheels (the hitch is off), or from above them
  geral: (u) => ({tx: 0, ty: 1.15, tz: -0.75, az: 195 + 1.2 * u, el: 16, d: 3.7}),
  lift: (u) => ({tx: 0, ty: 1.66, tz: -0.95, az: 200 + 1.5 * u, el: 24, d: 1.5}),
  cyl: (u) => ({tx: 0, ty: 1.62, tz: -0.8, az: 228 + 1.5 * u, el: 18, d: 1.2}),
  rock: (u) => ({tx: 0.1, ty: 1.64, tz: -1.1, az: 162 + 1.5 * u, el: 20, d: 1.3}),
  ctrl: (u) => ({tx: -0.15, ty: 1.64, tz: -0.95, az: 232 + 1.5 * u, el: 20, d: 1.25}),
  join: (u) => ({tx: 0, ty: 1.3, tz: -0.5, az: 195 + 1.2 * u, el: 16, d: 2.7}),
  bolts: (u) => ({tx: 0, ty: 1.05, tz: -0.02, az: 190 + 1.0 * u, el: 46, d: 1.45}),
  arms: (u) => ({tx: 0, ty: 0.85, tz: -0.55, az: 190 + 1.2 * u, el: 12, d: 2.2}),
  ctrl2: (u) => ({tx: -0.2, ty: 1.08, tz: 0.12, az: 270 + 1.0 * u, el: 32, d: 1.05}),
  func: (u) => ({tx: 0, ty: 1.0, tz: -0.4, az: 200 + 1.5 * u, el: 18, d: 2.1}),
};
const VIEW_FN = VIEW;
const viewFn = (k) => VIEW[k];

// ------------------------------------------------------------ the film's script
export const T0 = 3;
export const STEP_T = 2.6;
export const T_FUNC = T0 + N * STEP_T + 0.8;
export const DURATION = T_FUNC + 14;
export const filmU = (t) => {
  if (t < T0) return 0;
  const s = Math.min(N, Math.floor((t - T0) / STEP_T) + 1);
  const ts = T0 + (s - 1) * STEP_T;
  return s - 1 + ss(0, 1.6, t - ts);
};
// ------------------------------------------------------------ the lift running: the position lever asks for a height,
// the valve opens up or down until the feedback closes it there
export const RATE = {up: 0.28, down: 0.4}; // fraction of the full travel per second (drawn real-time)
export const FILM_LIFT = [[T_FUNC + 1.2, 1], [T_FUNC + 6.5, 0.4], [T_FUNC + 10.5, 0]];
const DT = 1 / 240;
const HH = [0];
const VV = [0];
const TG = [0];
export const valveFor = (target, h) => (target > h + 0.01 ? 1 : target < h - 0.01 ? -1 : 0);
export const stepLift = (h, target, dt) => {
  const v = valveFor(target, h);
  const nh = v > 0 ? Math.min(target, h + RATE.up * dt) : v < 0 ? Math.max(target, h - RATE.down * dt) : h;
  return {h: nh, v};
};
{
  let h = 0;
  for (let i = 0; i * DT <= DURATION + 1; i++) {
    const t = i * DT;
    let tg = 0;
    for (const [t0, g] of FILM_LIFT) if (t >= t0) tg = g;
    const r = stepLift(h, tg, DT);
    h = r.h;
    HH.push(h);
    VV.push(r.v);
    TG.push(tg);
  }
}
const look = (A, t) => {
  const u = clamp(t / DT, 0, A.length - 2);
  const i = Math.floor(u);
  return A[i] + (A[i + 1] - A[i]) * (u - i);
};
export const filmState = (t) => {
  const func = t >= T_FUNC;
  const i = Math.round(clamp(t / DT, 0, VV.length - 1));
  return {u: filmU(t), mode: func ? 'func' : 'mont', h: look(HH, t), target: TG[i], valve: VV[i], cut: func ? ss(T_FUNC + 0.2, T_FUNC + 1.0, t) : 0, labels: 1};
};
export const filmView = (t) => {
  if (t >= T_FUNC) return ['func', T_FUNC];
  const s0 = t < T0 ? 0 : Math.min(N, Math.floor((t - T0) / STEP_T) + 1);
  return [STEPS[s0].view, s0 === 0 ? 0 : T0 + (s0 - 1) * STEP_T];
};

// ------------------------------------------------------------ the console
const CSS = `
#app{font-family:Inter,system-ui,sans-serif;color:${C.ink};-webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums}
.ui{position:absolute;inset:0;pointer-events:none}
.mo{font-family:'JetBrains Mono',ui-monospace,monospace}
.cp{position:absolute;background:${C.panel};border:1px solid ${C.line};border-radius:6px;box-shadow:0 2px 10px rgba(30,40,60,.07)}
.ph{position:absolute;display:flex;align-items:center;gap:9px;font:700 10.5px 'JetBrains Mono',monospace;letter-spacing:1.8px}
.ph i{display:block;width:3px;height:13px;background:${C.or}}
.sm{font:500 9px 'JetBrains Mono',monospace;letter-spacing:1.5px;color:${C.mute};text-transform:uppercase;white-space:nowrap}
.bt{position:absolute;height:26px;padding:0 10px;display:flex;align-items:center;justify-content:center;border:1px solid ${C.faint};border-radius:4px;background:#fff;font:700 9.6px 'JetBrains Mono',monospace;letter-spacing:1.2px;color:${C.ink};white-space:nowrap;box-sizing:border-box;pointer-events:auto;cursor:pointer;user-select:none}
.bt:hover{filter:brightness(.95)}
.call{position:absolute;white-space:nowrap}
.call b{display:flex;align-items:center;gap:6px;font:700 9.6px 'JetBrains Mono',monospace;letter-spacing:1px;color:${C.ink};background:rgba(250,250,251,.88);padding:1px 4px;border-radius:2px}
.call b i{display:block;width:6px;height:6px;background:${C.or}}
.bom{position:absolute;left:1246px;top:146px;width:312px;height:460px;overflow:hidden;font:500 9.2px/14px 'JetBrains Mono',monospace;letter-spacing:.2px}
.bom div{display:flex;gap:7px;white-space:nowrap;overflow:hidden}
.bom span.q{width:26px;text-align:right;color:${C.mute}}
.bom span.k{width:12px;text-align:center}
.cur{position:absolute;left:0;top:0;z-index:50;filter:drop-shadow(0 1px 2px rgba(0,0,0,.3))}
.ring{position:absolute;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:1.5px solid ${C.or};opacity:0;z-index:49}
.hit{position:absolute;pointer-events:auto;cursor:ew-resize}
`;
const el = (h) => {
  const d = document.createElement('div');
  d.innerHTML = h.trim();
  return d.firstElementChild;
};
// unique names in assembly order, with total quantities
const BOM = [];
for (const p of PARTS) {
  const name = p.name.replace(/ \(lado (in|ex)terno\)/, '');
  let row = BOM.find((b) => b.name === name);
  if (!row) BOM.push((row = {name, qty: 0, ids: []}));
  row.qty += p.qty;
  row.ids.push(p.id);
}

function createConsole(app) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const ui = el(`<div class="ui"></div>`);
  app.appendChild(ui);
  const add = (h) => {
    const n = el(h);
    ui.appendChild(n);
    return n;
  };
  const panel = (x, y, w, h, title, n) => {
    add(`<div class="cp" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"></div>`);
    add(`<div class="ph" style="left:${x + 14}px;top:${y + 13}px"><i></i>${title}</div>`);
    add(`<div class="sm" style="position:absolute;right:${W - x - w + 14}px;top:${y + 15}px">${n}</div>`);
  };
  const btn = {};
  // header
  add(`<div style="position:absolute;left:0;top:0;width:160px;height:89px;background:${C.blue}"></div>`);
  add(`<div style="position:absolute;left:26px;top:24px;color:#fff;font-size:34px;font-weight:800;letter-spacing:-1px;line-height:1">TL80</div>`);
  add(`<div class="mo" style="position:absolute;left:28px;top:62px;color:#fff;font-size:9px;letter-spacing:2px">TREINAMENTO</div>`);
  add(`<div class="sm" style="position:absolute;left:182px;top:22px;letter-spacing:2.4px">TRATOR AGRÍCOLA · SISTEMA HIDRÁULICO</div>`);
  add(`<div style="position:absolute;left:181px;top:37px;font-size:31px;font-weight:700;letter-spacing:-.6px;line-height:1">Levantador hidráulico <span style="color:${C.or};font-weight:400">/</span> montagem peça por peça</div>`);
  add(`<div class="mo" style="position:absolute;left:182px;top:77px;font-size:10.6px;letter-spacing:2px;color:#5d6068">CILINDRO DE SIMPLES AÇÃO · BIELA E BRAÇO DO EIXO DO LEVANTE · VÁLVULA DE CONTROLE · CONTROLE DE POSIÇÃO · 3.600 KGF NAS RÓTULAS</div>`);
  add(`<div class="sm" style="position:absolute;right:28px;top:40px;letter-spacing:2px;line-height:15px;text-align:right">CONSTRUÇÃO TÍPICA · NÃO É O DESENHO OFICIAL<br>TORQUES E FOLGAS: MANUAL DE SERVIÇO</div>`);
  // 01 the step card
  panel(28, 110, 340, 482, 'PASSO', '01');
  const stNum = add(`<div style="position:absolute;left:42px;top:142px;font-size:13px;font-weight:700;color:${C.or};letter-spacing:1px" class="mo"></div>`);
  const stTitle = add(`<div style="position:absolute;left:42px;top:162px;width:312px;font-size:19px;font-weight:700;line-height:1.15;letter-spacing:-.3px"></div>`);
  const stText = add(`<div style="position:absolute;left:42px;top:214px;width:312px;font-size:12.4px;line-height:1.5;color:#33363c"></div>`);
  const sec = (y, t) => {
    add(`<div class="sm" style="position:absolute;left:42px;top:${y}px;color:${C.or}">${t}</div>`);
    return add(`<div style="position:absolute;left:42px;top:${y + 14}px;width:312px;font-size:11.4px;line-height:1.45;color:#33363c"></div>`);
  };
  const stWhy = sec(352, 'COMO FUNCIONA');
  const stTool = sec(452, 'FERRAMENTA');
  const stCare = sec(506, 'ATENÇÃO');
  // 02 parts of this step
  panel(28, 604, 340, 128, 'PEÇAS DESTE PASSO', '02');
  const stParts = add(`<div class="mo" style="position:absolute;left:42px;top:636px;width:312px;font-size:10.4px;line-height:17px"></div>`);
  // 03 the parts list
  panel(1232, 110, 340, 508, 'LISTA DE PEÇAS', '03');
  const bom = add(`<div class="bom"></div>`);
  bom.innerHTML = BOM.map((b, i) => `<div data-i="${i}"><span class="k"></span><span class="q">${b.qty}×</span><span>${b.name}</span></div>`).join('');
  const bomRows = [...bom.children];
  // 04 mode and display
  panel(1232, 630, 340, 102, 'MODO · EXIBIÇÃO', '04');
  btn.mont = add(`<div class="bt" style="left:1246px;top:662px;width:150px">MONTAGEM</div>`);
  btn.func = add(`<div class="bt" style="left:1404px;top:662px;width:154px">FUNCIONAMENTO</div>`);
  btn.labels = add(`<div class="bt" style="left:1246px;top:696px;width:72px">RÓTULOS</div>`);
  btn.cut = add(`<div class="bt" style="left:1324px;top:696px;width:62px">CORTE</div>`);
  btn.ghost = add(`<div class="bt" style="left:1392px;top:696px;width:90px">ESMAECER</div>`);
  btn.orbit = add(`<div class="bt" style="left:1488px;top:696px;width:70px">ÓRBITA</div>`);
  // 05 the step bar (montagem) / the drive (funcionamento)
  panel(380, 752, 840, 122, 'CONTROLES', '05');
  const mont = add(`<div style="position:absolute;inset:0"></div>`);
  const btnIn = (parent, k, x, y, w, label) => {
    const n = el(`<div class="bt" style="left:${x}px;top:${y}px;width:${w}px">${label}</div>`);
    parent.appendChild(n);
    btn[k] = n;
  };
  btnIn(mont, 'prev', 396, 784, 110, '◀ ANTERIOR');
  btnIn(mont, 'next', 512, 784, 110, 'PRÓXIMO ▶');
  btnIn(mont, 'auto', 628, 784, 90, '⏵ AUTO');
  btnIn(mont, 'apart', 724, 784, 160, 'DESMONTAR TUDO');
  btnIn(mont, 'all', 890, 784, 140, 'MONTAR TUDO');
  const TL = {x: 398, w: 802, y: 838};
  mont.appendChild(el(`<div style="position:absolute;left:${TL.x}px;top:${TL.y}px;width:${TL.w}px;height:3px;background:#eceef1;border-radius:2px"></div>`));
  const tlFill = el(`<div style="position:absolute;left:${TL.x}px;top:${TL.y}px;height:3px;background:${C.or};border-radius:2px"></div>`);
  mont.appendChild(tlFill);
  for (let s = 0; s <= N; s++) mont.appendChild(el(`<div style="position:absolute;left:${TL.x + (s / N) * TL.w - 0.5}px;top:${TL.y - 4}px;width:1px;height:11px;background:#c4c7cc"></div>`));
  const tlKnob = el(`<div style="position:absolute;top:${TL.y - 6}px;width:15px;height:15px;margin-left:-7.5px;border-radius:50%;background:#fff;border:2px solid ${C.or};box-sizing:border-box"></div>`);
  mont.appendChild(tlKnob);
  const tlText = el(`<div class="sm" style="position:absolute;left:1046px;top:790px"></div>`);
  mont.appendChild(tlText);
  const func = add(`<div style="position:absolute;inset:0"></div>`);
  btnIn(func, 'up', 398, 784, 84, 'SUBIR');
  btnIn(func, 'hold', 488, 784, 84, 'PARAR');
  btnIn(func, 'down', 578, 784, 84, 'DESCER');
  func.appendChild(el(`<div class="sm" style="position:absolute;left:398px;top:822px">ALAVANCA DE POSIÇÃO</div>`));
  const HP = {x: 540, w: 230, y: 828};
  func.appendChild(el(`<div style="position:absolute;left:${HP.x}px;top:${HP.y}px;width:${HP.w}px;height:3px;background:#eceef1;border-radius:2px"></div>`));
  const hpKnob = el(`<div style="position:absolute;top:${HP.y - 6}px;width:15px;height:15px;margin-left:-7.5px;border-radius:50%;background:#fff;border:2px solid ${C.or};box-sizing:border-box"></div>`);
  func.appendChild(hpKnob);
  const hpNow = el(`<div style="position:absolute;top:${HP.y - 3}px;width:9px;height:9px;margin-left:-4.5px;border-radius:50%;background:${C.blue}"></div>`);
  func.appendChild(hpNow);
  const RP = {x: 0, w: 1, y: 0};
  const readG = el(`<div class="mo" style="position:absolute;left:792px;top:782px;width:410px;font-size:10px;line-height:17px"></div>`);
  func.appendChild(readG);
  const funcNote = el(`<div class="sm" style="position:absolute;left:398px;top:834px;font-size:8.4px;white-space:normal;width:270px;line-height:13px"></div>`);
  func.appendChild(funcNote);
  // labels and the pointer
  const callSvg = add(`<svg style="position:absolute;inset:0;overflow:visible" width="${W}" height="${H}"></svg>`);
  const callG = add(`<div style="position:absolute;inset:0"></div>`);
  const ring = add(`<div class="ring"></div>`);
  const cur = add(`<div class="cur"><svg width="22" height="22" viewBox="0 0 34 34"><path d="M4 3 L30 13.5 L17.5 17.5 L13.5 30 Z" fill="#111" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg></div>`);
  const centre = (n) => {
    const r = n.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  };
  const onBtn = (k, on, col = C.or) => {
    const b = btn[k];
    b.style.background = on ? col : '#fff';
    b.style.color = on ? '#fff' : C.ink;
    b.style.borderColor = on ? col : C.faint;
  };
  return {
    root: ui,
    btn,
    TL,
    RP,
    HP: {x: 540, w: 230, y: 828},
    spots: () => Object.fromEntries(Object.entries(btn).map(([k, n]) => [k, centre(n)])),
    update(s) {
      const {s: si, p} = stepAt(s.u);
      const S = STEPS[si];
      const isFunc = s.mode === 'func';
      mont.style.display = isFunc ? 'none' : 'block';
      func.style.display = isFunc ? 'block' : 'none';
      if (isFunc) {
        stNum.textContent = 'FUNCIONAMENTO';
        stTitle.textContent = 'Como o levante funciona';
        stText.textContent = 'A bomba hidráulica manda óleo à válvula de controle. Abrindo para subir, o óleo entra atrás do pistão, que empurra a biela; a biela gira o braço interno e o eixo do levante, e os braços externos sobem as barras pelas hastes.';
        stWhy.textContent = 'Controle de posição: a alavanca pede uma altura. Quando o eixo gira até lá, o came empurra a alavanca de realimentação, que fecha o carretel. O óleo fica preso no cilindro e o implemento para naquela altura. Para descer, a válvula deixa o óleo voltar e o peso do implemento abaixa os braços.';
        stTool.textContent = 'Arraste a alavanca de posição ou use SUBIR, PARAR, DESCER.';
        stCare.textContent = 'Ninguém entre as barras e o implemento com o levante em movimento. Para manutenção, abaixe tudo antes.';
        stParts.innerHTML = '';
      } else {
        stNum.textContent = `PASSO ${String(si).padStart(2, '0')} / ${N}`;
        stTitle.textContent = S.title;
        stText.textContent = S.text;
        stWhy.textContent = S.why;
        stTool.textContent = S.tool;
        stCare.textContent = S.care;
        const ps = activeParts(s.u);
        const rows = [];
        for (const q of ps) {
          const name = q.name.replace(/ \(lado (in|ex)terno\)/, '');
          const r = rows.find((x) => x.name === name);
          if (r) r.n += q.qty;
          else rows.push({name, n: q.qty});
        }
        stParts.innerHTML = rows.slice(0, 7).map((r) => `<div><span style="color:${C.or};font-weight:700">${r.n}×</span> ${r.name}</div>`).join('') || `<div style="color:${C.mute}">—</div>`;
      }
      // the parts list: ✓ installed, ● going in now, ○ waiting
      const ids = new Set(activeParts(s.u).map((q) => q.id));
      // the list is longer than the panel: keep the rows of this step in view
      const first = BOM.findIndex((b) => b.ids.some((id) => ids.has(id)));
      const lastDone = BOM.reduce((a, b, i) => (b.ids.every((id) => s.inst[id] > 0.99) ? i : a), 0);
      const focus = first >= 0 ? first : lastDone;
      const top = Math.max(0, Math.min(BOM.length - 32, focus - 10));
      bom.scrollTop = top * 14;
      BOM.forEach((b, i) => {
        const row = bomRows[i];
        const done = b.ids.every((id) => s.inst[id] > 0.99);
        const now = b.ids.some((id) => ids.has(id)) && !isFunc && p < 1;
        row.children[0].textContent = done ? '✓' : now ? '●' : '○';
        row.children[0].style.color = done ? C.green : now ? C.or : C.faint;
        row.style.color = now ? C.or : done ? C.ink : C.mute;
        row.style.fontWeight = now ? '700' : '500';
      });
      onBtn('mont', !isFunc);
      onBtn('func', isFunc);
      onBtn('labels', !!s.disp.labels, C.ink);
      onBtn('cut', !!s.disp.cut, C.ink);
      onBtn('ghost', !!s.disp.ghost, C.ink);
      onBtn('orbit', !!s.disp.orbit, C.ink);
      onBtn('auto', !!s.auto);
      const k = s.u / N;
      tlFill.style.width = `${(k * TL.w).toFixed(1)}px`;
      tlKnob.style.left = `${(TL.x + k * TL.w).toFixed(1)}px`;
      tlText.textContent = `${Math.round(k * 100)} % MONTADO`;
      onBtn('up', s.valve > 0);
      onBtn('hold', s.valve === 0, C.ink);
      onBtn('down', s.valve < 0);
      hpKnob.style.left = `${(540 + s.target * 230).toFixed(1)}px`;
      hpNow.style.left = `${(540 + s.h * 230).toFixed(1)}px`;
      const L = lift(s.h);
      const L0 = lift(0);
      readG.innerHTML = `<div>ALTURA DOS BRAÇOS <b style="float:right;color:${C.or}">${nf(s.h * 100)} %</b></div><div>ÂNGULO DOS BRAÇOS <b style="float:right">${nf((L.arm * 180) / Math.PI)}°</b></div><div>CURSO DO PISTÃO <b style="float:right">${nf((L0.pz - L.pz) * 1000)} mm</b></div><div>VÁLVULA DE CONTROLE <b style="float:right">${s.valve > 0 ? 'ÓLEO PARA O CILINDRO' : s.valve < 0 ? 'ÓLEO VOLTANDO AO CÁRTER' : 'FECHADA'}</b></div>`;
      s.phase = s.valve > 0 ? 'SUBINDO: A BOMBA EMPURRA O PISTÃO' : s.valve < 0 ? 'DESCENDO: O PESO DO IMPLEMENTO EMPURRA O ÓLEO DE VOLTA' : 'PARADO: O CAME FECHOU A VÁLVULA NA ALTURA PEDIDA';
      funcNote.textContent = s.phase ? s.phase : `GIROS DESENHADOS EM CÂMERA LENTA 1/${Math.round(1 / ROT)} · NÚMEROS REAIS`;
      // labels
      let lh = '';
      let ch = '';
      for (const c of s.callouts) {
        const [ax, ay] = c.at;
        const [lx, ly] = c.label;
        const right = lx > ax;
        const ex = right ? lx - 6 : lx + c.w + 6;
        lh += `<polyline points="${ax.toFixed(1)},${ay.toFixed(1)} ${ex.toFixed(1)},${(ly + 7).toFixed(1)}" fill="none" stroke="${C.or}" stroke-width=".9" opacity="${c.o.toFixed(2)}"/><circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="2.4" fill="${C.or}" opacity="${c.o.toFixed(2)}"/>`;
        ch += `<div class="call" style="left:${lx.toFixed(1)}px;top:${ly.toFixed(1)}px;opacity:${c.o.toFixed(2)}"><b><i></i>${c.name}</b></div>`;
      }
      for (const o of s.order || []) {
        if (!o.at) continue;
        const [x, y] = o.at;
        lh += `<circle cx="${x.toFixed(1)}" cy="${(y - 22).toFixed(1)}" r="9" fill="${o.done ? C.green : C.or}"/><text x="${x.toFixed(1)}" y="${(y - 18.5).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="#fff" font-family="JetBrains Mono">${o.n}</text>`;
      }
      callSvg.innerHTML = lh;
      callG.innerHTML = ch;
      const c = s.cursor;
      cur.style.display = c.x < 0 ? 'none' : 'block';
      cur.style.transform = `translate(${(c.x - 3).toFixed(2)}px, ${(c.y - 2).toFixed(2)}px) scale(${c.press ? 0.88 : 1})`;
      ring.style.left = `${c.ringX}px`;
      ring.style.top = `${c.ringY}px`;
      ring.style.opacity = String(c.ring * 0.85);
      ring.style.transform = `scale(${(0.35 + 0.9 * (1 - c.ring)).toFixed(3)})`;
    },
  };
}

// ------------------------------------------------------------ labels
const FUNC_LABELS = [['pistao', 'PISTÃO'], ['camisa', 'CILINDRO'], ['biela', 'BIELA'], ['braco', 'BRAÇO INTERNO'], ['eixoLev', 'EIXO DO LEVANTE'], ['bracoExtE', 'BRAÇO DE LEVANTE'], ['hasteE', 'HASTE DE LEVANTE'], ['barras', 'BARRAS INFERIORES'], ['carretel', 'CARRETEL DA VÁLVULA'], ['came', 'CAME DE POSIÇÃO']];
function makeLabels(st) {
  return (s, o) => {
    if (o < 0.02) return [];
    let items;
    if (s.mode === 'func') items = FUNC_LABELS;
    else {
      const seen = new Set();
      items = [];
      for (const p of activeParts(s.u)) {
        const name = p.name.replace(/ \(lado (in|ex)terno\)/, '').replace(/ \(.*\)$/, '').toUpperCase();
        if (seen.has(name)) continue;
        seen.add(name);
        items.push([p.id, name]);
      }
    }
    const pts = items.map(([id, name]) => ({name, at: st.project(st.fd.centreOf(id))})).filter((x) => x.at && x.at[0] > 390 && x.at[0] < 1220 && x.at[1] > 110 && x.at[1] < 740);
    const L = pts.filter((x) => x.at[0] < 805).sort((a, b) => a.at[1] - b.at[1]);
    const R = pts.filter((x) => x.at[0] >= 805).sort((a, b) => a.at[1] - b.at[1]);
    const out = [];
    const stack = (col, x, w) => {
      let y = 124;
      for (const c of col) {
        y = Math.max(y, Math.min(720, c.at[1] - 9));
        out.push({name: c.name, at: c.at, label: [x, y], w, o});
        y += 24;
      }
    };
    stack(L, 396, 200);
    stack(R, 1010, 200);
    return out;
  };
}

// ------------------------------------------------------------ the film pointer: a click on PRÓXIMO for each step, then the drive
function makeCursor(spots) {
  const EV = [];
  for (let s = 1; s <= N; s++) EV.push({t: T0 + (s - 1) * STEP_T, spot: spots.next});
  EV.push({t: T_FUNC, spot: spots.func});
  EV.push({t: T_FUNC + 0.2, spot: spots.cut});
  EV.push({t: FILM_LIFT[0][0], spot: spots.up});
  EV.push({t: FILM_LIFT[1][0], spot: spots.down});
  EV.push({t: FILM_LIFT[2][0], spot: spots.down});
  const WP = [[0, 820, 600]];
  EV.forEach((e, i) => {
    WP.push([e.t - 0.18, ...e.spot], [e.t + 0.2, ...e.spot]);
    const next = EV[i + 1];
    if (!next || next.t - e.t > 1.4) WP.push([e.t + 0.9, 800 + (i % 3) * 60, 520 - (i % 2) * 70]);
  });
  WP.sort((a, b) => a[0] - b[0]);
  return (t) => {
    let i = 0;
    while (i < WP.length - 2 && t > WP[i + 1][0]) i++;
    const [t0, x0, y0] = WP[i];
    const [t1, x1, y1] = WP[i + 1];
    const k = ss(t0, t1, t);
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
    return {x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k, press, ring, ringX: rx, ringY: ry};
  };
}

const blend = (a, b, k) => {
  const o = {};
  for (const key in b) o[key] = key === 'az' ? a.az + ((((b.az - a.az + 540) % 360) - 180) * k) : a[key] + (b[key] - a[key]) * k;
  return o;
};
/** the shared frame: pose the parts, draw, fill the console */
function drawFrame(st, ui, labels, s, cam) {
  const active = new Set(s.mode === 'func' ? [] : activeParts(s.u).filter(() => stepAt(s.u).p < 1).map((p) => p.id));
  st.frame({u: s.u, active, func: s.mode === 'func', h: s.h, valve: s.valve, cut: s.cut, ghost: CTX === 'bancada' && s.disp.ghost ? 0.72 : 0, isolate: s.isolate ?? 0}, {...cam, az: cam.az * D2R, el: cam.el * D2R, sx: 0, sy: -18});
  const inst = {};
  for (const p of PARTS) inst[p.id] = installed(p, s.u);
  const {s: si} = stepAt(s.u);
  const order = s.mode !== 'func' && si === 12 ? Array.from({length: 8}, (_, i) => ({n: CROSS8.indexOf(i) + 1, at: st.project(st.fd.centreOf(`paraf${i}`)), done: inst[`paraf${i}`] > 0.99})) : [];
  ui.update({...s, inst, order, callouts: labels(s, s.labels)});
}

// ------------------------------------------------------------ film
export function runFilm(ctx = 'trator') {
  CTX = ctx;
  runSim({duration: DURATION, fps: 60, theme: 'light', hud: {enabled: false, title: 'levante hidráulico', subtitle: ''}, director: {enabled: false}}, async ({canvas, capture}) => {
    const st = createStage({canvas, tractor: CTX === 'trator'});
    const ui = null;
    void ui;
    const resize = () => st.resize(W, H, capture ? devicePixelRatio || 1 : Math.min(devicePixelRatio || 1, 2));
    resize();
    const con = createConsole(document.getElementById('app'));
    const labels = makeLabels(st);
    const cursorAt = makeCursor(con.spots());
    return {
      resize,
      render(t) {
        const f = filmState(t);
        const [v, v0] = filmView(t);
        let cam = viewFn(v)(t - v0);
        const [pv, pv0] = filmView(Math.max(0, v0 - 0.01));
        if (v0 > 0) cam = blend(viewFn(pv)(t - pv0), cam, ss(v0, v0 + 1.3, t));
        // on the tractor the film isolates the trumpet while it is open and running, and shows the whole tractor around it
        const iso = CTX === 'trator' ? ss(T_FUNC + 0.2, T_FUNC + 1.2, t) * (1 - ss(DURATION - 3.5, DURATION - 2.5, t)) : 0;
        drawFrame(st, con, labels, {...f, isolate: iso, auto: false, disp: {labels: 1, cut: f.cut > 0.5, ghost: 0, orbit: 0}, cursor: cursorAt(t)}, cam);
        return {};
      },
    };
  });
}

// ------------------------------------------------------------ live
export function runLive(ctx = 'trator') {
  CTX = ctx;
  const style = document.createElement('style');
  style.textContent = `html,body{background:#ecebe8;overflow:hidden}#app{position:absolute!important;inset:auto!important;left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0}#gl{touch-action:none;cursor:grab}
  .tourchip{position:absolute;left:800px;top:104px;transform:translateX(-50%);display:flex;align-items:center;gap:7px;height:22px;padding:0 11px;border:1px solid #e3e4e7;border-radius:4px;background:rgba(250,250,251,.95);font:700 9px 'JetBrains Mono',monospace;letter-spacing:1.3px;white-space:nowrap;cursor:pointer;pointer-events:auto}
  .tourchip i{display:block;width:6px;height:6px;border-radius:50%;background:#f2661c}`;
  document.head.appendChild(style);
  const app = document.getElementById('app');
  const canvas = document.createElement('canvas');
  canvas.id = 'gl';
  app.appendChild(canvas);
  const st = createStage({canvas, tractor: CTX === 'trator'});
  const ui = createConsole(app);
  if (CTX === 'trator') ui.btn.ghost.textContent = 'DESTACAR';
  const labels = makeLabels(st);
  let spots = null;
  let tourCursor = null;
  const TIERS = [{samples: 8, ao: true, shadow: 4096, pr: 2}, {samples: 4, ao: false, shadow: 2048, pr: 1.5}, {samples: 2, ao: false, shadow: 1024, pr: 1}];
  let tier = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 700 ? 2 : 0;
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
  const toStage = (cx) => (cx - app.getBoundingClientRect().left) / scale;
  const chip = document.createElement('div');
  chip.className = 'tourchip';
  ui.root.appendChild(chip);

  // state
  let T = 0;
  const S = {u: 0, uT: 0, auto: false, mode: 'mont', h: 0, target: 0, valve: 0, cut: 0, disp: {labels: 1, cut: 0, ghost: 0, orbit: 0}};
  const off = {az: 0, el: 0, k: 1};
  const cam = {...viewFn('geral')(0)};
  let view = 'geral';
  let viewT = 0;
  let orbitT = 0;
  let ring = {t: -9, x: 0, y: 0};
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
    const f = filmState((T - AP.t0) % DURATION);
    Object.assign(S, {u: f.u, uT: Math.round(f.u), mode: f.mode, h: f.h, target: f.target, valve: f.valve, cut: f.cut, auto: false});
    S.disp.cut = f.cut > 0.5 ? 1 : 0;
    const tt = (T - AP.t0) % DURATION;
    S.iso = CTX === 'trator' ? ss(T_FUNC + 0.2, T_FUNC + 1.2, tt) * (1 - ss(DURATION - 3.5, DURATION - 2.5, tt)) : 0;
    S.disp.ghost = S.iso > 0.5 ? 1 : 0;
  };
  chip.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    lastInput = T;
    if (AP.on) takeOver();
    else startTour();
  });
  addEventListener('pointerdown', (e) => e.target !== chip && takeOver());
  const pulse = (k) => spots && (ring = {t: T, x: spots[k][0], y: spots[k][1]});
  const on = (k, fn) =>
    ui.btn[k].addEventListener('click', () => {
      takeOver();
      pulse(k);
      fn();
    });
  on('next', () => {
    S.auto = false;
    S.uT = Math.min(N, Math.floor(S.uT + 1e-6) + 1);
  });
  on('prev', () => {
    S.auto = false;
    S.uT = Math.max(0, Math.ceil(S.uT - 1e-6) - 1);
  });
  on('auto', () => {
    S.auto = !S.auto;
    if (S.auto && S.uT >= N) S.uT = S.u = 0;
  });
  on('apart', () => {
    S.auto = false;
    S.uT = 0;
  });
  on('all', () => {
    S.auto = false;
    S.uT = N;
  });
  on('mont', () => {
    S.mode = 'mont';
    S.wantFunc = false;
  });
  // running needs the drive together: it finishes the assembly quickly, then switches
  on('func', () => {
    S.wantFunc = true;
    S.auto = false;
    S.uT = N;
    S.disp.cut = 1;
  });
  for (const k of ['labels', 'cut', 'ghost', 'orbit'])
    on(k, () => {
      S.disp[k] = S.disp[k] ? 0 : 1;
      if (k === 'orbit') orbitT = T;
    });
  on('up', () => (S.target = 1));
  on('hold', () => (S.target = S.h));
  on('down', () => (S.target = 0));
  {
    // the position lever: drag to ask for a height
    const d = document.createElement('div');
    d.className = 'hit';
    Object.assign(d.style, {left: `${ui.HP.x - 8}px`, top: `${ui.HP.y - 12}px`, width: `${ui.HP.w + 16}px`, height: '24px'});
    const move = (e) => {
      S.target = clamp((toStage(e.clientX) - ui.HP.x) / ui.HP.w, 0, 1);
      lastInput = T;
    };
    S.hpHit = d;
    d.addEventListener('pointerdown', (e) => {
      takeOver();
      if (S.mode !== 'func') return;
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
  {
    // the step bar scrubs the assembly
    const d = document.createElement('div');
    d.className = 'hit';
    Object.assign(d.style, {left: `${ui.TL.x - 8}px`, top: `${ui.TL.y - 12}px`, width: `${ui.TL.w + 16}px`, height: '26px'});
    const move = (e) => {
      S.auto = false;
      S.uT = S.u = Math.round(clamp((toStage(e.clientX) - ui.TL.x) / ui.TL.w, 0, 1) * N * 4) / 4;
      lastInput = T;
    };
    d.addEventListener('pointerdown', (e) => {
      takeOver();
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
    const k = e.key;
    if (k === 'ArrowRight') ui.btn.next.click();
    else if (k === 'ArrowLeft') ui.btn.prev.click();
    else if (k === 'ArrowUp') ui.btn.up.click();
    else if (k === 'ArrowDown') ui.btn.down.click();
    else return;
    e.preventDefault();
  });
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    drag = {x: e.clientX, y: e.clientY};
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    off.az += ((e.clientX - drag.x) / scale) * 0.3;
    off.el = clamp(off.el + ((e.clientY - drag.y) / scale) * 0.2, -30, 70);
    drag = {x: e.clientX, y: e.clientY};
    lastInput = T;
  });
  canvas.addEventListener('pointerup', () => (drag = null));
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      takeOver();
      off.k = clamp(off.k * Math.exp(e.deltaY * 0.0012), 0.3, 2.5);
    },
    {passive: false},
  );

  startTour();
  let last = performance.now();
  const perf = {n: 0, sum: 0, slow: 0, age: 0};
  const frame = (now) => {
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    T += dt;
    if (!spots) {
      spots = ui.spots();
      tourCursor = makeCursor(spots);
    }
    if (tier < TIERS.length - 1) {
      perf.age += dt;
      if (perf.age > 0.6) {
        perf.sum += dt;
        if (++perf.n >= 6 && perf.sum >= 0.5) {
          perf.slow = perf.sum / perf.n > 0.022 ? perf.slow + 1 : 0;
          perf.sum = perf.n = 0;
          if (perf.slow >= 2) {
            tier++;
            applyTier();
            Object.assign(perf, {age: 0, slow: 0});
          }
        }
      }
    }
    let s;
    let tgt;
    if (AP.on) {
      const t = (T - AP.t0) % DURATION;
      const f = filmState(t);
      const [v, v0] = filmView(t);
      tgt = viewFn(v)(t - v0);
      const iso = CTX === 'trator' ? ss(T_FUNC + 0.2, T_FUNC + 1.2, t) * (1 - ss(DURATION - 3.5, DURATION - 2.5, t)) : 0;
      s = {...f, isolate: iso, auto: false, disp: {labels: 1, cut: f.cut > 0.5, ghost: iso > 0.5 ? 1 : 0, orbit: 0}, cursor: tourCursor(t)};
    } else {
      if (T - lastInput > 25 && !S.auto) startTour();
      if (S.auto && Math.abs(S.u - S.uT) < 1e-3) {
        if (S.uT < N) S.uT += 1;
        else S.auto = false;
      }
      // the assembly moves toward the target one step per 1.6 s (and holds a moment on each step when playing)
      const rate = dt / 1.6;
      S.u += clamp(S.uT - S.u, -rate * (Math.abs(S.uT - S.u) > 2 ? 4 : 1), rate * (Math.abs(S.uT - S.u) > 2 ? 4 : 1));
      if (S.wantFunc && S.u >= N - 1e-3) S.mode = 'func';
      if (S.mode === 'func' && S.uT < N) {
        S.mode = 'mont';
        S.wantFunc = false;
      }
      S.hpHit.style.pointerEvents = S.mode === 'func' ? 'auto' : 'none';
      if (S.mode === 'func') {
        const r = stepLift(S.h, S.target, dt);
        S.h = r.h;
        S.valve = r.v;
      } else S.valve = 0;
      S.cut += ((S.disp.cut ? 1 : 0) - S.cut) * Math.min(1, dt / 0.35);
      const key = S.mode === 'func' ? 'func' : STEPS[stepAt(S.u).s].view;
      if (key !== view) {
        view = key;
        viewT = T;
      }
      tgt = viewFn(view)(T - viewT);
      tgt.az += off.az + (S.disp.orbit ? 14 * (T - orbitT) : 0);
      tgt.el = clamp(tgt.el + off.el, -25, 85);
      tgt.d *= off.k;
      const rk = Math.max(0, 1 - (T - ring.t) / 0.55);
      S.iso = (S.iso ?? 0) + ((CTX === 'trator' && S.disp.ghost ? 1 : 0) - (S.iso ?? 0)) * Math.min(1, dt / 0.4);
      s = {...S, isolate: S.iso, labels: S.disp.labels, cursor: {x: -99, y: -99, press: false, ring: rk, ringX: ring.x, ringY: ring.y}};
    }
    const k = 1 - Math.exp(-dt / (AP.on ? 0.25 : 0.4));
    cam.az += ((((tgt.az - cam.az + 540) % 360) + 360) % 360 - 180) * k;
    for (const key of ['tx', 'ty', 'tz', 'el', 'd']) cam[key] += (tgt[key] - cam[key]) * k;
    drawFrame(st, ui, labels, s, cam);
    const want = AP.on ? '<i></i>TOUR AUTOMÁTICO · CLIQUE PARA ASSUMIR' : '▶ VOLTAR AO TOUR';
    if (chip.innerHTML !== want) chip.innerHTML = want;
    if (!window.SIM_SHOWN) {
      window.SIM_SHOWN = true;
      dispatchEvent(new Event('simframe'));
    }
    requestAnimationFrame(frame);
  };
  warmComposer(st.renderer, st.composer, st.scene, st.camera).then(() => requestAnimationFrame(frame));
  window.LIVE = {st, S};
}
