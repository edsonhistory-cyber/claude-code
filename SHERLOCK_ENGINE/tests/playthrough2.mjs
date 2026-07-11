const ROOT = new URL('..', import.meta.url).pathname;
/** playthrough2.mjs — joga o CASE002 "Silêncio na Serra" do QG ao resultado.
 *  A acusação correta é derivada decodificando o JSON lacrado AQUI. */
import { chromium } from 'playwright-core';
import { readFile } from 'node:fs/promises';

const CASE = JSON.parse(await readFile(ROOT + 'cases/CASE002_Silencio_na_Serra/CASE002_FULL.json', 'utf-8'));
const SOL = JSON.parse(Buffer.from(CASE.final_solution.data, 'base64').toString('utf-8'));
const norm = (x) => String(x).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
const words = (x) => new Set(norm(x).split(/[^A-Z0-9]+/).filter((w) => w.length > 3));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(m.text()); });
const step = (m) => console.log('▸', m);

async function closeModal() {
  const b = page.locator('.modal-actions .btn', { hasText: 'FECHAR' }).last();
  if (await b.count()) await b.click();
  await page.waitForTimeout(150);
}
async function goCard(name) {
  await page.click('.screen-nav .btn:has-text("Central")').catch(() => {});
  await page.waitForSelector('.central-grid');
  await page.click(`.central-card:has(.card-title:has-text("${name}"))`);
  await page.waitForTimeout(300);
}

// semeia carreira com CASE001 concluído → CASE002 desbloqueado
await page.goto('http://localhost:8123/index.html');
await page.evaluate(() => localStorage.setItem('sherlock_career', JSON.stringify({
  xp: 2500, achievements: ['ACH001'], reputation: { 'Perícia': 60, 'Imprensa': 55, 'Polícia': 70, 'População': 60 },
  history: { CASE001: { score: 1160, rank: 'Detetive de Elite', solved_at: '2026-07-11', stats: {} } },
})));
await page.reload();
step('boot → login');
await page.waitForSelector('.login-panel', { timeout: 20000 });
await page.fill('#login-user', 'Edson');
await page.click('.btn-primary');
step('QG → abrir CASE002');
await page.waitForSelector('.episode-grid', { timeout: 8000 });
const ep2 = page.locator('.episode-card', { hasText: 'Silêncio na Serra' });
if (/🔒/.test(await ep2.textContent())) throw new Error('CASE002 deveria estar desbloqueado');
await ep2.click();
await page.waitForSelector('.central-grid', { timeout: 10000 });

// ── MAPA ──
step('mapa: coletas na serra');
await goCard('Mapa');
const visit = async (stopText, hotspots) => {
  await page.click(`.stop-card:has-text("${stopText}")`);
  await page.waitForSelector('.hotspots');
  for (const h of hotspots) { await page.click(`.hotspot:has-text("${h}")`); await page.waitForTimeout(250); }
  await closeModal();
};
await visit('Estação Curitiba', ['Bilheteria']);
await visit('Vagão 2', ['Assento 7', 'Compartimento técnico', 'Painel de energia', 'Vão entre vagões']);
await visit('Túnel Roça Nova', ['Boca do túnel']);
await visit('Ponte do Nhundiaquara', ['Margem do rio', 'Pescador']);
await visit('Estação Morretes', ['Guichê de achados', 'Vestiário']);

// ── INTERROGATÓRIOS ──
step('interrogatórios: testemunhas');
await goCard('Interrogatórios');
const witness = async (name) => {
  await page.click(`.suspect-card:has-text("${name}")`);
  await page.waitForSelector('.interro');
  const b = page.locator('.btn', { hasText: 'REGISTRAR DEPOIMENTO' });
  if (await b.count()) await b.click();
  await page.waitForTimeout(300);
  await closeModal();
};
await witness('Sofia');    // entrega EV103
await witness('Ernesto');
await witness('Marta');

step('interrogatório: Davi entrega o diário');
await page.click('.suspect-card:has-text("Davi")');
await page.waitForSelector('.interro');
await page.click('.topic:has-text("cabine o tempo todo")');
await page.waitForTimeout(2000);
await closeModal();

