# Relatório — Etapa 2 lançamento

Branch `etapa-2`. Um pacote por vez. Sem commit da IA.

## P0 — estabilizar a árvore (17/09)

### O que mudou

1. `MineRush.tsx`: import de `useSound` (`contexts/SoundContext`).
2. `CharacterEditor.tsx`: `hat` / `cape` / `pet` nulos sem indexar união `string | null` em camisa/calça.
3. `redstoneService.ts`: `out` tipado; leitura depois da transação via `result`.
4. `redstone.ts`: removidos `_tool` de `coachOf` e `_hash` de `sealLogic`. Chamadas em `redstone.test.ts` e `RedstoneBench.tsx` atualizadas. `cart.ts` / `CartBench.tsx` não mexidos.
5. Helpers `pickaxeTierOf`, `hatStyleOf`, `pickaxeTierFromLevel` em `src/components/hero/village/itemGlyphs.ts` (arquivo novo, linha na seção 12).
6. `publicFilePath` em `englishBase.ts`; `levels.test.ts` tira `?v=` antes do `existsSync`.
7. `src/game/README.md` e cabeçalho em `RedstoneBench.tsx`: molde da porta "jogo", não importar até a Etapa 3. `EnglishBase` já usa `CartBench`; nenhum import de `RedstoneBench`.
8. Abandonados apagados (lista abaixo).

### Arquivos do pacote

- `src/components/hero/english/mine/MineRush.tsx`
- `src/components/hero/village/CharacterEditor.tsx`
- `src/components/hero/village/ItemGlyph.tsx`
- `src/components/hero/village/itemGlyphs.ts` (novo)
- `src/components/hero/english/base/RedstoneBench.tsx` (só cabeçalho e `coachOf`)
- `src/services/redstoneService.ts`
- `src/services/village/redstone.ts`
- `src/services/village/__tests__/redstone.test.ts`
- `src/config/englishBase.ts`
- `src/services/english/__tests__/levels.test.ts`
- `src/game/README.md` (novo)
- `docs/etapas/ETAPA_2_LANCAMENTO.md` (linha do `itemGlyphs.ts` na §12)
- este relatório

### Removidos

- `scripts/align-look-layers.py`
- `scripts/paint-look-overlays.py`
- `public/assets/village/char/hat-cap.png`, `hat-crown.png`, `hat-iron.png`, `cape-drape.png` (nenhuma referência em `src`)
- `public/assets/village/sheet.png` (idem)
- 26 scripts `_shot_*.mjs` em `docs/exemplos/telas/cena-v2/` (nenhum relatório de etapa os cita; os de `etapa2/` e `etapa2-lote2/` ficaram)
- pasta `docs/exemplos/telas/cena-v2/tmp-arena/` inteira

### Como verificou

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | 0 erros |
| `npx eslint src --max-warnings 7` | 0 erros; 7 avisos: 6 em `src/icons/index.tsx` + `CharacterEditor.tsx:153` |
| `npm run test:english` | 16 arquivos, todos passaram (`levels.test.ts` 13/13) |
| `npx vite build` | ok; `dist/assets/App-Cpxs9SXu.js` + `CartBench-C2xsDjeF.js` |
| chunk `phaser` em `dist/assets` | nenhum |

### O que ficou de fora e por quê

- Aviso `react-hooks/exhaustive-deps` em `CharacterEditor.tsx:153`: o aceite do P0 pede que fique.
- `RedstoneBench.tsx`, `src/game/redstone/*` e a dependência `phaser` continuam no repositório, sem import no app (decisão 6). Não havia import para remover.
- `cart.ts` e `CartBench.tsx` congelados.
- Regras do Firestore: a seção 9 manda publicar no P1.12, não no P0.

### Já estava sujo na árvore (não é P0)

Não revertido: `public/assets/village/char/pick-*.png`, `src/config/village.ts`, `scripts/paint-pickaxe-overlays.py`, `scripts/_probe_pick.py` (já `D`), `scripts/__pycache__/`. Fora do pacote; o commit do P0 pode ignorá-los.

### Dúvidas

Nenhuma que tenha impedido o item. `coachOf` da oficina Phaser perdeu o argumento `Tool` não usado; a Vagoneta tem `coachOf` próprio em `cart.ts`.

## P1 — bugs que bloqueiam o dia 1 (17/09)

### O que mudou

1. Portão da prova: `quizGate.ts` (`quizGate = quizLocked`, sem Mesa). Destinos `mine`, `npc:ferreiro`, `npc:comerciante`, mercado, ferraria e `build:*` voltam a abrir a prova. `openRequested` abre mesmo com Mesa caída. A prova não abre sozinha.
2. Primeiro acesso: `BirthdayCelebration` desmontado; Onboarding com try/catch e botão reativo; `processPendingDays` só na criança logada (painel do pai só no botão); `checkAchievements` exige `isActive === true`.
3. `closeSeasonState` recusa a segunda no mesmo dia (`stars`, `claimed['season:n']`, `endedOn === today`); apaga `claimed['ach:<id>']` e `newAchievements` com `resetOnSeason`.
4. `statSources.ts` + teste em `GAME_ACHIEVEMENTS`/`NPC_QUESTS`. Contadores entram na transação do evento (ou `await` em sequência depois). Pedidos: Comerciante 1 = `merchantSales`; Sábio 5 = `quizStreak`; capítulo N só com `tier >= N`; presentes `npcgift:<npc>:<tier>` (esmeralda no 3, diamante no 5).
5. Recordes: `ensureWeekRecords` na segunda (chave `week:<iso>`); `claimTrophy` usa tochas de `dailyProgress` e grava `recordsAfterWeek`.
6. Aprendizado: acerto por categoria no `quizBank` (vazio até P5d); `wordsMastered` de `englishBase.vocab` com `seen >= 3`; semana em `learning/{uid}.weeks[<iso>]`. Recalcula na segunda e na aba Relatório.
7. Plano: ordem por `plan.order`; selo "Foco · 2x material"; toast com loot real da transação.
8. Torre: cadeados pelo nível da **construção**; minerador por `getLevelFromXP(progress.totalXP)`.
9. `bumpVillage`/`bumpFriend` são `async` e sempre `await`. Stats do evento na mesma tx; conquista em seguida. Obra: `applyVillageStats` depois `talkToNpc`.
10. `milestone_10` único; teste de ids no catálogo.
11. Arena landmark (sem construir, clique = Olheiro); Campinho e Arena fora das Obras e de `BREAKABLE_LOTS`. Campinho já não estava nos lots do `anchors.json`.
12. Regras: criança não altera `season`/`stars`/`launchedOn`; coleção `quizBank`. Publicadas em **17/09/2026 14:19 -03** (`firestore:rules` e `firestore:indexes`, projeto `app-heitor`).
13. `closeDay`: `skipPenalty = férias || folga || punição || !enabled`; `cracks` vazio nesse caso.

### Arquivos do pacote

- `src/services/village/quizGate.ts` (novo) e `__tests__/quizGate.test.ts`
- `src/services/village/statSources.ts` (novo) e `__tests__/statSources.test.ts`
- `src/services/village/stats.ts`, `statsBump.ts`, `season.ts`, `repair.ts`
- `src/services/village/__tests__/lote2.test.ts`, `etapa2.test.ts`, `village.test.ts`
- `src/services/villageService.ts`, `firestoreService.ts`, `dailyRulesService.ts`, `dailyQuizService.ts`, `englishBaseService.ts`, `goalsService.ts`, `challengesService.ts`, `agendaService.ts`, `redstoneService.ts`, `learningService.ts`
- `src/data/npcQuests.ts`, `src/data/achievements.ts`, `src/config/items.ts`, `src/config/englishBase.ts`
- `src/components/hero/DailyQuiz.tsx`, `HeroPanel.tsx`, `DailyChecklist.tsx`, `TaskItem.tsx`
- `src/components/hero/village/VillageHome.tsx`, `Torre.tsx`, `Oficina.tsx`
- `src/contexts/DataContext.tsx`
- `src/services/english/__tests__/levels.test.ts`
- `firestore.rules`, `firestore.indexes.json`
- `docs/etapas/ETAPA_2_LANCAMENTO.md` (linha do `quizGate.ts` na §12)
- este relatório

