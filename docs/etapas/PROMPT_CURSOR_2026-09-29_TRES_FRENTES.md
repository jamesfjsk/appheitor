# Três frentes em paralelo (29/09/2026)

Três agentes do Cursor, cada um numa pasta própria (git worktree) e num branch próprio. As pastas são criadas pelo `scripts/dev/tres-frentes.ps1`. No fim, o líder revisa cada branch e junta os três no `main`.

| Frente | Pasta | Branch | Porta | Pacote |
|---|---|---|---|---|
| P12 | `..\appheitor-p12` | `p12` | 5181 | Pacote 12 (`PROMPT_CURSOR_2026-09-23.md`), itens 1 a 5, e as correções do Pacote 11 |
| P16 | `..\appheitor-p16` | `p16` | 5182 | Pacote 16 (`PROMPT_CURSOR_2026-09-28.md`) |
| P15a | `..\appheitor-p15a` | `p15a` | 5183 | Pacote 15a (`PROMPT_CURSOR_2026-09-27.md`) |

## Regras das três frentes

1. **Onde trabalhar.** Trabalhe só na pasta da sua frente. Nunca mexa no `main`, na pasta `appheitor` original nem nas pastas das outras frentes. Nada de `git push`.
2. **Só os seus arquivos.** Edite só os da lista da sua frente. Se precisar de outro, pare, escreva no seu relatório o arquivo e o motivo, e siga no que der. O líder resolve na junção.
3. **Arquivos que nenhuma frente edita:**
   - `firestore.rules` e `storage.rules`: as regras novas já estão no `main`, e o líder publica;
   - `docs/MINER_MISSIONS_ROADMAP.md`, `docs/etapas/ETAPA_2_LANCAMENTO.md`, `docs/etapas/RELATORIO_ETAPA_3.md` e `docs/etapas/REVISAO_ETAPA_2_LANCAMENTO.md`;
   - `package.json`, `package-lock.json` e `vite.config.ts`. Não instale pacote.
4. **Relatório** só em `docs/etapas/relatorios/<frente>.md` (`P12.md`, `P16.md`, `P15a.md`), com:
   - a barra da lei;
   - a conferência de conexões ("recebe de / entrega para");
   - o que "entrou sem doc";
   - as escritas recusadas por regra, se houver.
5. **Servidor** só na sua porta: `npx vite --port 518X --strictPort`. As fotos também contra essa porta.
6. **Conta** só a de teste (`teste@flash.com`). Nunca a do Heitor, e nunca gere prova ou plano da Mina para ele.
7. **Deploy é do líder:** regras e Cloud Functions. O código da função é da P15a.
8. **Barra no fim, na sua pasta:**
   - `npx tsc --noEmit -p tsconfig.app.json`, 0 erros;
   - `npx eslint src --max-warnings 8`, 0 erros;
   - `npm run test:english` e `npm run test:village`;
   - `npx vite build`.
9. **Fim:** `git add -A` e `git commit -m "<frente>: <resumo curto>"` no seu branch. Pare. Não junte nada no `main`.

## Frente P12 — ruído, dev e código velho não geram prova; correções do Pacote 11

**O pacote:** o 12 de `docs/etapas/PROMPT_CURSOR_2026-09-23.md`, itens (1) a (5). Os itens (4) e (5) são acréscimos do líder: em dev, só a conta de teste gera; e não se gera prova nem plano com versão desatualizada. O caso real está em `REVISAO_ETAPA_2_LANCAMENTO.md`, seção "27/09": as provas de 27 e 28/09 do Heitor foram geradas à meia-noite com código velho.

**Seus arquivos:**
- `src/services/observability.ts`, com teste;
- novo `src/services/generationGuard.ts`, puro, com `mayGenerateNow` e teste;
- `src/services/dailyQuizService.ts`: a trava em `ensureDailyQuiz`, `regenerateDailyQuiz` e `buildAndSave`, e o `generatedVersion`;
- `src/components/hero/DailyQuiz.tsx`: só a chamada do pré-gerar de amanhã;
- `src/services/englishBaseService.ts` (`generateUpcomingDays`) e `src/services/englishAi.ts`: só a entrada que grava o plano do dia, com a trava e o `generatedVersion`;
- `src/services/appUpdate.ts`: só para exportar a leitura de `/version.json`, se ela ainda não estiver exportada.

**Correções do Pacote 11.** A revisão do líder está em `REVISAO_ETAPA_2_LANCAMENTO.md`, seção "Pacote 11". O pacote já está no ar. O líder já corrigiu três coisas, que estão no `main`:
- a virada do dia zera a segunda tentativa;
- a escolha do dilema nunca fica vermelha;
- o `localStorage` do aviso fica protegido.

Faça o resto, nesta ordem:
1. **As tentativas entram no stash da 8ª pergunta,** junto com os `timings`, e são restauradas na reflexão. Um recarregamento antes da reflexão não pode gravar `supportLevel` 3 em item que foi 1.
2. **O aviso continua na tela** quando as opções reabrem para a segunda escolha, e rola até ficar visível.
3. **No inglês, o aviso não toca o `audioText`.** Ele é a frase certa e entrega a resposta. Toca só o aviso em português, o que também acaba com as duas vozes juntas.
4. **Reflexão:** o botão "Entregar" depende só do contador de palavras.
   - Com 0 palavra do tema, o Sábio pede uma vez para ligar com a ideia do dia (`REFLECT_OFFTOPIC`, com o tema), e a segunda entrega é aceita.
   - Teste com as duas frases reais da revisão: a da bebida e a do chute torto.
