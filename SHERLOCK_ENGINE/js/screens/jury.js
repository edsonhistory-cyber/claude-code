/**
 * screens/jury.js — Sala do Júri multi-caso: cofre com códigos dos dossiês do
 * pack e acusação com opções do pack (jury.suspects/locations/methods).
 *
 * REGRA DE OURO Nº 1: a solução permanece em base64 (CASE_FULL.final_solution)
 * e só é decodificada AQUI, no clique de "EMITIR VEREDITO". Nunca é logada.
 */
import { getModule } from '../database.js';
import { screenShell, el, toast, modal } from '../uiManager.js';
import { getCase, getPack, getDossiers, openSafe, juryRequirementsMet, addScore, solveEnigma, rankForScore } from '../caseState.js';
import { emit } from '../eventManager.js';
import { portrait } from '../art.js';
import { sfx, ambience, speak } from '../audioManager.js';

const pick = { suspect: null, location: null, method: null };

export function render() {
  const { body } = screenShell('Sala do Júri', 'CENTRAL › SALA DO JÚRI');
  ambience('juri');
  const s = getCase();
  if (!s.safeOpened) return renderSafe(body, s);
  renderAccusation(body, s);
}

function renderSafe(body, s) {
  const dossiers = getDossiers();
  const box = el('div', 'panel safe-panel');
  box.append(el('h2', 'panel-title', '🔐 COFRE DA SALA DO JÚRI'));
  box.append(el('p', '', `${Object.keys(dossiers).length} dossiês, ${Object.keys(dossiers).length} códigos. Complete os enigmas de cada dossiê para obter os códigos e destravar a acusação.`));

  const grid = el('div', 'safe-grid');
  for (const d of Object.values(dossiers)) {
    const got = s.codes.includes(d.code);
    const solved = d.enigmas.filter((e) => s.enigmasSolved.includes(e)).length;
    const slot = el('div', `card safe-slot${got ? ' ok' : ''}`);
    slot.innerHTML = `<b>${d.nome}</b>
      <span class="mono safe-code">${got ? d.code : '•••-••'}</span>
      <span class="muted">enigmas ${solved}/${d.enigmas.length} · token ${s.tokens.includes(d.emits) ? '✔ ' + d.emits : d.emits + ' pendente'}</span>`;
    grid.append(slot);
  }
  box.append(grid);

  const tlOk = s.timelineDone;
  box.append(el('p', tlOk ? 'row-tag ok' : 'muted', tlOk ? '✔ Linha do tempo reconstruída' : '🔒 A acusação também exige a linha do tempo correta.'));

  if (juryRequirementsMet()) {
    const open = el('button', 'btn btn-primary', `INSERIR OS ${Object.keys(dossiers).length} CÓDIGOS E ABRIR O COFRE`);
    open.onclick = () => { sfx('unlock'); openSafe(); toast('🔓 Cofre aberto! A Sala do Júri está liberada. +100', 'success'); render(); };
    box.append(open);
  } else {
    box.append(el('p', 'muted', `Códigos obtidos: ${s.codes.length}/${Object.keys(dossiers).length}.`));
  }
  body.append(box);
}

function characterById(pid) {
  return (getPack().characters || []).find((p) => p.id === pid)
    || (getModule('SHERLOCK_ENGINE_PERSONAGENS')?.personagens || []).find((p) => p.id === pid);
}

function renderAccusation(body, s) {
  const jury = getPack().jury || {};
  const people = (jury.suspects || []).map(characterById).filter(Boolean);

  const wrap = el('div', 'jury-wrap');
  const col1 = section('1 · QUEM?', people.map((p) => ({ id: p.nome, html: `<div class="suspect-portrait">${portrait(p.id)}</div><b>${p.nome}</b><span class="muted">${p.papel}</span>` })), 'suspect');
  const col2 = section('2 · ONDE?', (jury.locations || []).map((l) => ({ id: l, html: `<b>${l}</b>` })), 'location');
  const col3 = section('3 · COMO?', (jury.methods || []).map((m) => ({ id: m, html: `<b>${m}</b>` })), 'method');
  wrap.append(col1, col2, col3);
  body.append(wrap);

  const bar = el('div', 'panel jury-bar');
  const resume = el('div', 'mono', `ACUSAÇÃO: ${pick.suspect ?? '________'} · ${pick.location ?? '________'} · ${pick.method ?? '________'}`);
  const btn = el('button', 'btn btn-primary', 'EMITIR VEREDITO');
  btn.onclick = () => {
    if (!pick.suspect || !pick.location || !pick.method) return toast('Selecione suspeito, local e método.', 'warn');
    confirmVerdict();
  };
  bar.append(resume, btn);
  body.append(bar);

  function section(title, items, field) {
    const sec = el('section', 'panel jury-col');
    sec.append(el('h2', 'panel-title', title));
    for (const item of items) {
      const b = el('button', `card jury-opt${pick[field] === item.id ? ' selected' : ''}`, item.html);
      b.onclick = () => { sfx('click'); pick[field] = item.id; render(); };
      sec.append(b);
    }
    return sec;
  }
}

