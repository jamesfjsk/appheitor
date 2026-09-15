# Miner Missions: roteiro mestre (o app inteiro vira um jogo)

Versão viva. Aprovado pelo pai em 15/09/2026. Cada etapa tem um arquivo próprio em `docs/etapas/` (`ETAPA_N_*.md`) para a IA que for executar, e uma revisão em `docs/etapas/REVISAO_ETAPA_N.md` ao final.

## Contexto

O "Flash Missions" é o app de rotina diária do Heitor (10 anos, faz aniversário em 18/09/2026, gosta de Minecraft e futebol): missões de casa por período, XP/níveis, gold que compra prêmios reais definidos pelo pai, sequência de dias, penalidades, modo punição, prova diária gerada por IA, missão surpresa, conquistas, calendário, lembretes. Em 14 e 15/09/2026 nasceram a Arena de Inglês e "A Base" (contratos de inglês gerados por IA que pagam materiais para construir uma base), com um visual de mina que o pai aprovou ("muito top a temática").

Decisão do pai (15/09/2026): o app inteiro vira UM jogo, "Miner Missions". Gold continua a moeda final (compra os prêmios reais e também coisas do jogo), cada tarefa vira uma missão que paga gold, XP e materiais; a Arena de Inglês vira um módulo dentro do mundo; ele monta uma base e cria/customiza um personagem; cada coisa tem visual próprio (ele reclamou de todos os lotes vazios terem o mesmo ícone); em toda interação ele aprende algo (filosofia, lógica, caráter, conhecimento) de forma natural e agradável. Ele topa pagar por APIs e programas para o resultado ser memorável. Respostas às decisões: personagem desenhado por código agora, sprites pagos depois se precisar; cosméticos e decorações em gold, construções e equipamentos em materiais; efeitos de equipamento pequenos e raros (capacete absorve 1 missão perdida por semana); material por período (manhã madeira, tarde pedra, noite ferro).

Ele também pediu para trazer as melhorias educativas da V2 (projeto pausado em `appheitor-v2`): o **Cofrinho** (metas de poupança em gold: a criança cria a meta, deposita aos poucos, o responsável libera quando fecha; cancelar devolve o gold), os **Desafios com prazo** (meta e janela de datas, progresso automático, bônus), **eventos/datas especiais** com bônus e o feed de **novidades**. Tudo que for benéfico e necessário para a educação dele entra no jogo.

Este documento é o cronograma por etapas para outras IAs executarem com precisão, sem perder a lógica principal. Ao ser aprovado, o primeiro ato da execução é copiá-lo para `docs/MINER_MISSIONS_ROADMAP.md` no repositório e manter ali a versão viva (cada etapa concluída marca o que mudou).

## Lógica principal que nunca muda (invariantes)

1. **Gold**: `progress/{uid}.availableGold` é a única fonte de verdade; toda variação passa por uma linha em `goldTransactions` com `balanceBefore/balanceAfter` (`FirestoreService.createGoldTransaction`) e nunca fica negativa; prêmios reais continuam com pedido pendente e aprovação do pai (`redemptions`), gate de `REDEEM_MIN_TASKS = 5` missões no dia (`src/config/rules.ts`).
2. **XP e níveis**: curva em `src/utils/levelSystem.ts` (0/100/250/450/700/1000, depois +350 por nível, teto 100); patentes de minerador já aplicadas.
3. **Missões**: `tasks` por `period` (morning/afternoon/evening) e `frequency` (daily/weekday/weekend); uma conclusão por dia por tarefa (`lastCompletedDate === getTodayBrazil()`); conclusão atômica em `FirestoreService.completeTaskWithRewards` (batch com `increment`) gravando `taskCompletions`.
4. **Sequência**: `updateStreak`/`checkAndResetStreakIfNeeded` em `firestoreService.ts` (ontem mantém, hoje soma, senão zera).
5. **Regras do dia** (`src/services/dailyRulesService.ts`): `closeDay` idempotente por `dailyProgress.summaryProcessed`, penalidade por missão perdida, bônus de dia completo, férias isentas.
6. **Modo punição**: substitui o app inteiro; 30 tarefas ou 7 dias; uma tarefa a cada 30 min; só o pai ativa/desativa.
7. **Prova diária** (`dailyQuizService.ts`): gerada um dia antes, obrigatória se `progress.quizRequired`, nunca regenerada depois de concluída, temas sem repetir 45 dias.
8. **Datas** sempre `YYYY-MM-DD` no fuso do Brasil (`src/utils/timezone.ts`); nunca gravar `undefined` no Firestore (copiar `omitUndefined`/`stripUndefined`).
9. **Segurança**: `firestore.rules` por dono (`userId == uid`) com `get` permitido em documento inexistente; `storage.rules` para `english/**`; chave da OpenAI no cliente com teto mensal (`aiUsage`, `AI_MONTHLY_CALL_CAP`).
10. **A Base e a Mina** (`src/services/englishBaseService.ts`, `src/types/english.ts`): `englishBase/{uid}` é o livro-razão de materiais comuns e construções; `completeContract` e `buildUpgrade` gravam o doc inteiro passando por `fromBaseDoc` (campos novos ali seriam apagados: por isso a vila tem doc próprio); contratos de inglês continuam como estão.
11. **Interface**: português do Brasil, sem emojis, fonte pixel só em títulos e números, classes `mc-*` (`src/index.css`, seção final) e `src/styles/miner.css`; painel dos pais continua limpo (Tailwind, branco/azul).
12. **Cofrinho**: gold guardado sai do saldo disponível no depósito e só volta por cancelamento do responsável; juros só sobre o guardado, com teto, uma vez por semana; meta alcançada é fechada pelo responsável (o gold vira o prêmio real). Desafios pagam uma única vez.
13. **Qualidade**: `npx tsc --noEmit -p tsconfig.app.json`, `npx eslint src --max-warnings 0` (só os 6 avisos pré-existentes em `src/icons/index.tsx`), `npm run test:english` (testes em Node de módulos puros), `npx vite build`; módulos puros sem importar Firebase nem `import.meta.env`; cada etapa entrega um documento de API (`docs/*_API.md`) com todas as exportações.

## Arquitetura atual (onde cada coisa mora)

- Tela da criança: `src/components/hero/HeroPanel.tsx` (composição), `HeroHeader`, `ProgressBar`, `DailyChecklist` + `TaskItem`, `RewardsPanel` (modal), `AchievementsBadges`, `FlashReminders`, `CalendarModal`, `DailyQuiz`, `SurpriseMissionQuiz`, `FlashTimer`, `VacationBanner`, `YesterdaySummary`, `BirthdayCelebration`, `PunishmentModeScreen`; login em `src/components/auth/LoginScreen.tsx`.
- Inglês: `src/components/hero/english/` (`EnglishArenaCard.tsx` abre `base/EnglishBase.tsx`; `mine/` é o Mine Rush, guardado para virar "Turno na Mina").
- Contextos: `AuthContext` (childUid), `DataContext` (completeTask, adjustUserXP/adjustUserGold, checkAchievements), `SoundContext`, `VacationContext`.
- Serviços: `firestoreService.ts` (tarefas, progresso, gold, punição, conquistas), `dailyRulesService.ts`, `dailyQuizService.ts` + `aiDailyQuiz.ts` + `aiQuiz.ts` (`callOpenAI`), `englishBaseService.ts`, `englishAi.ts`, `englishJudge.ts`, `englishTts.ts`, `aiUsage.ts`, módulos puros em `src/services/english/`.
- Configs: `src/config/rules.ts`, `englishLevels.ts`, `englishBase.ts` (construções, custos, sala do comerciante), `englishRewards.ts`, `quizCurriculum.ts`.
- Docs: `docs/ARENA_INGLES_ETAPA1.md` (+ `_API.md`), `docs/ARENA_INGLES_REDESIGN.md`, `docs/MINER_MISSIONS_TEMA.md` (tema visual), `docs/exemplos/` (telas e plano gerado).
- Assets: `public/assets/english/ui/` e `ui/base/` (ícones pixel art 256 px), `public/icons/miner-*.png` (ícone do app). Pipeline de geração de ícones (gpt-image-1-mini, fundo transparente, reduzido com nearest) fica fora do repositório, operado pelo líder; ~10 s e centavos por ícone.

