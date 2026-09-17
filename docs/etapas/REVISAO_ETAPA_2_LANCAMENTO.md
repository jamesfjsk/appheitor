# Revisão do fechamento da Etapa 2 (lançamento de 20/09/2026)

Revisor: Claude. Uma seção por pacote, na ordem em que o Cursor entrega. Cada seção abre com "Entrou sem doc" (regra do modo de trabalho desde 17/09).

## P0. Estabilizar a árvore (17/09, 13h40; relatório `RELATORIO_ETAPA_2_LANCAMENTO.md`, seção P0)

**Entrou sem doc**: nada de código. Fora do pacote, já estava na árvore antes do P0 e entra no mesmo commit: os cinco `public/assets/village/char/pick-*.png` regenerados (`?v=7` em `src/config/village.ts`) e o `scripts/paint-pickaxe-overlays.py` reescrito (picareta na mão a partir do sprite da Mochila). É ajuste visual do look, aceito como o último antes de domingo; a partir daqui, look e Vagoneta seguem congelados.

**Conferido por mim (17/09, 14h)**:

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | 0 erros |
| `npx eslint src --max-warnings 7` | 0 erros, 7 avisos (6 antigos em `src/icons/index.tsx`, 1 em `CharacterEditor.tsx:153`) |
| `npm run test:english` | 16 arquivos, todos verdes (`levels.test.ts` 13/13) |
| `npx vite build` | ok, sem chunk `phaser`; nenhuma string `Phaser` em `dist/assets/*.js` |
| imports de `RedstoneBench` ou `phaser` fora de `src/game` | nenhum |
| arquivos abandonados | os 7 da lista apagados; nenhuma referência restante em `src` nem no `anchors.json`; `tmp-arena/` e os 26 `_shot_*.mjs` fora |

Código lido: `CharacterEditor.tsx` (slots opcionais viram `null`, obrigatórios só recebem valor existente; correto), `redstoneService.ts` (`result` tipado depois da transação; correto), `englishBase.publicFilePath` (só tira `?v=`; usado só no teste), `itemGlyphs.ts` (helpers puros movidos; `ItemGlyph.tsx` só exporta componente), `redstone.ts` (`coachOf` sem `Tool`; `sealLogic` passa `layoutHash` antigo para dentro de `finish`, o que muda a entrada do hash mas continua determinístico; módulo órfão até a Etapa 3, sem efeito no jogo).

Meu ajuste: `.gitignore` ganhou `__pycache__/` (o Python dos scripts de arte deixou `scripts/__pycache__/` solto) e `backups/` (para o `export-user.cjs` do P3 nunca subir dados reais).

**Veredito: P0 aprovado.** O pai commita a árvore inteira ("P0: árvore estável; look de picareta v7") e o Cursor segue para o P1 (seção 4 do arquivo de etapa, itens 1 a 13 na ordem).

Decidido pelo pai às 14h30 (decisão 14 do arquivo de etapa, P4.12): Biblioteca n2 = "Como você vai" e revisita; n3 = dica grátis e revisita em dobro; Cofre n3 trancado até a Etapa 3; textos da Torre n3 e do Armazém n1 corrigidos.


## P1. Bugs que bloqueiam o dia 1 (17/09, relatório seção P1; revisão às 16h)

**Entrou sem doc**: `src/services/village/stats.ts` (puro; `addVillageStats`, `nextQuizStreak`, `skipDayPenalty`) sem linha na seção 12 (registrei agora, junto com `quizGate.ts`); `closeSeasonState` recusa também qualquer fechamento quando alguma estrela tem `endedOn` de hoje (regra além da spec; fica, com mensagem própria, B7); as 7 conquistas antigas da Vagoneta (`primeira_vagoneta`, `vagoneta_dias`, `vagoneta_perfeita`) continuam no catálogo ao lado das 7 novas (A5).

**Conferido por mim (17/09, 15h50)**: tsc 0 erros; eslint 0 erros e 7 avisos; 18 arquivos de teste verdes; build sem `phaser`; regras e índice publicados (`village` sem `season`/`stars`/`launchedOn` pela criança; `quizBank` igual à seção 9). Diff lido por cinco revisores independentes por grupo de itens e cada achado verificado por um segundo agente contra o código atual (51 achados, 49 confirmados, 2 refutados). O teste no navegador na conta de teste está na subseção ao fim desta seção (sete cenários, todos passaram, com dois acréscimos à lista A).

