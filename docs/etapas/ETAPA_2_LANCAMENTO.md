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
3. O minerador **anda até o ponto clicado** (charme visual, sem física, sem teclado). A porta de cada lugar continua sendo o clique no lugar; ele anda até a porta e o lugar abre quando ele chega (nada de abrir no meio do caminho; teto de segurança de 4 s só para viagem travada). **Reafirmado em 18/09: o andar não sai; teletransporte não.** (`docs/MUNDO.md` §1 e §5; item 4 da varredura na revisão.)
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
14. **Níveis de construção sem efeito** (revisão das construções, 17/09, 14h30): a Biblioteca ganha efeito real já no domingo (nível 2: "Como você vai" na Biblioteca e a revisita da prova; nível 3: dica grátis no Recado, que já existe, e revisita pagando o dobro); o Cofre nível 3 fica **trancado** ("Abre na Etapa 3", sem cobrar); os textos da Torre nível 3 (sai "propor desafios", entra "Mapa de habilidades e Histórias") e do Armazém nível 1 (sai o Campinho) são corrigidos. Entra como P4.12 e P5 (8.4).
15. **Fechar o dia v2** (pedido do pai em 17/09 à noite, ao ver a tela): saem as quatro perguntas de sim/não ("Bebi água?", "Alonguei?", "Fui gentil?", "Tela no limite?"), que são autorrelato sem consequência (a mesma regra que tirou os botões de hábito na Etapa 1: hábito é dica dos NPCs, não botão). Fica o que importa: o resumo automático do dia, um toque de "como foi o dia" e uma frase para amanhã. Desenho em P2.6.
16. **"Criar missão" sai da tela da criança** (pedido do pai em 17/09 à noite): o formulário "Criar missão. O papai aprova. Paga XP e material, nunca gold." da aba Missões (`DailyChecklist.tsx:239-270`) some. A ideia (o Heitor propor algo ao pai) volta na Etapa 3 com desenho próprio, junto do Diário; até lá, pedido é conversa. O caminho de aprovação no painel continua no código (a seção "Missões propostas" só aparece quando existe proposta, e não vai existir). P2.7.
17. **"Plano do turno" sai** (pedido do pai em 17/09 à noite: "está inútil"). Reordenar missões não muda nada que ele sinta, e o Foco escondido numa aba com prazo de meio-dia não é escolha, é burocracia. A aba some; a **missão-foco** (material em dobro, uma por dia) vira um botão na própria lista de Missões. P2.8.
18. **Prioridade invertida (17/09, 21h)**: o laço do dia da criança (Casa com missões, concluir, prova, Mina, Baú, Fechar o dia, Placa) é lapidado **antes** do P3. O P2 passa a ser "Telas da criança lapidadas" e é o próximo pacote do Cursor; o P3 (scripts) vem depois, ainda na sexta. Toda tela da criança é aceita em **1280x720 e 1920x1080** (PC; o Heitor não joga no celular) com foto: nada cortado, nada fora do alcance do clique, nada sobreposto.
19. **"Recuperar" sai** (pedido do pai em 18/09 de manhã, ao ver a lista "Recuperar: ..." com uma linha por missão perdida): a missão recuperada até meio-dia (metade do gold, sem material) vira uma lista de botões amarelos que compete com as missões de hoje e confunde a consequência ("perdi ou não perdi?"). Sai da tela; missão perdida é missão perdida, o conserto da obra continua sendo o caminho de reparar (todas as de hoje feitas). P2.10.
20. **Missão do dia vale o dia inteiro** (pedido do pai em 18/09): nada de trancar a missão da tarde até as 12h nem a da noite até as 18h; o Heitor faz as do dia na ordem que quiser. `DEFAULT_ECONOMY.periodGating` passa a `false` (feito por mim em 18/09, com o teste em `village.test.ts`); o interruptor continua no painel (Economia) para quem quiser voltar a trancar. Os períodos continuam existindo para a lista (manhã, tarde, noite), para o material por período e para as obras que caem. Junto: a lista "Recuperar" saiu de `DailyChecklist.tsx` (decisão 19, feito por mim).
21. **Sem `zoom` em tela larga** (18/09): o `zoom: 1.25` que o Cursor pôs em `.mn-child-scale` para 1920x1080 borra texto e cena no Firefox (rasteriza a página). Removido por mim. O item P2.15 vira: tamanhos em `rem` com `clamp()` para a tela da criança crescer em 1920, nunca `zoom` nem `transform: scale`.
22. **Missão-foco sai** (pedido do pai em 18/09: "sem sentido e muito fácil de bugar"). O botão "Foco", o selo "Foco · 2x material" e o toast saem da lista; `completeTaskWithRewards` nunca mais paga material em dobro por foco (`DataContext`: `focus = false`); `village.plan` e `savePlan` ficam sem uso até a Etapa 3. Feito por mim em 18/09. O P2.8 vira só "Plano do turno fora" (já feito pelo Cursor).
23. **Gold pela metade e recompensa só de primeira** (pedido do pai em 18/09, feito por mim no mesmo dia): (a) todo gold cai pela metade: `DEFAULT_ECONOMY` (Baú 5 a 8, prova 1 por acerto, teto dos jogos 18 por dia e 50 por semana, missão nova 3, Comerciante 10 materiais por 2, juros teto 10, renda de referência 23 por dia), `GOLD_BY_MATERIAL` dos contratos ([0,2,2,3] e Recado [0,2,3,4]) e o gold das 15 missões do Heitor no Firestore (arredondado para cima, mínimo 1); XP e material não mudam; os preços dos prêmios ficam, então cada prêmio passa a custar o dobro de dias, que é a intenção. (b) **Recompensa só pelo acerto de primeira**: a criança pode tentar de novo e marcar a certa (é para aprender), mas a segunda tentativa não paga nada e não conta como acerto para material, gold, XP ou conquista; sem aviso explícito na tela. Aplicado: Ferraria (segunda tentativa vale 0 e vai para a repescagem), Comerciante (a primeira entrega decide; a segunda é para ver e corrigir), Vagoneta (fase carregada na segunda tentativa avança mas não paga). Prova do dia e Carta já eram uma tentativa por pergunta. Regra vale para todo jogo novo (`docs/MINA_CONTRATOS.md`).
24. **Missões com comprovante** (pedido do pai em 18/09): algumas missões da vida real passam a pedir prova de execução ao concluir (escrever o que aprendeu, foto, perguntas ou confirmação do pai), com a IA conferindo se faz sentido e o pai decidindo no painel. Desenho em `docs/MISSOES_COMPROVANTE.md`; entra na semana 1 da Etapa 3, antes dos contratos v2.
25. **A Mina de todas as matérias** (pedido do pai em 19/09): contratos passam a cobrir números, lógica, português e mundo (ciências, história, geografia), em galerias; o inglês vira uma galeria. Mecânica é jogo, matéria é conteúdo; economia e dados não mudam (`subject` novo nos planos e sessões). Desenho em `docs/MINA_CONTRATOS.md`, seção 8; entra na Etapa 3 depois do molde do Comerciante.
26. **Prova do dia: perguntas do nível certo, reflexão obrigatória e tempo de leitura** (pedido do pai em 19/09, depois de ler as provas de 18 e 19/09: contas de 1ª série, resposta dentro do enunciado, duas alternativas certas, fato discutível): o prompt da prova passa a exigir o nível do 5º ano por área, proibir resposta no enunciado e alternativas ambíguas, pedir três perguntas de duas etapas e uma auto-revisão antes de devolver; o modelo da prova sobe para o maior; a reflexão vira obrigatória (a prova só conta, e só paga, depois dela, mínimo 10 palavras); "Próxima" e "Começar" liberam só depois do tempo de leitura da explicação e da ideia do dia. Comando ao Cursor em 19/09.
27. **Paciência do Cofre: 10/20/30 e sem teto** (pedido do pai em 19/09, ao ver 10 gold / quatro semanas em +0): o bônus deixa de ser 5% com teto semanal. Cofre n1 = 10% (10 gold → +1 por semana), n2 = 20%, n3 = 30% (n3 continua trancado até a Etapa 3). Gold inteiro; o de hoje rende na semana que vem. Sem teto de paciência na tela e na conta (`interestCapGold` não corta). O teto de gold do jogo (baú, desafio, etc.) não muda.
28. **Resgate do Cofre** (pedido do pai em 19/09: o tempo escolhido não tinha saída): as semanas ficam gravadas (`unlockOn`). Enquanto rende, o card diz quando volta. No dia, **Resgatar** no próprio montinho do Cofrinho devolve o gold (e o que já rendeu) ao bolso. Antes disso não saca. Montinho antigo sem prazo já pode resgatar.
29. **Um montinho por aplicar** (pedido do pai em 19/09: 45 gold num bolo e +4 sem ele entender): cada Aplicar vira um card (gold, + por semana, dia do saque). Não soma em cima do anterior. Valores só **10, 20, 30, 40, 50** (10% fecha na conta: 10→+1, 20→+2). Cofre n1 até 5 montinhos, n2 até 8. Montinho antigo misturado fica até o resgate.
30. **No máximo 1 obra em ruínas por dia** (pedido do pai em 20/09): a decisão 2 permanece no resto (obra caída tranca Baú, Cofrinho, juros e Ferraria até o reparo; prova continua com a Mesa caída). Muda só o teto: várias missões não feitas no mesmo dia derrubam **uma** construção, não uma por missão. Gold de penalidade não muda.
31. **O Túnel, jogo de ação onde acertar é atacar** (pedido do pai em 19/09: "nossos jogos não têm cara de jogo de verdade"): desenho em `docs/JOGO_TUNEL.md` (Phaser em tela cheia, motor do Turno na Mina, inimigos com cartaz de desafio por galeria, Coruja do Sábio no erro, revisita, recompensa só de primeira, nunca gold). Ordem: arte e som pelo líder esta semana; fatia vertical pelo Cursor na branch `tunel` depois do Comerciante v2; só entra na `main` depois de o pai jogar. Triagem dos jogos atuais registrada na revisão de 19/09: cinco reconstruções (4 contratos e a entrada), uma melhoria (Vagoneta), Turno na Mina órfão vira semente do Túnel, missão surpresa vira Expedição.
32. **Prova do dia v3** (decisão do pai em 22/09, sobre `ETAPA_3_PROVA_V3.md`): aprovada como está — validador por pergunta em código + professor revisor (`gpt-4o-mini`) antes de gravar; gera 11, entrega 8, nunca menos; matemática sempre de duas etapas; inglês só no nível da base, com frase-contexto, áudio antes das opções e a mesma regra em três dias seguidos; explicação em dois campos (`why` e `trap`); "Próxima" só depois de `max(6 s, palavras/3 s)`; segunda tentativa depois de ler, sem pagar e sem aviso (23b); reflexão com molde e contador, 8 palavras nos 7 primeiros dias e 12 depois, com 2 palavras do tema; 8ª pergunta = revisita de erro de 3 a 10 dias (Biblioteca n2+); `quizBank` por pergunta e painel "Como ele vai". Ordem: pacotes 1 a 4 do `PROMPT_CURSOR_2026-09-22.md` antes; P0.1 já feito pelo líder.
33. **Dilema fora da nota** (22/09): a pergunta 3 vira `kind: 'dilemma'`, não entra no `score` nem paga gold; as 4 opções são atitudes reais de um menino de 10 anos (nenhuma caricata), a explicação mostra a consequência de cada uma, e a escolha fica gravada no `quizBank` para o pai ler no painel. Nada de "Não foi dessa vez" no dilema.
34. **Contratos: escrever de verdade e tentar até acertar** (22/09): no Recado, degrau 1 a bandeja traz só o `wordBank` (10-14 palavras, forma base, minúsculas) — o que faltar ele digita; a frase inteira continua no Ouvir/Ouvir devagar (R6 = A). No Comerciante, depois de dois erros ele continua tentando até acertar, sem pagar e sem aviso (23b); o Comerciante só vira a página quando o pedido fecha (F16 = A).
35. **Jogo morto fica** (22/09): `EnglishArena`, `MineRush`, `BlockMemory`, `CreeperQuiz`, `CraftingWords`, `RedstoneBench` e a dependência `phaser` permanecem no repositório como estão (F12 = C); nenhum trabalho neles até o Túnel decidir o motor.
36. **Teto de ruína por volta ao jogo** (22/09): quando `processPendingDays` fecha vários dias atrasados de uma vez, no máximo **2** obras caem na rodada; os demais dias fechados só tiram tocha. Férias marcadas no painel continuam sem ruína nenhuma (R1 dos pacotes Cofre/ruína = A).
37. **Futebol é cenário, não matéria** (pedido do pai em 22/09, ao ver "o que deve acontecer se o jogador sai do campo" na prova): a pergunta de futebol usa o jogo para ensinar outra área — conta de duas etapas (gols, minutos, pontos na tabela), ciência (curva da bola, gramado molhado), leitura de tabela ou gráfico, lógica, inglês no nível, ou decisão de capitão (dilema). Proibido regra, história, definição ou "quem é o melhor" como fim. Vale para a prova do dia (pacote 6, item 10, código `futebol_solto`) e para qualquer conteúdo novo (Túnel, contratos).
38. **A Torre aposenta o Flash** (decisão do pai em 22/09): o sistema antigo de conquistas (`achievements`/`userAchievements`, 13 itens "Flash Nível…", inativos desde o reset) sai da tela da criança e do painel (`AchievementManager`); os 13 docs ficam arquivados (`archived: true`), nada é apagado. A aba "Vida real" da Torre mostra as categorias Rotina, Agenda e Baú do catálogo novo; "Conquistas" fica com o jogo. Cartão que se explica (tier com nome, prêmio escrito, barra limitada ao alvo, ícone por família com o degrau). Recompensas (aprovadas pelo pai em 22/09): XP por tier **30 / 75 / 150 / 300** (bronze/prata/ouro/exclusiva); gold **só** nas categorias de vida real (Rotina, Agenda, Baú): **3 / 6 / 12** (bronze/prata/ouro), dentro do `achievementGoldCap` semanal de 20 que já existe; categorias de jogo (Mina, Ferraria, Obras, Banco, Amizade, Temporada, Segredos) sem gold, com material do nível da Ferraria no bronze/prata e raro (esmeralda/diamante) no ouro/exclusiva. `base_completa` conta só as obras que existem (sem Campinho).
39. **Teto de IA em dólares, não em chamadas** (decisão do pai em 22/09, depois de o teto de 800 chamadas derrubar prova, contratos e voz num dia de testes): a função `openai` só recusa quando o **custo estimado do mês** passar de **US$ 50** (tabela de preço por modelo, tokens de entrada/saída e caracteres de voz, a mesma de `aiCost.ts`); aviso no cartão Hoje e no painel a partir de US$ 40 (80%). O contador de chamadas continua sendo gravado e mostrado, mas não bloqueia nada. O limite rígido da conta OpenAI (hoje US$ 20) sobe para US$ 60, para a proteção de verdade ficar lá.
40. **Estante do Sábio: contar um livro** (pedido do pai em 22/09; desenho em `docs/LEITURA_LIVROS.md`; os seis ajustes do líder aprovados pelo pai no mesmo dia; **implementado pelo líder em 22/09**): o pai cadastra o livro quando ele entra em casa (título e páginas); a criança pode propor um, mas esse só paga com o ok do pai. Ao terminar, o Heitor conta o livro ao Sábio na Biblioteca — gostou (4 rostos), nota 0-10 opcional, texto com as próprias palavras (mínimo 50 palavras, 80 depois do 5º livro; molde tocável; colar é recusado na hora). O Sábio (`gpt-4o`) julga pelo título + texto (detalhes que só quem leu sabe; começo, meio, fim, opinião com motivo) e faz **uma pergunta de verificação** sobre um detalhe que não está no texto. Texto perfeito demais para uma criança de 10 anos nunca é recusado sozinho: pede reescrita só quando também é genérico; senão aceita e marca para o pai. Aceito paga o gold **que o pai definiu no cadastro** (as páginas só sugerem: curto até 60 páginas 8 · médio até 150 15 · longo 25; um livro curto e denso pode valer mais) + 40 XP, **um resgate por dia**, **cada livro uma vez**. Recusa nunca castiga: diz o que faltou e mantém o texto (3 tentativas por livro por dia). O pai lê tudo no painel (aba Livros), aprova, anula e deixa uma linha que o Sábio entrega. Conquistas: Primeiro livro (1), Cinco livros (5), Doze livros (12). É o primeiro comprovante da decisão 24.


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
2. `ensureVillage` encontra `onboardedAt = null` → **passo 0 "Crie seu minerador"** (cartão que já existe: nome, vila, camisa, calça) e, ao confirmar, `completeOnboarding` grava e a Vila abre **já com o tour do Sábio rodando dentro da cena** (pedido do pai em 18/09: "um tutorial guiado onde o Sábio fala e mostra os itens um por um, igual jogo de verdade", no lugar dos cartões de texto). Desenho do tour (`src/components/hero/village/VillageTour.tsx` + estado `tour` em `VillageHome`; a cena recebe `tour: { targetId, dim }`):
   - **Escurece tudo menos o alvo**: a cena pinta uma máscara escura (`rgba(8,6,4,0.62)`) por cima de tudo, com um recorte no retângulo do hotspot alvo (o mesmo `Hotspot` do `pickHit`, com 10 px de folga e cantos arredondados) e um contorno dourado pulsando (`arrivePulse`). Hotbar e Placa ficam escurecidas e sem clique durante o tour; só o alvo e o balão respondem.
   - **O Sábio anda até cada lugar** (mesma máquina de andar dos NPCs, `npcWalk`, 24 px/s, ou 3x mais rápido durante o tour) e para na porta do alvo (`door` do `anchors.json`); o balão de fala nasce dele, com nome, corações e o botão "Continuar" dentro do balão, sempre dentro da cena (regra do item 9 da varredura). O Heitor segue o Sábio um passo atrás (o herói anda para a mesma porta, 40 px ao lado).
   - **Passos** (dados em `src/data/tour.ts`, `{ id, target, lines[], action?: 'click-target' }`; a ordem é a do laço do dia): (1) alvo `casa`: "Esta é a sua Casa. Suas missões de hoje moram aqui: manhã, tarde e noite. Cada missão feita paga gold e material." (2) alvo `build:mesa` (Biblioteca): "A Biblioteca é minha. Todo dia tem uma prova aqui, curta. Sem ela, a Mina, o Mercado e a Ferraria ficam com cadeado." (3) alvo `mine`: "A Mina é onde você trabalha em inglês e ganha material para as obras." (4) alvo `build:fornalha` (lote vazio): "Com material você constrói. A Fornalha é a primeira: ela faz a Mina render mais." (5) alvo `npc:comerciante`: "O Comerciante troca material sobrando e vende prêmios de verdade, os que o seu pai cadastrou, por gold." (6) alvo `chest` (Baú do Dia): "Às 18h, com todas as missões feitas, o Baú do Dia abre. Antes de dormir, você fecha o dia na Casa e eu respondo de manhã." (7) alvo `casa`, `action: 'click-target'`: "Agora é com você. Toque na Casa e faça a primeira missão." O tour só termina quando ele **clica na Casa de verdade** (a Casa abre normalmente).
   - **Botões**: "Continuar" no balão (também tecla Enter e clique no alvo aceso); "Pular tour" pequeno no canto, que pede confirmação ("Pular? Dá para rever com o Sábio."). Sem cronômetro, sem pulos automáticos.
   - **Persistência**: `village.tourDoneAt` gravado ao terminar ou pular (chave `claimed['tour:v1']`); nunca repete sozinho. O Sábio ganha uma fala fixa "Quer ver a Vila de novo?" (`s_tour_again`, prioridade baixa) que reabre o tour a qualquer momento.
   - **Regra "um modal por vez"** vale para o tour: enquanto `tour` está ativo, nada de toast, prova, LevelUp, lembrete da Agenda, chip de aniversário ou pedido de permissão de notificação (tudo fica na fila e aparece depois do último passo).
   - **Aceite**: fotos dos 7 passos em 1280x720 e 1920x1080 (máscara, contorno, Sábio na porta, balão dentro da cena); Enter avança; clicar fora do alvo não faz nada; "Pular" grava `tourDoneAt`; recarregar no meio retoma no passo atual (`tourStep` em `localStorage`); a Casa abre no passo 7 e o tour some; teste puro de `src/data/tour.ts` (7 passos, alvos existem no `anchors.json`, textos sem emoji e com no máximo 160 caracteres).