### Como verificou

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | 0 erros |
| `npx eslint src --max-warnings 7` | 0 erros; 7 avisos: 6 em `src/icons/index.tsx` + `CharacterEditor.tsx:153` |
| `npm run test:english` | 18 arquivos, todos passaram (`quizGate`, `statSources`, `closeSeason` idempotente, ids únicos, skipPenalty, Arena/Campinho fora de `BREAKABLE_LOTS`) |
| `npx vite build` | ok; chunks `App-B7NwXFf7.js` + `CartBench-BQstcQ_c.js` + `statsBump-B4F0zA-I.js` |
| chunk `phaser` em `dist/assets` | nenhum |
| `npx firebase-tools deploy --only firestore:rules,firestore:indexes --project app-heitor` | Deploy complete, 17/09/2026 14:19 -03 |

### O que ficou de fora e por quê

- Gravação do `quizBank` na conclusão da prova: P5d, não P1. O relatório lê a coleção (pode estar vazia).
- Conta de teste no navegador (Mesa caída + cadeado da Mina, fechar temporada duas vezes, Curioso, plano, 400, Torre): não rodei o app; só testes puros e o deploy das regras.
- Cosmético específico de NPC no presente do tier 5: não existe no catálogo; entra diamante, como o documento permite.
- Índice `quizBank` (`userId` asc, `date` desc) publicado; o deploy avisou que há 2 índices no projeto que não estão no arquivo (não apaguei).

### Dúvidas

- `GoalDoc` não tem duração. `bigGoals` sobe quando `targetGold >= incomeDayGold * 20` (vinte dias de renda da economia). Se a regra era outra, ajustar no P4.
- Mesa caída: não achei bônus de gold da prova ligado à Mesa; só o portão deixa de bloquear a abertura.
- `closeSeasonState` também recusa se alguma estrela tem `endedOn === today`, senão a temporada 2 (vazia) fecharia na mesma hora.

## P1 — rodada da revisão (lista A 1–20 + B; 17/09)

### O que mudou (A, na ordem)

1. `DailyQuiz`: prova já feita mostra “Prova de hoje feita: X de N” e “Fechar”; se `!ready`, “Voltar à Vila” mesmo com `required`.
2. `quizLockedFor` em `quizGate.ts`; o `HeroPanel` usa; teste cobre `quizEnabled` e `completed`.
3. `organizedWeeks` só na transação de `weeklyOrganizedBonus` (`agenda:week:<iso>`).
4. `merchantSales` = quantidade de pedra (`need`), não lotes.
5. Apagadas `primeira_vagoneta`, `vagoneta_dias`, `vagoneta_perfeita`; `cart_*` só XP (e raros) conforme §12.
6. `estante_10`/`estante_50` fora do catálogo; `shelfFixed` em `NO_SOURCE_YET`; teste exige `where` com arquivo/função.
7. `tierGifts` em `friendship.ts`, usado na conversa e no pedido cumprido.
8. `finishFocusBlock` na transação da vila; Agenda chama no `onFinished`; DataContext não incrementa mais.
9. Aprendizado grava `weeks: { [week]: docData }` com merge; segunda recalcula a semana de ontem.
10. `claimTrophy` não grava `week:<iso>`; `ensureWeekRecords` só na segunda, `hasClaim` primeiro; ignora domingo anterior a `launchedOn` e txs `metadata.launch`.
11. `applyVillageStats` usa `englishBase.buildings` por padrão; `buildsDone` na tx de `buildUpgrade`.
12. `completeNight(uid, date)` com chave `night:<date>`; o efeito da Vila só chama.
13. Tochas: `skip: skipPenalty || keepTorches`; `noPunishDays` não sobe em skip; bump de desafio com `!skipPenalty`.
14. `settleAfter` com try/catch; `statsBump` avisa no console.
15. Pedido de notificação só no `AfterOnboard`, com `onboardedAt` e `permission === 'default'`.
16. Relatório semanal calcula na montagem, em silêncio; o botão força.
17. `themesSet` uma vez por dia e só se o tema mudou (`themeSetOn`).
18. Painel do pai (`role === 'admin'`) não roda a cadeia diária da criança.
19. Cadeado na Mina, Ferreiro, Comerciante e atalho “Mina” da hotbar quando o portão está ligado.
20. `seeAchievements` ao fechar a Torre (Mochila já limpava ao fechar).

### Lista B (entrou nesta rodada)

1. Arena fora de `quizBlocksDest`; landmark não fica cinza.
2. Onboarding sem `catch` (o wrap do contexto já avisa).
3. “Prova do dia” no cartão da Biblioteca em ruínas.
4. `contractsWeek` zera na virada ISO em `applyVillageStats`.
5. `closeDay` zera `quizStreak` se o dia não teve prova (fora de férias e folga).
6. Torre: `stats.fullDaysBest`; cadeados por `liveBuildingLevel`; ícone lucide; pedido trancado diz o nível de amizade que falta.
7. `closeSeasonState`: mensagem própria se `endedOn` é hoje; teste no `lote2`.
8. `bigGoals` lê `settings/economy`; `statOf` removido.
9. Teste: Arena não constrói mesmo com materiais.
10. Categorias da prova não herdam a semana anterior (`deleteField`); `fullDays` da semana.
11. Spot de dia do Sábio afastado 60 px da boca da Mina (`anchors.json` e fallback da cena).
12. “Linha do dia” vs `plan.order`: **não implementado**; fica para a Etapa 3.

### Arquivos (além dos do P1 original)

- `src/services/village/friendship.ts` (novo) e `__tests__/friendship.test.ts`
- `src/services/village/quizGate.ts`, `statSources.ts`, testes
- `src/services/agendaService.ts` (`finishFocusBlock`)
- `src/services/villageService.ts` (`settleAfter`, `completeNight`)
- `src/components/hero/DailyQuiz.tsx`, `HeroPanel.tsx`
- `src/components/hero/village/VillageScene.tsx`, `VillageHome.tsx`, `Torre.tsx`, `Agenda.tsx`, `BuildingCard.tsx`
- `src/components/parent/WeeklyReport.tsx`
- `src/contexts/DataContext.tsx`
- `src/services/dailyRulesService.ts`, `englishBaseService.ts`, `learningService.ts`, `goalsService.ts`, `season.ts`, `statsBump.ts`
- `src/data/achievements.ts`
- `public/assets/village/scene/anchors.json`
- `docs/etapas/ETAPA_2_LANCAMENTO.md` (linha do `friendship.ts` na §12)
- este relatório

### Como verificou

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | 0 erros |
| `npx eslint src --max-warnings 7` | 0 erros; 7 avisos: 6 em `src/icons/index.tsx` + `CharacterEditor.tsx:153` |
| `npm run test:english` | 19 arquivos, todos passaram (`quizLockedFor`, `friendship`, `statSources` fonte real, `skipPenalty` nas tochas, Arena `canBuild.ok` falso) |
| `npx vite build` | ok; chunks `App-DG2Z2lXU.js` + `CartBench-D_30wjtq.js` + `statsBump-Dw6aHasc.js` |
| chunk `phaser` em `dist/assets` | nenhum |

### O que ficou de fora e por quê

- Conta de teste no navegador (A1, A2, A5, A11, A12): o líder retesta.
- P3 (`launchedOn`) ainda não existe; `ensureWeekRecords` já ignora se o campo aparecer.
- Linha do dia (B12): Etapa 3.

### Dúvidas

Nenhuma que tenha impedido o item.

## P1 — rodada 2 (17/09)

Cinco correções + guarda do `nightComplete`. Sem P3. Sem commit.

### O que mudou

