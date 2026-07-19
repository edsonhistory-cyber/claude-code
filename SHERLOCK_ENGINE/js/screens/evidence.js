/**
 * screens/evidence.js — Inventário multi-caso (aliases CASE_EVIDENCES /
 * CASE_DOCUMENTS). Enigmas anexados a evidências/documentos via CONTENT_PACK
 * (enigmas[*].attach) e executados pelo enigmas.js.
 */
import { getModule } from '../database.js';
import { objectPhoto } from '../art.js';
import { screenShell, el, modal } from '../uiManager.js';
import { getCase, getPack } from '../caseState.js';
import { enigmaButton, enigmaCfg } from '../enigmas.js';
import { sfx, ambience, speak } from '../audioManager.js';

function attachedEnigmas(kind, ref) {
  return Object.entries(getPack().enigmas || {})
    .filter(([, cfg]) => cfg.attach?.kind === kind && cfg.attach?.ref === ref)
    .map(([id]) => id);
}

export function render() {
  const { body } = screenShell('Evidências', 'CENTRAL › EVIDÊNCIAS E DOCUMENTOS');
  ambience('central');
  const s = getCase();
  const evs = getModule('CASE_EVIDENCES')?.evidences || [];
  const docs = getModule('CASE_DOCUMENTS')?.documents || [];

  const wrap = el('div', 'two-col');

  const left = el('section', 'panel list-panel');
  left.append(el('h2', 'panel-title', `EVIDÊNCIAS (${s.collected.filter((c) => c.startsWith('EV')).length}/${evs.length})`));
  for (const ev of evs) {
    const got = s.collected.includes(ev.id);
    const card = el('button', `card row-card${got ? '' : ' locked'}`);
    const photo = got && objectPhoto(ev.id);
    card.innerHTML = `${photo ? `<img class="row-thumb" src="${photo}" alt="" loading="lazy" onerror="this.remove()">` : ''}
      <span class="row-id">${ev.id}</span><b>${got ? ev.name : '???'}</b>
      <span class="row-tag ${got ? 'ok' : ''}">${got ? ev.value : 'não coletada'}</span>`;
    if (got) card.onclick = () => inspectEvidence(ev);
    left.append(card);
  }

  const right = el('section', 'panel list-panel');
  right.append(el('h2', 'panel-title', `DOCUMENTOS (${s.documents.length}/${docs.length})`));
  for (const doc of docs) {
    const got = s.documents.includes(doc.id) || isDocAuto(doc, s);
    if (got && !s.documents.includes(doc.id)) s.documents.push(doc.id);
    const card = el('button', `card row-card${got ? '' : ' locked'}`);
    card.innerHTML = `<span class="row-id">${doc.id}</span><b>${got ? doc.title : '???'}</b>
      <span class="row-tag ${s.documentsRead.includes(doc.id) ? 'ok' : ''}">${got ? (s.documentsRead.includes(doc.id) ? 'lido' : 'novo') : 'bloqueado'}</span>`;
    if (got) card.onclick = () => openDocument(doc);
    right.append(card);
  }
  // documentos do catálogo global desbloqueados fora da lista do caso (ex.: DOC013)
  const engineDocs = getModule('SHERLOCK_ENGINE_DOCUMENTOS')?.documentos || [];
  for (const id of s.documents.filter((d) => !docs.some((x) => x.id === d))) {
    const meta = engineDocs.find((x) => x.id === id);
    if (!meta) continue;
    const card = el('button', 'card row-card');
    card.innerHTML = `<span class="row-id">${id}</span><b>${meta.titulo}</b><span class="row-tag ok">anexo</span>`;
    card.onclick = () => openDocument({ id, title: meta.titulo, type: meta.categoria, summary: 'Documento anexado ao dossiê pela investigação.' });
    right.append(card);
  }
  wrap.append(left, right);
  body.append(wrap);
}

function isDocAuto(doc, s) {
  return (doc.requires || []).length > 0 && doc.requires.every((r) => s.collected.includes(r));
}

function inspectEvidence(ev) {
  sfx('scanner');
  const content = el('div', 'inspect');
  const chain = (ev.chain_of_custody || []).join(' → ') || 'Coleta → Lacre → Central';
  const photo = objectPhoto(ev.id);
  content.innerHTML = `
    ${photo ? `<img class="inspect-photo" src="${photo}" alt="Foto forense de ${ev.name}" onerror="this.remove()">` : ''}
    <div class="inspect-grid">
      <div><b>Categoria:</b> ${ev.category}</div>
      <div><b>Coletada em:</b> ${ev.collected_at || '—'} ${ev.collection_time ? '· ' + ev.collection_time : ''}</div>
      <div><b>Custódia:</b> ${chain}</div>
      <div><b>Valor probatório:</b> ${ev.value || '—'}</div>
    </div>
    <div class="findings"><b>Achados:</b><ul>${(ev.findings || []).map((f) => `<li>${f}</li>`).join('') || '<li>Aguardando análise de laboratório.</li>'}</ul></div>`;
  const { box } = modal(`${ev.id} — ${ev.name}`, content, []);
  for (const enId of attachedEnigmas('evidence', ev.id)) {
    const b = enigmaButton(enId);
    if (b) box.querySelector('.modal-actions').prepend(b);
  }
}

function openDocument(doc) {
  sfx('paper_flip');
  const s = getCase();
  if (!s.documentsRead.includes(doc.id)) s.documentsRead.push(doc.id);
  const extras = getPack().doc_extras || {};
  const content = el('div', 'doc-view');
  content.innerHTML = `
    <div class="doc-paper mono">
      <div class="doc-head">${doc.type || 'Documento'} · ${doc.classification || 'Público'} ${doc.author ? '· ' + doc.author : ''}</div>
      <p>${doc.summary || ''}</p>
      ${doc.fields ? `<p><b>Campos:</b> ${doc.fields.join(' · ')}</p>` : ''}
      ${doc.attachments ? `<p><b>Anexos:</b> ${doc.attachments.join(' · ')}</p>` : ''}
      ${extras[doc.id] || ''}
    </div>`;
  if (extras[`${doc.id}_speak`]) speak(extras[`${doc.id}_speak`], { pitch: 0.85 });
  const { box } = modal(`${doc.id} — ${doc.title}`, content, []);
  for (const enId of attachedEnigmas('document', doc.id)) {
    const b = enigmaButton(enId);
    if (b) box.querySelector('.modal-actions').prepend(b);
  }
}