## Modelo de dados alvo

`village/{uid}` (novo; regras iguais ao bloco `englishBase`):
```
userId, createdAt, updatedAt
rare: { diamante: number, esmeralda: number }
gear: { pickaxe: 0..4, helmet: 0|1, boots: 0|1, lamp: 0|1, cape: 0|1 }
character: { skin, hairStyle, hairColor, shirtColor, pantsColor, shoesColor, hat, cape, pet }
owned: string[]                       // cosméticos comprados (ids do catálogo)
chests: { dailyOpenedDate: string, claimed: Record<string, string> }   // ex.: 'streak7:2' -> ISO
shield: { helmetWeek: string }        // semana ISO em que o capacete já absorveu
decor: string[]                       // Etapa 4
journal: nada aqui (reflexões ficam em dailyQuizzes.reflection e no Diário, Etapa 3)
```
`englishBase/{uid}` continua com `materials` (madeira, pedra, ferro, redstone) e `buildings`; as missões de casa passam a somar materiais ali (`increment` no mesmo batch de `completeTaskWithRewards`), e `taskCompletions` ganha `materialsEarned`.
`settings/village` (painel): `{ shopEnabled, effectsEnabled, goldPriceMultiplier, interestRatePct (padrão 5), interestCapGold (padrão 20) }`. Catálogo de itens, preços, efeitos e loot em código (`src/config/village.ts`).
`goals/{id}` (Cofrinho, modelo da V2): `{ userId, title, targetGold, savedGold, status: 'open' | 'achieved' | 'cancelled', createdAt, achievedAt, cancelledAt, lastInterestWeek }`; regras: criança cria e deposita, só o responsável fecha (`achieved` consome o gold guardado e vira um pedido entregue; `cancelled` devolve o gold ao saldo).
`challenges/{id}` (Desafios com prazo, modelo da V2): `{ userId, title, description, kind: 'tasks_count' | 'streak_days' | 'quiz_correct' | 'english_contracts' | 'logic' | 'manual', target, progress, startsOn, endsOn, xpReward, goldReward, completedAt, createdBy }`; o responsável cria; o progresso avança nos mesmos pontos onde o evento acontece (`completeTask`, `updateStreak`, `completeDailyQuiz`, `completeContract`, Oficina de Redstone).
`events/{id}` (datas especiais, Etapa 4): `{ userId, title, eventOn (MM-DD ou data), xpBonus, goldBonus, message, celebratedYears: number[] }` — generaliza o aniversário (`birthdayEvents` continua como está).
`GoldTransaction.source` ganha `'village_shop' | 'chest' | 'goal_deposit' | 'goal_withdraw' | 'goal_interest' | 'challenge'` (rótulos em `GoldHistory` e no Extrato da criança).

## Economia (referência; ajustar depois de 2 semanas de jogo real)

- Renda hoje: 6 missões = 30 gold / 60 XP; dia completo +10 gold; prova até 15 gold / 50 XP; Mina 3 contratos premiados ≈ 18 gold / 52 XP. Teto ≈ 73 gold/dia, realista 45-55. Prêmios reais de 50-300 gold seguem custando de 1 dia a 1 semana.
- Materiais: missões pagam 1 cada (manhã madeira, tarde pedra, noite ferro) ≈ 6/dia; Mina ≈ 5/dia. Ralos: 18 níveis de construção ≈ 96 materiais (custos atuais 3/5/8 com ferro >= 1), equipamentos ≈ 90, decorações ≈ 60. Ritmo: Fornalha n1 no dia 1; primeira picareta em 3 dias; base completa em ~3 semanas; picareta de diamante em 6-8 semanas.
- Raros (sem sorteio contra a criança): prova 8/8 = 1 esmeralda; Baú do Dia (todas as missões do dia) = 5-15 gold + 2 materiais comuns + 1 esmeralda a cada 3 dias completos seguidos; Baú das 7 tochas (7, 14, 21 dias) = 1 diamante + 20 gold + 1 peça cosmética. Gold vindo do jogo <= 35/dia.
- Equipamentos (materiais): picareta pedra 6 pedra + 2 madeira (+1 material na 1ª missão do dia); ferro 8 ferro + 4 pedra (+1 na 1ª missão de cada período); ouro 10 ferro + 6 redstone + 1 esmeralda (idem + Baú do Dia com +1); diamante 12 ferro + 8 redstone + 2 diamante (+1 em toda missão); botas 5 madeira + 3 ferro (+20% XP nas missões); capacete 6 ferro + 3 pedra (absorve 1 missão perdida por semana); lanterna 4 redstone + 2 ferro (mostra contratos e prova de amanhã, 1 Dica grátis/dia no Recado); capa 6 madeira + 4 redstone + 1 esmeralda (visual; Etapa 4: protege as tochas 1 dia/mês).
- Loja da Vila (gold, instantâneo, `goldPriceMultiplier` no painel): peles e 8 cores de roupa grátis; penteados 20; camisa do time 40; boné 30; capacete decorativo 60; capas 80-150; pets (lobo, gato, papagaio) 120-150; creeper amigo 250; coroa 200. Catálogo ≈ 1.500 gold.
- **Educação financeira** (Banco da Vila): o Cofrinho paga **juros semanais de 5% sobre o gold guardado, teto 20 gold por semana** (`goal_interest`, calculado uma vez por semana ISO por meta aberta, idempotente por `lastInterestWeek`), para ele sentir o valor de guardar; gold no cofre não conta para comprar na loja nem para prêmios reais até a meta fechar; saque só cancelando a meta (o responsável decide, sem juros no cancelamento). O **Extrato do minerador** mostra à criança, por semana: ganhou, gastou, guardou e juros, com uma frase do Sábio sobre o hábito (ex.: "Quem guarda um pouco todo dia constrói a base sem pressa"). Na Loja e nos Prêmios de verdade, quando falta gold para algo, o botão vira "Criar meta no Cofrinho" com o valor já preenchido (planejar antes de comprar).

## Economia interna v2 (decidida em 15/09/2026)

Pedido do pai: reformular level up, custos e distribuição de gold como uma economia de jogo de verdade. Esta seção condensa três desenhos independentes (lente de jogo, de educação e de operação) e **prevalece sobre a seção "Economia (referência)" acima** onde houver conflito. O pai respondeu às oito perguntas do fim em 15/09/2026 aceitando todas as recomendações; as respostas estão registradas lá. A curva nova entra junto com "Iniciar nova fase" em 18/09 (fim da Etapa 1); o resto entra na Etapa 2 (`docs/etapas/ETAPA_2_BANCO_E_TEMPORADA.md`).

### Princípios

1. **Gold é escolha, XP é crescimento, material é construção, raro é marco.** Só gold compra prêmios reais e cosméticos; XP nunca compra nada, só sobe de nível e libera coisas; materiais constroem e craftam; raros destravam o topo dos equipamentos. Tochas e estrelas são contadores, não moedas.
2. **Gold só por esforço, com valor fixo.** Toda torneira tem cota diária e valor conhecido; nada de faixa aleatória em gold (o Baú sorteia só qual material). Sem grind: não existe atividade repetível que pague.
3. **A régua é o dia de renda (D)**: o que um dia normal rende (5 de 6 missões + prova + 2 contratos, cerca de 45 gold). Todo preço, real ou do jogo, é pensado e mostrado em dias ("cerca de 3 dias no seu ritmo"). O painel calcula `R7` (média dos últimos 7 dias) e sugere preços por faixa.
4. **Nível serve para algo**: cada nível dá material, cada patente (5 níveis) dá um raro e um título, cada marco (10 níveis) dá um cosmético exclusivo, e receitas e itens têm nível mínimo. Temporada de 13 semanas: XP zera com uma estrela permanente; gold, base, equipamentos e cosméticos nunca zeram.
5. **Aprender não é emprego**: atividades novas de aprendizado (Redstone, reflexão, dilemas, hábitos) pagam XP e material, nunca gold. A prova é a única "aula paga".

### Torneiras de gold (dia)

