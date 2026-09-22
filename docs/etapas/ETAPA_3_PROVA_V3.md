# Etapa 3, pacote A: Prova do dia v3

**Proposta do líder, 22/09/2026, aprovada pelo pai no mesmo dia (decisões 32 e 33 do `ETAPA_2_LANCAMENTO.md` §1).** Nasce da análise dos 140 dias de `dailyQuizzes` do Heitor (24/08/2025 a 22/09/2026), da crítica do gerador v2 e da revisão do pacote "Prova do dia v2" (ver `REVISAO_ETAPA_2_LANCAMENTO.md`, 22/09). Base: `main` em `9c2dca4` (Prova v2 no ar desde 21/09 11h46), com duas alterações não commitadas do líder (`docs/etapas/REVISAO_ETAPA_2_LANCAMENTO.md` e `src/components/hero/DailyQuiz.tsx:208,256-262`, o preparo por dia).

Duas correções de premissa sobre as análises de origem, para ninguém citar errado: (1) a pergunta **21/09 Q4** (6 × 5 × 4 = 120, com a explicação que nomeia o erro típico) **não foi gerada pela v2**: a prova de 21/09 saiu do prompt antigo em 20/09 e o líder trocou a Q4 à mão na manhã de 21/09, antes de o Heitor abrir; ela serve como **modelo do que a v3 exige**, não como prova de que a v2 funciona. A única amostra de produção da v2 é a prova de 22/09 (`scratchpad/prova/heitor-22.json`, 8 perguntas cruas, 4 trocadas à mão antes de gravar). (2) A voz (TTS) **não conta** no teto de 800 chamadas do servidor (`bumpUsage(ttsModel, 0, ...)` em `functions/src/index.ts`); `aiUsage/2026-09` marcava 403 chamadas em 22/09 (~19 por dia, ~570 projetadas), então o teto não está estourando — o item P0.7 abaixo foi reescrito de acordo. `npx tsc --noEmit -p tsconfig.app.json` verde; `npm run test:english` (22 arquivos) e `npm run test:village` (10 arquivos) verdes.

Fontes: `scratchpad/prova/analise-dados.md` (140 dias), `scratchpad/prova/critica-prompt.md` (crítica do gerador). Medições próprias desta seção: `scratchpad/prova/valida.ts` → `valida.txt` (protótipo do validador rodando sobre 72 itens reais) e `scratchpad/prova/tts-conta.ts` → `tts-conta.txt` (custo de voz por prova). O corpus de 72 itens = as 64 perguntas da era 3 + as 8 da prova de 22/09 gerada com o prompt v2 em produção (`scratchpad/prova/heitor-22.json`), que é a amostra mais nova que existe do gerador atual.

---

## 1. O que os dados dizem

Contexto em uma linha: 3 provas feitas em 4 dias desde o lançamento, e o acerto cai era a era — 68,6% (5 perguntas), 58,3% (8 perguntas), 45,8% (Miner Missions).

1. **8 de 140 documentos guardam o texto das perguntas.** Os outros 132 gravaram só placar; `questions[]` só passou a ser gravado no formato da era 3 (`src/services/dailyQuizService.ts:117-128`). Toda a crítica por item se apoia nesses 8 dias.
2. **O validador v3 reprova 69 dos 72 itens reais e aprova a melhor pergunta da era 3** (21/09 Q4, `6 × 5 = 30; 30 × 4 = 120`, escrita à mão pelo líder — é a régua, não a produção do gerador). Medido em `valida.txt`. Os 3 que passam no local são: 15/09 Q8 (duas defensáveis, cai no revisor), 19/09 Q5 (fraca mas bem formada) e a 21/09 Q4.
3. **35 dos 72 itens têm explicação que não cita a própria resposta; 23 têm menos de 15 palavras** (mediana 17). É o defeito mais frequente do corpus inteiro, e é o que o pai pediu em `.cursor/rules/lei-excelencia-aaa.mdc:136`: o erro tem que ensinar.
4. **15 itens usam superlativo sem consenso, 13 cobram opinião com gabarito, 13 trazem alternativa caricata, 11 pedem definição ou nome decorado.** Todos os quatro já estão proibidos no prompt v2 (`src/services/quiz/dailyPrompt.ts:43,44,46-50`) e todos os quatro passaram.
5. **Inglês: 0 de 3 respondidas certas; 4 dos 8 itens são palavra solta; nenhum tem áudio; nenhum repete a regra do dia anterior.** O prompt não sabe que `src/config/englishLevels.ts:87-230` existe e nunca recebe o nível da base (`src/services/englishBaseService.ts:697`).
6. **7 das 8 contas de matemática fecham em uma operação.** A única de duas etapas é 21/09 Q4, escrita à mão pelo líder. A amostra real da v2 (22/09 Q7, `200 ÷ 3 → 66`) é conta de um passo que nem fecha: a regra "duas etapas" do prompt v2, sem validador, também não pegou.
7. **8 pares de perguntas com 70% ou mais das palavras de conteúdo em comum em 9 dias**, entre eles 14/09 Q4 e 15/09 Q4 com 100% (a mesma sequência numérica em dias seguidos). A lista `avoid` compara texto, não assunto (`src/services/dailyQuizService.ts:105,111`).
8. **2 reflexões em 135 provas, de 2 e 4 palavras.** Nenhuma chega a 12; 18/09 fechou com `reflection: null`. O portão de 10 palavras (`src/services/quiz/provaRules.ts:5`) nasceu em 20/09 e nunca barrou nada dele.
9. **O `quizBank` está pronto no servidor e vazio: a regra (`firestore.rules:321-328`, que já exige `userId, date, question, hash, correct, category` na criação) e o índice (`firestore.indexes.json:275-289`, `userId asc, date desc`) estão publicados, e nada em `src/` escreve na coleção** — só `src/services/learningService.ts:26` lê. Por isso `quizAccuracyByCategory` está vazio nas duas semanas de `learning-heitor.json`.
10. **A prova gasta 10,9 chamadas de voz por dia — 326 por mês** (medido com o fatiador real, `speakChunks`). A voz não entra no teto de 800 (o servidor incrementa `calls` só no chat), mas o prefetch de voz roda mesmo com a prova fechada (`DailyQuiz.tsx:283-289`): um dia pulado custa 11 chamadas de voz à toa. Com cache por hash (`englishAudio/{hash}`) a frase repetida custa zero; a lição nova, não.

---

## 2. Regras da Prova v3

Numeradas, medíveis, cada uma com o teste que a prova. Onde a regra muda um número que já existe no código, o número velho está citado.

**Conteúdo**

