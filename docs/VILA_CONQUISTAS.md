# Conquistas: as do jogo (padrão, muitas) e as da vida real (do pai)

Documento de desenho (fonte de verdade a partir de 15/09/2026). Entra em código na Etapa 2, Lote 2 (`docs/etapas/ETAPA_2_BANCO_E_TEMPORADA.md`, seção 19), junto com a Torre.

## Dois tipos, dois lugares

| | Conquistas do jogo | Conquistas da vida real |
|---|---|---|
| Quem cria | o jogo (catálogo em código, `src/data/achievements.ts`) | o pai, no painel (coleção `achievements`, como hoje) |
| O que medem | progresso dentro do jogo: missões, tochas, obras, forja, Mina, prova, Banco, Agenda, amizade, nível | coisas de fora: "andou de bicicleta sem rodinha", "leu um livro inteiro", "nota boa na prova da escola" |
| Recompensa | XP e material; nas de ouro, um raro; nas exclusivas, cosmético ou diamante; **nunca gold** | o que o pai definir (pode ser gold; é o pai pagando por algo real) |
| Como destrava | sozinha, por contadores gravados nas mesmas transações dos eventos | o pai marca como feita no painel (ou a criança pede e o pai confirma) |
| Onde aparecem | Torre, aba Conquistas, por categoria, com barra de progresso | Torre, aba "Da vida real", com a foto ou ícone que o pai escolheu |

Regra: a lista do jogo tem que ser grande o bastante para sempre haver uma conquista "quase lá" na Torre (o próximo alvo visível em cada categoria), e as da vida real são poucas e especiais.

## Como funciona (código)

- `village.stats`: contadores inteiros incrementados dentro das transações que já existem (`missionsDone`, `fullDaysBest`, `morningEarly`, `perfectWeeks`, `buildsDone`, `craftsDone`, `smelts`, `contractsDone`, `contractsPerfect`, `wordsMastered`, `quizzesDone`, `quizPerfect`, `reflections`, `shelfFixed`, `deposits`, `goalsAchieved`, `interestWeeks`, `focusBlocks`, `agendaDone`, `agendaPlanned`, `organizedWeeks`, `chestsOpened`, `streakChests`, `emeraldsEver`, `diamondsEver`, `npcTalks`, `seasonsDone`).
- `village.achievementsUnlocked: Record<id, string>` (data ISO) e `village.newAchievements: string[]` (ainda não vistas na Torre).
- Módulo puro `src/services/village/achievements.ts`: catálogo tipado `{ id, category, tier: 'bronze' | 'prata' | 'ouro' | 'exclusiva', title, description, icon, stat, target, hidden?, reward: { xp, material?: number, rare?: 'esmeralda' | 'diamante', cosmetic?: string } }`; `evaluateAchievements(stats, unlocked)` devolve as novas; `progressOf(stats, ach)` devolve `{ current, target }`. Testes: cada conquista destrava no alvo e não antes; escondidas não aparecem antes; nada paga gold.
- Pagamento: uma transação por conquista nova com chave `ach:<id>` em `village.claimed`; XP no `progress.totalXP`; material em `englishBase.materials`; raro em `village.rare`; cosmético em `village.owned`. Toast com o ícone e "+25 XP, +2 pedra" e som `unlock`; o Olheiro comenta as de rotina, o Ferreiro as de obra e forja, o Sábio as de prova, o Comerciante as de Mina e Banco.
- Por temporada: as de nível e de temporada reiniciam com a estrela (o histórico fica em `stars`); as demais são permanentes.
- O pacote de 12 que a "nova fase" cria em `achievements` deixa de existir: vira parte deste catálogo. As da vida real continuam em `achievements` com `checkAchievements` como hoje, só com o campo `kind: 'real'` e o ícone escolhido pelo pai.

## Catálogo inicial (72 conquistas do jogo, mais 7 da Vagoneta desde 17/09)

Alvos em (bronze / prata / ouro); recompensa padrão por camada: bronze 10 XP + 1 material; prata 25 XP + 2 materiais; ouro 50 XP + 1 esmeralda; exclusiva 100 XP + 1 diamante ou cosmético.

**Rotina (missões)**
- Primeira picaretada: 1 missão feita (bronze).
- Mão na massa: 10 / 50 / 100 missões feitas.
- Veterano: 250 / 500 / 1.000 missões feitas.
- Dia completo: 1 / 10 / 50 dias com todas as missões.
- Tochas: 3 / 7 / 21 dias completos seguidos.
- Madrugador: 10 / 30 / 100 missões da manhã feitas antes das 9h.
- Sem esquecer: 7 / 30 / 90 dias seguidos sem missão perdida (folga e férias não contam contra).
- Recuperação: 5 missões recuperadas até meio-dia (bronze).

**Obras**
- Primeira obra: Fornalha nível 1 (bronze).
- Vila de verdade: todas as sete no nível 1 (prata).
- Mestre de obras: todas no nível 2 (ouro).
- Base completa: todas no nível 3 (exclusiva: cosmético "capacete de mestre de obras").
- Fundidor: 10 / 50 / 200 fundições.
- Queimador: 10 / 30 / 100 queimas de redstone.

