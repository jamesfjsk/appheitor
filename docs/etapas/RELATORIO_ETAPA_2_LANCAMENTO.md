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

