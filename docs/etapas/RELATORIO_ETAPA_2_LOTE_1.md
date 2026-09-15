# Relatório — Etapa 2 Lote 1 (revisão da seção 7)

Branch `etapa-2`. WIP anterior: `f02ba5c`. Este relatório cobre a execução da `REVISAO_ETAPA_2_LOTE_1.md` seção 7. **Lote 2 não começou.**

Data: 15/09/2026.

## Decisões

1. **A4, A6, A7 desfeitos; A5 ficou.** Prova volta a ser portão (`quizLocked`) e abre com `onboardedAt`. Clique no lote abre sempre o `BuildingCard`; atalho só por NPC e hotbar. Juros únicos de `settings/economy` (5%, teto 20). Cofre 1 = 1 meta, 2 = 2 metas + bônus, 3 = faixa temporada. Mercado e Agenda continuam construções: custo n1 igual ao da Fornalha, sem pré-requisito, hotbar Mercado de volta, sprites `buildings/mercado-1.png` e `buildings/agenda-1.png`.
2. **Exceção A6 × VILA_MAPA (M33):** o lote do Armazém (`build:bau`) com nível ≥ 1 abre a Mochila, porque o mapa pede isso; o cartão da obra continua no nível 0 e pelo atalho Obras da Ferraria.
3. **`modules.bank` padrão `true` (A10).** Extrato e Paciência sempre abrem; o Cofrinho some se o módulo estiver desligado ou o Cofre não existir.
4. **Lanterna (A9):** `canCraft` devolve `soon` até existir efeito. Capacete continua forjável (já absorve 1 perda).
5. **Punição (M24):** a Vila permanece visível, com Mercado/Baú/Loja travados; prova e Mina abertas. Tarefas extras ficam num botão “Tarefas da punição”, não no lugar da Vila.
6. **R7:** Mercado e RewardForm leem `referenceIncome` dos 7 dias. Sem movimento (conta resetada) cai na reserva 45 — o aceite mostrou 45 por isso.
7. **Reversão de dia fechado (M15):** não implementada. Bloqueante do Lote 2.
8. **ChatFlashGPT:** continua desligado e ainda lê chave no cliente. Não migrado.
9. **Item temporada no simulador:** o perfil misto alerta 50 D inalcançável. Constantes não mexidas.
10. **`learning/{uid}`:** Lote 2. Quem implementar precisa de subcoleção por semana.
11. **Aceite:** `reset-test-account.cjs` não reconstroi obras; para as fotos o script `scripts/patch-test-etapa2.cjs` ligou Fornalha, Armazém, Cofre 2, Mercado e Agenda. Reset de novo no fim.
12. **Compromissos vazios** na conta de teste (Agenda antiga) não entram mais na Linha do dia.

## Saídas dos comandos

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | ok (exit 0) |
| `npx eslint src --max-warnings 6` | 6 avisos pré-existentes em `src/icons/index.tsx` |
| `npm run test:english` | 11 arquivos, todos passaram (inclui `village/etapa2.test.ts` 14 casos e `utils/clock.test.ts`) |
| `npx vite build` | ok; bundle sem `sk-` (`dist/assets/App-BdiZJLGm.js`) |
| `node scripts/econ-sim.mjs` | ver abaixo |
| `npx firebase-tools deploy --only firestore:rules,firestore:indexes,functions --project app-heitor` | **Deploy complete.** `openai` e `agendaReminders` atualizados em `southamerica-east1`. |
| TTS real (conta de teste, `kind: tts`, “Hello miner.”) | **HTTP 200**, URL `https://firebasestorage.googleapis.com/v0/b/app-heitor.firebasestorage.app/o/eng...` (token de download, M8) |

### Simulador (91 dias)

