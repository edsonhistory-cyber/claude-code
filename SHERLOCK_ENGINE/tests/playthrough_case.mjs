const ROOT = new URL('..', import.meta.url).pathname;
/** playthrough_case.mjs 3|4 — joga CASE003/CASE004 do QG ao resultado.
 *  A acusação correta é derivada decodificando o JSON lacrado AQUI. */
import { chromium } from 'playwright-core';
import { readFile } from 'node:fs/promises';

const N = process.argv[2];
const SPECS = {
  3: {
    caseId: 'CASE003', title: 'Operação Eclipse',
    fullPath: ROOT + 'cases/CASE003_Operacao_Eclipse/CASE003_FULL.json',
    seedHistory: { CASE001: { score: 1160, rank: 'Detetive de Elite' }, CASE002: { score: 1150, rank: 'Detetive de Elite' } },
    map: [
      ['Guarita do paiol', ['Mesa de Téo', 'Gaveta pessoal']],
      ['Sala de perícia', ['Impressora de lacres', 'Armário de jalecos']],
      ['Paiol de Provas', ['Corpo na viga', 'Prateleira 14', 'Caixa de provas aberta']],
      ['Subsolo', ['Quadro geral', 'Porta de serviço']],
    ],
    witnesses: ['Alice', 'Otto', 'Samir'],
    topicSessions: [
      ['Cátia', 'lote em uso'],           // → DOC205
      ['Rui', 'pressionou'],              // → DOC207
    ],
    confront: { name: 'Vera', topic: '7 minutos do apagão', present: 'EV204', en5Correct: 1 },
    labTabs: [['MICROIMPRESSÃO', 2400, { compare: 0 }], ['FORENSE DIGITAL', 2800], ['MEDICINA LEGAL', 2200], ['DOCUMENTOSCOPIA', 2000]],
    geo: { seg: 'apagao', mark: 'sub' },
    seqEnigma: { row: 'HD de provas clonado', btn: 'RECONSTITUIR RÓTULO', word: 'CLONE' },
    osint: [
      { q: 'jardineiro', arquivar: true, enigmaBtn: 'IDENTIFICAR O BENEFICIÁRIO', pick: 'filho de Vera' },
      { q: 'Vera Lontra', arquivar: true },
    ],
    cipher: { row: 'Bloco de Anota', answer: 'PROVA' },
    frames: { row: 'Backup das câmeras', idx: 2 },
    docChoice: { row: 'DOC204', btn: 'CRUZAR BIOMETRIA', pick: 'Vera Lontra' },
    timeline: ['Fórum fecha ao público', 'Vera declara saída', 'Sabotagem no quadro geral', 'Apagão de 7 minutos', 'Vulto de jaleco no backup', 'Luz volta', 'Téo encontrado enforcado', 'Sala do Júri'],
    nextEpisode: null,
  },
  4: {
    caseId: 'CASE004', title: 'O Colecionador',
    fullPath: ROOT + 'cases/CASE004_O_Colecionador/CASE004_FULL.json',
    seedHistory: { CASE001: { score: 1160, rank: 'Detetive de Elite' }, CASE002: { score: 1150, rank: 'Detetive de Elite' }, CASE003: { score: 1100, rank: 'Detetive de Elite' } },
    map: [
      ['Casarão do Batel', ['Portaria de gala']],
      ['Galeria de arte', ['Corredor das telas', 'Pertences da vítima']],
      ['Escritório da anfitriã', ['Cofre atrás do quadro', 'Escrivaninha']],
      ['Salão de leilões', ['Cadeira do palco', 'Mesa de som', 'Sistema de lances']],
      ['Jardim de inverno', ['Convidados retidos', 'Vitrais e mesas']],
    ],
    witnesses: ['Duda', 'Bruno', 'Padre'],
    topicSessions: [
      ['Célio', 'roteiro original'],      // → DOC305
    ],
    confront: { name: 'Helena', topic: 'revisou pessoalmente a cadeira', present: 'EV302', en5Correct: 1 },
    labTabs: [['TOXICOLOGIA', 2600, { compare: 0 }], ['MECANISMOS', 2200], ['GRAFOSCOPIA', 2400], ['ÁUDIO FORENSE', 2000]],
    geo: { seg: 'fantasma', mark: 'sal' },
    seqEnigma: { row: 'Agulha oca', btn: 'RECONSTITUIR RÓTULO', word: 'DIGOXINA' },
    osint: [
      { q: 'MUSEU', arquivar: true, enigmaBtn: 'IDENTIFICAR O CODINOME', pick: 'Helena Sarti' },
    ],
    cipher: { row: 'Agenda de Gustavo', answer: 'MUSEU' },
    frames: { row: 'Gravação do leilão', idx: 4 },
    docChoice: { row: 'Lista de Convidados', btn: 'CRUZAR ACESSO', pick: 'Helena Sarti' },
    timeline: ['Convidados chegam ao leilão', 'Gustavo confronta a anfitriã', 'Blecaute cênico do lote 77', 'Gustavo senta na cadeira', 'Lance-fantasma de meio milhão', 'Gustavo colapsa no martelo final', 'Convidados retidos para triagem', 'Sala do Júri'],
    nextEpisode: null,
  },
  6: {
    caseId: 'CASE006', title: 'Réquiem no Largo',
    fullPath: ROOT + 'cases/CASE006_Requiem_no_Largo/CASE006_FULL.json',
    seedHistory: { CASE001: { score: 1160, rank: 'Detetive de Elite' }, CASE002: { score: 1150, rank: 'Detetive de Elite' }, CASE003: { score: 1100, rank: 'Detetive de Elite' }, CASE004: { score: 1100, rank: 'Detetive de Elite' }, CASE005: { score: 1100, rank: 'Detetive de Elite' } },
    map: [
      ['Largo da Ordem — chegada', ['Portaria de gala']],
      ['Museu Paranaense — galeria', ['Corredor das telas', 'Pertences da vítima']],
      ['Sala da diretora', ['Cofre atrás do quadro', 'Escrivaninha']],
      ['Salão nobre', ['Cadeira do palco', 'Mesa de som', 'Sistema de lances']],
      ['Passeio Público', ['Convidados retidos', 'Vitrais e mesas']],
    ],
    witnesses: ['Dora Reis', 'Breno', 'Padre'],   // "Dora" sozinho casa com "coleciona(dora)"/"opera(dora)"
    topicSessions: [
      ['Célio', 'roteiro original'],      // → DOC305
    ],
    confront: { name: 'Regina', topic: 'revisou pessoalmente a cadeira', present: 'EV302', en5Correct: 1 },
    labTabs: [['TOXICOLOGIA', 2600, { compare: 0 }], ['MECANISMOS', 2200], ['GRAFOSCOPIA', 2400], ['ÁUDIO FORENSE', 2000]],
    geo: { seg: 'fantasma', mark: 'sal' },
    seqEnigma: { row: 'Agulha oca', btn: 'RECONSTITUIR RÓTULO', word: 'DIGOXINA' },
    osint: [
      { q: 'MUSEU', arquivar: true, enigmaBtn: 'IDENTIFICAR O CODINOME', pick: 'Regina Valadares' },
    ],
    cipher: { row: 'Agenda de Otávio', answer: 'MUSEU' },
    frames: { row: 'Gravação do leilão', idx: 4 },
    docChoice: { row: 'Lista de Convidados', btn: 'CRUZAR ACESSO', pick: 'Regina Valadares' },
    timeline: ['Convidados chegam ao leilão', 'Otávio confronta a anfitriã', 'Blecaute cênico do lote 77', 'Otávio senta na cadeira', 'Lance-fantasma de meio milhão', 'Otávio colapsa no martelo final', 'Convidados retidos para triagem', 'Sala do Júri'],
    nextEpisode: null,
  },
};
const S = SPECS[N];
if (!S) { console.error('uso: node playthrough_case.mjs 3|4|6'); process.exit(1); }