**Veredito: P1 ainda não aprovado.** Os 13 itens estão no código, mas a rodada abaixo precisa entrar antes do commit do P1. Nenhum item cria ou perde gold; o problema são travas, contadores errados e concorrência.

### A. Corrigir antes do commit (todos pequenos; ordem de importância)

1. **Modal da prova sem saída** (`DailyQuiz.tsx:196-224`). Com `quizRequired`, depois de fazer a prova e recarregar (ou em outro aparelho), o cartão da Biblioteca ("Prova do dia") reabre o modal na fase `prompt` com `quiz.completed = true`: texto "Ainda não há prova para hoje", só "Tentar de novo", sem "Mais tarde" (escondido por `required`), e a camada `fixed inset-0` não fecha. Só F5. Correção: quando `quiz.completed`, a fase `prompt` mostra "Prova de hoje feita: X de N" e o botão "Fechar"; e sempre que `!ready` existe "Voltar à Vila", mesmo com `required` (o cadeado vem de `quizLocked`, não do modal).
2. **`quizEnabled = false` com `quizRequired = true` tranca a Vila inteira** (`HeroPanel.tsx:85`): `quizLocked` ignora `quizEnabled`, e `DailyQuiz.tsx:171` não renderiza com o quiz desligado. Criar `quizLockedFor({ quizEnabled, quizRequired, completed })` em `quizGate.ts` (`(quizEnabled ?? true) && Boolean(quizRequired) && !completed`), usar no `HeroPanel` e cobrir no `quizGate.test.ts`.
3. **`organizedWeeks` sobe a cada item da agenda feito** (`agendaService.ts:153-157`), não uma vez por semana. Tirar de `markAgendaDone`; incrementar dentro da transação de `weeklyOrganizedBonus`, atrás da chave `agenda:week:<iso>`.
4. **Pedido 1 do Comerciante impossível** (`villageService.ts:902`): `merchantSales` conta lotes (`n`), não pedra; "Venda 10 pedra" exige 100 pedra. Trocar por `need`; nota em `statSources.ts`; teste.
5. **Conquistas da Vagoneta em dobro** (`achievements.ts:84-92`): apagar `primeira_vagoneta`, `vagoneta_dias`, `vagoneta_perfeita`; alinhar os prêmios das `cart_*` à tabela da seção 12 (só XP em `cart_first` 10, `cart_perfect` 15, `cart_5` 20, `cart_stages_30` 25, `cart_20` 40; nada de madeira); ajustar `lote2.test.ts:114-118`.
6. **Catálogo com conquista sem fonte** (`achievements.ts:99-100`, `statSources.ts:67`): `estante_10` e `estante_50` ficam no catálogo e `shelfFixed` está mapeado para "Etapa 3", o que fura o teste. Tirar as duas do catálogo (voltam na Etapa 3), apagar a linha, pôr `shelfFixed` em `NO_SOURCE_YET`, e o teste passa a exigir que todo `where` cite um arquivo ou função real.
7. **Presente de amizade some** (`villageService.ts:1231`): quando o tier sobe pelos +5 pontos do pedido cumprido, `npcgift:<npc>:3` e `:5` não são pagos. Função pura `tierGifts(npc, prevTier, nextTier, claimed)` em `src/services/village/friendship.ts` (com teste) usada nos dois caminhos (conversa e pedido).
8. **`focusBlocks` conta o tique da missão "Foco:"** (`DataContext.tsx:389`), não o Foco terminado; e o Foco sem missão não conta. Criar `finishFocusBlock(uid)` em `agendaService.ts` (transação em `village`, `stats.focusBlocks + 1`) chamado no `onFinished` da Agenda; tirar o incremento do `DataContext`; `statSources.ts` aponta para ela.
9. **Aprendizado grava campo literal `weeks.2026-W38`** (`learningService.ts:84`; `setDoc` com chave pontilhada). Usar `weeks: { [week]: docData }` com `merge: true`. E na segunda o app recalcula a semana **nova** (vazia) e zera o resumo (`DataContext.tsx:1322`): usar `isoWeekOf(addDays(hoje, -1))`.
10. **Recordes** (`villageService.ts:1107-1182`): `claimTrophy` no sábado grava `week:<iso>` e trava o fechamento da semana (remover `weekKey` de `claimTrophy`); `ensureWeekRecords` faz ~800 leituras a cada abertura antes de checar a chave (checar `hasClaim` primeiro e rodar só na segunda); e no domingo 20 vai gravar a semana pré-lançamento a partir do histórico mantido pelo reset (quando o P3 criar `village.launchedOn`, ignorar semanas com domingo anterior a ele e transações com `metadata.launch`).
11. **Conquistas de obra dependem da tela** (`villageService.ts:1182`, `englishBaseService.buildUpgrade`): `applyVillageStats` ignora o `buildings` do `englishBase` que já lê na transação (usa só `extra.buildings`), e `buildsDone` é gravado fora da transação da obra. Usar `bSnap.data().buildings` como padrão e incrementar `stats.buildsDone` dentro da transação de `buildUpgrade`.
12. **`nightComplete` solto** (`VillageHome.tsx:255-261`): efeito de tela com transação em paralelo, lê `claimed['night:<dia>']` mas nunca grava. `completeNight(uid, date)` em `villageService.ts` com transação e a chave gravada; o efeito só chama.
13. **Válvula de escape incompleta** (`dailyRulesService.ts:287,293,333`): com `dailyRules.enabled = false` as tochas ainda zeram no dia perdido e `noPunishDays` sobe em férias e folga. `skip: skipPenalty || keepTorches`; `noPunishDays: skipPenalty ? 0 : 1`; guarda da linha 333 por `skipPenalty`. Teste puro.
14. **"Não deu certo" depois de já ter pago** (`villageService.ts:416, 454, 573` e outros): os `await applyVillageStats` e `talkToNpc` pós-transação estão fora de `try/catch`, então um erro de stats vira toast de erro em Baú, Mercado, Ferraria e venda. Helper `settleAfter(uid, npc?)` com `try/catch` e `console.warn`. Junto: `statsBump.ts:16` troca `catch {}` por `console.warn` (erro engolido em silêncio).
15. **Pedido de notificação em cima do Onboarding** (`HeroPanel.tsx:70-75`): `requestPermission` dispara 3 s após o login. Mover para `AfterOnboard`, só com `village.onboardedAt` e `permission === 'default'`.
16. **Aba Relatório não recalcula ao abrir** (`WeeklyReport.tsx:14-17`; o relatório do Cursor diz que recalcula). Calcular na montagem em silêncio, com o botão continuando para forçar.
17. **`themesSet` conta cada clique** (`englishBaseService.ts:746`): contar uma vez por dia e só quando o tema muda (`themeSetOn`).
18. **Painel do pai ainda roda `applyWeeklyInterest` e `resetOutdatedTasks` na conta da criança ao montar** (`DataContext.tsx:1310-1327` e `run` em 1521-1535): a guarda de `admin` cobre só `processUnprocessedDays`; envolver a cadeia inteira.

