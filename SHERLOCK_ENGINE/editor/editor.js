/**
 * editor.js — Sherlock Studio (Milestone 3, SHERLOCK_CASE_EDITOR.json).
 * Edita os JSONs do caso em memória, valida ao vivo com os MESMOS checks do
 * boot (js/validators.js) e exporta JSON/ZIP. Templates de caso novo vêm do
 * SHERLOCK_CASE_CREATOR_SDK.json.
 *
 * A solução permanece LACRADA: só é decodificada no painel "Solução" após
 * confirmação explícita de spoiler, e é re-encodada em base64 ao salvar.
 */
import { runIntegrityChecks } from '../js/validators.js';
import { ENGINE_FILES, CASE_FILES, CASE_DIRS } from '../js/database.js';
import { makeZip } from './zip.js';

// chaves canônicas dos 7 arquivos do caso (internamente sempre CASE001_*;
// na exportação o prefixo vira o id do caso novo)
const CANON = CASE_FILES.CASE001;

const data = {};          // engine-data + arquivos do caso (chaves canônicas)
let caseId = 'CASE001';
let dirty = new Set();    // arquivos alterados
let panel = 'caso';
let solutionOpen = false; // painel Solução: spoiler confirmado nesta sessão

const $ = (sel) => document.querySelector(sel);
const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

const PANELS = [
  ['caso', 'Caso & Atos'],
  ['eventos', 'Linha do Tempo'],
  ['personagens', 'Personagens'],
  ['evidencias', 'Evidências'],
  ['documentos', 'Documentos'],
  ['dialogos', 'Diálogos'],
  ['solucao', 'Solução (lacrada)'],
  ['bruto', 'JSON bruto'],
];

// ── carga ────────────────────────────────────────────────────────────────────
async function loadAll() {
  const jobs = [
    ...ENGINE_FILES.map((n) => [`../engine-data/${n}.json`, n]),
    ...CANON.map((n) => [`../${CASE_DIRS.CASE001}/${n}.json`, n]),
  ];
  await Promise.all(jobs.map(async ([path, name]) => {
    const res = await fetch(path);
    if (res.ok) data[name] = await res.json();
  }));
}

// ── validação ao vivo ────────────────────────────────────────────────────────
let valTimer = null;
function scheduleValidate() { clearTimeout(valTimer); valTimer = setTimeout(validate, 400); }

function validate() {
  const report = runIntegrityChecks(data);
  const out = $('#console-out');
  const badge = $('#console-badge');
  out.replaceChildren();
  for (const e of report.errors) out.append(el('div', 'err', `ERRO  ${esc(e)}`));
  for (const w of report.warnings) out.append(el('div', 'warn', `aviso ${esc(w)}`));
  if (!report.errors.length && !report.warnings.length) out.append(el('div', 'ok', 'Nenhum problema encontrado.'));
  badge.textContent = `${report.errors.length} erros · ${report.warnings.length} avisos`;
  badge.className = `row-tag ${report.errors.length ? 'bad' : 'ok'}`;
  return report;
}

function touch(file) { dirty.add(file); scheduleValidate(); }

// ── helpers de formulário ────────────────────────────────────────────────────
function field(label, value, onInput, { small = false, textarea = false } = {}) {
  const wrap = el('div', `ed-field${small ? ' small' : ''}`);
  wrap.append(el('label', '', label));
  const input = el(textarea ? 'textarea' : 'input', 'input');
  input.value = value ?? '';
  input.addEventListener('input', () => onInput(input.value));
  wrap.append(input);
  return wrap;
}

function rowTools({ onUp, onDown, onDel }) {
  const t = el('div', 'ed-row-tools');
  if (onUp) { const b = el('button', 'btn btn-ghost', '↑'); b.onclick = onUp; t.append(b); }
  if (onDown) { const b = el('button', 'btn btn-ghost', '↓'); b.onclick = onDown; t.append(b); }
  if (onDel) { const b = el('button', 'btn btn-ghost', '✕'); b.onclick = onDel; t.append(b); }
  return t;
}

function section(title, sub) {
  const s = el('div', 'ed-section');
  s.append(el('div', 'ed-title', title));
  if (sub) s.append(el('div', 'ed-sub', sub));
  return s;
}

