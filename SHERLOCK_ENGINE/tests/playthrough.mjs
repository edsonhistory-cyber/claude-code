const ROOT = new URL('..', import.meta.url).pathname;
/**
 * playthrough.mjs — joga CASE001 do boot ao resultado, validando o fluxo real.
 * A escolha correta do júri é derivada AQUI (decodificando o JSON lacrado),
 * nunca impressa no relatório.
 */
import { chromium } from 'playwright-core';
import { readFile } from 'node:fs/promises';

const CASE = JSON.parse(await readFile(ROOT + 'cases/CASE001_A_Ultima_Parada/SHERLOCK_ENGINE_CASE001_FULL.json', 'utf-8'));
const SOL = JSON.parse(Buffer.from(CASE.final_solution.data, 'base64').toString('utf-8'));
const norm = (x) => String(x).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
const words = (x) => new Set(norm(x).split(/[^A-Z0-9]+/).filter((w) => w.length > 3));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => { try { localStorage.setItem('sherlock_tutorial_v1', '1'); } catch (e) { /* */ } }); // não abrir o tutorial nos testes
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(m.text()); });

const step = (msg) => console.log('▸', msg);
async function closeModal() {
  const b = page.locator('.modal-actions .btn', { hasText: 'FECHAR' }).last();
  if (await b.count()) await b.click();
  await page.waitForTimeout(150);
}
async function skipCinematic() {
  try { await page.click('.cine-skip', { timeout: 2500 }); } catch { /* sem cinemática */ }
  await page.waitForTimeout(300);
  await dismissBriefing();
}
async function dismissBriefing() {
  try {
    await page.waitForSelector('.briefing-skip, .briefing-start', { timeout: 3000 });
    const skip = page.locator('.briefing-skip');
    if (await skip.count()) await skip.first().click();
    else await page.locator('.briefing-start').first().click();
    await page.waitForTimeout(500);
  } catch { /* sem briefing */ }
}
async function goCard(name) {
  await page.click('.screen-nav .btn:has-text("Central")').catch(() => {});
  await page.waitForSelector('.central-grid');
  await page.click(`.central-card:has(.card-title:has-text("${name}"))`);
  await page.waitForTimeout(250);
}

await page.goto('http://localhost:8123/index.html');
step('boot');
await page.waitForSelector('.login-panel', { timeout: 20000 });
await page.fill('#login-user', 'Edson');
await page.click('.btn-primary');
step('QG da campanha → abrir CASE001');
await page.waitForSelector('.episode-grid', { timeout: 8000 });
const ep1 = page.locator('.episode-card', { hasText: 'A Última Parada' });
if (!/DISPON/.test(await ep1.textContent())) throw new Error('CASE001 deveria estar disponível');
const ep2txt = await page.locator('.episode-card', { hasText: 'Silêncio na Serra' }).textContent();
if (!/🔒/.test(ep2txt)) throw new Error('CASE002 deveria estar bloqueado');
await ep1.click();
step('cinemática de abertura → skip');
await skipCinematic();
await page.waitForSelector('.central-grid', { timeout: 8000 });

// ── MAPA: coletas ──
step('mapa: coletas');
await goCard('Mapa');
const visit = async (stopText, hotspots) => {
  await page.click(`.stop-card:has-text("${stopText}")`);
  await page.waitForSelector('.hotspots');
  for (const h of hotspots) { await page.click(`.hotspot:has-text("${h}")`); await page.waitForTimeout(250); }
  await closeModal();
};
await visit('Rua 24 Horas', ['Bilheteria']);
await visit('pátio da perícia', ['Porta-volumes', 'Cabine', 'Assento 5']);
await visit('Parada não programada', ['Placa KM 18', 'Acostamento']);
await visit('Parque Barigui', ['Lixeira']);
await visit('Parque Tanguá', ['Mirante']);

// ── INTERROGATÓRIOS: testemunhas + Sérgio ──
step('interrogatórios');
await goCard('Interrogatórios');
const witness = async (name) => {
  await page.click(`.suspect-card:has-text("${name}")`);
  await page.waitForSelector('.interro');
  const b = page.locator('.btn', { hasText: 'REGISTRAR DEPOIMENTO' });
  if (await b.count()) await b.click();
  await page.waitForTimeout(300);
  await closeModal();
};
await witness('Bianca');   // entrega EV003
await witness('Wanda');
await witness('Klaus');
await witness('Aldo');