1. Painel do pai: `ensureUserSetup` devolve `{ user, childUid }` e o Auth chama `setUser` + `setChildUid` juntos. O efeito do DataContext espera `user`, depende de `user?.role`, e a cadeia diária (streak inclusive) só roda se não for `admin`. O `run` da virada do dia espera `user` e pula `admin`.
2. `computeWeeklyLearning` só grava os campos de topo na **semana ISO anterior** (a fechada). A semana corrente vai só em `weeks[week]`. Relatório: botão desligado enquanto a montagem calcula; falha mostra “Não deu para calcular”; o catch não lê o topo (isso é a semana fechada da Torre).
3. Cadeado da Mina: placa `#f4e8c8` 28×32 com contorno `#17130f`. Hotbar: cadeado também no atalho Mercado (`quizBlocksDest`).
4. Casa: `onFinished` do FlashTimer chama `finishFocusBlock(childUid)` como a Agenda.
5. `nextQuizStreak(prev, done, skipped)`: `done || skipped` → `prev+1`. A prova lê férias/folga de ontem em `dailyProgress`. `closeDay` não zera `quizStreak` se `quizEnabled === false`. Teste puro 7 → férias → 8.
6. `nightComplete`: `Set` de módulo `${childUid}:${today}` (sobrevive ao remount do StrictMode).

`Onboarding.tsx` saiu das listas das rodadas anteriores: B2 não mexeu no arquivo.

### Arquivos

- `src/contexts/AuthContext.tsx`, `DataContext.tsx`
- `src/services/learningService.ts`, `dailyQuizService.ts`, `dailyRulesService.ts`
- `src/services/village/stats.ts`, `__tests__/etapa2.test.ts`
- `src/components/parent/WeeklyReport.tsx`
- `src/components/hero/village/VillageScene.tsx`, `VillageHome.tsx`, `Casa.tsx`
- este relatório

### Como verificou

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | 0 erros |
| `npx eslint src --max-warnings 7` | 0 erros; 7 avisos: 6 em `src/icons/index.tsx` + `CharacterEditor.tsx:153` |
| `npm run test:english` | 19 arquivos, todos passaram (`nextQuizStreak` 7→férias→8) |
| `npx vite build` | ok; chunks `App-Dgh149ns.js` + `CartBench-BAYKeIwl.js` + `statsBump-BV9-WN-e.js` |
| chunk `phaser` em `dist/assets` | nenhum |

### O que ficou de fora e por quê

- P3 (`launchedOn`) e os itens do P4/Etapa 3 (`saleStatDeltas`, `rollContractsWeek`, `finishGoal` try/catch, teste da cadeia admin).
- Conta de teste no navegador: o pai retesta depois do commit.

## P3 — backup, reset de lançamento e clone (17/09)

Três scripts REST (token do firebase-tools, sem chave de serviço) + `village.launchedOn` no Extrato, na Balança e no R7. Sem `--apply` no Heitor. Sem clone. Sem P5.

### O que mudou

1. `scripts/lib/firestore-rest.cjs`: token, encode/decode, query paginada, commit em lotes. Os três scripts usam isso.
2. `export-user.cjs --uid`: grava `backups/<uid>-<YYYY-MM-DD>.json` (data de Brasília; `backups/` já no `.gitignore`) e imprime a contagem por coleção. Inclui `birthdayEvents`, `dailySurpriseMissionStatus` e tenta `punishments` além de `punishmentMode`.
3. `launch-reset.cjs`: dry-run sem `--apply`. `--apply` exige backup do dia e `--confirm "LANCAR <nome da vila atual>"`. Zera o jogo, preserva o pedagógico, grava +100 gold com `metadata.launch`. Segunda rodada no-op se essa linha já existe. `lastDailySummaryProcessedDay` = launch − 1 dia (é o campo que o `closeDay` escreve).
4. `clone-to-test.cjs --from --to`: copia users (mantém e-mail/uid do destino), progress, village, englishBase, tasks, rewards, agenda e os últimos 30 `dailyQuizzes`. Recusa se `--to` não for `settings/testChild.uid` ou se `--from` for a conta de teste. Missões/prêmios/agenda saem com id novo para não sobrescrever os docs do Heitor.
5. App: `VillageDoc.launchedOn`; `sinceLaunch` + R7 com `DEFAULT_ECONOMY` nos primeiros 7 dias; Extrato mostra “Extrato zerado.”; Balança, Mercado e RewardForm filtram o mesmo corte.

### Arquivos

- `scripts/lib/firestore-rest.cjs`, `export-user.cjs`, `launch-reset.cjs`, `clone-to-test.cjs`
- `src/types/village.ts`, `src/services/villageService.ts`
- `src/services/village/income.ts`, `balance.ts`, `__tests__/etapa2.test.ts`
- `src/components/hero/village/Extrato.tsx`, `Mercado.tsx`
- `src/components/parent/Balanca.tsx`, `RewardForm.tsx`
- este relatório

### Como verificou

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | 0 erros |
| `npx eslint src --max-warnings 7` | 0 erros; 7 avisos (os de sempre) |
| `npm run test:english` | 19 arquivos; novo caso “R7 ignora o histórico anterior ao lançamento e o presente” |
| `npx vite build` | ok; chunks `App-B384bRu0.js` + `CartBench-UQjrxeET.js` + `statsBump-CtJfKq9a.js` |
| chunk `phaser` em `dist/assets` | nenhum |
| `node scripts/launch-reset.cjs --uid xZkTTR2tlIYXIpAelxEqXugNjqo2 --launch 2026-09-20` | dry-run: Vila do teste, gold 111, XP 23071, 15 tarefas, 13 conquistas ativas, 903 txs; faria season 1 + 100 gold; nada gravado |
| `node scripts/export-user.cjs --uid xZkTTR2tlIYXIpAelxEqXugNjqo2` | 4992 docs, 4,59 MB, todas as coleções da spec; arquivo gitignorado |
| `--apply` sem `--confirm` / sem backup | recusa (exit 1); Firestore do Heitor intacto |
| `clone-to-test --from teste --to Heitor` | recusa: `--to` tem que ser a conta de teste |

Uid Heitor: `xZkTTR2tlIYXIpAelxEqXugNjqo2`. Uid teste: `DydxTQ0cGEbX46LLlQxxD123pQD3`.

Sábado (conta de teste, nesta ordem):

```
node scripts/clone-to-test.cjs --from xZkTTR2tlIYXIpAelxEqXugNjqo2 --to DydxTQ0cGEbX46LLlQxxD123pQD3
node scripts/export-user.cjs --uid DydxTQ0cGEbX46LLlQxxD123pQD3
node scripts/launch-reset.cjs --uid DydxTQ0cGEbX46LLlQxxD123pQD3 --launch 2026-09-20 --apply --confirm "LANCAR <nome da vila depois do clone>"
```

Domingo (Heitor), backup do dia + apply. O `--confirm` usa o nome **atual** da vila.

### O que ficou de fora e por quê

- `--apply` e `clone-to-test` de verdade: sábado (teste) e domingo (Heitor). Aceite E2E (Onboarding, Extrato zerado, segunda rodada no-op) é o líder no sábado.
- Botão no painel: Etapa 3.
- P5 / P2 / P4.

### Dúvidas

- A spec chama a coleção `punishments`; no código é `punishmentMode` (`userId`, `isActive`). O reset apaga as ativas de `punishmentMode` e o export tenta as duas (hoje `punishments` = 0).
- `settings/dailyRules.activatedOn` é um doc da família. O apply na conta de teste no sábado já muda essa data para o lançamento — o Heitor ainda não joga até domingo.
- A vila do uid do Heitor está com `name` “Vila do teste” e `characterName` “teste”. O confirm de domingo é `LANCAR Vila do teste` até alguém renomear. O Onboarding deixa trocar depois.
- `rewardsRedeemed` foi a 0 no progress (não estava na lista da spec; é progresso de jogo).
- `englishBase` volta ao `initialBaseDoc` (1 ferro da Fornalha pela metade), preservando `level` e `vocab`.

## P2 — Pacote 1 (18/09, hotfix do dia 1)

Itens 2, 3, 5, 8, 18b e achados A3, A4, A9, A10, A11. Sem mudança de regra, arte ou economia. Sem Pacote 2. Sem commit. Não mexi em `cart.ts`, `CartBench.tsx`, `npcBehavior.ts`, música nem nas laterais da cena (`.mn-stage::before`).

