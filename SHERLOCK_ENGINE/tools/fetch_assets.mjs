/**
 * fetch_assets.mjs — baixador de assets em TEMPO DE BUILD (não em runtime).
 * O jogo final é OFFLINE: isto roda uma vez, baixa para assets/ e o jogo
 * referencia local (as cenas SVG procedurais são o fallback sem fotos).
 *
 * Uso:  node tools/fetch_assets.mjs [--dry-run]
 * Requer Node 18+ (fetch nativo). Freesound exige token gratuito: FREESOUND_TOKEN=xxx
 *
 * Fontes (BRIEF §5): Wikimedia Commons, Openverse, Freesound (CC0), Pixabay.
 * Cada item baixado vira linha em assets/CREDITS.md: id | arquivo | fonte | autor | licença | url
 * Rede restrita? Liberar: commons.wikimedia.org, upload.wikimedia.org,
 * api.openverse.org, freesound.org, cdn.freesound.org, pixabay.com, cdn.pixabay.com
 */
import { readFile, mkdir, appendFile, writeFile, readdir, rm } from 'node:fs/promises';
import { createWriteStream, existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry-run');
const UA = 'SherlockEngine/1.0 (jogo educacional offline; build-time asset fetch)';

const manifest = JSON.parse(await readFile(path.join(root, 'assets/manifest.assets.json'), 'utf-8'));
const CREDITS = path.join(root, 'assets/CREDITS.md');
if (!DRY) await writeFile(CREDITS, '# Créditos e licenças de assets\n\nGerado por `tools/fetch_assets.mjs` (busca em build-time; runtime 100% offline).\n\n| id | arquivo | fonte | autor | licença | url |\n|----|---------|-------|-------|---------|-----|\n');

const credit = (row) => (DRY ? Promise.resolve() : appendFile(CREDITS, `| ${row.map((x) => String(x).replaceAll('|', '/')).join(' | ')} |\n`));

const sceneManifest = {}; // cena → caminho da 1ª foto BAIXADA COM SUCESSO
const portraitManifest = {}; // personagem (P001…) → caminho do retrato gerado por IA
const objectManifest = {}; // evidência (EV001…) → foto forense gerada por IA

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// GET com retry/backoff — o Wikimedia limita runners de CI com HTTP 429
async function fetchWithRetry(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) return res;
    if (res.status === 429 || res.status >= 500) {
      const retryAfter = Number(res.headers.get('retry-after')) || 0;
      const wait = Math.max(retryAfter * 1000, 2500 * 2 ** i);
      console.log(`  429/5xx — aguardando ${Math.round(wait / 1000)}s e tentando de novo (${i + 1}/${tries})`);
      await sleep(wait);
      continue;
    }
    throw new Error(`HTTP ${res.status} em ${url}`);
  }
  throw new Error(`HTTP 429 persistente em ${url}`);
}

async function download(url, target, name, item) {
  const dir = path.join(root, target);
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, name);
  const rel = `${target.replace(/\/$/, '')}/${name}`;
  const ok = () => {
    if (item?.scene && !sceneManifest[item.scene]) sceneManifest[item.scene] = rel;
    if (item?.portrait && !portraitManifest[item.portrait]) portraitManifest[item.portrait] = rel;
    if (item?.object && !objectManifest[item.object]) objectManifest[item.object] = rel;
  };
  if (DRY) { console.log('  [dry-run]', url, '->', rel); ok(); return name; }
  if (existsSync(file)) { console.log('  já existe:', rel); ok(); return name; }
  const res = await fetchWithRetry(url);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(file));
  ok();
  await sleep(1500); // gentileza com o servidor: espaça os downloads
  return name;
}

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').slice(0, 60);

// ── Wikimedia Commons: busca em File: + imageinfo (url original, autor, licença) ──
async function fetchWikimedia(item) {
  const api = 'https://commons.wikimedia.org/w/api.php';
  const q = new URLSearchParams({
    action: 'query', generator: 'search', gsrsearch: `filetype:bitmap ${item.query}`,
    gsrnamespace: '6', gsrlimit: String(item.max ?? 6),
    prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '1280', format: 'json',
  });
  const res = await fetchWithRetry(`${api}?${q}`); // a busca também leva 429 em CI
  const data = await res.json();
  const pages = Object.values(data.query?.pages || {});
  let n = 0;
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!info) continue;
    const meta = info.extmetadata || {};
    const license = meta.LicenseShortName?.value || 'ver página';
    if (/non-?free|fair use/i.test(license)) continue; // só licenças livres
    const author = (meta.Artist?.value || 'desconhecido').replace(/<[^>]+>/g, '').trim().slice(0, 60);
    const ext = path.extname(new URL(info.thumburl || info.url).pathname) || '.jpg';
    const name = `${item.id}_${++n}${ext}`;
    await download(info.thumburl || info.url, item.target, name, item);
    await credit([item.id, path.join(item.target, name), 'Wikimedia Commons', author, license, info.descriptionurl || info.url]);
  }
  if (!n) throw new Error('nenhum resultado livre');
  return n;
}

