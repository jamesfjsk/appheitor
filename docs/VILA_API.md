# Vila — API dos módulos puros (Etapa 1)

Módulos sem Firebase, React ou `import.meta.env`. Testes: `npm run test:village` (também entram em `npm run test:english`).

## `src/utils/isoWeek.ts`

- `isoWeekOf(ymd: string): string` — semana ISO-8601 (`2026-09-15` → `2026-W38`).

## `src/config/village.ts`

- `CATALOG_VERSION` — versão do catálogo de cosméticos (1).
- `MATERIAL_BY_PERIOD` — manhã madeira, tarde pedra, noite ferro.
- `DEFAULT_VILLAGE_SETTINGS` / `DEFAULT_ECONOMY` / `DEFAULT_MODULES` — padrões do painel.
- `EMPTY_GEAR` / `DEFAULT_CHARACTER` / `initialVillageDoc(uid, nowIso)` — documento inicial.
- `GEAR` / `GEAR_BY_ID` — equipamentos e custos.
- `COSMETICS` / `COSMETIC_BY_ID` / `FREE_COSMETIC_IDS` — loja da vila.
- `HABITS` / `HABIT_BY_ID` — catálogo de hábitos da placa.
- `buildingSprite(id, level)` — PNG da Vila ou fallback da Base; placa no nível 0.
- `buildingIcon(id, level)` na Base usa o mesmo sprite da Vila (n1 em cinza no nível 0).
- Cena da Vila v2: `VillageScene` lê `public/assets/village/scene/backdrop-day.png` + `anchors.json` (1280×640). Sem tiles nem cubos. NPCs: Sábio, Comerciante, Ferreiro, Olheiro (sprites `*-iso.png`). Clique em lote abre `BuildingCard`.
- Modais da criança: 9-slice `ui/panel-frame.png`.
- `characterSpriteSrc(gear, shirt)` — sprite visível (diamante > capacete > camisa do time > base).
- `DISTRICT_LABELS` — nomes bilíngues dos distritos.
- `PLACA_SPRITE` — lote vazio.

## `src/config/englishBase.ts` (acréscimo)

- `buildingSprite(id, level)` / `BUILDING_PLACA` — mesma regra, fonte da Base.
- `buildingEffectNow` / `buildingEffectNext` / `buildingOpensLater` — textos de `docs/VILA_CONSTRUCOES.md`; Campinho `opensIn: Etapa 4` (`liveMaxLevel: 0`).
- Cartão da construção: `BuildingCard.tsx`, aberto pelo clique no lote (`build:<id>`). Oficina continua pela hotbar.

## `src/services/village/schedule.ts`

- `weekdayFromDate(date)` — 0=domingo…6=sábado no fuso do Brasil.
- `dueTasksOn(tasks, date)` — missões devidas (ativa, frequência, `createdAt` até o fim do dia).
- `periodAllowedAt(period, hourBrazil, settings?)` — gate 12h/18h.
- `isChestTime(hourBrazil, settings?)` — Baú depois de `chestOpenHour`.
- `periodFromHour(hourBrazil)` — manhã/tarde/noite.

## `src/services/village/loot.ts`

- `computeTaskLoot({ period, gear, completionsTodayByPeriod, settings, effectsEnabled })` — material + quantidade (picareta).
- `xpWithBoots(xp, gear, effectsEnabled?)` — +20% arredondado.

## `src/services/village/claims.ts`

- `claimKey(kind, ...parts)` — chave `kind:a:b`.
- `hasClaim(village, key)` — se a concessão já existe.

## `src/services/village/chest.ts`

- `chestAllowed({ hourBrazil, settings, due, done, village, date })` — horário, mínimo de devidas, todas feitas, uma vez.
- `dailyChestContents(uid, date, village, settings?)` — gold, 2 materiais, esmeralda a cada N dias (`fullDays+1`), teto de gold; picareta ouro/diamante +1 material.

## `src/services/village/shop.ts`

- `priceOf(item, settings?)` — `round(base * goldPriceMultiplier)`.
- `canBuy(village, gold, item, settings?)` — não possui e o saldo cobre.
- `canCraft(materials, rare, gearId, currentLevel?)` — custo; picareta em ordem; recusa sem ferro.
- `tradePreview(from, to)` — troca 3:1 (recusa se iguais).

## `src/services/village/notices.ts`

- `noticesForNow(ctx, date, hour)` — até 3 itens da placa (pai + automáticos); depois das 21h só “Amanhã”.
- `habitsForNow(habits, date, hour)` / `defaultHabitsForNow(date, hour)` — hábito do turno (à noite só sono).
- `pickLine(lines, recentIds)` — fala sem repetir os últimos 14 ids.

## Decisões

