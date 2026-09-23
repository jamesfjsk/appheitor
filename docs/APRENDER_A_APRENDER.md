# Aprender a aprender: a lente pedagógica do Miner Missions

Documento de desenho, fonte de verdade a partir de 23/09/2026 (decisão 43 do `docs/etapas/ETAPA_2_LANCAMENTO.md`). Pedido do pai: desenvolver no Heitor, acima de qualquer matéria, a capacidade de **aprender a aprender**: perceber o próprio erro, mudar de estratégia, planejar, testar hipóteses, explicar o raciocínio, saber quanto sabe, tolerar frustração e descobrir sem depender de um adulto. **A transferência para fora do app é requisito de projeto**: a tarefa da escola, um Lego difícil, algo quebrado, uma discussão, uma informação duvidosa. Nasce da análise de 23/09 sobre o roteiro inteiro; o pai aprovou a linha no mesmo dia ("vamos seguir essa linha de raciocínio").

**Para quem executa:** isto é desenho, não pacote. O Cursor implementa só o que um prompt de pacote pedir, citando a seção; nada daqui entra de carona em outro trabalho. Onde este documento contradiz um anterior, vale este (lista na §10).

## 1. A pergunta que decide

> Estamos ensinando o Heitor a acertar respostas, ou a descobrir respostas quando ainda não sabe?

Toda tela, conteúdo ou regra nova passa por ela. Três proibições vêm junto:

- **Nenhuma tela, botão ou palavra "metacognição".** A lente mora no comportamento do mundo: nas pistas, nos erros que voltam, no Sábio, no Fechar o dia, no pai.
- **Nenhum questionário.** Pergunta de reflexão é uma por vez, curta, respondida por toque ou voz, com limite por dia (§3).
- **Nenhum rótulo sobre capacidade.** Nenhuma nota, porcentagem ou arquétipo de habilidade aparece para a criança ("Estrategista", "Raciocínio 73%"). Até rótulo positivo cristaliza: em crianças, ouvir "você é um bom desenhista" levou a mais desistência depois de erros do que ouvir "você desenhou bem" (Cimpian e colegas, 2007).

## 2. Três leis e uma ponte

**Lei 1. A primeira tentativa é dele.** A primeira tentativa, sem ajuda, é a performance: é a única que paga (gold, XP, material, esmeralda) e a única que conta para conquista de desempenho (decisão 23). Tudo o que vem depois dela é aprendizado. Não paga nada, nem XP, porque qualquer valor ali transforma a primeira numa espiada grátis. Mas é gravado (`supportLevel`, §4.4) e reconhecido na tela (§8.1).

**Lei 2. A ajuda vem em degraus, e cada degrau é uma ferramenta.** Em problema de raciocínio, a resposta é o último degrau, nunca o primeiro. Os degraus falam em estratégias com nome (§5), não em fatos. Como a ajuda só aparece depois da primeira tentativa, ela nunca custa nada: nenhum gold, material ou equipamento compra dica.

**Lei 3. O erro volta mudado.** Todo erro entra numa Estante única (§6) e volta outro dia, em outro enunciado. Domínio é acertar sem ajuda na volta; não é acertar uma vez, nem ver três vezes.

**A ponte: o mesmo nome dentro e fora do jogo, levado pelo pai.** Jogo e treino cognitivo quase não transferem sozinhos para a vida (Sala e Gobet, 2017). O que transfere é nomear o princípio e ligá-lo, de propósito, a outras situações (Perkins e Salomon, 1988). Por isso, a cada quinzena, uma ferramenta (§5) aparece com o mesmo nome nas pistas do jogo, na pergunta do comprovante do dever de casa e num cartão do painel (§7.2). O pai é o canal principal da transferência; o app o equipa para isso.

## 3. Regras de operação

