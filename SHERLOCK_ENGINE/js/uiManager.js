/**
 * uiManager.js — Shell da interface: boot, login, Central 3×3, moldura das
 * telas (topbar com ato/pontuação/relógio), toasts, modais e painel A.R.I.A.
 * As telas de investigação vivem em js/screens/*.js.
 */
import { getModule, t } from './database.js';
import { emit, subscribe } from './eventManager.js';
import { getCase } from './caseState.js';
import { sfx, toggleMute, isMuted } from './audioManager.js';
import { requestHint, ariaSay } from './aria.js';

const app = () => document.getElementById('app');

export const CARD_INFO = {
  'Mapa': { icon: '🗺', desc: 'Rota da Linha Turismo, locais e coleta de evidências.' },
  'Laboratório': { icon: '🧪', desc: 'Toxicologia, digitais, fibras e documentoscopia.' },
  'Mural': { icon: '📌', desc: 'Suspeitos, suspeição MMO e conexões entre pistas.' },
  'Linha do Tempo': { icon: '🕑', desc: 'Reconstrua a cronologia de 14:00 às 18:30.' },
  'OSINT': { icon: '🔎', desc: 'Fontes abertas: empresas, notícias e registros.' },
  'GEOINT': { icon: '📡', desc: 'Tacógrafo, satélite e análise de rotas.' },
  'Interrogatórios': { icon: '🎙', desc: 'Depoimentos, estresse e contradições (HUMINT).' },
  'Evidências': { icon: '🧾', desc: 'Inventário, documentos e cadeia de custódia.' },
  'Sala do Júri': { icon: '⚖', desc: 'Cofre de 4 códigos e acusação final.' },
};

const normKey = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
const cardInfo = (name) => {
  const key = normKey(name);
  return Object.entries(CARD_INFO).find(([k]) => normKey(k) === key)?.[1] || { icon: '▣', desc: '' };
};

export function el(tag, cls, html) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html != null) node.innerHTML = html;
  return node;
}

function show(node) {
  const container = app();
  container.replaceChildren(node);
  container.classList.remove('fade-in');
  void container.offsetWidth;
  container.classList.add('fade-in');
}

// ── Toast + A.R.I.A. dock (persistem fora do #app) ──────────────────────────
function dock() {
  let d = document.getElementById('dock');
  if (!d) {
    d = el('div', '');
    d.id = 'dock';
    d.innerHTML = `<div id="toasts"></div>
      <div id="aria-panel" class="panel aria-panel" hidden>
        <div class="aria-head">◈ A.R.I.A.</div><div id="aria-text"></div>
        <div class="aria-actions">
          <button class="btn btn-ghost" id="aria-hint">PEDIR DICA (-20)</button>
          <button class="btn btn-ghost" id="aria-close">FECHAR</button>
        </div>
      </div>`;
    document.body.append(d);
    d.querySelector('#aria-close').onclick = () => { d.querySelector('#aria-panel').hidden = true; };
    d.querySelector('#aria-hint').onclick = () => {
      const hint = requestHint();
      ariaSay(hint.text);
      sfx('notification');
    };
  }
  return d;
}

export function toast(text, kind = 'info') {
  const box = dock().querySelector('#toasts');
  const node = el('div', `toast toast-${kind}`, text);
  box.append(node);
  sfx(kind === 'success' ? 'success' : 'notification');
  setTimeout(() => node.classList.add('toast-out'), 3600);
  setTimeout(() => node.remove(), 4100);
}

let ariaHideTimer = null;
export function showAria(text) {
  const d = dock();
  d.querySelector('#aria-panel').hidden = false;
  d.querySelector('#aria-text').textContent = text;
  // auto-oculta para não bloquear a interface (o jogador pode reabrir no botão A.R.I.A.)
  clearTimeout(ariaHideTimer);
  ariaHideTimer = setTimeout(() => { d.querySelector('#aria-panel').hidden = true; }, 7000);
}

export function modal(title, contentNode, actions = []) {
  const overlay = el('div', 'modal-overlay');
  const box = el('div', 'panel modal-box');
  box.append(el('div', 'modal-title', title));
  const body = el('div', 'modal-body');
  if (typeof contentNode === 'string') body.innerHTML = contentNode;
  else body.append(contentNode);
  box.append(body);
  const bar = el('div', 'modal-actions');
  const close = () => overlay.remove();
  for (const a of actions) {
    const b = el('button', `btn ${a.primary ? 'btn-primary' : 'btn-ghost'}`, a.label);
    b.onclick = () => { if (a.onClick?.(close) !== false && a.close !== false) close(); };
    bar.append(b);
  }
  const x = el('button', 'btn btn-ghost', 'FECHAR');
  x.onclick = close;
  bar.append(x);
  box.append(bar);
  overlay.append(box);
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
  document.body.append(overlay);
  sfx('paper_flip');
  return { close, box };
}

// ── Relógio do mundo por ato (CASE001 world state) ──────────────────────────
const ACT_TIME = { 1: '14:00', 2: '15:47', 3: '16:45', 4: '18:30' };

