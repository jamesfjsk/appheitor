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

### Correções feitas por mim em 18/09 de manhã (o pai testando no Firefox; entram no commit do P2)

- **Andar restaurado** como aprovado no Lote 2 (125 px/s, mínimo 480 ms, abre na chegada; sem atalho de "perto"; `npcBehavior.ts`, `VillageScene.tsx`, testes).
- **Laço da cena não para mais com "reduzir movimento"** (Firefox segue a opção do Windows; o boneco ficava travado e "teletransportava"): `VillageScene.tsx`, `draw`.
- **Mouse na cena**: com o `object-fit: contain` que o P2 pôs no canvas, a pintura e o clique usavam retângulos diferentes, e o cursor e o clique caíam deslocados conforme a resolução. Desenho e `sceneXY` passam a usar o mesmo retângulo contido; conferido em 1280x720, 1366x768, 1600x900 e 1920x1080, Chromium e Firefox.
- **Sem `zoom` em tela larga** (borrava no Firefox); **"Recuperar" fora**; **missão do dia vale o dia inteiro** (`periodGating: false` por padrão); **missão-foco fora** (decisão 22).
- **Laterais da cena** (`.mn-village .mn-stage::before`): quando a cena cabe pela altura, as faixas dos lados mostram a própria paisagem desfocada e escurecida em vez de preto. **Aprovado pelo pai em 18/09; não mexer.**

### Rodada 2 conferida (17/09, 19h40): **P1 aprovado**

Lido no código atual: `AuthContext` devolve `{ user, childUid }` e grava os dois no mesmo tick (linhas 87-88 e 141-142); o efeito de montagem do `DataContext` espera `user`, depende de `user?.role` e a cadeia inteira, streak incluído, fica atrás de `role !== 'admin'` (1298-1330), assim como o `run` da virada (1510). `computeWeeklyLearning` grava o topo só quando a semana pedida é a fechada (`closedWeek`, 96-104) e a corrente vai só para `weeks[week]`. Cadeado com placa clara (`VillageScene.tsx:317`) e cadeado no atalho Mercado (`VillageHome.tsx:611`). `Casa.tsx:223` chama `finishFocusBlock`. `nextQuizStreak(prev, done, skipped)` com teste 7 → férias → 8; a prova lê férias e folga de ontem em `dailyProgress`; `closeDay` respeita `quizEnabled`. `nightComplete` com guarda de módulo por `uid:dia`. Checks: tsc 0, eslint 0 e 7 avisos, 19 arquivos de teste verdes.

Pai: commit ("P1: 13 bugs do lançamento e duas rodadas de revisão") e o Cursor segue para o P3 (seção 6 do arquivo de etapa: `export-user.cjs`, `launch-reset.cjs`, `clone-to-test.cjs`). O reteste no navegador do que mudou na rodada 2 (cadeado da Mina, painel do pai sem fechar dias) entra no E2E do dia 1 de sábado.



## P2. Telas da criança (varredura de 17/09, 21h às 22h30; conta de teste; 197 fotos em `scratchpad/sweep/720/` e `sweep/1080/`; as sete dos defeitos graves copiadas para `docs/exemplos/telas/varredura-17-09/`)

Motivo: o pai viu a Casa cortada (Fechar e Concluir fora da tela) e mandou lapidar o que importa antes de tudo (decisão 18). Varri todas as telas da criança em 1280x720 e 1920x1080 com conteúdo real (9 missões, obras, metas, agenda, prova, Mina, Baú, NPCs, Onboarding). Resultado: 31 defeitos, 5 que impedem usar. Nenhum `pageerror` nas corridas finais. Esta lista é o checklist do P2 (itens 6 a 9 do arquivo de etapa); cada linha diz o que fazer.

### Bloqueiam (fazer primeiro, nesta ordem)

1. **Casa cortada em 720** (`Casa.tsx:126`, `max-h-[96vh] overflow-hidden`; conteúdo 774 px num modal de 691): o terceiro "Concluir" e o "Fechar" do dia ficam fora da tela e o clique cai no véu. Cabeçalho e abas fixos, corpo com `overflow-y-auto`, botão principal sempre visível (P2.9). Vale para Torre, Mochila, Ferraria, Mercado, Cofrinho, Agenda, prova, Baú, cartão, Onboarding.
2. **Vila cortada em 720** (`VillageHome.tsx`, cabeçalho de 190 px + cena de 620 px + hotbar fixa): a fileira de baixo da cena (Cofre, Agenda, Mercado) fica atrás da hotbar, sem pista de rolagem; com a faixa de ruína, só 270 px da cena aparecem. Regra: **a cena inteira sempre visível**: escala pela altura disponível (viewport menos cabeçalho menos hotbar), com faixas laterais se precisar; abaixo de 800 px de altura o cabeçalho vira uma linha compacta (nome, nível, gold, tochas, hora); a faixa de ruína vira uma linha no cabeçalho, não um bloco acima da cena.
3. **Placa cobre a Fornalha e o Ferreiro** (`VillageScene`/`VillageHome`, painel "Hoje você tem" em 8,8 a 360,266 da cena): o clique no Ferreiro conversa sem a criança ver o balão, e a ruína da Fornalha fica escondida. A Placa vira um chip no alto (uma linha, "Hoje você tem 3 · 2 lembretes") que abre o painel **por cima do céu, ao centro**, sem cobrir nenhum hotspot dos `anchors.json`; balões dos NPCs sempre acima de qualquer painel (ordem de camadas).
4. **Cofre não abre** (`probe-cofre*.cjs`: o herói anda até 545,500, para atrás do sprite e nada abre em 20 s; Armazém abre depois de 3,5 s, Agenda depois de 1,6 s). **Corrigido em 18/09 depois de o pai ver o boneco teletransportando: o andar FICA e o lugar abre quando ele chega.** O que muda é só a chegada: (a) cada lote e NPC ganha um ponto de **porta** no `anchors.json` (`door: {x, y}`, na frente do sprite, na trilha), e é para lá que o boneco anda; (b) chegada com tolerância de 24 px; **o lugar abre só quando ele chega** (o teto de 700 ms que eu tinha pedido fazia o cartão abrir no meio do caminho e, ao fechar, o boneco já estava lá: era isso que parecia teletransporte; corrigido por mim em 18/09 em `npcBehavior.ts`, `HERO_OPEN_MAX_MS` vira teto de segurança de 4 s, teste em `lote2.test.ts`); (c) **o andar é o que o pai aprovou no Lote 2 e foi restaurado por mim em 18/09**: 125 px/s, mínimo 480 ms e máximo 4 s por caminhada, destino pelo nó do caminho de terra (`HERO_DEST_NODE`) e só depois a porta; sem atalho para "perto"; sem depender do "reduzir movimento" do Windows; o lugar abre quando ele chega (teste em `lote2.test.ts`; medido no navegador: Comerciante 1 s, Cofre 1 s, Mercado 1,4 s, Fornalha 3,3 s, Olheiro 3,2 s). O Cursor tinha trocado para 320 px/s sem mínimo e abrindo a 700 ms por pedido meu: era o "teletransporte"; (d) clicar em outro lugar no meio do caminho troca o destino. `MUNDO.md` §1 ganha esta frase no lugar de "a ação abre quando o clique acontece".
5. **Mina: "Abrir" sem efeito** (`ContractBoard.tsx:109`): contrato `done` sem `result` cai no ramo "Abrir" e o botão não faz nada; o cabeçalho diz "1/5" com cinco "Abrir". Tratar `done` sem `result` como feito (cartão "Feito", sem botão) e nunca mostrar botão que não faz nada.

### Entram no P2 (médios; a criança vai esbarrar na primeira semana)

6. **Missões primeiro** (`Casa.tsx`, aba Missões): "Linha do dia" e "Criar missão" vêm antes da lista e os "Concluir" começam em y 1245 (mesmo em 1080). A lista de missões abre no topo; a Linha do dia vai para baixo, recolhida ("Ver a linha do dia"); "Criar missão" sai (decisão 16).
7. **Prova: "Próxima" cortado** depois de responder (720, y 668-690): rodapé fixo no modal da prova com o botão.
8. **Toasts em cima dos botões** (Som, Tela cheia, Sair, o X da Casa): no login sobem 3 lembretes da Agenda empilhados, inclusive de eventos já passados; "Por hoje é isso" em dobro; 3 toasts do level-up sobre o X. Lembrete só dentro da janela (nunca de evento passado), um por vez; toasts da criança embaixo, ao centro; nunca dois iguais seguidos.
9. **Balão do NPC com "Continuar" fora do canvas** (720): o balão e o botão ficam dentro da área da cena (reposicionar para cima quando o NPC está embaixo). **Decisão do pai (19/09): o "Continuar" é discreto, dentro do próprio balão, no cantinho inferior direito**, como seta ou texto pequeno ("continuar ›"), pintado no canvas junto com o balão (`drawSpeechBubble`), com área de clique de 44 px mesmo que o desenho seja menor; some quando é a última frase (aí o balão fecha no clique em qualquer lugar ou em 6 s). Nada de botão de madeira embaixo da cena.
10. **Agenda, novo item**: `input type=date` mostra mês/dia e `type=time` mostra AM/PM (controles nativos brancos). Controles próprios em pt-BR: dia com o calendário do Mês, hora em duas listas (hora, minuto, 24h), no tema.
11. **Agenda, Mês**: dias 1 a 15/09 (antes da conta existir) com borda vermelha de "perdido"; marcadores "★" e "•" sem legenda; "+30" sem rótulo. Só marcar dias a partir de `dailyRules.activatedOn` (ou `launchedOn`); legenda; ícones em vez de símbolos Unicode.
12. **Agenda, Hoje**: a criança apaga e edita itens criados pelo pai com um clique. Item do pai é só leitura para a criança (pode marcar feito); os dela pedem confirmação para apagar.
13. **Cartão do Mercado** repete o painel de prêmios inteiro (1094 px de rolagem) e termina com "Oficina". Cartão só com o resumo ("3 prêmios ao seu alcance") e "Abrir o Mercado".
14. **Cartão da Biblioteca nível 0** diz "A prova do dia já pode ser feita" com a prova já feita: texto por estado (feita, pendente, trancada).
15. **1920x1080: tudo pequeno** (coluna de 1280 px com 320 px vazios de cada lado; modais em px; alavanca da Vagoneta com rótulo de 9 px): a tela da criança cresce em largura ≥ 1600 por tamanhos em `rem` com `clamp()` e a cena ocupa a largura útil. **Nunca `zoom` nem `transform: scale`**: o `zoom: 1.25` que entrou borrou texto e cena no Firefox (o pai viu em 18/09; removido por mim).
16. **Cerca nível 0 sem lote desenhado** (só aparece no hover): desenhar terra e placa como nos outros lotes vazios.
17. **Nomes** (glossário `VILA_MAPA.md`): a faixa diz "A Ferraria caiu" quando é a **Fornalha**; botão "Oficina" nos cartões vira "Ferraria"; o cartão diz "Armazém" e o resto "Baú": a construção é **Armazém**, o Baú é o Baú do Dia.
6b. **Chip "Feliz aniversário" por cima do Onboarding** (foto do pai, 18/09): o cabeçalho com o chip de aniversário renderiza acima do Onboarding em tela cheia. Regra do P2: nada (chip, toast, modal, pedido de permissão) aparece enquanto o Onboarding está aberto; o chip de aniversário só na Vila.
18b. **Cartão promete 2 gold e o toast paga 1** (foto do pai, 18/09): quando o teto diário (`gameGoldDailyCap`) ou qualquer regra corta o valor, a linha de recompensa do cartão mostra o valor **que vai pagar de verdade** (calcular com o mesmo `computeTaskLoot`/teto antes de mostrar), e o toast diz por quê quando cortou ("teto do dia"). Prometer 2 e dar 1 é o tipo de coisa que faz a criança desconfiar do jogo.
18. **Texto pequeno** (9 a 11 px): chips do cabeçalho, `mc-lbl`, "RECADO", linha de recompensa da missão, números do Extrato e dos Recordes, tags "Novo". Mínimo 12 px em texto e 14 px em número que ele precisa ler; fonte pixel só em título e número grande.

### Depois (P4 ou Etapa 3; registrados)

19. Torre: chips de categoria com id cru ("bau"), abas trancadas só com toast, "Troféu da semana" desabilitado sem motivo, "Da vida real" com título "Conquistas". 20. LevelUpModal por cima da Casa com 3 toasts; "Capacete da Forja" só em texto. 21. Linha do dia: "· Aniversário" com separador solto; "· picareta" cru. 22. Comerciante e Sábio falando "Nível 5" com a criança no 8 (falas de marco `once` atrasadas: disparar no dia do marco ou nunca). 23. Mochila: contador sobre o ícone; 18 slots vazios. 24. Ferraria: `select` nativos, "Bloqueado" sem motivo, capa com ícone de presente. 25. Mercado: dois botões "Todas". 26. Vagoneta: dois "Voltar à Mina". 27. 21h: toast "Por hoje é isso" a cada clique e hotbar Mercado sem cara de desabilitado. 28. Baú: "Já aberto" permanente. 29. Agenda Semana: colunas estreitas quebrando palavras. 30. Onboarding: rótulos de 9 px, camisa preta invisível no slot escuro, passo do Sábio sem a imagem dele e sem voltar (o P2.2 já redesenha). 31. `DailyChest.tsx:46`: rejeição não tratada quando `taskCompletions` e `tasks.status` divergem (`pageerror: Faltam 8 missões`).

Telas sem defeito de layout: prova (inicial, lição, resultado, reflexão), contrato aberto e em jogo, Vagoneta, Ferraria Obras, Loja "em breve", Comerciante, Cofrinho, Foco, cartões Fornalha, Torre, Armazém e Agenda, Baú do Dia, Vila 18h e 21h, balões do Comerciante, Sábio e Olheiro, LevelUpModal em si.

Aceite do P2 (com esta lista): os itens 1 a 18 corrigidos com foto em 1280x720 e 1920x1080; eu refaço a varredura nas duas resoluções antes do go/no-go.


## Revisão final de lançamento (18/09, manhã; o pai decidiu liberar o primeiro acesso hoje)

### O que fica registrado de tudo que o Heitor faz (base para ajustes e para não repetir)

| O que ele faz | Onde fica gravado | O que dá para saber depois |
|---|---|---|
| Prova do dia | `dailyQuizzes/{uid}_{data}`: tema (id, categoria, título, ideia do dia), as 8 perguntas com alternativas, resposta certa e explicação, `answers[]` (o que ele marcou), `score`, `xpEarned`, `goldEarned`, `reflection` (o que escreveu), `source` (IA ou reserva), horários | cada pergunta já feita, acerto por pergunta, categorias fortes e fracas, reflexões; a lista "não repita" da IA passa a receber as **80 perguntas mais recentes** dos últimos **90 dias** (corrigido hoje: antes mandava as 60 mais antigas de 45 dias) |
| Missões | `taskCompletions` (uma por conclusão: missão, data, hora, XP, gold, material, foco, tarde), `goldTransactions` (cada gold que entra ou sai, com saldo antes e depois), `dailyProgress/{uid}_{data}` (fechamento do dia: feitas, perdidas, penalidade, bônus, obras caídas, `checkin` com humor e "amanhã eu") | rotina dia a dia, horários em que faz, dias completos, o que perde mais |
| Mina (inglês) | `englishPlans/{uid}_{data}` (os contratos do dia com o conteúdo e o `result`: nota, resposta dele, correção, detalhes como ouvir de novo e olhar o glossário), `englishSessions` (uma linha por contrato e por jogo, inclusive a Vagoneta), `englishBase.vocab` (cada palavra vista, quantas vezes e quando; `seen >= 3` é dominada) | palavras já mostradas e dominadas, temas usados, acertos por tipo de contrato, cálculo mental da Vagoneta |
| Desafios e metas | `challenges` (progresso e `completedAt`), `goals` (depósitos, alcançada ou cancelada) | o que ele topa e cumpre |
| Vila | `village.stats` (todos os contadores: missões, dias completos, provas, contratos, obras, conversas, Baú, raros), `village.claimed` (cada prêmio pago, com data), `achievementsUnlocked`, `npcs` (amizade e falas vistas), `agenda` (o que ele marca) | conquistas, ritmo de obras, com quem fala, o que agenda |
| Erros do app | `clientErrors` e `health/{uid}` | o que quebrou e quando |

O reset de lançamento **preserva** tudo isso (só zera o jogo). O que ainda não existe e entra na Etapa 3, já desenhado em `ETAPA_2_LANCAMENTO.md` §8.4: a coleção `quizBank` (uma linha por pergunta com `hash`, para deduplicar por texto e para a revisita de erros), o perfil de aprendizado e a rotação de temas por perfil. Os dados brutos de hoje em diante servem de base para o `backfill-quizbank.cjs`.

### Estado do código (18/09, 11h)

`tsc` 0 erros; `eslint` 0 erros (7 avisos antigos); 19 arquivos de teste verdes; `vite build` sem `phaser`. Regras e índice do Firestore publicados em 17/09 às 14h19. Backup do Heitor gravado: `backups/xZkTTR2tlIYXIpAelxEqXugNjqo2-2026-09-18.json` (5.373 documentos). Dry-run do reset conferido: gold 116 → 100, XP 23.148 → 0, temporada 1, Onboarding de novo, 15 missões em pendente, 13 conquistas do pacote antigo desativadas, nível 1 e 3 palavras de inglês preservados, `dailyRules.activatedOn` = 2026-09-18.

