#!/usr/bin/env node
/**
 * validate_case.mjs — Roda as checagens de integridade fora do browser.
 * Uso: node tools/validate_case.mjs [CASE001]
 * Sai com código 1 se houver erros (para usar em CI/build).
 *
 * Reusa js/validators.js — a mesma lógica executada no boot do jogo.
 */
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runIntegrityChecks } from '../js/validators.js';
import { CASE_DIRS, CASE_FILES, CASE_KINDS } from '../js/database.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const caseId = process.argv[2] || 'CASE001';
if (!CASE_DIRS[caseId]) {
  console.error(`Caso desconhecido: ${caseId}. Disponíveis: ${Object.keys(CASE_DIRS).join(', ')}`);
  process.exit(1);
}

async function loadDir(dir, data) {
  for (const f of await readdir(path.join(root, dir))) {
    if (!f.endsWith('.json')) continue;
    const name = f.replace(/\.json$/, '');
    try {
      data[name] = JSON.parse(await readFile(path.join(root, dir, f), 'utf-8'));
    } catch (err) {
      data.__parseErrors.push(`${dir}/${f}: ${err.message}`);
    }
  }
}

const data = {};
Object.defineProperty(data, '__parseErrors', { value: [], enumerable: false });
await loadDir('engine-data', data);
await loadDir(CASE_DIRS.CASE001, data); // âncora dos módulos required
if (caseId !== 'CASE001') await loadDir(CASE_DIRS[caseId], data);
for (const kind of CASE_KINDS) data[`CASE_${kind}`] = data[CASE_FILES[caseId][kind]] ?? null;

const report = runIntegrityChecks(data);
report.errors.unshift(...data.__parseErrors.map((e) => `JSON inválido: ${e}`));

console.log(`\n══ Sherlock Engine — validação de integridade (${caseId}) ══\n`);
console.table(report.stats);
for (const w of report.warnings) console.warn('  aviso :', w);
for (const e of report.errors) console.error('  ERRO  :', e);
console.log(`\nCaso ${caseId} validado: ${report.errors.length} erros de integridade`);
if (report.warnings.length) console.log(`(${report.warnings.length} avisos — não bloqueiam o boot)`);
process.exit(report.errors.length ? 1 : 0);
