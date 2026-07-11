/**
 * screens/osint.js — Motor de busca investigativo (SHERLOCK_ENGINE_OSINT.json):
 * fake_datasets + unlock_rules. EN008: relacionar SB Fretamentos ao suspeito.
 */
import { getModule } from '../database.js';
import { screenShell, el, toast, modal } from '../uiManager.js';
import { getCase, unlockDocument, addScore, solveEnigma, failEnigma, enigmaUnlocked, ENIGMA_GATES } from '../caseState.js';
import { sfx, ambience } from '../audioManager.js';

// Resultados por consulta (fake_datasets + unlock_rules do design)
const RESULTS = [
  {
    match: /sb\s*fretamentos/i,
    title: 'Registro empresarial — SB Fretamentos ME',
    source: 'Empresas (SRC002)',
    body: 'CNPJ ativo desde 2018. Objeto: fretamento e turismo. Sócio-administrador com iniciais S.B.; endereço fiscal na região do KM18. Histórico: contrato rescindido com a Bandeira Urbanismo em 2019.',
    unlock: 'DOC006',
    unlockLabel: 'Registro Funcional de Sérgio Bento (DOC006)',
    en008: true,
  },
  {
    match: /linha\s*turismo\s*2019|2019/i,
    title: 'Notícia (2019) — "Mudança na Linha Turismo gera questionamentos"',
    source: 'Notícias (SRC001)',
    body: 'A alteração de rota aprovada em 2019 valorizou terrenos ao longo do novo trajeto. A reportagem cita lobby da Bandeira Urbanismo e a demissão de um funcionário do setor de rotas que se opôs à mudança.',
    unlock: 'DOC007',
    unlockLabel: 'Recorte de Jornal 2019 (DOC007)',
  },
  {
    match: /ot[áa]vio|bandeira\s*urbanismo/i,
    title: 'Histórico empresarial — Otávio Bandeira',
    source: 'Empresas (SRC002) · Imóveis (SRC003)',
    body: 'Fundador da Bandeira Urbanismo. Especulação imobiliária ligada à rota da Linha Turismo (2019). Planilha financeira anexada usa codinomes internos: MUSEU, JARDINEIRO e RODAS.',
    unlock: 'DOC008',
    unlockLabel: 'Planilha de Codinomes (DOC008)',
  },
  {
    match: /renata|salgado|dela[çc][ãa]o/i,
    title: 'Perfil profissional — Renata Salgado',
    source: 'Imprensa (SRC001) · Telefonia (SRC005)',
    body: 'Jornalista investigativa. Metadados telefônicos mostram ligações diárias para Otávio na última semana. Uma escuta judicial (anexa) registra: "a delação seria assinada amanhã".',
    unlock: 'DOC009',
    unlockLabel: 'Escuta Telefônica (DOC009)',
  },
  {
    match: /klaus|vogel/i,
    title: 'Cadastro profissional — "Klaus Vogel"',
    source: 'Redes Sociais (SRC004)',
    body: 'Nome sem registros anteriores a 2024 — alias. CRECI de detetive particular ativo em outro nome. Contratante recente: espólio de um ex-sócio da Bandeira Urbanismo.',
  },
  {
    match: /aldo|meireles/i,
    title: 'Processo judicial — Meireles × Bandeira',
    source: 'Registros (SRC002)',
    body: 'Ação de dissolução de sociedade (2021), julgada improcedente. Aldo declarou publicamente que Otávio "roubou a empresa". Sem antecedentes violentos.',
  },
];

export function render() {
  const { body } = screenShell('OSINT', 'CENTRAL › OSINT — FONTES ABERTAS');
  ambience('central');
  const s = getCase();
  const box = el('div', 'panel osint-panel');
  box.innerHTML = `<h2 class="panel-title">MOTOR DE BUSCA INVESTIGATIVO</h2>
    <div class="osint-bar"><input class="input mono" id="osint-q" placeholder='Ex.: "SB Fretamentos", "Linha Turismo 2019", "Otávio Bandeira"…'>
    <button class="btn btn-primary" id="osint-go">PESQUISAR</button></div>
    <div class="muted">Fontes: Notícias · Empresas · Imóveis · Redes Sociais · Telefonia</div>
    <div id="osint-results"></div>
    <div class="osint-history mono">${s.searches.slice(-6).map((q) => `<span>${q}</span>`).join(' · ')}</div>`;
  body.append(box);
  const input = box.querySelector('#osint-q');
  const go = () => search(input.value, box.querySelector('#osint-results'));
  box.querySelector('#osint-go').onclick = go;
  input.addEventListener('keydown', (e) => e.key === 'Enter' && go());
  input.focus();
}

function search(q, out) {
  const s = getCase();
  q = q.trim();
  if (!q) return;
  sfx('typing');
  if (!s.searches.includes(q)) s.searches.push(q);
  out.replaceChildren();
  const hits = RESULTS.filter((r) => r.match.test(q));
  if (!hits.length) {
    out.append(el('div', 'card', `Nenhum resultado relevante para <b>"${q}"</b>. Refine com nomes próprios ou empresas do caso.`));
    return;
  }
  for (const hit of hits) {
    const card = el('div', 'card osint-result');
    card.innerHTML = `<b>${hit.title}</b><span class="muted">${hit.source}</span><p>${hit.body}</p>`;
    if (hit.unlock && !s.documents.includes(hit.unlock)) {
      const b = el('button', 'btn btn-primary', `ARQUIVAR: ${hit.unlockLabel}`);
      b.onclick = () => { unlockDocument(hit.unlock); addScore(10, `OSINT: ${hit.unlock}`); toast(`📄 ${hit.unlockLabel} arquivado em Evidências.`, 'success'); b.disabled = true; };
      card.append(b);
    } else if (hit.unlock) {
      card.append(el('span', 'row-tag ok', '✔ documento arquivado'));
    }
    if (hit.en008 && !s.enigmasSolved.includes('EN008')) {
      const b = el('button', 'btn', 'RELACIONAR COM UM SUSPEITO (EN008)');
      b.onclick = () => enigmaRelate();
      card.append(b);
    } else if (hit.en008) {
      card.append(el('span', 'row-tag ok', '✔ EN008: relação confirmada'));
    }
    out.append(card);
  }
}

// EN008 — relacionar SB Fretamentos (gate: token CAFE)
function enigmaRelate() {
  if (!enigmaUnlocked('EN008')) return toast('🔒 ' + ENIGMA_GATES.EN008.hintLocked, 'warn');
  const options = ['Klaus Vogel', 'Sérgio Bento', 'Aldo Meireles', 'Renata Salgado'];
  const content = el('div');
  content.innerHTML = `<p>"SB Fretamentos" — iniciais S.B., sede próxima ao KM18, rescisão com a Bandeira Urbanismo em 2019. <b>A quem pertence?</b></p>
    <div class="option-list">${options.map((o) => `<button class="btn option">${o}</button>`).join('')}</div>`;
  const { close } = modal('EN008 — Relacionar SB Fretamentos', content, []);
  content.querySelectorAll('.option').forEach((b) => {
    b.onclick = () => {
      if (b.textContent === 'Sérgio Bento') { solveEnigma('EN008'); toast('🔓 EN008 resolvido! SB = Sérgio Bento: motivo financeiro ligado à rota.', 'success'); sfx('unlock'); close(); }
      else { failEnigma('EN008'); sfx('error'); toast('As iniciais e o endereço não batem. (-20)', 'warn'); }
    };
  });
}
