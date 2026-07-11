/**
 * engine.js — boot(), loadCase(), startGame() e a máquina de estados
 * BOOT → LOGIN → CENTRAL → INVESTIGACAO → JURI → RESULTADO (GAMEPLAY.json).
 */
import * as db from './database.js';
import * as events from './eventManager.js';
import * as save from './saveManager.js';
import * as ui from './uiManager.js';

const STATES = ['BOOT', 'LOGIN', 'CENTRAL', 'INVESTIGACAO', 'JURI', 'RESULTADO', 'CREDITOS'];
const TRANSITIONS = {
  BOOT: ['LOGIN'],
  LOGIN: ['CENTRAL'],
  CENTRAL: ['INVESTIGACAO', 'JURI'],
  INVESTIGACAO: ['CENTRAL', 'JURI'],
  JURI: ['CENTRAL', 'RESULTADO'],
  RESULTADO: ['CREDITOS', 'CENTRAL'],
  CREDITOS: ['CENTRAL'],
};

const engine = {
  state: 'BOOT',
  screen: null,          // card aberto quando em INVESTIGACAO
  caseId: null,
  player: null,
  save: null,
};

export function getState() {
  return { ...engine };
}

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
    case 'LOGIN': return ui.renderLogin(db.getModule('SHERLOCK_ENGINE_CASE001_FULL')?.case);
    case 'CENTRAL': return ui.renderCentral(engine.player);
    case 'INVESTIGACAO': return ui.renderPlaceholder(engine.screen);
    case 'JURI': return ui.renderPlaceholder('Sala do Júri');
    case 'RESULTADO': return ui.renderPlaceholder('Resultado');
    default: return ui.renderPlaceholder(engine.state);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Carrega e valida os dados do caso; imprime o relatório de integridade. */
export async function loadCase(caseId) {
  engine.caseId = caseId;
  const report = await db.loadAll(caseId, (done, total) => {
    ui.bootLog(null, (done / total) * 70); // carregamento = 70% da barra
  });

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

  // Passos visuais da tela BOOT (UI.json): Logo → banco → módulos → IA → acesso
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
  await sleep(350);
  ui.bootLog('Acesso autorizado.', 100);
  await sleep(500);

  engine.save = save.loadGame();
  events.emit('BOOT_COMPLETE', { caseId, erros: report.errors.length });
  setState('LOGIN');
}

/** Entra na Central e liga o autosave. */
export function startGame(player) {
  engine.player = player;
  engine.save.profile.player_name = player;
  save.startAutosave(() => ({ ...engine.save, engine_state: { state: engine.state, screen: engine.screen } }));
  save.saveGame(engine.save);
  setState('CENTRAL');
}

// ── Ligações do barramento de eventos com a FSM ────────────────────────────
events.subscribe('LOGIN_SUCCESS', ({ player }) => startGame(player));
events.subscribe('UI_OPEN_CARD', ({ card }) => {
  if (card === 'Sala do Júri') setState('JURI');
  else setState('INVESTIGACAO', card);
});
events.subscribe('UI_BACK', () => setState('CENTRAL'));
events.subscribe('UI_HOME', () => setState('CENTRAL'));

// UI_* são eventos internos de navegação (não fazem parte do EVENTS.json);
// registra para não poluir o console com avisos.
events.subscribe('*', () => {});

boot().catch((err) => {
  console.error('[boot] falha fatal:', err);
  const el = document.getElementById('app');
  el.innerHTML = `<div class="screen boot-screen"><div class="boot-log"><div class="boot-line boot-error">&gt; FALHA NO BOOT: ${err.message}</div><div class="boot-line">&gt; Sirva o jogo por um servidor local (ex.: python3 -m http.server) e recarregue.</div></div></div>`;
});