3. `completeOnboarding` grava nome, vila e `onboardedAt`. `DailyQuiz` só assina o doc e pré-gera amanhã; não abre.
4. Placa com os recados do dia 1 (`notices.ts`, chaves `auto:firstday:<n>:<date>`): "Toque na Casa para começar" até a primeira missão; "A prova de hoje está na Biblioteca" até a prova; o recado do pai escrito no sábado (`notices` do painel).
5. Casa → primeira missão (toast com loot, conquista "Primeira picaretada", o Olheiro comenta) → Biblioteca (prova lida pelo pai no sábado) → Mina (1 contrato) → 18h Baú → Fechar o dia → o Sábio responde na segunda.

6. **Fechar o dia v2** (decisão 15; `Casa.tsx`, aba "Fechar o dia"; `checkin.ts`; `submitCheckin`; `sageReplyFor`). Primeiro o defeito: o modal da Casa é `max-h-[96vh] overflow-hidden` sem área de rolagem, então em 1280x720 o botão "Fechar" fica cortado embaixo e não dá para clicar; e antes das 20h ele fica desabilitado com o aviso longe do botão. O corpo das abas ganha `overflow-y-auto` (o cabeçalho e as abas fixos), e o botão da aba "Fechar o dia" fica fixo no rodapé do painel com o motivo escrito nele quando desabilitado ("Abre às 20h ou depois do Baú"). O conteúdo da aba, de cima para baixo:
   - **O dia em números** (automático, sem clique, visível a qualquer hora): missões feitas X de Y e a tocha (acesa se completo); prova (nota de N ou "ainda não"); Mina (contratos de hoje); gold e material ganhos hoje (de `goldTransactions` e `taskCompletions` do dia); Baú (aberto ou "abre às 18h"). Ícones que já existem (`ui/`, `items/`). Uma linha por item, em `mc-row`.
   - **Como foi o dia?** três botões grandes, um toque, obrigatório: "Foi bom", "Normal", "Difícil". Sem emoji: três ícones pixel de 32 px (sol, nuvem com sol, nuvem de chuva) já entregues em `public/assets/village/ui/mood-{bom,normal,dificil}.png` (manifesto `docs/arte/manifesto.json`). Grava `checkin.mood: 'bom' | 'normal' | 'dificil'`.
   - **Amanhã eu...** (uma frase, mínimo 3 palavras, como hoje). Único campo de texto.
   - **Amanhã você tem** (Agenda, como hoje) e **"Amanhã a prova é sobre..."** com o título do tema já pré-gerado para amanhã (`dailyQuizzes/<uid>_<amanhã>.theme.title`, se existir).
   - Botão **Fechar o dia** (+5 XP, como hoje). Depois de fechar: a aba mostra "Dia fechado" com o resumo, a frase e o humor escolhido, e a lanterna da Casa acende na cena (`house` com luz `casa` já existe em `anchors.json`; ligar quando `dailyProgress.checkin` existir).
   - Dados: `checkin: { mood, tomorrow, at }`; `water`, `stretch`, `kindness` e `screen` saem do tipo `DailyCheckinAnswers` e de `submitCheckin` (docs antigos com esses campos continuam válidos, são ignorados). `checkinXp` continua 5 se `tomorrowValid` e `mood` preenchido. `sageReplyFor` perde os quatro extras dos hábitos e ganha três por humor ("Dia bom ontem. Hoje repete a receita.", "Dia normal também constrói.", "Ontem foi difícil. Hoje começa do zero, sem dívida."); teste em `etapa2.test.ts` ajustado.
   - Painel: o cartão Hoje mostra o humor de ontem e a frase; o relatório semanal conta dias bons, normais e difíceis (substitui a contagem de hábitos). O Diário da Etapa 3 lista as frases.
   - Ficha pedagógica: aprende a fechar o dia com um olhar honesto (como foi) e uma intenção (amanhã eu); cabe em 30 segundos; mede por `dailyProgress.checkin` e `stats.checkins`; adapta pela resposta do Sábio na manhã seguinte; o pai vê humor e frase; sem IA; 5 XP, nunca gold, nunca castigo.
