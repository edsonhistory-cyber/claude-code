/**
 * art.js — Arte procedural SVG (offline, sem downloads): cenários estilizados
 * dos pontos de Curitiba e retratos-silhueta dos personagens.
 * Quando o dono rodar tools/fetch_assets.mjs, as fotos reais de assets/images/
 * substituem estes cenários automaticamente (fallback gracioso).
 */

// céus VIVOS (o dono pediu cor, não preto e branco)
const SKY = {
  dia: ['#2f7fd4', '#8fd8f7'],
  tarde: ['#5b4bc4', '#f6a25c'],
  por_do_sol: ['#8e2d6b', '#ffb46b'],
  noite: ['#241b56', '#3b2f7d'],
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

const ground = (color = '#2b7a4b') => `<rect y="190" width="400" height="50" fill="${color}"/>`;
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

  // ── CASE002 · Serra do Mar ─────────────────────────────────────────────
  'serra': () => svg(`${ground('#0c2418')}
    <path d="M0 190 L70 90 L130 160 L200 60 L270 150 L330 80 L400 190 Z" fill="#12362a"/>
    <path d="M0 190 L100 130 L180 180 L260 120 L340 175 L400 150 L400 240 L0 240 Z" fill="#0d2c20"/>
    ${train(50, 176, .8)}
    <path d="M20 176 L120 173 L380 162" stroke="#3a3a3a" stroke-width="3" fill="none"/>
    ${glow(200, 60, 60, '#7fe3ff', .06)}`, 'dia'),

  'trem': () => svg(`${ground('#101820')}${train(70, 120, 1.1)}
    <path d="M0 178 L400 168" stroke="#3a3a3a" stroke-width="4" fill="none"/>
    <path d="M0 184 L400 174" stroke="#2a2a2a" stroke-width="2" fill="none"/>
    ${glow(200, 140, 90, '#E0B658', .06)}`, 'tarde'),

  'túnel': () => svg(`
    <rect width="400" height="240" fill="#05090f"/>
    <path d="M80 240 L80 110 Q200 10 320 110 L320 240" fill="#0b131c" stroke="#22303c" stroke-width="5"/>
    <path d="M120 240 L120 130 Q200 55 280 130 L280 240" fill="#02050a"/>
    <circle cx="200" cy="150" r="9" fill="#E0B658" opacity=".9"/>
    ${glow(200, 150, 30, '#E0B658', .35)}
    <text x="200" y="95" font-size="11" fill="#5c6f80" text-anchor="middle" font-family="monospace">TÚNEL ROÇA NOVA</text>`, 'noite'),

  'estação': () => svg(`${ground('#141018')}
    <rect x="60" y="100" width="280" height="90" fill="#241a20" stroke="#6b4e35" stroke-width="2"/>
    <path d="M40 100 L200 50 L360 100" fill="none" stroke="#6b4e35" stroke-width="6"/>
    <rect x="180" y="140" width="40" height="50" fill="#0b1e30"/>
    ${[0,1].map((i)=>`<rect x="${95+i*190}" y="125" width="30" height="34" fill="#123a5c" stroke="#7fe3ff" stroke-width="1"/>`).join('')}
    <text x="200" y="122" font-size="11" fill="#E0B658" text-anchor="middle" font-family="monospace">MORRETES</text>
    <path d="M0 205 L400 198" stroke="#3a3a3a" stroke-width="3" fill="none"/>`, 'por_do_sol'),

  'rio': () => svg(`${ground('#0c2418')}
    <path d="M0 150 Q100 130 170 160 Q260 195 400 170 L400 240 L0 240 Z" fill="#0d3246"/>
    <path d="M0 156 Q100 136 170 166 Q260 200 400 176" stroke="#7fe3ff" stroke-width="1.5" fill="none" opacity=".5"/>
    <path d="M40 130 L70 60 L100 130 M300 120 L335 50 L370 120" stroke="#2F8B57" stroke-width="6" fill="none"/>
    ${glow(200, 170, 70, '#00C2FF', .07)}`, 'dia'),

  'mirante da serra': () => svg(`${ground('#131a24')}
    <path d="M0 190 L90 70 L180 140 L280 40 L400 150 L400 240 L0 240 Z" fill="#152b3d"/>
    <rect x="40" y="150" width="80" height="8" rx="3" fill="#c9d4da"/>
    ${[0,1,2].map((i)=>`<rect x="${48+i*24}" y="158" width="5" height="20" fill="#c9d4da"/>`).join('')}
    <circle cx="320" cy="45" r="16" fill="#ff9d5c"/>
    ${glow(320, 45, 36, '#ff9d5c', .3)}
    <path d="M180 140 Q230 170 280 200" stroke="#0d3246" stroke-width="10" fill="none"/>`, 'por_do_sol'),

  // ── CASE003 · Operação Eclipse (noite institucional) ──────────────────
  'fórum': () => svg(`${ground('#0a0e14')}
    <rect x="90" y="70" width="220" height="120" fill="#10151d" stroke="#2a3340" stroke-width="2"/>
    ${[0,1,2,3,4,5].map((i)=>`<rect x="${104+i*34}" y="84" width="20" height="34" fill="${i===2?'#E0B658':'#0b1e30'}" opacity="${i===2?.9:.8}"/>`).join('')}
    ${[0,1,2,3,4,5].map((i)=>`<rect x="${104+i*34}" y="130" width="20" height="34" fill="#0b1e30" opacity=".8"/>`).join('')}
    ${[0,1,2,3].map((i)=>`<rect x="${120+i*45}" y="166" width="10" height="24" fill="#2a3340"/>`).join('')}
    <path d="M80 70 L200 40 L320 70" fill="none" stroke="#2a3340" stroke-width="5"/>
    ${glow(140, 100, 20, '#E0B658', .25)}
    <text x="200" y="62" font-size="10" fill="#5c6f80" text-anchor="middle" font-family="monospace">FÓRUM</text>`, 'noite'),

  'paiol': () => svg(`
    <rect width="400" height="240" fill="#080d13"/>
    ${[0,1,2].map((r)=>`<g>
      <rect x="40" y="${50+r*56}" width="320" height="8" fill="#22303c"/>
      ${[0,1,2,3,4,5,6].map((i)=>`<rect x="${52+i*44}" y="${18+r*56}" width="32" height="32" rx="2" fill="#101c28" stroke="#22303c"/>`).join('')}
    </g>`).join('')}
    <rect x="184" y="74" width="32" height="32" rx="2" fill="#1c1420" stroke="#C0392B" stroke-width="2"/>
    <text x="200" y="230" font-size="10" fill="#587a94" text-anchor="middle" font-family="monospace">PAIOL DE PROVAS · PRATELEIRA 14</text>
    ${glow(200, 90, 30, '#C0392B', .18)}`, 'noite'),

  'subsolo': () => svg(`
    <rect width="400" height="240" fill="#070b10"/>
    <rect x="140" y="60" width="120" height="130" rx="4" fill="#141b24" stroke="#2a3340" stroke-width="2"/>
    ${[0,1,2].map((i)=>`<rect x="${156+i*32}" y="76" width="20" height="10" rx="2" fill="#0b1e30" stroke="#3a4a5a"/>`).join('')}
    <rect x="186" y="110" width="28" height="52" rx="4" fill="#C0392B"/>
    <rect x="194" y="96" width="12" height="20" rx="3" fill="#7a1f1f"/>
    <text x="200" y="215" font-size="10" fill="#587a94" text-anchor="middle" font-family="monospace">QUADRO GERAL · ALAVANCA BAIXADA</text>
    ${glow(200, 135, 30, '#C0392B', .15)}`, 'noite'),

  'corredor': () => svg(`
    <rect width="400" height="240" fill="#080d13"/>
    <path d="M0 240 L150 110 L250 110 L400 240 Z" fill="#0d141c"/>
    <path d="M150 110 L150 40 L250 40 L250 110" fill="#0a1018" stroke="#22303c"/>
    ${[0,1,2].map((i)=>`<rect x="${60+i*110}" y="${140-i*22}" width="26" height="${44-i*8}" fill="#0b1e30" opacity=".7"/>`).join('')}
    <circle cx="200" cy="52" r="7" fill="#E0B658"/>
    ${glow(200, 52, 26, '#E0B658', .3)}
    <rect x="330" y="46" width="26" height="16" rx="3" fill="#101c28" stroke="#3a4a5a"/>
    <circle cx="343" cy="54" r="4" fill="#C0392B" opacity=".9"/>
    <text x="200" y="228" font-size="10" fill="#587a94" text-anchor="middle" font-family="monospace">LUZ DE EMERGÊNCIA · 21:14</text>`, 'noite'),

  // ── CASE004 · O Colecionador (gala noturna) ────────────────────────────
  'casarão': () => svg(`${ground('#0c0a10')}
    <rect x="80" y="80" width="240" height="110" fill="#181220" stroke="#6b4e35" stroke-width="2"/>
    <path d="M70 80 L200 34 L330 80" fill="#241a20" stroke="#6b4e35" stroke-width="3"/>
    ${[0,1,2,3].map((i)=>`<rect x="${100+i*58}" y="98" width="26" height="40" rx="12" fill="#3a2a14" stroke="#E0B658" stroke-width="1"/>`).join('')}
    ${[0,1,2,3].map((i)=>glow(113+i*58, 118, 14, '#E0B658', .25)).join('')}
    <rect x="182" y="146" width="36" height="44" fill="#0f0b14" stroke="#E0B658"/>
    <path d="M40 195 Q200 175 360 195" stroke="#2a2130" stroke-width="6" fill="none"/>`, 'noite'),

  'salão de leilões': () => svg(`
    <rect width="400" height="240" fill="#120b16"/>
    <rect x="60" y="130" width="280" height="16" fill="#241a20"/>
    <rect x="150" y="60" width="100" height="70" fill="#1c1420" stroke="#6b4e35"/>
    <rect x="186" y="88" width="28" height="42" rx="4" fill="#3a1420" stroke="#C0392B" stroke-width="2"/>
    <circle cx="120" cy="40" r="10" fill="#E0B658"/><circle cx="280" cy="40" r="10" fill="#E0B658"/>
    ${glow(120, 40, 30, '#E0B658', .3)}${glow(280, 40, 30, '#E0B658', .3)}
    ${[0,1,2,3,4].map((i)=>`<circle cx="${80+i*60}" cy="${190+(i%2)*14}" r="12" fill="#1c1420" stroke="#3a2a30"/>`).join('')}
    <text x="200" y="228" font-size="10" fill="#8a7a94" text-anchor="middle" font-family="monospace">LOTE 77 · BLECAUTE DE 90s</text>
    ${glow(200, 108, 34, '#C0392B', .15)}`, 'noite'),

  'galeria': () => svg(`
    <rect width="400" height="240" fill="#100c14"/>
    <path d="M0 240 L140 120 L260 120 L400 240 Z" fill="#160f1c"/>
    ${[0,1,2].map((i)=>`<rect x="${52+i*70}" y="${96-i*10}" width="${44-i*6}" height="${34-i*5}" fill="#0b1e30" stroke="#6b4e35" stroke-width="2"/>`).join('')}
    ${[0,1,2].map((i)=>`<rect x="${262+i*44}" y="${86+i*0}" width="${38-i*6}" height="${30-i*4}" fill="#1c1420" stroke="#6b4e35" stroke-width="2"/>`).join('')}
    ${glow(200, 60, 40, '#E0B658', .12)}
    <text x="200" y="228" font-size="10" fill="#8a7a94" text-anchor="middle" font-family="monospace">GALERIA · 20:40</text>`, 'noite'),

  'jardim de inverno': () => svg(`${ground('#0c1410')}
    <path d="M200 30 L110 90 L110 190 L290 190 L290 90 Z" fill="rgba(127,227,255,.06)" stroke="#9fd8e8" stroke-width="2"/>
    <path d="M110 90 Q200 50 290 90 M150 190 L150 68 M250 190 L250 68 M110 140 L290 140" stroke="#9fd8e8" stroke-width="1.5" fill="none"/>
    <path d="M130 190 Q140 160 150 190 M250 190 Q262 156 274 190" stroke="#2F8B57" stroke-width="5" fill="none"/>
    ${glow(200, 110, 60, '#7fe3ff', .08)}`, 'noite'),

  'garagem': () => svg(`
    <rect width="400" height="240" fill="#0a0d12"/>
    <rect x="40" y="90" width="320" height="100" fill="#10151c" stroke="#22303c"/>
    ${[0,1,2].map((i)=>`<rect x="${60+i*110}" y="120" width="84" height="46" rx="8" fill="#151c26" stroke="#2a3644"/>`).join('')}
    <rect x="330" y="60" width="30" height="130" fill="#141b24" stroke="#3a4a5a"/>
    <text x="345" y="52" font-size="8" fill="#587a94" text-anchor="middle" font-family="monospace">ELEVADOR</text>
    ${glow(345, 125, 20, '#E0B658', .15)}`, 'noite'),

  // ── CASE005 — Teatro Guaíra (O Último Ato) ────────────────────────────
  'teatro': () => svg(`${ground('#1a1626')}
    <rect x="60" y="60" width="280" height="130" rx="4" fill="#241d33" stroke="#4a3a63"/>
    ${[0,1,2,3,4].map((i)=>`<rect x="${84+i*52}" y="80" width="30" height="70" rx="14" fill="#141020" stroke="#6b5590"/>`).join('')}
    <rect x="140" y="34" width="120" height="26" rx="4" fill="#3a2d52"/>
    <text x="200" y="52" font-size="12" fill="#E0B658" text-anchor="middle" font-family="monospace">GUAÍRA</text>
    ${glow(200, 120, 90, '#b46bff', .10)}`, 'noite'),

  'palco': () => svg(`
    <rect width="400" height="240" fill="#120c18"/>
    <path d="M0 0 L60 0 L30 240 L0 240 Z" fill="#7a1f2f"/>
    <path d="M400 0 L340 0 L370 240 L400 240 Z" fill="#7a1f2f"/>
    <rect y="190" width="400" height="50" fill="#3a2a1c"/>
    <line x1="80" y1="0" x2="80" y2="60" stroke="#555" stroke-width="2"/>
    <line x1="320" y1="0" x2="320" y2="60" stroke="#555" stroke-width="2"/>
    <rect x="70" y="58" width="260" height="8" rx="3" fill="#222"/>
    <text x="200" y="82" font-size="9" fill="#c05f5f" text-anchor="middle" font-family="monospace">VARA 7</text>
    ${glow(200, 150, 60, '#ffd27f', .30)}
    <circle cx="200" cy="150" r="26" fill="rgba(255,220,150,.16)"/>`, 'noite'),

  'coxia': () => svg(`
    <rect width="400" height="240" fill="#100d16"/>
    <path d="M40 0 L90 0 L90 240 L40 240 Z" fill="#4a1420"/>
    <path d="M120 0 L150 0 L150 240 L120 240 Z" fill="#2a2333"/>
    ${[180, 210, 240].map((x)=>`<line x1="${x}" y1="0" x2="${x}" y2="200" stroke="#3d3450" stroke-width="3"/>`).join('')}
    <rect x="260" y="120" width="110" height="70" rx="4" fill="#1a1524" stroke="#3d3450"/>
    <text x="315" y="112" font-size="8" fill="#8a7fa8" text-anchor="middle" font-family="monospace">MESA DA DIREÇÃO</text>
    ${glow(315, 155, 26, '#7fd3ff', .12)}`, 'noite'),

  'camarim': () => svg(`
    <rect width="400" height="240" fill="#1b1420"/>
    <rect x="120" y="50" width="160" height="120" rx="6" fill="#0d0a12" stroke="#57406b"/>
    ${[0,1,2,3,4].map((i)=>`<circle cx="${138+i*31}" cy="44" r="6" fill="#ffd98a"/>`).join('')}
    ${[0,1,2,3,4].map((i)=>`<circle cx="${138+i*31}" cy="176" r="6" fill="#ffd98a"/>`).join('')}
    <rect x="100" y="176" width="200" height="14" rx="4" fill="#3a2d47"/>
    ${glow(200, 110, 70, '#ffca7a', .14)}`, 'noite'),

  'urdimento': () => svg(`
    <rect width="400" height="240" fill="#0c0a12"/>
    ${[70, 130, 190, 250, 310].map((x, i)=>`<line x1="${x}" y1="0" x2="${x}" y2="240" stroke="#2c2740" stroke-width="${i===3?4:2}"/>`).join('')}
    <rect x="40" y="100" width="320" height="10" rx="3" fill="#241f36" stroke="#443a5e"/>
    ${[80, 140, 200, 260, 320].map((x)=>`<rect x="${x-8}" y="112" width="16" height="34" rx="2" fill="#39304f"/>`).join('')}
    <rect x="242" y="112" width="16" height="34" rx="2" fill="#7a1f2f"/>
    <text x="250" y="160" font-size="9" fill="#c05f5f" text-anchor="middle" font-family="monospace">⚠ VARA 7</text>
    ${glow(250, 128, 30, '#ff8a8a', .12)}`, 'noite'),

  'praça santos andrade': () => svg(`${ground('#274a33')}
    <rect x="130" y="70" width="140" height="90" rx="4" fill="#3d3548" stroke="#6b5f85"/>
    ${[0,1,2,3].map((i)=>`<rect x="${146+i*30}" y="90" width="16" height="50" rx="7" fill="#181226"/>`).join('')}
    <text x="200" y="62" font-size="9" fill="#cabde0" text-anchor="middle" font-family="monospace">UFPR</text>
    <circle cx="70" cy="150" r="26" fill="#2F8B57"/><rect x="66" y="150" width="8" height="40" fill="#5c4326"/>
    <circle cx="330" cy="150" r="26" fill="#2F8B57"/><rect x="326" y="150" width="8" height="40" fill="#5c4326"/>
    ${glow(200, 110, 80, '#9fd8ff', .10)}`, 'noite'),
};