1. **Uma resposta verificável por item.** Um professor que leia só o enunciado e as 4 opções marca a mesma e sabe dizer por que cada uma das outras três está errada. Medida: o revisor (regra 20) responde `ok: false` com motivo quando há mais de uma defensável.
2. **Explicação em dois campos separados, não em um parágrafo.** `explanation.why` (por que a certa é certa, com a conta escrita ou a regra nomeada) e `explanation.trap` (qual opção engana e por que falha). Cada um com 12 palavras ou mais; `why` contém a resposta ou a conta; `trap` nomeia uma das outras três opções pelo texto. Hoje 35 de 72 explicações não citam nem a própria resposta.
3. **Distrator é erro típico de 5º ano.** Proibida a opção caricata: `ignorar`, `fingir`, `chamar de burro`, `falar mal`, `não fazer nada`, `impor`, `não se importar`, `sair do jogo`, `criticar`. Medida: `opcao_caricata` no validador; hoje pega 13 dos 72.
4. **Nenhuma pergunta de opinião com gabarito.** Proibido `o que você faria`, `como você agiria`, `o que você acha`, `você prefere`, `o que seria mais sábio`, `como você poderia usar`. A única exceção é o dilema (regra 6), que não tem "certa" moral e sim consequência. Medida: `opiniao`; hoje pega 13 dos 72.
5. **Proibido superlativo sem consenso e definição decorada.** `o primeiro`, `a principal`, `o melhor`, `o mais avançado`, `o mais famoso`; `o que é X`, `qual é o nome de X`, `qual é a posição de X`, `qual é o processo de X`. Medida: `superlativo_sem_consenso` (15 dos 72) e `definicao_ou_nome` (11 dos 72). Troca deliberada: perde-se uma formulação legítima de vez em quando ("a primeira Copa do Mundo" vira "a Copa do Mundo de 1930") para matar uma classe inteira de lixo com uma regra determinística.
6. **Dilema com custo dos dois lados.** As 4 opções são atitudes que um menino de 10 anos toma de verdade; a melhor resolve sem custo escondido, as outras três resolvem em parte e cobram um preço depois. A explicação diz o que acontece depois de cada uma, em uma linha cada, e não diz "essa é a atitude certa". Medida: `opcao_caricata` zerado na posição 3 e `explanation.trap` preenchido.
7. **Matemática de duas etapas, sempre.** O enunciado traz os números; a resposta exige duas operações. Um dos distratores é o resultado da primeira etapa, e `explanation.trap` diz isso. Medida: `conta_um_passo` no validador; hoje reprova 7 das 8 contas da era 3 e aprova a de 21/09.
8. **Inglês só no nível da base, com frase-contexto.** O item traz a situação em português, uma frase inteira em inglês com UMA lacuna, e os 3 distratores são erros de brasileiro (plural sem -s, artigo trocado, preposição trocada, `writes`/`writing`), nunca uma variante correta de outro inglês. Vocabulário e gramática saem do cartão do nível (`src/config/englishLevels.ts` `promptAllowed`/`promptForbidden`/`maxWords`), e o nível vem de `baseLevelOf` (`src/services/englishBaseService.ts:697`). Medida: `ingles_sem_frase`, `ingles_fora_do_nivel` (via `findForbiddenTokens`, `englishLevels.ts:310-318`), `ingles_variantes`, `ingles_frase_longa`.
9. **Ouvir antes de ler, no inglês.** A frase em inglês toca antes de as opções ficarem clicáveis (`playText(..., { lang: 'en', speed: TTS_SPEED_SLOW })`, `src/services/englishTts.ts:29,62`). O item carrega `audioText` = a frase com a resposta no lugar da lacuna. O áudio é indexado por hash em `englishAudio/{hash}` (`englishTts.ts:71-77`), então a mesma frase amanhã custa zero.
10. **A mesma regra de inglês volta no dia seguinte, em outra frase.** O `skill` do item de inglês de ontem entra no prompt de hoje como "repita esta regra com outra frase". A lei pede três frases da mesma regra na mesma sessão (`.cursor/rules/lei-excelencia-aaa.mdc:143`); na prova do dia cabe uma por dia, então a repetição é entre dias, três dias seguidos.
11. **Uma pergunta de revisita de um erro de 3 a 10 dias atrás.** É a posição 8, `kind: 'review'`, `reviewOf` apontando para o doc do `quizBank`, mesmo ponto por outro enunciado e outras opções. Só entra com Biblioteca no nível 2 ou mais (decisão 14, §8.4). Sem material elegível ou com Biblioteca no nível 1, a posição 8 é matemática de duas etapas — **nunca curiosidade do tema**, que é a posição que produziu 8 itens ruins em 8 dias.
12. **Conhecimento não se cola ao tema por analogia.** A pergunta de conhecimento pode ser do tema ou não; se for, é por um fato. Proibida a metáfora ("Neymar dribla como uma abelha" num dia de geometria).
13. **Opções do mesmo tipo e tamanho parecido.** Ou as 4 são números, ou nenhuma é; a maior não passa de 1,5× a menor em palavras (ou a diferença é de até 2 palavras). A certa não pode ser a única mais longa. Medida: `tamanho_opcoes` (14 dos 72), `tipos_mistos` (10), `certa_mais_longa` (5).

**Ritmo e portões de tela**

14. **"Próxima" libera só depois de `max(6 s, palavras/3 s)`.** Hoje o piso é 4 s (`src/services/quiz/provaRules.ts:3`, `EXPLAIN_READ_MS.min`). Com a mediana de 17 palavras, 51 dos 72 itens ficam presos no piso — é o piso que faz o trabalho, não a conta. Teste: `readingMs('texto de 9 palavras...', 6000, 12000) === 6000`.
15. **Segunda tentativa depois de ler a explicação, sem pagar** (decisão 23b). Aparece um "Tentar de novo" quando o portão da regra 14 abre; a segunda escolha não muda `score`, `goldEarned`, `xpEarned` nem a esmeralda (`src/services/dailyQuizService.ts:176`), e é gravada como `attempts` e `retryOk` no `quizBank`. **Sem aviso explícito na tela** de que não paga — é a decisão 23b literal.
16. **Reflexão: 12 palavras ou mais E 2 ou mais palavras de conteúdo do tema do dia.** Hoje são 10 palavras sem checagem de tema no serviço (`src/services/quiz/provaRules.ts:5`; `completeDailyQuiz` chama `reflectionOk(reflection)` **sem** o `about`, `dailyQuizService.ts:154`, enquanto a tela chama com `about`, `DailyQuiz.tsx:433`). A v3 passa o `about` nos dois lugares.
17. **Rampa de reflexão nos 7 primeiros dias: 8 palavras, depois 12.** A produção medida dele é de 2 e 4 palavras. Pular direto para 12 é triplicar a barra numa noite; a régua sem degrau vira parede. Medida: `REFLECTION_MIN_WORDS` vira função de `diasDesdeOLançamento`, com teste nos dois lados do degrau.
18. **Molde e contador na tela da reflexão.** Abaixo da pergunta do Sábio, uma linha de molde ("Hoje eu ... porque ...") que ele pode tocar para começar a frase, e um contador vivo "7 / 12". Sem isso a regra 16 é uma parede sem porta.

**Controle de qualidade**

19. **Validador por pergunta, em código, antes de a prova ser gravada.** 23 códigos de reprovação, função pura, sem Firebase. Especificação na §4.
20. **Segunda passada do professor revisor.** Uma chamada a `gpt-4o-mini`, temperatura 0, sobre as perguntas já aprovadas no local, devolvendo `{n, ok, motivo}`. É o que pega o que o código não vê: duas defensáveis, fato fora de consenso, dado faltando no enunciado. Medida: 15/09 Q8 (goleiro × zagueiro) passa no local e tem que cair aqui.
21. **Gerar 11, entregar 8.** O modelo devolve `count + 3` perguntas na mesma chamada; o validador e o revisor descartam; ficam as 8 melhores na ordem de área. **Discordo da substituição em segunda chamada como caminho padrão** (crítica §4): com 69 de 72 itens reprovados no corpus histórico, pedir substituição todo dia é uma chamada a mais por dia; gerar 3 a mais na mesma resposta custa ~35% de tokens de saída em vez de 100% de uma chamada nova. A substituição fica como plano B, quando sobrarem menos de 8.
22. **Nunca entregar prova com menos de 8 perguntas.** Hoje o código aceita 5 (`src/services/aiDailyQuiz.ts:71,95,100`), e uma prova de 5 paga menos e nunca dá a esmeralda (`dailyQuizService.ts:176`) — punição silenciosa por erro do gerador. Se depois de tudo faltar, completa do banco offline passando pelo mesmo validador.
23. **O que foi descartado fica gravado.** `sanitize: { rejected: RejectCode[], reviewer: string[], generated: number }` no doc da prova, e o painel do pai mostra. É o que `.cursor/rules/lei-excelencia-aaa.mdc:149` exige: "o relatório mostra que descartou".
24. **`quizBank` obrigatório por pergunta.** Concluir a prova grava 8 docs no mesmo `writeBatch` do resultado. Sem isso não existe perfil, não existe revisita, não existe "Como ele vai" — e é a razão de o jogo não saber em que ele erra depois de 135 provas.
25. **Anti-repetição por hash e por semelhança, não por texto.** Hash normalizado contra o `quizBank` dos últimos 180 dias, mais "quase igual" (mesmo `subject` e 70% das palavras de 4+ letras). Medida: os 8 pares de `valida.txt` reprovam; pares de assuntos diferentes passam.
26. **Painel "Como ele vai".** Acerto por `kind`, por `subject` e por categoria em 7 dias, 30 dias e total; últimas 30 erradas com data; repetidas por hash com as datas; descartados do dia. Fonte: `learning/{uid}.profile` e `quizBank`.
27. **Futebol é cenário, e a substituição pede a posição** (decisão 37, pacote 6b). A vaga de futebol ensina outra área: `scenario: "futebol"` e o `subject` da área (conta de gols, causa da bola, frase da partida). `futebol_solto` recusa `subject === 'futebol'` e o enunciado de regra ("o que acontece se", "quantos jogadores", "qual a posição", "quem é o", "regra do", "impedimento", "cartão" sem número). `definicao` também pega "qual é a função", "qual é o papel", "o que faz o/a", "para que serve". Quando uma vaga cai, a substituição pede aquela posição com o mesmo kind e skill, não um lote solto. LIC.APLICA e LIC.DILEMA pedem quatro opções do mesmo tamanho (± 2 palavras), sem caricatura.

---

## 3. Prompt v3

Vai para `src/services/quiz/dailyPrompt.ts`, substituindo a função atual (`dailyPrompt.ts:6`, hoje `buildPrompt(seed, count, age, weekday)`).

