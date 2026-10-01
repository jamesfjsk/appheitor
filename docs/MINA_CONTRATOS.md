# Contratos da Mina v2: cada contrato é um jogo de verdade, não um formulário

Documento de desenho (fonte de verdade a partir de 18/09/2026). Pedido do pai, no dia do lançamento: "a base está boa, mas temos que melhorar e muito: visual, conteúdo, os passos, a forma de mostrar a informação; a Vagoneta passou por várias lapidações e hoje parece um minigame de verdade; os contratos não estão no mesmo nível". Entra na Etapa 3, um tipo de contrato por entrega, na ordem da seção 7.

**A régua (pai, 18/09, depois da primeira versão deste documento)**: a Vagoneta é a referência do que já foi lapidado, **não o alvo**: ela ainda peca no visual (fundo parado, pouco movimento). O alvo é **jogo de verdade, prazeroso, divertido e que ensina**, independente de tempo, esforço e custo. Então cada contrato nasce como jogo pela porta "jogo" do `MUNDO.md` §5 (Phaser 2D em tela cheia, ou o kit do Mine Rush), não como cena parada com botões: personagens que se mexem e reagem, objetos com peso e som, câmera e partículas, ritmo de partida (começo, meio, fim), e o aprendizado dentro da mecânica, nunca em texto ao lado dela. A seção 2 e a 3 descrevem a mecânica e o que a criança faz; o acabamento de jogo (animação, som, física leve, festa) é obrigatório em cada uma, não opcional. O que for feito de arte e código para a Vagoneta é reaproveitado e melhorado junto (fundo com vida, vagões que balançam, Ferreiro que se levanta). Regras que não mudam: `englishPlans`/`englishSessions` continuam gravando conteúdo e resultado item a item; economia da Mina (material, XP, gold, teto) não muda; a IA continua gerando o conteúdo do dia (`englishAi.ts`); `MUNDO.md` §5: a Mina é lugar, o contrato é a porta "jogo" dentro dela.

**Erro nos contratos, desde 23/09 (decisão 43; `docs/APRENDER_A_APRENDER.md` §4.5; entra no pacote AP2):** a resposta vem no último degrau, não no primeiro.
- **Comerciante:** no primeiro erro, o item volta à bandeja e o pedido toca de novo, sem a frase corrigida. No segundo, a pista ("Presta atenção na palavra depois de *apple*"). Só então vem o `correctionFix`.
- **Recado:** o Capataz primeiro circula onde está o erro, sem escrever a forma certa. Depois diz a regra com nome. Só no fim escreve a forma certa a giz.
- **Ajuda sem custo:** a Dica do Recado deixa de custar ferro e só aparece depois da primeira tentativa.
- **Ferraria:** fica como está.
- **Pagamento:** continua só na primeira tentativa (decisão 23). Cada tentativa grava `supportLevel`.

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

### 3.1 Entrega do comerciante (preposições de lugar) — o jogo entregue

Tela cheia no armazém (`MerchantDelivery`). Quatro âncoras da cena (`floor-a`, `floor-b`, `wall`, `counter`). O que entra no sorteio do armazém: baú, caixa, forno, barril, mesa, prateleira, tapete, banco, porta, janela. Cama e cerca ficam de fora. Preposições: **in, on, under, next to**. Sem between, behind, cores ou "in front of".

- **Pedidos**: 2 (n1), 3 (n2), 4 (n3). Pedido 1 mostra 1 móvel; pedido 2 mostra 2; daí 3. Uma colocação por pedido (empilhar `qty` no mesmo tapete vale para *two apples*). Segundo tapete escorrega. `boots` só sai com qty 1. `under` não nasce em porta, janela nem cerca. `in the oven` só com item de cozinha (maçã, banana, laranja, bolo, balde).
- **Cola**: pedido 1 sem zona acesa e sem rótulo no tapete. O rótulo da preposição (`on`, `in`…) só aparece em `padMode 'hint'` depois do erro.
- **Ouvir**: o inglês toca primeiro; `listens` só sobe quando o áudio acabou. O texto EN aparece depois (`textShown` = a frase chegou a abrir, não marca de erro). Clique no item ou no lugar fala a palavra em inglês. Hover não fala. Fala PT com `{ lang: 'pt', speed: TTS_SPEED_TALK }`. Frase mista = duas chamadas.
- **Erro**: o item volta à bandeja. A tela e o áudio EN mostram `correctionFix.en` ("On the box, not in."). Depois a boca em PT. Cada tentativa grava `missKind` em `details.misses`: `relation | item | qty | spot`. Ele continua até o pedido fechar. Sem aviso de que a segunda não paga (decisão 23). O Comerciante só vira a página quando a entrega acerta.
- **Paga**: só a primeira entrega (decisão 23). Sem aviso na tela.
- **Mede**: `listens`, `textShown`, `attempts`, `misses`, `firstHits` / `finalHits`.

