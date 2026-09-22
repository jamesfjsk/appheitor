# Relatório — Prova v3 P0 (22/09/2026)

Conta `teste@flash.com`. Decisões 32–36 no §1 de `ETAPA_2_LANCAMENTO.md`. P0.1 (A3, palavra inteira) já estava.

## P0.2 — validador

`validateQuestion.ts`: 23 códigos, `numbersOf` e `reachable` exportados. Fixture `era3.json` (casos de 14–22/09). 21/09 Q4 e 15/09 Q8 passam vazios. `rotation.test.ts` continua vermelho (`pickTheme` = P1.5, fora do P0).

## P0.3 — harness

Já no Pacote 1: pasta `quiz` em `run-english-tests.mjs`.

## P0.4 — prompt

`buildPrompt({ seed, count, spare, age, weekday, englishLevel, avoidHashes })`. Cartão do nível 1, MAT.OP2, LIC.DILEMA, numeração 4) a 8), `count+spare`.

## P0.5 — geração

Pede 11, fica com 8. `selectValidQuestions`. Nunca devolve menos que `count` (cai no offline). Grava `sanitize`.

## P0.6 — reviewer

`reviewBatch`: `falta_duas_etapas`, `falta_formato`, `ingles_mistura_regra`.

## P0.7 — teto

`AI_MONTHLY_CALL_CAP = 800` no cliente (`aiCost.ts`) e na function. 1000 tokens de entrada gpt-4o / mini = 6,25. Painel: linha "Prova (gpt-4o)".

## P0.8 — prefetch

Voz só com a mesa aberta e `phase !== 'prompt'`. Dep `quiz?.id`.

## P0.9 — tokens

`quizMaxTokens(8, 3) = 4500`. `CHAT_MAX_TOKENS = 6000`. Functions publicadas **22/09/2026, 09:25 BRT**.

## Três provas na conta de teste

Geradas com `?quiz=regen` em 2026-10-07, 08 e 09. A IA (gpt-4o) rodou; o validador ficou com menos de 8; o jogo entregou o banco offline (nunca menos que 8). JSON em `docs/exemplos/telas/etapa-3/prova-v3/`.

### 2026-10-07 — Obsidiana: o vidro do vulcão

`source: offline`

```json
{"kept":2,"dropped":{"audio_mismatch":1,"conta_nao_fecha":1,"definicao":1,"sinonimas":1,"why_curto":6,"why_sem_resposta":1}}
```

1. Qual bioma brasileiro é a maior floresta tropical do mundo? → Amazônia
2. Ache o erro: 'O Brasil foi colonizado por Portugal e ficou independente em 1500.' → 1500 é a chegada; independência em 1822
3. O que representam as estrelas da bandeira do Brasil? → Os estados e o Distrito Federal
4. O que vem depois: 1, 1, 2, 3, 5, 8, ...? → 13
5. No verão, o Polo Norte tem Sol por meses. Por que faz frio? → Raios inclinados espalham pouco calor
6. Por que não existem pinguins selvagens no Polo Norte? → Evoluíram no sul e não cruzaram o Equador
7. Plural de 'box'? → boxes
8. Qual frase é verdadeira sobre os rios? → Correm do mais alto para o mais baixo

### 2026-10-08 — Por que o bolo cresce

`source: offline`

```json
{"kept":1,"dropped":{"conta_nao_fecha":1,"sinonimas":1,"why_curto":1,"why_sem_resposta":5}}
```

1. Qual frase é verdadeira sobre a internet? → Liga computadores por cabos e sinais
2. O que significa a placa EXIT? → Saída
3. Estime: litros num banho de 10 minutos? → Cerca de 100 litros
4. Ache o erro: Hércules cumpriu dez trabalhos. → Foram doze
5. Time com 11, 2 expulsos. Com quantos fica? → 9, e o jogo continua
6. Heitor tem o triplo da idade do primo. Juntos 16. Idade do primo? → 4
7. Vela coberta por pote apaga. Por quê? → Acabou o oxigênio
8. O que aconteceria se todo mundo mentisse? → Ninguém confiaria; promessas perdem valor

### 2026-10-09 — Onde a água doce se esconde