### B. Acabamento (entram nesta rodada se couberem em 1 hora; senão vão para o P4)

1. Arena com prova pendente abre a prova e fica cinza com cadeado (`quizGate.ts`: `build:arena` fora de `quizBlocksDest`; `VillageScene` não escurece landmark). Teste.
2. Toast de erro duplo no Onboarding (`Onboarding.tsx:41`: o `wrap` do contexto já avisa; tirar o `catch`).
3. Cartão da Biblioteca em ruínas sem o botão "Prova do dia" quando `quizRequired = false` (`BuildingCard.tsx:191-256`).
4. `contractsWeek` nunca zera na virada da semana (pedido 2 do Comerciante vira "3 contratos na vida"): zerar por semana ISO em `applyVillageStats` (`contractsWeekKey`).
5. `quizStreak` congela depois de quebrar (`dailyQuizService.ts:176`): `closeDay` zera quando o dia fechado não teve prova (fora de férias e folga).
6. Torre: "Maior sequência de tochas" mostra o valor da semana ou a sequência atual (`Torre.tsx:143`); usar `stats.fullDaysBest`. Cadeados ignoram a Torre em ruínas (`liveBuildingLevel`). Abas trancadas usam emoji de cadeado (regra da interface: sem emoji; usar o ícone do `lucide` ou o sprite de `ui/`). Pedido com tier insuficiente aparece sem dizer o que falta (`Torre.tsx:187`).
7. `closeSeasonState` (`season.ts:94`): a recusa por `endedOn` de hoje ganha mensagem própria e comentário; registrar em `lote2.test.ts`.
8. `bigGoals` usa `DEFAULT_ECONOMY.incomeDayGold` em vez de `settings/economy` (`goalsService.ts:334`); `statOf` sem uso.
9. Arena continua com custos e três níveis no catálogo (`englishBase.ts:198`); só `liveMaxLevel` a segura. Teste: `canBuild(rich, 'arena').ok === false`.
10. `quizAccuracyByCategory` com `merge` mantém categorias de semanas anteriores; `fullDays` do aprendizado é o total de sempre (`learningService.ts:81`).