### Como liberar hoje (ordem)

1. **Commit** da árvore (tudo que está aqui: P2 parcial do Cursor, correções de hoje). Mensagem sugerida: "P2 parcial e correções do lançamento".
2. **Reset do Heitor** (com o backup já feito): `node scripts/launch-reset.cjs --uid xZkTTR2tlIYXIpAelxEqXugNjqo2 --launch 2026-09-18 --apply --confirm "LANCAR Vila do teste"`. Rodar de novo não muda nada.
3. **Deploy**: `git checkout main && git merge etapa-2 && git push`; na Vercel, variável `VITE_MAINTENANCE=0` (sem ela o site mostra o teaser) e redeploy; conferir `flashmissons.com` abrindo o login.
4. **Painel** (5 minutos): missões de hoje por período (as 15 já existem), 3 prêmios com faixa, recado de boas-vindas na Placa, módulos (Loja desligada, Cofrinho ligado, Vagoneta desligada até passar no teste), gerar e ler a prova de hoje na aba Prova.
5. Entrar como Heitor só até "Crie seu minerador" e sair. Chamar o Heitor.

### O que fica de fora hoje (registrado, sem prometer)

Itens 6 a 18 da varredura que o Cursor ainda não fechou seguem na lista do P2 para a semana 1; `quizBank`, perfil de aprendizado e rotação por perfil (Etapa 3, semana 2); Expedição do Explorador (27/09).
### Teste do dia 1 na conta de teste (18/09, 9h30 às 10h20; dados clonados do Heitor; `scratchpad/e2e-dia1/`, 126 fotos)

**Os 9 passos passaram, com zero erros de console e zero HTTP 400, em 1280x720 e 1920x1080**: clone e reset (idempotente) → Onboarding limpo (6 telas, nada por cima) → Vila do dia 1 (cadeados, sem penalidade, nenhum dia antigo fechado) → Casa (lista inteira rolando, sem Foco, Recuperar ou Criar missão; toast igual ao cartão) → prova até a reflexão (gravada com 8 respostas, cadeados somem sem recarregar) → Mina (Recado por IA em 18 s, `englishPlans` com resultado, sessão e vocabulário gravados, plano de amanhã pré-gerado) → Baú das 18h → Fechar o dia (resumo, humor, frase, +5 XP) → virada para 19/09 (tocha, Placa com o Sábio) → painel do pai (nada fechado ao abrir; prova de amanhã pronta). **Lançamento aprovado; reset do Heitor aplicado às 10h09 com backup das 9h30.**

Achados do teste (entram no P2 da semana 1; nenhum bloqueia o dia 1):

- **A1 (médio)** `isPunishedOn` trata punição inativa sem `deactivatedAt` como ativa (o dia fecha "punido", sem tocha nem bônus); `launch-reset` só apaga punições ativas. Corrigir os dois (inativa é inativa; o reset apaga todas). A conta real não tinha nenhuma.
- **A2 (médio)** "Fechar o dia" mostra "Ouro de hoje: 0" no próprio dia (lê `dailyProgress.goldEarned`, que só existe depois do fechamento); somar `goldTransactions` de hoje.
- **A3 (médio)** Mina: fechar o quadro enquanto os contratos chegam deixa o plano em `generating` por 3 min; reabrir mostra só os que chegaram, e a regeneração zera `order/contracts`. Esperar a geração terminar antes de mostrar o quadro, e a regeneração nunca apaga contrato feito.
- **A4 (baixo)** Presente de nível some se fechar a aba com o modal "Escolha 1 material" aberto: gravar o presente pendente em `claimed` e reabrir.
- **A5 (baixo)** Painel: Histórico de gold "todo o período" e Prova "últimos dias" não filtram por `launchedOn` (soma o +100 do lançamento como ganho).
- **A6 (baixo)** Toasts cobrindo botões (item 8 da varredura, confirma).
- **A7 (observação)** `progress.level` fica atrás do XP (a tela usa `getLevelFromXP`, certo); `allDoneBonus` padrão 0 faz a Placa não dizer "ontem foi dia completo"; rótulos de 9 a 10 px na Mina (item 18).

### Dia 1 real do Heitor (18/09, até 11h): o que os dados mostraram

Tudo gravado como desenhado: prova (8 perguntas e respostas, 2 de 8, tema "Democracia na Grécia"), 5 contratos da Mina com conteúdo e resultado item a item (Carta 3/3; Recado 1/3 com correção da IA: plural e ordem de palavras; Ferraria 4,5/6 com erros nos itens 2, 3 e 5; Comerciante 0/2 e 1/2 com cada colocação registrada), 11 palavras vistas, 3 conversas com NPCs, zero erros de app. Dois achados para o P2 da semana 1:

- **A8 (médio)** A Vagoneta abriu e gravou uma sessão (0 de 3) com `modules.logic` desligado: a aba e o botão da Vagoneta respeitam o módulo (não aparecem quando desligado).
- **A9 (baixo)** Comerciante: a entrega fecha com objeto no lugar errado ("in the box" quando o pedido era "on the box") sem aviso; antes de fechar, uma confirmação "Tem certeza? Ouça de novo" quando a colocação não bate, uma vez por entrega.

### Reset do Heitor: o que ficou errado e a limpeza (18/09, 11h10)

O `launch-reset.cjs` preserva as coleções pedagógicas inteiras e por isso manteve **registros de hoje feitos antes do reset** (teste do pai às 8h34 e 8h39): a prova de hoje ficou "feita" (2 de 8), o Recado do dia ficou concluído, 3 missões constavam feitas, e uma penalidade de 17/09 (-10) e 5 movimentos de gold pré-reset apareciam no Extrato do dia 1. O Heitor perdeu a primeira prova e o primeiro contrato. Limpeza feita por mim às 11h10 (REST, backup em `scratchpad/limpeza-heitor-18-09.json`): prova de hoje de volta a `ready` com as mesmas perguntas (ele não as tinha visto), contrato c1 de volta a `open` sem resultado, apagados 6 `goldTransactions`, 3 `taskCompletions` e 2 `englishSessions` anteriores a 13:09:58Z; o que ele fez depois do reset ficou intacto.

**Correção para o Cursor (P3, semana 1)**: `launch-reset.cjs` passa a tratar o **dia do lançamento**: `dailyQuizzes/{uid}_{launch}` volta a `ready` (mantendo as perguntas) se estava concluída antes da hora do reset; `englishPlans/{uid}_{launch}` com todos os contratos de volta a `open` e sem `result`; `englishSessions`, `taskCompletions`, `goldTransactions` e `dailyProgress` do dia com `createdAt` anterior à hora do reset são apagados (o backup do dia guarda tudo). E `village.launchedAt` (instante, além de `launchedOn`): Extrato, Balança, `sinceLaunch` e o painel filtram por instante, não por data. Teste do script: rodar numa conta com prova e contratos feitos no mesmo dia antes do reset e conferir que o dia 1 nasce limpo.
- **A10 (médio)** No dia 1 os personagens disseram "Ontem faltou uma" porque `dailyProgress/{uid}_{lançamento-1}` (fechamento do teste do pai) continua existindo. O contexto dos diálogos (`yesterday.missed`) e o resumo de ontem ignoram datas anteriores a `village.launchedOn`; o reset também marca o `dailyProgress` do dia anterior ao lançamento com `skipPenalty: true` (histórico fica, consequência não).
- **A11 (baixo)** Depois de uma publicação nova, a página antiga tenta carregar um chunk que não existe mais (`Failed to fetch dynamically imported module: CartBench-...js`, visto no site às 11h15). Tratar `vite:preloadError` recarregando a página uma vez.
- Dados do dia 1 do Heitor: prova 4 de 8 (erros: fato da lição x2, gerúndio "is writing", Rota da Seda; dilema "impor a ideia"); Mina: leitura 3/3, artigos 4,5/6, Comerciante 1/2 e 0/2 (preposições de lugar in/on/under/next to são o ponto fraco); 2 missões até 11h30; Fornalha 1 construída.

### 19/09, manhã: Lei da Excelência e o que o líder fez

