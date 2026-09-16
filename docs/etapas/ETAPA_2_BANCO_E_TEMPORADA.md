# Etapa 2: Banco da Vila, desafios, efeitos, dia justo e temporada

Arquivo autossuficiente para a IA que vai programar (Cursor). Leia inteiro antes de começar. Contexto geral em `docs/MINER_MISSIONS_ROADMAP.md` (invariantes na seção "Lógica principal que nunca muda"; economia decidida na seção "Economia interna v2"), tema visual em `docs/MINER_MISSIONS_TEMA.md`, API da etapa anterior em `docs/VILA_API.md`, revisão da etapa anterior em `docs/etapas/REVISAO_ETAPA_1.md` (tudo que está lá precisa estar resolvido antes desta etapa começar).

## 0. Contexto

Depois da Etapa 1 o Heitor tem uma Vila: minerador, base com lotes, missões pagando gold, XP e materiais, Oficina (construir, craftar, trocar), Mercado (Loja da Vila e prêmios de verdade), Baú do Dia, Placa da Vila, prova do dia como portão, painel do pai com aba Vila e conta de teste. A curva de nível nova (teto 40 por temporada) entrou junto com a "nova fase" de 18/09.

A Etapa 2 faz o jogo ter **consequência e escolha**: o equipamento importa, o dia tem um clímax (Baú) e um fechamento (Fechar o dia), ele aprende a poupar (Cofrinho com bônus de paciência), a cumprir metas com prazo (desafios), a consertar o que perdeu (conserto) e a planejar (Plano do turno, missão própria). A economia v2 decidida pelo pai entra inteira. O painel ganha um cartão "Hoje" e o relatório semanal. A chave da OpenAI sai do bundle (Cloud Function).

Dois lotes, dois relatórios. O Lote 1 é o que muda dinheiro e regras; o Lote 2 é autonomia, temporada e painel. Não comece o Lote 2 antes do Lote 1 estar revisado.

## 1. Decisões já tomadas (não reabrir)

1. **Economia v2** (roadmap, seção "Economia interna v2", decisões de 15/09): gold é escolha, XP é crescimento, material é construção, raro é marco; gold só por esforço com valor fixo, nada sorteado em gold; régua "dia de renda" (`R7` = média de gold ganho nos últimos 7 dias; reserva `incomeDayGold = 45`); teto de nível 40 por temporada de 13 semanas; sem gold por patente; prova linear 2 gold + 6 XP por acerto; Baú do Dia no lugar do bônus de dia completo (`allDoneBonus = 0`, já feito); prêmios enormes (20 dias de renda ou mais) só por meta no Cofrinho; construções custam o dobro em madeira, pedra e ferro; Comerciante compra material excedente já nesta etapa.
2. **Todo pagamento novo é `runTransaction`** lendo `progress`, gravando o saldo e a linha de `goldTransactions` com `balanceBefore`/`balanceAfter` no mesmo `tx`. Nunca `adjustUserGold`/`adjustUserXP` em código novo. Saldo nunca negativo. Uma concessão por chave em `village.claimed`.
3. **Cofrinho**: o gold guardado sai do saldo disponível no depósito e só volta por cancelamento (decidido pelo pai); juros ("bônus de paciência") 5% por semana ISO sobre o que estava guardado antes da semana começar, teto global 20 gold por semana somando as metas, uma vez por semana, idempotente; máximo 2 metas abertas; meta alcançada é fechada pelo pai e vira prêmio real entregue; penalidade nunca alcança o Cofrinho; cancelar mantém os juros pagos.
4. **Desafios** pagam uma única vez, por transação que recusa se `completedAt` existe; o pai cria (modelos prontos); a criança pode propor; progresso avança nos pontos onde o evento acontece; `expired` é derivado na leitura.
5. **Punição sem pena dupla**: com punição ativa na data, `closeDay` grava `punished: true` sem penalidade nem bônus, tochas congelam, desafios abertos ganham os dias de punição no prazo; Biblioteca e Mina continuam abertas sem pagar; Loja, Baú, Prêmios e cosméticos travam.
6. **Hábitos** não são botões. A Placa mostra a "Dica do turno" (feita na revisão da Etapa 1). A confirmação vira uma pergunta única em "Fechar o dia", uma vez por dia, sem gold.
7. **Aprender não é emprego**: nada novo de aprendizado paga gold. Só missões, prova, Mina, Baú, tochas, desafios e conquistas pagam gold.
8. **Servidor mínimo**: uma Cloud Function `openai` (Blaze já ativo) com a chave em Secret Manager e o teto mensal no servidor substitui a chave no bundle. Sem push nesta etapa.
9. **Cena e arte**: continua canvas 2D; arte nova é gerada pelo líder com o pipeline (`docs/ARTE_PIPELINE.md`); a IA de código usa os arquivos listados na seção 9 e faz fallback quando faltar.
10. **Painel dos pais** continua Tailwind branco/azul; só as abas e cartões desta etapa mudam. Sem emojis. Português do Brasil. Fonte pixel só em títulos e números (`mc-num` tem 12px fixos: use `fontSize` inline).
11. **PC**: 1280x720 em tela cheia é a referência; 390 px só não pode quebrar.

## 2. Modelo de dados

Datas sempre `YYYY-MM-DD` no fuso do Brasil (`getTodayBrazil`, `isoWeekOf`). Nunca gravar `undefined` (`stripUndefined` de `villageService`). **Toda coleção nova desta etapa nasce com `userId` e `familyId` (por enquanto sempre `'heitor'`, constante `FAMILY_ID` em `config/rules.ts`), e as regras conferem os dois; toda leitura de `settings/*` passa por `settingsService`** (roadmap, "Visão de produto": não fechar a porta para várias famílias).

`goals/{id}` (Cofrinho):
```
userId, title (<= 40), targetGold (>= 20), savedGold, status: 'open' | 'achieved' | 'cancelled' | 'cancel_requested',
rewardId?: string            // prêmio real ligado, quando criado pelo atalho "Criar meta no Cofrinho"
cancelReason?: string        // pedido da criança
lastInterestWeek?: string    // 'YYYY-Www' da última semana paga
interestPaid: number         // total de juros recebidos
createdAt, updatedAt, achievedAt?, cancelledAt?
```
`challenges/{id}`:
```
userId, title, description, kind: 'tasks_count' | 'streak_days' | 'quiz_correct' | 'english_contracts' | 'full_days' | 'manual',
target, progress, startsOn, endsOn, xpReward (<= 100), goldReward (<= 60), createdBy: 'admin' | 'child',
status: 'active' | 'proposed' | 'rejected', completedAt?, extendedDays (dias de punição somados), createdAt, updatedAt
```
`village/{uid}` ganha:
```
npcs: Record<'sabio' | 'comerciante' | 'ferreiro' | 'olheiro', { points: number; tier: number; lastTalkDate: string | null; seen: string[]; quest: { chapter: number; progress: number; doneAt: string | null } }>   // amizade e pedidos (seção 15)
cracks: string[]                       // ids de lotes rachados (conserto), ex.: ['fornalha']
records: Record<string, number>        // já existe: 'weekGold', 'fullDays', 'quizBest', 'mineShift' (Etapa 4)
stars: Array<{ season: number; level: number; endedOn: string }>   // uma por temporada fechada
trophies: Record<string, 'bronze' | 'prata' | 'ouro'>              // por semana ISO
plan: { date: string; order: string[]; focusTaskId: string | null }  // Plano do turno do dia
claimed: chaves novas 'streak:<n>:<fullDaysStart>', 'trophy:<semana>', 'repair:<date>', 'level:<season>:<n>', 'milestone:<season>:<n>'
```
`dailyProgress/{uid}_{date}` ganha `checkin: { water, stretch, kindness, screen, tomorrow: string, at }` (uma escrita só), `repaired: boolean`, `helmetUsed: boolean`.
`taskCompletions` ganha `late: boolean` (missão recuperada) e `focus: boolean` (missão-foco).
`tasks` ganha `optional: boolean` (missão extra: até 1 por dia, paga 2x material, nunca conta como perdida) e `origin: 'admin' | 'child'` + `status: 'proposed'` para missão própria (o pai aprova mudando para `pending`).
`learning/{uid}` (relatório semanal v1, calculado no cliente ao abrir o app no domingo à noite ou quando o pai abre o painel; idempotente por `week`):
```
week: 'YYYY-Www', quizAccuracyByCategory: Record<string, number>, wordsMastered: number, reflections: number,
savingsRatePct: number, goldEarned, goldSpent, goldSaved, fullDays, challengesDone, updatedAt
```
`settings/economy` ganha (padrões): `incomeDayGold 45`, `quizGoldPerHit 2`, `quizXpPerHit 6`, `dailyChestGold [10, 15]` (base + 1 por tocha até o teto), `gameGoldDailyCap 35`, `gameGoldWeeklyCap 100`, `challengeGoldWeeklyCap 60`, `achievementGoldCap 40`, `buildCostMultiplier 2`, `merchantBuy { materials: 10, gold: 3, dailyCap: 2 }`, `savingsTargetPct 20`, `interestRatePct 5`, `interestCapGold 20`, `maxOpenGoals 2`, `lateMissionUntilHour 12`, `lateMissionGoldPct 50`, `repairRefundPct 50`, `seasonWeeks 13`, `levelCap 40`. `interestRatePct`/`interestCapGold` saem de `settings/village`.
`GoldTransaction.source` ganha `'goal_deposit' | 'goal_withdraw' | 'goal_interest' | 'goal_achieved' | 'challenge' | 'repair' | 'merchant_sale' | 'streak_chest' | 'trophy' | 'late_task'`; `type` ganha `'saved'` (depósito, estorno e juros: `balanceBefore == balanceAfter` na linha de juros, fora de `totalGoldEarned`). Rótulos em `GoldHistory` e no Extrato.
`aiUsage/{yyyy-mm}` continua no cliente para leitura; a contagem oficial passa a ser feita pela função.

