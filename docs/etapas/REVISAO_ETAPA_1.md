# Revisão da Etapa 1 (Vila jogável)

Revisão de 15/09/2026 sobre o estado da árvore às 11h (o Cursor ainda estava fazendo ajustes pedidos pelo pai; esta revisão é uma foto desse momento). Método: verificações mecânicas, leitura do núcleo de dinheiro por mim, três revisores independentes (dinheiro/Firestore, aderência à especificação `ETAPA_1_VILA.md`, experiência da criança) e teste no navegador na conta de teste (seção 9).

## 1. Veredito

A ossatura está entregue e bate com a especificação: `village/{uid}` com parser tolerante, `settings/*` com padrões, módulos puros com testes, transações para missão, streak, loja, baú, craft, troca e reversão, telas da Vila, aba Vila e Placa no painel, "Ver como", conta de teste, observabilidade e manual. Nada do que não devia ser tocado foi tocado (`index.css`, `ComicBackdrop`, `english/**`, `englishBase` além de `materials`, regras de punição, painel além das abas previstas) e não há `adjustUserGold`/`adjustUserXP` novo.

**Ainda não está pronta para o Heitor em 18/09.** Faltam os seis itens de severidade alta da seção 4 (dois deles furam o portão da prova, um vende cosmético que não existe) e os três pedidos do pai (seção 3). O resto pode entrar depois do dia 18 sem quebrar a promessa da versão jogável.

## 2. Verificações mecânicas

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | limpo |
| `npx eslint src --max-warnings 0` | 1 aviso novo: `CharacterPreview.tsx:50` (deps do `useEffect`), além dos 6 pré-existentes de `icons/index.tsx` |
| `npm run test:english` | 9 arquivos, todos passam (agora 12/12 no `village.test.ts`, com 2 testes que eu acrescentei) |
| `npx vite build` | ok (aviso de chunk > 500 kB pré-existente) |
| Regras | publicadas pelo Cursor (`village`, `notices`, `habits`, `clientErrors`, `health`) |

## 3. Pedidos do pai (confirmados no código)

1. **Ícones na grade de distritos e na hotbar.** Hoje é só texto (`VillageHome.tsx:226` e `:240`). A spec pedia sprite/ícone e os arquivos existem em `public/assets/english/ui`. Mapa: Mina `minecart.webp`, Biblioteca `book.webp`, Oficina `crafting.webp`, Mercado `gold.webp` (ou `base/c_merchant.webp`), Torre `trophy.webp`, Mapa `map.webp`, Ampulheta `clock.webp`, Baú `chest.webp`; hotbar Vila `miner.webp`, Missões `pickaxe.webp`. Cadeado: ícone em `grayscale(1) brightness(.5)` e a linha "Faça a prova do dia". Rótulos com inicial maiúscula.
2. **Cena da vila.** Correção rápida agora: quebrar a grade do tile (espelhar a cada célula ímpar ou deslocar 32 px por linha, ou usar grama pura fora da faixa do caminho), céu noturno menos preto com lua (`ui/moon.webp`), rótulo "Sábio" e "Comerciante" sob os NPCs, cursor de mão só sobre o que é clicável. Fica para a lapidação visual (Etapa 5): balão de fala no canvas, fumaça em partículas, tochas com flicker, lotes distribuídos na largura, Ferreiro e Olheiro na cena, fundo por IA.
3. **Hábitos.** Tirar os quatro botões (`VillageHome.tsx:163-167`) e a chamada a `confirmHabit`. O que acontecia: `defaultHabitsForNow` devolve até quatro hábitos (spec: um por período), o clique repetido é ignorado no serviço mas o `wrap` do `VillageContext` mostra "Hábito feito" a cada toque, a sequência em `village.habits` nunca aparece e `HABIT_LINES` não é usado. **Nova forma:** a Placa mostra uma "Dica do turno": retrato do NPC dono do hábito (`npc/ferreiro.png` de manhã: água, postura, alongar; `npc/comerciante.png` à tarde: arrumar; `npc/sabio.png` à noite: tela e, depois das 21h, sono; `npc/olheiro.png` duas vezes por semana: gentileza) com a frase de `HABIT_LINES` escolhida por `pickLine` sem repetir 14 dias. Sem botão, sem toast. A confirmação volta na Etapa 2 dentro de "Fechar o dia" (uma pergunta só, uma vez por dia, sem gold). A aba Hábitos do painel vira "quais entram na rotação".