step('interrogatório: Ivo — contradição + EN105');
await page.click('.suspect-card:has-text("Ivo")');
await page.waitForSelector('.interro');
await page.click('.topic:has-text("Túnel Roça Nova")');
await page.waitForTimeout(2000);
await page.click('.option:has-text("EV104")');
await page.waitForTimeout(1600);
await page.click('.btn:has-text("REGISTRAR CONTRADIÇÃO")');
await page.waitForSelector('.option-list');
await page.click('.option[data-i="2"]');
await page.waitForTimeout(400);
await closeModal();
await closeModal();

// ── LABORATÓRIO ──
step('laboratório: fibras (EN107), nós, imagem, documentoscopia');
await goCard('Laboratório');
const runTab = async (tab, waitMs) => {
  await page.click(`.tab-btn:has-text("${tab}")`);
  const b = page.locator('.sample-row .btn', { hasText: 'ANALISAR' });
  if (await b.count()) { await b.click(); await page.waitForTimeout(waitMs); }
};
await runTab('FIBRAS', 2400);
await page.waitForSelector('.fiber-opt', { timeout: 4000 });
await page.click('.fiber-opt[data-i="2"]');
await page.waitForTimeout(400);
await closeModal();
await runTab('NÓS E AMARRAS', 2200);
await runTab('IMAGEM FORENSE', 2600);
await runTab('DOCUMENTOSCOPIA', 2000);

// ── GEOINT: EN103 + EN104 → CAMPO completo (token TUNEL) ──
step('geoint: EN103 painel + EN104 túnel');
await goCard('GEOINT');
await page.click('[data-seg="tun"]');
await page.waitForTimeout(600);
await page.click('[data-mark="tun"]');
await page.waitForTimeout(600);

// ── EVIDÊNCIAS: EN101 (corda, token TUNEL) ──
step('evidências: EN101 etiqueta da corda');
await goCard('Evidências');
await page.click('.row-card:has-text("Corda de nylon")');
await page.click('.btn:has-text("RECONSTITUIR ETIQUETA")');
await page.waitForSelector('.qr-frags');
for (const ch of 'NYLON') {
  await page.locator('.qr-frag:not([disabled])', { hasText: ch }).first().click();
  await page.waitForTimeout(80);
}
await page.waitForTimeout(500);
await closeModal();
await closeModal();

// ── OSINT: Fundação Pinhal (EN108, token FIBRA) + fichas ──
step('osint: Fundação Pinhal + EN108');
await goCard('OSINT');
const search = async (q) => { await page.fill('#osint-q', q); await page.click('#osint-go'); await page.waitForTimeout(350); };
await search('Fundação Pinhal');
await page.click('.btn:has-text("ARQUIVAR")');
await page.waitForTimeout(300);
await page.click('.btn:has-text("IDENTIFICAR O")');
await page.waitForSelector('.option-list');
await page.click('.option:has-text("Ivo Rezende")');
await page.waitForTimeout(400);
await search('Heitor Salles');
await page.click('.btn:has-text("ARQUIVAR")');
await page.waitForTimeout(300);

// ── EVIDÊNCIAS: EN102 cifra + EN106 foto + EN109 manifesto ──
step('evidências: EN102 cifra, EN106 foto, EN109 manifesto');
await goCard('Evidências');
await page.click('.row-card:has-text("Caderno de Heitor")');
await page.click('.btn:has-text("DECIFRAR")');
await page.fill('#enigma-in', 'LAVAGEM');
await page.locator('.modal-actions .btn', { hasText: 'DECIFRAR' }).last().click();
await page.waitForTimeout(400);
await closeModal();
await closeModal();
await page.click('.row-card:has-text("Foto de longa exposição")');
await page.click('.btn:has-text("ANALISAR QUADRO")');
await page.waitForSelector('.video-frame');
await page.click('.video-frame[data-i="2"]');
await page.waitForTimeout(400);
await closeModal();
await closeModal();
await page.click('.row-card:has-text("Manifesto do Serra Verde")');
await page.click('.btn:has-text("CRUZAR EMBARQUE")');
await page.waitForSelector('.option-list');
await page.click('.option:has-text("Marta Salles")');
await page.waitForTimeout(400);
await closeModal();
await closeModal();