1. **Limite de reflexão.** No máximo **uma** pergunta de reflexão por sessão de atividade e **três** por dia no app inteiro. Obrigatórias, só duas que já existem: a reflexão da prova (decisões 26 e 32) e o laço do plano no Fechar o dia (§7.1). As outras só aparecem por gatilho (item 3).
2. **A ajuda some.** A pergunta de reflexão de um tipo de problema deixa de aparecer depois de 5 acertos de primeira no mesmo `skill` em 14 dias; a escada continua, porque só aparece quando ele erra. O molde da reflexão da prova some depois de 10 reflexões aceitas (`village.stats.reflections`). O objetivo é ele se fazer as perguntas sozinho: se o jogo sempre pergunta, ele só pensa quando perguntado.
3. **Gatilhos das perguntas do Sábio**, fora das obrigatórias:
   - dois erros no mesmo item;
   - repetir uma tentativa que já falhou ("Mesma carga de novo? O que você mudaria?");
   - primeira vez num tipo novo de problema ("O que você já sabe sobre isso?");
   - no máximo 1 em 5 vezes, depois de acerto em item de raciocínio, para separar sorte de entendimento.

   Nunca no meio de ação com tempo (Túnel), nunca depois de item fácil, nunca a mesma frase em 14 dias.
4. **As quatro perguntas.** Para a criança, a lente inteira cabe em quatro perguntas, uma por vez: *O que está sendo pedido? Qual é o plano? Está funcionando? O que você leva daqui?* Elas correspondem aos três momentos que os módulos dividem entre si: antes, durante e depois (§9).
5. **O Sábio é mentor, não fiscal.** Suspeita de cópia, recusa e portão não saem da boca dele: a marca vai para o pai em silêncio, e o Sábio só diz o que falta. Ninguém admite "não entendi" para quem o fiscaliza.
6. **Mostrar, não só perguntar.** Uma vez por semana, a ideia do dia da prova vem como o Sábio resolvendo algo em voz alta, com um tropeço e a correção ("Primeiro pensei 30... não fecha: a pergunta é o total"). Mostrar o próprio pensamento é uma das recomendações centrais para ensinar metacognição (EEF, 2018). Depende da prova v3 estável (pacote AP3, §12).

## 4. A escada de ajuda (contrato comum)

### 4.1 Onde vale

A escada vale só em **problema de raciocínio**: o que se descobre pensando, ouvindo de novo ou testando (conta, regra de inglês, aplicar uma ideia, causa e efeito, circuito, lógica, ordem). **Fato** (data, nome, lugar, detalhe da lição) não se descobre pensando mais: erro de fato recebe a explicação na hora e vai para a Estante.

Na prova, a divisão segue a lista fechada de `skill` do prompt v3, numa função pura `retryable(question)` em `src/services/quiz/provaRules.ts`:

| Com escada (raciocínio) | Sem escada (fato ou compreensão) | Fora da nota |
|---|---|---|
| `MAT.*`, `ING.*`, `LIC.APLICAR`, `CIE.CAUSA`, `FUT.TATICA` | `LIC.ENTENDER`, `CIE.MATERIA`, `CIE.VIDA`, `CIE.TERRA`, `CIE.CORPO`, `HUM.*`, `FUT.REGRA`, `FUT.HISTORIA`, `skill` ausente ou desconhecido | `LIC.DILEMA` (decisão 33) |

A revisita (`kind: 'review'`) segue o `skill` da pergunta original. **A lista se calibra pelos dados:** se, em 30 dias, a segunda tentativa de um `skill` acerta perto de 1 em 3 (o acaso com três opções restantes), aquele `skill` é de fato, não de raciocínio, e muda de coluna. O líder revê a lista uma vez por mês.

### 4.2 Os degraus

Depois da primeira tentativa errada:

1. **Aviso**: diz o que não fecha, sem a resposta. Nova tentativa.
2. **Pista em forma de ferramenta**: uma estratégia com nome (§5). Nova tentativa.
3. **Explicação completa**: a resposta, o porquê e o erro tentador. O item vai para a Estante.

Cada módulo usa os degraus que cabem nele (§4.5); o mínimo é um degrau antes da resposta. Valem para todos:

- **Tempo mínimo de leitura** antes de reabrir a tentativa: `readingMs(texto, 3000, 8000)`; em inglês, também até o áudio acabar. Sem isso ele clica até a resposta, um comportamento bem documentado em tutores digitais e ligado a aprender menos (Baker e colegas, 2004).
- **A opção já tentada fica marcada e desabilitada** (múltipla escolha).
- **Nada custa.** Nenhum degrau debita gold, material ou equipamento.
- **Sem aviso de que a segunda não paga** (a decisão 23b continua): a tela mostra o reconhecimento (§8.1), não a regra de pagamento.

### 4.3 O primeiro degrau na prova (sem mudar o gerador)