```ts
export function buildPrompt(input: {
  seed: QuizThemeSeed;
  angle: string;              // rotation.pickTheme (§8.2)
  depth: 1 | 2 | 3;
  count: number;              // 8
  spare: number;              // 3 — gera count + spare
  age: number;
  weekday: number;
  englishLevel: 1 | 2 | 3;    // englishBaseService.baseLevelOf
  englishSkillOntem?: string; // regra 10
  review?: { question: string; answer: string; subject: string };  // regra 11
  profile?: LearningProfile;  // §8.4; ausente na primeira semana
}): string
```

Texto renderizado com valores de exemplo (tema de geometria, inglês nível 1, perfil preenchido, revisita disponível):

```
Você é professor de 5º ano (BNCC) e professor de inglês para criança. Escreve a "prova do dia" de um menino de 10 anos, curioso, que gosta de futebol, lógica e ciências. Português do Brasil. Tom respeitoso e direto, sem infantilizar, sem lição de moral, sem elogio.

A prova é o único estudo do dia dele. Item que não ensina nada é item perdido.

TEMA DO DIA: Hexágonos na natureza (categoria: matematica)
Ângulo de hoje: por que a abelha escolhe o hexágono
Profundidade 2: ele já viu este tema antes; aprofunde.
Orientação: {{seed.seed}}

PERFIL (últimos 30 dias)
- Vai bem em: matematica, futebol. Pode subir um degrau.
- Vai mal em: ingles, historia. Volte por outro ângulo, mais fácil, com mais contexto no enunciado.
- Errou nos últimos dias: "He is ___ a book" (ingles, presente contínuo); "abelhas na Antiguidade" (historia).

INGLÊS — cartão do nível 1, não invente fora daqui
- Pode usar: to be (am/is/are), have/has, a/an/the, and/but, I/you/we + like/want/need/have + substantivo, imperativos, there is/there are, in/on/under/next to, plural regular, números 1 a 20 por extenso, cores, my/your, perguntas com is/are/do you. Presente apenas. Frase de no máximo 7 palavras.
- Proibido: qualquer passado, futuro, modais, verbo em -ing fora de like/love, terceira pessoa com -s, don't/doesn't, because, some/any, this/that, how many.
- A regra de ontem foi ING.N1.PREP. Repita esta mesma regra hoje, com outra frase e outro vocabulário.

FORMATO — responda SOMENTE com este JSON, sem texto fora dele:
{
  "theme": {
    "title": "título curto e concreto, sem dois-pontos",
    "lesson": "a ideia do dia em 90 a 130 palavras: comece com uma cena concreta da vida dele (escola, campinho, casa), explique a ideia com um exemplo numérico ou visual, termine com uma coisa para fazer hoje",
    "whyItMatters": "uma frase: o que muda na vida dele se ele entender isto",
    "curiosity": "1 ou 2 frases de fato verdadeiro e surpreendente sobre o tema, que NÃO responde nenhuma pergunta"
  },
  "questions": [ 11 objetos no formato abaixo ],
  "reflectionPrompt": "uma pergunta aberta sobre a ideia, que só pode ser respondida com a experiência dele"
}

Cada pergunta:
{
  "question": "enunciado com todo o contexto necessário para responder",
  "options": ["...", "...", "...", "..."],
  "answer": "cópia exata de uma das options",
  "why": "por que a certa é certa: a conta escrita com os sinais, ou a regra com nome e exemplo. Mínimo 12 palavras. Cite a resposta.",
  "trap": "qual das outras três engana e por que falha. Mínimo 12 palavras. Cite a opção pelo texto.",
  "kind": "lesson" | "knowledge" | "review",
  "subject": "matematica" | "ciencias" | "ingles" | "historia" | "geografia" | "futebol" | "tema",
  "bloom": "entender" | "aplicar" | "analisar",
  "difficulty": 1 | 2 | 3,
  "skill": um código da lista fechada abaixo,
  "audioText": só quando subject = "ingles": a frase inteira em inglês com a resposta no lugar da lacuna
}

CÓDIGOS DE HABILIDADE (um por pergunta; não invente)
MAT.OP2, MAT.FRAC, MAT.PORC, MAT.TEMPO, MAT.DINHEIRO, MAT.MEDIDA, MAT.PADRAO
CIE.CAUSA, CIE.MATERIA, CIE.VIDA, CIE.TERRA, CIE.CORPO
ING.N1.TOBE, ING.N1.THERE, ING.N1.PREP, ING.N1.PLURAL, ING.N1.ART
ING.N2.3PS, ING.N2.DONT, ING.N2.CAN, ING.N2.SOMEANY
ING.N3.CONT, ING.N3.WASWERE, ING.N3.COMPAR
HUM.TEMPO, HUM.MAPA, HUM.FONTE, HUM.BRASIL
FUT.REGRA, FUT.TATICA, FUT.HISTORIA
LIC.ENTENDER, LIC.APLICAR, LIC.DILEMA

REGRA DE OURO
Toda pergunta tem UMA resposta que qualquer professor confirmaria pelo enunciado, pela conta ou pela regra gramatical. Se para escolher a certa for preciso adivinhar o que o autor achava bonito, a pergunta está errada: troque.

AS 3 PRIMEIRAS ("kind": "lesson", "subject": "tema")
1. ENTENDER: um detalhe que só quem leu a ideia do dia sabe. Não pode ser respondida por bom senso.
2. APLICAR: uma cena nova (escola, campinho, casa, Vila) com dados suficientes no enunciado, em que a ideia leva a uma conclusão só. As outras 3 opções são coisas que alguém faria de verdade e que a ideia mostra que não funcionam; o "trap" diz o que acontece se ele fizer uma delas.
3. DILEMA ("skill": "LIC.DILEMA"): uma escolha difícil, com custo dos dois lados. As 4 opções são atitudes que um menino de 10 anos toma de verdade. NENHUMA pode ser caricata: proibido "ignorar", "fingir que não viu", "chamar de burro", "falar mal", "não fazer nada", "impor sua ideia", "não se importar", "pedir para ele sair". A melhor resolve sem custo escondido; as outras 3 resolvem em parte e cobram um preço depois. O "why" diz o que acontece depois da melhor; o "trap" diz o preço de uma das outras. Nunca escreva "essa é a atitude certa".

AS 5 DE CONHECIMENTO ("kind": "knowledge"), nesta ordem de posição
4) ciências — causa e efeito, ou "o que aconteceria se"
5) inglês — frase em contexto, no cartão do nível acima
6) história ou geografia — fato de consenso, com data, lugar ou número
7) futebol — regra do jogo, decisão tática ou fato com ano/placar
8) REVISITA ("kind": "review", "skill" igual ao da pergunta original): mesmo ponto de "He is ___ a book" (ingles), outro enunciado, outras opções, mais fácil. Se não houvesse revisita, esta posição seria matemática de duas etapas.

As 3 EXTRAS (posições 9, 10 e 11): uma de matemática de duas etapas, uma de ciências e uma de inglês, seguindo as mesmas regras. Elas entram só se alguma das 8 for descartada.

NÍVEL POR ÁREA, SEM EXCEÇÃO
- MATEMÁTICA: o enunciado dá os números e a resposta exige DUAS operações (ou a mesma duas vezes sobre resultados diferentes). Proibido o que sai de uma conta só ("3 maçãs e ganha 5", "8 bolas para 2 amigos", "o próximo número da sequência", "180 km a 60 km/h"). O "why" mostra a conta com os sinais: "6 x 5 = 30; 30 x 4 = 120". Um distrator é o resultado da PRIMEIRA etapa, e o "trap" diz isso: "quem responde 30 parou no meio".
- CIÊNCIAS: causa e efeito com mecanismo. Proibido perguntar o NOME de um processo ou de um ser ("qual o processo pelo qual as plantas produzem alimento?", "qual é o nome do fungo que a formiga cultiva?"). Pergunte o que acontece e por quê.
- INGLÊS: contexto em português, depois UMA frase inteira em inglês com UMA lacuna. A regra testada é UMA do cartão e está nomeada no "why" com exemplo ("depois de there is vem uma coisa só: There is a cat"). Os 3 distratores são erros de brasileiro (plural sem -s, artigo trocado, preposição trocada, writes/writing), NUNCA uma forma correta em outro inglês (soccer/football, color/colour, mom/mum) e NUNCA palavra fora do cartão. Proibido "como se diz X em inglês?" com palavra solta; proibido frase em inglês que testa um fato de ciências ("Bees communicate through ...").
- HISTÓRIA E GEOGRAFIA: fato de consenso. Proibido "o primeiro", "o principal", "o mais avançado", "o mais importante", "o mais famoso". Proibido "qual a capital de". Se você não conseguir escrever no "why" o que torna o fato consenso, troque a pergunta.
- FUTEBOL: regra, tática ou fato com ano. Proibida definição ("o que é um gol?", "qual é a posição do goleiro?") e proibido "quem é o melhor / mais famoso / mais habilidoso".

PROIBIDO EM QUALQUER PERGUNTA (frases reais que já saíram daqui e não voltam)
- A resposta, ou a raiz dela, dentro do enunciado. Errado: "Qual é o nome da técnica que os jogadores usam para driblar?" -> "Drible". "Como você poderia usar a ideia de hexágonos...?" -> "Montar uma estante em formato hexagonal".
- Duas opções defensáveis. Errado: "Eu gosto de futebol" com "I like soccer" e "I like football" juntas; "onde as formigas vivem" com "Colônia" e "Ninho" juntas.
- Pergunta de opinião com uma "certa". Errado: "o que você faria?", "como você agiria?", "o que seria mais sábio?".
- A opção certa mais longa que as outras. As 4 têm o mesmo tipo e tamanho parecido: a maior não passa de uma vez e meia a menor em palavras. Errado: ["Um tipo de papel", "Um estilo de pintura", "Uma cor específica", "Uma técnica para mostrar profundidade"].
- Opções de tipos diferentes na mesma pergunta (três nomes e uma frase; três números e uma palavra).
- Conhecimento amarrado ao tema por analogia. Errado: "Qual jogador é conhecido por driblar, como uma abelha em seu trabalho?" num dia de geometria.
- "why" ou "trap" que só repetem a alternativa ("O goleiro é o jogador responsável por proteger o gol").
- Enunciado sem os dados necessários para responder.

VERIFICAÇÃO ANTES DE RESPONDER
Releia as 11 perguntas, uma a uma: (a) a resposta e a raiz dela estão fora do enunciado; (b) há exatamente uma defensável; (c) as 4 opções são do mesmo tipo e tamanho parecido; (d) as contas fecham e estão escritas no "why"; (e) o inglês está no cartão e tem frase de contexto; (f) o fato é de consenso; (g) "why" e "trap" têm 12 palavras ou mais e citam resposta e opção pelo nome; (h) subject, bloom, difficulty e skill vieram das listas. Qualquer uma que falhe: reescreva do zero, não conserte. Só então responda com o JSON.
```

