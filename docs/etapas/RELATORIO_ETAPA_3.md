# Relatório — Etapa 3

Uma seção por pacote. Formato de sempre. Conta de teste: `teste@flash.com`. Nunca a do Heitor.

---

## Pacote 1 — Prova do dia (o que ainda sangra)

Sentimento alvo: a prova guarda o que ele já fez; sair na reflexão não apaga o dia; o anel nunca mente que o tempo acabou.

### O que mudou

- **M1.** `completeDailyQuiz` lê o doc no início; se `completed === true`, sai sem bumps. `payThenComplete` paga primeiro (A2 do líder intacto). Dublê de `pay` que lança: `complete` não roda.
- **M2.** Ao fechar a 8ª pergunta, `stashQuizAnswers` grava `answers`, `score`, `totalQuestions`, `awaitingReflection: true`, sem `completed` e sem pagar. Reflexão ganha "Voltar à Vila" e Esc. Recarregar volta à reflexão com as 8 respostas (a frase do Sábio ainda não estava gravada — não entra no stash).
- **M3.** `readRingDash`: com reduced-motion, degraus de 25% e teto 75% enquanto travado. O anel não nasce cheio.
- **M4.** Sumiu `disabled={!voiceDone}` do "Começar" da lição. O clique já corta a voz; o anel de leitura continua.
- **M9.** `dilemmaOf` devolve `null` quando o índice 2 não é `lesson`. Cartão Hoje some o bloco.
- **B4.** `completeDailyQuiz` recebe `about` e grava `reflectionWords`.
- **B5.** `saveReflection` apagada.
- **B1.** Pasta `quiz` no harness. `provaBleed.test.ts` 6/6. `rotation.test.ts` vermelho: `pickTheme` ainda lança (P1.5 da v3; não implementei).

A2 e A3 do líder não foram refeitos.

### Arquivos

- `src/services/quiz/closeQuiz.ts` (novo)
- `src/services/quiz/__tests__/provaBleed.test.ts` (novo)
- `src/services/dailyQuizService.ts`
- `src/components/hero/DailyQuiz.tsx`
- `src/services/quiz/provaRules.ts` (`dilemmaOf`, `readRingDash`)
- `src/types/index.ts`
- `src/services/village/__tests__/provaV2.test.ts`
- `scripts/run-english-tests.mjs`
- `docs/exemplos/telas/etapa-3/prova/`
- `docs/etapas/ETAPA_2_LANCAMENTO.md` §12

### Barra da lei (item a item)

1. Intenção. Mesa, oito perguntas, frase ao Sábio. Passa.
2. Sistema. `mc-modal`, papiro, `mc-btn`. Sem look novo. Passa.
3. Fonte. Título pixel; corpo e botão Fredoka. Passa.
4. Ícone. Sábio e slots 24–32 px. Sem emoji. Passa.
5. Hierarquia. Uma âncora (papiro). Botões 44 px. Passa.
6. A cena continua. Vila visível ao redor. Passa.
7. Arestas. 1280 e 1920. Vazio da reflexão = placeholder do mundo. Passa.
8. Mundo. Prova no React. Passa.
9. Economia. Sem fonte nova; claim `quiz:<data>` intacto. Passa.
10. Consequência. Sem humilhação. Passa.
11. Estado honesto. "As oito respostas estão na mesa" quando `awaitingReflection`. Passa.
12. Mouse e teclado. Esc sai na reflexão. Passa.
13. Craft. `playClick`; anel com peso. Passa.
14. Copy. Sem "Faltam N". Passa.
15. Evidência. Fotos desta sessão, conta de teste, `?d=2026-10-06`. **frame lido: nada sobreposto, cortado ou fora do clique.** A fonte pixel do título aperta as letras (já era da v2). Passa.
16. Arestas. Reload na reflexão; reduced-motion no anel. Passa.

### Como verificou

- `npx tsc --noEmit -p tsconfig.app.json` — 0 erros
- `npx eslint src --max-warnings 8` — 0 erros, 8 avisos antigos
- `npm run test:village` — 10/10 verdes
- `node scripts/run-english-tests.mjs quiz` — `provaBleed.test.ts` 6/6; `rotation.test.ts` 1/10 (stub, B1)
- Fotos em `docs/exemplos/telas/etapa-3/prova/` (conta `teste@flash.com`): convite, anel 0/25/50/75, Começar verde, reflexão com Voltar, reflexão restaurada depois do reload

### Fora

- A1 / quizBank, M5 nível de inglês, M7 validador, M8 `kind: 'dilemma'`, B2 "Como ele vai", B3 juiz local frouxo, P1.5 `pickTheme`
- Rascunho da reflexão não entra no stash (o pedido só cita answers/score/total)

### Dúvidas

- `rotation.test.ts` vermelho no `test:english` é o aceite do B1, não falha deste pacote.
- Não criei `ETAPA_3.md` só para ter §12; registrei em `ETAPA_2_LANCAMENTO.md`.

**Pare para o commit do pai antes do Pacote 2.**

---

## Pacote 2 — Comerciante (código fechado; foto do final ainda não)

Sentimento alvo: um pedido, um lugar; a preposição ele ouve, não lê colada no tapete.

### O que mudou

- **F2.** `addPlacement` recusa o segundo tapete. Empilhar `qty` no mesmo lugar continua. A bandeja trava o outro item até devolver.
- **F3.** Rótulo da preposição só em `padMode === 'hint'`. Pedido 1 sem zona `is-ask`.
- **F4.** `missKind` grava `relation | item | qty | spot` por tentativa.
- **F5 / F6.** Fala PT com `{ lang: 'pt', speed: TTS_SPEED_TALK }` (no Pacote 3 isso virou `PT_TALK`). `correctionFix` devolve `{ en, pt }`. O inglês fica na tela.
- **F8.** Clique no item e no lugar fala a palavra em inglês. Hover não fala.
- **F9.** `baseY` 304 na âncora `wall`. `under` usa esse chão.
- **F11.** `boots` só sai com qty 1.
- **F12.** Cama e cerca fora do sorteio. `under` fora de porta, janela e cerca. `in` + forno só com item de cozinha.
- **F13.** Bandeja em `%` do palco (`8.39%`), não 52 px fixos.
- **F14.** `listens` só sobe quando o áudio acaba. `textShown` é a frase que abriu.
- **F15.** `docs/MINA_CONTRATOS.md` §3.1 reescrito com o jogo entregue. F16 fica como pendência do pai.
- **F16.** Não mexido.

### Arquivos

- `src/services/english/merchantPlay.ts`
- `src/services/english/merchantRoom.ts`
- `src/components/hero/english/base/MerchantDelivery.tsx`
- `src/services/english/__tests__/merchantPlay.test.ts`
- `src/services/english/__tests__/merchantRoom.test.ts`
- `public/assets/village/scenes/comerciante/anchors.json`
- `src/styles/miner.css`
- `docs/MINA_CONTRATOS.md`
- `docs/exemplos/telas/etapa-3/comerciante/`

### Como verificou

- `npx tsc --noEmit -p tsconfig.app.json` — 0 erros (depois do Pacote 3, na mesma árvore)
- `node scripts/run-english-tests.mjs english` — 11/11 arquivos verdes
- Fotos 01–06 em 1280 e 1920, conta `teste@flash.com`, `?d=2026-09-20`. Pedido 1: um móvel, tapetes sem rótulo, frase EN depois de ouvir. Erro devolve o item e a frase EN fica no balão.
- **Falta** `07-final`. O loop de fotos para na fala de acerto: o botão Ouvir fica em "Falando..." e os bolsos somem até a voz acabar. O script já espera o botão voltar; a última rodada foi interrompida antes do 07.

### Fora

- F16 (avança sozinho depois de 2 erros)
- Foto 07 do final

---

## Pacote 3 — Recado (código e testes; fotos ainda não)

Sentimento alvo: o quadro guarda o que ele montou; falta de informação é ajuda, não dia zerado.

### O que mudou

- **R2 + R11.** Falta na 1ª ida não apaga `fills` nem `freeText`. Marca `helped`. `firstJudge` só no primeiro `judgeNote`. Material com ajuda: `noteHelpedMaterial` = `min(noteMaterial, 2)`. Trava `sending` no Enviar. `noteMaterial(1)` continua 0.
- **R3.** `firstAnswer` no mesmo instante que `firstJudge`. Finale e `details` levam as duas frases e as duas notas. Pregos do Finale leem `firstAnswer`.
- **R4.** `moldFromModel` só com 2+ lacunas e sem `.!?` dentro do slot. Senão molde vazio.
- **R5.** `teachFromRecado` não cola o brief. Teto 220 caracteres.
- **R7.** n2-01 pede permissão e o model não se autoriza (`I ask because…`). n2-03 sem `because I am new`. n2-04 sem `water` solto. n2-05 o motivo vira desejo (`because I want a clean room`) e ganhou a frase curta `I want it clean.` porque o nível 2 exige 2 frases.
- **R8.** `PT_TALK` em `provaSpeak.ts`. Recado, Prova e Comerciante usam.
- **R10.** `dirty` só com o que ele digitou. Esc depende de `dirty`, `askQuit`, `confirmQuit`, `phase`.
- **R12.** Fase `judged` usa `chalkDiff` (`.nb-bad` / `.nb-good`) e `pegLesson`.
- **R14.** Finale mostra "O pedido era: …", cortado em 80 caracteres.
- **R15.** A fala da falta cai no fallback se `say` contém o model inteiro.
- **R16.** `.nb-tray` `left: 22%`.
- **R18.** Fonte do quadro, do giz e dos chips em `--nb-chalk` / `--nb-chip`, escala do palco.
- **R6 e R17.** Não mexidos.

### Arquivos

- `src/components/hero/english/base/RecadoBoard.tsx`
- `src/services/english/notePlay.ts`
- `src/services/englishJudge.ts`
- `src/services/quiz/provaSpeak.ts`
- `src/config/englishRewards.ts`
- `src/data/englishOfflineContracts.ts`
- `src/styles/miner.css`
- `src/components/hero/english/base/MerchantDelivery.tsx` (passa a importar `PT_TALK`)
- testes `notePlay`, `notePrecheck`, `offline`, `scoring`

### Como verificou

- `tsc` 0 erros
- `eslint` nos arquivos tocados: 0 erros
- `node scripts/run-english-tests.mjs english` — 11/11 verdes
- **Fotos do Recado ainda não.** Sem frame lido em 1280 e 1920 nesta sessão.

### Fora

- R6, R17
- Aceite visual do quadro

### Dúvidas

- n2-05: o pedido pede o model `The bed is ready because I want a clean room.` O banco do nível 2 exige 2 frases. Ficou essa frase e mais `I want it clean.`


---

## Pacote 2 — Comerciante V1

Sentimento alvo: um pedido, um lugar; a preposição ele ouve, não lê colada no tapete.

### O que mudou

- **F2.** `addPlacement` recusa o segundo tapete; empilhar qty no mesmo lugar continua. `evaluateRoom` zera o passo se houver duas zonas. Item da bandeja trava depois da primeira queda.
- **F3.** Pedido 1 sem zona acesa e sem rótulo. `RELATION_EN` só em `padMode === 'hint'`. Continua 1 móvel no pedido 1.
- **F4.** `missKind` (`relation | item | qty | spot`) entra em `details.misses` por tentativa.
- **F5.** Falas PT com `{ lang: 'pt', speed: TTS_SPEED_TALK }`. Correção mista = EN e depois PT.
- **F6.** `correctionFix` devolve `{ en, pt }`. A tela e o áudio EN mostram "On the table, not next to."
- **F8.** Clique no item e no lugar fala a palavra em inglês. Hover continua mudo.
- **F9.** `baseY: 304` na âncora `wall` da sala. `zonesFor` usa esse chão no tapete under.
- **F11.** `boots` nunca sai com qty ≥ 2.
- **F12.** Cama e cerca fora do armazém; under fora de porta/janela/cerca; `in` + forno só com maçã, banana, laranja, bolo, balde.
- **F13.** Bandeja em % do palco; números em unidade do palco.
- **F14.** `listens++` só depois de `playText` resolver. `textShown` = a frase EN abriu (`textOpen`), não marca de erro.
- **F15.** `docs/MINA_CONTRATOS.md` §3.1 descreve o jogo entregue. F16 anotado como pendência do pai.

Script `_shot_comerciante.mjs` mira `data-relation` (e `data-spot`). Fotos 01–06 do build atual. **07-final não saiu**: o segundo pedido não fechou no script (a voz do acerto demora mais que o loop). Não mexi no F16.

### Arquivos

- `src/services/english/merchantPlay.ts`, `merchantRoom.ts`
- `src/components/hero/english/base/MerchantDelivery.tsx`
- `src/services/english/__tests__/merchantPlay.test.ts`, `merchantRoom.test.ts`
- `public/assets/village/scenes/comerciante/anchors.json`
- `src/styles/miner.css` (bandeja)
- `docs/MINA_CONTRATOS.md` §3.1
- `docs/exemplos/telas/etapa-3/comerciante/`
- `docs/etapas/ETAPA_2_LANCAMENTO.md` §12

