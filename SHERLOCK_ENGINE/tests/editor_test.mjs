/** editor_test.mjs — exercita o Sherlock Studio: validação ao vivo, edição,
 *  detecção de conflito na timeline, lacre da solução, novo caso e exports. */
import { chromium } from 'playwright-core';

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });
const step = (m) => console.log('▸', m);

await page.goto('http://localhost:8123/editor/index.html');
step('carregou o estúdio');
await page.waitForSelector('#console-out .ok, #console-out .err', { timeout: 15000 });
let badge = await page.textContent('#console-badge');
console.log('  validação inicial:', badge.trim());
if (!/^0 erros/.test(badge.trim())) throw new Error('CASE001 deveria abrir com 0 erros');
await page.screenshot({ path: 'shot_studio.png' });

// edita o título do caso e vê refletir
step('edita título do caso');
await page.fill('.ed-grid .ed-field:nth-child(2) input', 'A Última Parada (editado)');
await page.waitForTimeout(600);

// timeline: cria conflito de horário e verifica destaque + erro no console
step('timeline: injeta conflito de horário');
await page.click('.nav-item:has-text("Linha do Tempo")');
await page.waitForSelector('.ed-row');
const timeInput = page.locator('.ed-row').nth(1).locator('.ed-field.small').nth(1).locator('input');
await timeInput.fill('13:00'); // antes das 14:00 do EVT0001 → conflito
await page.waitForTimeout(700);
const conflicts = await page.locator('.ed-row.conflict').count();
badge = (await page.textContent('#console-badge')).trim();
console.log('  linhas em conflito:', conflicts, '| console:', badge);
if (!conflicts || /^0 erros/.test(badge)) throw new Error('conflito não detectado');
await page.screenshot({ path: 'shot_studio_conflito.png' });
await timeInput.fill('15:20'); // conserta
await page.waitForTimeout(700);
badge = (await page.textContent('#console-badge')).trim();
if (!/^0 erros/.test(badge)) throw new Error('conflito não sanado: ' + badge);
step('conflito sanado → 0 erros');

// solução: fluxo de spoiler + relacre
step('solução lacrada: abrir com confirmação e relacrar');
await page.click('.nav-item:has-text("Solução")');
await page.waitForSelector('.sealed-stamp');
const stamp = await page.textContent('.sealed-stamp');
if (!/LACRADA/.test(stamp)) throw new Error('solução deveria estar lacrada');
await page.click('.btn:has-text("EDITAR SOLUÇÃO")');
await page.click('.modal-actions .btn:has-text("MOSTRAR")');
await page.waitForSelector('.sealed-box .ed-grid');
await page.click('.btn:has-text("LACRAR E SALVAR")');
await page.waitForSelector('.sealed-stamp');
badge = (await page.textContent('#console-badge')).trim();
console.log('  após relacre:', badge);
if (!/^0 erros/.test(badge)) throw new Error('relacre quebrou a validação');

// exportação ZIP
step('exporta ZIP do caso');
const dl = page.waitForEvent('download');
await page.click('#btn-export-zip');
const download = await dl;
console.log('  download:', download.suggestedFilename());

// novo caso pelo SDK
step('novo caso (SDK template)');
await page.click('#btn-new');
await page.fill('#nc-id', 'CASE002');
await page.click('.modal-actions .btn:has-text("CRIAR")');
await page.waitForTimeout(700);
const caseLabel = (await page.textContent('#studio-case')).trim();
badge = (await page.textContent('#console-badge')).trim();
console.log('  caso ativo:', caseLabel, '| validação:', badge);
if (!caseLabel.startsWith('CASE002')) throw new Error('novo caso não ativou');
await page.screenshot({ path: 'shot_studio_novocaso.png' });

console.log('\n═══ EDITOR OK ═══');
console.log('Erros JS:', errors.length ? errors : 'nenhum');
await browser.close();
process.exit(errors.length ? 1 : 0);