**Onde eu mudo a proposta da crítica, e por quê**

1. **Explicação vira dois campos (`why` e `trap`), não um parágrafo com piso de 15 palavras.** A crítica pede "2 frases, mínimo 15 palavras, cite as duas". Um parágrafo de 15 palavras é verificável só no tamanho; dois campos são verificáveis um a um. O defeito mais frequente do corpus é exatamente este (35 de 72 explicações não citam nem a própria resposta) e um piso de tamanho não o pega. `explanation` continua existindo no doc como `why + ' ' + trap`, para a voz (`src/services/quiz/provaSpeak.ts:21-26`) e para os documentos antigos.
2. **Gera 11 em vez de 8.** Justificado na regra 21.
3. **A posição 8 é a revisita, e a ordem das áreas é numerada pela posição da pergunta.** A crítica já numerava 4) a 8); eu tiro a curiosidade do tema de vez e ponho a revisita no lugar. Fallback é matemática, não trivia.
4. **O inglês ganha `audioText` e a regra de ontem.** A crítica não trata áudio; a lei do professor exige "ouvir antes de ler" (`.cursor/rules/lei-excelencia-aaa.mdc:143`) e o produto já tem a infraestrutura pronta e cacheada.
5. **`superlativo_sem_consenso` reprova, não marca.** A crítica deixa o consenso para o revisor. Eu reprovo no código porque é a segunda falha mais frequente do corpus (15 de 72), custa zero e o revisor custa tempo de resposta.
6. **Não adoto o `reachable` como única guarda de conta.** Mantenho a medição honesta da crítica: a busca alcança 22 dos 24 distratores, então serve para reprovar, nunca para conferir a resposta. `conta_nao_fecha` marca e manda ao revisor; `conta_um_passo` reprova direto.

---

## 4. Validador

Arquivo novo: `src/services/quiz/validateQuestion.ts`. Função pura: sem Firebase, sem `import.meta.env`, roda no harness. `sanitizeQuestions` (`src/services/aiQuiz.ts:83-106`) continua servindo a Missão Surpresa; a prova passa a usar `validateDailyQuestions`.

### 4.1 Contrato

```ts
export type RejectCode =
  | 'campo_vazio' | 'opcoes' | 'resposta_fora'
  | 'vazamento' | 'raiz_vazada'
  | 'tamanho_opcoes' | 'certa_mais_longa' | 'tipos_mistos'
  | 'explicacao_curta' | 'explicacao_sem_resposta' | 'trap_sem_opcao'
  | 'conta_nao_fecha' | 'conta_um_passo'
  | 'ingles_sem_frase' | 'ingles_fora_do_nivel' | 'ingles_variantes' | 'ingles_frase_longa'
  | 'superlativo_sem_consenso' | 'definicao_ou_nome' | 'opiniao' | 'opcao_caricata'
  | 'campo_invalido' | 'duplicata';

export interface Check { ok: boolean; reasons: RejectCode[]; detail?: string }

export function checkQuestion(
  q: RawQuestion,
  ctx: { englishLevel: 1 | 2 | 3; index: number; avoidHashes: Set<string>; avoidRecent: { hash: string; subject: string; words: Set<string> }[] },
): Check;

export function validateDailyQuestions(
  raw: unknown,
  ctx: { count: number; englishLevel: 1 | 2 | 3; avoidHashes: Set<string>; avoidRecent: ... },
): { kept: DailyQuizQuestion[]; rejected: { n: number; reasons: RejectCode[] }[] };
```

### 4.2 Pseudocódigo

```ts
const GENERICOS = new Set(['parec','fazer','fazen','usar','usand','estar','ficar','jogar','jogan','tentar','poder','coloc','monta','segui','melho','proxi']);
const CARICATA = /\b(ignorar|ignoraria|fingir|fingiria|burro|falar mal|nao fazer nada|nao comer nada|impor|nao se importar|nao se importaria|deixar para outra pessoa|sair do jogo|criticar)\b/;
const OPINIAO = /\b(o que voce faria|como voce agiria|o que voce acha|voce prefere|o que seria mais sabio|como voce poderia usar|se voce tivesse que escolher)\b/;
const SUPERLATIVO = /\b(primeir[ao]|principal|melhor|maior de todos|mais (avancad|important|famos|habilidos|rapid|forte)\w*|famos[ao])\b/;
const DEFINICAO = /^(o que e |qual e o nome d|qual o nome d|qual e a posicao d|qual a posicao d|qual e o processo|qual o processo|qual e a principal fonte)/;
const VARIANTES = [['soccer','football'],['color','colour'],['mom','mum'],['gray','grey'],['elevator','lift']];

function checkQuestion(q, ctx) {
  const r = [];
  const nq = normalizeQuizText(q.question);

  // 1 campos
  if (!q.question || !q.answer || !q.why || !q.trap || q.options.length !== 4) r.push('campo_vazio');
  // 2 quatro opções distintas  (provaRules.optionsCollide, provaRules.ts:64-73)
  if (optionsCollide(q.options)) r.push('opcoes');
  // 3 answer ∈ options, normalizada; grava a string exata da opção
  if (!q.options.some(o => normalizeQuizText(o) === normalizeQuizText(q.answer))) r.push('resposta_fora');

  // 4a vazamento literal COM FRONTEIRA DE PALAVRA (corrige provaRules.ts:61)
  if (` ${nq} `.includes(` ${normalizeQuizText(q.answer)} `)) r.push('vazamento');
  // 4b raiz vazada DISCRIMINANTE: raiz de 5 letras que está no enunciado e em NENHUMA
  //    das outras três opções; raiz compartilhada é contexto, não pista
  else {
    for (const w of normalizeQuizText(q.answer).split(' ')) {
      if (w.length < 5) continue;
      const stem = w.slice(0, 5);
      if (GENERICOS.has(stem) || !nq.includes(stem)) continue;
      if (outrasOpcoes(q).some(o => o.includes(stem))) continue;
      r.push('raiz_vazada'); break;
    }
  }

  // 5 tamanho e 5b a certa mais longa
  const n = q.options.map(wordCount);
  if (!(max(n) <= 1.5 * min(n) || max(n) - min(n) <= 2)) r.push('tamanho_opcoes');
  else if (aCertaEhAUnicaMaisLonga(q) && max(n) >= 4) r.push('certa_mais_longa');
  // 6 tipos homogêneos: ou as 4 são numéricas ou nenhuma; ou as 4 têm até 2 palavras ou nenhuma
  if (misturaTipos(q.options)) r.push('tipos_mistos');

  // 7 explicação em dois campos
  if (wordCount(q.why) < 12 || wordCount(q.trap) < 12) r.push('explicacao_curta');
  if (!normalizeQuizText(q.why).includes(primeirasPalavras(q.answer, 4))) r.push('explicacao_sem_resposta');
  if (!outrasOpcoes(q).some(o => normalizeQuizText(q.trap).includes(primeirasPalavras(o, 3)))) r.push('trap_sem_opcao');

  // 8 contas, só quando subject = matematica e a resposta é número
  const nums = numbersOf(q.question), alvo = numbersOf(q.answer);
  if (nums.length >= 2 && alvo.length === 1) {
    if (!reachable(nums, alvo[0], 2)) r.push('conta_nao_fecha');      // marca -> revisor
    else if (reachable(nums, alvo[0], 1)) r.push('conta_um_passo');   // reprova direto
  }

  // 9 inglês
  if (q.subject === 'ingles') {
    for (const [a, b] of VARIANTES) if (temAmbas(q.options, a, b)) r.push('ingles_variantes');
    const frase = q.audioText || fraseEntreAspas(q.question);
    if (!frase || palavrasEmIngles(frase) < 3) r.push('ingles_sem_frase');
    else {
      if (findForbiddenTokens(frase, ctx.englishLevel).length) r.push('ingles_fora_do_nivel');  // englishLevels.ts:310-318
      if (wordCount(frase) > LEVELS[ctx.englishLevel].maxWords) r.push('ingles_frase_longa');
    }
  }

  // 10 listas fechadas
  if (FATO_SUBJ.test(q.subject) && SUPERLATIVO.test(nq)) r.push('superlativo_sem_consenso');
  if (DEFINICAO.test(nq)) r.push('definicao_ou_nome');
  if (OPINIAO.test(nq) && q.skill !== 'LIC.DILEMA') r.push('opiniao');
  if (q.options.some(o => CARICATA.test(normalizeQuizText(o)))) r.push('opcao_caricata');
  if (!SKILLS.has(q.skill) || !SUBJECTS.has(q.subject) || !BLOOM.has(q.bloom)) r.push('campo_invalido');

  // 11 duplicata: hash nos 180 dias, ou 70% das palavras de 4+ letras com o mesmo subject
  if (ctx.avoidHashes.has(hashOf(q.question))) r.push('duplicata');
  else if (ctx.avoidRecent.some(p => p.subject === q.subject && similar(p.words, palavrasConteudo(q.question)) >= 0.7)) r.push('duplicata');

  return { ok: r.length === 0, reasons: r };
}
```