**Ferraria**
- Ferramenta nova: primeira picareta (bronze).
- Ferro, ouro, diamante: cada picareta (prata, prata, ouro).
- Bem equipado: todos os equipamentos forjados (exclusiva: diamante).

**Mina (inglês)**
- Primeiro contrato: 1 contrato (bronze).
- Cliente fiel: 25 / 100 / 365 contratos.
- Sem erro: 5 / 25 / 100 contratos perfeitos.
- Palavras: 50 / 200 / 500 palavras dominadas.
- Carta, Recado, Ferraria, Comerciante: 20 de cada tipo (bronze cada).

**Biblioteca (prova)**
- Primeira prova (bronze).
- Nota máxima: 1 / 10 / 50 provas 8 de 8.
- Constância: 7 / 30 / 100 provas seguidas (dias com prova feita).
- Pensador: 10 / 50 / 200 reflexões escritas.
- Estante limpa: 10 / 50 erros corrigidos na Estante (Etapa 3).

**Banco**
- Primeiro depósito (bronze).
- Meta batida: 1 / 5 / 20 metas alcançadas.
- Paciente: 4 / 12 / 26 semanas seguidas recebendo bônus de paciência.
- Poupador: guardou 20% ou mais do que ganhou em 4 / 12 semanas.
- Grande meta: uma meta de 20 dias de renda ou mais alcançada (ouro).

**Agenda**
- Organizado: 5 / 25 / 100 itens da agenda feitos.
- Planejador: 10 / 50 itens criados com 2 dias ou mais de antecedência.
- Semana organizada: 1 / 4 / 12 semanas com tudo feito.
- Foco: 10 / 50 / 200 blocos de Foco terminados.

**Amizade (NPCs)**
- Amigo do Comerciante, do Sábio, do Ferreiro, do Olheiro: amizade nível 3 (prata cada).
- Lenda para o Comerciante, o Sábio, o Ferreiro, o Olheiro: nível 5 (ouro cada).
- Todo mundo gosta de você: os quatro no nível 3 (exclusiva: cosmético "cachecol da vila").
- Bom de papo: 100 / 365 conversas.

**Baú e raros**
- Primeiro Baú do Dia (bronze).
- Baús: 10 / 50 / 200 Baús do Dia abertos.
- Sete tochas: 1 / 5 / 20 Baús das 7 tochas.
- Esmeralda e Diamante: a primeira de cada (bronze, prata).

**Temporada e nível**
- Aprendiz da Mina, Minerador de Madeira, de Ferro, de Diamante, Lenda da Mina: níveis 5, 10, 20, 30, 40 (bronze, prata, prata, ouro, exclusiva; reiniciam por temporada).
- Estrela: 1 / 3 / 6 temporadas fechadas.

**Segredos (escondidas; aparecem só quando destravam)**
- Curioso: falou com os quatro NPCs no mesmo dia.
- Lua da Vila: abriu a Vila depois das 21h num dia completo.
- Colecionador: os quatro cosméticos de marco.
- Creeper amigo: clicou 5 vezes no creeper do resumo de ontem (Etapa 4).

**Vagoneta da Mina** (7; entrou em 17/09 com o módulo `logic`; contadores `redstoneDone`, `redstonePerfect`, `redstoneStages` de `redstoneService`; ficha em `docs/etapas/ETAPA_2_LANCAMENTO.md`, seção 12)
- Primeira carga (`cart_first`): 1 sessão com pelo menos uma vagoneta carregada (bronze, 10 XP).
- Três de três (`cart_perfect`): 1 sessão perfeita (15 XP).
- Vagoneteiro (`cart_5`): 5 sessões com acerto (bronze, 20 XP).
- Trilho longo (`cart_stages_30`): 30 vagonetas carregadas no total (prata, 25 XP).
- Carga exata (`cart_perfect_5`): 5 sessões perfeitas (prata, 30 XP + 1 esmeralda).
- Mestre da vagoneta (`cart_20`): 20 sessões com acerto (ouro, 40 XP).
- Sem tombar (`cart_perfect_15`): 15 sessões perfeitas (exclusiva, 50 XP + 1 diamante).

Contadores sem fonte até a Etapa 3 e por isso **fora do catálogo no lançamento** (decisão de 17/09): `saverWeeks` (Poupador), `creeperClicks` (Creeper amigo), `weekQuestion` (pedido 5 do Sábio, que vira "Sete provas seguidas" com `quizStreak`). Toda conquista precisa de uma linha em `src/services/village/statSources.ts`; o teste quebra se faltar.

## A Torre (aba Conquistas)

Categorias em abas horizontais com contagem ("Rotina 6/8"); cada conquista como `ItemSlot` com moldura pela camada, título, progresso ("37/50") e a data quando destravada; escondidas aparecem como "?" até destravar; "Novo" nas recém-ganhas; no topo, "Quase lá": as três mais próximas de destravar em qualquer categoria. Aba "Da vida real": as do pai, com o ícone escolhido, "Pedir para o pai confirmar" quando a criança acha que fez.

## Painel

A aba de conquistas do pai fica só para as da vida real (criar, marcar como feita, definir prêmio); as do jogo aparecem em lista só leitura com o progresso do Heitor, para o pai comentar em casa.
