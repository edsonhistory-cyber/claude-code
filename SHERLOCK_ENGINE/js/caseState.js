/**
 * caseState.js — Estado de gameplay do caso: evidências, documentos, enigmas,
 * tokens dos dossiês, códigos do cofre, pontuação e progressão de atos.
 * Regras vindas de SHERLOCK_ENGINE_GAMEPLAY.json e SHERLOCK_ENGINE_CASE001_FULL.json.
 */
import { getModule } from './database.js';
import { emit } from './eventManager.js';

// Dossiês → enigmas (ciclo de tokens do CASE001: cada dossiê tem enigmas livres
// e no máximo um gate pelo token recebido — CAMPO recebe ROTAS como bônus, sem gate,
// exatamente o "ciclo sem deadlock" do design).
export const DOSSIERS = {
  PERICIA: { nome: 'Perícia', enigmas: ['EN007', 'EN001'], code: 'PER-77', emits: 'CAFE', receives: 'KM18' },
  INTELIGENCIA: { nome: 'Inteligência', enigmas: ['EN002', 'EN006', 'EN008'], code: 'INT-40', emits: 'RODAS', receives: 'CAFE' },
  ARQUIVO: { nome: 'Arquivo', enigmas: ['EN009'], code: 'ARQ-02', emits: 'ROTAS', receives: 'RODAS' },
  CAMPO: { nome: 'Campo', enigmas: ['EN003', 'EN004', 'EN005'], code: 'CAM-19', emits: 'KM18', receives: 'ROTAS' },
};

// Gates de enigma (pré-requisitos além do token do dossiê)
export const ENIGMA_GATES = {
  EN001: { token: 'KM18', needs: ['tox_done'], hintLocked: 'Requer o token KM18 (Campo) e a toxicologia concluída.' },
  EN002: { needs: ['doc:DOC008'], hintLocked: 'Requer a Planilha de Codinomes (DOC008 — pesquise no OSINT).' },
  EN003: { needs: ['ev:EV004'], hintLocked: 'Requer o tacógrafo coletado no ônibus.' },
  EN004: {},
  EN005: { needs: ['contradicao'], hintLocked: 'Requer a Contradição 01 (confronte Sérgio com a análise de fibras).' },
  EN006: { needs: ['ev:EV003'], hintLocked: 'Requer o vídeo da Bianca (converse com ela nos Interrogatórios).' },
  EN007: { needs: ['ev:EV001', 'ev:EV002', 'fib_done'], hintLocked: 'Requer garrafa e luvas coletadas e a microscopia de fibras.' },
  EN008: { token: 'CAFE', hintLocked: 'Requer o token CAFE (Perícia).' },
  EN009: { token: 'RODAS', needs: ['doc:DOC003'], hintLocked: 'Requer o token RODAS (Inteligência) e o Manifesto lido.' },
};

const state = {
  act: 1,
  score: 0,
  collected: [],        // EV001..EV004 (+ objetos coletáveis OBJxxx)
  analyzed: [],         // testes concluídos: 'tox_done','fib_done','afis_done','docsc_done'
  documents: [],        // DOCxxx desbloqueados
  documentsRead: [],
  interrogated: [],     // personagens já ouvidos
  topicsAsked: [],      // 'SERGIO_BENTO:rota'
  contradictions: [],   // 'Contradição 01'
  presented: [],        // evidências apresentadas em interrogatório 'SERGIO:EV002'
  enigmasSolved: [],    // ENxxx
  tokens: [],           // CAFE, RODAS, KM18, ROTAS
  codes: [],            // PER-77...
  visited: [],          // paradas visitadas
  timelineDone: false,
  safeOpened: false,
  juryUnlocked: false,
  verdictAttempts: 0,
  solved: false,
  hintsUsed: 0,
  searches: [],         // consultas OSINT
  muralLinks: [],       // conexões feitas no mural
  suspicion: {},        // P00x -> 0..100 (deductionEngine)
  flags: {},            // avulsos
};

export function getCase() { return state; }

export function hydrate(saved) {
  if (saved && typeof saved === 'object') Object.assign(state, saved);
}