5. **Pontuação e o "…" do molde não contam como palavra.**
6. **A memória de 14 dias das falas de aviso** guarda a data de cada fala, sem recarimbar todas com a data de hoje.
7. **`profile.ts`:**
   - o dilema nunca conta como erro: nem em categoria, nem em assunto, nem em `lastWrong`, nem em "Últimas erradas" do painel;
   - `retry` conta só itens em que houve segunda tentativa;
   - `d7` e `d30` incluem hoje.
8. **`fromDoc` lê `reflectionThemeHits`,** e o painel mostra "tema sim/não".
9. **`audioPlayed` só quando o áudio tocou de verdade.**
10. **O perfil é calculado depois da esmeralda e da sequência,** nunca antes.
11. **A foto do cartão "Como ele vai"**, que faltou no aceite do 11.

Arquivos a mais para esta parte:
- `DailyQuiz.tsx`, inteiro;
- `src/services/quiz/provaRules.ts`: só a contagem de palavras e a regra da reflexão; a família de palavras já está no `main`;
- `profile.ts`, `nudge.ts` e `closeQuiz.ts`;
- `dailyQuizService.ts`: `fromDoc` e a ordem do fechamento;
- `DailyQuizManager.tsx`;
- os testes deles.

**Aceite:**
- testes puros de `mayGenerateNow`, com os quatro casos do item (5) e o dev com outra conta;
- na conta de teste, a prova de amanhã gerada com `generatedVersion` gravado, colado no relatório;
- testes dos itens 1, 4, 5, 6 e 7 das correções;
- fotos em 1280×720:
  - o aviso visível na segunda escolha;
  - a reflexão com 0 palavra do tema;
  - o painel "Como ele vai".

## Frente P16 — a conversa do Sábio sobre o livro

**O pacote:** o 16 de `docs/etapas/PROMPT_CURSOR_2026-09-28.md`. A especificação está em `docs/LEITURA_LIVROS.md`, seção "Conversa do Sábio e ajustes de 28/09", e a régua das perguntas em `docs/conteudo/SABIO_CONVERSA_LIVROS.md`.

**Seus arquivos:**
- `src/services/village/books.ts`, sem mexer em `bookPayBlock`;
- `src/services/bookService.ts`, sem mexer em `payBookReport`, `parentApproveReport` e `parentVoidReport`;
- novo `src/services/village/bookTalk.ts`, com teste, e `src/services/village/__tests__/books.test.ts`;
- `src/components/hero/village/EstanteDoSabio.tsx` e `src/components/parent/BooksPanel.tsx`;
- em `src/types/index.ts`, só a interface `BookReportDoc` e o tipo novo da conversa;
- em `src/services/village/statSources.ts`, uma linha `bookTalks`, logo abaixo de `booksRead`.

**A regra de `talk` já está pronta:** a criança grava `talk` e `updatedAt`, só em relato aceito.

## Frente P15a — Encomendas

**O pacote:** o 15a de `docs/etapas/PROMPT_CURSOR_2026-09-27.md`, com o desenho em `docs/CONTRATOS_E_CARREIRAS.md`. **O nome na tela é "Encomendas".**

**Seus arquivos:**
- **os novos:**
  - `src/types/assignment.ts` e `src/types/proof.ts`;
  - `src/services/assignments/*` e `src/services/assignmentsService.ts`;
  - `src/components/hero/proof/ProofSheet.tsx`;
  - `src/components/hero/village/Encomendas*.tsx` e `src/components/parent/Encomendas*.tsx`;
  - `docs/CONTRATOS_E_CARREIRAS_API.md`.
- **nos arquivos que já existem, só estas partes:**
  - `Casa.tsx`: a aba;
  - `VillageHome.tsx`: os avisos da Placa;
  - `HojeCard.tsx`: o item;
  - `ParentPanel.tsx`: a aba;
  - `balance.ts`, `Balanca.tsx`, `Extrato.tsx`, `GoldHistory.tsx` e `WeeklyReport.tsx`;
  - a união de `source` em `src/types/index.ts`, e `ClaimKind` em `src/types/village.ts`;
  - `DEFAULT_ECONOMY` em `src/config/village.ts`;
  - `functions/src/index.ts`: só exports novos, no fim;
  - `scripts/econ-sim.mjs`;
  - linhas novas no fim de `statSources.ts`.

**Regras:** as de `assignments`, `assignmentBoards`, `assignmentRecurrences` e `careers` já estão no `main`, pelo §10 do desenho. O teto de ativas na regra é 5; o 3 do settings vale no cliente, na transação de aceitar.

**Recorrência:** prova-se pelos puros e pela build da função (`npm --prefix functions run build`). O deploy e o teste real são do líder.

**Aceite:** o roteiro ponta a ponta do §16 na conta de teste (criar, aceitar, entregar, pedir ajuste, entregar de novo, aprovar duas vezes: uma linha só no livro-razão). Mais as 10 fotos, em 1280×720, 1920×1080 e 390×844.