### Barra da lei (item a item)

1. Intenção. Ouve, arrasta, um lugar. Passa.
2. Sistema. Cena do armazém, `mc-btn`, bandeja. Passa.
3. Fonte. Balão Fredoka; título pixel. Passa.
4. Ícone. Itens da bandeja no teto do palco, não 256 px. Passa.
5. Hierarquia. Pedido no balão; um móvel no pedido 1. Passa.
6. A cena continua. Tela cheia do armazém (é a porta jogo). Passa.
7. Arestas. 1280 e 1920. Passa.
8. Mundo. Mina = lugar; contrato = porta. Passa.
9. Economia. Sem fonte nova; primeira entrega paga. Passa.
10. Consequência. Erro devolve e ensina, sem humilhar. Passa.
11. Estado honesto. Sem cola no pedido 1; rótulo só depois do erro. Passa.
12. Mouse e teclado. Alvo 44 px; Esc do contrato intacto. Passa.
13. Craft. Estalo, voz, `playClick`. Passa.
14. Copy. Voz do Comerciante, sem dashboard. Passa.
15. Evidência. Conta `teste@flash.com`, `?d=2026-09-20&h=14`. **frame lido: nada sobreposto, cortado ou fora do clique.** Pedido 1 sem rótulo; correção EN no balão. 07-final faltou. Parcial.
16. Arestas. F11/F12 em 400 sementes × 3 níveis. Passa.

### Lei do professor (F15)

1. Aprende: in / on / under / next to numa frase do armazém, uma regra por sessão.
2. Como: ouve a frase, arrasta, vê o item no lugar; o erro fala a preposição certa em inglês e depois em português.
3. Claro: um móvel no pedido 1; sem palavra colada no tapete.
4. Questão: um lugar certo; o distrator é o par que o brasileiro troca (in/on, under/next to).
5. Erro ensina: `On the table, not next to.` + PT; tenta de novo sem ouro.
6. Progressão: 1→2→3 móveis; n1 só in/on; n2/n3 contrapõem no último.

### Como verificou

- `npx tsc --noEmit -p tsconfig.app.json` — 0 erros
- `npx eslint src --max-warnings 8` — 0 erros, 8 avisos
- `node scripts/run-english-tests.mjs english` — 11/11 verdes (`merchantPlay` 18/18, `merchantRoom` 11/11)
- `npm run test:village` — 10/10
- Fotos 01–06 em `docs/exemplos/telas/etapa-3/comerciante/` (1280 e 1920). step0: `ask: 0`, `labels: []`

### Fora

- F16 (o que acontece depois de dois erros)
- 07-final desta sessão

### Dúvidas

- F11 = qty 1 para `pluralOnly`, sem "two pairs of boots".
- `rotation.test.ts` continua vermelho no `test:english` (B1 do Pacote 1).

**Pare para o commit do pai antes do Pacote 3.**

---

## Pacote 3 — Recado do Capataz V1

Sentimento alvo: o quadro guarda o que ele montou; falta de informação é ajuda, não dia zerado.

### O que mudou

- **R2 + R11.** Primeira falta não apaga o giz. Marca `helped`. `firstJudge` só no primeiro `judgeNote` de verdade. Teto `noteHelpedMaterial` = `min(nota, 2)`. Enviar trava in-flight.
- **R3.** `firstAnswer` no mesmo instante que `firstJudge`. Finale e `details` mostram as duas frases e as duas notas. Pregos leem a primeira frase.
- **R4.** `moldFromModel` só com 2+ lacunas e sem `.!?` no slot; senão molde vazio (degrau livre).
- **R5.** `teachFromRecado` não cola o brief; teto 220 caracteres. Teste atualizado.
- **R7.** Banco: n2-01 pede permissão + lição pronta (model não se autoriza); n2-03 sem `because I am new`; n2-04 sem `water` solto no prego; n2-05 motivo = desejo (`because I want a clean room`).
- **R8.** `PT_TALK` em `provaSpeak.ts`; Recado e Comerciante importam a mesma constante.
- **R10.** `dirty` só o que ele digitou. Esc com deps `dirty`, `askQuit`, `phase`, `confirmQuit`.
- **R12.** `chalkDiff` e `pegLesson` na fase `judged` (`.nb-bad` / `.nb-good`).
- **R14.** Finale: "O pedido era: …" cortado em ~80.
- **R15.** Guarda `say.includes(model)`; vazou, cai no fallback.
- **R16.** `.nb-tray` `left: 22%`.
- **R18.** Giz e chips em unidade do palco (`--nb-chalk`, `--nb-chip`).

### Arquivos

- `src/components/hero/english/base/RecadoBoard.tsx`
- `src/services/english/notePlay.ts`, `englishJudge.ts`
- `src/data/englishOfflineContracts.ts` (R7 já no banco; teste trava)
- `src/config/englishRewards.ts` (`noteHelpedMaterial`)
- `src/services/quiz/provaSpeak.ts` (`PT_TALK`)
- `src/styles/miner.css`
- `src/services/english/__tests__/notePlay.test.ts`, `offline.test.ts`, `scoring.test.ts`
- `docs/exemplos/telas/etapa-3/recado/`
- `docs/etapas/ETAPA_2_LANCAMENTO.md` §12

### Barra da lei (item a item)

1. Intenção. Quadro, giz, três pregos. Passa.
2. Sistema. Mesma sala, `mc-btn`, bandeja. Passa.
3. Fonte. Balão Fredoka. Passa.
4. Ícone. Capataz e chips no palco. Passa.
5. Hierarquia. Pedido no balão; giz no centro. Passa.
6. A cena continua. Armazém atrás. Passa.
7. Arestas. 1280 e 1920. Passa.
8. Mundo. Porta jogo da Mina. Passa.
9. Economia. Ajuda teto 2; nota 1 = 0 material. Passa.
10. Consequência. Falta ensina e guarda o giz. Passa.
11. Estado honesto. Duas frases no finale. Passa.
12. Mouse e teclado. Esc com dirty. Passa.
13. Craft. Voz PT, estalo. Passa.
14. Copy. Voz do Capataz. Passa.
15. Evidência. Conta `teste@flash.com`, `?d=2026-09-20&h=14`. **frame lido: nada sobreposto, cortado ou fora do clique.** Ajuda manteve `I do homework`. Giz com risco e correção. Finale com "O pedido era". Passa.
16. Arestas. 2º Enviar não vira outro juiz (trava). Passa.

### Lei do professor (R7)

**n2-01**
1. Aprende: pedir permissão (`Can I`) e justificar com `because` + lição pronta.
2. Como: ouve o model, monta no quadro; a lição pronta é o motivo, não a autorização.
3. Claro: brief só pede permissão + lição pronta.
4. Uma certa: pedir, não "I can play".
5. Erro ensina: se autorizar sozinho, o Capataz devolve o pedido.
6. Progressão: n2 introduz `because`; n1 ainda não.

**n2-03**
1. Aprende: pedir ajuda com uma palavra nova (`because this word is new`).
2. Como: a variante errada típica ("because I am new") saiu.
3. Claro: a palavra é nova, não ele.
4. Uma certa: motivo na palavra.
5. Erro: "I am new" não acende o prego.
6. Progressão: mesmo `because` do n2, outro assunto.

**n2-04**
1. Aprende: `I drink water at the game because I am hot` — três infos, sem atalho.
2. Como: `water` sozinho não acende "bebo água".
3. Claro: precisa do verbo.
4. Uma certa: beber + lugar + calor.
5. Erro: "water" solto não conta.
6. Progressão: R1 já tinha o contrário; este fecha o atalho.

**n2-05**
1. Aprende: `because I want` (desejo), não dever.
2. Como: model `The bed is ready because I want a clean room.`
3. Claro: brief "porque você quer o quarto limpo".
4. Uma certa: desejo, `because` fica.
5. Erro: motivo de obrigação não casa com o prego.
6. Progressão: mesmo `because` do n2, agora vontade.

### Como verificou

- `npx tsc --noEmit -p tsconfig.app.json` — 0 erros
- `npx eslint src --max-warnings 8` — 0 erros, 8 avisos
- `npm run test:village` — 10/10
- `node scripts/run-english-tests.mjs` — english verde; `rotation.test.ts` 1/10 (B1)
- Fotos 01–05 em `docs/exemplos/telas/etapa-3/recado/` (1280 e 1920)

### Fora

- R6 (bandeja só wordBank) e R17 — não mexer
- `ComoVouIndo` / revisita em dobro

### Dúvidas

- R2 teto de material com ajuda = 2 (espelho do Comerciante).
- Brief do finale desta sessão: "Peça três vacas e uma vaca preta para o celeiro." (o recado do dia 20/09 na conta de teste). Não sobrepôs; a linha ficou.

**Pare para o commit do pai antes do Pacote 4.**

---

## Pacote 4 — Cofre, Torre e regras

Sentimento alvo: o Cofre não some com o bolso; o mirante fica no fundo; o que abre na Etapa 3 fala como o mundo.

### O que mudou

- **T1/T2.** `coverPaintedLookout` e a chamada na Torre saíram.
- **C1.** Caminho do prêmio sempre `createGoal`. Barra do prêmio soma `savedGold` dos montinhos `open` com o mesmo `rewardId`.
- **C2.** `pickGhostPile` reaproveita fantasma (`open` + `savedGold === 0`) antes do teto.
- **C3.** `GoalsPanel` não lista `cancelled`.
- **R2 Cofre.** `redeemGoal` lança se o `progress` não existe; não marca `cancelled` nem grava extrato.
- **D14.** Cofre `liveMaxLevel: 2`, `opensIn: 'Etapa 3'`. Biblioteca até 3 (sai o teto 1). n2/n3 da Mesa com os textos da decisão 14. Torre n3 e Armazém n1 intactos. Cartão no teto da etapa: "Abre na Etapa 3", botão morto, sem custo. Sem `ComoVouIndo` e sem revisita em dobro.
- **L2 + T3.** `previewLevelFrom(id, level, hostname, search)` pura; host só `localhost` / `127.0.0.1`. Resolução na carga do módulo.
- **F05.** `unlockOn` só cresce se o campo já existe (YYYY-MM-DD). Fantasma vazio pode trocar título/alvo/`rewardId`.
- **F06.** `village` também proíbe `launchedAt`, `userId`, `createdAt`.
- **F07.** `ISO_NPC_WALK` vazio. `useWalk` do herói intacto.
- **F08.** `git rm -r --cached functions/lib` (4 arquivos saíram do índice, ficam no disco).
- **Publicado.** `npx firebase-tools deploy --only firestore:rules,firestore:indexes --project app-heitor` — **22/09/2026, 09:15:07 BRT**.

### Arquivos

- `src/components/hero/village/VillageScene.tsx`, `drawAmbient.ts`
- `src/config/village.ts`, `englishBase.ts`
- `src/services/goalsService.ts`, `village/bank.ts`
- `src/components/hero/village/Cofrinho.tsx`, `BuildingCard.tsx`
- `src/components/parent/GoalsPanel.tsx` (só filtro)
- `firestore.rules`
- `src/services/village/__tests__/etapa2.test.ts`, `hover.test.ts`
- `src/services/english/__tests__/levels.test.ts`
- `docs/exemplos/telas/etapa-3/cofre/`
- `functions/lib/*` saíram do git

### Barra da lei (item a item)

1. Intenção. Cofre = montinhos; teto da etapa fala "Abre na Etapa 3". Passa.
2. Sistema. Mesmos `mc-card`, `mc-bar`, `mc-btn`. Passa.
3. Fonte. Sem pixel novo. Passa.
4. Ícone. Ícones que já existiam. Passa.
5. Hierarquia. Barra do prêmio junta os montinhos. Passa.
6. A cena continua. Sem cobrir o mirante. Passa.
7. Arestas. 1280 e 1920 da Vila e do Mercado. Passa.
8. Mundo. Duas portas intactas. Passa.
9. Economia. Sem fonte nova de gold. Passa.
10. Consequência. Resgate sem bolso não mente. Passa.
11. Estado honesto. Teto da etapa não é "Nível máximo". Passa.
12. Mouse. Botão morto 48 px. Passa.
13. Craft. Sem tela nova. Passa.
14. Copy. "Abre na Etapa 3." Passa.
15. Evidência. Conta `teste@flash.com`, `?d=2026-09-20&h=14`. Fotos 01-vila e 02-mercado. **frame lido: nada sobreposto, cortado ou fora do clique.** O Cofrinho desta conta no dia 20 não abriu no script (lote ainda vazio). Parcial.
16. Arestas. `redeemGoal` sem `progress` não cancela. Passa.

### Como verificou

- `npx tsc --noEmit -p tsconfig.app.json` — 0 erros
- `npx eslint src --max-warnings 8` — 0 erros, 8 avisos
- `npm run test:village` — 10/10 (etapa2 23/23, hover com `previewLevelFrom`)
- `node scripts/run-english-tests.mjs english` — 11/11
- Regras publicadas 22/09/2026 09:15:07 BRT

