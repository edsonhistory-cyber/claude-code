/**
 * deductionEngine.js — Holmes Inference Engine (SHERLOCK_ENGINE_DEDUCTION.json):
 * suspeição por MMO (Motivo/Meios/Oportunidade/Álibi) e regras R001-R003.
 * NUNCA aponta o culpado — só agrega o que o jogador já provou.
 */
import { getCase } from './caseState.js';

// Fatores MMO por suspeito, ligados a fatos que o JOGADOR desbloqueia.
// Cada fato soma o peso do fator (DEDUCTION.suspect_model) × 100.
const FACTOR_FACTS = {
  P002: { // Sérgio Bento
    Motivo: ['doc:DOC006', 'osint:sb'],          // registro funcional 2019 + SB Fretamentos
    Meios: ['en:EN007', 'en:EN001'],             // fibra compatível + veneno na garrafa
    Oportunidade: ['en:EN003', 'en:EN004', 'en:EN006'], // parada 15:47 + KM18 + vulto
    Alibi: ['contradicao'],                      // álibi quebrado (contradição)
  },
  P004: { // Renata Salgado
    Motivo: ['doc:DOC009'],                      // escuta: precisava dele vivo (inverte)
    Meios: [],
    Oportunidade: [],
    Alibi: [],
  },
  P005: { // Aldo Meireles
    Motivo: ['doc:DOC007'],                      // discussão/passado
    Meios: [],
    Oportunidade: ['en:EN009'],                  // manifesto prova que NÃO reembarcou (inverte)
    Alibi: [],
  },
  P006: { // Wanda Kruger
    Motivo: [],
    Meios: ['flag:cha_recusado'],                // conhece plantas, mas chá recusado (inverte)
    Oportunidade: [],
    Alibi: [],
  },
  P008: { // Klaus Vogel
    Motivo: ['flag:klaus_identidade'],           // nome falso… mas é detetive (inverte)
    Meios: [],
    Oportunidade: [],
    Alibi: [],
  },
};

// Regras de inferência do design: eliminações de red herrings
const ELIMINATION_RULES = [
  { id: 'R002', suspect: 'P006', when: ['en:EN001', 'flag:cha_recusado'], note: 'Chá recusado + veneno no café eliminam Wanda como autora.' },
  { id: 'R003', suspect: 'P005', when: ['en:EN009'], note: 'O manifesto prova que Aldo não reembarcou — sem oportunidade.' },
  { id: 'R004', suspect: 'P004', when: ['doc:DOC009'], note: 'A escuta confirma: Renata precisava de Otávio vivo.' },
];

function factTrue(fact) {
  const s = getCase();
  if (fact.startsWith('en:')) return s.enigmasSolved.includes(fact.slice(3));
  if (fact.startsWith('doc:')) return s.documents.includes(fact.slice(4));
  if (fact.startsWith('flag:')) return !!s.flags[fact.slice(5)];
  if (fact === 'contradicao') return s.contradictions.length > 0;
  if (fact === 'osint:sb') return s.searches.some((q) => q.toLowerCase().includes('sb fretamentos'));
  return false;
}

/** Suspeição 0-100 por personagem + eliminações ativas. */
export function computeSuspicion(deductionCfg) {
  const weights = Object.fromEntries(
    (deductionCfg?.suspect_model?.factors || []).map((f) => [f.name === 'Álibi' ? 'Alibi' : f.name, f.weight])
  );
  const result = {};
  for (const [pid, factors] of Object.entries(FACTOR_FACTS)) {
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
  for (const rule of ELIMINATION_RULES) {
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
  const criticalProofs = ['EN001', 'EN003', 'EN006', 'EN007'].filter((e) => s.enigmasSolved.includes(e)).length;
  if (s.solved) return 'Confirmada';
  if (criticalProofs >= 4 && s.contradictions.length) return 'Fortalecida';
  if (criticalProofs >= 2) return 'Em análise';
  if (s.collected.length) return 'Hipótese criada';
  return '—';
}
