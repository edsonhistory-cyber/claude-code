/**
 * screens/mural.js — Mural multi-caso: suspeição MMO (fatores do pack) e
 * conexões validadas pelo knowledge_graph (pack.knowledge_graph ou DATABASE).
 */
import { getModule } from '../database.js';
import { screenShell, el, toast, modal } from '../uiManager.js';
import { getCase, getPack, hasReq, addScore } from '../caseState.js';
import { computeSuspicion, hypothesisState } from '../deductionEngine.js';
import { portrait } from '../art.js';
import { sfx, ambience } from '../audioManager.js';

let linkFrom = null;
const POSTIT_COLORS = ['amarelo', 'azul', 'verde', 'rosa'];
let postitColor = 'amarelo'; // cor selecionada para o próximo post-it

function characterById(pid) {
  return (getPack().characters || []).find((p) => p.id === pid)
    || (getModule('SHERLOCK_ENGINE_PERSONAGENS')?.personagens || []).find((p) => p.id === pid);
}

export function render() {
  const { body } = screenShell('Mural', 'CENTRAL › MURAL DE INVESTIGAÇÃO');
  ambience('central');
  const s = getCase();
  const suspicion = computeSuspicion(getModule('SHERLOCK_ENGINE_DEDUCTION'));

  const top = el('div', 'panel mural-status');
  top.innerHTML = `<span>Hipótese principal: <b>${hypothesisState()}</b></span>
    <span>Contradições: <b>${s.contradictions.length}</b></span>
    <span>Conexões: <b>${s.muralLinks.length}</b></span>`;
  body.append(top);

  const grid = el('div', 'mural-suspects');
  for (const [pid, data] of Object.entries(suspicion)) {
    const p = characterById(pid);
    const card = el('div', `card mural-suspect${data.eliminated ? ' eliminated' : ''}`);
    card.innerHTML = `<div class="suspect-portrait">${portrait(pid)}</div>
      <b>${p?.nome || pid}</b><span class="muted">${p?.papel || ''}</span>
      <div class="stress-bar"><div class="stress-fill${data.score >= 60 ? ' hot' : ''}" style="width:${data.score}%"></div></div>
      <span class="mono">suspeição ${data.score}</span>
      ${data.details.map((d) => `<span class="mural-fact">${d}</span>`).join('')}
      ${data.eliminated ? `<span class="row-tag ok">eliminado: ${data.eliminated}</span>` : ''}`;
    grid.append(card);
  }
  body.append(grid);

  const kg = getPack().knowledge_graph || getModule('SHERLOCK_ENGINE_DATABASE')?.knowledge_graph || [];
  const clues = (getPack().mural_nodes || []).filter((n) => !n.need || hasReq(n.need));
  // suspeitos fixados no quadro (foto-polaroide arrastável e conectável)
  const pinned = (s.muralPinned || []).map((pid) => {
    const c = characterById(pid);
    return { id: pid, label: c?.nome || pid, kind: 'suspect' };
  });
  const nodes = [...clues.map((n) => ({ ...n, kind: 'clue' })), ...pinned];

  const linkPanel = el('div', 'panel list-panel');
  linkPanel.append(el('h2', 'panel-title', 'QUADRO DE INVESTIGAÇÃO'));
  linkPanel.append(el('p', 'muted', linkFrom
    ? `Origem: ${linkFrom.label}. Toque em outra pista para ligar…`
    : 'Arraste as pistas, fotos e post-its livremente. Toque em duas para ligá-las (conexões corretas valem +5).'));

  // barra de ferramentas do quadro
  const tools = el('div', 'mural-tools');
  const addPostit = el('button', 'btn btn-ghost', '✚ Post-it');
  addPostit.onclick = () => {
    s.muralPostits.push({ id: `pt${Date.now() % 1e7}`, x: 40, y: 38, text: '', color: postitColor });
    sfx('paper_flip'); render();
  };
  // seletor de cor do post-it
  const swatches = el('div', 'postit-colors');
  for (const c of POSTIT_COLORS) {
    const sw = el('button', `postit-swatch pc-${c}${postitColor === c ? ' sel' : ''}`);
    sw.title = `Post-it ${c}`;
    sw.onclick = () => { postitColor = c; render(); };
    swatches.append(sw);
  }
  const pinBtn = el('button', 'btn btn-ghost', '📌 Fixar suspeito');
  pinBtn.onclick = () => openSuspectPicker(s);
  tools.append(addPostit, swatches, pinBtn);
  linkPanel.append(tools);

  // posição default (grade) para nós ainda sem posição salva
  const cols = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(nodes.length || 1))));
  const rows = Math.max(1, Math.ceil((nodes.length || 1) / cols));
  const defPos = (i) => {
    const c = i % cols, r = Math.floor(i / cols);
    return [8 + c * (84 / cols) + (((i * 37) % 7) - 3), 10 + r * (72 / rows) + (((i * 53) % 7) - 3)];
  };
  const posOf = (node, i) => {
    const saved = s.muralPos[node.id];
    return saved ? [saved.x, saved.y] : defPos(i);
  };

  const board = el('div', 'cork-board');
  // fios das conexões
  const labelPos = {};
  nodes.forEach((n, i) => { const [x, y] = posOf(n, i); labelPos[n.label] = [x + 6, y + 4]; });
  const lines = s.muralLinks.map((key) => {
    const [la, lb] = key.split(' ↔ ');
    if (!labelPos[la] || !labelPos[lb]) return '';
    return `<line x1="${labelPos[la][0]}" y1="${labelPos[la][1]}" x2="${labelPos[lb][0]}" y2="${labelPos[lb][1]}"/>`;
  }).join('');
  board.innerHTML = `<svg class="threads" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">${lines}</svg>`;

  // nós (pistas + fotos de suspeitos) arrastáveis e conectáveis
  nodes.forEach((node, i) => {
    const [x, y] = posOf(node, i);
    let elem;
    if (node.kind === 'suspect') {
      elem = el('div', `board-item suspect-pin${linkFrom?.id === node.id ? ' active' : ''}`);
      elem.innerHTML = `<div class="suspect-portrait">${portrait(node.id)}</div><span>${node.label}</span>`;
    } else {
      elem = el('button', `btn chip pin-note n${i % 5} board-item${linkFrom?.id === node.id ? ' active' : ''}`, node.label);
    }
    elem.style.left = `${x}%`; elem.style.top = `${y}%`;
    makeDraggable(elem, board, (nx, ny) => { s.muralPos[node.id] = { x: nx, y: ny }; }, () => {
      // clique (sem arraste) = conectar
      sfx('click');
      if (!linkFrom) { linkFrom = node; render(); return; }
      if (linkFrom.id === node.id) { linkFrom = null; render(); return; }
      tryLink(linkFrom, node, kg, s);
      linkFrom = null; render();
    });
    board.append(elem);
  });

  // post-its de anotação livre
  (s.muralPostits || []).forEach((pt) => {
    const note = el('div', `board-item free-postit pc-${pt.color || 'amarelo'}`);
    note.style.left = `${pt.x}%`; note.style.top = `${pt.y}%`;
    const ta = el('textarea', 'postit-text');
    ta.value = pt.text; ta.placeholder = 'anotação…';
    ta.oninput = () => { pt.text = ta.value; };
    ta.onpointerdown = (e) => e.stopPropagation(); // digitar sem arrastar
    const del = el('button', 'postit-del', '×');
    del.onpointerdown = (e) => e.stopPropagation();
    del.onclick = () => { s.muralPostits = s.muralPostits.filter((p) => p.id !== pt.id); sfx('click'); render(); };
    note.append(del, ta);
    makeDraggable(note, board, (nx, ny) => { pt.x = nx; pt.y = ny; });
    board.append(note);
  });

  linkPanel.append(board);
  if (s.muralLinks.length) {
    const done = el('div', 'mural-links');
    for (const l of s.muralLinks) done.append(el('div', 'row-tag ok', `✔ ${l}`));
    linkPanel.append(done);
  }
  body.append(linkPanel);
}