## 4. Severidade alta (obrigatório antes de 18/09)

| # | Onde | Problema | Correção | Quem |
|---|---|---|---|---|
| A1 | `HeroPanel.tsx:68-70` | O portão da prova lê `localStorage quiz_completed_<uid>_<data>`, mas ninguém grava essa chave. Ao recarregar a página com a prova feita, Mina, Baú, Oficina e Mercado ficam trancados o dia inteiro. | Em `DailyQuiz.tsx`: `useEffect(() => { if (quiz?.completed) onComplete(); }, [quiz?.completed])` e gravar a chave ao terminar. Ou derivar `quizLocked` de `dailyQuizzes/{uid}_{hoje}.completed`. | Cursor |
| A2 | `VillageHome.tsx:128` | Clicar num lote da cena abre a Oficina mesmo com o portão da prova fechado (grade, hotbar e tecla O respeitam; a cena não). | `if (id.startsWith('build:')) { if (quizLocked) onOpenQuiz(); else setDistrict('workshop'); return; }` | pequeno ajuste (eu, quando o Cursor parar) |
| A3 | `config/village.ts:200-224, 270-283` | Loja vende `hair_2/3/4` (20 gold) e `cape_blue` (120) que não mudam nada: não há sprite de cabelo e a capa azul aponta para o mesmo PNG da vermelha. Gold da criança gasto em nada. | Esconder da Loja e do editor os cosméticos sem sprite (`hasSprite(id)`), ou mostrar "Em breve" desabilitado. Eu gero os sprites que faltam depois (cabelos por inpaint, capa azul). | Cursor (filtro); eu (arte) |
| A4 | `firestoreService.ts:547` | "Não foi feita" numa missão de **ontem** devolve só a missão: o bônus de dia completo (+10) fica, a penalidade da missão perdida não é cobrada, `village.fullDays` continua contando o dia como completo e `dailyProgress` segue 6/6. | Decisão recomendada para agora: limitar o botão a conclusões de **hoje** (o dia ainda não fechou). Reversão de dia já fechado entra na Etapa 2 com estorno do bônus, penalidade e tochas. | Cursor |
| A5 | `villageService.ts:499-538` e `VillageManager.tsx:318` | "Iniciar nova fase": snapshot, XP e `season` na transação, mas arquivar e criar as 12 conquistas ficam fora dela, sem trava de duplo clique. Dois cliques = 24 conquistas ativas que pagam gold em dobro; rede caindo no meio = XP zerado sem pacote. `season` vira incremento em vez de 1; snapshot sem nível nem conquistas. | Botão desabilitado enquanto roda; recusar se já existe conquista com título do pacote; `writeBatch` para desativar+criar; snapshot com `level` e lista de conquistas; `season: 1` na primeira vez. | Cursor |
| A6 | `hooks/useModules.ts`, manual | `settings/modules.aiGeneration` e `.tts` não são lidos por serviço nenhum; o manual promete "corta o gasto de IA no mesmo instante". `modules.effects` também é ignorado (o app usa `settings/village.effectsEnabled`). | Ler `settings/modules` em `ensureDailyQuiz`, na geração de plano/contratos e no TTS, recusando com mensagem clara quando desligado; unificar `effects`. Até lá, corrigir as frases do manual. | Cursor |

## 5. Severidade média

Dinheiro, dados e regras:

