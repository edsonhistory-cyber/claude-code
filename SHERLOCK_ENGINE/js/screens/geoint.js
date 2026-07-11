/**
 * screens/geoint.js — Análise geoespacial (SHERLOCK_ENGINE_GEOINT.json):
 * gráfico do tacógrafo (EN003) e visão de satélite para marcar a parada
 * irregular (EN004). Token ROTAS libera a comparação com a rota de 2019.
 */
import { getModule } from '../database.js';
import { screenShell, el, toast } from '../uiManager.js';
import { getCase, solveEnigma, failEnigma, enigmaUnlocked, addScore, ENIGMA_GATES } from '../caseState.js';
import { sfx, ambience } from '../audioManager.js';

export function render() {
  const { body } = screenShell('GEOINT', 'CENTRAL › GEOINT — ANÁLISE GEOESPACIAL');
  ambience('central');
  const s = getCase();
  const wrap = el('div', 'two-col');

  // ── Painel do tacógrafo (EN003) ──
  const tach = el('section', 'panel geo-panel');
  tach.append(el('h2', 'panel-title', 'DISCO DO TACÓGRAFO — VELOCIDADE × HORA'));
  if (!s.collected.includes('EV004')) {
    tach.append(el('p', 'muted', '🔒 Colete o tacógrafo na cabine do ônibus (Mapa → Ônibus).'));
  } else {
    tach.append(el('div', 'muted', s.enigmasSolved.includes('EN003') ? '✔ EN003: parada de 6 min às 15:47 identificada.' : 'Regra GEO001: parada > 5 min fora da rota gera anomalia. Clique no trecho anômalo.'));
    tach.insertAdjacentHTML('beforeend', tachographSvg());
    tach.querySelectorAll('[data-seg]').forEach((seg) => {
      seg.style.cursor = 'pointer';
      seg.addEventListener('click', () => {
        if (s.enigmasSolved.includes('EN003')) return;
        if (!enigmaUnlocked('EN003')) return toast('🔒 ' + ENIGMA_GATES.EN003.hintLocked, 'warn');
        if (seg.dataset.seg === 'km18') { solveEnigma('EN003'); sfx('unlock'); toast('🔓 EN003 resolvido! Parada de 6 minutos às 15:47 — velocidade zero, sem falha mecânica.', 'success'); render(); }
        else { failEnigma('EN003'); sfx('error'); toast('Trecho normal: paradas programadas têm registro de ponto. (-20)', 'warn'); }
      });
    });
  }

  // ── Satélite (EN004) + rota 2019 (bônus ROTAS) ──
  const sat = el('section', 'panel geo-panel');
  sat.append(el('h2', 'panel-title', 'IMAGEM DE SATÉLITE — ROTA DA LINHA TURISMO'));
  sat.append(el('div', 'muted', s.enigmasSolved.includes('EN004') ? '✔ EN004: parada irregular marcada no KM18.' : 'Marque o ponto onde o ônibus saiu da rota oficial (traço ciano).'));
  sat.insertAdjacentHTML('beforeend', satelliteSvg(s));
  sat.querySelectorAll('[data-mark]').forEach((m) => {
    m.style.cursor = 'crosshair';
    m.addEventListener('click', () => {
      if (s.enigmasSolved.includes('EN004')) return;
      if (m.dataset.mark === 'km18') { solveEnigma('EN004'); sfx('unlock'); toast('🔓 EN004 resolvido! Desvio marcado: acostamento do KM18, 15:47.', 'success'); render(); }
      else { failEnigma('EN004'); sfx('error'); toast('O GPS mostra o ônibus sobre a rota oficial neste ponto. (-20)', 'warn'); }
    });
  });
  if (s.tokens.includes('ROTAS')) {
    const b = el('button', 'btn', s.flags.rota2019_vista ? '✔ ROTA DE 2019 COMPARADA' : 'SOBREPOR ROTA DE 2019 (token ROTAS)');
    b.onclick = () => {
      if (!s.flags.rota2019_vista) { s.flags.rota2019_vista = true; addScore(15, 'Rotas comparadas (2019 × atual)'); }
      toast('🗺 A rota de 2019 passava exatamente pelo KM18. A mudança que Otávio patrocinou tirou o ponto da empresa de fretamento local.', 'success');
      render();
    };
    sat.append(b);
  } else {
    sat.append(el('p', 'muted', '🔒 Comparação com a rota de 2019 requer o token ROTAS (Arquivo).'));
  }

  wrap.append(tach, sat);
  body.append(wrap);
}