## 3. Economia v2: o que muda no código

- `src/config/village.ts`: `GEAR[].minLevel` (pedra 5, botas 10, ferro 10, capacete 15, lanterna 15, capa 25, ouro 20, diamante 30) e `COSMETICS[].minLevel` (comuns 5, pets 15, capas 20, premium 25); `LEVEL_REWARDS` (todo nível: 1 material à escolha; 5/15/25/35 esmeralda; 10/20/30/40 diamante; 10/20/30/40 cosmético exclusivo `milestone_10..40`, não vendável); `PRICE_BANDS = [{id:'mimo', days:0.5}, {id:'pequeno', days:1}, {id:'medio', days:3}, {id:'grande', days:7}, {id:'enorme', days:20, onlyGoal:true}, {id:'temporada', days:50, onlyGoal:true}]`; `DEFAULT_ECONOMY` com as chaves da seção 2.
- `src/config/englishBase.ts`: `buildingCost(id, level, multiplier)` multiplica madeira, pedra e ferro (redstone x1); a Base e a Oficina usam a mesma função.
- `src/services/dailyQuizService.ts`: `quizRewards(score, total, settings)` linear: `gold = score * quizGoldPerHit`, `xp = score * quizXpPerHit`; 8/8 concede 1 esmeralda por `villageService.grantRare(uid, 'esmeralda', claimKey('quiz8', date))`.
- `src/services/village/chest.ts`: `dailyChestContents` passa a ser determinístico em gold: `gold = min(teto, base + fullDays)`; materiais: 2 do tipo mais escasso em `englishBase.materials` (empate: madeira, pedra, ferro); esmeralda quando `(fullDays + 1) % rareEveryNDays === 0`. O hash continua só para desempate de material.
- `src/services/village/shop.ts`: `canCraft` e `canBuy` recebem `level` e devolvem `reason: 'level'` com `minLevel`; `tradePreview` recusa redstone como destino.
- Comerciante: `sellMaterials(uid, material, lots)` em `villageService` (transação: debita `lots * merchantBuy.materials` do material, credita `lots * merchantBuy.gold`, linha `merchant_sale`, chave `merchant:<date>:<n>` limitada a `dailyCap` por dia). Tela: aba "Comerciante" no Mercado.
- Tetos de gold do jogo: `src/services/village/caps.ts` puro: `gameGoldRoom(transactionsToday, transactionsWeek, settings)` devolve quanto ainda cabe hoje e na semana para as fontes `chest, streak_chest, challenge, achievement, goal_interest, merchant_sale, trophy, repair`; os serviços que pagam essas fontes leem as transações do dia/semana antes da transação e cortam o valor no teto (registrando `metadata.capped: true`). Nunca cortam missão, prova ou Mina.
- `RewardForm` (painel): mostra `R7` ("Ele ganha cerca de N gold por dia") e seis botões de faixa que preenchem o preço (`round(R7 * dias / 5) * 5`); faixas `enorme` e `temporada` marcam o prêmio com `goalOnly: true` (novo campo em `rewards`), que o RewardsPanel mostra com "Só pelo Cofrinho" e o botão "Criar meta". O preço fica livre para o pai mudar.
- `src/services/village/income.ts` puro: `referenceIncome(transactions7d, fallback)`, `priceForDays(r7, days)`, `daysToAfford(price, gold, r7)`; usado pela Placa, pelo Mercado, pelo RewardForm e pelo Cofrinho.
- Simulador `scripts/econ-sim.mjs` (Node, sem Firebase): 91 dias, três perfis (típico, misto, perfeito), imprime gold ganho/gasto/guardado, nível por semana, materiais e alertas (saldo parado > 15 D, item inalcançável em 13 semanas). Rodar e colar o resumo no relatório; ajustar constantes só se um alerta disparar.

## 4. Módulos puros (primeiro; testes em Node em `src/services/village/__tests__/`)

- `bank.ts`: `validateDeposit(goal, amount, availableGold)`, `weeklyInterest(goals, weekIso, settings)` (5% do `savedGold` que já existia antes da semana, soma limitada a `interestCapGold`, rateio proporcional quando estoura, ignora metas com `lastInterestWeek === week`), `weeklyStatement(transactions, weekIso)` (ganhou, gastou, guardou, juros, taxa de poupança, por fonte), `savingsRate(transactionsMonth)`.
- `challenges.ts`: `applyEvent(challenge, event: { kind, value, absolute? }, date)` devolve o desafio atualizado e `justCompleted`; `challengeState(challenge, today)` devolve `'active' | 'done' | 'expired' | 'upcoming'`; `extendForPunishment(challenges, days)`.
- `income.ts` e `caps.ts` (seção 3).
- `repair.ts`: `cracksAfterClose(cracks, missedTaskIds, lotsByPeriod)` (dia perdido deixa 1 lote rachado, o do período da primeira missão perdida), `canRepair(cracks, dueToday, doneToday)`, `repairRefund(penaltyOfLostDay, settings)`.
- `late.ts`: `lateWindow(hourBrazil, settings)`, `lateTaskReward(task, settings)` (metade do gold, arredondado para baixo, sem material, XP inteiro).
- `season.ts`: `seasonEndsOn(startedOn, weeks)`, `trophyOfWeek(thisWeek, lastWeek)` (bronze: fez pelo menos 60% da semana anterior em gold; prata: igualou; ouro: superou em 20% ou mais e teve 5 tochas), `recordsAfterWeek(records, weekStats)`.
- `levels.ts`: `levelGift(level, season)` (material à escolha, raro, cosmético de marco) e `minLevelFor(itemId)`.
- `checkin.ts`: `checkinXp(answers)` (5 XP fixos se respondeu, 0 se não), `sageReplyFor(answers, seed)` (fala do Sábio da manhã seguinte, banco de 30 frases em `src/data/villageLines.ts`).
- `chest.ts` alterado (seção 3) com os testes ajustados.

Cada função com pelo menos um teste de caso normal e um de borda (semana virando o ano, teto estourado, desafio expirado no mesmo dia, punição prolongando prazo, depósito maior que o saldo).

## 5. Serviços (Firebase)

- `src/services/goalsService.ts`: `subscribeGoals(uid)`, `createGoal(uid, {title, targetGold, rewardId?})` (recusa se já há `maxOpenGoals` abertas), `depositGoal(uid, goalId, amount)` (transação: `progress.availableGold -= amount`, `goal.savedGold += amount`, linha `goal_deposit` tipo `saved`), `requestCancel(uid, goalId, reason)`, `applyWeeklyInterest(uid)` (roda ao abrir o app; transação por meta; linha `goal_interest` com `balanceBefore == balanceAfter` e `metadata {goalId, savedBefore, savedAfter, week}`; respeita `gameGoldRoom`), `finishGoal(goalId, 'achieved' | 'cancelled', adminUid)` (admin: `achieved` zera `savedGold` e cria `redemptions` já aprovado ligado a `rewardId` ou com o título da meta; `cancelled` devolve `savedGold` ao saldo com linha `goal_withdraw`).
- `src/services/challengesService.ts`: `subscribeChallenges(uid)`, `createChallenge(...)` (admin ou proposta da criança com `status: 'proposed'`), `approveChallenge`, `bumpChallenge(uid, kind, value, absolute?)` chamado em `DataContext.completeTask` (`tasks_count`), `FirestoreService.updateStreak` (`streak_days`, absoluto), `completeDailyQuiz` (`quiz_correct`), `englishBaseService.completeContract` (`english_contracts`), `closeDay` (`full_days`, absoluto). `completeChallenge` em transação: recusa se `completedAt`, paga XP e gold (linha `challenge`, respeitando `challengeGoldWeeklyCap` e `gameGoldRoom`), grava chave `challenge:<id>` em `village.claimed`.
- `src/services/villageService.ts` ganha: `grantRare(uid, kind, claimKey)`, `openStreakChest(uid)` (7, 14, 21 tochas: 20 gold + 1 diamante, chave `streak:<n>:<fullDaysStart>`; a cada 21 um cosmético exclusivo quando existir), `sellMaterials`, `repairLot(uid, date)` (todas as missões de hoje feitas: remove a rachadura, devolve `repairRefundPct` da penalidade do dia perdido com linha `repair`, chave `repair:<date>`), `savePlan(uid, plan)` (só antes das 12h, uma vez por dia), `submitCheckin(uid, date, answers)` (transação: recusa se `checkin` já existe; +5 XP via `progress.totalXP` no mesmo `tx`), `claimTrophy(uid, week)` (sábado à noite ou depois; ouro dá 1 esmeralda), `closeSeason(uid, adminUid)` (substitui `startNewSeason`: snapshot com nível, estrela em `village.stars`, XP zera, `season + 1`, conquistas de temporada arquivadas e pacote recriado sem duplicar, tudo em uma transação com `writeBatch` para as conquistas; botão desabilitado enquanto roda).
- `src/services/firestoreService.ts`: `completeTaskWithRewards` ganha o portão de horário na transação (`PERIOD_LOCKED`), `late` (metade do gold, sem material, só até `lateMissionUntilHour` e só para a data de ontem com `dailyProgress` já fechado), `optional` (2x material, nunca conta como perdida em `dueTasksOn`), `focus` (missão-foco paga material em dobro uma vez por dia); `revertTaskCompletion` de dia já fechado: recalcula `dailyProgress` (missões feitas, penalidade da missão que passou a faltar com linha `daily_penalty`), `village.fullDays` (se o dia deixou de ser completo, zera a partir dele) e registra `metadata.chestKept` se o Baú daquele dia foi aberto.
- `src/services/dailyRulesService.ts`: `closeDay` lê `village.gear.helmet` e, se a missão perdida for a única do dia e `shield.helmetWeek !== isoWeekOf(date)`, reduz `missed` em 1 e grava `helmetWeek` e `dailyProgress.helmetUsed` na mesma transação; grava `cracks` (seção 4); com `punished` estende `endsOn` dos desafios ativos em 1 dia (uma vez por data, chave `punish:<date>` em `claimed`); com `dailyRules.enabled = false` continua fechando o dia (sem penalidade e sem bônus).
- Efeitos (`src/services/village/loot.ts` já tem picareta e botas): lanterna = `ContractBoard` mostra os contratos de amanhã e `DailyQuiz` mostra o tema de amanhã, 1 Dica grátis por dia no Recado (`englishBase`? não: `village.claimed['hint:<date>']`); capa = visual (Etapa 4 protege tochas).
- `src/services/learningService.ts`: `computeWeeklyLearning(uid, week)` a partir de `dailyQuizzes`, `englishSessions`, `goldTransactions`, `dailyProgress`, `challenges`; grava `learning/{uid}` (idempotente por `week`).
- **Cloud Function `openai`** (`functions/`, Node 20, TypeScript, `firebase-functions/v2` `onCall` com `secrets: ['OPENAI_API_KEY']`): recebe `{ kind: 'chat' | 'tts', model, input, temperature, withUsage, voice }`, valida `request.auth`, conta a chamada em `aiUsage/{yyyy-mm}` com `FieldValue.increment` e recusa acima de `AI_MONTHLY_CALL_CAP` (mesmo valor do cliente) com erro `resource-exhausted`; `chat` devolve o mesmo formato que `callOpenAI` devolve hoje; `tts` gera o áudio, grava em Storage `english/tts/{hash}.mp3` e devolve a URL. O cliente: `callOpenAI` em `src/services/aiQuiz.ts` e o TTS em `englishTts.ts` passam a usar `httpsCallable(getFunctions(app, 'southamerica-east1'), 'openai')` mantendo as assinaturas; `VITE_OPENAI_API_KEY` sai do `.env.example`, do `firebase.ts` e da Vercel; `settings/modules.aiGeneration` e `.tts` são lidos pela função também (desligado = erro `failed-precondition` com mensagem em português). Deploy: `npx firebase-tools deploy --only functions --project app-heitor` (o líder cria o secret: `npx firebase-tools functions:secrets:set OPENAI_API_KEY`). Registrar no relatório o custo estimado (2 milhões de chamadas grátis por mês; efetivamente zero).

