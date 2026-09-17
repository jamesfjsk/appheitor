# Etapa 2, fechamento: lançamento jogável no domingo 20/09/2026

Arquivo de etapa para a IA de código (Cursor). Escrito em 17/09/2026 (quinta) a partir do plano de lançamento aprovado pelo pai. Substitui, até domingo, qualquer outra lista de pendências do Lote 2: o que não está aqui não entra na branch antes do lançamento.

Leia antes de começar: `docs/etapas/REVISAO_ETAPA_2_LOTE_2.md` (os itens A1 a A14 citados aqui vêm de lá), `docs/MINER_MISSIONS_ROADMAP.md` (invariantes e "O universo conectado"), `docs/VILA_MAPA.md`, `docs/VILA_CONSTRUCOES.md`, `docs/MUNDO.md`.

## 0. Contexto e regra da semana

O Heitor faz 10 anos na sexta 18/09. Ele joga pela primeira vez no **domingo 20/09 de manhã**, com esta branch (`etapa-2`) fundida na `main`. Até lá o site mostra o teaser. Hoje é quinta 17/09.

Regras da semana:

- **Quinta e sexta são de código; sábado é de teste e correção; domingo é só operação.** Nada novo entra no sábado à tarde.
- **Um pacote por vez, na ordem: P0, P1, P3, P5 (núcleo), P2, P4, P5 (resto).** O pai faz um commit por pacote quando `tsc`, `eslint` e os testes estiverem verdes. Arquivo tocado fora do pacote em andamento volta ao estado anterior.
- **Nada entra sem documento.** Arquivo novo precisa de uma linha na seção 12 deste arquivo ("Entrou nesta etapa"), de uma linha na tabela "recebe de / entrega para" do roadmap e, se ensina alguma coisa, de ficha pedagógica. A revisão de sábado abre com a seção "Entrou sem doc" e o que estiver lá sai da branch.
- **Vagoneta da Mina congelada** (`src/services/village/cart.ts`, `src/components/hero/english/base/CartBench.tsx`): só bug apontado pelo E2E de sábado. Nada de ajuste visual.
- Relatório ao final de cada pacote em `docs/etapas/RELATORIO_ETAPA_2_LANCAMENTO.md` (uma seção por pacote: o que mudou, arquivos, como verificou, o que ficou de fora e por quê).

## 1. Decisões do pai (17/09; não reabrir)

1. Lançamento domingo 20/09 com a `etapa-2`; sexta mantém o teaser; o aniversário é comemorado fora do app. `BirthdayCelebration` sai da tela até a Etapa 4 (vira "eventos").
2. **Ruínas ficam como implementadas**: obra cai por missão perdida; obra caída tranca Baú do Dia, Cofrinho, juros e Ferraria até o reparo. Exceção única: **a prova continua alcançável com a Mesa caída** e o portão da prova não some (P1.1).
3. O minerador **anda até o ponto clicado** (charme visual, sem física, sem teclado). A porta de cada lugar continua sendo o clique no lugar. (`docs/MUNDO.md` §1 e §5 atualizados pelo líder.)
4. Reset de lançamento: XP zera, temporada 1, **100 gold** de presente de lançamento, primeiro acesso de verdade (Onboarding).
5. **Vagoneta da Mina** entra como módulo (`settings/modules.logic`, rótulo "Vagoneta da Mina"), com ficha pedagógica e 7 conquistas (seção 12). No dia 1 fica **ligada só se passar no E2E de sábado**; senão entra desligada e volta na semana 2 pelo painel.
6. **Oficina de Redstone em Phaser** (`src/game/redstone/`, `RedstoneBench.tsx`) é o molde da porta "jogo" do `MUNDO.md` §5: fica documentada e **sem import** até a Etapa 3; `phaser` não pode entrar no bundle.
7. Look de corpo inteiro por cosmético fica; o efeito colateral (sem animação de andar com chapéu ou capa) é aceito até a Etapa 4.
8. **Arena é landmark** (sem custo, sem nível, nunca em Obras; o clique abre a fala do Olheiro). **Campinho fora** da cena e das Obras até a Etapa 4. Regra: nada "em breve" pode ser comprável.
9. Camadas `look`, `wall` e `growth` só como dado no `anchors.json` (regra 20b da Etapa 2).
10. Nada mais entra sem documento (regra da semana, acima).
11. **Prova do dia obrigatória desde domingo**: o reset grava `progress.quizRequired = true`. A prova é portão, não modal: nunca abre sozinha; o Sábio explica o cadeado no Onboarding.
12. Reset **zera o jogo e guarda o pedagógico**: obras, equipamentos, cosméticos, XP, streak e gold zeram; ficam missões e prêmios cadastrados, nível e vocabulário de inglês, histórico da prova (`dailyQuizzes` e `quizBank`) e o histórico de gold como registro.
13. Módulos no dia 1: `shop` ligada, `bank` e `interest` ligados se P1 fechar (senão semana 2), `logic` conforme a decisão 5, `tts` e `aiGeneration` ligados.

## 2. Calendário

| Quando | Cursor | Líder (Claude) | Pai |
|---|---|---|---|
| Qui 17, tarde e noite | P0 inteiro | este arquivo; currículo de 120 temas; bancos dos NPCs; perguntas offline; docs de desenho | commit do P0 quando os checks ficarem verdes |
| Sex 18 (aniversário; pai fora quase o dia todo) | P1 na ordem; P3 (scripts); P5d (gravação do `quizBank`) | testes do motor de rotação (spec na seção 8); revisão do diff do P1 à noite | 30 minutos à noite: lê os títulos dos 120 temas (`docs/conteudo/CURRICULO_PROVA.md`) e risca |
| Sáb 19, manhã | P2, P4, P5 restante | E2E do dia 1 na conta de teste; `MANUAL_DO_PAI.md`; roadmap | cadastros no painel: missões por período, 3 a 5 prêmios com faixa, recado de boas-vindas; gera e lê a prova de domingo |
| Sáb 19, tarde | correções da revisão e do E2E | revisão final; go/no-go às 21h | roda o reset na conta de teste e joga o dia 1 (30 min); commit |
| Dom 20, 8h às 10h | plantão | plantão para hotfix | backup, merge `etapa-2` em `main`, `VITE_MAINTENANCE` desligado, deploy, `launch-reset.cjs --apply` no uid do Heitor, chama o Heitor |