### 3.2 Recado do dia (escrever)

Hoje: caixa de texto, molde com lacunas, banco de palavras, "Enviar", correção em texto.

- **Cena**: o quadro-negro do Capataz na entrada da mina; o recado em português vem no balão dele ("Escreva um recado para o papai. Diga que você faz a lição primeiro. Depois você joga bola."). Não é lista da mina: é recado da vida (casa, escola, futebol). Ensina duas coisas no mesmo quadro — o inglês do nível e um combinado (lição primeiro, pedir com educação, ajudar em casa, esperar, pedir desculpa, falar a verdade).
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

**Substituído pelo §9 em 30/09/2026.** Fica o registro do que foi pedido antes.

- **Temas**: os 24 por nível de `englishLevels.ts` (a escrever) rodam sem repetir em 30 dias; o tema do dia aparece na entrada ("Hoje: a fazenda").
- **Dificuldade** por desempenho no tipo, no molde da Vagoneta — não por calendário e não pelo slider do pai. No Comerciante: 3 entregas com todos os pedidos de primeira sobem para o nível 2 (3 pedidos, entram under/next to); 7 entregas e 5 perfeitas sobem para o 3 (4 pedidos, sala maior). Nunca desce no meio do dia. O plano de amanhã é regenerado quando o nível sobe. Pedido já feito (item + preposição + lugar) não volta; quantidade e itens da bandeja mudam a cada dia.
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

## 8. A Mina de todas as matérias (pedido do pai em 19/09: "contratos de outros temas, não só inglês")

**Princípio**: contrato é uma **mecânica de jogo**; a matéria é o conteúdo que entra nela. A Mina vira uma mina com **galerias**, uma por matéria, e o plano do dia mistura galerias. O inglês continua sendo uma galeria, não a Mina inteira. Tudo paga material do mesmo jeito (a economia não muda), tudo grava conteúdo e resultado item a item (`englishPlans`/`englishSessions` ganham o campo `subject`; os nomes das coleções ficam), e o currículo de temas é o mesmo da prova (`quizCurriculum.ts`, 20 categorias), então a Memória da Prova e a Expedição do Explorador enxergam a Mina também.

**Galerias e mecânicas** (uma mecânica serve a mais de uma matéria; o que muda é o conteúdo e o personagem):

| Galeria | Matéria | Mecânicas (as da seção 3 e as novas) | Personagem |
|---|---|---|---|
| Inglês | inglês | Entrega (ouvir e colocar), Recado (escrever), Ferraria (gramática), Carta (ler) | Comerciante, Capataz, Ferreiro, Carteiro |
| Números | matemática | Vagoneta (cálculo mental, já existe); **Balança** (frações e proporção: equilibrar pesos); **Feira** (dinheiro, troco e porcentagem no balcão do Comerciante) | Ferreiro, Comerciante |
| Lógica | lógica, redstone | Oficina de Redstone (circuitos, molde Phaser da Etapa 3); **Trilhos** (sequências e padrões: ligar os trilhos na ordem) | Ferreiro |
| Palavras | português | Carta em português (interpretação de texto, com carimbos e evidência); Recado em português (escrever com regra: acentuação, concordância, o Capataz corrige a giz); **Bigorna das Palavras** (ortografia: a barra com a letra certa) | Capataz, Carteiro |
| Mundo | ciências, história, geografia, Brasil, corpo, astronomia | **Mapa** (geografia: colocar o lugar certo no mapa da parede); **Linha do tempo** (história: ordenar os acontecimentos nos vagões); **Laboratório** (ciências: prever o que acontece e conferir); Carta do Mundo (ler um texto curto de ciência ou história e responder) | Sábio |

