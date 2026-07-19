/**
 * deductionEngine.js — Holmes Inference Engine (SHERLOCK_ENGINE_DEDUCTION.json):
 * suspeição por MMO com fatores/eliminações vindos do CONTENT_PACK do caso.
 * NUNCA aponta o culpado — só agrega o que o jogador já provou.
 */
import { getCase, getPack, hasReq } from './caseState.js';

function factTrue(fact) {
  const s = getCase();
  if (fact.startsWith('en:')) return s.enigmasSolved.includes(fact.slice(3));
  if (fact.startsWith('flag:')) return !!s.flags[fact.slice(5)];
  if (fact.startsWith('osint:')) return s.searches.some((q) => q.toLowerCase().includes(fact.slice(6)));
  return hasReq(fact); // ev:/doc:/contradicao/chaves de análise (ex.: docsc_done)
}

/** Suspeição 0-100 por personagem + eliminações ativas. */
export function computeSuspicion(deductionCfg) {
  const weights = Object.fromEntries(
    (deductionCfg?.suspect_model?.factors || []).map((f) => [f.name === 'Álibi' ? 'Alibi' : f.name, f.weight])
  );
  const packDeduction = getPack().deduction || {};
  const result = {};
  for (const [pid, factors] of Object.entries(packDeduction.factors || {})) {
    let score = 0;
    const details = [];
    for (const [factor, facts] of Object.entries(factors)) {
      const proven = facts.filter(factTrue);
      if (proven.length && facts.length) {
        const w = (weights[factor] ?? 0.25) * 100 * (proven.length / facts.length);
        score += w;
        details.push(`${factor === 'Alibi' ? 'Álibi quebrado' : factor}: ${Math.round(w)}`);
      }
    }
    result[pid] = { score: Math.min(100, Math.round(score)), details, eliminated: null };
  }
  for (const rule of packDeduction.eliminations || []) {
    if (rule.when.every(factTrue) && result[rule.suspect]) {
      result[rule.suspect].eliminated = rule.note;
      result[rule.suspect].score = Math.min(result[rule.suspect].score, 10);
    }
  }
  return result;
}

/** Estado da hipótese principal (DEDUCTION.hypothesis_engine.states). */
export function hypothesisState() {
  const s = getCase();
  const critical = getPack().deduction?.critical_enigmas || [];
  const proofs = critical.filter((e) => s.enigmasSolved.includes(e)).length;
  if (s.solved) return 'Confirmada';
  if (critical.length && proofs >= critical.length && s.contradictions.length) return 'Fortalecida';
  if (proofs >= 2) return 'Em análise';
  if (s.collected.length) return 'Hipótese criada';
  return '—';
}
