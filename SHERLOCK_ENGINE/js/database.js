/**
 * database.js — Carrega todos os JSONs da engine e do caso, valida a
 * integridade e expõe consultas. Fonte de verdade: os arquivos de design.
 *
 * NUNCA carrega cases/**\/design_source/ (contém a solução em texto claro).
 */
import { runIntegrityChecks } from './validators.js';

const ENGINE_DATA_DIR = 'engine-data';
const CASE_DIRS = { CASE001: 'cases/CASE001_A_Ultima_Parada' };

// Lista explícita (fetch não enumera diretórios). Mantida em ordem alfabética;
// a ordem de inicialização lógica vem de SHERLOCK_MASTER.startup_sequence.
const ENGINE_FILES = [
  'SHERLOCK_CASE_CREATOR_SDK',
  'SHERLOCK_CASE_EDITOR',
  'SHERLOCK_ENGINE_ACHIEVEMENTS_AND_CAREER',
  'SHERLOCK_ENGINE_AI',
  'SHERLOCK_ENGINE_AI_DIRECTOR',
  'SHERLOCK_ENGINE_ANALYTICS',
  'SHERLOCK_ENGINE_ANIMATIONS',
  'SHERLOCK_ENGINE_API',
  'SHERLOCK_ENGINE_ASSET_LIBRARY',
  'SHERLOCK_ENGINE_AUDIO',
  'SHERLOCK_ENGINE_BEHAVIOR_TREE',
  'SHERLOCK_ENGINE_CAMPAIGN',
  'SHERLOCK_ENGINE_CINEMATICS',
  'SHERLOCK_ENGINE_COMPILER',
  'SHERLOCK_ENGINE_CORE',
  'SHERLOCK_ENGINE_CRIME_SCENE_RECONSTRUCTION',
  'SHERLOCK_ENGINE_CUTSCENE_DIRECTOR',
  'SHERLOCK_ENGINE_DATABASE',
  'SHERLOCK_ENGINE_DEDUCTION',
  'SHERLOCK_ENGINE_DIALOGOS',
  'SHERLOCK_ENGINE_DOCUMENTOS',
  'SHERLOCK_ENGINE_ENIGMAS',
  'SHERLOCK_ENGINE_EVENTS',
  'SHERLOCK_ENGINE_EVIDENCE_GRAPH',
  'SHERLOCK_ENGINE_FORENSICS',
  'SHERLOCK_ENGINE_FORENSIC_LAB_SIMULATOR',
  'SHERLOCK_ENGINE_GAMEPLAY',
  'SHERLOCK_ENGINE_GEOINT',
  'SHERLOCK_ENGINE_HTML_LAYOUTS',
  'SHERLOCK_ENGINE_HUMINT',
  'SHERLOCK_ENGINE_IMAGENS',
  'SHERLOCK_ENGINE_KNOWLEDGE_GRAPH',
  'SHERLOCK_ENGINE_LOCALIZATION',
  'SHERLOCK_ENGINE_MOD_SUPPORT',
  'SHERLOCK_ENGINE_MULTIPLAYER',
  'SHERLOCK_ENGINE_NETWORK_ARCHITECTURE',
  'SHERLOCK_ENGINE_NPCS',
  'SHERLOCK_ENGINE_OBJETOS',
  'SHERLOCK_ENGINE_OSINT',
  'SHERLOCK_ENGINE_PERSONAGENS',
  'SHERLOCK_ENGINE_PROCEDURAL_CASE_GENERATOR',
  'SHERLOCK_ENGINE_PROMPTS',
  'SHERLOCK_ENGINE_RENDER_PIPELINE',
  'SHERLOCK_ENGINE_REPLAY',
  'SHERLOCK_ENGINE_REPOSITORY',
  'SHERLOCK_ENGINE_SAVE',
  'SHERLOCK_ENGINE_SAVEGAME_FORMAT',
  'SHERLOCK_ENGINE_SOUND_DESIGN',
  'SHERLOCK_ENGINE_UI',
  'SHERLOCK_ENGINE_VISUAL_SCRIPTING',
  'SHERLOCK_ENGINE_WORLD',
  'SHERLOCK_IMPLEMENTATION_ROADMAP',
  'SHERLOCK_MASTER',
  'SHERLOCK_MASTER_PROJECT',
];