// Trem da Serra Verde (locomotiva + vagão panorâmico)
function train(x = 70, y = 120, scale = 1) {
  return `<g transform="translate(${x},${y}) scale(${scale})">
    <rect x="0" y="8" width="90" height="40" rx="6" fill="#7a1f1f"/>
    <rect x="8" y="0" width="34" height="14" rx="3" fill="#5c1515"/>
    <rect x="14" y="16" width="20" height="14" rx="2" fill="#0b1e30"/>
    <rect x="96" y="12" width="150" height="36" rx="5" fill="#1d4a38"/>
    ${[0,1,2,3].map((i)=>`<rect x="${104+i*36}" y="18" width="26" height="16" rx="2" fill="#123a5c"/>`).join('')}
    <text x="171" y="45" font-size="9" fill="#E0B658" text-anchor="middle" font-family="monospace">SERRA VERDE</text>
    ${[22, 60, 120, 160, 200, 232].map((cx)=>`<circle cx="${cx}" cy="52" r="8" fill="#111" stroke="#333" stroke-width="2.5"/>`).join('')}
  </g>`;
}

const ALIASES = {
  'rua 24 horas': ['rua 24', '24 horas', 'r24'], 'jardim botânico': ['jardim botanico', 'jb', 'estufa'],
  'mon': ['museu oscar niemeyer', 'olho'], 'km18': ['km 18', 'acostamento', 'parada não programada', 'porta-volumes'],
  'ópera de arame': ['opera de arame', 'opa'], 'parque barigui': ['barigui', 'lixeira'],
  'parque tanguá': ['tangua', 'cascata'], 'ônibus': ['onibus', 'bus', 'garrafa térmica', 'otávio bandeira', 'linha turismo'],
  'central': ['central de operações'],
  'serra': ['serra do mar', 'marumbi', 'silêncio na serra', 'silencio na serra'],
  'fórum': ['forum', 'operação eclipse', 'operacao eclipse', 'fachada'],
  'paiol': ['provas', 'prateleira', 'sala de perícia', 'sala de pericia'],
  'subsolo': ['quadro geral', 'quadro de energia'],
  'corredor': ['câmeras', 'cameras', 'guarita'],
  'trem': ['vagão', 'vagao', 'serra verde', 'litorina', 'pátio ferroviário', 'patio ferroviario'],
  'túnel': ['tunel', 'roça nova', 'roca nova'],
  'estação': ['estacao', 'morretes'],
  'rio': ['nhundiaquara', 'ponte'],
  'mirante da serra': ['mirante'],
  'teatro': ['guaíra', 'guaira', 'último ato', 'ultimo ato', 'foyer'],
  'palco': ['marca 7', 'monólogo', 'monologo'],
  'coxia': ['bastidores', 'mesa da direção', 'mesa da direcao', 'contrarregra'],
  'camarim': ['camarins', 'espelho'],
  'urdimento': ['vara 7', 'passarela técnica', 'passarela tecnica', 'contrapeso'],
  'praça santos andrade': ['praca santos andrade', 'santos andrade', 'ufpr'],
};