`source: offline` — `{"kept":8,"dropped":{}}` (a IA desta data não devolveu lote; o fallback não trouxe códigos).

1. Qual frase é verdadeira sobre a filosofia? → Arte de fazer boas perguntas
2. Copo na janela perde água. Para onde foi? → Evaporou
3. O Amazonas deságua em qual oceano? → Atlântico
4. Pizza em 8; Heitor 3, pai 2. Que fração sobrou? → 3/8
5. Quando o impedimento é marcado? → Atacante à frente do penúltimo defensor no passe
6. 2 gols no 1º, sofreu 3 no 2º, terminou 4 a 3. Gols no 2º? → 2
7. O que significa ser justo? → As mesmas regras para todos
8. Qual frase é verdadeira sobre a internet? → (mesma do banco do dia 08)

## Seis perguntas do professor (5 itens)

**1. 21/09 Q4 — 6 células × 5 dias × 4 abelhas = 120 (aprovada)**  
1. Aprende a juntar duas contas (por dia, depois o grupo).  
2. Abelha da Vila; primeiro 6×5=30, depois ×4.  
3. Claro para 10 anos.  
4. Uma certa; distrator 30 é o erro de parar na 1ª etapa.  
5. O trap nomeia o 30.  
6. Degrau de 5º ano, não "5 menos 2".

**2. 15/09 Q8 — o que aconteceria sem oxigênio na respiração (aprovada local)**  
1. Causa e efeito na célula.  
2. Tira o oxigênio e vê o que quebra.  
3. Uma ideia.  
4. Uma certa; "viraria pedra" é caricatura, recusada como resposta.  
5. Trap explica a caricatura.  
6. Ciências de causa, não definição.

**3. 15/09 Q3 — 5 maçãs menos 2 (descartada: `conta_um_passo`)**  
1. Nada que o 5º ano ainda não saiba.  
2. Só uma conta.  
3. Clara demais.  
4. Uma etapa.  
5. O validador joga fora; o Heitor não vê.  
6. Recusar é a progressão.

**4. 10/07 Q2 offline — ache o erro 1500/1822**  
1. Separar chegada e independência.  
2. Lê a frase mentirosa e acha a data.  
3. Claro.  
4. Uma certa; "não há erro" é o distrator preguiçoso.  
5. A explicação dá o século no meio.  
6. História de consenso.

**5. 10/08 Q6 offline — triplo da idade, soma 16**  
1. Parte e todo (4 partes).  
2. Primo + Heitor no recreio.  
3. Claro.  
4. Distrator 12 é inverter quem é o triplo.  
5. A explicação mostra 16÷4.  
6. Duas etapas.

A IA do dia 07/08 foi descartada de verdade (`why_curto`, `why_sem_resposta`, `definicao`, `conta_nao_fecha`). O Heitor não viu essas perguntas.

## Barra da lei (1–16)

1. Intenção. Mesa = ideia do dia. Passa.  
2. Sistema. Papiro e `mc-*` intactos. Passa.  
3. Fonte. Press Start no HUD, Fredoka no papiro. Passa.  
4. Ícone. Sábio pixel. Passa.  
5. Hierarquia. Título, depois Começar. Passa.  
6. A cena continua. Vila atrás do papiro. Passa.  
7. Arestas. 1280 e 1920. OCR cola Fredoka; as strings têm espaço. Passa.  
8. Mundo. Phaser intocado. Passa.  
9. Economia. Dilema fora da nota (M8). Passa.  
10. Consequência. Validador corta sem humilhar. Passa.  
11. Estado honesto. `sanitize` no doc. Passa.  
12. Mouse. Começar 44 px. Passa.  
13. Craft. Prefetch só com a mesa aberta. Passa.  
14. Copy. Sem boletim. Passa.  
15. Evidência. Conta teste; fotos `prova-v3/*-1280.png` e `*-1920.png`. **frame lido: nada sobreposto, cortado ou fora do clique.**  
16. Arestas. Offline quando a IA não fecha 8. Passa.

## Fora

- `pickTheme` (P1.5) — `rotation.test.ts` vermelho de propósito  
- Memória da Prova / Como você vai / revisita em dobro  
- R1 ruína por rodada (Pacote 4 não implementa)