// Sérgio: pergunta da garrafa + apresentar luvas → contradição
await page.click('.suspect-card:has-text("Sérgio")');
await page.waitForSelector('.interro');
await page.click('.topic:has-text("garrafa")');
await page.waitForTimeout(2000);
await page.click('.option:has-text("EV002")');
await page.waitForTimeout(700);
await skipCinematic(); // CIN002
await page.waitForTimeout(1400);
step('EN005: quebra de álibi');
await page.click('.btn:has-text("REGISTRAR CONTRADIÇÃO")');
await page.waitForSelector('.option-list');
await page.click('.option:has-text("Nunca toquei nela")');
await page.waitForTimeout(400);
await closeModal(); // fecha sessão
await closeModal();

// ── LABORATÓRIO ──
step('laboratório: toxicologia, fibras (EN007), digitais, docsc');
await goCard('Laboratório');
const runTab = async (tab, waitMs) => {
  await page.click(`.tab-btn:has-text("${tab}")`);
  const b = page.locator('.sample-row .btn', { hasText: 'ANALISAR' });
  if (await b.count()) { await b.click(); await page.waitForTimeout(waitMs); }
};
await runTab('TOXICOLOGIA', 2600);
await runTab('FIBRAS', 2600);
// modal EN007 abre sozinho → amostra correta (padrão idêntico)
await page.waitForSelector('.fiber-opt', { timeout: 4000 });
await page.click('.fiber-opt[data-i="1"]');
await page.waitForTimeout(400);
await closeModal();
await runTab('DIGITAIS', 2200);
await runTab('DOCUMENTOSCOPIA', 2000);

// ── GEOINT: EN003 + EN004 → CAMPO completo (token KM18) ──
step('geoint: EN003 tacógrafo + EN004 satélite');
await goCard('GEOINT');
await page.click('[data-seg="km18"]');
await page.waitForTimeout(600);
await page.click('[data-mark="km18"]');
await page.waitForTimeout(600);

// ── EVIDÊNCIAS: EN001 QR (precisa token KM18 + tox) ──
step('evidências: EN001 QR da garrafa');
await goCard('Evidências');
await page.click('.row-card:has-text("Garrafa térmica")');
await page.click('.btn:has-text("ESCANEAR QR")');
await page.waitForSelector('.qr-frags');
for (const ch of 'GLICOSIDEO') {
  await page.locator(`.qr-frag:not([disabled])`, { hasText: ch }).first().click();
  await page.waitForTimeout(80);
}
await page.waitForTimeout(500);
await closeModal();
await closeModal();

// ── OSINT: DOC008 + EN008 (token CAFE já emitido pela Perícia) ──
step('osint: documentos + EN008');
await goCard('OSINT');
const search = async (q) => {
  await page.fill('#osint-q', q);
  await page.click('#osint-go');
  await page.waitForTimeout(350);
};
await search('Otávio Bandeira');
await page.click('.btn:has-text("ARQUIVAR")');
await page.waitForTimeout(300);
await search('SB Fretamentos');
await page.click('.btn:has-text("ARQUIVAR")');
await page.waitForTimeout(300);
await page.click('.btn:has-text("RELACIONAR")');
await page.waitForSelector('.option-list');
await page.click('.option:has-text("Sérgio Bento")');
await page.waitForTimeout(400);

// ── EVIDÊNCIAS: EN002 cifra + EN006 vídeo + EN009 manifesto ──
step('evidências: EN002 cifra, EN006 vídeo, EN009 manifesto');
await goCard('Evidências');
await page.click('.row-card:has-text("Planilha de Codinomes")');
await page.click('.btn:has-text("DECIFRAR")');
await page.fill('#enigma-in', 'DELACAO');
await page.locator('.modal-actions .btn', { hasText: 'RESPONDER' }).last().click();
await page.waitForTimeout(400);
await closeModal();
await closeModal();
await page.click('.row-card:has-text("Vídeo da Bianca")');
await page.click('.btn:has-text("ANALISAR QUADRO")');
await page.waitForSelector('.video-frame');
await page.click('.video-frame[data-i="4"]');
await page.waitForTimeout(400);
await closeModal();
await closeModal();
await page.click('.row-card:has-text("Manifesto")');
await page.click('.btn:has-text("CRUZAR REEMBARQUE")');
await page.waitForSelector('.option-list');
await page.click('.option:has-text("Aldo Meireles")');
await page.waitForTimeout(400);
await closeModal();
await closeModal();