function sceneKey(place = '') {
  const q = String(place).toLowerCase();
  for (const key of Object.keys(SCENES)) {
    if (q.includes(key) || (ALIASES[key] || []).some((a) => q.includes(a))) return key;
  }
  return 'central';
}

export function sceneArt(place = '') {
  return SCENES[sceneKey(place)]();
}

// ── Fotos reais (build-time): assets/images/scenes/manifest.json ────────────
// Quando o dono roda tools/fetch_assets.mjs com internet, o manifest mapeia
// cena → foto e as ilustrações são substituídas automaticamente.
let scenePhotos = null;
export function setScenePhotos(manifest) {
  scenePhotos = manifest && typeof manifest === 'object' ? manifest : null;
}

// Retratos gerados por IA (build-time): assets/images/portraits/manifest.json
let portraitPhotos = null;
export function setPortraitPhotos(manifest) {
  portraitPhotos = manifest && typeof manifest === 'object' ? manifest : null;
}

// Fotos forenses das evidências (build-time): assets/images/objects/manifest.json
let objectPhotos = null;
export function setObjectPhotos(manifest) {
  objectPhotos = manifest && typeof manifest === 'object' ? manifest : null;
}
export function objectPhoto(evId) {
  return objectPhotos?.[evId] || null;
}

