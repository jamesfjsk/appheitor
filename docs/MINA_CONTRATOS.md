# Contratos da Mina v2: cada contrato é um jogo de verdade, não um formulário

Documento de desenho (fonte de verdade a partir de 18/09/2026). Pedido do pai, no dia do lançamento: "a base está boa, mas temos que melhorar e muito: visual, conteúdo, os passos, a forma de mostrar a informação; a Vagoneta passou por várias lapidações e hoje parece um minigame de verdade; os contratos não estão no mesmo nível". Entra na Etapa 3, um tipo de contrato por entrega, na ordem da seção 7.

**A régua (pai, 18/09, depois da primeira versão deste documento)**: a Vagoneta é a referência do que já foi lapidado, **não o alvo**: ela ainda peca no visual (fundo parado, pouco movimento). O alvo é **jogo de verdade, prazeroso, divertido e que ensina**, independente de tempo, esforço e custo. Então cada contrato nasce como jogo pela porta "jogo" do `MUNDO.md` §5 (Phaser 2D em tela cheia, ou o kit do Mine Rush), não como cena parada com botões: personagens que se mexem e reagem, objetos com peso e som, câmera e partículas, ritmo de partida (começo, meio, fim), e o aprendizado dentro da mecânica, nunca em texto ao lado dela. A seção 2 e a 3 descrevem a mecânica e o que a criança faz; o acabamento de jogo (animação, som, física leve, festa) é obrigatório em cada uma, não opcional. O que for feito de arte e código para a Vagoneta é reaproveitado e melhorado junto (fundo com vida, vagões que balançam, Ferreiro que se levanta). Regras que não mudam: `englishPlans`/`englishSessions` continuam gravando conteúdo e resultado item a item; economia da Mina (material, XP, gold, teto) não muda; a IA continua gerando o conteúdo do dia (`englishAi.ts`); `MUNDO.md` §5: a Mina é lugar, o contrato é a porta "jogo" dentro dela.

## 1. O que a Vagoneta tem e os contratos não têm

| Vagoneta (hoje) | Contratos (hoje) |
|---|---|
| tela cheia, cena pintada da galeria, personagem sentado, vagões no trilho, alavanca de verdade | modal cinza sobre a Vila, título "Mina" e um quadro de texto |
| uma pergunta por vez, no balão do Ferreiro ("Me traz 15.") | tudo na tela ao mesmo tempo: pedido, molde, caixa, banco de palavras, botão |
| a ação é física: clicar no vagão, puxar a alavanca | a ação é escolher numa grade ou digitar numa caixa |
| erro tem cena: o vagão tomba, o Ferreiro explica em uma frase, "De novo" | erro é um texto de correção abaixo da caixa |
| progresso em bolinhas no alto, sem cronômetro na cara | cronômetro "0:02" no canto, rótulos em caixa alta de 9 px |
| final com festa e o material entrando | final com números "+3 Ferro +20 XP" |

## 2. O quadro comum de todo contrato (o "túnel")

Todo contrato abre em **tela cheia**, como a Vagoneta, dentro de uma cena da Mina (fundo pintado 1280x720 por gpt-image, mesma linha do `backdrop-day.png` e da galeria da Vagoneta; um fundo por tipo de contrato, seção 6). Elementos fixos:

1. **Personagem dono do contrato** na cena, com balão de fala: o Comerciante (entrega), o Ferreiro (forja), o Carteiro da Mina (carta; personagem novo, sprite PixelLab) e o Capataz (recado; o Olheiro de capacete, ou personagem novo). Toda instrução vem pelo balão, **uma por vez**, em português curto ("Ouve o pedido e coloca na prateleira.").
2. **Bolinhas de progresso** no alto (uma por item), sem cronômetro visível; tempo só fica gravado em `durationSec`.
3. **"Voltar à Mina"** no canto esquerdo, com confirmação se houver progresso.
4. **Ação diegética**: o que a criança faz é uma ação no lugar (arrastar, bater o martelo, carimbar, puxar), nunca só "clicar na alternativa 2". Onde a resposta é escolha, as alternativas são objetos ou placas na cena.
5. **Erro com cena**: o objeto cai, a barra trinca, o carimbo sai torto; o personagem diz **uma frase** com a regra ("Depois de three vem o plural: three buckets."); botão "De novo" onde a regra permite.
6. **Final com festa**: os vagões de material entram no trilho com o que ele ganhou; o personagem dá a nota em uma frase ("Duas de três. A preposição 'under' escapou."); a tela de fim lista **item a item** o que acertou e o que treinar, com o texto certo; "Voltar à Mina".
7. **Áudio**: toda frase em inglês tem botão de ouvir no próprio balão (a voz da Mina, `tts`), e o texto em inglês só aparece depois do primeiro ouvir (regra atual, mantida); "ouvir de novo" ilimitado e contado.
8. **Glossário por toque**: tocar uma palavra em inglês na cena abre a tradução num balãozinho (registra `glossaryHovers`).
9. Tipografia: texto de 14 px ou mais; fonte pixel só em números e títulos; nada de rótulo em caixa alta.

## 3. Cada tipo, como lugar