// ── LINHA DO TEMPO ──
step('linha do tempo');
await goCard('Linha do Tempo');
const ORDER = ['Embarque', 'Discussão', 'Fotos clandestinas', 'Parada não programada', 'Vítima bebe café', 'Descarte das luvas', 'Morte', 'Sala do Júri'];
for (const title of ORDER) {
  await page.locator('.list-panel', { hasText: 'FORA DE ORDEM' }).locator(`.row-card:has-text("${title}")`).first().click();
  await page.waitForTimeout(120);
}
await page.click('.btn:has-text("VALIDAR CRONOLOGIA")');
await page.waitForTimeout(600);

// ── MURAL (checagem visual + 1 conexão) ──
step('mural: conexão garrafa↔veneno');
await goCard('Mural');
await page.click('.chip:has-text("Garrafa térmica")');
await page.click('.chip:has-text("Veneno no café")');
await page.waitForTimeout(400);

// ── SALA DO JÚRI: cofre + acusação ──
step('júri: cofre');
await goCard('Sala do Júri');
await page.screenshot({ path: 'shot_cofre.png' });
await page.click('.btn:has-text("INSERIR OS 4 CÓDIGOS")');
await page.waitForTimeout(600);
step('júri: acusação');
await page.waitForSelector('.jury-wrap');

// escolhe as opções corretas derivadas do envelope lacrado (não imprimir!)
const suspectOpt = SOL.suspect;
const locButtons = await page.$$eval('.jury-col:nth-child(2) .jury-opt', (els) => els.map((e) => e.textContent.trim()));
const locOpt = locButtons.find((l) => norm(SOL.location).split(/[^A-Z0-9]+/).some((w) => w && norm(l).includes(w)));
const metButtons = await page.$$eval('.jury-col:nth-child(3) .jury-opt', (els) => els.map((e) => e.textContent.trim()));
const metOpt = metButtons.find((m) => [...words(m)].filter((w) => words(SOL.method).has(w)).length >= 2);

await page.click(`.jury-col:nth-child(1) .jury-opt:has-text("${suspectOpt}")`);
await page.click(`.jury-col:nth-child(2) .jury-opt:has-text("${locOpt}")`);
await page.click(`.jury-col:nth-child(3) .jury-opt:has-text("${metOpt}")`);
await page.click('.btn:has-text("EMITIR VEREDITO")');
await page.waitForSelector('.modal-box');
await page.click('.btn:has-text("SUSTENTAR ACUSAÇÃO")');
await page.waitForSelector('.verdict-reveal', { timeout: 5000 });
step('veredito ACEITO ✔');
await page.screenshot({ path: 'shot_veredito.png' });
await page.click('.btn:has-text("VER RESULTADO")');
await page.waitForSelector('.result-panel', { timeout: 5000 });
const rank = await page.textContent('.result-rank');
const score = await page.textContent('.result-score');
await page.waitForTimeout(1400); // deixa a entrada assentar antes do print
await page.screenshot({ path: 'shot_resultado.png' });
await page.click('.btn:has-text("CRÉDITOS")');
await page.waitForSelector('.credits');
await page.waitForTimeout(1200); // deixa a entrada assentar antes do print
await page.screenshot({ path: 'shot_creditos.png' });

// M4: volta ao QG — CASE001 concluído, CASE002 desbloqueado, carreira com XP
step('QG pós-caso: progresso da campanha');
await page.click('.btn:has-text("VOLTAR AO QG")');
await page.waitForSelector('.episode-grid', { timeout: 5000 });
const done1 = await page.locator('.episode-card', { hasText: 'A Última Parada' }).textContent();
if (!/CONCLU/.test(done1)) throw new Error('CASE001 deveria constar concluído');
const unlocked2 = await page.locator('.episode-card', { hasText: 'Silêncio na Serra' }).textContent();
if (/🔒/.test(unlocked2)) throw new Error('CASE002 deveria estar desbloqueado');
const rankCareer = await page.textContent('.career-rank b');
const trophies = await page.locator('.trophy-row .row-tag.ok').count();
console.log('  carreira:', rankCareer.trim(), '| troféus:', trophies);
await page.screenshot({ path: 'shot_qg.png' });

console.log('\n═══ PLAYTHROUGH COMPLETO ═══');
console.log('Patente:', rank.trim(), '| Pontuação:', score.trim());
console.log('Erros JS de página:', errors.length ? errors : 'nenhum');
await browser.close();
process.exit(errors.length ? 1 : 0);