Refutados (não são problema): conquista antiga sem `isActive` (todo caminho grava o campo); `create` de `village` pela criança sem restrição (o doc do Heitor já existe e o reset é do admin).

Aceite da rodada: testes novos verdes (`quizGate` com `quizLockedFor`, `friendship`, `statSources` exigindo fonte real, `skipPenalty` nas tochas); relatório com a lista do que entrou de B; o teste no navegador desta revisão refeito por mim nos pontos A1, A2, A5, A11 e A12.

### Teste no navegador (conta de teste, 17/09, 14h30 às 17h50; scripts, logs e fotos em `scratchpad/e2e6/`)

Os sete cenários do aceite passaram; a conta foi restaurada campo a campo ao fim.

| Cenário | Resultado | Evidência |
|---|---|---|
| Portão da prova com a Mesa caída | passou | com `cracks=['mesa']` e sem: entrada da Mina, Ferreiro, Comerciante, Biblioteca em ruínas, hotbar Mina e teclas abrem "Prova do dia", nenhum destino abre; a prova não abre sozinha ao entrar; Mochila continua aberta |
| Fechar temporada duas vezes | passou | 1ª: `stars` com a temporada 1, `season 2`, `claimed['season:1']`, XP 300 → 0, 1 snapshot e 1 ajuste; 2ª: toast "Esta temporada já foi fechada", nada muda |
| "Curioso" com os 4 NPCs | passou | `stats.talksSameDay` marca ao falar com o quarto, `achievementsUnlocked.curioso`, `claimed['ach:curioso']` uma vez, +10 XP; a Torre mostra "Segredos 1/1" |
| Plano do turno | passou | lista da Casa segue `plan.order`; selo "Foco · 2x material" só na foco; toast "+5 gold, +2 Madeira, +10 XP" igual a `taskCompletions.materialsEarned` |
| Obra sem erro 400 | passou | Cerca 1 construída: 4 commits em sequência, todos 200, zero `pageerror`, `buildsDone` +1, Ferreiro +7 pontos |
| Torre sem nível discordante | passou | XP 550: cabeçalho "Nível 7" e Torre 7/10, 7/20; com `torre=1` Recordes, Troféus, Mapa e Histórias trancados com toast; com `torre=3` tudo abre |
| Ruína só com penalidade | passou | `enabled=false`: fechamento de ontem com 1/4 missões deixa `cracks=[]`, gold igual, sem linha de penalidade; controle com `enabled=true`: 3 obras caem e `daily_penalty -3` |

O que o navegador acrescentou à lista **A** (entram na mesma rodada):

19. **Sem cadeado visual no portão**: com `quizLocked`, a entrada da Mina, o Ferreiro, o Comerciante e o atalho "Mina" da hotbar não mostram cadeado (só os lotes construídos ganham o ícone; a Agenda aparece cinza com cadeado). O Heitor clica na Mina e "cai" na prova sem aviso. `VillageScene` desenha o cadeado nos hotspots `mine`, `npc:ferreiro` e `npc:comerciante` quando `gated`, e a hotbar marca "Mina" com o cadeado (era o aceite D1b do Lote 1).
20. **"Novo" nunca aparece na Torre** (`Torre.tsx`, `seeAchievements` na montagem): `newAchievements` é zerado uns 300 ms depois de abrir, antes de a criança ver; em desenvolvimento o efeito roda duas vezes e o segundo commit dá `400 FAILED_PRECONDITION` (foi o único 400 do teste, sempre ao abrir a Torre). Limpar ao **fechar** a Torre (e o mesmo desenho na Mochila, item da revisão do Lote 2), nunca ao montar.