- M1 `firestoreService.ts:601` reverter materiais com `increment(-qty)` deixa `englishBase.materials` negativo se a criança já gastou. Gravar `Math.max(0, atual - qty)` como faz `craftGear`.
- M2 `VillageContext.tsx:101` `wrap` mostra o toast e relança; as telas chamam com `void` e a rejeição cai em `installErrorLog`: cada "Gold insuficiente" vira um doc em `clientErrors`. `wrap` devolve boolean (sem relançar) e `logClientError` ignora erros de negócio.
- M3 `DataContext.tsx:783/948` subir de nível pela missão surpresa, ajuste de XP, prova ou conquista não dá o presente nem abre o modal (só `completeTask` faz). Extrair `onLevelUp(newLevel)` e chamar nos três pontos; para prova e conquista, comparar o nível no listener de `progress`.
- M4 `dailyRulesService.ts:266` com `dailyRules.enabled = false` o dia nunca fecha: tochas congelam e `health.lastCloseDay` fica vermelho. Remover o retorno antecipado (`closeDay` já zera penalidade e bônus quando desligado).
- M5 `firestoreService.ts:468` o portão de horário só existe na tela; o serviço aceita missão da noite de manhã. Dentro da transação: ler `settings/economy` e recusar com `PERIOD_LOCKED` (o `DataContext` já trata essa mensagem).
- M6 `villageService.ts:168` `subscribeVillage` chama `ensureVillage` para qualquer papel: abrir a aba Vila no painel cria o doc da criança pelo pai. Tirar a chamada do subscribe (o `VillageProvider` já cria para `role === 'child'`). Pequeno ajuste.
- M7 `PlacaManager.tsx:43` "hoje" em UTC: depois das 21h o recado e a folga caem no dia seguinte. Usar `getTodayBrazil()`. Pequeno ajuste.
- M8 `VillageHome.tsx:105-109` a Placa recebe `nearestReward: null`, `avgGoldPerDay: 10`, `tomorrowQuizTitle: null`, `vacation: false` fixos, e o Mercado calcula "dias no seu ritmo" como `preço / 10`. Os recados automáticos de gold para o prêmio, prova de amanhã e férias nunca aparecem. Calcular `avgGoldPerDay` uma vez no `VillageContext` (média de 7 dias de `goldTransactions` ganhas), `nearestReward` = prêmio ativo mais barato que ele ainda não cobre, `vacation` do `VacationContext`, título da prova de amanhã de `dailyQuizzes`.
- M9 `VillageManager.tsx:336` Saúde: `lastQuizGenerated` e `lastPlanGenerated` nunca são gravados (chamar `touchHealth` em `ensureDailyQuiz` e na geração do plano) e "vermelho" dispara com valor < hoje quando a regra é "passou de 1 dia" (comparar com ontem).
- M10 `RewardsPanel.tsx` usa a constante `REDEEM_MIN_TASKS` em 10 lugares enquanto `redeemReward` usa `settings/economy.redeemMinTasks`: com 3 no painel a tela diz "Faça 5 missões". Mover o `RewardsPanel` para dentro do `VillageProvider` e usar `economy.redeemMinTasks`.

Telas:

- M11 `DailyChest.tsx` abrir o Baú não mostra o que veio (o `then(() => undefined)` descarta o conteúdo). Devolver `contents` e mostrar "+12 gold, +1 madeira, +1 esmeralda" com ícones e `mc-pop`; a animação de 3 quadros pode ficar para a Etapa 5.
- M12 `Oficina.tsx` construir sem custo na tela, "Falta material" mascarando "Bloqueada: precisa de Fornalha e Baú nível 1", `buildUpgrade` sem try/catch (falha some sem toast), XP de construção descartado (na Base ele é pago). Craftar sempre habilitado e só depois "Faltam materiais"; itens sem imagem (`items/*.png` já existem); Ferreiro sem fala.
- M13 `Mercado.tsx:131-146` aba "Prêmios de verdade" abre o painel antigo por cima e deixa o Mercado em branco ao fechar; texto "guardar para depois ou guardar para depois" sem prêmio; custo de oportunidade com prêmio mais caro que o item.
- M14 `HeroHeader.tsx:49` chip "dias seguidos" mostra `progress.streak`; `village.fullDays` (a tocha que o jogo usa) não aparece em lugar nenhum. Mostrar as tochas com rótulo "dias completos".
- M15 `VillageHome.tsx:69-86` atalhos: M fecha em vez de ir às missões; Esc não fecha Prêmios, Calendário, Cronômetro nem Torre; atalhos disparam com modal aberto; `pushState` a cada abertura sem `back()` ao fechar (10 aberturas = 10 "voltar").
- M16 `VillageScene.tsx:158` cadeados desenhados em posições fixas: caem na Fornalha, no lote do Baú e **no personagem**; os outros lotes ficam sem cadeado. Desenhar sobre todos os lotes e nunca sobre o personagem.
- M17 `VillageScene.tsx:166` com `prefers-reduced-motion` a cena fica vazia até algo mudar (imagens ainda carregando na única passada). `onload` que redesenha.
- M18 `VillageHome.tsx:120` Sábio travado só mostra "Antes de minerar, o livro do dia" com "Ok"; spec: abre a prova. Falas do Comerciante por `hour % 3` repetem a hora inteira; usar `pickLine`.
- M19 `config/englishBase.ts:154` `VILLAGE_BUILDING_FILES` conhece 5 PNG; os outros 14 já gerados (cerca, torre, mesa, baú 2-3, campinho 2-3, placa) nunca são usados. Trocar o Set pela lista completa ou sempre devolver `/assets/village/buildings/<id>-<nível>.png` com fallback.
- M20 `config/rewardIcons.ts` lista 12 ids sem arquivo (dormir, parque, cinema, música, desenho, lanche, pôster, bola, jogo, acampamento, massagem, surpresa) e ignora 11 PNG existentes (carrinho, chuteira, hambúrguer, mochila, pelúcia, pipoca, presente, refrigerante, skate, tablet, tabuleiro). Reescrever a partir dos 30 arquivos reais de `public/assets/village/rewards`.

## 6. Severidade baixa

`DataContext.tsx:428` todo erro vira "Sem internet" (mapear por código); `DataContext.tsx:336` bônus da picareta calculado do estado local (dois cliques rápidos dão o +1 duas vezes; guardar `inFlight`); `firestoreService.ts:533` `metadata.period` pode ficar `undefined` aninhado (usar `?? null`); `DataContext.tsx:542` filtro `includes('5 missões hoje')` quebra com outro mínimo; `villageService.ts:194` "Zerar personagem" apaga cosméticos comprados e equipamentos sem estorno (resetar só o visual); `villageService.ts:483` editar recado zera `ackAt` e `createdAt`; `villageService.ts:180` `completeOnboarding` não valida peças nem `onboardedAt`; `firestore.rules:288` `clientErrors` sem validar `uid`, tamanho e campos; `cleanup-test-account.mjs` com senha padrão embutida e sem resetar `tasks`; `VillageHome.tsx:176` faixa "Hoje" ("Turno mínimo" com 0/0, "completo" só após o Baú, "MISSÕES" com Õ na fonte pixel, raros sem ícone); `Onboarding.tsx:80` aba Cabelo com uma opção que mostra a pele, passo do Sábio sem o Sábio, inputs fora do tema; `CharacterEditor.tsx` abas abaixo de 44 px, preço em 9 px, `basePrice` sem multiplicador, Mercado sem chip de gold e "Comprar" ativo com saldo zero; `docs/VILA_API.md` sem `characterBaseSrc`, `SKIN_SPRITE`, `HAT_SPRITE`, `CAPE_SPRITE`, `PET_SPRITE`, `HABIT_BY_ID`, `ChestBlockReason`, `drawCharacter.ts`/`CharacterPreview.tsx`; manual sem a tabela de custo de IA em dólares.

## 7. O que faltou da especificação (consolidado)