// ── Openverse: agregador CC0/CC BY (sem chave p/ uso básico) ──
async function fetchOpenverse(item) {
  const q = new URLSearchParams({
    q: item.query, license_type: 'commercial,modification',
    page_size: String(item.max ?? 4),
  });
  const res = await fetchWithRetry(`https://api.openverse.org/v1/images/?${q}`);
  const data = await res.json();
  let n = 0;
  for (const r of data.results || []) {
    const ext = path.extname(new URL(r.url).pathname) || '.jpg';
    const name = `${item.id}_${++n}${ext}`;
    await download(r.url, item.target, name, item);
    await credit([item.id, path.join(item.target, name), `Openverse (${r.source})`, r.creator || 'desconhecido', r.license?.toUpperCase(), r.foreign_landing_url || r.url]);
  }
  if (!n) throw new Error('nenhum resultado');
  return n;
}

// ── Freesound: apenas CC0 (exige FREESOUND_TOKEN gratuito) ──
async function fetchFreesound(item) {
  const token = process.env.FREESOUND_TOKEN;
  if (!token) throw new Error('defina FREESOUND_TOKEN (grátis em freesound.org/apiv2/apply)');
  const q = new URLSearchParams({
    query: item.query, filter: 'license:"Creative Commons 0"',
    fields: 'id,name,username,license,previews,url', page_size: String(item.max ?? 2), token,
  });
  const res = await fetch(`https://freesound.org/apiv2/search/text/?${q}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Freesound HTTP ${res.status}`);
  const data = await res.json();
  let n = 0;
  for (const r of data.results || []) {
    const name = `${item.id}_${++n}_${slug(r.name)}.mp3`;
    await download(r.previews['preview-hq-mp3'], item.target, name, item);
    await credit([item.id, path.join(item.target, name), 'Freesound', r.username, 'CC0', r.url]);
  }
  if (!n) throw new Error('nenhum CC0 encontrado');
  return n;
}

// ── Pixabay: exige PIXABAY_KEY (grátis); imagens e áudio royalty-free ──
async function fetchPixabay(item) {
  const key = process.env.PIXABAY_KEY;
  if (!key) throw new Error('defina PIXABAY_KEY (grátis em pixabay.com/api/docs)');
  const q = new URLSearchParams({ key, q: item.query, per_page: String(item.max ?? 3), safesearch: 'true' });
  const res = await fetch(`https://pixabay.com/api/?${q}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Pixabay HTTP ${res.status}`);
  const data = await res.json();
  let n = 0;
  for (const r of data.hits || []) {
    const name = `${item.id}_${++n}.jpg`;
    await download(r.largeImageURL, item.target, name, item);
    await credit([item.id, path.join(item.target, name), 'Pixabay', r.user, 'Pixabay License', r.pageURL]);
  }
  if (!n) throw new Error('nenhum resultado');
  return n;
}

// ── Pollinations.ai: imagens GERADAS POR IA (retratos, evidências, cenas) ──
// Sem chave; a geração pode levar ~10-30s por imagem, o retry cobre 5xx/429.
async function fetchPollinations(item) {
  const prompt = encodeURIComponent(`${item.prompt}${item._style ? `, ${item._style}` : ''}`);
  const w = item.width ?? 768, h = item.height ?? 768;
  const url = `https://image.pollinations.ai/prompt/${prompt}?width=${w}&height=${h}&seed=${item.seed ?? 42}&nologo=true&model=flux`;
  const target = item.target || 'assets/images/portraits/';
  const name = `${item.id}.jpg`;
  await download(url, target, name, item);
  await credit([item.id, path.join(target, name), 'Pollinations.ai (imagem gerada por IA)', 'modelo FLUX', 'saída de IA — uso livre', 'https://pollinations.ai']);
  return 1;
}