// Gráfico velocidade × hora com o platô 15:47-15:53 em zero
function tachographSvg() {
  const pts = [
    ['14:00', 0], ['14:10', 40], ['15:00', 55], ['15:20', 0], ['15:30', 50],
    ['15:35', 0], ['15:40', 48], ['15:47', 0], ['15:53', 0], ['16:00', 52],
    ['16:05', 0], ['16:20', 50], ['16:45', 0], ['17:10', 45], ['17:50', 0],
  ];
  const x = (i) => 30 + (i / (pts.length - 1)) * 340;
  const y = (v) => 150 - v * 2.1;
  const poly = pts.map((p, i) => `${x(i)},${y(p[1])}`).join(' ');
  return `<svg viewBox="0 0 400 190" class="tach">
    <rect width="400" height="190" fill="#0a1a2a"/>
    ${[0, 20, 40, 60].map((v) => `<g><line x1="30" y1="${y(v)}" x2="370" y2="${y(v)}" stroke="#12293d"/><text x="6" y="${y(v) + 3}" font-size="8" fill="#587a94" font-family="monospace">${v}</text></g>`).join('')}
    <polyline points="${poly}" fill="none" stroke="#00C2FF" stroke-width="2"/>
    ${pts.map((p, i) => (i % 2 === 0 ? `<text x="${x(i)}" y="172" font-size="7" fill="#587a94" text-anchor="middle" font-family="monospace">${p[0]}</text>` : '')).join('')}
    <rect data-seg="jb" x="${x(2.6)}" y="30" width="26" height="130" fill="rgba(224,182,88,.0)"/>
    <rect data-seg="km18" x="${x(6.7)}" y="30" width="30" height="130" fill="rgba(192,57,43,.12)" stroke="#C0392B" stroke-dasharray="4 3"/>
    <rect data-seg="opa" x="${x(9.7)}" y="30" width="24" height="130" fill="rgba(224,182,88,.0)"/>
    <rect data-seg="bar" x="${x(11.7)}" y="30" width="24" height="130" fill="rgba(224,182,88,.0)"/>
    <text x="${x(7.2)}" y="26" font-size="8" fill="#C0392B" text-anchor="middle" font-family="monospace">6 MIN · 0 km/h</text>
  </svg>`;
}

function satelliteSvg(s) {
  const route = 'M40 200 L110 215 L170 130 L235 70 L110 80 L165 40';
  const detour = 'M235 70 L300 95';
  return `<svg viewBox="0 0 400 240" class="sat">
    <rect width="400" height="240" fill="#0c1f14"/>
    ${Array.from({ length: 14 }, (_, i) => `<rect x="${(i * 67) % 380}" y="${(i * 41) % 220}" width="${18 + (i % 3) * 9}" height="${12 + (i % 4) * 7}" fill="#11301f" opacity=".8"/>`).join('')}
    <path d="M0 120 Q120 140 400 110" stroke="#28425a" stroke-width="10" fill="none"/>
    <path d="${route}" stroke="#00C2FF" stroke-width="3" fill="none" stroke-dasharray="8 5"/>
    <path d="${detour}" stroke="${s.enigmasSolved.includes('EN004') ? '#C0392B' : '#2a5a44'}" stroke-width="3" fill="none" stroke-dasharray="3 4"/>
    ${s.flags.rota2019_vista ? `<path d="M170 130 L300 95 L360 60" stroke="#E0B658" stroke-width="2" fill="none" stroke-dasharray="2 5"/><text x="355" y="50" font-size="8" fill="#E0B658" text-anchor="end" font-family="monospace">ROTA 2019</text>` : ''}
    <circle data-mark="jb" cx="170" cy="130" r="12" fill="rgba(0,194,255,.10)" stroke="#00C2FF"/>
    <circle data-mark="mon" cx="235" cy="70" r="12" fill="rgba(0,194,255,.10)" stroke="#00C2FF"/>
    <circle data-mark="km18" cx="300" cy="95" r="12" fill="rgba(192,57,43,.15)" stroke="${s.enigmasSolved.includes('EN004') ? '#C0392B' : '#3a6a54'}"/>
    <circle data-mark="bar" cx="110" cy="80" r="12" fill="rgba(0,194,255,.10)" stroke="#00C2FF"/>
    ${s.enigmasSolved.includes('EN004') ? '<text x="300" y="78" font-size="9" fill="#C0392B" text-anchor="middle" font-family="monospace">⚠ KM18</text>' : ''}
  </svg>`;
}