## 3. P0: estabilizar a árvore (quinta)

Estado em 17/09 às 15h (`npx tsc --noEmit -p tsconfig.app.json`, `npx eslint src`, `npm run test:english`):

1. `src/components/hero/english/mine/MineRush.tsx:229`: `useSound` não importado (entrou hoje). Importar de `../../../../contexts/SoundContext` (confira o caminho) ou remover o uso.
2. `src/components/hero/village/CharacterEditor.tsx:242-243`: `hat` e `cape` podem ser `null`; guardar antes de indexar (`if (!id) return` ou tipo `string | null` nas funções que recebem).
3. `src/services/redstoneService.ts:114`: `out` está estreitado para `never` depois do `if (!out)`; declarar `let out: CompleteRedstoneResult | null = null` e ler por uma variável nova depois da transação (`const result = out as CompleteRedstoneResult | null; if (!result) throw ...`).
4. `src/services/village/redstone.ts:434,527`: remover `_tool` e `_hash` (eslint `no-unused-vars`).
5. `src/components/hero/village/ItemGlyph.tsx:43,51,57`: mover os helpers exportados para `src/components/hero/village/itemGlyphs.ts` e importar de lá (3 avisos `react-refresh`). Os 6 avisos de `src/icons/index.tsx` são antigos e ficam.
6. `src/services/english/__tests__/levels.test.ts` vermelho: o helper de sprite em `src/config/englishBase.ts` deve tirar a querystring (`?v=...`) antes do `existsSync` no teste (ou o teste tira). Rodar `npm run test:english` inteiro e deixar verde.
7. `src/game/README.md` novo: "Molde da porta 'jogo' (`docs/MUNDO.md` §5). Não importar até a Etapa 3." Cabeçalho igual em `RedstoneBench.tsx`. Confirmar com `npx vite build` que não existe chunk `phaser` em `dist/assets` (se existir, é porque algo importa `RedstoneBench`; remover o import, não o arquivo).
8. Remover abandonados: `scripts/align-look-layers.py`, `scripts/paint-look-overlays.py`, `public/assets/village/char/hat-cap.png`, `hat-crown.png`, `hat-iron.png`, `cape-drape.png` (se nenhum código os referencia: `grep -rn "hat-cap\|hat-crown\|hat-iron\|cape-drape" src`), `public/assets/village/sheet.png` (idem), e em `docs/exemplos/telas/cena-v2/` os `_shot_*.mjs` e fotos `tmp-arena/` que nenhum relatório cita.
9. `CartBench.tsx` e `cart.ts` congelados a partir daqui.

Aceite do P0: `tsc` 0 erros; `eslint` 0 erros (só os 6 avisos de `src/icons/index.tsx` e o de `CharacterEditor.tsx:153`); testes verdes; `dist/assets` sem `phaser`; relatório com a lista do que foi removido. Commit do pai.

## 4. P1: bugs que bloqueiam o dia 1 (sexta), nesta ordem

