# Prompt para o Cursor — 25/09/2026 (14a-2: Ferraria olha a última concluída; 10b: prova sempre com 8 e mais exigente; 10b-2: prova sem molde e revisor que confere; 10d: banco de reserva; depois o 11 e o 12)

Você é o Cursor do Miner Missions. Antes de qualquer linha, leia:
- `.cursor/rules/lei-excelencia-aaa.mdc`, inclusive "Conteúdo educativo — a lei do professor";
- `docs/etapas/ETAPA_3_PROVA_V3.md` (regras 1 a 27 e §4, o validador);
- em `docs/etapas/REVISAO_ETAPA_2_LANCAMENTO.md`, as seções "24/09 — Uso real do Heitor" e "25/09 — ontem e hoje".

**Por que nesta ordem.** Dados do Heitor:
- 24/09: 5 de 5 numa prova de 6 perguntas. 25/09: 7 de 7 numa prova de 7, respondendo em 2 a 4 segundos várias perguntas. Distratores se descartam por bom senso ("Mais flores", "Cor e tamanho"), e há explicações vazias ("porque é um fato amplamente reconhecido").
- A prova de amanhã, já gerada pelo código novo, tem 6 perguntas.
- A segunda tentativa do pacote 11 quase não entra em jogo enquanto ele acerta tudo. Por isso o 10b vem antes do 11.

**Método.** Um pacote por vez.
- Barra: `npx tsc --noEmit -p tsconfig.app.json` com 0 erros; `npx eslint src --max-warnings 8` com 0 erros; `npm run test:english` e `npm run test:village` verdes.
- Evidência só na conta de teste (`teste@flash.com`).
- Relatório no fim de `docs/etapas/RELATORIO_ETAPA_3.md`.
- **Pare antes do commit: o líder revisa primeiro, porque o push publica direto para o Heitor.**
- Sem restilizar. Não toque em `cart.ts`, `CartBench.tsx`, `src/game/**`.

## Pacote 14a-2 — a Ferraria olha a última concluída

O plano de amanhã da Mina é gerado de manhã, quando ele abre a Mina, **antes** de ele fazer a Ferraria do dia. `yesterdayForgeScore` (em `src/services/englishAi.ts`) procura a Ferraria de "ontem" em relação à data do plano, que ainda está sem resultado. Resultado: o degrau para baixo do 14a quase nunca dispara. A Ferraria de amanhã (26/09) só saiu `form` porque o rodízio caiu em am/is/are.

1. Troque por `lastForgeScore(plans, date)`: a Ferraria **concluída** mais recente, de qualquer plano com data anterior a `date`, que tenha `result`. Sem nenhuma concluída, `{ score: 0, max: 0 }`, e não desce.
2. `forgeTargetFor` continua igual; muda só de onde vem o placar.
3. Teste puro:
   - planos `[23/09 com 0/6, 24/09 com Ferraria aberta]` para a data 25/09: desce;
   - `[23/09 com 4/6, 24/09 aberta]`: não desce;
   - sem nenhuma concluída: não desce.

## Pacote 10b — prova sempre com 8, revisor mais exigente e o Sábio lendo de verdade

**1. Nunca menos de 8** (regra 22 da v3, que hoje não se cumpre). Em `generateDailyQuiz` (`src/services/aiDailyQuiz.ts`), depois da reserva offline, se ainda faltar vaga:
- **(a) segunda substituição por IA** só para as vagas que faltam. É uma chamada, com o mesmo `replacementBrief` e as quedas da primeira rodada no "Proibido repetir";
- **(b) se ainda faltar, completa com qualquer pergunta válida do banco offline, de qualquer área.** A vaga do dilema e as da ideia do dia aceitam pergunta de conhecimento quando não há outra; o dilema pode faltar, a prova não. Uma área não repete mais de duas vezes;
- **(c)** grave em `sanitize` quantas vagas vieram de cada caminho: `secondReplacement`, `offlineAnyArea`.

Teste com IA falsa:
- lote de 11 com 6 reprovadas e substituição que devolve 1 boa: a prova final tem 8;
- lote em que só a vaga do dilema falta: a prova tem 8, sem dilema.

**2. Banco offline pelo validador (P2.3).**
- Rode `validateDailyQuestions` (ou `checkQuestion`) sobre as 200 de `public/data/quizData.json`.
- Cole no relatório: quantas passam por área, e os códigos de reprovação mais comuns.
- Liste as reprovadas em `docs/conteudo/BANCO_OFFLINE_REPROVADAS.md` (enunciado e códigos). O líder reescreve essas; você não reescreve conteúdo.

