# Frente P17 — o inglês por unidades (30/09/2026)

Você é o Cursor do Miner Missions, na frente P17. Antes de qualquer linha, leia:
- `.cursor/rules/lei-excelencia-aaa.mdc`;
- `docs/MINA_CONTRATOS.md` §9, inteiro. É a especificação. Os §2 e §3 continuam valendo para a cena;
- `docs/conteudo/INGLES_UNIDADES.md`: copie o banco sem reescrever;
- `docs/APRENDER_A_APRENDER.md` §4.5: como tratar o erro e a ajuda.

**O líder já corrigiu no `main`, em 30/09:** o nível é só o do painel, e a Mina não sobe sozinha (`englishAi.ts`, `englishBaseService.ts`). Não desfaça isso.

## Onde e como

- **Pasta:** `..\appheitor-p17`, no branch `p17`, com o servidor na porta 5184. O pai cria a pasta com `powershell -ExecutionPolicy Bypass -File scripts\dev\tres-frentes.ps1 p17`.
- **Regras:** as mesmas de `PROMPT_CURSOR_2026-09-29_TRES_FRENTES.md`:
  - só na sua pasta, sem `git push` e sem tocar no `main`;
  - só os seus arquivos;
  - servidor com `npx vite --port 5184 --strictPort`;
  - só a conta de teste. Nunca a do Heitor, e nunca gere plano da Mina para ele.
- **Relatório** em `docs/etapas/relatorios/P17.md`, com:
  - a barra da lei;
  - a conferência de conexões;
  - o que entrou sem doc;
  - as escritas recusadas.
- **Barra no fim de cada passo:**
  - `npx tsc --noEmit -p tsconfig.app.json`, com 0 erros;
  - `npx eslint src --max-warnings 8`, com 0 erros;
  - `npm run test:english` e `npm run test:village`;
  - `npx vite build`.
- **Um commit por passo:** `git add -A` e `git commit -m "p17: passo N, <resumo>"`. Siga para o passo seguinte. O líder revisa o branch no fim.
- **O passo 2 espera o "ok" do pai na amostra do banco** (U1 e U5). Se o "ok" não tiver chegado, faça o passo 3 antes e volte.
- **Sem restilizar:**
  - CSS novo vai em `src/styles/miner.css`;
  - o painel continua em Tailwind branco e azul;
  - não toque em `cart.ts`, `CartBench.tsx` e `src/game/**`;
  - nunca grave `undefined`: use `omitUndefined`.
- **Fotos** em 1280×720 e 1920×1080 de verdade, não recorte.

## Seus arquivos

- `src/config/englishLevels.ts`, `src/config/englishRewards.ts` e `src/config/englishBase.ts` (só o `initialBaseDoc` e os campos novos);
- o novo `src/config/englishUnits.ts`, que é o banco;
- `src/services/english/*`, com os testes, e os puros novos nessa pasta (`units.ts`, `forgeMolds.ts`, `review.ts`, `letterLevel.ts`);
- `src/services/englishAi.ts` e `src/services/englishBaseService.ts`;
- `src/data/englishOfflineContracts.ts`;
- `src/types/english.ts`;
- em `src/components/hero/english/base/`:
  - `ForgeContract.tsx` e `LetterContract.tsx`;
  - `RecadoBoard.tsx` e `NoteContract.tsx`;
  - `MerchantDelivery.tsx` e `MerchantContract.tsx`;
  - `ContractResult.tsx` e `ContractBoard.tsx`;
- `src/components/parent/EnglishBaseManager.tsx`, para o cartão novo;
- no passo 4, a entrada de inglês da prova: `src/services/aiDailyQuiz.ts`, `src/services/quiz/dailyPrompt.ts` e quem chama `generateDailyQuiz`, só para passar a unidade e o nível. Antes desse passo, rode `git merge main`.

## Passo 1 — Recado: nota pelo recado, e a correção conta (§9.5)

1. **A nota** (`noteScore` em `scoring.ts`):
   - 3: as ideias do pedido, sem erro;
   - 2: as ideias, com 1 ou 2 erros que não mudam o sentido;
   - 1: faltou ideia, o sentido se perdeu, ou houve 3 erros ou mais;
   - 0: não é inglês.
