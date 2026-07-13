/**
 * generate_music.mjs — trilha sintética (sem dependências, sem download).
 * Renderiza pads harmônicos + reverb Schroeder por módulo e grava WAV (mono).
 * Licença: gerado por síntese própria -> CC0 / domínio público.
 *   node tools/generate_music.mjs
 */
import { writeFile, mkdir } from 'node:fs/promises';

const SR = 22050;
const ROOT = new URL('..', import.meta.url).pathname;

const NIDX = { C:0,'C#':1,D:2,'D#':3,E:4,F:5,'F#':6,G:7,'G#':8,A:9,'A#':10,B:11 };
const NOTE = (s) => { const m = s.match(/^([A-G]#?)(\d)$/); const midi = (parseInt(m[2])+1)*12 + NIDX[m[1]]; return 440 * 2**((midi-69)/12); };

// distância cíclica (para loop perfeito)
const wrap = (t, c, L) => { let d = ((t - c) % L + L) % L; if (d > L/2) d -= L; return d; };

function osc(type, ph) {
  if (type === 'sine') return Math.sin(2*Math.PI*ph);
  if (type === 'tri')  { const x = ph - Math.floor(ph+0.5); return 2*Math.abs(2*x)-1; }
  // saw levemente suavizada
  const x = ph - Math.floor(ph); return 2*x - 1;
}

// reverb Schroeder simples (4 comb + 2 allpass), mono
function reverb(x, { wet=0.28 } = {}) {
  const combs = [1557, 1617, 1491, 1422].map((d,i)=>({ buf:new Float32Array(d), i:0, fb:0.80 - i*0.01 }));
  const aps   = [225, 556].map(d=>({ buf:new Float32Array(d), i:0, g:0.5 }));
  const out = new Float32Array(x.length);
  for (let n=0; n<x.length; n++) {
    let acc = 0;
    for (const c of combs) { const y = c.buf[c.i]; c.buf[c.i] = x[n] + y*c.fb; c.i = (c.i+1)%c.buf.length; acc += y; }
    acc /= combs.length;
    for (const a of aps) { const bufv = a.buf[a.i]; const y = -a.g*acc + bufv; a.buf[a.i] = acc + a.g*y; a.i = (a.i+1)%a.buf.length; acc = y; }
    out[n] = x[n]*(1-wet) + acc*wet;
  }
  return out;
}

// filtro low-pass de 1 polo (aquece / tira aspereza)
function lowpass(x, cutHz) {
  const a = Math.exp(-2*Math.PI*cutHz/SR); const out = new Float32Array(x.length); let y = 0;
  for (let n=0; n<x.length; n++) { y = (1-a)*x[n] + a*y; out[n] = y; }
  return out;
}

function render({ prog, chordDur, wave='tri', cut=1800, wet=0.28, sub=true, gain=1 }) {
  const L = prog.length * chordDur;         // duração do loop (s)
  const xf = 0.5;                            // crossfade de loop (s)
  const N = Math.round((L + xf) * SR);
  const dry = new Float32Array(N);
  // pads: triângulos/senos por nota, com envelope triangular cíclico (partição da unidade)
  for (let i=0; i<prog.length; i++) {
    const center = (i + 0.5) * chordDur;
    for (const name of prog[i]) {
      const f = NOTE(name);
      for (let n=0; n<N; n++) {
        const t = n / SR;
        const d = wrap(t, center, L);
        let env = 1 - Math.abs(d) / chordDur;     // triângulo de meia-largura = chordDur
        if (env <= 0) continue;
        env = env*env*(3-2*env);                   // suaviza (smoothstep)
        // 2 vozes levemente desafinadas (largura/coro)
        const a = osc(wave, t*f*1.0009) * 0.6 + osc('sine', t*f) * 0.4;
        const b = osc(wave, t*f*0.9991) * 0.5;
        dry[n] += env * (a + b) * 0.16;
      }
    }
    // sub-grave no fundamental do acorde (peso)
    if (sub) {
      const f = NOTE(prog[i][0]) / 2;
      for (let n=0; n<N; n++) {
        const t = n / SR; const d = wrap(t, center, L);
        let env = 1 - Math.abs(d) / chordDur; if (env <= 0) continue; env = env*env*(3-2*env);
        dry[n] += env * Math.sin(2*Math.PI*t*f) * 0.10;
      }
    }
  }
  // ar (ruído bem baixo)
  for (let n=0; n<N; n++) dry[n] += (Math.random()*2-1) * 0.006;

  let y = lowpass(dry, cut);
  y = reverb(y, { wet });

  // crossfade de loop: mistura a cauda [L..L+xf] no início
  const Lsm = Math.round(L*SR), xs = Math.round(xf*SR);
  const outN = Lsm;
  const out = new Float32Array(outN);
  for (let n=0; n<outN; n++) out[n] = y[n];
  for (let n=0; n<xs; n++) { const f = n/xs; out[n] = y[n]*f + y[Lsm+n]*(1-f); }

  // normaliza para ~-3 dBFS
  let peak = 1e-6; for (let n=0; n<outN; n++) peak = Math.max(peak, Math.abs(out[n]));
  const norm = (0.708 / peak) * gain;
  for (let n=0; n<outN; n++) out[n] = Math.tanh(out[n]*norm*1.1) * 0.92; // leve saturação/cola
  return out;
}

function wav(samples) {
  const n = samples.length, buf = Buffer.alloc(44 + n*2);
  buf.write('RIFF',0); buf.writeUInt32LE(36+n*2,4); buf.write('WAVE',8);
  buf.write('fmt ',12); buf.writeUInt32LE(16,16); buf.writeUInt16LE(1,20); buf.writeUInt16LE(1,22);
  buf.writeUInt32LE(SR,24); buf.writeUInt32LE(SR*2,28); buf.writeUInt16LE(2,32); buf.writeUInt16LE(16,34);
  buf.write('data',36); buf.writeUInt32LE(n*2,40);
  for (let i=0;i<n;i++){ const s=Math.max(-1,Math.min(1,samples[i])); buf.writeInt16LE(Math.round(s*32767), 44+i*2); }
  return buf;
}

// ── faixas por ambiente (progressões harmônicas) ────────────────────────────
const TRACKS = {
  'menu/menu_theme.wav':                    { prog:[['A2','A3','C4','E4'],['F2','F3','A3','C4'],['C3','C4','E4','G4'],['E2','E3','G#3','B3']], chordDur:4.4, wave:'tri', cut:1500, wet:.30 },
  'ambience/ambience_city.wav':             { prog:[['C3','G3','C4','E4'],['A2','E3','A3','C4'],['F2','C3','F3','A3'],['G2','D3','G3','B3']], chordDur:4.6, wave:'tri', cut:1700, wet:.30 },
  'map/map_ambient.wav':                     { prog:[['C3','C4','E4','G4'],['G2','G3','B3','D4'],['A2','A3','C4','E4'],['F2','F3','A3','C4']], chordDur:4.0, wave:'tri', cut:2300, wet:.32 },
  'laboratory/laboratory_ambient.wav':       { prog:[['A3','E4'],['A3','E4','B4'],['G3','D4'],['A3','E4','B4']], chordDur:4.0, wave:'sine', cut:2800, wet:.36, sub:false, gain:.95 },
  'interrogation/interrogation_ambient.wav': { prog:[['A2','A3'],['A2','A3','A#3'],['A2','A3'],['G2','A3','A#3']], chordDur:3.6, wave:'tri', cut:850, wet:.24 },
  'jury/jury_theme.wav':                     { prog:[['D2','D3','F3','A3'],['A2','A3','C4','E4'],['A#2','A#3','D4','F4'],['A2','A3','C#4','E4']], chordDur:4.6, wave:'saw', cut:1300, wet:.30 },
};

for (const d of ['menu','map','laboratory','interrogation','jury','ambience']) await mkdir(ROOT+'assets/audio/'+d, { recursive:true });
for (const [rel, cfg] of Object.entries(TRACKS)) {
  const s = render(cfg);
  let rms=0; for (const v of s) rms += v*v; rms = Math.sqrt(rms/s.length);
  await writeFile(ROOT+'assets/audio/'+rel, wav(s));
  console.log(`${rel.padEnd(42)} ${(s.length/SR).toFixed(1)}s  ${(s.length*2/1024|0)}KB  rms=${rms.toFixed(3)}`);
}
console.log('OK — trilha sintética gerada (CC0).');