const CASE = JSON.parse(await readFile(S.fullPath, 'utf-8'));
const SOL = JSON.parse(Buffer.from(CASE.final_solution.data, 'base64').toString('utf-8'));
const norm = (x) => String(x).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
const words = (x) => new Set(norm(x).split(/[^A-Z0-9]+/).filter((w) => w.length > 3));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => { try { localStorage.setItem('sherlock_tutorial_v1', '1'); } catch (e) { /* */ } }); // não abrir o tutorial nos testes
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
async function skipIntro() {
  try { await page.click('.cine-skip', { timeout: 4000 }); } catch { /* sem cinemática */ }
  await page.waitForTimeout(300);
  try {
    await page.waitForSelector('.briefing-skip, .briefing-start', { timeout: 4000 });
    const skip = page.locator('.briefing-skip');
    if (await skip.count()) await skip.first().click();
    else await page.locator('.briefing-start').first().click();
    await page.waitForTimeout(500);
  } catch { /* sem briefing */ }
}

await page.goto('http://localhost:8123/index.html');
await page.evaluate((hist) => localStorage.setItem('sherlock_career', JSON.stringify({
  xp: 5000, achievements: ['ACH001'], reputation: { 'Perícia': 70, 'Imprensa': 60, 'Polícia': 80, 'População': 65 },
  history: hist,
})), S.seedHistory);
await page.reload();
step('boot → login → QG → abrir ' + S.caseId);
await page.waitForSelector('.login-panel', { timeout: 20000 });
await page.fill('#login-user', 'Edson');
await page.click('.btn-primary');
await page.waitForSelector('.episode-grid', { timeout: 8000 });
const ep = page.locator('.episode-card', { hasText: S.title });
if (/🔒/.test(await ep.textContent())) throw new Error(S.caseId + ' deveria estar desbloqueado');
await ep.click();
await skipIntro();
await page.waitForSelector('.central-grid', { timeout: 10000 });