2. **O juiz** (`prompts.ts`) devolve:
   - `ideas: [{ pt, ok }]`, com a ideia julgada pelo sentido, com qualquer palavra e em qualquer ordem;
   - `meaningLost: true` só no erro que impede o leitor de entender. Falta de "to" ou de artigo nunca perde o sentido.

   O `missingInfos` fica só para quando a IA falha.
3. **A segunda tentativa:**
   - o Capataz diz "Na segunda: N de 3." e, no 3, "O quadro está certo.";
   - o resultado grava `details.secondScore`;
   - o pagamento continua só pela primeira (decisão 23);
   - o `nextScaffoldStage` continua pela primeira.
4. **A dica é grátis** e só aparece depois da primeira tentativa. Sai o desconto de ferro em `completeContract` e na tela.
5. **O gerador** pede o pedido com as três ideias, uma por frase, na ordem do "não pode faltar". No passo 2, os moldes passam a vir da unidade.
6. **Testes, com as frases reais do Firestore, coladas inteiras:**
   - 30/09, primeira: "I want play soccer. I do my homework first. I wait because my homework is first." dá 2;
   - 30/09, segunda: "I want to play soccer. I do my homework first. I wait because my homework is first." dá 3;
   - 28/09, primeira: "I don't want play soccer now. I do my homework first because homework is important." dá 2;
   - 29/09, primeira: "Can I wait I do now? I can because dinner is first." dá 1, com o julgamento marcado como "inventado";
   - um texto em português dá 0.
7. **Aceite:**
   - na conta de teste, as frases de 28, 29 e 30/09 digitadas como primeira tentativa, com o julgamento e a nota colados no relatório;
   - fotos do quadro com "Na segunda: 3 de 3." e da dica depois da primeira tentativa.

## Passo 2 — Ferraria por unidades (§9.2 e §9.3). Espera o "ok" do pai no banco.

1. **Banco:** `src/config/englishUnits.ts`, transcrito de `INGLES_UNIDADES.md` sem mudar o texto. Cada unidade tem:
   - id, nível e nome;
   - a lição, os exemplos e o "não é assim";
   - as listas;
   - os dois moldes do Recado.
2. **Estado da unidade**, em `units.ts`, puro:
   - `currentUnit(base)`;
   - `unitAfterForge(state, { date, first, max })`: selo com 2 Ferrarias com pelo menos 5 de 6 de primeira, em dias diferentes; no mínimo 2 dias; com 6 Ferrarias sem selo, fica "para rever" e a próxima começa;
   - sem campo `unit`, começa na U1 no primeiro plano depois do deploy.
3. **Barras por molde**, em `forgeMolds.ts`, puro:
   - `forgeItemsFor(unit, dayInUnit, seed, review)` segue os degraus do §9.3 e calcula a resposta pela regra;
   - a Ferraria não chama mais a IA. O `generateForge` vira molde, e o offline de hoje fica só para contratos antigos;
   - o validador puro `checkForgeItem` confere:
     - a resposta está entre as opções, e as opções são diferentes;
     - toda palavra vem das listas da unidade ou de uma lista curta de palavras comuns;
     - montar tem até 5 peças, sem peça repetida;
     - escrever aceita a palavra sem apóstrofo, com apóstrofo curvo, com maiúscula, e "does not", "cannot" e "can not".
4. **Na tela:**
   - o cartão da lição antes da primeira barra do dia 1, com áudio nos exemplos;
   - "Ver a regra" nos outros dias, contado em `lessonViews`;
   - dois erros seguidos trazem o cartão de volta, e a próxima barra é de escolher;
   - a unidade selada aparece na parede do Ferreiro como uma placa com o nome, sem arte nova (`mc-card`).
5. **Revisão**, em `review.ts`, puro:
   - `reviewQueue` com caixas de 1, 3 e 7 dias, no máximo 30 itens e 2 barras antigas por dia;
   - cada unidade selada volta uma vez por semana;
   - o erro do Recado vira "Qual está certa?", com a frase dele e a corrigida.
6. **Saem:**
   - a escolha do alvo por `FORGE_TAG_TARGETS` e o "Frases completas";
   - o `forgeTargetFor` por rodízio.
7. **O Recado usa a unidade:**
   - nos dias 1 e 2 da unidade, os dois moldes do banco, como estão;
   - do dia 3 em diante, a IA varia coisas e pessoas do molde e mantém o padrão;
   - o validador confere que o modelo usa o padrão da unidade e que o pedido tem as três ideias. Se reprovar, volta ao banco.
