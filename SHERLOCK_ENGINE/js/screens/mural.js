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