/** Cena como mídia: SVG colorido por baixo e foto real por cima (quando o
 *  manifest aponta uma foto). Se o arquivo faltar, o SVG permanece — sem
 *  imagem quebrada. */
export function sceneMedia(place = '') {
  const key = sceneKey(place);
  const photo = scenePhotos?.[key];
  const overlay = photo
    ? `<img class="scene-photo" src="${photo}" alt="${key}" loading="lazy" onload="this.classList.add('on')" onerror="this.remove()">`
    : '';
  return `<div class="scene-media">${SCENES[key]()}${overlay}</div>`;
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
  // CASE002 — Silêncio na Serra
  P101: { color: '#8896a2', trait: 'gravata' },   // Heitor — contador (vítima)
  P102: { color: '#a3527c', trait: 'oculos' },    // Camila — advogada
  P103: { color: '#7a1f1f', trait: 'bone' },      // Ivo — ferroviário
  P104: { color: '#8a6fd1', trait: 'celular' },   // Sofia — fotógrafa
  P105: { color: '#6b4e35', trait: 'chapeu' },    // Ernesto — colecionador
  P106: { color: '#5c8b64', trait: 'coque' },     // Marta — irmã da vítima
  P107: { color: '#4a6a8a', trait: 'gravata' },   // Davi — chefe de trem
  // CASE003 — Operação Eclipse
  P201: { color: '#8896a2', trait: 'bone' },      // Téo — guarda (vítima)
  P202: { color: '#c9d4da', trait: 'oculos' },    // Vera — perita
  P203: { color: '#4a6a8a', trait: 'gravata' },   // Rui — promotor
  P204: { color: '#8a6fd1', trait: 'celular' },   // Alice — estagiária
  P205: { color: '#E0B658', trait: 'chapeu' },    // Otto — eletricista
  P206: { color: '#7a6248', trait: 'gravata' },   // Samir — advogado
  P207: { color: '#2F8B57', trait: 'coque' },     // Cátia — delegada
  // CASE004 — O Colecionador
  P301: { color: '#8896a2', trait: 'gravata' },   // Gustavo — leiloeiro (vítima)
  P302: { color: '#E0B658', trait: 'coque' },     // Helena — a Colecionadora
  P303: { color: '#7a6248', trait: 'celular' },   // Bruno — herdeiro
  P304: { color: '#c05f7c', trait: 'chapeu' },    // Yara — rival
  P305: { color: '#4a6a8a', trait: 'oculos' },    // Padre Inácio
  P306: { color: '#5c8b64', trait: 'gravata' },   // Célio — cerimonial
  P307: { color: '#8a6fd1', trait: 'celular' },   // Duda — operadora de câmera
};