## 6. Telas da criança (`src/components/hero/village/`)

- **Cofre** (7º lote da cena, `buildings/cofre-1..3.png` conforme o total guardado: 0 a 99, 100 a 299, 300 ou mais; placa quando `bank` desligado) abre `Cofrinho.tsx`: metas abertas com barra (`mc-bar`), "Guardar" com valor (botões 5, 10, 20, 50 e campo), "Bônus de paciência" explicado em uma linha ("5% por semana do que está guardado, até 20 gold"), meta batida mostra "Avise seu pai" e a estrela; "Pedir para cancelar" com motivo. Máximo 2 metas; criar meta pede título e valor, ou vem pronta do atalho.
- **Extrato** (`Extrato.tsx`, aba dentro do Cofre): semana atual e as 4 anteriores: ganhou, gastou, guardou, juros, "guardou X% do que ganhou" (alvo `savingsTargetPct`) e uma frase do Sábio; uma vez por mês, a comparação honesta ("na poupança de verdade, 100 reais rendem menos de 1 real por mês; aqui o bônus é maior de propósito, para você treinar").
- **Atalho "Criar meta no Cofrinho"**: na Loja e nos Prêmios de verdade, quando falta gold, o botão vira esse atalho com o valor e o título já preenchidos; prêmios `goalOnly` só têm esse botão.
- **Desafios** (`DesafiosCard.tsx`, abaixo das missões na Vila): desafios ativos com prazo ("até sábado"), progresso e prêmio; desafio concluído mostra o carimbo e some em 7 dias. **"Propor desafio" fica fora da tela da criança** (decisão do pai em 15/09): um botão solto com título e número não tem valor; volta só com a Torre nível 3 e um desenho próprio (modelos prontos para a criança escolher, prêmio fixo e visível, prazo em dias da semana), no Lote 2 ou depois. O serviço com `status: 'proposed'` e a aprovação no painel podem existir sem entrada na tela.
- **Baú do Dia** (já existe): escada por tochas visível ("Baú de hoje: 10 + 3 tochas = 13 gold"); **Baú das 7 tochas** aparece na cena ao lado do Baú do Dia quando `fullDays` bate 7, 14, 21 (ícone `chest_streak`), com animação `mc-build`, som `unlock`, conteúdo mostrado.
- **Conserto**: lote rachado na cena (overlay `fx_rachadura.png` com `mc-shake` uma vez ao carregar); "Conserte hoje" no resumo de ontem (duas linhas: o que aconteceu, o que fazer hoje; sem ridicularizar); ao fazer todas as missões de hoje, a rachadura some com `mc-pop` e o toast diz quanto voltou.
- **Missão recuperada**: até `lateMissionUntilHour`, a missão perdida de ontem aparece no topo das missões com "Recuperar" (metade do gold, sem material) e some depois.
- **Plano do turno** (manhã, até 12h, primeira abertura do dia): modal `mc-panel` com as missões devidas de hoje em lista ordenável (setas, sem drag) e "Missão-foco" (1 por dia, material em dobro); "Começar o turno" grava `village.plan` e a lista de missões passa a seguir essa ordem com a foco marcada.
- **Fechar o dia** (noite, depois das 20h, ou ao abrir o Baú): modal com 4 perguntas de sim/não (água, alongar, gentileza, tela; texto vindo de `habitLines`, uma fala do NPC dono), 1 linha "amanhã eu..." (mínimo 3 palavras) e "Fechar"; paga 5 XP; grava `dailyProgress.checkin`; na manhã seguinte o Sábio responde com `sageReplyFor` na Placa. Sem check-in não há penalidade nenhuma.
- **Missão própria e extras**: "Criar missão" na lista de missões (título, período; vai como `proposed`, o pai aprova; paga XP e material, nunca gold); missões `optional` aparecem numa faixa "Extra" com "2x material" e nunca contam como perdidas.
- **Tela "Dia fechado"**: quando todas as cotas pagas do dia acabaram (missões, prova, 3 contratos, Baú), a Vila mostra uma faixa "Por hoje é isso. Amanhã tem mais." e depois das 21h a cena fica em noite sem abrir nada novo (Biblioteca e Torre continuam abrindo).
- **Torre**: aba "Recordes" (`village.records`: melhor semana em gold, maior sequência de tochas, melhor prova) e "Troféus" (por semana ISO: bronze, prata, ouro; sábado à noite aparece "Troféu da semana" com a comparação); aba "Mapa de habilidades" (barras por categoria de `learning/{uid}`).
- **LevelUpModal**: material à escolha (já feito na Etapa 1) + raro nas patentes + cosmético exclusivo nos marcos (quando o PNG existir; senão só o texto "Cosmético de marco chega em breve").
- **Mercado**: aba "Comerciante" (vender 10 materiais por 3 gold, até 2 vendas por dia, mostra "material sobrando" por tipo); Loja mostra "Nível N" em item com `minLevel` acima do atual, com o botão desabilitado.
- **Placa**: linha do Sábio respondendo o check-in de ontem; "Troféu da semana" no sábado; "Desafio vence amanhã".
- **Punição**: `PunishmentModeScreen` mantém as regras; a Vila mostra rachaduras que somem ao terminar; Loja, Baú, Prêmios e cosméticos travados com a explicação de uma linha.

## 7. Painel do pai (`src/components/parent/`)

- **Cartão "Hoje"** no topo: resgates pendentes, metas batidas para fechar, pedidos de cancelamento, desafios e missões propostos pela criança, desafios vencendo, dias não fechados, uso de IA acima de 80%, erros do app nas últimas 24h. Cada linha é um link para a aba.
- **Abas reagrupadas** em quatro grupos: Hoje (cartão, resgates, propostas), Jogo (Vila, Cofrinho, Desafios, Prêmios, Missões), Conteúdo (Prova, Placa, Mina), Ajustes (Economia, Módulos, Folga, Saúde, Nova temporada). Nada de visual novo: só a navegação.
- **GoalsPanel** e **ChallengeManager**: adaptar de `C:\Users\Nobody\Downloads\Samsonite\appheitor-v2\src\components\parent\GoalsPanel.tsx`, `ChallengeManager.tsx` e `LedgerList.tsx` (Supabase) para o Firestore e os serviços da seção 5. Modelos prontos de desafio: "5 dias seguidos" (`streak_days` 5), "20 missões na semana" (`tasks_count` 20), "Prova 8/8 duas vezes" (`quiz_correct` 16 em 7 dias), "3 contratos por dia durante 5 dias" (`english_contracts` 15), "3 tochas" (`full_days` 3). Aprovar ou recusar propostas da criança.
- **Balança** (aba Economia): 28 dias de `goldTransactions`: ganho por fonte, gasto por ralo, guardado, saldo em dias de renda, taxa de poupança; alertas "saldo parado > 14 D", "nada comprado há 21 dias", "gold de jogo > 30%"; botão "Reajustar prêmios x1,1 / x0,9" (atualiza `costGold` de todos os prêmios ativos, arredondando a 5).
- **RewardForm**: `R7` e botões de faixa (seção 3); campo `goalOnly`.
- **Missões**: aprovar missão própria; marcar `optional`.
- **Nova temporada**: botão "Fechar temporada" (substitui "Iniciar nova fase") com a data prevista (`seasonEndsOn`) e confirmação; desabilitado enquanto roda.
- **Relatório semanal v1** (aba Hoje, domingo): o conteúdo de `learning/{uid}` em quatro cartões (prova, inglês, hábitos e reflexões, dinheiro), com o botão "Recalcular".
- **Saúde**: chips vermelhos só quando passa de 1 dia; `lastQuizGenerated`, `lastPlanGenerated`, `lastInterestWeek`, `lastLearningWeek` alimentados pelos serviços.

