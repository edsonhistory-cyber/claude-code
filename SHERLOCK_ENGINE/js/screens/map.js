/**
 * screens/map.js — Mapa da Linha Turismo: paradas do GEOINT.json, cena SVG por
 * local e hotspots de coleta (OBJETOS + area_states do world state).
 */
import { getModule } from '../database.js';
import { screenShell, el, toast, modal } from '../uiManager.js';
import { sceneArt } from '../art.js';
import { getCase, collectEvidence, unlockDocument, addScore } from '../caseState.js';
import { sfx, ambience } from '../audioManager.js';

// Hotspots por parada (derivados de OBJETOS/EVENTS/WORLD/area_states)
const HOTSPOTS = {
  R24: [
    { id: 'bilheteria', nome: 'Bilheteria (Dília Karas)', desc: 'A cobradora guarda o manifesto de passageiros.', action: (s) => { if (unlockDocument('DOC003')) { toast('📄 Manifesto da Linha Turismo obtido (DOC003)', 'success'); } else toast('O manifesto já está com você.'); } },
    { id: 'cam001', nome: 'Câmera CAM001 — Entrada', desc: 'Cobre o embarque das 14:00.', action: () => toast('Registro das 14:00: todos os passageiros embarcaram. Nada anômalo.') },
  ],
  JB: [
    { id: 'estufa', nome: 'Estufa e canteiros', desc: 'Wanda examinava as plantas por aqui.', action: (s) => { if (!s.flags.planta_vista) { s.flags.planta_vista = true; addScore(5, 'Planta Espirradeira observada'); } toast('🌿 Espirradeira (Nerium oleander): tóxica. Wanda a apontou para o grupo — anote no mural.'); } },
    { id: 'discussao', nome: 'Local da discussão', desc: 'Aldo e Otávio discutiram aqui às 15:20.', action: (s) => { s.flags.discussao_vista = true; toast('Testemunhas ouviram Aldo gritar sobre "sociedade roubada". Ele saiu em seguida.'); } },
  ],
  MON: [
    { id: 'espelho', nome: 'Espelho d’água', desc: 'Bianca filmava o "olho" às 15:35.', action: () => toast('🎥 Bianca filmou o grupo aqui. O vídeo pode conter algo — fale com ela nos Interrogatórios.') },
    { id: 'klaus', nome: 'Homem de sobretudo', desc: 'Um passageiro fotografava discretamente.', action: (s) => { s.flags.klaus_visto = true; toast('“Klaus Vogel” fotografava Otávio em segredo. Interrogue-o.'); } },
  ],
  BUS: [
    { id: 'portavolumes', nome: 'Porta-volumes', desc: 'A garrafa térmica de Otávio viajava aqui.', action: (s) => { if (collectEvidence('EV001', 'Garrafa térmica')) toast('🧾 EV001 Garrafa térmica coletada — envie ao Laboratório.', 'success'); else toast('A garrafa já foi recolhida pela perícia.'); } },
    { id: 'cabine', nome: 'Cabine do motorista', desc: 'O tacógrafo registra cada parada.', action: (s) => { if (collectEvidence('EV004', 'Tacógrafo')) { unlockDocument('DOC004'); toast('🧾 EV004 Tacógrafo coletado. Disco digitalizado (DOC004) disponível.', 'success'); } else toast('O tacógrafo já está na Central.'); } },
    { id: 'assento', nome: 'Assento 5 (Renata)', desc: 'Gravador e blocos de nota.', action: (s) => { if (unlockDocument('DOC009')) toast('📄 Transcrição de escuta obtida (DOC009): "Otávio assinaria a delação amanhã."', 'success'); else toast('Nada de novo no assento.'); } },
  ],
  KM18: [
    { id: 'acostamento', nome: 'Acostamento', desc: 'Marcas de pneu e uma pegada de tênis.', action: (s) => { s.flags.pegada_vista = true; addScore(5, 'Pegada fotografada'); sfx('camera_shutter'); toast('📷 Pegada de tênis fotografada. Solo intacto além dela: ninguém desceu além do motorista.'); } },
    { id: 'placa', nome: 'Placa KM 18', desc: 'Ponto exato da parada não programada.', action: (s) => { s.flags.km18_confirmado = true; toast('📍 Posição registrada. Compare com o tacógrafo no GEOINT.'); } },
  ],
  OPA: [
    { id: 'palco', nome: 'Palco e passarela', desc: 'Parada das 16:05 — sem incidentes.', action: () => toast('O guia confirma: passeio normal aqui. Otávio bebia café da própria garrafa.') },
  ],
  BAR: [
    { id: 'lixeira', nome: 'Lixeira próxima ao lago', desc: 'Uma testemunha viu algo azul ser descartado às 16:45.', action: (s) => { if (collectEvidence('EV002', 'Luvas nitrílicas azuis')) toast('🧾 EV002 Luvas nitrílicas azuis coletadas na lixeira!', 'success'); else toast('A lixeira já foi vasculhada.'); } },
    { id: 'capivaras', nome: 'Capivaras do lago', desc: 'Impassíveis, como sempre.', action: () => toast('🦫 As capivaras não colaboram com a investigação.') },
  ],
  TAN: [
    { id: 'mirante', nome: 'Mirante — cena da morte', desc: 'Otávio caiu aqui às 17:50.', action: (s) => { if (unlockDocument('DOC001')) toast('📄 Laudo cadavérico preliminar (DOC001): intoxicação por glicosídeo cardíaco.', 'success'); else toast('A cena já foi periciada e está lacrada.'); } },
    { id: 'xicara', nome: 'Copo térmico da vítima', desc: 'Caído junto ao corpo.', action: (s) => { s.flags.xicara_vista = true; toast('☕ Resíduo de café no copo. A garrafa é a origem provável — confirme na Toxicologia.'); } },
  ],
};

