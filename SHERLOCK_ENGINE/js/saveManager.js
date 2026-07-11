/**
 * saveManager.js — Autosave/load em localStorage, conforme SHERLOCK_ENGINE_SAVE.json
 * (save_key, intervalo de autosave e slots de backup). O formato .ssave do
 * SAVEGAME_FORMAT.json fica para fase futura.
 */
import { getModule } from './database.js';
import { emit } from './eventManager.js';

let autosaveTimer = null;

function cfg() {
  return getModule('SHERLOCK_ENGINE_SAVE')?.storage ?? {
    save_key: 'sherlock_case001_save',
    autosave_interval_seconds: 60,
    backup_slots: 5,
  };
}

function emptySave() {
  const save = getModule('SHERLOCK_ENGINE_SAVE') || {};
  return {
    profile: { ...(save.profile || {}), created_at: new Date().toISOString() },
    progress: { ...(save.progress || { current_act: 1 }) },
    inventory: { ...(save.inventory || {}) },
    statistics: { ...(save.statistics || {}) },
    engine_state: { state: 'BOOT', screen: null },
  };
}

export function saveGame(data) {
  const { save_key, backup_slots } = cfg();
  try {
    const current = localStorage.getItem(save_key);
    if (current) {
      // rotaciona backups: slot1 é o mais recente
      for (let i = (backup_slots || 5) - 1; i >= 1; i--) {
        const prev = localStorage.getItem(`${save_key}.bak${i}`);
        if (prev) localStorage.setItem(`${save_key}.bak${i + 1}`, prev);
      }
      localStorage.setItem(`${save_key}.bak1`, current);
    }
    data.profile.last_played = new Date().toISOString();
    localStorage.setItem(save_key, JSON.stringify(data));
    emit('SAVE_GAME', { key: save_key });
    return true;
  } catch (err) {
    console.error('2001_SAVE_FAILED: Falha ao salvar progresso.', err);
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(cfg().save_key);
    if (!raw) return emptySave();
    emit('LOAD_GAME', {});
    return { ...emptySave(), ...JSON.parse(raw) };
  } catch {
    console.warn('[save] progresso corrompido — iniciando novo.');
    return emptySave();
  }
}

/** Liga o autosave periódico; getState() deve devolver o snapshot atual. */
export function startAutosave(getState) {
  stopAutosave();
  const seconds = cfg().autosave_interval_seconds || 60;
  autosaveTimer = setInterval(() => saveGame(getState()), seconds * 1000);
}

export function stopAutosave() {
  if (autosaveTimer) clearInterval(autosaveTimer);
  autosaveTimer = null;
}

export function clearSave() {
  const { save_key, backup_slots } = cfg();
  localStorage.removeItem(save_key);
  for (let i = 1; i <= (backup_slots || 5); i++) localStorage.removeItem(`${save_key}.bak${i}`);
}