- Se a opção escolhida é a que o `trap` nomeia (a mesma regra de `trapHitsDistractor` em `src/services/quiz/validateQuestion.ts`, aplicada a uma opção) **e** o `trap` não contém a resposta (a mesma checagem de palavra inteira de `answerLeaksInPrompt`, aplicada ao `trap`), o aviso é o próprio `trap`: ele explica exatamente o erro cometido.
- Senão, o aviso é uma pista da área, do banco `docs/conteudo/FALAS_APRENDER.md` §1.1, sem repetir a mesma frase em 14 dias.
- Em inglês, o `audioText` toca de novo antes de reabrir as opções: é a ferramenta "ouvir de novo".

Quando o gerador passar a devolver o campo `hint` (a pista em forma de ferramenta, validada para não conter a resposta; pacote AP3), a prova ganha o segundo degrau.

### 4.4 O que se grava

Em todo item de jogo que ensina (`quizBank`, `tunnelRuns.items`, `englishPlans.result.details`, tentativas da Vagoneta):

- `correct` e `chosen`: a **primeira** tentativa. É o que paga, e não muda.
- `attempts`: quantas tentativas.
- `supportLevel`:
  - **0** acertou sozinho de primeira;
  - **1** acertou depois do aviso;
  - **2** acertou depois da pista;
  - **3** precisou da explicação (errou todas, ou errou item de fato).
- `nudge`: `'trap' | 'strategy'`, quando houve aviso.
- A segunda tentativa: `secondChoice` na múltipla escolha; a tentativa inteira na Vagoneta (caixas, soma, "tombou/faltou") e no Comerciante (`misses`, como hoje).
- `errorKind`, quando der para saber: `'trap'` (escolheu o erro típico), o `missKind` do Comerciante, `tombou | faltou | contagem` da Vagoneta, a etiqueta da correção do Recado.
- `retryOk` continua existindo por compatibilidade (acertou na segunda).

### 4.5 Por módulo

| Módulo | Degrau 1 (aviso) | Degrau 2 (pista) | Degrau 3 | Quando |
|---|---|---|---|---|
| Prova | `trap` ou pista da área (§4.3) | campo `hint` do gerador | `why` + `trap` + a certa | degraus 1 e 3 no pacote 11; degrau 2 no AP3 |
| Comerciante | o item volta à bandeja e o pedido toca de novo, sem a frase corrigida | "Presta atenção na palavra depois de *apple*" (onde está a preposição) | `correctionFix`, como hoje | AP2 |
| Recado | o Capataz circula onde está o erro, sem escrever a forma certa | a regra com nome ("depois de *three*, plural") | a forma certa a giz, como hoje | AP2 |
| Ferraria | já é assim: a regra, e a barra volta para o fim da fila | — | — | sem mudança |
| Túnel | a Coruja com a regra e a certa acesa (o ritmo de ação pede) | — | a volta na onda seguinte é o teste | sem mudança; a Coruja fala em forma de ferramenta quando der |
| Vagoneta | "Tombou" / "Faltou" (já é aviso) | uma 3ª tentativa sem tempo, com a ferramenta ("De trás para frente: quanto falta de 12 para 17?") | a carga certa mostrada | Vagoneta v2 (congelada até lá) |
| Redstone | "Testa: liga só a alavanca da esquerda e olha" | — | a solução | quando voltar |

## 5. As ferramentas

Cinco para começar, uma por quinzena, nesta ordem. Cada uma tem um nome curto, um **dono** (a regra "todo personagem tem um domínio") e um lugar onde é a melhor jogada. As falas estão em `docs/conteudo/FALAS_APRENDER.md`.

| # | Ferramenta | Dono | Onde é a melhor jogada | A pergunta que a chama |
|---|---|---|---|---|
| 1 | Entender o pedido | Sábio | conta de duas etapas, Carta | "O que está sendo pedido, no fim?" |
| 2 | Fazer menor | Ferreiro | Vagoneta, conta, circuito | "E se fosse só um pedaço disso?" |
| 3 | De trás para frente | Ferreiro | Vagoneta ("quanto falta?"), horários | "Onde tem que chegar? E o passo antes disso?" |
| 4 | Testar e olhar | Ferreiro | Redstone, ciências, Comerciante | "Muda uma coisa só e vê o que acontece." |
| 5 | Riscar o que não pode | Carteiro | Carta, lógica, múltipla escolha | "Qual destas com certeza não é? Por quê?" |