const CASE_FILES = {
  CASE001: [
    'CASE001_COMPLETE_WORLD_STATE',
    'CASE001_DIALOGUES_FULL',
    'CASE001_DOCUMENTS_FULL',
    'CASE001_EVENTS_FULL',
    'CASE001_EVIDENCES_FULL',
    'CASE001_IMAGES_FULL',
    'SHERLOCK_ENGINE_CASE001_FULL',
  ],
};

const store = {};       // nome do arquivo (sem .json) -> objeto
let report = null;      // último relatório de integridade

async function fetchJson(path, name, failures) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    store[name] = await res.json();
  } catch (err) {
    failures.push(`${name}: ${err.message}`);
  }
}

/** Carrega engine-data + arquivos do caso. Retorna o relatório de integridade. */
export async function loadAll(caseId = 'CASE001', onProgress = () => {}) {
  const failures = [];
  const caseDir = CASE_DIRS[caseId];
  if (!caseDir) throw new Error(`404_CASE_NOT_FOUND: ${caseId}`);

  const jobs = [
    ...ENGINE_FILES.map((n) => [`${ENGINE_DATA_DIR}/${n}.json`, n]),
    ...CASE_FILES[caseId].map((n) => [`${caseDir}/${n}.json`, n]),
  ];
  let done = 0;
  await Promise.all(
    jobs.map(([path, name]) =>
      fetchJson(path, name, failures).then(() => onProgress(++done, jobs.length, name))
    )
  );

  report = runIntegrityChecks(store);
  for (const f of failures) report.errors.unshift(`Falha ao carregar ${f}`);

  // Aborta o boot se um módulo required do MASTER_PROJECT não carregou.
  const master = store.SHERLOCK_MASTER_PROJECT;
  if (master?.dependency_rules?.abort_on_missing_required_module) {
    const missing = (master.modules || []).filter(
      (m) => m.required && !store[m.file.replace(/\.json$/, '')]
    );
    if (missing.length) {
      throw new Error(`Boot abortado — módulos obrigatórios ausentes: ${missing.map((m) => m.id).join(', ')}`);
    }
  }
  return report;
}

/** Módulo carregado pelo nome do arquivo (sem .json). */
export function getModule(name) {
  return store[name] ?? null;
}

/** Consulta uma coleção com um predicado. Ex.: query('SHERLOCK_ENGINE_PERSONAGENS','personagens', p => p.id==='P002') */
export function query(moduleName, collectionPath, predicate = () => true) {
  let node = store[moduleName];
  for (const key of collectionPath.split('.')) node = node?.[key];
  return Array.isArray(node) ? node.filter(predicate) : [];
}

/** Busca uma entidade por ID em todos os namespaces conhecidos. */
export function getById(id) {
  const sources = [
    ['SHERLOCK_ENGINE_PERSONAGENS', 'personagens'],
    ['SHERLOCK_ENGINE_OBJETOS', 'objetos'],
    ['SHERLOCK_ENGINE_DOCUMENTOS', 'documentos'],
    ['SHERLOCK_ENGINE_ENIGMAS', 'enigmas'],
    ['CASE001_EVIDENCES_FULL', 'evidences'],
    ['CASE001_DOCUMENTS_FULL', 'documents'],
    ['CASE001_EVENTS_FULL', 'timeline'],
  ];
  for (const [mod, coll] of sources) {
    const hit = (store[mod]?.[coll] || []).find((x) => x.id === id);
    if (hit) return hit;
  }
  return null;
}

export function getReport() {
  return report;
}

/** String de tradução do LOCALIZATION.json (fallback: pt-BR -> chave). */
export function t(key, lang = 'pt-BR') {
  const s = store.SHERLOCK_ENGINE_LOCALIZATION?.strings?.[key];
  return s?.[lang] ?? s?.['pt-BR'] ?? key;
}
