/**
 * screens/lab.js — Laboratório forense (SHERLOCK_ENGINE_FORENSICS.json):
 * Toxicologia, Digitais, Fibras (EN007) e Documentoscopia. Testes com tempo
 * (acelerado) que revelam os achados das evidências e emitem laudos.
 */
import { getModule } from '../database.js';
import { screenShell, el, toast, modal } from '../uiManager.js';
import { getCase, markAnalyzed, unlockDocument, addScore, solveEnigma, failEnigma, enigmaUnlocked, ENIGMA_GATES } from '../caseState.js';
import { sfx, ambience, speak } from '../audioManager.js';

const TABS = [
  { id: 'tox', nome: 'Toxicologia', lab: 'LAB01' },
  { id: 'afis', nome: 'Digitais', lab: 'LAB02' },
  { id: 'fib', nome: 'Fibras', lab: 'LAB03' },
  { id: 'docsc', nome: 'Documentoscopia', lab: 'LAB04' },
];

export function render() {
  const { body } = screenShell('Laboratório', 'CENTRAL › LABORATÓRIO FORENSE');
  ambience('lab');
  const tabs = el('div', 'tabs');
  const panel = el('div', 'panel lab-panel');
  for (const tab of TABS) {
    const b = el('button', 'btn tab-btn', tab.nome.toUpperCase());
    b.onclick = () => { sfx('click'); tabs.querySelectorAll('.tab-btn').forEach((x) => x.classList.remove('active')); b.classList.add('active'); renderTab(tab, panel); };
    tabs.append(b);
  }
  body.append(tabs, panel);
  tabs.querySelector('.tab-btn').classList.add('active');
  renderTab(TABS[0], panel);
}

function renderTab(tab, panel) {
  const s = getCase();
  panel.replaceChildren();
  const labCfg = (getModule('SHERLOCK_ENGINE_FORENSICS')?.laboratories || []).find((l) => l.id === tab.lab);
  panel.append(el('h2', 'panel-title', `${labCfg?.name || tab.nome} — bancada`));

  if (tab.id === 'tox') {
    const done = s.analyzed.includes('tox_done');
    sample(panel, 'EV001 Garrafa térmica', s.collected.includes('EV001'), done,
      'Colete a garrafa no porta-volumes do ônibus (Mapa).',
      () => runTest(panel, 'Cromatografia (TOX002)', 2200, () => {
        markAnalyzed('tox_done');
        unlockDocument('DOC002');
        addScore(15, 'Laudo toxicológico emitido');
        speak('Confirmado. Glicosídeo cardíaco no café da garrafa térmica.', { pitch: 0.85 });
        toast('🧪 Vestígios de glicosídeo cardíaco no café! Laudo DOC002 emitido.', 'success');
        renderTab(tab, panel);
      }));
    if (done) result(panel, ['Vestígios de glicosídeo cardíaco no café', 'Microfibra azul na tampa', 'Digitais parciais'], 'Laudo DOC002 arquivado em Evidências.');
  }

  if (tab.id === 'afis') {
    const done = s.analyzed.includes('afis_done');
    sample(panel, 'EV001 Garrafa térmica — digitais parciais', s.collected.includes('EV001'), done,
      'Requer a garrafa térmica coletada.',
      () => runTest(panel, 'Scanner AFIS (AFIS001)', 1800, () => {
        markAnalyzed('afis_done');
        addScore(15, 'Digitais processadas');
        toast('🖐 Digitais parciais: compatibilidade de 62% com o motorista. Insuficiente sozinha — cruze com as fibras.', 'success');
        renderTab(tab, panel);
      }));
    if (done) result(panel, ['Fragmento compatível (62%) com Sérgio Bento', 'Qualidade insuficiente para laudo conclusivo isolado'], 'Use no interrogatório junto com outras provas.');
  }

  if (tab.id === 'fib') {
    const done = s.enigmasSolved.includes('EN007');
    const ready = s.collected.includes('EV001') && s.collected.includes('EV002');
    sample(panel, 'EV002 Luvas azuis × microfibra da tampa', ready, done,
      'Requer a garrafa (EV001) e as luvas do Barigui (EV002).',
      () => runTest(panel, 'Microscopia comparada (FIB001)', 2000, () => {
        markAnalyzed('fib_done');
        renderTab(tab, panel);
        setTimeout(() => enigmaFibra(() => renderTab(tab, panel)), 250);
      }));
    if (s.analyzed.includes('fib_done') && !done) {
      const b = el('button', 'btn btn-primary', 'COMPARAR PADRÕES (EN007)');
      b.onclick = () => enigmaFibra(() => renderTab(tab, panel));
      panel.append(b);
    }
    if (done) result(panel, ['Fibras da luva idênticas à microfibra da tampa', 'Mesmo composto tóxico em ambas'], 'Chave FIBRA registrada no dossiê da Perícia.');
  }

  if (tab.id === 'docsc') {
    const done = s.analyzed.includes('docsc_done');
    const ready = s.documents.includes('DOC004');
    sample(panel, 'DOC004 Disco do tacógrafo — autenticidade', ready, done,
      'Requer o disco do tacógrafo (colete o tacógrafo na cabine do ônibus).',
      () => runTest(panel, 'Luz UV + infravermelho', 1600, () => {
        markAnalyzed('docsc_done');
        unlockDocument('DOC005');
        addScore(15, 'Documentoscopia concluída');
        toast('📄 Disco autêntico, sem rasuras: a parada de 6 min às 15:47 é real. Diário de bordo (DOC005) anexado.', 'success');
        renderTab(tab, panel);
      }));
    if (done) result(panel, ['Disco íntegro e autêntico', 'Registro do diário de bordo não menciona a parada'], 'A omissão no diário é relevante — anote no mural.');
  }
}