### O que mudou (na ordem)

1. **Item 2.** Cabeçalho compacto em altura &lt; 800 px: uma linha (nome, nível, gold, tochas, relógio, placa). A cena usa o espaço que sobra. Em 1920×1080 o cabeçalho completo fica. Tirei o chip “Feliz aniversário” que cobria o relógio (decisão 1: aniversário fora do app até a Etapa 4).
2. **Item 3.** Placa continua chip no cabeçalho; o painel abre no céu, centro-topo, `max-height: 26%`, sem cobrir Fornalha nem Ferreiro. Fala de NPC fecha a placa.
3. **Item 5.** Contrato `done` (ou com `result`) nunca mostra “Abrir”; o selo é “Feito”.
4. **Item 8.** Toasts `bottom-center`, 96 px acima da hotbar, um por vez (`id: child-notice`). Lembrete de agenda não abre balão por cima do Continuar. `reminderDue` já recusa evento passado.
5. **18b.** O cartão da missão mostra o gold/XP que a conclusão paga (`vacationApplyGold` + origem criança/agenda = 0 + botas). O toast usa o valor pago; se cortou, acrescenta “teto do dia” ou “modo férias”.
6. **A3.** Quadro da Mina só com `status === 'ready'`. Lease vencido não zera contratos. Regeneração com contrato feito continua recusada; o commit final preserva `done` (`keepDoneContracts`).
7. **A4.** Ao subir de nível grava `pending:level:<season>:<n>` em `claimed`; o modal reabre. Escolher o material apaga o pending e grava a chave paga.
8. **A9.** Comerciante: colocação errada avisa uma vez “Tem certeza? Ouça de novo” antes de fechar a entrega.
9. **A10.** Diálogos e resumo de ontem ignoram datas &lt; `village.launchedOn`. `closeDay` honra `skipPenalty` no doc e o corte do lançamento. `launch-reset.cjs` marca `dailyProgress/{uid}_{launch-1}` com `skipPenalty: true`.
10. **A11.** `vite:preloadError` recarrega a página uma vez (`sessionStorage`).

### Arquivos

- `src/components/hero/HeroHeader.tsx`, `HeroPanel.tsx`, `TaskItem.tsx`, `YesterdaySummary.tsx`
- `src/components/hero/village/VillageHome.tsx`, `LevelUpModal.tsx`
- `src/components/hero/english/base/ContractBoard.tsx`, `EnglishBase.tsx`, `MerchantContract.tsx`
- `src/services/englishBaseService.ts`, `villageService.ts`, `dailyRulesService.ts`
- `src/services/village/claims.ts`, `src/config/englishBase.ts`, `src/utils/clock.ts`
- `src/contexts/DataContext.tsx`, `src/App.tsx`, `src/main.tsx`, `src/styles/miner.css`
- `scripts/launch-reset.cjs`
- `src/utils/__tests__/clock.test.ts`, `src/services/village/__tests__/etapa2.test.ts`
- fotos em `docs/exemplos/telas/varredura-p2/{720,1080}/p1-*.png`
- este relatório

### Como verificou

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | 0 erros |
| `npx eslint src --max-warnings 7` | 0 erros; 7 avisos (ícones + `CharacterEditor.tsx:154`) |
| `npm run test:english` | 19 arquivos; casos novos: `isBeforeLaunch`, presente pendente, `keepDoneContracts` |
| `npx vite build` | ok; `App-DM9nqtGq.js` + `CartBench-Dy7Ddbhk.js` + `statsBump-BtP6dVbT.js` |
| chunk `phaser` em `dist/assets` | nenhum |
| fotos 1280×720 e 1920×1080 | `p1-vila`, `p1-placa`, `p1-casa-missoes`, `p1-mina` (conta de teste, `?h=14`) |

### O que ficou de fora e por quê

- Pacote 2 (itens 10, 12, 13, 14, 16, 17, 18 de 12 px, P2.2 tour do Sábio): amanhã, como pedido.
- A1, A2, A5, A6, A7, A8: não estavam neste pacote.
- Gold de missão continua fora do `gameGoldDailyCap` (não é fonte de “gold do jogo”); o cartão e o toast passam a usar o mesmo valor pago.
- `launch-reset --apply` no Heitor: não rodei.

### Dúvidas

Nenhuma que tenha impedido o pacote.

## Torre — sala de troféus (19/09)

Sentimento: a Torre é a sala de troféus do clube, não uma planilha.

### O que mudou

- `Torre.tsx` passa a `ChildSheet` (`mc-modal` + corpo com scroll). Abas numa linha, sem Lucide; as que o nível não abriu ficam apagadas e falam com a voz da Torre (`villageLines`), não "Torre nível 2". Recordes no n0: "Recordes ficam lá em cima. Não perde."
- Categorias com nome de mundo (`Rotina 3/20`, `Baú`, não `bau`). Lista em `mc-row` + ícone 32 px + moldura da camada. Ganhou = verde (`is-done`); falta = cinza. Saiu a nota "nenhuma conquista paga gold".
- Quase lá no topo, compacto (uma linha por alvo), para a prateleira caber em 1280. Aba Vida real sem título duplicado; vazio falado. Recordes, troféus, mapa e histórias com copy do mundo e nomes de NPC.
- `englishBase.ts` n3 da Torre: sai "propor desafios", entra mapa e histórias (decisão 14).

### Arquivos

- `src/components/hero/village/Torre.tsx`
- `src/components/hero/AchievementsBadges.tsx` (`embedded`)
- `src/config/englishBase.ts`
- fotos: `docs/exemplos/telas/cena-v2/tmp-arena/cadeado-shots/torre-01-1280.png`, `torre-02-1920.png`

### Barra

1–7 visual: intenção (troféus), sistema (`mc-modal`/`mc-row`/`mc-slot`), Fredoka no corpo, ícone 32 px, uma âncora (quase lá + lista), Vila atrás, 1280 e 1920 sem corte no meio da palavra.
8–12 lógica: abas ainda batem com o nível; sem gold novo; cadeado com frase, não relatório.
13–16: clique com som; copy do Olheiro; fotos nesta sessão na conta de teste.

Frame lido (1280 e 1920, conta de teste, 10h): nada sobreposto nem cortado no quadro. Em 1280 cabem 3 troféus verdes abaixo do Quase lá. Clique em Recordes (trancado) e na categoria Mina conferidos.

### Fora

Não reescrevi o catálogo (`Mão na massa 10`). Não mudei o portão do header que abre a Torre no n0.

## Cofre — gold aplicado (19/09)

Sentimento: o Cofre é ouro parado no tempo, não um formulário de meta.

### O que mudou

- Cofrinho: some "Nova meta / Título / Criar meta" e o "Pedir para cancelar". A criança escolhe quanto guarda e por quanto tempo deixa aplicado. O gold não volta sozinho; só sai quando virar prêmio (o pai ainda cancela no painel).
- Enquanto o Cofre está no n1, o bônus não mente: chip "Cofre nível 1 / está rendendo" (texto, não número de gold) e o +gold da escolha mesmo assim (5 gold / uma semana = +0; a cada 20, +1). Montinho já aplicado mostra o que rende e o que rende se guardar mais. Um pouco todo dia soma; o de hoje começa na semana que vem.
- Extrato: a semana atual em quatro chips (ganhou, gastou, aplicou, rendeu) e movimentos agrupados por fonte (`Missão +41`), com frase do mundo. Semanas vazias somem. Sai "Guardou 0% (alvo 20%)".
- Paciência: três linhas + o mesmo seletor de tempo. Comparação honesta com a poupança de verdade fica.

### Arquivos