### Fora

- R1 ruína por rodada (não implementar neste pacote)
- `ComoVouIndo` e revisita pagando dobro (P4.12 c/d)
- Foto do cartão "Abre na Etapa 3" no Cofre n2 (a conta de teste no dia 20 ainda não tinha o Cofre no teto)

### Dúvidas

- Pacote 4 não entrega "Como você vai" nem revisita com ouro em dobro.
- F11 do Comerciante continua qty 1 para `pluralOnly`.

**Pare para o commit do pai antes do Pacote 5.** (As decisões 32–36 já estavam no §1; o Pacote 5 segue abaixo.)

---

## Pacote 5 — Prova v3 P0

Sentimento alvo: a prova que chega na mesa já passou pelo professor; o que a IA inventa de frouxo não chega no Heitor.

Detalhe, as 8 perguntas das 3 provas e as seis perguntas do professor: `docs/etapas/RELATORIO_ETAPA_3_PROVA_V3.md`.

### O que mudou

- **P0.2.** Validador com 23 códigos; `numbersOf` / `reachable`; fixture das provas de 14–22/09. 21/09 Q4 e 15/09 Q8 passam.
- **P0.3.** Harness `quiz` já no Pacote 1.
- **P0.4.** Prompt com folga, cartão do nível 1, MAT.OP2, dilema `kind: dilemma`.
- **P0.5.** 11 pedidas, 8 ficam; `sanitize` no doc; nunca menos que `count`.
- **P0.6.** `reviewBatch` do lote.
- **P0.7.** Teto 800 nos dois lados; gpt-4o = 6,25× o mini; linha da Prova no painel.
- **P0.8.** Prefetch da voz só com a mesa aberta.
- **P0.9.** 4500 tokens; function em 6000. Publicada **22/09/2026, 09:25 BRT**.
- **M8.** Dilema fora da nota (`quizScoreOf`). `dilemmaOf` só aceita `kind: 'dilemma'`.

### Correções da revisão (pacotes 2 e 3, fechadas aqui)

- **F8.** O clique na bandeja fala a palavra. `draggingItem` só liga depois que o ponteiro anda mais de ~6 px. Clique parado não conta erro.
- **F9.** Âncora `wall` com `baseY: 440` (chão, não a caixa da janela). Foto com a poção no chão, embaixo da janela: `f9-chao-1280.png` e `f9-chao-1920.png`. A sala de verdade continua sem `under` na janela (F12). O `?f9=floor` é só DEV, para esta foto.
- **F16 / decisão 34.** Dois erros não viram a página. Ele tenta até o pedido fechar, sem pagar e sem aviso. As tentativas ficam em `details.misses` como `{ step, kinds }` (o Firestore recusa array dentro de array). O §3.1 de `MINA_CONTRATOS.md` não fala mais em “duas tentativas e avança”.
- **n2-01.** `Can I play soccer now? Please, because my homework is ready.` O banco tem `please` e `can`, sem `ask`.
- **n2-05.** `The bed is ready. I do this because I want a clean room.`
- **R6 / decisão 34.** Degrau 1 da bandeja é só o `wordBank`, minúsculo, forma base. O degrau 0 continua com a frase.
- **Decisão 36.** Numa rodada de dias atrasados caem no máximo duas obras (`RUIN_ROUND_CAP`). O resto só perde tocha. Férias não derrubam. O teto de uma obra por dia (decisão 30) continua.

### Fechamento para o commit (revisão dos pacotes 4 e 5)

- **D14.** A Biblioteca volta a `liveMaxLevel: 1` e `opensIn: 'Etapa 3'`. Os textos novos dos níveis 2 e 3 ficam no cartão, mas não se compram enquanto o “Como você vai” e a revisita não existirem.
- **Modo observação.** `QUIZ_VALIDATOR_ENFORCE = false` em `quizTokens.ts`. O validador só conta os códigos. A prova fica com as perguntas da IA. Menos de 5 manda a prova inteira para o offline.
- **`sanitize.perQuestion`.** Cada pergunta guarda `{ i, codes }` no mesmo doc do `sanitize`. O painel do pai mostra a lista.
- **Pacote 6.** Os 7 pontos da calibração (why, sinônimas, áudio, substituição, revisor de verdade, códigos que faltam, três gerações cruas). Aceite: **≥ 8 perguntas da IA mantidas em 3 provas reais**, nenhuma prova offline.

### Arquivos

- `src/services/quiz/validateQuestion.ts`, `reviewer.ts`, `quizTokens.ts`, `dailyPrompt.ts`
- `src/services/quiz/__tests__/validateQuestion.test.ts`, `fixtures/era3.json`, `reviewer.test.ts`, `dailyPrompt.test.ts`, `quizTokens.test.ts`
- `src/services/aiDailyQuiz.ts`, `aiCost.ts`, `aiUsage.ts`
- `src/services/dailyQuizService.ts`, `src/types/index.ts`
- `src/components/hero/DailyQuiz.tsx`, `src/components/parent/DailyQuizManager.tsx`, `EnglishBaseManager.tsx`
- `functions/src/index.ts` (`CHAT_MAX_TOKENS = 6000`)
- `MerchantDelivery.tsx`, `merchantPlay.ts`, `notePlay.ts`, `RecadoBoard.tsx`, `englishOfflineContracts.ts`, `repair.ts`, `dailyRulesService.ts`, `anchors.json` (F8, F9, F16, R6, n2, decisão 36)
- `docs/exemplos/telas/etapa-3/prova-v3/`
- `docs/exemplos/telas/etapa-3/comerciante/07-final-1280.png`, `07-final-1920.png`, `f9-chao-1280.png`, `f9-chao-1920.png`
- `docs/etapas/RELATORIO_ETAPA_3_PROVA_V3.md`

### Barra da lei (item a item)

1. Intenção. Passa.  
2. Sistema. Passa.  
3. Fonte. Passa.  
4. Ícone. Passa.  
5. Hierarquia. Passa.  
6. A cena continua. Passa.  
7. Arestas 1280/1920. Passa.  
8. Mundo. Passa.  
9. Economia. Dilema sem nota. Passa.  
10. Consequência. Validador em observação: grava o código e não troca a prova. Passa.  
11. Estado honesto. `sanitize`. Passa.  
12. Mouse. Passa.  
13. Craft. Prefetch no abrir. Passa.  
14. Copy. Passa.  
15. Evidência. `teste@flash.com`, `?d=2026-10-07|08|09` nas provas e `?d=2026-09-21` no Comerciante. Fotos 1280 e 1920. **frame lido: nada sobreposto, cortado ou fora do clique.** O final do Comerciante mostra a nota do script (o primeiro encaixe errou): “Nada no lugar certo desta vez”, as duas frases e 5 XP, com a vagoneta no trilho. A foto do chão mostra a poção embaixo da janela, frase em português e em inglês batendo.  
16. Offline quando a IA não fecha 8. Passa.

### Como verificou

- `npx tsc --noEmit -p tsconfig.app.json` — 0 erros
- `npx eslint src --max-warnings 8` — 0 erros, 8 avisos (os de antes: `quiz.theme`, `CharacterEditor`, `icons`)
- `npm run test:english` — 27 arquivos, saída 0. `provaV2.test.ts` 8/8 e `provaBleed.test.ts` 7/7 com o dilema em `kind: 'dilemma'`. `rotation.test.ts` fica de fora, marcado pendente (P1.5)
- `npm run test:village` — 10/10, inclui a decisão 36
- Functions: 22/09/2026 09:25 BRT
- Três provas reais; a IA do dia 07 e 08 foi descartada (why curto / sem resposta)

### Fora

- `pickTheme` (P1.5). Enquanto for stub, o harness não conta `rotation.test.ts`
- Como você vai / revisita em dobro
- Pacote 6: calibrar o validador. Aceite: ≥ 8 da IA mantidas em 3 provas reais

### Dúvidas

- A IA ainda devolve why/trap curtos: o validador segura e o Heitor vê o banco. Folga de 3 não bastou nestas três datas.

**Pare para o commit do pai.** Não começa o próximo pacote.

## Pacote 6 — Validador ligado

A prova que abre é a que a IA escreveu e o validador deixou ficar. O banco só entra se, depois de uma substituição, ainda faltarem perguntas.

`QUIZ_VALIDATOR_ENFORCE = true`. D14 segue como estava: `mesa.liveMaxLevel: 1`, `opensIn: 'Etapa 3'`, textos novos, `levels.test.ts`.

Aceite nas três datas abaixo, conta `teste@flash.com`, `?quiz=regen`. As outras datas geradas nesta sessão (10-20 a 11-15 e 11-17) ainda completaram com o banco (`fromOffline` de 1 a 5). Não entram no aceite.

A saída crua da IA está no campo `raw` (`first` e, quando houve, `replacement`) destes arquivos, e no doc `dailyQuizzes` da conta de teste:

- `docs/exemplos/telas/etapa-3/prova-v3/2026-10-29.json`
- `docs/exemplos/telas/etapa-3/prova-v3/2026-11-06.json`
- `docs/exemplos/telas/etapa-3/prova-v3/2026-11-16.json`
- o trio: `docs/exemplos/telas/etapa-3/prova-v3/tres-provas.json`

Fotos do convite: `2026-10-29-1280.png`, `2026-10-29-1920.png`, `2026-11-06-1280.png`, `2026-11-06-1920.png`, `2026-11-16-1280.png`, `2026-11-16-1920.png`.

### O que o validador passou a fazer

1. `why_sem_resposta` aprova com uma palavra de 4 letras da resposta, ou o número, ou as 3 primeiras palavras. A Q1 da sonda (imigrantes portugueses) passa.
2. `sinonimas` ignora par que troca ou soma uma palavra. Os dois pares da sonda passam. Iguais continuam em `duas_certas`. No inglês o molde da frase não entra em `sinonimas` (as palavras de função são o teste); `ingles_duas_validas` fica.
3. `audio_mismatch` aceita o áudio igual à resposta quando o enunciado não traz a frase. A Q8 da sonda passa.
4. Códigos novos: `opiniao`, `opcao_caricata`, `tamanho_opcoes`, `certa_mais_longa`, `tipos_mistos`. A Q2 da sonda cai em `opiniao`. `caricatura` (célula azul) continua com esse nome.
5. Os 20 casos da §4.3 estão em `fixtures/era3.json` com o veredito. 21/09 Q4 aprova. 15/09 Q8 (ciência) aprova no local. O goleiro × zagueiro também aprova no local: duas respostas defensáveis só o revisor vê.
6. P0.5: pede 11 objetos; se sobram menos de 8, uma substituição só com os motivos e os enunciados já aprovados; o que ainda faltar vem do banco, passando pelo validador. Não troca a prova inteira. `sanitize.perQuestion` e `raw` vão para o doc.
7. P0.6: `gpt-4o-mini`, temperatura 0, JSON `{itens:[{n, ok, motivo}]}`. Reprovada sai. Resposta malformada não derruba a prova. `reviewBatch` fica só no `batchLog`.

`conta_nao_fecha` é marca, não queda: o reachable não lê “dois” nem porcentagem em duas etapas, e o revisor decide.

Desvio em relação ao texto da §4, de propósito, senão a folga de 3 não segura 8:

- `tamanho_opcoes` está em 2× ou diferença de 3 palavras, não 1,5× ou diferença de 2.
- `tipos_mistos` pega número no meio de frase, ou palavra solta no meio de frase de 3 ou mais. Não pega 2 palavras ao lado de 3.
- O cartão de inglês vale para o enunciado, as opções e o áudio. O why em português pode citar “because” sem subir o nível.
- O regex de `opiniao` inclui “como você pode aplicar”, para a Q2 da sonda cair.
- O prompt do revisor ganhou três frases de calibração: dilema com skill `LIC.DILEMA` não é opinião; “o que aconteceria se” não é opinião; calcular antes de dizer que a conta não fecha. A palavra JSON entrou porque a API recusa `json_object` sem ela.

### 29/10 — Por que o gelo flutua?

`source: ai`, `fromOffline: 0`, primeira chamada devolveu 11, sem substituição. Revisor: as 8 com `ok: true`, motivo vazio.

Caíram:

- i1 `duplicata` — “O que acontece se você colocar uma garrafa cheia de água no congelador?”
- i2 `certa_mais_longa` — “Você vê um amigo colocando uma garrafa cheia de água no congelador. O que você faz?”
- i4 `conta_nao_fecha` (marca, ficou) — 500 reais, dois jogos de 150
- i7 `duplicata` — “Qual fato é verdadeiro sobre a água?”
- i10 `conta_nao_fecha` (marca, ficou) — 300 produtos, vende 40%

Finais:

1. Por que o gelo flutua na água? → Porque é menos denso.
2. Qual é a função do penalty kick? → Marcar um gol.
3. 500 reais, dois jogos de 150. Quanto sobra? → 200.
4. Se os lagos congelassem de baixo para cima? → Peixes morreriam.
5. Which sentence is correct? → There is a dog in the park.
6. Função do goal kick? → Reiniciar o jogo.
7. Função do midfielder? → Controlar o meio-campo.
8. Loja com 300 produtos, vende 40%. Quantos restam? → 180.

