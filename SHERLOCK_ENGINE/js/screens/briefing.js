/**
 * screens/briefing.js — Ponto de partida do caso: a cena do crime isolada por
 * fita amarela, a sinopse do enredo e o "como proceder" antes da Central.
 * Aparece ao abrir um episódio novo (após a cinemática). Sempre pulável.
 */
import { getPack } from '../caseState.js';
import { crimeScene, portrait } from '../art.js';
import { sfx, ambience, speak, stopSpeaking } from '../audioManager.js';

export function playBriefing(onDone = () => {}) {
  const b = getPack().briefing;
  if (!b) { onDone(); return; }

  const root = document.getElementById('app');
  const overlay = document.createElement('div');
  overlay.className = 'screen briefing-screen';
  overlay.innerHTML = `
    <button class="btn btn-ghost briefing-skip">PULAR ▸</button>
    <div class="briefing-scene">
      ${crimeScene(b.scene)}
      <div class="briefing-tag mono">CENA DO CRIME · ${b.case_code}</div>
    </div>
    <div class="briefing-body panel">
      <div class="briefing-head">
        <span class="mono briefing-code">CASO ${b.case_code}</span>
        <h1>${b.title}</h1>
        <p class="briefing-meta mono">${b.local} · ${b.data}</p>
      </div>
      <div class="briefing-victim">
        ${b.victim_pid ? `<div class="briefing-victim-photo">${portrait(b.victim_pid)}</div>` : ''}
        <div><span class="row-tag danger">VÍTIMA</span><br>${b.victim}</div>
      </div>
      <p class="briefing-synopsis">${b.synopsis}</p>
      <div class="briefing-howto">
        <h2 class="panel-title">COMO CONDUZIR A INVESTIGAÇÃO</h2>
        <ol>${(b.howto || []).map((h) => `<li>${h}</li>`).join('')}</ol>
      </div>
      <button class="btn btn-primary briefing-start">INICIAR INVESTIGAÇÃO ▸</button>
    </div>`;
  root.replaceChildren(overlay);
  ambience(b.scene && /palco|coxia|camarim|teatro/.test(b.scene) ? 'juri' : 'cidade');
  sfx('door_open');
  if (b.synopsis) speak(b.synopsis.replace(/<[^>]+>/g, ''), { rate: 0.98, gender: 'f' });

  const finish = () => {
    stopSpeaking();                 // corta a narração ao pular/iniciar
    sfx('click');
    overlay.classList.add('cine-out');
    setTimeout(onDone, 350);
  };
  overlay.querySelector('.briefing-start').onclick = finish;
  overlay.querySelector('.briefing-skip').onclick = finish;
}
