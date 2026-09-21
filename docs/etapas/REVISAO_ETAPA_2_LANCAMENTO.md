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
