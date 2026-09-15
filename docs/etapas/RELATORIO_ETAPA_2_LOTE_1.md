# Relatório — Etapa 2 Lote 1 (Banco, desafios, itens, mapa, casa, função)

Sem commit. O pai revisa e commita.

Data: 15/09/2026. Escopo: Lote 1 de `docs/etapas/ETAPA_2_BANCO_E_TEMPORADA.md`. Lote 2 não começou.

## O que entrou

Relógio único de Brasília (`clock.ts` + `ClockProvider`), economia v2, Cofrinho com bônus de paciência, desafios, tetos de gold do jogo, conserto e missão recuperada, Agenda (no lugar do cronômetro solto), sistema de itens v1, mapa com distritos, Casa do Minerador com as missões, efeitos de Fornalha/Armazém/Cerca, painel (metas, desafios, faixas, Balança), Cloud Function `openai` e simulador de 91 dias.

## Arquivos principais

### Novos (código)

- `src/utils/clock.ts`, `src/utils/__tests__/clock.test.ts`
- `src/contexts/ClockContext.tsx`
- `src/types/items.ts`, `src/config/items.ts`
- `src/services/village/{bank,challenges,income,caps,repair,late,levels,agenda}.ts`
- `src/services/village/__tests__/etapa2.test.ts`
- `src/services/{goalsService,challengesService,agendaService,goldTx}.ts`
- `src/components/hero/village/{Cofrinho,Extrato,Agenda,DesafiosCard,Mochila,ItemSlot,ItemCard,Casa}.tsx`
- `src/components/parent/{GoalsPanel,ChallengeManager,Balanca}.tsx`
- `functions/` (`openai`, `agendaReminders`, relógio duplicado só no runtime da função)
- `scripts/econ-sim.mjs`

### Alterados (entre outros)

- `src/config/{village,englishBase,rules,firebase}.ts`, `src/types/village.ts`
- `src/services/{villageService,firestoreService,dailyRulesService,dailyQuizService,aiQuiz,englishTts,englishBaseService,observability}.ts`
- `src/services/village/{chest,shop,schedule}.ts`
- `src/components/hero/{HeroHeader,HeroPanel,RewardsPanel,YesterdaySummary}.tsx`
- `src/components/hero/village/{VillageHome,VillageScene,Oficina,Mercado,DailyChest,BuildingCard,CharacterEditor}.tsx`
- `src/components/parent/{ParentPanel,RewardForm,GoldHistory}.tsx`
- `src/contexts/{DataContext,VillageContext,NotificationContext}.tsx`
- `firestore.rules`, `firestore.indexes.json`, `firebase.json`, `.env.example`
- `docs/VILA_API.md`

Não tocados de propósito: `src/index.css`, `ComicBackdrop.tsx`, pasta `english/**` além de `completeContract` → `bumpChallenge` e TTS pela função. Lanterna no `ContractBoard` (contratos de amanhã) ainda falta.

Arte consumida (feita pelo líder): `casa-1..3`, `cofre-1..3`, `chest_streak*`, troféus, `fx_rachadura`, frames da Mochila, marcos.

## Decisões

1. **Regras de create do Cofrinho:** o texto da seção 8 não deixa o admin criar meta para o filho. A regra publicada aceita `isAdmin()` **ou** criança com `status == 'open'` e `savedGold == 0`. Sem isso o atalho “Criar meta no Cofrinho” pelo painel quebraria.
2. **`familyId`:** constante `FAMILY_ID = 'heitor'` em `config/rules.ts`; gravado em `goals`, `challenges` e `agenda`; create nas regras exige `familyId == 'heitor'`. Documentos velhos sem o campo ainda leem (parser usa fallback).
3. **`learning/{uid}`:** a spec manda um doc por uid (não por semana). O Lote 1 não grava relatório semanal (é Lote 2). Quem implementar precisa de `learning/{uid}/weeks/{week}` ou equivalente; senão a semana nova apaga a anterior.
4. **Pré-requisito n3:** Fornalha, Armazém e Cerca no n2 (não “todas as sete no n2” nem minerador 20). Escolha mais simples; a Mesa continua `liveMaxLevel: 1`.
5. **Empate no Baú:** o material mais escasso; se empatar, o hash escolhe entre madeira/pedra/ferro (nessa ordem de varredura).
6. **ChatFlashGPT:** a função só devolve JSON de chat. O chat livre ainda lê chave no cliente, mas `AI_CHAT_ENABLED` continua `false`. Não foi migrado para não quebrar o formato.
7. **`modules.bank`:** padrão `false` — o Cofre mostra placa até o pai ligar o módulo.
8. **Casa / Plano / Fechar o dia:** as abas existem com texto “em breve”; a lógica (plano, check-in, Sábio) fica no Lote 2. Missões já moram na Casa.
9. **Ferraria Obras:** só leitura; construir continua no lote da cena (`BuildingCard`).
10. **Agenda `onSchedule`:** além do intervalo `[hoje, amanhã]` da spec, a função também busca `repeat == 'weekly'` para não perder treino semanal fora da janela de datas.
11. **Cofre na cena:** não há `BuildingId` `cofre`. Clique no lote `build:cofre` e o distrito Banco abrem o Cofrinho; placa se o módulo estiver desligado.
12. **Item temporada no simulador:** o perfil **misto** alerta que 50 D é inalcançável em 13 semanas (ele gasta em vez de guardar). Típico e perfeito não disparam alerta de saldo parado. Constantes **não** foram mexidas: o perfil misto não é o alvo da faixa temporada.
13. **`clockDriftWarning`:** vive em `clock.ts` (módulo puro), não no contexto React, para o eslint continuar só com os 6 avisos de `icons/index.tsx`.
14. **Gold no catálogo:** item `gold` em `ITEMS` para o Baú usar `ItemSlot`.