`numbersOf` e `reachable` (busca em largura com + − × ÷ e reaproveitamento de resultados intermediários) ficam no mesmo arquivo, exportadas, porque são o que o teste precisa exercitar isoladamente.

**Limites honestos, medidos:**
- `reachable` alcança 22 dos 24 distratores do corpus: serve para reprovar, nunca para conferir a resposta. Não lê fração por extenso, não entende porcentagem sem símbolo, não trata unidade.
- `findForbiddenTokens` é verificador de **gramática**, não de vocabulário: reprova `He is writing a book` no nível 1 (`writing`) e **aprova** `Bees communicate through dances`, porque `communicate` e `through` não estão em `forbiddenTokens`. Vocabulário fora do cartão só cai no revisor.
- O validador local **não** detecta duas alternativas defensáveis. 15/09 Q8 (goleiro × zagueiro) passa. É o motivo de o revisor existir.

**Um bug a corrigir antes de tudo:** `answerLeaksInPrompt` (`src/services/quiz/provaRules.ts:57-62`) usa `q.includes(a)` sem fronteira de palavra. Com a resposta `"in"` e o enunciado `"Complete a frase em inglês: 'The knights were ... the castle.'"` ele devolve **true**, porque `in` está dentro de `inglês`. Verificado em node. Como as preposições `in/on/under/next to` são o cartão do nível 1 (`src/config/englishLevels.ts:99`), a regra atual descarta exatamente a pergunta de inglês que a v3 quer gerar.

### 4.3 Testes — casos reais, veredito esperado

Fixture: `src/services/quiz/__tests__/fixtures/era3.json` com os 64 itens da era 3 mais os 8 de 22/09 (fonte: `scratchpad/prova/quizzes-heitor.json` e `heitor-22.json`). Os códigos abaixo foram medidos pelo protótipo `scratchpad/prova/valida.ts` (saída em `valida.txt`), não estimados.

| # | Item real | Esperado | Código |
|---|---|---|---|
| 1 | 19/09 Q8 — "Qual é o nome da técnica que os jogadores de futebol usam para driblar os adversários?" → `Drible` | **reprova** | `raiz_vazada` (dribl) + `definicao_ou_nome` |
| 2 | 19/09 Q4 — "Se você tem 5 maçãs e decide dar 2 para um amigo, quantas maçãs você ainda terá?" | **reprova** | `conta_um_passo` + `explicacao_curta` |
| 3 | 17/09 Q4 — "Se um cara tem 3 maçãs e ganha mais 5, quantas maçãs ele tem agora?" | **reprova** | `conta_um_passo` + `explicacao_curta` + `explicacao_sem_resposta` |
| 4 | 22/09 Q7 — "Se 3 cavaleiros recebem 200 moedas para dividir igualmente, quantas cada um recebe?" → `66` | **reprova** | `conta_nao_fecha` (200÷3 não fecha; marca e vai ao revisor) |
| 5 | 14/09 Q6 — "Como se diz 'cachorro' em inglês?" | **reprova** | `ingles_sem_frase` + `explicacao_curta` |
| 6 | 19/09 Q6 — "Como se diz 'Eu gosto de futebol' em inglês?" com `I like soccer` e `I like football` | **reprova** | `ingles_variantes` (soccer/football) |
| 7 | 18/09 Q6 — "Complete a frase em inglês: 'He is ... a book.'" → `writing`, nível 1 | **reprova** | `ingles_fora_do_nivel` (writing) |
| 8 | 22/09 Q4 — "Complete a frase em inglês: 'The knights were ... the castle.'" → `in`, nível 1 | **reprova** | `ingles_fora_do_nivel` (were) + `explicacao_curta`. **E não pode reprovar por `vazamento`** — é o caso que prova o conserto de `provaRules.ts:61` |
| 9 | 21/09 Q6 — "Complete a frase: Bees communicate through ..." | **reprova** | `ingles_sem_frase` + `explicacao_sem_resposta` |
| 10 | 19/09 Q1 — "O que é perspectiva na arte?" | **reprova** | `definicao_ou_nome` + `certa_mais_longa` + `explicacao_sem_resposta` |
| 11 | 20/09 Q5 — "Qual é o nome do fungo que as formigas cortadeiras cultivam?" → `Micélio` | **reprova** | `definicao_ou_nome` + `tipos_mistos` |
| 12 | 20/09 Q8 — "Qual é o nome da famosa formação onde as formigas vivem...?" (`Colônia` e `Ninho` juntas) | **reprova** | `superlativo_sem_consenso` + `definicao_ou_nome` |
| 13 | 21/09 Q8 — "Qual jogador famoso é conhecido por suas habilidades de drible, como uma abelha...?" | **reprova** | `superlativo_sem_consenso` |
| 14 | 21/09 Q3 — "...usar muito papel ou encontrar uma forma mais eficiente, o que faria?" | **reprova** | `opiniao` + `raiz_vazada` + `certa_mais_longa` + `opcao_caricata` + `explicacao_curta` |
| 15 | 18/09 Q3 — "...a maioria dos amigos quer algo que você não concorda, o que você faria?" (`Impor sua ideia`) | **reprova** | `opiniao` + `opcao_caricata` + `tamanho_opcoes` |
| 16 | 14/09 Q4 ("sequência 2, 4, 8, 16") contra 15/09 Q4 ("sequência 3, 6, 9") | **reprova a segunda** | `duplicata` (100% das palavras de conteúdo) + `conta_um_passo` |
| 17 | 18/09 Q1 — "Qual era a forma de votação utilizada na Grécia antiga?" → `Voto por palmas` | **reprova** | `tipos_mistos` + `explicacao_sem_resposta`; o fato duvidoso cai no revisor |
| 18 | **19/09 Q3** — "...desenhando um campo de futebol... qual técnica de perspectiva você usaria?" | **reprova só pela explicação** | `explicacao_sem_resposta`. O enunciado e as 4 opções passam: é a única pergunta de lição bem construída do corpus, e o que a derruba é a explicação, que é o certo |
| 19 | **21/09 Q4** — "Uma abelha constrói 6 células por dia. Em 5 dias, quantas 4 abelhas constroem juntas?" → `120` (escrita pelo líder) | **aprova** | nenhum. É o modelo do item de matemática e tem que sobreviver ao validador |
| 20 | **15/09 Q8** — "Qual é a posição onde um jogador deve ficar para defender no futebol?" | **aprova no local, reprova no revisor** | duas defensáveis (goleiro e zagueiro). Prova que o revisor não é decoração |