function modal(title, bodyHtml, actions) {
  const overlay = el('div', 'modal-overlay');
  const box = el('div', 'panel modal-box');
  box.append(el('div', 'modal-title', title), el('div', '', bodyHtml));
  const bar = el('div', 'modal-actions');
  for (const a of actions) {
    const b = el('button', `btn ${a.primary ? 'btn-primary' : 'btn-ghost'}`, a.label);
    b.onclick = () => { a.onClick?.(); overlay.remove(); }; // lê os campos antes de fechar
    bar.append(b);
  }
  box.append(bar);
  overlay.append(box);
  document.body.append(overlay);
}

// ── painéis ──────────────────────────────────────────────────────────────────
const RENDER = { caso, eventos, personagens, evidencias, documentos, dialogos, solucao, bruto };

function renderPanel() {
  $('#studio-case').textContent = `${caseId} · ${data.SHERLOCK_ENGINE_CASE001_FULL?.case?.title ?? ''}`;
  document.querySelectorAll('.nav-item').forEach((n) => n.classList.toggle('active', n.dataset.p === panel));
  const host = $('#studio-panel');
  host.replaceChildren(RENDER[panel]());
}

function caso() {
  const full = data.SHERLOCK_ENGINE_CASE001_FULL;
  const s = section('CASO', 'Identidade do caso e atos (SHERLOCK_ENGINE_CASE001_FULL).');
  const g = el('div', 'ed-grid');
  const c = full.case;
  g.append(
    field('ID do caso', c.id, (v) => { c.id = v; touch('SHERLOCK_ENGINE_CASE001_FULL'); }),
    field('Título', c.title, (v) => { c.title = v; touch('SHERLOCK_ENGINE_CASE001_FULL'); }),
    field('Cidade', c.city, (v) => { c.city = v; touch('SHERLOCK_ENGINE_CASE001_FULL'); }),
    field('Objetivo', c.objective, (v) => { c.objective = v; touch('SHERLOCK_ENGINE_CASE001_FULL'); }),
  );
  s.append(g, el('div', 'ed-title', 'ATOS'));
  for (const act of full.acts) {
    const row = el('div', 'ed-row');
    row.append(
      field('ID', act.id, (v) => { act.id = v; touch('SHERLOCK_ENGINE_CASE001_FULL'); }, { small: true }),
      field('Título', act.title, (v) => { act.title = v; touch('SHERLOCK_ENGINE_CASE001_FULL'); }),
      field('Objetivo', act.goal ?? '', (v) => { act.goal = v; touch('SHERLOCK_ENGINE_CASE001_FULL'); }),
      field('Desbloqueios (,)', (act.unlock ?? []).join(', '), (v) => { act.unlock = v.split(',').map((x) => x.trim()).filter(Boolean); touch('SHERLOCK_ENGINE_CASE001_FULL'); }),
    );
    s.append(row);
  }
  return s;
}

function eventos() {
  const ev = data.CASE001_EVENTS_FULL;
  const s = section('LINHA DO TEMPO', 'Timeline Editor: mover eventos, alterar horários, detectar conflitos (destaque vermelho).');
  const list = el('div');
  const toMin = (t) => { const m = /^(\d{1,2}):(\d{2})$/.exec(t || ''); return m ? +m[1] * 60 + +m[2] : null; };
  const draw = () => {
    list.replaceChildren();
    let prev = -1;
    ev.timeline.forEach((evt, i) => {
      const t = toMin(evt.time);
      const conflict = t == null || t < prev;
      if (t != null) prev = Math.max(prev, t);
      const row = el('div', `ed-row${conflict ? ' conflict' : ''}`);
      row.append(
        field('ID', evt.id, (v) => { evt.id = v; touch('CASE001_EVENTS_FULL'); }, { small: true }),
        field('Hora', evt.time, (v) => { evt.time = v; touch('CASE001_EVENTS_FULL'); draw(); }, { small: true }),
        field('Título', evt.title, (v) => { evt.title = v; touch('CASE001_EVENTS_FULL'); }),
        field('Local', evt.location, (v) => { evt.location = v; touch('CASE001_EVENTS_FULL'); }),
        field('Efeitos (,)', (evt.effects ?? []).join(', '), (v) => { evt.effects = v.split(',').map((x) => x.trim()).filter(Boolean); touch('CASE001_EVENTS_FULL'); }),
        rowTools({
          onUp: i > 0 ? () => { [ev.timeline[i - 1], ev.timeline[i]] = [ev.timeline[i], ev.timeline[i - 1]]; touch('CASE001_EVENTS_FULL'); draw(); } : null,
          onDown: i < ev.timeline.length - 1 ? () => { [ev.timeline[i + 1], ev.timeline[i]] = [ev.timeline[i], ev.timeline[i + 1]]; touch('CASE001_EVENTS_FULL'); draw(); } : null,
          onDel: () => { ev.timeline.splice(i, 1); touch('CASE001_EVENTS_FULL'); draw(); },
        }),
      );
      list.append(row);
    });
  };
  draw();
  const add = el('button', 'btn ed-add', '✚ NOVO EVENTO');
  add.onclick = () => {
    // template do SDK (entity_templates.event)
    const tpl = data.SHERLOCK_CASE_CREATOR_SDK?.entity_templates?.event ?? { time: '00:00', trigger: '', effects: [] };
    ev.timeline.push({ ...tpl, id: `EVT${String(ev.timeline.length + 1).padStart(4, '0')}`, title: 'Novo evento', location: '' });
    touch('CASE001_EVENTS_FULL');
    draw();
  };
  s.append(list, add);
  return s;
}