```
== típico ==
ganho 2912  gasto 728  guardado 507  saldo 1840  xp 6916
materiais madeira 91 pedra 91 ferro 0
nível por semana: S1:Nv3 S2:Nv5 S3:Nv8 S4:Nv10 S5:Nv13 S6:Nv15 S7:Nv17 S8:Nv20 S9:Nv22 S10:Nv25 S11:Nv27 S12:Nv30 S13:Nv32

== misto ==
ganho 2093  gasto 1365  guardado 122  saldo 657  xp 4914
materiais madeira 91 pedra 91 ferro 0
nível por semana: S1:Nv2 … S13:Nv23
ALERTA item temporada (50 D) inalcançável em 13 semanas

== perfeito ==
ganho 5086  gasto 0  guardado 1498  saldo 3836  xp 8918
materiais madeira 91 pedra 91 ferro 91
nível por semana: S1:Nv4 … S13:Nv40
```

## Fotos (`docs/exemplos/telas/etapa2/`)

Conta `teste@flash.com`, Vite `http://localhost:5174`, `?h=14` e `?h=19`. Script `docs/exemplos/telas/etapa2/_shot_aceite.mjs`. Reset antes e depois.

| Arquivo | O que mostra |
|---|---|
| `01-vila.png` | Cena, relógio 14:00, hotbar com Mercado, Placa “Hoje você tem”, Cofre/Agenda/Barraca no mapa |
| `02-casa.png` / `03-casa-linha.png` | Casa com Linha do dia (missões + Fechar o dia 21:00) |
| `04-mercado.png` | Mercado com prêmios embutidos; R7 reserva 45 (sem ganhos na semana) |
| `05-agenda.png` | Formulário com lembrete, repetir, nota, Foco 15/25, abas Hoje/Semana/Mês |
| `06-banco.png` | Chip de gold abre Extrato (sem depender do Cofrinho) |
| `07-meta-criada.png` / `08-deposito.png` | Meta “Pizza”, depósito 20, saldo 100→80, toast “Guardou 20 gold” / “Meta criada” |
| `09-extrato.png` | Semana guardou 20; poupança 0% porque o gold semeado não é ganho (não explode para 400%) |
| `10-vila-noite.png` | Cena com `?h=19` |

Aceite da seção 10, o que foi conferido de verdade: (1) depósito 20 com saldo caindo; (8) Mercado/Comerciante visíveis. O restante (juros forçando `lastInterestWeek`, desafio 20, Baú das tochas, capacete, prova 6/8 e 8/8, terceira venda, punição, missão recuperada, conserto, desligar `aiGeneration`) **não teve foto nesta passagem** — o roteiro automático cobriu Vila, Casa, Mercado, Agenda, Banco e o depósito.

## Fora do escopo (já estava; só registrado)

- Tela de abertura “Abrindo a vila”: `index.html`, `src/main.tsx`, `src/App.tsx`, `src/styles/boot.css`, `src/components/common/bootOverlay.ts`, `useDismissBoot.tsx`, `LoadingSpinner.tsx`, `ReadyBoot` no painel e no `HeroPanel`, trechos de `miner.css`.
- `src/components/hero/english/base/BaseMap.tsx` (mapa da Mina).
- `DailyChecklist` com `mc-inv` no lugar de `mc-panel`.
- Lanterna ainda sem efeito em contratos/prova de amanhã (A9 trava a forja até isso existir).

## Conferência de conexões (recebe de / entrega para)