## 8. Regras do Firestore (literal, e publicar antes do teste no navegador)

```
match /goals/{id} {
  allow get, list: if signedIn() && (isAdmin() || resource == null || resource.data.userId == request.auth.uid);
  allow create: if signedIn() && request.resource.data.userId == request.auth.uid
    && request.resource.data.status == 'open' && request.resource.data.savedGold == 0;
  allow update: if isAdmin() || (signedIn() && resource.data.userId == request.auth.uid
    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['savedGold', 'lastInterestWeek', 'interestPaid', 'status', 'cancelReason', 'updatedAt'])
    && request.resource.data.savedGold >= resource.data.savedGold
    && (request.resource.data.status == resource.data.status || request.resource.data.status == 'cancel_requested'));
  allow delete: if isAdmin();
}
match /challenges/{id} {
  allow get, list: if signedIn() && (isAdmin() || resource == null || resource.data.userId == request.auth.uid);
  allow create: if isAdmin() || (signedIn() && request.resource.data.userId == request.auth.uid && request.resource.data.status == 'proposed');
  allow update: if isAdmin() || (signedIn() && resource.data.userId == request.auth.uid
    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['progress', 'completedAt', 'extendedDays', 'endsOn', 'updatedAt']));
  allow delete: if isAdmin();
}
match /learning/{uid} { allow read, write: if signedIn() && (isAdmin() || uid == request.auth.uid); }
```
`village`, `dailyProgress`, `taskCompletions` continuam como estão; `tasks` ganha `create` pela criança só com `origin == 'child'` e `status == 'proposed'` e `gold == 0`. Índices novos: `goals(userId, createdAt desc)`, `challenges(userId, endsOn)`. Regras e índices: `npx firebase-tools deploy --only firestore:rules,firestore:indexes --project app-heitor`.

## 9. Arte (feita pelo líder; a IA de código só consome)

`public/assets/village/buildings/cofre-1.png`, `cofre-2.png`, `cofre-3.png` (96x96), `items/chest_streak.png` e `items/chest_streak_open.png` (32x32), `items/trophy_bronze.png`, `trophy_prata.png`, `trophy_ouro.png`, `tiles/fx_rachadura.png` (96x96, fundo transparente), `char/miner-milestone-10..40.png` e `items/milestone_10..40.png` (cosméticos de marco: capacete de pedra, capa dourada, coroa de diamante, coroa de Lenda). Se o arquivo não existir, use o fallback: cofre = `ui/base/s_box.webp`, baú das tochas = `ui/chest.webp`, troféu = `ui/trophy.webp`, rachadura = desenhar 3 linhas pretas no canvas, cosmético de marco = texto "em breve".

## 10. Conta de teste, verificação e aceite

Conta `teste@flash.com` (`scripts/seed-test-account.cjs` e `scripts/reset-test-account.cjs`; `settings/testChild`). Todo teste de navegador roda nela (dev: botão "Entrar como conta de teste"); Playwright já instalado (ver `REVISAO_ETAPA_1.md` seção 9 para o roteiro que funcionou). O líder limpa depois.

Aceite do Lote 1 (com foto e conferência no Firestore):
1. Depositar 20 gold numa meta: saldo cai 20, `goal_deposit` tipo `saved`, meta sobe; depositar mais do que o saldo é recusado; terceira meta é recusada.
2. Juros: forçar `lastInterestWeek` de uma semana anterior e reabrir o app: linha `goal_interest` com `balanceBefore == balanceAfter`, `savedGold` cresce, teto respeitado, segunda abertura não paga de novo.
3. Cancelar pelo painel devolve exatamente o guardado (`goal_withdraw`); fechar como alcançada cria `redemptions` aprovado e zera `savedGold`.
4. Desafio "20 missões" avança ao concluir missão; ao bater, paga uma vez (`challenge`), chave em `claimed`; concluir de novo não paga.
5. Baú do Dia paga `base + tochas` e 2 materiais do mais escasso; esmeralda na 3ª tocha; Baú das 7 tochas na 7ª.
6. Capacete absorve 1 missão perdida na semana (`helmetUsed`) e não absorve a segunda.
7. Prova 6/8 paga 12 gold e 36 XP; 8/8 dá esmeralda uma vez por dia.
8. Comerciante: vender 10 madeira dá 3 gold (`merchant_sale`), terceira venda do dia é recusada.
9. Dia de punição: `closeDay` grava `punished: true`, sem penalidade, tochas iguais, desafio ganha 1 dia.
10. Missão perdida ontem: hoje até 12h aparece "Recuperar" e paga metade do gold sem material (`late: true`); depois das 12h some.
11. Rachadura aparece no lote depois do dia perdido; todas as missões de hoje removem e devolvem metade da penalidade (`repair`).
12. `callOpenAI` e o TTS funcionam pela função; o bundle não contém `sk-`; desligar `aiGeneration` no painel faz a prova de amanhã não ser gerada, com o aviso certo.

Aceite do Lote 2: Plano do turno grava a ordem e a missão-foco paga material em dobro uma vez; Fechar o dia grava `checkin` uma vez e paga 5 XP; Sábio responde no dia seguinte; missão própria proposta aparece no painel e, aprovada, vira missão normal sem gold; missão extra paga 2x material e não conta como perdida; sábado à noite o troféu aparece e o ouro dá esmeralda; Fechar temporada grava estrela, zera XP, mantém gold, não duplica conquistas; cartão "Hoje" lista as pendências certas; relatório semanal bate com os dados; Balança bate com `goldTransactions`.

Verificação obrigatória ao final de cada lote: `npx tsc --noEmit -p tsconfig.app.json`, `npx eslint src --max-warnings 6` (só os 6 avisos pré-existentes de `src/icons/index.tsx`), `npm run test:english`, `npx vite build`, `node scripts/econ-sim.mjs`, regras e função publicadas, roteiro do aceite no navegador com fotos em `docs/exemplos/telas/etapa2/`. Relatório em `docs/etapas/RELATORIO_ETAPA_2_LOTE_N.md` (arquivos, decisões, saídas dos comandos, fotos, pendências). `docs/VILA_API.md` atualizado com todas as exportações novas. Sem commit.

## 11. Ordem de construção

Lote 1: (0) Relógio da Vila (seção 16: `clock.ts`, `ClockProvider`, migração dos 24 pontos, correção pelo servidor, virada do dia); (1) tipos, `DEFAULT_ECONOMY`, `PRICE_BANDS`, `LEVEL_REWARDS`, `minLevel`; (2) módulos puros com testes (`bank`, `challenges`, `income`, `caps`, `repair`, `late`, `levels`, `chest` alterado); (3) regras e índices publicados; (4) serviços: `goalsService`, `challengesService`, `villageService` (rare, streak chest, sell, repair), `firestoreService` (portão, late, optional, revert de dia fechado), `dailyRulesService` (capacete, cracks, punição); (5) telas: Cofre, Cofrinho, Extrato, atalho "Criar meta", Desafios, Baú das 7 tochas, Conserto, Recuperar, Comerciante, Loja com nível; (5b) Agenda do Minerador (seção 13; arquivos disjuntos, pode correr em paralelo); (5d) Sistema de itens v1 (seção 17 e `docs/VILA_ITENS.md`: Mochila, Loja, editor e Ferraria no mesmo padrão); (5e) Mapa da Vila (seção 18 e `docs/VILA_MAPA.md`: cabeçalho, grade final, Mercado com prêmios embutidos, Banco com Extrato); (5f) Casa do Minerador (`docs/VILA_CONSTRUCOES.md`, construção 8: as missões saem da página da Vila e entram na Casa, com a faixa "Hoje" compacta; âncora `house` e sprites `casa-1..3` entregues pelo líder; Plano do turno e Fechar o dia moram lá); (5c) efeitos das construções conforme `docs/VILA_CONSTRUCOES.md` (Fundição e Queima na Fornalha, Baú 2 e 3, Cerca 1 a 3, Torre 2 e 3, Cofre, pré-requisitos e custos x2); (6) painel: GoalsPanel, ChallengeManager, RewardForm com faixas, Balança; (7) função `openai` e troca do cliente; (8) simulador; (9) aceite e relatório.

Lote 2: (1) `season`, `checkin` puros com testes; (2) serviços: plan, checkin, trophy, closeSeason, learning; (3) telas: Plano do turno, Fechar o dia, Missão própria e extras, Dia fechado, Torre (recordes, troféus, mapa de habilidades), LevelUpModal com marco; (3b) Vida dos personagens v1 (seção 14) e Diálogos que evoluem (seção 15; as falas em si são entregues pelo líder em `src/data/dialogue/`); (3d) Conquistas do jogo (seção 19 e `docs/VILA_CONQUISTAS.md`: contadores, catálogo de 72, Torre); (3c) "Vila que cresce v1" e cerimônia de obra (`docs/VILA_CONSTRUCOES.md`, "Progressão visual": camadas `scene/growth-1..3.png` pela soma dos níveis, poeira e martelo ao subir de nível, luz por nível à noite); (4) painel: cartão Hoje, abas reagrupadas, Nova temporada, relatório semanal, Saúde; (5) aceite e relatório.

Não fazer: mexer em `src/index.css`, `ComicBackdrop.tsx`, `src/components/hero/english/**` além dos pontos citados (lanterna em `ContractBoard`, `completeContract` chamando `bumpChallenge`, TTS pela função); mudar regras de punição além do descrito; criar custo obrigatório em gold; restilizar o painel; commit.


