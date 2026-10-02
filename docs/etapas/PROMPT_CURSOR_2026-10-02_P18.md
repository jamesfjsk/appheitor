# Frente P18 — acabamento do inglês, do Laboratório e da prova (02/10/2026)

Você é o Cursor do Miner Missions, na frente P18. Antes de qualquer linha, leia:
- `.cursor/rules/lei-excelencia-aaa.mdc`;
- `docs/etapas/REVISAO_ETAPA_2_LANCAMENTO.md`, as seções de 02/10 (o que ficou pendente);
- `docs/MINA_CONTRATOS.md` §9;
- `docs/CONTRATOS_E_CARREIRAS.md` §11.4, §11.5 e §14;
- `docs/APRENDER_A_APRENDER.md` §4.

São sete itens independentes, todos com o desenho pronto. Nenhum precisa de conteúdo novo do pai.

## Onde e como

- **Pasta:** `..\appheitor-p18`, branch `p18`, porta 5185. O pai cria a pasta com `powershell -ExecutionPolicy Bypass -File scripts\dev\tres-frentes.ps1 p18`.
- **Regras:** as mesmas das frentes anteriores:
  - só na sua pasta, sem `git push` e sem tocar no `main`;
  - só a conta de teste. Nunca a do Heitor;
  - nunca grave `undefined`;
  - sem restilizar: CSS novo só em `src/styles/miner.css`, e o painel continua em Tailwind;
  - não toque em `cart.ts`, `CartBench.tsx` e `src/game/**`.
- **Relatório** em `docs/etapas/relatorios/P18.md`, com:
  - a barra da lei;
  - a conferência de conexões;
  - o que entrou sem doc;
  - as escritas recusadas.
- **Barra no fim de cada item:**
  - `npx tsc --noEmit -p tsconfig.app.json`, com 0 erros;
  - `npx eslint src --max-warnings 8`, com 0 erros;
  - `npm run test:english` e `npm run test:village`;
  - `npx vite build`.
- **Um commit por item:** `p18: item N, <resumo>`. No fim, pare.
- **Na conta de teste,** a Mina só abre com a prova do dia feita. Use uma data `?d=` em que a prova já esteja feita, ou faça a prova antes. Não mexa no gate.
- **Fotos** em 1280×720 e 1920×1080 de verdade.

## Item 1 — Carta C2 com perguntas em português (§9.4)

- Hoje a C2 usa o prompt antigo, com perguntas em inglês. Pela tabela do §9.4, a C2 tem 50 a 70 palavras, perguntas em português e opções em inglês copiadas do texto.
- Faça o `letterPromptC2` no molde do `letterPromptC1`, com as mesmas regras de motivo e de no máximo 3 objetos com função. A C3 continua com o prompt de hoje.
- O validador da C2 aceita:
  - pergunta que passa no `c1QuestionOk`;
  - 3 opções;
  - opções que aparecem no texto, palavra por palavra.
- **Aceite:** 3 cartas C2 geradas ao vivo, coladas inteiras no relatório, com a nota do revisor.

## Item 2 — O revisor da carta confere se a prova sustenta a resposta

- **O caso real** (relatório da P17, carta "O Campinho Novo"): a pergunta "Para onde Luna quer que você vá?" tem como prova "Take the bag and come fast.", que não diz o lugar. O revisor deu 5.
- O revisor ganha o campo `evidenceSupports` (true só quando a frase da prova, sozinha, mostra que a opção certa é a certa). Falso reprova.
- **Teste puro:** o `parseLetterReview` com `evidenceSupports: false` reprova.
- **Aceite:** a carta do caso real passa pelo revisor e é reprovada. Cole a resposta dele.

## Item 3 — Sem cronômetro na tela dos contratos (§2.2 do MINA_CONTRATOS)

- Hoje a casca (`ContractShell.tsx`) mostra "0:07" no canto. O desenho pede bolinhas de progresso, sem cronômetro na cara. O tempo continua gravado em `durationSec`.
- Tire só o número da tela. A medida continua.
- **Aceite:** fotos da Ferraria e do Recado sem o número.

