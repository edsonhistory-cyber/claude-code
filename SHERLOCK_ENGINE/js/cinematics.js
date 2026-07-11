/**
 * cinematics.js — Player de cinemáticas CSS (SHERLOCK_ENGINE_CINEMATICS.json):
 * shots viram cartelas com Ken Burns em cenários SVG procedurais. Sempre pulável.
 */
import { getModule } from './database.js';
import { speak, sfx } from './audioManager.js';
import { sceneMedia } from './art.js';

let playing = false;

export function playCinematic(id, onEnd = () => {}) {
  const scene = (getModule('SHERLOCK_ENGINE_CINEMATICS')?.scenes || []).find((s) => s.id === id);
  if (!scene || playing) { onEnd(); return; }
  playing = true;

  const overlay = document.createElement('div');
  overlay.className = 'cinematic-overlay';
  overlay.innerHTML = `
    <div class="cine-stage"></div>
    <div class="cine-caption"></div>
    <div class="cine-bars top"></div><div class="cine-bars bottom"></div>
    <button class="btn btn-ghost cine-skip">PULAR ▸</button>`;
  document.body.append(overlay);
  const stage = overlay.querySelector('.cine-stage');
  const caption = overlay.querySelector('.cine-caption');

  if (scene.audio?.voiceover) speak(scene.audio.voiceover, { rate: 0.95, pitch: 0.8 });
  sfx('door_open');

  const shots = scene.camera || [];
  const perShot = Math.min(4000, ((scene.duration_sec || 20) * 1000) / Math.max(1, shots.length) / 4);
  let i = 0;
  let timer = null;

  function showShot() {
    if (i >= shots.length) return end();
    const shot = shots[i++];
    const place = shot.location || shot.target || '';
    stage.innerHTML = `<div class="cine-art kenburns">${sceneMedia(place)}</div>`;
    caption.textContent = `${scene.title} — ${place}${shot.time ? ' · ' + shot.time : ''}`;
    timer = setTimeout(showShot, perShot);
  }

  function end() {
    clearTimeout(timer);
    overlay.classList.add('cine-out');
    setTimeout(() => { overlay.remove(); playing = false; onEnd(); }, 400);
  }

  overlay.querySelector('.cine-skip').onclick = end;
  showShot();
}