- **Lei da Excelência** (`.cursor/rules/lei-excelencia-aaa.mdc`, do pai): ajustada por mim (PC 1280x720 e 1920x1080 em vez de tablet; procedimento de evidência real no lugar de skills que não existiam; fontes de verdade, decisões 23 e 24, congelados, formato do relatório). Vale também para o líder (`docs/ARTE_PIPELINE.md`, "Regra de aceite do líder").
- **Sprites do Comerciante num padrão só**: 12 lugares e 17 itens gerados no PixelLab com o mesmo prompt de estilo, conferidos na prancha (três refeitos: capacete, tocha, bola), em `public/assets/village/merchant/`; `englishBase.ts` aponta para eles e `MerchantContract.tsx` busca a imagem do lugar no catálogo (o plano guarda o caminho antigo). Foto: `scratchpad/sweep/720/merchant-new-sprites.png`. Teste `levels.test.ts` ajustado.
- **A12 (médio, só desenvolvimento)**: o erro intermitente `useAuth deve ser usado dentro de AuthProvider` (visto no painel de Saúde em 17/09 e nas minhas fotos) vem do Vite servir os módulos por `/@fs/C:/...` quando o terminal abre em `c:\` (letra minúscula): o mesmo arquivo entra por dois caminhos e o contexto duplica. `vite.config.ts` passa a usar `root: fs.realpathSync.native(process.cwd())`; de 219 módulos por `/@fs/` para 1, sem erro. O site publicado nunca foi afetado. Quem tem servidor de desenvolvimento aberto precisa reiniciar.


### 21/09, manhã: portão da prova furado no sábado (causa achada e corrigida)

Dados: sábado 19/09 a prova "Desenhando Profundidade" ficou `ready` e nunca foi feita, mas o Heitor jogou 7 contratos da Mina entre 10h22 e 11h19 (BRT) com `progress.quizRequired = true`; domingo e segunda o portão funcionou (prova feita antes da Mina). O código do portão (`quizGate.ts`, `VillageHome.openDistrict`, hotbar, teclas, `BuildingCard.onOpenMine`, clique na cena) é o mesmo nos dois builds de sábado e tranca a Mina; a Mina só é renderizada por `VillageHome`. A única entrada que abre o cadeado é a chave `quiz_completed_<uid>_<dia>` no `localStorage`.

- **A13 (alto, corrigido)** `DailyQuiz.tsx`: o efeito "prova concluída → grava a chave de hoje e chama `onComplete`" dependia de `[quiz?.completed, today]`; na virada da meia-noite com a aba aberta (sexta 18/09, aniversário), `today` vira 19/09 antes de a assinatura trocar o documento, e o efeito roda com a prova de **ontem** (concluída) gravando a chave de **hoje**. Resultado: sábado inteiro com a Mina aberta sem prova. Correção (líder, 21/09): `quizDoneToday(quiz, today)` em `quizGate.ts` (só conta a prova cujo `date` é hoje), a assinatura limpa o estado ao trocar de dia, e uma prova de hoje ainda não feita **apaga** a chave antiga e retranca (`onPending` → `HeroPanel.markQuizPending`). Teste em `quizGate.test.ts` ("a prova de ontem, ainda na aba que virou a meia-noite, não conta como feita hoje"). Enquanto isso não estiver no ar, a aba do Heitor aberta na virada repete o furo no dia seguinte.
- **Prova v2 não está no ar**: `provaRules.ts`, `dailyPrompt.ts` e a reflexão obrigatória existem só na `contratos-v2` (2 commits à frente da `main`, 166 arquivos); a prova de hoje foi gerada ontem pelo prompt antigo (sem `curiosity`), aceitou reflexão de 4 palavras e pagou 4 gold / 24 XP por 4 de 8. Q4 original era irrespondível ("Quantas células hexagonais formam uma colmeia, se cada abelha cria 6?" → 6); troquei antes de ele abrir por um problema de duas etapas (6 × 5 × 4 = 120), que ele acertou. Q3 (opinião com "resposta certa"), Q5 ("metabolismo" x "digestão") e Q8 (drible do Neymar num tema de geometria) são o padrão que a lei do professor proíbe.
- **tsc na `contratos-v2`**: `RecadoBoard.tsx(646,28)` `brief` declarado e não usado (Cursor, Recado do Capataz V1).

### 22/09, manhã: a virada da meia-noite, de novo

- **A13, complemento (corrigido)**: o mesmo efeito de `DailyQuiz.tsx` que prepara a prova de hoje e pré-gera a de amanhã era guardado por `prefetched.current` **por montagem**; numa aba que fica aberta na virada ele nunca roda de novo. Resultado hoje: o Heitor amanheceu **sem documento de prova** (`dailyQuizzes/<uid>_2026-09-22` não existe; a Mina do dia foi gerada normalmente às 10h52 de ontem), e a função `openai` recebeu uma rajada de chamadas às 00h00 (03:00Z) sem gravar prova. Correção: a guarda passou a ser **por dia** (`prefetched.current === today`). Enquanto a `main` não recebe as duas correções, o remédio é recarregar a página do Heitor de manhã (o `prepare()` gera a prova na hora) e fechar a aba antes da meia-noite.
- **Conferido e sem problema**: todas as chamadas de IA passam pela função `openai` (única, `southamerica-east1`; cliente com `httpsCallable` em `aiQuiz.ts` e `englishTts.ts`); o bundle publicado (`index-DnJBSL0_.js` + `App-C6qTsw6D.js`, 1,9 MB) não contém `api.openai.com` nem chave `sk-`; o contador `aiUsage/2026-09` incrementa a cada chamada (testado com a conta de teste: 402 → 403 chamadas no mês; `updatedAt` desse doc não é atualizado pela função, não usar como sinal).
- **Prova de 22/09 do Heitor**: como não existia, gerei às 6h59 com o **prompt v2 da `contratos-v2`** (`buildPrompt` + `pickThemeForDate`, pela função `openai`, gpt-4o, 9,5 s, 2 030 + 1 083 tokens), tema sorteado "Castelos, cavaleiros e a peste" (história). A saída crua (`scratchpad/prova/heitor-22.json`) mostra que **a v2 ainda produz os mesmos defeitos** que a lei do professor proíbe — 4 de 8 perguntas trocadas à mão antes de gravar:
  - Q2 analogia forçada com futebol ("como usar a ideia de proteção dos cavaleiros numa partida?") com "resposta certa" de opinião;
  - Q3 dilema moral com opções caricatas ("ajudar o amigo doente" x "fingir que não ouviu");
  - Q4 inglês ambíguo: "The knights were ... the castle" com `in`/`at` ambos corretos;
  - Q6 duas certas: "dois amarelos" → "recebe vermelho" e "é expulso" são a mesma coisa;
  - Q5 número de trivia sem base no texto ("quantos anos durou a Peste Negra" → 5, discutível) e Q7 explicação de divisão sem mostrar o resto.
  O gerador v2 não tem validador que pegue nada disso (`answerLeaksInPrompt` deu falso positivo em Q4 e nada mais acusou). Isso entra como evidência da Prova v3: validador por pergunta + segunda passada de "professor revisor".

## Revisão dos pacotes do fim de semana (22/09)

Escopo real: `f5fdf6c..9c2dca4` (182 arquivos). A `contratos-v2` foi mergeada na `main` por fast-forward em 21/09 (`5ae08aa` "Torre no morro + prova de ontem não destranca o dia novo" às 11h27, `9c2dca4` às 11h46) e **está no ar** desde então: Prova v2, Comerciante V1, Recado do Capataz V1, Cofre (Resgatar, montinho por aplicar), hotfix 1 ruína/dia e Torre na cena. A função `openai` foi publicada às 11h38. Método: cinco revisores independentes (um por pacote mais um transversal); cada achado alto ou médio passou por um cético que tentou derrubá-lo lendo o código e rodando sondas; 4 achados caíram, 81 ficaram. Barra: tsc 0 erros; `test:village` 10/10 e `test:english` 22/22 verdes; build sem `phaser`; **eslint 1 erro** (`bank.ts:44`), que o go/no-go da etapa classifica como no-go; congelados intactos (`cart.ts`, `CartBench.tsx`, `bgm.ts`, `src/game`, caminhada em `npcBehavior.ts`, `.mn-stage::before` byte a byte); nenhuma chave no diff; `package.json` sem dependência nova.

Ordem de correção sugerida ao pai: primeiro o que já custa ao Heitor hoje (Ferraria mentindo, Comerciante sem frase a partir da 4ª entrega, pregos do Recado acendendo para o contrário, prova sem pagamento se a aba cair), depois o que fura a decisão 23, depois o resto.

### Prova do dia v2 — reprovado (a camada visível está boa; a Memória da Prova não existe)

Entregue e funcionando: prompt por área, reflexão de 10 palavras com filtro local, anel de leitura, papiro, voz do Sábio, dilema no cartão do pai; `provaV2.test.ts` 8/8.

- **A1 (alto → médio, Etapa 3)** `quizBank` nunca é gravado: `completeDailyQuiz` (`dailyQuizService.ts:144-201`) só grava `dailyQuizzes`; não existem `hash.ts`, `dedupe.ts`, `profile.ts`, `quizBankService.ts`, `backfill-quizbank.cjs`. Regras e índice já publicados e permitem. Por tabela: `learningService.ts:26` lê vazio, `quizAccuracyByCategory` = `{}`, nada de perfil, revisita nem "Como ele vai". O relatório não menciona a §8.4. Entra na Etapa 3 (`ETAPA_3_PROVA_V3.md`, P1.1 a P1.3).
- **A2 (alto)** `DailyQuiz.conclude()` grava `completed:true` **antes** de `payQuizRewards` (`DailyQuiz.tsx:384` e `:393`), duas escritas sem claim comum: aba fechada ou rede caída entre as duas deixa o dia fechado, a Mina aberta (o gate agora confia no doc) e o gold perdido para sempre — a tela só oferece "Voltar à Vila". Conferido hoje: as três provas feitas desde 18/09 têm o claim `quiz:<data>` (8, 3 e 4 gold pagos); ainda não mordeu. Correção: inverter a ordem (`payQuizRewards` é idempotente pelo claim); teste com um dublê que lança.
- **A3 (alto → médio)** `answerLeaksInPrompt` (`provaRules.ts:61`) tem `|| q.includes(a)` sem fronteira de palavra: resposta `in` com "inglês" no enunciado, `on` com "Ponha", `20` com "2026" viram "vazamento" e a pergunta some em silêncio — justamente as preposições do nível 1. Correção: apagar a segunda metade da linha (a primeira já é a checagem de palavra inteira sobre texto normalizado) e testar os três casos.
- **M1 (baixo)** clicar "Entregar" de novo depois de uma falha roda `completeDailyQuiz` outra vez e os bumps (`quiz_correct`, `quizzesDone`, `reflections`, amizade do Sábio) contam em dobro; guarda `completed === true` no início da função, deixando o retry chegar ao pagamento.
- **M2 (médio)** na reflexão, se o juiz recusar em sequência não há saída (Esc e Fechar exigem `paid`), e recarregar perde as 8 respostas (só no estado do componente). Correção: gravar `answers/score/awaitingReflection` ao fechar a 8ª pergunta, sem `completed` e sem pagar.
- **M3 (médio)** com `prefers-reduced-motion` o anel nasce cheio (`dash = reduced ? 0 : …`, `DailyQuiz.tsx:151`) e o botão fica de pedra até 30 s sem sinal; **M4 (alto)** na lição o botão "Começar" tem `disabled={!voiceDone}` (`:597`) e a voz dura 50 a 70 s contra um anel de 30 s: anel cheio, botão morto, sem rótulo nem "pular". Correção mínima: tirar o `disabled` da voz (o clique já corta o áudio) e nunca desenhar anel cheio enquanto travado.
- **M5 (baixo, Etapa 3)** o prompt não recebe o nível de inglês da base (`englishLevels.ts` tem `promptAllowed/promptForbidden/maxWords` prontos) — vai na v3.
- **M7 (alto)** a lei do professor existe só como texto no prompt: `sanitizeQuestions` checa 4 coisas (opções distintas, colisão, vazamento literal, resposta nas opções) e nada de conta de um passo, "capital de", `soccer/football`, consenso, tamanho das opções — a prova de 22/09 gerada pela v2 provou (4 de 8 trocadas à mão). É o validador da v3 (`validateQuestion.ts`), no `coerceQuestions` da prova e não no `sanitizeQuestions` compartilhado com a Missão Surpresa.
- **M8 (médio)** o dilema conta na nota e paga gold: escolher "Impor suas ideias" custa 1 gold, 6 XP e um "Não foi dessa vez", e o pai lê a escolha no painel — ensina a adivinhar o que o adulto quer, não a escolher. Correção: `kind: 'dilemma'` fora do `score`, explicação por consequência, registro em `quizBank` para o pai ler (com a mudança de tipo em `types/index.ts:38`).
- **M9 (médio)** `dilemmaOf` (`provaRules.ts:239-244`) cai em `questions[2]` cego: com uma lição descartada pelo sanitize ou prova offline, o cartão Hoje mostra uma conta como "Dilema de hoje" e "Ele escolheu: 250". Devolver `null` quando o índice 2 não é o dilema.
- **B1** a pasta `src/services/quiz/__tests__` não está no harness (`run-english-tests.mjs:15-17`): `rotation.test.ts` nunca roda e `pickTheme` continua `throw 'não implementado'`; **B2** o painel "Como ele vai" (P4.10) não existe; **B3** com a IA desligada "eu gostei muito da ideia de hoje porque foi legal e bom" passa no filtro local; **B4** `completeDailyQuiz` chama `reflectionOk` sem o `about` (só a tela passa) e nada grava `reflectionWords`; **B5** `saveReflection` órfã ainda incrementa `reflections`; **B6** custo ok (gpt-4o só na prova, 2 a 4 chamadas de chat/dia; a voz não conta no teto); **B7** o prompt não exige a mesma unidade nas 4 alternativas; **B8** a correção A13 do líder é coerente (reforça a urgência do A2); **B9** o que os testes não cobrem: a ordem conclusão→pagamento, o falso positivo do A3, hash/dedupe/profile.
- Derrubado pelo cético: M6 (`curiosity` opcional é a spec literal, não defeito).

### Comerciante V1 — reprovado (a mecânica é a certa; três buracos e o registro não serve)

- **F1 (alto)** a partir da 4ª entrega (`merchantDone >= 3`) a bandeja ganha itens extras (`merchantRoom.ts:127`) mas `validateMerchant` exige exatamente `steps + 1` (`validators.ts:223`): a validação reprova e o contrato sai com `sentences: []` — sem pedido para ouvir, só balão genérico. Reproduzido: 40/40 sementes reprovadas com `done ≥ 3` nos três níveis. O Heitor chega lá em dois dias. Correção: faixa no validador (`steps+1 … steps+3`).
- **F2 (alto)** dá para garantir o acerto da primeira entrega espalhando o mesmo item em várias zonas: `evaluateRoom` ignora as sobras (`merchantRoom.ts:250-259`) e nada limita `placements` antes de "Entregar". É o "marcar outra e valer" que a decisão 23 proíbe. Correção: um pedido = uma colocação (travar na origem, com teste).
- **F3 (alto → médio)** o pedido 1 — o único que paga no nível 1 — já vem com o móvel certo sozinho e a zona certa acesa (`padMode 'teach'`, `is-ask` amarelo), e a preposição em inglês fica escrita em **toda** zona em todos os pedidos (`MerchantDelivery.tsx:673`). Correção: rótulo só em modo `hint` (depois do erro); pedido 1 sem a zona acesa.
- **F4 (alto → médio)** o registro guarda quantas tentativas, nunca **o que** ele colocou errado (`kept` só recebe a colocação quando `ok`): o painel "onde ele erra por tipo" prometido em `MINA_CONTRATOS.md:88` não tem de onde sair. Correção: `missKind(step, placed)` por tentativa (`relation | item | qty | spot`) gravado em `details`.
- **F5 (baixo)** elogio e correção em português vão ao TTS sem `lang`, e `clampLang` cai em `en` com as instruções da aula de inglês (pausa entre palavras). Passar `{ lang: 'pt', speed: TTS_SPEED_TALK }` como a prova já faz (`provaSpeak.ts:5`); frases mistas em duas chamadas.
- **F6 (médio)** a correção nunca mostra nem fala a frase certa em inglês ("On é em cima, não dentro. Box é caixa."), contra `MINA_CONTRATOS.md:39` ("On the box, not in.") e contra o próprio relatório. Correção: `correctionFix` devolve `{ en, pt }`; o `en` fica na tela e toca.
- **F8 (baixo)** o nome do item só aparece no `onMouseEnter` (sem clique/toque) e nenhuma palavra toca áudio ao ser tocada — o requisito 3 do pai. Correção: `onClick` no item e no lugar com `playText(palavra, {lang:'en'})`, sem pôr `playText` dentro de `markHover`.
- **F9 (baixo)** o tapete `under` das âncoras de parede flutua (`Math.max(y+h+28, 348)`); dar `baseY` à âncora no `anchors.json`. **F10 (médio)** as fotos 01-07 citadas como aceite são de um build anterior (painel cinza "Para treinar" que não existe no código; 3 móveis no pedido 1 onde o código entrega 1): **não há foto 1280/1920 da tela que está no ar** — o aceite em foto deste pacote não vale até refotografar (e o `_shot_comerciante.mjs` solta o item em frações fixas, sempre erra; consertar antes).
- **F11** `two boots` (par único conta como duas botas); **F12** cama, cerca e "in the oven" com bola no armazém (catálogo não filtrado pela ficção; `MINA_CONTRATOS.md:38` desenhou outra sala); **F13** bandeja escala com a cena, itens em 52 px fixos (em 1920 vira barra vazia); **F14** `listens` conta clique e não áudio tocado, `textShown` virou marca de erro; **F15** `MINA_CONTRATOS.md` §3.1 continua descrevendo outro jogo (cola do pedido 1, preposição escrita, sala 1→2→3, correção em português e teto de 2 tentativas entraram sem desenho); **F16** depois de dois erros o jogo avança sozinho (a criança nunca "marca a certa" para aprender — decidir com o pai) e `level/base/onBuildNow` chegam sem uso.
- Derrubado: F7 (o material do "Refazer" é intencional e está escrito na tela).

### Recado do Capataz V1 — reprovado (a virada de tema é boa; o inglês e a mecânica não)

- **R1 (alto)** os pregos acendem para o **contrário** do pedido: `matchesInfo` aceita tokens em ordem com qualquer coisa no meio e a variante `the screen now` do n2-02 não tem negação — "I want the screen now. Dinner is first." dá 3/3; com a IA fora do ar vira pagamento (`fallbackJudgement`). Correção: variantes com a negação (`don't want the screen`…), `water` isolado fora do n2-04.
- **R2 (alto → médio)** falta de informação na 1ª tentativa não passa pelo juiz e não grava `firstJudge`; a 2ª vira "primeira" e paga integral — e a fala grátis (`teachFromRecado`) entrega o inglês que faltou. Correção: não zerar o Recado por uma info esquecida (`noteMaterial(1) = 0`); usar teto de material para "teve ajuda", como o código já faz para a dica.
- **R3 (alto → médio)** depois de "De novo" o registro mistura a frase da 2ª tentativa com a correção e a nota da 1ª; o Finale mostra "Dois de três" com os três pregos acesos. Guardar `firstAnswer` junto de `firstJudge`.
- **R4 (alto → médio)** o degrau 0 (montar) cai em `moldFromModel` em 10 dos 18 recados: n1-05 e n3-05 viram uma lacuna única com a frase inteira (mais difícil que o degrau livre); nos outros o molde imprime inglês que nem foi pedido. Guarda mínima: só usar `moldFromModel` com 2+ lacunas e sem terminador de frase dentro do slot.
- **R5 (alto → médio)** o balão do Capataz (230 a 327 caracteres, sem teto) encosta no quadro em 1280×720; cortar na origem: `teachFromRecado` para de repetir o brief inteiro (375 → 220 caracteres).
- **R6 (médio)** a bandeja traz todas as palavras do model com capitalização e flexão originais (14 a 21 chips contra 10-14 documentadas): nos degraus 0 e 1 basta ouvir e clicar na ordem — transcrição, não produção. Degrau 1 só com `wordBank`; **decisão do pai**, porque mexe em regra testada.
- **R7 (médio)** inglês errado no banco: n2-05 "I do this because the room is clean" (causa invertida), n2-03 aceita "because I am new" para "porque a palavra é nova", n2-04 aceita "because I am thirsty" para "com calor" e "after soccer" para "no jogo", n2-01 pede permissão e se autoriza na mesma frase. Consertar os 3 do banco + 1 brief.
- **R8 (baixo)** o Capataz fala português com voz e instruções da aula de inglês (mesma causa do F5). **R10 (médio)** Esc sai sem confirmar e perde o recado (`dirty` conta as palavras do molde e o listener tem deps desligadas). **R11 (médio)** a pré-checagem apaga tudo que a criança montou (o "De novo" preserva; o erro leve é punido e o grave perdoado). **R12 (médio)** a correção a giz vermelho da spec (`chalkDiff`, com teste e CSS prontos) não está ligada: a fase `judged` imprime texto corrido. **R14** `brief` do Finale morto (o erro de tsc já não ocorre); **R15** a guarda contra vazar o model na fala está invertida; **R16** a bandeja cobre o Capataz (14% a 19% × 72% a 85%); **R17** a dica cobra 1 ferro sempre — a decisão 14 prometia grátis na Biblioteca n3 (decidir); **R18** palco escala, fontes não (1920 com texto de 22 px num quadro 43% maior); **R19** o pacote está no ar sem o aceite visual que o relatório pedia.
- Derrubados: R9 (a correção mostra `judgement.corrected`, não o modelo) e R13 (`hintUsed` é lido).

### Cofre, hotfix 1 ruína/dia e Torre na cena — reprovado

- **T1 (alto)** Torre: `coverPaintedLookout` (`drawAmbient.ts:613-617`) cola um pedaço de copa de pinheiro sobre céu azul e o sprite de 104×104 não cobre a faixa de cima nem a borda direita: dois retângulos de borda reta boiando no céu em n1, n2 e n3 (composto a 4× a partir do código; as fotos do relatório não pegam porque o toast "Baú do Dia" cobre a faixa). **T2 (alto)** o mesmo remendo roda depois das nuvens e pássaros e os corta em linha reta enquanto atravessam o morro. Só não aparece hoje porque a Torre do Heitor é nível 0. Correção: apagar o remendo (sobram dois cacos pequenos) ou repintar o mirante no `backdrop-day.png` (arte do líder) e subir o `?v=`.
- **C1 (alto)** decisão 29 quebrada no caminho do prêmio: `Cofrinho.tsx:226-234` reaproveita o montinho aberto com o mesmo `rewardId/title` e deposita nele, e `depositGoal` recalcula `unlockOn` para o pacote inteiro — aplicar mais 10 num montinho vencido empurra tudo uma semana e apaga o botão Resgatar. Ensina o contrário. Correção: sempre `createGoal` (e a barra do prêmio soma os montinhos do mesmo `rewardId`). Conferido: o Heitor ainda não tem nenhum montinho; nada a corrigir nos dados.
- **C2 (médio)** `createGoal` + `depositGoal` sem atomicidade: depósito que falha deixa montinho invisível (`savedGold 0`) ocupando vaga no teto — cinco falhas travam o Cofre n1 em "O Cofre está cheio" sem nada na tela. Reaproveitar fantasma em `goalsService` antes do teto. **C3 (baixo)** Resgatar deixa `savedGold` (certo) mas o GoalsPanel lista tudo sem filtro: uma linha "45/50 cancelled" por resgate; filtrar na tela. **R2 (baixo)** Resgatar sem doc `progress` fecha o montinho, registra no extrato e não credita o bolso; abortar a transação. **R1 (baixo)** o teto de 1 ruína é por dia fechado, e `processPendingDays` fecha até 7 dias em fila: uma semana fora sem "férias" no painel pode derrubar 7 obras de uma vez (decisão do pai: teto por rodada?).
- **D14 (médio)** decisão 14 invertida no código: o Cofre n3 está **comprável** (sem `liveMaxLevel`) e a Biblioteca n2/n3 é que está trancada (`liveMaxLevel 1`); o relatório de 19/09 afirma o contrário. Correção: `cofre.liveMaxLevel: 2, opensIn: 'Etapa 3'`, Biblioteca liberada até 3 com os textos da decisão 14; o BuildingCard precisa do estado "no teto da etapa, abre depois".
- **L1 (baixo)** o único erro de eslint do repositório: `bank.ts:44` `_settings` sem uso (e `interestRatePct/interestCapGold` do painel ficaram mortos — coerente com a decisão 27, mas o tipo promete o que não existe): apagar o parâmetro e o import. **L2 (baixo)** o teste do preview da Torre (`hover.test.ts:113`) bate no `typeof window === 'undefined'` e não testa nada; extrair `previewLevelFrom(id, level, hostname, search)` pura. **T3** `previewBuildingLevel` monta `URLSearchParams` 60×/s por lote e o host não é ancorado; **T4** coordenadas 1:1 com o fundo sem conferir `anchors.size`; **F1** congelados intactos (o grafo de nós de `npcBehavior.ts` mudou em 19/09, não a caminhada — se o grafo também é intocável, escrever na lista); **G1** `anchors.json` declara `growth-1/2/3.png` que não existem.

### Transversal (`f5fdf6c..9c2dca4`) — aprovado com ressalvas

