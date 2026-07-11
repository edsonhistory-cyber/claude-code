/**
 * screens/interrogate.js — Interrogatórios (HUMINT): tópicos da árvore do caso,
 * medidor de estresse, apresentação de evidências e EN005 (álibis/contradição).
 */
import { getModule } from '../database.js';
import { screenShell, el, toast, modal } from '../uiManager.js';
import { getCase, solveEnigma, failEnigma, enigmaUnlocked, ENIGMA_GATES } from '../caseState.js';
import { INTERROGATABLE, characterName, characterRole, intro, topicsFor, ask, presentEvidence, getStress, moodFor, moodLine, witnessStatement, markInterrogated } from '../dialogManager.js';
import { portrait } from '../art.js';
import { sfx, ambience, speak } from '../audioManager.js';

export function render() {
  const { body } = screenShell('Interrogatórios', 'CENTRAL › INTERROGATÓRIOS (HUMINT)');
  ambience('central');
  const grid = el('div', 'suspect-grid');
  for (const c of INTERROGATABLE) {
    const s = getCase();
    const card = el('button', 'card suspect-card');
    card.innerHTML = `<div class="suspect-portrait">${portrait(c.pid)}</div>
      <b>${characterName(c.key)}</b><span class="muted">${characterRole(c.key)}</span>
      ${s.interrogated.includes(c.key) ? '<span class="row-tag ok">ouvido</span>' : ''}`;
    card.onclick = () => { sfx('door_open'); session(c); };
    grid.append(card);
  }
  body.append(grid);
}

function session(c) {
  const hasTree = !!(getModule('CASE001_DIALOGUES_FULL')?.dialogue_tree || {})[c.key];
  const content = el('div', 'interro');
  const { close } = modal(`Interrogatório — ${characterName(c.key)}`, content, []);
  markInterrogated(c.key);
  refresh();

  function refresh() {
    const s = getCase();
    const stress = getStress(c.key);
    const mood = moodFor(c.key);
    content.replaceChildren();
    const head = el('div', 'interro-head');
    head.innerHTML = `<div class="suspect-portrait big">${portrait(c.pid)}</div>
      <div class="interro-meta"><b>${characterName(c.key)}</b><span class="muted">${characterRole(c.key)}</span>
      <div class="stress"><span>Estresse</span><div class="stress-bar"><div class="stress-fill${stress >= 80 ? ' hot' : ''}" style="width:${Math.min(100, stress)}%"></div></div><span class="mono">${stress}</span></div>
      <span class="mood mono">estado: ${mood.toUpperCase()}</span></div>`;
    content.append(head);

    const line = hasTree && mood !== 'neutro' ? moodLine(c.key) : intro(c.key);
    const speech = el('div', 'speech', `“${line}”`);
    content.append(speech);

    if (!hasTree) {
      const b = el('button', 'btn btn-primary', 'REGISTRAR DEPOIMENTO');
      b.onclick = () => { const txt = witnessStatement(c.key); speech.innerHTML = `“${txt}”`; speak(txt); b.disabled = true; };
      content.append(b);
    } else {
      const topics = topicsFor(c.key);
      const list = el('div', 'topic-list');
      list.append(el('h3', 'panel-title', 'PERGUNTAS'));
      for (const topic of topics) {
        const asked = getCase().topicsAsked.includes(`${c.key}:${topic.id}`);
        const b = el('button', `btn topic${topic.locked ? ' locked' : ''}${asked ? ' asked' : ''}`, `${asked ? '✔ ' : ''}${topic.question}${topic.locked ? ' 🔒' : ''}`);
        b.onclick = () => {
          if (topic.locked) return toast(`🔒 Requer: ${topic.lockedBy.join(', ')}`, 'warn');
          const ans = ask(c.key, topic.id);
          if (ans) {
            speech.innerHTML = `“${ans.text}” <span class="truth mono">[análise: ${ans.truth || 'inconclusivo'}]</span>`;
            speak(ans.text, { pitch: c.dlg === 'sergio' ? 0.8 : 1.0 });
            sfx('radio_beep');
            setTimeout(refresh, 1600);
          }
        };
        list.append(b);
      }
      content.append(list);

      // apresentar evidências
      const evs = (getModule('CASE001_EVIDENCES_FULL')?.evidences || []).filter((e) => getCase().collected.includes(e.id));
      if (evs.length) {
        const pres = el('div', 'present-list');
        pres.append(el('h3', 'panel-title', 'APRESENTAR EVIDÊNCIA'));
        for (const ev of evs) {
          const b = el('button', 'btn option', `${ev.id} — ${ev.name}`);
          b.onclick = () => {
            const r = presentEvidence(c.key, ev.id);
            speech.innerHTML = r.text;
            sfx('camera_shutter');
            setTimeout(refresh, 1400);
          };
          pres.append(b);
        }
        content.append(pres);
      }

      // EN005 — registrar a contradição de Sérgio
      if (c.key === 'SERGIO_BENTO' && getCase().contradictions.length && !getCase().enigmasSolved.includes('EN005')) {
        const b = el('button', 'btn btn-primary', 'REGISTRAR CONTRADIÇÃO NO DOSSIÊ (EN005)');
        b.onclick = () => enigmaAlibi(refresh);
        content.append(b);
      }
      if (getCase().enigmasSolved.includes('EN005')) content.append(el('div', 'row-tag ok', '✔ Contradição registrada (EN005)'));
    }

    const done = el('button', 'btn btn-ghost', 'ENCERRAR SESSÃO');
    done.onclick = () => close();
    content.append(done);
  }
}

// EN005 — escolher o par de declarações contraditórias
function enigmaAlibi(refresh) {
  if (!enigmaUnlocked('EN005')) return toast('🔒 ' + ENIGMA_GATES.EN005.hintLocked, 'warn');
  const pairs = [
    { a: '“Achei que havia um problema no freio.”', b: 'Tacógrafo: sem falha mecânica registrada.', ok: false },
    { a: '“Nunca toquei nela.” (garrafa)', b: 'Fibras da luva idênticas à microfibra da tampa.', ok: true },
    { a: '“Foi verificação de rotina.”', b: 'Dília: “a parada não fazia parte da rota”.', ok: false },
  ];
  const content = el('div');
  content.innerHTML = `<p>Qual par de declarações forma a <b>contradição decisiva</b> (a que liga o suspeito à arma do crime)?</p>
    <div class="option-list">${pairs.map((p, i) => `<button class="btn option" data-i="${i}"><b>${p.a}</b><br><span class="muted">×</span> ${p.b}</button>`).join('')}</div>`;
  const { close } = modal('EN005 — Quebra de Álibi', content, []);
  content.querySelectorAll('.option').forEach((b) => {
    b.onclick = () => {
      if (pairs[Number(b.dataset.i)].ok) { solveEnigma('EN005'); toast('🔓 EN005 resolvido! Álibi de Sérgio formalmente quebrado.', 'success'); sfx('unlock'); close(); refresh(); }
      else { failEnigma('EN005'); sfx('error'); toast('Contradição relevante, mas não decisiva. (-20)', 'warn'); }
    };
  });
}