## 13. Agenda do Minerador (frente nova do Lote 1; substitui o Cronômetro)

Pedido do pai em 15/09: o cronômetro solto não serve para nada; vira uma agenda com alarmes e lembretes que o Heitor configura sozinho (provas, eventos, aniversários, treinos), para ensinar organização. O botão "Ampulheta" e o `FlashTimer` como modal somem; o cronômetro continua existindo só como ferramenta "Foco" dentro da Agenda. O "Mapa" (calendário de histórico) vira a aba Mês da Agenda: um lugar só para passado e futuro.

Regras (não reabrir): organização paga **XP e material, nunca gold**; a criança cria e edita os próprios itens; o pai vê tudo e pode criar; lembrete de verdade chega por push (o app já tem FCM: `NotificationContext`, `firebase-messaging-sw.js`, `users/{uid}.fcmTokens`) disparado por uma Cloud Function agendada, além do alarme dentro do app quando ele está aberto.

Dados, `agenda/{id}`:
```
userId, title (<= 40), kind: 'prova' | 'trabalho' | 'evento' | 'aniversario' | 'treino' | 'compromisso' | 'outro',
date: 'YYYY-MM-DD', time?: 'HH:MM', remindMinutesBefore?: number (0, 30, 60, 1440),
repeat?: 'none' | 'weekly', notes?: string (<= 140), createdBy: 'child' | 'admin',
plannedAheadDays: number (dias entre criação e a data), doneAt?: string, remindedAt?: string, createdAt, updatedAt
```
Regras do Firestore: criança cria/lê/atualiza/apaga os próprios (`userId == uid`, `createdBy == 'child'` na criação); admin tudo. Índice `agenda(userId, date)`.

Módulo puro `src/services/village/agenda.ts` (com testes): `occurrencesBetween(items, from, to)` (expande `repeat: 'weekly'`), `nextEvents(items, today, n)`, `reminderDue(item, nowBrazil)`, `studyPlanFor(item)` (para `prova` e `trabalho`: 3 blocos "Foco" de 15 min em D-3, D-2, D-1, ou os dias que faltarem se for mais perto), `organizationXp(item)` (5 XP ao marcar feito; +5 se `plannedAheadDays >= 2`), `weekOrganized(items, weekIso)` (todos os itens da semana marcados feitos até domingo).

Serviço `src/services/agendaService.ts`: `subscribeAgenda(uid)`, `createItem`, `updateItem`, `deleteItem`, `markDone(uid, id)` (transação: grava `doneAt` e paga XP em `progress.totalXP`, chave `agenda:<id>` em `village.claimed`), `acceptStudyPlan(uid, itemId)` (cria até 3 `tasks` `optional: true`, `origin: 'agenda'`, título "Foco: <prova> (15 min)", XP 10, gold 0, material 1, `date` fixa em cada dia; nunca contam como perdidas), `weeklyOrganizedBonus(uid, week)` (chave `agenda:week:<semana>`: 1 material e fala do Sábio).

Cloud Function `agendaReminders` (`onSchedule('every 5 minutes')`, `southamerica-east1`): consulta `agenda` com `date` hoje/amanhã e `time`, calcula o instante do lembrete no fuso do Brasil e, se ainda não `remindedAt`, envia push para `users/{uid}.fcmTokens` ("Amanhã 14h: prova de matemática. Já revisou?") e grava `remindedAt`. Sem `time`: lembrete às 19h do dia anterior. Também avisa o pai (tokens do admin) para provas e compromissos.

Tela `src/components/hero/village/Agenda.tsx` (modal `mc-panel`, abre pelo cartão "Agenda" da grade, no lugar de "Ampulheta", ícone `ui/clock.webp`; atalho A):
- Abas **Hoje**, **Semana**, **Mês**. Hoje: itens de hoje com hora e botão "Feito"; o próximo evento grande em destaque ("Prova de matemática em 2 dias"). Semana: 7 colunas com os itens. Mês: o `CalendarModal` atual absorvido: dias passados com tochas e gold (como hoje) e dias futuros com os itens.
- **Novo item**: formulário curto (tipo com ícone, título, data, hora opcional, lembrete, repetir toda semana, nota). Ao salvar uma prova ou trabalho, pergunta "Quer um plano de estudo?" e mostra os 3 blocos de Foco; aceitar cria as missões extras.
- **Foco** (o cronômetro transformado): botão dentro do item de estudo ou no topo da aba Hoje: 15 ou 25 min, barra `mc-bar`, som ao terminar, e ao terminar dentro de uma missão "Foco" marca a missão como feita (fluxo normal de conclusão).
- **Alarme no app**: enquanto o app está aberto, `reminderDue` roda a cada minuto: som `createMineSfx.checkpoint`, toast e linha na Placa; o item fica piscando até "Ok".
- **Recompensa visível**: "+5 XP, planejou com antecedência" ao marcar feito; domingo à noite, "Semana organizada" com 1 material.
- Placa da Vila: "Hoje: treino às 17h", "Amanhã: prova de matemática" (vem da agenda); cabeçalho: chip com o próximo evento grande quando faltam 7 dias ou menos.

Painel: aba "Agenda" no grupo Jogo: lista e formulário iguais aos da criança (itens do pai marcados "do pai"), botão "Calendário da escola" (colar várias datas de uma vez, uma por linha "2026-10-03 Prova de história"); no cartão "Hoje": provas nos próximos 3 dias sem plano de estudo aceito.

**Calendário e Agenda são a mesma coisa** (pedido do pai em 15/09): o que ele agenda aparece no calendário, e o calendário é a aba Mês da Agenda. Nos dias passados, o que já existe (verde completo, amarelo parcial, vermelho perdido, "+10" de gold); nos dias futuros, um ponto por compromisso e o ícone do tipo (prova, treino, evento, aniversário); clicar num dia abre o detalhe: missões daquele dia e compromissos, com "Feito" nos que já passaram.

**Lembrar no dia e na hora, sem ser chato** (o "sistema agradável de lembrete"):

1. **Ao abrir o app no dia**: a Placa da Vila ganha o bloco **"Hoje você tem"** no topo, antes de tudo: cada compromisso do dia com hora, ícone e o botão "Feito" ("17h Treino de futebol", "Prova de matemática, estudar 15 min"); se não houver nada, o bloco não aparece. Abaixo, "Amanhã: prova de história" quando houver. É a primeira coisa que ele vê ao entrar.
2. **Na hora marcada, com o app aberto**: `remindMinutesBefore` antes, o item da Placa pisca em `mc-pop`, toca `createMineSfx.checkpoint` (um som só, nada de repetir), aparece um toast com o texto e "Ok"; o Olheiro fala uma linha na cena ("Treino daqui a pouco. Chuteira pronta?"). Marcar "Feito" ou "Ok" encerra.
3. **Na hora marcada, com o app fechado**: push no Chrome do PC pela Cloud Function `agendaReminders` (seção anterior); clicar na notificação abre a Agenda no item.
4. **Na véspera, à noite**: no "Fechar o dia", a última linha é "Amanhã você tem: ..." com os compromissos de amanhã, para ele dormir sabendo.
5. **No fim de semana**: domingo à noite, "A semana que vem" na Placa (provas e eventos dos próximos 7 dias) e um push para o pai com o mesmo resumo.

**Linha do dia** (o espaço dos compromissos): na Casa do Minerador (`docs/VILA_CONSTRUCOES.md`, construção 8), a aba Hoje mostra **uma linha só com o dia inteiro**, por horário: missões da manhã, compromissos com hora, missões da tarde, blocos de Foco do plano de estudo, missões da noite, Fechar o dia. Missão e compromisso no mesmo lugar, na ordem em que acontecem, cada um com o seu botão (Concluir, Feito, Foco). Assim o Heitor lê o dia como uma história, não como três listas.

**Tudo alimentado pela mesma fonte**: `agenda/{id}` + `tasks` + `village.plan`, lidos pelo módulo puro `dayTimeline(items, tasks, plan, date)` em `agenda.ts` (com testes de ordenação: item sem hora vai para o período informado ou para o fim do dia).


Remover: `FlashTimer` como modal e o cartão "Ampulheta"; `onOpenTimer` sai de `HeroPanel`/`VillageHome`; `CalendarModal` passa a ser a aba Mês (pode virar componente interno da Agenda). Aceite: um compromisso de hoje aparece em "Hoje você tem" ao abrir, pisca e toca na hora marcada com o app aberto, e chega por push com o app fechado; a aba Mês mostra o ponto no dia futuro e o detalhe ao clicar; a Linha do dia da Casa mostra missões e compromissos na ordem do horário; criar uma prova para daqui a 3 dias com plano de estudo cria 3 missões extras nos dias certos; marcar feito paga 5 XP uma vez (chave em `claimed`); push chega no Chrome do PC no horário (foto da notificação); Placa mostra o item de amanhã; aba Mês mostra passado e futuro; sem gold em nenhuma linha de `goldTransactions` vinda da agenda.


## 14. Vida dos personagens v1 (Lote 2; pedido do pai em 15/09)

O balão de fala ficou certo; o que falta é o personagem **reagir**. Um NPC parado com balão é placa com desenho. Nesta etapa a vida vem por código sobre os sprites parados (sem animação desenhada); a animação desenhada de verdade fica para a Etapa 4 (`docs/MINER_MISSIONS_ROADMAP.md`, Etapa 4, "Vida v2").

Regras: nada disso muda dados nem economia; tudo em `VillageScene.tsx` e num módulo puro `src/services/village/npcBehavior.ts` (máquina de estados testável: entrada = hora, evento, tempo; saída = estado e alvo). `prefers-reduced-motion` desliga deslocamento e gestos, mantém só a troca de quadro.

O que cada personagem faz:

