/**
 * art.js — Arte procedural SVG (offline, sem downloads): cenários estilizados
 * dos pontos de Curitiba e retratos-silhueta dos personagens.
 * Quando o dono rodar tools/fetch_assets.mjs, as fotos reais de assets/images/
 * substituem estes cenários automaticamente (fallback gracioso).
 */

const SKY = {
  dia: ['#0e2a44', '#123a5c'],
  tarde: ['#1b2f4d', '#5c3a2e'],
  por_do_sol: ['#2a1e3f', '#b4562e'],
  noite: ['#060d18', '#0d1b2e'],
};

function svg(inner, sky = 'dia', vb = '0 0 400 240') {
  const [a, b] = SKY[sky] || SKY.dia;
  return `<svg viewBox="${vb}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="sky_${sky}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/>
      </linearGradient>
    </defs>
    <rect width="400" height="240" fill="url(#sky_${sky})"/>
    ${inner}</svg>`;
}

const ground = (color = '#0a1826') => `<rect y="190" width="400" height="50" fill="${color}"/>`;
const glow = (cx, cy, r, color, o = .5) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="${o}" filter="blur(6px)"/>`;

// Ônibus da Linha Turismo (verde e amarelo, 2 andares)
function bus(x = 90, y = 120, scale = 1) {
  return `<g transform="translate(${x},${y}) scale(${scale})">
    <rect x="0" y="0" width="220" height="46" rx="8" fill="#2F8B57"/>
    <rect x="0" y="34" width="220" height="26" rx="6" fill="#E0B658"/>
    <rect x="10" y="6" width="200" height="20" rx="4" fill="#0b1e30"/>
    ${[0, 1, 2, 3, 4].map((i) => `<rect x="${16 + i * 40}" y="9" width="28" height="14" rx="2" fill="#123a5c"/>`).join('')}
    <circle cx="45" cy="62" r="11" fill="#111" stroke="#333" stroke-width="3"/>
    <circle cx="175" cy="62" r="11" fill="#111" stroke="#333" stroke-width="3"/>
    <text x="110" y="50" font-size="11" fill="#08131F" text-anchor="middle" font-family="monospace" font-weight="bold">LINHA TURISMO</text>
  </g>`;
}

const SCENES = {
  'rua 24 horas': () => svg(`${ground()}
    <path d="M60 190 L60 90 Q200 20 340 90 L340 190" fill="none" stroke="#00C2FF" stroke-width="6" opacity=".85"/>
    ${[0,1,2,3,4,5].map((i)=>`<line x1="${80+i*48}" y1="${86-Math.sin((i+ .5)/6*Math.PI)*52}" x2="${80+i*48}" y2="190" stroke="#1d4059" stroke-width="4"/>`).join('')}
    <rect x="150" y="120" width="100" height="40" rx="4" fill="#122435"/>
    <text x="200" y="145" font-size="16" fill="#E0B658" text-anchor="middle" font-family="monospace">24 HORAS</text>
    ${glow(200, 60, 40, '#00C2FF', .15)}`, 'dia'),

  'jardim botânico': () => svg(`${ground('#0c2418')}
    <g stroke="#9fd8e8" stroke-width="2.5" fill="rgba(0,194,255,.10)">
      <path d="M200 40 L120 100 L120 180 L280 180 L280 100 Z"/>
      <path d="M120 100 Q200 60 280 100"/>
      <path d="M150 180 L150 78 M200 180 L200 42 M250 180 L250 78"/>
      <path d="M120 140 L280 140 M120 115 L280 115"/>
    </g>
    <path d="M40 190 Q70 160 100 190 M300 190 Q330 160 360 190" stroke="#2F8B57" stroke-width="5" fill="none"/>
    ${glow(200, 110, 70, '#7fe3ff', .08)}`, 'dia'),

  'mon': () => svg(`${ground()}
    <rect x="188" y="90" width="22" height="100" fill="#c9d4da"/>
    <ellipse cx="200" cy="80" rx="120" ry="42" fill="#0b1e30" stroke="#c9d4da" stroke-width="4"/>
    <ellipse cx="200" cy="80" rx="70" ry="26" fill="#123a5c" stroke="#7fe3ff" stroke-width="2"/>
    ${glow(200, 80, 60, '#00C2FF', .18)}
    <rect x="60" y="188" width="280" height="4" fill="#23445e"/>`, 'tarde'),

  'km18': () => svg(`${ground('#101820')}
    <path d="M0 210 L400 176" stroke="#2a3b4c" stroke-width="26"/>
    <path d="M0 208 L400 174" stroke="#E0B658" stroke-width="2" stroke-dasharray="16 14"/>
    ${bus(100, 108, .9)}
    <g font-family="monospace" fill="#F2F5F7"><rect x="308" y="120" width="54" height="34" rx="3" fill="#2F8B57"/>
    <text x="335" y="141" font-size="13" text-anchor="middle" font-weight="bold">KM 18</text></g>
    <circle cx="70" cy="40" r="14" fill="#E0B658" opacity=".9"/>
    ${glow(70, 40, 26, '#E0B658', .3)}`, 'tarde'),

  'ópera de arame': () => svg(`${ground('#0c2418')}
    <g stroke="#b9c8d2" stroke-width="2" fill="rgba(185,200,210,.06)">
      <ellipse cx="200" cy="170" rx="110" ry="22"/>
      <path d="M90 170 Q200 -30 310 170"/>
      ${[1,2,3,4].map((i)=>`<path d="M${90+i*22} 170 Q200 ${-30+i*40} ${310-i*22} 170"/>`).join('')}
      ${[0,1,2,3,4,5,6].map((i)=>`<line x1="${105+i*32}" y1="170" x2="200" y2="30"/>`).join('')}
    </g>
    <ellipse cx="200" cy="196" rx="130" ry="16" fill="#0d2c3f"/>
    ${glow(200, 90, 80, '#7fe3ff', .07)}`, 'tarde'),

  'parque barigui': () => svg(`${ground('#0c2418')}
    <ellipse cx="200" cy="185" rx="170" ry="34" fill="#0d3246"/>
    <ellipse cx="200" cy="185" rx="170" ry="34" fill="none" stroke="#00C2FF" stroke-width="1" opacity=".4"/>
    <g fill="#6b4e35">
      <ellipse cx="120" cy="176" rx="26" ry="12"/><circle cx="98" cy="168" r="8"/>
      <ellipse cx="290" cy="182" rx="20" ry="9"/><circle cx="273" cy="176" r="6"/>
    </g>
    <path d="M40 120 L60 60 L80 120 M320 110 L345 55 L370 110" stroke="#2F8B57" stroke-width="6" fill="none"/>
    ${glow(200, 185, 60, '#00C2FF', .06)}`, 'dia'),

  'parque tanguá': () => svg(`${ground('#131a24')}
    <path d="M0 190 L120 90 L200 120 L400 70 L400 240 L0 240 Z" fill="#152b3d"/>
    <rect x="255" y="76" width="90" height="10" rx="3" fill="#c9d4da"/>
    ${[0,1,2,3].map((i)=>`<rect x="${262+i*22}" y="86" width="6" height="22" fill="#c9d4da"/>`).join('')}
    <path d="M180 122 Q186 160 178 190 Q192 158 190 122 Z" fill="#7fe3ff" opacity=".8"/>
    <circle cx="330" cy="42" r="18" fill="#ff9d5c"/>
    ${glow(330, 42, 40, '#ff9d5c', .35)}`, 'por_do_sol'),

  'ônibus': () => svg(`${ground('#101820')}${bus(90, 100, 1)}
    ${glow(200, 130, 90, '#00C2FF', .05)}`, 'tarde'),

  'central': () => svg(`${ground('#060d18')}
    ${[0,1,2].map((i)=>`<rect x="${70+i*95}" y="70" width="75" height="90" rx="4" fill="#0b1e30" stroke="#00C2FF" stroke-width="1" opacity=".9"/>`).join('')}
    ${[0,1,2].map((i)=>glow(107+i*95, 115, 30, '#00C2FF', .12)).join('')}`, 'noite'),
};

const ALIASES = {
  'rua 24 horas': ['rua 24', '24 horas', 'r24'], 'jardim botânico': ['jardim botanico', 'jb', 'estufa'],
  'mon': ['museu oscar niemeyer', 'olho'], 'km18': ['km 18', 'acostamento', 'parada não programada', 'porta-volumes'],
  'ópera de arame': ['opera de arame', 'opa'], 'parque barigui': ['barigui', 'lixeira'],
  'parque tanguá': ['tangua', 'mirante', 'cascata'], 'ônibus': ['onibus', 'bus', 'garrafa térmica', 'otávio bandeira', 'linha turismo'],
  'central': ['central de operações'],
};

export function sceneArt(place = '') {
  const q = String(place).toLowerCase();
  for (const [key, fn] of Object.entries(SCENES)) {
    if (q.includes(key) || (ALIASES[key] || []).some((a) => q.includes(a))) return fn();
  }
  return SCENES['central']();
}

// ── Retratos-silhueta (sem rostos reais — BRIEF §5.1) ────────────────────────
const PORTRAIT_STYLE = {
  P001: { color: '#8896a2', trait: 'gravata' },   // Otávio — empresário (vítima)
  P002: { color: '#2F8B57', trait: 'bone' },      // Sérgio — motorista
  P003: { color: '#E0B658', trait: 'coque' },     // Dília — cobradora
  P004: { color: '#c05f7c', trait: 'microfone' }, // Renata — jornalista
  P005: { color: '#7a6248', trait: 'oculos' },    // Aldo — ex-sócio
  P006: { color: '#5c8b64', trait: 'chapeu' },    // Wanda — bióloga
  P007: { color: '#8a6fd1', trait: 'celular' },   // Bianca — influencer
  P008: { color: '#4a6a8a', trait: 'oculos' },    // Klaus — detetive
};

export function portrait(pid, nome = '') {
  const st = PORTRAIT_STYLE[pid] || { color: '#44586a', trait: null };
  const traits = {
    bone: `<path d="M30 34 Q50 18 70 34 L70 40 L26 40 Z" fill="${st.color}" stroke="#08131F"/>`,
    gravata: `<path d="M47 78 L50 92 L53 78 Z" fill="#C0392B"/>`,
    coque: `<circle cx="50" cy="22" r="9" fill="#3a2c20"/>`,
    microfone: `<rect x="66" y="60" width="5" height="22" rx="2" fill="#aab"/><circle cx="68.5" cy="56" r="6" fill="#333" stroke="#aab"/>`,
    oculos: `<g stroke="#dfe8ee" stroke-width="2" fill="none"><circle cx="41" cy="42" r="7"/><circle cx="59" cy="42" r="7"/><line x1="48" y1="42" x2="52" y2="42"/></g>`,
    chapeu: `<ellipse cx="50" cy="30" rx="24" ry="6" fill="#3f5a44"/><rect x="38" y="14" width="24" height="16" rx="4" fill="#3f5a44"/>`,
    celular: `<rect x="65" y="56" width="10" height="18" rx="2" fill="#0b1e30" stroke="#7fe3ff"/>`,
  };
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="pbg${pid}" cx=".5" cy=".35"><stop offset="0" stop-color="${st.color}" stop-opacity=".35"/><stop offset="1" stop-color="#0b1e30"/></radialGradient></defs>
    <rect width="100" height="100" rx="8" fill="url(#pbg${pid})"/>
    <circle cx="50" cy="40" r="16" fill="#1c2f42"/>
    <path d="M22 92 Q50 58 78 92 L78 100 L22 100 Z" fill="#1c2f42"/>
    ${traits[st.trait] || ''}
    <rect width="100" height="100" rx="8" fill="none" stroke="${st.color}" stroke-opacity=".5"/>
  </svg>`;
}