Depois vêm, uma por quinzena:
- **Achar a prova** (Carteiro: a frase que mostra);
- **Comparar com um parecido** (Comerciante);
- **O que o outro vai fazer?** (Olheiro: Arena, futebol);
- **Desenhar no papel** (Sábio: a ferramenta mora fora do app; o Sábio manda pegar papel e lápis).

Regras:

- **Ferramenta não se desbloqueia.** Estratégia não se tranca (ele sempre pode pensar de trás para frente), e colecionar vira o objetivo no lugar de usar. Uma lista de estratégias sozinha também não resolve: o que faz diferença é decidir quando trocar de caminho (Schoenfeld, 1985). Por isso a ferramenta chega na hora do aperto, como pista.
- **Caderno do Minerador** (uma página do Diário). Quando ele acerta depois de uma pista com a mesma ferramenta em 3 dias diferentes, o Sábio escreve a ferramenta no Caderno, com o lugar e a data. Ele pode acrescentar a frase dele, por voz ou texto. O pai pode acrescentar uma entrada pelo painel ("usou 'fazer menor' no dever de frações"). Nenhuma recompensa por entrada.
- **Não se mede uso espontâneo.** O jogo só vê qual pista ajudou. Uso espontâneo, só o pai observa.

## 6. A Estante única

Hoje há quatro revisitas separadas: prova em 3 a 10 dias, Mina em 3 e 10, Túnel na onda seguinte e em 3 e 10, Expedição em 3, 10 e 30. Viram uma só.

- **Fila única** `reviewQueue/{uid}_{itemKey}`: `{ userId, familyId, module: 'prova' | 'mina' | 'tunel' | 'expedicao', skill, sourceRef, firstSeen, supportLevel, stage, dueOn, doneOn? }`. Cada módulo puxa os itens vencidos do seu tipo: a prova, um por dia, na posição 8; o Túnel, na onda; a Mina, no contrato do mesmo tipo.
- **Quando volta** depende do degrau:
  - acertou depois do aviso: em 10 dias;
  - acertou depois da pista: em 3 e 10;
  - precisou da explicação: em 1, 3 e 10;
  - depois disso, em 30 dias para todos.

  Da Expedição entra também o "chute e acertou", porque não é saber.
- **Domínio** é acertar sem ajuda (`supportLevel 0`) na volta, em outro enunciado. É a única definição de "dominado" no jogo. **"Palavra dominada"** passa a ser palavra acertada sem ajuda em dois dias diferentes, não "vista 3 vezes".
- **Minério bruto e barra.** Na Biblioteca, cada erro é um minério bruto na Estante; a volta certa o funde em barra. É só visual: não é moeda nem material. A pilha de barras só cresce.
- **Pagamento.** A volta é um item novo e paga como item normal de primeira. O pagamento em dobro da Biblioteca nível 3 sai (decisão 14). O nível 3 passa a mostrar, depois de uma volta certa, **o erro de origem ao lado do acerto de hoje**, com "O que mudou?". Comparar dois casos lado a lado é o que mais ajuda a levar a ideia para outro lugar (Gentner, Loewenstein e Thompson, 2003).
- **Conquistas de processo**, só com XP:
  - "Minério em barra" (10, 50 e 100 erros fundidos; amplia a "Estante limpa");
  - "Plano cumprido" (7, 30 e 100 planos; §7.1).

  Nenhuma conquista nova de perfeição.
- Depende de o `quizBank` ter volume, o que deve acontecer em meados de outubro.

## 7. O laço do plano e a ponte da quinzena

### 7.1 O laço do plano (Fechar o dia)

Hoje o "amanhã eu..." é escrito e ninguém olha para ele: de manhã, `sageReplyFor` sorteia uma frase do banco (`src/services/village/checkin.ts`). Passa a ser um laço:

- **No Fechar o dia**, antes do humor, aparece "Ontem você escreveu:" com a frase dele, e três botões: **Fiz**, **Em parte**, **Não fiz**. Em "Em parte" ou "Não fiz", aparece uma linha de fichas opcional, de um toque: *Esqueci · Não deu tempo · Ficou difícil · Mudei de ideia*. Grava `dailyProgress.checkin.planDone: 'sim' | 'parte' | 'nao'` e `planObstacle`.
- **De manhã**, a fala do Sábio na Placa responde ao plano, e não a um sorteio (banco em `FALAS_APRENDER.md` §3):
  - plano feito: reconhece a ação;
  - em parte: pergunta o que ele faria diferente;
  - esquecido: sugere o lembrete da Agenda;
  - grande demais: sugere um plano menor.

  Sem sermão e sem pagamento.