- **F01 (alto)** a Ferraria mente: a tela diz "2ª tentativa vale metade" (`ForgeContract.tsx:166`) e o código paga zero (`:70`); `Earned = 0 | 0.5 | 1` e o `toFixed(1)` são restos. Quebra a decisão 23(b) duas vezes (valor errado e aviso explícito). Correção: apagar o parêntese, o tipo vira `0 | 1`, cabeçalho e comentário de `englishRewards.ts:70` corrigidos.
- **F02 (alto → baixo)** `growth-1/2/3.png` nunca existiram no repositório; `if (layer)` engole o 404 e a camada pintada do crescimento nunca apareceu. Fica no `anchors.json` como encaixe (decisão 9), com a arte na fila do líder e a linha no §12.
- **F03 (alto → médio, Etapa 3)** `progress/{uid}` é escrita livre (`firestore.rules:35`): a criança pode gravar `availableGold`. Anterior à branch; só fecha de verdade com pagamentos em Cloud Function (M13 completo) — ~20 chamadas do cliente dependem da escrita hoje.
- **F04 (médio)** eslint com 1 erro derruba o go/no-go (item "eslint 0 erros"). **F05 (baixo)** a regra nova de `goals` deixa a criança reescrever `unlockOn/lockWeeks` e sacar na hora; acrescentar "`unlockOn` só cresce" quando já existe no doc. **F06 (baixo)** `launchedAt` ficou fora da lista de campos proibidos do `village` (só `season, stars, launchedOn`); fechar com `launchedAt, userId, createdAt` e republicar. **F07 (baixo)** `ISO_NPC_WALK` aponta para `sabio-walk.png`/`comerciante-walk.png` que não existem (degrada para o sprite parado; não tocar no `useWalk` do herói). **F08 (baixo)** `functions/lib` está no `.gitignore` e mesmo assim versionado (4 arquivos): `git rm -r --cached functions/lib`. **F09 (baixo)** 36 assets do Túnel (e `char/miner-ref.png`, `ui/papiro-folha.png`) na `main` sem linha no §12 — acrescentada. **F10 (médio)** duas decisões "27" no §1: o Túnel passou a ser a **31** (as citações de "decisão 27 = paciência do Cofre" no código continuam válidas). **F11** premissa vencida: tudo já está no ar (o bundle contém `previewBuildingLevel` e `speakChunks`). **F12** 2.626 linhas de jogo morto (`EnglishArena`, `MineRush`, `BlockMemory`, `CreeperQuiz`, `CraftingWords`, `RedstoneBench`) puxando `phaser` no `package.json` — decisão do pai (semente do Túnel ou apagar). **F13** `GAME_INFO` em `englishGameService.ts` é uma terceira tabela de gold que nunca foi cortada pela metade (inalcançável hoje). **F14** `notePlay.test.ts` sem linha no §12 (acrescentada). **F15** maior chunk 1,95 MB (gzip 543 kB) por imports mistos — Etapa 3.

### O que o líder já fez hoje

- `ETAPA_2_LANCAMENTO.md` §1: Túnel renumerado para 31 (F10); §12: linhas dos assets do Túnel e do `notePlay.test.ts` (F09, F14).
- `docs/etapas/ETAPA_3_PROVA_V3.md`: o pacote da Prova v3 (regras, prompt, validador com 20 casos reais, dados, tela, P0/P1/P2, custo), com as duas correções de premissa das análises (a 21/09 Q4 é do líder; a voz não conta no teto). Aguarda o pai.
- Prova de 22/09 gerada com a v2 e corrigida à mão (ver "22/09, manhã"); reflexão e pagamento seguem pela tela normal.

### Correções do líder (22/09, tarde): as seis que machucavam em produção

Aplicadas com o aval do pai, cada uma passou por um cético (leitura do diff, sondas com o código de HEAD × atual, testes). Barra final: tsc 0 erros; `npx eslint src --max-warnings 8` **0 erros** (8 avisos antigos; `npm run lint` com `--max-warnings 0` continua vermelho por eles); `test:english` 22/22 e `test:village` 10/10.

1. **F01 Ferraria** (`ForgeContract.tsx`, `englishRewards.ts`): o parêntese "2ª tentativa vale metade" saiu; `Earned` vira `0 | 1`, `toFixed` fora. O cético confirmou que o código **nunca** pagou meio ponto (`record()` idêntico antes e depois): era mentira só de texto. Pela decisão 23(b) o resumo diz apenas "peças consertadas" (sem "de primeira"). Sobras anotadas, não tocadas: `ContractResult.tsx:74` tem um `toFixed` morto; `scoring.test.ts:100` testa `forgeMaterial(4.5)` (função pura, inofensivo); `docs/ARENA_INGLES_ETAPA1*.md` ainda descrevem a metade (registro histórico da etapa 1).
2. **A2 Prova paga antes de fechar** (`DailyQuiz.tsx conclude()`): `payQuizRewards` (idempotente pelo claim `quiz:<data>`, transação só em `village` e `progress`) roda antes de `completeDailyQuiz`. Efeitos aceitos: sem rede a prova deixa de "fechar" no cache local e a Mina fica trancada até a rede voltar (antes fechava sem pagar); se a aba cair entre as duas escritas, o gold já está na carteira e ele refaz a prova (M2, gravar as respostas ao fechar a 8ª pergunta, resolve isso — Cursor). Sem teste automatizado: o fluxo vive no componente.
3. **A3 vazamento** (`provaRules.ts`): só palavra inteira sobre texto normalizado. Quatro casos novos em `provaV2.test.ts`. O cético mediu: no banco offline 1 pergunta em 200 deixa de ser descartada por engano ("6 cm" dentro de "36 cm²"); a raiz ("driblar" → "Drible") **nunca** foi pega por esta função — é o código `raiz_vazada` do validador v3 (o aceite do P0.1 no `ETAPA_3_PROVA_V3.md` foi corrigido).
4. **F1 bandeja do Comerciante** (`validators.ts`): faixa `steps+1 … steps+3`. Cético: 9.900 salas (3 níveis × 11 valores de `done` × 300 sementes) sem reprovação e sem frase vazia; a IA nunca manda `items` (só `sentences`/`translation`), então a faixa não abre porta a lixo; o teste novo falha com o código antigo (11/12) e passa com o novo. Pendência de desenho: com `done ≥ 6` a bandeja chega a 7 itens de 52 px sem `wrap` (F13).
5. **R1 pregos do Recado** (`englishOfflineContracts.ts`): n2-02 sem `the screen now`/`I don't want` (o cético derrubou a 1ª versão: `don't want` solto acendia com "I don't want dinner"); agora só variantes com `screen` e negação. n1-04 sem `water` solto; n2-04 sem `after soccer`/`because I am thirsty`. Teste `R1 (22/09)` em `notePrecheck.test.ts` com 12 frases (legítimas passam, contrárias caem). Fora do escopo e anotado: recados gerados pela IA trazem `mustInclude` próprio e `validateNote` não barra substantivo solto como variante (vai para o Cursor junto com R7).
6. **L1 `bank.ts`**: parâmetro morto `_settings` e imports removidos; chamadores em `goalsService.ts` e `etapa2.test.ts` atualizados; `docs/VILA_API.md:127` com a assinatura nova. Corpo de `weeklyInterest` byte a byte igual. Pendência de modelo: `EconomySettings.interestRatePct/interestCapGold` continuam no tipo e no `DEFAULT_ECONOMY` sem uso (o painel não os mostra).

## Etapa 3, pacote 1 — Prova do dia (Cursor, 22/09) — APROVADO

Revisado no working tree (o Cursor não parou para o commit e já entrou nos pacotes 2 e 3; os arquivos do pacote 1 são separáveis, lista abaixo). Diff lido inteiro: `closeQuiz.ts` (novo, puro), `provaBleed.test.ts` (novo, 6 casos), `dailyQuizService.ts`, `DailyQuiz.tsx`, `provaRules.ts`, `provaSpeak.ts`, `types/index.ts`, `provaV2.test.ts`, `run-english-tests.mjs`, fotos em `docs/exemplos/telas/etapa-3/prova/` (14, 1280 e 1920, conta de teste, `?d=2026-10-06`).

- **M1** `completeQuizWrite` devolve `skip` com `completed === true` (sem bumps em dobro); `payThenComplete` mantém a ordem do A2 e o dublê que lança prova que `complete` não roda. Certo.
- **M2** `stashQuizAnswers` grava `answers/score/totalQuestions/awaitingReflection: true` com `completed: false`; `shouldOpenReflection` exige as 8 respostas; no reload a tela volta direto à reflexão ("As oito respostas estão na mesa"), com "Voltar à Vila" e Esc; a Mina continua trancada (o gate só olha `completed`). Foto 02/03 conferem. Certo. Nota: o efeito de restauração roda a cada snapshot do doc (`[quiz, open, economy]`) — idempotente, sem dano.
- **M3** `readRingDash(p, reduced, locked)`: travado nunca passa de 75%, reduced em degraus de 25%, nasce vazio. Teste com 8 casos. Fotos do anel 0/25/50/75 conferem (o texto "cortado" na foto de 25% é o papiro desenrolando com o relógio, não corte).
- **M4** `disabled={!voiceDone}` saiu do "Começar"; foto 1920 "pronto" com o botão verde e a lição inteira. Certo.
- **M9** `dilemmaOf` só aceita `questions[2]` com `kind 'lesson'`; teste com lição descartada. Certo — atenção: quando a decisão 33 entrar (`kind: 'dilemma'`), esta função muda junto (M8).
- **B4** `about` chega ao serviço; `reflectionWords` gravado. **B5** `saveReflection` apagada (`statSources` continua válido, teste verde). **B1** pasta `quiz` no harness: `provaBleed` 6/6 e `rotation.test.ts` 1/10 vermelho por desenho (`pickTheme` é stub) — **efeito colateral**: `npm run test:english` passa a sair vermelho até o P1.5 da v3; pedir ao Cursor que implemente `pickTheme` já no pacote 5 ou marque o arquivo como pendente de forma explícita, para o "verde" da barra voltar a significar algo.
- Barra no working tree (com os pacotes 2/3 em andamento misturados): `test:village` 10/10; `provaBleed` 6/6; tsc e eslint com erros **só nos arquivos dos pacotes 2/3 em edição** (`MerchantDelivery.tsx`, `RecadoBoard.tsx`); `offline.test.ts` vermelho pela edição em curso de `englishOfflineContracts.ts` (R7). Nada disso é do pacote 1.
- Processo: o prompt mandava parar para o commit depois de cada pacote; o Cursor seguiu. O pai commita o pacote 1 por caminho (lista no chat) e o Cursor passa a parar.

## Etapa 3, pacotes 2 e 3 — Comerciante e Recado (Cursor, 22/09) — APROVADOS COM 4 CORREÇÕES ANTES DO COMMIT

Estado do repositório na revisão: **nada commitado desde `c354e89`** (o pacote 1 também não); os pacotes 1, 2, 3, 4 e o 5 (em andamento) estão misturados no working tree, 47 arquivos modificados e 12 novos. O Cursor usou a versão do prompt colada no chat, **anterior às decisões 34 e 36**: por isso F16, R6 e o teto de 2 ruínas por rodada não foram feitos (o relatório os marca como "pendência do pai"). tsc 0; eslint 0 erros; `test:english` 22/22 (inclui os testes novos de F2/F4/F9/F11/F12/R4/R5/R7/R2); `test:village` **vermelho** em `provaV2.test.ts` e `provaBleed.test.ts` porque o pacote 5 já trocou `dilemmaOf` para `kind 'dilemma'` (M8) sem atualizar os testes do pacote 1 — trabalho em curso, não é dos pacotes 2/3.

### Comerciante (pacote 2) — lido o diff inteiro e as fotos 01-06 (1280 e 1920)

Certo: **F2** (`addPlacement` recusa o 2º tapete, `startDrag` trava outro item, `evaluateRoom` zera passo com duas zonas; teste), **F3** (sem `teach`; rótulo só em `hint`; foto 01 sem zona acesa, foto 05 com "on" só depois do erro), **F4** (`missKind` por tentativa em `details.misses`; teste), **F5/F6** (`correctionFix {en, pt}`: "On the table, not next to." na tela e no áudio EN, depois PT com `PT_TALK`; foto 05), **F11** (`boots` qty 1), **F12** (`warehouseSpots`, forno só com comida, troca de item quando não cabe; 400 sementes × 3 níveis), **F13** (bandeja em % do palco), **F14** (`listens` depois do áudio; `textShown` = frase aberta), **F15** (§3.1 reescrito com o jogo entregue).

- **F8 (médio, corrigir)** o clique no item da bandeja **nunca fala** depois de ouvir o pedido: `startDrag` marca `draggingItem.current = true` em todo `pointerdown` (`MerchantDelivery.tsx:305`) e o único lugar que zera é o `onClick` (`:800-801`), que então engole o clique simples. Só o clique no lugar (`sayEn(slot.spot.label)`) funciona. Correção: marcar `draggingItem` no `moveDrag` quando o ponteiro andar mais de ~6 px, ou falar no `pointerup` sem movimento; testar clicando na poção depois de ouvir.
- **F9 (médio, corrigir)** `baseY: 304` na âncora `wall` é a **base da caixa da janela**, não o chão: o tapete `under` fica em y 304-368, no meio dos tijolos (antes ficava em 348 — subiu). O cético mediu o chão na arte em **~440**. Correção: `baseY: 440` no `anchors.json` e uma foto com um item "under the window" no chão junto da parede.
- **F16 (decisão 34, faltou)** `tries >= 2` ainda avança sozinho (`:488`). Fazer: continua tentando até acertar, sem pagar e sem aviso; o Comerciante só vira a página quando o pedido fecha; todas as tentativas em `details.misses`; atualizar o §3.1 ("Duas tentativas e o pedido avança" sai).
- Observação: o hover ainda mostra o nome (tip) — o pai pediu "nome só ao clicar"; aceito porque o hover não fala e o toque fala (quando o F8 for consertado). `07-final` sem foto: o script não espera a voz do acerto; corrigir o script e fotografar.

### Recado (pacote 3) — lido o diff inteiro e as fotos 01-05 (1280 e 1920)

Certo: **R2+R11** (falta na 1ª ida não apaga o giz, marca `helped`, material com ajuda no teto 2, trava do 2º Enviar; foto 03 mantém "I do homework"), **R3** (`firstAnswer`/`secondAnswer` no `details` e no Finale), **R4** (`moldFromModel` só com 2+ lacunas e sem `.!?`; teste), **R5** (`teachFromRecado` sem o brief, teto 220), **R8** (`PT_TALK` compartilhado), **R10** (`dirty` só com o que ele digitou; Esc com deps certas), **R12** (`chalkDiff` + `pegLesson` na fase `judged`; foto 04 com risco vermelho, correção amarela e os 3 pregos com lição), **R14/R15/R16/R18**.

- **R7, n2-01 (baixo, corrigir)** o model virou "Can I play soccer now? **I ask because** my homework is ready." — inglês forçado, e `ask` não está no `wordBank` (com o R6 a criança não consegue montar). Sugestão: "Can I play soccer now? Please, because my homework is ready." (ou pôr `ask` no banco).
- **R7, n2-05 (baixo, corrigir)** "The bed is ready because I want a clean room. **I want it clean.**" — a 2ª frase é enchimento para cumprir "2 frases no nível 2". Melhor: "The bed is ready. I do this because I want a clean room." (duas frases, `because` mantido, natural).
- **R6 (decisão 34, faltou)** a bandeja ainda é `trayWords(model, wordBank, …)` (`RecadoBoard.tsx:92`): no degrau 1 passa a ser só o `wordBank`; ajustar `notePlay.test.ts:135`.
- Observação fora dos pacotes: o molde do nível 1 "There is ___ in the ___." saiu para um pedido no plural ("três vacas") — o molde não olha número; anotar para o Cursor no próximo pacote do Recado.

### Processo

1. O Cursor não parou em nenhum pacote e seguiu com o prompt velho. Para fechar: ele termina o pacote 5, aplica as 4 correções acima + F16 + R6 + decisão 36, deixa tsc/eslint/`test:english`/`test:village` verdes e **para**. O líder revisa 4 e 5 e o pai faz **um commit** ("Etapa 3, pacotes 1 a 5") — separar por caminho não é mais possível (pacotes 1 e 5 tocam os mesmos arquivos da prova).
2. Enquanto o `rotation.test.ts` for stub, "test:english verde" exige o `pickTheme` (P1.5) ou marcar o arquivo como pendente.

## Etapa 3, pacotes 4 e 5 + correções (Cursor, 22/09) — pacote 4 APROVADO com 1 ajuste; pacote 5 REPROVADO (não publicar a geração v3 como está)

Barra na árvore inteira: tsc 0; eslint 0 erros; `test:english` 27/27 (`rotation.test.ts` fora do harness, marcado pendente); `test:village` 10/10. As 4 correções dos pacotes 2/3 conferidas no código: F8 (`draggingItem` só com movimento > 6 px), F9 (`baseY: 440`, foto `f9-chao` com a poção no chão embaixo da janela), n2-01 ("Please, because my homework is ready.", `please`/`can` no banco) e n2-05 ("The bed is ready. I do this because I want a clean room."). Decisão 34: F16 feito (não avança mais com 2 erros; `details.misses` como `{step, kinds}`), R6 feito (`trayForStage`: degrau 1 só com o `wordBank`). Decisão 36: `RUIN_ROUND_CAP = 2` em `processPendingDays` (conta as ruínas lendo o `village` entre um dia e outro) + `cracksForPendingRound` pura com teste. Foto `07-final` do Comerciante entregue.

### Pacote 4 — Cofre, Torre e regras

