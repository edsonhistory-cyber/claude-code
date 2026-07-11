/**
 * screens/jury.js — Sala do Júri: cofre dos 4 códigos (PER-77/INT-40/CAM-19/
 * ARQ-02) e acusação final (suspeito + local + método).
 *
 * REGRA DE OURO Nº 1: a solução permanece em base64 e só é decodificada AQUI,
 * dentro de verdict(), no clique de "EMITIR VEREDITO". Nunca é logada.
 */
import { getModule } from '../database.js';
import { screenShell, el, toast, modal } from '../uiManager.js';
import { getCase, openSafe, juryRequirementsMet, addScore, solveEnigma, rankForScore, DOSSIERS } from '../caseState.js';
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

// ── Cofre ────────────────────────────────────────────────────────────────────
function renderSafe(body, s) {
  const box = el('div', 'panel safe-panel');
  box.append(el('h2', 'panel-title', '🔐 COFRE DA SALA DO JÚRI'));
  box.append(el('p', '', 'Quatro dossiês, quatro códigos. Complete os enigmas de cada dossiê para obter os códigos e destravar a acusação.'));

  const grid = el('div', 'safe-grid');
  for (const [key, d] of Object.entries(DOSSIERS)) {
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
    const open = el('button', 'btn btn-primary', 'INSERIR OS 4 CÓDIGOS E ABRIR O COFRE');
    open.onclick = () => { sfx('unlock'); openSafe(); toast('🔓 Cofre aberto! A Sala do Júri está liberada. +100', 'success'); render(); };
    box.append(open);
  } else {
    box.append(el('p', 'muted', `Códigos obtidos: ${s.codes.length}/4.`));
  }
  body.append(box);
}

// ── Acusação ─────────────────────────────────────────────────────────────────
function renderAccusation(body, s) {
  const people = (getModule('SHERLOCK_ENGINE_PERSONAGENS')?.personagens || []).filter((p) => p.id !== 'P001' && !p.id.match(/P0(09|1\d|20)/));
  const stops = getModule('SHERLOCK_ENGINE_GEOINT')?.route?.stops || [];
  const locations = [...stops.filter((x) => x.id !== 'KM18').map((x) => x.name), 'KM18 / Ônibus'];
  const methods = [
    'Veneno no café da garrafa térmica',
    'Chá de ervas envenenado',
    'Queda do mirante',
    'Medicamento adulterado',
    'Asfixia durante a parada',
  ];

  const wrap = el('div', 'jury-wrap');
  const col1 = section('1 · QUEM?', people.map((p) => ({ id: p.nome, html: `<div class="suspect-portrait">${portrait(p.id)}</div><b>${p.nome}</b><span class="muted">${p.papel}</span>` })), 'suspect');
  const col2 = section('2 · ONDE?', locations.map((l) => ({ id: l, html: `<b>${l}</b>` })), 'location');
  const col3 = section('3 · COMO?', methods.map((m) => ({ id: m, html: `<b>${m}</b>` })), 'method');
  wrap.append(col1, col2, col3);
  body.append(wrap);

  const bar = el('div', 'panel jury-bar');
  const resume = el('div', 'mono', summaryText());
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

  function summaryText() {
    return `ACUSAÇÃO: ${pick.suspect ?? '________'} · ${pick.location ?? '________'} · ${pick.method ?? '________'}`;
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
    const sealed = getModule('SHERLOCK_ENGINE_CASE001_FULL')?.final_solution;
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
    solveEnigma('EN010');
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
    modal('⚖ VEREDITO — CASO CWB-1447 ENCERRADO', content, [
      { label: 'VER RESULTADO', primary: true, onClick: () => emit('UI_GOTO', { state: 'RESULTADO' }) },
    ]);
  } else {
    addScore(-(getModule('SHERLOCK_ENGINE_GAMEPLAY')?.score?.erro ?? 20), 'Acusação rejeitada');
    speak(dialogos.falha || 'As evidências ainda são insuficientes.', { pitch: 0.75 });
    sfx('error');
    const hints = [];
    if (!okSuspect) hints.push('o autor não corresponde às provas físicas');
    if (!okLocation) hints.push('o local não bate com a cadeia de custódia');
    if (!okMethod) hints.push('o método contradiz o laudo toxicológico');
    modal('⚖ ACUSAÇÃO REJEITADA', `<div class="verdict-stamp bad">REJEITADA</div>
      <p>"${dialogos.falha || 'Evidências insuficientes.'}"</p>
      <p class="muted">O júri observa que ${hints.join('; ')}.</p>`, []);
  }
}