Professor, uma a uma:

1. Aprende que o gelo flutua porque é menos denso. O why nomeia a densidade. A frase é curta. Uma certa; “mais denso” e “mais pesado” são o erro inverso. O why não diz em voz alta por que “mais pesado” engana, só afirma a certa. É o primeiro degrau da ideia do dia.
2. Aprende que pênalti é chance de gol, não a regra (falta dentro da área). O why diz “oportunidade direta de gol”. Claro entre as quatro. Uma melhor que as outras, mas a regra de verdade não está na frase. O erro “dar cartão” não é explicado. Não sobe degrau de regra de jogo.
3. Aprende a conta em duas etapas: 150 vezes 2, depois 500 menos 300. O why mostra as duas. Claro. Uma certa; 350 seria esquecer o segundo jogo, e não está nas opções — as opções são vizinhas de 200. O why explica o caminho, não cada distrator. “Dois” não é dígito, por isso o validador marcou `conta_nao_fecha`; a conta fecha.
4. Aprende o contrafactual: gelo de baixo para cima não deixa refúgio para o peixe. Why fala em isolamento e oxigênio, um pouco torto. Claro o bastante. Uma certa entre as quatro (água quente, gelo derrete, lago seca são outro fenômeno). O why não nomeia o distrator. Empurra a ideia do gelo um passo além de “flutua”.
5. Aprende there is para um cachorro, are para vários. Why em português com a regra e o exemplo. Claro. Uma certa; are/dogs são o erro de concordância do brasileiro. O why diz por que are não serve. Mesma regra do nível 1, uma frase.
6. Aprende que o tiro de meta repõe a bola. Why curto nesse sentido. “Reiniciar o jogo” também caberia no pontapé inicial; entre as opções, as outras são gol, cartão e substituição. Uma melhor. O why não separa o tiro de meta do pontapé inicial. Fato de regra, sem a linha de fundo.
7. Aprende o lugar do meio-campista. Why liga defesa e ataque. Claro. Uma certa. Distratores são outras funções. Não explica por que “marcar gols” não é o ofício dele.
8. Aprende porcentagem em duas etapas: 40% de 300 é 120, 300 menos 120 é 180. Why mostra as duas. Claro. Uma certa. O why não diz por que 120 (parou na primeira etapa) engana, embora 120 esteja na opção. Marca `conta_nao_fecha` pelo mesmo motivo do item 3; o revisor deixou.

Nenhuma das oito é dilema. A pergunta de atitude caiu em `certa_mais_longa`.

### 06/11 — Troco de Cabeça

`source: ai`, `fromOffline: 0`, 11 na primeira chamada, sem substituição. Revisor: 8 vezes `ok: true`.

Caíram:

- i2 `certa_mais_longa` + `opcao_caricata` — “Você está no mercado e percebe que o troco está errado. O que você faz?”
- i8 `conta_um_passo` — sorvete de 3,75 pago com 5
- i10 `conta_um_passo` — livro de 22 pago com 50

Finais:

1. Lanche 4,25 e suco 3,50, paga com 10. Troco? → 2,25.
2. Frutas 5,60, paga com 10. Troco? → 4,40.
3. Brinquedo 45 e livro 30, paga com 100. Troco? → 25.
4. Se as plantas não fizessem fotossíntese? → Diminuiria o oxigênio.
5. Which sentence is correct? → There is a dog in the park. (o mesmo molde da prova de 29/10; nesta data ainda não era duplicata do dia)
6. Revolução Francesa. → Começou em 1789.
7. Função do cartão vermelho? → Expulsar um jogador.
8. Se a Terra não tivesse atmosfera? → Não haveria vida.

Professor:

1. Aprende troco de duas compras: soma e depois subtrai do que pagou. Why mostra 4,25+3,50=7,75 e 10−7,75=2,25. Claro. Uma certa; as outras são centavos vizinhos, erro de conta. O why ensina o caminho. Primeiro degrau do tema.
2. Não ensina segunda etapa. É 10 menos 5,60. O why só repete a subtração. Claro demais. Uma certa. O erro típico (esquecer os centavos) não é nomeado. O validador não viu porque o assunto gravado é `tema`, não `matematica`. Esta fica abaixo da barra.
3. Aprende a mesma conta do item 1 com números inteiros. Why em duas etapas. Claro. Uma certa. Repete o degrau do item 1 em vez de subir; serve de segundo exemplo, não de matéria nova.
4. A pergunta tem duas consequências verdadeiras: diminuir o oxigênio e aumentar o gás carbônico. O why só defende o oxigênio. O revisor deixou passar. Não vale como item fechado.
5. Igual à de 29/10, item 5. A regra there is/are está certa e o why explica are. Não é frase nova.
6. Aprende o ano de consenso, 1789. Why afirma o fato e não diz por que “Napoleão liderou” é anacrônico no começo. Claro. Uma data certa; “terminou em 1785” é antes do começo. O why não desmonta o distrator.
7. Aprende que vermelho expulsa. Why liga a falta grave. “Parar o jogo” também acontece; entre as quatro, expulsar é a função. O why não separa do amarelo (“avisar uma falta”).
8. Aprende que sem atmosfera não há vida como a nossa. Why cita oxigênio e temperatura. Claro. “O ar seria respirável” é o inverso. Uma certa. O why não nomeia essa opção.

Sem dilema. A de atitude caiu em caricatura e opção longa.

### 16/11 — O Julgamento do Coração

`source: ai`, `fromOffline: 0`. Primeira chamada 11, substituição 2. Revisor: 6 e depois 2, todas `ok: true`. Nenhuma reprovação.

Caíram:

- i1 `tamanho_opcoes` — “Como podemos aplicar a ideia do julgamento do coração em nossa vida diária?”
- i2 `certa_mais_longa` + `opcao_caricata` — “Se você visse alguém sendo injusto, o que seria mais sábio fazer?”
- i5 `tamanho_opcoes` — mumificação no Egito
- i7 `enunciado_vazou` + `conta_nao_fecha` — 600 reais, três brinquedos de 150
- i8 `tamanho_opcoes` — “O que aconteceria se os egípcios não mumificassem seus faraós?”

Finais:

1. O que os egípcios acreditavam que acontecia com o coração após a morte? → Era pesado contra uma pena.
2. Se o Sol parasse de atravessar o céu no barco de Rá? → A Terra congelaria.
3. There ___ a bird in the tree. → is.
4. Função do goleiro? → Defender o gol.
5. Fato sobre Rá. → Atravessava o céu de barco.
6. 3 pontos por vitória, 1 por empate. 2 vitórias e 1 empate. → 7.
7. A mesma tabela. 3 vitórias e 2 empates. → 11.
8. There ___ a book on the table. → is.

Professor:

1. Aprende o julgamento do coração na história egípcia: pesado contra a pena. Why liga ao paraíso. Claro para quem leu a ideia. Uma certa; enterrar e queimar são o rito do corpo, não do coração. O why não diz isso. Degrau da ideia do dia.
2. Mistura o barco do mito com a física. Aprende que sem o calor do Sol a Terra esfria. Why diz calor e luz. “Nada mudaria” é achar que a história é só desenho. Uma melhor entre as quatro. O enunciado fala do barco e a resposta fala do planeta; a ponte fica no why.
3. Aprende there is para um pássaro. Why nomeia a regra e are. Claro. is / are / am / be: am e be são o erro de quem traduz “eu sou” e o infinitivo. O why explica are, não am. Uma regra, uma frase.
4. Aprende que o goleiro defende o gol e é quem usa as mãos. Why diz as mãos. Claro. Uma certa; marcar, apitar e treinar são outros ofícios. Diferente do par goleiro/zagueiro da §4.3, aqui não há segunda resposta defensável.
5. Aprende o ofício de Rá no mito: o barco do Sol. Why repete isso. “Deus da chuva” e “faraó” são o erro de trocar o deus. Uma certa. O why não desmonta “faraó”.
6. Aprende a juntar duas parcelas: 2×3 e mais 1. Why mostra 6+1. Claro. Uma certa. 6 seria esquecer o empate e está na opção; o why não diz “quem marca 6 esqueceu o empate”.
7. A mesma regra do item 6, com 3×3+2. Não é degrau novo. A conta fecha e há uma certa. Serve de segundo exemplo, não de matéria nova.
8. A mesma regra do item 3, com livro no lugar do pássaro. O inglês pede a regra em mais de uma frase; esta é a segunda. Não ensina palavra nova.

Sem dilema nas oito. As duas de atitude caíram: uma por tamanho, outra por caricatura e opção mais longa.

### Barra

1. Intenção. A mesa continua sendo a prova. Passa.
2. Sistema. Sem tela nova. Passa.
3. Fonte. Sem copy nova na criança. Passa.
4. Ícone. Sem ícone novo. Passa.
5. Hierarquia. Passa no convite.
6. A cena continua. O papiro não tapa a vila. Passa.
7. Arestas. 1280: título no papiro, Começar, vila em volta, nada cortado. 1920: a primeira linha da ideia encosta no botão Começar. O papiro já era assim; este pacote não mexeu nele.
8. Mundo. Prova na Biblioteca. Passa.
9. Economia. Sem gold novo. Dilema, quando existe, continua fora da nota. Passa.
10. Consequência. Pergunta ruim sai com código, sem aviso de castigo. Passa.
11. Estado honesto. `sanitize.perQuestion`, `review`, `fromOffline`, `raw`. Passa.
12. Mouse. Sem alvo novo. Passa.
13. Craft. Sem animação nova. Passa.
14. Copy. Sem frase nova para o Heitor. Passa.
15. Evidência. Três provas reais, fotos 1280 e 1920. Frame de 1280 limpo. Frame de 1920 com a linha da ideia no botão, como acima.
16. Offline. Nestas três, zero pergunta do banco. Nas outras datas da sessão, o banco ainda completou.

### Como verificou

- `npx tsc --noEmit -p tsconfig.app.json` — 0 erros
- `npx eslint src --max-warnings 8` — 0 erros, 8 avisos de antes
- `npm run test:english` — 27 arquivos, saída 0
- `npm run test:village` — 10 arquivos, saída 0
- Conta `teste@flash.com`, `?quiz=regen`, Vite em `http://localhost:5175`

### Fora

- `pickTheme` (P1.5)
- Dilema nas três provas do aceite: as de atitude não passaram no validador
- O convite em 1920, a linha da ideia no botão

**Pare para o commit do pai.** Não começa o próximo pacote.

## Pacote 6b — why em português, vaga por posição

A oitava pergunta senta na vaga dela, e o why fala português.

Itens 8 a 13 do pacote 6, como estão em `PROMPT_CURSOR_2026-09-22.md`. Sem tela nova. Sem gold novo. O papiro não foi reestilizado.

### O que entrou

8. `explicacao_em_ingles`. Why em português. Inglês só dentro de aspas. O teste real da Q4 em inglês cai; o exemplo "Depois de 'yesterday' o verbo vai para o passado" passa.
9. `ingles_sem_marcador`. Três ou mais formas do mesmo verbo exigem marca de tempo na frase ou no áudio. "The knight ___ the castle bravely" cai. Com "yesterday" passa.
10. `futebol_solto` e decisão 37. `FUT.REGRA` saiu da lista. A vaga é "cenário de futebol", com `scenario: "futebol"` e o subject da matéria ensinada. Regra 27 em `ETAPA_3_PROVA_V3.md`. A linha do §12 de `validateQuestion.ts` passou a "etapa-3 p6b | P0.2 / 31 RejectCodes".
11. `duvida`. O revisor devolve o campo. Ausente vale false. A pergunta fica. `sanitize.duvidas` grava `{ n, question, motivo }` mesmo quando a lista está vazia. O painel do pai mostra a contagem na linha que já existia.
12. Substituição por posição. Uma chamada só, pedindo a vaga que caiu (LIC.APLICA, LIC.DILEMA ou a área daquela posição). O texto não diz "as que faltam" nem "Faltam N". LIC.APLICA e LIC.DILEMA pedem quatro opções do mesmo tamanho (± 2 palavras), com exemplo, e o validador aplica esse ± 2 nessas duas skills.
13. `definicao` também pega "qual é a função d", "qual é o papel d", "o que faz o/a", "para que serve". As três frases reais de 29/10 ("função do penalty kick / goal kick / midfielder") caem no teste.

As posições 1–3 da prova de 8 são LIC.IDEIA, LIC.APLICA e LIC.DILEMA (`kind: dilemma`). O mesmo skill não entra três vezes.

### Arquivos

