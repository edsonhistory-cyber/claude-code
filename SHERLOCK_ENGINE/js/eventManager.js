/**
 * eventManager.js — Barramento de eventos da engine (emit/subscribe/unsubscribe).
 * Eventos canônicos vêm de SHERLOCK_ENGINE_EVENTS.json (categorias system/
 * investigation/progression) + CORE.event_bus. Eventos fora da lista geram
 * aviso no console em modo dev, mas não são bloqueados.
 */

const listeners = new Map();   // evento -> Set<fn>; '*' recebe tudo
const history = [];            // { event, payload, at } para debug/replay
let knownEvents = null;        // Set<string> ou null (sem validação)

/** Registra a lista de eventos canônicos a partir dos JSONs carregados. */
export function registerKnownEvents(eventsJson, coreJson) {
  knownEvents = new Set();
  for (const list of Object.values(eventsJson?.categories || {})) {
    for (const name of list) knownEvents.add(name);
  }
  for (const name of coreJson?.event_bus?.events || []) knownEvents.add(name);
}

export function subscribe(event, fn) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(fn);
  return () => unsubscribe(event, fn);
}

export function unsubscribe(event, fn) {
  listeners.get(event)?.delete(fn);
}

export function emit(event, payload = {}) {
  // Eventos UI_* são navegação interna do uiManager — fora do catálogo por design.
  if (knownEvents && !knownEvents.has(event) && !event.startsWith('UI_')) {
    console.warn(`[eventos] evento não catalogado em SHERLOCK_ENGINE_EVENTS.json: ${event}`);
  }
  history.push({ event, payload, at: Date.now() });
  for (const fn of listeners.get(event) || []) fn(payload, event);
  for (const fn of listeners.get('*') || []) fn(payload, event);
}

export function getHistory() {
  return [...history];
}
