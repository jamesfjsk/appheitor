# O Túnel: o jogo de ação da Mina, onde acertar é atacar

Documento de desenho (fonte de verdade a partir de 19/09/2026). Pedido do pai: "um jogo bem legal, com gráfico, onde para acertar ele precisa fazer as combinações (lógica, inglês); dá para encaixar várias coisas; nossos jogos não têm cara de jogo de verdade". É a porta "jogo" do `docs/MUNDO.md` §5 (Phaser 2D em tela cheia), nasce do motor do Turno na Mina (`src/components/hero/english/mine/engine.ts` e `render.ts`, órfão desde a Etapa 1) e do molde Phaser da Oficina de Redstone (`src/game/`). Regras que não mudam: recompensa só de primeira (decisão 23), o erro ensina, nunca gold, dados item a item, conteúdo das galerias de `docs/MINA_CONTRATOS.md` §8.

## 1. Sentimento alvo

"Eu desço a mina com a picareta, os bichos vêm, e cada golpe certo é uma resposta certa. Quando erro, apanho, mas a coruja do Sábio me mostra a regra e o bicho volta para eu acertar." Ritmo de jogo de ação, cabeça de aula.

## 2. O laço

- **Descida**: uma fase é uma descida de 3 ondas num túnel de rolagem lateral (o herói anda para a direita; a câmera segue; paralaxe de rocha, vigas, lanternas, trilhos).
- **Inimigo com desafio**: cada inimigo chega da direita carregando um **cartaz** com o desafio (frase em inglês com lacuna; conta; padrão de lógica; palavra com letra faltando; pergunta do Mundo). Ao chegar a 3 corpos de distância ele para, e as **opções aparecem como golpes** (3 ou 4 botões grandes na base da tela, também teclas 1 a 4).
- **Golpe certo**: o herói avança, corta, o inimigo cai com partículas, o cartaz vira pó, combo +1, barra de energia sobe, som de acerto; a explicação curta aparece no cartaz caindo por 2 s (o aprendizado passa mesmo no acerto).
- **Golpe errado**: o herói erra o golpe (animação de bater no ar), o inimigo bate, um coração some, tela treme, e a **Coruja do Sábio** desce com a regra em uma frase ("Depois de 'is' o verbo ganha -ing.") e a opção certa acesa; o Heitor toca e o herói corta (sem combo, sem contar acerto); o **mesmo desafio volta na onda seguinte** por outro ângulo (revisita) e, aí sim, conta.
- **Ondas**: onda 1 aquece (3 inimigos, uma regra), onda 2 mistura (4, duas regras), onda 3 chefe (um inimigo grande com 3 desafios em sequência e tempo curto por golpe). Tempo só no chefe, e mostrado como mecha de dinamite, não como cronômetro.
- **Vida**: 3 corações; zero corações = a fase termina ali, com o resultado do que fez (nunca "game over" vazio); pode descer de novo no mesmo dia sem recompensa nova.
- **Fim**: os vagões de material entram no trilho com o que ganhou; "Sua patente hoje" (Aprendiz, Minerador, Mestre) pela proporção de acertos de primeira; lista item a item: o que acertou de primeira, o que aprendeu na volta, o que fica para amanhã.

## 3. Galerias e ondas

Uma descida por dia por galeria aberta (a Mina escolhe a galeria do dia pelo plano: inglês nos dias pares, números e lógica nos ímpares, palavras e mundo no fim de semana; o pai ajusta). Os desafios vêm do mesmo gerador dos contratos (`englishAi.ts` e o gerador por galeria de `MINA_CONTRATOS.md` §8), no formato:

```ts
interface TunnelChallenge { id: string; subject: 'ingles' | 'numeros' | 'logica' | 'palavras' | 'mundo'; rule: string; prompt: string; options: string[]; answer: number; explain: string; whyWrong: Record<number, string>; audio?: string; reviewOf?: string }
```

- **Inglês**: lacuna com uma regra por onda (is + -ing; a/an; in/on/under; plural); o cartaz tem áudio (a voz da Mina) e o texto aparece depois de ouvir; distratores são erros de brasileiro.
- **Números**: contas de duas etapas com números até 1000, frações simples, troco; o cartaz mostra a conta e os golpes são os resultados.
- **Lógica**: "o que vem depois" (sequências de símbolos e números), "qual não pertence", circuito simples (E/OU) desenhado no cartaz.
- **Palavras**: letra que falta, acento, concordância; o cartaz é a palavra com o buraco.
- **Mundo**: pergunta curta de ciências, história ou geografia ligada ao tema do dia da prova.