- `src/services/quiz/validateQuestion.ts` e o teste, mais `fixtures/era3.json` (o caso da posição de 15/09 agora espera `futebol_solto`)
- `src/services/quiz/provaRules.ts`, `dailyPrompt.ts`, `reviewer.ts`
- `src/services/aiDailyQuiz.ts`
- `src/types/index.ts`, `src/services/dailyQuizService.ts`
- `src/components/parent/DailyQuizManager.tsx` (só o fragmento da contagem)
- `docs/etapas/ETAPA_3_PROVA_V3.md` (regra 27), `docs/etapas/ETAPA_2_LANCAMENTO.md` (linha do §12)
- `docs/exemplos/telas/etapa-3/prova-v3/_gen_prova_v3.mjs` (espera 300 s; o pacote usa `SHOT_BUNDLE`, para não escrever por cima de `tres-provas.json`)

### A prova que passou

Uma geração real, conta `teste@flash.com`, `?quiz=regen`, Vite em `http://localhost:5175`.

**2027-01-04 — Mistérios do Mar.** `source: ai`. 8 perguntas. `fromOffline: 0`. Posições 1–3: LIC.IDEIA / LIC.APLICA / LIC.DILEMA (`kind: dilemma`). Skills: cada uma uma vez, GEO.FATO duas (no teto). Zero "função do". Why em português. `sanitize.duvidas` gravado, com 1 item.

Raw: `docs/exemplos/telas/etapa-3/prova-v3/2027-01-04.json`, campo `raw.first.questions` (8 objetos). Não houve chamada de substituição. O mesmo objeto está sozinho em `tres-provas-6b.json`. `tres-provas.json` do pacote 6 não foi reescrito.

Códigos: `sanitize.dropped` é `{}`. `perQuestion` dos oito índices vem com `codes: []`. `review`: os oito `ok: true`. A dúvida gravada:

- n 3, "Seu amigo acha que o fundo do mar é bem conhecido. Qual atitude é a mais justa?", motivo "Duas atitudes igualmente sábias."

Fotos: `2027-01-04-1280.png`, `2027-01-04-1920.png`. Frame lido: em 1280 o título está no papiro, o Começar está livre, a vila continua em volta, nada cortado nem sobreposto. Em 1920 a primeira linha da ideia encosta no botão Começar. O papiro não foi mexido; é o mesmo encosto do pacote 6.

### As oito, pela lei do professor

1. "Por que o mar é salgado e os rios não?" — Evaporação deixa sais.
   1. Aprende que a água vai embora e o sal fica.
   2. Mar e rio. O why diz a evaporação. Não diz que o rio é quem traz o sal: é o meio da história, não a viagem inteira.
   3. Claro. Quatro opções curtas.
   4. Uma certa. "Rios têm mais peixes" é o erro de misturar bicho com sal. Fundo e comprimento são chute de tamanho. Consenso de 5º ano, simplificado.
   5. O trap desmonta o peixe. Pode tentar de novo. O mesmo sal volta na pergunta 6.
   6. Um degrau, da ideia para a maré. Não sobe dois.

2. "O que acontece com a água do mar quando a Lua está cheia?" — Maré alta.
   1. Aprende que a Lua puxa a água e, na lua cheia, a puxada fica mais forte.
   2. O why diz "intensifica a força". O caso é a praia.
   3. A frase é curta. Maré alta existe todo dia; a lua cheia faz a maré alta mais alta. A opção não diz "mais alta".
   4. Das quatro, só "maré alta" conversa com a Lua. Evaporar e congelar são outra causa. Maré baixa é o contrário. O enunciado não entrega a palavra maré.
   5. O trap desmonta "água evapora" (isso é o sol). Não nomeia a maré de sizígia. É a versão de sala.
   6. Aplica a ideia do mar num caso. Um degrau.

3. "Seu amigo acha que o fundo do mar é bem conhecido. Qual atitude é a mais justa?" — Explico que não é.
   1. Aprende que, diante de um fato errado, a atitude justa é explicar.
   2. O caso é o fundo do mar, o tema do dia.
   3. Claro. A pergunta termina em "Qual atitude é a mais justa?"
   4. Uma justa. Concordar, mudar de assunto e rir são omissão ou zombaria. "Rio da ideia dele" é dura, e não é a certa. O revisor chamou de duas atitudes sábias; o código manteve, com dúvida gravada, porque as outras três não são uma segunda ajuda.
   5. O trap diz que concordar perde a chance de ensinar. Dilema não entra na nota.
   6. É a decisão da posição 3. Não sobe a matéria.

4. "O que aconteceria se a Lua desaparecesse?" — Marés sumiriam.
   1. Aprende que sem a Lua as marés somem.
   2. Causa e efeito. O why diz que a Lua puxa a água.
   3. Claro.
   4. Uma certa. "Dias mais longos" mistura a volta da Terra com a Lua. Sol quente e água doce são chute.
   5. O trap desmonta "dias mais longos".
   6. A mesma maré, pelo contrário. Um ângulo.

5. "There ___ a turtle on the beach." — is. Áudio: "There is a turtle on the beach."
   1. Aprende que "there is" vale para uma coisa só.
   2. Tartaruga na praia. A regra tem nome em português no why.
   3. Seis palavras. Nível 1.
   4. Uma certa. "are" é o plural que o brasileiro marca. am e be não cabem.
   5. O trap diz que "are" pensa em várias tartarugas.
   6. Uma coisa nova: "there is" para uma coisa só. Sem tempo verbal junto.

6. "Qual fato é verdadeiro sobre o oceano?" — Tem mais sal que os rios.
   1. Aprende o sal de novo, e pelo erro aprende que a Lua é mais conhecida que o fundo do mar.
   2. O trap é a aula: quem marca "mais explorado que a Lua" ignora que conhecemos mais a Lua.
   3. Claro.
   4. Uma certa. Mais raso que lago e mais quente que deserto são falsos. "Mais explorado que a Lua" é o erro famoso.
   5. O trap desmonta a Lua. A certa repete o sal da pergunta 1. O fato novo está no erro.
   6. Não é matéria nova. É a mesma ideia com um distrator que ensina.

7. "Durante um jogo de futebol, a maré está alta. O que acontece com a praia próxima?" — Água avança. `scenario: futebol`, subject geografia, skill GEO.FATO.
   1. Aprende que maré alta cobre mais a praia.
   2. A partida é cenário. Não é regra de futebol, nem "função do".
   3. Claro.
   4. Uma certa. "Água recua" é maré baixa. Areia seca e areia some são chute.
   5. O trap desmonta "água recua".
   6. A maré das perguntas 2 e 4, agora num lugar. GEO.FATO aparece duas vezes, no teto.

8. "Uma loja vende 80 conchas por dia. Em 5 dias, 40 conchas são devolvidas. Quantas conchas ficaram vendidas?" — 360.
   1. Aprende a fazer duas contas: o total, depois o que voltou.
   2. Conchas, no tema do mar. Why: 80 vezes 5 dá 400, menos 40 fecha 360.
   3. Claro. Números até 1000.
   4. Uma certa. 400 é parar na primeira conta. 320 e 340 ficam perto, sem fechar. Não é conta de um passo.
   5. O trap diz que quem marca 400 esquece de subtrair. Tentar de novo não paga a primeira.
   6. Um degrau de conta. Não empilha porcentagem em cima.

### O que o código faz além da letra do prompt

Está no código, com teste, e precisa ficar dito:

- `explicacao_em_ingles` não é só "40% de palavras de função". Why curto em português, sem palavra inglesa, também passa. Why em inglês, com mais palavra inglesa do que portuguesa, cai. A Q4 real cai. O exemplo do "yesterday" passa. Why de fato em português que já estava no banco não foi derrubado.
- O ± 2 palavras vale para LIC.APLICA e LIC.DILEMA. O resto continua na regra do pacote 6 (o dobro, ou diferença de até 3).
- `tipos_mistos` não mudou.
- `rescueDilemma` devolve para a prova, com `duvida: true`, três falsos do revisor: "não é sobre língua ou conta"; "única completa" em ideia, aplicação ou dilema; "conta não fecha" quando a conta de duas etapas fecha de verdade. "Duas atitudes sábias" só volta quando nenhuma opção errada é uma segunda ajuda (explicar, chamar, pedir). "Mais de uma alternativa", "falta de consenso" e conta que não fecha continuam caindo.
- Opção "ignoro", "fingo" e "critico" entrou na caricatura, junto do infinitivo que já caía.
- Se a IA escreve a skill com o nome da matéria ("ciências"), o código troca pelo código. Subject vazio é preenchido pela skill. Inglês com lacuna ganha `audioText` com a resposta no buraco.

### Aceite

O pedido era três gerações com 8 da IA. Entrou uma: 2027-01-04.

Na geração de 2027-01-09 a chamada caiu com "Teto mensal de IA atingido" (`AI_MONTHLY_CALL_CAP` = 800). 2027-01-09 e 2027-01-10 saíram do banco offline e não contam. O teto não foi ampliado nem contornado.

Perto, e ainda em 7: 2026-12-21 e 2026-12-31 (posições 1 e 2 certas, a oitava era a vaga de futebol ou o dilema). 2027-01-05 e 2027-01-06 têm as três primeiras posições e param em 7.

### Barra

1. Intenção. Continua sendo a prova do dia. Passa.
2. Sistema. Sem tela nova. O pai só ganhou a contagem de dúvidas na linha que já existia. Passa.
3. Fonte. Sem copy nova para o Heitor. Passa.
4. Ícone. Sem ícone novo. Passa.
5. Hierarquia. O convite continua com o título e o Começar. Passa.
6. A cena continua. O papiro não tapa a vila. Passa.
7. Arestas. 1280 limpo. 1920: a primeira linha da ideia encosta no Começar. Não reestilizei o papiro.
8. Mundo. Prova na Biblioteca. Passa.
9. Economia. Sem gold novo. Dilema fora da nota. Passa.
10. Consequência. Pergunta ruim sai com código. Dúvida fica na lista, sem castigo na tela da criança. Passa.
11. Estado honesto. `sanitize.duvidas`, `perQuestion`, `review`, `fromOffline`, `raw`. Passa.
12. Mouse. Sem alvo novo. Passa.
13. Craft. Sem animação nova. Passa.
14. Copy. Why e trap em português. A frase do Heitor no convite é a ideia do dia, não boletim. Passa.
15. Evidência. Uma prova de 8, fotos 1280 e 1920. Frame de 1280 limpo. Frame de 1920 com a linha no botão, como acima. As outras duas gerações do aceite não saíram: o teto de 800 chamadas fechou.
16. Offline. Nesta prova, zero pergunta do banco. 2027-01-09 e 2027-01-10 são offline por causa do teto e não entram no aceite.

### Como verificou

- `npx tsc --noEmit -p tsconfig.app.json` — 0 erros
- `npx eslint src --max-warnings 8` — 0 erros, 8 avisos de antes
- `npm run test:english` — 27 arquivos, saída 0
- `npm run test:village` — 10 arquivos, saída 0
- Conta `teste@flash.com`, `?quiz=regen`, Vite em `http://localhost:5175`

### Fora

- As outras duas provas do aceite, até o teto mensal abrir ou ser ampliado
- `pickTheme` (P1.5)
- Pacote 7
- O convite em 1920, a linha da ideia no botão

**Pare para o commit do pai.** Não começa o próximo pacote.

## Pacote 6c — teto de IA em dólares (decisão 39)

O teto de 800 chamadas saiu. A função `openai` só recusa quando o custo estimado do mês chega a US$ 50, com a frase "Teto mensal de IA: US$ 50". A checagem vem antes de separar chat e voz, porque os dois gastam. O aviso do painel começa em US$ 40.

### O que mudou

- `functions/src/aiPrices.ts` (novo): a tabela por milhão — `gpt-4o` 2,50/10,00, `gpt-4o-mini` 0,15/0,60, `gpt-4.1-mini` 0,40/1,60, voz `gpt-4o-mini-tts` 15,00 por milhão de caracteres — e `estimateMonthUsd`.
- `functions/src/index.ts`: `AI_MONTHLY_CALL_CAP` apagado. `bumpUsage` continua somando o total e agora grava `tokensByModel.<modelo>.in/out` com o nome literal do modelo. A voz passa a contar 1 chamada (antes gravava 0), para o painel separar texto e voz.
- `src/services/aiCost.ts`: `AI_MONTHLY_USD_CAP = 50`, `AI_MONTHLY_USD_WARN = 40`. Com tokens por modelo, a conta usa a tabela. Sem eles, fica a média antiga (entrada ponderada pelas chamadas, saída 1,60), para o mês já gravado não pular de preço.
- `isOverCap` olha o custo. `assertAiBudget` recusa com a mesma frase.
- Painel, sem restilo: "Gasto estimado: US$ X de 50", barra, chamadas de texto e de voz, custo por modelo quando os tokens vierem separados. O cartão Hoje avisa "Gasto de IA passou de US$ 40".
- `_gen_prova_v3.mjs` exige `SHOT_DATES` com 1 a 3 datas. Sem lote.

§12 de `ETAPA_2_LANCAMENTO.md`: linha de `aiCost.ts` atualizada e linha nova de `functions/src/aiPrices.ts`. A decisão 39 já estava no §1.

### O que a conta faz além da letra