### 3.1 Entrega do comerciante (preposições de lugar)

Hoje: "Ouvir 1", "Ouvir 2", grade de quatro quadrados com nomes em inglês e uma bandeja. É o tipo em que o Heitor mais erra (in, on, under, next to) e o mais fácil de virar jogo.

- **Cena**: o armazém do Comerciante visto de frente, com os 4 lugares desenhados de verdade (uma caixa no chão, uma mesa, uma janela com parapeito, uma estante): o item **entra no lugar certo visualmente** (em cima da mesa fica em cima; dentro da caixa some pela metade; embaixo da janela fica no chão junto da parede; ao lado fica ao lado).
- **Fluxo**: o Comerciante fala o pedido (balão com botão de ouvir; o texto aparece depois de ouvir); a criança arrasta o item da bandeja para o lugar; o item **se encaixa** com um estalo; quando termina o pedido, aperta "Entregar"; o Comerciante confere na hora: certo, ele guarda e agradece; errado, ele devolve o item para a bandeja e diz a frase certa apontando ("On the box, not in."), uma vez por pedido, e a criança tenta de novo. **A recompensa é só da primeira entrega** (decisão 23 do lançamento: tentar de novo ensina, não paga; sem aviso explícito).
- **Conteúdo**: 2 a 4 pedidos por contrato conforme o nível; as preposições vão entrando pelo nível (in/on; depois under/next to; depois between/behind/in front of); quantidades (two lamps) e cores nos níveis altos.
- **Mede**: por pedido, preposição certa ou errada, quantidade certa, ouvidas, texto aberto, tentativas.
- **Os três requisitos do pai (18/09) para a mecânica ficar perfeita**:
  1. **Áudio bom e claro**: a voz da Mina (`gpt-4o-mini-tts`, voz `nova`) passa a receber `instructions` fixas ("fale devagar e com clareza, tom acolhedor, para uma criança de 10 anos aprendendo inglês; pausa curta entre as palavras da frase") e velocidade 0,9; botão **"Ouvir devagar"** (0,75) ao lado do "Ouvir"; cada palavra do pedido também tem áudio isolado ao tocar nela (glossário sonoro); tudo em cache por hash como hoje (`functions/src/index.ts`, o hash inclui velocidade e instruções). Aceite: o pai ouve 10 pedidos e não pede para repetir nenhum.
  2. **Imagens num padrão só**: hoje os lugares e itens vêm de quatro conjuntos diferentes (`ui/base/s_*`, `ui/base/i_*`, `ui/*.webp`, `images/object_*`) e o bolo é uma mancha escura. Todos os 12 lugares e 17 itens são gerados de novo pelo líder no PixelLab com o mesmo prompt de estilo (contorno preto simples, sombra básica, vista frontal, fundo transparente; lugares em 96 px, itens em 64 px), guardados em `public/assets/village/merchant/spot-<id>.png` e `item-<id>.png`, e o `englishBase.ts` passa a apontar para eles. Nada de item que não dê para reconhecer sem o nome.
  3. **Nome só no toque** (mantido como está: é assim que ele aprende a palavra pelo som e pela imagem): o nome em inglês do lugar ou do item aparece ao clicar ou passar o mouse, com o áudio da palavra; nunca escrito embaixo de tudo.
  E o acabamento de jogo: o item voa da bandeja para o lugar com uma curva e um estalo; ao cair no lugar errado ele escorrega e cai no chão; o Comerciante olha para onde a criança arrasta; ao entregar tudo certo ele bate palma e os vagões de material entram.

### 3.2 Recado do dia (escrever)

Hoje: caixa de texto, molde com lacunas, banco de palavras, "Enviar", correção em texto.

- **Cena**: o quadro-negro do Capataz na entrada da mina; o pedido em português vem no balão dele ("Peça 3 baldes e diga que 1 é azul, para o celeiro.").
- **Fluxo em três degraus** (o `scaffoldStage` que já existe vira cena): (1) **montar**: o molde aparece como uma frase com lacunas no quadro e as palavras do banco como **peças de giz** que a criança arrasta para as lacunas; o quadro aceita só o que cabe; (2) **escrever**: no nível seguinte o molde some e ela escreve com o giz (teclado), com o banco ainda visível; (3) **livre**: sem banco. O nível do degrau vem do histórico (3 recados seguidos com 3/3 sobem um degrau).
- **Correção como cena**: o Capataz lê o quadro e circula com giz vermelho o que corrigir, escrevendo a forma certa em cima ("three bucket~~s~~"); as etiquetas de erro (plural, ordem, artigo) viram uma frase dele. "De novo" uma vez.
- **Conteúdo**: o `mustInclude` vira "o que não pode faltar" mostrado como três pregos no quadro que acendem quando a frase cobre cada item.

### 3.3 Ferraria (gramática)

Hoje: lista de frases com lacuna e botões a/an/the; itens digitados.

