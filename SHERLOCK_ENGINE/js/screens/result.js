/**
 * screens/result.js — Resultado (pontuação, patente, estatísticas) e Créditos.
 */
import { getModule } from '../database.js';
import { screenShell, el } from '../uiManager.js';
import { getCase, rankForScore } from '../caseState.js';
import { episodes } from '../campaign.js';
import { emit } from '../eventManager.js';
import { ambience, speak, sfx } from '../audioManager.js';

export function render() {
  const { body } = screenShell('Resultado', 'CASO CWB-1447 · ENCERRADO');
  ambience('central');
  const s = getCase();
  const rank = rankForScore(s.score);
  speak(`Caso encerrado. Pontuação final: ${s.score}. Patente: ${rank}.`, { rate: 1.0 });

  const achievements = [
    { id: 'ACH001', name: 'Primeira Evidência', ok: s.collected.length > 0 },
    { id: 'ACH002', name: 'Perito', ok: s.analyzed.length >= 3 },
    { id: 'ACH003', name: 'Mestre dos Enigmas', ok: s.enigmasSolved.length >= 9 },
    { id: 'ACH004', name: 'Detetive de Elite', ok: rank === 'Detetive de Elite' },
  ];

  // clima noir na tela de encerramento: grão + vinheta
  const grain = el('div', 'result-grain');
  grain.setAttribute('aria-hidden', 'true');
  body.append(grain);

  const box = el('div', 'panel result-panel');
  box.innerHTML = `
    <div class="result-carimbo cwb-selo cwb-selo--cavalo" aria-hidden="true"><span>CASO<br>ENCERRADO</span></div>
    <div class="result-rank">${rank.toUpperCase()}</div>
    <div class="result-score mono">★ ${s.score} PONTOS</div>
    <div class="result-stats">
      <div><b>${s.collected.length}</b><span>evidências</span></div>
      <div><b>${s.enigmasSolved.length}/10</b><span>enigmas</span></div>
      <div><b>${s.documentsRead.length}</b><span>documentos lidos</span></div>
      <div><b>${s.contradictions.length}</b><span>contradições</span></div>
      <div><b>${s.hintsUsed}</b><span>dicas usadas</span></div>
      <div><b>${s.verdictAttempts}</b><span>vereditos</span></div>
    </div>
    <div class="result-ach">${achievements.map((a) => `<span class="row-tag ${a.ok ? 'ok' : ''}">${a.ok ? '🏅' : '·'} ${a.name}</span>`).join('')}</div>`;
  const btn = el('button', 'btn btn-primary', 'CRÉDITOS');
  btn.onclick = () => { sfx('click'); emit('UI_GOTO', { state: 'CREDITOS' }); };
  box.append(btn);
  body.append(box);
}

export function renderCredits() {
  const { body } = screenShell('Créditos', 'SHERLOCK ENGINE');
  const next = episodes().find((e) => e.status !== 'done');
  const campaignDone = !next;
  const box = el('div', 'panel result-panel credits');
  box.innerHTML = `
    <div class="turin-onca credits-crest" aria-hidden="true"></div>
    <div class="login-logo">SHERLOCK<span>ENGINE</span></div>
    <p class="mono">CASO 001 · "A ÚLTIMA PARADA" · CURITIBA-PR</p>
    <p>Um jogo de investigação cooperativo, offline, em português.</p>
    <p class="turin-homage">Brasão da divisão: a <b>onça</b> — releitura da obra de
    <b>João Turin</b> (1878–1949), escultor animalista e um dos líderes do
    <b>Paranismo</b>. Identidade visual inspirada na araucária, no pinhão, na
    gralha-azul e no petit-pavé da Rua XV.</p>
    <p class="muted">Design: JSONs da Sherlock Engine · Motor: HTML + CSS + Vanilla JS<br>
    Arte procedural SVG · SFX sintetizados via Web Audio · Vozes via SpeechSynthesis<br>
    Licenças de assets: assets/CREDITS.md</p>
    ${campaignDone
      ? '<p class="row-tag ok">🏆 CAMPANHA COMPLETA — A REDE CAIU. OBRIGADO POR JOGAR, DETETIVE.</p>'
      : `<p class="row-tag ok">PRÓXIMO EPISÓDIO: ${next.title}</p>`}`;
  const hub = el('button', 'btn btn-primary', 'VOLTAR AO QG DA CAMPANHA');
  hub.onclick = () => emit('UI_GOTO', { state: 'CAMPANHA' });
  box.append(hub);
  body.append(box);
}
