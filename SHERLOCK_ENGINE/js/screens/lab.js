/**
 * screens/lab.js — Laboratório forense multi-caso: bancadas, amostras e
 * efeitos vêm do CONTENT_PACK (lab.tabs). Enigmas via enigmas.js.
 */
import { screenShell, el, toast } from '../uiManager.js';
import { getCase, getPack, hasReq, markAnalyzed, unlockDocument, addScore } from '../caseState.js';
import { runEnigma, enigmaButton } from '../enigmas.js';
import { sfx, ambience, speak } from '../audioManager.js';

export function render() {
  const { body } = screenShell('Laboratório', 'CENTRAL › LABORATÓRIO FORENSE');
  ambience('lab');
  const tabsCfg = getPack().lab?.tabs || [];
  const tabs = el('div', 'tabs');
  const panel = el('div', 'panel lab-panel');
  tabsCfg.forEach((tab, i) => {
    const b = el('button', 'btn tab-btn', tab.nome.toUpperCase());
    b.onclick = () => { sfx('click'); tabs.querySelectorAll('.tab-btn').forEach((x) => x.classList.remove('active')); b.classList.add('active'); renderTab(tab, panel); };
    if (i === 0) b.classList.add('active');
    tabs.append(b);
  });
  body.append(tabs, panel);
  if (tabsCfg.length) renderTab(tabsCfg[0], panel);
}

function isDone(tab, s) {
  if (tab.enigma) return s.enigmasSolved.includes(tab.enigma);
  return s.analyzed.includes(tab.effects?.analyzed);
}

function renderTab(tab, panel) {
  const s = getCase();
  panel.replaceChildren();
  panel.append(el('h2', 'panel-title', `${tab.nome} — bancada`));

  const done = isDone(tab, s);
  const analyzed = tab.effects?.analyzed ? s.analyzed.includes(tab.effects.analyzed) : done;
  const ready = (tab.sample?.needs || []).every(hasReq);

  const row = el('div', `card sample-row${ready ? '' : ' locked'}`);
  row.innerHTML = `<b>${tab.sample?.title || ''}</b><span class="row-tag ${done ? 'ok' : ''}">${done ? 'analisada' : ready ? (analyzed ? 'aguardando comparação' : 'pronta') : 'aguardando amostra'}</span>`;
  if (ready && !analyzed) {
    const b = el('button', 'btn btn-primary', 'ANALISAR');
    b.onclick = () => runTest(panel, tab, () => {
      applyEffects(tab);
      renderTab(tab, panel);
      if (tab.enigma) setTimeout(() => runEnigma(tab.enigma, () => renderTab(tab, panel)), 250);
    });
    row.append(b);
  } else if (!ready) {
    row.append(el('span', 'muted', tab.sample?.lockMsg || ''));
  }
  panel.append(row);

  if (analyzed && tab.enigma && !done) {
    const b = enigmaButton(tab.enigma, { onSolved: () => renderTab(tab, panel) });
    if (b) panel.append(b);
  }
  if (done && tab.results) {
    const box = el('div', 'findings panel-inset');
    box.innerHTML = `<b>Resultado:</b><ul>${tab.results.map((f) => `<li>${f}</li>`).join('')}</ul><p class="muted">${tab.note || ''}</p>`;
    panel.append(box);
  }
}

function applyEffects(tab) {
  const fx = tab.effects || {};
  if (fx.analyzed) markAnalyzed(fx.analyzed);
  if (fx.unlockDoc) unlockDocument(fx.unlockDoc);
  if (fx.score) addScore(fx.score, fx.reason || tab.nome);
  if (fx.speak) speak(fx.speak, { pitch: 0.85 });
  if (fx.toast) toast(fx.toast, 'success');
}

function runTest(panel, tab, onDone) {
  sfx('scanner');
  const ms = tab.test?.ms ?? 1800;
  const bar = el('div', 'lab-progress');
  bar.innerHTML = `<div class="mono">${tab.test?.name || 'Análise'} em andamento…</div><div class="boot-progress"><div class="boot-progress-fill" style="transition:width ${ms}ms linear"></div></div>`;
  panel.append(bar);
  requestAnimationFrame(() => { bar.querySelector('.boot-progress-fill').style.width = '100%'; });
  setTimeout(() => { bar.remove(); sfx('success'); onDone(); }, ms);
}