| Torneira | Valor | Dia típico | Dia perfeito |
|---|---|---|---|
| Missões (6) | 5 gold, 10 XP, 1 material do período | 25 | 30 |
| Prova (8 perguntas) | 2 gold + 6 XP por acerto; 8/8 dá 1 esmeralda | 12 | 16 |
| Mina (3 contratos) | tabela atual (0-5 gold, 5-20 XP, 0-3 materiais) | 8-10 | 18 |
| Baú do Dia (todas as devidas, após 18h) | 10 gold + 1 por tocha (teto 15) + 2 materiais; esmeralda a cada 3 tochas. **Substitui** o bônus fixo de dia completo | 0 | 10-15 |
| Penalidade | 1 gold por missão perdida (nunca toca o Cofrinho) | -1 | 0 |
| **Total** | | **cerca de 45 gold, 110 XP, 9 materiais** | **cerca de 80 gold, 175 XP, 17 materiais** |

Semanais, com teto: Baú das 7 tochas (20 gold + 1 diamante), desafio do pai (até 60 gold por semana), conquistas (5-40 cada, uma vez), juros do Cofrinho (5%, teto 20). Gold "dado pelo jogo" (baús, conquistas, desafios, juros, Comerciante) fica limitado por `gameGoldDailyCap` (35) e não passa de 25% da semana. Semana típica perto de 330 gold; perfeita perto de 600.

Ralos, destino alvo de cada 100 gold: 60 prêmios reais, 20 Loja da Vila, 20 Cofrinho. Saldo parado saudável: 2 a 7 D; acima de 15 D o painel avisa "gold sobrando: suba preços ou crie uma meta grande".

### Curva de nível (temporada)

Fórmula recomendada: **XP acumulado para o nível L = 5 x (L - 1) x (L + 10)**; cada nível pede 10 XP a mais que o anterior (60, 70, 80...). Teto **40** por temporada. Nível 2 no primeiro dia; com 110 XP por dia: 5 no dia 3, 10 no dia 8, 20 no dia 26, 30 no dia 53, 36 na semana 12; Lenda (40) só com constância acima da média. Quem faz pouco (60 XP por dia) fecha perto do 28.

| Quando | Ganha | Libera (nível mínimo) |
|---|---|---|
| Todo nível | 1 material à escolha (no modal) + fala do Sábio | |
| 5 (Aprendiz) | 1 esmeralda + título | picareta de pedra; boné, camisa do time |
| 10 (Madeira) | 1 diamante + cosmético exclusivo | picareta de ferro, botas; capacete decorativo |
| 15 (Pedra) | 1 esmeralda | capacete (escudo), lanterna; pets |
| 20 (Ferro) | 1 diamante + cosmético exclusivo | picareta de ouro; capas; 2a meta no Cofrinho |
| 25 (Ouro) | 1 esmeralda | capa |
| 30 (Diamante) | 1 diamante + cosmético exclusivo | picareta de diamante; premium (coroa) |
| 35 (Esmeralda) | 1 esmeralda | |
| 40 (Lenda) | coroa de Lenda + estrela | Expansão do terreno (Etapa 4) |

Patentes da temporada dão 4 esmeraldas e 3 diamantes: quem nunca tira 8/8 ainda chega à picareta de diamante. Sem gold por nível (gold é trabalho).

### Preços em dias de renda

| Faixa | Dias | Gold (D = 45) | Prêmios reais | Loja |
|---|---|---|---|---|
| Mimo | 0,5 | 20-25 | sobremesa, 20 min de tela | penteado |
| Pequeno | 1 | 45 | sorvete, escolher o jantar | boné, camisa |
| Médio | 3 | 135 | pizza, filme, dormir tarde | pets, capa |
| Grande | 7 | 315 | passeio, brinquedo pequeno | coroa, premium |
| Enorme | 20 | 900 | jogo, Lego grande: **só por meta no Cofrinho** | |
| Temporada | 50 | 2.250 | bicicleta: só por meta, fecha com a estrela | |

Regra para o pai: "um prêmio de N dias custa N vezes o que ele ganha num dia normal". O `RewardForm` mostra `R7` e botões por faixa; o preço fica fixo depois de cadastrado e é revisado uma vez por mês.

### Materiais

Produção de 9 a 17 por dia (muito mais do que os custos atuais previam). Ajustes: construções com custo x2 em madeira, pedra e ferro (base completa em 3 semanas, não em 10 dias), redstone fora da troca 3:1 do Ferreiro (segura ouro e diamante), Comerciante compra 10 materiais por 3 gold com 2 vendas por dia (antecipar da Etapa 4 para a 2: é o ralo terminal), decorações em materiais (absorvem o excedente).

### Controles de inflação

1. Cotas por fonte e tela "Dia fechado"; nada repetível.
2. Tetos: `gameGoldDailyCap`, `challengeGoldWeeklyCap` (60), `achievementGoldCap` (40).
3. Régua atrelada à renda: `R7` nos prêmios, `goldPriceMultiplier` na Loja; ação "Reajustar prêmios x1,1 / x0,9" no painel.
4. Ralos que crescem com a temporada: catálogo gira, decorações, Expansão, prêmio da temporada.
5. Cartão **Balança** no painel (28 dias de `goldTransactions`): ganho por fonte, gasto por ralo, guardado, saldo em D, taxa de poupança (alvo 20%), alertas "saldo parado > 14 D", "nada comprado há 21 dias", "gold de jogo > 30%". Módulo puro `balance.ts` com testes.
6. Curva e tabela só mudam entre temporadas; toda fonte nova de gold ou XP entra atualizando a tabela e rodando `scripts/econ-sim.mjs` (simulador de 91 dias com três perfis, a criar).

### Botões novos em `settings/economy`

`incomeDayGold` 45 (reserva de `R7`), `quizGoldPerHit` 2 / `quizXpPerHit` 6, `dailyChestGold` [10, 15], `gameGoldDailyCap` 35, `levelCurve { base: 50, step: 10 }`, `levelCap` 40, `seasonWeeks` 13, `buildCostMultiplier` 2, `challengeGoldWeeklyCap` 60, `achievementGoldCap` 40, `merchantBuy { materials: 10, gold: 3, dailyCap: 2 }`, `savingsTargetPct` 20; `interestRatePct` e `interestCapGold` mudam de `settings/village` para cá. Regra de operação: um botão por vez, no domingo, e esperar 7 dias.

### O que muda no código (quando aprovado)

`levelSystem.ts` (fórmula, teto 40, títulos a cada 5), `rules.ts` (`PRICE_BANDS`, `MAX_LEVEL`, `allDoneBonus` 0), `village.ts` (`LEVEL_REWARDS`, `GEAR[].minLevel`, `COSMETICS[].minLevel`, `DEFAULT_ECONOMY`), `villageAchievements.ts` (alvos 5/10/20/30/40), `grantLevelGift` (material à escolha e raro nas chaves `level:<temporada>:<n>`), `chest.ts` (escada por tochas), `quizRewards` linear, `RewardForm` (faixas), `village/{uid}.seasonStartXP` e `seasonHistory`, puros novos `income.ts`, `levels.ts` e `balance.ts` com testes. A Etapa 1 (em andamento) não precisa parar: a curva entra na "nova fase"; Baú em escada, `minLevel` e Comerciante entram na Etapa 2.

### Decisões do pai (15/09/2026)

1. **Teto de nível por temporada**: 40.
2. **Gold ao subir de patente**: nenhum; patente dá raro, título e cosmético exclusivo.
3. **Prova**: 2 gold + 6 XP por acerto, linear; 8/8 dá esmeralda.
4. **Baú do Dia no lugar do bônus de dia completo**: sim; `allDoneBonus` vira 0.
5. **Prêmios Enormes só pelo Cofrinho**: sim.
6. **Quando aplicar a curva nova**: na "nova fase" de 18/09.
7. **Custo das construções x2**: sim.
8. **Comerciante já na Etapa 2**: sim.


## Etapas

