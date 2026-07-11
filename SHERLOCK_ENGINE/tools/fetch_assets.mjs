/**
 * fetch_assets.mjs — baixador de assets em TEMPO DE BUILD (nao em runtime).
 * O jogo final é OFFLINE: isto roda uma vez, baixa para assets/ e o jogo referencia local.
 *
 * Uso:  node tools/fetch_assets.mjs
 * Requer Node 18+ (fetch nativo). Freesound precisa de token gratuito (env FREESOUND_TOKEN).
 *
 * >>> ESTE É UM ESQUELETO. O Claude Code deve completar os provedores <<<
 * Fontes previstas no BRIEF §5:
 *   - wikimedia : https://commons.wikimedia.org/w/api.php (fotos de Curitiba, CC BY / PD)
 *   - openverse : https://api.openverse.org (agregador CC0/CC BY)
 *   - freesound : https://freesound.org (filtrar license "Creative Commons 0")
 *   - pixabay   : https://pixabay.com (royalty-free)
 * Cada item baixado -> uma linha em assets/CREDITS.md: id | arquivo | fonte | autor | licenca | url
 */
import { readFile, mkdir, appendFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const manifest = JSON.parse(await readFile(new URL("../assets/manifest.assets.json", import.meta.url)));
const CREDITS = new URL("../assets/CREDITS.md", import.meta.url);
await writeFile(CREDITS, "# Créditos de Assets\n\n| id | arquivo | fonte | autor | licença | url |\n|----|---------|-------|-------|---------|-----|\n");

async function credit(row) { await appendFile(CREDITS, `| ${row.join(" | ")} |\n`); }
async function save(target, name, buf) { await mkdir(target, { recursive: true }); /* TODO: gravar buf em target+name */ }

// TODO (Claude Code): implementar por provedor
async function fetchWikimedia(item) { /* Commons API -> URLs originais + autor + licenca */ }
async function fetchOpenverse(item) { /* /v1/images?license_type=commercial,modification */ }
async function fetchFreesound(item) { /* /apiv2/search/text?filter=license:"Creative Commons 0" */ }
async function fetchPixabay(item)  { /* API de audio/imagem royalty-free */ }

const providers = { wikimedia: fetchWikimedia, openverse: fetchOpenverse, freesound: fetchFreesound, pixabay: fetchPixabay };

for (const item of [...(manifest.images||[]), ...(manifest.audio||[])]) {
  const fn = providers[item.source];
  if (!fn) { console.warn("sem provedor:", item.source); continue; }
  try { await fn(item); console.log("ok:", item.id); }
  catch (e) { console.error("falhou:", item.id, e.message); }
}
console.log("Concluído. Rede restrita? Liberar: commons.wikimedia.org, upload.wikimedia.org, api.openverse.org, freesound.org, cdn.freesound.org, pixabay.com, cdn.pixabay.com");