step('mapa: coletas');
await goCard('Mapa');
for (const [stop, hotspots] of S.map) {
  await page.click(`.stop-card:has-text("${stop}")`);
  await page.waitForSelector('.hotspots');
  for (const h of hotspots) { await page.click(`.hotspot:has-text("${h}")`); await page.waitForTimeout(250); }
  await closeModal();
}

step('interrogatórios: testemunhas + tópicos');
await goCard('Interrogatórios');
for (const w of S.witnesses) {
  await page.click(`.suspect-card:has-text("${w}")`);
  await page.waitForSelector('.interro');
  const b = page.locator('.btn', { hasText: 'REGISTRAR DEPOIMENTO' });
  if (await b.count()) await b.click();
  await page.waitForTimeout(300);
  await closeModal();
}
for (const [name, topicText] of S.topicSessions) {
  await page.click(`.suspect-card:has-text("${name}")`);
  await page.waitForSelector('.interro');
  await page.click(`.topic:has-text("${topicText}")`);
  await page.waitForTimeout(2000);
  await closeModal();
}
step('confronto: contradição + quebra de álibi');
await page.click(`.suspect-card:has-text("${S.confront.name}")`);
await page.waitForSelector('.interro');
await page.click(`.topic:has-text("${S.confront.topic}")`);
await page.waitForTimeout(2000);
await page.click(`.option:has-text("${S.confront.present}")`);
await page.waitForTimeout(1600);
await page.click('.btn:has-text("REGISTRAR CONTRADIÇÃO")');
await page.waitForSelector('.option-list');
await page.click(`.option[data-i="${S.confront.en5Correct}"]`);
await page.waitForTimeout(400);
await closeModal();
await closeModal();

step('laboratório: 4 bancadas');
await goCard('Laboratório');
for (const [tab, ms, opts] of S.labTabs) {
  await page.click(`.tab-btn:has-text("${tab}")`);
  const b = page.locator('.sample-row .btn', { hasText: 'ANALISAR' });
  if (await b.count()) { await b.click(); await page.waitForTimeout(ms); }
  if (opts?.compare != null) {
    await page.waitForSelector('.fiber-opt', { timeout: 4000 });
    await page.click(`.fiber-opt[data-i="${opts.compare}"]`);
    await page.waitForTimeout(400);
    await closeModal();
  }
}

