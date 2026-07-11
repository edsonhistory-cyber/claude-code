/**
 * build_offline_html.mjs — empacota o JOGO INTEIRO num único arquivo HTML
 * (dois cliques, sem servidor, sem internet):
 *   - módulos ES viram data: URLs mapeados por um <script type="importmap">
 *   - JSONs (engine-data/, cases/, manifests) viram um patch de fetch() local
 *   - imagens referenciadas pelos manifests viram data URIs (base64)
 *   - CSS entra inline
 * A solução dos casos permanece LACRADA (base64) — design_source/ fica fora.
 *
 * Uso: node tools/build_offline_html.mjs [saida.html]
 */
import { readFile, readdir, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2] || path.join(root, 'sherlock_offline.html');
const rel = (p) => path.relative(root, p).split(path.sep).join('/');

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const dataUri = async (file) => {
  const buf = await readFile(file);
  return `data:${MIME[path.extname(file).toLowerCase()] || 'application/octet-stream'};base64,${buf.toString('base64')}`;
};

// ── 1. módulos JS → importmap com data: URLs ────────────────────────────────
async function listJs(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await listJs(p)));
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}
const modules = await listJs(path.join(root, 'js'));
const KEY = (p) => `@sherlock/${rel(p)}`;
const importmap = { imports: {} };
for (const m of modules) {
  let src = await readFile(m, 'utf-8');
  const dir = path.posix.dirname(rel(m));
  // reescreve imports relativos para as chaves canônicas do importmap
  src = src.replace(/(from\s*|^\s*import\s*)(['"])(\.{1,2}\/[^'"]+)\2/gm, (all, pre, q, spec) => {
    const resolved = path.posix.normalize(path.posix.join(dir, spec));
    return `${pre}${q}@sherlock/${resolved}${q}`;
  });
  importmap.imports[KEY(m)] = `data:text/javascript;base64,${Buffer.from(src).toString('base64')}`;
}

// ── 2. dados: JSONs servidos por um fetch() 100% local ──────────────────────
const FILES = {};
async function addJsonDir(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'design_source') await addJsonDir(p); }
    else if (e.name.endsWith('.json')) FILES[rel(p)] = await readFile(p, 'utf-8');
  }
}
await addJsonDir(path.join(root, 'engine-data'));
await addJsonDir(path.join(root, 'cases'));

// manifests de mídia: os CAMINHOS viram data URIs das próprias imagens
async function inlineManifest(mfPath) {
  const abs = path.join(root, mfPath);
  if (!existsSync(abs)) return;
  const m = JSON.parse(await readFile(abs, 'utf-8'));
  for (const k of Object.keys(m)) {
    const img = path.join(root, m[k]);
    if (existsSync(img)) m[k] = await dataUri(img);
    else delete m[k];
  }
  FILES[mfPath] = JSON.stringify(m);
}
await inlineManifest('assets/images/scenes/manifest.json');
await inlineManifest('assets/images/portraits/manifest.json');
await inlineManifest('assets/images/objects/manifest.json');

// mapa real: meta JSON + imagem embutida (o pack aponta para map_geo.image)
if (existsSync(path.join(root, 'assets/images/map/map_cwb.json'))) {
  FILES['assets/images/map/map_cwb.json'] = await readFile(path.join(root, 'assets/images/map/map_cwb.json'), 'utf-8');
  const mapPng = path.join(root, 'assets/images/map/map_cwb.png');
  if (existsSync(mapPng)) {
    const uri = await dataUri(mapPng);
    for (const [k, v] of Object.entries(FILES)) {
      if (v.includes('assets/images/map/map_cwb.png')) {
        FILES[k] = v.replaceAll('assets/images/map/map_cwb.png', uri);
      }
    }
  }
}

// ── 3. CSS inline ───────────────────────────────────────────────────────────
const css = (await readFile(path.join(root, 'css/theme.css'), 'utf-8'))
  + '\n' + (await readFile(path.join(root, 'css/screens.css'), 'utf-8'));

// ── 4. monta o HTML único ───────────────────────────────────────────────────
const filesJson = JSON.stringify(FILES);
const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sherlock Engine — jogo completo offline</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ccircle cx='7' cy='7' r='5' fill='none' stroke='%2300C2FF' stroke-width='2'/%3E%3Cline x1='11' y1='11' x2='15' y2='15' stroke='%2300C2FF' stroke-width='2'/%3E%3C/svg%3E">
<style>${css}</style>
<script>
// Servidor de arquivos embutido: fetch() responde daqui, nunca da rede.
const __FILES = ${filesJson};
window.fetch = (url) => {
  const key = String(url).replace(/^\\.\\//, '').split('?')[0];
  if (key in __FILES) return Promise.resolve(new Response(__FILES[key], { status: 200, headers: { 'Content-Type': 'application/json' } }));
  return Promise.resolve(new Response('', { status: 404 }));
};
</script>
<script type="importmap">${JSON.stringify(importmap)}</script>
</head>
<body>
  <div id="app" aria-live="polite"></div>
  <noscript>Este jogo requer JavaScript habilitado.</noscript>
  <script type="module">import '@sherlock/js/engine.js';</script>
</body>
</html>`;

await writeFile(OUT, html);
const size = (await stat(OUT)).size;
console.log(`OK: ${rel(OUT)} — ${(size / 1024 / 1024).toFixed(1)} MB, ${modules.length} módulos, ${Object.keys(FILES).length} arquivos de dados embutidos.`);
