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

Datas sempre `YYYY-MM-DD` no fuso do Brasil (`getTodayBrazil`, `isoWeekOf`). Nunca gravar `undefined` (`stripUndefined` de `villageService`).

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
- **Desafios** (`DesafiosCard.tsx`, abaixo das missões na Vila): desafios ativos com prazo ("até sábado"), progresso e prêmio; desafio concluído mostra o carimbo e some em 7 dias; "Propor desafio" abre um formulário curto (título, meta, prazo) que vai para o pai.
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

Lote 1: (1) tipos, `DEFAULT_ECONOMY`, `PRICE_BANDS`, `LEVEL_REWARDS`, `minLevel`; (2) módulos puros com testes (`bank`, `challenges`, `income`, `caps`, `repair`, `late`, `levels`, `chest` alterado); (3) regras e índices publicados; (4) serviços: `goalsService`, `challengesService`, `villageService` (rare, streak chest, sell, repair), `firestoreService` (portão, late, optional, revert de dia fechado), `dailyRulesService` (capacete, cracks, punição); (5) telas: Cofre, Cofrinho, Extrato, atalho "Criar meta", Desafios, Baú das 7 tochas, Conserto, Recuperar, Comerciante, Loja com nível; (6) painel: GoalsPanel, ChallengeManager, RewardForm com faixas, Balança; (7) função `openai` e troca do cliente; (8) simulador; (9) aceite e relatório.

Lote 2: (1) `season`, `checkin` puros com testes; (2) serviços: plan, checkin, trophy, closeSeason, learning; (3) telas: Plano do turno, Fechar o dia, Missão própria e extras, Dia fechado, Torre (recordes, troféus, mapa de habilidades), LevelUpModal com marco; (4) painel: cartão Hoje, abas reagrupadas, Nova temporada, relatório semanal, Saúde; (5) aceite e relatório.

Não fazer: mexer em `src/index.css`, `ComicBackdrop.tsx`, `src/components/hero/english/**` além dos pontos citados (lanterna em `ContractBoard`, `completeContract` chamando `bumpChallenge`, TTS pela função); mudar regras de punição além do descrito; criar custo obrigatório em gold; restilizar o painel; commit.

## 12. Prompt para colar no Cursor

"Leia `docs/etapas/ETAPA_2_BANCO_E_TEMPORADA.md` inteiro, depois `docs/MINER_MISSIONS_ROADMAP.md` (seções 'Lógica principal que nunca muda' e 'Economia interna v2'), `docs/VILA_API.md` e `docs/etapas/REVISAO_ETAPA_1.md`. Execute o Lote 1 na ordem da seção 11: módulos puros com testes primeiro, depois regras publicadas, serviços, telas, painel, função e simulador. Não invente regras: o que não estiver escrito, escolha o mais simples e registre em 'Decisões' do relatório. Ao terminar, rode as verificações da seção 10, faça o aceite na conta de teste com fotos e escreva `docs/etapas/RELATORIO_ETAPA_2_LOTE_1.md`. Não commite. Só depois da revisão do Lote 1 comece o Lote 2."