- `src/components/hero/village/Cofrinho.tsx`
- `src/components/hero/village/Extrato.tsx`
- `src/services/village/bank.ts` (`patienceForecast`, `minGoldForBonus`)
- `src/services/village/balance.ts` (rótulos)
- `src/services/village/__tests__/etapa2.test.ts`
- fotos: `docs/exemplos/telas/cena-v2/tmp-arena/cadeado-shots/banco-01-cofrinho-1280.png`, `banco-02-extrato-1280.png`, `banco-03-paciencia-1280.png`, `banco-04-cofrinho-1920.png`, `banco-05-extrato-1920.png`, `banco-06-paciencia-1920.png`

### Barra

1–7 visual: intenção (guardar), sistema (`ChildSheet`, `mc-slot`, `mc-inv`, `mc-chip`), Fredoka no corpo, ícone 28–32 px, âncora (bolso vs aplicado / semana), Vila atrás, 1280 e 1920 sem palavra colada.
8–12 lógica: depósito e juros iguais; sem gold novo; n1 não paga bônus; criança não saca.
13–16: `playClick`/`playError`; copy do Cofre; fotos na conta de teste; testes `etapa2` verdes.

Frame lido (1280 e 1920, 10h, teste@flash.com): nada sobreposto, cortado ou fora do clique no quadro do Banco.

### Fora

Não gravei o prazo no Firestore (as semanas são a lição e a previsão; o gold fica até virar prêmio). Cofre n3 continua trancado. Painel do pai (`GoalsPanel`) não foi restilizado.

## Cofre — 10/20/30 sem teto (19/09)

Sentimento: 10 gold parado quatro semanas pesa, não é uma parede de +0.

### O que mudou

- Paciência por nível do Cofre: n1 = 10 gold → +1 / semana, n2 → +2, n3 → +3 (n3 trancado). n1 passa a pagar. Sem teto semanal; a tela não fala "teto" nem "até N".
- 10 gold em quatro semanas no n1: +4 (os botões deixam de ser todos +0). 5 gold no n1 ainda não pagam 1; no n2, pagam.
- `interestCapGold` e `interestRatePct` do painel não cortam mais o bônus. O teto de gold do jogo (baú, desafio) continua.

### Arquivos

- `src/services/village/bank.ts` (`vaultInterestPct`)
- `src/components/hero/village/Cofrinho.tsx`
- `src/config/englishBase.ts`, `src/config/village.ts`
- `docs/VILA_CONSTRUCOES.md`, `docs/VILA_API.md`, decisão 27 em `ETAPA_2_LANCAMENTO.md`
- fotos: as mesmas `banco-0*.png` (refeitas nesta sessão)

### Barra

1–7: a âncora é o +gold do tempo; sem planilha de teto.
8–12: n1 paga 10%; sem gold inventado fora da taxa; criança não saca.
13–16: clique com som; copy em gold, não em %; fotos na conta de teste; `etapa2` verde.

Frame lido (1280 e 1920, teste@flash.com): nada sobreposto, cortado ou fora do clique.

### Fora

n3 continua trancado. O campo `interestCapGold` no painel do pai fica morto até o pai apagar.

## Contratos v2 — Entrega 1: Entrega do Comerciante (19/09)

Sentimento: o pedido mora no armazém. A criança arrasta, o item encaixa ou escorrega, o Comerciante aponta. Não é um formulário sobre a Vila.

### O que mudou

- Porta "jogo" em tela cheia (`MerchantDelivery.tsx`), kit da Vagoneta (canvas/React, sem Phaser). Fundo `public/assets/village/scenes/comerciante/backdrop.png` 1280×720 (o arquivo do líder não estava no repo; gerado no PixelLab e aumentado em nearest-neighbor). Quatro âncoras fixas em `anchors.json` (dois no chão, parede, balcão). Sprites `spot-<id>.png` e `item-<id>.png`. Nome só no hover/toque, com áudio.
- Arrastar com curva e estalo; lugar sem zona escorrega e cai; o Comerciante olha para o ponteiro. "Entregar" certo: guarda e agradece. Errado: devolve o item e diz a frase uma vez ("On the box, not in." / "Next to the window."). Segunda entrega é treino (`details.firstHits`); sem aviso na tela (decisão 23).
- Sem cronômetro na cara (`durationSec` só gravado). Bolinhas no alto. "Voltar à Mina" com confirmação. Texto 14 px+, Fredoka no corpo, sem caixa alta. Final: vagão no trilho, uma frase de nota, lista item a item (no lugar / para treinar).
- TTS: `instructions` fixas + velocidade 0,9; "Ouvir devagar" em 0,75; hash `model|voice|speed|instructions|texto` no cliente e em `functions/src/index.ts`. Texto em inglês só depois do primeiro "Ouvir".
- Módulo `settings/modules.contractsV2` padrão **true**: o quadro abre o armazém. Desligado (painel do pai) volta o contrato antigo. `?contractsV2=1` força o novo.
- Dados: `completeContract` igual ao de hoje (`englishPlans.result`, `englishSessions`, vocab). `details` ganha `attempts`. Economia da Mina intacta.

### Arquivos

- `src/components/hero/english/base/MerchantDelivery.tsx` (novo)
- `src/services/english/merchantPlay.ts` + `src/services/english/__tests__/merchantPlay.test.ts`
- `src/components/hero/english/base/EnglishBase.tsx`
- `src/services/englishTts.ts`, `functions/src/index.ts`
- `src/types/village.ts`, `src/config/village.ts`, `src/components/parent/VillageManager.tsx`
- `src/styles/miner.css` (`.md-*`)
- `public/assets/village/scenes/comerciante/backdrop.png`, `anchors.json`
- `docs/etapas/ETAPA_2_LANCAMENTO.md` §12 (duas linhas)
- fotos: `docs/exemplos/telas/contratos-v2/01-balao` … `07-final` em 1280 e 1920

### Como verificou

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | 0 erros |
| `npx eslint` nos arquivos tocados | 0 erros |
| `npm run test:english` | 10 arquivos; `merchantPlay` 12/12 |
| `npx vite build` | ok; `CartBench-*.js` separado; **sem** chunk `phaser` |
| fotos 1280×720 e 1920×1080 | conta `teste@flash.com`, `?h=14&d=2026-09-18&contractsV2=1` (quiz do dia 18 já feito; nunca a conta do Heitor) |

Aceite do pedido errado (foto `05-erro-devolvido`): poção ao lado da cama, pedido era ao lado da janela; item voltou à bandeja; balão "Next to the window."; janela acesa. A segunda entrega do mesmo pedido avançou sem aviso de "não paga". `completeContract` gravou (XP 58→63 nesta sessão).

Frame lido (1280 e 1920): nada sobreposto, cortado ou fora do clique no armazém. O OCR cola palavra da pixel; no frame as frases em Fredoka têm espaço.

### Barra da lei (item a item)

1. **Intenção.** Armazém + pedido no balão + arrastar. Passa.
2. **Sistema.** `mc-btn`, tokens, final em `mc-modal` + `panel-frame`. CSS `.md-*` só no buraco da cena. Passa.
3. **Fonte.** Título/número curtos; corpo e botão longo em Fredoka. Passa.
4. **Ícone.** Spots/itens do catálogo merchant; NPC da Vila; HUD 52 px. Sem emoji. Passa.
5. **Hierarquia.** Pedido agora; Entregar 44 px+; raio 8. Passa.
6. **A cena continua.** Tela cheia da porta "jogo" (MUNDO.md §5), não modal sobre a Vila. Passa.
7. **Arestas.** 1280 e 1920 por layout (sem `zoom`/`scale`). Vazio do balão é fala. Esc fecha. Passa.
8. **Mundo.** Contrato = porta jogo; React; Phaser não importado. Passa.
9. **Economia.** Sem fonte nova de gold/material/XP; claim intacto; relógio `ClockContext`. Passa.
10. **Consequência.** Erro devolve e aponta; sem humilhação. Passa.
11. **Estado honesto.** Cadeado/módulo desligado = contrato antigo. Frase de correção sem boletim. Passa.
12. **Mouse e teclado.** Arrastar, 44 px, Esc. Passa.
13. **Craft.** Curva + estalo (`sfx.hit`/`miss`); `playClick`. Passa.
14. **Copy.** "Ouve o pedido e coloca no lugar."; "No lugar. Guardo isso."; nota em uma frase. Sem "Faltam N". Passa.
15. **Evidência.** Fotos desta sessão, duas resoluções, conta de teste. Passa.
16. **Arestas de lógica.** Primeira entrega paga o `firstHits`; a segunda não; `?d=` / `?h=` / módulo off. Offline/IA: o plano do dia 18 já existia. Passa.

