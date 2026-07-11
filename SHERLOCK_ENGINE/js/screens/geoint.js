/**
 * screens/geoint.js — Análise geoespacial multi-caso: gráfico de registro
 * (tacógrafo/painel) e satélite com marcadores, configurados pelo CONTENT_PACK
 * (geoint.tach / geoint.sat). Enigmas de clique embutidos.
 */
import { screenShell, el, toast } from '../uiManager.js';
import { getCase, getPack, hasReq, enigmaUnlocked, solveEnigma, failEnigma, addScore, gateHint } from '../caseState.js';
import { sfx, ambience } from '../audioManager.js';

export function render() {
  const { body } = screenShell('GEOINT', 'CENTRAL › GEOINT — ANÁLISE GEOESPACIAL');
  ambience('central');
  const s = getCase();
  const cfg = getPack().geoint || {};
  const wrap = el('div', 'two-col');

  // ── gráfico de registro (EN de clique em segmento) ──
  if (cfg.tach) {
    const tach = el('section', 'panel geo-panel');
    tach.append(el('h2', 'panel-title', cfg.tach.title));
    const done = s.enigmasSolved.includes(cfg.tach.enigma);
    if (!(cfg.tach.needs || []).every(hasReq)) {
      tach.append(el('p', 'muted', cfg.tach.lockMsg));
    } else {
      tach.append(el('div', 'muted', done ? cfg.tach.doneMsg : cfg.tach.hint));
      tach.insertAdjacentHTML('beforeend', chartSvg(cfg.tach));
      tach.querySelectorAll('[data-seg]').forEach((seg) => {
        seg.style.cursor = 'pointer';
        seg.addEventListener('click', () => {
          if (s.enigmasSolved.includes(cfg.tach.enigma)) return;
          if (!enigmaUnlocked(cfg.tach.enigma)) return toast('🔒 ' + gateHint(cfg.tach.enigma), 'warn');
          const segment = cfg.tach.segments.find((x) => x.id === seg.dataset.seg);
          if (segment?.correct) { solveEnigma(cfg.tach.enigma); sfx('unlock'); toast(cfg.tach.okMsg, 'success'); render(); }
          else { failEnigma(cfg.tach.enigma); sfx('error'); toast(cfg.tach.wrongMsg, 'warn'); }
        });
      });
    }
    wrap.append(tach);
  }

  // ── satélite (EN de marcador) + bônus de token ──
  if (cfg.sat) {
    const sat = el('section', 'panel geo-panel');
    sat.append(el('h2', 'panel-title', cfg.sat.title));
    const done = s.enigmasSolved.includes(cfg.sat.enigma);
    sat.append(el('div', 'muted', done ? cfg.sat.doneMsg : cfg.sat.hint));
    sat.insertAdjacentHTML('beforeend', satelliteSvg(cfg.sat, s));
    sat.querySelectorAll('[data-mark]').forEach((m) => {
      m.style.cursor = 'crosshair';
      m.addEventListener('click', () => {
        if (s.enigmasSolved.includes(cfg.sat.enigma)) return;
        const mark = cfg.sat.marks.find((x) => x.id === m.dataset.mark);
        if (mark?.correct) { solveEnigma(cfg.sat.enigma); sfx('unlock'); toast(cfg.sat.okMsg, 'success'); render(); }
        else { failEnigma(cfg.sat.enigma); sfx('error'); toast(cfg.sat.wrongMsg, 'warn'); }
      });
    });
    const bonus = cfg.sat.bonus;
    if (bonus) {
      if (s.tokens.includes(bonus.token)) {
        const b = el('button', 'btn', s.flags[bonus.flag] ? bonus.btnDone : bonus.btn);
        b.onclick = () => {
          if (!s.flags[bonus.flag]) { s.flags[bonus.flag] = true; addScore(bonus.score, bonus.reason); }
          toast(bonus.toast, 'success');
          render();
        };
        sat.append(b);
      } else {
        sat.append(el('p', 'muted', bonus.lockMsg));
      }
    }
    wrap.append(sat);
  }

  body.append(wrap);
}

