# Relatório — Etapa 2 Lote 2

Branch `etapa-2`. Sem commit. Data: 16/09/2026.

Conta de aceite: `teste@flash.com`. Vite `http://localhost:5175`. Fotos em `docs/exemplos/telas/etapa2-lote2/`.

## Decisões

1. Clique no NPC fala (balão, amizade, `seen`). Mercado abre pelo lote/hotbar; Ferraria pela Fornalha, hotbar implícita ou tecla `O` (`openDistrict('workshop')`). Comerciante escondido (21h–7h) só mostra a placa “volta às 7h”.
2. O chip **Nível** do cabeçalho abre a Torre mesmo com o lote no nível 0. O lote da Torre continua abrindo o `BuildingCard`.
3. `createTask` não grava `undefined`. Missão própria: `origin: 'child'`, `status: 'proposed'`, `gold: 0`, `xp` inteiro ≤ 10. `optional: false` não é enviado.
4. Troféu da semana: `trophyOfWeek` compara gold das transações da semana ISO; `fullDays` da semana anterior fica 0 (não há série semanal gravada). Ouro ainda exige 5 tochas nesta semana e +20% de gold.
5. Catálogo do jogo: cada trio bronze/prata/ouro vira 3 entradas. Total visível na Torre: rotina 20, obras 10, ferraria 5, mina 14, biblioteca 12, banco 10, agenda 11, amizade 11, baú 9, temporada 8; 4 escondidas. Mais de 72, todas as linhas de `VILA_CONQUISTAS.md`. Nenhuma paga gold.
6. Falas em `src/data/dialogue/<npc>.ts` estão vazias; vale o `fallback.ts`. Pacote de 60 por NPC continua com o líder.
7. Camadas `growth-1..3.png` não existem: o canvas pula o `drawImage`. Cerimônia de obra é poeira+martelo no canvas (tipo `build` no evento).
8. Pacote de 12 da “nova fase” não é recriado em `closeSeason`. Conquistas `resetOnSeason` saem; estrela em `village.stars`; XP zera; gold fica.
9. Check-in: 5 XP no mesmo `runTransaction` (`progress.totalXP` + `dailyProgress.checkin`). Sem gold. Sem check-in não há penalidade.
10. Amizade: +1 primeira fala do dia, +2 no domínio, teto 5/dia; pedido cumprido +10 XP, nunca gold. Presente de tier 3/5 é cosmético/raro.
11. `claimTrophy` sábado 18h+ (ou domingo). Ouro: 1 esmeralda.
12. Saúde do painel mora na aba Vila (`VillageManager`) com `lastInterestWeek` e `lastLearningWeek`. O grupo Ajustes aponta “Módulos e Saúde” para `AdminControls` (sem restilizar).
13. Relatório semanal: `learning/{uid}` no cliente, idempotente por semana ISO; Recalcular no painel. Mapa da Torre lê o mesmo doc.
14. `FAMILY_ID = 'heitor'` em coleções novas. Todo pagamento novo desta frente é `runTransaction`.
15. Simulador: perfil misto ainda alerta item temporada 50 D. Constantes não mexidas.

## Seção 20 (sobras do Lote 1)

Conferidas no código, sem reabrir regra: “Novo” só some ao fechar a Mochila; prêmios embutidos no Mercado; Cofre 3; `trophy_*` no catálogo; Balança com gasto por ralo; `rewardTitle` nos pedidos; Cerca 2 não apaga rachadura repetida; `metadata.capped`; chip de tochas; Foco preso à missão na Casa; Linha do dia sem Concluir em missão feita; Agenda recusa título vazio e apaga hora/nota com `null`; Obras sem Melhorar em Barraca/Sino; Extrato “Semana de 14 a 20/09”; poupança só sobre gold ganho; `canBuild` lê `settings/economy`; `vaultInterestRatePct` removida.

## Seção 20b (cena)