Resultado agregado do protótipo sobre os 72 itens: **69 reprovados, 3 aprovados**. Códigos por frequência: `explicacao_sem_resposta` 35, `explicacao_curta` 23, `superlativo_sem_consenso` 15, `tamanho_opcoes` 14, `opiniao` 13, `opcao_caricata` 13, `definicao_ou_nome` 11, `tipos_mistos` 10, `raiz_vazada` 7, `conta_um_passo` 7, `certa_mais_longa` 5, `ingles_fora_do_nivel` 4, `ingles_sem_frase` 3, `ingles_variantes` 1, `conta_nao_fecha` 1.

Leitura para o Cursor, e ela não é otimista: **esse 69/72 é sobre o corpus do prompt v2, mas não dá para debitar a rejeição no formato da explicação.** Contado: 45 dos 69 reprovados têm pelo menos um código de explicação, mas só **7** são reprovados exclusivamente por isso — **62 dos 69 têm um defeito estrutural além da explicação** (opinião, caricata, superlativo, definição, conta de um passo, tamanho de opção). Consertar a explicação não derruba a taxa; o que tem que derrubar é o prompt inteiro, com as proibições nominais e os exemplos reais da §3.

Consequência prática: **o `spare` de 3 é um chute calibrável, não uma garantia.** Depois de 7 dias no ar, ler `sanitize.rejected` no doc de cada prova e decidir: se caírem até 3 por dia, mantém; se caírem 4 ou mais em 3 dias dos 7, sobe o `spare` para 5 (custa ~1.100 tokens de saída a mais, US$ 0,01/dia) em vez de ligar a substituição todo dia (custa uma chamada inteira). Esse número é do líder, não do Cursor: o Cursor entrega o `spare` como parâmetro e o relatório com a contagem.

### 4.4 Revisor (segunda passada)

`src/services/quiz/reviewer.ts`. `gpt-4o-mini`, `temperature: 0`, `response_format: json_object`, só com as perguntas aprovadas no local:

```
Você é professor de 5º ano corrigindo a prova de outro professor. Para cada pergunta, diga se ela pode ir para um menino de 10 anos.
Reprove (ok: false) se: houver mais de uma alternativa defensável; a pergunta for de opinião ou gosto; o fato não for consenso entre professores; a conta não fechar; faltar dado no enunciado; a certa for a única completa; o inglês estiver fora do cartão do nível {{n}} ou testar um fato em vez da língua; o "why" não ensinar a regra ou a conta.
Não reescreva. Não elogie. O motivo tem no máximo 12 palavras e diz o que está errado, não o que fazer.
Responda SOMENTE: {"itens":[{"n":1,"ok":true,"motivo":""}, ...]}
```

Fluxo depois do revisor: guarda as aprovadas na ordem de posição; completa com as extras (9, 10, 11) que passaram; se ainda faltar, uma chamada de substituição só das que faltam, com os motivos e os enunciados aprovados como `avoid`; se ainda faltar, completa do banco offline pelo mesmo validador. Nunca menos de 8. Resposta malformada do revisor não derruba a prova: vale o veredito local.

---

## 5. Dados a gravar

### 5.1 `quizBank/{uid}_{date}_{n}` — um doc por pergunta, no mesmo `writeBatch` do resultado

As regras publicadas já exigem `userId, date, question, hash, correct, category` na criação e só deixam atualizar `reviewedOk`/`reviewedOn` (`firestore.rules:321-328`). Consequência de projeto: **tudo o que se sabe sobre a tentativa tem que estar no doc na hora da criação**, o que funciona porque `completeDailyQuiz` grava no fim, quando as retentativas já aconteceram. Nenhuma mudança de regra é necessária.

```ts
interface QuizBankItem {
  userId: string; familyId: 'heitor'; date: string; n: number;       // n = posição, 1..8
  themeId: string; category: string; subject: string;
  kind: 'lesson' | 'knowledge' | 'review';
  skill: string; bloom: 'entender'|'aplicar'|'analisar'; difficulty: 1|2|3;
  question: string; options: string[]; answer: string;
  why: string; trap: string;
  hash: string;                 // normalizeQuestion(question), src/services/quiz/hash.ts
  chosen: string;               // a PRIMEIRA escolha
  correct: boolean;             // a primeira escolha estava certa (é a que paga)
  attempts: 1 | 2;              // 2 quando ele usou a repescagem
  retryOk?: boolean;            // acertou na segunda, depois de ler; não paga
  msToAnswer: number;           // da pergunta na tela até a primeira escolha
  msReadingExplain: number;     // da primeira escolha até "Próxima" (portão de 6 s)
  audioPlayed?: boolean;        // inglês: o áudio tocou antes das opções
  reviewOf?: string;            // id do quizBank original, quando kind === 'review'
  reviewedOk?: boolean; reviewedOn?: string;   // marcados no original quando a revisita acerta
  createdAt: Timestamp;
}
```

`msToAnswer` e `msReadingExplain` são o que separa "errou porque não sabe" de "errou porque clicou". Hoje não existe nenhum dado de tempo por pergunta: o doc guarda um `answers[]` e nada mais (`src/services/dailyQuizService.ts:149,165`).

### 5.2 Doc da prova — campos novos

```ts
theme.angle: string; theme.depth: 1|2|3;      // §8.2
sanitize: { generated: number; rejected: { n: number; reasons: RejectCode[] }[]; reviewer: string[] };
reflection: string;
reflectionWords: number;                       // contagem gravada, não recalculada
reflectionThemeHits: number;                   // quantas palavras de conteúdo do tema apareceram
reflectionMs: number;                          // tempo no campo de texto
englishLevel: 1|2|3;                           // o nível usado na geração
```

### 5.3 `learning/{uid}.profile`

`src/services/quiz/profile.ts`, função pura `buildProfile(items: QuizBankItem[], today: string)`, calculada ao fechar a prova e em `computeWeeklyLearning` (`src/services/learningService.ts:24`). O tipo `LearningDoc` (`src/types/village.ts:310-322`) ganha o campo `profile`.

```ts
interface LearningProfile {
  updatedAt: string;
  byCategory: Record<string, { d7: [number, number]; d30: [number, number]; all: [number, number] }>;
  bySubject:  Record<string, { d30: [number, number]; all: [number, number] }>;
  bySkill:    Record<string, { d30: [number, number]; all: [number, number] }>;
  byKind:     Record<'lesson'|'knowledge'|'review', { d30: [number, number] }>;
  strong: string[];   // 3 categorias com melhor acerto, mínimo 4 perguntas
  weak: string[];     // 3 piores, mínimo 4 perguntas
  lastWrong: { date: string; id: string; category: string; subject: string; skill: string; question: string }[]; // 10
  englishLastSkill?: string;   // alimenta a regra 10 do prompt
  retryRate: number;           // fração de erros em que ele usou a repescagem e acertou
  medianMsToAnswer: number;
}
```

Teste com o export real: `weak` traz `ingles` (0 de 3) e `historia` (1 de 6).

---

## 6. Tela

Sem restilizar nada. Só os portões, os dois blocos de explicação, a repescagem e um bloco novo no painel.

**`src/components/hero/DailyQuiz.tsx`**

1. **Portão da "Próxima"**: `EXPLAIN_READ_MS.min` de 4000 para 6000 (`src/services/quiz/provaRules.ts:3`). O componente já usa `max(min, palavras/3)` via `readingMs` (`provaRules.ts:24-27`) e `ReadWaitButton` com `min={EXPLAIN_READ_MS.min}` (`DailyQuiz.tsx:613`). Uma linha.
2. **Explicação em dois blocos**: onde hoje há `<p>{question.explanation}</p>` (`DailyQuiz.tsx:515-523, na linha 521`), passa a haver o bloco `why` e, abaixo, o bloco `trap` com o rótulo do papiro já existente (`mn-papiro-why` / texto normal). Sem classe nova.
3. **Repescagem** (decisão 23b): quando o portão da "Próxima" abre e ele errou, aparece "Tentar de novo" ao lado. Reabre as opções mantendo a certa marcada como já revelada; a segunda escolha grava `attempts: 2` e `retryOk`, e **não** toca `score` nem `reward` (`DailyQuiz.tsx:337-355,357-405`). Sem frase explicando que não paga.
4. **Inglês, áudio primeiro**: quando `question.subject === 'ingles'`, tocar `audioText` com `{ lang: 'en', speed: TTS_SPEED_SLOW }` e só liberar os cliques quando terminar, reusando o `voiceDone` que já existe (`DailyQuiz.tsx:207,329-334`). Um botão de repetir o áudio ao lado do enunciado (`mc-slot`, 44 px).
5. **Reflexão**: abaixo do `reflectionPrompt` (`DailyQuiz.tsx:549-556`), uma linha de molde tocável ("Hoje eu ... porque ...") que preenche o começo do campo, e um contador "7 / 12" ao lado do botão "Entregar". `canDeliver` (`DailyQuiz.tsx:433`) passa a exigir as 12 palavras (8 nos 7 primeiros dias) e 2 palavras de conteúdo do tema.
6. **Tempo por pergunta**: um `useRef` com o `performance.now()` de quando a pergunta entra e de quando ele escolhe, entregue ao `completeDailyQuiz`. Não aparece na tela.
7. **Prefetch de voz**: hoje o efeito de `prefetchLesson` e `prefetchVerdicts` roda assim que a prova chega pela assinatura, mesmo com a prova fechada (`DailyQuiz.tsx:283-289`), e a dependência `quiz` é o objeto inteiro, que muda de identidade a cada snapshot. Passa a rodar só quando `open && phase !== 'prompt'`, e a dependência vira `quiz?.id`. É o que faz o dia pulado não gastar 11 chamadas de voz.
8. **Prefetch de amanhã**: `await prepare()` antes de `ensureDailyQuiz(amanhã)` (`DailyQuiz.tsx:256-262`). A alteração não commitada já trocou "uma vez por montagem" por "uma vez por dia" (`DailyQuiz.tsx:208,258-259`), mas o `await` continua faltando, e é ele que faz a prova de amanhã enxergar a de hoje.