Cada etapa tem: objetivo, pré-requisitos, entregas, arquivos, frentes paralelas (arquivos disjuntos), aceite e "não fazer". Uma IA executando uma etapa lê este documento inteiro, o documento de API da etapa anterior e os arquivos citados; constrói módulos puros primeiro (com testes), depois serviços, telas e painel em paralelo, depois integra e testa no navegador (Playwright já instalado no scratchpad; login "Entrar como Heitor"; o modal "Prova do dia" pode ser escondido com `display:none` no teste); termina com relatório: arquivos, decisões, saídas de tsc/eslint/testes/build, fotos, pendências. Nunca commita; o pai decide.

### Etapa 0: tema visual da tela da criança (planejada, pronta para executar; 1-2 dias)

Objetivo: tudo que o Heitor vê no tema de mina, sem mudar lógica. Especificação completa por componente, com as decisões já tomadas, em `docs/etapas/ETAPA_0_TEMA_VISUAL.md` (lote 1 até 17/09, lote 2 depois).
Depois: `DailyQuiz.tsx`, `SurpriseMissionQuiz.tsx`, `BirthdayCelebration.tsx`, `PunishmentModeScreen.tsx`, `FlashTimer.tsx` no mesmo padrão (`docs/MINER_MISSIONS_TEMA.md`), e o `ComicBackdrop.tsx` (o pai está mexendo nele para um vídeo) recebe um fundo de pedra por padrão quando o vídeo não estiver ativo. Aceite: tsc/eslint/build limpos; fotos em `docs/exemplos/telas/tema/` (desktop e 390 px) de todas as telas; zero "Flash" em texto visível (`grep -rn "Flash" src --include=*.tsx` só em identificadores).

### Etapa 1: a Vila jogável (~2 semanas)

**Estado (15/09/2026):** executada pelo Cursor a partir de `docs/etapas/ETAPA_1_VILA.md`; revisada em `docs/etapas/REVISAO_ETAPA_1.md` (6 itens altos, correções até 18/09, curva de nível nova junto com a "nova fase", hábitos viram "Dica do turno" sem botão, `allDoneBonus` 0, XP de construção 0, cosméticos sem arte escondidos). Bloqueante corrigido na revisão: a regra de `tasks` impedia a criança de concluir missão.

Objetivo: casa do jogo. Personagem + base + missões pagando materiais + Oficina + Mercado com Loja da Vila + Baú do Dia; Mina, Biblioteca (prova), Torre, Mapa, Placas e Ampulheta acessíveis da Vila.
Pré-requisitos: Etapa 0; ícones gerados pelo líder (`b_<id>_1..3.webp` para as 6 construções, `b_placa.webp`, picaretas `g_pickaxe_0..4`, `g_capa`, baús `chest_day_open`, `chest_streak`, `chest_streak_open`, distritos `d_oficina`, `d_mercado`, `d_placa`, `fx_rachadura`).
Fundação (um agente, sequencial): `src/types/village.ts`, `src/config/village.ts` (catálogo, preços, efeitos, loot, `INITIAL_VILLAGE`), `src/services/village/{loot,effects,seed,shop}.ts` puros + testes em `src/services/village/__tests__/` (estender `scripts/run-english-tests.mjs` para varrer também esse diretório; reutilizar `harness.ts`); `docs/VILA_API.md`.
Frentes paralelas:
- (a) Serviço e economia: `src/services/villageService.ts` (`ensureVillage`, `subscribeVillage` no padrão de `subscribeBase`, `openDailyChest`, `openStreakChest`, `buyCosmetic`, `craftGear`, `saveCharacter`, todos em `runTransaction` tocando `village` + `englishBase.materials` + `progress.availableGold` + `goldTransactions`; conteúdo do baú determinístico por `hash(uid + date)`); `FirestoreService.completeTaskWithRewards(taskId, userId, xp, gold, loot?)` vira transação que confere `lastCompletedDate !== today` e soma `englishBase.materials` e `taskCompletions.materialsEarned`; `DataContext.completeTask` calcula o loot com `computeTaskLoot(period, gear, completionsToday)` e o toast diz "+5 gold, +1 madeira"; `firestore.rules` (`village`); `types/index.ts` (fontes novas); `GoldHistory` (rótulos).
- (b) Telas: `src/contexts/VillageContext.tsx` (assina `village` e `englishBase`), `src/components/hero/village/{VillageHome,VillageScene,DistrictNav,DailyChest,Oficina,Mercado}.tsx`; `HeroPanel.tsx` passa a renderizar `VillageHome` (cabeçalho, cena com personagem e lotes 3x2, chips de materiais e raros, Baú do Dia, Quadro de Missões inline, grade de distritos: Mina = `EnglishBase`, Biblioteca = `DailyQuiz`, Oficina, Mercado com abas "Prêmios de verdade" = `RewardsPanel` atual e "Loja da Vila", Torre = `AchievementsBadges` em modal, Mapa = `CalendarModal`, Placas = `FlashReminders` em faixa, Ampulheta = `FlashTimer`); `mc-hotbar` fixa embaixo no celular (Vila, Missões, Mina, Oficina, Mercado); modal aberto usa `history.pushState` para o botão voltar do Android fechar.
- (c) Personagem por código: `src/components/hero/village/character/{skinModel,palette,drawCharacter}.ts`, `CharacterCanvas.tsx` (também `toDataURL` para o avatar do cabeçalho), `CharacterEditor.tsx` (abas pele/cabelo/roupa/acessórios/pet; item travado mostra preço e "Comprar"). Camadas 16x32 em templates de texto (técnica de `LISTEN_ICON` em `mine/render.ts`), ordem: capa, corpo, calça, botas, camisa, cabeça, cabelo, chapéu/capacete, ferramenta, pet ao lado; `imageSmoothingEnabled=false`; balanço de 2 quadros.
- (d) Construções por nível: `config/englishBase.ts` ganha `buildingIcon(id, level)` (placa no nível 0 com o nome e o ícone n1 em cinza; ícone próprio nos níveis 1-3); painel: aba "Vila" em `ParentPanel.tsx` + `src/components/parent/VillageManager.tsx` (visão do doc, `settings/village`).
Aceite: tsc/eslint/build/testes limpos; testes de loot (período → material; picareta; baú determinístico; capacete uma vez por semana ISO); no navegador: concluir missão soma gold e material (na cena e em `englishBase`); dia completo abre o Baú uma única vez (segundo aparelho vê aberto); compra debita gold com linha `village_shop` e nunca negativa; personagem persiste; todos os distritos abrem; Mina intocada; painel igual salvo a aba nova. Fotos em `docs/exemplos/telas/vila/`.
Não fazer: mexer em `englishBase` além de `materials`; mudar regras de punição/penalidade; criar custo obrigatório em gold.

### Etapa 2: efeitos, baús, Banco da Vila e desafios (~2 semanas)

**Arquivo da etapa:** `docs/etapas/ETAPA_2_BANCO_E_TEMPORADA.md` (dois lotes: Lote 1 dinheiro e regras, com a economia v2 inteira e a Cloud Function `openai`; Lote 2 autonomia, temporada, painel "Hoje" e relatório semanal). O texto abaixo é o plano original; o arquivo da etapa prevalece.