- Se não houve "amanhã eu" na véspera (primeiro dia, folga, férias, punição), a linha não aparece.
- Cada plano cumprido acende uma **tocha de plano** na Torre (é contador, não moeda) e conta para a conquista "Plano cumprido".
- Aos 12–13 anos, o plano ganha o formato "Quando ___, eu vou ___". Esses planos de implementação são uma das intervenções de autorregulação com mais evidência (Gollwitzer e Sheeran, 2006).
- **Aceite:**
  - fotos 1280×720 e 1920×1080 do Fechar o dia com o plano de ontem, os três botões e as fichas;
  - a Placa da manhã seguinte com a fala do plano;
  - teste puro do seletor da fala nos casos do §3 do banco (feito, em parte, esqueci, sem tempo, difícil, mudei de ideia, sem ficha).

### 7.2 A ponte da quinzena (painel e dever de casa)

- **Calendário em código** (`src/data/bridge.ts`): a ferramenta da quinzena, na ordem do §5, a partir da segunda-feira seguinte à entrega.
- **Cartão no painel** (aba Hoje, sem restilizar), com:
  - o nome da ferramenta;
  - **uma pergunta para o jantar**;
  - **uma situação para o pai pensar em voz alta** na frente dele;
  - **uma missão-problema** sugerida (Lego sem manual, consertar algo, planejar o sábado), que o pai cria com um toque nos Desafios (`kind: 'manual'`);
  - **a regra da quinzena para o pai**: "quando ele pedir ajuda no dever, antes de explicar, pergunte: ...".

  O conteúdo está em `FALAS_APRENDER.md` §4.
- **As pistas do jogo** usam a ferramenta da quinzena sempre que ela serve ao problema.
- **Comprovante do dever** (decisão 24, desenho em andamento): além do conteúdo, uma pergunta de processo por vez ("Qual foi a mais difícil?", "O que você fez quando travou?", "Usou alguma ferramenta? Qual?"), com fichas das ferramentas já vistas. É o ponto do app mais perto da vida real.

## 8. O que a criança vê e o que o pai vê

### 8.1 A criança

- **Três estados** em toda lista de resultado:
  - **De primeira** (picareta);
  - **Descobriu** (faísca: acertou depois de ajuda);
  - **Ainda na pedra** (minério bruto: volta em N dias).

  Nunca X vermelho. Os três ícones pixel de 32 px são do líder e ficam prontos antes do pacote que os usar.
- **Depois do erro, a primeira linha é informação** (o aviso), não veredito. Sai o "Não foi dessa vez." (`src/components/hero/DailyQuiz.tsx:661`).
- **A frase fala da ação, não da pessoa**: "Você mudou a carga depois do tombo. Foi isso." Nunca "você é esperto".
- **Coisas que só crescem**: barras na Estante, páginas do Caderno, tochas de plano.
- **Comparação só com ele mesmo**, uma vez por mês, pelo Sábio, com um episódio real ("No começo do mês, depois de tombar, você repetia a carga. Esta semana, três vezes, você mudou e acertou.").
- **O que ele não vê**: porcentagem por matéria, nota ou arquétipo de habilidade, estrelas de desempenho, comparação com outras crianças. "Como você vai" (Biblioteca nível 2) e o Mapa de habilidades (Torre nível 3) mostram **o que ele já domina** e **o que está na pedra**, nunca porcentagem.

### 8.2 O pai

- No máximo **três sinais por semana**. Cada um traz o que se viu, quantas vezes em quantas, um exemplo com data e uma coisa para fazer em casa. Com menos de 8 ocorrências, o painel diz "pouco dado ainda".
- Sinais possíveis, só com dado gravado:
  - **usa o retorno**: depois de "tombou", mexe na carga no sentido certo? Depois de "on, not in", conserta a preposição ou troca o objeto?
  - **insiste** no que já falhou;
  - **pressa** em item de raciocínio (tempo curto e acerto baixo);
  - **pede ajuda** antes de pensar, ou nunca pede e desiste;
  - **erro que vira acerto** na volta;
  - **certeza e errou** (Expedição);
  - **plano cumprido**, e o que atrapalha;
  - **prova certa** na Carta.