// fallback determinístico para elencos futuros sem estilo definido
function styleFor(pid) {
  if (PORTRAIT_STYLE[pid]) return PORTRAIT_STYLE[pid];
  const palette = ['#2F8B57', '#E0B658', '#c05f7c', '#8a6fd1', '#4a6a8a', '#7a6248'];
  const traits = ['bone', 'oculos', 'coque', 'chapeu', 'celular', 'gravata'];
  const h = [...String(pid)].reduce((a, c) => a + c.charCodeAt(0), 0);
  return { color: palette[h % palette.length], trait: traits[h % traits.length] };
}

export function portrait(pid, nome = '') {
  const st = styleFor(pid);
  const photo = portraitPhotos?.[pid];
  const overlay = photo
    ? `<img class="portrait-photo" src="${photo}" alt="${nome || pid}" loading="lazy" onload="this.classList.add('on')" onerror="this.remove()">`
    : '';
  const h = [...String(pid)].reduce((a, c) => a + c.charCodeAt(0), 0);
  const skin = ['#e8b58c', '#d49a6a', '#b97a50', '#f0c8a0', '#a05c38'][h % 5];
  const hair = ['#2d2118', '#4a2c17', '#6b4423', '#1a1a2e', '#8a8a94'][(h >> 2) % 5];
  const traits = {
    bone: `<path d="M30 32 Q50 15 70 32 L70 38 L26 38 Z" fill="${st.color}" stroke="#1a1030" stroke-width="1.5"/>`,
    gravata: `<path d="M47 74 L50 92 L53 74 Z" fill="#f43f5e"/>`,
    coque: `<circle cx="50" cy="20" r="9" fill="${hair}"/>`,
    microfone: `<rect x="66" y="60" width="5" height="22" rx="2" fill="#cbd5e1"/><circle cx="68.5" cy="56" r="6" fill="#334155" stroke="#cbd5e1"/>`,
    oculos: `<g stroke="#1a1030" stroke-width="2.4" fill="rgba(255,255,255,.18)"><circle cx="42" cy="41" r="7"/><circle cx="58" cy="41" r="7"/><line x1="49" y1="41" x2="51" y2="41"/></g>`,
    chapeu: `<ellipse cx="50" cy="28" rx="24" ry="6" fill="${st.color}"/><rect x="38" y="12" width="24" height="16" rx="4" fill="${st.color}" stroke="#1a1030"/>`,
    celular: `<rect x="65" y="56" width="10" height="18" rx="2" fill="#111827" stroke="#7dd3fc" stroke-width="1.5"/>`,
  };
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="pbg${pid}" cx=".5" cy=".3">
        <stop offset="0" stop-color="${st.color}"/>
        <stop offset="1" stop-color="#312e81"/>
      </radialGradient>
      <linearGradient id="pcl${pid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${st.color}"/>
        <stop offset="1" stop-color="#1e1b4b"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="10" fill="url(#pbg${pid})"/>
    <circle cx="50" cy="30" r="30" fill="rgba(255,255,255,.14)"/>
    <path d="M32 30 Q50 10 68 30 L68 40 Q50 30 32 40 Z" fill="${hair}"/>
    <circle cx="50" cy="39" r="15" fill="${skin}"/>
    <circle cx="44" cy="38" r="1.8" fill="#1a1030"/><circle cx="56" cy="38" r="1.8" fill="#1a1030"/>
    <path d="M46 46 Q50 49 54 46" stroke="#1a1030" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <path d="M22 96 Q50 58 78 96 L78 100 L22 100 Z" fill="url(#pcl${pid})"/>
    <path d="M42 62 Q50 70 58 62 L58 74 L42 74 Z" fill="${skin}" opacity=".9"/>
    ${traits[st.trait] || ''}
    <rect width="100" height="100" rx="10" fill="none" stroke="${st.color}" stroke-width="2" stroke-opacity=".85"/>
  </svg>${overlay}`;
}