Objetivo: o equipamento importa, o dia tem clímax e ele aprende a poupar e a cumprir metas com prazo.
**Banco da Vila** (frente própria, arquivos disjuntos): módulo puro `src/services/village/bank.ts` (cálculo de juros por semana ISO com teto, validação de depósito, resumo semanal do extrato a partir de `goldTransactions`) com testes; `src/services/goalsService.ts` (`createGoal`, `depositGoal` em `runTransaction` tocando `goals` + `progress.availableGold` + `goldTransactions` `goal_deposit`, `applyWeeklyInterest` idempotente por `lastInterestWeek`, `finishGoal(goalId, 'achieved' | 'cancelled')` só para admin com `goal_withdraw` no cancelamento); `src/services/challengesService.ts` (`subscribeChallenges`, `bumpChallenge(userId, kind, value, absolute?)` chamado em `DataContext.completeTask`, `updateStreak`, `completeDailyQuiz`, `englishBaseService.completeContract` e na Oficina de Redstone; ao completar paga XP/gold via `adjustUserXP/adjustUserGold` + `createGoldTransaction('challenge')`); regras em `firestore.rules` (`goals`: criança cria/lê/atualiza `savedGold` só via transação própria, fechamento admin; `challenges`: leitura pela criança, escrita admin). Telas: construção nova **Cofre** na cena da vila (7º lote, ícone `b_cofre_1..3` conforme o total guardado: 0-99, 100-299, 300+) que abre `Cofrinho.tsx` (metas abertas com barra, "Guardar" com valor, meta batida mostra "Avise seu pai"), `Extrato.tsx` (semana atual e anteriores, frase do Sábio), `DesafiosCard.tsx` (desafios da semana com prazo e progresso, no topo da Vila abaixo das missões); Loja e Prêmios com o atalho "Criar meta no Cofrinho". Painel: `GoalsPanel.tsx` (aprovar/cancelar metas, ver histórico) e `ChallengeManager.tsx` (criar desafios; modelos prontos: "5 dias seguidos", "20 missões na semana", "prova 8/8 duas vezes", "3 contratos de inglês por dia durante 5 dias"), adaptados da V2 (`appheitor-v2/src/components/parent/GoalsPanel.tsx`, `ChallengeManager.tsx`, `LedgerList.tsx`) para o Firestore e para o visual dos painéis atuais.
Aceite do Banco: depositar debita o saldo e cria a linha `goal_deposit`; saldo nunca negativo; juros aplicados uma vez por semana com teto; cancelar devolve exatamente o guardado; meta alcançada some do saldo só quando o responsável fecha; desafios avançam nos cinco eventos e pagam uma vez; extrato bate com `goldTransactions`.
**Efeitos e baús**: picareta em `computeTaskLoot`; botas em `DataContext.completeTask` (+20% XP arredondado); capacete em `dailyRulesService.closeDay` (lê `village`, reduz `missed` em 1 uma vez por semana ISO, grava `shield.helmetWeek` na mesma transação); lanterna em `ContractBoard` (mostra amanhã) e `DailyQuiz` (tema de amanhã) e 1 Dica grátis no Recado; esmeralda no 8/8 da prova (`DailyQuiz.tsx` via `villageService.grantRare`); Baú das 7 tochas (`progress.streak`); invasão de creepers (`PunishmentModeScreen` mantém regras; cena mostra rachaduras por lote que somem a cada 10 tarefas; Mina e Loja também travam, como hoje); Mapa do mês com materiais por dia (`taskCompletions.materialsEarned`); sons (`createMineSfx.checkpoint/unlock` nos baús, `playLevelUp` ao craftar); painel: presentear item, zerar personagem, ver baús abertos.
Aceite: um dia jogado com cada equipamento mostrando o efeito no toast, no histórico de gold e nos testes puros; capacete nunca absorve duas vezes na mesma semana; nada disso muda `closeDay` para dias de férias.

### Etapa 3: aprender em toda interação (~2 semanas)

Objetivo: filosofia, lógica, caráter e conhecimento entram no jogo de forma natural, sem virar lição. Tudo gerado ou selecionado por código/IA; o pai só aprova no painel.
- **Biblioteca / Livro do dia**: a prova diária vira uma conversa com o "Sábio da Vila" (personagem fixo, retrato pixel): a ideia do dia é apresentada como história curta (2-3 falas) antes das perguntas (reaproveitar `dailyQuizzes.theme.lesson` e `whyItMatters`; `DailyQuiz.tsx` só muda a apresentação); a reflexão dele vira página do **Diário do Minerador** (`dailyQuizzes.reflection` já existe; tela nova `Diario.tsx` lista as reflexões por data; o pai vê no painel). Recompensa: mantém `quizRewards`; 8/8 dá esmeralda (Etapa 2).
- **Oficina de Redstone (lógica)**: 3 desafios por dia gerados por código, determinísticos por data e nível, sem IA: circuitos com alavancas e lâmpadas (E/OU/NÃO), sequências ("o que vem depois"), padrões, ordenar passos de um algoritmo, enigmas numéricos; explicação em PT de uma linha ao errar e uma segunda tentativa; paga redstone (0-3) e XP; módulo puro `src/services/village/logic.ts` com testes; tela `RedstoneWorkshop.tsx` dentro da Oficina. Dificuldade sobe com o nível da base.
- **Falas dos personagens**: Comerciante, Ferreiro, Sábio e Olheiro falam em PT ao abrir cada distrito, uma frase por dia: curiosidade, provérbio explicado, pergunta para pensar (banco em código com 200+ falas, `src/data/villageLines.ts`, sem repetir 60 dias; pacotes semanais gerados por IA a partir de `quizCurriculum.ts` e aprovados no painel).
- **Cartas com dilema**: as Cartas da Mina (inglês) já têm pergunta de decisão; passa a existir 1 Carta por semana em português, do Olheiro, com dilema de caráter (honestidade, esforço, empatia) e 3 escolhas comentadas (sem certo/errado punitivo; paga pedra e uma fala do Sábio).
- **Expedição do conhecimento**: a missão surpresa (30 perguntas) vira um mapa com 5 checkpoints por matéria, recompensa por checkpoint; mesma geração e mesmos dados (`dailySurpriseMissionStatus`).
- **Conquistas de aprendizado**: tipos novos em `checkAchievements` (`quiz_perfect`, `reflections`, `logic`, `english_words`) com prêmios do pai.
- **Relatório da semana** no painel: temas da prova, reflexões, palavras de inglês dominadas, desafios de lógica, materiais e construções.
Aceite: `logic.ts` com 100% dos desafios resolvíveis e explicados (teste em Node gera 365 dias x 3 níveis); prova continua obrigatória e idêntica nos dados; falas nunca repetem em 60 dias (teste); fotos das telas.

### Etapa 4: vida na vila (~2 semanas)

Datas especiais (`events`, painel `EventManager.tsx` adaptado da V2: o pai cadastra datas com bônus e mensagem; a vila celebra uma vez por ano, como o aniversário), feed de **Novidades** na Placa da vila (a coleção `notifications` já existe: mostrar as últimas 10 para a criança, marcar lidas), decorações posicionáveis (`village.decor`, Loja da Vila), pets animados ao lado do personagem, Campinho com efeito (n1 libera pet, n3 bônus de fim de semana) e o mini-jogo de futebol "Gol de Placa" (goleiro grita direções em inglês, do plano da Arena), "Turno na Mina" (Mine Rush com frases, 90 s, revisão do inglês), aniversário como festa na vila (fogos em pixel, presente no baú), férias como temporada (banner e cena de dia ensolarado), capa protegendo tochas 1 dia/mês, rotação sazonal do catálogo, animações do personagem (cavar ao concluir missão, comemorar no dia completo). Se o boneco por código ficar simples demais, trocar por sprites gerados (serviço pago, ver abaixo) mantendo a mesma interface `drawCharacter`.

### Etapa 5: polimento e memória (~1 semana)

Trilha sonora chiptune (tema da vila, da mina, do baú; volume e mudo no cabeçalho, respeitando `SoundContext`), cinemática de subida de nível e de construção (3 quadros + som), primeiro acesso guiado (o Sábio apresenta a vila em 5 passos), desempenho no celular (lazy load dos módulos, imagens em `loading="lazy"`), PWA instalável (manifest, ícones, tela cheia), relatório mensal para o pai, exportação do Diário em PDF, revisão de acessibilidade (alvos de 44 px, contraste), e uma rodada de teste com o Heitor com ajustes de economia.

## Revisão v2: acréscimos obrigatórios (quatro críticos independentes: criança, educação, engenharia, operação do pai)

Estes itens corrigem lacunas do plano acima e prevalecem sobre o texto anterior quando houver conflito.

