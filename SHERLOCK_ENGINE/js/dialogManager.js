/**
 * dialogManager.js — Interrogatórios (HUMINT), multi-caso: a árvore vem do
 * alias CASE_DIALOGUES, os depoimentos avulsos/perfis/contradições vêm do
 * CONTENT_PACK do caso ativo. Fallbacks: DIALOGOS.json e HUMINT.json.
 */
import { getModule } from './database.js';
import { getCase, getPack, collectEvidence, addScore } from './caseState.js';
import { emit } from './eventManager.js';

const runtimeStress = {}; // key -> estresse atual da sessão

export function interrogatable() {
  return getPack().interrogatable || [];
}

function findCharacter(pid) {
  const packChar = (getPack().characters || []).find((x) => x.id === pid);
  if (packChar) return packChar;
  return (getModule('SHERLOCK_ENGINE_PERSONAGENS')?.personagens || []).find((x) => x.id === pid);
}

export function characterName(key) {
  const item = interrogatable().find((c) => c.key === key);
  return findCharacter(item?.pid)?.nome || key;
}

export function characterRole(key) {
  const item = interrogatable().find((c) => c.key === key);
  return findCharacter(item?.pid)?.papel || '';
}

// Sexo do personagem para escolher a voz (campo explícito no pack ou heurística
// pelo primeiro nome — exceções cobrem nomes terminados em 'a' que são masculinos).
const MALE_NAMES = new Set(['tito', 'otto', 'ivo', 'téo', 'teo', 'davi', 'padre', 'seu', 'sr.', 'nando', 'franz', 'max', 'léo', 'leo', 'vito', 'beto', 'des.', 'insp.', 'ten.', 'dr.', 'gustavo', 'bruno', 'célio', 'celio', 'caio', 'gregor', 'vicente', 'augusto', 'ernani', 'otacílio', 'otacilio', 'amadeu', 'sandri', 'aluísio', 'aluisio', 'prado', 'souto', 'samir', 'rui', 'otávio', 'otavio', 'sérgio', 'sergio', 'aldo', 'klaus', 'heitor', 'ernesto', 'antônio', 'antonio', 'ícaro', 'icaro', 'carlos', 'joão', 'joao']);
const FEMALE_NAMES = new Set(['dona', 'dra.', 'bel', 'vivi', 'bibi', 'yara', 'duda', 'marina', 'lia', 'sônia', 'sonia', 'vera', 'cátia', 'catia', 'alice', 'helena', 'renata', 'dília', 'dilia', 'wanda', 'bianca', 'camila', 'marta', 'sofia', 'olga', 'rute', 'cida', 'márcia', 'marcia', 'heloísa', 'heloisa']);
export function characterGender(key) {
  const c = findCharacter(interrogatable().find((x) => x.key === key)?.pid);
  const explicit = (c?.sexo || c?.voz?.sexo || '').toLowerCase();
  if (explicit.startsWith('f')) return 'f';
  if (explicit.startsWith('m')) return 'm';
  const first = (c?.nome || key).trim().split(/\s+/)[0].toLowerCase();
  if (FEMALE_NAMES.has(first)) return 'f';
  if (MALE_NAMES.has(first)) return 'm';
  return first.endsWith('a') ? 'f' : 'm'; // heurística final
}

function profiles() {
  return getPack().behavior_profiles || getModule('SHERLOCK_ENGINE_HUMINT')?.behavior_profiles || [];
}

function baseline(key) {
  const prof = profiles().find((p) => characterName(key) === p.character);
  return prof?.baseline?.stress ?? 40;
}

export function getStress(key) {
  if (!(key in runtimeStress)) runtimeStress[key] = baseline(key);
  return runtimeStress[key];
}

export function moodFor(key) {
  const s = getStress(key);
  if (s >= 100) return 'desmascarado';
  if (s >= 80) return 'confrontado';
  if (s >= 60) return 'pressionado';
  return 'neutro';
}

/** Fala de humor: moods do pack (por key) ou do DIALOGOS.json (CASE001). */
export function moodLine(key) {
  const packMoods = (getPack().moods || {})[key];
  if (packMoods) return packMoods[moodFor(key)] || packMoods.neutro;
  const item = interrogatable().find((c) => c.key === key);
  const c = (getModule('SHERLOCK_ENGINE_DIALOGOS')?.personagens || []).find((x) => x.id === item?.dlg);
  return c ? (c.interrogatorio[moodFor(key)] || c.interrogatorio.neutro) : null;
}

export function hasTree(key) {
  return !!(getModule('CASE_DIALOGUES')?.dialogue_tree || {})[key];
}

/** Tópicos disponíveis (árvore do caso) com estado de trava. */
export function topicsFor(key) {
  const topics = (getModule('CASE_DIALOGUES')?.dialogue_tree || {})[key]?.topics || {};
  return Object.entries(topics).map(([id, t]) => ({
    id,
    question: t.question,
    locked: (t.unlock_if || []).some((req) => !reqMet(req)),
    lockedBy: t.unlock_if || [],
    answers: t.answers,
  }));
}

