/**
 * screens/interrogate.js — Interrogatórios multi-caso: elenco, depoimentos e
 * a contradição decisiva vêm do CONTENT_PACK; árvore de tópicos do CASE_DIALOGUES.
 */
import { getModule } from '../database.js';
import { screenShell, el, toast, modal } from '../uiManager.js';
import { getCase, getPack } from '../caseState.js';
import { interrogatable, characterName, characterRole, intro, topicsFor, ask, presentEvidence, getStress, moodFor, moodLine, witnessStatement, markInterrogated, hasTree } from '../dialogManager.js';
import { enigmaButton } from '../enigmas.js';
import { portrait } from '../art.js';
import { sfx, ambience, speak } from '../audioManager.js';

export function render() {
  const { body } = screenShell('Interrogatórios', 'CENTRAL › MAPA DE PERSONAGENS (HUMINT)');
  ambience('central');
  const pack = getPack();
  const chars = pack.characters || [];
  const inter = new Map(interrogatable().map((c) => [c.pid, c]));
  const s = getCase();

  // ── Dossiê da vítima no topo ────────────────────────────────────────────
  const victim = chars.find((c) => /vítima|vitima/i.test(c.papel || ''));
  if (victim) {
    const vd = pack.victim_dossier || {};
    const banner = el('section', 'panel victim-dossier');
    banner.innerHTML = `
      <div class="suspect-portrait big">${portrait(victim.id)}</div>
      <div class="victim-meta">
        <span class="row-tag danger">VÍTIMA</span>
        <b>${victim.nome}</b><span class="muted">${victim.profissao || ''}</span>
        <p>${vd.resumo || ''}</p>
        ${vd.ligacoes?.length ? `<div class="victim-links">${vd.ligacoes.map((l) => `<span class="chip-link">${l}</span>`).join('')}</div>` : ''}
      </div>`;
    body.append(banner);
  }

  // ── Elenco agrupado por papel ───────────────────────────────────────────
  const groupOf = (c) => {
    const p = (c.papel || '').toLowerCase();
    if (p.includes('vítima') || p.includes('vitima')) return null;
    if (p.includes('suspeit') || p.includes('red herring') || p.includes('anfitri')) return 'SUSPEITOS';
    if (p.includes('testemunha')) return 'TESTEMUNHAS';
    return 'EQUIPE E OUTROS';
  };
  for (const groupName of ['SUSPEITOS', 'TESTEMUNHAS', 'EQUIPE E OUTROS']) {
    const members = chars.filter((c) => groupOf(c) === groupName);
    if (!members.length) continue;
    body.append(el('h2', `cast-title ${groupName === 'SUSPEITOS' ? 'hot' : ''}`, groupName));
    const grid = el('div', 'suspect-grid');
    for (const ch of members) {
      const c = inter.get(ch.id);
      const card = el('button', `card suspect-card${c ? '' : ' ficha-only'}`);
      card.innerHTML = `<div class="suspect-portrait">${portrait(ch.id)}</div>
        <b>${ch.nome}</b><span class="muted">${ch.papel}</span><span class="muted small">${ch.profissao || ''}</span>
        ${c && s.interrogated.includes(c.key) ? '<span class="row-tag ok">ouvido</span>' : ''}`;
      card.onclick = () => {
        sfx('door_open');
        if (c) session(c);
        else ficha(ch);
      };
      grid.append(card);
    }
    body.append(grid);
  }

  // ── Grupos e organizações envolvidas ────────────────────────────────────
  const orgs = pack.organizations || [];
  if (orgs.length) {
    body.append(el('h2', 'cast-title', 'GRUPOS E ORGANIZAÇÕES ENVOLVIDAS'));
    const og = el('div', 'org-grid');
    for (const o of orgs) {
      const card = el('div', 'card org-card');
      card.innerHTML = `<span class="org-icon">${o.icone || '🏢'}</span><div><b>${o.nome}</b><span class="muted">${o.desc || ''}</span></div>`;
      og.append(card);
    }
    body.append(og);
  }
}

