/**
 * difficulty.js — Nível de dificuldade global (persistido fora do save do caso,
 * para valer em toda a campanha). Define o custo das dicas, o peso do erro na
 * acusação, a perda de credibilidade e o quanto a G.R.A.L.H.A. entrega de pista
 * quando o júri rejeita a acusação. "Consequência de errar" mora aqui.
 */
import { emit } from './eventManager.js';

const KEY = 'sherlock_difficulty';

/** fieldHints: 'all' revela quais campos erraram · 'count' só quantos · 'none' nada. */
export const DIFFS = {
  facil: {
    id: 'facil', label: 'Fácil', icon: '🟢',
    hintCost: 10, errMult: 0.5, errCap: 2, credLoss: 8, fieldHints: 'all',
    desc: 'Dicas baratas, o erro perdoa e o júri aponta o que não fecha.',
  },
  normal: {
    id: 'normal', label: 'Normal', icon: '🟡',
    hintCost: 20, errMult: 1, errCap: 4, credLoss: 15, fieldHints: 'count',
    desc: 'O equilíbrio clássico da investigação.',
  },
  dificil: {
    id: 'dificil', label: 'Difícil', icon: '🔴',
    hintCost: 40, errMult: 2, errCap: 6, credLoss: 26, fieldHints: 'none',
    desc: 'Dica cara, erro pesa e o tribunal não dá colher de chá.',
  },
};

/** Nível ativo (objeto completo). Fallback seguro em Normal. */
export function getDifficulty() {
  try { return DIFFS[localStorage.getItem(KEY)] || DIFFS.normal; }
  catch { return DIFFS.normal; }
}

/** Troca o nível; emite UI_DIFFICULTY para quem quiser reagir. */
export function setDifficulty(id) {
  const chosen = DIFFS[id] ? id : 'normal';
  try { localStorage.setItem(KEY, chosen); } catch { /* */ }
  emit('UI_DIFFICULTY', { level: DIFFS[chosen] });
  return DIFFS[chosen];
}

/** Custo (positivo) de uma dica da G.R.A.L.H.A. no nível atual. */
export function hintCost() { return getDifficulty().hintCost; }

/**
 * Penalidade de uma acusação rejeitada, escalando por tentativa e por nível.
 * @param {number} attempt  número da tentativa (1 = primeira)
 * @param {number} base     penalidade-base (valor absoluto, do GAMEPLAY.json)
 */
export function accusationPenalty(attempt, base = 20) {
  const d = getDifficulty();
  const step = Math.min(attempt, d.errCap);
  return Math.round(base * step * d.errMult);
}