8. **Testes:**
   - o selo nos três casos: selo no dia 2, sem selo e "para rever";
   - as 10 unidades × 50 sementes, com 100% das barras passando no `checkForgeItem`;
   - nenhuma barra com duas respostas certas, conferida pelas tabelas de cada regra;
   - as caixas da revisão;
   - o erro do Recado vira barra.
9. **Aceite:**
   - no relatório, as 6 barras do dia 1 de cada uma das 10 unidades, com a semente 1, para o líder conferir uma a uma;
   - na conta de teste, a U1 do dia 1 ao selo, com datas preparadas por script de teste, e a U2 começando;
   - fotos: o cartão da lição, uma barra de escolher, um montar com peças, o cartão voltando depois de dois erros e a placa do selo.

## Passo 3 — Carta: uma história curta com motivo (§9.4)

1. **O nível da Carta**, em `letterLevel.ts`, puro:
   - C1, C2 e C3, pela tabela do §9.4;
   - sobe com 3 Cartas seguidas com tudo certo de primeira, e desce com 2 seguidas com no máximo 1 certa;
   - sem campo `letterLevel`, começa na C1.
2. **O prompt da Carta:**
   - um dos oito motivos, com cada frase servindo a ele;
   - o padrão da unidade aparece pelo menos duas vezes;
   - perguntas e opções na língua do nível;
   - o tamanho do nível.
3. **O revisor** `gpt-4o`, no molde do revisor da prova. Ele devolve:
   - a nota de coerência, de 1 a 5; passa com 4 ou mais;
   - "uma resposta por pergunta";
   - "a resposta está numa frase só";
   - "dá para responder sem ler".

   Se reprovar, gera de novo uma vez. Se reprovar de novo, usa o banco offline.
4. **Banco offline:** a versão C1 das cartas que já existem em `englishOfflineContracts.ts`, com até 50 palavras e perguntas em português. As 10 primeiras vão coladas no relatório, e o líder e o pai leem antes do commit do líder.
5. **Glossário por toque:**
   - as palavras vêm sublinhadas;
   - o toque curto mostra a tradução e fala a palavra, contado em `glossaryTaps`;
   - sai o hover de 400 ms.
6. **Continuam:** a trava de leitura (14b), a evidência antes das opções e a voz.
7. **Testes:**
   - o `letterLevel` subindo e descendo;
   - o validador da língua: na C1, pergunta sem palavra de pergunta em inglês;
   - o revisor com lixo cai no banco.
8. **Aceite:**
   - três Cartas C1 e uma C2 geradas na conta de teste, coladas inteiras, com as perguntas e a nota do revisor;
   - fotos: a Carta C1 com o glossário sublinhado, uma palavra aberta por toque e a pergunta em português.

## Passo 4 — Comerciante, nível, palavras, prova e painel (§9.6)

1. **Comerciante:**
   - o `merchantMaterial` não corta por `textShown`. Teste: 3 de 3 com o texto aberto paga 3;
   - o `merchantLevel` próprio, em puro: sobe pelo `merchantLevelFromSkill`, desce 1 com 2 entregas seguidas com metade ou menos de primeira, e tem teto no `englishBase.level`;
   - sem campo, começa no menor valor entre o teto e o `merchantLevelFromSkill`;
   - o pedido errado volta em 3 e em 10 dias.
2. **Nível por contrato:**
   - o contrato grava `contract.level`;
   - o `inputFor` usa o nível do contrato;
   - o `plan.level` continua sendo o teto, porque o `setBaseLevel` depende dele.
3. **Palavra conhecida** é `seen >= 3`, no `vocabKnown` e no glossário.
4. **Prova:** depois do `git merge main`, a pergunta de inglês recebe a unidade atual e o nível. Hoje o `englishLevel` não é passado e cai sempre no 1.
5. **Painel:** o cartão "Inglês: como ele vai", pelo §9.6.
6. **Testes:**
   - o `merchantMaterial`;
   - o `merchantLevel` subindo, descendo e parando no teto;
   - o `vocabKnown`.
7. **Aceite:**
   - uma prova gerada na conta de teste, com a pergunta de inglês da unidade colada no relatório;
   - fotos do cartão do painel.