/** Torna um elemento arrastável dentro do quadro (posições em %). Distingue
 *  clique de arraste por um limiar de movimento. */
function makeDraggable(elem, board, onMove, onClick) {
  let sx, sy, ox, oy, moved, rect;
  elem.onpointerdown = (e) => {
    if (e.button != null && e.button !== 0) return;
    rect = board.getBoundingClientRect();
    sx = e.clientX; sy = e.clientY; moved = false;
    ox = elem.offsetLeft; oy = elem.offsetTop;
    elem.setPointerCapture?.(e.pointerId);
    elem.classList.add('dragging');
    e.preventDefault();
  };
  elem.onpointermove = (e) => {
    if (rect == null) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (!moved && Math.hypot(dx, dy) < 5) return;
    moved = true;
    const nx = Math.max(0, Math.min(92, ((ox + dx) / rect.width) * 100));
    const ny = Math.max(0, Math.min(90, ((oy + dy) / rect.height) * 100));
    elem.style.left = `${nx}%`; elem.style.top = `${ny}%`;
  };
  elem.onpointerup = (e) => {
    if (rect == null) return;
    elem.classList.remove('dragging');
    const wasDrag = moved; rect = null;
    if (wasDrag) {
      const nx = parseFloat(elem.style.left), ny = parseFloat(elem.style.top);
      onMove?.(nx, ny);
    } else onClick?.();
  };
}

function openSuspectPicker(s) {
  const susp = (getPack().characters || []).filter((c) => /suspeit|red herring|vítima|vitima|anfitri/i.test(c.papel || ''));
  const wrap = el('div', 'suspect-picker');
  for (const c of susp) {
    const already = s.muralPinned.includes(c.id);
    const b = el('button', `card row-card${already ? ' locked' : ''}`);
    b.innerHTML = `<span class="suspect-portrait" style="width:40px">${portrait(c.id)}</span><b>${c.nome}</b><span class="muted">${c.papel}</span>`;
    if (!already) b.onclick = () => { s.muralPinned.push(c.id); sfx('paper_flip'); document.querySelector('.modal-overlay')?.remove(); render(); };
    wrap.append(b);
  }
  modal('Fixar foto no quadro', wrap, []);
}

function tryLink(a, b, kg, s) {
  const key = [a.label, b.label].join(' ↔ ');
  if (s.muralLinks.includes(key) || s.muralLinks.includes([b.label, a.label].join(' ↔ '))) {
    return toast('Conexão já registrada.', 'warn');
  }
  const valid = kg.some((e) => (e.from === a.id && e.to === b.id) || (e.from === b.id && e.to === a.id));
  if (valid) {
    s.muralLinks.push(key);
    addScore(5, `Conexão validada: ${key}`);
    sfx('success');
    toast(`📌 Conexão validada: ${key}`, 'success');
  } else {
    sfx('error');
    toast('O banco de dados não sustenta essa relação (ainda). Nada anotado.', 'warn');
  }
}