// ── Mapa real: tiles oficiais do OpenStreetMap costurados com ImageMagick ──
// (maps.wikimedia.org devolve 403 fora da Wikimedia). Baixa n×n tiles em volta
// do centro e monta uma imagem única + meta JSON com o centro EXATO da grade;
// o jogo projeta lat/lon → pixel no cliente (Web Mercator).
const exec = promisify(execFile);
async function fetchStaticMap(item) {
  const [lat, lon] = item.center;
  const z = item.zoom;
  const n = Math.max(2, Math.round((item.size ?? 1280) / 256)); // tiles por lado
  const world = 2 ** z;
  const fx = ((lon + 180) / 360) * world;
  const latR = (lat * Math.PI) / 180;
  const fy = ((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2) * world;
  const x0 = Math.round(fx - n / 2), y0 = Math.round(fy - n / 2);
  const dir = path.join(root, item.target);
  await mkdir(dir, { recursive: true });
  const out = path.join(dir, `${item.id}.png`);
  if (DRY) { console.log('  [dry-run] mapa OSM', `z${z} ${n}x${n} tiles → ${item.target}${item.id}.png`); }
  else if (existsSync(out)) { console.log('  já existe:', `${item.target}${item.id}.png`); }
  else {
    const tiles = [];
    for (let ty = y0; ty < y0 + n; ty++) {
      for (let tx = x0; tx < x0 + n; tx++) {
        const f = path.join(dir, `tile_${z}_${tx}_${ty}.png`);
        if (!existsSync(f)) {
          const res = await fetchWithRetry(`https://tile.openstreetmap.org/${z}/${tx}/${ty}.png`);
          await pipeline(Readable.fromWeb(res.body), createWriteStream(f));
          await sleep(350); // política de uso dos tiles OSM: devagar
        }
        tiles.push(f);
      }
    }
    await exec('montage', [...tiles, '-mode', 'concatenate', '-tile', `${n}x${n}`, out]);
    for (const f of tiles) await rm(f, { force: true });
  }
  // centro exato da grade costurada (a borda cai em limites de tile)
  const cLon = (((x0 + n / 2) / world) * 360) - 180;
  const cy = (y0 + n / 2) / world;
  const cLat = (Math.atan(Math.sinh(Math.PI * (1 - 2 * cy))) * 180) / Math.PI;
  if (!DRY) {
    await writeFile(path.join(dir, `${item.id}.json`),
      JSON.stringify({ center: [cLat, cLon], zoom: z, size: n * 256 }, null, 2));
  }
  await credit([item.id, path.join(item.target, `${item.id}.png`), 'OpenStreetMap (tiles oficiais)', '© OpenStreetMap contributors', 'ODbL', 'https://www.openstreetmap.org/copyright']);
  return 1;
}

const providers = { wikimedia: fetchWikimedia, openverse: fetchOpenverse, freesound: fetchFreesound, pixabay: fetchPixabay, pollinations: fetchPollinations, staticmap: fetchStaticMap };

const portraits = (manifest.portraits || []).map((p) => ({ source: 'pollinations', portrait: p.id, _style: manifest.portrait_style, ...p }));
const objects = (manifest.objects || []).map((o) => ({ source: 'pollinations', object: o.id, target: 'assets/images/objects/', _style: manifest.object_style, ...o }));
const scenesAi = (manifest.scenes_ai || []).map((s) => ({ source: 'pollinations', target: 'assets/images/scenes_ai/', width: 1280, height: 720, _style: manifest.scene_style, ...s }));
const maps = (manifest.maps || []).map((m) => ({ source: 'staticmap', ...m }));
let ok = 0, fail = 0;
for (const item of [...maps, ...scenesAi, ...(manifest.images || []), ...portraits, ...objects, ...(manifest.audio || [])]) {
  const fn = providers[item.source];
  if (!fn) { console.warn('sem provedor:', item.source); continue; }
  try {
    const n = await fn(item);
    console.log(`ok: ${item.id} (${n} arquivo(s))`);
    ok++;
  } catch (e) {
    console.error(`falhou: ${item.id} — ${e.message}`);
    fail++;
  }
}
// Cura: se a busca falhou nesta rodada mas já há fotos baixadas antes,
// a cena não pode sumir do manifest — registra a 1ª foto existente no disco.
for (const item of manifest.images || []) {
  if (!item.scene || sceneManifest[item.scene]) continue;
  const dir = item.target.replace(/\/$/, '');
  const files = await readdir(path.join(root, dir)).catch(() => []);
  const first = files.filter((f) => f.startsWith(`${item.id}_`)).sort()[0];
  if (first) sceneManifest[item.scene] = `${dir}/${first}`;
}

if (Object.keys(sceneManifest).length && !DRY) {
  await mkdir(path.join(root, 'assets/images/scenes'), { recursive: true });
  await writeFile(path.join(root, 'assets/images/scenes/manifest.json'), JSON.stringify(sceneManifest, null, 2));
  console.log(`Manifest de cenas: ${Object.keys(sceneManifest).length} fotos substituirão as ilustrações SVG no jogo.`);
}
if (Object.keys(portraitManifest).length && !DRY) {
  await mkdir(path.join(root, 'assets/images/portraits'), { recursive: true });
  await writeFile(path.join(root, 'assets/images/portraits/manifest.json'), JSON.stringify(portraitManifest, null, 2));
  console.log(`Manifest de retratos: ${Object.keys(portraitManifest).length} personagens com retrato gerado por IA.`);
}
if (Object.keys(objectManifest).length && !DRY) {
  await mkdir(path.join(root, 'assets/images/objects'), { recursive: true });
  await writeFile(path.join(root, 'assets/images/objects/manifest.json'), JSON.stringify(objectManifest, null, 2));
  console.log(`Manifest de objetos: ${Object.keys(objectManifest).length} evidências com foto forense gerada por IA.`);
}
console.log(`\nConcluído: ${ok} itens ok, ${fail} falharam.${DRY ? ' (dry-run: nada foi gravado)' : ''}`);
if (fail) console.log('Rede restrita? Liberar: commons.wikimedia.org, upload.wikimedia.org, api.openverse.org, freesound.org, cdn.freesound.org, pixabay.com, cdn.pixabay.com');