## Verificação (seção 10)

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | ok (exit 0) |
| `npx eslint src --max-warnings 6` | 6 avisos pré-existentes em `src/icons/index.tsx` |
| `npm run test:english` | 11 arquivos, todos passaram (inclui `village/etapa2.test.ts` e `utils/clock.test.ts`) |
| `npx vite build` | ok; bundle sem `sk-` |
| `node scripts/econ-sim.mjs` | ver abaixo |
| Regras / índices / função | Regras e índices **publicados** em `app-heitor`. Função **não publicada**: Secret Manager API desligada no projeto (403). O líder liga a API, cria o secret `OPENAI_API_KEY` e roda `npx firebase-tools deploy --only functions --project app-heitor`. |
| Aceite no navegador `teste@flash.com` | **não rodado** — não há Playwright neste `package.json` nem sessão de browser nesta passagem; fotos em `docs/exemplos/telas/etapa2/` **não geradas** |

### Simulador (91 dias)

```
== típico ==
ganho 2912  gasto 728  guardado 507  saldo 1840  xp 6916
materiais madeira 91 pedra 91 ferro 0
nível por semana: S1:Nv3 … S13:Nv32

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

Função: 2 milhões de invocações grátis/mês no plano Blaze; teto interno 800 chamadas/mês. Custo estimado efetivo: zero neste uso.

O líder ainda precisa: `npx firebase-tools functions:secrets:set OPENAI_API_KEY` (se ainda não existir).

## Problemas e melhorias (avisar o pai)

### Problemas

- Aceite dos 12 itens da seção 10 **não conferido** no Firestore nem com foto. Sem isso o Lote 1 não está “fechado” para começar o Lote 2.
- Lanterna: `ContractBoard` / prova ainda **não** mostram o conteúdo de amanhã. TTS e `bumpChallenge` nos contratos já entram.
- `LevelUpModal` ainda não usa `ItemSlot` no presente de nível.
- Cerimônia de forja (quadros do Ferreiro por inpaint) não existe — arte do líder.
- `savePlan` / `submitCheckin` / `claimTrophy` / `closeSeason` / `computeWeeklyLearning` **não** foram feitos (Lote 2).
- `HeroHeader` perdeu o atalho do Baú/calendário/timer; Baú entra pela Casa ou pelo lote. Conferir se o Heitor acha o Baú.

### Melhorias possíveis (não feitas)

- `learning` por semana, não um doc só.
- Pré-requisito n3 alinhado ao texto longo de construções, se o pai quiser o caminho mais duro.
- Migrar ChatFlashGPT para a função quando o chat voltar a ligar.
- Ligar `modules.bank` no seed da conta de teste, senão o aceite 1–3 do Cofrinho cai na placa.
- ItemSlot também no Comerciante da loja de prêmios, se ainda faltar em algum chip.

## Pendências para o líder

1. Ligar Secret Manager em `app-heitor`, criar `OPENAI_API_KEY` (`npx firebase-tools functions:secrets:set OPENAI_API_KEY`) e publicar a função. Node 20 na função está em depreciação (desliga em 30/10/2026); a spec pede 20, então ficou 20.
2. Ligar `modules.bank` na conta de teste.
3. Rodar o aceite da seção 10 com `teste@flash.com`, guardar fotos em `docs/exemplos/telas/etapa2/`, conferir `goldTransactions` e `claimed`.
4. Revisar este relatório; só então Lote 2.
5. Não commitar daqui — o pai commita.