## Item 4 — Comerciante: escada de ajuda (APRENDER_A_APRENDER §4.5, AP2)

- **Primeiro erro:** o item volta à bandeja, e o pedido toca de novo, sem a frase corrigida.
- **Segundo erro:** a pista de onde olhar, sem dar a resposta: "Presta atenção na palavra depois de *apple*." É a palavra logo depois do item, que é a preposição.
- **Terceiro erro:** o `correctionFix`, como hoje.
- O pagamento continua só na primeira tentativa (decisão 23). Grave `supportLevel` por pedido em `details`.
- **Teste puro** da escada (degrau por número de erros).
- **Aceite:** um pedido errado três vezes na conta de teste, com uma foto de cada degrau.

## Item 5 — Prova: nada de repetir o molde da frase em 7 dias

- **Os casos reais:**
  - "Durante um jogo de futebol, o gramado está molhado. Como isso afeta a bola?" (30/09) e "Durante um jogo de futebol, o vento está forte. Como isso afeta a bola?" (01/10);
  - "There ___ a cat under the table." (30/09), "There ___ a fish in the aquarium." (01/10) e "There ___ a dog in the garden." (02/10).
- O dedupe da prova (`avoidQuestionsFromRecent`) passa a recusar também pergunta com o mesmo esqueleto nos últimos 7 dias. Esqueleto é a pergunta sem os substantivos e sem o que está entre o artigo e o verbo. Use a medida de semelhança que o projeto já tem, sobre o esqueleto.
- A de inglês segue a unidade aberta, mas muda a frase: sujeito, lugar e forma.
- **Testes puros** com as cinco frases reais acima.

## Item 6 — Laboratório, 15b-2 (CONTRATOS_E_CARREIRAS §11.4, §11.5 e §14)

O núcleo do 15b está no `main`. Leia a seção "15b núcleo" da revisão. O progresso da carreira sai das entregas aprovadas (`careerSnapshot`), recalculado pelo `CareerSync` no painel. Não ponha a carreira dentro da transação de aprovação.

1. **As 8 conquistas da Torre do §14,** pelo caminho que já existe (catálogo, `statSources.ts`, `bumpVillage`). Quem soma é o `CareerSync`, no painel, com chave de claim para não somar duas vezes.
2. **Metacognição leve (§11.5):**
   - no treino 12 e nos projetos, "Deu algum problema antes de funcionar?" (sim ou não) e, se sim, "O que você mudou para funcionar?", em `submissions[].whatWentWrong` e `whatChanged`, que já existem no `submitAssignment`;
   - no Conferir, o pai marca "houve falha e ele corrigiu" (`fixedAfterFailure`), que já existe.
3. **Cerimônia de promoção:** a faixa "Você agora é Técnico da Vila." já existe. Acrescente a cerimônia de obra que a Vila já usa (`buildFx`) no lote do Laboratório, uma vez por título, e a fala do Ferreiro.
4. **`hintsUsed`:** a tela grava quantas pistas ele abriu, junto com a entrega (dentro de `submissions[].proof.note` não, num campo `hintsUsed` da entrega). Se a regra do Firestore recusar o campo novo, anote no relatório e não mexa em `firestore.rules`: o líder publica.
5. **No Conferir,** o treino mostra "Treino · XP e 1 redstone" em vez de "0 gold".

**Aceite:**
- na conta de teste, os treinos 1 a 7 aprovados por script de teste, com a conquista "Primeiro circuito" e o Método liberado;
- com o progresso preparado, a promoção a Técnico, com a cerimônia;
- fotos.

## Item 7 — Limpeza

- Saem o `forgeTargetFor` e o `FORGE_TAG_TARGETS` da escolha do dia, se nada mais usar. O título da Ferraria já vem da unidade, corrigido pelo líder.