1. **A1 com ruínas (prova alcançável com a Mesa caída).** Em `VillageHome.tsx`: `quizBlocksDest` volta a incluir `mine`, `npc:ferreiro` e `npc:comerciante`; `quizGate = quizLocked` (sem `&& !mesaDown`). Em `src/components/hero/DailyQuiz.tsx`: `openRequested` abre mesmo com `mesaDown`; a Mesa caída só perde os bônus dela (nada de bloquear a prova). Teste puro do portão: com `quizRequired` e Mesa caída, `mine` continua trancada e a prova abre por pedido.
2. **Primeiro acesso limpo.** (a) `HeroPanel.tsx:120`: `BirthdayCelebration` desmontado (o import some; o componente fica no repositório para a Etapa 4). (b) `DailyQuiz.tsx:92-99`: apagar o efeito que abre a prova sozinha; ela só abre por `openRequested` (hotspot da Biblioteca, Placa, Sábio, hotbar); o `isQuizSnoozed` deixa de existir para a prova do dia. (c) `Onboarding.tsx:30-42`: `try/catch` em `completeOnboarding` com toast de erro e o botão voltando a ficar ativo. (d) `processPendingDays` (`dailyRulesService.ts:329-347`) já parte de `activatedOn` e `lastDailySummaryProcessedDay`; garantir que **quem abre o painel do pai não fecha dias da criança** (a chamada em `DailyRulesManager.tsx:66` só por botão explícito, nunca ao montar) e que `DataContext` só chama `processPendingDays` para a criança logada. (e) `DataContext.checkAchievements` ignora conquistas com `isActive !== true` (as antigas do Flash Missions ficam inativas no reset).
3. **A13 + A9 (fechar temporada).** `villageService.ts:658-710`, dentro da transação: recusar se `stars` já tem a temporada ou se `claimed['season:<n>']` existe; gravar `claimed['season:<n>']`; apagar `claimed['ach:<id>']` e tirar de `newAchievements` os ids com `resetOnSeason`. Teste puro com o doc antes e depois.
4. **A3 + A4 (contadores das conquistas e dos pedidos).** Criar `src/services/village/statSources.ts`: um mapa `stat → { where: string }` de todo stat que alguma conquista ou pedido lê, e um teste que varre `GAME_ACHIEVEMENTS` e `NPC_QUESTS`: stat sem fonte quebra o teste. Fontes, cada uma dentro da transação do evento que a gera: `fullDaysCount`, `fullDaysBest`, `perfectWeeks`, `noPunishDays` (`closeDay`); `quizStreak`, `reflections` (`dailyQuizService`); `contractsLetter`, `contractsNote`, `contractsForge`, `contractsMerchant`, `contractsPerfect`, `contractsWeek`, `themesSet`, `wordsMastered` (vocab com `seen >= 3`) (`englishBaseService`); `smelts`, `burns`, `streakChests`, `emeraldsEver`, `diamondsEver`, `talksSameDay`, `nightComplete`, `merchantSales` (`villageService`); `goalsAchieved`, `bigGoals`, `interestWeeks` (`goalsService`); `challengesDone` (`challengesService`); `agendaPlanned`, `organizedWeeks`, `focusBlocks` (Foco terminado) (`agendaService`); `redstoneDone`, `redstonePerfect`, `redstoneStages` (`redstoneService`, é a Vagoneta). Sem fonte até a Etapa 3 e **fora do catálogo agora**: `saverWeeks`, `creeperClicks`, `weekQuestion`. Pedidos: Comerciante 1 vira "Venda 10 pedra ao Comerciante" (`merchantSales`); Sábio 5 vira "Sete provas seguidas" (`quizStreak`); capítulo N só com `tier >= N`; presente do tier 3 (esmeralda) e do tier 5 (cosmético do NPC ou diamante) com chave `npcgift:<npc>:<tier>` em `claimed`.
5. **A5 (recordes).** `recordsAfterWeek` (`season.ts:30`) chamado em `claimTrophy` (`villageService.ts:1053`) e no fechamento da semana ao abrir o app (chave `week:<iso>` em `claimed`); a Torre (`Torre.tsx:116`) lê `records`; o ouro da semana conta as tochas pelos `dailyProgress`.
6. **A6 (aprendizado).** `learningService.ts:33-72` passa a calcular o acerto por categoria a partir do `quizBank` (seção 8, P5d), não de `answers` (que é `string[]`); `wordsMastered` de `englishBase.vocab` (`seen >= 3`); guarda a semana em `learning/{uid}.weeks[<iso>]` além do resumo. Recalcula ao abrir o app na segunda de manhã (semana virou) e ao abrir a aba Relatório do painel.
7. **A10 (plano do turno).** `DailyChecklist.tsx:75` e `TaskItem`: ordem por `plan.order`; selo "Foco · 2x material" na missão foco; toast da conclusão com o loot real que a transação devolveu (`DataContext.tsx:453`), não o valor previsto.
8. **A11 + M16 (Torre).** `Torre.tsx:60`: cadeados por nível; o nível vem sempre de `getLevelFromXP(progress.totalXP)` na Torre e no contexto dos diálogos.
9. **Concorrência (400) + M10.** `statsBump.ts:176`: incrementos de stats que pertencem ao evento entram na transação do evento (missão, obra); os demais rodam em sequência depois da transação principal, com a promise esperada (nada de `bumpVillage` solto disparando junto com `runTransaction` no mesmo doc).
10. **`milestone_10` duplicado** em `src/config/items.ts` (ou onde estiver): uma entrada só; teste "ids únicos no catálogo" em `village.test.ts`.
11. **Arena e Campinho.** `config/englishBase.ts:187`: Arena sem custo e sem nível (landmark); a aba Obras não lista `arena` nem `campinho`; o clique na Arena abre a fala do Olheiro; o Campinho sai do `anchors.json` (lot) até a Etapa 4; `arena` e `campinho` saem de `BREAKABLE_LOTS` em `src/services/village/repair.ts` (marco não cai; teste existente ajustado).
12. **M13 mínimo (regras).** `firestore.rules`, `village/{uid}`: a criança não altera `season`, `stars` e `launchedOn` (seção 9). Publicar as regras (`npx firebase-tools deploy --only firestore:rules --project app-heitor`) e registrar a hora no relatório.
13. **Ruína só quando há penalidade.** Em `closeDay`, `cracks` segue exatamente `skipPenalty`: férias, folga, punição e `dailyRules.enabled = false` nunca derrubam obra. É a válvula de escape dos riscos.

Aceite do P1: testes novos verdes; na conta de teste: Mesa caída mantém o cadeado da Mina e a prova abre; fechar temporada duas vezes recusa a segunda; falar com os 4 NPCs destrava "Curioso"; o plano reordena e marca a foco; obra sem erro 400 no console; Torre sem nível discordante do cabeçalho.

## 5. P2: o primeiro acesso do Heitor (sábado de manhã)

Regra: **um modal por vez**. `LevelUpModal`, toasts de conquista e a prova nunca aparecem por cima do Onboarding.

Roteiro do domingo, que o E2E de sábado reproduz:

1. Boot → "Entrar como Heitor" → `DataContext` roda streak (0), `processPendingDays` (nada a fechar), juros (sem metas), reset das missões do dia.
2. `ensureVillage` encontra `onboardedAt = null` → `Onboarding.tsx` em tela cheia. Passo 0 "Crie seu minerador" (nome, vila, pele, cabelo, camisa, calça) já existe. **Novos passos 1 a 5, "O Sábio"**, com `public/assets/village/npc/sabio-iso.png` à esquerda e um balão por tela, um lugar por tela, com o ícone do lugar:
   - 1 "A Vila abre tocando. Cada lugar faz uma coisa. Toque para descobrir."
   - 2 "A Casa guarda suas missões: manhã, tarde e noite. Cada missão feita paga gold e material."
   - 3 "A Biblioteca tem a prova do dia. Sem ela, a Mina, o Mercado e a Ferraria ficam com cadeado."
   - 4 "A Mina é onde você trabalha em inglês e ganha material para as obras."
   - 5 "Às 18h, com tudo feito, o Baú do Dia abre. Antes de dormir, feche o dia na Casa."
   Botão "Continuar" nos passos 1 a 4 e "Entrar na Vila" no 5. Sem pular etapas (é uma vez na vida).
3. `completeOnboarding` grava nome, vila e `onboardedAt`. `DailyQuiz` só assina o doc e pré-gera amanhã; não abre.
4. Placa com os recados do dia 1 (`notices.ts`, chaves `auto:firstday:<n>:<date>`): "Toque na Casa para começar" até a primeira missão; "A prova de hoje está na Biblioteca" até a prova; o recado do pai escrito no sábado (`notices` do painel).
5. Casa → primeira missão (toast com loot, conquista "Primeira picaretada", o Olheiro comenta) → Biblioteca (prova lida pelo pai no sábado) → Mina (1 contrato) → 18h Baú → Fechar o dia → o Sábio responde na segunda.

Aceite do P2: o E2E de sábado grava as 8 fotos da sequência sem modal sobreposto e sem linha de penalidade em `goldTransactions`.

## 6. P3: reset de lançamento, backup e clone (sexta; teste sábado; produção domingo)