function personagens() {
  const p = data.SHERLOCK_ENGINE_PERSONAGENS;
  const s = section('PERSONAGENS', 'Elenco global (SHERLOCK_ENGINE_PERSONAGENS). NPCs de ambientação ficam ao final.');
  for (const ch of p.personagens) {
    const row = el('div', 'ed-row');
    row.append(
      field('ID', ch.id, (v) => { ch.id = v; touch('SHERLOCK_ENGINE_PERSONAGENS'); }, { small: true }),
      field('Nome', ch.nome, (v) => { ch.nome = v; touch('SHERLOCK_ENGINE_PERSONAGENS'); }),
      field('Papel', ch.papel, (v) => { ch.papel = v; touch('SHERLOCK_ENGINE_PERSONAGENS'); }),
      field('Profissão', ch.profissao ?? ch.funcao ?? '', (v) => { if ('funcao' in ch) ch.funcao = v; else ch.profissao = v; touch('SHERLOCK_ENGINE_PERSONAGENS'); }),
    );
    s.append(row);
  }
  const add = el('button', 'btn ed-add', '✚ NOVO PERSONAGEM');
  add.onclick = () => {
    p.personagens.push({ id: `P${String(p.personagens.length + 1).padStart(3, '0')}`, nome: '', papel: 'NPC', profissao: '' });
    touch('SHERLOCK_ENGINE_PERSONAGENS');
    renderPanel();
  };
  s.append(add);
  return s;
}

function evidencias() {
  const evd = data.CASE001_EVIDENCES_FULL;
  const s = section('EVIDÊNCIAS', 'CASE001_EVIDENCES_FULL — inclui requisitos do júri.');
  for (const e of evd.evidences) {
    const row = el('div', 'ed-row');
    row.append(
      field('ID', e.id, (v) => { e.id = v; touch('CASE001_EVIDENCES_FULL'); }, { small: true }),
      field('Nome', e.name, (v) => { e.name = v; touch('CASE001_EVIDENCES_FULL'); }),
      field('Categoria', e.category ?? '', (v) => { e.category = v; touch('CASE001_EVIDENCES_FULL'); }),
      field('Valor', e.value ?? '', (v) => { e.value = v; touch('CASE001_EVIDENCES_FULL'); }, { small: true }),
      field('Coletada em', e.collected_at ?? '', (v) => { e.collected_at = v; touch('CASE001_EVIDENCES_FULL'); }),
      field('Relacionadas (,)', (e.related ?? []).join(', '), (v) => { e.related = v.split(',').map((x) => x.trim()).filter(Boolean); touch('CASE001_EVIDENCES_FULL'); }),
      field('Achados (1/linha)', (e.findings ?? []).join('\n'), (v) => { e.findings = v.split('\n').map((x) => x.trim()).filter(Boolean); touch('CASE001_EVIDENCES_FULL'); }, { textarea: true }),
      rowTools({ onDel: () => { evd.evidences = evd.evidences.filter((x) => x !== e); data.CASE001_EVIDENCES_FULL.evidences = evd.evidences; touch('CASE001_EVIDENCES_FULL'); renderPanel(); } }),
    );
    s.append(row);
  }
  const g = el('div', 'ed-grid');
  g.append(field('Requisitos do júri (,)', (evd.jury_requirements ?? []).join(', '), (v) => { evd.jury_requirements = v.split(',').map((x) => x.trim()).filter(Boolean); touch('CASE001_EVIDENCES_FULL'); }));
  const add = el('button', 'btn ed-add', '✚ NOVA EVIDÊNCIA');
  add.onclick = () => {
    const tpl = data.SHERLOCK_CASE_CREATOR_SDK?.entity_templates?.evidence ?? {};
    evd.evidences.push({ id: `EV${String(evd.evidences.length + 1).padStart(3, '0')}`, name: '', category: tpl.type ?? 'object', value: tpl.importance ?? 'Alta' });
    touch('CASE001_EVIDENCES_FULL');
    renderPanel();
  };
  s.append(g, add);
  return s;
}

