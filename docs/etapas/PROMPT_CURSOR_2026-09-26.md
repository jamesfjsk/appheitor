# Prompt para o Cursor — 26/09/2026 (14b: a Mina lê antes de responder)

Você é o Cursor do Miner Missions. Antes de qualquer linha, leia:
- `.cursor/rules/lei-excelencia-aaa.mdc`;
- em `docs/etapas/REVISAO_ETAPA_2_LANCAMENTO.md`, a seção "26/09 — ontem e hoje".

**Método:**
- Barra: `npx tsc --noEmit -p tsconfig.app.json` com 0 erros; `npx eslint src --max-warnings 8` com 0 erros; `npm run test:english` e `npm run test:village` verdes.
- Evidência só na conta de teste (`teste@flash.com`). Nunca abra o app com a conta do Heitor no localhost.
- Relatório no fim de `docs/etapas/RELATORIO_ETAPA_3.md`.
- **Pare antes do commit: o líder revisa primeiro.**
- Sem restilizar: só as classes `mc-*` que já existem. Não toque em `cart.ts`, `CartBench.tsx`, `src/game/**`.

**Ordem:** este pacote vem depois dos Pacotes 11 e 12 de `PROMPT_CURSOR_2026-09-23.md`.

## Pacote 14b — a Mina lê antes de responder

Sentimento alvo: a Carta se ouve e se lê antes das perguntas, e a resposta sai do texto, não do chute.

**Por quê.** Os dados do Heitor de 25 e 26/09:
- **Cartas** de 52 a 63 palavras respondidas em 6, 10 e 7 segundos, com 0/3, 2/3 e 2/3. Ele nunca abriu o glossário e `evidenceHits` deu 0. As perguntas abrem junto com o texto, e ele clica antes de ler.
- **Ferraria:** 6 itens de am/is/are em 40 segundos, com 2/6. Ele errou até "Escreva 'are' para completar", que dá a resposta.
- **Ferraria de 25/09:** 0/6 em frases embaralhadas de 7 e 8 palavras. `yesterdayMistakes` ainda procura a Ferraria de "ontem" em relação à data do plano. É o mesmo desencontro que o 14a-2 corrigiu no placar, e ele pode trazer essas frases longas para um dia que desceu de degrau.
- **Recado:** sem esse problema (128 e 148 s). Fica fora.

### 1. Carta: ouvir primeiro (`src/components/hero/english/base/LetterContract.tsx`)

- Ao abrir, a carta toca sozinha, frase por frase, com a frase marcada. É o `readAll`, que já existe.
- Enquanto toca, o lado das perguntas mostra só a linha "Ouça a carta. As perguntas abrem quando ela terminar." As perguntas abrem quando a leitura termina.
- **Se ele apertar "Parar" ou o áudio falhar**, as perguntas abrem quando passar o tempo mínimo, contado desde a abertura. Função pura `letterGateMs(words) = clamp(words × 600 ms, 12 s, 45 s)`.
- "Ouvir o texto" continua para ouvir de novo. O portão vale também no refazer.
- Grava `details.listenedMs` (tempo até abrir as perguntas) e `details.gate` (`'audio' | 'timer'`).

### 2. Carta: a frase antes da resposta, nas perguntas de compreensão

- Pergunta `comprehension`: antes das opções, a linha "Onde está a resposta? Clique na frase." As opções abrem quando ele clica numa frase que contém a evidência (`hasEvidence`, que já existe).
  - Primeira frase errada: a frase fica riscada e aparece "Não é essa. Leia de novo."
  - Segunda errada: a frase certa fica amarela e as opções abrem.
- Grava `details.evidenceFirst` por pergunta: `'found' | 'shown'`.
- Pergunta `decision`: fica como hoje (responde e depois mostra a frase).
- `letterMaterial` conta as evidências como hoje (`evidenceHits` passa a somar as `'found'`). Sem mudança de gold nem de material por tempo.
- Teste puro do estado da pergunta (`letterQuestionStep`, reducer ou função): frase certa abre; uma errada não abre; duas erradas abrem com a certa marcada.

### 3. Ferraria: a frase antes do clique (`ForgeContract.tsx`)

- Cada item mostra a frase primeiro. As opções, ou o campo do `typed`, abrem depois de `readingMs(frase, 1500, 3000)` (`provaRules.ts`, que já existe).
- Grava `details.msPerItem`, o tempo de cada item até a primeira resposta.
- Sem mudança na regra de erro, na dica, no refazer ou no pagamento.

### 4. Os erros de ontem pela última Ferraria concluída, e só no tipo do dia (`src/services/englishAi.ts`)

- `yesterdayMistakes(plans, date)` passa a usar a Ferraria **concluída** mais recente antes de `date`, a mesma regra de `lastForgeScore`.
- Só entram itens cujo `kind` está no mix do dia (`forgeItemMixFor` do nível e do alvo). Um dia de lacuna e digitação não recebe frase embaralhada.
- Testes:
  - planos `[25/09 com Ferraria de 6 embaralhadas, 0/6, concluída; 26/09 aberta]`, data 27/09, alvo am/is/are: nenhum item;
  - `[25/09 com 2 lacunas erradas, concluída]` e alvo com lacuna: os 2 itens;
  - nenhuma Ferraria concluída: nenhum item.

### Aceite

- Barra verde, com os testes dos itens 1, 2 e 4 (`letterGateMs` com 10, 60 e 100 palavras: 12 s, 36 s e 45 s).
- Fotos em 1280×720 e 1920×1080, na conta de teste:
  - a Carta com as perguntas fechadas durante a leitura;
  - a pergunta de compreensão pedindo a frase;
  - a frase errada riscada com "Não é essa. Leia de novo.";
  - a Ferraria com o item fechado no começo.
- Uma Carta real feita do começo ao fim na conta de teste, com `listenedMs`, `evidenceFirst` e o tempo total colados no relatório.

**Fora:**
- O revisor de conteúdo da Mina: os textos de 25 e 26/09 estão bons.
- O Recado.
- Qualquer mudança de gold, material ou nível.