### Fora

- Função de voz **não foi deployada**; o hash novo só vale depois do deploy de `functions`.
- `contractsV2` passou a **true** (padrão + `settings/modules`) para o pai conseguir abrir o armazém. Desliga no painel se quiser o contrato antigo.
- Backdrop gerado aqui (o do líder não chegou). Se o pai trouxer outro PNG 1280×720 no mesmo caminho, a cena troca sem código.
- Não toquei `cart.ts`, `CartBench.tsx`, `npcBehavior.ts`, `bgm.ts`/`vila.mp3`, laterais da cena, economia nem catálogo de itens.
- Entregas 2–4 (Recado, Ferraria, Carta) e o quadro da Mina §3.5: não comecei.

### Playtest (voz e lugar)

- Sem sintetizador do navegador. Toda fala vai na voz nova (`gpt-4o-mini-tts` / `nova`). Sem URL, silêncio.
- `next to` é **ao lado** (colado no móvel). Não é `near` / “próximo” e não é o vão de baixo. Depois de ouvir, só o móvel do pedido ganha tapetes (`on` / `in` / `under` / `next to`); o pedido acende. O diálogo mora no alto da sala (viga vazia), não em cima do chão.
- Português do balão ele lê. Voz só no inglês do pedido (Ouvir). Acerto/erro/próximo são efeito de jogo (`sfx.ok` / `fail` / `next`).
- Comerciante da entrega = `comerciante-iso.png` (o da Vila). Pedido 1: um móvel + tapetes com nome (cola). Pedido 2: dois móveis, sem cola. Pedido 3: três móveis, sem cola. Depois do erro o tapete aponta o lugar certo. Item em cima do rótulo some o tapete. Final = mesa de carvalho (`mn-prova-sheet`), não lousa cinza.
- **Lição, não sorteio.** Uma preposição por sessão (n1: `in`/`on`; n2/n3 entram `under`/`next to`). Os pedidos repetem a mesma regra em móveis e itens novos; o último do n2/n3 contrapõe o par que o brasileiro troca (`in`↔`on`, `under`↔`next to`). Pedido 1 sempre quantidade 1. O mesmo trio item+preposição+lugar não volta em 14 dias (`merchantKey`).
- **O móvel anda.** A cada pedido o banco/baú/mesa troca de chão ou balcão (semente do dia + passo). Janela/porta ficam na parede. A bandeja também embaralha. Não é sempre “poção ao lado do banco no mesmo canto”.

### Lei do professor — 5 itens gerados nesta sessão

1. `Put a potion in the box.` (n1) — Aprende: `in` = dentro. Como: poção some pela metade na caixa. Claro. Uma certa. Erro típico: pôr em cima (`on`). Revisa em 3/10 dias quando o review do tipo ligar. Degrau: primeira com cola.
2. `Then put three lamps in the chest.` (n1, mesma regra) — Transfere `in` para o baú, sem cola, outro item. Não é a mesma poção.
3. `Put the cake in the barrel.` (n1, outra semente) — Mesma regra, outro objeto e outro lugar. Não decora “caixa”.
4. `Now put three apples on the box.` (n2, contraste) — Depois de dois `in`, o par `on`: em cima da caixa, não dentro. O distrator é o `in` que ele acabou de treinar.
5. `Please put two books on the chest.` (n3, contraste) — Fecha a sessão `in` com `on` em outro móvel.

Cada um: uma ideia; distrator = erro de brasileiro; explicação do Comerciante aponta o par (`On the box, not in.`); tenta de novo sem pagar (decisão 23).

### Dúvidas

Nenhuma que tenha impedido a Entrega 1. **Pare para o commit na branch `contratos-v2`.**

## Prova do dia v2 (19/09)

Sentimento: a mesa do Sábio pesa. A ideia pede tempo, a pergunta pede tempo, a prova só fecha quando ele conta o que ficou na cabeça.

### O que mudou

1. **Perguntas do nível certo.** Prompt em `dailyPrompt.ts`: criança de 10 anos, 5º ano (BNCC); matemática em duas etapas até 1000; ciências causa e efeito; inglês com uma só forma válida; história/geo de consenso; futebol regra/tática. Proibido resposta no enunciado, duas certas, "qual a capital de". ≥3 de duas etapas; distrator do erro típico; explanation ataca a tentadora; AUTO-REVISÃO na mesma chamada; `curiosity`; formatos mistos; áreas das 5 de conhecimento giram pelo dia da semana. `sanitizeQuestions` descarta vazamento e alternativas iguais depois de normalizar; se sobrar <5, a IA é chamada de novo antes do banco offline. Modelo da prova: `gpt-4o` (`DAILY_QUIZ_MODEL`). O resto continua no mini. `CHAT_MODELS` já tinha `gpt-4o`; função `openai` publicada nesta sessão (job 1789825911212, sucesso).
2. **Reflexão obrigatória.** Resultado mostra a nota e o campo. "Concluir a prova" só com ≥10 palavras, sem a mesma palavra 4 vezes e sem tecla repetida. Não existe Fechar antes. `completeDailyQuiz` recebe a reflexão e grava numa escrita só; XP e gold pagam aí; o cadeado só abre com `completed` (depois da reflexão). O dilema (pergunta 3) aparece no cartão Hoje do pai com o texto da escolha.
3. **Tempo de leitura.** "Próxima" (acerto e erro) e "Começar" esperam 1 s a cada 3 palavras (explicação 4–12 s; ideia 8–30 s). Anel de ouro no botão de pedra, sem números. Enter e clique respeitam o mesmo tempo; `prefers-reduced-motion` só some com o anel, o relógio continua. A ideia está escrita no papiro inteiro; a folha **desenrola** no mesmo relógio (máscara mole na boca do rolo — sem máquina de escrever). O canto da mesa vem no fim do papiro.

Visual: convite, ideia, pergunta e reflexão usam o mesmo papiro (rolo pixel + folha creme `#f6edd8`, tinta `#1a1410` 18px). Sem caixa de carvalho e sem mancha marrom na leitura. A ideia desenrola; o resto já nasce aberto. Alternativas em `mc-btn-wood` no próprio papiro. Copy do mundo.

### Arquivos

- `src/services/quiz/provaRules.ts`, `src/services/quiz/dailyPrompt.ts` (novos)
- `src/services/village/__tests__/provaV2.test.ts` (novo; 6/6)
- `src/services/aiDailyQuiz.ts`, `src/services/aiQuiz.ts`, `src/services/dailyQuizService.ts`
- `src/components/hero/DailyQuiz.tsx`, `src/index.css` (anel)
- `src/components/parent/HojeCard.tsx` (dilema; sem restilizar o painel)
- `src/types/index.ts` (`curiosity`)
- `src/services/village/statSources.ts` (`reflections` em `completeDailyQuiz`)
- `functions/src/index.ts` (já listava `gpt-4o`)
- `docs/etapas/ETAPA_2_LANCAMENTO.md` §12
- fotos: `docs/exemplos/telas/prova-v2/01-licao-anel-{1280,1920}.png`, `02-proxima-travada-*.png`, `03-reflexao-*.png`

### Como verificou

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | 0 erros |
| `npx eslint` nos arquivos do pacote | 0 erros |
| `npx eslint src --max-warnings 7` | 3 erros **fora** deste pacote (`merchantPlay.ts` unused, `bank.ts` `_settings`); 7 warnings já permitidos |
| `npm run test:english` | 21 arquivos; `provaV2` 5/5; `etapa2` 21/21 |
| `npx vite build` | ok; `CartBench-*.js` separado; **sem** chunk `phaser` |
| `firebase deploy --only functions:openai` | job 1789825911212, sucesso |
| fotos 1280×720 e 1920×1080 | conta `teste@flash.com`, `?d=2026-09-23&h=10&quiz=lock` (nunca a conta do Heitor) |

