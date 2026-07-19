/**
 * printKit.js — "Jogo híbrido": gera um dossiê PRINT-AND-PLAY do caso ativo e
 * abre o diálogo de impressão do navegador (→ Salvar como PDF). Tudo offline,
 * sem bibliotecas: usa os mesmos dados do CONTENT_PACK que o jogo digital.
 *
 * A solução vai numa página "lacrada" impressa DE CABEÇA PARA BAIXO, com aviso
 * — o jogador só vira a folha no final (mantém o mistério, como na Sala do Júri).
 */
import { getModule } from './database.js';
import { getPack } from './caseState.js';
import { el } from './uiManager.js';
import { portrait } from './art.js';
import { sfx } from './audioManager.js';

const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const stripTags = (s) => String(s ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

function decodeSolution() {
  try {
    const sealed = getModule('CASE_FULL')?.final_solution;
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(sealed.data), (c) => c.charCodeAt(0))));
  } catch { return null; }
}

/** Gabarito legível de um enigma (para a folha de respostas lacrada). */
function enigmaAnswer(cfg) {
  if (!cfg) return '—';
  if (cfg.type === 'choice') return stripTags(cfg.options?.[cfg.correct] ?? '—');
  if (cfg.type === 'frames') return `Janela ${(cfg.correct ?? 0) + 1} (${cfg.times?.[cfg.correct] ?? '—'})`;
  if (cfg.type === 'compare') return `Amostra ${(cfg.correct ?? 0) + 1} (idêntica à referência)`;
  return cfg.answer ?? '—';
}

function page(inner, cls = '') {
  return `<section class="pk-page ${cls}">${inner}</section>`;
}