- §6 Placa: recados automáticos de gold para o prêmio, prova de amanhã e férias (M8); hábito um por período com fala assinada (seção 3); "lido às HH:MM" e "Enviar agora" no painel.
- §6 DailyChest: conteúdo do baú na tela e animação (M11).
- §6 VillageScene: cadeados nos lugares certos (M16), falas sem repetir no dia (M18), tochas/fumaça/balão (Etapa 5).
- §6 Oficina e Mercado: custos, Ferreiro falando, média de 7 dias, custo de oportunidade certo (M12, M13).
- §5 serviço: portão de horário na transação (M5); `checkLevelUp` chamando `grantLevelGift` em todo caminho de XP (M3); `health` da prova e do plano (M9).
- §7 "Iniciar nova fase" atômica com `season = 1` (A5).
- §2 `settings/modules` com comportamento (A6).
- §11.3 aceite no navegador: 8 fluxos sem foto no relatório do Cursor (a conta de teste não tinha missões; eu semeei 3 missões, 100 gold, 95 XP e 10 de cada material, e o teste está na seção 9).
- Relatório sem registrar em "Decisões" os desvios feitos (média fixa de 10 gold/dia, hábitos fixos sem `habits/{id}`, falas por `hour % 3`, `modules.effects` ignorado, aba de prêmios abrindo o modal antigo, nova fase parcial fora da transação, `CharacterPreview.tsx`/`drawCharacter.ts` fora da lista de novos).

## 8. O que eu já corrigi nesta revisão

Só em arquivos que o Cursor não estava editando:

- `src/services/dailyRulesService.ts`: `isPunishedOn` comparava datas em UTC e só punições `isActive` (punição ligada às 21h de terça não cobria a terça; punição encerrada antes do fechamento cobrava o dia). Agora olha todas as punições do usuário, encerra em `deactivatedAt` quando existe e compara no fuso do Brasil. `closeDay` zerava as tochas em dia sem missão devida (fim de semana com missões só de semana); agora usa `nextFullDays`.
- `src/services/village/schedule.ts`: novas funções puras `nextFullDays` e `rangeCoversDate`, com testes em `village.test.ts` (12/12).
- `firestore.rules` (publicado): a criança pode atualizar `status`, `lastCompletedDate` e `updatedAt` da própria missão; sem isso nenhuma missão era concluída (seção 9).

Ajustes pequenos que eu aplico assim que o Cursor parar de editar (para não pisar no trabalho dele): A2, M6, M7, M1.

## 9. Teste no navegador (conta de teste)

Chromium 1280x720, fuso do Brasil, 11h16 às 11h35. Fotos, snapshots do Firestore e scripts em `scratchpad/e2e/` (fora do repositório). O onboarding não pôde ser testado: `village/{uid}` já tinha `onboardedAt` (alguém passou por ele antes na conta de teste).

**Bloqueante encontrado e já corrigido:** a criança não conseguia concluir **nenhuma** missão. O toast dizia "Sem internet: a missão não foi salva" e o console mostrava `Missing or insufficient permissions`. Causa: `completeTaskWithRewards` atualiza `tasks/{id}` (`status`, `lastCompletedDate`) dentro da transação, e a regra de `tasks` só deixava o admin escrever. A v1 já fazia essa escrita no `batch`, ou seja, a conclusão pela criança estava quebrada desde que as regras atuais foram publicadas (14/09), inclusive para o Heitor. **Correção aplicada por mim em `firestore.rules`** (a criança pode atualizar só `status`, `lastCompletedDate` e `updatedAt` da própria missão; título, gold, XP e período continuam só do admin), regras publicadas e verificadas por REST com o token da criança: marcar feita 200, desfazer 200, mudar título 403, mudar gold 403. Verificado no navegador em seguida: "Concluir" em "Arrumar a cama" mostrou o toast "+5 gold, +2 madeira, +10 XP" (2 madeira porque a picareta de pedra dá +1 na primeira missão do dia), "Nível 2 alcançado" e o modal de nível com "+1 madeira de presente"; no Firestore: `goldTransactions` `task_completion` 70 para 75, `taskCompletions.materialsEarned {madeira: 2}`, `village.claimed['level:2']`, madeira 7 para 10. Sem erros de console.