function chartSvg(tach) {
  const pts = tach.points;
  const x = (i) => 30 + (i / (pts.length - 1)) * 340;
  const y = (v) => 150 - v * 2.1;
  const poly = pts.map((p, i) => `${x(i)},${y(p[1])}`).join(' ');
  return `<svg viewBox="0 0 400 190" class="tach">
    <rect width="400" height="190" fill="#0a1a2a"/>
    ${[0, 20, 40, 60].map((v) => `<g><line x1="30" y1="${y(v)}" x2="370" y2="${y(v)}" stroke="#12293d"/><text x="6" y="${y(v) + 3}" font-size="8" fill="#587a94" font-family="monospace">${v}</text></g>`).join('')}
    <polyline points="${poly}" fill="none" stroke="#00C2FF" stroke-width="2"/>
    ${pts.map((p, i) => (i % 2 === 0 ? `<text x="${x(i)}" y="172" font-size="7" fill="#587a94" text-anchor="middle" font-family="monospace">${p[0]}</text>` : '')).join('')}
    ${tach.segments.map((seg) => `<rect data-seg="${seg.id}" x="${x(seg.at)}" y="30" width="${seg.w}" height="130"
      fill="${seg.correct ? 'rgba(192,57,43,.12)' : 'rgba(224,182,88,.0)'}" ${seg.correct ? 'stroke="#C0392B" stroke-dasharray="4 3"' : ''}/>
      ${seg.label ? `<text x="${x(seg.at) + seg.w / 2}" y="26" font-size="8" fill="#C0392B" text-anchor="middle" font-family="monospace">${seg.label}</text>` : ''}`).join('')}
  </svg>`;
}

function satelliteSvg(sat, s) {
  const done = s.enigmasSolved.includes(sat.enigma);
  const terrain = sat.terrain === 'forest'
    ? Array.from({ length: 16 }, (_, i) => `<ellipse cx="${(i * 53) % 390}" cy="${(i * 37) % 230}" rx="${14 + (i % 3) * 8}" ry="${9 + (i % 4) * 5}" fill="#123420" opacity=".9"/>`).join('')
    : Array.from({ length: 14 }, (_, i) => `<rect x="${(i * 67) % 380}" y="${(i * 41) % 220}" width="${18 + (i % 3) * 9}" height="${12 + (i % 4) * 7}" fill="#11301f" opacity=".8"/>`).join('');
  return `<svg viewBox="0 0 400 240" class="sat">
    <rect width="400" height="240" fill="#0c1f14"/>
    ${terrain}
    <path d="M0 120 Q120 140 400 110" stroke="#28425a" stroke-width="10" fill="none"/>
    <path d="${sat.route}" stroke="#00C2FF" stroke-width="3" fill="none" stroke-dasharray="8 5"/>
    ${sat.detour ? `<path d="${sat.detour}" stroke="${done ? '#C0392B' : '#2a5a44'}" stroke-width="3" fill="none" stroke-dasharray="3 4"/>` : ''}
    ${sat.bonus && s.flags[sat.bonus.flag] && sat.bonus.overlay ? `<path d="${sat.bonus.overlay}" stroke="#E0B658" stroke-width="2" fill="none" stroke-dasharray="2 5"/><text x="390" y="20" font-size="8" fill="#E0B658" text-anchor="end" font-family="monospace">${sat.bonus.overlayLabel || ''}</text>` : ''}
    ${sat.marks.map((m) => `<circle data-mark="${m.id}" cx="${m.x}" cy="${m.y}" r="12"
      fill="${m.correct ? 'rgba(192,57,43,.15)' : 'rgba(0,194,255,.10)'}" stroke="${m.correct ? (done ? '#C0392B' : '#3a6a54') : '#00C2FF'}"/>
      ${m.correct && done && m.label ? `<text x="${m.x}" y="${m.y - 17}" font-size="9" fill="#C0392B" text-anchor="middle" font-family="monospace">${m.label}</text>` : ''}`).join('')}
  </svg>`;
}
