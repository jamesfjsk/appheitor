# Frente P19 — AP1: o laço do plano e a ponte da quinzena (04/10/2026)

Você é o Cursor do Miner Missions, na frente P19. Antes de qualquer linha, leia:
- `.cursor/rules/lei-excelencia-aaa.mdc`;
- `docs/APRENDER_A_APRENDER.md`, inteiro, e principalmente o §7 (a especificação), o §8 e o §15 (aceite geral);
- `docs/conteudo/FALAS_APRENDER.md`, §3 e §4. Copie o texto sem reescrever.

**O ajuste de 24/09 vale,** confirmado pelo pai junto com a amostra das falas: o laço do plano fica no fim da prova, depois da reflexão, e não no "Fechar o dia". O "Fechar o dia" continua como está.

## Onde e como

- **Pasta:** `..\appheitor-p19`, branch `p19`, porta 5186. O pai cria a pasta com `powershell -ExecutionPolicy Bypass -File scripts\dev\tres-frentes.ps1 p19`.
- **Regras:** as mesmas das frentes anteriores:
  - só na sua pasta, sem `git push` e sem tocar no `main`;
  - só a conta de teste. Nunca a do Heitor;
  - nunca grave `undefined`;
  - sem restilizar: CSS novo só em `src/styles/miner.css`, e o painel continua em Tailwind;
  - não toque em `cart.ts`, `CartBench.tsx` e `src/game/**`.
- **Relatório** em `docs/etapas/relatorios/P19.md`, com a barra da lei, a conferência de conexões, o que entrou sem doc e as escritas recusadas.
- **Barra no fim de cada passo:**
  - `npx tsc --noEmit -p tsconfig.app.json`, com 0 erros;
  - `npx eslint src --max-warnings 8`, com 0 erros;
  - `npm run test:english` e `npm run test:village`;
  - `npx vite build`.
- **Um commit por passo.** No fim, pare.
- **Fotos** em 1280×720 e 1920×1080 de verdade. Na conta de teste, a prova precisa ser feita até a reflexão para o laço aparecer: faça a prova inteira numa data `?d=` nova.

## Passo 1 — O laço do plano no fim da prova (§7.1)

1. **Dados no doc da prova do dia:**
   - `plan`: a frase de hoje, com pelo menos 3 palavras;
   - `planDone`: `'sim' | 'parte' | 'nao'`, sobre o plano de ontem;
   - `planObstacle`: `'esqueci' | 'tempo' | 'dificil' | 'mudei'`, opcional.

   O `fromDoc` lê os três. A regra de `dailyQuizzes` não lista campos, então não muda.
2. **A tela, no mesmo papiro do Sábio, logo depois da reflexão aceita:**
   - se a prova de ontem tem `plan`: "Ontem você disse que ia:", a frase dele em itálico, exatamente como escreveu, "E aí?" e os botões Fiz, Em parte e Não fiz;
   - em "Em parte" ou "Não fiz", as fichas opcionais Esqueci, Não deu tempo, Ficou difícil e Mudei de ideia, com um toque;
   - sempre: "E hoje, o que você vai fazer?", com o campo "Hoje eu vou...". Aceita com 3 palavras ou mais;
   - um link discreto, "Deixar para depois", fecha sem plano. O laço nunca tranca a Mina.
   - Os textos estão em `FALAS_APRENDER.md` §3.1.
3. **Sem plano ontem** (primeiro dia, dia sem prova, folga, férias ou punição): a linha de ontem não aparece, e o plano de hoje aparece.
4. **A fala do Sábio** (§3.2), por um seletor puro em `src/services/quiz/planLoop.ts`:
   - escolhe pelo caso (fiz, em parte, esqueci, sem tempo, difícil, mudei de ideia, não fiz sem ficha);
   - não repete o mesmo id em 14 dias dentro do caso;
   - aparece no papiro na hora e vai para a Placa até o fim do dia, pelo `saveNotice` que já existe, com `until` igual a hoje;
   - sem pagamento e sem sermão.
5. **De manhã,** o `sageReplyFor` (`src/services/village/checkin.ts`) usa a fala do plano de ontem quando ela existe, em vez do sorteio.
6. **Tocha de plano:** cada "Fiz" soma 1 em `plansDone` (estatística da Vila, pelo `bumpVillage`), com chave de claim por data para não somar duas vezes. A conquista "Plano cumprido" entra no catálogo da Torre, pelo caminho de `statSources.ts`. É contador, não moeda.
7. **Painel, na aba Prova:** o plano de ontem, o "Fiz/Em parte/Não fiz", a ficha e o plano de hoje, em cada dia.
8. **Testes puros:**
   - o seletor nos sete casos do §3.2;
   - a regra dos 14 dias;
   - o mínimo de 3 palavras;
   - o dia sem plano ontem.
9. **Aceite:**
   - fotos do fim da prova com o plano de ontem, os três botões, as fichas e o campo de hoje;
   - a fala no papiro e na Placa.

## Passo 2 — A ponte da quinzena (§7.2)

1. **Calendário** em `src/data/bridge.ts`:
   - as cinco ferramentas do `FALAS_APRENDER.md` §4, na ordem (Entender o pedido, Fazer menor, De trás para frente, Testar e olhar, Riscar o que não pode);
   - uma por quinzena, a partir da segunda-feira 05/10/2026;
   - depois da quinta, recomeça.

   Teste puro da data para a ferramenta.
2. **Cartão no painel, na aba Hoje,** no Tailwind do painel e sem restilizar, com:
   - o nome da ferramenta e "até dd/mm";
   - a pergunta para o jantar, com o botão "copiar";
   - "Pense em voz alta na frente dele";
   - a missão-problema, com o botão "Criar como desafio", que cria nos Desafios pelo caminho que já existe (`kind: 'manual'`) com um toque;
   - "Quando ele pedir ajuda no dever, antes de explicar, pergunte: ...".
3. **As pistas da prova:** quando o aviso da área (`nudge`) puder usar a ferramenta da quinzena, prefira a frase dela. Use só as frases do `FALAS_APRENDER.md` §1.1 que já existem. Nada novo sem doc.
4. **Aceite:** fotos do cartão em 1280×720 e 1920×1080, e um desafio criado pelo botão, na conta de teste, pelo login do pai, se você tiver. Se não tiver, anote no relatório que essa foto ficou para o líder.

## Fora deste pacote

- O comprovante do dever com pergunta de processo (decisão 24).
- O formato "Quando ___, eu vou ___", que é para 12–13 anos.
- O Caderno, o Diário e a pergunta sobre o dia (AP5).