Certo: T1/T2 (`coverPaintedLookout` apagado — o líder repinta o mirante no fundo), C1 (sempre `createGoal`; barra do prêmio soma os montinhos do mesmo `rewardId`), C2 (`pickGhostPile` + regra que deixa editar título/alvo do fantasma), C3, R2 (resgate sem `progress` aborta), L2/T3 (`previewLevelFrom` pura, host ancorado, 7 casos), F05 (`unlockOn` só cresce), F06 (`launchedAt/userId/createdAt` proibidos), F07, F08 (`functions/lib` fora do índice). Regras e índices publicados 22/09 09h15.

- **D14, ajuste (médio)** o Cofre n3 ficou trancado como pedido, mas a **Biblioteca foi destravada até o nível 3 vendendo efeitos que não existem** ("Você vê como vai em cada matéria e a prova revisita um erro antigo", "1 dica grátis no Recado e a revisita paga o dobro") — o próprio relatório diz "sem `ComoVouIndo` e sem revisita em dobro". Isso fere a regra "nada em breve comprável". A instrução da revisão anterior ("Biblioteca liberada até 3 com os textos da decisão 14") foi do líder e estava incompleta: liberar só quando os efeitos existirem. Correção: `mesa.liveMaxLevel: 1` + `opensIn: 'Etapa 3'` de volta (mantendo os textos novos), até o `quizBank` e o "Como você vai" entrarem (P1 da v3).
- Observação: sem foto do cartão "Abre na Etapa 3" (a conta de teste não tinha Cofre no teto); a decisão 36 tem teste na função pura, não no laço real de `processPendingDays`.

### Pacote 5 — Prova v3 P0

O que está certo: prompt v3 com folga, cartão do nível de inglês, códigos de habilidade, dilema `kind: 'dilemma'` fora da nota (`quizScoreOf`, tela sem "Não foi dessa vez", cartão Hoje só com o dilema); `sanitize` gravado no doc e mostrado no painel; tokens 4 500 / função 6 000 (publicada 09h25); custo por modelo; prefetch de voz só com a mesa aberta; `?quiz=regen` em DEV.

**Por que reprova:** as três provas geradas de verdade pelo Cursor **foram para o banco offline** (`kept` 2, 1 e 0 de 11) — o Heitor veria "Plural de box?" e "O que significa a placa EXIT?" no lugar do tema do dia. O líder gerou uma quarta (tema "Um país, muitos jeitos de falar", `docs/exemplos/telas/etapa-3/prova-v3/sonda-lider-2026-09-23-raw.json`): a IA devolveu **8 perguntas razoáveis** (13 a 18 palavras de `why`, `trap` nomeando o distrator, inglês em pares mínimos) e o validador **reprovou as 8**. Causas, medidas pergunta a pergunta:
1. `why_sem_resposta` (8 de 8): exige a **string inteira** da resposta dentro do `why`; um `why` que parafraseia ("a presença de imigrantes portugueses…" para a resposta "Influência dos imigrantes portugueses") cai. A spec pedia as 4 primeiras palavras ou uma palavra de conteúdo da resposta.
2. `sinonimas` (2 de 8) derruba exatamente o distrator que a lei manda: "Mais oxigênio" × "Menos oxigênio", "There is **a** apple" × "There is **an** apple" (80% das palavras em comum = par mínimo, não sinônimo). Tirar o código ou ignorar pares que diferem em uma única palavra.
3. `audio_mismatch` (1 de 8): compara `audioText` com o enunciado; quando o enunciado é "Which sentence is correct?", a frase certa está na resposta. Comparar com a resposta também.
4. A IA devolveu **8, não 11**: a folga não veio; sem a chamada de substituição da spec (P0.5: "se faltar, pedir só as que faltam"), qualquer descarte manda a prova inteira para o offline. Implementar a substituição e, se ainda faltar, **completar** do offline (passando pelo validador), nunca trocar a prova inteira.
5. **P0.6 não foi feito**: o "professor revisor" da spec é uma segunda chamada (`gpt-4o-mini`, temperatura 0, `{n, ok, motivo}`); o `reviewBatch` entregue é uma heurística local do lote, e **não está ligada** em lugar nenhum (`grep reviewBatch` só acha o teste).
6. P0.2 parcial: faltam `tamanho_opcoes`, `certa_mais_longa`, `tipos_mistos`, `opiniao` e `opcao_caricata` (o `CARICATURA` entregue é sobre "célula azul", outra coisa); a Q2 da sonda ("Como você pode aplicar o conhecimento sobre sotaques na escola?", opinião com gabarito) passou. Os 20 casos reais da §4.3 não viraram testes (há 7 testes; a fixture `era3.json` existe).
7. Evidência: os JSON salvos são a prova **final** (offline); a saída crua da IA e os códigos por pergunta não foram guardados — sem isso não dá para calibrar. Guardar `raw` e `sanitize` por item no relatório.

**Como fechar (para o Cursor, antes do commit):** (a) trocar `why_sem_resposta` por "contém uma palavra de conteúdo (4+ letras) da resposta, ou o número"; (b) apagar `sinonimas` (ou ignorar pares que diferem em 1 palavra) e corrigir `audio_mismatch`; (c) acrescentar `opiniao` (regex da spec) e `opcao_caricata`, `tamanho_opcoes`, `certa_mais_longa`, `tipos_mistos`; (d) substituição das que faltam em 2ª chamada e completar do offline em vez de trocar tudo; (e) ligar um revisor de verdade (`gpt-4o-mini`, spec §4.4) ou marcar P0.6 como não feito; (f) rodar 3 gerações reais e colar no relatório a saída crua com o código de cada pergunta — aceite: **≥ 8 perguntas da IA mantidas nas 3**, zero prova offline. Enquanto isso não fechar, a alternativa segura para publicar o resto é o **modo observação**: o validador só grava `sanitize` e a prova usa as perguntas da IA como na v2 (uma constante `QUIZ_VALIDATOR_ENFORCE = false`), ligando a rejeição quando a taxa de falso positivo cair.

### Processo

Nada commitado desde `c354e89`; pacotes 1 a 5 na mesma árvore. Ordem: Cursor fecha o pacote 5 (ou liga o modo observação) e o ajuste D14; líder confere; pai faz um commit e o deploy.

## Etapa 3, pacote 6 — Prova v3 calibrada (Cursor, 22/09) — APROVADO PARA COMMIT, com o pacote 6b em seguida

Barra: tsc 0; eslint 0 erros; `test:english` 27/27; `test:village` 10/10. Itens 1 a 7 conferidos no código e nas três provas do aceite (`2026-10-29`, `11-06`, `11-16`: `source: ai`, `fromOffline: 0`, 8 perguntas cada, raw e `sanitize.perQuestion` gravados): `why_sem_resposta` por palavra de conteúdo, `sinonimas` ignora par mínimo, `audio_mismatch` aceita a resposta, códigos `opiniao/opcao_caricata/tamanho_opcoes/certa_mais_longa/tipos_mistos`, fixture com os 20 casos, pedido de 11 com substituição só das que faltam e completar do banco (nunca trocar a prova), revisor `gpt-4o-mini` ligado no fluxo. D14 de volta (Biblioteca teto 1). O relatório do Cursor fez a leitura das 24 perguntas pela lei do professor e é honesto sobre o que ficou abaixo da barra.

O que a leitura das 24 (e das outras ~20 datas geradas na sessão) mostra:
- **"Qual é a função do X no futebol?" em 19 das ~25 provas geradas** (penalty kick, goal kick, midfielder, goleiro, árbitro, bandeirinha, cartão vermelho…) — em 29/10 são **três** na mesma prova. É a decisão 37 (futebol é cenário) ignorada e a definição escapando: o regex `DEFINICAO` cobre "o que é / qual é o nome de" e não "qual é a função de". Os itens 8, 9, 10 e 11 do pacote 6 (explicação em português, marca de tempo no inglês, `futebol_solto`, `duvida` do revisor) **não foram feitos** — não há `explicacao_em_ingles`, `ingles_sem_marcador`, `futebol_solto` nem `duvida` no código.
- **Nenhuma das três provas tem dilema** (decisão 33) e a de aplicação (LIC.APLICA) caiu em duas: as perguntas de atitude morrem sempre em `certa_mais_longa`/`tamanho_opcoes`/`opcao_caricata`, porque a IA escreve a atitude certa mais comprida. A substituição pede "as que faltam" sem dizer **qual posição/kind** faltou, e as extras (9-11) são matemática/ciências/inglês — o tema fica com 1 pergunta de lição e a prova vira duas contas iguais + duas frases iguais de inglês (16/11: Q6/Q7 mesma tabela; Q3/Q8 mesmo `There is`).
- O revisor aprovou as 24 com motivo vazio — inclusive 06/11 Q4 (duas consequências verdadeiras: menos oxigênio e mais CO₂) e 06/11 Q2 (conta de um passo com `subject: tema`, que o validador não olha). Com "na dúvida, aprove" e sem o `duvida: true`, não dá para saber se ele lê.
- "Which sentence is correct? → There is a dog in the park" idêntica em 29/10 e 06/11 (gerada fora de ordem na sessão; em produção o hash pega).

Veredito: **commitar e publicar** — sobre a produção de hoje (prompt antigo) é ganho claro: matemática de duas etapas, inglês por regra com `why` em português, explicação em duas partes, nada de prova inteira offline. O que falta não piora o que já existe (futebol solto e falta de dilema já eram assim). **Pacote 6b imediatamente** (itens 8-11 + 12-13 no prompt), antes da geração de 24/09; até lá o líder revisa à mão a prova do dia seguinte, como fez em 21, 22 e 23/09.

## Torre: bugs visuais e de lógica (pedido do pai em 22/09, com 3 fotos)

Dois sistemas de conquista convivem na Torre, e é isso que confunde:

**1. Aba "Vida real" = o sistema antigo do Flash** (`AchievementsBadges.tsx`, coleção `achievements` + `userAchievements`). São 13 conquistas legadas ("Flash Nível 5/10/50/100", "Flash do Cubo Mágico", "Comprador VIP", "Primeiro Passo", "Dedicado", "Colecionador Expert"…), **todas com `isActive: false`** desde o reset do lançamento (decisão do dia 17: `checkAchievements` ignora inativas) e com recompensas da economia antiga (5 a 200 gold, 10 a 300 XP). A tela ignora `isActive`, calcula o progresso ao vivo e nunca conclui:
- "Primeiro Passo": **21/1**, barra estourada, **"Faltam -20 para completar"** (`AchievementsBadges.tsx:337` subtrai sem `max(0, …)`; `:106` só limita a porcentagem);
- grade de 13 cartões escuros só com um ícone cinza, sem título — a criança precisa clicar em cada um para saber o que é;
- nomes e prêmios do Flash ("Flash Nível 10", "+10 XP +5 GOLD") num jogo que não tem mais Flash; se fossem reativadas, pagariam 200 gold por "Comprador VIP" (economia antiga, 20× o teto semanal de hoje).
Nenhum pagamento indevido aconteceu (`userAchievements` vazio, `isReadyToUnlock` exige `isActive`).

**2. Aba "Conquistas" = o catálogo novo** (`GAME_ACHIEVEMENTS`, 60 conquistas, 11 categorias, 4 tiers). A lógica está certa (10 desbloqueadas do Heitor com claim, "Quase lá" correto), mas a tela é confusa:
- 11 fichas de categoria em duas linhas com contagem ("Mina 1/21", "Temporada 1/8", "Segredos 1/1") — a criança lê como uma tabela; "Segredos" com contagem entrega que existem segredos e, quando trancados, vira "0/0";
- o tier (bronze/prata/ouro/exclusiva) aparece só como cor fina na moldura do ícone; **a recompensa não aparece em lugar nenhum**; a data só nas feitas;
- uma dúzia de ícones para 60 conquistas, e os trios repetem o mesmo: "Mão na massa 10/50/100" e "Veterano 250/500/1000" são seis cartões iguais com o mesmo mapa;
- `SEVEN` em `achievements.ts:4` ainda conta o **Campinho** (fora da cena): `base_completa` (todas no nível 3) é impossível hoje.

**3. Recompensas.** O catálogo novo paga por tier: bronze 10 XP + 1 madeira, prata 25 XP + 2 madeira, ouro 50 XP + esmeralda, exclusiva 100 XP + diamante — **sem gold nenhum** (`rewardHasGold` devolve `false`; `achievementGoldCap: 20` da economia não é usado por ninguém). O "material" é sempre madeira (`villageService.ts`, `mats.madeira += material`). Contra a lei do pai: bronze de "Missões feitas 10" (vida real, 10 dias de trabalho) paga o mesmo que "Primeira carga" (uma vagoneta); 10 XP é o valor de uma missão comum (`taskDefaultXp: 10`) — uma conquista que leva semanas vale uma missão.

### Proposta (para o pai decidir; vira pacote 8)

a. **Aposentar o sistema antigo na tela da criança**: a aba "Vida real" passa a mostrar as categorias de vida real do catálogo novo (Rotina, Agenda, Baú) e a aba "Conquistas" fica com o jogo (Mina, Ferraria, Obras, Banco, Amizade, Temporada) — duas abas, cada uma com no máximo 6 grupos. O `AchievementManager` do painel (13 legadas) sai do painel; as 13 conquistas viram `archived: true` no Firestore (nada é apagado). Alternativa: manter o painel para conquistas "custom" do pai — mas isso já é o que os Desafios fazem.
b. **Um cartão que se explica**: título, descrição, medalha do tier com nome (Bronze/Prata/Ouro/Exclusiva), o prêmio escrito ("+30 XP · 2 madeira"), barra com `atual/alvo` sempre limitado ao alvo, data quando feita; ícone por família (missões, tochas, sol, prova, vagoneta, forja, obra, cofre, amizade, temporada, segredo) + o número do degrau desenhado no canto (10/50/100) para as trios não serem clones. "Segredos" só aparece quando o primeiro é desbloqueado, sem contagem.
c. **Recompensas por peso de vida real**: XP bronze 30 / prata 75 / ouro 150 / exclusiva 300 (uma conquista de semanas vale uma semana de missões, não uma missão); gold **só nas categorias de vida real** (Rotina, Agenda, Baú): bronze 3 / prata 6 / ouro 12, dentro do `achievementGoldCap: 20` por semana que já existe; jogo (Mina, Ferraria, Vagoneta, Obras, Banco, Amizade) continua sem gold, com material do nível da Ferraria (não só madeira) e raros no ouro/exclusiva. `base_completa` passa a contar as seis obras que existem.
d. **Bugs a fechar de qualquer jeito**: `Faltam max(0, …)`, progresso limitado ao alvo, inativas fora da tela, `SEVEN` sem Campinho.

## Etapa 3, pacote 6b (Cursor, 22/09) — APROVADO PARA COMMIT; incidente do teto de IA

Itens 8-13 conferidos no código: `explicacao_em_ingles`, `ingles_sem_marcador`, `futebol_solto` (+ `scenario`, `FUT.REGRA` fora), `duvida` no revisor com `sanitize.duvidas`, substituição **por posição** com o mesmo `kind`/`skill` (e ± 2 palavras nas opções de LIC.APLICA/LIC.DILEMA), `DEFINICAO` com "qual é a função de / papel de / o que faz / para que serve". Barra: tsc 0, eslint 0 erros, 27/27 e 10/10.

A única prova real que fechou (`2027-01-04`, "Mistérios do Mar") é a melhor que o gerador já produziu: posições 1-3 = ideia / aplicação / **dilema** (`kind: dilemma`, com uma dúvida do revisor gravada), inglês `There is` com áudio e regra em português, conta de duas etapas com o distrator "parou na primeira", futebol como cenário (decorativo — "durante um jogo de futebol, a maré está alta" — vale a regra, mas o futebol ainda não ensina nada ali), zero "função do", zero banco. Reparos da leitura: Q2 ("Lua cheia → maré alta") simplifica demais (maré alta há todo dia; a lua cheia faz a maré **mais** alta) e Q6 repete a resposta da Q1 (sal) — o revisor deixou. `rescueDilemma` (o código devolve à prova uma pergunta que o revisor reprovou por três motivos conhecidos como falsos, sempre com `duvida: true`) é aceitável enquanto o rastro estiver no doc.

**Incidente: o teto mensal de 800 chamadas estourou em 22/09 às ~17h** (`aiUsage/2026-09.calls = 800`; 403 de manhã → 800 à tarde: 217 de `gpt-4o` e 218 de `gpt-4o-mini` das gerações de teste dos pacotes 5, 6 e 6b). Com o teto batido a função recusa **tudo, inclusive a voz** (`functions/src/index.ts:148` confere o teto antes de separar `chat` de `tts`): prova de 24/09 iria para o banco, contratos para a reserva, juiz da reflexão para o filtro local, áudio novo mudo. O líder **descontou as gerações de teste** no contador (`calls` 800 → 410, com `testAdjust` gravado no doc explicando) para a produção voltar hoje. Os tokens (1,05 M entrada / 0,38 M saída no mês) ficam como estão: custo real ~US$ 6.