function sample(panel, nome, ready, done, lockMsg, onRun) {
  const row = el('div', `card sample-row${ready ? '' : ' locked'}`);
  row.innerHTML = `<b>${nome}</b><span class="row-tag ${done ? 'ok' : ''}">${done ? 'analisada' : ready ? 'pronta' : 'aguardando amostra'}</span>`;
  if (ready && !done) {
    const b = el('button', 'btn btn-primary', 'ANALISAR');
    b.onclick = onRun;
    row.append(b);
  } else if (!ready) {
    row.append(el('span', 'muted', lockMsg));
  }
  panel.append(row);
}

function runTest(panel, nome, ms, onDone) {
  sfx('scanner');
  const bar = el('div', 'lab-progress');
  bar.innerHTML = `<div class="mono">${nome} em andamento…</div><div class="boot-progress"><div class="boot-progress-fill" style="transition:width ${ms}ms linear"></div></div>`;
  panel.append(bar);
  requestAnimationFrame(() => { bar.querySelector('.boot-progress-fill').style.width = '100%'; });
  setTimeout(() => { bar.remove(); sfx('success'); onDone(); }, ms);
}

function result(panel, findings, note) {
  const box = el('div', 'findings panel-inset');
  box.innerHTML = `<b>Resultado:</b><ul>${findings.map((f) => `<li>${f}</li>`).join('')}</ul><p class="muted">${note}</p>`;
  panel.append(box);
}

// EN007 — microscopia: escolher o par de padrões idênticos
function enigmaFibra(refresh) {
  const s = getCase();
  if (s.enigmasSolved.includes('EN007')) return;
  if (!enigmaUnlocked('EN007')) return toast('🔒 ' + ENIGMA_GATES.EN007.hintLocked, 'warn');
  const ref = fiberSvg(3, '#3b6ea5');
  const candidates = [fiberSvg(5, '#3b6ea5'), fiberSvg(3, '#3b6ea5'), fiberSvg(3, '#7a5c3b')];
  const order = [0, 1, 2].sort(() => 0.5 - Math.random());
  const content = el('div');
  content.innerHTML = `<p>Microscópio: à esquerda, a <b>microfibra da tampa da garrafa</b>. Qual amostra da luva tem o MESMO padrão (trama e cor)?</p>
    <div class="fiber-bench"><div class="fiber-ref"><span class="mono">REFERÊNCIA</span>${ref}</div>
    <div class="fiber-options">${order.map((i) => `<button class="fiber-opt" data-i="${i}"><span class="mono">AMOSTRA ${'ABC'[order.indexOf(i)]}</span>${candidates[i]}</button>`).join('')}</div></div>`;
  const { close } = modal('EN007 — Comparação de Fibras', content, []);
  content.querySelectorAll('.fiber-opt').forEach((b) => {
    b.onclick = () => {
      if (Number(b.dataset.i) === 1) { solveEnigma('EN007'); toast('🔓 EN007 resolvido! Fibras idênticas: a luva tocou a garrafa.', 'success'); sfx('unlock'); close(); refresh(); }
      else { failEnigma('EN007'); sfx('error'); toast('Padrões divergem. (-20)', 'warn'); }
    };
  });
}

function fiberSvg(waves, color) {
  const path = Array.from({ length: 6 }, (_, r) =>
    `<path d="M5 ${12 + r * 12} ${Array.from({ length: waves * 2 }, (_, i) => `Q ${5 + (i + 0.5) * (110 / (waves * 2))} ${12 + r * 12 + (i % 2 ? 7 : -7)} ${5 + (i + 1) * (110 / (waves * 2))} ${12 + r * 12}`).join(' ')}" stroke="${color}" fill="none" stroke-width="2.2"/>`).join('');
  return `<svg viewBox="0 0 120 84" class="fiber"><rect width="120" height="84" rx="6" fill="#0b1e30"/>${path}<circle cx="60" cy="42" r="39" fill="none" stroke="#7fe3ff" stroke-width="1" opacity=".35"/></svg>`;
}
