/**
 * uiManager.js — Renderização das telas do Milestone 1: BOOT (sequência do
 * UI.json), LOGIN, CENTRAL (grid 3×3) e telas placeholder de investigação.
 * Sem arte ainda: placeholders sólidos no tema Dark Ops.
 */
import { getModule, t } from './database.js';
import { emit } from './eventManager.js';

const app = () => document.getElementById('app');

// descrições curtas por card (deriva dos módulos de design correspondentes)
const CARD_INFO = {
  'Mapa': { icon: '🗺', desc: 'Rota da Linha Turismo, câmeras e locais do caso (GEOINT).' },
  'Laboratório': { icon: '🧪', desc: 'DNA, digitais, fibras, toxicologia e documentos.' },
  'Mural': { icon: '📌', desc: 'Mural de investigação: conexões entre pistas e suspeitos.' },
  'Linha do Tempo': { icon: '🕑', desc: 'Cronologia do dia do crime, das 14:00 às 18:30.' },
  'OSINT': { icon: '🔎', desc: 'Fontes abertas: redes, notícias e registros públicos.' },
  'GEOINT': { icon: '📡', desc: 'Análise geoespacial: GPS, tacógrafo e rotas.' },
  'Interrogatórios': { icon: '🎙', desc: 'Depoimentos e interrogatórios dos passageiros (HUMINT).' },
  'Evidências': { icon: '🧾', desc: 'Inventário e cadeia de custódia das evidências.' },
  'Sala do Júri': { icon: '⚖', desc: 'Acusação final: suspeito, local e método.' },
};

function el(tag, cls, html) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html != null) node.innerHTML = html;
  return node;
}

function screenShell(title, breadcrumb) {
  const root = el('div', 'screen');
  const header = el('header', 'screen-header');
  header.append(el('div', 'breadcrumb', breadcrumb));
  const nav = el('div', 'screen-nav');
  const back = el('button', 'btn btn-ghost', '← Voltar');
  back.onclick = () => emit('UI_BACK', {});
  const home = el('button', 'btn btn-ghost', '⌂ Central');
  home.onclick = () => emit('UI_HOME', {});
  nav.append(back, home);
  header.append(nav);
  const body = el('main', 'screen-body');
  root.append(header, body);
  return { root, body };
}

function show(node) {
  const container = app();
  container.replaceChildren(node);
  container.classList.remove('fade-in');
  void container.offsetWidth; // reinicia a animação
  container.classList.add('fade-in');
}

/** Tela de BOOT — sequência do UI.json com barra de progresso e log. */
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
  if (log) {
    log.append(el('div', 'boot-line', `&gt; ${line}`));
    log.scrollTop = log.scrollHeight;
  }
  const bar = document.getElementById('boot-bar');
  if (bar && pct != null) bar.style.width = `${Math.round(pct)}%`;
}

/** Tela de LOGIN do UI.json: usuário, senha, ACESSAR CENTRAL, status. */
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

/** Central de Operações — grid 3×3 com os cards do UI.json. */
export function renderCentral(player) {
  const ui = getModule('SHERLOCK_ENGINE_UI');
  const central = (ui?.screens || []).find((s) => s.id === 'CENTRAL');
  const cards = central?.cards || Object.keys(CARD_INFO);

  const { root, body } = screenShell('Central', `CENTRAL DE OPERAÇÕES · ${player || 'Detetive'}`);
  root.classList.add('central-screen');
  const grid = el('div', 'central-grid');
  for (const name of cards) {
    const info = CARD_INFO[name] || { icon: '▣', desc: '' };
    const card = el('button', 'card central-card');
    card.append(el('div', 'card-icon', info.icon));
    card.append(el('div', 'card-title', name));
    card.append(el('div', 'card-desc', info.desc));
    card.onclick = () => emit('UI_OPEN_CARD', { card: name });
    grid.append(card);
  }
  body.append(grid);
  show(root);
}

/** Tela placeholder de investigação (Milestone 1 — sem gameplay ainda). */
export function renderPlaceholder(cardName) {
  const info = CARD_INFO[cardName] || { icon: '▣', desc: '' };
  const { root, body } = screenShell(cardName, `CENTRAL › ${cardName.toUpperCase()}`);
  const box = el('div', 'panel placeholder-panel');
  box.append(el('div', 'placeholder-icon', info.icon));
  box.append(el('h1', 'placeholder-title', cardName));
  box.append(el('p', 'placeholder-desc', info.desc));
  if (cardName === 'Sala do Júri') {
    box.append(el('p', 'placeholder-note', 'A Sala do Júri exige os 4 códigos do cofre. A solução do caso permanece lacrada até o veredito.'));
    const verdict = el('button', 'btn btn-primary', 'EMITIR VEREDITO');
    verdict.disabled = true;
    verdict.title = 'Disponível no Milestone 2';
    box.append(verdict);
  }
  box.append(el('p', 'placeholder-badge', 'EM CONSTRUÇÃO · MILESTONE 2'));
  body.append(box);
  show(root);
}

/** Relatório de integridade exibido no boot (apenas contagens — sem spoilers). */
export function renderIntegrityBadge(report) {
  const n = report?.errors?.length ?? 0;
  bootLog(
    n === 0
      ? `Integridade do caso: OK (${report.stats.evidencias} evidências, ${report.stats.eventos} eventos, ${report.stats.personagens} personagens)`
      : `Integridade do caso: ${n} erro(s) — ver console`,
  );
}
