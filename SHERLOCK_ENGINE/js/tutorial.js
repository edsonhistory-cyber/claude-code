/**
 * tutorial.js — onboarding de primeira vez na Central: destaca (spotlight) cada
 * módulo e explica o fluxo da investigação. Aparece uma vez; refazível pelo ❔.
 */
import { sfx } from './audioManager.js';

const SEEN_KEY = 'sherlock_tutorial_v1';

const card = (name) => [...document.querySelectorAll('.central-card')]
  .find((c) => (c.querySelector('.card-title')?.textContent || '').includes(name));

const STEPS = [
  { el: () => null, title: 'Bem-vindo, detetive!', text: 'Em 6 passos rápidos eu mostro como conduzir a investigação. Você pode pular quando quiser.' },
  { el: () => card('Mapa'), title: '1 · Mapa', text: 'Comece pelo MAPA: visite os locais de Curitiba e colete as evidências da cena.' },
  { el: () => card('Laboratório'), title: '2 · Laboratório', text: 'Leve as amostras ao LABORATÓRIO e leia os laudos da perícia (toxicologia, fibras, digitais…).' },
  { el: () => card('Interrogatórios'), title: '3 · Interrogatórios', text: 'Ouça o elenco e APRESENTE PROVAS para quebrar álibis e achar contradições.' },
  { el: () => card('Mural'), title: '4 · Mural', text: 'Conecte pistas e suspeitos com o fio vermelho 🧶 e reconstrua a Linha do Tempo.' },
  { el: () => card('Sala do Júri'), title: '5 · Sala do Júri', text: 'Com os 4 códigos do cofre, faça a ACUSAÇÃO final. Pense bem antes de decidir!' },
  { el: () => document.querySelector('.screen-nav'), title: 'Travou?', text: 'A G.R.A.L.H.A. (◈) dá dicas e o 📋 Caso reabre a história. Boa investigação, detetive!' },
];

export function startTutorial() {
  if (document.querySelector('.tut-overlay')) return;
  let i = 0;
  const ov = document.createElement('div');
  ov.className = 'tut-overlay';
  ov.innerHTML = `
    <div class="tut-spot" aria-hidden="true"></div>
    <div class="tut-card" role="dialog" aria-live="polite">
      <div class="tut-title"></div>
      <div class="tut-text"></div>
      <div class="tut-actions">
        <span class="tut-count mono"></span>
        <button class="btn btn-ghost tut-skip">Pular</button>
        <button class="btn btn-primary tut-next">Próximo ▸</button>
      </div>
    </div>`;
  document.body.append(ov);
  const spot = ov.querySelector('.tut-spot');
  const box = ov.querySelector('.tut-card');

  const finish = () => {
    try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* */ }
    ov.remove();
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', show);
  };
  const show = () => {
    const step = STEPS[i];
    ov.querySelector('.tut-title').textContent = step.title;
    ov.querySelector('.tut-text').textContent = step.text;
    ov.querySelector('.tut-count').textContent = `${i + 1}/${STEPS.length}`;
    ov.querySelector('.tut-next').textContent = i === STEPS.length - 1 ? 'Concluir ✓' : 'Próximo ▸';
    const t = step.el?.();
    if (t) {
      t.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
      const r = t.getBoundingClientRect();
      const pad = 8;
      ov.classList.remove('tut-overlay--dim');
      spot.style.display = 'block';
      spot.style.left = `${r.left - pad}px`; spot.style.top = `${r.top - pad}px`;
      spot.style.width = `${r.width + pad * 2}px`; spot.style.height = `${r.height + pad * 2}px`;
      const cw = Math.min(300, innerWidth - 24), ch = box.offsetHeight || 180;
      const cx = Math.min(Math.max(12, r.left + r.width / 2 - cw / 2), innerWidth - cw - 12);
      const cy = (r.bottom + 14 + ch < innerHeight) ? r.bottom + 14 : Math.max(12, r.top - ch - 14);
      box.style.left = `${cx}px`; box.style.top = `${cy}px`; box.style.transform = 'none';
    } else {
      spot.style.display = 'none';
      ov.classList.add('tut-overlay--dim');
      box.style.left = '50%'; box.style.top = '50%'; box.style.transform = 'translate(-50%, -50%)';
    }
  };
  const next = () => { i++; if (i >= STEPS.length) return finish(); sfx('click'); show(); };
  const onKey = (e) => {
    if (e.key === 'Escape') finish();
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); }
  };
  ov.querySelector('.tut-next').onclick = next;
  ov.querySelector('.tut-skip').onclick = finish;
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', show);
  sfx('paper_flip');
  show();
}

/** Dispara o tutorial na primeira vez que o jogador vê a Central. */
export function maybeTutorial() {
  let seen = false;
  try { seen = !!localStorage.getItem(SEEN_KEY); } catch { /* */ }
  if (seen) return;
  setTimeout(() => { if (document.querySelector('.central-grid')) startTutorial(); }, 550);
}
