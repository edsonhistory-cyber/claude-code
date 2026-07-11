/**
 * enigmas.js — executor genérico de minigames de enigma, dirigido pelo
 * CONTENT_PACK do caso (tipos: sequence, input, choice, frames, compare).
 * As telas apenas chamam enigmaButton()/runEnigma() com o id do enigma.
 */
import { el, toast, modal } from './uiManager.js';
import { getCase, getPack, enigmaUnlocked, solveEnigma, failEnigma, gateHint } from './caseState.js';
import { sfx } from './audioManager.js';

const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();

export function enigmaCfg(id) {
  return (getPack().enigmas || {})[id] || null;
}

/** Botão padrão de enigma (rótulo/estado vindos do pack). */
export function enigmaButton(id, { onSolved = () => {}, primary = true } = {}) {
  const cfg = enigmaCfg(id);
  if (!cfg) return null;
  const done = getCase().enigmasSolved.includes(id);
  const b = el('button', `btn ${primary ? 'btn-primary' : ''}`, done ? (cfg.btnDone || `✔ ${id}`) : (cfg.btn || id));
  b.onclick = () => runEnigma(id, onSolved);
  return b;
}

export function runEnigma(id, onSolved = () => {}) {
  const cfg = enigmaCfg(id);
  const s = getCase();
  if (!cfg) return;
  if (s.enigmasSolved.includes(id)) return toast(cfg.doneMsg || `${id} já resolvido.`, 'success');
  if (!enigmaUnlocked(id)) return toast('🔒 ' + gateHint(id), 'warn');

  const ok = (close) => {
    solveEnigma(id);
    toast(cfg.okMsg || `🔓 ${id} resolvido!`, 'success');
    sfx('unlock');
    close?.();
    onSolved();
  };
  const wrong = () => {
    failEnigma(id);
    sfx('error');
    toast(cfg.wrongMsg || 'Não confere. (-20)', 'warn');
  };

  TYPES[cfg.type]?.(cfg, id, ok, wrong);
}

const TYPES = {
  // reordenar fragmentos até formar a resposta
  sequence(cfg, id, ok, wrong) {
    sfx('scanner');
    const answer = norm(cfg.answer);
    const frag = answer.split('');
    const scrambled = [...frag].sort(() => 0.5 - Math.random());
    const content = el('div');
    content.innerHTML = `<p>${cfg.prompt}</p>
      <div class="qr-frags">${scrambled.map((c) => `<button class="btn qr-frag">${c}</button>`).join('')}</div>
      <div class="qr-out mono" id="qr-out">${frag.map(() => '_').join(' ')}</div>`;
    let acc = '';
    const { close } = modal(cfg.title, content, []);
    content.querySelectorAll('.qr-frag').forEach((b) => {
      b.onclick = () => {
        sfx('typing');
        acc += b.textContent.trim();
        b.disabled = true;
        content.querySelector('#qr-out').textContent = acc.split('').join(' ');
        if (acc.length === answer.length) {
          if (acc === answer) ok(close);
          else {
            wrong();
            acc = '';
            content.querySelectorAll('.qr-frag').forEach((x) => (x.disabled = false));
            content.querySelector('#qr-out').textContent = frag.map(() => '_').join(' ');
          }
        }
      };
    });
  },

  // resposta digitada
  input(cfg, id, ok, wrong) {
    const content = el('div');
    content.innerHTML = `<p>${cfg.prompt}</p>
      <input class="input mono" id="enigma-in" maxlength="24" placeholder="RESPOSTA" autocomplete="off">`;
    const { close } = modal(cfg.title, content, [
      { label: cfg.submit || 'RESPONDER', primary: true, close: false, onClick: () => {
        if (norm(content.querySelector('#enigma-in').value) === norm(cfg.answer)) ok(close);
        else wrong();
        return false;
      } },
    ]);
    content.querySelector('#enigma-in').focus();
  },

  // múltipla escolha
  choice(cfg, id, ok, wrong) {
    const content = el('div');
    content.innerHTML = `<p>${cfg.prompt}</p>
      <div class="option-list">${cfg.options.map((o, i) => `<button class="btn option" data-i="${i}">${o}</button>`).join('')}</div>`;
    const { close } = modal(cfg.title, content, []);
    content.querySelectorAll('.option').forEach((b) => {
      b.onclick = () => (Number(b.dataset.i) === cfg.correct ? ok(close) : wrong());
    });
  },

  // encontrar o quadro certo numa tira de vídeo/foto
  frames(cfg, id, ok, wrong) {
    const mark = `<rect x="52" y="18" width="10" height="26" rx="3" fill="${cfg.markColor || '#2F8B57'}" opacity=".95"/><circle cx="57" cy="14" r="5" fill="#1c2f42"/>`;
    const frames = (cfg.times || []).map((t, i) => `
      <button class="video-frame" data-i="${i}">
        <svg viewBox="0 0 90 56"><rect width="90" height="56" fill="#0b1e30"/>
        <rect x="8" y="30" width="74" height="18" rx="3" fill="#123a5c"/>
        <circle cx="${14 + i * 3}" cy="22" r="6" fill="#44586a"/>${i === cfg.correct ? mark : ''}
        <text x="45" y="52" font-size="7" fill="#7fe3ff" text-anchor="middle" font-family="monospace">${t}</text></svg>
      </button>`).join('');
    const content = el('div');
    content.innerHTML = `<p>${cfg.prompt}</p><div class="video-strip">${frames}</div>`;
    const { close } = modal(cfg.title, content, []);
    content.querySelectorAll('.video-frame').forEach((b) => {
      b.onclick = () => (Number(b.dataset.i) === cfg.correct ? (sfx('camera_shutter'), ok(close)) : wrong());
    });
  },

  // comparação de padrões (microscopia): referência + amostras
  compare(cfg, id, ok, wrong) {
    const ref = patternSvg(cfg.reference);
    const content = el('div');
    const order = cfg.options.map((_, i) => i).sort(() => 0.5 - Math.random());
    content.innerHTML = `<p>${cfg.prompt}</p>
      <div class="fiber-bench"><div class="fiber-ref"><span class="mono">REFERÊNCIA</span>${ref}</div>
      <div class="fiber-options">${order.map((i, pos) => `<button class="fiber-opt" data-i="${i}"><span class="mono">AMOSTRA ${'ABCDE'[pos]}</span>${patternSvg(cfg.options[i])}</button>`).join('')}</div></div>`;
    const { close } = modal(cfg.title, content, []);
    content.querySelectorAll('.fiber-opt').forEach((b) => {
      b.onclick = () => (Number(b.dataset.i) === cfg.correct ? ok(close) : wrong());
    });
  },
};

export function patternSvg({ waves = 3, color = '#3b6ea5' } = {}) {
  const path = Array.from({ length: 6 }, (_, r) =>
    `<path d="M5 ${12 + r * 12} ${Array.from({ length: waves * 2 }, (_, i) => `Q ${5 + (i + 0.5) * (110 / (waves * 2))} ${12 + r * 12 + (i % 2 ? 7 : -7)} ${5 + (i + 1) * (110 / (waves * 2))} ${12 + r * 12}`).join(' ')}" stroke="${color}" fill="none" stroke-width="2.2"/>`).join('');
  return `<svg viewBox="0 0 120 84" class="fiber"><rect width="120" height="84" rx="6" fill="#0b1e30"/>${path}<circle cx="60" cy="42" r="39" fill="none" stroke="#7fe3ff" stroke-width="1" opacity=".35"/></svg>`;
}