1. **Reação ao toque** (todos): ao clicar, o NPC "pula" (2 px para cima por 120 ms), vira para o personagem do Heitor (espelhar o sprite no eixo X quando o Heitor está do outro lado) e o balão nasce da boca dele; enquanto o balão está aberto, o sprite alterna dois quadros a cada 250 ms (quadro base e quadro "falando": o mesmo sprite com a boca aberta, gerado pelo líder por inpaint na máscara do rosto). Ao fechar o balão, acena (quadro "acenando", também por inpaint no braço) por 400 ms.
2. **Piscar e respirar** (todos): a cada 3 a 6 s, quadro "olhos fechados" por 120 ms; balanço de respiração já existe.
3. **Rotina por hora** (Comerciante e Sábio, `npcBehavior.ts`): o Comerciante fica ao lado do lago de manhã, perto da fogueira à tarde e some às 21h ("fechou a barraca", placa "volta às 7h" no lugar); o Sábio fica perto da entrada da mina de dia e sentado junto à fogueira à noite (quadro "sentado" por inpaint). Trocar de lugar é **andar**: deslocamento linear de 24 px por segundo entre âncoras (`anchors.json` ganha `npcSpots`), alternando dois quadros de passo (inpaint nas pernas) a cada 200 ms.
4. **Reação a eventos do jogo** (via prop `event` que `VillageHome` passa): missão concluída, o Heitor faz um gesto de picareta (quadro "cavando", 3 vezes); nível novo, salto duplo e estrelas em partículas; Baú aberto, o Comerciante aplaude; dia completo, o Sábio levanta o cajado; missão perdida (resumo de ontem), o Sábio balança a cabeça uma vez. Nada punitivo além disso.
5. **Olhar**: o Heitor vira para o lote ou NPC que está sob o mouse (espelhar no X). Barato e dá muita vida.
6. **Falas com contexto** (junto com `villageLines.ts` da Etapa 3, mas já aqui em versão simples): antes das 12h, saudação de manhã; depois das 20h, boa noite; dia completo, elogio; 3 dias sem missão perdida, comentário sobre constância; se está chovendo na Placa (folga), fala de descanso. Escolha por `pickLine` sem repetir 14 dias.

Arte que o líder entrega (inpaint sobre os sprites existentes, 64 px, mesmas máscaras de `masks/`): para `miner-base`, `sabio` e `comerciante`, os quadros `*-talk.png` (boca aberta), `*-blink.png`, `*-wave.png`, `*-step1.png`, `*-step2.png`; para o Heitor, `miner-dig1..3.png`; para o Sábio, `sabio-sit.png`. Se um quadro faltar, o código usa o base.

Aceite: vídeo curto ou 6 fotos (toque no Comerciante com balão e boca alternando; Sábio sentado à noite; Comerciante andando; Heitor cavando após concluir missão; Heitor olhando para o lote sob o mouse; placa "volta às 7h"); `npcBehavior.test.ts` cobrindo horários e transições.


## 15. Diálogos que evoluem com o progresso (Lote 2, junto com a seção 14)

Pedido do pai em 15/09: a vida dos personagens precisa de diálogos e interações novas conforme o Heitor progride. Regra de desenho: **um NPC nunca repete a mesma fala para um jogador que mudou**. O que ele diz depende de quem o Heitor é hoje (nível, base, tochas, o que fez ontem) e de quanto os dois já se conhecem (amizade).

### Amizade (por NPC)

`village.npcs.<id> = { points, tier, lastTalkDate, seen: string[] }` para `sabio`, `comerciante`, `ferreiro`, `olheiro`.

- Pontos: +1 na primeira conversa do dia; +2 por ação no domínio do NPC (Comerciante: contrato da Mina concluído ou compra na Loja; Sábio: prova feita ou reflexão escrita; Ferreiro: craft, troca ou construção; Olheiro: desafio concluído ou dia completo). Teto de 5 pontos por dia por NPC. Nunca gold.
- Níveis de amizade (tier): 0 = Desconhecido (0), 1 = Conhecido (5), 2 = Colega (15), 3 = Amigo (30), 4 = Parceiro (50), 5 = Lenda da Vila (80). Corações no cabeçalho do balão (5 corações pixel, `ui/heart.webp`, a gerar).
- Subir de nível abre uma **conversa especial** (3 balões seguidos, com "Continuar"), um **pedido** e, no nível 3 e 5, um **presente** (cosmético exclusivo do NPC ou 1 raro; nunca gold).

### Pedidos (a história de cada um)

Cada NPC tem 5 capítulos curtos (um por nível de amizade), cada um com um pedido concreto e cumprível em 1 a 3 dias, sem gold:

- Comerciante (pão-duro e engraçado): 1 "Traga 5 pedra, minha barraca está caindo"; 2 "Faça 3 contratos numa semana"; 3 "Compre algo e não se arrependa" (qualquer compra na Loja); 4 "Guarde 50 gold no Cofrinho" (Etapa 2); 5 "Uma semana sem missão perdida".
- Sábio (só faz perguntas): 1 "Tire 6 ou mais na prova"; 2 "Escreva 3 reflexões"; 3 "Tire 8 de 8"; 4 "Escolha o tema de amanhã 5 vezes"; 5 "Responda à pergunta da semana" (Etapa 3).
- Ferreiro (poucas palavras): 1 "Construa a Fornalha"; 2 "Crafte a picareta de pedra"; 3 "Leve a Fornalha ao nível 2"; 4 "Crafte o capacete"; 5 "Base completa".
- Olheiro (fala de futebol e caráter): 1 "3 dias completos seguidos"; 2 "Complete um desafio"; 3 "7 tochas"; 4 "Um mês sem punição"; 5 "Nível 30".

Pedido cumprido: fala de agradecimento, +5 pontos, XP (10) e o objeto do capítulo entra na coleção (Museu, Etapa 3; até lá, lista "Histórias" na Torre). Progresso do pedido avança nos mesmos pontos onde os eventos acontecem (`bumpChallenge` e o `npcBehavior` compartilham o mesmo barramento de eventos do `DataContext`).

### Falas condicionais

`src/data/dialogue/<npc>.ts`: lista de entradas `{ id, tier (mínimo), when: (ctx) => boolean, lines: string[], once?: boolean, priority }`, com `ctx` = `{ hour, weekday, level, tier, fullDays, baseLevels, gear, yesterday: { missed, complete }, today: { done, due, quizDone }, records, season, firstTime: Set<string> }`. Selector puro `pickDialogue(npc, ctx, seen, recent14)` em `src/services/village/dialogue.ts` (testes): pega a entrada de maior prioridade que casa com o contexto, evita as vistas nos últimos 14 dias, `once` só uma vez na vida (gravado em `seen`).

Camadas obrigatórias por NPC (mínimo 60 entradas cada, escritas pelo líder com IA e revisadas pelo pai antes de entrar; sem gíria pesada, sem sermão):

1. **Primeira vez** (`once`): primeiro encontro, primeira construção, primeiro craft, primeira prova 8/8, primeiro Baú, primeira compra, primeira meta, primeiro nível 10.
2. **Estado do dia**: manhã, tarde, noite; dia completo; missão perdida ontem ("Ontem faltou uma. Hoje é outro dia."); folga; punição (só Sábio e Ferreiro, sem julgamento).
3. **Progresso**: por patente (5 falas por patente), por construção nova, por equipamento novo, por recorde batido, por temporada nova.
4. **Amizade**: 6 falas por nível, mais a conversa especial de cada subida.
5. **Curiosidade e pergunta para pensar** (Etapa 3 amplia com os pacotes semanais): 1 por dia, sem repetir 60 dias.

A tela: o balão ganha o cabeçalho com nome e corações; "Continuar" nas conversas de vários balões; o pedido ativo aparece como linha na Placa ("Comerciante: faltam 2 pedra") e na Torre.

Painel: aba "Personagens" (grupo Conteúdo): amizade por NPC, pedido ativo, botão "Ver falas de hoje" (só depois de a criança ter visto) e "Aprovar pacote" para as falas novas geradas por IA (Etapa 3).

Aceite: falar com o Comerciante 5 dias seguidos sobe para Conhecido e abre a conversa especial e o primeiro pedido; entregar 5 pedra cumpre o pedido, paga 10 XP e nunca gold; a mesma fala não repete em 14 dias (teste com 30 dias simulados); fala de "missão perdida ontem" aparece só nesse caso; `once` não repete após recarregar.


## 16. Relógio da Vila: uma hora só, a de Brasília (Lote 1, primeiro item da fundação)

Pedido do pai em 15/09: garantir que o jogo segue o fuso de São Paulo e que existe um horário dentro do jogo para tudo acontecer certo.

Situação hoje (auditoria de 15/09): 24 pontos do código leem a hora direto do computador ou montam a data em UTC. `DailyChecklist`, `HeroHeader` e `HeroPanel` usam `new Date().getHours()` (hora do PC, seja qual for o fuso); `VillageHome`, `villageService`, `TaskItem` e `DataContext` usam `Intl` com `America/Sao_Paulo` (certo), mas com `hour12: false`, que devolve "24" à meia-noite; `utils/timezone.ts` soma um deslocamento fixo de 3 horas (funciona porque o Brasil não tem horário de verão desde 2019, mas quebra se voltar); `dailyQuizService`, `dailyRulesService` e `EnglishBase` montam datas com `toISOString().slice(0, 10)`. Nada corrige um relógio de PC errado, e a virada de meia-noite com o app aberto não é tratada de forma única.

### Desenho

