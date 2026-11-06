// The tractor console at 1600 x 900, in Portuguese: the title block, the drive state with the power-flow chain and
// the three lever gates, the speeds of every shaft with a speed trace, the overview, the commands (reverser, gear,
// range, PTO, 4WD), the views, the display toggles, the 12-speed table at 2400 rpm, the throttle and the brake, and
// the labels with leaders into the machine. update(s) redraws every live part from the frame's state.
import {kmhAt, RATED} from './kin.js';

export const C = {ink: '#23262c', mute: '#8c8f96', faint: '#d6d8dc', line: '#e3e4e7', panel: 'rgba(250,250,251,.95)', or: '#f2661c', blue: '#1c46bd', green: '#2a9d61'};
export const VIEWS = ['geral', 'lado', 'frente', 'motor', 'reversor', 'cambio', 'gamas', 'tampa', 'eixo', 'tdp', 'pdm'];
export const VIEW_LABEL = {geral: 'GERAL', lado: 'LATERAL', frente: 'FRENTE', motor: 'MOTOR', reversor: 'REVERSOR', cambio: '4 MARCHAS', gamas: 'GAMAS', tampa: 'TAMPA', eixo: 'TROMBETA', tdp: 'TDP', pdm: 'PDM'};
export const DISPLAY = ['labels', 'body', 'cut', 'housing', 'power', 'orbit'];
export const DISPLAY_LABEL = {labels: 'RÓTULOS', body: 'SÓ MECÂNICA', cut: 'CORTE', housing: 'CARCAÇA VIDRO', power: 'FLUXO DE FORÇA', orbit: 'ÓRBITA'};
export const CMD = {
  sh: [['F', 'F'], ['N', 'N'], ['R', 'R']],
  g: [[1, '1'], [2, '2'], [3, '3'], [4, '4']],
  r: [['L', 'L'], ['M', 'M'], ['H', 'H']],
};
const CSS = `
#app{font-family:Inter,system-ui,sans-serif;color:${C.ink};-webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums}
.ui{position:absolute;inset:0;pointer-events:none}
.mo{font-family:'JetBrains Mono',ui-monospace,monospace}
.cp{position:absolute;background:${C.panel};border:1px solid ${C.line};border-radius:6px;box-shadow:0 2px 10px rgba(30,40,60,.07)}
.ph{position:absolute;display:flex;align-items:center;gap:9px;font:700 10.5px 'JetBrains Mono',monospace;letter-spacing:1.8px}
.ph i{display:block;width:3px;height:13px;background:${C.or}}
.pn{position:absolute;font:500 9.5px 'JetBrains Mono',monospace;color:${C.mute};letter-spacing:1px}
.sm{font:500 9px 'JetBrains Mono',monospace;letter-spacing:1.5px;color:${C.mute};text-transform:uppercase;white-space:nowrap}
.bt{position:absolute;height:22px;padding:0 9px;display:flex;align-items:center;justify-content:center;border:1px solid ${C.faint};border-radius:4px;background:#fff;font:700 9.4px 'JetBrains Mono',monospace;letter-spacing:1.2px;color:${C.ink};white-space:nowrap;box-sizing:border-box}
.call{position:absolute;white-space:nowrap}
.call b{display:flex;align-items:center;gap:6px;font:700 9.4px 'JetBrains Mono',monospace;letter-spacing:1.2px;color:${C.ink};background:rgba(250,250,251,.82);padding:1px 3px;border-radius:2px}
.call b i{display:block;width:6px;height:6px;background:${C.or}}
.call span{display:block;font:500 7.8px 'JetBrains Mono',monospace;letter-spacing:1.1px;color:#5d6068;margin-top:2px;padding-left:3px}
.cur{position:absolute;left:0;top:0;z-index:50;filter:drop-shadow(0 1px 2px rgba(0,0,0,.3))}
.ring{position:absolute;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:1.5px solid ${C.or};opacity:0;z-index:49}
.toast{position:absolute;left:800px;top:186px;transform:translateX(-50%);padding:6px 12px;border-radius:4px;background:${C.ink};color:#fff;font:700 9.6px 'JetBrains Mono',monospace;letter-spacing:1.3px;white-space:nowrap;opacity:0}
`;
const el = (h) => {
  const d = document.createElement('div');
  d.innerHTML = h.trim();
  return d.firstElementChild;
};
const nf = (n, d = 0) => Number(n).toLocaleString('pt-BR', {minimumFractionDigits: d, maximumFractionDigits: d});