### Transversais (valem para todas as etapas)
- **Conta de teste**: criar `teste@flash.com` (role `child`, uid fixo em `.env.local`) e um seletor "Ver como: Heitor | Conta de teste" no cabeçalho do painel (`settings/testChild`). Todo teste de navegador das IAs roda na conta de teste; a conta real só entra na verificação final acompanhada pelo pai. Script `scripts/cleanup-test-account.mjs` no repositório.
- **Regras e índices**: a IA edita `firestore.rules` e `firestore.indexes.json` e roda `npx firebase-tools deploy --only firestore:rules,firestore:indexes --project app-heitor` antes do teste no navegador (não é commit), esperando o índice ficar pronto. Índices novos: `goals(userId, createdAt desc)`, `challenges(userId, endsOn)`, `events(userId, eventOn)`.
- **Nenhuma funcionalidade nova usa `adjustUserGold`/`adjustUserXP`** (não atômicos): todo pagamento novo (baú, desafio, juros, conserto, missão própria) é `runTransaction` que lê `progress`, grava saldo e a linha de `goldTransactions` no mesmo `tx`. `updateStreak` e `completeTaskWithRewards` viram `runTransaction` na Etapa 1 (concluir missão passa a exigir conexão: toast "Sem internet: a missão não foi salva" e desfazer o otimista).
- **Regras literais** para escrita da criança: `goals` só `savedGold`/`lastInterestWeek`/`updatedAt` com `savedGold` não decrescente e `status` inalterado (`request.resource.data.diff(resource.data).affectedKeys().hasOnly([...])`); `challenges` só `progress`/`completedAt`/`updatedAt`; `village` só o próprio doc; painel nunca cria docs da criança (`ensureVillage` só com `role === 'child'`).
- **Uma concessão por chave**: `village.claimed: Record<string, string>` com chaves fixas `daily:<date>`, `quiz8:<date>`, `streak:<n>:<dataInicioDaSequencia>`, `event:<id>:<ano>`, `challenge:<id>`, `season:<n>`; toda concessão é uma transação que recusa se a chave existe. Função pura `claimKey()` com teste.
- **Agenda única**: módulo puro `src/services/village/schedule.ts` com `dueTasksOn(tasks, date)` (dia da semana calculado da string, `createdAt` até o fim do dia) usado por `closeDay`, gate de resgate, Baú do Dia e toast de dia completo. `src/utils/isoWeek.ts` puro (`isoWeekOf('2026-09-15') -> '2026-W38'`).
- **Compatibilidade**: leituras toleram campos ausentes (`materialsEarned` ausente = 0, `source` desconhecido rotulado "Outro"); ids do catálogo nunca mudam; `goldTransactions.metadata.price` e `catalogVersion` em compras; preço = `Math.round(base * multiplier)`.
- **Observabilidade** (Fundação da Etapa 1): coleção `clientErrors` (`window.onerror` + `unhandledrejection` + catch dos serviços críticos; `{message, stack<=2KB, uid, route, appVersion, createdAt}`), doc `health/{uid}` (`lastCloseDay`, `lastQuizGenerated`, `lastPlanGenerated`, `lastInterestWeek`, `lastChestDate`), cartão "Saúde" no painel com chip vermelho quando algo passa de 1 dia, `__APP_VERSION__` no rodapé do painel.
- **Custo de IA em dólares**: `assertAiBudget` passa a cobrir prova, juiz, TTS e pacotes (não só contratos); tabela de custo por dia no `docs/MANUAL_DO_PAI.md` (ordem de grandeza: prova US$ 0,01; contratos 0,02; juiz 0,005; TTS 0,02; total < US$ 0,10/dia).
- **Privacidade**: a foto pública do Heitor (`CHILD_PHOTO_URL`) sai na Etapa 0 (avatar = `miner.webp`), e na Etapa 1 o avatar é o personagem (`toDataURL`); foto opcional só em Storage `users/{uid}/avatar` com leitura logada. PIN de 4 dígitos (hash em `users/{admin}.pinHash`) para abrir `/admin` em aparelho não marcado e logout automático da sessão do pai após 12 h. Decisão registrada: uma criança por deploy (segundo filho = novo projeto Firebase); na Etapa 5 nome, nascimento e e-mail da criança saem de `rules.ts` para `users/{childUid}` (`useChild()`).
- **Interruptores e economia sem programar**: `settings/modules` (um booleano por módulo: `shop, bank, interest, logic, lines, dilemmas, mineShift, football, chat, tts, aiGeneration, music, effects`) com `useModules()` e comportamento "desligado" definido por módulo; `settings/economy` (`materialsPerTask`, `dailyChestGold [min,max]`, `streakChestGold`, `rareEveryNDays`, `gameGoldDailyCap`, `redeemMinTasks`, `taskDefaultXp/Gold`, `periodStartHours`) editado no painel com os padrões do plano.
- **Manual do pai**: `docs/MANUAL_DO_PAI.md` (rotina de 3 min/dia e 15 min/semana; o que cada ajuste faz; folga, férias, punição; economia; conta de teste; commit e deploy) entregue na Etapa 1 e atualizado por etapa. `scripts/generate-icon.mjs` entra no repositório.
- **Visibilidade**: o Diário mostra "Seu pai lê o Diário" na primeira página; presente do pai aparece na Placa; zerar personagem pede confirmação e avisa a criança; o pai vê relatórios, não as falas do dia antes da criança.
- **Servidor mínimo (decisão do pai, Etapa 2)**: com Blaze ativo, uma Cloud Function `openai` (chave em Secret Manager, teto mensal no servidor) substitui a chave no bundle; e, se ele aprovar, funções de push (`redemptions` criado → pai; meta batida → pai; `notifications` → criança; tokens em `users/{uid}.fcmTokens`). Até lá: chave no cliente com teto, e avisos só como badges no painel e na Placa.
- **Tempo de tela**: "Turno mínimo" = prova + missões (12 min) e "Turno completo" (25-30 min) escritos na tela "Hoje"; Expedição só sábado e domingo, 15 perguntas em 3 checkpoints; tela "Dia fechado" quando as cotas pagas acabam (nada mais paga hoje); a Vila entra em "noite" depois das 21h sem abrir nada novo. Aceite: um adulto fecha um dia completo em até 25 min.

### Etapa 0 (acréscimos)
- **Aniversário em 18/09**: `BirthdayCelebration.tsx` no primeiro lote, em tema de mina (fogos em pixel, presente cadastrado pelo pai no Baú de recompensas); o lançamento do nome "Miner Missions" cai no aniversário. Prazo da Etapa 0: 17/09.
- `index.html`: `lang="pt-BR"`, `manifest.webmanifest` (nome, ícones de `public/icons`, `display: standalone`, cor `#2f2a27`), `apple-touch-icon`; `public/firebase-messaging-sw.js` com título "Miner Missions" e ícone `/icons/miner-192.png`; `LoadingSpinner.tsx` no tema; avatar = `miner.webp` (sem a foto pública).
- Placas bilíngues nos títulos dos distritos ("Oficina / Workshop") já no tema; saudação do Comerciante em inglês com tradução ao toque fica para a Etapa 1.

