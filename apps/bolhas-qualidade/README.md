# Bolhas da Qualidade — Linha TL

Leitor dos indicadores de qualidade exportados do BI. Ele lê a planilha
(`.xlsx` ou `.csv`), junta as ocorrências **por classe e por semelhança de texto**
e mostra cada problema como uma bolha, no estilo do *Crypto Bubbles*: a **cor** vem
do peso (gravidade) e o **tamanho** vem da métrica escolhida.

Um caso de vazamento no tubo do freio (peso 50) aparece maior e vermelho;
dez casos de vazamento na tubulação de enchimento (peso 20) aparecem em amarelo,
mesmo tendo mais ocorrências — que era exatamente o comportamento pedido.

## Como abrir

Um único arquivo, sem instalação e sem servidor: **`index.html`**.

1. Baixe o arquivo (ou copie para uma pasta do OneDrive/Desktop).
2. Dê dois cliques — ele abre no Edge/Chrome.
3. Arraste a planilha do BI para dentro da página (ou clique em *Abrir planilha do BI*).

A planilha **não sai do computador**: a leitura, o agrupamento e o cálculo acontecem
dentro do navegador. Não há upload, servidor ou banco de dados.

> Observação sobre o SharePoint: arquivos `.html` guardados na biblioteca costumam
> ser bloqueados para execução pelo próprio SharePoint. Para compartilhar com a
> equipe, mande o arquivo pelo Teams/e-mail (cada um salva e abre localmente) ou use
> a versão publicada em link.

## Como o app lê a planilha

- **Cabeçalho**: procura a primeira linha que pareça um cabeçalho (até a linha 15),
  então relatórios do BI com título/logo em cima funcionam.
- **Colunas**: descobre sozinho as colunas de descrição, quantidade, peso e classe
  pelos nomes (`Descrição`, `Problema`, `Defeito`, `Qtd`, `Casos`, `Peso`, `Pontos`,
  `Classe`, `Sistema`…). Se errar, é só corrigir em **Ajustes → Colunas da planilha**.
- **Sem coluna de quantidade**: cada linha vale 1 caso.
- **Sem coluna de peso**: usa o peso padrão da classe (editável em Ajustes).
- **`.xlsx`**: lido de forma nativa pelo próprio navegador (descompactação do arquivo
  + leitura do XML). Não usa nenhuma biblioteca externa, por isso funciona offline.
  Em navegador muito antigo, salve a planilha como CSV.
- **Acentos**: aceita tanto UTF-8 quanto o CSV "ANSI" que o Excel em português gera.

## Como o agrupamento funciona

1. O texto é normalizado (minúsculas, sem acento, sem pontuação).
2. Palavras sem valor (`de`, `do`, `na`, `peça`, `turno`…) são descartadas e as
   variações viram uma forma única (`vaza`, `vazando`, `fuga`, `gotejando` →
   *vazamento*; `frouxo`, `soltando` → *solto*; `faltando`, `ausente` → *falta*).
3. Duas descrições são comparadas por palavras em comum (Jaccard, peso 60%) e por
   trechos de letras em comum (trigramas, peso 40%).
4. Acima do limiar da barra **Semelhança** (padrão 40%), elas viram o mesmo problema.
   Aumente para separar mais; diminua para juntar mais.

O grupo mostra o texto mais frequente e guarda todas as variações — clique na bolha
para ver quantas vezes cada redação apareceu.

## Classes e pesos

A classe sai da contagem de palavras-chave do texto (vence a classe com mais sinais,
não a primeira que casar). Pesos padrão:

| Classe | Peso |
|---|---|
| Vazamento | 50 |
| Falta de componente | 45 |
| Elétrico | 40 |
| Torque / Fixação | 35 |
| Montagem incorreta | 30 |
| Ruído / Funcional | 30 |
| Dano / Aparência | 20 |
| Identificação | 15 |
| Limpeza / Contaminação | 10 |
| Outros | 20 |

Regras de peso, na ordem:

1. Peso digitado na bolha (clique na bolha → campo *Peso deste problema*).
2. Coluna de peso da planilha, se existir.
3. **Piso de 50 pontos** para item de segurança (freio, direção, chassi,
   combustível…), mesmo com 1 caso.
4. Peso da classe.

Faixas de cor: **crítico ≥ 40** (vermelho, com anel tracejado), **alto 25–39**,
**médio 10–24**, **baixo < 10**.

## Métricas de tamanho

| Botão | O que dimensiona a bolha |
|---|---|
| **Peso** (padrão) | gravidade do problema — 1 caso grave aparece maior que 10 casos leves |
| **Casos** | quantidade de ocorrências |
| **Impacto** | casos × peso (o ofensor real do mês) |
| **% dos casos** | participação de cada problema no total |

## Outros recursos

- Filtro por classe e por palavra.
- **Tabela** com casos, %, peso, impacto e participação — botão *Copiar para o Excel*
  cola direto numa planilha.
- **Painel claro** para projetor/impressão; o escuro é melhor para o monitor da linha.
- Roda do mouse dá zoom, arrastar move, dois cliques voltam ao enquadramento.
- Pesos ajustados e limiar ficam salvos no próprio navegador.

## Arquivo de exemplo

`exemplo/indicadores-exemplo.csv` — mesmo conjunto do botão *Ver com dados de exemplo*,
já com colunas de peso e classe, para testar o mapeamento de colunas.