Inimigos por galeria (mesma paleta da Vila, pixel art de qualidade, 64 e 96 px, folhas de 4 ações): **Morcego das Palavras** (inglês e palavras), **Golem de Cálculo** (números), **Aranha de Redstone** (lógica), **Espectro do Mapa** (mundo); chefe: **Toupeira Gigante** carrega 3 cartazes. Nenhum inimigo assusta: são bichos de mina, cômicos, no traço do Comerciante e do Ferreiro.

## 4. Telas

1. **Entrada** (na Mina, ao lado do quadro de contratos): o vagão do Túnel com a galeria do dia e "Descer"; mostra a patente de ontem.
2. **Descida** (tela cheia): HUD no alto (corações, combo, onda 1/3 com trilhos), o herói e o túnel, os golpes na base (44 px de altura mínima, teclas 1 a 4), "Sair" com confirmação.
3. **Coruja** (sobre a cena, sem pausar a música): a regra em uma frase, a opção certa acesa, "Entendi" e o golpe.
4. **Resultado**: vagões de material, patente, lista item a item, "Voltar à Mina".

## 5. Regras de acerto, erro e recompensa

- Só o golpe **de primeira** conta como acerto e paga; o golpe depois da Coruja é aprendizado (fica registrado como `learnedOnRetry`).
- Material: 1 por inimigo derrubado de primeira, teto por fase pela economia (`gameMaterialCap`); XP por acerto; nunca gold; chefe paga 1 raro a cada 5 chefes derrubados de primeira (chave `tunnel:boss:<n>`).
- Revisita: desafio errado volta na onda seguinte por outro ângulo (mesma regra, frase nova) e em 3 e 10 dias; o que ele erra duas vezes vira "regra da semana" e aparece na Coruja antes da descida.
- Combo: 3 acertos seguidos = golpe especial (corta dois inimigos: o segundo já vem sem cartaz, é prêmio de ritmo); errar zera o combo, não a vida.
- Nada de placar público, nada de ranking; a patente do dia é dele.

## 6. Dados

`tunnelRuns/{uid}_{date}_{subject}`: `{ subject, wave, items: [{ challengeId, rule, prompt, chosen, answer, firstTry, learnedOnRetry, ms }], hearts, combo, maxCombo, material, xp, rank, startedAt, endedAt }`; `englishSessions` ganha `game: 'tunnel'` por descida; `village.stats`: `tunnelRuns`, `tunnelFirstTry`, `tunnelBosses`; `learning/{uid}.profile` recebe os acertos por regra (mesmo formato da Memória da Prova). Conquistas (7, na Torre): Primeira descida, Sem apanhar (fase com 3 corações), Combo 5, Dez chefes, Regra dominada (5 acertos de primeira na mesma regra), Túnel de cada galeria, Mestre do Túnel (patente Mestre 10 vezes).

## 7. Arte, som e motor

- **Herói**: o minerador (mesmo personagem da Vila, roupa e picareta do look dele) em folhas de 64 px: parado, correr, golpe, golpe especial, apanhar, cair. Base já existe (`char/miner-walk.png`, 8 quadros de andar); as demais ações pelo PixelLab (`animate-with-skeleton`) a partir do quadro base, revisadas na prancha; se não atingirem o padrão, pixel artist contratado (herói e 4 inimigos).
- **Inimigos**: 4 comuns e 1 chefe, folhas de 4 ações (andar, atacar, apanhar, cair).
- **Cenário**: túnel em três camadas de paralaxe (fundo de rocha, vigas e lanternas, trilhos e chão) por gpt-image na linha da galeria da Vagoneta, 1280x720, repetível na horizontal; variações por galeria (cristais azuis para lógica, veios de ouro para números, livros nas vigas para palavras).
- **Efeitos**: corte, poeira, faíscas, cartaz virando pó, corações, números de combo; tremor de câmera de 4 px por 120 ms no golpe.
- **Som**: efeitos de ação (golpe, acerto, erro, dano, combo, onda, chefe, vitória) sintetizados em WebAudio no padrão de `chestSfx.ts` e `redstoneSfx.ts` (um `tunnelSfx.ts`, com peso: ataque grave curto, acerto agudo com dois tons subindo, erro abafado, dano com queda de tom), música da fase em loop pelo mesmo gerador da música da Vila (`scripts/render-village-theme.py`, variação em tom menor e ritmo mais rápido), e a voz da Mina para os cartazes de inglês.
- **Motor**: Phaser 3 (já no repositório) numa cena `TunnelScene`, HUD em React por cima (corações, golpes, Coruja), regras puras em `src/services/village/tunnel.ts` com testes (ondas, combo, vida, revisita, material, patente). Nada de Phaser fora do jogo.