function documentos() {
  const docs = data.CASE001_DOCUMENTS_FULL;
  const s = section('DOCUMENTOS', 'CASE001_DOCUMENTS_FULL — o resumo é o texto que o jogador lê.');
  for (const d of docs.documents) {
    const row = el('div', 'ed-row');
    row.append(
      field('ID', d.id, (v) => { d.id = v; touch('CASE001_DOCUMENTS_FULL'); }, { small: true }),
      field('Título', d.title, (v) => { d.title = v; touch('CASE001_DOCUMENTS_FULL'); }),
      field('Tipo', d.type ?? '', (v) => { d.type = v; touch('CASE001_DOCUMENTS_FULL'); }),
      field('Resumo', d.summary ?? '', (v) => { d.summary = v; touch('CASE001_DOCUMENTS_FULL'); }, { textarea: true }),
      rowTools({ onDel: () => { docs.documents = docs.documents.filter((x) => x !== d); touch('CASE001_DOCUMENTS_FULL'); renderPanel(); } }),
    );
    s.append(row);
  }
  const add = el('button', 'btn ed-add', '✚ NOVO DOCUMENTO');
  add.onclick = () => {
    docs.documents.push({ id: `DOC${String(docs.documents.length + 1).padStart(3, '0')}`, title: '', type: '', summary: '' });
    touch('CASE001_DOCUMENTS_FULL');
    renderPanel();
  };
  s.append(add);
  return s;
}

function dialogos() {
  const dlg = data.CASE001_DIALOGUES_FULL;
  const s = section('DIÁLOGOS', 'Dialogue Editor: árvore, condições (unlock_if) e desbloqueios (unlock).');
  for (const [charId, chara] of Object.entries(dlg.dialogue_tree)) {
    const row = el('div', 'ed-row');
    row.append(field(`${charId} · intro`, chara.intro, (v) => { chara.intro = v; touch('CASE001_DIALOGUES_FULL'); }));
    s.append(row);
    for (const [topicId, topic] of Object.entries(chara.topics ?? {})) {
      const t = el('div', 'dlg-topic');
      t.append(field(`Tópico "${topicId}" — pergunta`, topic.question, (v) => { topic.question = v; touch('CASE001_DIALOGUES_FULL'); }));
      t.append(field('Condições unlock_if (,)', (topic.unlock_if ?? []).join(', '), (v) => { topic.unlock_if = v.split(',').map((x) => x.trim()).filter(Boolean); touch('CASE001_DIALOGUES_FULL'); }));
      for (const ans of topic.answers ?? []) {
        const a = el('div', 'dlg-answer ed-row');
        a.append(
          field('Resposta', ans.text, (v) => { ans.text = v; touch('CASE001_DIALOGUES_FULL'); }),
          field('Verdade', ans.truth ?? '', (v) => { ans.truth = v; touch('CASE001_DIALOGUES_FULL'); }, { small: true }),
          field('Estresse', ans.stress ?? '', (v) => { ans.stress = v; touch('CASE001_DIALOGUES_FULL'); }, { small: true }),
          field('Desbloqueia', ans.unlock ?? '', (v) => { if (v) ans.unlock = v; else delete ans.unlock; touch('CASE001_DIALOGUES_FULL'); }),
        );
        t.append(a);
      }
      s.append(t);
    }
  }
  return s;
}