O que funcionou: login pela conta de teste; "Mais tarde" na prova; Vila inteira sem rolagem horizontal; portão de horário ("Abre às 12h" e "Abre às 18h" desabilitados); Baú "Abre às 18h"; Oficina: Fornalha subiu para o nível 1 (materiais 10/10/10 para 9/9/9), picareta de pedra craftada ("Equipamento pronto", `village.gear.pickaxe = 1`), troca 3 ferro por 1 pedra ("Troca feita"); Mercado: boné por 30 gold ("Item comprado", `goldTransactions` `village_shop` 100 para 70, `owned` e `character.hat` atualizados), recompra impossível; editor: camisa e calça salvas ("Visual salvo"), persistiram após recarregar e o avatar do cabeçalho mudou; NPCs falam; todos os distritos e a hotbar abrem; painel: "Ver como conta de teste", aba Vila, "Não foi feita" desfaz a conclusão (`reverted: true`, `task_reversal` de 5 gold, materiais devolvidos, missão volta a pendente); as três confirmações perigosas do painel pedem confirmação.

O que falhou ou ficou estranho (além do bloqueante):
- Construir a Fornalha não mostra toast nem custo; "Falta material" não diz qual (M12).
- Confirmação de compra: "Com 30 gold: guardar para depois ou guardar para depois." (M13). Compra sem gold gera `pageerror` "Gold insuficiente" não tratado (M2).
- "Prêmios de verdade" abre o painel antigo por cima do Mercado; Esc fecha o de baixo (M13, M15). Esc não fecha Prova, Calendário nem Cronômetro.
- Hotbar "missões" rola para a Placa, não para as missões (pedido 1). Teclas 1 a 5 não fazem nada; b/e/o/l/m existem mas não aparecem na tela.
- Editor só abre clicando no boneco, sem dica; não há "sem chapéu"; clicar num item não comprado fecha o editor e perde o rascunho.
- Barra de XP mostra "+83 hoje" com zero missões feitas; céu noturno às 11h da manhã; Nível 1 e Nível 2 com o mesmo título ("Novato da Mina", correto pela tabela mas confuso na barra "Nível 1 para Nível 2").
- A Placa diz "Faltam 3 missões para o Baú" e a caixa Hoje diz "Abre às 18h" para o mesmo Baú.
- Hábitos: botão já feito hoje continua ativo e repete o toast (pedido 3).
- Painel: o filho aparece como uid cru em "Gerenciando filho: DydxTQ0c…" quando é a conta de teste; confirmações em `window.confirm`.
- `totalGoldEarned` não é devolvido na reversão (baixo, estatística).
- Erro intermitente de permissão em "missão surpresa" logo após trocar de pai para criança (1 vez).

Estado final da conta de teste: resetada por mim (3 missões pendentes, 100 gold, 95 XP, 10 de cada material, sem conclusões, sem transações, sem erros registrados, equipamentos e compras zerados) para o pai testar de novo. Scripts no repositório: `scripts/seed-test-account.cjs` (missões, gold, XP, materiais) e `scripts/reset-test-account.cjs` (volta a esse estado); ambos usam o token do firebase-tools, como `setup-test-account.cjs`.

## 10. Ordem sugerida para o Cursor

Até 18/09 (versão jogável do aniversário): A1, A2, A3, A4 (limitar a hoje), A5, A6 (frases do manual + leitura de `modules` na prova e no TTS), pedidos do pai 1 a 3, M11, M12 (custos e craft desabilitado), M19, M20, M14, as decisões 2 a 4 da seção 11 (`BUILD_XP` zero, `allDoneBonus` zero, cosméticos sem sprite escondidos) e a curva nova da seção 12.

Logo depois: M2, M3, M4, M5, M8, M9, M10, M13, M15, M16, M17, M18 e os itens baixos. Atualizar `VILA_API.md` e o relatório com as decisões.

