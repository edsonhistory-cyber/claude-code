/**
 * screens/evidence.js — Inventário: evidências com cadeia de custódia
 * (CASE001_EVIDENCES_FULL) e documentos (CASE001_DOCUMENTS_FULL).
 * Enigmas embutidos: EN001 (QR da garrafa), EN002 (cifra no DOC008),
 * EN006 (vídeo da Bianca), EN009 (manifesto DOC003).
 */
import { getModule } from './../database.js';
import { screenShell, el, toast, modal } from '../uiManager.js';
import { getCase, enigmaUnlocked, solveEnigma, failEnigma, unlockDocument, ENIGMA_GATES } from '../caseState.js';
import { sfx, ambience, speak } from '../audioManager.js';

export function render() {
  const { body } = screenShell('Evidências', 'CENTRAL › EVIDÊNCIAS E DOCUMENTOS');
  ambience('central');
  const s = getCase();
  const evs = getModule('CASE001_EVIDENCES_FULL')?.evidences || [];
  const docs = getModule('CASE001_DOCUMENTS_FULL')?.documents || [];

  const wrap = el('div', 'two-col');

  // ── evidências ──
  const left = el('section', 'panel list-panel');
  left.append(el('h2', 'panel-title', `EVIDÊNCIAS (${s.collected.filter((c) => c.startsWith('EV')).length}/${evs.length})`));
  for (const ev of evs) {
    const got = s.collected.includes(ev.id);
    const card = el('button', `card row-card${got ? '' : ' locked'}`);
    card.innerHTML = `<span class="row-id">${ev.id}</span><b>${got ? ev.name : '???'}</b>
      <span class="row-tag ${got ? 'ok' : ''}">${got ? ev.value : 'não coletada'}</span>`;
    if (got) card.onclick = () => inspectEvidence(ev);
    left.append(card);
  }

  // ── documentos ──
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

// DOC010 exige as 4 evidências; DOC002 sai da toxicologia; demais via ações.
function isDocAuto(doc, s) {
  if (doc.id === 'DOC010') return (doc.requires || []).every((r) => s.collected.includes(r));
  return false;
}

// ── Inspeção de evidência (com enigmas) ─────────────────────────────────────
function inspectEvidence(ev) {
  sfx('scanner');
  const s = getCase();
  const content = el('div', 'inspect');
  const chain = (ev.chain_of_custody || []).join(' → ') || 'Coleta → Lacre → Central';
  content.innerHTML = `
    <div class="inspect-grid">
      <div><b>Categoria:</b> ${ev.category}</div>
      <div><b>Coletada em:</b> ${ev.collected_at || '—'} ${ev.collection_time ? '· ' + ev.collection_time : ''}</div>
      <div><b>Custódia:</b> ${chain}</div>
      <div><b>Valor probatório:</b> ${ev.value || '—'}</div>
    </div>
    <div class="findings"><b>Achados:</b><ul>${(ev.findings || []).map((f) => `<li>${f}</li>`).join('') || '<li>Aguardando análise de laboratório.</li>'}</ul></div>`;

  const actions = [];
  if (ev.id === 'EV001') actions.push({ label: s.enigmasSolved.includes('EN001') ? '✔ QR DECIFRADO' : 'ESCANEAR QR OCULTO', primary: true, close: false, onClick: () => { enigmaQR(); return false; } });
  if (ev.id === 'EV003') actions.push({ label: s.enigmasSolved.includes('EN006') ? '✔ VULTO LOCALIZADO' : 'ANALISAR QUADRO A QUADRO', primary: true, close: false, onClick: () => { enigmaVideo(); return false; } });
  modal(`${ev.id} — ${ev.name}`, content, actions);
}

// EN001 — QR da Garrafa (gate: token KM18 + toxicologia)
function enigmaQR() {
  const s = getCase();
  if (s.enigmasSolved.includes('EN001')) return toast('O QR já foi decifrado: chave GLICOSIDEO.', 'success');
  if (!enigmaUnlocked('EN001')) return toast('🔒 ' + ENIGMA_GATES.EN001.hintLocked, 'warn');
  sfx('scanner');
  const frag = 'G L I C O S I D E O'.split(' ');
  const scrambled = [...frag].sort(() => 0.5 - Math.random());
  const content = el('div');
  content.innerHTML = `<p>O scanner recupera o QR parcialmente apagado da tampa. Os fragmentos formam a chave química do laudo — reordene:</p>
    <div class="qr-frags">${scrambled.map((c) => `<button class="btn qr-frag">${c}</button>`).join('')}</div>
    <div class="qr-out mono" id="qr-out">_ _ _ _ _ _ _ _ _ _</div>`;
  let acc = '';
  const { close } = modal('EN001 — QR da Garrafa', content, []);
  content.querySelectorAll('.qr-frag').forEach((b) => {
    b.onclick = () => {
      sfx('typing');
      acc += b.textContent.trim();
      b.disabled = true;
      content.querySelector('#qr-out').textContent = acc.split('').join(' ');
      if (acc.length === 10) {
        if (acc === 'GLICOSIDEO') { solveEnigma('EN001'); toast('🔓 EN001 resolvido! Chave: GLICOSIDEO', 'success'); sfx('unlock'); close(); }
        else { failEnigma('EN001'); toast('Sequência incorreta. O scanner reinicia.', 'warn'); sfx('error'); acc = ''; content.querySelectorAll('.qr-frag').forEach((x) => (x.disabled = false)); content.querySelector('#qr-out').textContent = '_ _ _ _ _ _ _ _ _ _'; }
      }
    };
  });
}

// EN006 — Vídeo da Bianca: encontrar o quadro com o vulto de manga verde
function enigmaVideo() {
  const s = getCase();
  if (s.enigmasSolved.includes('EN006')) return toast('O vulto já foi localizado no quadro 15:47.', 'success');
  if (!enigmaUnlocked('EN006')) return toast('🔒 ' + ENIGMA_GATES.EN006.hintLocked, 'warn');
  const target = 4; // quadro do vulto (15:47)
  const frames = Array.from({ length: 8 }, (_, i) => {
    const t = ['15:35', '15:38', '15:41', '15:44', '15:47', '15:50', '15:53', '15:56'][i];
    const vulto = i === target ? '<rect x="52" y="18" width="10" height="26" rx="3" fill="#2F8B57" opacity=".95"/><circle cx="57" cy="14" r="5" fill="#1c2f42"/>' : '';
    return `<button class="video-frame" data-i="${i}">
      <svg viewBox="0 0 90 56"><rect width="90" height="56" fill="#0b1e30"/>
      <rect x="8" y="30" width="74" height="18" rx="3" fill="#123a5c"/>
      <circle cx="${14 + i * 3}" cy="22" r="6" fill="#44586a"/>${vulto}
      <text x="45" y="52" font-size="7" fill="#7fe3ff" text-anchor="middle" font-family="monospace">${t}</text></svg></button>`;
  }).join('');
  const content = el('div');
  content.innerHTML = `<p>8 quadros extraídos do cartão da Bianca (MON → KM18). Um deles mostra um <b>vulto de manga verde</b> perto do ônibus. Clique nele.</p><div class="video-strip">${frames}</div>`;
  const { close } = modal('EN006 — Vídeo da Bianca', content, []);
  content.querySelectorAll('.video-frame').forEach((b) => {
    b.onclick = () => {
      if (Number(b.dataset.i) === target) { solveEnigma('EN006'); toast('🔓 EN006 resolvido! O vulto aparece às 15:47 — hora exata da parada.', 'success'); sfx('camera_shutter'); close(); }
      else { failEnigma('EN006'); sfx('error'); toast('Nada neste quadro. (-20)', 'warn'); }
    };
  });
}

// ── Documentos ───────────────────────────────────────────────────────────────
function openDocument(doc) {
  sfx('paper_flip');
  const s = getCase();
  if (!s.documentsRead.includes(doc.id)) s.documentsRead.push(doc.id);
  const content = el('div', 'doc-view');
  content.innerHTML = `
    <div class="doc-paper mono">
      <div class="doc-head">${doc.type || 'Documento'} · ${doc.classification || 'Público'} ${doc.author ? '· ' + doc.author : ''}</div>
      <p>${doc.summary || ''}</p>
      ${doc.fields ? `<p><b>Campos:</b> ${doc.fields.join(' · ')}</p>` : ''}
      ${doc.attachments ? `<p><b>Anexos:</b> ${doc.attachments.join(' · ')}</p>` : ''}
      ${docExtra(doc.id)}
    </div>`;
  const actions = [];
  if (doc.id === 'DOC008') actions.push({ label: s.enigmasSolved.includes('EN002') ? '✔ CIFRA QUEBRADA' : 'DECIFRAR (CÉSAR)', primary: true, close: false, onClick: () => { enigmaCifra(); return false; } });
  if (doc.id === 'DOC003') actions.push({ label: s.enigmasSolved.includes('EN009') ? '✔ AUSÊNCIA CONFIRMADA' : 'CRUZAR REEMBARQUE', primary: true, close: false, onClick: () => { enigmaManifesto(); return false; } });
  if (doc.id === 'DOC001') speak('A ingestão ocorreu aproximadamente às dezesseis horas. O veneno estava presente no café da vítima.', { pitch: 0.85 });
  modal(`${doc.id} — ${doc.title}`, content, actions);
}

function docExtra(id) {
  if (id === 'DOC008') return `<div class="cipher">Linha final da planilha, cifrada:<br><b class="mono">FODYH: GHODFDR</b></div>`;
  if (id === 'DOC003') {
    return `<table class="manifest"><tr><th>Passageiro</th><th>Embarque 14:00</th><th>Reembarque 15:30 (JB)</th></tr>
      ${[['Otávio Bandeira', '✔', '✔'], ['Renata Salgado', '✔', '✔'], ['Wanda Kruger', '✔', '✔'], ['Aldo Meireles', '✔', '—'], ['Klaus Vogel', '✔', '✔'], ['Bianca Alcântara', '✔', '✔']]
        .map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</table>`;
  }
  return '';
}

// EN002 — Cifra de César (chave: DELACAO; GHODFDR com deslocamento -3)
function enigmaCifra() {
  const s = getCase();
  if (s.enigmasSolved.includes('EN002')) return toast('A cifra já foi quebrada: DELACAO.', 'success');
  if (!enigmaUnlocked('EN002')) return toast('🔒 ' + ENIGMA_GATES.EN002.hintLocked, 'warn');
  const content = el('div');
  content.innerHTML = `<p>Texto cifrado: <b class="mono">GHODFDR</b></p>
    <p>Cifra de César — cada letra foi deslocada. Descubra a palavra original (dica: G→D…):</p>
    <input class="input mono" id="cifra-in" maxlength="12" placeholder="RESPOSTA" autocomplete="off">`;
  const { close } = modal('EN002 — Cifra de César', content, [
    { label: 'DECIFRAR', primary: true, close: false, onClick: () => {
      const v = content.querySelector('#cifra-in').value.trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (v === 'DELACAO') { solveEnigma('EN002'); toast('🔓 EN002 resolvido! A planilha aponta para a DELAÇÃO.', 'success'); sfx('unlock'); close(); }
      else { failEnigma('EN002'); sfx('error'); toast('Não confere. Tente outro deslocamento. (-20)', 'warn'); }
      return false;
    } },
  ]);
  content.querySelector('#cifra-in').focus();
}

// EN009 — Manifesto: quem não reembarcou (gate: token RODAS)
function enigmaManifesto() {
  const s = getCase();
  if (s.enigmasSolved.includes('EN009')) return toast('Já confirmado: Aldo Meireles não reembarcou.', 'success');
  if (!enigmaUnlocked('EN009')) return toast('🔒 ' + ENIGMA_GATES.EN009.hintLocked, 'warn');
  const options = ['Renata Salgado', 'Aldo Meireles', 'Klaus Vogel', 'Wanda Kruger'];
  const content = el('div');
  content.innerHTML = `<p>Cruzando embarque × reembarque do manifesto: <b>quem NÃO voltou ao ônibus</b> no Jardim Botânico?</p>
    <div class="option-list">${options.map((o) => `<button class="btn option">${o}</button>`).join('')}</div>`;
  const { close } = modal('EN009 — Manifesto', content, []);
  content.querySelectorAll('.option').forEach((b) => {
    b.onclick = () => {
      if (b.textContent === 'Aldo Meireles') { solveEnigma('EN009'); toast('🔓 EN009 resolvido! Aldo saiu no Jardim Botânico — sem oportunidade.', 'success'); sfx('unlock'); close(); }
      else { failEnigma('EN009'); sfx('error'); toast('O manifesto diz o contrário. (-20)', 'warn'); }
    };
  });
}
