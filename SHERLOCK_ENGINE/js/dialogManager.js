/**
 * dialogManager.js — Interrogatórios (HUMINT): funde a árvore do caso
 * (CASE001_DIALOGUES_FULL) com os humores do DIALOGOS.json e os gatilhos de
 * estresse do HUMINT.json. Apresentar evidências muda o comportamento e pode
 * desbloquear contradições e novas evidências.
 */
import { getModule } from './database.js';
import { getCase, collectEvidence, hasReq, addScore } from './caseState.js';
import { emit } from './eventManager.js';

// Personagens interrogáveis: chave da árvore do caso + id de PERSONAGENS
export const INTERROGATABLE = [
  { key: 'SERGIO_BENTO', pid: 'P002', dlg: 'sergio' },
  { key: 'RENATA_SALGADO', pid: 'P004', dlg: 'renata' },
  { key: 'DILIA_KARAS', pid: 'P003', dlg: 'dilia' },
  { key: 'BIANCA_ALCANTARA', pid: 'P007', dlg: 'bianca' },
  { key: 'WANDA_KRUGER', pid: 'P006', dlg: null },
  { key: 'ALDO_MEIRELES', pid: 'P005', dlg: null },
  { key: 'KLAUS_VOGEL', pid: 'P008', dlg: null },
];

// Falas extras dos personagens sem árvore no caso (testemunhas/red herrings) —
// derivadas dos red_herrings do CASE001_FULL e do world state.
const EXTRA_STATEMENTS = {
  WANDA_KRUGER: {
    intro: 'Eu ofereci meu chá de ervas ao Otávio no Jardim Botânico. Ele recusou — disse que só bebia o próprio café.',
    flag: 'cha_recusado',
    note: 'Wanda conhece plantas tóxicas, mas o chá foi recusado.',
  },
  ALDO_MEIRELES: {
    intro: 'Sim, discuti com o Otávio no Jardim Botânico. Sociedade desfeita é ferida aberta. Depois disso fui embora de táxi.',
    flag: 'aldo_discussao',
    note: 'Aldo admite a discussão e diz que não voltou ao ônibus.',
  },
  KLAUS_VOGEL: {
    intro: 'Meu nome verdadeiro não é Vogel. Sou detetive particular — fui contratado para vigiar o Otávio, não para machucá-lo.',
    flag: 'klaus_identidade',
    note: 'Klaus usa nome falso, mas é detetive particular.',
  },
  BIANCA_ALCANTARA: {
    intro: 'Eu gravei praticamente toda a viagem. Pode ficar com o cartão de memória — tem horas de vídeo aí, inclusive perto daquela parada estranha.',
    flag: 'bianca_video',
    note: 'Bianca entregou o cartão com os vídeos da viagem.',
  },
};

const runtimeStress = {}; // key -> estresse atual da sessão

export function characterName(key) {
  const item = INTERROGATABLE.find((c) => c.key === key);
  const p = (getModule('SHERLOCK_ENGINE_PERSONAGENS')?.personagens || []).find((x) => x.id === item?.pid);
  return p?.nome || key;
}

export function characterRole(key) {
  const item = INTERROGATABLE.find((c) => c.key === key);
  const p = (getModule('SHERLOCK_ENGINE_PERSONAGENS')?.personagens || []).find((x) => x.id === item?.pid);
  return p?.papel || '';
}

