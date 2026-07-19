/**
 * screens/jury.js — Sala do Júri multi-caso: cofre com códigos dos dossiês do
 * pack e acusação com opções do pack (jury.suspects/locations/methods).
 *
 * REGRA DE OURO Nº 1: a solução permanece em base64 (CASE_FULL.final_solution)
 * e só é decodificada AQUI, no clique de "EMITIR VEREDITO". Nunca é logada.
 */
import { getModule } from '../database.js';
import { screenShell, el, toast, modal } from '../uiManager.js';
import { getCase, getPack, getDossiers, openSafe, juryRequirementsMet, addScore, solveEnigma, rankForScore, loseCredibility } from '../caseState.js';
import { emit } from '../eventManager.js';
import { portrait } from '../art.js';
import { sfx, ambience, speak, haptic } from '../audioManager.js';
import { getDifficulty, accusationPenalty } from '../difficulty.js';

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
  const d = getDifficulty();
  const cred = s.credibility ?? 100;
  const credCls = cred >= 70 ? 'ok' : cred >= 40 ? 'warn' : 'bad';
  const meter = el('div', 'jury-meta');
  meter.innerHTML = `
    <span class="jury-diff" title="Nível de dificuldade">${d.icon} ${d.label.toUpperCase()}</span>
    <span class="jury-cred ${credCls}" title="Credibilidade junto ao tribunal">
      CREDIBILIDADE <b>${cred}</b>
      <span class="cred-bar"><i style="width:${cred}%"></i></span>
    </span>
    ${s.verdictAttempts ? `<span class="jury-tries" title="Acusações já rejeitadas">${s.verdictAttempts} erro(s) · próximo custa ${accusationPenalty(s.verdictAttempts + 1)} pts</span>` : ''}`;
  bar.append(meter);
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
  const s = getCase();
  const d = getDifficulty();
  const cost = accusationPenalty((s.verdictAttempts || 0) + 1);
  const content = el('div');
  content.innerHTML = `<p>O tribunal aceita <b>uma acusação por vez</b>. No nível <b>${d.icon} ${d.label}</b>,
    um erro agora custa <b>−${cost} pts</b> e <b>−${d.credLoss}</b> de credibilidade — e o próximo erro pesa ainda mais.</p>
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
    sfx('success'); haptic('ok');
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
    // Consequência de errar: penalidade escala por tentativa e por dificuldade,
    // e a credibilidade junto ao tribunal despenca.
    const diff = getDifficulty();
    const base = Math.abs(getModule('SHERLOCK_ENGINE_GAMEPLAY')?.score?.erro ?? 20);
    const penalty = accusationPenalty(s.verdictAttempts, base);
    addScore(-penalty, 'Acusação rejeitada');
    const cred = loseCredibility(diff.credLoss);
    speak(dialogos.falha || 'As evidências ainda são insuficientes.', { pitch: 0.75 });
    sfx('error'); haptic('err');

    // O quanto o júri entrega depende da dificuldade (fieldHints).
    const wrong = [
      !okSuspect && 'o autor não corresponde às provas físicas',
      !okLocation && 'o local não bate com a cadeia de custódia',
      !okMethod && 'o método contradiz os laudos',
    ].filter(Boolean);
    let pista;
    if (diff.fieldHints === 'all') {
      pista = `O júri observa que ${wrong.join('; ')}.`;
    } else if (diff.fieldHints === 'count') {
      pista = `O júri sinaliza que <b>${wrong.length}</b> dos três pontos (quem/onde/como) não se sustenta${wrong.length > 1 ? 'm' : ''}.`;
    } else {
      pista = 'O júri não detalha o que faltou. Reveja as provas por conta própria.';
    }
    const credLine = cred <= 0
      ? '<p class="row-tag bad">Credibilidade esgotada — o tribunal ainda ouve você, mas a patente final será severamente afetada.</p>'
      : `<p class="muted">Credibilidade agora em <b>${cred}</b>. A próxima acusação errada custará <b>${accusationPenalty(s.verdictAttempts + 1, base)}</b> pts.</p>`;
    modal('⚖ ACUSAÇÃO REJEITADA', `<div class="verdict-stamp bad">REJEITADA</div>
      <p>"${dialogos.falha || 'Evidências insuficientes.'}"</p>
      <p class="muted">−${penalty} pts · −${diff.credLoss} credibilidade</p>
      <p>${pista}</p>
      ${credLine}`, [
      { label: 'REVER O CASO', primary: true, onClick: () => render() },
    ]);
  }
}