// ficha de personagem sem interrogatório (contexto do caso)
function ficha(ch) {
  const content = el('div', 'inspect');
  content.innerHTML = `
    <div class="ficha-head">
      <div class="suspect-portrait big">${portrait(ch.id)}</div>
      <div><b>${ch.nome}</b><br><span class="muted">${ch.papel} · ${ch.profissao || ''}</span></div>
    </div>
    <p>${ch.bio || 'Sem anotações no dossiê.'}</p>
    <p class="muted">Personagem de contexto — sem interrogatório formal registrado.</p>`;
  modal(`Ficha — ${ch.nome}`, content, []);
}

function session(c) {
  const tree = hasTree(c.key);
  const content = el('div', 'interro');
  const { close } = modal(`Interrogatório — ${characterName(c.key)}`, content, []);
  markInterrogated(c.key);
  refresh();

  function refresh() {
    const stress = getStress(c.key);
    const mood = moodFor(c.key);
    content.replaceChildren();
    const head = el('div', 'interro-head');
    head.innerHTML = `<div class="suspect-portrait big">${portrait(c.pid)}</div>
      <div class="interro-meta"><b>${characterName(c.key)}</b><span class="muted">${characterRole(c.key)}</span>
      <div class="stress"><span>Estresse</span><div class="stress-bar"><div class="stress-fill${stress >= 80 ? ' hot' : ''}" style="width:${Math.min(100, stress)}%"></div></div><span class="mono">${stress}</span></div>
      <span class="mood mono">estado: ${mood.toUpperCase()}</span></div>`;
    content.append(head);

    const line = tree && mood !== 'neutro' ? (moodLine(c.key) || intro(c.key)) : intro(c.key);
    const speech = el('div', 'speech', `“${line}”`);
    content.append(speech);

    // Depoimento formal (entrega evidências/flags) — convive com os tópicos
    const hasStatement = !!getPack().witness_statements?.[c.key];
    if (hasStatement) {
      const done = getCase().flags?.[`stmt_${c.key}`];
      const b = el('button', 'btn btn-primary', 'REGISTRAR DEPOIMENTO');
      if (done) b.disabled = true;
      b.onclick = () => {
        const txt = witnessStatement(c.key);
        if (txt) { speech.innerHTML = `“${txt}”`; speak(txt); }
        getCase().flags[`stmt_${c.key}`] = true;
        b.disabled = true;
      };
      content.append(b);
    }
    if (tree) {
      const list = el('div', 'topic-list');
      list.append(el('h3', 'panel-title', 'PERGUNTAS'));
      for (const topic of topicsFor(c.key)) {
        const asked = getCase().topicsAsked.includes(`${c.key}:${topic.id}`);
        const b = el('button', `btn topic${topic.locked ? ' locked' : ''}${asked ? ' asked' : ''}`, `${asked ? '✔ ' : ''}${topic.question}${topic.locked ? ' 🔒' : ''}`);
        b.onclick = () => {
          if (topic.locked) return toast(`🔒 Requer: ${topic.lockedBy.join(', ')}`, 'warn');
          const ans = ask(c.key, topic.id);
          if (ans) {
            speech.innerHTML = `“${ans.text}” <span class="truth mono">[análise: ${ans.truth || 'inconclusivo'}]</span>`;
            speak(ans.text, { pitch: 0.9 });
            sfx('radio_beep');
            setTimeout(refresh, 1600);
          }
        };
        list.append(b);
      }
      content.append(list);

      const evs = (getModule('CASE_EVIDENCES')?.evidences || []).filter((e) => getCase().collected.includes(e.id));
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

      // enigma de quebra de álibi (attach kind=interrogation) quando há contradição
      const cRule = getPack().contradiction;
      if (cRule?.enigma && c.key === cRule.character && getCase().contradictions.length) {
        if (getCase().enigmasSolved.includes(cRule.enigma)) {
          content.append(el('div', 'row-tag ok', `✔ Contradição registrada (${cRule.enigma})`));
        } else {
          const b = enigmaButton(cRule.enigma, { onSolved: refresh });
          if (b) content.append(b);
        }
      }
    }

    const done = el('button', 'btn btn-ghost', 'ENCERRAR SESSÃO');
    done.onclick = () => close();
    content.append(done);
  }
}