E à lista **B**:

11. De dia o Sábio fica em cima da entrada da Mina (`npcSpots` em 620,143): o clique no centro do hotspot da Mina acerta o Sábio. Afastar o spot de dia do Sábio uns 60 px da boca da Mina no `anchors.json`.
12. A "Linha do dia" ordena por horário e período, não por `plan.order` (a Casa ordena certo). Aceitável até a Etapa 3; registrar.

Observação para o pai: `settings/dailyRules.enabled` está **ligado** na produção (desde 14/09) e o botão "Fechar dias pendentes" fica desabilitado quando as regras estão desligadas (por desenho). O painel "Saúde" tem um erro `useAuth deve ser usado dentro de AuthProvider` de hoje às 12h49, de uma sessão anterior à minha; não reproduzi, mas vale olhar se voltar.

### Rodada da revisão (relatório "P1 — rodada da revisão"; verificação às 19h)

**Conferido por mim**: tsc 0; eslint 0 e 7 avisos; 19 arquivos de teste verdes; build sem `phaser`. Cada item da lista A e cada grupo da B foi verificado no código atual por um agente independente (23 verificações): **15 corretos** (A1, A2, A3, A5, A7, A9, A10, A11, A12, A13, A14, A15, A17, A20, B9 a B11) e 8 parciais, abaixo. No navegador, na conta de teste (`scratchpad/e2e7/`): **os 8 cenários retestados passaram** (A1 modal com "Fechar" e "Voltar à Vila"; A2 sem armadilha; A19 cadeado na Mina, no Ferreiro, no Comerciante e na hotbar, Arena sem cadeado e abrindo o Olheiro; A20 "Novo" visível e zerado só ao fechar, sem 400; A5 uma sessão real da Vagoneta destrava só `cart_first` uma vez; A11 `buildsDone` na transação da obra e "Primeira obra" destravada sem 400; A12 `night:<dia>` gravado uma vez; B3 e B11 ok). Conta restaurada.

**Entrou sem doc**: durante o reteste houve um reload do Vite vindo de uma edição em `src/config/village.ts` e nos PNGs da picareta (16h43). O look está congelado desde o P0; o que estiver na árvore agora entra no commit e é o último. Nada mais de look até domingo.

**Veredito: P1 aprovado condicionado à rodada 2 abaixo** (cinco correções pequenas; sem elas o item 18 da lista A continua aberto). Depois delas, o pai commita ("P1: 13 bugs do lançamento + duas rodadas de revisão") e o Cursor segue para o **P3** (seção 6 do arquivo de etapa).

### Rodada 2 (obrigatória antes do commit)

