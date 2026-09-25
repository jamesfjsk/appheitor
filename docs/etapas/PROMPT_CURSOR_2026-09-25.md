# Prompt para o Cursor — 25/09/2026 (14a-2: Ferraria olha a última concluída; 10b: prova sempre com 8 e mais exigente; depois o 11 e o 12)

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

## Depois

1. **Pacote 11** de `docs/etapas/PROMPT_CURSOR_2026-09-23.md`: perfil, segunda tentativa com aviso, painel "Como ele vai".
2. **Pacote 12** do mesmo arquivo.

O líder escreve em seguida o **14b**: o portão de leitura da Carta (ele respondeu Cartas em 6 e 10 segundos em 25/09) e o revisor de conteúdo dos contratos.
