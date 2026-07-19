/**
 * screens/osint.js — Motor de busca investigativo multi-caso: resultados e
 * unlock_rules vêm do CONTENT_PACK (osint[]). Enigma opcional por resultado.
 */
import { screenShell, el, toast } from '../uiManager.js';
import { getCase, getPack, unlockDocument, addScore } from '../caseState.js';
import { enigmaButton } from '../enigmas.js';
import { sfx, ambience } from '../audioManager.js';

export function render() {
  const { body } = screenShell('OSINT', 'CENTRAL › OSINT — FONTES ABERTAS');
  ambience('central');
  const s = getCase();
  const box = el('div', 'panel osint-panel');
  box.innerHTML = `<h2 class="panel-title">MOTOR DE BUSCA INVESTIGATIVO</h2>
    <div class="osint-bar"><input class="input mono" id="osint-q" placeholder="${getPack().osint_placeholder || 'Pesquise nomes, empresas e fatos do caso…'}">
    <button class="btn btn-primary" id="osint-go">PESQUISAR</button></div>
    <div class="muted">Fontes: Notícias · Empresas · Imóveis · Redes Sociais · Telefonia</div>
    <div id="osint-results"></div>
    <div class="osint-history mono">${s.searches.slice(-6).map((q) => `<span>${q}</span>`).join(' · ')}</div>`;
  body.append(box);
  const input = box.querySelector('#osint-q');
  const go = () => search(input.value, box.querySelector('#osint-results'));
  box.querySelector('#osint-go').onclick = go;
  input.addEventListener('keydown', (e) => e.key === 'Enter' && go());
  input.focus();
}

function search(q, out) {
  const s = getCase();
  q = q.trim();
  if (!q) return;
  sfx('typing');
  if (!s.searches.includes(q)) s.searches.push(q);
  out.replaceChildren();
  const hits = (getPack().osint || []).filter((r) => new RegExp(r.match, 'i').test(q));
  if (!hits.length) {
    out.append(el('div', 'card', `Nenhum resultado relevante para <b>"${q}"</b>. Refine com nomes próprios ou empresas do caso.`));
    return;
  }
  for (const hit of hits) {
    const card = el('div', 'card osint-result');
    card.innerHTML = `<b>${hit.title}</b><span class="muted">${hit.source}</span><p>${hit.body}</p>`;
    if (hit.unlock && !s.documents.includes(hit.unlock)) {
      const b = el('button', 'btn btn-primary', `ARQUIVAR: ${hit.unlockLabel}`);
      b.onclick = () => { unlockDocument(hit.unlock); addScore(10, `OSINT: ${hit.unlock}`); toast(`📄 ${hit.unlockLabel} arquivado em Evidências.`, 'success'); b.disabled = true; };
      card.append(b);
    } else if (hit.unlock) {
      card.append(el('span', 'row-tag ok', '✔ documento arquivado'));
    }
    if (hit.enigma) {
      if (s.enigmasSolved.includes(hit.enigma)) card.append(el('span', 'row-tag ok', `✔ ${hit.enigma}: resolvido`));
      else { const b = enigmaButton(hit.enigma, { primary: false }); if (b) card.append(b); }
    }
    out.append(card);
  }
}