const STOP_SCENE = { R24: 'rua 24 horas', JB: 'jardim botânico', MON: 'mon', KM18: 'km18', OPA: 'ópera de arame', BAR: 'parque barigui', TAN: 'parque tanguá', BUS: 'ônibus' };
const STOP_AMB = { R24: 'cidade', JB: 'parque', MON: 'cidade', KM18: 'cidade', OPA: 'parque', BAR: 'agua', TAN: 'agua', BUS: 'cidade' };

export function render() {
  const { body } = screenShell('Mapa', 'CENTRAL › MAPA — LINHA TURISMO');
  ambience('cidade');
  const geo = getModule('SHERLOCK_ENGINE_GEOINT');
  const stops = [...(geo?.route?.stops || [])];
  // pátio da perícia: o ônibus apreendido é visitável
  stops.splice(4, 0, { id: 'BUS', name: 'Ônibus (pátio da perícia)', time: '—' });

  const wrap = el('div', 'map-wrap');
  const svgBox = el('div', 'panel map-canvas');
  svgBox.innerHTML = routeSvg(stops);
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

  svgBox.querySelectorAll('[data-stop]').forEach((n) => {
    n.style.cursor = 'pointer';
    n.onclick = () => { const stop = stops.find((x) => x.id === n.dataset.stop); if (stop) openLocation(stop); };
  });
}

function routeSvg(stops) {
  // traçado estilizado da rota (posições aproximadas, projeção livre)
  const pos = { R24: [70, 200], JB: [150, 235], MON: [205, 130], BUS: [280, 210], KM18: [320, 90], OPA: [235, 60], BAR: [110, 70], TAN: [165, 30] };
  const order = ['R24', 'JB', 'MON', 'KM18', 'OPA', 'BAR', 'TAN'];
  const path = order.map((id, i) => `${i ? 'L' : 'M'}${pos[id][0]} ${pos[id][1]}`).join(' ');
  return `<svg viewBox="0 0 400 270" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="270" fill="#0a1a2a"/>
    ${[40, 90, 140, 190, 240].map((y) => `<line x1="0" y1="${y}" x2="400" y2="${y}" stroke="#10263a" stroke-width="1"/>`).join('')}
    ${[60, 130, 200, 270, 340].map((x) => `<line x1="${x}" y1="0" x2="${x}" y2="270" stroke="#10263a" stroke-width="1"/>`).join('')}
    <path d="${path}" fill="none" stroke="#2F8B57" stroke-width="4" stroke-dasharray="1 7" stroke-linecap="round"/>
    ${stops.filter((s) => pos[s.id]).map((s) => {
      const [x, y] = pos[s.id];
      const danger = s.id === 'KM18';
      return `<g data-stop="${s.id}">
        <circle cx="${x}" cy="${y}" r="11" fill="${danger ? 'rgba(192,57,43,.25)' : 'rgba(0,194,255,.15)'}" stroke="${danger ? '#C0392B' : '#00C2FF'}" stroke-width="2"/>
        <text x="${x}" y="${y + 26}" font-size="9" fill="#F2F5F7" text-anchor="middle" font-family="monospace">${s.id}</text>
      </g>`;
    }).join('')}
  </svg>`;
}

function openLocation(stop) {
  sfx('door_open');
  const s = getCase();
  if (!s.visited.includes(stop.id)) s.visited.push(stop.id);
  ambience(STOP_AMB[stop.id] || 'cidade');

  const content = el('div', 'location-view');
  content.innerHTML = `<div class="location-art">${sceneArt(STOP_SCENE[stop.id] || stop.name)}</div>`;
  const spots = el('div', 'hotspots');
  for (const h of HOTSPOTS[stop.id] || []) {
    const b = el('button', 'card hotspot');
    b.innerHTML = `<b>${h.nome}</b><span>${h.desc}</span>`;
    b.onclick = () => { sfx('scanner'); h.action(s); };
    spots.append(b);
  }
  if (!(HOTSPOTS[stop.id] || []).length) spots.append(el('p', 'muted', 'Nada de relevante neste ponto.'));
  content.append(spots);
  modal(`${stop.name} · ${stop.time}`, content, []);
}