### Estado da arte em 19/09 (líder), fechado à noite

Tudo gerado, sem contratação, pelo pipeline aprovado em `docs/ARTE_PIPELINE.md` (gpt-image quadro a quadro com a referência do personagem, folha montada por `frames-to-sheet.cjs`). Cada folha tem um `.json` ao lado com o número de quadros; o motor lê o JSON.

- **Fundos** (`public/assets/village/scenes/tunel/`): `backdrop-a.png` (principal) e `backdrop-b.png` (variação), 1280x720; não são perfeitamente emendáveis: repetir com espelhamento ou trocar atrás de uma viga.
- **Bases paradas** (`public/assets/village/tunnel/`): `bat-base.png`, `spider-base.png`, `golem-base.png` (80 px), `mole-boss.png` (128 px); referência do herói em `char/miner-ref.png`.
- **Folhas de ação aprovadas na prancha**: `bat-attack.png` (3 quadros, 64 px); `bat-fall.png` (3 quadros, 64 px); `bat-fly.png` (4 quadros, 64 px); `bat-hit.png` (2 quadros, 64 px); `hero-attack.png` (6 quadros, 64 px); `hero-fall.png` (3 quadros, 64 px); `hero-hit.png` (2 quadros, 64 px); `hero-idle.png` (4 quadros, 64 px); `hero-run.png` (4 quadros, 64 px); `hero-special.png` (6 quadros, 64 px); `spider-attack.png` (3 quadros, 64 px); `spider-fall.png` (3 quadros, 64 px); `spider-hit.png` (2 quadros, 64 px); `spider-walk.png` (4 quadros, 64 px).
- **Falta gerar** (mesmo pipeline, depois da fatia vertical): golem (andar, atacar, apanhar, cair, 80 px), toupeira chefe (andar, atacar, apanhar, cair, levantar placas, 128 px), Espectro do Mapa (base e ações), cartazes de madeira em 3 tamanhos, efeitos (corte, poeira, faíscas, cartaz virando pó, corações, estrela de combo, Coruja do Sábio).
- **Regra para o motor**: velocidade sugerida 10 quadros por segundo nas corridas e voos, 14 nos golpes, 8 no apanhar e cair; o herói olha para a direita e os inimigos para a esquerda nas folhas; espelhar por código quando precisar.

## 8. Ficha pedagógica

1. **O que ensina**: a regra da galeria do dia, em ritmo, com correção imediata e revisita; ler rápido e decidir.
2. **Por que cabe aos 10 anos**: uma regra por onda, 3 ou 4 opções, sem tempo fora do chefe, sem morte punitiva.
3. **Como mede**: `tunnelRuns` item a item (acerto de primeira, aprendido na volta, tempo).
4. **Como adapta**: regra da onda pelo perfil (o que ele erra entra mais fácil antes de subir); chefe só com 2 ondas limpas.
5. **Feedback**: explicação no acerto, Coruja no erro, resultado item a item.
6. **O pai vê**: descidas, acertos por regra, patentes, no painel (aba Mina).
7. **IA**: gera os desafios por regra e ângulo, com a barra da lei do professor; o código descarta o que fura.
8. **Economia**: material e XP, nunca gold; teto por fase; raro só no chefe.

## 9. Fatia vertical (a primeira entrega, e a única até o pai jogar)

Um herói (correr, golpe, apanhar), um inimigo (Morcego das Palavras), um túnel (uma camada de paralaxe), uma descida de 3 ondas de inglês com preposições in/on/under e is + -ing, a Coruja, o resultado. Sem chefe, sem combo especial, sem conquistas. Aceite: vídeo de 60 s ou 12 fotos em 1280x720 e 1920x1080; 20 descidas na conta de teste sem erro; `tunnelRuns` gravado; teste puro de `tunnel.ts`; a barra da lei marcada; tsc, eslint, build. Branch `tunel`, nunca na `main` até o pai jogar e aprovar.

## 10. Ordem

Arte e som primeiro (líder, esta semana: herói com 3 ações, Morcego, túnel, 8 efeitos, música); depois o Cursor faz a fatia vertical (1 a 2 semanas), depois do Comerciante v2. Só depois de aprovada: chefe, combo especial, as outras galerias e inimigos, conquistas, painel.
