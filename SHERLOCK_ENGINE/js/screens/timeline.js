/**
 * screens/timeline.js — Linha do tempo: ordenar os 8 eventos do caso
 * (CASE001_EVENTS_FULL.timeline). Ordem correta → +80 pts (GAMEPLAY.score).
 */
import { getModule } from '../database.js';
import { screenShell, el, toast } from '../uiManager.js';
import { getCase, completeTimeline, addScore } from '../caseState.js';
import { sfx, ambience } from '../audioManager.js';

let pool = null;   // eventos ainda não posicionados (embaralhados)
let placed = [];   // eventos posicionados na ordem escolhida

export function render() {
  const { body } = screenShell('Linha do Tempo', 'CENTRAL › LINHA DO TEMPO');
  ambience('central');
  const s = getCase();
  const events = getModule('CASE_EVENTS')?.timeline || [];

  if (s.timelineDone) {
    const done = el('div', 'panel timeline-done');
    done.append(el('h2', 'panel-title', '✔ CRONOLOGIA RECONSTRUÍDA'));
    const list = el('ol', 'timeline-final');
    for (const evt of events) list.append(el('li', '', `<b class="mono">${evt.time}</b> ${evt.title} <span class="muted">· ${evt.location}</span>`));
    done.append(list);
    body.append(done);
    return;
  }

  if (!pool) { pool = [...events].sort(() => 0.5 - Math.random()); placed = []; }

  const wrap = el('div', 'two-col');
  const left = el('section', 'panel list-panel');
  left.append(el('h2', 'panel-title', 'EVENTOS FORA DE ORDEM'));
  left.append(el('p', 'muted', 'Clique nos eventos na ordem em que aconteceram. Os horários estão ocultos — use o que você descobriu.'));
  for (const evt of pool) {
    const b = el('button', 'card row-card', `<b>${evt.title}</b><span class="muted">${evt.location}</span>`);
    b.onclick = () => { sfx('click'); pool = pool.filter((x) => x.id !== evt.id); placed.push(evt); render(); };
    left.append(b);
  }

  const right = el('section', 'panel list-panel');
  right.append(el('h2', 'panel-title', `SUA CRONOLOGIA (${placed.length}/${events.length})`));
  placed.forEach((evt, i) => {
    const row = el('div', 'card row-card placed');
    row.innerHTML = `<span class="row-id">${i + 1}º</span><b>${evt.title}</b>`;
    const undo = el('button', 'btn btn-ghost', '↩');
    undo.onclick = () => { placed = placed.filter((x) => x.id !== evt.id); pool.push(evt); render(); };
    row.append(undo);
    right.append(row);
  });
  if (placed.length === events.length) {
    const check = el('button', 'btn btn-primary', 'VALIDAR CRONOLOGIA');
    check.onclick = () => {
      const ok = placed.every((evt, i) => evt.id === events[i].id);
      if (ok) { completeTimeline(); sfx('success'); toast('🕑 Linha do tempo correta! +80 pontos.', 'success'); pool = null; render(); }
      else { addScore(-20, 'Cronologia incorreta'); sfx('error'); toast('Há eventos fora de ordem. Revise depoimentos e o tacógrafo. (-20)', 'warn'); pool = [...placed, ...pool].sort(() => 0.5 - Math.random()); placed = []; render(); }
    };
    right.append(check);
  }
  wrap.append(left, right);
  body.append(wrap);
}
