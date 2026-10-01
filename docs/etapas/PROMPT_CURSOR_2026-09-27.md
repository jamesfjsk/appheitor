# Prompt para o Cursor — 27/09/2026 (15a: Encomendas; 15b: Engenheiro da Vila)

Você é o Cursor do Miner Missions. Antes de qualquer linha, leia:
- `.cursor/rules/lei-excelencia-aaa.mdc`;
- `docs/CONTRATOS_E_CARREIRAS.md`, inteiro. É a especificação: este prompt só diz a ordem e o método;
- `docs/MINER_MISSIONS_ROADMAP.md`: invariantes 1, 8, 10, 11, 13 e 14, e "O universo conectado";
- `docs/MISSOES_COMPROVANTE.md` §2 e §5. O `Proof` daqui será reusado pelas missões.

**Ordem:** depois dos Pacotes 11 e 12 (`PROMPT_CURSOR_2026-09-23.md`). Primeiro o 15a, revisão do líder, commit do pai; depois o 15b.

**Conteúdo:** copie sem reescrever.
- Os modelos de encomenda estão em `docs/conteudo/ENCOMENDAS_MODELOS.md`, e os treinos em `docs/conteudo/ENGENHEIRO_TREINOS.md`. Os dois passam pela amostra do pai antes.
- A arte do Laboratório está pronta desde 01/10: `public/assets/village/buildings/laboratorio-1.png` a `-4.png`, conferida em `docs/arte/prancha-laboratorio.png`.

**Método:**
- Barra: `npx tsc --noEmit -p tsconfig.app.json` com 0 erros; `npx eslint src --max-warnings 8` com 0 erros; `npm run test:english` e `npm run test:village` verdes; `npx vite build`.
- Módulos puros sem Firebase nem `import.meta.env`.
- Evidência só na conta de teste (`teste@flash.com`). Nunca abra o localhost com a conta do Heitor.
- Fotos em 1280×720, 1920×1080 e 390×844.
- Relatório no fim de `docs/etapas/RELATORIO_ETAPA_3.md`, com a "conferência de conexões" e o que "entrou sem doc".
- **Pare antes do commit.** O líder revisa, porque o push publica para o Heitor.
- Sem restilizar. CSS novo vai em `src/styles/miner.css`, não em `index.css`. O painel continua em Tailwind branco e azul. Não toque em `cart.ts`, `CartBench.tsx` e `src/game/**`.
- **"Contrato" é palavra da Mina.** Na tela nova, use sempre "Encomenda"; no código, `Assignment`. Se o pai escolher outro nome (decisão 1 do §17 do desenho), o líder avisa antes do 15a.
- Nunca grave `undefined`: use `omitUndefined`.
- Nada de campo novo em `englishBase`. Material entra só por `increment`.

## Pacote 15a — Encomendas

Faça o §16 "15a" do desenho, nesta ordem:

1. **Tipos e puros:**
   - tipos em `src/types/assignment.ts` e `src/types/proof.ts`;
   - puros em `src/services/assignments/`: `machine.ts` (`nextStatus`, `effectiveStatus`), `rewards.ts` (`assignmentReward`, `bandFor`, `weeklyCapLeft`), `buckets.ts` (`incomeBucket`), `recurrence.ts` (id da instância, dia da semana);
   - os testes do §16.
2. **Serviço** `src/services/assignmentsService.ts`:
   - criar, aceitar (transação com `assignmentBoards`), entregar, desistir, pedir ajuste e cancelar;
   - `approveAssignment`, exatamente como no §9, incluindo a linha `goldTransactions/assignment_<id>` por `set` e `claimed['assignment:<id>']`;
   - `ClaimKind 'assignment'`;
   - fonte `assignment` nos tipos de `GoldTransaction`.
3. **Regras:** já escritas pelo líder no `main` em 29/09 (`firestore.rules`, §10; `storage.rules`, `proofs/`). Não mexa. Se uma escrita for recusada, anote o caminho e o campo no relatório.
4. **Servidor:** Cloud Function agendada `assignmentRecurrences` e callable `generateAssignmentsNow`, no padrão de `agendaReminders` (`functions/src/index.ts`). O deploy é do líder, depois da revisão.
5. **Tela da criança:**
   - aba Encomendas na Casa (`Casa.tsx`) e `ProofSheet.tsx`, pelo §6.2 e o §7;
   - avisos na Placa, pelo §5.1.
6. **Painel:**
   - aba Encomendas (conferir, criar com os seis modelos, recorrentes, "Como ele trabalha"), pelo §12;
   - item no `HojeCard`.
7. **Economia, pelo §4.5:**
   - campos novos em `settings/economy`;
   - rótulos em `balance.ts`, `Extrato.tsx` e `GoldHistory.tsx`;
   - cartão "Ganhos da semana" na Balança e no `WeeklyReport`;
   - `scripts/econ-sim.mjs` atualizado.
8. **Aceite:**
   - o roteiro ponta a ponta do §16, na conta de teste, com o saldo antes e depois;
   - as 10 fotos;
   - `docs/CONTRATOS_E_CARREIRAS_API.md`.

## Pacote 15b — Engenheiro da Vila

**O núcleo foi feito pelo líder em 01/10** (ver `REVISAO_ETAPA_2_LANCAMENTO.md`, "15b núcleo"). Não refaça. O que sobra vira o 15b-2: as conquistas da Torre, a metacognição, a cerimônia de obra animada e o `hintsUsed`.

Faça o §16 "15b" do desenho, nesta ordem:

1. **Carreira:**
   - `src/config/careers.ts`, genérico, com o Engenheiro copiado de `ENGENHEIRO_TREINOS.md`;
   - puros `applyApproval`, `nextRank` e `competencyLevel`, com testes;
   - `careers/{uid}`: regra de leitura do dono e escrita só do admin.
2. **Aprovação:** a transação do §9 passa a atualizar a carreira, liberar os treinos seguintes e promover.
3. **Painel:**
   - "Começar Engenheiro da Vila";
   - o progresso da carreira, com as competências editáveis;
   - o marco 15;
   - "Já fez fora do app": o pai marca os treinos feitos antes de o Laboratório abrir (o primeiro dia, 1 a 3, desde 01/10), com o XP e a redstone normais.
4. **Laboratório no lote `reserva`:**
   - construção `laboratorio`, sem custo, com nível igual ao título da carreira;
   - a tela da carreira (§11.6);
   - a tela do treino, com passos, "Funciona quando", pistas em degraus, "Mostrar ao pai" e a faixa FAÇA COM UM ADULTO;
   - o Método do Engenheiro (§11.5);
   - a metacognição leve nos projetos;
   - a cerimônia de obra na promoção.
5. **Torre:** as 8 conquistas do §14, com `statSources.ts` e `bumpVillage`.
6. **Aceite:**
   - na conta de teste, começar a carreira, fazer os treinos 1 a 3 com aprovação e ver o treino 4 liberar;
   - com progresso preparado por script de teste, ver a promoção a Técnico;
   - as fotos do §16.