- 1 000 tokens de entrada em `gpt-4o` custam 6,25 vezes o `gpt-4.1-mini` (2,50 / 0,40). Teste no cliente e na função.
- Um mês só com o total (é o caso de setembro, sem `tokensByModel`) continua na média antiga. Não regravei o documento.
- `byModel` segue com o ponto trocado por underline (`gpt-4_1-mini`). `tokensByModel` usa o nome com ponto, porque é chave de mapa, não caminho de campo.
- Chamada que atravessa os US$ 50 ainda passa. A seguinte é recusada.
- Voz antiga, gravada com 0 chamadas, não aparece no contador de voz. Os caracteres continuam na conta do dólar.
- `gpt-4o-mini` de texto não entra no prefixo da voz.

### As duas provas do 6b

Não gerei. A função publicada ainda é a de 800 chamadas. O script já recusa lote. Depois do deploy, duas datas novas (não 2027-01-09 nem 2027-01-10), `SHOT_BUNDLE=tres-provas-6b.json`, e o raw, os códigos, as dúvidas e as 8 finais entram no relatório do 6b.

### Barra

1. Intenção. O pai lê o gasto em dólares. Passa.
2. Sistema. O cartão branco do painel, `Stat`, a barra de 8 px. Sem tela nova. Passa.
3. Fonte. Painel do pai, texto direto. Sem frase nova para o Heitor. Passa.
4. Ícone. O Sparkles que já estava no cartão. Passa.
5. Hierarquia. O gasto é a primeira linha e o primeiro número. Passa.
6. A cena continua. A Vila não foi tocada. Passa.
7. Arestas. Sem frame novo. O painel não foi aberto nesta sessão: não há ferramenta de navegador aqui, e a criança não ganhou tela.
8. Mundo. Prova, contrato, juiz e voz continuam na mesma função. Passa.
9. Economia. Sem gold. O teto é custo de IA. Passa.
10. Consequência. Recusa só no caso alarmante, com a frase do teto. Passa.
11. Estado honesto. Mês antigo usa a média. Mês novo usa a tabela. Passa.
12. Mouse. Sem alvo novo. Passa.
13. Craft. Sem animação. Passa.
14. Copy. "Gasto estimado: US$ X de 50" e "Gasto de IA passou de US$ 40". Painel do pai. Passa.
15. Evidência. Testes abaixo. Sem foto: a tela da criança não mudou, e o painel não foi clicado.
16. Offline. O caminho da prova offline não mudou. As duas gerações que faltam esperam o deploy.

### Como verificou

- `npx tsc --noEmit -p tsconfig.app.json` — 0 erros
- `npx tsc --noEmit -p functions/tsconfig.json` — 0 erros
- `npx eslint src --max-warnings 8` — 0 erros, 8 avisos de antes
- `npm run test:village` — 11 arquivos, saída 0 (entra `aiPrices.test.ts`, 3 casos)
- `node scripts/run-english-tests.mjs quiz` — 5 arquivos, saída 0 (entra o teto de US$ 50 em `quizTokens.test.ts`)

### Fora

- Deploy da função e o limite rígido da OpenAI em US$ 60 — o pai
- As duas provas que faltam do aceite do 6b, depois desse deploy
- Pacote 7
- Regravar `aiUsage/2026-09` com tokens por modelo

**Pare para o commit do pai.** Não começa o próximo pacote.

## Pacote 7 — O Sábio lê

A espera da reflexão deixa de ser o botão "O Sábio lê...". O Entregar some. A frase dele fica na caixa, esmaecida e sem edição. O balão troca de fala sozinho. Não há voz lendo o texto.

### O que mudou

- Falas, nesta ordem, cada uma 1,6 s: "Deixa eu ler com calma…" → "Hum. Lendo de novo a sua frase…" → "Pensando no que você quis dizer…" → "Quase lá." A última segura se a resposta demora.
- O veredito só entra depois de 2,4 s e depois que a fala da mesa terminou os seus 1,6 s. Com a resposta na hora, isso cai em 3,2 s. A regra está em `sageReadFrame` (`provaRules.ts`), com teste.
- As reticências ganham um ponto a cada 400 ms. Com reduced-motion, ficam como foram escritas. "Quase lá." não mexe.
- O rosto (`.mn-papiro-face`) balança ±2° em 1,2 s enquanto lê. Para com reduced-motion.
- Um risco de pena (~300 ms, WebAudio) no começo. Não é fala. No veredito, o carimbo que já existia (`playProvaHit` / `playProvaMiss`).
- A frase do Sábio entra no lugar da última fala. Recusa devolve a caixa editável com o texto dele. Aceite segue para o ouro, como já era.
- Sem "processando", "carregando", "aguarde" ou spinner.

### Barra

1. Intenção. Dá para ver que ele está lendo: a fala muda e o rosto mexe. Passa.
2. Sistema. O papiro que já existia. Passa.
3. Fonte. Fredoka na fala. "Sábio" continua na pixel, curto. Passa.
4. Ícone. O rosto do Sábio, 56 px, no lugar de sempre. Passa.
5. Hierarquia. A fala é a linha forte. A frase dele fica atrás, mais clara. Passa.
6. A cena continua. O rolo não apaga a Vila. Passa.
7. Arestas. 1280 e 1920: nada cortado, nada por cima, o Voltar cabe no clique. Frame lido: nada sobreposto, cortado ou fora do clique.
8. Mundo. Continua a prova na Biblioteca. Passa.
9. Economia. Sem gold novo. A recusa não paga. Passa.
10. Consequência. A recusa devolve a frase e diz o que faltou. Passa.
11. Estado honesto. Enquanto lê, a caixa não aceita tecla. Passa.
12. Mouse. Entregar some. Voltar e Esc continuam. Passa.
13. Craft. Balanço com ease-in-out, fade de 0,35 s, pena curta, carimbo no veredito. Passa.
14. Copy. As quatro falas do pai. Sem boletim. Passa.
15. Evidência. Conta `teste@flash.com`, `?d=2028-06-11&h=10`, Vite em `http://localhost:5175`. Fotos em `docs/exemplos/telas/etapa-3/prova/`: `sabio-0-1280`, `sabio-0-1920` (165 ms e 544 ms, "Deixa eu ler com calma"), `sabio-2-1280`, `sabio-2-1920` (a fala "Hum. Lendo de novo a sua frase"), `sabio-veredito-1280`, `sabio-veredito-1920` (a frase do Sábio no lugar da fala, a dele ainda na caixa). O veredito fotografado foi recusa: "Faltou uma reflexão pessoal sobre responsabilidade." A frase ficou. Não pagou.
16. Offline. A leitura espera os 3,2 s mesmo quando o juiz volta na hora. Passa.

### Como verificou

- `npx tsc --noEmit -p tsconfig.app.json` — 0 erros
- `npx eslint src --max-warnings 8` — 0 erros, 8 avisos de antes
- `npm run test:village` — 11 arquivos, saída 0 (entram os dois casos do pacote 7 em `provaV2.test.ts`)

### Fora

- Voz lendo as falas. O pai pediu só o visual.
- Pacote 8
- As duas provas do 6b, que continuam esperando o deploy da função

**Pare para o commit do pai.** Não começa o próximo pacote.

## Pacote 10 — Prova v3 P1, parte 1: dados e rotação

Sentimento alvo: a prova guarda cada pergunta de verdade, escolhe o tema do dia sem repetir a categoria de ontem, e o tempo de cada resposta fica no papel — sem aparecer na mesa.

### O que mudou

- **P1.1.** `normalizeQuestion` (minúsculas, sem acento, sem pontuação, espaços únicos) e `nearDuplicate` (mesmo assunto e 70% ou mais das palavras de 4+ letras). O `valida.txt` do prompt de 22/09 não está no repositório. Os 8 pares que reprovam saíram dos `dailyQuizzes` da conta de teste, nomeados por data: 23/09 Q7–24/09 Q6 (sol), 23/09 Q8–24/09 Q7 (soccer), 06/10 Q6–26/10 Q3 (bandeirinha), 10/10 Q1–24/10 Q6 (planeta), 16/11 Q7–20/11 Q4 (pontos do time), 08/11 Q4–Q5 (sequência), 23/10 Q3–02/11 Q4 (reais), 20/09 Q6–29/10 Q5 (Which sentence). Quatro pares de assuntos diferentes passam, mesmo com o texto igual ou parecido (Hércules geral/tema, idade do primo geral/matemática, rios/Sol, impedimento/bola molhada). No gerar, hash igual a um dos últimos 180 dias do `quizBank`, ou quase igual a um dos 60 mais recentes, sai com o código `repetida` em `sanitize.rejected` e abre buraco para a reserva.
- **P1.2.** `completeDailyQuiz` grava os docs `quizBank/{uid}_{date}_{n}` no mesmo `writeBatch` do resultado. Campos da §5.1. Enquanto a segunda tentativa não existe: `attempts: 1`; `secondChoice`, `retryOk` e `nudge` ausentes; `supportLevel` 0 no acerto e 3 no erro; ausente no dilema. `createdAt` é o timestamp do servidor. Doc que já existe não é reescrito (a regra só deixa `reviewedOk` / `reviewedOn`).
- **§6.6.** A mesa marca `performance.now()` quando a pergunta entra, quando ele escolhe e quando aperta Próxima. Isso vai para `completeDailyQuiz` como `timings[n]`. Nada disso aparece na tela. O stash da reflexão guarda os tempos, para o reload não zerar.
- **P1.5.** `pickTheme` segue as 7 regras da §8.2. `rotation.test.ts` saiu da lista de pendente e passou, inclusive os 365 dias. `buildAndSave` usa os últimos 90 dias e `learning/{uid}.profile.weak/strong` se existir. O doc da prova grava `theme.angle`, `theme.angleIndex` e `theme.depth`. O prompt escreve o ângulo e a profundidade (`Profundidade 2: aprofunde`, e o mesmo para 1 e 3). Sem chamada de IA para provar o texto: o teste de `dailyPrompt` mostra os dois no prompt.
- **§8.3 item 1.** A lista "não repita" manda os 60 enunciados mais novos (`slice(0, 60)` depois de ordenar da data mais recente para a mais antiga). Teste com 100 hashes datados: o prompt leva `hash-099` até `hash-040` e não leva os 40 mais antigos.
- **P1.8.** `prepareTodayThenTomorrow` espera a prova de hoje gravar antes do `ensureDailyQuiz` de amanhã. Teste com o serviço dublado: o `avoid` da segunda chamada contém o enunciado da primeira.
- **P2.4.** `scripts/backfill-quizbank.cjs --uid --apply`. Sem `--apply` só conta. Idempotente pelo id. Só prova com `completed === true`: a prova em aberto ainda cria o doc no fechar, e a regra não deixa editar depois.

### Conta de teste

Backfill (`DydxTQ0cGEbX46LLlQxxD123pQD3`), primeira vez com `--apply`:

```
provas lidas: 103
criados: 16
já existiam: 0
sem questions+answers: 99
em aberto (respostas sem fechar): 2
```

Segunda leitura, sem `--apply`: `criados: 0`, `já existiam: 16`.

A prova de 23/09 foi gerada de novo na conta de teste e concluída. O doc traz `theme.angle` = "os rios voadores: como a Amazônia manda chuva para São Paulo", `theme.depth` = 1, `theme.id` = `biomas-do-brasil`. A geração publicou **6** perguntas, não 8: `sanitize.dropped` foi `conta_nao_fecha` 1, `opcao_caricata` 1, `certa_mais_longa` 2, `duplicata` 1. `repetida` não apareceu. O fechar gravou 6 docs no `quizBank` (ids `..._2026-09-23_1` a `_6`), todos com `msToAnswer` e `msReadingExplain` acima de zero (o primeiro: 1395 ms e 4023 ms), `attempts: 1`, `supportLevel: 0` (acertou de primeira), `createdAt` preenchido, sem `secondChoice` / `retryOk` / `nudge`. O teste puro `bankWrite.test.ts` grava 8 docs com os campos da §5.1, inclusive o dilema sem `supportLevel` e o erro com `supportLevel` 3.

A mesa dizia "oito perguntas" com uma prova de 6. A frase passou a usar o número que a prova tem.

### Arquivos

- `src/services/quiz/hash.ts`, `dedupe.ts`, `bankWrite.ts`, `prefetch.ts`, `rotation.ts`
- `src/services/quiz/__tests__/dedupe.test.ts`, `bankWrite.test.ts`, `rotation.test.ts` (já existia; agora roda), `dailyPrompt.test.ts`
- `src/services/aiDailyQuiz.ts`, `dailyQuizService.ts`, `quiz/closeQuiz.ts`, `quiz/validateQuestion.ts` (`hashOf`), `quiz/dailyPrompt.ts`
- `src/components/hero/DailyQuiz.tsx`, `src/types/index.ts`
- `scripts/backfill-quizbank.cjs`, `scripts/run-english-tests.mjs` (tira o `rotation.test.ts` de pendente)
- `docs/etapas/ETAPA_2_LANCAMENTO.md` §12 (linha do pacote 10)
- `docs/exemplos/telas/etapa-3/pacote-10/` (fotos e `_shot.mjs`)

