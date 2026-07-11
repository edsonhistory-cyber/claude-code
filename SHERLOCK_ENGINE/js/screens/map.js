/**
 * screens/map.js — Mapa do caso ativo: paradas, rota e hotspots vêm do
 * CONTENT_PACK (multi-caso). Ações de hotspot: doc | evidence | flag | note.
 */
import { screenShell, el, toast, modal } from '../uiManager.js';
import { sceneMedia } from '../art.js';
import { getCase, getPack, collectEvidence, unlockDocument, addScore } from '../caseState.js';
import { sfx, ambience } from '../audioManager.js';

export async function render() {
  const pack = getPack();
  const { body } = screenShell('Mapa', `CENTRAL › MAPA — ${pack.map_title || 'ROTA DO CASO'}`);
  ambience('cidade');
  const stops = pack.stops || [];

  const wrap = el('div', 'map-wrap');
  const svgBox = el('div', 'panel map-canvas');
  svgBox.innerHTML = routeSvg(stops); // fallback imediato (sem rede)
  const list = el('div', 'map-stops');
  for (const stop of stops) {
    const visited = getCase().visited.includes(stop.id);
    const b = el('button', `card stop-card${visited ? ' visited' : ''}`);
    b.innerHTML = `<span class="stop-time">${stop.time}</span><span class="stop-name">${stop.name}</span>${visited ? '<span class="stop-check">✔</span>' : ''}`;
    b.onclick = () => openLocation(stop);
    list.append(b);
  }
  wrap.append(svgBox, list);
  body.append(wrap);

  const bind = () => svgBox.querySelectorAll('[data-stop]').forEach((n) => {
    n.style.cursor = 'pointer';
    n.onclick = () => { const stop = stops.find((x) => x.id === n.dataset.stop); if (stop) openLocation(stop); };
  });
  bind();

  // Mapa REAL (OpenStreetMap baixado na build): troca o desenho pelo mapa de
  // ruas de Curitiba com as paradas nas coordenadas geográficas verdadeiras.
  const geoStops = stops.filter((s) => s.geo);
  if (pack.map_geo && geoStops.length) {
    const meta = await fetch(pack.map_geo.meta).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (meta) {
      svgBox.innerHTML = realMap(pack.map_geo.image, meta, stops);
      const img = svgBox.querySelector('.map-photo');
      img.onerror = () => { svgBox.innerHTML = routeSvg(stops); bind(); };
      bind();
    }
  }
}

// Projeção Web Mercator: lat/lon → % dentro da imagem do mapa estático
function proj(lat, lon, meta) {
  const n = 256 * 2 ** meta.zoom;
  const px = (v) => ((v + 180) / 360) * n;
  const py = (la) => {
    const r = (la * Math.PI) / 180;
    return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n;
  };
  const x = ((px(lon) - px(meta.center[1])) / meta.size) * 100 + 50;
  const y = ((py(lat) - py(meta.center[0])) / meta.size) * 100 + 50;
  return [x, y];
}

function realMap(image, meta, stops) {
  const s = getCase();
  const pts = stops.filter((st) => st.geo).map((st) => ({ st, p: proj(st.geo[0], st.geo[1], meta) }));
  const route = pts.filter(({ st }) => !st.off_route).map(({ p }, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ');
  return `<div class="map-real">
    <img class="map-photo" src="${image}" alt="Mapa de Curitiba (OpenStreetMap)">
    <svg class="map-route" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <path d="${route}" fill="none" stroke="#0f8a4d" stroke-width=".7" stroke-linejoin="round" stroke-linecap="round" opacity=".35"/>
      <path d="${route}" fill="none" stroke="#2fbf6e" stroke-width=".3" stroke-dasharray="1.2 1.1" stroke-linecap="round" opacity=".9"/>
    </svg>
    ${pts.map(({ st, p }) => `
      <button class="map-pin${st.danger ? ' danger' : ''}${s.visited.includes(st.id) ? ' visited' : ''}"
              style="left:${p[0]}%; top:${p[1]}%" data-stop="${st.id}" title="${st.name}">
        <span class="pin-head"></span><span class="pin-label">${st.id}</span>
      </button>`).join('')}
    <span class="map-attrib">© OpenStreetMap contributors · ODbL</span>
  </div>`;
}

function routeSvg(stops) {
  const onRoute = stops.filter((s) => !s.off_route && s.pos);
  const path = onRoute.map((s, i) => `${i ? 'L' : 'M'}${s.pos[0]} ${s.pos[1]}`).join(' ');
  return `<svg viewBox="0 0 400 270" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="270" fill="#0a1a2a"/>
    ${[40, 90, 140, 190, 240].map((y) => `<line x1="0" y1="${y}" x2="400" y2="${y}" stroke="#10263a" stroke-width="1"/>`).join('')}
    ${[60, 130, 200, 270, 340].map((x) => `<line x1="${x}" y1="0" x2="${x}" y2="270" stroke="#10263a" stroke-width="1"/>`).join('')}
    <path d="${path}" fill="none" stroke="#2F8B57" stroke-width="4" stroke-dasharray="1 7" stroke-linecap="round"/>
    ${stops.filter((s) => s.pos).map((s) => `<g data-stop="${s.id}">
        <circle cx="${s.pos[0]}" cy="${s.pos[1]}" r="11" fill="${s.danger ? 'rgba(192,57,43,.25)' : 'rgba(0,194,255,.15)'}" stroke="${s.danger ? '#C0392B' : '#00C2FF'}" stroke-width="2"/>
        <text x="${s.pos[0]}" y="${s.pos[1] + 26}" font-size="9" fill="#F2F5F7" text-anchor="middle" font-family="monospace">${s.id}</text>
      </g>`).join('')}
  </svg>`;
}

function runAction(action, s) {
  sfx(action.sfx || 'scanner');
  switch (action.type) {
    case 'evidence': {
      if (collectEvidence(action.id, action.nome)) {
        if (action.doc) unlockDocument(action.doc);
        toast(action.toast, 'success');
      } else toast(action.already || 'Nada de novo aqui.');
      break;
    }
    case 'doc': {
      if (unlockDocument(action.id)) toast(action.toast, 'success');
      else toast(action.already || 'Documento já arquivado.');
      break;
    }
    case 'flag': {
      if (action.flag && !s.flags[action.flag]) {
        s.flags[action.flag] = true;
        if (action.score) addScore(action.score, action.reason || action.flag);
      }
      toast(action.toast);
      break;
    }
    default:
      toast(action.toast);
  }
}

function openLocation(stop) {
  sfx('door_open');
  const s = getCase();
  if (!s.visited.includes(stop.id)) s.visited.push(stop.id);
  ambience(stop.ambience || 'cidade');

  const content = el('div', 'location-view');
  content.innerHTML = `<div class="location-art">${sceneMedia(stop.scene || stop.name)}</div>`;
  const spots = el('div', 'hotspots');
  for (const h of (getPack().hotspots || {})[stop.id] || []) {
    const b = el('button', 'card hotspot');
    b.innerHTML = `<b>${h.nome}</b><span>${h.desc}</span>`;
    b.onclick = () => runAction(h.action, s);
    spots.append(b);
  }
  if (!spots.children.length) spots.append(el('p', 'muted', 'Nada de relevante neste ponto.'));
  content.append(spots);
  modal(`${stop.name} · ${stop.time}`, content, []);
}