function baseline(key) {
  const profiles = getModule('SHERLOCK_ENGINE_HUMINT')?.behavior_profiles || [];
  const prof = profiles.find((p) => characterName(key) === p.character);
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

/** Fala de humor do DIALOGOS.json para o estado atual. */
export function moodLine(key) {
  const item = INTERROGATABLE.find((c) => c.key === key);
  const chars = getModule('SHERLOCK_ENGINE_DIALOGOS')?.personagens || [];
  const c = chars.find((x) => x.id === item?.dlg);
  if (!c) return null;
  const mood = moodFor(key);
  return c.interrogatorio[mood] || c.interrogatorio.neutro;
}

/** Tópicos disponíveis (árvore do caso) com estado de trava. */
export function topicsFor(key) {
  const tree = getModule('CASE001_DIALOGUES_FULL')?.dialogue_tree || {};
  const topics = tree[key]?.topics || {};
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
  const tree = getModule('CASE001_DIALOGUES_FULL')?.dialogue_tree || {};
  return tree[key]?.intro || EXTRA_STATEMENTS[key]?.intro || '…';
}

/** Faz uma pergunta; retorna a resposta escolhida conforme o humor. */
export function ask(key, topicId) {
  const s = getCase();
  const topic = topicsFor(key).find((t) => t.id === topicId);
  if (!topic || topic.locked) return null;
  const tag = `${key}:${topicId}`;
  const first = !s.topicsAsked.includes(tag);
  if (first) s.topicsAsked.push(tag);
  // sob pressão o personagem tende à resposta mais defensiva (última)
  const idx = moodFor(key) === 'neutro' ? 0 : topic.answers.length - 1;
  const ans = topic.answers[idx];
  if (ans.stress) bumpStress(key, parseInt(ans.stress, 10) || 0);
  if (first && ans.unlock) applyUnlock(key, ans.unlock);
  emit('INTERROGATION_STARTED', { character: key, topic: topicId });
  return { ...ans, mood: moodFor(key) };
}

/** Apresenta uma evidência coletada — gatilhos do HUMINT.json. */
export function presentEvidence(key, evId) {
  const s = getCase();
  const tag = `${key}:${evId}`;
  if (s.presented.includes(tag)) return { repeat: true, text: 'Já apresentado. Nada de novo.' };
  s.presented.push(tag);

  const evName = (getModule('CASE001_EVIDENCES_FULL')?.evidences || []).find((e) => e.id === evId)?.name || evId;
  const profiles = getModule('SHERLOCK_ENGINE_HUMINT')?.behavior_profiles || [];
  const prof = profiles.find((p) => p.character === characterName(key));
  let reaction = `${characterName(key)} observa "${evName}" em silêncio.`;

  for (const trig of prof?.triggers || []) {
    if (!evName.toLowerCase().includes(trig.evidence.toLowerCase().split(' ')[0].toLowerCase())) continue;
    const stressMatch = /\+(\d+)\s*estresse/i.exec(trig.effect);
    if (stressMatch) {
      bumpStress(key, Number(stressMatch[1]));
      reaction = `${characterName(key)} se altera visivelmente. (${trig.effect})`;
    }
    if (/contradi/i.test(trig.effect)) {
      unlockContradiction(key);
      reaction = `${characterName(key)} gagueja. Uma contradição foi registrada no dossiê.`;
    }
  }
  // fibra/luvas em cima do "nunca toquei nela" → Contradição 01 (árvore do caso)
  if (key === 'SERGIO_BENTO' && (evId === 'EV002' || evId === 'EV001') && s.topicsAsked.includes('SERGIO_BENTO:garrafa')) {
    unlockContradiction(key);
    reaction = 'Sérgio disse que nunca tocou na garrafa — a análise de fibras diz o contrário. Contradição 01 registrada.';
  }
  return { text: reaction, mood: moodFor(key), stress: getStress(key) };
}

function unlockContradiction(key) {
  const s = getCase();
  if (!s.contradictions.includes('Contradição 01')) {
    s.contradictions.push('Contradição 01');
    addScore(25, 'Contradição desbloqueada');
    emit('UI_TOAST', { text: '⚡ Contradição 01 desbloqueada', kind: 'success' });
    emit('UI_CINEMATIC', { id: 'CIN002' });
  }
}

function applyUnlock(key, unlock) {
  const s = getCase();
  if (/^DOC\d+/.test(unlock)) {
    if (!s.documents.includes(unlock)) {
      s.documents.push(unlock);
      emit('UI_TOAST', { text: `📄 Documento desbloqueado: ${unlock}`, kind: 'info' });
    }
  } else if (unlock === 'KM18') {
    s.flags.km18_confirmado = true;
    emit('UI_TOAST', { text: '📍 KM18 confirmado por testemunha', kind: 'info' });
    emit('UI_CINEMATIC', { id: 'CIN003' });
  } else if (/contradi/i.test(unlock)) {
    unlockContradiction(key);
  }
}

function bumpStress(key, delta) {
  runtimeStress[key] = Math.max(0, Math.min(120, getStress(key) + delta));
}

/** Conversa com testemunhas sem árvore: solta o depoimento e seta a flag. */
export function witnessStatement(key) {
  const s = getCase();
  const extra = EXTRA_STATEMENTS[key];
  if (!extra) return null;
  if (extra.flag && !s.flags[extra.flag]) {
    s.flags[extra.flag] = true;
    addScore(10, `Depoimento registrado: ${characterName(key)}`);
    emit('UI_TOAST', { text: `📝 ${extra.note}`, kind: 'info' });
  }
  // Bianca entrega o vídeo quando questionada
  if (key === 'BIANCA_ALCANTARA') collectEvidence('EV003', 'Vídeo da Bianca');
  if (!s.interrogated.includes(key)) s.interrogated.push(key);
  return extra.intro;
}

export function markInterrogated(key) {
  const s = getCase();
  if (!s.interrogated.includes(key)) s.interrogated.push(key);
  emit('INTERROGATION_FINISHED', { character: key });
}

// Bianca também entrega o vídeo pela árvore? Ela não tem árvore no caso; via witnessStatement.
export { EXTRA_STATEMENTS };