function buildDoc() {
  const pack = getPack();
  const full = getModule('CASE_FULL') || {};
  const b = pack.briefing || {};
  const caseId = full.case?.id || pack.case || '';
  const title = full.case?.title || b.title || 'Caso';
  const chars = pack.characters || [];
  const charById = (id) => chars.find((c) => c.id === id);
  const evs = getModule('CASE_EVIDENCES')?.evidences || [];
  const docs = getModule('CASE_DOCUMENTS')?.documents || [];
  const tree = getModule('CASE_DIALOGUES')?.dialogue_tree || {};
  const timeline = getModule('CASE_EVENTS')?.timeline || [];
  const jury = pack.jury || {};
  const sol = decodeSolution();

  const out = [];

  // ── CAPA ────────────────────────────────────────────────────────────────
  out.push(page(`
    <div class="pk-cover">
      <div class="pk-crest turin-onca"></div>
      <div class="pk-kicker">SHERLOCK ENGINE · EDIÇÃO PARA IMPRIMIR</div>
      <h1 class="pk-title">${esc(title)}</h1>
      <div class="pk-sub">${esc(b.local || full.case?.city || 'Curitiba — PR')}</div>
      <div class="pk-meta">CASO ${esc(caseId)} · ${esc(b.data || '')}</div>
      <p class="pk-syn">${esc(stripTags(b.synopsis || pack.victim_dossier?.resumo || ''))}</p>
      <div class="pk-howto">
        <b>Como jogar no papel</b>
        <ol>
          <li>Leia o briefing e conheça o elenco e os locais.</li>
          <li>Percorra as <i>Evidências</i>, <i>Documentos</i> e <i>Interrogatórios</i>.</li>
          <li>Resolva os <i>Enigmas</i> e reconstrua a <i>Linha do Tempo</i>.</li>
          <li>Preencha a <i>Folha de Acusação</i> (quem · onde · como).</li>
          <li>Só então vire a última folha (de cabeça para baixo) e confira a solução.</li>
        </ol>
      </div>
    </div>`, 'pk-cover-page'));

  // ── ELENCO ──────────────────────────────────────────────────────────────
  const cast = chars.filter((c) => !/vítima|vitima/i.test(c.papel || '')).map((c) => `
    <div class="pk-card pk-person">
      <div class="pk-portrait">${portrait(c.id, c.nome)}</div>
      <div><b>${esc(c.nome)}</b><span class="pk-role">${esc(c.papel || '')}${c.profissao ? ' · ' + esc(c.profissao) : ''}</span>
      ${c.bio ? `<p class="pk-bio">${esc(c.bio)}</p>` : ''}</div>
    </div>`).join('');
  const victim = chars.find((c) => /vítima|vitima/i.test(c.papel || ''));
  out.push(page(`
    <h2 class="pk-h2">Elenco</h2>
    ${victim ? `<div class="pk-card pk-person pk-victim"><div class="pk-portrait">${portrait(victim.id, victim.nome)}</div>
      <div><b>${esc(victim.nome)}</b> <span class="pk-tag">VÍTIMA</span><span class="pk-role">${esc(victim.profissao || '')}</span>
      <p class="pk-bio">${esc(stripTags(pack.victim_dossier?.resumo || ''))}</p></div></div>` : ''}
    <div class="pk-grid2">${cast}</div>`));

  // ── LOCAIS ──────────────────────────────────────────────────────────────
  const stops = (pack.stops || []).map((s) => {
    const hs = (pack.hotspots?.[s.id] || []).map((h) => `<li><b>${esc(h.nome)}</b>${h.desc ? ' — ' + esc(h.desc) : ''}</li>`).join('');
    return `<div class="pk-card"><b>${esc(s.name)}</b>${s.time && s.time !== '—' ? ` <span class="pk-tag">${esc(s.time)}</span>` : ''}
      ${hs ? `<ul class="pk-list">${hs}</ul>` : ''}</div>`;
  }).join('');
  out.push(page(`<h2 class="pk-h2">Mapa & Locais</h2><div class="pk-muted">${esc(pack.map_title || '')}</div>${stops}`));

  // ── EVIDÊNCIAS (cartas recortáveis) ─────────────────────────────────────
  const evCards = evs.map((e) => `
    <div class="pk-cut">
      <div class="pk-cut-h">🧾 ${esc(e.name)} <span class="pk-tag">${esc(e.value || e.category || '')}</span></div>
      <div class="pk-muted">${esc(e.collected_at || '')}${e.collection_time ? ' · ' + esc(e.collection_time) : ''}</div>
      ${(e.findings || []).length ? `<ul class="pk-list">${e.findings.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
    </div>`).join('');
  out.push(page(`<h2 class="pk-h2">Evidências <span class="pk-hint">✂ recorte as cartas</span></h2><div class="pk-grid2">${evCards}</div>`));

  // ── DOCUMENTOS ──────────────────────────────────────────────────────────
  const docCards = docs.filter((d) => !/relatório final|conclus/i.test(d.type || d.title || '')).map((d) => `
    <div class="pk-card"><b>${esc(d.title)}</b>${d.type ? ` <span class="pk-tag">${esc(d.type)}</span>` : ''}
      <p class="pk-bio">${esc(stripTags(d.summary || ''))}</p></div>`).join('');
  out.push(page(`<h2 class="pk-h2">Documentos & Laudos</h2>${docCards}`));

  // ── INTERROGATÓRIOS ─────────────────────────────────────────────────────
  const interros = (pack.interrogatable || []).map((it) => {
    const c = charById(it.pid);
    const node = tree[it.key];
    const ws = pack.witness_statements?.[it.key];
    if (!node && !ws) return '';
    const intro = node?.intro || ws?.intro || '';
    const qas = node?.topics ? Object.values(node.topics).map((t) => {
      const a = (t.answers || [])[0];
      return `<div class="pk-qa"><b>P:</b> ${esc(t.question)}<br><b>R:</b> ${esc(a?.text || '—')}
        ${a?.truth ? `<span class="pk-truth">[${esc(a.truth)}]</span>` : ''}</div>`;
    }).join('') : (ws?.note ? `<div class="pk-qa">${esc(ws.note)}</div>` : '');
    return `<div class="pk-card"><b>${esc(c?.nome || it.key)}</b>${c?.papel ? ` <span class="pk-tag">${esc(c.papel)}</span>` : ''}
      ${intro ? `<p class="pk-quote">“${esc(intro)}”</p>` : ''}${qas}</div>`;
  }).join('');
  out.push(page(`<h2 class="pk-h2">Interrogatórios <span class="pk-hint">(conduzidos pelo mestre)</span></h2>${interros}`));

  // ── ENIGMAS ─────────────────────────────────────────────────────────────
  const enigmas = Object.entries(pack.enigmas || {}).map(([id, cfg]) => `
    <div class="pk-card"><b>${esc(cfg.title || id)}</b>
      <p class="pk-bio">${esc(stripTags(cfg.prompt || ''))}</p>
      ${cfg.type === 'choice' && cfg.options ? `<ol class="pk-choices">${cfg.options.map((o) => `<li>${esc(stripTags(o))}</li>`).join('')}</ol>`
        : `<div class="pk-blank">Resposta: ______________________________</div>`}
    </div>`).join('');
  out.push(page(`<h2 class="pk-h2">Enigmas</h2>${enigmas}`));

  // ── LINHA DO TEMPO (embaralhada para reordenar) ─────────────────────────
  const shuffled = timeline.map((e, i) => [e, i]).sort((a, c) => ((a[1] * 7 + 3) % timeline.length) - ((c[1] * 7 + 3) % timeline.length));
  const tlCards = shuffled.map(([e]) => `<div class="pk-cut pk-tl"><span class="pk-order">___</span> <b>${esc(e.title)}</b>
    <span class="pk-muted">${esc(e.location || '')}</span></div>`).join('');
  out.push(page(`<h2 class="pk-h2">Linha do Tempo <span class="pk-hint">numere na ordem correta</span></h2>${tlCards}`));

  // ── FOLHA DE ACUSAÇÃO ───────────────────────────────────────────────────
  const optList = (arr) => (arr || []).map((x) => {
    const nome = charById(x)?.nome || x;
    return `<label class="pk-opt">◻ ${esc(nome)}</label>`;
  }).join('');
  out.push(page(`
    <h2 class="pk-h2">Folha de Acusação — Sala do Júri</h2>
    <div class="pk-accuse">
      <div><b>QUEM?</b>${optList(jury.suspects)}</div>
      <div><b>ONDE?</b>${(jury.locations || []).map((l) => `<label class="pk-opt">◻ ${esc(l)}</label>`).join('')}</div>
      <div><b>COMO?</b>${(jury.methods || []).map((m) => `<label class="pk-opt">◻ ${esc(m)}</label>`).join('')}</div>
    </div>
    <p class="pk-blank">Justificativa (provas decisivas): _______________________________________________</p>`));

  // ── SOLUÇÃO LACRADA (de cabeça para baixo) ──────────────────────────────
  const answerKey = Object.entries(pack.enigmas || {}).map(([id, cfg]) => `<li><b>${esc(id)}:</b> ${esc(enigmaAnswer(cfg))}</li>`).join('');
  const order = timeline.map((e, i) => `${i + 1}. ${esc(e.title)}`).join(' → ');
  const redH = (full.red_herrings || []).map((r) => `<li><b>${esc(r.character)}:</b> ${esc(r.reason)}</li>`).join('');
  const solInner = sol ? `
    <div class="pk-seal-warn">⚠ NÃO VIRE ESTA FOLHA ATÉ O FIM DO JOGO</div>
    <div class="pk-sealed">
      <h2 class="pk-h2">Solução — Caso ${esc(caseId)}</h2>
      <p class="pk-sol"><b>Culpado(a):</b> ${esc(sol.suspect)}<br>
      <b>Local:</b> ${esc(sol.location)}<br><b>Método:</b> ${esc(sol.method)}</p>
      ${(sol.proofs || []).length ? `<p><b>Provas decisivas:</b></p><ul class="pk-list">${sol.proofs.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
      ${redH ? `<p><b>Pistas falsas (red herrings):</b></p><ul class="pk-list">${redH}</ul>` : ''}
      <p><b>Gabarito dos enigmas:</b></p><ul class="pk-list pk-2col">${answerKey}</ul>
      <p><b>Linha do tempo correta:</b><br><span class="pk-muted">${order}</span></p>
    </div>` : '<div class="pk-seal-warn">Solução indisponível.</div>';
  out.push(page(solInner, 'pk-seal-page'));

  return out.join('');
}

/** Abre a pré-visualização do dossiê e o diálogo de impressão. */
export function openPrintKit() {
  document.querySelector('.printkit-overlay')?.remove();
  const ov = el('div', 'printkit-overlay');
  const bar = el('div', 'printkit-bar');
  bar.innerHTML = `<span class="printkit-title">🖨 Dossiê para imprimir — jogo híbrido</span>
    <span class="printkit-tip">Dica: em "Destino", escolha <b>Salvar como PDF</b>.</span>`;
  const doPrint = el('button', 'btn btn-primary', 'IMPRIMIR / SALVAR PDF');
  doPrint.onclick = () => { sfx('paper_flip'); window.print(); };
  const close = el('button', 'btn btn-ghost', 'FECHAR');
  close.onclick = () => ov.remove();
  bar.append(doPrint, close);
  const doc = el('div', 'printkit-doc');
  doc.innerHTML = buildDoc();
  ov.append(bar, doc);
  document.body.append(ov);
  sfx('paper_flip');
}
