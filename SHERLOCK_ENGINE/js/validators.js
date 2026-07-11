/**
 * validators.js — Checagens de integridade da Sherlock Engine.
 *
 * Módulo puro (sem DOM, sem fs): recebe os JSONs já carregados e devolve um
 * relatório { errors, warnings, stats }. É usado pelo database.js no browser
 * e pelo tools/validate_case.mjs no Node.
 *
 * REGRA DE OURO: a solução do caso é lacrada. checkSealedSolution() valida a
 * estrutura sem nunca retornar, logar ou expor o conteúdo decodificado.
 */

// Normaliza rótulos com acento/caixa ("Perícia" -> "PERICIA") para comparação.
function norm(label) {
  return String(label)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .trim();
}

function decodeBase64(data) {
  if (typeof atob === 'function') {
    const bin = atob(data);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  }
  return Buffer.from(data, 'base64').toString('utf-8');
}

function collectDuplicates(list, label, errors) {
  const seen = new Set();
  for (const id of list) {
    if (id == null) continue;
    if (seen.has(id)) errors.push(`ID duplicado em ${label}: ${id}`);
    seen.add(id);
  }
}

function timeToMinutes(t) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t).trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/**
 * Valida a solução lacrada SEM expor o conteúdo.
 * Retorna apenas booleanos/mensagens neutras — nunca o texto decodificado.
 */
function checkSealedSolution(caseFull, errors) {
  const sol = caseFull?.final_solution;
  if (!sol) {
    errors.push('CASE001: final_solution ausente.');
    return;
  }
  if (sol.sealed !== true || sol.encoding !== 'base64' || typeof sol.data !== 'string') {
    errors.push('CASE001: final_solution NÃO está lacrada (esperado {sealed:true, encoding:"base64", data}).');
    return;
  }
  try {
    const decoded = JSON.parse(decodeBase64(sol.data));
    const suspect = decoded.suspect;
    const suspects = Array.isArray(suspect) ? suspect : [suspect];
    if (suspects.length !== 1 || typeof suspects[0] !== 'string' || !suspects[0].trim()) {
      errors.push('CASE001: a solução lacrada não define exatamente UM culpado.');
    }
    if (!decoded.location || !decoded.method) {
      errors.push('CASE001: solução lacrada incompleta (local/método ausentes).');
    }
    // `decoded` sai de escopo aqui — nunca é retornado nem logado.
  } catch {
    errors.push('CASE001: final_solution.data não é base64/JSON válido.');
  }
}

/**
 * data: mapa nomeDoArquivo (sem .json) -> objeto JSON carregado.
 * masterProject: SHERLOCK_MASTER_PROJECT já carregado.
 */