- Esmeralda do baú usa `fullDays + 1` (o dia atual ainda não passou por `closeDay`).
- Materiais comuns do baú: madeira, pedra ou ferro (não redstone); o tipo é o mais escasso no estoque (empate: hash entre madeira/pedra/ferro).
- Craft da picareta exige o nível anterior (`currentLevel === def.level - 1`).
- Cosméticos grátis não entram em `owned` e `canBuy` recusa (`reason: 'free'`).
- `dueTasksOn` devolve a lista (não a contagem); o serviço usa `.length`.

---

# Etapa 2 — Lote 1 (acréscimos)

Módulos novos continuam sem Firebase, React ou `import.meta.env`. `timezone.ts` reexporta `getTodayBrazil` / `addDays` de `clock.ts`. `isoWeek.ts` reexporta `isoWeekOf`.

## `src/utils/clock.ts`

- `BRAZIL_TZ` — `America/Sao_Paulo`.
- `BrazilNow` — `date`, `hour` (`hourCycle: h23`, nunca 24), `minute`, `weekday`, `period`, `isNight`, `iso`.
- `setServerOffsetMs` / `getServerOffsetMs` — correção pelo servidor (`serverNow` vs relógio local).
- `setClockDevOverride` / `getClockDevOverride` / `resetClockForTests` — DEV `?h=` / `?d=`.
- `nowBrazil(instantMs?)` — instante em Brasília + offset + override.
- `getTodayBrazil()` / `getYesterdayBrazil()` / `addDays` / `weekdayOf` / `isoWeekOf` / `periodOfHour` / `isNightHour`.
- `utcMsFromBrazil` / `msUntilNextMidnight` / `formatBrazilDate`.
- `clockDriftWarning(driftMs)` — texto se o PC diverge mais de 2 min.

## `src/contexts/ClockContext.tsx`

- `ClockProvider` / `useClock()` — `date`, `hour`, `period`, `isNight`, `isDev`, `driftMs`, `now`.
- `DAY_CHANGED_EVENT` (`dayChanged`) no `window` na virada da meia-noite de Brasília.

## `src/config/village.ts` (acréscimo)

- `DEFAULT_ECONOMY` — chaves v2 (`incomeDayGold`, `quizGoldPerHit`, tetos, `buildCostMultiplier` 2, `merchantBuy`, juros, `maxOpenGoals`, `lateMissionUntilHour`, `repairRefundPct`, `seasonWeeks`, `levelCap`).
- `PRICE_BANDS` — mimo 0,5 D … temporada 50 D (`enorme` e `temporada` com `onlyGoal`).
- `LEVEL_REWARDS` — raro e cosmético de marco; material à escolha em todo nível.
- `GEAR[].minLevel` / `COSMETICS[].minLevel`.
- `houseTier` / `houseSprite` / `houseTitle` — casa 1–3 pela temporada.
- `DISTRICT_ICONS` / `DISTRICT_LABELS` / `HOTBAR_ICONS` — inclui Arena (em breve).

## `src/config/rules.ts`

- `FAMILY_ID` — `'heitor'` (coleções novas da etapa).

## `src/config/items.ts` / `src/types/items.ts`

- `ITEMS` / `ITEM_BY_ID` — cosméticos com sprite, gear, materiais, gold, raros, ícones de prêmio, marcos.
- `itemFrame(rarity)` / `itemState(...)` / `SLOT_LABEL`.

## `src/config/englishBase.ts` (acréscimo)

- `buildingCost(id, level, multiplier)` — madeira/pedra/ferro × multiplicador; redstone ×1.
- Mesa `liveMaxLevel: 1`, `opensIn: Etapa 3`.
- Cerca só destrava com Fornalha n1.

## `src/services/village/bank.ts`

- `validateDeposit(goal, amount, availableGold)` — recusa amount, gold, closed, target.
- `weeklyInterest(goals, weekIso, settings)` — 5% do `savedGold` já guardado, teto, rateio, ignora semana já paga.
- `weeklyStatement(transactions, weekIso)` — ganhou, gastou, guardou, juros, taxa.
- `savingsRate(transactionsMonth)`.

## `src/services/village/challenges.ts`

- `applyEvent(challenge, event, date)` → `{ challenge, justCompleted }`.
- `challengeState(challenge, today)` — `active | done | expired | upcoming`.
- `extendForPunishment(challenges, days)`.

## `src/services/village/income.ts`

- `referenceIncome(transactions7d, fallback)` — R7 (média 7 dias; fallback `incomeDayGold`).
- `priceForDays(r7, days)` — arredonda a 5.
- `daysToAfford(price, gold, r7)`.

## `src/services/village/caps.ts`

- `GAME_GOLD_SOURCES` / `isGameGoldSource`.
- `gameGoldRoom(transactionsToday, transactionsWeek, settings)` — folga diária e semanal.
- `capGold(amount, room)` — `{ paid, capped }`. Fontes de jogo (não missão/prova/Mina).