function solucao() {
  const full = data.SHERLOCK_ENGINE_CASE001_FULL;
  const s = section('SOLUÇÃO LACRADA', 'Regra de ouro nº 1: o conteúdo fica em base64 e o jogo só o decodifica no veredito.');
  const sol = full.final_solution;
  const box = el('div', 'sealed-box');
  const sealedOk = sol?.sealed === true && sol?.encoding === 'base64';
  box.append(el('div', 'sealed-stamp', sealedOk ? '🔐 LACRADA (base64)' : '⚠ NÃO LACRADA'));

  if (!solutionOpen) {
    box.append(el('p', '', 'Editar a solução revela o culpado, o local e o método. Se você pretende JOGAR este caso, não abra.'));
    const open = el('button', 'btn', 'EDITAR SOLUÇÃO (REVELA SPOILER)');
    open.onclick = () => modal('⚠ Confirmar spoiler', '<p>O conteúdo da solução será exibido nesta tela. Continuar?</p>', [
      { label: 'MOSTRAR', primary: true, onClick: () => { solutionOpen = true; renderPanel(); } },
      { label: 'CANCELAR' },
    ]);
    box.append(open);
  } else {
    let dec = { suspect: '', location: '', method: '', proofs: [] };
    try {
      if (sealedOk) dec = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(sol.data), (c) => c.charCodeAt(0))));
      else if (sol && !sol.sealed) dec = sol;
    } catch { /* base64 inválido: começa em branco */ }
    const g = el('div', 'ed-grid');
    g.append(
      field('Culpado (nome exato do personagem)', dec.suspect, (v) => { dec.suspect = v; }),
      field('Local', dec.location, (v) => { dec.location = v; }),
      field('Método', dec.method, (v) => { dec.method = v; }),
      field('Provas (1/linha)', (dec.proofs ?? []).join('\n'), (v) => { dec.proofs = v.split('\n').map((x) => x.trim()).filter(Boolean); }, { textarea: true }),
    );
    const save = el('button', 'btn btn-primary', '🔐 LACRAR E SALVAR (base64)');
    save.onclick = () => {
      const payload = JSON.stringify(dec);
      full.final_solution = {
        sealed: true,
        encoding: 'base64',
        note: 'Solução lacrada. Decodificada apenas na Sala do Júri, no momento do veredito.',
        data: btoa(String.fromCharCode(...new TextEncoder().encode(payload))),
      };
      solutionOpen = false;
      touch('SHERLOCK_ENGINE_CASE001_FULL');
      renderPanel();
    };
    box.append(g, save);
  }
  s.append(box);
  return s;
}

function bruto() {
  const s = section('JSON BRUTO', 'Edição direta de qualquer arquivo do caso (com verificação de sintaxe ao aplicar).');
  const sel = el('select', 'input raw-select');
  for (const name of CANON) sel.append(el('option', '', name));
  const ta = el('textarea', 'raw');
  const status = el('div', 'ed-sub', '');
  const load = () => { ta.value = JSON.stringify(data[sel.value], null, 2); status.textContent = ''; };
  sel.onchange = load;
  const apply = el('button', 'btn btn-primary', 'APLICAR');
  apply.onclick = () => {
    try {
      data[sel.value] = JSON.parse(ta.value);
      touch(sel.value);
      status.textContent = '✔ aplicado';
    } catch (err) {
      status.textContent = `✕ JSON inválido: ${err.message}`;
    }
  };
  s.append(sel, ta, apply, status);
  load();
  return s;
}

