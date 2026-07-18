/**
 * caseState.js — Estado de gameplay do caso: evidências, documentos, enigmas,
 * tokens dos dossiês, códigos do cofre, pontuação e progressão de atos.
 * Regras vindas de SHERLOCK_ENGINE_GAMEPLAY.json e SHERLOCK_ENGINE_CASE001_FULL.json.
 */
import { getModule } from './database.js';
import { emit } from './eventManager.js';

// Dossiês, gates de enigma e regras de progressão vêm do CONTENT_PACK do caso
// ativo (alias CASE_PACK) — a engine é multi-caso (CORE.supports_new_cases).
export function getPack() {
  return getModule('CASE_PACK') || {};
}

export function getDossiers() {
  return getPack().dossiers || {};
}

export function gateFor(id) {
  return (getPack().enigma_gates || {})[id] || {};
}

export function gateHint(id) {
  return gateFor(id).hintLocked || 'Pré-requisitos pendentes para este enigma.';
}

const EMPTY = () => ({
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
  muralPos: {},         // id do nó -> {x,y} em % (arraste livre no quadro)
  muralPostits: [],     // {id, x, y, text} anotações livres do jogador
  muralPinned: [],      // pids de suspeitos fixados no quadro
  muralPhotos: [],      // {id, x, y, src} imagens (upload/colar), reduzidas
  muralHidden: [],      // ids de pistas removidas do quadro pelo jogador
  suspicion: {},        // P00x -> 0..100 (deductionEngine)
  flags: {},            // avulsos
});

let state = EMPTY();

export function getCase() { return state; }

export function hydrate(saved) {
  state = EMPTY();
  if (saved && typeof saved === 'object') Object.assign(state, saved);
}

/** Zera o estado ao trocar de caso. */
export function reset() {
  state = EMPTY();
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
  const gate = gateFor(id);
  if (gate.token && !state.tokens.includes(gate.token)) return false;
  return (gate.needs || []).every(hasReq);
}

export function solveEnigma(id) {
  if (state.enigmasSolved.includes(id)) return;
  state.enigmasSolved.push(id);
  addScore(scoreCfg().resolver_enigma ?? 50, `Enigma resolvido: ${id}`);
  emit('TOKEN_UNLOCKED', { token: id });
  // dossiê completo → código do cofre + token emitido para o próximo dossiê
  for (const [key, d] of Object.entries(getDossiers())) {
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
  return state.codes.length === Object.keys(getDossiers()).length && state.timelineDone;
}

// requisito com prefixo en: também é aceito nas regras de progressão do pack
function progressReq(req) {
  if (req.startsWith('en:')) return state.enigmasSolved.includes(req.slice(3));
  return hasReq(req);
}

export function updateAct() {
  // regras do pack (acts_progress): ato 2/3 por condição, ato 4 = cofre aberto
  const rules = getPack().acts_progress || {};
  let act = 1;
  if ((rules.act2 || []).some(progressReq)) act = 2;
  if ((rules.act3 || []).some(progressReq)) act = 3;
  if (state.safeOpened) act = 4;
  if (act !== state.act) {
    state.act = act;
    emit('UI_ACT', { act });
  }
}

export function rankForScore(score) {
  const ranks = getModule('CASE_FULL')?.completion?.score_rank || {};
  const sorted = Object.entries(ranks).map(([k, v]) => [Number(k), v]).sort((a, b) => b[0] - a[0]);
  for (const [min, title] of sorted) if (score >= min) return title;
  return 'Investigador em Treinamento';
}