7. **Criar missão fora** (decisão 16): remover o formulário e o estado dele de `DailyChecklist.tsx` (linhas 239-270 e o `status: 'proposed'` de criação); nada mais muda (regra do Firestore e `TaskManager` ficam, sem uso).
8. **Plano do turno fora** (decisão 17; a parte "Foco na lista" foi cancelada pela decisão 22, o Foco saiu de vez): a aba "Plano do turno" some da Casa (`Casa.tsx`, aba `plano`, setas, "Começar o turno"); `village.plan.order` deixa de ser lido (`DailyChecklist.tsx:82`, `planToday`) e a lista volta a ordenar por período e pela ordem do pai. O **Foco** vira um botão pequeno com a estrela em cada missão pendente da aba Missões ("Foco: material em dobro", um por dia, escolhido a qualquer hora antes de concluir): grava `village.plan = { date, order: [], focusTaskId }` pela função existente `savePlan` (sem a trava de meio-dia; `plansSaved` continua contando), o selo "Foco · 2x material" fica na missão escolhida e `completeTaskWithRewards` paga em dobro como hoje. Na Etapa 2, seção 22, a ficha "Plano do turno" virou "Missão-foco".
9. **Casa e todos os modais em 1280x720** (decisão 18): o modal da Casa (`Casa.tsx:126`, `max-h-[96vh] overflow-hidden`) ganha cabeçalho e abas fixos e corpo com `overflow-y-auto`; hoje a terceira missão fica cortada e o "Concluir" some (foto do pai, 17/09). Mesma regra para todos os modais da criança (Torre, Mochila, Ferraria, Mercado, Cofrinho, Agenda, prova, Baú, cartão da construção, Onboarding): nenhum conteúdo fora do alcance em 720 px de altura; botão de ação principal sempre visível; a lista da varredura da revisão (seção P2 da `REVISAO_ETAPA_2_LANCAMENTO.md`) é o checklist.
10. **Recuperar fora** (decisão 19): a lista "Recuperar: <missão>" some de `DailyChecklist.tsx` (e do `DataContext.completeLateTask` a chamada da tela); `late.ts`, a regra do Firestore e a linha `late` em `goldTransactions` ficam no código, sem uso, até a Etapa 3 decidir o desenho. A conquista "Recuperação" (`recuperacao`, stat `recoveries`) sai do catálogo e `recoveries` entra em `NO_SOURCE_YET`; `firestoreService.completeTaskWithRewards` deixa de aceitar `late` pela tela.
11. **Vila viva: falas ociosas** (pedido do pai em 18/09: "faltam diálogos quando não há interação, o Heitor andando ou explorando com o mouse"). Banco pronto em `src/data/dialogue/ambient.ts` (80 falas, 20 por personagem, com hora e condição: `quizPending`, `missionsPending`, `chestReady`, `dayComplete`, `nearHero`, `rain`). Regras na cena (`VillageScene`/`VillageHome`): a cada 25 a 45 s sem clique em NPC, um personagem (rodízio, nunca o mesmo duas vezes seguidas) mostra **um balão pequeno** por 4 s, sem botão, sem nome e corações (é comentário, não conversa); a fala é escolhida por hora e pelas condições do momento, sem repetir em 14 dias (`village.noticesSeenAt` ou chave própria `ambientSeenAt`); quando o Heitor **passa a menos de 90 px** de um NPC, esse NPC fala uma linha `nearHero` (no máximo uma vez a cada 10 min por NPC) e vira para ele; o NPC com o mouse em cima faz o gesto de acenar (quadro `wave`, já previsto) e mostra "..." pequeno; nada disso paga XP, grava `seen` nem abre a conversa. Enquanto um balão de conversa (clique) está aberto, as falas ociosas param. Teste puro do seletor (`pickAmbient(lines, ctx, seenAt, now)`: respeita hora, condição, 14 dias e rodízio).
Aceite do P2: fotos de **todas** as telas da criança em 1280x720 e 1920x1080 sem corte, sobreposição nem botão fora do alcance; o E2E grava as 8 fotos da sequência do dia 1 sem modal sobreposto e sem linha de penalidade em `goldTransactions`; em 1280x720 o botão "Fechar o dia" está visível e clicável com a aba rolando; fechar o dia grava `checkin.mood` e `tomorrow`, paga 5 XP uma vez, e a Placa do dia seguinte traz a fala do Sábio por humor.

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
5. `TaskManager.tsx` e `TaskForm.tsx`: título "Missões"; gold e XP padrão vindos de `settings/economy`; campo "Missão extra"; sem `console.log`; toast "Missão criada" (a seção "Missões propostas" fica como está, escondida quando vazia; decisão 16).
6. `PlacaManager.tsx`: sai o `NotificationSender` embutido e os modelos "Flash/velocista/herói"; entram modelos da Placa (treino, consulta, sem videogame hoje, visita, viagem, recado livre).
7. Missão surpresa: aba `surprise` escondida (componentes desmontados) até a Expedição da Etapa 3.
8. **Guia do dia 1** (`src/components/parent/LaunchGuide.tsx`, dentro do cartão Hoje enquanto `village.launchedOn` tem menos de 7 dias): checklist com link para a aba e estado calculado: missões por período (pelo menos 3 por dia); 3 a 5 prêmios com faixa; prova obrigatória (`quizRequired`); prova de amanhã gerada; Vagoneta ligada ou não (mostra o estado); recado de boas-vindas na Placa; sem folga nem férias ativas; reset feito (`launchedOn` existe e `availableGold == 100` ou há a linha `metadata.launch`).
9. `HojeCard.tsx:47`: "Meta batida" só para metas abertas; lista as que o pai precisa fechar.
10. **"Como ele vai"** (aba Prova, `DailyQuizManager.tsx`): acerto por categoria e por assunto em 7 dias, 30 dias e total (de `learning/{uid}.profile`); lista das últimas 30 perguntas erradas com data (do `quizBank`); perguntas repetidas (mesmo `hash`) apontadas com as datas.
11. `docs/MANUAL_DO_PAI.md` é do líder (não tocar).
12. **Níveis de construção sem efeito** (decisão 14): (a) `config/englishBase.ts`, `effects` da Biblioteca: n2 "Você vê como vai em cada matéria e a prova revisita um erro antigo."; n3 "1 dica grátis no Recado e a revisita paga o dobro."; da Torre n3 "Mapa de habilidades e Histórias dos personagens."; do Armazém n1 "Você vê o inventário e libera Torre e Biblioteca."; (b) o cartão do Cofre no nível 2 mostra "Nível 3: abre na Etapa 3" com o botão desabilitado e sem custo (`BuildingCard.tsx`; `buildUpgrade` recusa `cofre` para o nível 3 com a mesma frase); (c) o cartão da Biblioteca no nível 2 ou mais ganha o botão "Como você vai" (tela `ComoVouIndo.tsx`, filha da Biblioteca: acerto por matéria em 7 e 30 dias, três fortes e três a treinar, de `learning/{uid}.profile`; no nível 1 o botão aparece com cadeado "Biblioteca nível 2"); (d) a revisita (8.4) só entra na prova com Biblioteca nível 2 ou mais, e com nível 3 a pergunta de revisita paga `quizGoldPerHit * 2` e `quizXpPerHit * 2` (dentro dos tetos diários; `quizRewards` recebe `reviewIndex` e `mesaLevel`; teste).