- Exemplo do formato: "Nas contas de duas etapas, costuma responder em cerca de 4 segundos e erra 7 de 10, quase sempre com o resultado da primeira conta (terça, pergunta 7). Em casa: peça que ele diga a primeira conta em voz alta antes da resposta."
- Os trechos da semana (respostas do Diário, reflexões, explicações) aparecem para ler, não para corrigir. **O Diário nunca vira bronca.**
- Nada de gráfico de "raciocínio", índice somado ou porcentagem sem o total ao lado.

## 9. Cada módulo, um momento

A melhor ideia da proposta do pai vira regra: cada módulo treina uma parte do ciclo, em vez de todos treinarem tudo.

| Módulo | Momento | Papel |
|---|---|---|
| Biblioteca (prova) | depois | diagnosticar o erro e explicar; escada; conta digitada; "Ache o erro" |
| Mina (contratos) | durante | checar se entendeu ("ouvir de novo" nunca é penalizado); a Carta é o molde de "como você sabe?" |
| Vagoneta | antes | estimar e planejar; "Ache outro jeito" (comparar dois caminhos desenvolve flexibilidade; Rittle-Johnson e Star, 2007) |
| Redstone | durante | testar hipótese e achar o defeito (`conserto`) |
| Túnel | — | lembrar rápido, com revisita; nenhuma pergunta durante a ação |
| Expedição | de tempos em tempos | calibrar (confiança por item) e medir quanta ajuda ele precisa para aprender algo novo |
| Arena | antes e depois | antecipar o outro e revisar a partida, com o pai |
| Fechar o dia | antes e depois do dia | o laço do plano |
| Diário | depois | o livro que junta tudo, e o Caderno |
| Missões da vida real | fora | a transferência: comprovante com pergunta de processo, missões-problema |
| Agenda | antes | estimar o tempo do estudo e comparar com o Foco |
| Banco e Mercado | antes e depois | decidir com consequência; mais tarde, "Valeu a pena?" |

## 10. O que muda em decisões e documentos anteriores

| Onde | Antes | Desde 23/09 |
|---|---|---|
| Decisão 23b e `ETAPA_3_PROVA_V3.md` §6.3 | repescagem em toda pergunta, reabrindo com a certa revelada | só em item de raciocínio (§4.1), com aviso e sem revelar; em item de fato, explicação direta, sem repescagem |
| `DailyQuiz.tsx:661` | "Não foi dessa vez." | o aviso (raciocínio) ou uma linha do banco (fato) |
| Prova v3, regras 17 e 18 | molde "Hoje eu … porque …" sempre | o molde some depois de 10 reflexões aceitas; o contador continua |
| Decisão 14 e `VILA_CONSTRUCOES.md` (Biblioteca nível 3) | "1 dica grátis por dia no Recado" e revisita que paga o dobro | a dica é sempre grátis e vem só depois da primeira tentativa; a revisita paga como item normal; o nível 3 mostra o erro de origem ao lado do acerto |
| Recado (`englishBaseService.ts:588`) | a Dica custa 1 ferro do estoque | ajuda depois da primeira tentativa, sem custo (AP2) |
| Lanterna (roteiro, equipamentos) | "1 Dica grátis/dia no Recado" | sai; a Lanterna fica com "mostra o amanhã" (AP2) |
| "Palavra dominada" (`learningService.ts`, Bloco 6 da Expedição) | `seen >= 3` | acertada sem ajuda em dois dias diferentes (AP4) |
| `AVALIACAO_MENSAL.md` §7 | estrelas de 0 a 3 por região, pelo desempenho | ver a linha abaixo |
| `LEITURA_LIVROS.md` ("Suspeito") | o Sábio diz "Isso está muito arrumado" | o pedido de reescrita vira "falta parte", dizendo o que faltou; a marca vai para o pai em silêncio |
| Vagoneta (`cart.ts`) | o Ferreiro debocha de quem errou; 2 tentativas com tempo | na v2: humor sobre a carga, nunca sobre ele; cada tentativa gravada; 3ª tentativa sem tempo, com ferramenta; "Ache outro jeito" |
| "Como você vai" e Mapa de habilidades | acerto por matéria para a criança | o que ele domina e o que está na pedra; porcentagem só no painel |