**Plano do dia** (5 contratos, como hoje): 2 de inglês, 1 de números, 1 de palavras, 1 de rodízio (Mundo ou Lógica), com o Recado obrigatório podendo ser em inglês ou em português conforme o dia. A proporção fica em `settings/economy.mineMix` para o pai ajustar. A dificuldade é por galeria (`englishBase.level` vira `levels[subject]`); a rotação de temas segue a da prova (categoria nunca repete em dias seguidos; tema não repete em 30 dias na Mina). A IA gera o conteúdo por galeria com o mesmo prompt de estilo, a partir do tema do dia e do perfil de acertos; os erros voltam em 3 e 10 dias na mesma galeria.

**Ordem**: a Entrega do Comerciante (inglês) é o molde e entra primeiro; logo depois, com o mesmo motor de cena, entram **Carta em português** e **Feira** (dinheiro), que reaproveitam mecânicas prontas; Mapa, Linha do tempo e Laboratório são mecânicas novas e vêm em seguida, uma por entrega, sempre com fundo e sprites do líder antes do código e ficha pedagógica por galeria. O painel do pai ganha "onde ele erra" por galeria.


## 9. O inglês por unidades (30/09/2026)

Pedido do pai em 30/09: "tem algo errado no inglês". Esta seção substitui o §4 (conteúdo e nível) e muda a Ferraria (§3.3), a Carta (§3.4) e a nota do Recado (§3.2). A cena, a economia e o Comerciante (§3.1) continuam.

### 9.1 O que os dados mostram (15/09 a 30/09: 12 dias de Mina, 11 seguidos)

| Contrato | Acerto de primeira | O que acontece |
|---|---|---|
| Comerciante | 61% (72% no nível 2) | melhora a cada semana; é o único que ensina |
| Carta | 43% (19% no nível 2) | responde em 6 a 15 segundos; não lê |
| Recado | 1 de 3 em 11 de 11 | acerta na segunda tentativa, e a nota não muda |
| Ferraria | 16% | 0 de 6 em 6 das 12 |

As causas, da mais pesada para a mais leve:

1. **O nível subia pelo Comerciante e levava tudo junto.** Com a quinta entrega perfeita do Comerciante, em 30/09, a Mina inteira foi para o nível 3 no plano de 01/10: cartas de 101 e 111 palavras e Ferraria de "must". O nível do painel era ignorado.
   - Corrigido pelo líder em 30/09: vale só o nível do painel, e a Mina não sobe de nível sozinha.