## `src/services/village/repair.ts`

- `DEFAULT_LOTS_BY_PERIOD`.
- `cracksAfterClose(cracks, missedTaskIds, lotsByPeriod)`.
- `canRepair` / `repairRefund`.

## `src/services/village/late.ts`

- `lateWindow(hourBrazil, settings)`.
- `lateTaskReward(task, settings)` — metade do gold (chão), sem material, XP inteiro.

## `src/services/village/levels.ts`

- `levelGift(level, season)` — material à escolha, raro, cosmético de marco.
- `minLevelFor(itemId)`.

## `src/services/village/agenda.ts`

- `occurrencesBetween` / `nextEvents` / `reminderDue`.
- `studyPlanFor` / `organizationXp` / `weekOrganized` / `plannedAheadDays`.

## `src/services/village/chest.ts` (alterado)

- `dailyChestContents(uid, date, village, settings?, stock?, bauLevel?)` — gold = `min(teto, base + tochas)`; 2 do mais escasso (+1 se Armazém n2); esmeralda a cada `rareEveryNDays` (a cada 2 se Armazém n3).

## `src/services/village/shop.ts` (alterado)

- `canBuy(..., level?)` — `reason: 'level'` + `minLevel`.
- `canCraft(..., minerLevel?)` — idem.
- `tradePreview` recusa redstone como destino.

## Serviços Firebase

### `src/services/goldTx.ts`

- `mapGoldTransaction` / `listGoldTransactions` / `txsOnDate` / `txsInWeek` / `roomForGameGold`.

### `src/services/goalsService.ts`

- `subscribeGoals` / `listGoals` / `createGoal` (`familyId`, recusa se já há `maxOpenGoals`).
- `depositGoal` — transação `availableGold` + `savedGold` + linha `goal_deposit` tipo `saved`.
- `requestCancel` / `applyWeeklyInterest` (ao abrir o app; `goal_interest` com `balanceBefore == balanceAfter`; respeita teto de gold do jogo).
- `finishGoal(id, 'achieved' | 'cancelled', adminUid)` — alcançada zera e cria `redemptions`; cancelada devolve com `goal_withdraw`.

### `src/services/challengesService.ts`

- `subscribeChallenges` / `createChallenge` / `approveChallenge`.
- `bumpChallenge(uid, kind, value, absolute?)` — missões, streak, prova, contratos, tochas.
- `completeChallenge` — uma vez (`completedAt` + `claimed['challenge:<id>']`); linha `challenge`.
- `extendActiveChallenges`.

### `src/services/agendaService.ts`

- `subscribeAgenda` / `createAgendaItem` / `updateAgendaItem` / `deleteAgendaItem`.
- `markAgendaDone` — XP de organização, nunca gold.
- `acceptStudyPlan` — cria missões extras nos dias do plano.

### `src/services/villageService.ts` (acréscimo)

- `grantRare` / `openStreakChest` / `sellMaterials` / `repairLot` / `seeItems` / `burnWood`.
- Craft e compra passam `newItems` e conferem `minLevel` / nível do minerador.
- Fundição exige Fornalha n2.
- Baú usa nível do Armazém.

### `src/services/aiQuiz.ts` / `src/services/englishTts.ts`

- `callOpenAI` e TTS via `httpsCallable(functions, 'openai')` (`southamerica-east1`).
- `isAIConfigured()` sempre `true` (a função recusa se o módulo estiver desligado ou o teto estourar).

## Cloud Functions (`functions/src/index.ts`)

- `openai` `onCall` — auth, `settings/modules.aiGeneration|tts`, teto `AI_MONTHLY_CALL_CAP` 800, `kind: 'chat' | 'tts'`. TTS grava `english/tts/{hash}.mp3`.
- `agendaReminders` `onSchedule` a cada 5 min — FCM para itens vencendo.

## Telas (criança)

- `Cofrinho` — abas Cofrinho / Extrato / Paciência; placa se `modules.bank === false`.
- `Extrato` — 5 semanas; `embedded` quando dentro do Banco.
- `Agenda` / `DesafiosCard` / `Mochila` / `ItemSlot` / `ItemCard` / `Casa`.
- Ferraria (`Oficina.tsx`) — Forjar, Fundição (Fornalha n2), Obras só leitura.
- Mercado — Loja com `ItemSlot`, Prêmios de verdade embutidos, Comerciante.
- Cena — sprite da Casa, fumaça da chaminé, rachadura (PNG ou 3 linhas).

## Painel

- `GoalsPanel` / `ChallengeManager` / `Balanca` / `RewardForm` (R7, faixas, `goalOnly`).

## Simulador

- `scripts/econ-sim.mjs` — 91 dias, perfis típico / misto / perfeito.