Entrou em `public/assets/village/scene/anchors.json`: `npcSpots`, `growth[]`, hotspot `chest_streak` com `type` e `minFullDays`, `props`. O canvas trata hotspot por `type`, growth por estágio, NPC por `npcSpots` + `npcBehavior` (24 px/s).

Ainda específico da Vila (não daria uma segunda cena só com JSON+PNG): `VillageScene.tsx` com sprites `ISO_NPC`/`ISO_MINER`, `if` de campinho/arena/casa, fumaça da chaminé, balão de fala, rachadura, cerimônia; `VillageHome.openDistrict` mapeia ids para telas. `SceneCanvas` e `public/assets/scenes/vila/` não foram extraídos (opcional neste lote).

## O que o Lote 2 entregou

### (1) Módulos puros + testes (`src/services/village/__tests__/lote2.test.ts`)

`season.ts`, `checkin.ts`, `achievements.ts` + `src/data/achievements.ts`, `npcBehavior.ts`, `dialogue.ts`.

### (2) Serviços

`savePlan`, `submitCheckin`, `claimTrophy`, `closeSeason` (alias `startNewSeason`), `applyVillageStats`, `talkToNpc`, `seeAchievements`, `learningService.computeWeeklyLearning`, `statsBump` nos pontos de missão/prova/contrato/depósito/agenda/forja.

### (3) Telas da criança

Casa: Plano do turno, Fechar o dia, Linha do dia, Foco. DailyChecklist: Criar missão e faixa Extra. Faixa “Por hoje é isso” quando as cotas pagas fecham; depois das 21h Mercado/Baú não abrem. Torre: Conquistas, Da vida real, Recordes, Troféus, Mapa, Histórias. LevelUpModal: texto de marco. Vida v1: rotina, caminhada, pulo, olhar, placa do comerciante. Diálogos com fallback. Cerimônia de obra no canvas.

### (4) Painel

Cartão Hoje, quatro grupos (Hoje / Jogo / Conteúdo / Ajustes), Fechar temporada, Relatório semanal, Personagens, Saúde.

### Fichas pedagógicas

Seção 22 de `docs/etapas/ETAPA_2_BANCO_E_TEMPORADA.md`: Plano do turno, Fechar o dia, Missão própria e extras, Conquistas/Torre/mapa, Diálogos e amizade, Relatório semanal.

## Saídas dos comandos

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | ok |
| `npx eslint src --max-warnings 6` | 6 avisos pré-existentes em `src/icons/index.tsx` |
| `npm run test:english` | 12 arquivos, todos passaram (inclui `village/lote2.test.ts` 6/6) |
| `npx vite build` | ok; `dist/assets/App-BCNvcy3d.js`. Sem chave `sk-` |
| `node scripts/econ-sim.mjs` | igual ao Lote 1; misto alerta temporada 50 D |
| regras e índices | MCP `firebase_deploy` only `firestore`, job `1789557295466`, **success** |
| função `openai` | não republicada neste lote (sem mudança) |

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

## Aceite (`teste@flash.com`)

Script `docs/exemplos/telas/etapa2-lote2/_shot_lote2.mjs`.

| Arquivo | O que conferiu |
|---|---|
| `01-vila-manha.png` | Vila 10h, Relógio da Vila, cena e hotbar. |
| `02-casa-missoes.png` | Casa: Missões, Criar missão, Extra, Recuperar. |
| `03-plano-turno.png` | Mesa da manhã, ordem, Foco, “Turno gravado” (já havia plano no dia da conta de teste). |
| `04-plano-gravado.png` | Mesmo estado depois de “Começar o turno” (idempotente: uma vez por dia). |
| `05-missao-propria.png` | Toast **Tarefa criada com sucesso!** Título “Ler dez páginas”; gold 0 nas regras. |
| `06-dia-fechado-noite.png` | 21h, Sábio na fogueira, placa “volta às 7h”. Faixa “Por hoje é isso” **não** aparece: cotas do dia (missões/prova/Baú) ainda abertas. |
| `07-fechar-o-dia.png` | Lanterna da noite: 4 hábitos + “Amanhã eu…”. |
| `08-dia-fechado-checkin.png` | Toast **Dia fechado · +5 XP**; campos travados; “O Sábio responde amanhã na Placa.” |
| `09-torre-conquistas.png` | Torre pelo chip Nível: categorias, Quase lá, Primeira picaretada 0/1. |
| `10-torre-recordes.png` | Melhor semana / tochas / prova. |
| `11-torre-trofeus.png` | Troféu da semana (qua 16/09: botão ainda fechado até sábado 18h). |
| `12-torre-mapa.png` | “O mapa preenche no relatório semanal” (sem `learning/{uid}` ainda). |
| `13-torre-historias.png` | Pedidos/histórias dos NPCs. |
| `14-fala-npc.png` | Clique no Sábio à noite: balão com nome, corações, fallback “Primeira vez aqui…”. |