**`src/components/parent/DailyQuizManager.tsx`** — um bloco novo no fim, "Como ele vai", com os cartões de pedra que já existem no arquivo (`QuizCard`, linhas 81-145). Nada de restilizar.

- Acerto por `kind` e por `subject` em 7 dias, 30 dias e total, de `learning/{uid}.profile`.
- Últimas 30 erradas com data, assunto e o que ele marcou, de `quizBank`.
- Repetidas: mesmo `hash` com as duas datas.
- Do doc do dia: "gerou 11, descartou 3" com os códigos de `sanitize.rejected` e os motivos do revisor.
- Uma linha de reflexão: palavras e se tocou o tema.

---

## 7. Pacotes para o Cursor

### P0 — antes de a v3 gerar a primeira prova

| # | Arquivo | Mudança | Teste | Evidência de aceite | O líder revisa |
|---|---|---|---|---|---|
| P0.1 | `src/services/quiz/provaRules.ts:57-62` | **feito pelo líder em 22/09 (A3)**: `answerLeaksInPrompt` só com palavra inteira; o `q.includes(a)` caiu | `provaV2.test.ts`: `in`/"inglês", `on`/"Ponha", `20`/"2026" → `false`; `in` solto no enunciado → `true` | log do `npm run test:village` (já verde) | nada; a raiz ("driblar" → "Drible") nunca foi pega por esta função e é trabalho do código `raiz_vazada` do validador (P0.2) |
| P0.2 | `src/services/quiz/validateQuestion.ts` (novo) | validador da §4, 23 códigos, `numbersOf` e `reachable` exportados | `src/services/quiz/__tests__/validateQuestion.test.ts` com os 20 casos da §4.3, sobre a fixture dos 72 itens reais | log verde listando os 20 casos por nome | os 20 vereditos, um a um, contra a tabela; 21/09 Q4 tem que aprovar |
| P0.3 | `scripts/run-english-tests.mjs:15-17` | registrar `{ name: 'quiz', dir: src/services/quiz/__tests__ }` | `npm run test:english` lista a pasta `quiz` | log com `== quiz/validateQuestion.test.ts` | que o `rotation.test.ts`, escrito e nunca rodado, apareça no log (vai falhar: `rotation.ts:55` lança; é P1) |
| P0.4 | `src/services/quiz/dailyPrompt.ts` | prompt v3 da §3; assinatura nova com `angle`, `depth`, `spare`, `englishLevel`, `englishSkillOntem`, `review`, `profile` | `provaV2.test.ts:144`: o prompt contém o cartão do nível 1 quando `englishLevel: 1`, contém `MAT.OP2`, contém a numeração 4) a 8), pede `count + spare` perguntas e gira as áreas com `weekday` | log verde | o texto do prompt inteiro, linha a linha, contra a §3 |
| P0.5 | `src/services/aiDailyQuiz.ts:25-34,64-106` | usar `validateDailyQuestions`; pedir `count + 3`; nunca devolver menos de `count`; gravar `sanitize` | teste com resposta de IA falsa: 11 perguntas, 3 ruins → prova final com 8 e `sanitize.rejected` com 3 entradas; 11 perguntas, 6 ruins → uma chamada de substituição | log verde + uma prova real gerada na conta de teste, com o JSON do `sanitize` no relatório | o `sanitize` de 3 provas geradas de verdade, e as 8 perguntas de cada uma contra as seis perguntas da lei do professor |
| P0.6 | `src/services/quiz/reviewer.ts` (novo) | segunda passada `gpt-4o-mini`, temperatura 0 | teste do parser: resposta malformada não derruba a prova; `{ok:false}` em 2 itens tira os 2 | log verde | os motivos do revisor em 3 provas reais: precisam nomear o defeito, não dar conselho |
| P0.7 | `functions/src/index.ts:14` + `src/services/aiUsage.ts:29,95-111` | `AI_MONTHLY_CALL_CAP` igual nos dois arquivos (teste que importa as duas constantes); painel mostra "chamadas de texto" e "chamadas de voz" separadas e custo por modelo (hoje uma tabela só, a do `gpt-4.1-mini`, subestima a prova em 6,25×); alerta no cartão Hoje a 80% do teto | teste das constantes; teste: 1.000 tokens de entrada em `gpt-4o` custam 6,25× mais que em `gpt-4.1-mini` | print do painel com os dois contadores | a conta contra a tabela da OpenAI do dia; o teto sobe só se os dois contadores mostrarem necessidade |
| P0.8 | `src/components/hero/DailyQuiz.tsx:283-289` | prefetch de voz só com a prova aberta; dependência `quiz?.id` | teste de render (ou verificação manual com o log de `prefetchAudio`) | log do console mostrando 0 chamadas de voz ao abrir a Vila sem abrir a prova | que o dia pulado passe a custar zero de voz |
| P0.9 | `src/services/aiDailyQuiz.ts:64` e `functions/src/index.ts:19` | `maxTokens` passa de `260 * count + 1100` para `300 * (count + spare) + 1200`; `CHAT_MAX_TOKENS` de 4000 para 6000 | teste: com `count 8` e `spare 3` o pedido é 4.500 e o servidor não corta | log da geração com `usage.outputTokens` e o JSON completo | a conta: hoje `260×11+1100 = 3.960` contra um teto de 4.000, sem margem nenhuma — e JSON cortado vira `JSON.parse` quebrado, que `aiDailyQuiz.ts:104-106` engole e manda para o banco offline em silêncio |

### P1 — na mesma semana

| # | Arquivo | Mudança | Teste | Evidência | O líder revisa |
|---|---|---|---|---|---|
| P1.1 | `src/services/quiz/hash.ts`, `dedupe.ts` (novos) | hash normalizado e "quase igual" (70% das palavras de 4+ letras, mesmo `subject`) | fixture com os 8 pares de `valida.txt`: todos reprovam; pares de assuntos diferentes passam | log verde com os 8 pares nomeados por data | os 8 pares, e que nenhum par legítimo caia |
| P1.2 | `src/services/dailyQuizService.ts:144-201` | escrever os 8 docs do `quizBank` no mesmo `writeBatch`, com `attempts`, `retryOk`, `msToAnswer`, `msReadingExplain` | teste: concluir a prova grava 8 docs com todos os campos da §5.1 | print do console do Firestore com os 8 docs de um dia | que os campos de tempo não estejam zerados |
| P1.3 | `src/services/quiz/profile.ts` (novo) + `src/types/village.ts:310` | `buildProfile`; `LearningDoc.profile` | teste com o export real: `weak` traz `ingles` e `historia` | log verde | os `strong`/`weak` contra a tabela de acerto por assunto da análise |
| P1.4 | `src/components/hero/DailyQuiz.tsx` + `provaRules.ts:3,5` | portão de 6 s; repescagem; áudio do inglês; molde e contador da reflexão; rampa de 8 para 12 palavras | `provaV2.test.ts`: `readingMs(texto, 6000, 12000) === 6000` para 9 palavras; reflexão de 11 palavras reprova depois do 7º dia e aprova antes | **fotos**: a tela da explicação com os dois blocos; o "Tentar de novo"; o contador "7 / 12"; o molde | as fotos contra a lei da fala (`lei-excelencia-aaa.mdc:110-120`) e a decisão 23b (sem aviso de que não paga) |
| P1.5 | `src/services/quiz/rotation.ts:49-56` | implementar `pickTheme` (§8.2) e ligar em `dailyQuizService.ts:106`; gravar `theme.angle` e `theme.depth` | `rotation.test.ts`, que já existe e nunca rodou | log verde dos 365 dias simulados | que o ângulo e a profundidade cheguem ao prompt |
| P1.6 | `src/components/parent/DailyQuizManager.tsx` | bloco "Como ele vai" (§6) | — | **foto** do painel com dados reais de 3 dias | que o pai consiga ler em 10 segundos em que ele vai mal |
| P1.7 | `src/services/aiUsage.ts:35,106-111` | tabela de preço por modelo, somando por `byModel` | teste: 1.000 tokens de entrada em `gpt-4o` custam 6,25× mais que em `gpt-4.1-mini` | print do painel com o custo por modelo | a conta contra a tabela da OpenAI do dia |
| P1.8 | `src/components/hero/DailyQuiz.tsx:256-262` | `await prepare()` antes do prefetch de amanhã | teste de integração com `dailyQuizService` mockado: o `avoid` da segunda chamada contém os enunciados da primeira | log com os dois `generatedAt` separados por mais de 1 s | que 14/09 e 15/09 (gerados no mesmo segundo) não possam se repetir |