| Fluxo | Recebe de | Entrega para |
|---|---|---|
| Missão paga | `DataContext.completeTask` `src/contexts/DataContext.tsx:304` | `FirestoreService.completeTaskWithRewards`; `bumpChallenge(..., 'tasks_count')` `:376`; streak `:382`; `repairLot` automático `:436` |
| Prova | `HeroPanel` `DailyQuiz` `src/components/hero/HeroPanel.tsx:114` com `quizLocked` `:86`; porta na cena `VillageHome.tsx:283` `gated={quizLocked}` | `payQuizRewards` `DailyQuiz.tsx:150` → `firestoreService.ts:1394` chave `quiz:<date>`; `bumpChallenge` quiz em `dailyQuizService.ts:156` |
| Mina / contrato | `englishBaseService.completeContract` `:504` | `bumpChallenge(..., 'english_contracts')` `:593`; TTS pela função `englishTts.ts:57` |
| Fechar o dia | `dailyRulesService.ts` | capacete, tochas, `punished`, `bumpChallenge` `full_days` `:322`, rachaduras |
| Conserto | `repairLot` `villageService.ts:813`; também `DataContext.tsx:436` quando o dia fica completo | linha `repair`, chave `repair:<date>` |
| Missão recuperada | `firestoreService` caminho `late`; `DailyChecklist` lista por completion de ontem | linha `late_task`; não sobrescreve `lastCompletedDate` de hoje |
| Baú do Dia | `openDailyChest` `villageService.ts:410` (`dueCompletionsCount`) | `chest`, `newItems`, teto `caps.ts` |
| Baú das tochas | `openStreakChest` `villageService.ts:705`; hotspot `VillageScene.tsx:648` | `streak_chest`, diamante |
| Comerciante | `sellMaterials` `villageService.ts:756` | recusa se teto 0; `merchant_sale` |
| Cofrinho | `goalsService` depósito/juros; `bank.ts` `weeklyInterest` `:37` | `goal_deposit` tipo `saved`; `goal_interest` amount 0 + metadata; `applyWeeklyInterest` no boot `DataContext.tsx:1273` |
| Tetos | `caps.gameGoldRoom` `src/services/village/caps.ts:20` | chest, streak, challenge, interest (metadata), merchant, repair |
| Agenda → Placa | `VillageHome.tsx:198-203` `todayAgenda` / `tomorrowAgenda` | bloco “Hoje você tem” / “Amanhã” |
| Agenda → cabeçalho | `nextEvents` `VillageHome.tsx:200` | `HeroHeader` `nextEventLabel` `:263` |
| Agenda → alarme | intervalo 60 s `VillageHome.tsx:149` `reminderDue` | som checkpoint, toast Ok, `agendaFlash`, fala do Olheiro |
| Agenda → Casa | `dayTimeline` `agenda.ts:55` usado em `Casa.tsx:51` | Linha do dia |
| Semana organizada | `weeklyOrganizedBonus` `agendaService.ts:181` chamado `VillageHome.tsx:134` | +1 madeira, chave `agenda:week:<semana>` |
| Relógio | `ClockContext.tsx:103` dispara `dayChanged` | `DataContext.tsx:1492` e `VillageHome.tsx:80` |
| Chip gold | `HeroHeader.tsx:140` | `VillageHome` distrito `extrato` (Banco na aba Extrato) |
| Chip nível | `HeroHeader` | Torre |
| Avatar | `HeroHeader` | Mochila |

Não existem ainda (Lote 2 ou depois): efeito da Lanterna em contratos/prova; reversão de dia fechado; conquista do jogo `achievement` em transação; ChatFlashGPT pela função; vida dos NPCs (seção 14).

## O que a revisão pediu e ficou feito

- A1–A3, A11, A12, A9, A10; A8 seção 13 (timeline, Placa, chip, alarme, Foco/`FlashTimer`, formulário, Mês/`CalendarModal`, plano + Não, editar/apagar, bônus semanal).
- M1–M18 e M29–M38 (dinheiro, regras, função TTS `getDownloadURL`, tetos, Balança 7 dias, R7).
- M19–M28 e baixos: confirmação da Loja, Mochila equipa/tira, Extrato com linhas, punição sem sumir a Vila, conserto ao concluir, aba Agenda no painel, teclas 1–5, “Vender 10” desligado sem material, `VILA_API.md` atualizado.
- M26: botão “Propor desafio” fora da tela da criança.

## Pendências honestas

- Aceite 2–7 e 9–12 da seção 10 sem foto (juros forçados, desafio, Baú/esmeralda/tochas, capacete, prova, terceira venda, punição, recuperar, conserto, desligar IA).
- Compromissos antigos da conta de teste (títulos vazios) ainda aparecem na Agenda até o reset/apagar.
- `FlashTimer` e `CalendarModal` continuam arquivos próprios, agora só usados pela Agenda (não órfãos).
- Node 20 das functions está deprecado (aviso do Firebase no deploy).