export function screenShell(title, breadcrumb) {
  const s = getCase();
  const root = el('div', 'screen');
  const header = el('header', 'screen-header');
  header.append(el('div', 'breadcrumb', breadcrumb));
  const hud = el('div', 'hud');
  hud.innerHTML = `
    <span class="hud-item" title="Ato">ATO ${s.act}/4</span>
    <span class="hud-item" title="Hora do caso">🕑 ${ACT_TIME[s.act]}</span>
    <span class="hud-item hud-score" title="Pontuação">★ <b id="hud-score">${s.score}</b></span>`;
  const nav = el('div', 'screen-nav');
  const ariaBtn = el('button', 'btn btn-ghost', '◈ A.R.I.A.');
  ariaBtn.onclick = () => { showAria('Em que posso ajudar, detetive?'); sfx('radio_beep'); };
  const mute = el('button', 'btn btn-ghost', isMuted() ? '🔇' : '🔊');
  mute.onclick = () => { mute.innerHTML = toggleMute() ? '🔇' : '🔊'; };
  const back = el('button', 'btn btn-ghost', '← Voltar');
  back.onclick = () => { sfx('click'); emit('UI_BACK', {}); };
  const home = el('button', 'btn btn-ghost', '⌂ Central');
  home.onclick = () => { sfx('click'); emit('UI_HOME', {}); };
  nav.append(ariaBtn, mute, back, home);
  header.append(hud, nav);
  const body = el('main', 'screen-body');
  root.append(header, body);
  show(root);
  return { root, body };
}

// ── BOOT ─────────────────────────────────────────────────────────────────────
export function renderBoot() {
  const root = el('div', 'screen boot-screen');
  root.append(el('div', 'boot-logo', 'SHERLOCK<span>ENGINE</span>'));
  const log = el('div', 'boot-log');
  log.id = 'boot-log';
  const barWrap = el('div', 'boot-progress');
  const bar = el('div', 'boot-progress-fill');
  bar.id = 'boot-bar';
  barWrap.append(bar);
  root.append(log, barWrap);
  show(root);
}

export function bootLog(line, pct) {
  const log = document.getElementById('boot-log');
  if (log && line) {
    log.append(el('div', 'boot-line', `&gt; ${line}`));
    log.scrollTop = log.scrollHeight;
  }
  const bar = document.getElementById('boot-bar');
  if (bar && pct != null) bar.style.width = `${Math.round(pct)}%`;
}

export function renderIntegrityBadge(report) {
  const n = report?.errors?.length ?? 0;
  bootLog(
    n === 0
      ? `Integridade do caso: OK (${report.stats.evidencias} evidências, ${report.stats.eventos} eventos, ${report.stats.personagens} personagens)`
      : `Integridade do caso: ${n} erro(s) — ver console`,
  );
}

// ── LOGIN ────────────────────────────────────────────────────────────────────
export function renderLogin(caseInfo) {
  const root = el('div', 'screen login-screen');
  const panel = el('div', 'panel login-panel');
  panel.append(el('div', 'login-logo', 'SHERLOCK<span>ENGINE</span>'));
  panel.append(el('div', 'login-case', `CASO ${caseInfo?.id ?? ''} · ${t('APP_TITLE')}`));
  const user = el('input', 'input');
  user.placeholder = 'Detetive';
  user.id = 'login-user';
  const pass = el('input', 'input');
  pass.type = 'password';
  pass.placeholder = 'Senha';
  const btn = el('button', 'btn btn-primary', 'ACESSAR CENTRAL');
  const status = el('div', 'login-status', 'Aguardando credenciais…');
  btn.onclick = () => {
    sfx('unlock');
    const player = user.value.trim() || 'Detetive';
    status.textContent = `Acesso autorizado. Bem-vindo(a), ${player}.`;
    emit('LOGIN_SUCCESS', { player });
  };
  pass.addEventListener('keydown', (e) => e.key === 'Enter' && btn.click());
  user.addEventListener('keydown', (e) => e.key === 'Enter' && btn.click());
  panel.append(user, pass, btn, status);
  root.append(panel);
  show(root);
  user.focus();
}

// ── CENTRAL 3×3 ──────────────────────────────────────────────────────────────
export function renderCentral(player) {
  const ui = getModule('SHERLOCK_ENGINE_UI');
  const central = (ui?.screens || []).find((sc) => sc.id === 'CENTRAL');
  const cards = central?.cards || Object.keys(CARD_INFO);
  const s = getCase();
  const { body } = screenShell('Central', `CENTRAL DE OPERAÇÕES · ${player || 'Detetive'}`);
  const grid = el('div', 'central-grid');
  for (const name of cards) {
    const info = cardInfo(name);
    const card = el('button', 'card central-card');
    const badge = badgeFor(name, s);
    card.append(el('div', 'card-icon', info.icon));
    card.append(el('div', 'card-title', name));
    card.append(el('div', 'card-desc', info.desc));
    if (badge) card.append(el('div', `card-badge ${badge.cls || ''}`, badge.text));
    card.onclick = () => { sfx('click'); emit('UI_OPEN_CARD', { card: name }); };
    grid.append(card);
  }
  body.append(grid);
}

function badgeFor(name, s) {
  switch (normKey(name)) {
    case 'EVIDENCIAS': return { text: `${s.collected.length} coletadas` };
    case 'INTERROGATORIOS': return { text: `${s.interrogated.length}/7 ouvidos` };
    case 'LINHA DO TEMPO': return s.timelineDone ? { text: '✔ completa', cls: 'ok' } : null;
    case 'SALA DO JURI':
      return s.juryUnlocked ? { text: 'DESBLOQUEADA', cls: 'ok' } : { text: `🔒 ${s.codes.length}/4 códigos`, cls: 'lock' };
    case 'MURAL': return s.contradictions.length ? { text: `${s.contradictions.length} contradição`, cls: 'ok' } : null;
    default: return null;
  }
}

// atualização ao vivo da pontuação no HUD
subscribe('UI_SCORE', ({ total }) => {
  const n = document.getElementById('hud-score');
  if (n) n.textContent = total;
});
subscribe('UI_TOAST', ({ text, kind }) => toast(text, kind));
subscribe('UI_ARIA', ({ text }) => showAria(text));