Mudanças na Expedição (`AVALIACAO_MENSAL.md` §7):
- as estrelas de desempenho saem; ficam as regiões exploradas e as descobertas;
- a confiança por item continua;
- "chute e acertou" vai para a Estante;
- o Bloco 1 ganha formas paralelas antes do 4º mês;
- entra um bloco curto de 3 problemas novos com a escada, que mede quanta ajuda ele precisa para aprender (a avaliação dinâmica de Campione e Brown, 1987);
- o Bloco 6 muda de nome, porque colide com O Túnel.

## 11. Dados

**Guardar:**
- os campos do §4.4, por tentativa;
- `dailyProgress.checkin.planDone` e `planObstacle`;
- `dailyQuizzes.predicted`: a previsão da nota, uma vez por semana (AP3);
- `reviewQueue` (§6);
- `village.notebook: { tool, place, date, words?, by: 'sabio' | 'pai' }[]` (o Caderno);
- `arena.predictions[]` (Etapa 4B);
- no perfil, `learning/{uid}.profile.retry: { d30: [ok, n], all: [ok, n] }`, só com itens que têm escada. Substitui o `retryRate` da v3.

**Não guardar:**
- qualquer nota de habilidade cognitiva;
- confiança depois da resposta;
- humor por atividade;
- tempo em cada tela;
- movimento do mouse;
- o áudio da voz dele (só a transcrição, quando houver);
- totais repetidos em vários documentos (calcular na leitura).

**Sinais do painel:** calculados uma vez por semana em `learning/{uid}.signals`, cada um com contagem, total e o id de um exemplo; só entram com 8 ocorrências ou mais.

## 12. Ordem de entrega

| Pacote | O que entra | Depende de |
|---|---|---|
| **11** (Prova v3 P1, já no prompt de 23/09) | §4.1 a §4.4 na prova: `retryable`, aviso, fim de "Não foi dessa vez", campos no `quizBank`; molde que some depois de 10; `profile.retry`; a linha "Depois do aviso" no painel | pacote 10 |
| **AP1** laço do plano e ponte | §7.1 e §7.2: Fechar o dia, Sábio da manhã, cartão do painel, calendário e banco | falas lidas pelo pai |
| **AP2** escada nos contratos | módulo puro `src/services/help/ladder.ts` (degraus, tempo mínimo, `supportLevel`) com testes; Comerciante e Recado pelo §4.5; dica sem custo; Lanterna sem "dica grátis" | AP1 |
| **AP3** Prova v3 P2 | conta de duas etapas digitada (o `trap` reconhece o número da primeira etapa); campo `hint` no gerador, com o código de validador `hint_vaza_resposta`; "Ache o erro" na posição 8 quando não há revisita; previsão semanal da nota; o Sábio em voz alta uma vez por semana | prova v3 estável |
| **AP4** Estante única | §6 inteiro; três estados na tela final (ícones do líder); palavra dominada; Biblioteca nível 3 nova | `quizBank` com volume (meados de outubro) |
| **AP5** Diário e Caderno | o Diário como livro (reflexões, planos, respostas); o Caderno; a pergunta sobre o dia 2 ou 3 vezes por semana no Fechar o dia, amarrada ao que aconteceu (banco a escrever) | AP1 |
| Expedição | os ajustes do §10 entram no desenho antes do código | — |
| Etapa 4 | Vagoneta v2 (§4.5 e §10); Agenda: estimar o tempo do bloco de estudo e comparar com o Foco | — |
| Etapa 4B | Arena: adivinhar o lance do pai, voltar à posição que virou a partida, o pai pensando em voz alta | — |
| Depois | ver a lista abaixo | as anteriores |

Fica para depois:
- **explicação livre por voz**, com piloto na Biblioteca: a IA procura a ideia-chave em três níveis, faz uma pergunta guiada, guarda a transcrição sem o áudio, e nunca trava nem paga;
- **palpite antes da lição**;
- o dilema alternando com **decisão sob incerteza**;
- **"Valeu a pena?"** depois de uma compra grande;
- **o Aprendiz**, aos 12–13 anos.

## 13. Progressão por idade