2. **A Ferraria cobra sem ensinar, e erra na pergunta.**
   - Foram 12 Ferrarias com 7 regras, e a regra muda quase todo dia. A regra só aparece depois do erro.
   - Muitas barras têm duas respostas certas:
     - "Scout Rafael ___ kick the ball well." (can / can't);
     - "I see ___ lantern near the shed." (a / the);
     - "There are ___ planks on the bridge." (some / no).
   - Há barras fora da regra do dia. Na de don't/doesn't de 29/09, duas eram de is/are e de some/any.
   - Opções com erro de grafia ensinam grafia errada: "appless", "emeraldes".
   - Montar frases de 7 ou 8 palavras, com "the" repetido, deu 0 de 6 em quatro dias (21, 23, 24 e 25/09). Exemplo: "{shed boots leo the next to the put}".
   - Resultado: nas últimas, ele leva de 40 a 80 segundos para 6 barras. Ele chuta.
3. **A Carta não tem história.**
   - O texto é uma lista com as palavras do tema: "The brave cat loves blue torches.", "I like the watchtower because it is brave.".
   - As perguntas são em inglês.
   - O glossário só abre segurando 400 ms: foram 6 toques nas últimas 6 cartas.
   - Não há motivo para ler.
4. **O Recado mede frase decorada, não recado.**
   - A nota é a da primeira tentativa, e um verbo escorregado vale "bloqueante" (1 de 3), mesmo com o recado completo e claro.
   - Em 30/09 ele escreveu "I want play soccer. I do my homework first. I wait because my homework is first.". Na segunda tentativa, "I want to play soccer. I do my homework first. I wait because my homework is first.". Nada faltou, e a nota foi 1 de 3. A correção dele nunca aparece.
   - Em 30/09, o pedido citava duas ideias, e o "não pode faltar" cobrava três.
5. **Nada volta.**
   - "Palavra conhecida" é palavra vista uma vez.
   - O erro de ontem não volta em 3 e 10 dias, como o §4 pedia.
   - A prova usa sempre o inglês do nível 1.
6. **O Comerciante paga no máximo 2.** O texto em inglês sempre abre depois do primeiro ouvir, e o `textShown` corta a entrega perfeita para 2.

**Por que o Comerciante funciona:**
- a mesma mecânica todo dia;
- uma regra pequena (in, on, under, next to);
- a resposta calculada pelo jogo, nunca ambígua;
- o erro volta na hora.

Ele é o molde do resto.

### 9.2 A ideia: uma unidade por vez

Uma **unidade** é um padrão de frase com uma lição curta: am/is/are, want to + ação, can/can't. O banco está em `docs/conteudo/INGLES_UNIDADES.md`, com 10 unidades dos níveis 1 e 2.

- **A unidade dura até o selo:** 2 Ferrarias da unidade com pelo menos 5 de 6 de primeira, em quaisquer dias.
  - Dura no mínimo 2 dias e no máximo 6 Ferrarias.
  - Sem selo em 6, ela fica "para rever": a seguinte começa, e ela volta na revisão.
- **Todos os contratos do dia usam a unidade:**
  - a Ferraria treina o padrão (§9.3);
  - o Recado usa o molde da unidade;
  - na Carta, o padrão aparece pelo menos duas vezes;
  - a pergunta de inglês da prova usa o padrão.
- O Comerciante segue a própria trilha, a das preposições.
- O Heitor começa na U1. Se já souber, sela em 2 dias.

### 9.3 Ferraria: ensina, depois pede, e cada barra tem uma resposta só

- **Lição antes.**
  - No primeiro dia da unidade, o Ferreiro mostra o cartão da lição antes da primeira barra: a regra em uma ou duas linhas, dois exemplos com áudio e um "não é assim".
  - Nos outros dias, "Ver a regra" fica ao lado da bigorna, grátis e contado (`lessonViews`).
- **As barras saem de moldes, não da IA.**
  - Cada unidade tem moldes com as listas do banco (sujeitos, ações, coisas), e o jogo calcula a resposta, como no Comerciante. A IA sai da Ferraria.
  - Cada barra passa pelo validador:
    - exatamente uma opção certa;
    - todas as opções bem escritas, nada de "appless";
    - a barra treina a regra da unidade;
    - montar tem até 5 peças, sem palavra repetida; frase longa vira peças maiores ("I eat" | "because" | "I am hungry");
    - escrever pede uma palavra só e aceita a palavra sem apóstrofo, com apóstrofo curvo, com maiúscula, e "does not" no lugar de "doesn't".
- **Os degraus da unidade:**
  - dia 1: 2 de escolher (2 opções), 3 de completar (3 opções) e 1 de montar;
  - do dia 2 em diante: 1 de escolher, 2 de completar, 2 de montar e 1 de escrever.
- **Desce na hora.** Dois erros seguidos: o cartão da lição volta, e a próxima barra é de escolher.
- **Barras antigas.** No fim, entram até 2 barras de revisão:
  - as erradas voltam em 1, 3 e 7 dias (caixas);
  - cada unidade selada volta uma vez por semana;
  - a frase do Recado com erro vira uma barra dele: "Qual está certa? 'I want play soccer.' ou 'I want to play soccer.'".
- **O alvo nunca vem da etiqueta do Recado.** Saem o `FORGE_TAG_TARGETS` como escolha do alvo e o "Frases completas".
- Paga como hoje: os acertos de primeira sobre o total de barras.

### 9.4 Carta: uma história curta com motivo

- **A Carta tem nível próprio** (`letterLevel`), abaixo do teto do painel:

  | Nível | Tamanho | Perguntas | Opções | Glossário |
  |---|---|---|---|---|
  | C1 | 30 a 50 palavras | em português | 3, em português | 3 a 5 |
  | C2 | 50 a 70 palavras | em português | em inglês, copiadas do texto | 4 a 6 |
  | C3 | 70 a 100 palavras | em inglês, uma de inferência | em inglês | 6 a 8 |

  - Sobe com 3 Cartas seguidas com tudo certo de primeira.
  - Desce com 2 seguidas com no máximo 1 certa.
  - O Heitor começa na C1.
- **A carta tem um motivo, e cada frase serve a ele.**
  - Os oito motivos: pedido de ajuda, convite, aviso de perigo, achado e perdido, caminho até um lugar, notícia de um jogo, lista para uma tarefa (com o porquê) e agradecimento.
  - Sem coisa solta e sem adjetivo que não cabe ("brave cat", "brave watchtower").
- **Revisor** (`gpt-4o`), como o da prova, confere:
  - a nota de coerência;
  - uma resposta por pergunta;
  - a resposta numa frase só (a evidência);
  - que não dá para responder sem ler.

  Se reprovar, gera de novo uma vez. Se reprovar de novo, usa o banco offline.
- **Glossário por toque.** As palavras do glossário vêm sublinhadas. O toque curto mostra a tradução e fala a palavra (`glossaryTaps`). Sai o hover de 400 ms.
- **Continuam:**
  - a trava de leitura (14b);
  - a evidência antes das opções;
  - a voz lendo a carta.

### 9.5 Recado: nota pelo recado, e a correção conta

- **A nota:**
  - 3: as ideias do pedido, sem erro;
  - 2: as ideias, com 1 ou 2 erros que não mudam o sentido;
  - 1: faltou uma ideia, o sentido se perdeu, ou houve 3 erros ou mais;
  - 0: não é inglês.
- **A ideia vale pelo sentido, com qualquer palavra e em qualquer ordem.**
  - O juiz decide pelo sentido.
  - O `matchesInfo` (variantes fixas, na ordem) fica só para quando a IA falha.
- **Erro que não muda o sentido não bloqueia.** "I want play soccer" é erro pequeno. Só bloqueia o erro com `meaningLost: true`, que o juiz marca.
- **O pedido cita todas as ideias do "não pode faltar",** nem mais nem menos. É o validador do conteúdo que confere.
- **A segunda tentativa aparece.**
  - O Capataz diz "Na segunda: 3 de 3. O quadro está certo.", e o resultado grava `details.secondScore`.
  - O pagamento continua só pela primeira (decisão 23).
  - O painel mostra as duas.
- **A dica é grátis** e só aparece depois da primeira tentativa (decisão 43, AP2). Sai o custo de 1 ferro.
- O molde do dia vem da unidade (banco). O erro dele vira barra de revisão na Ferraria (§9.3).

Com a nota nova, os Recados de 28/09 e de 30/09 teriam dado 2 de 3 na primeira tentativa e 3 de 3 na segunda.

### 9.6 Comerciante, nível, palavras, prova e painel

- **Comerciante:**
  - o `merchantMaterial` não corta mais por `textShown`: entrega perfeita paga 3;
  - volta a ter nível próprio (`merchantLevelFromSkill`), agora com o teto no nível do painel e com descida: 2 entregas seguidas com metade ou menos de primeira descem 1;
  - o pedido errado volta em 3 e em 10 dias (§4).
- **Nível:**
  - o do painel vira **teto**, e cada contrato anda pelo próprio resultado abaixo dele;
  - a Mina não sobe o teto sozinha. Quando a última unidade do nível é selada, o painel sugere subir.
- **Palavra conhecida** é a vista em 3 contratos (`seen >= 3`). O glossário e o `vocabKnown` usam essa conta.
- **Prova:** a pergunta de inglês recebe a unidade atual e o nível da Carta.
- **Painel:** cartão "Inglês: como ele vai", com:
  - a unidade atual, o dia nela e as Ferrarias dela;
  - as unidades seladas e as "para rever";
  - o acerto de primeira em 7 dias, por contrato;
  - o nível da Carta e o do Comerciante;
  - os 5 últimos Recados, com a primeira e a segunda tentativa lado a lado, e o erro que mais volta.

### 9.7 Dados

- **`englishBase` ganha:**
  - `unit: { id, startedOn, forges: [{ date, first, max }] }`;
  - `units: Record<id, { sealedOn?: string; review?: true }>`;
  - `letterLevel` e `merchantLevel`;
  - `reviewQueue: [{ key, box, due, item }]`, com no máximo 30 itens.
- **O contrato grava** `contract.level`, o nível usado nele.
- **`result.details` ganha:**
  - `lessonViews`;
  - `review` nas barras de revisão;
  - `secondScore` no Recado;
  - `glossaryTaps` na Carta.
- A regra de `englishBase` no Firestore não tem lista de campos, então não muda.

### 9.8 Ordem

É uma frente só, a P17, em quatro passos, com um commit por passo:
1. Recado;
2. Ferraria, que depende do banco aprovado pelo pai;
3. Carta;
4. Comerciante, painel e prova.

O pacote está em `docs/etapas/PROMPT_CURSOR_2026-09-30_INGLES.md`.