**3. Revisor mais exigente** (`reviewSystem` em `src/services/quiz/reviewer.ts`). Acrescente estes casos de reprovação, com a mesma voz seca de hoje:
- um distrator que qualquer criança descarta sem saber o conteúdo (absurdo, de outra categoria, como "Cor e tamanho" para "o que a bola molhada afeta");
- `why` que não explica o porquê: só repete que é verdade ou que é conhecido ("amplamente reconhecido", "bem documentado", "é um fato histórico");
- pergunta que se responde sem ler a ideia do dia e sem saber a matéria (fácil demais para o 5º ano).

**4. Duas travas locais novas** no validador (`src/services/quiz/validateQuestion.ts`), com teste cada:
- `why_circular`: o `why` contém "amplamente reconhecid", "bem documentad", "consensual", "é um fato histórico" ou "é verdade porque é", e não traz número, data, lugar nem causa. Reprova.
- `dilema_com_certa`: pergunta `LIC.DILEMA` cujo `why` diz "a resposta certa" ou "a certa é". Reprova.

**5. Desafio pelo desempenho.** Em `buildAndSave`, leia do `quizBank` os últimos 14 dias do Heitor. Se ele acertou 90% ou mais, com pelo menos 12 perguntas, e a mediana de `msToAnswer` ficou abaixo de 6 s, o prompt recebe uma linha:

> "Ele está acertando quase tudo e respondendo rápido: suba um degrau. Distratores são erros de quem pensou pela metade, não bobagens; a conta tem uma etapa a mais; a pergunta de ciências pede o mecanismo, não o efeito óbvio."

Função pura `challengeLine(items, today)` com teste nos dois lados de cada limite. Sem dados suficientes, sem linha.

**6. O Sábio comenta a reflexão aceita.** Em `judgeReflection` (`src/services/aiDailyQuiz.ts`), troque "Se aceitou, diz só que leu" por:

> "Se aceitou, uma frase sobre algo específico que ele escreveu: retome a ideia dele com as palavras dele e, se couber, termine com uma pergunta curta que leve a ideia adiante. Sem elogiar a pessoa, sem nota, sem 'muito bem'."

- Exemplo para o prompt, com a reflexão de 24/09 ("…eu ia pensar duas vezes… economizar mais…"): "Esperar para juntar mais: foi isso mesmo. Que brinquedo você esperaria uma semana?"
- O corte de 160 caracteres continua. Sem IA, a fala local "Li sua reflexão." continua.
- Teste do parser: resposta aceita sem `say` cai na fala local.

**Aceite do 10b:**
- Testes verdes dos itens 1, 4, 5 e 6.
- O relatório do banco offline (item 2).
- **Três provas geradas de verdade na conta de teste** (três chamadas; só essas): as três com 8 perguntas; para cada uma, cole o JSON de `sanitize` e as 8 perguntas com as seis respostas da lei do professor.
- Uma reflexão aceita na conta de teste mostrando a fala nova do Sábio (foto 1280×720).

## Pacote 10b-2 — a prova sem molde e o revisor que confere

Sentimento alvo: cada dia pede um jeito diferente de pensar, e nenhuma pergunta se acerta só pelo bom senso.

**Por quê.** As três provas de teste do 10b (04, 05 e 06/12) estão lidas em `REVISAO_ETAPA_2_LANCAMENTO.md`, seção "Pacote 10b — correções C1 a C4":
- a mesma conta e o mesmo inglês nos três dias, copiados do exemplo do prompt;
- nenhuma pergunta de história ou geografia;
- ciências com efeito óbvio;
- o revisor `gpt-4o` aprovou tudo;
- a frase do exemplo do dilema virou opção.

Os textos novos estão em `docs/conteudo/MOLDES_PROVA.md`. Copie de lá; não reescreva.

**1. Um molde do dia por área** (`src/services/quiz/dailyPrompt.ts`).
- Função pura `moldOfDay(area, date)`: `dayNumber(date) % lista.length`. `BuildPromptInput` ganha `date`; quem chama passa `opts.date`.
  - Matemática: M1 a M7.
  - Ciências: C1 a C5.
  - História ou geografia: H1 a H5.
  - Inglês do nível 1: I1 a I7. Nos níveis 2 em diante, gira pela lista `promptAllowed` do nível.
  - Teste: dois dias seguidos nunca repetem o molde na mesma área.