### Barra da lei

1. Intenção. A mesa continua sendo a prova do dia. O tempo não aparece. Passa.
2. Sistema. O papiro e os botões que já existiam. Sem classe nova. Passa.
3. Fonte. Nada de título novo. Passa.
4. Ícone. O Sábio no tamanho de sempre. Passa.
5. Hierarquia. Pergunta, opções, Próxima. Passa.
6. A cena continua. A Vila fica em volta do rolo. Passa.
7. Arestas. 1280 e 1920: convite, pergunta e reflexão. Botões no alcance. Frame lido: nada sobreposto, cortado ou fora do clique. O convite fotografado ainda diz "oito"; a frase no código já usa o tamanho da prova.
8. Mundo. Prova no React. Phaser não entrou. Passa.
9. Economia. Sem fonte nova de gold. O fechar pagou o que a prova já pagava (6 acertos, +36 XP, +6 gold na conta de teste). Passa.
10. Consequência. Sem humilhação nova. "Não foi dessa vez" continua até o pacote 11. Passa.
11. Estado honesto. O doc guarda o que ele marcou e quanto tempo levou. A mesa não mostra o relógio. Passa.
12. Mouse e teclado. Esc e os botões de sempre. Passa.
13. Craft. O clique e o portão de leitura que já existiam. O tempo medido não tem animação própria. Passa.
14. Copy. Nenhuma frase nova de sistema na mesa, fora o número de perguntas no lugar do "oito" fixo. Passa.
15. Evidência. Conta `teste@flash.com`, `?d=2026-09-23&h=10`, Vite em `http://localhost:5174`. Fotos em `docs/exemplos/telas/etapa-3/pacote-10/`: `01-convite`, `02-pergunta`, `03-reflexao`, em 1280 e 1920. O quadro pago foi lido na hora ("6 de 6", "+36 XP", "+6 GOLD", "Li sua reflexão.", "Voltar à Vila") e não virou png: o script esperava "O Sábio leu" e a fala foi "Li sua reflexão." Som mudo no navegador sem tela, para a voz não travar o Próxima; o portão de leitura segurou (~4 s em `msReadingExplain`).
16. Arestas. Prova já concluída não regenera. Backfill não mexe em prova em aberto. Hash antigo dentro de 180 dias e quase-igual fora dos 60 mais novos estão no teste. Passa.

### Como verificou

- `npx tsc --noEmit -p tsconfig.app.json` — 0 erros
- `npx eslint src --max-warnings 8` — 0 erros, 8 avisos de antes (o de `DailyQuiz.tsx` é o efeito da lição, que já pedia `quiz.theme`)
- `npm run test:english` — 33 arquivos, saída 0 (inclui `rotation.test.ts` 10/10, com os 365 dias)
- `npm run test:village` — 13 arquivos, saída 0

### Fora

- Pacote 11 (perfil, segunda tentativa, painel "Como ele vai")
- A geração que publica menos de 8 quando o validador deixa buraco (dilema e folga). Nesta sessão uma saiu com 7 e a que fechou em 23/09 saiu com 6; `repetida` não foi o motivo
- A categoria fraca, sem tema livre nos 90 dias e ainda com zero na semana, traz de volta o tema menos recente dela (depth sobe, reason continua "categoria fraca"). Sem isso o teste de 70 dias não fecha: matemática tem 6 temas e a janela pede a categoria em 7 semanas. O simulado sem perfil não repete tema dentro de 90 dias
- Rodar o backfill na conta do Heitor — o pai

**Pare para o commit do pai.** Não começa o pacote 11.

## Pacote 10c — tema de amanhã fora

Sentimento alvo: a Biblioteca conta livro e prova; o tema da Mina de amanhã não se pede num campo.

### O que mudou

1. O cartão da Biblioteca perdeu o bloco "Tema de amanhã" (rótulo, campo, Salvar) e o estado que só servia a ele.
2. O mapa da Base perdeu "O que você quer na história de amanhã?", com o estado e o `mesaLive` que só existia para esse bloco. Esse mapa não está montado na Mina que o Heitor abre; a tela viva é o quadro de contratos, que nunca teve o campo.
3. O tema principal do plano passou a ser sempre o sorteio (`pickOne`). O plano continua gravando `themeRequest: null`. Saiu `setThemeRequest` e a limpeza do pedido depois de gerar.
4. Saiu `themesSet` das fontes de stat. Pedidos do Sábio: capítulo 3 "Todas" / "Acerte todas as perguntas da prova" (`quizPerfect`); capítulo 4 "Livro" / "Conte um livro para o Sábio" (`booksRead`).
5. Efeito da Biblioteca no nível 1: "Você conta ao Sábio os livros que termina." O do nível 3: "Você vê o erro antigo ao lado do acerto de hoje." O do nível 2 ficou.
6. Onde a criança lia "Abre na …", "Abre depois" ou "Em breve" no cartão, no mapa da Base e no erro de construir, agora lê "Ainda em obra." No botão, "Ainda em obra". "Precisa de …" ficou.

`themeRequest` continua no tipo e nos documentos antigos. O painel ainda mostra o pedido antigo, se houver. Nada disso é mais escrito.

`dayContextFor` não entra no harness: o arquivo puxa o Firebase e o `import.meta.env` fica vazio no teste em CJS. A escolha está no código (`mainTheme = pickOne(rng, pool)`, `themeRequest: null`, sem ler `base.themeRequest`). Na Mina da conta de teste o tema do contrato é "a caverna", do sorteio, não um texto digitado.

### Arquivos

- `src/components/hero/village/BuildingCard.tsx`
- `src/components/hero/english/base/BaseMap.tsx`
- `src/services/englishAi.ts`
- `src/services/englishBaseService.ts`
- `src/services/village/statSources.ts`
- `src/data/npcQuests.ts`
- `src/config/englishBase.ts`
- `src/services/english/__tests__/levels.test.ts` (o efeito novo da Biblioteca)
- `src/services/village/__tests__/statSources.test.ts`
- `docs/exemplos/telas/etapa-3/pacote-10c/`

### Barra da lei

1. Intenção. Biblioteca = livros e prova. Mina = contratos do dia. Passa.
2. Sistema. O cartão e o quadro que já existiam. Sem classe nova. Passa.
3. Fonte. Fredoka no corpo, pixel no título curto. Passa.
4. Ícone. A casa da Biblioteca no slot de sempre. Passa.
5. Hierarquia. O efeito de agora e o cadeado do próximo nível. Passa.
6. A cena continua. O cartão não apaga a Vila. Passa.
7. Arestas. 1280 e 1920. Frame lido: nada sobreposto, cortado ou fora do clique.
8. Mundo. Continua no React. Passa.
9. Economia. Sem gold novo. Passa.
10. Consequência. O pedido do Sábio agora é a prova inteira e o livro. Passa.
11. Estado honesto. Nível trancado diz "Ainda em obra." Passa.
12. Mouse. Esc fecha. Botões de 44 px. Passa.
13. Craft. O clique que já existia. Passa.
14. Copy. Sem "Etapa 3" nesses cadeados. Sem campo de tema. Passa.
15. Evidência. Conta `teste@flash.com`, `?d=2026-09-23&h=10`, Vite em `http://localhost:5174`. Fotos em `docs/exemplos/telas/etapa-3/pacote-10c/`: `01-biblioteca` (efeito novo, sem o campo, "Ainda em obra"), `02-mina` (quadro sem o campo), `03-sabio` ("Feito: Todas" e "Conte um livro para o Sábio"), em 1280 e 1920. A Torre foi ao nível 3 e o Sábio ao capítulo 3 só nas fotos; os dois voltaram (torre 2, capítulo 2).
16. Arestas. Prova já feita no botão da Biblioteca. Mina abre porque a prova de hoje está fechada. Passa.

### Como verificou

- `npx tsc --noEmit -p tsconfig.app.json` — 0 erros
- `npx eslint src --max-warnings 8` — 0 erros, 8 avisos de antes
- `node scripts/run-english-tests.mjs english` — 11 arquivos, saída 0
- `npm run test:village` — 13 arquivos, saída 0 (`statSources.test.ts` com `booksRead` no capítulo 4)

### Fora

- As frases soltas do Campinho ("abre na Etapa 4") e da Arena, que não estavam nas linhas do item 6
- Pacote 11

**Pare para o commit do pai.**

## Pacote 10 — correções da revisão

Sentimento alvo: a virada do dia começa a prova na primeira pergunta, e quem acerta todas as que contam vê isso na mesa.

### O que mudou

**C1.** `freshQuizUi()` em `closeQuiz.ts` devolve a mesa vazia (`current` 0, `selected` null, `answers` [], `score` 0, recompensa zerada, reflexão vazia, `judgeSay` null, `paid` false, `phase` prompt). O efeito que depende de `today` aplica isso e zera `timingsRef`, `askedAt`, `choseAt`, `stepLock` e `revealLock`. Ele está declarado antes do efeito que restaura a reflexão guardada. A leitura que já estava no ar também perde a vez (`readGen`, veredito pendente e `saving`), para o Sábio não fechar o dia novo com a frase de ontem. O tempo passa a ser gravado no índice (`next[current]`), com zero no meio quando falta medida. `answersStash` e `readTimings` não filtram mais a lista. O `quizBank` continua gravando só tempo acima de 0.

**C2.** `perfectQuiz(score, total)` em `provaRules.ts`: `total >= 5 && score === total`. A esmeralda (`grantRare` esmeralda, chave `quiz8`) e `quizPerfect` usam essa função. 7 de 7 ganha; 6 de 7 não; 5 de 5 ganha; 4 de 4 não.

**C3.** O quadro pago e a prova já fechada mostram `{nota} de {total que conta}`, o `total` de `quizScoreOf`. O dilema sai da conta.

**C4.** `quizBankDocs` e o retroativo gravam `depth` (a profundidade do tema). `difficulty` só entra se a própria pergunta trouxer 1, 2 ou 3. Os 16 docs já criados na conta de teste não foram reescritos: `…_2026-09-23_1` continua com `difficulty` 1 e sem `depth`.

### Arquivos

- `src/services/quiz/closeQuiz.ts`
- `src/components/hero/DailyQuiz.tsx`
- `src/services/dailyQuizService.ts`
- `src/services/quiz/provaRules.ts`
- `src/services/quiz/bankWrite.ts`
- `scripts/backfill-quizbank.cjs`
- `src/services/quiz/__tests__/provaBleed.test.ts`
- `src/services/quiz/__tests__/bankWrite.test.ts`
- `docs/exemplos/telas/etapa-3/pacote-10/c3-nota-1280.png`
- `docs/exemplos/telas/etapa-3/pacote-10/c3-nota-1920.png`

### Barra da lei

1. Intenção. A mesa diz quantas ele acertou entre as que contam. Passa.
2. Sistema. O papiro que já existia. Sem classe nova. Passa.
3. Fonte. O "7 de 7" no título do papiro. Passa.
4. Ícone. Estrela e ouro nos slots de sempre, 24 px. Passa.
5. Hierarquia. A nota é a âncora. Passa.
6. A cena continua. A Vila fica atrás do papiro. Passa.
7. Arestas. 1280 e 1920. Frame lido no papiro: nada sobreposto, cortado ou fora do clique.
8. Mundo. Continua no React. Passa.
9. Economia. Esmeralda e "Nota máxima" quando acertou todas, com piso de 5. Sem fonte nova de gold. Passa.
10. Consequência. Errar uma das que contam não paga a esmeralda. Passa.
11. Estado honesto. 8 perguntas, 1 dilema, nota 7 de 7. Passa.
12. Mouse. O botão "Voltar à Vila" cabe no clique. Passa.
13. Craft. O som e o papiro que já existiam. Passa.
14. Copy. "7 de 7", "Li sua reflexão." Sem boletim. Passa.
15. Evidência. Conta `teste@flash.com`, Vite em `http://localhost:5174`. Virada simulada sem recarregar a página: `?d=2026-10-24&h=10`, primeira pergunta respondida, a folha em "Sobre a ideia · 2 de 8"; `history.pushState` para `?d=2026-10-25` e o evento `clock-override`. A folha voltou ao convite ("A prova de hoje ainda espera", "Abrir a mesa"), sem o "2 de". "Começar" abriu "1 de 8". A prova de 24/10 ficou `completed` false e sem respostas. A de 25/10 tem dilema na pergunta 3; o quadro pago leu "7 de 7", "+42 XP", "+7 GOLD". Fotos `c3-nota-1280.png` e `c3-nota-1920.png`.
16. Arestas. A de 24/10 não herdou a resposta. O dilema no `quizBank` ficou sem `supportLevel`. Oito tempos, nenhum buraco. Passa.

### Como verificou

