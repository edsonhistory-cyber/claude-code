/**
 * zip.js — gerador de ZIP mínimo (método STORE, sem compressão) para o
 * "ZIP do Caso" do CASE_EDITOR.json. Sem dependências, roda offline.
 */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** files: [{ name: 'pasta/arquivo.json', text: '...' }] → Blob application/zip */
export function makeZip(files) {
  const enc = new TextEncoder();
  const chunks = [];
  const central = [];
  let offset = 0;

  const u16 = (v) => new Uint8Array([v & 0xff, (v >> 8) & 0xff]);
  const u32 = (v) => new Uint8Array([v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >>> 24) & 0xff]);

  for (const f of files) {
    const nameB = enc.encode(f.name);
    const data = enc.encode(f.text);
    const crc = crc32(data);
    const header = [u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(nameB.length), u16(0)];
    central.push({ nameB, crc, size: data.length, offset });
    for (const part of [...header, nameB, data]) { chunks.push(part); offset += part.length; }
  }

  const cdStart = offset;
  for (const e of central) {
    const rec = [u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(e.crc), u32(e.size), u32(e.size), u16(e.nameB.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(e.offset), e.nameB];
    for (const part of rec) { chunks.push(part); offset += part.length; }
  }
  const cdSize = offset - cdStart;
  const end = [u32(0x06054b50), u16(0), u16(0), u16(central.length), u16(central.length), u32(cdSize), u32(cdStart), u16(0)];
  chunks.push(...end);
  return new Blob(chunks, { type: 'application/zip' });
}