Aceite do P4: fotos das abas; nenhum id cru na tela; missão nova com gold da economia e caixa "extra"; Placa sem formulário de notificação; Guia do dia 1 verde no sábado à noite; Cofre nível 2 sem "Melhorar" cobrável; Biblioteca nível 2 abre "Como você vai" e a prova do dia seguinte traz a revisita.

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

**Revisita**: em `buildAndSave`, antes de gerar, **se a Biblioteca estiver no nível 2 ou mais** (`englishBase.buildings.mesa >= 2`; decisão 14), buscar no `quizBank` uma pergunta com `correct == false`, `reviewedOk != true` e data entre `today - 10` e `today - 3`; a mais antiga vira a pergunta 8 (`kind: 'review'`, `reviewOf`). Com Biblioteca nível 3 a revisita paga o dobro (P4.12d). Ao concluir a prova, se a revisita acertou, o batch marca `reviewedOk: true, reviewedOn: date` no doc original. É a semente da Estante de erros (Etapa 3).

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

Ordem (mudada em 17/09 à noite, decisão 18): P0 → P1 → **P2 (telas da criança lapidadas: itens 9, 8, 7 e 6 primeiro, depois 1 a 5)** → P3 (os três scripts) → P5 núcleo (8.4 gravação e leituras, 8.3, 8.2) → P4 → P5 restante (8.5, 8.6).