export function addScore(points, reason) {
  state.score = Math.max(0, state.score + points);
  emit('UI_SCORE', { points, reason, total: state.score });
}

const scoreCfg = () => getModule('SHERLOCK_ENGINE_GAMEPLAY')?.score || {};

export function collectEvidence(id, name) {
  if (state.collected.includes(id)) return false;
  state.collected.push(id);
  addScore(scoreCfg().coletar_evidencia ?? 10, `Evidência coletada: ${name || id}`);
  emit('EVIDENCE_COLLECTED', { evidenceId: id });
  updateAct();
  return true;
}

export function unlockDocument(id) {
  if (state.documents.includes(id)) return false;
  state.documents.push(id);
  emit('DOCUMENT_OPENED', { documentId: id });
  return true;
}

export function markAnalyzed(key) {
  if (!state.analyzed.includes(key)) state.analyzed.push(key);
  updateAct();
}

export function hasReq(req) {
  if (req.startsWith('ev:')) return state.collected.includes(req.slice(3));
  if (req.startsWith('doc:')) return state.documents.includes(req.slice(4));
  if (req === 'contradicao') return state.contradictions.length > 0;
  return state.analyzed.includes(req) || !!state.flags[req];
}

export function enigmaUnlocked(id) {
  const gate = ENIGMA_GATES[id] || {};
  if (gate.token && !state.tokens.includes(gate.token)) return false;
  return (gate.needs || []).every(hasReq);
}

export function solveEnigma(id) {
  if (state.enigmasSolved.includes(id)) return;
  state.enigmasSolved.push(id);
  addScore(scoreCfg().resolver_enigma ?? 50, `Enigma resolvido: ${id}`);
  emit('TOKEN_UNLOCKED', { token: id });
  // dossiê completo → código do cofre + token emitido para o próximo dossiê
  for (const [key, d] of Object.entries(DOSSIERS)) {
    if (d.enigmas.every((e) => state.enigmasSolved.includes(e)) && !state.codes.includes(d.code)) {
      state.codes.push(d.code);
      if (!state.tokens.includes(d.emits)) state.tokens.push(d.emits);
      emit('DOSSIER_COMPLETED', { dossier: key, code: d.code, token: d.emits });
    }
  }
  updateAct();
}

export function failEnigma(id) {
  addScore(-(getModule('SHERLOCK_ENGINE_ENIGMAS')?.enigmas.find((e) => e.id === id)?.falha?.penalidade_pontos ?? 20), `Tentativa incorreta (${id})`);
}

export function useHint() {
  state.hintsUsed++;
  addScore(-20, 'Dica usada');
}

export function completeTimeline() {
  if (state.timelineDone) return;
  state.timelineDone = true;
  addScore(scoreCfg().linha_tempo ?? 80, 'Linha do tempo reconstruída');
  emit('TIMELINE_UPDATED', { complete: true });
  updateAct();
}

export function openSafe() {
  if (state.safeOpened) return;
  state.safeOpened = true;
  state.juryUnlocked = true;
  addScore(scoreCfg().cofre ?? 100, 'Cofre aberto');
  emit('SAFE_OPENED', {});
  emit('JURY_UNLOCKED', {});
  updateAct();
}

export function juryRequirementsMet() {
  return state.codes.length === 4 && state.timelineDone;
}

export function updateAct() {
  // ACT1 Embarque → ACT2 KM18 (tacógrafo/parada) → ACT3 Laboratório (toxicologia) → ACT4 Júri
  let act = 1;
  if (state.collected.includes('EV004') || state.enigmasSolved.includes('EN004')) act = 2;
  if (state.analyzed.includes('tox_done')) act = 3;
  if (state.safeOpened) act = 4;
  if (act !== state.act) {
    state.act = act;
    emit('UI_ACT', { act });
  }
}

export function rankForScore(score) {
  const ranks = getModule('SHERLOCK_ENGINE_CASE001_FULL')?.completion?.score_rank || {};
  const sorted = Object.entries(ranks).map(([k, v]) => [Number(k), v]).sort((a, b) => b[0] - a[0]);
  for (const [min, title] of sorted) if (score >= min) return title;
  return 'Investigador em Treinamento';
}
