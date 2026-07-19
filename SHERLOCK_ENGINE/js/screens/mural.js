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
let linkMode = false; // rolo de linha ativo: cliques conectam em vez de nada
const POSTIT_COLORS = ['amarelo', 'azul', 'verde', 'rosa'];
let postitColor = 'amarelo'; // cor selecionada para o próximo post-it

function characterById(pid) {
  return (getPack().characters || []).find((p) => p.id === pid)
    || (getModule('SHERLOCK_ENGINE_PERSONAGENS')?.personagens || []).find((p) => p.id === pid);
}

// botão de deletar padrão (aparece no hover; não inicia arraste nem conexão)
function delBtn(onDel) {
  const b = el('button', 'board-del', '×');
  b.title = 'Remover do quadro';
  b.setAttribute('aria-label', 'Remover do quadro');
  b.onpointerdown = (e) => e.stopPropagation();
  b.onclick = (e) => { e.stopPropagation(); onDel(); };
  return b;
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
  const hidden = s.muralHidden || (s.muralHidden = []);
  const clues = (getPack().mural_nodes || []).filter((n) => (!n.need || hasReq(n.need)) && !hidden.includes(n.id));
  // suspeitos fixados no quadro (foto-polaroide arrastável e conectável)
  const pinned = (s.muralPinned || []).map((pid) => {
    const c = characterById(pid);
    return { id: pid, label: c?.nome || pid, kind: 'suspect' };
  });
  const nodes = [...clues.map((n) => ({ ...n, kind: 'clue' })), ...pinned];

  const linkPanel = el('div', 'panel list-panel');
  linkPanel.append(el('h2', 'panel-title', 'QUADRO DE INVESTIGAÇÃO'));
  linkPanel.append(el('p', 'muted', linkMode
    ? (linkFrom ? `🧶 Fio preso em "${linkFrom.label}". Toque em outra pista para amarrar…` : '🧶 Modo linha ativo: toque numa pista e depois em outra para ligá-las (+5).')
    : 'Arraste as pistas, fotos e post-its livremente. Ative o 🧶 rolo de linha para conectar.'));

  // barra de ferramentas do quadro
  const tools = el('div', 'mural-tools');
  const yarnBtn = el('button', `btn ${linkMode ? 'btn-primary' : 'btn-ghost'}`, '🧶 Rolo de linha');
  yarnBtn.title = 'Ligar evidências com o fio vermelho';
  yarnBtn.onclick = () => { linkMode = !linkMode; linkFrom = null; sfx('click'); render(); };
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
  // upload de imagem (arquivo) — reduzida e salva no quadro
  const imgBtn = el('button', 'btn btn-ghost', '🖼 Imagem');
  const fileIn = el('input', 'hidden-file'); fileIn.type = 'file'; fileIn.accept = 'image/*';
  fileIn.onchange = () => { if (fileIn.files[0]) addPhoto(s, fileIn.files[0]); fileIn.value = ''; };
  imgBtn.onclick = () => fileIn.click();
  imgBtn.title = 'Carregar um print/foto (fica pequeno no quadro)';
  tools.append(yarnBtn, addPostit, swatches, imgBtn, pinBtn, fileIn);
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
  board.innerHTML = `<svg class="threads" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">${lines}<line class="live-thread" x1="0" y1="0" x2="0" y2="0" style="display:none"/></svg>`;
  if (linkMode) board.classList.add('link-mode');
  const liveThread = board.querySelector('.live-thread');
  // fio vermelho ao vivo seguindo o cursor a partir da origem selecionada
  if (linkMode && linkFrom && labelPos[linkFrom.label]) {
    board.onpointermove = (e) => {
      const r = board.getBoundingClientRect();
      const mx = ((e.clientX - r.left) / r.width) * 100;
      const my = ((e.clientY - r.top) / r.height) * 100;
      liveThread.setAttribute('x1', labelPos[linkFrom.label][0]);
      liveThread.setAttribute('y1', labelPos[linkFrom.label][1]);
      liveThread.setAttribute('x2', mx); liveThread.setAttribute('y2', my);
      liveThread.style.display = '';
    };
  }

  // nós (pistas + fotos de suspeitos) arrastáveis e conectáveis
  nodes.forEach((node, i) => {
    const [x, y] = posOf(node, i);
    let elem;
    if (node.kind === 'suspect') {
      elem = el('div', `board-item suspect-pin${linkFrom?.id === node.id ? ' active' : ''}`);
      elem.innerHTML = `<div class="suspect-portrait">${portrait(node.id)}</div><span>${node.label}</span>`;
      elem.append(delBtn(() => {
        s.muralPinned = s.muralPinned.filter((p) => p !== node.id);
        delete s.muralPos[node.id];
        sfx('click'); render();
      }));
    } else {
      elem = el('div', `pin-note chip n${i % 5} board-item${linkFrom?.id === node.id ? ' active' : ''}`);
      elem.innerHTML = `<span class="pin-label">${node.label}</span>`;
      elem.append(delBtn(() => { hidden.push(node.id); sfx('click'); render(); }));
    }
    elem.style.left = `${x}%`; elem.style.top = `${y}%`;
    makeDraggable(elem, board, (nx, ny) => { s.muralPos[node.id] = { x: nx, y: ny }; }, () => {
      // clique (sem arraste): só conecta com o rolo de linha ativo
      if (!linkMode) return;
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
    note.append(delBtn(() => { s.muralPostits = s.muralPostits.filter((p) => p.id !== pt.id); sfx('click'); render(); }), ta);
    makeDraggable(note, board, (nx, ny) => { pt.x = nx; pt.y = ny; });
    board.append(note);
  });

  // fotos/prints carregados pelo jogador
  (s.muralPhotos || []).forEach((ph) => {
    const item = el('div', 'board-item board-photo');
    item.style.left = `${ph.x}%`; item.style.top = `${ph.y}%`;
    item.innerHTML = `<img src="${ph.src}" alt="foto do quadro"><span class="board-photo-zoom">🔍</span>`;
    item.append(delBtn(() => { s.muralPhotos = s.muralPhotos.filter((p) => p.id !== ph.id); sfx('click'); render(); }));
    makeDraggable(item, board,
      (nx, ny) => { ph.x = nx; ph.y = ny; },
      () => openImageZoom(ph.src));   // clique (sem arraste) amplia para analisar
    board.append(item);
  });

  // colar imagem (Ctrl+V) diretamente no quadro
  board.onpaste = (e) => {
    const it = [...(e.clipboardData?.items || [])].find((x) => x.type.startsWith('image/'));
    if (it) { addPhoto(s, it.getAsFile()); e.preventDefault(); }
  };
  board.tabIndex = 0; // recebe foco p/ o paste

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

// Reduz a imagem (máx. 200px) e a guarda como data URL no quadro — mantém o
// save leve mesmo com prints grandes.
function addPhoto(s, file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const max = 1000, scale = Math.min(1, max / Math.max(img.width, img.height)); // res. maior p/ zoom
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * scale); cv.height = Math.round(img.height * scale);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      const src = cv.toDataURL('image/jpeg', 0.72);
      s.muralPhotos.push({ id: `ph${Date.now() % 1e7}`, x: 42, y: 40, src });
      sfx('camera_shutter'); render();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

// Lightbox com zoom (＋/－, roda do mouse, arrastar p/ mover) para analisar prints.
function openImageZoom(src) {
  const ov = el('div', 'img-zoom-overlay');
  ov.innerHTML = `
    <div class="img-zoom-stage"><img class="img-zoom-img" src="${src}" alt="imagem ampliada" draggable="false"></div>
    <div class="img-zoom-bar">
      <button class="btn btn-ghost" data-z="out" title="Diminuir (−)">－</button>
      <button class="btn btn-ghost" data-z="reset" title="100%">100%</button>
      <button class="btn btn-ghost" data-z="in" title="Aumentar (+)">＋</button>
      <button class="btn btn-primary" data-z="close" title="Fechar (Esc)">✕ Fechar</button>
    </div>
    <div class="img-zoom-hint">roda / pinça: zoom · arraste: mover · toque duplo: 2× · Esc: fechar</div>`;
  document.body.append(ov);
  const img = ov.querySelector('.img-zoom-img');
  const stage = ov.querySelector('.img-zoom-stage');
  const label = ov.querySelector('[data-z="reset"]');
  let scale = 1, tx = 0, ty = 0;
  const apply = () => { img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`; label.textContent = Math.round(scale * 100) + '%'; };
  const zoom = (f) => { scale = Math.min(10, Math.max(1, scale * f)); if (scale === 1) { tx = 0; ty = 0; } apply(); };
  const close = () => { ov.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
    else if (e.key === '+' || e.key === '=') zoom(1.25);
    else if (e.key === '-' || e.key === '_') zoom(0.8);
  };
  ov.querySelector('[data-z="in"]').onclick = () => zoom(1.25);
  ov.querySelector('[data-z="out"]').onclick = () => zoom(0.8);
  ov.querySelector('[data-z="reset"]').onclick = () => { scale = 1; tx = 0; ty = 0; apply(); };
  ov.querySelector('[data-z="close"]').onclick = close;
  ov.onclick = (e) => { if (e.target === ov || e.target === stage) close(); };
  document.addEventListener('keydown', onKey);
  stage.onwheel = (e) => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.15 : 0.87); };

  // arraste (1 dedo/mouse) + pinça (2 dedos) + toque duplo (celular)
  const pts = new Map();        // pointerId -> {x,y}
  let px = 0, py = 0, pinchD = 0, lastTap = 0;
  const dist = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  img.onpointerdown = (e) => {
    img.setPointerCapture?.(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) {
      px = e.clientX; py = e.clientY;
      const now = e.timeStamp;                 // toque duplo → alterna 1×/2×
      if (now - lastTap < 300) { scale = scale > 1 ? 1 : 2.4; if (scale === 1) { tx = 0; ty = 0; } apply(); }
      lastTap = now;
    } else if (pts.size === 2) { pinchD = dist(); }
    e.preventDefault();
  };
  img.onpointermove = (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size >= 2) {
      const d = dist();
      if (pinchD) zoom(d / pinchD);
      pinchD = d;
    } else {
      tx += e.clientX - px; ty += e.clientY - py; px = e.clientX; py = e.clientY; apply();
    }
  };
  const endPtr = (e) => { pts.delete(e.pointerId); pinchD = 0; if (pts.size === 1) { const p = [...pts.values()][0]; px = p.x; py = p.y; } };
  img.onpointerup = endPtr;
  img.onpointercancel = endPtr;
  sfx('camera_shutter'); apply();
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