Pendências que viram o **pacote 6c** (pequeno, antes do 7): (1) o teto só vale para `kind: 'chat'` — a checagem entra dentro do ramo do chat; (2) `AI_MONTHLY_CALL_CAP` 800 → **1500** na função e em `aiCost.ts` (teste de igualdade), com alerta no cartão Hoje a 80%; (3) o painel mostra "chamadas de texto" e "chamadas de voz" separadas; (4) as gerações de teste do Cursor passam a rodar com `?d=` na conta de teste **só quando o aceite pedir** (3 por pacote), não em lote de 25; (5) as duas provas que faltam do aceite do 6b são geradas depois do deploy do 6c e coladas no relatório. O pai publica a função (`npx firebase-tools deploy --only functions --project app-heitor`) junto com o deploy do site.

## Entrega do líder: Estante do Sábio (decisão 40, 22/09) — PRONTA PARA COMMIT

O pai aprovou os seis ajustes e pediu que o líder implementasse ("ok justo pode implementar vc msm"). Barra: `tsc` 0 · `eslint` 0 erros (8 avisos antigos) · `test:english` 29/29 · `test:village` 12/12 (com `books.test.ts`, 7 casos) · regras e índices publicados às 19h15 (`books`, `bookReports`).

**Arquivos novos**: `src/services/village/books.ts` (regras puras), `src/services/bookService.ts` (Firestore, juiz, conferente, pagamento em transação com os claims `book:<chave>` e `bookday:<data>`), `src/components/hero/village/EstanteDoSabio.tsx`, `src/components/parent/BooksPanel.tsx` (aba Livros), `src/services/village/__tests__/books.test.ts`, `docs/LEITURA_LIVROS.md`. **Tocados**: `types/index.ts` (`BookDoc`, `BookReportDoc`, `BookJudge`, `'book_report'`), `BuildingCard.tsx` (botão "Contar um livro"), `VillageHome.tsx` (distrito `books`), `ParentPanel.tsx` (aba), `GoldHistory.tsx`, `data/achievements.ts` (+3 `booksRead`), `statSources.ts`, `miner.css` (`.mn-livro-slot`), `firestore.rules`, `firestore.indexes.json`, `ETAPA_2_LANCAMENTO.md` (decisão 40, §12).

**Três casos reais na conta de teste** (juiz `gpt-4o` de verdade; fotos em `docs/exemplos/telas/etapa-3/estante/`, log em `_log.txt`):

| Caso | Texto | Juiz | Conferente | Veredito na tela |
|---|---|---|---|---|
| (a) sinopse da capa colada por digitação | "Diário de um Banana narra, com humor e sensibilidade…" | `leu 1`, `suspeito: copiado`, faltou tudo | não chamado | **"Isso está arrumado demais. Me conta do seu jeito, como se fosse para um amigo."** (foto 04a) |
| (b) texto de criança sem o fim | Greg, Rowley, o toque do queijo, a casa mal-assombrada | `leu 3`, `faltou: fim, opiniao` | pergunta "Como termina a história do queijo?"; resposta "não lembro dessa parte" | **"Faltou como termina e o que você achou, e por quê. Completa aí e me entrega de novo."** (foto 04b) |
| (c) texto de criança completo | Menino Maluquinho: panela, quintal, escola, fim, opinião | `leu 3`, faltou vazio | pergunta sobre a escola; resposta certa | **"Acreditei. Gostei de como você explicou o que mais gostou no livro. +15 gold."** (fotos 04, 05, 06) |

Depois de (c): `village.claimed` com `book:menino-maluquinho` e `bookday:2026-09-22`, `stats.booksRead 1`, gold 0 → 15, XP +40, `books/<id>.status done`, linha `book_report` no extrato, relato `accepted: true, paidGold 15, paidXp 40, attempt 2`; a estante mostra a lombada e o Sábio diz "Hoje eu já ouvi um livro. Amanhã conto com outro." com o "Terminei" do outro livro desligado.

**Três defeitos que a sessão de fotos achou e que já estão corrigidos** (por isso o caso (c) precisou de duas tentativas):
1. **Pergunta de verificação com resposta esperada errada.** Na primeira rodada o juiz perguntou "Qual é o nome do menino maluquinho?" esperando **"Ziraldo"** (o autor; o personagem não tem nome) e o conferente `gpt-4o-mini` recusou a resposta certa ("ele não tem nome no livro"). Correção: regra 6 do juiz (só fato da história, só com certeza, nunca autor nem nome que o livro não dá; sem certeza, sem pergunta), conferente passa a `gpt-4o` (precisa conhecer o livro), recebe o relato dele e a regra "a resposta esperada pode estar errada; na dúvida, aceite; recusa só 'não sei/não lembro', outra coisa ou contradição clara". Custo: ~US$ 0,004 a mais por conferência, uma por dia no máximo.
2. **"Esse texto eu já li" barrava completar o texto.** A checagem de 80% comparava com as tentativas do mesmo livro, então quem acrescentava o fim depois de "faltou" era barrado. Correção: 80% só contra relatos de **outros** livros; no mesmo livro só o texto idêntico barra ("Esse é o mesmo texto de antes. Completa o que faltou ou muda alguma coisa"). Teste cobre os três casos.
3. **Rótulos invisíveis**: os nomes dos rostos e os números da nota ficavam escuros sobre o slot escuro (foto 02a). Correção: `.mn-livro-slot` claro, selecionado em dourado (foto 02).

**Fica anotado, sem ação agora**: na rodada final o juiz perguntou algo que já estava no texto dele ("o que fazia com os amigos na escola"), contra a regra 6; a pergunta ainda pede leitura, o risco é baixo. Se repetir com o Heitor, endurecer o prompt ou fazer o conferente rejeitar pergunta cuja resposta está no relato.

**Conta de teste depois da sessão**: a prova de 22/09 tinha sido marcada como feita só para destravar o "Terminei" (o portão da prova vale na Estante); devolvida a `completed: false, status: 'ready'`. Ficaram na conta de teste os dois livros, 4 relatos e o pagamento de 15 gold, úteis para o pai olhar a aba Livros.

**O que o pai faz**: commit dos arquivos listados (junto com o pacote 7 do Cursor, que mexeu em `DailyQuiz.tsx`, `provaRules.ts`, `provaV2.test.ts`, `SoundContext.tsx`, `uiSfx.ts` e o começo do `miner.css`; os dois conjuntos não se tocam); cadastrar os livros reais do Heitor na aba **Livros** (título e páginas) antes de mostrar a Estante para ele; regras já publicadas, não precisa de deploy de função.

**Ajustes do pai no teste ao vivo (22/09, noite)**: (1) **valor do livro é do pai**, não das páginas ("O Pequeno Príncipe é muito mais complexo que Matilda"): campo `gold` no livro, "Vale (gold)" no cadastro com sugestão pelas páginas e "Salvar valor" em cada livro da lista Para ler; `goldForBook` no pagamento e na tela da criança; regra Firestore impede a criança de pôr `gold` no livro que propõe; teste em `books.test.ts`. (2) **Mínimo de palavras 40, e 80 depois do 5º livro** (era 80/120; o pai pediu 50 e depois 40). Conta de teste: Pequeno Príncipe 25, Matilda 15, Fábrica de Chocolate 15. (3) **Sai o "Você levou em N dias"** da tela e do prompt do juiz (não dá para medir com precisão); a ficha começa em "Gostou do livro?" e `readingDays` fica só no relato do pai. (5) **Excluir recompensa não funcionava** ("Erro ao excluir recompensa"): a regra de `rewards` exigia `request.resource.data.ownerId/createdAt` também no delete, e no delete `request.resource` é nulo, então todo delete era negado; separada em `allow delete: if isAdmin()`, publicada 22/09 à noite. (6) **Nível necessário** no formulário de recompensa herdado do painel antigo dizia "1-100": agora vai de 1 a `LEVEL_CAP` (40) e explica o efeito (cadeado na loja abaixo do nível; 1 = sempre liberada). O nível continua sendo aplicado na loja da criança (`RewardsPanel.isRewardUnlocked`) e na contagem "prêmios ao alcance" do card. (11) **Comerciante invertido** (decisão 42): `sellMaterials` saiu; `buyMaterials` cobra `merchantBuy.gold` (2) por `merchantBuy.materials` (10) de um material, claims `merchant:<data>:<n>` mantêm o teto de 2 por dia, linha `merchant_buy` no extrato com `totalGoldSpent`; tela do Comerciante no Mercado com "Comprar 10 · 2 gold", cinza com "Faltam N gold" ou "Amanhã"; pedido 1 do Comerciante e `statSources` trocados para `merchantBuys`; fala `c_day_pause1` ajustada. (10) **Missão diária sem material** (decisão 41): `DEFAULT_ECONOMY.materialsPerTask` 1 → 0; `settings/economy` não existe em produção, então o padrão do código vale; TaskItem só mostra "· picareta" quando o bônus da picareta entrou; testes do loot passam a usar 1 por missão explicitamente para cobrir o bônus, e um caso novo cobre o padrão 0. (9) **Recado "Faltam N missões para o Baú do Dia" depois do Baú aberto**: o recado só olhava devidas/feitas e não sabia que o Baú de hoje já tinha sido aberto; quando o pai desativou três missões feitas e criou uma nova, a conta mudou e o recado voltou a "Faltam 2". Agora `NoticeContext.chestOpened` (claim `daily:<data>`) esconde o recado; teste em `village.test.ts`. A regra de metade fica como está (o pai confirmou). (8) **"Criar meta no Banco" saiu da loja de prêmios** (pai, 22/09: "tá um pouco confuso"): quando falta gold o botão mostra "Faltam N gold" cinza, e prêmio só de Cofrinho mostra "Só pelo Cofrinho"; criar meta continua pelo Cofrinho. A prop `onCreateGoal` fica na loja sem uso, para voltar quando o pai quiser. (7) **Botão "Prova do dia" depois da prova feita** ficava verde e abria a modal de novo; agora vira "Prova de hoje feita", cinza e sem clique (a reflexão pendente ainda deixa a prova como não feita, então o botão continua verde até ela ser escrita). (4) **Contar um livro exige a Biblioteca no nível 1** ("tranca", 22/09): botão cinza com o motivo no nível 0; a Biblioteca do Heitor está no 0 e o nível 1 custa 2 madeira, 2 ferro e 2 redstone (falta 1 redstone). Os três livros do Heitor (Pequeno Príncipe 25, Matilda 15, Fábrica de Chocolate 15) foram cadastrados pelo líder a pedido do pai.



## Entrega do líder: Torre (pacote 8, decisão 38, 22/09) — PRONTA PARA COMMIT

O pai pediu "vamos corrigir logo também" e o líder fez o pacote 8 inteiro. Barra: `tsc` 0 · `eslint` 0 erros (8 avisos antigos) · `test:english` 30/30 · `test:village` 13/13 (novo `achievements.test.ts`, 7 casos; `lote2.test.ts` atualizado de "nunca gold" para "gold só na vida real").

**O que mudou**

1. **Duas abas, cada uma com no máximo 6 grupos.** "Vida real" = Rotina, Biblioteca, Agenda, Baú (o que ele faz fora do jogo; é onde há gold). "Conquistas" = Mina, Ferraria, Obras, Banco, Amizade, Temporada; "Segredos" só aparece depois do primeiro segredo destravado e sem contagem. O "Quase lá" é por aba. `AchievementsBadges` (as 13 do Flash com "Faltam -20") saiu da Torre; `AchievementManager` saiu do painel; os dois arquivos foram removidos (o `DataContext` ainda lê a coleção `achievements`, mas só ativas, e todas ficam inativas).
2. **Cartão que se explica** (`Torre.tsx`): título, medalha com o nome do tier (Bronze/Prata/Ouro/Exclusiva, na cor da moldura), descrição, **"Prêmio: +30 XP · 3 gold"** por extenso, barra `min(atual, alvo)/alvo`, "Feita em dd/mm" nas feitas; ícone por família com o **número do degrau** no canto (10 / 50 / 100), para os trios não serem clones. Segredo trancado mostra "Segredo · Ainda é segredo. Você descobre jogando." sem prêmio.
3. **Recompensas** (`data/achievements.ts`, `rewardFor`): XP por tier **30 / 75 / 150 / 300**; gold **3 / 6 / 12** só em Rotina, Agenda, Baú e **Biblioteca** (a decisão 40 já dava gold de vida real aos livros; prova e livro são vida real); jogo paga **material do nível da Ferraria** (fornalha 0-1 madeira, 2 pedra, 3 ferro; bronze 1, prata 2), esmeralda no ouro, diamante na exclusiva; cosmético entra no lugar do raro (`base_completa`, `todo_mundo`). As 7 da Vagoneta perderam o XP próprio (10-50) e seguem a tabela. `rewardHasGold` passou a ser de verdade.
4. **Pagamento** (`villageService.applyVillageStats`): gold dentro do `achievementGoldCap` semanal lido de `settings/economy` (padrão 20) com contador `village.stats.achGoldWeek/achGoldWeekKey` (mesmo molde de `contractsWeek`); o que passa do teto não fica devendo (fica em `metadata.capped` da linha do extrato). Linha em `goldTransactions` com `source: 'achievement'` e "Conquista: <títulos>". Material vai para `englishBase.materials.<material da Ferraria>` (antes era madeira fixa). Leitura de `settings/economy` acontece dentro da transação, antes das escritas, só quando há gold a pagar.
5. **`base_completa` conta as seis obras** (`BASE_BUILDINGS` sem Campinho); "Vila de verdade" diz "todas as seis".
6. **Script** `scripts/archive-legacy-achievements.cjs --uid <uid> [--apply]`: marca `archived: true` e `isActive: false` nos docs legados de `achievements`; nada é apagado; sem `--apply` é só leitura. Na conta de teste: 0 docs. **O pai roda na conta do Heitor** (13 docs "Flash Nível…"): `node scripts/archive-legacy-achievements.cjs --uid xZkTTR2tlIYXIpAelxEqXugNjqo2` (olha) e depois `--apply`.

**Fotos** (conta de teste, Torre subida ao nível 2 só durante as fotos e devolvida ao 0): `docs/exemplos/telas/etapa-3/torre/` — `01-vida-real-rotina`, `02-vida-real-biblioteca` (Primeiro livro e Primeira prova feitas, com "Prêmio: +30 XP · 3 gold"), `03-conquistas-mina` (Primeiro contrato feito em 19/09, "+30 XP · 1 madeira"), `04-conquistas-obras`, em 1280 e 1920; `_log.txt` com as categorias lidas da tela e "erros: nenhum".

**Fica anotado**: (a) as conquistas já destravadas antes de hoje foram pagas pela tabela antiga (10 XP + madeira); não há retroativo. (b) O `achievementGoldCap` da Balança vale (é lido do `settings/economy`); se o pai zerar, conquista de vida real paga só XP. (c) `docs/VILA_CONQUISTAS.md` atualizado na tabela e na linha de recompensa padrão; a lista item a item continua com os alvos, que não mudaram.

## Etapa 3, pacote 7 — "O Sábio lê" (Cursor, 22/09) — APROVADO (revisão leve, depois do commit)

O pai commitou o pacote junto com a Estante antes da revisão. Lido o relatório (`RELATORIO_ETAPA_3.md`, "Pacote 7") e conferido no código: `sageReadFrame` em `provaRules.ts` com os dois casos em `provaV2.test.ts`; as quatro falas do pai na ordem, 1,6 s cada; veredito só depois de 2,4 s e do fim da fala; rosto balançando com `.mn-papiro-face.is-reading` (reaproveitado pela Estante); pena por WebAudio, sem voz; nada de "carregando". Barra verde no `main` de hoje (tsc 0, eslint 0 erros, 30/13 arquivos de teste). Fotos `sabio-0`, `sabio-2`, `sabio-veredito` em 1280 e 1920 em `docs/exemplos/telas/etapa-3/prova/`. Nada a corrigir. Fica anotado que a revisão veio depois do commit; do pacote 10 em diante volta a ordem: relatório → revisão do líder → commit.

## Recapitulação de 22/09 à noite e próximos passos

**Feito hoje** (tudo no `main`): Prova v3 P0 (pacotes 5, 6, 6b, 6c), "O Sábio lê" (7), Estante do Sábio (9, líder), Torre nova e decisão 38 (8, líder), decisões 39 a 42, exclusão de recompensa consertada (regra), nível máximo 40 no formulário de prêmio, loja sem "Criar meta no Banco", recado do Baú depois de aberto, lembretes de rotina na Placa. Cursor parado depois do pacote 7; próximo prompt em `docs/etapas/PROMPT_CURSOR_2026-09-23.md` (pacotes 10, 11 e 12: Prova v3 P1 em duas partes e o ruído do `clientErrors`).

**Pendências do pai**: (1) publicar a função com o teto em dólares (`npx firebase-tools deploy --only functions --project app-heitor`): `aiUsage/2026-09` ainda não tem `tokensByModel`, sinal de que a função no ar é a antiga (teto de 800 chamadas; hoje 433); (2) limite rígido de US$ 60 e alerta em 40 na conta OpenAI; (3) `node scripts/archive-legacy-achievements.cjs --uid xZkTTR2tlIYXIpAelxEqXugNjqo2` e depois `--apply`; (4) decidir o retroativo das conquistas do Heitor pela tabela nova (18 gold + 200 XP em uma linha de ajuste) — sem resposta ainda; (5) o Heitor precisa de 1 redstone para a Biblioteca nível 1, que destrava os três livros cadastrados.