Três scripts em `scripts/`, no mesmo padrão REST de `reset-test-account.cjs` (token do firebase-tools; nunca a chave de serviço no repositório). Botão no painel fica para a Etapa 3.

### `scripts/export-user.cjs --uid <uid>`
Grava `backups/<uid>-<YYYY-MM-DD>.json` com todos os docs do uid: `users`, `progress`, `village`, `englishBase`, `settings` (cópia), e as coleções filtradas por `userId` (ou `ownerId` nas `tasks`): `tasks`, `rewards`, `redemptions`, `goals`, `challenges`, `agenda`, `notices`, `dailyProgress`, `taskCompletions`, `goldTransactions`, `dailyQuizzes`, `quizBank`, `englishPlans`, `englishSessions`, `achievements`, `userAchievements`, `learning`, `health`, `progressSnapshots`, `xpAdjustments`, `punishments`, `clientErrors`. `backups/` entra no `.gitignore`. Imprime a contagem por coleção.

### `scripts/launch-reset.cjs --uid <uid> [--gold 100] [--launch 2026-09-20] [--confirm "LANCAR <nome da vila>"] [--apply]`
Sem `--apply` é **dry-run**: imprime uid, e-mail, nome da vila, o estado antes e o que faria. Com `--apply` exige `--confirm` igual a `LANCAR <nome da vila atual>` e **recusa rodar sem o arquivo de backup do dia** em `backups/`.

1. **Zera**: `progress` (`totalXP 0`, `level 1`, `streak 0`, `longestStreak 0`, `totalTasksCompleted 0`, `totalGoldSpent 0`, `totalGoldEarned = gold`, `availableGold = gold`, `quizRequired true`, `lastDailySummaryProcessedDay = launch - 1 dia`); `village` inteiro de `initialVillageDoc` mais `season 1`, `onboardedAt null`, `launchedOn = launch`, `name` e `characterName` preservados (o Onboarding deixa trocar); `englishBase` de `initialBaseDoc` **preservando `level` e `vocab`**; apaga `goals`, `challenges`, `redemptions` pendentes, `notices`, `learning/{uid}`, `dailySurpriseMissionStatus`, `userAchievements`, `clientErrors`, `punishments` ativas; `achievements` do uid com `isActive false`; `tasks` do uid em `status 'pending'` sem `lastCompletedDate`; `health` zerado; `birthdayEvents` de 2026 marcado concluído; `settings/dailyRules.activatedOn = launch`.
2. **Grava uma linha** em `goldTransactions`: `type 'adjustment'`, `reason 'admin_adjustment'`, descrição "Lançamento Miner Missions: presente de lançamento", `amount = gold`, `balanceBefore` = saldo antigo, `balanceAfter = gold`, `metadata.launch = true`.
3. **Preserva**: `tasks`, `rewards`, `agenda`, `englishBase.level` e `vocab`, `dailyQuizzes`, `quizBank`, `dailyProgress`, `taskCompletions`, `goldTransactions` antigas, `englishPlans`, `englishSessions`, `progressSnapshots`, `xpAdjustments`. Obras, gear, cosméticos e `owned` **não** são preservados.
4. **Histórico antigo**: `village.launchedOn` passa a ser lido por `Extrato`, `Balanca` e `income.referenceIncome` (`src/services/village/income.ts`) para ignorar transações anteriores ao lançamento. O `referenceIncome` antes de 7 dias de jogo usa o valor padrão da economia (`DEFAULT_ECONOMY`), não o histórico.
5. **Idempotente**: segunda rodada não muda nada (a linha de gold não repete: procurar `metadata.launch == true` na data).

### `scripts/clone-to-test.cjs --from <uid do Heitor> --to <uid de teste>`
Copia `users` (menos e-mail e uid), `progress`, `tasks`, `rewards`, `village`, `englishBase`, `agenda` e os últimos 30 `dailyQuizzes`, trocando `userId`/`ownerId` e os ids compostos (`<uid>_<date>`). Serve para o E2E de sábado rodar o reset e o dia 1 sobre os dados reais.

Aceite do P3: na conta de teste, no sábado: login mostra o Onboarding; gold 100 com a linha; Extrato zerado; conquistas inativas; nenhum dia fechado ao entrar; segunda rodada não muda nada; backup com todas as coleções; dry-run no uid do Heitor com o estado esperado impresso.

## 7. P4: painel do pai (sábado; só ajuste técnico, sem restilizar)

1. `VillageManager.tsx`, Economia: os 28 campos de `DEFAULT_ECONOMY` em grupos com rótulo em português e uma linha de ajuda por campo (fonte: comentários de `src/config/village.ts`). Módulos em português e só os que existem: `shop` "Loja da Vila", `effects` "Efeitos e sons", `bank` "Cofrinho", `interest` "Juros do Cofrinho", `logic` "Vagoneta da Mina", `tts` "Voz da Mina", `aiGeneration` "Prova e contratos por IA"; reservados escondidos; Saúde com rótulos.
2. `ParentPanel.tsx:75-76`: abas "Balança" e "Ajustes" com os nomes certos; `Balanca.tsx` lê `settings/economy`; "Reajustar prêmios" mostra antes e depois e pede confirmação.
3. `GoalsPanel.tsx`: status em português; "Alcançada" e "Cancelar" com confirmação mostrando o valor.
4. `RewardForm.tsx`: faixas com nome (Mimo, meio dia; Pequeno, 1 dia; Médio, 3 dias; Grande, 7 dias; Enorme, 20 dias, só Cofrinho; Temporada, 50 dias, só Cofrinho); descrição opcional; nível máximo `LEVEL_CAP`.
5. `TaskManager.tsx` e `TaskForm.tsx`: título "Missões"; gold e XP padrão vindos de `settings/economy`; campo "Missão extra"; proposta com "Aprovar" e "Aprovar como extra"; sem `console.log`; toast "Missão criada".
6. `PlacaManager.tsx`: sai o `NotificationSender` embutido e os modelos "Flash/velocista/herói"; entram modelos da Placa (treino, consulta, sem videogame hoje, visita, viagem, recado livre).
7. Missão surpresa: aba `surprise` escondida (componentes desmontados) até a Expedição da Etapa 3.
8. **Guia do dia 1** (`src/components/parent/LaunchGuide.tsx`, dentro do cartão Hoje enquanto `village.launchedOn` tem menos de 7 dias): checklist com link para a aba e estado calculado: missões por período (pelo menos 3 por dia); 3 a 5 prêmios com faixa; prova obrigatória (`quizRequired`); prova de amanhã gerada; Vagoneta ligada ou não (mostra o estado); recado de boas-vindas na Placa; sem folga nem férias ativas; reset feito (`launchedOn` existe e `availableGold == 100` ou há a linha `metadata.launch`).
9. `HojeCard.tsx:47`: "Meta batida" só para metas abertas; lista as que o pai precisa fechar.
10. **"Como ele vai"** (aba Prova, `DailyQuizManager.tsx`): acerto por categoria e por assunto em 7 dias, 30 dias e total (de `learning/{uid}.profile`); lista das últimas 30 perguntas erradas com data (do `quizBank`); perguntas repetidas (mesmo `hash`) apontadas com as datas.
11. `docs/MANUAL_DO_PAI.md` é do líder (não tocar).

