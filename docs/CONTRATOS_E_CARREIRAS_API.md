# Encomendas — API (Pacote 15a)

Módulos puros não importam Firebase nem `import.meta.env`. O serviço (`assignmentsService.ts`) é o único que grava. Carreira, Laboratório e as 8 conquistas da Torre ficam no 15b.

## Tipos

`src/types/proof.ts`

- `ProofKind` — `checklist | questions | inPerson | photo`
- `Proof`, `ProofAnswer`, `ProofSpec`

`src/types/assignment.ts`

- `AssignmentKind`, `Specialty`, `AssignmentSize`, `AssignmentStatus`
- `Assignment`, `AssignmentReward`, `AssignmentSubmission`, `AssignmentReview`, `AssignmentPayout`
- `AssignmentRecurrence`, `AssignmentDraft`

`src/types/index.ts` — `GoldTransaction.source` ganha `'assignment'`.

`src/types/village.ts` — `ClaimKind` ganha `'assignment'`. `EconomySettings` ganha `assignmentBands`, `assignmentWeeklyCapDays` (2), `assignmentActiveMax` (3) e `assignmentProjectMax` (1).

## Puros — `src/services/assignments/`

### `machine.ts`

- `nextStatus(current, action, ctx)` — só as transições do §6. Motivos: `transicao`, `limite`, `projeto`, `prazo`, `prova`, `cedo`.
- `effectiveStatus(a, today)` — `available` / `accepted` / `needs_changes` com `dueOn` anterior a hoje aparecem como `expired` antes da função gravar.
- `proofReady(spec, proof, criteriaCount)` — checklist inteiro marcado; cada pergunta com resposta.
- `isProjectSize(size)` — `projeto` ou `grande`.
- `statusCtx(patch)` — contexto padrão dos testes (teto 3, 1 projeto).

### `rewards.ts`

- `bandFor(size, dayGold, bands?)` — gold = dias de renda × R7, arredondado. Com D = 22: pequena 2–4, normal 4–7, sábado 9–14.
- `suggestedGold(size, dayGold)` — meio da faixa. Normal com D = 22 ou 23 dá 6.
- `assignmentReward(a, config?)` — treino: gold 0 e, sem a tabela da carreira, XP 0. Encomenda: o valor gravado.
- `countsTowardWeeklyCap(size)` — pequena, normal e sábado.
- `weeklyCapGold`, `weeklyCapLeft`, `overCap`, `weekMeter`.

### `buckets.ts`

- `incomeBucket(source)` — vida real, encomendas, jogos e aprendizado, ou à parte (penalidade, juros e o resto).
- `INCOME_GROUP` — uma entrada para cada `GoldTransaction['source']`.
- `weekIncome(rows)`, `gamesOutearnedMissions(income)`.

### `recurrence.ts`

- `instanceId(recurrenceId, date)` — `{id}_{AAAA-MM-DD}`.
- `weekdayIndex(date)` — 0 = domingo, fuso de Brasília.
- `dueOnFor`, `comingWeekday`, `recurrenceDue`, `instanceDraft`.

### `settle.ts`

- `settleApproval(state, id, config?)` — armazenamento falso do §9. A segunda chamada em `approved` não escreve. Treino não abre linha de gold.

### `templates.ts`

- `ASSIGNMENT_TEMPLATES` — os seis modelos de `docs/conteudo/ENCOMENDAS_MODELOS.md`.
- `templateById`, `templateDraft`, `executionFromProblem` — o botão "Transformar em encomenda de execução" copia o projeto de engenharia. O `templateId` gravado é `problema-execucao` (não está nos seis modelos; ver o relatório).

### `labels.ts` e `voice.ts`

Rótulos curtos e as frases da criança do §6.2. `capWarn(cap)` é a frase do pai no aviso de teto. `gamesBeatMissions()` é a frase da Balança.

### `portrait.ts`

- `workPortrait(items, today)` — as quatro frases de "Como ele trabalha" nos últimos 30 dias, mais o ritmo em dias, sem nota.

## Serviço — `src/services/assignmentsService.ts`

- `createAssignment(uid, draft, today?)` — admin. Se "Salvar como recorrente" e o dia bate, o id é o da instância.
- `acceptAssignment(id, plan?)` — transação com `assignmentBoards/{uid}`. O teto do settings (3, e no máximo 5 da regra) e 1 projeto valem aqui.
- `submitAssignment(id, proof, extra?)` — `submissions` cresce 1.
- `dropAssignment(id)` — volta para `available`, `drops + 1`, sai do quadro.
- `requestChanges(id, { note, missing? })` — admin. Aviso "Ajustes pedidos: veja na Casa".
- `cancelAssignment(id, note?)` — admin. Não cancela `approved`.
- `approveAssignment(uid, id, review)` — transação do §9: status, `payout`, gold absoluto, `totalGoldEarned` e `totalXP` por `increment`, `goldTransactions/assignment_{id}` por `set`, `claimed['assignment:{id}']`, materiais por `increment`. A segunda chamada vê `approved` e não escreve. Carreira e `bumpVillage` não entram (15b).
- `uploadProofPhoto` — `proofs/{uid}/assignments/{id}/{n}.jpg`, imagem até 3 MB.
- `subscribeAssignments`, `subscribeRecurrences`, `fromAssignment`.
- `setRecurrenceActive`, `spawnRecurrences(uid, date)`.
- `generateAssignmentsNow(uid)` — tenta a callable; se ela não está publicada (`not-found` / `unavailable`), grava pelo aparelho do pai com o mesmo id. Não gera para outro uid.

## Telas

- Criança: `EncomendasQuadro` na aba Encomendas da Casa; `ProofSheet`.
- Placa: avisos `asg_*` com "Ver na Casa".
- Pai: `EncomendasPanel`, `EncomendasConferir`, `EncomendasCriar`, `EncomendasRecorrentes`, `EncomendasTrabalho`. Aba no grupo Jogo. Item no Hoje.
- Balança e relatório semanal: cartão "Ganhos da semana". Rótulo "Encomendas" em `sourceLabel`, no Extrato (ícone) e no Histórico gold.

## Servidor — `functions/src/index.ts`

- `assignmentRecurrences` — `onSchedule` `5 0 * * *`, `America/Sao_Paulo`.
- `generateAssignmentsNow` — callable, só admin.

O id da instância é o mesmo de `instanceId`. Deploy é do líder. Não foi chamada a função publicada.