- **Um módulo só**: `src/utils/clock.ts` (puro, testado). `nowBrazil(instantMs?)` devolve `{ iso, date: 'YYYY-MM-DD', hour (0-23), minute, weekday (0-6), period: 'morning' | 'afternoon' | 'evening', isNight }`, calculado com `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', hourCycle: 'h23', ... }).formatToParts` (nunca "24"; horário de verão, se voltar, já vem certo). `addDays(date, n)`, `weekdayOf(date)`, `isoWeekOf(date)` (o de `utils/isoWeek.ts` passa para cá), `msUntilNextMidnight()`. `utils/timezone.ts` continua existindo com os mesmos nomes exportados, reimplementado por cima do `clock.ts`, para não quebrar chamadas antigas.
- **Correção pelo servidor**: ao entrar, o app grava `health/{uid}.clockPing = serverTimestamp()` e lê de volta; `serverOffsetMs = servidor - Date.now()`, guardado na sessão e reaplicado em `nowBrazil()`. Se o desvio passar de 2 minutos, o painel mostra no cartão Saúde "Relógio do computador da criança está N min adiantado/atrasado; o jogo usa a hora certa" e a criança vê uma linha discreta na Placa. Quem manda é sempre o servidor.
- **`ClockProvider` e `useClock()`**: contexto React que atualiza a cada 15 s e expõe `today`, `hour`, `minute`, `period`, `isNight`, `isDev`. Dispara o evento `dayChanged` quando `today` muda (meia-noite em Brasília): `DataContext` recarrega as missões (o "feito hoje" some), roda `processPendingDays` (fecha ontem), zera o portão da prova e os caches do dia; a Vila mostra o toast "Novo dia na Vila". Tudo sem recarregar a página.
- **Só o relógio lê a hora**: os 24 pontos migram para `useClock()` (telas) ou `nowBrazil()` (serviços). Lista: `DailyChecklist.tsx:56,119`, `HeroHeader.tsx:34`, `HeroPanel.tsx:61`, `TaskItem.tsx:113`, `DataContext.tsx:318`, `VillageHome.tsx:46-49`, `villageService.ts:337`, `dailyQuizService.ts:22`, `dailyRulesService.ts:47`, `EnglishBase.tsx:46`, `PlacaManager.tsx` e o restante que o grep `getHours\|toISOString().slice(0, 10)\|hour12` apontar. Regra de lint: `no-restricted-syntax` para `new Date().getHours()` e `toISOString().slice(0, 10)` fora de `clock.ts`.
- **Parâmetros de DEV**: `?h=22` e `?d=2026-09-20` só com `import.meta.env.DEV`, aplicados dentro do `ClockProvider` (todo mundo vê a mesma hora falsa: cena, portões, Baú, Placa).
- **Servidor**: as Cloud Functions (`openai`, `agendaReminders`) usam `timeZone: 'America/Sao_Paulo'` em `onSchedule` e a mesma função `nowBrazil` (copiada em `functions/src/clock.ts`) para montar datas. As regras do Firestore não olham hora; quem impede ação fora de hora é a transação (`PERIOD_LOCKED`, `chestOpenHour`) usando o relógio corrigido.
- **Relógio visível**: chip no cabeçalho da Vila, ao lado das tochas: hora "14:32" em `mc-num`, dia "ter 15/09" em Fredoka e o ícone do período (`ui/sun.webp`, `ui/sunset.webp`, `ui/moon.webp`); tooltip "Relógio da Vila, horário de Brasília". A cena usa a mesma hora (céu e luz); o Baú diz "Abre às 18h (faltam 2h10)".

### Testes (`src/utils/__tests__/clock.test.ts`)

Instantes fixos em UTC: 02:59:59Z e 03:00:00Z (meia-noite em Brasília vira a data); 03:00Z devolve hora 0, nunca 24; limites 12:00 e 18:00 dos períodos; `weekdayOf('2026-09-15') === 2`; `addDays` na virada de mês e de ano; `serverOffsetMs` de +3h faz `today` avançar quando o PC está atrasado; `msUntilNextMidnight` às 23:59:30 dá 30 s.

### Aceite

1. Com o relógio do PC adiantado 3 horas de propósito, o app mostra a hora de Brasília, o Baú não abre antes das 18h reais e o painel avisa o desvio.
2. Com o app aberto às 23:59, à meia-noite as missões de ontem somem, o fechamento de ontem roda e a Placa muda para o dia novo, sem recarregar.
3. Nenhum "24:" em lugar nenhum; `grep` não encontra `getHours()` nem `toISOString().slice(0, 10)` fora de `clock.ts`.
4. `?h=22` em DEV muda cena, portões e Baú ao mesmo tempo.

## 17. Sistema de itens v1: Mochila, Loja e editor no mesmo padrão (Lote 1)

Pedido do pai em 15/09: Loja e editor sem padrão, sem inventário, sem resposta visual. O desenho completo está em `docs/VILA_ITENS.md` (fonte de verdade). Nesta etapa entra:

- `src/types/items.ts` e `src/config/items.ts` (catálogo único; `COSMETICS`, `GEAR` e `REWARD_ICONS` passam a derivar dele), `village.newItems`.
- Componente `src/components/hero/village/ItemSlot.tsx` (ícone, moldura de raridade, nome, estado, quantidade opcional, "Novo") e `ItemCard.tsx` (detalhe com preview no personagem).
- `Mochila.tsx` com as quatro abas (Equipado com boneco de papel e slots, Roupas, Equipamentos, Materiais e raros); o `CharacterEditor` vira a aba Equipado; abre pelo cartão do Baú, pelo distrito "Mochila" e pela tecla I.
- `Mercado.tsx` reescrito com filtros, grade de `ItemSlot`, cartão do item com "Experimentar", confirmação com antes e depois, animação do ícone voando para a Mochila, "Equipar agora?", faixa "Só se ganha".
- A Oficina vira **Ferraria** (`docs/VILA_ITENS.md`, "Ferraria"): abas Forjar, Fundição (liberada pela Fornalha nível 2) e Obras (só leitura, abre os cartões); `ItemSlot` com chips tenho/preciso, preview do equipamento no minerador, cerimônia de forja (quadros do Ferreiro por inpaint, entregues pelo líder), capacete e lanterna bloqueados até o efeito existir; a aba Construir some. Presente de nível, Baú do Dia e Comerciante também passam a usar `ItemSlot`.
- Arte: o líder entrega molduras, selo "Novo", contornos de slot, ícone da mochila e os ícones de cosmético que faltam; até lá, `hasSprite` continua escondendo o que não tem imagem.

Aceite: o de `docs/VILA_ITENS.md`.

## 18. Mapa da Vila: uma porta para cada coisa (Lote 1)

Pedido do pai em 15/09: "Baú de recompensas", Mercado, Baú do Dia, construção Baú e o Banco que vem: está tudo desconexo. O desenho está em `docs/VILA_MAPA.md` (glossário de uma palavra por conceito, cabeçalho final, grade final de 8 distritos, circuito do gold: entra, sai, fica guardado). Nesta etapa entra:

- Cabeçalho: chips com ação (gold abre o Extrato; nível abre a Torre; avatar abre a Mochila), botões "Baú de recompensas" e calendário removidos.
- **A grade de distritos sai** (decisão do pai em 15/09, à noite; `docs/VILA_MAPA.md`, "A Vila é a interface"): tudo abre tocando na cena (hotspots com rótulo e cadeado), a hotbar de cinco atalhos é a única navegação fora da cena, o cabeçalho vira uma faixa e a Placa vira balão no canto da cena mais a placa de madeira dentro dela; Mercado e Agenda são construções baratas do primeiro dia (Barraca do Comerciante e Sino da Vila, `docs/VILA_CONSTRUCOES.md` 9 e 10, decisão do pai em 15/09); Placa e Arena são objetos fixos da cena com âncoras `spots`; arte do líder. Substitui o texto seguinte sobre a grade. Antiga grade: Casa, Mina, Biblioteca, Ferraria, Mercado, Banco, Mochila, Torre, Agenda e **Arena** (cartão "Em breve" com o ícone de espada, sem tela; ao clicar, o Olheiro fala "Quando a Arena abrir, eu quero ver você ganhar do seu pai no xadrez"; a Arena de verdade é a Etapa 4B do roadmap); hotbar Vila, Missões, Mina, Mercado, Mochila (teclas 1 a 5).
- Mercado com `RewardsPanel` embutido como aba (nunca por cima), "Meus pedidos" com estado, aba Comerciante.
- Banco da Vila com Cofrinho, Extrato (recebe o histórico de gold, que sai da tela de prêmios) e Paciência.
- Renomeações: Oficina para Ferraria, construção Baú para Armazém (id `bau` continua), Ampulheta e Mapa para Agenda; "Baú" só em "Baú do Dia".

Aceite: o de `docs/VILA_MAPA.md`.

## 19. Conquistas do jogo (Lote 2, junto com a Torre)

Pedido do pai em 15/09: conquistas padrão do próprio jogo, em quantidade (progresso, realizações, missões), separadas das especiais da vida real que ele cria. O desenho completo, com o catálogo inicial de 72, está em `docs/VILA_CONQUISTAS.md` (fonte de verdade). Nesta etapa entra:

- `village.stats` (contadores incrementados nas transações existentes: missão, fechamento do dia, obra, forja, fundição, contrato, prova, reflexão, depósito, juros, agenda, Foco, conversa, Baú, temporada), `village.achievementsUnlocked`, `village.newAchievements`.
- Módulo puro `src/services/village/achievements.ts` com o catálogo tipado (`src/data/achievements.ts`), `evaluateAchievements` e `progressOf`, testes (destrava no alvo e não antes; escondidas; nunca gold).
- Pagamento por transação com chave `ach:<id>` (XP, material, raro ou cosmético; nunca gold); toast com ícone e som; fala do NPC dono da categoria.
- Torre, aba Conquistas: categorias, `ItemSlot` com moldura por camada, progresso, "Quase lá", "Novo", escondidas como "?"; aba "Da vida real" com as do pai e "Pedir para o pai confirmar".
- O pacote de 12 criado pela "nova fase" sai; as de nível e temporada viram parte do catálogo e reiniciam com a estrela. As da vida real continuam em `achievements` com `kind: 'real'`.
- Painel: aba de conquistas só para as da vida real; as do jogo em lista só leitura com o progresso.
- Arte: ícones por categoria e por camada gerados pelo líder (bronze, prata, ouro, exclusiva), cosméticos "capacete de mestre de obras" e "cachecol da vila".