export function createConsole(app) {
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
    add(`<div class="pn" style="right:${1600 - x - w + 14}px;top:${y + 15}px">${n}</div>`);
  };
  const btn = {};

  // ------------------------------------------------------------ header
  add(`<div style="position:absolute;left:0;top:0;width:160px;height:89px;background:${C.blue}"></div>`);
  add(`<div style="position:absolute;left:28px;top:22px;color:#fff;font-size:40px;font-weight:800;letter-spacing:-1px;line-height:1">TL</div>`);
  add(`<div class="mo" style="position:absolute;left:86px;top:28px;color:#fff;font-size:11px;font-weight:600;letter-spacing:2px;line-height:15px">12×12<br>4×4</div>`);
  add(`<div class="sm" style="position:absolute;left:182px;top:22px;letter-spacing:2.4px">TRATOR AGRÍCOLA · NEW HOLLAND TL80</div>`);
  add(`<div style="position:absolute;left:181px;top:37px;font-size:33px;font-weight:700;letter-spacing:-.6px;line-height:1">Transmissão 12×12 · reversor mecânico <span style="color:${C.or};font-weight:400">/</span></div>`);
  add(`<div class="mo" style="position:absolute;left:182px;top:77px;font-size:11.2px;letter-spacing:2.2px;color:#5d6068">MOTOR IVECO 8045 3,9 L 82 CV · REVERSOR MECÂNICO (12×12) · 4 MARCHAS × 3 GAMAS · TDP 540 · 4×4</div>`);
  add(`<div class="sm" style="position:absolute;left:1150px;top:40px;letter-spacing:2.2px;line-height:15px;text-align:right;right:28px">ESTUDO INTERATIVO · NÃO OFICIAL<br>DADOS PÚBLICOS DO TL80<br>DENTES DAS ENGRENAGENS: MODELO PRÓPRIO</div>`);

  // ------------------------------------------------------------ 01 state
  panel(28, 126, 282, 262, 'ESTADO DA TRANSMISSÃO', '01');
  const chip = add(`<div style="position:absolute;left:42px;top:166px;width:13px;height:30px;border-radius:2px"></div>`);
  const stTitle = add(`<div style="position:absolute;left:66px;top:161px;font-size:24px;font-weight:700;letter-spacing:-.4px"></div>`);
  const stSub = add(`<div class="sm" style="position:absolute;left:67px;top:190px;color:${C.or}"></div>`);
  add(`<div style="position:absolute;left:42px;top:210px;width:254px;height:1px;background:${C.line}"></div>`);
  const chain = add(`<svg style="position:absolute;left:42px;top:218px" width="254" height="56"></svg>`);
  const gates = add(`<svg style="position:absolute;left:42px;top:282px" width="254" height="98"></svg>`);

  // ------------------------------------------------------------ 02 speeds
  panel(28, 402, 282, 330, 'ROTAÇÕES', '02');
  const ROWS = [['MOTOR', 'rpm', 2600], ['PRIMÁRIO', 'rpm', 2600], ['SAÍDA CÂMBIO', 'rpm', 2600], ['PINHÃO', 'rpm', 3000], ['RODA TRAS.', 'rpm', 120], ['TDP', 'rpm', 600]];
  // (MOTOR: Iveco/NH 8045, 80 cv a 2.500 rpm)
  const bars = ROWS.map(([n], i) => {
    const y = 438 + i * 24;
    add(`<div class="sm" style="position:absolute;left:42px;top:${y}px">${n}</div>`);
    add(`<div style="position:absolute;left:130px;top:${y + 4}px;width:96px;height:4px;background:#eceef1;border-radius:2px"></div>`);
    const f = add(`<div style="position:absolute;left:130px;top:${y + 4}px;height:4px;background:${C.or};border-radius:2px"></div>`);
    const v = add(`<div class="mo" style="position:absolute;right:${1600 - 296}px;top:${y - 2}px;font-size:10.5px;font-weight:600"></div>`);
    return {f, v};
  });
  add(`<div style="position:absolute;left:42px;top:584px;width:254px;height:1px;background:${C.line}"></div>`);
  add(`<div class="sm" style="position:absolute;left:42px;top:594px">VELOCIDADE</div>`);
  const kmh = add(`<div style="position:absolute;right:${1600 - 296}px;top:588px;font-size:22px;font-weight:700"></div>`);
  const trace = add(`<svg style="position:absolute;left:42px;top:620px" width="254" height="72"></svg>`);
  add(`<div class="sm" style="position:absolute;left:42px;top:700px;font-size:8px">EMBREAGEM</div>`);
  const clutchBar = add(`<div style="position:absolute;left:120px;top:704px;height:4px;background:${C.blue};border-radius:2px"></div>`);
  const slowNote = add(`<div class="sm" style="position:absolute;left:42px;top:715px;font-size:7.6px;color:${C.mute}"></div>`);

  // ------------------------------------------------------------ 03 overview
  panel(1313, 126, 258, 196, 'VISÃO GERAL', '03');
  add(`<div class="mo" style="position:absolute;left:1327px;top:160px;width:232px;font-size:9.2px;line-height:1.7;color:#4f535b">O motor gira o primário pela embreagem. O reversor escolhe o sentido, o câmbio a marcha e a gama a faixa: 4 × 3 = 12 para frente e 12 para trás, cada troca por um sincronizador. Embreagem de disco duplo: o 2º disco toca a TDP. A PDM puxa a frente 2 % adiantada.</div>`);
  add(`<div style="position:absolute;left:1327px;top:262px;width:232px;height:1px;background:${C.line}"></div>`);
  [['12×12', 'MARCHAS'], ['5', 'SINCRON.'], ['28,9', 'KM/H MÁX']].forEach(([v, n], i) => {
    const x = 1327 + i * 82;
    if (i) add(`<div style="position:absolute;left:${x - 8}px;top:272px;width:1px;height:38px;background:${C.line}"></div>`);
    add(`<div style="position:absolute;left:${x}px;top:273px;font-size:19px;font-weight:700">${v}</div>`);
    add(`<div class="sm" style="position:absolute;left:${x}px;top:298px">${n}</div>`);
  });

  // ------------------------------------------------------------ 04 commands
  panel(1313, 334, 258, 160, 'COMANDOS', '04');
  const row = (lever, title, y) => {
    add(`<div class="sm" style="position:absolute;left:1327px;top:${y + 6}px">${title}</div>`);
    CMD[lever].forEach(([v, l], i) => {
      btn[`${lever}${v}`] = add(`<div class="bt" style="left:${1408 + i * 38}px;top:${y}px;width:33px">${l}</div>`);
    });
  };
  row('sh', 'REVERSOR', 370);
  row('g', 'MARCHA', 400);
  row('r', 'GAMA', 430);
  btn.pto = add(`<div class="bt" style="left:1327px;top:461px;width:110px">TDP 540</div>`);
  btn.fwd4 = add(`<div class="bt" style="left:1443px;top:461px;width:114px">TRAÇÃO 4×4</div>`);
  const btnRow = (keys, labels, x0, y, wmax = 230) => {
    let x = x0;
    let yy = y;
    for (const k of keys) {
      const w = Math.round(labels[k].length * 7 + 20);
      if (x + w > x0 + wmax) {
        x = x0;
        yy += 29;
      }
      btn[k] = add(`<div class="bt" style="left:${x}px;top:${yy}px;width:${w}px">${labels[k]}</div>`);
      x += w + 6;
    }
  };
  panel(1313, 506, 258, 156, 'VISTAS', '05');
  btnRow(VIEWS, VIEW_LABEL, 1327, 542);
  panel(1313, 674, 258, 120, 'EXIBIÇÃO', '06');
  btnRow(DISPLAY, DISPLAY_LABEL, 1327, 709);

  // ------------------------------------------------------------ 07 speed table, throttle, brake
  panel(430, 752, 740, 116, 'VELOCIDADES A 2.500 RPM (KM/H, FRENTE)', '07');
  const cells = {};
  add(`<div class="sm" style="position:absolute;left:448px;top:790px">GAMA</div>`);
  [1, 2, 3, 4].forEach((g, j) => add(`<div class="sm" style="position:absolute;left:${500 + j * 74}px;top:790px">${g}ª</div>`));
  ['L', 'M', 'H'].forEach((r, i) => {
    add(`<div class="mo" style="position:absolute;left:452px;top:${806 + i * 19}px;font-size:10px;font-weight:700">${r}</div>`);
    [1, 2, 3, 4].forEach((g, j) => {
      cells[r + g] = add(`<div class="mo" style="position:absolute;left:${494 + j * 74}px;top:${803 + i * 19}px;width:64px;height:16px;line-height:16px;text-align:center;font-size:10px;border-radius:3px">${nf(kmhAt(RATED, 'F', g, r), 1)}</div>`);
    });
  });
  add(`<div style="position:absolute;left:800px;top:786px;width:1px;height:70px;background:${C.line}"></div>`);
  add(`<div class="sm" style="position:absolute;left:820px;top:792px">ACELERADOR</div>`);
  const TH = {x: 822, w: 230};
  add(`<div style="position:absolute;left:${TH.x}px;top:815px;width:${TH.w}px;height:3px;background:#eceef1;border-radius:2px"></div>`);
  const thFill = add(`<div style="position:absolute;left:${TH.x}px;top:815px;height:3px;background:${C.or};border-radius:2px"></div>`);
  const thKnob = add(`<div style="position:absolute;top:809px;width:15px;height:15px;margin-left:-7.5px;border-radius:50%;background:#fff;border:2px solid ${C.or};box-sizing:border-box"></div>`);
  const thVal = add(`<div class="mo" style="position:absolute;left:820px;top:832px;font-size:9.6px;color:${C.mute};letter-spacing:1px"></div>`);
  btn.brake = add(`<div class="bt" style="left:1074px;top:800px;width:80px;height:44px;border-radius:6px">FREIO</div>`);

  // ------------------------------------------------------------ footer
  add(`<div class="sm" style="position:absolute;left:27px;top:882px;letter-spacing:2.1px">ESTUDO DE MECANISMO · MODELO PROCEDURAL · UMA ENTRADA: MOTOR + ALAVANCAS</div>`);
  add(`<div class="sm" style="position:absolute;right:28px;top:882px;letter-spacing:2.1px">PNEUS 380/70R24 / 480/70R34 · ENTRE-EIXOS 2.310 MM <span style="color:${C.or}">//////</span></div>`);

  const callSvg = add(`<svg data-callouts style="position:absolute;inset:0;overflow:visible" width="1600" height="900"></svg>`);
  const callG = add(`<div data-callouts style="position:absolute;inset:0"></div>`);
  const toast = add(`<div class="toast"></div>`);
  const ring = add(`<div class="ring"></div>`);
  const cur = add(`<div class="cur"><svg width="22" height="22" viewBox="0 0 34 34"><path d="M4 3 L30 13.5 L17.5 17.5 L13.5 30 Z" fill="#111" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg></div>`);
  const centre = (n) => {
    const r = n.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  };
  const spots = Object.fromEntries(Object.entries(btn).map(([k, n]) => [k, centre(n)]));
  const pointer = (c) => {
    cur.style.display = c.x < 0 ? 'none' : 'block';
    cur.style.transform = `translate(${(c.x - 3).toFixed(2)}px, ${(c.y - 2).toFixed(2)}px) scale(${c.press ? 0.88 : 1})`;
    ring.style.left = `${c.ringX}px`;
    ring.style.top = `${c.ringY}px`;
    ring.style.opacity = String(c.ring * 0.85);
    ring.style.transform = `scale(${(0.35 + 0.9 * (1 - c.ring)).toFixed(3)})`;
  };
  const onBtn = (k, on, col = C.or) => {
    const b = btn[k];
    if (!b) return;
    b.style.background = on ? col : '#fff';
    b.style.color = on ? '#fff' : C.ink;
    b.style.borderColor = on ? col : C.faint;
  };

  return {
    spots,
    btn,
    root: ui,
    TH,
    throttleAt: (k) => [TH.x + k * TH.w, 816],
    update(s) {
      // ---- state: the selection, the phase, the chain, the gates
      const P = s.pose;
      const moving = !!s.shift;
      chip.style.background = moving ? C.or : P.chain ? C.green : C.mute;
      stTitle.textContent = s.title;
      stSub.textContent = s.sub;
      {
        const L = [['MOTOR', true], ['EMBR.', P.clutch > 0.5], ['REVERS.', !!P.sh], ['CÂMBIO', !!P.g], ['GAMAS', !!P.r], ['COROA', P.chain && P.clutch > 0.5], ['RODAS', P.chain && P.clutch > 0.5]];
        let h = '';
        let live = true;
        L.forEach(([n, on], i) => {
          live = live && on;
          const x = i * 36.5;
          const col = live ? C.or : '#c4c7cc';
          h += `<rect x="${x}" y="6" width="31" height="22" rx="3" fill="${live ? 'rgba(242,102,28,.12)' : '#f3f4f6'}" stroke="${col}" stroke-width="1.1"/>`;
          h += `<text x="${x + 15.5}" y="44" text-anchor="middle" font-size="6.6" letter-spacing=".4" fill="${live ? C.ink : C.mute}" font-family="JetBrains Mono">${n}</text>`;
          h += `<circle cx="${x + 15.5}" cy="17" r="3.4" fill="${col}"/>`;
          if (i < L.length - 1) h += `<path d="M${x + 31} 17h5.5" stroke="${live && L[i + 1][1] ? C.or : '#c4c7cc'}" stroke-width="1.2"/>`;
        });
        chain.innerHTML = h;
      }
      {
        // three gates: the reverser (F N R), the gear H (1 3 / 2 4), the range (L M H); a dot where each lever is
        const sl = P.sl;
        let h = '';
        const tx = (x, y, t, a = 'middle') => `<text x="${x}" y="${y}" text-anchor="${a}" font-size="7.6" fill="${C.mute}" font-family="JetBrains Mono" letter-spacing=".6">${t}</text>`;
        const knob = (x, y, col) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="${col}" stroke="#fff" stroke-width="1.5"/>`;
        // reverser: a vertical slot
        h += tx(22, 9, 'REVERSOR') + `<path d="M22 18V82" stroke="${C.faint}" stroke-width="7" stroke-linecap="round"/>` + tx(36, 22, 'F', 'start') + tx(36, 53, 'N', 'start') + tx(36, 84, 'R', 'start');
        h += knob(22, 50 - sl[0] * 31, C.blue);
        // gears: an H
        const gx0 = 104;
        h += tx(gx0 + 24, 9, 'MARCHA') + `<path d="M${gx0} 18V82M${gx0 + 48} 18V82M${gx0} 50H${gx0 + 48}" stroke="${C.faint}" stroke-width="7" stroke-linecap="round" fill="none"/>`;
        h += tx(gx0 - 11, 22, '1') + tx(gx0 - 11, 84, '2') + tx(gx0 + 60, 22, '3') + tx(gx0 + 60, 84, '4');
        const gx = Math.abs(sl[2]) > 0.02 ? 0 : Math.abs(sl[1]) > 0.02 ? 1 : s.gPlane ?? 0.5;
        const gy = Math.abs(sl[2]) > 0.02 ? sl[2] : sl[1];
        h += knob(gx0 + gx * 48, 50 + gy * 31, C.ink);
        // range
        const rx = 222;
        h += tx(rx, 9, 'GAMA') + `<path d="M${rx} 18V82" stroke="${C.faint}" stroke-width="7" stroke-linecap="round"/>` + tx(rx + 14, 22, 'H', 'start') + tx(rx + 14, 53, 'M', 'start') + tx(rx + 14, 84, 'L', 'start');
        // H at the top, M in the centre (where neutral also sits), L at the bottom
        h += knob(rx, 50 - sl[3] * 31 - Math.min(0, sl[4]) * 31, '#e8a12c');
        gates.innerHTML = h;
      }
      // ---- speeds
      const vals = [s.eng, Math.abs(s.w[0]), Math.abs(s.w[2]), Math.abs(s.w[3]), Math.abs(s.wheel), s.ptoRpm];
      bars.forEach((b, i) => {
        b.f.style.width = `${(Math.min(1, vals[i] / ROWS[i][2]) * 96).toFixed(1)}px`;
        b.v.textContent = `${nf(vals[i])} ${ROWS[i][1]}`;
      });
      kmh.innerHTML = `${s.v < -0.05 ? '<span style="color:' + C.or + ';font-size:12px">RÉ </span>' : ''}${nf(Math.abs(s.v) * 3.6, 1)}<span style="font-size:11px;color:${C.mute};font-weight:500"> km/h</span>`;
      {
        const W = 254;
        const H = 64;
        let p = '';
        let q = '';
        s.trace.forEach(([kh, rpm], i) => {
          const x = (i / Math.max(1, s.trace.length - 1)) * W;
          p += `${i ? 'L' : 'M'}${x.toFixed(1)} ${(H - (Math.abs(kh) / 32) * H).toFixed(1)}`;
          q += `${i ? 'L' : 'M'}${x.toFixed(1)} ${(H - (rpm / 2600) * H).toFixed(1)}`;
        });
        trace.innerHTML = `<line x1="0" x2="${W}" y1="${H}" y2="${H}" stroke="${C.faint}"/><path d="${q}" fill="none" stroke="${C.blue}" stroke-width="1" opacity=".55"/><path d="${p}" fill="none" stroke="${C.or}" stroke-width="1.6"/><text x="${W}" y="9" text-anchor="end" font-size="7" fill="${C.mute}" font-family="JetBrains Mono">KM/H · <tspan fill="${C.blue}">RPM</tspan> · ÚLTIMOS 10 S</text>`;
      }
      clutchBar.style.width = `${(P.clutch * 176).toFixed(1)}px`;
      slowNote.textContent = `GIROS DESENHADOS EM CÂMERA LENTA ${s.slow}`;
      // ---- commands
      for (const lever of ['sh', 'g', 'r']) for (const [v] of CMD[lever]) onBtn(`${lever}${v}`, s.sel[lever] === v, lever === 'sh' ? C.blue : C.or);
      onBtn('pto', !!s.pto, C.ink);
      onBtn('fwd4', !!s.fwd4, C.ink);
      onBtn('brake', s.brake > 0, '#c0392b');
      for (const k of VIEWS) onBtn(k, s.view === k);
      for (const k of DISPLAY) onBtn(k, !!s.display[k]);
      for (const r of ['L', 'M', 'H'])
        for (const g of [1, 2, 3, 4]) {
          const on = P.r === r && P.g === g;
          cells[r + g].style.background = on ? C.or : r === s.sel.r ? '#f3f4f6' : 'transparent';
          cells[r + g].style.color = on ? '#fff' : C.ink;
          cells[r + g].style.fontWeight = on ? '700' : '500';
        }
      const tk = s.throttle;
      thFill.style.width = `${(tk * TH.w).toFixed(1)}px`;
      thKnob.style.left = `${(TH.x + tk * TH.w).toFixed(1)}px`;
      thVal.textContent = `${nf(s.engWant)} RPM ALVO`;
      toast.textContent = s.toast || '';
      toast.style.opacity = s.toast ? '1' : '0';
      // ---- labels
      let lh = '';
      let ch = '';
      for (const c of s.callouts) {
        if (c.o < 0.02 || !c.at) continue;
        const [ax, ay] = c.at;
        const [lx, ly] = c.label;
        const right = lx > ax;
        const ex = right ? lx - 6 : lx + c.w + 6;
        lh += `<polyline points="${ax.toFixed(1)},${ay.toFixed(1)} ${ex.toFixed(1)},${(ly + 6).toFixed(1)}" fill="none" stroke="${C.or}" stroke-width=".9" opacity="${c.o.toFixed(2)}"/><circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="2.4" fill="${C.or}" opacity="${c.o.toFixed(2)}"/>`;
        ch += `<div class="call" style="left:${lx.toFixed(1)}px;top:${(ly - 1).toFixed(1)}px;opacity:${c.o.toFixed(2)}"><b><i></i>${c.name}</b><span>${c.sub}</span></div>`;
      }
      callSvg.innerHTML = lh;
      callG.innerHTML = ch;
      pointer(s.cursor);
    },
    pointer,
  };
}
