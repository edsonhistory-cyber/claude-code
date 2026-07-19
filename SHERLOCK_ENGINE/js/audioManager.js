/**
 * audioManager.js — Web Audio API: SFX procedurais (SHERLOCK_ENGINE_AUDIO.sfx),
 * ambiente sintetizado por local e vozes via SpeechSynthesis pt-BR.
 * Zero arquivos de áudio, zero rede — 100% offline (regra de ouro nº 2).
 */
import { getModule } from './database.js';

let ctx = null;
let ambienceNodes = [];
let muted = false;
let ttsEnabled = true;

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

const mix = () => getModule('SHERLOCK_ENGINE_AUDIO')?.mixing || { sfx_volume: 0.75, ambience_volume: 0.35, voice_volume: 0.9 };

function tone({ freq = 440, type = 'sine', dur = 0.1, vol = 0.3, when = 0, slide = 0 }) {
  const a = ac();
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  const t0 = a.currentTime + when;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol * mix().sfx_volume, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noiseBurst({ dur = 0.15, vol = 0.15, freq = 1200, when = 0, q = 1 }) {
  const a = ac();
  const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  const filter = a.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = q;
  const gain = a.createGain();
  const t0 = a.currentTime + when;
  gain.gain.setValueAtTime(vol * mix().sfx_volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(gain).connect(a.destination);
  src.start(t0);
}

// SFX do design (S001..S010) sintetizados
const SFX = {
  click: () => tone({ freq: 900, type: 'square', dur: 0.05, vol: 0.12 }),
  scanner: () => { tone({ freq: 300, type: 'sawtooth', dur: 0.5, vol: 0.1, slide: 900 }); noiseBurst({ dur: 0.4, vol: 0.03, freq: 3000 }); },
  camera_shutter: () => { noiseBurst({ dur: 0.05, vol: 0.25, freq: 2500 }); noiseBurst({ dur: 0.05, vol: 0.2, freq: 1800, when: 0.07 }); },
  unlock: () => { tone({ freq: 520, dur: 0.08, vol: 0.2 }); tone({ freq: 780, dur: 0.1, vol: 0.2, when: 0.09 }); tone({ freq: 1040, dur: 0.18, vol: 0.22, when: 0.19 }); },
  notification: () => { tone({ freq: 880, dur: 0.09, vol: 0.15 }); tone({ freq: 1174, dur: 0.14, vol: 0.15, when: 0.1 }); },
  radio_beep: () => { tone({ freq: 1200, type: 'square', dur: 0.06, vol: 0.08 }); tone({ freq: 1200, type: 'square', dur: 0.06, vol: 0.08, when: 0.12 }); },
  paper_flip: () => noiseBurst({ dur: 0.18, vol: 0.12, freq: 900, q: 0.5 }),
  door_open: () => tone({ freq: 120, type: 'triangle', dur: 0.4, vol: 0.2, slide: -40 }),
  typing: () => { for (let i = 0; i < 4; i++) noiseBurst({ dur: 0.03, vol: 0.07, freq: 2000 + Math.random() * 800, when: i * 0.07 }); },
  heartbeat: () => { tone({ freq: 55, type: 'sine', dur: 0.15, vol: 0.4 }); tone({ freq: 50, type: 'sine', dur: 0.2, vol: 0.35, when: 0.25 }); },
  error: () => tone({ freq: 220, type: 'sawtooth', dur: 0.25, vol: 0.15, slide: -80 }),
  success: () => { tone({ freq: 660, dur: 0.1, vol: 0.18 }); tone({ freq: 880, dur: 0.1, vol: 0.18, when: 0.11 }); tone({ freq: 1320, dur: 0.22, vol: 0.2, when: 0.22 }); },
};

export function sfx(name) {
  if (muted) return;
  try { (SFX[name] || SFX.click)(); } catch { /* áudio pode estar bloqueado antes do 1º gesto */ }
}

// Vibração tátil (celular): padrões curtos por tipo de evento. Silencioso e
// seguro onde não houver suporte (desktop, iOS Safari) — nunca lança.
const HAPTIC = { tap: 10, ok: [14, 40, 22], warn: 30, err: [40, 60, 40], collect: 18 };
export function haptic(kind = 'tap') {
  try { navigator.vibrate?.(HAPTIC[kind] ?? HAPTIC.tap); } catch { /* sem suporte */ }
}

/** Ambiente procedural por tela: ruído filtrado + pulsos discretos, em loop. */
// Cada ambiente tem sua identidade sonora PROCEDURAL (offline, sem arquivos):
// uma cama de ruído filtrado (room tone) + um drone tonal grave que "respira".
const AMB_PRESETS = {
  // kind:            ruído (room tone)                     drone tonal (emoção)
  central:        { type: 'lowpass',  freq: 220, vol: 0.05, drone: [55],       dvol: 0.015, dtype: 'sine' },
  campanha:       { type: 'bandpass', freq: 480, vol: 0.045, drone: [58],      dvol: 0.014, dtype: 'sine' },
  lab:            { type: 'lowpass',  freq: 380, vol: 0.035, drone: [120, 240], dvol: 0.010, dtype: 'sine' },   // limpo/frio
  juri:           { type: 'lowpass',  freq: 140, vol: 0.06, drone: [44],       dvol: 0.020, dtype: 'sine' },    // solene/madeira
  interrogatorio: { type: 'bandpass', freq: 300, vol: 0.04, drone: [60, 61.4], dvol: 0.018, dtype: 'sine' },    // tenso (batimento)
  evidencias:     { type: 'lowpass',  freq: 300, vol: 0.03, drone: [90],       dvol: 0.010, dtype: 'sine' },    // clínico/quieto
  mapa:           { type: 'highpass', freq: 2200, vol: 0.028, drone: [],       dvol: 0,     dtype: 'sine' },    // vento/parque
  mural:          { type: 'lowpass',  freq: 260, vol: 0.035, drone: [70],      dvol: 0.012, dtype: 'sine' },    // concentração
  osint:          { type: 'bandpass', freq: 820, vol: 0.03, drone: [100],      dvol: 0.010, dtype: 'triangle' }, // digital
  geoint:         { type: 'bandpass', freq: 620, vol: 0.03, drone: [80],       dvol: 0.012, dtype: 'triangle' }, // técnico
  tempo:          { type: 'lowpass',  freq: 200, vol: 0.04, drone: [50],       dvol: 0.014, dtype: 'sine' },     // reflexivo
  // aliases legados
  cidade:         { type: 'bandpass', freq: 500, vol: 0.05, drone: [58],       dvol: 0.014, dtype: 'sine' },
  parque:         { type: 'highpass', freq: 2500, vol: 0.02, drone: [],        dvol: 0,     dtype: 'sine' },
  agua:           { type: 'bandpass', freq: 1200, vol: 0.05, drone: [],        dvol: 0,     dtype: 'sine' },
};

export function ambience(kind) {
  stopAmbience();
  if (muted || !kind) return;
  try {
    const a = ac();
    const p = AMB_PRESETS[kind] || AMB_PRESETS.central;
    const ambVol = mix().ambience_volume ?? 0.35;
    const nodes = [];
    // cama de ruído (room tone)
    const dur = 4;
    const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource();
    src.buffer = buf; src.loop = true;
    const filter = a.createBiquadFilter();
    filter.type = p.type; filter.frequency.value = p.freq;
    const gain = a.createGain();
    gain.gain.value = p.vol * ambVol;
    src.connect(filter).connect(gain).connect(a.destination);
    src.start();
    nodes.push(src, filter, gain);
    // drone tonal que respira (LFO lento na amplitude)
    for (const f of (p.drone || [])) {
      const osc = a.createOscillator();
      osc.type = p.dtype || 'sine'; osc.frequency.value = f;
      const dg = a.createGain(); dg.gain.value = p.dvol * ambVol;
      const lfo = a.createOscillator(); lfo.frequency.value = 0.12 + Math.random() * 0.08;
      const lfoGain = a.createGain(); lfoGain.gain.value = p.dvol * ambVol * 0.6;
      lfo.connect(lfoGain).connect(dg.gain);
      osc.connect(dg).connect(a.destination);
      osc.start(); lfo.start();
      nodes.push(osc, dg, lfo, lfoGain);
    }
    ambienceNodes = nodes;
  } catch { /* sem gesto do usuário ainda */ }
}

// ── Trilha por ambiente (arquivos em assets/audio/, opcional) ───────────────
// Se houver faixa no manifesto para o módulo, toca em loop e substitui o drone
// procedural; senão, mantém a ambiência sintetizada. Ver assets/audio/README.md.
let audioManifest = null, musicEl = null;
async function getAudioManifest() {
  if (audioManifest) return audioManifest;
  try { audioManifest = await (await fetch('assets/audio/manifest.audio.json')).json(); }
  catch { audioManifest = { tracks: {} }; }
  return audioManifest;
}
export function musicBed(kind) {
  if (muted || !kind) { stopMusic(); return; }
  getAudioManifest().then((m) => {
    const rel = m?.tracks?.[kind];
    if (!rel) { stopMusic(); return; }              // sem faixa: ambiência procedural
    if (musicEl && musicEl.dataset.kind === kind) return; // já tocando essa
    stopMusic();
    try {
      // no arquivo único offline, o build embute as faixas em base64 (data URL)
      const src = globalThis.__SHERLOCK_AUDIO?.[rel] || ('assets/audio/' + rel);
      const el = new Audio(src);
      el.loop = true; el.dataset.kind = kind;
      el.volume = Math.min(1, (mix().ambience_volume ?? 0.35) * 1.8);
      el.addEventListener('canplaythrough', () => stopAmbience(), { once: true });
      el.addEventListener('error', () => { /* arquivo ausente: mantém procedural */ });
      el.play().catch(() => { /* aguardando gesto do usuário */ });
      musicEl = el;
    } catch { /* ignore */ }
  }).catch(() => {});
}
export function stopMusic() {
  if (musicEl) { try { musicEl.pause(); musicEl.removeAttribute('src'); } catch { /* */ } musicEl = null; }
}

export function stopAmbience() {
  for (const n of ambienceNodes) { try { n.disconnect(); n.stop?.(); } catch { /* já parado */ } }
  ambienceNodes = [];
}

/** Voz pt-BR (narrador, G.R.A.L.H.A., legista) via SpeechSynthesis. */
// Escolhe uma voz pt-BR combinando com o sexo pedido (quando o SO oferece
// mais de uma). Cai para qualquer voz pt e, por fim, a padrão.
const FEMALE_HINTS = /female|mulher|maria|luciana|francisca|joana|ana|helena|fem|zira|google.*(feminin|female)/i;
const MALE_HINTS = /male|homem|felipe|daniel|ricardo|joão|joao|antonio|masc|google.*(male|masculin)/i;
// vozes mais naturais primeiro (quando o SO oferece)
const NATURAL_HINTS = /natural|neural|google|luciana|vitória|vitoria|francisca|helena|premium|enhanced/i;
function pickVoice(gender) {
  const vs = ('speechSynthesis' in window ? speechSynthesis.getVoices() : []) || [];
  const pt = vs.filter((v) => v.lang?.toLowerCase().startsWith('pt'));
  if (!pt.length) return null;
  const byGender = gender === 'f'
    ? pt.filter((v) => FEMALE_HINTS.test(v.name) || !MALE_HINTS.test(v.name))
    : gender === 'm'
      ? pt.filter((v) => MALE_HINTS.test(v.name) || !FEMALE_HINTS.test(v.name))
      : pt;
  const pool = byGender.length ? byGender : pt;
  return pool.find((v) => NATURAL_HINTS.test(v.name)) || pool[0]; // prefere voz natural
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

export function speak(text, { rate = 1.0, pitch = 1.0, gender = null } = {}) {
  if (!ttsEnabled || muted || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  // tom por sexo quando não há voz dedicada; leve suavização geral (menos robótico)
  if (gender === 'f') pitch = Math.min(2, pitch * 1.12);
  else if (gender === 'm') pitch = Math.max(0, pitch * 0.86);
  const voice = pickVoice(gender);
  const vol = mix().voice_volume ?? 0.9;
  // fala frase a frase, com micro-pausas — cadência mais humana e fluida
  const parts = String(text).replace(/\s+/g, ' ').match(/[^.!?…]+[.!?…]*/g) || [text];
  for (const raw of parts) {
    const sentence = raw.trim();
    if (!sentence) continue;
    const u = new SpeechSynthesisUtterance(sentence);
    u.lang = 'pt-BR';
    u.rate = rate * 0.97;   // um tico mais devagar soa mais natural
    u.pitch = pitch;
    u.volume = vol;
    if (voice) u.voice = voice;
    speechSynthesis.speak(u);
  }
}

export function toggleMute() {
  muted = !muted;
  if (muted) { stopAmbience(); stopMusic(); if ('speechSynthesis' in window) speechSynthesis.cancel(); }
  return muted;
}

export function toggleTts() {
  ttsEnabled = !ttsEnabled;
  if (!ttsEnabled && 'speechSynthesis' in window) speechSynthesis.cancel();
  return ttsEnabled;
}

export function isMuted() { return muted; }