- No prompt principal:
  - Saem o "MODELO de forma" da abelha e o "MODELO de inglês" do gato (com o "troque o bicho e o lugar").
  - O MODELO de forma passa a ser o M do dia, em JSON, com kind "knowledge", subject "matematica", skill "MAT.OP2" e bloom "aplicar". A frase que o apresenta diz: "a conta de hoje segue este molde, com outra história e outros números".
  - Cada linha de `areaRule` leva o molde do dia da sua área.
- Na linha de história e geografia entra a regra e o exemplo de forma do bloco H: a resposta é causa ou consequência, e o enunciado nunca é "Qual fato é verdadeiro" nem "Qual frase é verdadeira".
- Em `replacementBrief`:
  - os moldes A e B de MAT.OP2 dão lugar ao M do dia;
  - as vagas HIS.FATO e GEO.FATO recebem a mesma linha de história e geografia do prompt principal. Hoje recebem só a área, e a substituição volta com o mesmo molde de trivia.

**2. Distratores e ciências no prompt de base, não só na linha de desafio.**
- Em "Exigências", a linha dos distratores passa a ser a de `MOLDES_PROVA.md`.
- O exemplo de opções do LIC.APLICA troca "O gelo some no ar / O gelo vira pedra" pelas quatro do gelo que boia.
- A linha de ciências diz: o mecanismo, não o efeito óbvio.
- `CHALLENGE_LINE` fica só com o degrau: "Ele acertou quase tudo nas últimas duas semanas: suba um degrau. A conta tem uma etapa a mais, e cada distrator é o resultado de uma etapa feita pela metade."

**3. O dilema sem frase para copiar.**
- A regra do dilema de `MOLDES_PROVA.md` substitui o texto do C1 nos três lugares:
  - `dailyPrompt.ts`, bloco 3;
  - `aiDailyQuiz.ts`, os dois textos de substituição.
- Sai o exemplo "('Quem conversa sobre prioridades...')". Ele virou opção nas provas de 05 e 06/12.
- `OPTION_SIZE` fica só com "As 4 opções têm o mesmo tamanho (± 2 palavras) e nenhuma é caricata." Saem o exemplo do amigo e "Só a primeira ajuda; as outras três são omissão ou desculpa".
- A vaga LIC.DILEMA de `replacementBrief` recebe a regra do dilema.
- O "MODELO de dilema" de `buildReplacementPrompt` passa a ser o D1.

**4. O revisor confere critério por critério** (`src/services/quiz/reviewer.ts`).
- Em `reviewSystem`:
  - Tire "Se uma opção é claramente a certa, ok true." Ela manda aprovar a pergunta fácil.
  - Troque a frase "Reprove também se: um distrator qualquer criança descarta…" por três campos, que ele preenche em toda pergunta, antes do `ok`:
    - `no_enunciado`: a resposta, ou a palavra que a decide, já está no enunciado ("locomotiva a vapor" → "Com vapor");
    - `descartaveis`: a lista das erradas que uma criança de 10 anos descarta sem saber a matéria ("Explodiria", "Flutuaria", "Fica invisível"). No inglês e no dilema, lista vazia;
    - `sem_saber`: dá para acertar sem ler a ideia do dia e sem saber a matéria ("sem bateria, o carro para").
  - A regra do why que só repete que é verdade continua.
- O código decide, não o modelo. Em `applyReview`, sai da prova:
  - `ok` false;
  - ou, fora do dilema:
    - `no_enunciado`;
    - `sem_saber`;
    - 2 ou mais `descartaveis`, fora do inglês.
  - O motivo gravado é o nome do campo, e em `descartaveis` vai também a lista.
- `parseReview` aceita resposta sem os campos novos: `false` e lista vazia. `rescueDilemma` fica como está.
- Teste puro de `applyReview` com os campos novos:
  - dilema com `sem_saber` fica;
  - inglês com 3 descartáveis fica;
  - ciências com 2 descartáveis sai.

**5. A palavra da certa no enunciado** (`validateQuestion.ts`). Além do `stemLeak` de hoje, vale `enunciado_vazou` quando uma palavra da certa com 5 letras ou mais aparece inteira no enunciado e em nenhuma errada. Não vale para `LIC.DILEMA`. Teste:
- "Como a primeira locomotiva a vapor se movia?" com a certa "Com vapor" reprova;
- "Por que os gregos usaram um cavalo de madeira na história de Troia?" com a certa "Para enganar os troianos" passa;
- as 21 publicadas de 04 a 06/12, fora a da locomotiva, continuam passando;
- conte no relatório quantas das 24 válidas do banco offline passam a cair.