- **Cena**: a forja do Ferreiro; cada frase é uma **barra de ferro** na bigorna com um espaço vazio; as opções (a, an, the; ou o verbo certo; ou a palavra) são **peças** ao lado do martelo.
- **Fluxo**: escolhe a peça, bate o martelo (clique na bigorna): peça certa, a barra sai inteira e vai para a pilha; errada, a barra trinca, o Ferreiro diz a regra em uma frase ("Antes de som de vogal, an.") e a barra volta para o fim da fila (o "redo" que já existe). Só a primeira batida certa paga; a barra refeita é treino. Itens digitados: a peça é uma placa em branco onde ele escreve.
- **Conteúdo**: uma regra por dia (artigos, plural, is/are, verbo no -ing, preposição, pronome), 6 barras, das quais 2 são "armadilha" (a mesma regra em contexto novo).

### 3.4 Carta (leitura)

Hoje: texto, tradução, perguntas de múltipla escolha, "evidência".

- **Cena**: o Carteiro entrega um envelope; a carta **abre na tela como papel** (fonte legível, 16 px, largura de leitura), com o remetente e o gênero (aviso, carta, lista, placa).
- **Fluxo**: as perguntas chegam uma por vez no balão do Carteiro; as alternativas são **4 carimbos**; antes de responder à pergunta de compreensão, a criança **toca na frase da carta que prova a resposta** (a evidência que já existe vira ação: a frase acende); pergunta de decisão ("Onde estão as ovelhas?") tem uma cena pequena no fundo (as ovelhas aparecem perto do rio quando acerta).
- **Conteúdo**: os gêneros rodam pela semana; 3 a 5 perguntas conforme o nível; uma pergunta de "por quê" (inferência) nos níveis altos; a tradução só aparece por toque em cada frase, nunca inteira de uma vez.

### 3.5 O quadro de contratos (entrada da Mina)

Hoje: grade de cartões cinza "RECADO / COMERCIANTE / CARTA / FERRARIA" com "Abrir".

- Vira a **entrada da mina como cena** (fundo já existe em parte: a boca da mina, trilhos): os 5 contratos são **placas de madeira penduradas** num painel, cada uma com o personagem dono e o material que paga; placa feita ganha um carimbo; a obrigatória tem uma fita amarela. Tocar na placa abre o contrato em tela cheia. A Vagoneta é um vagão parado ao lado, quando o módulo está ligado.

## 4. Conteúdo: o que muda por dia e por nível

- **Temas**: os 24 por nível de `englishLevels.ts` (a escrever) rodam sem repetir em 30 dias; o tema do dia aparece na entrada ("Hoje: a fazenda").
- **Dificuldade** por nível da Mina (o `level` de `englishBase`): número de pedidos, preposições, degrau do Recado, perguntas da Carta, regra da Ferraria. Sobe quando a semana fecha com média acima de 80% no tipo; nunca desce no meio do dia.
- **Vocabulário**: cada contrato usa 60% de palavras já vistas (`vocab`) e 40% novas; a palavra nova aparece primeiro na Carta (leitura), depois no Comerciante (ouvir), depois no Recado (escrever): é o caminho ler, ouvir, escrever.
- **Erros voltam**: o que ele errou entra de novo em 3 e em 10 dias no mesmo tipo (a preposição que errou hoje volta no Comerciante de segunda), marcado como `review` no `result.details`.

## 5. Dados (o que já existe e o que se acrescenta)

Continua: `englishPlans/{uid}_{data}` com `content` e `result` por contrato, `englishSessions` por sessão, `englishBase.vocab`. Acrescenta em `result.details`: `attempts` por item, `hintsUsed`, `evidenceTapped`, `review: true` nos itens de revisita, `scaffoldStage` do Recado, `listens` por frase (já existe no Comerciante). O painel do pai ganha, na aba Mina, "onde ele erra" por tipo (preposições, artigos, plural, ordem) a partir desses campos.

## 6. Arte (líder)

- Fundos 1280x720 (gpt-image, mesma linha da galeria da Vagoneta): armazém do Comerciante com 4 lugares claros; quadro-negro do Capataz na entrada; forja com bigorna e pilha de barras; mesa do Carteiro com o envelope; painel de placas na entrada da mina.
- Sprites PixelLab: Carteiro da Mina (64 px), Capataz (ou o Olheiro de capacete), peças de giz, carimbos, barra de ferro inteira e trincada, martelo, envelope fechado e aberto, placas de madeira.
- Sons: estalo do encaixe, martelo, giz, carimbo, vagão chegando (`createMineSfx` já tem parte).

## 7. Ordem e aceite

1. **Comerciante** (o tipo em que ele mais erra e o mais visual): cena, arrastar com encaixe, conferência do Comerciante com a frase certa, festa final. Aceite: foto de cada passo; um pedido errado devolve o item e diz a frase; `result.details.attempts` gravado; o Heitor termina sem ler nenhum rótulo em caixa alta.
2. **Recado** com os três degraus e a correção a giz.
3. **Ferraria** com bigorna e barras.
4. **Carta** como papel com carimbos e evidência por toque.
5. **Entrada da Mina** com as placas.

Cada entrega: um tipo por vez, o antigo continua funcionando até o novo passar no teste com a conta de teste; ficha pedagógica do tipo revisada na Etapa 2 §22; fotos em 1280x720 e 1920x1080; nada de mudar a economia.