Aceite do P4: fotos das abas; nenhum id cru na tela; missão nova com gold da economia e caixa "extra"; Placa sem formulário de notificação; Guia do dia 1 verde no sábado à noite.

## 8. P5: conteúdo vivo v1 (anti-repetição) e Memória da Prova

Motivo: o Heitor vai abrir o jogo todo dia. Hoje a prova roda um ciclo fechado de 45 temas, a lista "não repita" manda as perguntas mais **antigas** (`avoid.slice(-60)` numa lista ordenada da mais recente para a mais antiga), os NPCs têm 3 a 12 falas com recência quebrada e a dica do turno degenera em 4 dias. O que o líder entrega pronto (bancos) está na seção 8.1; o que o Cursor programa está em 8.2 a 8.6.

### 8.1 O que o líder entrega (não reescrever; só consumir)

- `src/config/quizCurriculum.ts`: cerca de 120 temas em 20 categorias, cada tema `{ id, category, title, seed, depth: 1|2|3, angles: [string, string, string], interest? }`. A função `pickThemeForDate` antiga continua no arquivo até o motor da 8.2 substituí-la.
- `src/data/dialogue/{sabio,comerciante,ferreiro,olheiro}.ts`: 71 entradas por NPC nas 5 camadas (primeira vez, estado do dia, progresso, amizade, curiosidade), com os predicados em `src/data/dialogue/helpers.ts`. As chaves de `firstTime` usadas: `build`, `craft`, `quiz8`, `chest`, `buy`, `goal`, `lv10`, `season` (o `VillageHome` monta o `Set` a partir de `village.stats` e `claimed`; chave sem fonte fica sem fala, não quebra).
- `src/data/habitLines.ts`: 30 dicas por NPC. `src/data/villageLines.ts`: `SAGE_REPLIES` com 90 respostas.
- `public/data/quizData.json`: 200 perguntas de reserva com `category` e `subject`.
- Listas para o pai vetar em `docs/conteudo/`.

### 8.2 Motor de rotação (`src/services/quiz/rotation.ts`, puro, com testes em `src/services/quiz/__tests__/rotation.test.ts`)

```ts
export interface ThemeHistoryEntry { date: string; themeId: string; category: string; angle?: number }
export interface RotationProfile { weak?: string[]; strong?: string[]; interests?: string[] }
export interface ThemePick { theme: QuizThemeSeed; angle: string; angleIndex: 0 | 1 | 2; depth: 1 | 2 | 3; reason: string }
export function pickTheme(date: string, history: ThemeHistoryEntry[], profile?: RotationProfile, themes = QUIZ_THEMES): ThemePick
```

Regras, nesta ordem:
1. Determinístico: mesma data, mesmo histórico, mesma resposta (semente = hash da data, como hoje).
2. A categoria de **ontem** (entrada mais recente com data anterior) está fora.
3. Tema usado nos últimos **90 dias** está fora. Se todos os temas elegíveis estiverem usados (esgotado), escolhe o **menos recente** e devolve `depth = min(3, depth do tema + vezes já usado)` e o ângulo seguinte ao último usado.
4. Prioridade entre os elegíveis: (a) categoria **nunca vista** no histórico; (b) categoria em `profile.weak`, no máximo 2 vezes por semana ISO; (c) tema com `interest` em `profile.interests`, no máximo 1 vez por semana ISO; (d) o resto por rodízio: categoria **menos vista nos últimos 30 dias** primeiro. Dentro do grupo escolhido, sorteio pela semente.
5. `angleIndex` = número de usos anteriores do tema módulo 3.
6. `reason` é exatamente uma destas strings: `'categoria nunca vista'`, `'categoria fraca'`, `'interesse'`, `'rodízio'`, `'revisita (esgotado)'`. O teto semanal da categoria fraca (2) e do interesse (1) vale também para o rodízio: se a categoria já bateu o teto na semana ISO, o rodízio não a escolhe.
7. O harness `scripts/run-english-tests.mjs` ganha a pasta `{ name: 'quiz', dir: src/services/quiz/__tests__ }`; o teste `rotation.test.ts` já existe (escrito pelo líder): implementar até ele passar.

Testes: 365 dias simulados com o currículo real: nunca duas categorias iguais em dias seguidos; nenhum tema repetido em 90 dias enquanto houver tema livre; todas as categorias aparecem nos primeiros 30 dias; mesma data, mesma escolha; com `weak: ['matematica']` a categoria aparece pelo menos 1 vez por semana e no máximo 2; esgotamento sobe `depth`.

`dailyQuizService.buildAndSave` passa a chamar `pickTheme` com o histórico dos últimos 90 dias (`getRecentDailyQuizzes(userId, today, 90)` mapeado para `ThemeHistoryEntry`) e o perfil (8.4); grava `theme.angle` e `theme.depth` no doc da prova.

### 8.3 Prompt da prova (`src/services/aiDailyQuiz.ts`)