export function runIntegrityChecks(data) {
  const errors = [];
  const warnings = [];

  const get = (name) => data[name];
  const masterProject = get('SHERLOCK_MASTER_PROJECT');
  const caseFull = get('SHERLOCK_ENGINE_CASE001_FULL');
  const gameplay = get('SHERLOCK_ENGINE_GAMEPLAY');
  const database = get('SHERLOCK_ENGINE_DATABASE');
  const evidences = get('CASE001_EVIDENCES_FULL');
  const events = get('CASE001_EVENTS_FULL');
  const dialogues = get('CASE001_DIALOGUES_FULL');
  const caseDocs = get('CASE001_DOCUMENTS_FULL');

  // ── 1. Módulos obrigatórios do MASTER_PROJECT presentes ──────────────────
  if (masterProject?.modules) {
    for (const mod of masterProject.modules) {
      const key = mod.file.replace(/\.json$/, '');
      if (!get(key)) {
        if (mod.required) errors.push(`Módulo obrigatório ausente: ${mod.id} (${mod.file})`);
        else warnings.push(`Módulo opcional ausente: ${mod.id} (${mod.file})`);
      }
    }
  } else {
    errors.push('SHERLOCK_MASTER_PROJECT ausente ou sem lista de módulos.');
  }

  // ── 2. Universo de IDs conhecidos (união de todos os namespaces) ─────────
  const known = new Set(['JURY']);
  const addIds = (list, field = 'id') => {
    for (const item of list || []) if (item?.[field]) known.add(item[field]);
  };
  addIds(get('SHERLOCK_ENGINE_PERSONAGENS')?.personagens);
  addIds(get('SHERLOCK_ENGINE_OBJETOS')?.objetos);
  addIds(get('SHERLOCK_ENGINE_DOCUMENTOS')?.documentos);
  addIds(get('SHERLOCK_ENGINE_ENIGMAS')?.enigmas);
  addIds(get('SHERLOCK_ENGINE_CINEMATICS')?.scenes);
  addIds(get('SHERLOCK_ENGINE_EVIDENCE_GRAPH')?.graph?.nodes);
  addIds(caseDocs?.documents);
  addIds(evidences?.evidences);
  addIds(events?.timeline);
  addIds(events?.dynamic_events);
  if (database?.entities) {
    for (const group of Object.values(database.entities)) addIds(group);
  }
  const tokens = (gameplay?.multiplayer?.shared_tokens || []).map(norm);
  for (const t of tokens) known.add(t);

  // ── 3. IDs duplicados dentro de cada coleção ─────────────────────────────
  const dup = (list, label, field = 'id') =>
    collectDuplicates((list || []).map((x) => x?.[field]), label, errors);
  dup(get('SHERLOCK_ENGINE_PERSONAGENS')?.personagens, 'PERSONAGENS');
  dup(get('SHERLOCK_ENGINE_OBJETOS')?.objetos, 'OBJETOS');
  dup(get('SHERLOCK_ENGINE_DOCUMENTOS')?.documentos, 'DOCUMENTOS');
  dup(get('SHERLOCK_ENGINE_ENIGMAS')?.enigmas, 'ENIGMAS');
  dup(get('SHERLOCK_ENGINE_CINEMATICS')?.scenes, 'CINEMATICS');
  dup(caseDocs?.documents, 'CASE001_DOCUMENTS');
  dup(evidences?.evidences, 'CASE001_EVIDENCES');
  dup(events?.timeline, 'CASE001_EVENTS.timeline');
  dup(events?.dynamic_events, 'CASE001_EVENTS.dynamic_events');

  // ── 4. Referências cruzadas resolvidas ───────────────────────────────────
  const ref = (id, origem) => {
    if (id && !known.has(id) && !known.has(norm(id))) {
      errors.push(`Referência não resolvida em ${origem}: "${id}"`);
    }
  };
  if (database?.entities) {
    for (const p of database.entities.persons || []) for (const l of p.links || []) ref(l, `DATABASE.persons.${p.id}.links`);
    for (const o of database.entities.objects || []) for (const c of o.contains || []) ref(c, `DATABASE.objects.${o.id}.contains`);
    for (const d of database.entities.documents || []) for (const r of d.references || []) ref(r, `DATABASE.documents.${d.id}.references`);
    for (const e of database.entities.evidence || []) ref(e.source, `DATABASE.evidence.${e.id}.source`);
    for (const edge of database.knowledge_graph || []) {
      ref(edge.from, 'DATABASE.knowledge_graph.from');
      ref(edge.to, 'DATABASE.knowledge_graph.to');
    }
  }
  for (const ev of evidences?.evidences || []) {
    for (const r of ev.related || []) ref(r, `EVIDENCES.${ev.id}.related`);
  }
  for (const req of evidences?.jury_requirements || []) ref(req, 'EVIDENCES.jury_requirements');
  for (const [unlocked, sources] of Object.entries(events?.unlock_matrix || {})) {
    ref(unlocked, 'EVENTS.unlock_matrix (chave)');
    for (const src of sources) ref(src, `EVENTS.unlock_matrix.${unlocked}`);
  }
  for (const [charId, chara] of Object.entries(dialogues?.dialogue_tree || {})) {
    for (const [topicId, topic] of Object.entries(chara.topics || {})) {
      for (const cond of topic.unlock_if || []) ref(cond, `DIALOGUES.${charId}.${topicId}.unlock_if`);
    }
  }
  for (const trig of dialogues?.cinematic_triggers || []) ref(trig.play, 'DIALOGUES.cinematic_triggers.play');

  // ── 5. Solução lacrada e culpado único (sem expor conteúdo) ──────────────
  if (caseFull) checkSealedSolution(caseFull, errors);
  else errors.push('SHERLOCK_ENGINE_CASE001_FULL ausente.');

  // ── 6. Ciclo de tokens dos 4 dossiês (sem deadlock estrutural) ───────────
  const deps = caseFull?.dependencies || [];
  const roles = (gameplay?.multiplayer?.roles || []).map(norm);
  if (deps.length !== 4) {
    errors.push(`CASE001.dependencies: esperado ciclo de 4 arestas, encontrado ${deps.length}.`);
  } else {
    const outDeg = {}; const inDeg = {}; const depTokens = new Set();
    for (const d of deps) {
      outDeg[norm(d.from)] = (outDeg[norm(d.from)] || 0) + 1;
      inDeg[norm(d.to)] = (inDeg[norm(d.to)] || 0) + 1;
      depTokens.add(norm(d.token));
    }
    for (const r of roles) {
      if (outDeg[r] !== 1 || inDeg[r] !== 1) {
        errors.push(`Ciclo de dependência inválido: papel ${r} deve dar e receber exatamente 1 token.`);
      }
    }
    // Percorre o ciclo: deve fechar em 4 passos cobrindo os 4 papéis.
    const next = Object.fromEntries(deps.map((d) => [norm(d.from), norm(d.to)]));
    let cur = roles[0]; const visited = new Set();
    for (let i = 0; i < 4 && cur && !visited.has(cur); i++) { visited.add(cur); cur = next[cur]; }
    if (visited.size !== 4 || cur !== roles[0]) {
      errors.push('Ciclo de dependência não fecha um ciclo único de 4 papéis (risco de deadlock).');
    }
    if (tokens.length && (depTokens.size !== tokens.length || tokens.some((t) => !depTokens.has(t)))) {
      errors.push('Tokens do ciclo não batem com GAMEPLAY.multiplayer.shared_tokens.');
    }
  }

  // ── 7. Linha do tempo consistente (horários crescentes) ──────────────────
  let prev = -1;
  for (const evt of events?.timeline || []) {
    const t = timeToMinutes(evt.time);
    if (t == null) errors.push(`EVENTS.${evt.id}: horário inválido "${evt.time}".`);
    else if (t < prev) errors.push(`EVENTS.${evt.id}: horário ${evt.time} fora de ordem na linha do tempo.`);
    else prev = t;
  }

  // ── 8. Pistas alcançáveis e sem uso ──────────────────────────────────────
  const unlockable = new Set(Object.keys(events?.unlock_matrix || {}));
  const namedUnlocks = new Set();
  for (const act of caseFull?.acts || []) for (const u of act.unlock || []) namedUnlocks.add(norm(u));
  for (const step of caseFull?.critical_path || []) namedUnlocks.add(norm(step));
  for (const ev of evidences?.evidences || []) {
    const reachable = unlockable.has(ev.id) || !!ev.collected_at || namedUnlocks.has(norm(ev.name));
    if (!reachable) errors.push(`Evidência inalcançável: ${ev.id} (${ev.name}) — sem coleta, unlock ou menção nos atos.`);
  }
  const usedIds = new Set();
  const markUsed = (id) => id && usedIds.add(id);
  for (const ev of evidences?.evidences || []) for (const r of ev.related || []) markUsed(r);
  for (const req of evidences?.jury_requirements || []) markUsed(req);
  for (const key of Object.keys(events?.unlock_matrix || {})) markUsed(key);
  for (const chara of Object.values(dialogues?.dialogue_tree || {})) {
    for (const topic of Object.values(chara.topics || {})) for (const c of topic.unlock_if || []) markUsed(c);
  }
  for (const ev of evidences?.evidences || []) {
    if (!usedIds.has(ev.id) && !namedUnlocks.has(norm(ev.name))) {
      warnings.push(`Pista sem uso: ${ev.id} (${ev.name}) não é referenciada por júri, diálogos ou unlocks.`);
    }
  }

  // ── 9. Atos e progressão coerentes ───────────────────────────────────────
  const actsExpected = get('SHERLOCK_ENGINE_CORE')?.systems?.progression?.acts;
  if (actsExpected && (caseFull?.acts || []).length !== actsExpected) {
    errors.push(`CASE001 tem ${(caseFull?.acts || []).length} atos; CORE espera ${actsExpected}.`);
  }

  const stats = {
    modulos: Object.keys(data).length,
    personagens: (get('SHERLOCK_ENGINE_PERSONAGENS')?.personagens || []).length,
    objetos: (get('SHERLOCK_ENGINE_OBJETOS')?.objetos || []).length,
    documentos: (caseDocs?.documents || []).length,
    evidencias: (evidences?.evidences || []).length,
    eventos: (events?.timeline || []).length,
    enigmas: (get('SHERLOCK_ENGINE_ENIGMAS')?.enigmas || []).length,
    ids_conhecidos: known.size,
  };

  return { errors, warnings, stats };
}