**6. Desafio pelo acerto** (`challengeLine.ts`).
- Sai a condição da mediana de 6 s. Fica assim: 12 perguntas ou mais nos 14 dias, fora o dilema, com 90% ou mais de acerto.
- O Heitor acertou 100% com mediana de 8,7 s: a regra de hoje nunca o alcança.
- Atualize os testes dos limites.

**7.** Em `reviewBatch`, tire "qual frase e verdadeira" da lista de formatos.

**Aceite do 10b-2:**
- Barra verde, com os testes novos dos itens 1, 4, 5 e 6.
- **Revisor sobre as 21 publicadas de 04, 05 e 06/12.** Um script chama `reviewApproved` sobre as perguntas gravadas; nenhuma prova é gerada. Cole o JSON de cada pergunta.
  - Esperado: saem a da locomotiva, a da bateria e a do vento.
  - Ficam: perímetro, ovos, mandioca crua, cavalo de Troia, soldados escondidos e as três de inglês.
  - Se sair uma dessas, cole e não ajuste o texto; o líder decide.
- **Três provas novas na conta de teste, em 07, 08 e 09/12** (três chamadas; só essas). Cole o `sanitize` e as perguntas com a leitura da lei do professor, como no 10b. O líder confere:
  - história ou geografia em pelo menos duas das três, sem "Qual fato é verdadeiro";
  - a conta e o inglês mudam de molde entre os três dias;
  - nenhum distrator absurdo nas publicadas;
  - o dilema em primeira pessoa, sobre a ideia do dia, com no máximo uma opção de ficar parado e nenhuma frase copiada do prompt;
  - quantas perguntas saíram em cada uma. O banco novo do líder cobre o que faltar.

**Fora:** o banco offline novo (líder), os pacotes 11, 12 e 14b.

## Pacote 10d — o banco de reserva da prova (amostra de `docs/conteudo/BANCO_RESERVA_V3.md` aprovada pelo pai em 25/09)

Sentimento alvo: a pergunta que tapa uma vaga ensina tanto quanto a da IA.

**Por quê.** Das 200 perguntas do banco antigo, 21 passam no validador. As que entram na prova têm o `why` igual ao `trap`, porque `loadOfflineCandidates` copia `explanation` nos dois, e várias são trivia (a ordem dos planetas, a arma de Zeus). O líder escreveu 60 novas, 12 por área, e as 60 passam no validador.

1. Copie `docs/conteudo/banco-reserva-v3.json` para `public/data/provaReserva.json`. Não mude o texto.
2. Em `aiDailyQuiz.ts`, a leitura de uma linha vira função pura `reserveFromRow(row)`:
   - do banco novo saem `question`, `options`, `answer`, `why`, `trap`, `subject`, `skill`, `audioText` e `scenario`, com `kind` "knowledge" e `explanation` igual ao `why`;
   - uma linha sem `why` (banco antigo) sai como hoje.
3. `loadOfflineCandidates` lê `provaReserva.json`. Se ele não carregar, usa `quizData.json`, como hoje.
4. `offlineQuiz` (a IA falhou ou `forceOffline`) monta as 8 do banco novo: no máximo 2 por área, sem repetir o que ele já viu.
5. A Missão Surpresa (`aiQuiz.ts`) continua com `quizData.json`.

Testes:
- `reserveFromRow`, com uma linha nova e uma antiga;
- um teste lê `public/data/provaReserva.json` e passa as 60 no `validateQuestion`: nenhuma cai por código duro, e em todas o `why` é diferente do `trap`. Ele protege o banco quando alguém editar o arquivo.

**Aceite:** barra verde e uma prova com `forceOffline` na conta de teste, com as 8 perguntas e o `sanitize` coladas no relatório.

## Depois

1. **Pacote 11** de `docs/etapas/PROMPT_CURSOR_2026-09-23.md`: perfil, segunda tentativa com aviso, painel "Como ele vai".
2. **Pacote 12** do mesmo arquivo.

O líder escreve em seguida o **14b**: o portão de leitura da Carta (ele respondeu Cartas em 6 e 10 segundos em 25/09) e o revisor de conteúdo dos contratos.