Painel (Hoje, Fechar temporada, Relatório, Saúde): `teste@flash.com` é criança e não abre `/admin`. Conferido no código (`HojeCard`, `WeeklyReport`, `VillageManager`, `ParentPanel` GROUPS). Sem foto.

## Conferência de conexões (recebe de / entrega para)

| Fluxo | Recebe de | Entrega para |
|---|---|---|
| Plano do turno | Casa `savePlan` só `hour < 12`, uma vez (`village.plan.date`) | lista da Casa; `taskCompletions.focus` na missão-foco |
| Fechar o dia | `submitCheckin` + `checkinXp` (3 palavras) | `dailyProgress.checkin`; +5 XP no mesmo tx; `stats.checkins`; Sábio `sageReplyFor` na Placa |
| Missão própria | `DailyChecklist` → `addTask` | `tasks` proposed gold 0; painel Aprovar (`TaskManager`); HojeCard |
| Extra | `tasks.optional` + `extraVisibleOn` | 2× material; fora de `dueTasksOn` |
| Dia fechado | `quotasPaid` = missões + prova + Baú | faixa; `nightClosed` trava Mercado/Baú |
| Conquistas | `applyVillageStats` nos txs (missão, prova, contrato, depósito, agenda, forja, fala) | `village.stats` / `achievementsUnlocked`; chave `ach:<id>`; XP/material/raro; **nunca gold** |
| Torre | chip Nível; `learning/{uid}` | recordes, troféus, mapa, histórias, vida real |
| Troféu | sábado 18h+ `claimTrophy` | `village.trophies`; ouro → esmeralda |
| Temporada | `closeSeason` (admin) | estrela, XP 0, gold igual, season+1, `resetOnSeason` limpas |
| Amizade | `talkToNpc` + bônus de domínio via `statsBump` | `village.npcs`; pedido +10 XP; fala `pickDialogue` |
| Vida na cena | `anchors.npcSpots` + `npcBehavior` | caminhada 24 px/s; Sábio senta à noite; comerciante some |
| Relatório | `computeWeeklyLearning` | `learning/{uid}`; `health.lastLearningWeek`; Torre Mapa |
| Cartão Hoje | resgates, metas, propostas, desafios, erros, IA, dias sem fechar | abre a aba correspondente |

Aprendizado, check-in, missão própria, amizade e conquista do jogo **não** geram linha de gold.

## Pendências honestas

- PNGs `growth-1..3.png`, quadros inpaint (`*-talk/blink/wave/step`, `sabio-sit`, `miner-dig`) e 60 falas por NPC: fallback no sprite base / `fallback.ts`.
- Faixa “Por hoje é isso” só com cotas pagas; a conta de teste à noite ainda tinha missões.
- Mapa de habilidades vazio até o pai (ou o Recalcular) gravar `learning/{uid}`.
- Fotos do painel não saem na conta de teste.
- `SceneCanvas` / pasta `scenes/vila/` opcionais, não feitos.
- Item temporada 50 D no perfil misto do simulador.
- Função `openai` não republicada neste lote.

## Fora do escopo

Lote 3+; ChatFlashGPT; lanterna nos contratos; animação desenhada (Etapa 4); Arena jogável; commit.