Regras para o Cursor: não recriar o que já está feito; não tocar em `index.css`, `ComicBackdrop.tsx`, `english/**`; rodar `npx tsc --noEmit -p tsconfig.app.json`, `npx eslint src --max-warnings 0` (deixar em 6 avisos, os pré-existentes), `npm run test:english` e `npx vite build` ao final; anexar no relatório as fotos dos 8 fluxos de aceite na conta de teste; sem commit.

## 11. Decisões do pai (15/09/2026, todas fechadas)

1. "Não foi feita" só para conclusões de **hoje** (o botão some ou desabilita para datas anteriores). Reversão de dia fechado fica para a Etapa 2.
2. **Ninguém paga XP por construir**: `BUILD_XP` em `src/config/englishRewards.ts` vira `[0, 0, 0]` e o toast de nível ao construir na Base sai; a Oficina continua sem XP. Construir paga só a construção.
3. **`allDoneBonus` vira 0** em `DAILY_RULES_DEFAULTS` e no painel; o Baú do Dia é a única recompensa de dia completo (Etapa 2 muda o Baú para a escada por tochas; até lá fica como está).
4. Cosméticos sem sprite (`hair_2`, `hair_3`, `hair_4`, `cape_blue`) **escondidos** da Loja e do editor por um filtro `hasSprite(id)`; voltam quando a arte existir.
5. A economia v2 do roadmap foi toda aprovada (teto 40 por temporada, sem gold por patente, prova linear, Baú no lugar do bônus, prêmios enormes só pelo Cofrinho, curva nova na "nova fase" de 18/09, construções x2, Comerciante na Etapa 2). O que entra antes do dia 18 está na seção 12; o resto está em `ETAPA_2_BANCO_E_TEMPORADA.md`.

## 14. Loja da Vila em "Em breve" (decisão do pai, 15/09, tarde; entra no pacote do dia 18)

A Loja da Vila fica fechada até o Sistema de itens da Etapa 2 (`docs/VILA_ITENS.md`). Já desliguei o interruptor `settings/modules.shop = false` (o serviço já recusa compras com ele desligado). Falta na tela (Cursor, junto com a 1B): com `modules.shop === false`, a aba "Loja da Vila" do Mercado não lista item nenhum e mostra uma placa `mc-paper` com o Comerciante (`npc/comerciante.png`) e o texto "Em breve: o Comerciante está arrumando a barraca. Por enquanto, seu gold vale nos Prêmios de verdade e vai valer no Banco." O editor de personagem mostra só as peças grátis (peles e cores) e o boné já comprado; nada com preço. A grade de distritos e a hotbar continuam abrindo o Mercado na aba Prêmios de verdade. O painel continua com o interruptor para religar quando a Etapa 2 entrar.

## 13. Verificação das correções do Cursor (15/09, tarde)

O Cursor entregou o pacote "até 18/09" (relatório atualizado em `RELATORIO_ETAPA_1.md`, seção "Seção 10"). Conferido por mim:

- Mecânico: `tsc` limpo; eslint só com os 6 avisos pré-existentes; testes 9 arquivos (13/13 na vila); build ok.
- No código: A1 (`DailyQuiz` grava `quiz_completed_*` e chama `onComplete` quando a prova já está feita), A2 (lote da cena respeita o portão), A3 (cosméticos sem sprite filtrados em `config/village.ts`), A4 (reversão limitada a hoje em `VillageManager`), A5 (`writeBatch` e botão desabilitado em `startNewSeason`), A6 (`modules.aiGeneration` na prova e `modules.tts` no TTS), ícones na grade e na hotbar, hábitos substituídos pela "Dica do turno", M11 (conteúdo do Baú na tela), M12 (custo e "Falta 2 pedra"), M14 (chip "dias completos"), M19 (todos os PNG de construção), M20 (30 ícones de prêmio batendo com a pasta), `BUILD_XP` zero, `allDoneBonus` zero, curva nova (`LEVEL_CAP` 40, títulos a cada 5), conquistas de nível 5/10/20/30/40, presente de nível com escolha e chave por temporada.
- No navegador (conta de teste): Vila sem botões de hábito e com a Dica do turno, ícones na grade e na hotbar, chip de dias completos; concluir "Ler 15 minutos" deu "+5 gold, +1 pedra, +10 XP"; com 125 XP a conclusão deu "Nível 3 alcançado", o modal ofereceu madeira/pedra/ferro, a escolha "pedra" gravou +1 pedra e `village.claimed['level:0:3']`. Sem erros de console. Conta de teste resetada depois.
- Meus ajustes reservados, aplicados agora: M1 (reversão grava material como valor absoluto, nunca negativo), M6 (`subscribeVillage` não cria mais o doc; só o `VillageProvider` da criança cria), M7 (`PlacaManager` usa a data do Brasil). A2 já tinha sido feito pelo Cursor. `tsc` e eslint limpos depois deles.
- Ainda pendente (bloco "logo depois", não bloqueia o dia 18): M2, M3, M4, M5, M8, M9, M10, M13, M15, M16 (a cena v2 substitui), M17 (idem), M18 e os itens baixos; `VILA_API.md`.