1. Corrigir a lista "não repita": ordenar as perguntas do `quizBank` da mais recente para a mais antiga e mandar as **60 mais recentes** (`slice(0, 60)`), não as mais antigas.
2. O prompt recebe `angle`, `depth` ("profundidade 1: primeiro contato; 2: aprofunde; 3: conecte com outra área") e o **perfil de aprendizado** (8.4): categorias fortes, fracas e os assuntos dos últimos erros, com a instrução "aprofunde onde ele acerta; volte por outro ângulo onde ele erra".
3. Pede também `"curiosity"`: uma curiosidade de 1 ou 2 frases sobre o tema, mostrada na tela depois da ideia do dia (`DailyQuizTheme.curiosity?: string`; `DailyQuiz.tsx` mostra num cartão pequeno).
4. Varia os enunciados dentro da múltipla escolha: o prompt pede que, das perguntas de conhecimento, pelo menos duas usem formatos diferentes ("estime um número", "o que aconteceria se", "ache o erro na frase", "o que vem depois", "qual frase é verdadeira"). Formatos com tela nova (ordenar, completar) ficam para a Etapa 3.
5. As perguntas de conhecimento rodam a ordem das áreas pelo dia da semana (`weekdayOf(date)` gira a lista de áreas), para a prova não ter sempre matemática na pergunta 4.
6. Quando houver **revisita** (8.5), a última pergunta é `kind: 'review'`, reformulação por outro ângulo de uma pergunta errada; o prompt recebe a pergunta original, a resposta certa e a instrução "mesma ideia, outro enunciado, outras alternativas".

### 8.4 Memória da Prova (pedido do pai em 17/09; o núcleo entra até domingo)

**Coleção `quizBank/{uid}_{date}_{n}`**, um doc por pergunta feita, gravado em `completeDailyQuiz` **no mesmo `writeBatch`** que grava o doc do dia:

```ts
interface QuizBankItem {
  userId: string; familyId: 'heitor'; date: string; n: number;
  themeId: string; category: string; subject: string; kind: 'lesson' | 'knowledge' | 'review';
  question: string; options: string[]; answer: string; explanation: string;
  chosen: string; correct: boolean; hash: string;
  reviewOf?: string;          // id do quizBank original, quando kind === 'review'
  reviewedOk?: boolean; reviewedOn?: string;  // marcados no original quando a revisita acerta
  createdAt: Timestamp;
}
```

`hash` = `normalizeQuestion(question)`: minúsculas, sem acentos (NFD e remoção dos diacríticos), sem pontuação, espaços colapsados. Função pura em `src/services/quiz/hash.ts` com teste (mesma pergunta com acento e sem, com "?" e sem, dá o mesmo hash).

**Deduplicação em duas camadas** (`src/services/quiz/dedupe.ts`, puro, com teste): (1) `buildAndSave` manda à IA os enunciados das 60 perguntas mais recentes do `quizBank`; (2) `sanitizeQuestions` (ou um passo depois dele) descarta pergunta cujo `hash` já existe no `quizBank` dos últimos 180 dias **ou** que é "quase igual" (mesmo `subject` e 70% ou mais das palavras com 4 letras ou mais em comum). Quando descartar, a prova segue com as que sobraram se forem pelo menos 5; abaixo disso completa com o banco offline respeitando o mesmo filtro.

**Perfil de aprendizado** em `learning/{uid}.profile` (calculado em `computeWeeklyLearning` e ao fechar a prova, função pura `buildProfile(items: QuizBankItem[], today)` em `src/services/quiz/profile.ts` com teste):

```ts
interface LearningProfile {
  updatedAt: string;
  byCategory: Record<string, { d7: [ok, n]; d30: [ok, n]; all: [ok, n] }>;
  bySubject: Record<string, { d30: [ok, n]; all: [ok, n] }>;  // até 40 assuntos, os mais frequentes
  strong: string[];  // 3 categorias com melhor acerto (mínimo 4 perguntas)
  weak: string[];    // 3 categorias com pior acerto (mínimo 4 perguntas)
  lastWrong: { date: string; id: string; category: string; subject: string; question: string }[]; // 10 últimas
  streakByCategory: Record<string, number>;  // acertos seguidos por categoria
  assessment?: unknown;  // reservado para a Expedição do Explorador (Etapa 3)
}
```

É o que entra no prompt (8.3), no `RotationProfile` (8.2, `weak` e `strong`), no Mapa de habilidades da Torre e na aba "Como ele vai" (P4.10).

**Revisita**: em `buildAndSave`, antes de gerar, buscar no `quizBank` uma pergunta com `correct == false`, `reviewedOk != true` e data entre `today - 10` e `today - 3`; a mais antiga vira a pergunta 8 (`kind: 'review'`, `reviewOf`). Ao concluir a prova, se a revisita acertou, o batch marca `reviewedOk: true, reviewedOn: date` no doc original. É a semente da Estante de erros (Etapa 3).

**Leituras** (`src/services/quizBankService.ts`): `listQuizBank(uid, { sinceDate, limit })` (query `userId ==` e `date >=`, ordenada por `date desc`; índice composto `userId asc, date desc` em `firestore.indexes.json`), `pendingReview(uid, today)`, `writeQuizBank(batch, items)`.

**Retroativo**: `scripts/backfill-quizbank.cjs --uid <uid>` cria os docs do `quizBank` a partir dos `dailyQuizzes` antigos que têm `questions[]` e `answers[]` (`chosen = answers[i]`, `correct = answers[i] === questions[i].answer`), idempotente pelo id. O pai roda antes do reset no domingo, para a memória não começar do zero.

Fica para a Etapa 3: Estante de erros com bônus, análise por dificuldade, sugestão automática de temas ao pai, "enriquecer a IA" com a reflexão dele, Expedição do Explorador.

### 8.5 Falas com recência de verdade

`village.npcs.<id>.seenAt: Record<string, string>` (id da fala → data em que foi vista). `talkToNpc` grava `seenAt[id] = today` e mantém `seen` (o `once`); o corte de 80 ids em `seen` (`villageService.ts:1182`) sobe para 400, porque agora cada NPC tem mais de 70 falas e um `once` antigo não pode voltar. `pickDialogue` recebe como `recent14` os ids com `seenAt` nos **últimos 14 dias de calendário**, não os últimos 14 itens. Teste com 30 dias simulados: nenhuma fala repete em 14 dias enquanto houver fala elegível. Em `VillageHome.tsx:320` o `firstTime` hoje só tem o id do NPC na primeira conversa; passa a ser montado assim (os bancos novos usam estas chaves e o `once` impede repetição): `build` se `stats.buildsDone >= 1`, `craft` se `stats.craftsDone >= 1`, `quiz8` se `stats.quizPerfect >= 1`, `chest` se `stats.chestsOpened >= 1`, `buy` se `village.owned.length > 0`, `goal` se `stats.deposits >= 1`, `lv10` se o nível for 10 ou mais, `season` se `stars.length >= 1`, mais o id do NPC como hoje. `notices.pickLine` e `habitTipForNow` escolhem por semente da data entre as **não vistas nos últimos 14 dias** (mesma regra), com `village.noticesSeenAt`.

