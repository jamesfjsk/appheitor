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
- `characterSpriteSrc(gear, shirt)` — sprite visível (diamante > capacete > camisa do time > base).
- `DISTRICT_LABELS` — nomes bilíngues dos distritos.
- `PLACA_SPRITE` — lote vazio.

## `src/config/englishBase.ts` (acréscimo)

- `buildingSprite(id, level)` / `BUILDING_PLACA` — mesma regra, fonte da Base.

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
- Materiais comuns do baú: madeira, pedra ou ferro (não redstone), dois sorteios independentes.
- Craft da picareta exige o nível anterior (`currentLevel === def.level - 1`).
- Cosméticos grátis não entram em `owned` e `canBuy` recusa (`reason: 'free'`).
- `dueTasksOn` devolve a lista (não a contagem); o serviço usa `.length`.
