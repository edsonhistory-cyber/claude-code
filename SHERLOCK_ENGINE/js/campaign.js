/**
 * campaign.js — Campanha "Sherlock Chronicles" (SHERLOCK_ENGINE_CAMPAIGN.json)
 * + carreira persistente (SHERLOCK_ENGINE_ACHIEVEMENTS_AND_CAREER.json).
 * A carreira vive em localStorage separada do save do caso (carry_over).
 */
import { getModule } from './database.js';
import { emit } from './eventManager.js';

const CAREER_KEY = 'sherlock_career';

// XP acumulado necessário para cada patente (8 ranks do design)
const RANK_XP = [0, 500, 1200, 2200, 3500, 5200, 7500, 10500];

function emptyCareer() {
  const rep = {};
  for (const r of getModule('SHERLOCK_ENGINE_CAMPAIGN')?.decision_system?.reputation || ['Perícia', 'Imprensa', 'Polícia', 'População']) rep[r] = 50;
  return { xp: 0, achievements: [], reputation: rep, history: {}, created_at: new Date().toISOString() };
}

let career = null;

export function getCareer() {
  if (!career) {
    try { career = { ...emptyCareer(), ...JSON.parse(localStorage.getItem(CAREER_KEY) || '{}') }; }
    catch { career = emptyCareer(); }
  }
  return career;
}

function persist() {
  localStorage.setItem(CAREER_KEY, JSON.stringify(getCareer()));
}

export function levelInfo() {
  const c = getCareer();
  const cfg = getModule('SHERLOCK_ENGINE_ACHIEVEMENTS_AND_CAREER')?.career || {};
  const ranks = cfg.ranks || ['Recruta'];
  let idx = 0;
  for (let i = 0; i < RANK_XP.length; i++) if (c.xp >= RANK_XP[i]) idx = i;
  const level = Math.min(cfg.max_level || 100, Math.floor(c.xp / 120) + 1);
  const next = RANK_XP[idx + 1] ?? null;
  return { rank: ranks[Math.min(idx, ranks.length - 1)], level, xp: c.xp, nextRankXp: next };
}

export function addXp(amount, reason) {
  const c = getCareer();
  const before = levelInfo().rank;
  c.xp += amount;
  persist();
  const after = levelInfo().rank;
  emit('UI_TOAST', { text: `⭐ +${amount} XP — ${reason}`, kind: 'info' });
  if (after !== before) emit('UI_TOAST', { text: `🎖 Promoção: ${after}!`, kind: 'success' });
}

export function grantAchievement(id) {
  const c = getCareer();
  if (c.achievements.includes(id)) return false;
  const ach = (getModule('SHERLOCK_ENGINE_ACHIEVEMENTS_AND_CAREER')?.achievements || []).find((a) => a.id === id);
  if (!ach) return false;
  c.achievements.push(id);
  persist();
  emit('UI_TOAST', { text: `🏅 Conquista: ${ach.name} (+${ach.xp} XP)`, kind: 'success' });
  c.xp += ach.xp;
  persist();
  return true;
}

export function bumpReputation(changes) {
  const c = getCareer();
  for (const [axis, delta] of Object.entries(changes)) {
    if (axis in c.reputation) c.reputation[axis] = Math.max(0, Math.min(100, c.reputation[axis] + delta));
  }
  persist();
}

/** Lista de episódios com estado: available | locked | done. */
export function episodes() {
  const c = getCareer();
  const eps = getModule('SHERLOCK_ENGINE_CAMPAIGN')?.episodes || [];
  return eps.map((ep, i) => {
    const done = !!c.history[ep.id];
    const prev = eps[i - 1];
    const unlocked = ep.unlock === 'Inicial' || (prev && !!c.history[prev.id]);
    return { ...ep, status: done ? 'done' : unlocked ? 'available' : 'locked', best: c.history[ep.id] || null };
  });
}

/** Fecha um episódio: XP (uma vez), conquistas, reputação e histórico. */
export function completeEpisode(caseId, caseState, rankTitle) {
  const c = getCareer();
  const xpCfg = getModule('SHERLOCK_ENGINE_ACHIEVEMENTS_AND_CAREER')?.career?.xp_sources || {};
  const firstTime = !c.history[caseId];

  if (firstTime) {
    const perfect = caseState.hintsUsed === 0 && caseState.verdictAttempts === 1;
    const xp =
      (xpCfg.case_solved ?? 500) +
      (perfect ? (xpCfg.perfect_case ?? 250) : 0) +
      caseState.collected.length * (xpCfg.evidence ?? 25) +
      caseState.documentsRead.length * (xpCfg.document ?? 10) +
      caseState.interrogated.length * (xpCfg.interrogation ?? 40);
    addXp(xp, `Caso ${caseId} resolvido`);

    if (caseState.collected.length) grantAchievement('ACH001');            // Primeira Evidência
    if (caseState.hintsUsed === 0) grantAchievement('ACH002');             // Caso Sem Dicas
    if (caseState.analyzed.length >= 4) grantAchievement('ACH003');        // Perícia Perfeita
    if (caseState.verdictAttempts === 1) grantAchievement('ACH004');       // Acusação Irrefutável
    if (/elite/i.test(rankTitle)) grantAchievement('ACH005');              // Detetive de Elite

    bumpReputation({
      'Polícia': 20,
      'Perícia': Math.min(20, caseState.analyzed.length * 5),
      'Imprensa': caseState.searches.length ? 10 : 0,
      'População': 10 - Math.min(10, (caseState.verdictAttempts - 1) * 5),
    });
  }

  const entry = c.history[caseId] || {};
  if (!entry.score || caseState.score > entry.score) {
    c.history[caseId] = {
      score: caseState.score,
      rank: rankTitle,
      solved_at: new Date().toISOString(),
      stats: {
        evidencias: caseState.collected.length,
        enigmas: caseState.enigmasSolved.length,
        dicas: caseState.hintsUsed,
        vereditos: caseState.verdictAttempts,
      },
    };
  }
  persist();
  return firstTime;
}