Frame lido (1280 e 1920, lição / pergunta / reflexão): nada sobreposto, cortado ou fora do clique. A Vila continua ao redor do quadro. O OCR da pixel cola palavra ("Provado dia"); no frame, Press Start e Fredoka têm espaço. Anel: botão de pedra com traço de ouro por dentro; "Concluir" verde só com a reflexão pronta. Lição aos 10 s (`?d=2026-09-23`): o corpo ainda corta no meio ("…sotaques"); o "por quê" e o canto da mesa ainda não nasceram; Começar continua de pedra. `npm run test:village` — `provaV2` 6/6.

Prova de domingo (2026-09-20) da conta de teste regenerada às 14:09Z: tema formigas, `curiosity` ("pontes com o próprio corpo"), ciências "o que aconteceria se", inglês "The ant is … a leaf", dilema na pergunta 3. Matemática ainda saiu em um passo (500×2); o prompt pede duas etapas — o pai pode "Gerar outra" se quiser mais dura. A prova do Heitor **não foi tocada**.

### Barra da lei (item a item)

1. **Intenção.** Mesa do Sábio: ideia, pergunta, reflexão. Passa.
2. **Sistema.** `mc-modal` / `panel-frame`, `mc-paper`, `mc-row`, `mc-btn`, `mc-num`. CSS do anel só no buraco. Passa.
3. **Fonte.** Título curto em Press Start; lição, recado e botão longo em Fredoka. Passa.
4. **Ícone.** Sábio 40 px, livro 32 px, tocha 24 px, estrela/ouro 24 px. Sem emoji. Passa.
5. **Hierarquia.** Ideia / pergunta / nota+reflexão; botão 44 px. Passa.
6. **A cena continua.** Véu; a Vila lê-se em volta. Passa.
7. **Arestas.** 1280 e 1920 sem `zoom`/`scale`. Vazio e espera com voz do mundo. Passa.
8. **Mundo.** Prova no React; Phaser não importado. Passa.
9. **Economia.** XP/gold só em `payQuizRewards` depois da reflexão; claim `quiz:<date>` intacto; relógio `ClockContext`. Passa.
10. **Consequência.** Erro explica a tentadora; reflexão sem humilhação. Passa.
11. **Estado honesto.** Cadeado só com reflexão gravada; "Começar"/"Próxima" travados até o tempo. Passa.
12. **Mouse e teclado.** 44 px; Enter e clique no mesmo relógio; Esc só quando pode sair. Passa.
13. **Craft.** `playClick` / acerto / erro; anel com peso; `mc-pop` / `mc-shake` / `mc-build`. Passa.
14. **Copy.** "A prova de hoje ainda espera."; "Não foi dessa vez."; "O Sábio leu. A Mina abre." Sem "Faltam N". Passa.
15. **Evidência.** Fotos desta sessão, duas resoluções, conta de teste. Passa.
16. **Arestas de lógica.** Offline/IA desligada: retry e depois o banco. Virada `?d=`. Primeiro dia e férias não mudam o cadeado da reflexão. Passa.

### Fora

- Não restilizei o painel além do bloco do dilema no Hoje.
- Não cliquei "Gerar outra" logado como pai (senha do pai não está no `.env`); regenerei a de domingo da conta de teste pelo prefetch da criança depois de retirar o doc antigo (nível pré-v2).
- Não toquei a prova do Heitor.
- Não toquei `cart.ts`, `CartBench.tsx`, `npcBehavior.ts`, `bgm.ts`/`vila.mp3`, laterais, `src/game/**`.
- `eslint src` ainda tem 3 erros de outros pacotes; não limpei.

### Dúvidas

Nenhuma que tenha impedido o pacote. **Pare para o commit.**

## Cofre — Resgatar (19/09)

Sentimento: o montinho tem um dia de voltar, e o botão está em cima dele.

### O que mudou

- As semanas escolhidas gravam `unlockOn`. Enquanto rende, o card fala o dia ("Volta no sábado"). No dia, **Resgatar N gold** no próprio montinho do Cofrinho devolve ao bolso (com o que já rendeu). Antes disso não saca.
- Montinho antigo sem prazo já pode resgatar (conta de teste). Chip do Cofre fala "nível 1 / está rendendo" em texto, não um `1` grande igual ao gold do bolso.
- Regras publicadas em **19/09/2026 11:30 -03** (`firestore:rules`, projeto `app-heitor`).

### Arquivos

- `src/services/village/bank.ts`, `src/services/goalsService.ts` (`redeemGoal`)
- `src/components/hero/village/Cofrinho.tsx`
- `src/types/village.ts`, `firestore.rules`
- decisão 28 em `ETAPA_2_LANCAMENTO.md`

### Barra

1–7: âncora é o botão Resgatar no card; sistema `mc-btn-gold` 44 px.
8–12: devolve o `savedGold` que já era dele; relógio `ClockContext`; ruína tranca.
13–16: `playClick`; copy do mundo; fotos na conta de teste; `etapa2` verde.

Frame lido: nada sobreposto, cortado ou fora do clique.

### Fora

Não forcei o saque no dia; ele pode deixar rendendo depois que o botão acende. Painel do pai não foi restilizado.

## Cofre — um montinho por aplicar (19/09)

Sentimento: cada depósito é um contrato visível — quanto, quanto rende, quando volta — não um bolo de 45.

### O que mudou

- Aplicar 10, 20, 30, 40 ou 50 (o 10% fecha: 10→+1, 20→+2). Sai o 5 e o valor solto do bolso.
- Cada Aplicar abre um montinho novo. Card: `20 gold · rende +2 por semana` e `Saque 17 de outubro`. Resgatar continua no card, um a um.
- Cofre n1 guarda até 5; n2 até 8. Paciência lista os montinhos dele e o “se aplicar” só com 10–50.
- Montinho antigo já misturado fica até o resgate; o próximo aplicar não entra em cima.

### Arquivos

- `src/components/hero/village/Cofrinho.tsx`, `src/services/village/bank.ts` (`saqueLine`, `vaultGoalCap`), `src/services/goalsService.ts`, `src/config/village.ts`
- `docs/VILA_CONSTRUCOES.md`, `docs/VILA_API.md`, decisão 29
- fotos: `banco-01` a `banco-06` (conta teste)

### Barra

1–7: âncora é o card do montinho; chips 10–50; Fredoka no corpo; Vila atrás.
8–12: não inventa gold; um goal por aplicar; relógio Brasília.
13–16: `playClick`; fotos 1280 e 1920; `etapa2` verde.

Frame lido: nada sobreposto, cortado ou fora do clique. Card do montinho: `45 gold` + dia do saque; Paciência com 10–50.

### Fora

- Não parti o montinho antigo em fatias. Painel do pai: só a linha de ajuda do módulo juros.
- A conta teste estava resetada (Cofre 0) na hora da foto: Paciência 10–50 conferida; o card do montinho (gold · rende +N · saque no dia) depende do Cofre de pé.

## Contratos v2 — Entrega do Comerciante V1 (19/09)

Sentimento: o item some no lugar certo; o Comerciante fala o erro em uma frase; no fim só ele, o pagamento e o trilho.

### O que mudou

- Porta "jogo" em tela cheia (`MerchantDelivery`): armazém, arrastar com curva e estalo, cola só no 1º pedido, sala 1→2→3 móveis.
- Voz sempre `nova` (`gpt-4o-mini-tts`). Sem `speechSynthesis`. Sem TTS no título em português. Som de jogo no acerto, erro e próximo.
- Recompensa só da primeira entrega (decisão 23), sem aviso na tela.
- Nível pelo desempenho (`merchantDone` / `merchantPerfect`): 3 perfeitas → lv2; 7 feitas e 5 perfeitas → lv3. Nunca desce no meio do dia. Pedido (item+prep+lugar) não repete em 30 dias. Quantidade e bandeja mudam.
- Final: balão + XP/gold/material + Voltar à Mina + vagões. Sem cama, sem lista-boletim, sem móveis que não estavam no pedido.

