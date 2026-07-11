/**
 * screens/mural.js — Mural de investigação: suspeição MMO por suspeito
 * (deductionEngine) + conexões entre pistas validadas pelo knowledge_graph.
 */
import { getModule } from '../database.js';
import { screenShell, el, toast } from '../uiManager.js';
import { getCase, addScore } from '../caseState.js';
import { computeSuspicion, hypothesisState } from '../deductionEngine.js';
import { portrait } from '../art.js';
import { sfx, ambience } from '../audioManager.js';

let linkFrom = null;

export function render() {
  const { body } = screenShell('Mural', 'CENTRAL › MURAL DE INVESTIGAÇÃO');
  ambience('central');
  const s = getCase();
  const deduction = getModule('SHERLOCK_ENGINE_DEDUCTION');
  const suspicion = computeSuspicion(deduction);
  const people = getModule('SHERLOCK_ENGINE_PERSONAGENS')?.personagens || [];

  const top = el('div', 'panel mural-status');
  top.innerHTML = `<span>Hipótese principal: <b>${hypothesisState()}</b></span>
    <span>Contradições: <b>${s.contradictions.length}</b></span>
    <span>Conexões: <b>${s.muralLinks.length}</b></span>`;
  body.append(top);

  // ── suspeitos com barra MMO ──
  const grid = el('div', 'mural-suspects');
  for (const [pid, data] of Object.entries(suspicion)) {
    const p = people.find((x) => x.id === pid);
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

  // ── conexões entre pistas (validação pelo knowledge_graph) ──
  const kg = getModule('SHERLOCK_ENGINE_DATABASE')?.knowledge_graph || [];
  const nodes = availableNodes(s);
  const linkPanel = el('div', 'panel list-panel');
  linkPanel.append(el('h2', 'panel-title', 'CONECTAR PISTAS'));
  linkPanel.append(el('p', 'muted', linkFrom ? `Origem: ${linkFrom.label}. Escolha o destino…` : 'Escolha duas pistas para propor uma conexão. Conexões corretas valem +5.'));
  const chipRow = el('div', 'chip-row');
  for (const node of nodes) {
    const chip = el('button', `btn chip${linkFrom?.id === node.id ? ' active' : ''}`, node.label);
    chip.onclick = () => {
      sfx('click');
      if (!linkFrom) { linkFrom = node; render(); return; }
      if (linkFrom.id === node.id) { linkFrom = null; render(); return; }
      tryLink(linkFrom, node, kg, s);
      linkFrom = null;
      render();
    };
    chipRow.append(chip);
  }
  linkPanel.append(chipRow);
  if (s.muralLinks.length) {
    const done = el('div', 'mural-links');
    for (const l of s.muralLinks) done.append(el('div', 'row-tag ok', `✔ ${l}`));
    linkPanel.append(done);
  }
  body.append(linkPanel);
}

function availableNodes(s) {
  const nodes = [];
  const has = (id) => s.collected.includes(id);
  if (has('EV001')) nodes.push({ id: 'OBJ001', label: 'Garrafa térmica' }, { id: 'EV001', label: 'Veneno no café' });
  if (has('EV002')) nodes.push({ id: 'OBJ003', label: 'Luvas azuis' }, { id: 'EV002', label: 'Fibra azul' });
  if (has('EV003')) nodes.push({ id: 'EV003', label: 'Vídeo da Bianca' });
  if (s.documents.includes('DOC004')) nodes.push({ id: 'DOC004', label: 'Tacógrafo' });
  nodes.push({ id: 'P002', label: 'Sérgio Bento' }, { id: 'LOC004', label: 'KM18' });
  return nodes;
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