1. **Guarda do painel do pai não funciona** (`AuthContext.tsx:63-97`, `DataContext.tsx:1290-1330`): no login do pai, `setChildUid` roda antes de `setUser`, então o efeito do `DataContext` (dependência `[childUid]`) dispara com `user` ainda nulo, `user?.role === 'admin'` é falso e a cadeia diária inteira roda na conta do Heitor (inclusive `checkAndResetStreakIfNeeded`, que está antes da guarda). Correção mínima: no efeito de montagem, `if (!childUid || !user) return;` com `user?.role` nas dependências, e a guarda envolvendo a cadeia inteira a partir do streak; o mesmo no `run` da virada do dia. No `AuthContext`, opcional: devolver `{ user, childUid }` de `ensureUserSetup` e chamar `setUser` e `setChildUid` juntos.
2. **Relatório do pai desfaz o A9** (`WeeklyReport.tsx:17`; `computeWeeklyLearning`): o cálculo silencioso na montagem grava a semana **corrente** (vazia) nos campos de topo de `learning/{uid}`, que a Torre lê. Correção: `computeWeeklyLearning` só grava o topo quando `week` é a semana fechada (a de ontem); para a semana corrente grava só em `weeks[week]`. E o botão fica desabilitado enquanto o cálculo da montagem roda; se o resultado for nulo, mostrar "Não deu para calcular" em vez de "Calculando" para sempre.
3. **Cadeado invisível na Mina** (`VillageScene.tsx:315`): o ícone é pintado em `#17130f` sobre a boca escura da mina. Placa clara atrás (`#f4e8c8` com contorno `#17130f`) ou contorno claro no corpo e na alça; no atalho "Mercado" da hotbar também aparece o cadeado quando o portão está ligado (`VillageHome.tsx:604`, mesmo `quizBlocksDest`).
4. **Foco da Casa não conta o bloco** (`Casa.tsx:221-226`): o `onFinished` do FlashTimer da Casa só chama `completeTask`; chamar `finishFocusBlock(childUid)` como em `Agenda.tsx:170`.
5. **Sequência da prova zera depois de férias** (`dailyQuizService.ts:178`): `nextQuizStreak(prev, ontemFeita)` devolve 1 quando ontem não teve prova, mesmo quando `closeDay` preservou a sequência por férias ou folga. Passar também `ontemIsento` (`dailyProgress` de ontem com `vacation` ou `paused`) e, em `stats.ts`, `nextQuizStreak(prev, done, skipped)` devolve `prev + 1` quando `done || skipped`; teste puro 7 → férias → 8. Junto: em `closeDay` não zerar `quizStreak` quando `progress.quizEnabled === false`.

Também nesta rodada, sem teste no navegador: guarda in-flight (`ref`) no efeito de `nightComplete` em `VillageHome.tsx:256-261` (em desenvolvimento o StrictMode chama duas vezes e o segundo commit dá 400, mesma classe do A20); e o relatório do Cursor tira `Onboarding.tsx` da lista de arquivos (B2 não mudou nada, o arquivo já estava certo).

### Fica registrado para depois (não bloqueia; entra no P4 ou na Etapa 3)

- Testes que só conferem texto: `statSources.test.ts:26-29` valida o formato do `where` e a palavra "need", não a existência da função nem o valor gravado em `merchantSales` (extrair `saleStatDeltas` e checar arquivo/função com `node:fs`, uns 10 linhas); `contractsWeek` (B4) sem teste (extrair `rollContractsWeek` puro).
- `goalsService.finishGoal`: a leitura de `settings/economy` do `bigGoals` roda depois da transação e sem `try/catch` (mesmo padrão do A14).
- Nenhum teste cobre que o papel `admin` pula a cadeia diária.

### Rodada 2 conferida (17/09, 19h40): **P1 aprovado**

Lido no código atual: `AuthContext` devolve `{ user, childUid }` e grava os dois no mesmo tick (linhas 87-88 e 141-142); o efeito de montagem do `DataContext` espera `user`, depende de `user?.role` e a cadeia inteira, streak incluído, fica atrás de `role !== 'admin'` (1298-1330), assim como o `run` da virada (1510). `computeWeeklyLearning` grava o topo só quando a semana pedida é a fechada (`closedWeek`, 96-104) e a corrente vai só para `weeks[week]`. Cadeado com placa clara (`VillageScene.tsx:317`) e cadeado no atalho Mercado (`VillageHome.tsx:611`). `Casa.tsx:223` chama `finishFocusBlock`. `nextQuizStreak(prev, done, skipped)` com teste 7 → férias → 8; a prova lê férias e folga de ontem em `dailyProgress`; `closeDay` respeita `quizEnabled`. `nightComplete` com guarda de módulo por `uid:dia`. Checks: tsc 0, eslint 0 e 7 avisos, 19 arquivos de teste verdes.

Pai: commit ("P1: 13 bugs do lançamento e duas rodadas de revisão") e o Cursor segue para o P3 (seção 6 do arquivo de etapa: `export-user.cjs`, `launch-reset.cjs`, `clone-to-test.cjs`). O reteste no navegador do que mudou na rodada 2 (cadeado da Mina, painel do pai sem fechar dias) entra no E2E do dia 1 de sábado.

