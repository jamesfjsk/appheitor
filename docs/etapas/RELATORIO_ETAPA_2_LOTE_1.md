# Relatório — Etapa 2 Lote 1 (seções 10–12)

Branch `etapa-2`. WIP: `f02ba5c`. Revisão 1: `64532f6`. Este texto cobre a rodada das seções 10, 11 e 12 de `REVISAO_ETAPA_2_LOTE_1.md`. **Lote 2 não começou.**

Data: 15/09/2026.

## Decisões (mantidas)

1. A4/A6/A7 da primeira revisão: prova é portão; lote abre o cartão; juros únicos de `settings/economy`. A5: Mercado e Agenda continuam construções.
2. Exceção A6 × mapa: `build:bau` com nível ≥ 1 abre a Mochila.
3. `modules.bank` padrão `true`. Lanterna continua `soon`.
4. Punição: Vila visível; Mercado/Baú/Loja fechados; prova e Mina abertas.
5. Reversão de dia fechado (M15): Lote 2. ChatFlashGPT: Lote 2. `learning/{uid}`: Lote 2.
6. Simulador: perfil misto ainda alerta temporada 50 D. Constantes não mexidas.

## O que esta rodada fechou

Ordem pedida: D1, D1b/A4, R1, D2, D4/R2, depois D3, D5, D7, D8, D9 e parciais da seção 10.

| # | Correção |
|---|---|
| D1 | `completeTask` chama `repairLot(uid, ontem)`. Toast `Lote consertado: +N gold`. Linha `goldTransactions` `source: repair`, `metadata.date` = ontem. |
| D1b/A4 | `subscribeToUserProgress` mapeia `quizRequired` e `quizQuestionCount`. `openDistrict`, teclas, hotbar, header, cartão e clique da cena passam pelo portão. Cadeado da Mina na cena (`gated`). “Prova do dia” no cartão da Mesa em qualquer nível. |
| R1 | Se a completion determinística existe revertida, grava doc novo com campo `key`. Regra: criança pode `update` só com `resource.data.reverted == true`. |
| D2 | Mesma trava em teclas, lotes, hotbar, avatar, Baú do dia, cartão e atalhos internos. Listener de `punishmentTaskCompletions` filtra `punishmentId` + `userId`; índice correspondente publicado. |
| D4/R2 | Ao tocar, grava `remindedFor` + `remindedAt`. `reminderDue` falso com `doneAt`. Um `AudioContext`. Efeito não depende de `agendaFlash`. |
| D3 | Recuperar some da lista (`yesterdayDone`); `completeLateTask` com toast. |
| D5 | `seeItems` só no fechar/desmontar da Mochila. |
| D7 | Tela de prêmios usa `dueTasksOn` e `redeemMinTasks`; `browseOnly` esconde Pedir. |
| D8 | Dock do Baú: minutos restantes `chestOpenHour*60 - (hora*60+minuto)`. |
| D9 + parciais | chip tochas; `lockLabel` sem “Abre na Precisa…”; `vaultInterestRatePct` removida; Cofre 3 + teto de metas; Extrato “Semana N de YYYY”; poupança ≤ 100%; Balança com gasto por ralo; `canBuild` lê economy; Cerca 2 cura overnight; `metadata.capped`; `trophy_*` no catálogo; Foco abre o cronômetro; Linha do dia esconde Concluir se feito; Agenda recusa título vazio; `FlashTimer` uma vez; Obras sem Melhorar em Barraca/Sino; `rewardTitle` lido; extras Foco desativadas depois da data. |

## Saídas dos comandos

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | ok |
| `npx eslint src --max-warnings 6` | 6 avisos pré-existentes em `src/icons/index.tsx` |
| `npm run test:english` | 11 arquivos, todos passaram |
| `npx vite build` | ok; `dist/assets/App-BGCcbLp1.js`. Sem chave `sk-` (os `sk-` do arquivo são `task-reminder` e `ask-evidence`) |
| `node scripts/econ-sim.mjs` | iguais à passagem anterior; misto alerta temporada 50 D |
| regras e índices | `npx firebase-tools deploy --only firestore:rules,firestore:indexes --project app-heitor` — **Deploy complete** |
| função | republicada no projeto `app-heitor` (job MCP `1789516245535`, success). TTS **não** foi retestado nesta rodada |

### Simulador (91 dias)

```
== típico ==
ganho 2912  gasto 728  guardado 507  saldo 1840  xp 6916
materiais madeira 91 pedra 91 ferro 0
nível por semana: S1:Nv3 … S13:Nv32

== misto ==
ganho 2093  gasto 1365  guardado 122  saldo 657  xp 4914
ALERTA item temporada (50 D) inalcançável em 13 semanas

== perfeito ==
ganho 5086  gasto 0  guardado 1498  saldo 3836  xp 8918
materiais madeira 91 pedra 91 ferro 91
```

## Aceite D1, D1b, D2, D4 (fotos)

Conta `teste@flash.com`, Vite `http://localhost:5174`, `?h=19`. Scripts `scripts/patch-test-d1d4.cjs` e `docs/exemplos/telas/etapa2/_shot_d1d4.mjs`. Reset da conta no fim (agenda e punição de teste também limpos).

