/**
 * screens/mural.js — Mural multi-caso: suspeição MMO (fatores do pack) e
 * conexões validadas pelo knowledge_graph (pack.knowledge_graph ou DATABASE).
 */
import { getModule } from '../database.js';
import { screenShell, el, toast } from '../uiManager.js';
import { getCase, getPack, hasReq, addScore } from '../caseState.js';
import { computeSuspicion, hypothesisState } from '../deductionEngine.js';
import { portrait } from '../art.js';
import { sfx, ambience } from '../audioManager.js';

let linkFrom = null;

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
  const nodes = (getPack().mural_nodes || []).filter((n) => !n.need || hasReq(n.need));
  const linkPanel = el('div', 'panel list-panel');
  linkPanel.append(el('h2', 'panel-title', 'QUADRO DE CONEXÕES — CONECTAR PISTAS'));
  linkPanel.append(el('p', 'muted', linkFrom ? `Origem: ${linkFrom.label}. Escolha o destino…` : 'Pregue duas pistas com a linha vermelha. Conexões corretas valem +5.'));

  // quadro de cortiça: notas pregadas numa grade fixa (em %) + linhas vermelhas.
  // Layout determinístico garante que as notas fiquem SEMPRE dentro do quadro.
  const cols = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(nodes.length))));
  const rows = Math.max(1, Math.ceil(nodes.length / cols));
  const posByIdx = (i) => {
    const c = i % cols, r = Math.floor(i / cols);
    const jx = ((i * 37) % 7) - 3;   // leve variação orgânica (-3..3)
    const jy = ((i * 53) % 7) - 3;
    return [8 + c * (84 / cols) + jx, 10 + r * (78 / rows) + jy];
  };
  const idx = new Map(nodes.map((n, i) => [n.id, i]));
  const board = el('div', 'cork-board');
  const lines = s.muralLinks.map((key) => {
    const [la, lb] = key.split(' ↔ ');
    const a = nodes.find((n) => n.label === la);
    const b = nodes.find((n) => n.label === lb);
    if (!a || !b) return '';
    const [ax, ay] = posByIdx(idx.get(a.id)); const [bx, by] = posByIdx(idx.get(b.id));
    return `<line x1="${ax + 6}" y1="${ay + 4}" x2="${bx + 6}" y2="${by + 4}"/>`;
  }).join('');
  board.innerHTML = `<svg class="threads" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">${lines}</svg>`;
  nodes.forEach((node, i) => {
    const [x, y] = posByIdx(i);
    const chip = el('button', `btn chip pin-note n${i % 5}${linkFrom?.id === node.id ? ' active' : ''}`, node.label);
    chip.style.left = `${x}%`;
    chip.style.top = `${y}%`;
    chip.onclick = () => {
      sfx('click');
      if (!linkFrom) { linkFrom = node; render(); return; }
      if (linkFrom.id === node.id) { linkFrom = null; render(); return; }
      tryLink(linkFrom, node, kg, s);
      linkFrom = null;
      render();
    };
    board.append(chip);
  });
  linkPanel.append(board);
  if (s.muralLinks.length) {
    const done = el('div', 'mural-links');
    for (const l of s.muralLinks) done.append(el('div', 'row-tag ok', `✔ ${l}`));
    linkPanel.append(done);
  }
  body.append(linkPanel);
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