function reqMet(req) {
  const s = getCase();
  if (/^EV\d+/.test(req)) return s.collected.includes(req);
  if (/^DOC\d+/.test(req)) return s.documents.includes(req);
  return !!s.flags[req.toLowerCase()] || s.tokens.includes(req);
}

export function intro(key) {
  const tree = getModule('CASE_DIALOGUES')?.dialogue_tree || {};
  return tree[key]?.intro || (getPack().witness_statements || {})[key]?.intro || '…';
}

/** Faz uma pergunta; retorna a resposta escolhida conforme o humor. */
export function ask(key, topicId) {
  const s = getCase();
  const topic = topicsFor(key).find((t) => t.id === topicId);
  if (!topic || topic.locked) return null;
  const tag = `${key}:${topicId}`;
  const first = !s.topicsAsked.includes(tag);
  if (first) s.topicsAsked.push(tag);
  const idx = moodFor(key) === 'neutro' ? 0 : topic.answers.length - 1;
  const ans = topic.answers[idx];
  if (ans.stress) bumpStress(key, parseInt(ans.stress, 10) || 0);
  if (first && ans.unlock) applyUnlock(key, ans.unlock);
  emit('INTERROGATION_STARTED', { character: key, topic: topicId });
  return { ...ans, mood: moodFor(key) };
}

/** Apresenta uma evidência coletada — gatilhos do perfil comportamental. */
export function presentEvidence(key, evId) {
  const s = getCase();
  const tag = `${key}:${evId}`;
  if (s.presented.includes(tag)) return { repeat: true, text: 'Já apresentado. Nada de novo.' };
  s.presented.push(tag);

  const evName = (getModule('CASE_EVIDENCES')?.evidences || []).find((e) => e.id === evId)?.name || evId;
  const prof = profiles().find((p) => p.character === characterName(key));
  let reaction = `${characterName(key)} observa "${evName}" em silêncio.`;

  for (const trig of prof?.triggers || []) {
    if (!evName.toLowerCase().includes(trig.evidence.toLowerCase().split(' ')[0].toLowerCase())) continue;
    const stressMatch = /\+(\d+)\s*estresse/i.exec(trig.effect);
    if (stressMatch) {
      bumpStress(key, Number(stressMatch[1]));
      reaction = `${characterName(key)} se altera visivelmente. (${trig.effect})`;
    }
    if (/contradi/i.test(trig.effect)) {
      unlockContradiction();
      reaction = `${characterName(key)} gagueja. Uma contradição foi registrada no dossiê.`;
    }
  }

  // contradição decisiva do pack: personagem + tópico perguntado + evidência-chave
  const cRule = getPack().contradiction;
  if (cRule && key === cRule.character && (cRule.evidences || []).includes(evId) && s.topicsAsked.includes(cRule.requiresTopic)) {
    unlockContradiction();
    reaction = cRule.reaction || reaction;
  }
  return { text: reaction, mood: moodFor(key), stress: getStress(key) };
}

function unlockContradiction() {
  const s = getCase();
  const cRule = getPack().contradiction || {};
  const name = cRule.name || 'Contradição';
  if (!s.contradictions.includes(name)) {
    s.contradictions.push(name);
    addScore(25, 'Contradição desbloqueada');
    emit('UI_TOAST', { text: `⚡ ${name} desbloqueada`, kind: 'success' });
    if (cRule.cinematic) emit('UI_CINEMATIC', { id: cRule.cinematic });
  }
}

function applyUnlock(key, unlock) {
  const s = getCase();
  if (/^DOC\d+/.test(unlock)) {
    if (!s.documents.includes(unlock)) {
      s.documents.push(unlock);
      emit('UI_TOAST', { text: `📄 Documento desbloqueado: ${unlock}`, kind: 'info' });
    }
  } else if (/contradi/i.test(unlock)) {
    unlockContradiction();
  } else {
    // desbloqueio simbólico (ex.: "KM18"): vira flag e pode tocar cinemática
    s.flags[`${unlock.toLowerCase()}_confirmado`] = true;
    emit('UI_TOAST', { text: `📍 ${unlock} confirmado por testemunha`, kind: 'info' });
    const cin = (getPack().unlock_cinematics || {})[unlock];
    if (cin) emit('UI_CINEMATIC', { id: cin });
  }
}

function bumpStress(key, delta) {
  runtimeStress[key] = Math.max(0, Math.min(120, getStress(key) + delta));
}

/** Depoimento de testemunha sem árvore (witness_statements do pack). */
export function witnessStatement(key) {
  const s = getCase();
  const extra = (getPack().witness_statements || {})[key];
  if (!extra) return null;
  if (extra.flag && !s.flags[extra.flag]) {
    s.flags[extra.flag] = true;
    addScore(10, `Depoimento registrado: ${characterName(key)}`);
    emit('UI_TOAST', { text: `📝 ${extra.note}`, kind: 'info' });
  }
  if (extra.gives_evidence) collectEvidence(extra.gives_evidence.id, extra.gives_evidence.nome);
  if (!s.interrogated.includes(key)) s.interrogated.push(key);
  return extra.intro;
}

export function markInterrogated(key) {
  const s = getCase();
  if (!s.interrogated.includes(key)) s.interrogated.push(key);
  emit('INTERROGATION_FINISHED', { character: key });
}