| Arquivo | O que conferiu |
|---|---|
| `11-d1b-cadeado.png` | Vila com `quizRequired` verdadeiro. O cadeado na boca da Mina é pequeno na foto noturna; o portão está na foto seguinte. |
| `12-d1b-portao.png` | Clique na Mina abre **Prova do dia** (“Hoje tem prova antes de tudo”), sem “Mais tarde”. |
| `13-d1b-mesa.png` | Mesa nível 0: “A prova do dia já pode ser feita” + botão **Prova do dia**. |
| `14-d1-conserto.png` | Terceira missão do dia: toast **Lote consertado: +10 gold** (metade da penalidade 20 de ontem). Saldo 100+15+10=125. Firestore: 1 linha `repair` amount 10, `metadata.date` **2026-09-14**. |
| `15-d2-banner.png` | Faixa de punição; Vila continua visível; botão “Tarefas da punição”. |
| `16-d2-mercado.png` | Hotbar Mercado recusa: toast “Em punição: Mercado, Baú e Loja fechados…”. |
| `17-d2-mochila.png` | Tecla I recusa do mesmo jeito (segundo toast). |
| `18-d2-tarefas.png` | Clique em “Tarefas da punição” não gerou `Missing or insufficient permissions` no log. A tela de punição não é `fixed` e ficou fora do recorte de 900 px. |
| `19-d4-alarme.png` | Toast `19:00 · Aceite D4` com Ok; fala do Olheiro; placa “Hoje você tem”. |
| `20-d4-depois-ok.png` | 8 s depois do Ok: sem segundo toast. Firestore: `remindedFor 2026-09-15` e `remindedAt` gravados. |

## Conferência de conexões (recebe de / entrega para)

A tabela da revisão 1 afirmava “Prova: porta na cena” e isso **não batia**. Nesta rodada a prova é portão de verdade: o cliente lê `quizRequired`, e `openDistrict` intercepta Mina, Mercado, Ferraria, lotes e NPCs.

| Fluxo | Recebe de | Entrega para |
|---|---|---|
| Missão paga | `DataContext.completeTask` `src/contexts/DataContext.tsx:304` | `completeTaskWithRewards`; `bumpChallenge` `tasks_count` `:376`; streak `:384`; **conserto automático com data de ontem** `:447` |
| Prova (portão) | `progress.quizRequired` mapeado em `firestoreService.ts:1576`; `quizLocked` `HeroPanel.tsx:86`; `openDistrict` `VillageHome.tsx:210` `quizBlocksDest`; cena `gated={quizLocked}` `:315`; hotbar/teclas/cartão pelo mesmo `openDistrict` | `DailyQuiz` sem “Mais tarde”; `payQuizRewards` `firestoreService.ts:1417` chave `quiz:<date>` |
| Conserto | `repairLot` `villageService.ts:822` lê `dailyProgress/{uid}_{date}` (ontem) e completions **devidas de hoje** | linha `repair`, chave `repair:<ontem>`, toast `:448` |
| Completion revertida | id determinístico para conferir; se `reverted` grava doc novo `:531`; regra `firestore.rules:219` update criança só com `reverted == true` | criança refaz missão desfeita sem `permission denied` |
| Punição | `lockedShop` em `openDistrict` `:214` (teclas, hotbar, avatar, Baú, cartão, atalhos) | Mercado/Baú/Loja fechados; Mina e prova abertas; histórico `punishmentId`+`userId` `:2479` |
| Agenda alarme | `reminderDue` `agenda.ts:113` (falso se `doneAt` ou `remindedFor`) | um `AudioContext`; grava `remindedFor` `VillageHome.tsx:140`; toast Ok; Olheiro |
| Missão recuperada | transação late + `yesterdayDone` `DailyChecklist.tsx:211` | some da lista; toast; sem segundo `pageerror` |
| Mochila “Novo” | `seeItems` no unmount `Mochila.tsx:34` | troca de aba não apaga o badge |
| Prêmios | `dueTasksOn` `RewardsPanel.tsx:51` | teto `min(redeemMinTasks, devidas)` |
| Relógio | `ClockContext` `dayChanged` | `DataContext` extras expiradas + fechamento; `VillageHome` toast “Novo dia” |
| Agenda → Placa / cabeçalho / Casa | `todayAgenda` / `nextEvents` / `dayTimeline` | iguais à revisão 1 |
| Baú / Comerciante / Cofrinho / tetos | sem mudança de fiação; conserto agora consome o teto com `metadata.capped` | |

Não existem ainda (Lote 2 ou depois): efeito da Lanterna; reversão de dia fechado; conquista `achievement` em transação; ChatFlashGPT pela função; vida dos NPCs.

## Pendências honestas

- O ícone de cadeado na Mina é difícil de ver à noite na foto `11`; o portão está provado pelo clique (`12`).
- A tela “Tarefas da punição” não é `position: fixed`; a foto `18` não a enquadra. O listener com `userId` não quebrou (sem erro de permissão).
- TTS desta republicação da função não foi chamado de novo.
- Node 20 das functions continua deprecado no Firebase.
- Item temporada 50 D inalcançável no perfil misto do simulador.

## Fora do escopo (só registrado)

Tela de abertura / `boot.css`; `BaseMap.tsx`; `DailyChecklist` com `mc-inv`; lanterna sem efeito em contratos.