// ── LINHA DO TEMPO ──
step('linha do tempo');
await goCard('Linha do Tempo');
const ORDER = ['Embarque no Serra Verde', 'Discussão pela mala', 'Luzes do vagão 2 apagam', 'Heitor dormiu', 'Objeto atirado ao rio', 'Corpo descoberto', 'Perícia embarca', 'Sala do Júri'];
for (const title of ORDER) {
  await page.locator('.list-panel', { hasText: 'FORA DE ORDEM' }).locator(`.row-card:has-text("${title}")`).first().click();
  await page.waitForTimeout(120);
}
await page.click('.btn:has-text("VALIDAR CRONOLOGIA")');
await page.waitForTimeout(600);

// ── MURAL (uma conexão do grafo do caso) ──
step('mural: corda ↔ luvas');
await goCard('Mural');
await page.click('.chip:has-text("Luvas de serviço")');
await page.click('.chip:has-text("Corda de nylon")');
await page.waitForTimeout(400);
const elimN = await page.locator('.mural-suspect.eliminated').count();
console.log('  suspeitos eliminados no mural:', elimN);

// ── JÚRI ──
step('júri: cofre + acusação');
await goCard('Sala do Júri');
await page.screenshot({ path: 'shot2_cofre.png' });
await page.click('.btn:has-text("INSERIR OS 4 CÓDIGOS")');
await page.waitForTimeout(600);
await page.waitForSelector('.jury-wrap');
const locButtons = await page.$$eval('.jury-col:nth-child(2) .jury-opt', (els) => els.map((e) => e.textContent.trim()));
const locOpt = locButtons.find((l) => norm(SOL.location).split(/[^A-Z0-9]+/).some((w) => w && norm(l).includes(w)));
const metButtons = await page.$$eval('.jury-col:nth-child(3) .jury-opt', (els) => els.map((e) => e.textContent.trim()));
const metOpt = metButtons.find((m) => [...words(m)].filter((w) => words(SOL.method).has(w)).length >= 2);
await page.click(`.jury-col:nth-child(1) .jury-opt:has-text("${SOL.suspect}")`);
await page.click(`.jury-col:nth-child(2) .jury-opt:has-text("${locOpt}")`);
await page.click(`.jury-col:nth-child(3) .jury-opt:has-text("${metOpt}")`);
await page.click('.btn:has-text("EMITIR VEREDITO")');
await page.waitForSelector('.modal-box');
await page.click('.btn:has-text("SUSTENTAR ACUSAÇÃO")');
await page.waitForSelector('.verdict-reveal', { timeout: 5000 });
step('veredito ACEITO ✔');
await page.click('.btn:has-text("VER RESULTADO")');
await page.waitForSelector('.result-panel', { timeout: 5000 });
const rank = await page.textContent('.result-rank');
const score = await page.textContent('.result-score');
await page.waitForTimeout(600);
await page.screenshot({ path: 'shot2_resultado.png' });

step('QG pós-caso: CASE003 desbloqueado?');
await page.click('.btn:has-text("CRÉDITOS")');
await page.waitForSelector('.credits');
await page.click('.btn:has-text("VOLTAR AO QG")');
await page.waitForSelector('.episode-grid');
const done2 = await page.locator('.episode-card', { hasText: 'Silêncio na Serra' }).textContent();
if (!/CONCLU/.test(done2)) throw new Error('CASE002 deveria constar concluído');
const ep3 = await page.locator('.episode-card', { hasText: 'Operação Eclipse' }).textContent();
if (/🔒/.test(ep3)) throw new Error('CASE003 deveria estar desbloqueado');
await page.waitForTimeout(600);
await page.screenshot({ path: 'shot2_qg.png' });

console.log('\n═══ PLAYTHROUGH CASE002 COMPLETO ═══');
console.log('Patente:', rank.trim(), '| Pontuação:', score.trim());
console.log('Erros JS:', errors.length ? errors : 'nenhum');
await browser.close();
process.exit(errors.length ? 1 : 0);