Aceite: concluir a primeira missão destrava "Primeira picaretada" com toast e +10 XP +1 material, uma vez; a Torre mostra "Mão na massa 1/10" logo abaixo; nenhuma linha de `goldTransactions` vem de conquista do jogo; uma conquista da vida real criada pelo pai continua funcionando como hoje.


## 20. Pendências do Lote 1 que entram no Lote 2 (da revisão, seções 10 a 13)

Lote 1 aprovado em 15/09 (commit be66428, branch etapa-2). Entram no Lote 2, antes das frentes novas: "Novo" na Mochila (limpar `newItems` ao fechar a Mochila, não ao montar; StrictMode), painel de prêmios embutido no cartão do Mercado só leitura e sem "Trocas liberadas" na punição, Cofre nível 3 (faixa temporada e Extrato mensal), cosmético das 21 tochas e ids `trophy_*` fora de `newItems` até existirem no catálogo, gasto por ralo na Balança, `rewardTitle` lido nas telas de pedidos (criança e pai), Cerca 2 sem apagar rachadura repetida, `metadata.capped` correto em desafio e Baú, chip de tochas com `ui/torch.webp` e rótulo "tochas", "Foco" na Casa abrindo o cronômetro preso à missão (conclui só ao terminar), Linha do dia sem "Concluir" em missão feita ou período fechado, título vazio recusado na Agenda (botão e serviço) e filtrado na Placa, editar apagando hora e nota (`null`), `onFinished` do Foco fora do updater de estado, aba Obras sem "Melhorar" para Barraca e Sino, "Semana de 14 a 20/09" no Extrato em vez de código, percentual de poupança calculado só sobre gold ganho na semana, `settings/economy` também em `canBuild`/`buildUpgrade`, `vaultInterestRatePct` apagada, formulário da Agenda sem herdar lembrete e repetir do item anterior.

## 20b. Regra de cena para o Lote 2 (16/09; `docs/MUNDO.md`, seção 5)

O jogo vai ter várias cenas (Mina, Biblioteca, Fazenda, Arena...) ligadas por um mapa do mundo. No Lote 2, tudo que tocar a cena (camadas de crescimento, spots e rotina dos NPCs, cerimônia de obra, hotspot do Baú das tochas, rótulos) entra como **dado no `anchors.json`** e comportamento por tipo de âncora no canvas, nunca como `if` da Vila. Preparar a pasta `public/assets/scenes/vila/` (mover `scene/` para lá com um alias) e `SceneCanvas` recebendo o id da cena é opcional neste lote, mas a regra de aceite já vale: "daria para criar uma segunda cena só com um JSON e um PNG?". Registrar no relatório o que ainda é específico da Vila.

## 21. Prompt do Lote 2 para colar no Cursor

"Leia `docs/etapas/ETAPA_2_BANCO_E_TEMPORADA.md` inteiro (seções 6, 7, 11 Lote 2, 13 a 15, 19 e 20), `docs/VILA_CONSTRUCOES.md`, `docs/VILA_ITENS.md`, `docs/VILA_MAPA.md`, `docs/VILA_CONQUISTAS.md` e a seção 'O universo conectado' do roadmap. Na branch etapa-2, execute o Lote 2 nesta ordem: (0) seção 20; (1) módulos puros com testes (season, checkin, achievements, npcBehavior, dialogue); (2) serviços (plan, checkin, trophy, closeSeason, learning, conquistas, amizade); (3) telas: Plano do turno e Fechar o dia na Casa, Missão própria e extras, Dia fechado, Torre com conquistas do jogo e da vida real, recordes, troféus e mapa de habilidades, LevelUpModal com marco, Vida dos personagens v1 e Diálogos que evoluem (as falas eu entrego em src/data/dialogue/; use as que existirem e o fallback), Vila que cresce v1 e cerimônia de obra; (4) painel: cartão Hoje, abas reagrupadas, Fechar temporada, relatório semanal, Saúde; (5) checagens, republicar, aceite na conta de teste com fotos em docs/exemplos/telas/etapa2-lote2/, relatório `RELATORIO_ETAPA_2_LOTE_2.md` com decisões e conferência de conexões. Todo módulo educacional novo com a ficha pedagógica (roadmap, Etapa 5B). Toda mudança na cena segue a seção 20b (dado no anchors.json, comportamento por tipo de âncora). Sem commit fora da etapa-2."

## 22. Fichas pedagógicas (Lote 2; Etapa 5B)

Módulos educacionais novos deste lote. Agenda, Banco e Prova já nasceram no Lote 1.

### Plano do turno
1. Aprende a ordenar o dia e escolher uma missão-foco.
2. Cabe aos 10 anos: lista curta, setas, uma escolha.
3. Mede: `village.plan` do dia; `taskCompletions.focus`; `stats.plansSaved`.
4. Adapta: uma foco por dia; fecha ao meio-dia.
5. Vê: ordem na Casa e material em dobro na foco.
6. Pai: vê o plano no cartão Hoje; não precisa ajustar.
7. IA: nenhuma.
8. Impede emprego: sem gold; só XP/material da missão. Impede castigo: sem plano não há penalidade.

### Fechar o dia
1. Aprende a fechar o dia com 4 hábitos e uma intenção de amanhã.
2. Quatro sim/não e três palavras; cabe em um minuto.
3. Mede: `dailyProgress.checkin`; `stats.checkins`.
4. Adapta: o Sábio responde na manhã seguinte conforme as respostas.
5. Vê: 5 XP e a fala do Sábio na Placa.
6. Pai: relatório semanal (hábitos) e Saúde (`lastCloseDay`).
7. IA: nenhuma; frases em `habitLines` e `SAGE_REPLIES`.
8. Impede emprego: 5 XP, nunca gold. Impede castigo: sem check-in não há penalidade.

### Missão própria e extras
1. Aprende a propor o próprio trabalho e a fazer um extra sem virar dívida.
2. Título curto, período; o pai aprova.
3. Mede: `tasks.origin==child` `status==proposed`; `optional` nas extras.
4. Adapta: o pai aprova, recusa ou marca extra.
5. Vê: “aguardando o pai”; extra com “2x material”.
6. Pai: lista de propostas em Missões e no cartão Hoje.
7. IA: nenhuma.
8. Impede emprego: missão própria nunca gold. Extra não conta como perdida.

### Conquistas, Torre e mapa de habilidades
1. Aprende a ver o próprio progresso (jogo e vida real) sem virar ranking.
2. Ícones e “37/50”; sem texto longo.
3. Mede: `village.stats`, `achievementsUnlocked`, `learning/{uid}`.
4. Adapta: camadas bronze/prata/ouro; escondidas só quando destravam.
5. Vê: toast, “Quase lá”, mapa com barras.
6. Pai: vida real editável; jogo só leitura; relatório Recalcular.
7. IA: nenhuma nas conquistas do jogo.
8. Impede emprego: conquista do jogo nunca gold. Impede castigo: escondidas não envergonham.

### Diálogos e amizade
1. Aprende que pessoas mudam o que dizem conforme o que você fez, e que pedido se cumpre com ação.
2. Falas curtas, sem gíria pesada, sem sermão.
3. Mede: `village.npcs.points/tier/seen/quest`; `stats.npcTalks`.
4. Adapta: `pickDialogue` por hora, tochas, ontem, amizade; teto 5 pontos/dia.
5. Vê: balão com corações, Continuar, pedido na Placa e na Torre.
6. Pai: aba Personagens; não vê a fala do dia antes da criança.
7. IA: pacote de falas entra só com aprovação (Etapa 3); agora fallback em código.
8. Impede emprego: amizade e pedido pagam XP/raro/cosmético, nunca gold. Impede castigo: punição só Sábio e Ferreiro, sem julgamento.

### Relatório semanal
1. Aprende a ler o que treinou na semana (prova, inglês, hábitos, dinheiro).
2. Quatro cartões; números grandes.
3. Mede: `learning/{uid}` recalculado, idempotente por semana.
4. Adapta: o conteúdo sobe com os dados reais, sem meta inventada.
5. Vê: mapa na Torre; o pai vê os mesmos quatro cartões.
6. Pai: Recalcular; Saúde `lastLearningWeek`.
7. IA: nenhuma neste cálculo.
8. Impede emprego: o relatório não paga. Impede castigo: não compara com outras crianças.

## 12. Prompt para colar no Cursor

"Leia `docs/etapas/ETAPA_2_BANCO_E_TEMPORADA.md` inteiro, depois `docs/MINER_MISSIONS_ROADMAP.md` (seções 'Lógica principal que nunca muda' e 'Economia interna v2'), `docs/VILA_API.md` e `docs/etapas/REVISAO_ETAPA_1.md`. Execute o Lote 1 na ordem da seção 11, começando pelo Relógio da Vila (seção 16), e incluindo a Agenda (seção 13), o Sistema de itens (seção 17, `docs/VILA_ITENS.md`), o Mapa da Vila (seção 18, `docs/VILA_MAPA.md`) e os efeitos de `docs/VILA_CONSTRUCOES.md`: módulos puros com testes primeiro, depois regras publicadas, serviços, telas, painel, função e simulador. Não invente regras: o que não estiver escrito, escolha o mais simples e registre em 'Decisões' do relatório. Ao terminar, rode as verificações da seção 10, faça o aceite na conta de teste com fotos e escreva `docs/etapas/RELATORIO_ETAPA_2_LOTE_1.md`. Não commite. Só depois da revisão do Lote 1 comece o Lote 2."