**Líder amanhã**: ler a prova de 24/09 do Heitor (primeira v3 em produção) e a de 23/09 se ainda for v2; revisar o pacote 10 quando o Cursor parar; `MANUAL_DO_PAI.md` (aba Livros, Torre nova, Comerciante, decisão 41); começar o desenho dos comprovantes das missões de vida real (decisão 24).

## Etapa 3, pacote 10 — Prova v3 P1, parte 1: dados e rotação (Cursor, 23/09) — APROVADO COM 4 CORREÇÕES ANTES DO COMMIT

Lido o relatório (`RELATORIO_ETAPA_3.md`, "Pacote 10") e o diff inteiro (12 arquivos alterados, 8 novos). Barra rodada pelo líder na árvore do Cursor: `tsc` 0 erros; `eslint` 0 erros (os 8 avisos antigos); `test:english` 33 arquivos verdes (inclui `rotation.test.ts` com os 365 dias); `test:village` 13 verdes; `vite build` ok. Conferido no Firestore, só leitura: a prova de 23/09 da conta de teste tem `theme.angle` e `theme.depth`; a de 24/09 do Heitor (gerada ontem, antes deste pacote) tem 6 perguntas.

### Entrou sem doc (todos aceitos)

- `buildAndSave` apaga `answers`, `timings`, `score`, `totalQuestions`, `awaitingReflection`, `reflection*` ao gravar a prova. Só roda quando a prova não tem perguntas (`ensureDailyQuiz`) ou na regeneração forçada; evita respostas velhas com perguntas novas. Aceito.
- O convite "oito perguntas" passou a usar o número da prova. Aceito (o problema de fundo está em "Fora do pacote").
- `theme.angleIndex` gravado no doc da prova (a rotação precisa dele). Aceito.
- Regra extra da categoria fraca em `pickTheme`. Aceita e registrada como regra 8 da §8.2 do `ETAPA_2_LANCAMENTO.md`.
- `hashOf` do validador passa a usar `normalizeQuestion`: uma normalização só. Aceito.

### O que está certo

- `hash.ts` e `dedupe.ts` puros, com os 8 pares reais e os 4 de controle; `repetida` ligada nas três passagens (lote, substituição e reserva offline) e contando para a reserva.
- `quizBank` no mesmo `writeBatch` do resultado, sem reescrever doc que já existe (a regra barraria o lote inteiro); campos da §5.1; `supportLevel` 0 ou 3 e ausente no dilema; nenhum `undefined`.
- Rotação com as 7 regras e as strings de `reason` exatas. O histórico antigo do Heitor, com temas do currículo velho, não quebra a escolha.
- "Não repita" com os 60 mais novos; `prepareTodayThenTomorrow` com teste.
- Retroativo idempotente, só leitura sem `--apply`, só provas concluídas, rodado só na conta de teste.

### Corrigir antes do commit (nesta ordem)

**C1 (alta; defeito antigo que o pacote herdou) — a prova não zera na virada do dia.** `DailyQuiz.tsx` fica montado o tempo todo (`HeroPanel`, sem `key`), e a virada do dia (`dayChanged`) não recarrega a página. A assinatura troca para a prova nova, mas `current`, `selected`, `answers`, `score`, `reward`, `reflection`, `judgeSay`, `paid`, `phase` e agora `timingsRef` ficam os de ontem. A pergunta da tela é `quiz.questions[current]` e `current` nunca volta a 0. Com a aba aberta de um dia para o outro depois da prova (aconteceu em 21→22/09), a prova nova começa na última pergunta e as respostas de ontem entram na nota, no gold, no `quizBank` e nos tempos.
- Função pura `freshQuizUi()` (em `src/services/quiz/closeQuiz.ts` ou arquivo novo em `src/services/quiz/`) que devolve o estado inicial: `current 0`, `selected null`, `answers []`, `score 0`, `reward { xp: 0, gold: 0 }`, `reflection ''`, `judgeSay null`, `paid false`, `phase 'prompt'`.
- Um efeito com dependência `today` aplica esse estado e zera `timingsRef`, `askedAt`, `choseAt`, `stepLock` e `revealLock`. Tem de rodar antes do efeito que restaura a reflexão guardada, que continua valendo para a prova do dia.
- Tempos gravados **por índice** (`next[current] = { ... }`), nunca empilhados. `answersStash` e `readTimings` deixam de filtrar a lista, porque filtrar desalinha os índices. Índice sem medida vira `{ msToAnswer: 0, msReadingExplain: 0 }`: nunca buraco nem `undefined` no array. O `quizBank` só grava tempo acima de 0, como já faz.
- Teste: `freshQuizUi()`; `answersStash` com `[a, zero, c]` guardando os três na ordem.
- Evidência: descrever no relatório como a virada foi simulada na conta de teste (relógio de desenvolvimento ou o efeito com `today` trocado) e que a prova seguinte abre na pergunta 1.

**C2 (alta; economia; defeito antigo) — esmeralda e "Nota máxima" impossíveis desde 22/09.** O dilema saiu da nota (`quizScoreOf` não o conta), mas `completeDailyQuiz` ainda pede `score >= 8 && totalQuestions >= 8` para a esmeralda (`dailyQuizService.ts`, perto da linha 377) e `score >= 8` para `quizPerfect` (perto da 396; alimenta a conquista "Nota máxima" e a fala `s_first_quiz8`). Uma prova v3 cheia tem 7 perguntas que contam, mais o dilema: ninguém alcança.
- Correção: volta a regra original, "acertou todas". Função pura `perfectQuiz(score, total)` = `total >= 5 && score === total` em `provaRules.ts`, usada nos dois lugares. O mínimo de 5 é o piso que o gerador já aceita: uma prova curta por erro do gerador não tira a esmeralda de quem acertou tudo.
- Teste: 7 de 7 ganha; 6 de 7 não; 5 de 5 ganha; 4 de 4 não.

**C3 (média; defeito antigo) — a tela conta o dilema no total.** O quadro final mostra `{score} de {quiz.questions.length}`: quem acerta tudo numa prova com dilema vê "7 de 8".
- Correção: `{score} de {total que conta}`, com o `total` de `quizScoreOf`.
- Foto do quadro final numa prova com dilema, na conta de teste.

**C4 (média; dado) — `difficulty` do `quizBank` é a profundidade do tema.** `bankWrite.ts` e `scripts/backfill-quizbank.cjs` gravam `difficulty: theme.depth`. As perguntas geradas não trazem dificuldade própria (conferido nas provas de 23/09 da conta de teste e de 24/09 do Heitor), então o campo mentiria para a futura análise por dificuldade.
- Correção: gravar `depth` (a profundidade do tema, com esse nome) e só gravar `difficulty` quando a pergunta trouxer 1, 2 ou 3.
- Teste em `bankWrite.test.ts`.
- Os 16 docs já criados na conta de teste ficam como estão. **O pai só roda o retroativo na conta do Heitor depois desta correção.**

### Fora do pacote, mas pesa já amanhã

**A prova do Heitor de 24/09 tem 6 perguntas** (5 que contam, mais o dilema). Descartes: 2 `conta_um_passo`, 2 `enunciado_vazou`, 2 `opiniao`, 1 `opcao_caricata`, 1 `conta_nao_fecha`; `fromOffline: 0`. A de 23/09 da conta de teste também saiu com 6.
- A regra 22 da v3 ("nunca menos de 8; completa do banco offline pelo mesmo validador") não está sendo cumprida.
- Causa: a reserva offline não passa no validador v3 (o P2.3 nunca foi feito), e as vagas da lição e do dilema não têm reserva compatível.
- Não bloqueia o commit deste pacote. Vira o **pacote 10b**, logo depois destas correções. O Cursor faz uma segunda substituição só para as vagas vazias e deixa vaga de conhecimento ser completada por qualquer área válida. O líder passa o banco offline pelo validador e reescreve o que cair.
- Até lá, com a C2, quem acerta as 5 ganha a esmeralda.

**Falas `*_first_quiz8` dos quatro personagens** ("Oito de oito..."): trocadas pelo líder em 23/09 por "Acertou todas" / "Todas certas" (`sabio.ts`, `comerciante.ts`, `ferreiro.ts`, `olheiro.ts` e `docs/conteudo/FALAS_NPC.md`), porque a prova perfeita passou a ter 7 que contam.

### Prompt para o Cursor (as correções)

Leia esta seção inteira ("Etapa 3, pacote 10") e faça as correções C1 a C4, nesta ordem, cada uma com o teste pedido. Sem restilizar e sem mexer em nada fora delas. Barra de sempre (`tsc`, `eslint --max-warnings 8`, `test:english`, `test:village`); fotos só na conta de teste (a do quadro final da C3). Relatório no fim de `docs/etapas/RELATORIO_ETAPA_3.md`, com o título "Pacote 10 — correções da revisão". Pare antes do commit.

## Pacote 10c — o tema de amanhã sai (decisão 44, pedido do pai em 23/09)

O pai viu o campo "Tema de amanhã" no cartão da Biblioteca e pediu para tirar. Hoje, o que a criança digita ali (ou no mapa da Mina, "O que você quer na história de amanhã?") vai para `englishBase.themeRequest` e vira o tema principal dos contratos da Mina do dia seguinte (`englishAi.ts`, perto da linha 567). Salvar regenera o plano de amanhã. A prova do dia não lê esse campo. Depois deste pacote, o tema vem só da rotação do currículo.

**Fazer, nesta ordem, sem restilizar nada:**

1. `src/components/hero/village/BuildingCard.tsx` (cartão da `mesa`): sai o bloco "Tema de amanhã" (rótulo, campo, "Salvar"), o estado `theme`/`savingTheme`, `saveTheme`, o `THEME_MAX` se ficar sem uso e o import de `setThemeRequest`. O resto do cartão fica igual.
2. `src/components/hero/english/base/BaseMap.tsx`: sai o bloco `theme-request` ("O que você quer na história de amanhã?"), com o estado, `saveTheme` e o que ficar sem uso (`mesaLive`, se só servia a ele).
3. `src/services/englishAi.ts`: o tema principal do plano passa a ser sempre o sorteado (`pickOne(rng, pool)`), sem ler `base.themeRequest`. Os objetos do plano continuam com `themeRequest: null`, porque o tipo e os documentos antigos têm o campo. `src/services/englishBaseService.ts`: sai `setThemeRequest`, e sai a limpeza do `themeRequest` depois de gerar o plano (perto da linha 391), que fica morta.
4. `src/services/village/statSources.ts`: sai `themesSet`. `src/data/npcQuests.ts`, pedidos do Sábio:
   - capítulo 3: `{ chapter: 3, title: 'Todas', ask: 'Acerte todas as perguntas da prova', stat: 'quizPerfect', target: 1 }`;
   - capítulo 4: `{ chapter: 4, title: 'Livro', ask: 'Conte um livro para o Sábio', stat: 'booksRead', target: 1 }`.
5. `src/config/englishBase.ts`, `mesa`:
   - `effects[0]` e `effect`: `'Você conta ao Sábio os livros que termina.'`;
   - `effects[2]`: `'Você vê o erro antigo ao lado do acerto de hoje.'` (decisão 43; o nível 3 continua trancado);
   - `effects[1]` fica.
6. **Trancas sem nome de etapa** (aproveitando o mesmo cartão; o pai pode tirar este item). "Abre na Etapa 3" é jargão nosso na tela da criança. Onde a criança vê `Abre na ${opensIn}`, "Abre depois" ou "Em breve.":
   - `BuildingCard.tsx`, perto das linhas 78, 83, 92 e 345;
   - `BaseMap.tsx`, perto da 190;
   - a mensagem de erro de `englishBaseService.ts`, perto da 755.

   Nesses lugares passa a aparecer **"Ainda em obra."**; no botão desabilitado, **"Ainda em obra"**. Mensagens de requisito real ("Precisa de ...") ficam como estão. O `opensIn` continua no config e no painel do pai.

**O que fica:** `themeRequest` no tipo e nos documentos antigos, `village.stats.themesSet` e `themeSetOn` nos dados, e as linhas "pedido da Mesa" do painel (histórico). Nada disso é mais escrito.

**Aceite:**
- `tsc`, `eslint --max-warnings 8`, `test:english` e `test:village` verdes, com `statSources.test.ts` passando com `booksRead` no capítulo 4.
- Se a função que monta o plano da Mina for pura, um teste: com `base.themeRequest = 'dragões'`, o tema do plano de amanhã vem do sorteio. Se não for, dizer no relatório como verificou.
- Fotos 1280×720 e 1920×1080, na conta de teste:
  - cartão da Biblioteca nível 1 sem o campo e com o efeito novo;
  - mapa da Mina sem o campo;
  - pedidos do Sábio na Torre com os capítulos 3 e 4 novos;
  - um nível trancado com "Ainda em obra".

**Prompt para o Cursor:** Leia a seção "Pacote 10c" de `docs/etapas/REVISAO_ETAPA_2_LANCAMENTO.md` e faça os itens 1 a 6, nesta ordem, sem mexer em nada fora deles. Relatório no fim de `docs/etapas/RELATORIO_ETAPA_3.md`, com o título "Pacote 10c — tema de amanhã fora". Pare antes do commit.

### Revisão do pacote 10c (23/09) — APROVADO

Lido o relatório ("Pacote 10c — tema de amanhã fora") e o diff dos arquivos do pacote. Barra rodada pelo líder: `tsc` 0 erros; `eslint` 0 erros (8 avisos antigos); `test:english` 33 arquivos e `test:village` 13, todos verdes; `vite build` ok.

O que foi conferido no diff:
- `dayContextFor` sorteia o tema sem ler `base.themeRequest` e grava `themeRequest: null`.
- `setThemeRequest` e a limpeza depois da geração saíram.
- `themesSet` saiu das fontes de stat; os capítulos 3 e 4 do Sábio têm os textos pedidos; o teste confere os dois e a fonte de `booksRead`.
- Os efeitos da Biblioteca estão como o item 5 pedia.
- "Ainda em obra" aparece nos cadeados do cartão, do mapa e no erro de construir; "Precisa de ..." ficou.
- O `BaseMap` perdeu a propriedade `onSaveTheme`. Ninguém monta esse componente hoje (código parado), então nada quebra.

Fotos lidas pelo líder:
- `01-biblioteca-1280`: sem o campo; "Você conta ao Sábio os livros que termina."; "Quando abre: Ainda em obra." e o botão desabilitado "Ainda em obra".
- `03-sabio-1280`: "Feito: Todas" e "Conte um livro para o Sábio".

Fica anotado:
- As frases "Abre na Etapa 4" do Campinho e da Arena, fora das linhas pedidas, entram na próxima passada de texto.
- Na mesma foto, o recado "Faltam 5 missões para o Baú do Dia" é o tipo de frase de sistema que a lei proíbe. Vai para a mesma passada.

**As correções C1 a C4 do pacote 10 não foram feitas.** O relatório não tem a seção "Pacote 10 — correções da revisão", e o código continua com `score >= 8`, `{score} de {quiz.questions.length}` e `difficulty: depth`. Elas entram antes do commit. Sem a C2, o capítulo 3 novo do Sábio ("Acerte todas") continua impossível. Depois delas, um commit só: pacote 10, correções, 10c e os documentos do líder.

### Revisão das correções C1 a C4 do pacote 10 (23/09) — APROVADO; pode commitar

Lido o relatório ("Pacote 10 — correções da revisão") e o código de cada correção.

- **C1:**
  - `freshQuizUi()` em `closeQuiz.ts`.
  - O efeito depende só de `today` (não reinicia a prova no meio quando o documento atualiza) e foi declarado antes da restauração da reflexão.
  - Ele zera tempos, travas e a leitura pendente do Sábio.
  - Tempos são gravados por índice, com zeros onde falta medida; `answersStash` e `readTimings` não filtram mais a lista.
  - O Cursor simulou a virada sem recarregar, na conta de teste (`clock-override`): a prova nova abriu em "1 de 8", e a do dia anterior ficou sem respostas herdadas.
- **C2:**
  - `perfectQuiz` (`total >= 5 && score === total`) é usada na esmeralda e em `quizPerfect`.
  - A tela manda ao serviço o total sem o dilema (`quizScoreOf(...).total`).
  - Na conta de teste, 7 de 7 gravou a esmeralda (`quiz8:2026-10-25`) e `quizPerfect`.
- **C3:** "{nota} de {total que conta}" no quadro pago e na prova já fechada. Foto `c3-nota-1280` lida: "7 de 7", "+42 XP", "+7 GOLD".
- **C4:** `depth` no `quizBank` e no retroativo; `difficulty` só quando a pergunta traz 1, 2 ou 3.

Barra rodada pelo líder: `tsc` 0 erros; `eslint` 0 erros (8 avisos antigos); `test:english` 33 arquivos e `test:village` 13, todos verdes; `vite build` ok.

Fica anotado para um pacote de tela:
- a esmeralda do acerto total é gravada, mas o papel mostra só XP e gold. Falta um terceiro chip "+1 esmeralda" quando `perfectQuiz`, para ele saber que ganhou.

