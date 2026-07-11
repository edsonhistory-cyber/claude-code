/**
 * aria.js — A.R.I.A. (Artificial Reasoning & Investigation Assistant).
 * Estados/dicas do SHERLOCK_ENGINE_AI.json. Nunca revela a solução
 * (personality.never_reveal_solution) — as dicas são as do hint_engine.
 */
import { getModule } from './database.js';
import { getCase, useHint } from './caseState.js';
import { subscribe, emit } from './eventManager.js';
import { speak } from './audioManager.js';

let lastHintAt = 0;
let hintLevel = 0;

function cfg() { return getModule('SHERLOCK_ENGINE_AI') || {}; }

export function ariaSay(text, { voice = true } = {}) {
  emit('UI_ARIA', { text });
  if (voice) speak(text, { rate: 1.05, pitch: 1.1 });
}

/** Mensagens contextuais (context_rules) conforme progresso real. */
export function contextMessage() {
  const s = getCase();
  const rules = cfg().context_rules || [];
  const active = {
    garrafa_sem_analise: s.collected.includes('EV001') && !s.analyzed.includes('tox_done'),
    video_bianca_analisado: s.collected.includes('EV003') && !s.enigmasSolved.includes('EN006'),
    linha_tempo_incompleta: !s.timelineDone && s.collected.length >= 2,
  };
  for (const rule of rules) if (active[rule.condition]) return rule.response;
  return null;
}

/** Dica progressiva (níveis 1-3, cooldown do design, -20 pts). */
export function requestHint() {
  const engine = cfg().hint_engine || {};
  const cooldown = (engine.cooldown_seconds ?? 120) * 1000;
  const now = Date.now();
  if (now - lastHintAt < cooldown) {
    const wait = Math.ceil((cooldown - (now - lastHintAt)) / 1000);
    return { text: `Processando… nova dica disponível em ${wait}s.`, penalized: false };
  }
  lastHintAt = now;
  useHint();
  const ctx = contextMessage();
  if (ctx) return { text: ctx, penalized: true };
  const levels = engine.levels || [];
  const level = levels[Math.min(hintLevel++, levels.length - 1)];
  return { text: level?.example ?? 'Reexamine as evidências no mural.', penalized: true };
}

/** Reações automáticas aos eventos do jogo (states do AI.json). */
export function initAria() {
  const states = Object.fromEntries((cfg().states || []).map((s) => [s.id, s.message]));
  subscribe('LOGIN_SUCCESS', () => setTimeout(() => ariaSay(states.WELCOME || 'Bem-vindo, detetive.'), 800));
  subscribe('EVIDENCE_COLLECTED', () => ariaSay(states.NEW_EVIDENCE || 'Nova evidência registrada.', { voice: false }));
  subscribe('SAFE_OPENED', () => ariaSay(states.READY_FOR_JURY || 'A Sala do Júri está disponível.'));
  subscribe('DOSSIER_COMPLETED', ({ dossier, code }) =>
    ariaSay(`Dossiê ${dossier} concluído. Código do cofre obtido: ${code}.`, { voice: false }));
}