### 8.6 Contratos e reserva

`public/data/quizData.json` (200 perguntas) já vem com `category` e `subject`; `loadOfflineQuestions` respeita `avoid` e o filtro de `hash` da 8.4, e devolve `category` e `subject` no `DailyQuizQuestion` (hoje devolve `subject: 'geral'`). `src/config/englishLevels.ts`: nada a fazer nesta etapa (os 24 temas por nível ficam para a Etapa 3).

Aceite do P5: testes de `rotation`, `hash`, `dedupe`, `profile` e `dialogue` verdes; na conta de teste: concluir a prova grava 8 docs no `quizBank`; a prova de amanhã não contém pergunta com `hash` igual a nenhuma dos últimos 180 dias; `learning/{uid}.profile` existe com `strong`, `weak` e `lastWrong`; com uma pergunta errada há 4 dias, a prova de hoje traz uma `review`; falar com o Sábio 15 dias seguidos (simulado) não repete fala.

## 9. Regras do Firestore (literal; publicar antes do teste no navegador)

```
match /quizBank/{id} {
  allow get, list: if signedIn() && (isAdmin() || resource == null || resource.data.userId == request.auth.uid);
  allow create: if signedIn() && (isAdmin() || request.resource.data.userId == request.auth.uid)
    && request.resource.data.keys().hasAll(['userId', 'date', 'question', 'hash', 'correct', 'category']);
  allow update: if signedIn() && (isAdmin() || (resource.data.userId == request.auth.uid
    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['reviewedOk', 'reviewedOn'])));
  allow delete: if isAdmin();
}
```

Em `village/{uid}`, na regra de update da criança, acrescentar à lista de campos proibidos: `season`, `stars`, `launchedOn` (`!request.resource.data.diff(resource.data).affectedKeys().hasAny(['season', 'stars', 'launchedOn'])`). `learning/{uid}` continua como está. Índice novo em `firestore.indexes.json`: `quizBank` (`userId` asc, `date` desc). Publicar: `npx firebase-tools deploy --only firestore:rules,firestore:indexes --project app-heitor`.

## 10. Verificação, roteiro E2E e go/no-go

Comandos (fim de cada pacote, sábado à noite e domingo antes do deploy):

```
npx tsc --noEmit -p tsconfig.app.json
npx eslint src --max-warnings 7
npm run test:english
npx vite build && ls dist/assets | grep -i phaser    # tem que sair vazio
node scripts/econ-sim.mjs                             # sem alerta novo
node scripts/launch-reset.cjs --uid <uid do Heitor> --launch 2026-09-20   # dry-run
```

Roteiro E2E (conta de teste, sábado, líder): login → Onboarding (6 telas) → Vila com a Placa do dia 1 → Casa, primeira missão (toast, conquista, Olheiro) → Biblioteca, prova até a reflexão (`quizBank` com 8 docs) → Mina, 1 contrato (Vagoneta se ligada) → `?h=18` Baú → Fechar o dia → virada (`?d=2026-09-21&h=0`) → resumo de ontem sem penalidade → Torre (Conquistas com "Novo", cadeados) → Cofrinho (depósito) → painel: cartão Hoje, Guia do dia 1, Balança, Vila, Prova "Como ele vai". Mais: IA desligada (`aiGeneration=false`, `tts=false`) com a prova offline e os contratos da reserva; 1280x720 em tela cheia e 390 px; dois aparelhos (missão feita num aparece no outro; prova feita num abre o cadeado no outro).

Go/no-go de sábado às 21h (15 itens; vermelho nos 8 primeiros é no-go): tsc 0; eslint 0 erros; testes verdes; build sem `phaser`; regras publicadas; função `openai` respondeu (prova de domingo gerada por IA); E2E do dia 1 passou; virada passou; IA desligada passou; 1280x720 e 390 sem quebra; dois aparelhos ok; dry-run do reset no uid do Heitor com o estado esperado; backup gravado; prova de domingo lida pelo pai; Guia do dia 1 verde.

Se sexta à noite não houver checks verdes: sábado de manhã é o último bloco de código; P4 e P5.5 viram Etapa 3 e o sábado vai para P1, P2, P3 e o núcleo do P5 (8.3 e 8.4). Se às 18h de sábado ainda houver vermelho em P1.1 a P1.4: lançar com `modules.logic=false`, `bank=false` e `interest=false` (Cofrinho na semana 2), `shop` ligada; `dailyRules.enabled=false` na primeira semana se a ruína não seguir `skipPenalty`, com a Placa avisando quando começa a valer.

## 11. Ordem de construção e o que não fazer

Ordem: P0 → P1 (1 a 13, nessa ordem) → P3 (os três scripts) → P5 núcleo (8.4 gravação e leituras, 8.3, 8.2) → P2 → P4 → P5 restante (8.5, 8.6).

Não fazer nesta etapa: restilizar o painel; mexer na Vagoneta fora de bug do E2E; importar `RedstoneBench` ou `phaser`; criar tela nova de formato de pergunta; mexer na arte da cena; animação de andar com chapéu ou capa; Campinho; Arena como cena; Cofre nível 3; qualquer item da lista "fica para a Etapa 3" do roadmap.

## 12. Entrou nesta etapa (registro obrigatório) e a Vagoneta da Mina