// ── novo caso (SDK) ──────────────────────────────────────────────────────────
function newCase() {
  modal('✚ Novo caso (template do SDK)', `
    <div class="ed-grid">
      <div class="ed-field"><label>ID (ex.: CASE002)</label><input class="input" id="nc-id" value="CASE002"></div>
      <div class="ed-field"><label>Título</label><input class="input" id="nc-title" value="Silêncio na Serra"></div>
      <div class="ed-field"><label>Cidade</label><input class="input" id="nc-city" value="Curitiba - PR"></div>
    </div>
    <p class="ed-sub">Cria os 7 JSONs do caso a partir de SHERLOCK_CASE_CREATOR_SDK.entity_templates. O caso atual em edição será substituído (exporte antes, se necessário).</p>`, [
    { label: 'CRIAR', primary: true, onClick: () => {
      const id = $('#nc-id').value.trim() || 'CASE002';
      const title = $('#nc-title').value.trim();
      const city = $('#nc-city').value.trim();
      const sdk = data.SHERLOCK_CASE_CREATOR_SDK?.entity_templates ?? {};
      caseId = id;
      data.SHERLOCK_ENGINE_CASE001_FULL = {
        schema: 'SHERLOCK_ENGINE_CASE001_FULL', version: '1.0',
        case: { ...(data.SHERLOCK_CASE_CREATOR_SDK?.case_template ?? {}), id, title, city, status: 'Design', objective: '' },
        acts: [1, 2, 3, 4].map((n) => ({ id: `ACT${n}`, title: `Ato ${n}`, goal: '' })),
        critical_path: [], red_herrings: [],
        dependencies: [
          { from: 'PERICIA', to: 'INTELIGENCIA', token: 'CAFE' },
          { from: 'INTELIGENCIA', to: 'ARQUIVO', token: 'RODAS' },
          { from: 'ARQUIVO', to: 'CAMPO', token: 'ROTAS' },
          { from: 'CAMPO', to: 'PERICIA', token: 'KM18' },
        ],
        final_solution: { sealed: true, encoding: 'base64', note: 'Defina a solução no painel Solução.', data: btoa('{"suspect":"","location":"","method":"","proofs":[]}') },
        completion: { required: ['4 códigos do cofre', 'Linha do tempo correta', 'Acusação correta'], score_rank: { 560: 'Detetive de Elite', 460: 'Investigador Sênior', 360: 'Caso Resolvido' } },
      };
      data.CASE001_EVENTS_FULL = { schema: 'CASE001_EVENTS_FULL', version: '1.0', case: id, timeline: [{ ...(sdk.event ?? {}), id: 'EVT0001', time: '14:00', title: 'Início', location: '', trigger: 'Início do caso', effects: [] }], dynamic_events: [], player_choices: [], unlock_matrix: {}, scoring: { critical_event: 100, optional_event: 25, secret_event: 75 } };
      data.CASE001_EVIDENCES_FULL = { schema: 'CASE001_EVIDENCES_FULL', version: '1.0', case: id, evidences: [], evidence_levels: { Baixa: 10, 'Média': 30, Alta: 60, 'Crítica': 100 }, jury_requirements: [] };
      data.CASE001_DOCUMENTS_FULL = { schema: 'CASE001_DOCUMENTS_FULL', version: '1.0', case: id, documents: [], index: {} };
      data.CASE001_DIALOGUES_FULL = { schema: 'CASE001_DIALOGUES_FULL', version: '1.0', case: id, dialogue_tree: {}, conversation_rules: { max_questions_per_round: 5, allow_repeat: true, memory_enabled: true, stress_affects_answers: true, evidence_unlocks_new_topics: true }, voice_tags: {}, cinematic_triggers: [] };
      data.CASE001_COMPLETE_WORLD_STATE = { schema: 'CASE001_COMPLETE_WORLD_STATE', version: '1.0', case: id, global_state: { current_time: '14:00', weather_cycle: [], game_flags: {} }, state_timeline: [], area_states: {}, simulation: {} };
      data.CASE001_IMAGES_FULL = { schema: 'CASE001_IMAGES_FULL', version: '1.0', case: id, style: {}, categories: {}, statistics: {} };
      dirty = new Set(CANON);
      panel = 'caso';
      renderPanel();
      validate();
    } },
    { label: 'CANCELAR' },
  ]);
}

// ── exportação ───────────────────────────────────────────────────────────────
const exportName = (canon) => canon.replace('CASE001', caseId);

function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function exportJsons() {
  for (const name of CANON) {
    downloadBlob(new Blob([JSON.stringify(data[name], null, 2)], { type: 'application/json' }), `${exportName(name)}.json`);
  }
}

function exportZip() {
  const files = CANON.map((name) => ({
    name: `cases/${caseId}/${exportName(name)}.json`,
    text: JSON.stringify(data[name], null, 2),
  }));
  files.push({ name: `cases/${caseId}/README.txt`, text: `Caso ${caseId} exportado pelo Sherlock Studio.\nColoque a pasta em cases/ e registre no MASTER_PROJECT se necessário.\n` });
  downloadBlob(makeZip(files), `${caseId}.zip`);
}

// ── boot do estúdio ──────────────────────────────────────────────────────────
async function main() {
  await loadAll();
  const nav = $('#studio-nav');
  for (const [id, label] of PANELS) {
    const b = el('button', 'nav-item', label);
    b.dataset.p = id;
    b.onclick = () => { panel = id; renderPanel(); };
    nav.append(b);
  }
  $('#btn-validate').onclick = validate;
  $('#btn-export-json').onclick = exportJsons;
  $('#btn-export-zip').onclick = exportZip;
  $('#btn-new').onclick = newCase;
  renderPanel();
  validate();
}

main().catch((err) => {
  $('#studio-panel').innerHTML = `<div class="ed-title">Falha ao carregar: ${esc(err.message)}</div><p class="ed-sub">Sirva a pasta SHERLOCK_ENGINE por um servidor local e abra /editor/.</p>`;
});
