/**
 * engine.js — boot(), loadCase(), startGame() e a máquina de estados
 * BOOT → LOGIN → CENTRAL → INVESTIGACAO → JURI → RESULTADO → CREDITOS.
 * Roteia os cards da Central para as telas de js/screens/*.
 */
import * as db from './database.js';
import * as events from './eventManager.js';
import * as save from './saveManager.js';
import * as ui from './uiManager.js';
import { getCase, hydrate, reset as resetCase, rankForScore, getPack } from './caseState.js';
import * as campaign from './campaign.js';
import * as scrCampaign from './screens/campaign.js';
import { initAria } from './aria.js';
import { playCinematic } from './cinematics.js';
import { ambience, stopAmbience } from './audioManager.js';
import { setScenePhotos, setPortraitPhotos } from './art.js';

import * as scrMap from './screens/map.js';
import * as scrLab from './screens/lab.js';
import * as scrMural from './screens/mural.js';
import * as scrTimeline from './screens/timeline.js';
import * as scrOsint from './screens/osint.js';
import * as scrGeoint from './screens/geoint.js';
import * as scrInterrogate from './screens/interrogate.js';
import * as scrEvidence from './screens/evidence.js';
import * as scrJury from './screens/jury.js';
import * as scrResult from './screens/result.js';

// Chaves normalizadas (sem acento/caixa) — os nomes vêm do UI.json e a
// composição Unicode pode divergir dos literais deste arquivo.
const normKey = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
const SCREENS = Object.fromEntries(Object.entries({
  'Mapa': scrMap,
  'Laboratorio': scrLab,
  'Mural': scrMural,
  'Linha do Tempo': scrTimeline,
  'OSINT': scrOsint,
  'GEOINT': scrGeoint,
  'Interrogatorios': scrInterrogate,
  'Evidencias': scrEvidence,
}).map(([k, v]) => [normKey(k), v]));

const STATES = ['BOOT', 'LOGIN', 'CAMPANHA', 'CENTRAL', 'INVESTIGACAO', 'JURI', 'RESULTADO', 'CREDITOS'];
const TRANSITIONS = {
  BOOT: ['LOGIN'],
  LOGIN: ['CAMPANHA'],
  CAMPANHA: ['CENTRAL'],
  CENTRAL: ['INVESTIGACAO', 'JURI', 'CAMPANHA'],
  INVESTIGACAO: ['CENTRAL', 'JURI', 'INVESTIGACAO'],
  JURI: ['CENTRAL', 'RESULTADO'],
  RESULTADO: ['CREDITOS', 'CENTRAL', 'CAMPANHA'],
  CREDITOS: ['CENTRAL', 'CAMPANHA'],
};

const engine = { state: 'BOOT', screen: null, caseId: null, player: null, save: null };

export function getState() { return { ...engine }; }

function setState(next, screen = null) {
  if (!STATES.includes(next)) throw new Error(`Estado desconhecido: ${next}`);
  if (engine.state !== next && !TRANSITIONS[engine.state]?.includes(next)) {
    console.warn(`[fsm] transição não prevista: ${engine.state} → ${next}`);
  }
  engine.state = next;
  engine.screen = screen;
  render();
}