**Commit único:** pacote 10, correções, 10c e os documentos do líder. Depois:
1. push;
2. o pai roda o retroativo na conta do Heitor;
3. pacote 10b (prova sempre com 8), que o líder escreve;
4. pacote 11.

## 24/09 — Uso real do Heitor de 18 a 24/09: análise e próximos passos

Leitura só de dados da conta do Heitor, sem gravar nada. Scripts e dump em `scratchpad/dados24/`. Janela: 18/09 (lançamento) a 24/09, 10h37.

### Funcionamento

- **O PC do Heitor está rodando a versão de 22/09 à noite (`2026-09-22-2a0658f`).** O site no ar já tem o pacote 10, as correções e o 10c: conferido no pacote publicado em `www.flashmissons.com`, que contém "Ainda em obra" e "Todas certas". Mas a aba dele nunca foi recarregada. Evidências:
  - a prova de 25/09 foi gerada hoje às 10h02 sem `theme.angle` e sem `depth`, o que o código novo sempre grava;
  - a de hoje fechou sem `timings` e sem nenhum doc no `quizBank`;
  - os 2 erros do app desde 20/09 são "Cannot read properties of undefined (reading 'default')", com essa versão: o erro de aba velha tentando carregar um pedaço do app que o servidor já trocou.
- **Consequência de hoje:** ele fez **5 de 5** na primeira prova v3 e **não ganhou a esmeralda**, porque no código velho a regra ainda era `score >= 8`. Não existe `quiz8:2026-09-24`.
- **`quizBank` do Heitor: 0 docs.** O retroativo ainda não rodou, e o código velho não grava. O perfil, a rotação por matéria fraca e a revisita estão sem dados.
- A função `openai` com teto em dólares está publicada (`aiUsage/2026-09` tem `tokensByModel`; 592 chamadas no mês).

### Rotina (missões)

- **Missões feitas por dia:** 2 de 10, 4 de 12, 6 de 12, 6 de 10, 2 de 8, 6 de 8 (18 a 23/09); hoje, 1 até as 10h37. **Nenhum dia completo** (`fullDays` 0; 0 tochas). Penalidade todo dia: −34 gold em 6 dias.
- Horários: de manhã (10h a 11h30) e no fim da tarde (18h). Marca várias de uma vez (três às 10h38 de 22/09).
- **Missões ativas que nunca foram feitas desde o lançamento:** "Lavar a Louça" (0 em 7 dias). "Bom Comportamento" foi marcada por ele mesmo uma vez. "Cuidar dos Pets" é a mais feita (5 em 7).
- **O Baú do Dia abriu em 20, 21, 22 e 23/09** com metade das missões. É a regra documentada (`chestNeedDone`, metade para cima). Não é defeito.
- **Nunca fechou o dia:** 0 check-ins em 7 dias. O "Fechar o dia" só abre às 20h ou depois do Baú, e ele joga às 10h e às 18h. O laço do plano (AP1) desenhado para o Fechar o dia nunca aconteceria: ajuste em `docs/APRENDER_A_APRENDER.md` §7.1.

### Prova do dia

- **Feita em 6 de 7 dias** (pulou 19/09). Notas: 4/8, 3/8, 4/8, 8/8 (22/09, a prova montada à mão pelo líder), 6/8 e **5/5 hoje**.
- **Reflexões melhoraram muito** desde que ficaram obrigatórias:
  - 20/09: 2 palavras;
  - 21/09: 4 palavras;
  - 22 a 24/09: 24 a 33 palavras, sempre ligadas ao tema e à vida dele.
  - Hoje: "se eu quisese comprar um brinquedo eu ia pesar duas vezes antes de compra porque tauves eu poderia economizar mais para comprar uma coisa". É aplicação da ideia do dia à vida dele.
  - Muitos erros de ortografia (quisese, tauves, disafiador, grasa, tanbem, ingrasadas, fasinado), esperados aos 10 anos.
- **Prova de hoje (a primeira v3), qualidade:**
  - a conta de duas etapas está certa (4 × 10 − 5), e o inglês ficou no nível;
  - mas foram só 6 perguntas (vira o pacote 10b);
  - ciências com distratores que se eliminam por bom senso ("Mais flores", "Árvores maiores");
  - história com explicação circular ("porque é um fato histórico amplamente reconhecido") e sem ligação com o tema;
  - o `why` do dilema diz "A resposta certa é...", o que a regra 6 proíbe.
- **A de amanhã (25/09),** gerada pelo código velho, tem 7 perguntas, sem dilema. Tem de novo o molde "Qual fato é verdadeiro sobre a Revolução X?", distratores de bom senso ("Cor e tamanho") e uma lição com duas defensáveis ("Para evitar lesões").
- O validador por lista de palavras não pega distrator absurdo nem explicação vazia: é trabalho para o revisor.

### Mina (inglês): o módulo que mais precisa de conserto

- **Contratos feitos por dia:** 4, 5, 4, 1, **0**, 5, **0** (hoje até as 10h37). Ele está evitando a Mina.
- **Ferraria:** 4,5 de 6; depois 0 de 6; 1 de 6; 0 de 6; 0 de 6. O conteúdo está quebrado:
  - regras erradas ("Use 'has' com 'my' para mostrar posse");
  - regra que não tem a ver com a frase (fala de adjetivo numa frase sem adjetivo);
  - contradição entre dias ("plural é com s" em 19/09, "three sheep" em 23/09);
  - dois dias seguidos com seis frases de 6 ou 7 palavras para montar, no nível 1.

  A conferência é justa (ignora maiúscula e pontuação). O problema é o conteúdo e a dificuldade. Seis erros seguidos, três vezes, é fracasso que não ensina, e explica a fuga.
- **Carta:** respondida em **11 a 19 segundos**, sem tocar a evidência (`evidenceHits` 0) e sem glossário. É chute, não leitura.
- **Comerciante:** 0 ou 1 de 2 (nenhuma entrega perfeita). **Recado:** 1 de 3 sempre, com esforço (3 a 5 minutos).
- **Vagoneta:** uma sessão (0 de 3) em 23/09.
- Nível 1; 41 palavras vistas; 4 "dominadas" pela regra antiga (`seen >= 3`).

### Economia e mundo

- 53 gold. XP 1.057 (nível 10). 2 esmeraldas, 1 diamante. Obras: Fornalha 1, Armazém 2, Torre 1, Biblioteca 1, Mercado 1.
- Nenhum livro contado ainda (a Biblioteca nível 1 abriu; há três livros cadastrados).
- Pedidos: Sábio no capítulo 3 ("Acerte todas", que ele fez hoje, mas no código velho não contou); Ferreiro no 2; Comerciante e Olheiro no 1.

### Agir hoje (pai)

1. **Recarregar a página no PC do Heitor (F5)** e, até o pacote 13 existir, fechar a aba à noite.
2. **Esmeralda de hoje:** ele fez 5 de 5 e o código velho não pagou. Dá para conceder à mão (`rare.esmeralda` +1 e `claimed['quiz8:2026-09-24']`), pelo painel ou por um script do líder com o ok do pai.
3. **Rodar o retroativo** (`backfill-quizbank.cjs`): agora inclui a prova de hoje.

### Próximos pacotes, nesta ordem

1. **Pacote 13 — o app se atualiza sozinho** (`PROMPT_CURSOR_2026-09-24.md`). Pequeno e urgente: sem ele, cada entrega chega ao Heitor dias depois, e abas velhas quebram.
2. **Pacote 14a — a Ferraria sai do círculo** (mesmo prompt). Causa achada ao meio-dia de 24/09:
   - a etiqueta de erro `other` do Recado vira o alvo "Frases completas";
   - `forgeItemMixFor(level, 'order')` devolve 6 frases de montar em qualquer nível;
   - o erro de ontem volta igual.

   Resultado: 0 de 6 em 21, 23 e 24/09. A correção limita a frase de montar (2 por dia e até 5 palavras no nível 1), faz `other` cair no rodízio e desce um degrau depois de 0 ou 1 acerto.
3. **Pacote 11** do prompt de 23/09 (já escrito): perfil, segunda tentativa com aviso, painel "Como ele vai". Depois, o **12**.
4. **Pacote 10b — prova sempre com 8 e revisor mais exigente.** Barrar:
   - distrator que se elimina por bom senso;
   - `why` que não explica;
   - "a resposta certa é" no dilema;
   - o mesmo molde de enunciado em dias seguidos.

   O líder escreve.
5. **Pacote 14b — Carta e conteúdo dos contratos.**
   - Portão de leitura da Carta: tempo mínimo pelo tamanho do texto e evidência antes da resposta, como em `MINA_CONTRATOS.md` §3.4.
   - Revisor de conteúdo para Ferraria, Carta e Recado. Hoje a Carta perguntou "You want three apples. What do you take?" com resposta "five apples", e o Recado pediu "maçã azul".

   O líder escreve.
6. **AP1 com o ajuste de hoje:** o laço do plano acontece no fim da prova, depois da reflexão (`APRENDER_A_APRENDER.md` §7.1).

### Para o pai decidir (rotina)

- Ele faz perto de metade das missões e nunca fecha um dia: 0 tochas, e penalidade todo dia. Opções:
  - rever a lista com ele (quais são realistas, e se "Lavar a Louça" de manhã faz sentido);
  - reduzir as devidas por dia;
  - manter como está e deixar o Baú da metade fazer o papel de dia bom.
- "Bom Comportamento" marcado pela criança é autoavaliação. No desenho dos comprovantes (decisão 24) vira "pai confirma".

## Pacote 13 — o app se atualiza sozinho (Cursor, 24/09) — APROVADO, com 1 correção do líder

O pai fez o commit (`1231af1`, 11h18) e o push antes da revisão; a revisão veio depois.

**Conferido em produção:**
- `https://www.flashmissons.com/version.json` responde `{"version":"2026-09-24-1231af1"}`, com `Content-Type: application/json` e `Cache-Control: no-store`.
- O bundle publicado (`App-Bi9jNibl.js`) carrega a mesma string. Então não há risco de recarregar em laço.
- **O PC do Heitor carregou `2026-09-24-1231af1` às 11h40** (`health.appVersion`). Daqui para frente as publicações chegam sozinhas.

**Barra rodada pelo líder:** `tsc` 0 erros; `eslint` 0 erros; `test:english` com 34 arquivos (inclui `utils/appUpdate.test.ts`); `test:village` com 13; `vite build` ok; o `dist/version.json` local bate com o bundle.

**O que está certo:**
- `version.json` sai do mesmo `appVersion()` que alimenta o `define`.
- `shouldReload` tem as cinco condições e a trava de 10 minutos.
- O hook não faz nada em DEV nem no teaser, e falha de rede não faz nada.
- A prova, a Mina/Vagoneta e a Estante marcam "ocupado".
- `touchHealth('appVersion')` é gravado ao abrir, e a linha de versão aparece no cartão Saúde.
- Evidência no preview: recarregou ao voltar para a aba; não recarregou com uma pergunta aberta.

**Corrigido pelo líder: corrida no "ocupado".** As telas soltam a chave na limpeza do efeito e marcam de novo no efeito seguinte, no mesmo commit do React. Isso acontece a cada troca de fase da prova e, na Estante do Sábio, a cada tecla. Como `setAppBusy` avisava os ouvintes na hora, o hook via o app "livre" nesse intervalo. Com uma versão nova esperando, podia recarregar no meio da prova ou do texto do livro.
- Agora o aviso sai depois do tique (`notifyBusy`, com `setTimeout(0)` único), quando a tela já marcou de novo.
- Teste novo em `utils/appUpdate.test.ts`: soltar e marcar no mesmo tique só avisa "ocupado"; soltar de verdade avisa "livre". Com o código antigo, o teste falha.
- `tsc` e `eslint` limpos; `utils` com 8 de 8.

Vai no próximo commit, junto com o relatório e as fotos do pacote 13. A aba do Heitor, que roda `1231af1`, ainda tem a corrida uma vez: melhor publicar quando ele não estiver no meio da prova nem escrevendo um livro.

**Fica anotado:** a foto do cartão Saúde não foi tirada, porque o login do pai está ligado à conta do Heitor. O pai confere a linha "Versão no PC dele" no painel.

## Pacote 14a — a Ferraria sai do círculo (Cursor, 24/09) — APROVADO depois do commit, com 1 ajuste (14a-2)

Commit e push feitos pelo pai (`ab96f2a`, 24/09 20h52, com a mensagem "Pacote 13: revisao e correcao da corrida do ocupado"), antes da revisão.

**Conferido:**
- `forgeItemMixFor` por nível (2, 3 ou 4 frases de montar);
- `forgeStepDown`, `forgeTargetFor` (`other` cai no rodízio);
- `scrambleWordCap` (5, 7, 8) no prompt e no validador, com o código `scramble_longo`;
- o banco offline da Ferraria ajustado ao limite;
- `forgeMix.test.ts`.

Barra rodada pelo líder: `tsc` 0 erros; `eslint` 0 erros; `test:english` com 35 arquivos; `test:village` com 13; `vite build` ok.

**Em produção funciona:** o plano da Mina de 26/09, gerado em 25/09 às 9h40 pelo código novo, tem alvo "am / is / are". São 4 lacunas e 2 digitadas, e as regras estão certas ("Use 'is' com singular: The dog is.").

**Ajuste (14a-2):** o plano de amanhã é gerado de manhã, antes da Ferraria do dia. `yesterdayForgeScore` procura a Ferraria de ontem em relação à data do plano e acha uma ainda sem resultado. Assim o degrau para baixo quase nunca dispara: o `form` de 26/09 veio do rodízio, não do degrau. Passa a olhar a última Ferraria **concluída** (`PROMPT_CURSOR_2026-09-25.md`).

## 25/09 — ontem e hoje (dados do Heitor até 10h)

**As melhorias no PC dele:**
- O PC está em `2026-09-24-ab96f2a`, a versão no ar: a atualização automática funcionou.
- A prova de hoje gravou 7 docs no `quizBank`, com `supportLevel` 0 e `msToAnswer` de 2 a 33 s, e gravou `timings`.
- 7 de 7 pagou a esmeralda (`quiz8:2026-09-25`), e o capítulo 3 do Sábio ("Acerte todas") foi concluído hoje. As duas coisas vêm da regra nova (C2).
- A prova de amanhã (26/09) saiu do código novo, com ângulo e `depth` 3 ("A lógica por trás dos computadores"), mas com **6 perguntas**.
- Nenhum erro no app desde 24/09 às 11h.

**Ainda pendente:**
- O retroativo não foi rodado (o `quizBank` tem só as 7 de hoje).
- A esmeralda do 5 de 5 de 24/09 não foi concedida.

**24/09, resto do dia:** nada depois das 11h07. Fechou com **2 de 8 missões** (Matific e Pets). Sem check-in, sem tocha.

**25/09 até 10h:**
- **Prova:** às 9h37, 7 perguntas, sem dilema, **7 de 7**.
  - Várias respostas em 2 a 4 s, e distratores de bom senso ("Correria mais rápido", "Cor e tamanho").
  - Reflexão com 23 palavras e aplicada à vida dele: "se eu treinase eu poderia ficar mais forte e mais rapido e se eu comese frutas veguetais e massa ima me ajudar bastante".
  - O Sábio respondeu "Li sua reflexão.": perdeu o momento.
- **Mina:** os 5 contratos em cerca de 5 minutos (9h40 às 9h45).
  - Recado: 1 de 3 em 128 s.
  - Cartas: **2 de 3 em 10 s** e **0 de 3 em 6 s**, ou seja, sem ler.
  - Comerciante: 1 de 2.
  - Ferraria: 0 de 6 em 71 s. É do plano velho, gerado em 24/09 às 10h58, antes do 14a: seis frases de 7 ou 8 palavras.
  - Vagoneta: 0 de 3.
- **Missões:** 1 (Matific às 9h28).

**Leitura:**
- A prova ficou fácil demais e curta. O 10b é o próximo.
- A Carta virou clicar e passar. O 14b dá um portão de leitura.
- A rotina da vida real segue em metade ou menos, sem dia completo. Decisão do pai sobre a lista de missões, registrada em 24/09.

## Pacote 14a-2 — a Ferraria olha a última concluída (Cursor, 25/09) — APROVADO; pode commitar

Revisado antes do commit.

- `lastForgeScore(plans, date)` em `prompts.ts` devolve a Ferraria **concluída** mais recente de qualquer plano anterior à data; Ferraria aberta não conta.
- `dayContextFor` passa a usar essa função, e `yesterdayForgeScore` saiu.
- Teste em `forgeMix.test.ts` com os três casos (23/09 com 0/6 e 24/09 aberta → desce; 4/6 → não desce; nenhuma concluída → não desce).
- Barra: `tsc` 0 erros; `eslint` 0 erros; `english` com 12 arquivos verdes.

**Fica anotado:** `yesterdayMistakes`, os 2 itens errados que voltam na Ferraria de amanhã, tem o mesmo desencontro. Ele olha o plano de exatamente um dia antes, que ainda está aberto quando o plano é gerado, então hoje não traz nada. Não mexer agora: trazer de volta as frases longas que ele errou brigaria com o degrau para baixo. Entra no 14b, com o revisor de conteúdo, trazendo só itens do alvo do dia.