- **10–11 anos (agora):** concreto e dentro do jogo. Uma ferramenta por vez, cada uma no seu módulo; explicação apontando (Carta, "Ache o erro") ou por voz; plano de um dia; muita ajuda e muito exemplo em voz alta. Nessa idade, pensar sobre o próprio pensamento ainda é muito preso ao assunto e se generaliza no começo da adolescência (Veenman e Spaans, 2005); por isso o treino é por módulo.
- **12–13 anos:**
  - pontes entre assuntos ("essa ferramenta serve na Carta também?");
  - quando trava, ele escolhe a ferramenta sem fichas;
  - plano no formato "quando X, eu vou Y";
  - explicação livre com IA;
  - o Aprendiz que ele ensina;
  - as perguntas do Sábio começam a sumir.
- **14–15 anos:**
  - planejar semanas: provas da escola pela Agenda, prevendo a nota e comparando com a real;
  - informação duvidosa: conferir a fonte, procurar outra;
  - argumento com evidência e contra-argumento;
  - ele passa a ver os próprios sinais.
- **16 anos em diante:** o app vira ferramenta dele (metas próprias, plano de estudo para o vestibular, o Caderno como diário de aprendizagem). O pai vira consultor, e a camada de jogo fica mais leve. As três leis não mudam.

## 14. Ficha pedagógica: dois itens novos

A ficha de todo módulo que ensina (Etapa 5B do roteiro) ganha:

9. **Que momento treina e como a ajuda funciona**: antes, durante ou depois; quais degraus existem; o que é performance (paga) e o que é aprendizado (gravado e reconhecido).
10. **Onde isso aparece fora do jogo**: a situação real em que a mesma ferramenta serve, e como o pai a encontra no painel.

## 15. Aceite geral (todo pacote que citar este documento)

- Em item de raciocínio, a resposta nunca aparece antes do último degrau.
- A segunda tentativa nunca paga nada: gold, XP, material, esmeralda ou conquista de desempenho.
- Nenhuma ajuda debita gold, material ou equipamento.
- Nenhuma tela da criança mostra porcentagem por matéria, nota de habilidade ou "Não foi dessa vez".
- Toda fala nova sai de `docs/conteudo/FALAS_APRENDER.md`, lido pelo pai: sem emoji, sem caixa alta, na voz do personagem.
- Fotos 1280×720 e 1920×1080, na conta de teste, de cada tela tocada.

## Referências

- Pólya, G. *How to Solve It* (1945). Schoenfeld, A. *Mathematical Problem Solving* (1985).
- Zimmerman, B. J. "Becoming a self-regulated learner: an overview" (2002). Education Endowment Foundation. *Metacognition and Self-Regulated Learning* (2018).
- Collins, A.; Brown, J. S.; Newman, S. "Cognitive apprenticeship" (1989).
- Perkins, D.; Salomon, G. "Teaching for transfer" (1988). Sala, G.; Gobet, F. "Does far transfer exist? Negative evidence from chess, music, and working memory training" (2017). Gentner, D.; Loewenstein, J.; Thompson, L. "Learning and transfer: a general role for analogical encoding" (2003).
- Dunlosky, J. e colegas. "Improving students' learning with effective learning techniques" (2013).
- Feng, M.; Heffernan, N.; Koedinger, K. "Addressing the assessment challenge with an online system that tutors as it assesses" (2009). Baker, R. e colegas. "Off-task behavior in the cognitive tutor classroom: when students game the system" (2004).
- Butterfield, B.; Metcalfe, J. "Errors committed with high confidence are hypercorrected" (2001). Richland, L.; Kornell, N.; Kao, L. "The pretesting effect: do unsuccessful retrieval attempts enhance learning?" (2009).
- Chi, M. e colegas. "Self-explanations: how students study and use examples in learning to solve problems" (1989). Chase, C. e colegas. "Teachable agents and the protégé effect" (2009). McLaren, B.; Adams, D.; Mayer, R. "Delayed learning effects with erroneous examples" (2015).
- Rittle-Johnson, B.; Star, J. "Does comparing solution methods facilitate conceptual and procedural knowledge?" (2007).
- Cimpian, A. e colegas. "Subtle linguistic cues affect children's motivation" (2007).
- Gollwitzer, P.; Sheeran, P. "Implementation intentions and goal achievement: a meta-analysis of effects and processes" (2006).
- Campione, J.; Brown, A. "Linking dynamic assessment with school achievement" (1987). Veenman, M.; Spaans, M. "Relation between intellectual and metacognitive skills: age and task differences" (2005).