function render() {
  switch (engine.state) {
    case 'BOOT': return ui.renderBoot();
    case 'LOGIN': stopAmbience(); return ui.renderLogin(db.getModule('CASE_FULL')?.case);
    case 'CAMPANHA': return scrCampaign.render(engine.player);
    case 'CENTRAL': ambience('central'); return ui.renderCentral(engine.player);
    case 'INVESTIGACAO': return (SCREENS[normKey(engine.screen)] || scrMap).render();
    case 'JURI': return scrJury.render();
    case 'RESULTADO': return scrResult.render();
    case 'CREDITOS': return scrResult.renderCredits();
    default: return ui.renderCentral(engine.player);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Carrega e valida os dados do caso; imprime o relatório de integridade. */
export async function loadCase(caseId) {
  engine.caseId = caseId;
  const report = await db.loadAll(caseId, (done, total) => {
    ui.bootLog(null, (done / total) * 70);
  });
  setScenePhotos(db.getModule('SCENE_PHOTOS')); // fotos reais, se baixadas na build
  setPortraitPhotos(db.getModule('PORTRAIT_PHOTOS')); // retratos IA, se gerados na build
  console.groupCollapsed(`[boot] Relatório de integridade — ${caseId}`);
  console.table(report.stats);
  for (const w of report.warnings) console.warn('aviso:', w);
  for (const e of report.errors) console.error('erro:', e);
  console.groupEnd();
  console.log(`Caso ${caseId} validado: ${report.errors.length} erros de integridade`);
  return report;
}

/** Sequência de boot do UI.json + carga/validação do banco. */
export async function boot() {
  setState('BOOT');
  const caseId = 'CASE001';
  ui.bootLog('Sherlock Engine v1.0 — inicializando', 5);
  await sleep(350);
  ui.bootLog('Checando banco de evidências…', 10);

  const report = await loadCase(caseId);
  events.registerKnownEvents(db.getModule('SHERLOCK_ENGINE_EVENTS'), db.getModule('SHERLOCK_ENGINE_CORE'));
  ui.bootLog(`Carregando módulos… ${report.stats.modulos} módulos OK`, 80);
  ui.renderIntegrityBadge(report);
  await sleep(350);

  const aria = db.getModule('SHERLOCK_ENGINE_AI')?.assistant;
  ui.bootLog(`Inicializando IA… ${aria?.name ?? 'A.R.I.A.'} online`, 92);
  initAria();
  await sleep(350);
  ui.bootLog('Acesso autorizado.', 100);
  await sleep(500);

  engine.save = save.loadGame();
  if (engine.save.case) hydrate(engine.save.case);
  events.emit('BOOT_COMPLETE', { caseId, erros: report.errors.length });
  setState('LOGIN');
}

/** Entra no QG da campanha e liga o autosave. */
export function startGame(player) {
  engine.player = player;
  engine.save.profile.player_name = player;
  save.startAutosave(() => ({
    ...engine.save,
    case: getCase(),
    engine_state: { state: engine.state, screen: engine.screen },
  }));
  setState('CAMPANHA');
}

/** Abre um episódio a partir do QG: carrega o caso, o save dele e a cinemática. */
async function enterEpisode(caseId = 'CASE001') {
  if (caseId !== engine.caseId) {
    const report = await loadCase(caseId); // religa os aliases CASE_* e valida
    if (report.errors.length) console.warn(`[caso] ${caseId} carregou com ${report.errors.length} erro(s) de integridade`);
  }
  save.setActiveCase(caseId);
  resetCase();
  engine.save = save.loadGame();
  engine.save.profile.player_name = engine.player;
  if (engine.save.case) hydrate(engine.save.case);
  const enter = () => { setState('CENTRAL'); save.saveGame({ ...engine.save, case: getCase() }); };
  const isNew = !getCase().collected.length && !getCase().visited.length;
  const cin = getPack().opening_cinematic;
  if (isNew && cin) playCinematic(cin, enter);
  else enter();
}

// ── Ligações do barramento de eventos com a FSM ────────────────────────────
events.subscribe('LOGIN_SUCCESS', ({ player }) => startGame(player));
events.subscribe('UI_OPEN_CARD', ({ card }) => {
  if (normKey(card) === 'SALA DO JURI') setState('JURI');
  else setState('INVESTIGACAO', card);
});
events.subscribe('UI_SELECT_EPISODE', ({ caseId }) => enterEpisode(caseId));
events.subscribe('UI_BACK', () => setState(engine.state === 'CENTRAL' ? 'CAMPANHA' : 'CENTRAL'));
events.subscribe('UI_HOME', () => setState('CENTRAL'));
events.subscribe('UI_GOTO', ({ state }) => setState(state));
events.subscribe('UI_CINEMATIC', ({ id }) => playCinematic(id, () => render()));
events.subscribe('CASE_SOLVED', ({ score }) => {
  campaign.completeEpisode(engine.caseId || 'CASE001', getCase(), rankForScore(score));
  save.saveGame({ ...engine.save, case: getCase() });
});
events.subscribe('DOSSIER_COMPLETED', () => save.saveGame({ ...engine.save, case: getCase() }));

boot().catch((err) => {
  console.error('[boot] falha fatal:', err);
  const node = document.getElementById('app');
  node.innerHTML = `<div class="screen boot-screen"><div class="boot-log"><div class="boot-line boot-error">&gt; FALHA NO BOOT: ${err.message}</div><div class="boot-line">&gt; Sirva o jogo por um servidor local (ex.: python3 -m http.server) e recarregue.</div></div></div>`;
});
