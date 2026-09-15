# Plano de exemplo, nível 1 (2026-09-14)

Gerado por `scripts/generate-english-example.mjs` com gpt-4.1-mini (temperatura 0.8), semente 1238031645. Fonte do plano: mixed.
O Recado é obrigatório; o Heitor escolhe mais 2 entre os outros 4. Comerciante paga madeira, Carta pedra, Recado ferro, Ferraria redstone.

## c1: Comerciante - Pedido do Comerciante

Tema: a mina. Material: madeira. Fonte: IA. Tentativas: 1.

Sala: window (janela), table (mesa), barrel (barril), fence (cerca).
Bandeja: 2 x book, 3 x sword, 1 x cake.

| Passo | Pedido em inglês (falado) | Com lacunas (2ª escuta) | Tradução | Resposta esperada |
|---|---|---|---|---|
| 1 | Please put two books under the window. | Please put two ___ under the ___. | Por favor, coloque dois livros embaixo da janela. | 2 x book under window |
| 2 | Now put three swords under the table. | Now put three ___ under the ___. | Agora coloque três espadas embaixo da mesa. | 3 x sword under table |

## c2: Carta - Carta

Tema: o campinho de futebol. Material: pedra. Fonte: reserva (a IA reprovou duas vezes). Tentativas: 2.

Sem conteúdo aprovado nesta geração.

Observações do validador:
- tentativa 1: pergunta 1: anti-cola, só a opção certa aparece literalmente no texto
- tentativa 1: pergunta 2: anti-cola, só a opção certa aparece literalmente no texto
- tentativa 1: pergunta 3: opção certa é a mais longa
- tentativa 1: pergunta 4: anti-cola, só a opção certa aparece literalmente no texto
- tentativa 1: só 1 pergunta(s) válida(s) (mínimo 2)
- tentativa 2: pergunta 1: anti-cola, só a opção certa aparece literalmente no texto
- tentativa 2: pergunta 3: anti-cola, só a opção certa aparece literalmente no texto
- tentativa 2: pergunta 4: opção certa é a mais longa
- tentativa 2: pergunta 5: anti-cola, só a opção certa aparece literalmente no texto
- tentativa 2: só 1 pergunta(s) válida(s) (mínimo 2)

## c3: Recado - Recado para o ferreiro

Tema: a mina. Material: ferro. Fonte: IA. Tentativas: 1.

Pedido (o que o Heitor lê): Peça três lanternas e uma picareta azul para a equipe da mina.

Informações obrigatórias (dica em PT e formas aceitas em inglês):
- três lanternas: three lanterns | 3 lanterns
- uma picareta azul: one blue pickaxe | a blue pickaxe
- para a equipe da mina: for the mine team | to the mine team

Moldes do nível: "I need ___ and ___.", "I have ___. It is for ___.", "There is ___ in the ___.", "Please give me ___ for ___.", "I want ___ and ___ for ___."
Banco de palavras: need, lanterns, blue, pickaxe, for, mine, team, give, take, on, and, but
Resposta-modelo (escondida): I need three lanterns. One blue pickaxe is for the mine team.

Observações do validador:
- tentativa 1: banco com dígitos, números ou repetições; removidos

## c4: Ferraria - Ordem do pedido (Put the X on the Y)

Tema: o campinho de futebol. Material: redstone. Fonte: IA. Tentativas: 1.

Alvo: Ordem do pedido (Put the X on the Y)

1. Ordenar: [the | goal | the | in | ball | put] -> "Put the ball in the goal."
   - Regra: Coloque a palavra 'put' no começo e depois o objeto e o lugar.
2. Ordenar: [the | bench | shoes | my | under | put] -> "Put my shoes under the bench."
   - Regra: Diga primeiro 'put', depois o que e onde.
3. Ordenar: [to | the | goal | flags | put | next] -> "Put the flags next to goal."
   - Regra: Use 'put' para dizer onde colocar algo.
4. Ordenar: [field | five | on | cones | put | the] -> "Put five cones on the field."
   - Regra: Conte antes o objeto e depois onde colocar.
5. Ordenar: [ball | put | shoes | to | the | next] -> "Put the ball next to shoes."
   - Regra: Fale primeiro 'put', depois o objeto e o lugar.
6. Ordenar: [the | water | on | my | put | bottle | bench] -> "Put my water bottle on the bench."
   - Regra: Diga 'put' e depois o que e onde colocar.

## c5: Carta - Mine Report for Base

Tema: a mina. Material: pedra. Fonte: IA. Tentativas: 1.

Gênero: scout_report. Título: **Mine Report for Base**. Remetente: Scout Lila.

Texto em inglês:

> There is a mine next to the base. There are two tunnels. One tunnel has five ladders. The other has a lantern. A brave player uses a pickaxe. The player has a rope and five emeralds. The player wants to sell the rope. The price is three emeralds. The base is near the river.

Tradução:

> Há uma mina ao lado da base. Existem dois túneis. Um túnel tem cinco escadas. O outro tem uma lanterna. Um jogador corajoso usa uma picareta. O jogador tem uma corda e cinco esmeraldas. O jogador quer vender a corda. O preço é três esmeraldas. A base está perto do rio.

Glossário: mine = mina; tunnel = túnel; ladders = escada; lantern = lanterna; pickaxe = picareta; rope = corda.

1. (decision) You have three emeralds. What do you buy?
   - the rope (certa)
   - a lantern
   - a pickaxe
   - the ladder
   - Evidência no texto: "The player wants to sell the rope. The price is three emeralds."
   - Explicação: O texto diz que a corda custa três esmeraldas e está à venda.
2. (comprehension) How many ladders are there?
   - three
   - five (certa)
   - two
   - one
   - Evidência no texto: "One tunnel has five ladders."
   - Explicação: Um túnel tem cinco escadas.
3. (comprehension) Where is the lantern?
   - at the base
   - in the tunnel (certa)
   - under the rope
   - on the river
   - Evidência no texto: "The other has a lantern."
   - Explicação: A lanterna está em um túnel diferente.

Observações do validador:
- tentativa 1: pergunta 2: opção certa é a mais longa
- tentativa 1: pergunta 4: opção certa é a mais longa

## Medições

| Contrato | Tentativa | Resultado | Latência | Tokens entrada | Tokens saída |
|---|---|---|---|---|---|
| c1 Comerciante | 1 | aprovado | 1.7 s | 669 | 46 |
| c2 Carta | 1 | reprovado | 7.2 s | 1244 | 661 |
| c2 Carta | 2 | reprovado | 6.9 s | 1339 | 656 |
| c3 Recado | 1 | aprovado | 3.0 s | 933 | 179 |
| c4 Ferraria | 1 | aprovado | 4.0 s | 828 | 374 |
| c5 Carta | 1 | aprovado | 7.1 s | 1247 | 670 |