| Arquivo ou coleção | Pacote | Recebe de | Entrega para | Ficha |
|---|---|---|---|---|
| `src/services/quiz/rotation.ts` (+ teste) | P5 | currículo, histórico da prova, perfil | `dailyQuizService` | prova do dia (Etapa 2, §22) |
| `src/services/quiz/hash.ts`, `dedupe.ts`, `profile.ts` (+ testes) | P5 | `quizBank` | prompt da prova, Torre, painel | idem |
| `src/services/quizBankService.ts`, coleção `quizBank` | P5 | conclusão da prova | rotação, revisita, perfil, painel, Expedição (Etapa 3) | idem |
| `src/services/village/statSources.ts` (+ teste) | P1 | eventos do jogo | conquistas, pedidos | não ensina |
| `src/components/parent/LaunchGuide.tsx` | P4 | settings, village, tasks, rewards, notices | pai | não ensina |
| `scripts/export-user.cjs`, `launch-reset.cjs`, `clone-to-test.cjs`, `backfill-quizbank.cjs` | P3, P5 | Firestore | operação do domingo | não ensina |
| `src/game/README.md` | P0 | `MUNDO.md` §5 | Etapa 3 | não ensina |
| `src/components/hero/village/itemGlyphs.ts` | P0 | `ItemGlyph.tsx` | glifos do look | não ensina |
| `src/data/dialogue/helpers.ts` e os 4 bancos de falas; `docs/conteudo/*` | P5 (líder) | contexto do dia (`DialogueCtx`) | balões dos NPCs | diálogos e amizade (Etapa 2, §22) |
| Vagoneta da Mina (`cart.ts`, `CartBench.tsx`, `redstoneService.ts`; entrou sem doc no Lote 2) | regularizada aqui | Recado do dia feito; nível da Mina; maestria | redstone para a Fornalha; XP; amizade com o Ferreiro; stats `redstoneDone`, `redstonePerfect`, `redstoneStages`; 7 conquistas | abaixo |

### Vagoneta da Mina: o que é e ficha pedagógica

Uma sessão por dia na Mina, depois do Recado do dia: 3 vagonetas para carregar. Cada uma pede escolher caixotes com números para bater um alvo (soma exata; depois produto, divisão e regras lógicas como "só ímpares" ou "no máximo 7 caixotes"), de cabeça, em 26 segundos por tentativa, 2 tentativas. A faixa de dificuldade é o menor entre o nível da Mina (`cartCap`) e o que ele já mostrou (`cartSkill`). Paga redstone e XP conforme `sessionPay`; **nunca gold**. Módulo `logic`; rótulo no painel "Vagoneta da Mina". Os stats continuam com o nome `redstone*` (herança da Oficina de Redstone); não renomear nesta semana.

1. **O que ensina**: cálculo mental (soma, multiplicação, divisão exata), estimativa antes de conferir, leitura de regra (paridade, limite de itens) e verificação antes de enviar.
2. **Por que cabe aos 10 anos**: BNCC 5º ano, EF05MA07 e EF05MA08 (problemas de adição, subtração, multiplicação e divisão com naturais usando estimativa, cálculo mental e algoritmos); tempo curto porque a meta é fluência, não algoritmo.
3. **Como mede**: `englishSessions` com `game: 'redstone'`, `correct` (vagonetas carregadas de 3) e `category` win/fail; stats `redstoneDone`, `redstonePerfect`, `redstoneStages`.
4. **Como adapta**: faixa do dia = min(nível da Mina, maestria); sobe só quando ele mostra domínio (5 dias com acerto para a faixa 2; 10 dias e 2 perfeitos para a 3).
5. **Feedback**: ao errar, `whyOf` diz o que faltou ou sobrou e `coachOf` dá a dica do método; ao acertar, o Ferreiro comenta.
6. **O pai vê**: módulo ligado ou não; sessões na aba Relatório; conquistas na Torre.
7. **IA**: nenhuma; gerador determinístico por data (`sessionFor`).
8. **Economia**: redstone (material) e XP; 1 sessão por dia (`claimed['redstone:<date>']`); exige o Recado do dia.

### Conquistas da Vagoneta (7; acrescentar a `GAME_ACHIEVEMENTS` e a `docs/VILA_CONQUISTAS.md`; todas com fonte em `statSources.ts`)

| id | Nome | Condição | Prêmio |
|---|---|---|---|
| `cart_first` | Primeira carga | `redstoneDone >= 1` | 10 XP |
| `cart_perfect` | Três de três | `redstonePerfect >= 1` | 15 XP |
| `cart_5` | Vagoneteiro | `redstoneDone >= 5` | 20 XP |
| `cart_stages_30` | Trilho longo | `redstoneStages >= 30` | 25 XP |
| `cart_perfect_5` | Carga exata | `redstonePerfect >= 5` | 30 XP, 1 esmeralda |
| `cart_20` | Mestre da vagoneta | `redstoneDone >= 20` | 40 XP |
| `cart_perfect_15` | Sem tombar | `redstonePerfect >= 15` | 50 XP, 1 diamante |

Nunca gold (invariante da economia v2). Os raros seguem o teto e o registro de `grantRare`.

## 13. Prompt para colar no Cursor

```
Leia docs/etapas/ETAPA_2_LANCAMENTO.md inteiro antes de qualquer coisa. É o único documento que vale até domingo 20/09.
Estamos na branch etapa-2. Execute os pacotes NA ORDEM da seção 11: P0 (seção 3) hoje; depois P1 (seção 4, itens 1 a 13 na ordem), P3 (seção 6), P5 núcleo (seções 8.4, 8.3, 8.2), P2 (seção 5), P4 (seção 7), P5 restante (8.5, 8.6).
Ao terminar cada pacote: rode npx tsc --noEmit -p tsconfig.app.json, npx eslint src --max-warnings 7, npm run test:english e npx vite build (sem chunk phaser); escreva a seção do pacote em docs/etapas/RELATORIO_ETAPA_2_LANCAMENTO.md (o que mudou, arquivos, como verificou, o que ficou de fora e por quê) e PARE para o pai commitar. Não comece o pacote seguinte sem o commit.
Regras: um pacote por vez; nenhum arquivo fora do pacote em andamento; a Vagoneta (cart.ts, CartBench.tsx) está congelada; nada novo sem linha na seção 12; não restilizar o painel; não importar RedstoneBench nem phaser; publicar as regras do Firestore quando a seção 9 mandar e registrar a hora no relatório.
Se algo do documento não bater com o código, não improvise: escreva a dúvida no relatório e siga para o próximo item do pacote.
```
