/**
 * screens/campaign.js — QG da campanha "Sherlock Chronicles" (campaign_hub):
 * seleção de episódios, carreira (patente/XP/reputação) e sala de troféus.
 */
import { getModule, CASE_FILES } from '../database.js';
import { el, screenShell } from '../uiManager.js';
import { episodes, getCareer, levelInfo } from '../campaign.js';
import { sceneArt } from '../art.js';
import { emit } from '../eventManager.js';
import { sfx, ambience } from '../audioManager.js';

const EPISODE_ART = {
  CASE001: 'rua 24 horas',
  CASE002: 'serra',
  CASE003: 'mon',
  CASE004: 'central',
};

export function render(player) {
  const { body } = screenShell('Campanha', `SHERLOCK CHRONICLES · QG · ${player || 'Detetive'}`);
  ambience('central');
  const camp = getModule('SHERLOCK_ENGINE_CAMPAIGN');
  const info = levelInfo();
  const career = getCareer();

  // ── carreira ──
  const head = el('div', 'panel career-panel');
  const nextTxt = info.nextRankXp ? `${info.xp}/${info.nextRankXp} XP para a próxima patente` : `${info.xp} XP · patente máxima`;
  head.innerHTML = `
    <div class="career-rank"><span class="career-badge">🎖</span>
      <div><b>${info.rank.toUpperCase()}</b><span class="muted">nível ${info.level} · ${nextTxt}</span></div></div>
    <div class="career-xpbar"><div style="width:${info.nextRankXp ? Math.min(100, (info.xp / info.nextRankXp) * 100) : 100}%"></div></div>
    <div class="career-rep">${Object.entries(career.reputation).map(([axis, v]) => `
      <div class="rep-axis"><span>${axis}</span><div class="stress-bar"><div class="stress-fill" style="width:${v}%"></div></div><span class="mono">${v}</span></div>`).join('')}</div>`;
  body.append(head);

  // ── episódios ──
  const grid = el('div', 'episode-grid');
  for (const ep of episodes()) {
    const card = el('button', `card episode-card ${ep.status}`);
    const statusTag = { done: '✔ CONCLUÍDO', available: 'DISPONÍVEL', locked: `🔒 ${ep.unlock}` }[ep.status];
    card.innerHTML = `
      <div class="episode-art">${sceneArt(EPISODE_ART[ep.id] || 'central')}</div>
      <div class="episode-meta">
        <span class="row-id">${ep.id}</span><b>${ep.title}</b>
        <span class="muted">${ep.city || 'Local confidencial'}</span>
        <span class="row-tag ${ep.status === 'done' ? 'ok' : ''}">${statusTag}</span>
        ${ep.best ? `<span class="mono episode-best">★ ${ep.best.score} · ${ep.best.rank}</span>` : ''}
      </div>`;
    card.onclick = () => openEpisode(ep);
    grid.append(card);
  }
  body.append(grid);

  // ── sala de troféus + fio da história ──
  const bottom = el('div', 'two-col');
  const trophies = el('section', 'panel list-panel');
  trophies.append(el('h2', 'panel-title', '🏆 SALA DE TROFÉUS'));
  const all = getModule('SHERLOCK_ENGINE_ACHIEVEMENTS_AND_CAREER')?.achievements || [];
  const row = el('div', 'trophy-row');
  for (const a of all) {
    const got = career.achievements.includes(a.id);
    row.append(el('span', `row-tag ${got ? 'ok' : ''}`, `${got ? '🏅' : '·'} ${a.name}`));
  }
  trophies.append(row);
  const hist = Object.entries(career.history);
  if (hist.length) {
    trophies.append(el('h2', 'panel-title', 'ARQUIVO DE CASOS'));
    for (const [id, h] of hist) trophies.append(el('div', 'muted mono', `${id} · ★ ${h.score} · ${h.rank}`));
  }

  const story = el('section', 'panel list-panel');
  story.append(el('h2', 'panel-title', '🕸 FIOS DA HISTÓRIA'));
  story.append(el('p', 'muted', `Antagonista: ${camp?.global_story?.main_antagonist ?? '—'}. Cada caso puxa um fio:`));
  const threads = el('div', 'trophy-row');
  for (const t of camp?.global_story?.threads || []) threads.append(el('span', 'row-tag', t));
  story.append(threads);
  const studio = el('a', 'btn ed-add', '✎ CRIAR CASOS NO SHERLOCK STUDIO');
  studio.href = 'editor/';
  studio.target = '_blank';
  story.append(studio);
  bottom.append(trophies, story);
  body.append(bottom);
}

function openEpisode(ep) {
  sfx('click');
  if (ep.status === 'locked') {
    emit('UI_TOAST', { text: `🔒 ${ep.title}: ${ep.unlock}.`, kind: 'warn' });
    return;
  }
  if (!CASE_FILES[ep.id]) { // episódio sem conteúdo instalado em cases/
    emit('UI_TOAST', { text: `🎬 ${ep.title} está em produção — crie o conteúdo no Sherlock Studio e coloque em cases/.`, kind: 'info' });
    return;
  }
  sfx('door_open');
  emit('UI_SELECT_EPISODE', { caseId: ep.id });
}