- `npx tsc --noEmit -p tsconfig.app.json` — 0 erros
- `npx eslint src --max-warnings 8` — 0 erros, 8 avisos de antes
- `npm run test:english` — 33 arquivos, saída 0 (`freshQuizUi`, o zero no meio do `answersStash`, `perfectQuiz` 7/7, 6/7, 5/5 e 4/4, `depth` sem `difficulty` e `difficulty` 3 quando a pergunta traz)
- `npm run test:village` — 13 arquivos, saída 0
- Na conta de teste, a prova de 25/10 fechou com nota 7, total 7, 8 respostas e 8 tempos. Os 8 docs novos do `quizBank` têm `depth` 1 e não têm `difficulty`. A chave `quiz8:2026-10-25` gravou a esmeralda (`rare.esmeralda` 1, `quizPerfect` 1).

### Fora

- Os 16 docs antigos do `quizBank` na conta de teste. O retroativo na conta do Heitor fica para o pai, depois desta correção.
- Pacote 10b (a prova sair com menos de 8)
- Pacote 11

**Pare para o commit do pai.**

## Pacote 13 — o app se atualiza sozinho

Sentimento alvo: a aba velha troca de versão sozinha, e não no meio da prova, do contrato ou do livro.

### O que mudou

1. O build chama `appVersion()` uma vez. A mesma string vai para `__APP_VERSION__` e para `dist/version.json` (`{ "version": "..." }`). Em DEV o plugin não emite o arquivo. No `vercel.json`, `/version.json` leva `Cache-Control: no-store`. O arquivo estático sai na raiz do build, então o rewrite para o `index.html` não o engole: o preview respondeu `Content-Type: application/json`.
2. `shouldReload` só devolve true com versão nova, `running` diferente de `dev`, mesa livre, momento `visible` / `day` / `idle`, e pelo menos 10 minutos desde o último recarregamento.
3. A prova marca `quiz` na lição, nas perguntas e na reflexão. A Mina marca `mine` com contrato ou Vagoneta abertos. A Estante marca `book` quando há texto no campo. Ao fechar, solta a chave.
4. `useAppUpdate` sobe uma vez no `App`. Em DEV não faz nada. O teaser não monta o `App`. Busca `/version.json?t=` com `cache: 'no-store'` a cada 10 minutos, quando a aba volta e na virada do dia. Recarrega no primeiro momento livre. Falha de rede não faz nada. O horário do último recarregamento fica no `sessionStorage`.
5. Ao abrir o jogo, `touchHealth(uid, 'appVersion', versão)`. No cartão Saúde, a linha "Versão no PC dele: … · no ar: …", com o chip vermelho que o cartão já usa quando as duas diferem.

As duas strings, iguais:

- `dist/version.json`: `2026-09-24-3d43e1f`
- `__APP_VERSION__` no bundle `dist/assets/App-Cu4boAdh.js`: `2026-09-24-3d43e1f`

### Arquivos

- `vite.config.ts`
- `vercel.json`
- `src/services/appUpdate.ts`
- `src/hooks/useAppUpdate.ts`
- `src/utils/__tests__/appUpdate.test.ts`
- `src/services/observability.ts`
- `src/types/village.ts`
- `src/App.tsx`
- `src/components/hero/HeroPanel.tsx`
- `src/components/hero/DailyQuiz.tsx`
- `src/components/hero/english/base/EnglishBase.tsx`
- `src/components/hero/village/EstanteDoSabio.tsx`
- `src/components/parent/VillageManager.tsx`
- `docs/etapas/ETAPA_2_LANCAMENTO.md` (seção 12)
- `docs/exemplos/telas/etapa-3/pacote-13/_shot.mjs`

### Barra da lei

1. Intenção. A aba nova chega sem o Heitor procurar o F5, e a prova aberta não some no meio. Passa.
2. Sistema. O cartão Saúde que já existia, com o mesmo chip. Sem classe nova na criança. Passa.
3. Fonte. A linha do pai é o texto do painel. Passa.
4. Ícone. Nenhum ícone novo. Passa.
5. Hierarquia. Uma linha no cartão. Passa.
6. A cena continua. O recarregamento não é um modal. Passa.
7. Arestas. Sem tela nova da criança. O cartão do pai não foi fotografado: o login do pai está ligado à conta do Heitor, e esta sessão não abre essa conta.
8. Mundo. React. Passa.
9. Economia. Sem gold. Passa.
10. Consequência. Prova, contrato e livro seguram a troca. Passa.
11. Estado honesto. A linha mostra a versão do PC dele e a do ar. Passa.
12. Mouse. Nada de alvo novo. Passa.
13. Craft. Sem animação nova. Passa.
14. Copy. "Versão no PC dele" / "no ar", no painel. Passa.
15. Evidência. Conta `teste@flash.com` (uid `DydxTQ0cGEbX46LLlQxxD123pQD3`), `npx vite preview` em `http://localhost:4173`. Console: `app-update: recarregando 2026-09-24-nova` ao voltar para a aba na Vila. Com a prova na fase de perguntas, voltar para a aba não recarregou (a pergunta continuou na tela). `health.appVersion` da conta de teste: `2026-09-24-3d43e1f`.
16. Arestas. Rede que falha não recarrega (o fetch engole o erro). A trava de 10 minutos segurou um segundo recarregamento na mesma sessão, depois que a mesa fechou: é a trava contra laço. Passa.

### Como verificou

- `npx tsc --noEmit -p tsconfig.app.json` — 0 erros
- `npx eslint src --max-warnings 8` — 0 erros, 8 avisos de antes
- `npm run test:english` — 34 arquivos, saída 0 (os seis casos de `shouldReload`)
- `npm run test:village` — 13 arquivos, saída 0
- `npx vite build` — `dist/version.json` com a mesma string do bundle
- Preview: a Vila recarregou ao voltar a aba depois de trocar o `version.json` para `2026-09-24-nova`. A pergunta aberta não recarregou.

### Fora

- Foto do cartão Saúde. O painel do pai lê a criança ligada ao admin, que é a conta do Heitor. Não abri.
- O fechar-a-mesa na mesma sessão do primeiro recarregamento não trocou de novo: os 10 minutos da trava ainda não tinham passado.
- Pacotes 11 e 12

**Pare para o commit do pai.**

## Pacote 14a — a Ferraria sai do círculo

Sentimento alvo: depois de zerar a montagem, o dia seguinte é uma frase curta de forma, não outras seis frases para ordenar.

### O que mudou

1. Alvo de ordem: nível 1 fica 2 frases para montar e 4 lacunas; nível 2 fica 3 e 3; nível 3 fica 4 para montar, 1 lacuna e 1 para escrever. Alvo de forma não mudou.
2. Scramble com mais de 5 palavras no nível 1, ou mais de 7 no nível 2, cai com `scramble_longo` e a vaga segue para a substituição que já existia. O prompt da Ferraria diz o mesmo teto.
3. A etiqueta `other` não escolhe mais "Frases completas". O alvo volta ao rodízio do nível. `word_order` continua ordem, já com a mistura nova.
4. `forgeStepDown`: 0 ou 1 acerto ontem obriga um alvo `form` do rodízio. 2 de 6 não desce.

O banco offline dos alvos de ordem foi encurtado para a mistura nova, senão a reserva repetia as seis frases longas quando a IA falha.

### O que a geração ensina

Ontem 0 de 6, nível 1, etiqueta `other`: o alvo saiu `there_is_are` (`form`), "There is / There are". Ele aprende que uma coisa pede *is* e várias pedem *are*. Os distratores são o erro típico (is/are/am e have no lugar de are). A frase para montar que a IA encaixou tem 5 palavras e a mesma regra. Não gravei isso no plano da conta de teste.

```json
{
  "target": "There is / There are",
  "items": [
    { "kind": "gap", "sentence": "There ___ a ball on the table.", "options": ["are", "am", "is"], "answer": 2, "rule": "Use 'is' para falar de uma coisa só." },
    { "kind": "gap", "sentence": "There ___ three books in my bag.", "options": ["are", "have", "is"], "answer": 0, "rule": "Use 'are' para falar de várias coisas." },
    { "kind": "typed", "prompt": "Escreva a palavra para 'há' quando tem uma coisa só", "sentence": "___ a friend next to me.", "accepted": ["there is"], "rule": "Use 'there is' para falar de uma coisa." },
    { "kind": "typed", "prompt": "Escreva a palavra para 'há' quando tem mais de uma coisa", "sentence": "___ two balls under the chair.", "accepted": ["there are"], "rule": "Use 'there are' para falar de mais de uma coisa." },
    { "kind": "scramble", "words": ["is", "there", "blue", "book", "a"], "answer": "There is a blue book.", "rule": "Use 'there is' para falar de uma coisa só." },
    { "kind": "gap", "sentence": "There ___ four balls in the box.", "options": ["are", "have", "is"], "answer": 0, "rule": "Use 'are' com números maiores que um." }
  ]
}
```

Fonte: `ai`. A mistura pedida para forma no nível 1 é 4 lacunas e 2 escritas, sem montar. A IA mandou uma montagem de 5 palavras no lugar de uma lacuna; o validador aceitou porque a frase cabe no teto. O alvo continua forma.

### Arquivos

- `src/services/english/prompts.ts`
- `src/services/english/validators.ts`
- `src/services/englishAi.ts`
- `src/data/englishOfflineContracts.ts`
- `src/services/english/__tests__/forgeMix.test.ts`
- `src/services/english/__tests__/validators.test.ts`
- `src/services/english/__tests__/adversarial.test.ts`
- `docs/etapas/ETAPA_2_LANCAMENTO.md` (seção 12)

### Barra da lei

1. Intenção. Dia ruim de montar vira um dia de forma. Passa.
2. Sistema. O contrato da Ferraria que já existia. Passa.
3. Fonte. Sem tela nova. Passa.
4. Ícone. Sem ícone novo. Passa.
5. Hierarquia. Sem tela nova. Passa.
6. A cena continua. Nada de overlay. Passa.
7. Arestas. Sem tela nova. Passa.
8. Mundo. A Mina continua no React. Passa.
9. Economia. Sem gold novo. Passa.
10. Consequência. Errar quase tudo desce o degrau, sem castigo na frase. Passa.
11. Estado honesto. O alvo do dia é o que a nota de ontem pede. Passa.
12. Mouse. Sem alvo novo. Passa.
13. Craft. Sem animação nova. Passa.
14. Copy. A regra da peça continua em português, na boca da Ferraria. Passa.
15. Evidência. Uma chamada de IA, conta de teste, sem gravar o plano. JSON acima.
16. Arestas. Sem ontem, não desce. `other` não escolhe "Frases completas". Passa.

### Como verificou

- `npx tsc --noEmit -p tsconfig.app.json` — 0 erros
- `npx eslint src --max-warnings 8` — 0 erros, 8 avisos de antes
- `npm run test:english` — 35 arquivos, saída 0
- `npm run test:village` — 13 arquivos, saída 0

### Fora

- Recado, Carta, Comerciante e economia
- Pacotes 11, 12 e 14b

**Pare para o commit do pai.**

## Pacote 14a-2 — a Ferraria olha a última concluída

Sentimento alvo: o plano de amanhã, gerado de manhã, ainda enxerga a última Ferraria que ele de fato terminou.

### O que mudou

`yesterdayForgeScore` olhava só o dia anterior ao plano. De manhã esse dia ainda está aberto, sem nota, e o degrau para baixo não disparava. Agora `lastForgeScore` pega a Ferraria concluída mais recente, em qualquer plano anterior à data. Ferraria aberta não conta. Sem nenhuma concluída, o placar é 0 de 0 e não desce. `forgeTargetFor` ficou igual.

### Arquivos

- `src/services/english/prompts.ts`
- `src/services/englishAi.ts`
- `src/services/english/__tests__/forgeMix.test.ts`

### Barra da lei

1. Intenção. O dia seguinte reage à última Ferraria feita, não a uma prova ainda em branco. Passa.
2. Sistema. A escolha de alvo que já existia. Passa.
3. Fonte. Sem tela nova. Passa.
4. Ícone. Sem ícone novo. Passa.
5. Hierarquia. Sem tela nova. Passa.
6. A cena continua. Passa.
7. Arestas. Sem tela nova. Passa.
8. Mundo. A Mina continua no React. Passa.
9. Economia. Sem gold novo. Passa.
10. Consequência. 0 ou 1 na última concluída ainda desce o degrau. 4 de 6 não. Passa.
11. Estado honesto. A nota usada é a que já está gravada. Passa.
12. Mouse. Sem alvo novo. Passa.
13. Craft. Sem animação nova. Passa.
14. Copy. Sem frase nova. Passa.
15. Evidência. Teste puro, sem geração de IA e sem gravar plano.
16. Arestas. Plano de 24/09 aberto não esconde o 0 de 6 de 23/09. Sem concluída, não desce. Passa.

### Como verificou

- `npx tsc --noEmit -p tsconfig.app.json` — 0 erros
- `npx eslint src --max-warnings 8` — 0 erros, 8 avisos de antes
- `npm run test:english` — 35 arquivos, saída 0 (`lastForgeScore`: 0/6 com o dia seguinte aberto desce; 4/6 não; nenhuma concluída não desce)
- `npm run test:village` — 13 arquivos, saída 0

### Fora

- Pacote 10b
- Pacotes 11, 12 e 14b

**Pare para o commit do pai.**