### Etapa 1 (acréscimos)
- **Primeiro acesso**: se `village/{uid}` não existe, tela cheia "Crie seu minerador" (pele, cabelo, roupa, nome do personagem e nome da vila; sem compras), depois 3 falas do Sábio apontando Missões, Mina e Baú do Dia; grava `village.onboardedAt`; refazível no painel.
- **Prova obrigatória como portão do jogo, não modal**: a Vila e o personagem aparecem sempre; missões sempre podem ser concluídas; Mina, Baú do Dia, Mercado e Oficina ficam com cadeado até o Livro do dia; o Sábio lembra na cena. `quizRequired` continua decidindo se o portão existe.
- **Tochas únicas**: `village.fullDays` (dias completos seguidos; avança em `closeDay` quando `done >= due`; zera em dia perdido fora de folga, férias e punição) é a única tocha visível na Vila e a base do Baú das 7 tochas; `progress.streak` continua para conquistas; a fileira da Mina vira "dias na mina" só no cartão da Mina.
- **Honestidade e horário**: missão da tarde só a partir de 12h e da noite a partir de 18h (`settings/economy.periodStartHours`, pai pode desligar); Baú do Dia só depois das 18h e só com pelo menos 3 missões devidas; `revertTaskCompletion(taskId, date)` no painel ("Não foi feita"): transação que devolve XP, gold (`source: 'task_reversal'`), material e progresso de desafio, fecha o baú se aberto e grava linha no Diário com fala do Sábio, sem punição extra; contagem de reversões no relatório.
- **Base sem travar**: `completeTaskWithRewards` faz `tx.get(baseRef)` e cria o doc inicial com `userId` se não existir; Ferreiro troca 3 materiais por 1 de outro tipo (sem gold) na Oficina.
- **Level up** na Etapa 1: modal `mc-panel` com a patente nova, som e 1 material de presente (cinemática fica para a Etapa 5).
- **Identidade**: `settings/village.team { name, color1, color2 }` (camisa do time usa as cores e o número escolhido); `village.name` e nome do personagem no cabeçalho.
- **Loja**: cosméticos comuns 20-60 gold (1 dia de renda) e só 2 itens premium; pets da Loja são diferentes do pet exclusivo do Campinho (Etapa 4); item travado mostra "cerca de X dias no seu ritmo" (média de 7 dias); confirmação de compra mostra o custo de oportunidade ("Com 120 gold: prêmio X ou +6 gold por semana no cofre").
- **Placa da Vila no lugar dos Lembretes** (pai, 16/09: "esses aí não ficou legal, vamos bolar algo mais interessante e útil"): os lembretes fixos (`flashReminders`) saem. Entra uma faixa no topo da Vila com no máximo 3 itens, sempre atuais e com prazo, ordenados por hora: (1) **recados do pai** (`notices/{id}`: tipo compromisso/regra do dia/viagem/visita/recado, texto até 90 caracteres, quando e até quando, "Combinado" da criança grava `ackAt` e o pai vê "lido às 13h42"; modelos de 1 toque: treino, consulta, sem videogame hoje, visita, viagem; viagem/visita oferecem "marcar folga na Vila"; o envio avulso de notificação vira o botão "Enviar agora" da mesma tela); (2) **recados automáticos** calculados no cliente por módulo puro (`src/services/village/notices.ts`, sem gravar nada; chave `auto:<tipo>:<data>`, dispensa em `village.noticesDismissed`): "Faltam 2 missões para o Baú do Dia", "Seu aniversário é em 3 dias", "Faltam 18 gold para 'Noite de pizza': no seu ritmo, 2 dias", "Amanhã: prova sobre X", folga/férias, prazo de desafio; (3) **hábito do turno**: um micro-hábito por período com um toque de confirmação ("Bebi", "Ajeitei", "Desliguei"), sem gold nem XP, com tochas próprias (7 = hábito de ferro, 21 = de diamante e passa a aparecer 2x por semana), catálogo escolhido pelo pai (água, postura, alongar, tela, arrumar, sono, gentileza), falas em código assinadas por NPC (Ferreiro corpo, Comerciante organização, Sábio sono e tela, Olheiro gentileza), sem repetir 14 dias (`habits/{id}`, `village.habits`); (4) fala do NPC do período (Etapa 3). Depois das 21h a Placa mostra só o hábito de sono e "Amanhã: ...". Sem botão "Ocultar" e sem "peça para o papai": sempre há algo automático. Painel: aba "Placa" (recados com modelos de 1 toque) e "Hábitos" (catálogo) substituem o formulário de lembretes; mudança funcional, sem restilizar. Etapa 1: faixa, recados do pai, automáticos com dados existentes (missões, Baú, aniversário, gold para o prêmio, férias, folga) e hábitos com toque e tochas; Etapa 2: desafio-relâmpago do dia pagando 1 material e prazos de desafio; Etapa 3: falas dos NPCs e gentileza ligada ao Diário; Etapa 4: aba "Novidades" (`notifications`) na mesma Placa.
- **Prêmios de verdade do zero** (pai, 16/09): os prêmios atuais serão recadastrados pelo pai (sem migração; os antigos podem ser desativados no painel). O líder gera uma biblioteca de ~30 ícones pixel de prêmios (`public/assets/village/rewards/`: doce, sorvete, pizza, brinquedo, videogame, tempo de tela, filme, vara de pesca, bicicleta, futebol, passeio, dormir tarde, dinheiro, livro, Lego, escolha do jantar...). No painel a única mudança é funcional: `RewardForm` ganha um seletor desses ícones (grade de miniaturas) no lugar do campo de emoji; o visual do painel não muda. O `Reward.emoji` passa a aceitar o id do ícone (`reward:<nome>`), com fallback para o comportamento atual.
- **`dailyRules.enabled` ligado** com penalidade de 1 gold por missão perdida (o capacete só faz sentido assim); penalidade nunca alcança o gold guardado no Cofrinho.
- **Dia de folga**: `settings/pauseDays` (datas marcadas pelo pai em 1 clique): sem penalidade nem bônus, `fullDays` congelado, desafios `streak_days` não quebram, `closeDay` grava `paused: true`. Férias continua como temporada com multiplicador.

- **Nova fase e conquistas** (pai, 16/09): ao fim da Etapa 1 o pai aciona "Iniciar nova fase" no painel: XP e nível zerados (patentes de minerador do começo), conquistas antigas arquivadas, pacote de conquistas do Miner Missions cadastrado, gold reposto à mão pelo pai. Conquistas com tipos novos (base, tochas, equipamentos, palavras de inglês, baús) entram na Etapa 2 junto com as fontes em `checkAchievements`.

### Etapa 2 (acréscimos)
- **Punição sem pena dupla**: com punição ativa na data, `closeDay` grava `punished: true` (sem penalidade nem bônus), `fullDays` congela, `endsOn` dos desafios abertos é estendido pelos dias de punição; Biblioteca, Mina e Oficina de Redstone continuam abertas sem pagar gold nem material (o aprendizado não é castigo); Loja, Baú, Prêmios e cosméticos travam; a cena mostra rachaduras que somem ao terminar.
- **Conserto**: dia perdido deixa 1 lote rachado (`village.cracks`); fazer todas as missões de hoje remove a rachadura com animação e devolve metade da penalidade (`source: 'repair'`); o resumo de ontem termina com "Conserte hoje" (duas linhas fixas: o que aconteceu, o que fazer hoje; sem ridicularizar).
- **Missão atrasada**: até meio-dia, a missão perdida de ontem aparece com "Recuperar" por metade do gold e sem material (`taskCompletions.late: true`, uma conclusão por tarefa por dia continua valendo).
- **Cofrinho, regras fechadas**: teto de juros global por semana ISO somando as metas; máximo 2 metas abertas; juros só sobre o saldo depositado antes do início da semana; rodam no app da criança ao abrir, só para a semana corrente (sem retroativo); linha `goal_interest` com `balanceBefore == balanceAfter` e `metadata {goalId, savedBefore, savedAfter, week}`, fora de `totalGoldEarned`; `GoldTransaction.type` ganha `'saved'` (depósito, estorno, juros) e `source` ganha `'goal_achieved'`; `goals.rewardId?` preenchido pelo atalho "Criar meta no Cofrinho" e, ao fechar como `achieved`, gera `redemptions` já aprovado (dispensa o gate de 5 missões: a meta já exigiu poupar); cancelar mantém os juros pagos; botão "Pedir para cancelar" com motivo (o pai decide). Na tela chama-se "Bônus de paciência"; o Extrato mostra uma vez por mês a comparação honesta com a poupança de verdade e a métrica "guardou X% do que ganhou" (alvo 20%) com frase do Sábio.
- **Desafios**: `completeChallenge` em `runTransaction` (recusa se `completedAt` existe); estado `expired` derivado na leitura (some após 7 dias); a criança pode propor desafio (`createdBy: child`, `status: 'proposed'`); modelos prontos no painel.
- **Temporadas**: `village.season` e `seasonXP` (3 meses ou ao bater o nível 100); nível da temporada com as patentes de minerador na Vila; estrela permanente por temporada no perfil.
- **Autonomia**: "Plano do turno" de manhã (ordena as missões e escolhe 1 missão-foco que paga material em dobro); "Fechar o dia" à noite com 1 linha "amanhã eu..." no Diário; "Missão própria" (ele cria, o pai aprova, paga XP e material, nunca gold); `tasks.optional` ("Missões extras": até 1 por dia, paga 2x material, nunca conta como perdida); "Semana temática" por semana ISO em código, anunciada pela Placa na segunda.
- **Recordes**: quadro na Torre (`village.records`: melhor semana em gold, maior `fullDays`, melhor prova, recorde do Turno na Mina) e "Troféu da semana" no sábado à noite (bronze/prata/ouro comparando com a semana anterior; ouro dá 1 material raro).
- **Relatório semanal v1** já aqui (junto com o Banco): `learning/{uid}` calculado por código toda semana (acerto por categoria da prova, nível adaptativo de Redstone pelos últimos 10 resultados: >= 7 sobe, <= 3 desce; palavras dominadas; reflexões escritas; taxa de poupança); a criança vê um "Mapa de habilidades" na Torre. Painel: card "Hoje" no topo (resgates pendentes, metas batidas, desafios vencendo, dias não fechados, uso de IA > 80%, pacotes a aprovar) e abas reagrupadas em 4 grupos (Hoje, Jogo, Conteúdo, Ajustes).

