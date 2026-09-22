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




