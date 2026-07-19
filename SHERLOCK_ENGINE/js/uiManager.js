/**
 * uiManager.js — Shell da interface: boot, login, Central 3×3, moldura das
 * telas (topbar com ato/pontuação/relógio), toasts, modais e painel G.R.A.L.H.A.
 * As telas de investigação vivem em js/screens/*.js.
 */
import { getModule, t } from './database.js';
import { sceneMedia } from './art.js';
import { emit, subscribe } from './eventManager.js';
import { getCase } from './caseState.js';
import { sfx, toggleMute, isMuted, ambience, musicBed, haptic } from './audioManager.js';
import { requestHint, ariaSay } from './aria.js';
import { startTutorial, maybeTutorial } from './tutorial.js';
import { getDifficulty, setDifficulty, DIFFS, hintCost } from './difficulty.js';

const app = () => document.getElementById('app');

export const CARD_INFO = {
  'Mapa': { icon: '🗺', desc: 'Locais do caso e coleta de evidências.', color: 'var(--c-mapa)' },
  'Laboratório': { icon: '🧪', desc: 'Bancadas forenses e laudos.', color: 'var(--c-lab)' },
  'Mural': { icon: '📌', desc: 'Suspeitos, suspeição MMO e conexões.', color: 'var(--c-mural)' },
  'Linha do Tempo': { icon: '🕑', desc: 'Reconstrua a cronologia do caso.', color: 'var(--c-tempo)' },
  'OSINT': { icon: '🔎', desc: 'Fontes abertas: empresas, notícias e registros.', color: 'var(--c-osint)' },
  'GEOINT': { icon: '📡', desc: 'Registros técnicos e análise geoespacial.', color: 'var(--c-geoint)' },
  'Interrogatórios': { icon: '🎙', desc: 'Depoimentos, estresse e contradições (HUMINT).', color: 'var(--c-interro)' },
  'Evidências': { icon: '🧾', desc: 'Inventário, documentos e cadeia de custódia.', color: 'var(--c-evid)' },
  'Sala do Júri': { icon: '⚖', desc: 'Cofre de 4 códigos e acusação final.', color: 'var(--c-juri)' },
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

// ── Toast + G.R.A.L.H.A. dock (persistem fora do #app) ──────────────────────────
function dock() {
  let d = document.getElementById('dock');
  if (!d) {
    d = el('div', '');
    d.id = 'dock';
    d.innerHTML = `<div id="toasts"></div>
      <div id="aria-panel" class="panel aria-panel" hidden>
        <div class="aria-head">◈ G.R.A.L.H.A.</div><div id="aria-text"></div>
        <div class="aria-actions">
          <button class="btn btn-ghost" id="aria-hint">PEDIR DICA (-${hintCost()})</button>
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
  haptic(kind === 'success' ? 'ok' : kind === 'warn' ? 'warn' : 'tap');
  setTimeout(() => node.classList.add('toast-out'), 3600);
  setTimeout(() => node.remove(), 4100);
}

let ariaHideTimer = null;
export function showAria(text) {
  const d = dock();
  d.querySelector('#aria-panel').hidden = false;
  d.querySelector('#aria-text').textContent = text;
  d.querySelector('#aria-hint').textContent = `PEDIR DICA (-${hintCost()})`;
  // auto-oculta para não bloquear a interface (o jogador pode reabrir no botão G.R.A.L.H.A.)
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

// módulo -> ambiência sonora (procedural, ver audioManager.AMB_PRESETS)
const AMB_KIND = {
  'MAPA': 'mapa', 'LABORATORIO': 'lab', 'SALA DO JURI': 'juri',
  'INTERROGATORIOS': 'interrogatorio', 'EVIDENCIAS': 'evidencias', 'MURAL': 'mural',
  'OSINT': 'osint', 'GEOINT': 'geoint', 'LINHA DO TEMPO': 'tempo',
  'CENTRAL': 'central', 'CAMPANHA': 'campanha', 'RESULTADO': 'central', 'CREDITOS': 'central',
};

export function screenShell(title, breadcrumb, accent) {
  const s = getCase();
  const root = el('div', 'screen');
  // cor de destaque da tela: tudo que usa var(--accent) fica colorido por módulo
  const color = accent || cardInfo(title).color;
  if (color) root.style.setProperty('--accent', color);
  // identidade cromática/ambiente por módulo (ver .screen[data-mod] no CSS)
  root.dataset.mod = normKey(title);
  root.dataset.act = s.act;   // relógio do mundo: dia -> tarde -> entardecer
  // identidade SONORA por módulo: faixa de assets/audio se existir, senão
  // ambiência procedural (Web Audio). Ver assets/audio/README.md.
  const ambKind = AMB_KIND[normKey(title)] || 'central';
  ambience(ambKind);
  musicBed(ambKind);
  // ambiente cinematográfico: luz, profundidade, poeira e Curitiba viva
  const env = el('div', 'screen-env');
  env.setAttribute('aria-hidden', 'true');
  env.innerHTML = `
    <span class="env-glow"></span><span class="env-pave"></span>
    <span class="env-time"></span><span class="env-leak"></span>
    <span class="env-life">
      <b class="life-bird lb1"></b><b class="life-bird lb2"></b><b class="life-bird lb3"></b>
      <b class="life-leaf ll1"></b><b class="life-leaf ll2"></b><b class="life-leaf ll3"></b><b class="life-leaf ll4"></b>
      <b class="life-bus"></b><b class="life-capy"></b>
    </span>
    <span class="env-dust"></span><span class="env-vignette"></span>`;
  root.append(env);
  const header = el('header', 'screen-header');
  // brasão da divisão: a onça de João Turin (releitura vetorial paranista)
  const crest = el('span', 'turin-onca header-crest');
  crest.setAttribute('aria-hidden', 'true');
  crest.title = 'Divisão de Investigação · Curitiba';
  header.append(crest);
  header.append(el('div', 'breadcrumb', breadcrumb));
  const hud = el('div', 'hud');
  const diff = getDifficulty();
  hud.innerHTML = `
    <span class="hud-item hud-diff" title="Dificuldade (muda o custo das dicas e o peso do erro)">${diff.icon} ${diff.label}</span>
    <span class="hud-item" title="Ato">ATO ${s.act}/4</span>
    <span class="hud-item" title="Hora do caso">🕑 ${ACT_TIME[s.act]}</span>
    <span class="hud-item hud-score" title="Pontuação">★ <b id="hud-score">${s.score}</b></span>`;
  const nav = el('div', 'screen-nav');
  // botão do topo com ícone + rótulo (no celular, CSS esconde o rótulo)
  const navBtn = (ico, lbl, on, title) => {
    const b = el('button', 'btn btn-ghost nav-btn');
    b.innerHTML = `<span class="nav-ico">${ico}</span><span class="nav-lbl">${lbl}</span>`;
    b.title = title || lbl;
    b.onclick = on;
    return b;
  };
  const ariaBtn = navBtn('◈', 'G.R.A.L.H.A.', () => { showAria('E aí, detetive, em que que eu te ajudo?'); sfx('radio_beep'); });
  const mute = el('button', 'btn btn-ghost nav-btn nav-icon-only', isMuted() ? '🔇' : '🔊');
  mute.title = 'Som';
  mute.onclick = () => { mute.innerHTML = toggleMute() ? '🔇' : '🔊'; };
  const brief = navBtn('📋', 'Caso', () => { sfx('paper_flip'); emit('UI_BRIEFING', {}); }, 'Rever o briefing (a história e como proceder)');
  const back = navBtn('←', 'Voltar', () => { sfx('click'); emit('UI_BACK', {}); });
  const home = navBtn('⌂', 'Central', () => { sfx('click'); emit('UI_HOME', {}); });
  const reset = navBtn('⟳', 'Reiniciar', () => {
    modal('Reiniciar caso?', 'Isto apaga todo o progresso <b>deste caso</b> (evidências, laudos, códigos e pontuação) e recomeça do zero na Central de Operações. A sua carreira é mantida. O briefing não reaparece — use 📋 Caso quando quiser revê-lo. Confirmar?', [
      { label: '⟳ Recomeçar do zero', primary: true, onClick: () => emit('UI_RESET_CASE', {}) },
    ]);
  }, 'Recomeçar este caso do zero');
  nav.append(ariaBtn, mute, brief, reset, back, home);
  header.append(hud, nav);
  const body = el('main', 'screen-body');
  root.append(header, body);
  show(root);
  return { root, body };
}

// ── BOOT ─────────────────────────────────────────────────────────────────────
export function renderBoot() {
  const root = el('div', 'screen boot-screen boot-intro');
  const grain = el('div', 'login-grain');
  grain.setAttribute('aria-hidden', 'true');
  root.append(grain);
  // brasão de abertura: a araucária (selo em duotone) surgindo
  const emblema = el('div', 'boot-emblema cwb-selo cwb-selo--araucaria');
  emblema.setAttribute('aria-hidden', 'true');
  root.append(emblema);
  root.append(el('div', 'boot-logo', 'SHERLOCK<span>ENGINE</span>'));
  root.append(el('div', 'boot-tagline', 'CURITIBA · PARANÁ'));
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
  const root = el('div', 'screen login-screen login-intro');
  // capa do jogo: o ônibus da Linha Turismo em tela cheia (foto real quando
  // baixada; ilustração SVG como fallback) com véu escuro para leitura
  const hero = el('div', 'login-hero');
  hero.innerHTML = sceneMedia('ônibus');
  hero.setAttribute('aria-hidden', 'true');
  root.append(hero);
  // tratamento noir: grão de filme + linha de varredura ciano
  const grain = el('div', 'login-grain');
  grain.setAttribute('aria-hidden', 'true');
  root.append(grain);
  const scan = el('div', 'login-scan');
  scan.setAttribute('aria-hidden', 'true');
  root.append(scan);
  const panel = el('div', 'panel login-panel');
  // selo: a araucária em petit-pavé (mosaico real do calçadão de Curitiba)
  const emblema = el('div', 'login-emblema');
  emblema.setAttribute('aria-hidden', 'true');
  panel.append(emblema);
  panel.append(el('div', 'login-logo', 'SHERLOCK<span>ENGINE</span>'));
  panel.append(el('div', 'login-tagline', 'UM MISTÉRIO EM CURITIBA'));
  panel.append(el('div', 'login-case', `CASO ${caseInfo?.id ?? ''} · ${t('APP_TITLE')}`));
  const user = el('input', 'input');
  user.placeholder = 'Detetive';
  user.id = 'login-user';
  const pass = el('input', 'input');
  pass.type = 'password';
  pass.placeholder = 'Senha';
  // seletor de dificuldade (persistido globalmente; vale para toda a campanha)
  const diffWrap = el('div', 'login-diff');
  diffWrap.append(el('div', 'login-diff-lbl', 'DIFICULDADE'));
  const seg = el('div', 'diff-seg');
  const diffDesc = el('div', 'login-diff-desc');
  const paint = () => {
    const cur = getDifficulty().id;
    [...seg.children].forEach((c) => c.classList.toggle('on', c.dataset.id === cur));
    diffDesc.textContent = getDifficulty().desc;
  };
  Object.values(DIFFS).forEach((lv) => {
    const b = el('button', 'diff-seg-btn', `${lv.icon} ${lv.label}`);
    b.dataset.id = lv.id;
    b.onclick = () => { sfx('click'); setDifficulty(lv.id); paint(); };
    seg.append(b);
  });
  diffWrap.append(seg, diffDesc);
  paint();
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
  panel.append(user, pass, diffWrap, btn, status);
  // rodapé: selo do caso com o Cavalo Babão (Fonte do Largo da Ordem, Curitiba)
  const selo = el('div', 'login-selo');
  selo.setAttribute('aria-hidden', 'true');
  selo.innerHTML = '<span class="login-selo-mark cwb-selo cwb-selo--cavalo"></span><span class="login-selo-txt">DIVISÃO DE INVESTIGAÇÃO · CURITIBA</span>';
  panel.append(selo);
  root.append(panel);
  show(root);
  user.focus();
}

// ── CENTRAL 3×3 (cards coloridos com imagem do caso) ────────────────────────
export function renderCentral(player) {
  const ui = getModule('SHERLOCK_ENGINE_UI');
  const central = (ui?.screens || []).find((sc) => sc.id === 'CENTRAL');
  const cards = central?.cards || Object.keys(CARD_INFO);
  const s = getCase();
  const stops = getModule('CASE_PACK')?.stops || [];
  const { body } = screenShell('Central', `CENTRAL DE OPERAÇÕES · ${player || 'Detetive'}`);
  const grid = el('div', 'central-grid');
  cards.forEach((name, i) => {
    const info = cardInfo(name);
    const card = el('button', 'card central-card');
    if (info.color) card.style.setProperty('--accent', info.color);
    const badge = badgeFor(name, s);
    // cada card mostra uma imagem de local do caso ativo (fotos reais quando baixadas)
    const scene = stops.length ? stops[i % stops.length].scene : 'central';
    card.append(el('div', 'card-art', sceneMedia(scene)));
    const meta = el('div', 'card-meta');
    meta.append(el('div', 'card-title', `${info.icon} ${name}`));
    meta.append(el('div', 'card-desc', info.desc));
    if (badge) meta.append(el('div', `card-badge ${badge.cls || ''}`, badge.text));
    card.append(meta);
    card.onclick = () => { sfx('click'); emit('UI_OPEN_CARD', { card: name }); };
    grid.append(card);
  });
  body.append(grid);
  // botão ❔ (repetir tutorial) + tutorial automático na primeira vez
  const help = el('button', 'central-help', '❔');
  help.title = 'Como jogar (tutorial)';
  help.onclick = () => startTutorial();
  body.append(help);
  maybeTutorial();
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
// vibração tátil no celular para marcos da investigação
subscribe('EVIDENCE_COLLECTED', () => haptic('collect'));
subscribe('DOSSIER_COMPLETED', () => haptic('ok'));
subscribe('SAFE_OPENED', () => haptic('ok'));
subscribe('CASE_SOLVED', () => haptic('ok'));