### Arquivos

- `src/components/hero/english/base/MerchantDelivery.tsx`, `src/services/english/merchantPlay.ts`, `merchantRoom.ts`, `englishAi.ts`, `englishBaseService.ts`
- `public/assets/village/scenes/comerciante/`
- `docs/MINA_CONTRATOS.md` §4; `ETAPA_2_LANCAMENTO.md` §12
- fotos: `docs/exemplos/telas/contratos-v2/01` a `07`

### Barra

1–7: âncora é o pedido e o lugar; sistema `md-*` / `mc-*`; Fredoka no corpo; ícone HUD; a Vila não some — a porta é o jogo.
8–12: economia intacta; `ClockContext`; primeira entrega paga; Esc fecha.
13–16: `playClick` + `sfx.ok/fail/next`; copy do mundo; fotos 1280 e 1920 na conta teste; offline/IA: reserva do Comerciante.

Frame lido (V1 aceita pelo pai): nada sobreposto, cortado ou fora do clique no final sem móveis extras.

### Lei do professor (conteúdo do Comerciante)

O pacote não gerou item novo de prova. O que a criança aprende continua sendo in/on/under/next to em frase do armazém, uma preposição nova por sessão no lv1, áudio antes do texto, distrator = erro de brasileiro (in/on). A geração do dia já passa por `merchantRoom` + `englishAi`.

### Fora

- Voltar depois para lapidar arte dos 12 lugares / 17 itens e "Ouvir devagar" se o pai pedir.
- Não começou Ferraria nem Carta.
- Não tocou a conta do Heitor.

### Dúvidas

Nenhuma. Pai aceitou a V1 e pediu o próximo contrato: Recado.

## Contratos v2 — Recado do Capataz V1 (19/09)

Sentimento: o pedido vira giz no quadro; os três pregos acendem quando a frase cobre o que não pode faltar.

### O que mudou

- Porta "jogo" em tela cheia (`RecadoBoard`): boca da mina, quadro, Capataz (Olheiro iso), três pregos, peças de giz.
- Degrau 0: molde com lacunas + banco para arrastar/clicar. Degrau 1: escreve no quadro com o banco. Degrau 2: livre; dica (1 ferro na mão) devolve o banco. O `scaffoldStage` que já existia vira cena.
- Falta na 1ª tentativa: o Capataz fala o que falta, em português. Juiz e nota iguais aos de antes (`judgeNote`, `noteMaterial`). "De novo" uma vez; paga só a primeira leitura.
- Final no molde do Comerciante: balão + pagamento + Voltar + vagões. Sem boletim cinza.
- `NoteContract` antigo continua se `contractsV2` estiver desligado.

### Arquivos

- `src/components/hero/english/base/RecadoBoard.tsx`, `src/services/english/notePlay.ts` (+ teste)
- `src/components/hero/english/base/EnglishBase.tsx` (view `note-v2`)
- `src/styles/miner.css` (`.nb-*`)
- `ETAPA_2_LANCAMENTO.md` §12

### Barra

1–7: âncora é o quadro e os pregos; reusa `md-play` / `mc-btn` / `mc-chip`; Fredoka no recado; Capataz âncora, não ícone 256 px; a Vila fica atrás da porta.
8–12: sem fonte nova de gold; claim/complete iguais; relógio do plano do dia; erro ensina no giz vermelho.
13–16: `playClick` + `sfx.fail/checkpoint/next`; copy do Capataz (`notePlay.chalkLine`); verificação nesta sessão abaixo.

### Lei do professor

Pedido do pai em 19/09: o Recado era lista da mina (tocha, caverna) e não falava da vida. Agora cada recado ensina **duas coisas**: o inglês do nível e um combinado de casa/escola/futebol. Cinco itens gerados nesta sessão:

**1. n1-01 — lição primeiro**
1. Aprende: `I do` + `then`, e que a lição vem antes da bola.
2. Como: ouve "I do my homework first. Then I play soccer." e monta no quadro.
3. Claro: duas frases curtas, palavras que ele usa todo dia.
4. Uma certa: as três infos (lição, primeiro, bola); distrator do banco é want/need, o chute de "I need a torch".
5. Erro: o Capataz fala o que faltou em PT e toca o inglês de novo; sem ouro/ferro.
6. Progressão: só presente; `because` e `must` ficam para os níveis 2 e 3.

**2. n1-02 — prato na pia**
1. Aprende: `I wash` + `for mom`, e que prato sujo é dívida.
2. Como: recado para a mamãe, não pedido ao ferreiro.
3. Claro: lavo o prato / é para ela.
4. Uma certa; distrator cup/dinner (o erro de inventar outra tarefa).
5. Erro ensina a peça que faltou; tenta de novo sem pagar.
6. Mesmo hábito volta no n3-02 com `am washing` e `must`.

**3. n1-04 — pedir água com educação**
1. Aprende: `Please` + `I want`, e que pedido começa com educação.
2. Como: ouve, depois monta; Please não aparece no brief em inglês.
3. Claro: uma água, tenho sede.
4. Uma certa; distrator juice/play.
5. Erro: faltou o Please ou a sede — o quadro diz qual.
6. Degrau: L2 troca Please por `Can I` + `because`.

**4. n2-01 — bola porque a lição está pronta**
1. Aprende: `Can I` + `because`, e o mesmo combinado do n1-01 com motivo.
2. Como: a razão entra na segunda frase, não num número de tochas.
3. Claro: jogar bola / porque a lição está pronta.
4. Uma certa; `because` não pode faltar.
5. Erro típico: pedir a bola sem o porque — prego apagado.
6. Revisita do n1-01 por outro ângulo.

**5. n3-01 — estou fazendo a lição, depois jogo, devo esperar**
1. Aprende: `am + -ing`, `to + verbo`, `must`, e esperar o combinado.
2. Como: três frases, uma regra nova cada.
3. Claro: agora / para jogar / devo esperar.
4. Uma certa por info; distrator soccer/first (quer pular a espera).
5. Erro: o giz aponta a forma (`doing`, `to play`, `must wait`).
6. Fecha o arco lição-primeiro dos três níveis.

Itens que a barra derrubaria (tocha/picareta/caverna, lista para o ferreiro) saíram do banco e do prompt. A IA que devolver isso falha no validador de tema da vida pelo prompt; a reserva offline já não tem mina.

### Fora

- Sem fundo pintado novo da entrada (cena composta: caverna + tochas + quadro + Olheiro iso). Arte gpt-image da §6 fica para o líder.
- Sem Ferraria, Carta nem entrada de placas.
- Fotos 1280/1920 desta sessão: ver pasta `docs/exemplos/telas/recado-v2/` quando o aceite passar.

### Dúvidas

Nenhuma que tenha impedido abrir o Recado. **Pare para o commit depois do aceite visual.**

## Hotfix — teto de 1 ruína por dia (20/09)

Sentimento: o dia ruim deixa uma obra caída, não a vila inteira no chão.

### O que mudou

Pedido do pai (decisão 30): várias missões não feitas no mesmo dia derrubam **uma** construção, não uma por missão. Gold de penalidade, capacete, Cerca, skipPenalty e o reparo (dia completo ou 1 material) ficam iguais.

### Arquivos

- `src/services/village/repair.ts` (`cracksAfterClose`)
- `src/services/village/__tests__/etapa2.test.ts`
- `docs/VILA_CONSTRUCOES.md`, `docs/MINER_MISSIONS_ROADMAP.md`, `docs/VILA_API.md`
- `docs/etapas/ETAPA_2_LANCAMENTO.md` (decisão 30)

### Como verificou

| Comando | Resultado |
|---|---|
| `npm run test:village` | 10 arquivos, todos passaram. Caso novo: 3 missões → `['fornalha']`; ruína antiga + 3 perdidas → +1 só (`['fornalha', 'bau']`) |

### Fora

- Penalidade de gold por missão não feita: não pedida.
- Ruínas de dias anteriores sem reparo continuam acumulando (1 nova por dia).