Não fazer nesta etapa: restilizar o painel; mexer na Vagoneta fora de bug do E2E; importar `RedstoneBench` ou `phaser`; criar tela nova de formato de pergunta; mexer na arte da cena; animação de andar com chapéu ou capa; Campinho; Arena como cena; Cofre nível 3; qualquer item da lista "fica para a Etapa 3" do roadmap.

## 12. Entrou nesta etapa (registro obrigatório) e a Vagoneta da Mina

| Arquivo ou coleção | Pacote | Recebe de | Entrega para | Ficha |
|---|---|---|---|---|
| `src/services/quiz/rotation.ts` (+ teste) | P5 | currículo, histórico da prova, perfil | `dailyQuizService` | prova do dia (Etapa 2, §22) |
| `src/services/quiz/hash.ts`, `dedupe.ts`, `profile.ts` (+ testes) | P5 | `quizBank` | prompt da prova, Torre, painel | idem |
| `src/services/quizBankService.ts`, coleção `quizBank` | P5 | conclusão da prova | rotação, revisita, perfil, painel, Expedição (Etapa 3) | idem |
| `src/services/village/statSources.ts` (+ teste) | P1 | eventos do jogo | conquistas, pedidos | não ensina |
| `src/services/village/stats.ts` (puro: `addVillageStats`, `nextQuizStreak`, `skipDayPenalty`) e `quizGate.ts` (+ testes) | P1 | deltas dos eventos; `closeDay`; `quizRequired` | `village.stats` na transação de cada evento; portão da prova | não ensina |
| `src/services/village/friendship.ts` (+ teste) | P1 | degraus 3 e 5 | `talkToNpc`, pedidos em `applyVillageStats` | não ensina |
| `src/components/parent/LaunchGuide.tsx` | P4 | settings, village, tasks, rewards, notices | pai | não ensina |
| `src/components/hero/village/ComoVouIndo.tsx` (Biblioteca nível 2) | P4.12 | `learning/{uid}.profile` (Memória da Prova) | a criança vê o próprio acerto por matéria; puxa para a prova e a revisita | metacognição (ficha em `docs/AVALIACAO_MENSAL.md`, §9, mesma base) |
| `scripts/export-user.cjs`, `launch-reset.cjs`, `clone-to-test.cjs`, `backfill-quizbank.cjs` | P3, P5 | Firestore | operação do domingo | não ensina |
| `src/game/README.md` | P0 | `MUNDO.md` §5 | Etapa 3 | não ensina |
| `src/components/hero/village/ChildSheet.tsx` | P2 | modais da criança | Casa, Torre, Mochila, Ferraria, Mercado, Cofrinho, Agenda, prova, Baú, cartões | não ensina |
| `src/data/dialogue/helpers.ts` e os 4 bancos de falas; `docs/conteudo/*` | P5 (líder) | contexto do dia (`DialogueCtx`) | balões dos NPCs | diálogos e amizade (Etapa 2, §22) |
| Vagoneta da Mina (`cart.ts`, `CartBench.tsx`, `redstoneService.ts`; entrou sem doc no Lote 2) | regularizada aqui | Recado do dia feito; nível da Mina; maestria | redstone para a Fornalha; XP; amizade com o Ferreiro; stats `redstoneDone`, `redstonePerfect`, `redstoneStages`; 7 conquistas | abaixo |
| `src/services/quiz/validateQuestion.ts` (+ `src/services/quiz/__tests__/validateQuestion.test.ts`, `fixtures/era3.json`) | etapa-3 p6b | P0.2 / 31 RejectCodes | `aiDailyQuiz`, `reviewer` | prova v3 (lei do professor) |
| `src/services/quiz/reviewer.ts` (+ teste) | etapa-3 p5 | P0.6 lote | `generateDailyQuiz` | prova v3 |
| `src/services/quiz/quizTokens.ts` (+ teste) | etapa-3 p5 | P0.9 | `aiDailyQuiz`, `functions` CHAT_MAX_TOKENS | não ensina |
| `src/services/aiCost.ts` | etapa-3 p6c | decisão 39: teto US$ 50, aviso US$ 40, tokens por modelo | `aiUsage`, painel, `functions/src/aiPrices.ts` | não ensina |
| `functions/src/aiPrices.ts` | etapa-3 p6c | mesma tabela de `aiCost.ts`; `estimateMonthUsd` | `functions/src/index.ts` recusa em US$ 50 | não ensina |
| `docs/exemplos/telas/etapa-3/prova-v3/` (+ `_gen_prova_v3.mjs`) | etapa-3 p5 | 3 provas reais + sanitize | aceite / lei do professor | prova v3 |
| `docs/etapas/RELATORIO_ETAPA_3_PROVA_V3.md` | etapa-3 p5 | §7 da v3 | pai / líder | prova v3 |
| `docs/exemplos/telas/etapa-3/cofre/` (+ `_shot_cofre.mjs`) | etapa-3 p4 | T1 C1 D14 / lei | aceite visual da Vila sem cobrir o mirante; Mercado | Cofre / Torre |
| `docs/exemplos/telas/etapa-3/recado/` (+ `_shot_recado.mjs`) | etapa-3 p3 | R2–R18 / lei | aceite visual do quadro (ajuda sem apagar, giz, finale com o pedido) | Recado do Capataz (`docs/MINA_CONTRATOS.md` §3.2) |
| `docs/exemplos/telas/etapa-3/comerciante/` (+ `_shot_comerciante.mjs`, `_shot_f9.mjs`) | etapa-3 p2 | F2–F16 / F9 | aceite visual do armazém e do item no chão da janela (`?f9=floor`) | Entrega do Comerciante (`docs/MINA_CONTRATOS.md` §3.1) |
| `src/components/hero/english/base/MerchantDelivery.tsx` + `src/services/english/merchantPlay.ts` (+ teste) | contratos-v2 | `englishPlans` merchant, `englishTts`, cena `public/assets/village/scenes/comerciante/` | `englishPlans.result`, `englishSessions`, `englishBase.vocab`; módulo `contractsV2` | Entrega do Comerciante (`docs/MINA_CONTRATOS.md` §3.1) |
| `src/components/hero/english/base/RecadoBoard.tsx` + `src/services/english/notePlay.ts` (+ teste `src/services/english/__tests__/notePlay.test.ts`) | contratos-v2 | `englishPlans` note, `judgeNote`, `scaffoldStage` | `englishPlans.result`, `englishSessions`, `englishBase.scaffoldStage`; módulo `contractsV2` | Recado do Capataz (`docs/MINA_CONTRATOS.md` §3.2) |
| `englishBase.merchantDone` / `merchantPerfect` + `merchantLevelFromSkill` | contratos-v2 | desempenho no Comerciante | sobe `englishBase.level`; amanhã regenera; pedido (item+prep+lugar) não repete | Entrega do Comerciante |
| `settings/modules.contractsV2` (padrão true) | contratos-v2 | quadro da Mina | abre `MerchantDelivery`; desligado = contrato antigo | não ensina |
| `src/services/quiz/closeQuiz.ts` (+ `src/services/quiz/__tests__/provaBleed.test.ts`) | etapa-3 p1 | M1 M2 B4 da revisão 22/09 | `completeDailyQuiz`, `DailyQuiz` | prova do dia (não ensina; fecha o dia sem perder as respostas) |
| `src/services/village/books.ts` (regras puras + `village/__tests__/books.test.ts`), `src/services/bookService.ts`, `src/components/hero/village/EstanteDoSabio.tsx`, `src/components/parent/BooksPanel.tsx`, coleções `books` e `bookReports` (regras e índices publicados 22/09 19h15), botão "Contar um livro" no card da Biblioteca, aba "Livros" no painel, 3 conquistas `booksRead` | líder, 22/09 (decisão 40) | livros cadastrados pelo pai; texto da criança; juiz `gpt-4o` + conferente `gpt-4o` (o conferente precisa conhecer o livro: em 22/09 o `mini` recusou a resposta certa "o menino não tem nome") | gold de vida real por tamanho do livro + 40 XP (claims `book:<chave>` e `bookday:<data>`), `village.stats.booksRead`, extrato `book_report`, estante desenhada na Biblioteca | recontar uma história com começo, meio e fim e opinião com motivo (`docs/LEITURA_LIVROS.md`) |
| `docs/exemplos/telas/etapa-3/prova/` (+ `_shot_prova.mjs`, `_shot_sabio.mjs`) | etapa-3 p1, p7 | lei / aceite visual | lição, anel, reflexão; p7: Sábio lendo (0 s, 2 s, veredito) | prova do dia (Etapa 2, §22) |
| `src/services/quiz/provaRules.ts`, `dailyPrompt.ts` (+ `village/__tests__/provaV2.test.ts`) | prova-v2, etapa-3 p7 | decisão 26; p7: falas da leitura (1,6 s cada, mínimo 2,4 s) | prompt, sanitize, reflexão, tempo de leitura, cartão Hoje | prova do dia (Etapa 2, §22) |
| `src/services/quiz/provaSpeak.ts` (+ `speakVerdict` em `provaRules.ts`) | prova-v2 | decisão 26 / lei | Sábio fala só o veredito (acerto/erro + explicação); voz `sage`; sfx de carimbo | prova do dia (Etapa 2, §22) |
| `docs/exemplos/telas/prova-v2/` (fotos + `_shot_prova.mjs`) | prova-v2 | decisão 26 | aceite visual: convite, ideia, pergunta no mesmo papiro | prova do dia (Etapa 2, §22) |
| `public/assets/village/tunnel/*` (folhas PNG+JSON do herói, morcego e aranha; bases do golem e da toupeira), `scenes/tunel/backdrop-a.png` e `backdrop-b.png`, `char/miner-ref.png`, `scripts/gpt-frames.cjs`, `scripts/frames-to-sheet.cjs`, `docs/arte/quadros.json` | Túnel (decisão 31; arte do líder, 19 a 21/09) | `docs/JOGO_TUNEL.md`, `docs/arte/BRIEF_TUNEL_PIXEL_ARTIST.md`, `docs/ARTE_PIPELINE.md` | fatia vertical na branch `tunel` (Etapa 3); nenhum código na `main` os cita ainda | ação = resposta (ficha em `JOGO_TUNEL.md`) |
| `public/assets/village/ui/panel-mesa.png`, `mesa-tabua.png` | prova-v2 | lei / decisão 26 | moldura e tábua da mesa da prova | não ensina |
| `public/assets/village/ui/papiro-rolo.png`, `papiro-folha.png` | prova-v2 | lei / decisão 26 | rolo e fibra do papiro da ideia | não ensina |
| `src/services/village/bank.ts` (`vaultInterestPct`) | Cofre | decisão 27 | Cofrinho, `goalsService.applyWeeklyInterest` | educação financeira (paciência) |
| `src/services/goalsService.ts` (`redeemGoal`, `unlockOn`) | Cofre | decisão 28 | Cofrinho, `firestore.rules` | educação financeira (resgatar) |
| `src/components/hero/village/drawAmbient.ts` (`skipLotSprite`, `coverPaintedLookout`); `village.ts` (`previewBuildingLevel`) | hotfix | Heitor 21/09 | `VillageScene` desenha `torre-1..3` no morro | não ensina |

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