Observação: a curva nova já está valendo antes da "nova fase" (95 XP hoje aparecem como nível 2). Não tem efeito prático porque o Heitor só acessa o teaser até o dia 18, e a "nova fase" zera o XP.

Próximo passo: **Etapa 1B (Cena da Vila v2)**, `docs/etapas/ETAPA_1B_CENA_V2.md`, com fundo, âncoras e efeitos já no repositório em `public/assets/village/scene/`. Commit recomendado agora ("Etapa 1: Vila jogável + revisão") antes de o Cursor começar a 1B.

## 12. Curva de nível nova junto com a "nova fase" (obrigatório antes de 18/09)

A "nova fase" zera o XP; é o único momento em que a curva pode mudar sem o nível saltar. Entregar junto com o pacote do dia 18:

- `src/utils/levelSystem.ts`: `getXPForLevel(L) = 5 * (L - 1) * (L + 10)` (nível 2 = 60, 3 = 130, 5 = 300, 10 = 900, 20 = 2.850, 30 = 5.800, 40 = 9.750); `getLevelFromXP` por laço até `MAX_LEVEL = 40`; `getLevelTitle` a cada 5: 1 Novato da Mina, 5 Aprendiz da Mina, 10 Minerador de Madeira, 15 Minerador de Pedra, 20 Minerador de Ferro, 25 Minerador de Ouro, 30 Minerador de Diamante, 35 Minerador de Esmeralda, 40 Lenda da Mina. Manter os nomes exportados (`calculateLevelSystem`, `checkLevelUp`, `getNextMilestone`, `getAvatarBorderStyle`, `getLevelIcon`, `getLevelColor`), ajustando as faixas internas para 40. Constantes `LEVEL_CAP = 40` e `SEASON_WEEKS = 13` em `src/config/rules.ts`.
- `grantLevelGift(uid, level)`: chave `level:<season>:<n>` (a temporada atual vem de `village.season`; hoje é `level:<n>` e por isso a temporada 2 não daria presente); todo nível dá 1 material **à escolha** no `LevelUpModal` (três botões madeira, pedra, ferro; a escolha é gravada na mesma transação); nos múltiplos de 5 soma 1 raro (5, 15, 25, 35 esmeralda; 10, 20, 30 diamante; 40 diamante) em `village.rare`. Sem gold. Cosmético exclusivo de marco (10, 20, 30, 40) fica para a Etapa 2, quando a arte existir.
- `src/config/villageAchievements.ts`: conquistas de nível em 5, 10, 20, 30 e 40 (em vez dos alvos atuais); gold das conquistas entre 5 e 40, uma vez.
- `startNewSeason` (já corrigida por A5): grava `season: 1` na primeira vez e `progressSnapshots` com `level` calculado pela curva **antiga** antes de zerar (registro histórico).
- Testes: `village.test.ts` ganha um caso para a curva (tabela acima) e para a chave de presente por temporada.
- Painel: nada novo além do já previsto; o pai repõe o gold à mão depois da nova fase, como combinado.