step('geoint: gráfico + satélite');
await goCard('GEOINT');
await page.click(`[data-seg="${S.geo.seg}"]`);
await page.waitForTimeout(600);
await page.click(`[data-mark="${S.geo.mark}"]`);
await page.waitForTimeout(600);

step('evidências: enigma de sequência');
await goCard('Evidências');
await page.click(`.row-card:has-text("${S.seqEnigma.row}")`);
await page.click(`.btn:has-text("${S.seqEnigma.btn}")`);
await page.waitForSelector('.qr-frags');
for (const ch of S.seqEnigma.word) {
  await page.locator('.qr-frag:not([disabled])', { hasText: ch }).first().click();
  await page.waitForTimeout(80);
}
await page.waitForTimeout(500);
await closeModal();
await closeModal();

step('osint');
await goCard('OSINT');
for (const o of S.osint) {
  await page.fill('#osint-q', o.q);
  await page.click('#osint-go');
  await page.waitForTimeout(350);
  if (o.arquivar) { const b = page.locator('.btn', { hasText: 'ARQUIVAR' }).first(); if (await b.count()) await b.click(); await page.waitForTimeout(300); }
  if (o.enigmaBtn) {
    await page.click(`.btn:has-text("${o.enigmaBtn}")`);
    await page.waitForSelector('.option-list');
    await page.click(`.option:has-text("${o.pick}")`);
    await page.waitForTimeout(400);
  }
}

step('evidências: cifra + quadros + cruzamento');
await goCard('Evidências');
await page.click(`.row-card:has-text("${S.cipher.row}")`);
await page.click('.btn:has-text("DECIFRAR")');
await page.fill('#enigma-in', S.cipher.answer);
await page.locator('.modal-actions .btn', { hasText: 'DECIFRAR' }).last().click();
await page.waitForTimeout(400);
await closeModal();
await closeModal();
await page.click(`.row-card:has-text("${S.frames.row}")`);
await page.click('.btn:has-text("ANALISAR QUADRO")');
await page.waitForSelector('.video-frame');
await page.click(`.video-frame[data-i="${S.frames.idx}"]`);
await page.waitForTimeout(400);
await closeModal();
await closeModal();
await page.click(`.row-card:has-text("${S.docChoice.row}")`);
await page.click(`.btn:has-text("${S.docChoice.btn}")`);
await page.waitForSelector('.option-list');
await page.click(`.option:has-text("${S.docChoice.pick}")`);
await page.waitForTimeout(400);
await closeModal();
await closeModal();

step('linha do tempo');
await goCard('Linha do Tempo');
for (const title of S.timeline) {
  await page.locator('.list-panel', { hasText: 'FORA DE ORDEM' }).locator(`.row-card:has-text("${title}")`).first().click();
  await page.waitForTimeout(120);
}
await page.click('.btn:has-text("VALIDAR CRONOLOGIA")');
await page.waitForTimeout(600);

step('júri: cofre + acusação');
await goCard('Sala do Júri');
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
await page.waitForTimeout(700);
await page.screenshot({ path: `shot_case00${N}_resultado.png` });

await page.click('.btn:has-text("CRÉDITOS")');
await page.waitForSelector('.credits');
await page.click('.btn:has-text("VOLTAR AO QG")');
await page.waitForSelector('.episode-grid');
const done = await page.locator('.episode-card', { hasText: S.title }).textContent();
if (!/CONCLU/.test(done)) throw new Error(S.caseId + ' deveria constar concluído');
await page.waitForTimeout(700);
await page.screenshot({ path: `shot_case00${N}_qg.png` });

console.log(`\n═══ PLAYTHROUGH ${S.caseId} COMPLETO ═══`);
console.log('Patente:', rank.trim(), '| Pontuação:', score.trim());
console.log('Erros JS:', errors.length ? errors : 'nenhum');
await browser.close();
process.exit(errors.length ? 1 : 0);