### P2 — depois

| # | Arquivo | Mudança | Teste | Evidência |
|---|---|---|---|---|
| P2.1 | `src/services/aiDailyQuiz.ts` + `dailyQuizService.ts` | pergunta 8 vira `kind: 'review'` com Biblioteca nível 2+ (decisão 14, §8.4); fallback matemática | com um erro de 4 dias atrás no `quizBank`, a prova de hoje traz `reviewOf` | print do doc da prova com `reviewOf` |
| P2.2 | `src/services/quiz/provaRules.ts:235-245` + `aiDailyQuiz.ts:30-32` | `dilemmaOf` devolve `null` quando o índice 2 não é `lesson` com `skill: 'LIC.DILEMA'` | teste: prova com uma `lesson` descartada não faz o Sábio comentar a pergunta de matemática | log verde |
| P2.3 | `public/data/quizData.json` + `aiQuiz.ts:189-196` | banco offline passa pelo mesmo validador e devolve `category`/`subject` | todas as 200 perguntas passam em `checkQuestion` | lista das reprovadas para o líder reescrever |
| P2.4 | `scripts/backfill-quizbank.cjs` | retroativo do `quizBank` a partir dos 8 docs com `questions[]` | idempotente pelo id | log com 64 docs criados |
| P2.5 | `src/services/quiz/dailyPrompt.ts` | encolher a lista "não repita" de 60 para 40 enunciados quando o hash já filtra | medição em `prompt-len.mjs` | ~460 tokens de entrada a menos por chamada |

---

## 8. Custo

Medições em caracteres (3,3 por token em português, margem de ±10%): o prompt v3 da §3 tem **8.879 caracteres = ~2.691 tokens**; a lista "não repita" com 60 enunciados reais tem 4.521 caracteres = ~1.370 tokens; a saída v3 estimada a partir da prova real de 21/09 (373 caracteres por pergunta, menos a `explanation` de 107, mais `why` + `trap` + 4 campos novos) dá **557 caracteres por pergunta, 7.217 no total com 11 perguntas = ~2.187 tokens**. Preço de tabela da OpenAI, US$ por milhão: `gpt-4o` 2,50 entrada / 10,00 saída; `gpt-4o-mini` 0,15 / 0,60. Conferir antes de fechar: o código carrega **uma tabela só** para todos os modelos (`src/services/aiUsage.ts:35`), o que subestima o custo da prova em 6,25× no painel do pai.

| | chamadas/dia | entrada | saída | US$/dia | US$/mês |
|---|---|---|---|---|---|
| **v2 hoje** — geração `gpt-4o` | 1 | 2.479 | 1.207 | 0,0183 | 0,55 |
| v2 — juiz da reflexão `gpt-4o-mini` | 1 a 3 | ~450 | ~120 | 0,0003 | 0,01 |
| **total v2** | **2 a 4** | | | **0,0186** | **0,56** |
| **v3** — geração `gpt-4o`, 11 perguntas com `why` e `trap` | 1 | 4.061 | 2.187 | 0,0320 | 0,96 |
| v3 — revisor `gpt-4o-mini` (11 itens sem explicação) | 1 | ~1.100 | ~200 | 0,0003 | 0,01 |
| v3 — substituição `gpt-4o`, plano B, ~20% dos dias | 0,2 | 4.200 | 506 | 0,0031 | 0,09 |
| v3 — juiz da reflexão | 1 a 3 | ~450 | ~120 | 0,0003 | 0,01 |
| **total v3** | **3,2 a 5,2** | | | **0,0357** | **1,07** |

**Dinheiro não é o problema: +US$ 0,51 por mês, uns R$ 2,80.** O teto de chamadas é, e por um motivo que nenhuma das duas análises anteriores tinha medido:

- A prova gasta **10,9 chamadas de voz por dia** (medido em `tts-conta.txt` com o fatiador real, `speakChunks` de `provaRules.ts:195-233`): 2 a 3 fatias da ideia do dia mais 8 vereditos, ~1.400 caracteres. São **326 chamadas por mês**.
- A voz **não** entra no teto (`bumpUsage(ttsModel, 0, ...)`); o que entra são as chamadas de chat: 403 no mês em 22/09, ~19 por dia, ~570 projetadas — a v3 acrescenta 1,2 a 3,2 por dia. Cabe em 800; o painel precisa mostrar os dois contadores para o pai ver a folga de verdade (P0.7).
- O que custa à toa é o prefetch de voz com a prova fechada (P0.8): 11 chamadas por dia pulado.

O custo de voz em si: ~1.400 caracteres por dia, 42 mil por mês, a US$ 15 por milhão = **US$ 0,63 por mês**. Cabe. O que não cabe é ele consumir a cota de geração.

---

## 9. O que fica para depois

- **Estante de erros** (Etapa 3): a revisita da regra 11 é a semente. A Estante é a tela onde ele vê os erros ainda não corrigidos, escolhe um e o refaz por outro ângulo, com bônus no acerto (decisão 14, Biblioteca nível 3). Depende de o `quizBank` ter 30 dias de dados — ou seja, não antes de meados de outubro.
- **Expedição mensal do Explorador** (Etapa 3): a prova longa de fim de mês, com `assessment` no `profile` (§8.4 já reservou o campo). Só faz sentido depois de `bySkill` ter volume; com 24 itens respondidos hoje, qualquer nota seria ruído.
- **Três frases da mesma regra na mesma sessão** (lei do professor, `.cursor/rules/lei-excelencia-aaa.mdc:143`): a prova do dia cabe uma por dia; as outras duas são da Arena de Inglês. A ponte entre `englishBase` e o `skill` da prova fica para a Etapa 3.
- **Formatos fora da múltipla escolha** (ordenar, completar, achar o erro com entrada de texto): precisam de tela nova. Etapa 3.
- **Ligar o `profile` ao `RotationProfile`** com peso de verdade: entra quando `weak` tiver base de 4 perguntas por categoria, não antes.

---

## 10. Prompt para colar no Cursor (quando o pai aprovar)

Leia `docs/etapas/ETAPA_3_PROVA_V3.md` inteiro e a seção "Revisão dos pacotes do fim de semana (22/09)" de `docs/etapas/REVISAO_ETAPA_2_LANCAMENTO.md` (achados A1 a B9 da Prova v2). Antes de qualquer linha da v3, corrija os achados A2 (pagar antes de marcar `completed`), A3 (`answerLeaksInPrompt` com fronteira de palavra), M1 (guarda de `completed` em `completeDailyQuiz`), M2 (gravar `answers` ao fechar a 8ª pergunta e dar saída na reflexão), M3/M4 (anel e botão da lição), M8 (dilema fora da nota, `kind: 'dilemma'`) e M9 (`dilemmaOf` sem chute de índice), cada um com o teste indicado. Depois entregue os pacotes P0.1 a P0.9 da §7 na ordem, um commit por pacote, sem tocar nos congelados nem restilizar o painel. Cada pacote fecha com: tsc 0 erros, `npx eslint src --max-warnings 8` 0 erros, `npm run test:english` e `npm run test:village` verdes (com a pasta `quiz` registrada no harness), 3 provas geradas de verdade na conta de teste (`teste@flash.com`) com o JSON de `sanitize` e as 8 perguntas de cada uma coladas no relatório, e fotos 1280×720 e 1920×1080 das telas tocadas. Relate em `docs/etapas/RELATORIO_ETAPA_3_PROVA_V3.md` no formato de sempre (o que mudou, arquivos, barra, fora, dúvidas). Pare para o commit do pai depois de cada pacote.