### Etapa 3 (acréscimos)
- **Reflexão que fecha o ciclo**: última página da prova, mínimo 15 palavras (`settings/economy.reflectionMinWords`); esmeralda do 8/8 e +5 XP só com reflexão; no dia seguinte o Sábio responde em 2 linhas (1 chamada, `dailyQuizzes.sageReply`); o pai pode comentar (`parentComment`, aparece na Vila); domingo o Diário pergunta "das reflexões da semana, qual você usou de verdade?".
- **Prova com produção e espiral**: 1 das 8 perguntas vira resposta escrita de 1 frase julgada pela IA (cita a ideia do dia: sim/não); `quizCurriculum.ts` ganha categorias de dinheiro, saúde/sono/tela, cidadania, matemática e leitura, e `depth` 1-3: o prompt recebe a última reflexão do mesmo tema para aprofundar em vez de repetir. "Estante de erros" na Biblioteca: perguntas erradas voltam 3 e 10 dias depois (bônus de 5 XP).
- **Português e matemática**: "Capítulo da semana" (história seriada em PT de ~400 palavras no tema moral da semana e no universo dele; 3 perguntas + resposta escrita de 2 frases; paga esmeralda); "Conta do Comerciante" (2 contas por dia em contexto de compra, pagam pedra) e descontos em porcentagem no Mercado.
- **Dilemas**: 52 Cartas com dilema pré-escritas em código (2 por semana), revisadas uma vez pelo pai, sem IA; a escolha muda a fala de um NPC no dia seguinte e entra no Diário; 7 dias depois o Sábio pergunta "aconteceu algo parecido?".
- **NPCs com personalidade**: uma linha por NPC (Comerciante pão-duro e engraçado; Ferreiro de poucas palavras; Sábio só faz perguntas; Olheiro fala de futebol e caráter); banco de 200+ falas em código com 25% de humor (teste de proporção); pacote de IA só entra depois de "Aprovar tudo" no painel; sem aprovação, o banco cobre.
- **Coleção**: `village.finds` + "Museu" na Torre (cada tema da prova vira uma página, cada remetente de Carta vira um vizinho, 1 em 10 missões paga um "achado" por hash auditável, só para o Museu).

### Etapa 4 (acréscimos)
- Comerciante compra material excedente (10 materiais = 3 gold: ralo e lição de venda); "Expansão" (segundo terreno com lotes 8-12 ao chegar à base nível 18); 3 segredos codificados e listados no `docs` (ex.: clicar 5 vezes no creeper do resumo, lote secreto na base nível 12); pet exclusivo do Campinho; capa protege tochas; push de verdade se o pai aprovar o servidor mínimo.

### Etapa 5 (acréscimos)
- Manifest sem precache agressivo (ou `vite-plugin-pwa` com `autoUpdate`); `CharacterCanvas` sem `requestAnimationFrame` parado e com `prefers-reduced-motion`; dados da criança fora de `rules.ts`; cronômetro do aceite (dia completo <= 25 min).
- **Lapidação visual** (pedido do pai em 16/09): o fundo da tela do Heitor (hoje um gradiente de pedra com brilho de tochas em CSS, `ComicBackdrop` variante `mine`) ainda não agrada; refazer como cena de mina gerada por IA (parede de rocha com minérios, vigas de madeira, tochas, profundidade em camadas com parallax leve), coerente com os sprites da Vila. Revisar também espaçamentos, tamanhos de fonte e contraste tela por tela com o Heitor jogando.

## Recursos pagos recomendados (o pai topou)

1. **OpenAI** (já em uso): manter limite mensal de gasto no painel da OpenAI (sugestão US$ 20) e o teto de chamadas no app. Ícones de construção por nível podem usar `gpt-image-1` (não mini) em qualidade média para ficarem mais bonitos: centavos por ícone.
2. **Serviço de sprites pixel art com animação** (Etapa 4, opcional): PixelLab ou similar, com API para gerar personagem e animações consistentes; verificar preço atual (na faixa de US$ 10-20/mês) antes de assinar. Só se o boneco por código não agradar.
3. **Trilha sonora**: pacote chiptune com licença (itch.io / lojas de assets, US$ 10-30) ou encomenda; alternativa por IA a confirmar disponibilidade e licença.
4. **Firebase Blaze** (já ativo): criar alerta de orçamento (US$ 5/mês) no console.
5. **Domínio próprio** (opcional, Etapa 5): `minermissions.com.br` ou similar no Firebase Hosting, para o app ter endereço memorável e ícone na tela inicial.
Nada de lojas de aplicativos: o PWA resolve.

## Modo de trabalho (decisão do pai em 15/09)

- **Quem programa**: um chat do Cursor (ou outra IA) executa cada etapa a partir do arquivo da etapa em `docs/etapas/ETAPA_N_*.md`, autossuficiente (contexto, invariantes, arquivos, especificação por componente, decisões já tomadas, verificação e formato do relatório).
- **Quem coordena e revisa**: o Claude. Ao final de cada etapa, o pai pede a revisão; o Claude lê o código, roda as verificações e grava `docs/etapas/REVISAO_ETAPA_N.md` com o que ficou errado, o que faltou e o que corrigir, fazendo só pequenos ajustes diretos (o grosso volta para o Cursor, salvo se ficar problemático).
- **Git**: ao fim de cada etapa aprovada, commit no repositório como backup (mensagem "Etapa N: ..."). Antes de começar uma etapa, o pai confirma que a árvore está commitada.
- **Documento vivo**: este plano fica em `docs/MINER_MISSIONS_ROADMAP.md`; cada etapa concluída marca o que mudou e o que foi adiado.

## Protocolo para a IA que executar uma etapa

1. Ler este documento, o `docs/MINER_MISSIONS_TEMA.md`, o documento de API da etapa anterior e os arquivos citados na etapa. Não inventar regras de negócio: se algo não estiver escrito, escolher o mais simples e registrar em "Decisões" no documento de API da etapa.
2. Ordem fixa: módulos puros + testes → serviços Firebase → telas e painel em paralelo (arquivos disjuntos, contratos de assinaturas escritos antes) → integração → teste no navegador com fotos → relatório.
3. Não tocar: invariantes acima; `src/components/common/ComicBackdrop.tsx` e `src/index.css` sem combinar com o pai (ele edita com outra ferramenta); painel dos pais além da aba prevista.
4. Verificação obrigatória ao final: `npx tsc --noEmit -p tsconfig.app.json`, `npx eslint src --max-warnings 0`, `npm run test:english`, `npx vite build`, fluxo no navegador na conta de teste (`teste@flash.com`, criada na Etapa 1; até lá, na conta real, limpando os dados de teste com `scripts/cleanup-test-account.mjs` quando existir).
5. Relatório final em português: arquivos, decisões, saídas dos comandos, fotos, pendências que exigem decisão do pai. Sem commit.

## Verificação end-to-end do plano inteiro

Um dia completo do Heitor, do login ao fechamento: entra na Vila, vê personagem e base; conclui as missões (gold, XP, materiais e toast corretos; `goldTransactions` encadeadas); faz a prova (Sábio, reflexão no Diário, esmeralda no 8/8); faz 3 contratos na Mina (materiais e prêmios como hoje); resolve 3 desafios de redstone; constrói ou crafta na Oficina; compra um cosmético e vê o personagem mudar; guarda 10 gold no Cofrinho e vê a meta avançar; um desafio da semana avança; abre o Baú do Dia uma única vez; o painel do pai mostra o relatório do dia, as metas do cofre e os desafios, e os dados batem com o Firestore. Depois disso, o pai joga com ele por uma semana e a economia é ajustada em `src/config/village.ts`.