function confirmVerdict() {
  const content = el('div');
  content.innerHTML = `<p>O tribunal aceitará <b>uma acusação por vez</b>. Errar custa pontos e credibilidade.</p>
    <p class="mono">${pick.suspect} · ${pick.location} · ${pick.method}</p>`;
  modal('Confirmar veredito?', content, [
    { label: 'SUSTENTAR ACUSAÇÃO', primary: true, onClick: () => verdict() },
  ]);
}

const norm = (x) => String(x).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

function verdict() {
  const s = getCase();
  sfx('heartbeat');
  // Decodificação da solução lacrada — só aqui, só agora.
  let solution;
  try {
    const sealed = getModule('CASE_FULL')?.final_solution;
    solution = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(sealed.data), (c) => c.charCodeAt(0))));
  } catch {
    return toast('Falha ao abrir o envelope lacrado da solução.', 'warn');
  }
  // Comparação puramente contra a solução decodificada — nada da resposta
  // aparece em texto claro neste arquivo.
  const words = (x) => new Set(norm(x).split(/[^A-Z0-9]+/).filter((w) => w.length > 3));
  const overlap = (a, b) => [...words(a)].filter((w) => words(b).has(w)).length;
  const okSuspect = norm(solution.suspect) === norm(pick.suspect);
  const okLocation = norm(solution.location).split(/[^A-Z0-9]+/).some((w) => w && norm(pick.location).includes(w));
  const okMethod = overlap(pick.method, solution.method) >= 2;

  const dialogos = getModule('SHERLOCK_ENGINE_DIALOGOS')?.juri || {};
  s.verdictAttempts++;

  if (okSuspect && okLocation && okMethod) {
    s.solved = true;
    const finalEnigma = getPack().final_enigma;
    if (finalEnigma) solveEnigma(finalEnigma);
    addScore(getModule('SHERLOCK_ENGINE_GAMEPLAY')?.score?.acusacao_correta ?? 300, 'Acusação correta');
    emit('CASE_SOLVED', { score: s.score });
    speak(dialogos.sucesso || 'O tribunal aceita a acusação.', { pitch: 0.75, rate: 0.95 });
    sfx('success');
    const content = el('div', 'verdict-reveal');
    content.innerHTML = `
      <div class="verdict-stamp ok">CULPADO</div>
      <p><b>${solution.suspect}</b> — condenado.</p>
      <p><b>Local:</b> ${solution.location}<br><b>Método:</b> ${solution.method}</p>
      <p><b>Provas decisivas:</b></p><ul>${(solution.proofs || []).map((p) => `<li>${p}</li>`).join('')}</ul>
      <p class="muted">"${dialogos.sucesso || ''}"</p>`;
    modal(`⚖ VEREDITO — CASO ${getModule('CASE_FULL')?.case?.id ?? ''} ENCERRADO`, content, [
      { label: 'VER RESULTADO', primary: true, onClick: () => emit('UI_GOTO', { state: 'RESULTADO' }) },
    ]);
  } else {
    addScore(-(getModule('SHERLOCK_ENGINE_GAMEPLAY')?.score?.erro ?? 20), 'Acusação rejeitada');
    speak(dialogos.falha || 'As evidências ainda são insuficientes.', { pitch: 0.75 });
    sfx('error');
    const hints = [];
    if (!okSuspect) hints.push('o autor não corresponde às provas físicas');
    if (!okLocation) hints.push('o local não bate com a cadeia de custódia');
    if (!okMethod) hints.push('o método contradiz os laudos');
    modal('⚖ ACUSAÇÃO REJEITADA', `<div class="verdict-stamp bad">REJEITADA</div>
      <p>"${dialogos.falha || 'Evidências insuficientes.'}"</p>
      <p class="muted">O júri observa que ${hints.join('; ')}.</p>`, []);
  }
}
