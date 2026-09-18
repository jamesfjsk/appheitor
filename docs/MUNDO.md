# O Mundo do Miner Missions: mapa, cenas e a Fazenda

Documento de desenho (fonte de verdade a partir de 16/09/2026). Pedido do pai: o jogo vai crescer, a Vila vai ficar pequena; precisamos de outros mapas, um mapa do mundo, um jeito de trocar de tela, e no futuro algo na pegada de "Fazenda Feliz". Entra em código na Etapa 4 (roadmap). A regra de cena-como-dado (seção 6) vale desde o Lote 2 da Etapa 2; as duas portas (seção 5) valem para qualquer minijogo daqui pra frente.

## 1. A ideia

A Vila é o **centro** de um mundo, não o mundo. Cada lugar grande vira uma **cena** própria (mesmo motor da Vila: fundo pintado, âncoras, hotspots, luz por hora, personagens), e um **mapa do mundo** liga as cenas. Novos módulos ganham um lugar no mapa em vez de espremer a Vila. O Heitor **não anda pelo mapa**: clica no quadro; a viagem é a troca de cena (seção 3). Dentro de uma cena, o minerador **caminha até o ponto clicado** (decisão do pai em 17/09: entrou no Lote 2 da Etapa 2 e fica): é charme visual, deslocamento linear sem física, sem colisão e sem teclado; **a porta de cada lugar continua sendo o clique no lugar**; o boneco anda até a porta do lugar (ponto `door` no `anchors.json`) e o lugar abre **quando ele chega** (tolerância de 24 px; teto de segurança de 4 s só para viagem travada). Decisão do pai em 18/09: o andar fica; melhorar, não tirar; nada de abrir no meio do caminho. O que não pode acontecer é todo minijogo nascer como mais um quadro: lugar e jogo são portas diferentes (seção 5).

## 2. O mapa do mundo

Uma tela só, em pixel art pintada (1280 x 720), vista de cima como um mapa de tesouro: a Vila no meio, e ao redor as regiões, com estradinhas. Cada região é um hotspot com nome, estado (aberta, fechada com o motivo, "em breve") e o que tem lá hoje ("2 plantas prontas", "sua vez no xadrez"). Regiões previstas e quando abrem:

| Região | O que é | Abre com |
|---|---|---|
| Vila | o centro: Casa, obras, NPCs, Placa | sempre |
| Mina | a **cena** da entrada (túneis por nível, Comerciante da Mina, carrinho, contratos) e, daí, o **jogo** Turno na Mina (Mine Rush) | sempre (hoje é um modal; vira cena + jogo) |
| Fazenda | plantar, cuidar, colher, animais (seção 4) | Fornalha e Armazém nível 1, ou nível 8 |
| Biblioteca | a torre do Sábio: prova do dia, Estante de erros, Diário, Capítulo da semana, Museu | sempre (hoje é um modal; vira cena na Etapa 3) |
| Arena | **cena** da arquibancada; daí abre o **tabuleiro vivo** (xadrez, damas, Lig 4…), nunca um modal que parece Vila (Etapa 4B) | Etapa 4B |
| Montanha | expansão: lotes 8 a 12, mina de diamante, Turno na Mina difícil | base completa (nível 18 das obras) |
| Praia | temporada de férias: cena de verão, missões de férias, eventos | modo férias ligado |
| Castelo da Lenda | onde ficam as estrelas de temporada, a Torre grande, a galeria de troféus | primeira temporada fechada |

Regiões fechadas aparecem no mapa com névoa e uma placa dizendo o que falta ("Abre com a base completa"), nunca escondidas: o mapa é também o mapa de metas de longo prazo.

## 3. Trocar de tela

- **Botão "Mundo"** na hotbar (sexto atalho, tecla W) e uma placa "Para o mundo" na borda da Vila; nas outras cenas, "Voltar à Vila" e "Mundo".
- **Transição** de 300 ms: a cena escurece, o minerador aparece andando na estradinha do mapa (sprite pequeno, 2 quadros) do ponto de origem ao destino, a cena nova clareia. Sem tempo de carregamento visível: os fundos das regiões abertas ficam em cache.
- **Onde ele estava** fica salvo (`village.lastScene`) e o app abre lá, exceto no primeiro acesso do dia, que abre sempre na Vila (é onde a Placa e a Casa estão).
- **A Placa da Vila vale no mundo todo**: o balão "Hoje você tem" e o alarme da Agenda aparecem em qualquer cena; a hotbar (Vila, Missões, Mina, Mercado, Mochila, Mundo) idem.
- Teclado: W abre o mapa, Esc volta à cena anterior; no mapa, setas ou números escolhem a região.

## 4. A Fazenda (a pegada de "Fazenda Feliz", do jeito do jogo)

**Para que serve**: ensinar cuidado, constância e planejamento com algo que cresce de verdade ao longo dos dias, e dar uma segunda fonte de material e de coisas bonitas para a base. É onde o jogo fica "gostoso de voltar" sem pagar gold.

- **Terreno**: uma cena com canteiros (4 no início, até 12 com a expansão), um curral, um galinheiro, um poço e a casa de ferramentas. Fundo pintado como a Vila; canteiros e animais são âncoras. A Fazenda é **lugar**, não rush: clica no canteiro para ver e colher, não anda nem rega à mão (a rega é o dia completo).
- **Plantar**: sementes compradas do Comerciante com material (madeira e pedra), nunca com gold. Cada planta tem um tempo em **dias reais** (rabanete 2 dias, cenoura 3, milho 5, abóbora 7, girassol 4) e uma colheita (material, flores para cosméticos e decoração, comida para os animais, ingredientes para a Cozinha de uma etapa futura).
- **Cuidar sem clique vazio**: a planta é regada **quando o dia fica completo** (todas as missões devidas), não por um botão; dia perdido, a planta murcha um dia (não morre) e a colheita atrasa; três dias perdidos seguidos, ela seca e o canteiro volta a vazio. A Cerca nível 1 protege a Fazenda de um dia perdido por mês, como as tochas. Assim a Fazenda é o espelho da rotina.
- **Animais**: os pets da Loja moram na Fazenda quando não estão com o minerador; galinhas dão ovos (vendem ao Comerciante dentro do teto), a vaca dá leite (ingrediente). Alimentar é automático com a colheita de milho; sem milho, sem ovos.
- **Crescimento**: a Fazenda tem níveis como as construções (Fazenda 1, 2, 3: mais canteiros, o galinheiro, o curral), pagos em material, com sprite próprio e "vila que cresce" próprio.
- **O que ensina (ficha pedagógica)**: constância (o que cresce depende de dias completos), planejamento (escolher plantas de 2 ou 7 dias conforme a semana), consequência sem castigo (murcha, não morde), e economia (semente é investimento; a colheita rende mais do que custou, em material, nunca em gold direto). Mede-se por dias regados, colheitas e canteiros ativos; adapta pelo nível da Fazenda; o pai vê no relatório semanal.
- **Recompensas**: conquistas próprias (Primeira colheita, Sete dias regados, Fazenda cheia), decorações da Vila vindas da Fazenda (girassóis, cerca viva), e o Olheiro comenta.

## 5. Duas portas: lugar e jogo (decisão 16/09/2026)

O mundo clicável fica. Motor gráfico Unity/Godot, andar pelo mapa, teclado e física: não. O caminhar até o ponto clicado dentro da cena (seção 1) é só deslocamento visual e não muda esta regra. O que faltava não era o Heitor controlar o boneco; era os minijogos não nascerem todos como o mesmo quadro.

| Porta | O que é | Como se faz | Exemplos |
|---|---|---|---|
| **Lugar** | cena pintada, âncoras, clica e abre | o motor de cenas da seção 6; sem andar, sem física | Vila, mapa do mundo, entrada da Mina, Fazenda, Biblioteca, Casa, Campinho parado |
| **Jogo de tabuleiro** | partida com regra, peça que mexe, dá para perder | Phaser 2D em tela cheia + HUD React + regras puras (não é HTML de planilha nem modal da Vila) | Redstone da Mina (molde), Arena: xadrez (`chess.js` + peças PixelLab), damas, Lig 4, batalha naval, duelo |
| **Jogo de ação** | tela cheia, loop, input, tempo, suco visual; ao acabar, volta ao lugar | Phaser 2D na mesma porta, ou o kit extraído do Mine Rush (`engine.ts` + `render.ts` + tick + HUD) | Turno na Mina (já existe), Gol de Placa (Etapa 4) |

Regras:

1. Clicar num lugar **nunca** é a partida. O quadro some; o jogo ocupa a tela; ao sair, o quadro volta. Gold, XP, pai e Placa continuam no React.
2. A Vila, o mapa e a Fazenda **não** ganham Phaser nem personagem controlado (teclado, joystick, colisão). O minerador só caminha até onde o clique mandou. Menos margem de erro no tablet; a rotina não vira RPG.
3. A Fazenda não vira Stardew: regar à mão e andar no lote quebram a pedagogia da seção 4.
4. A Arena não vira modal da Vila com botões. É tabuleiro vivo (peça anda, chip cai, tiro na água, “sua vez”).
5. Não colocar motor 3D nem engine no app inteiro. Phaser entra só nestas duas portas de jogo, nunca na Vila/mapa/Fazenda. Summer Engine (Godot) é ferramenta à parte, não entra no PWA. O kit de ação entra na Etapa 4 (Turno na Mina já é o molde; Gol de Placa é o segundo); o kit de tabuleiro entra na Etapa 4B, um jogo por entrega. **Molde já no ar:** a Oficina de Redstone da Mina (`src/game/redstone/` + `RedstoneBench`) — bandeja de peças, o minerador monta o circuito, puxa a alavanca; as regras continuam em `redstone.ts`. Sem assinatura (Phaser é MIT). **Decisão de 17/09:** o molde fica no repositório documentado (`src/game/README.md`) e **sem import** até a Etapa 3; `phaser` não pode aparecer no bundle (`dist/assets`) antes disso. Na Mina, o que está no ar até lá é a Vagoneta da Mina (React, sem Phaser; ficha em `docs/etapas/ETAPA_2_LANCAMENTO.md`, seção 12).

## 6. Regra para o código, desde agora (vale para o Lote 2)

Toda coisa nova de **lugar** é **dado, não código da Vila**: `public/assets/village/scene/` vira `public/assets/scenes/<id>/` com `backdrop-day.png`, `anchors.json` (lotes, personagens, hotspots, luzes, água, props, spots de NPC, camadas de crescimento), e o componente `VillageScene` vira `SceneCanvas` que recebe o id da cena e desenha o que o JSON diz. Fumaça, luzes, rótulos, balões, rachaduras, crescimento e vida dos NPCs continuam funcionando em qualquer cena porque leem do JSON. Nada de `if (id === 'fornalha')` dentro do canvas: comportamento por tipo de âncora (`lot`, `npc`, `prop`, `water`, `light`, `entrance`). Os hotspots disparam `onClickSpot(id)` como hoje e o mapa de ids para telas mora fora do canvas (`sceneActions`). Regra de aceite para qualquer entrega com cena: "daria para criar uma segunda cena só com um JSON e um PNG?".

O que o Lote 2 já pôs no `anchors.json` da Vila e passa a ser o padrão de qualquer cena: `npcSpots` (onde cada NPC fica por hora), `walk` (área e velocidade do deslocamento do minerador), `growth` (camadas de "vila que cresce" por soma de níveis), `props` (objetos parados) e as camadas `look`, `wall` e `growth`. Decisão de 17/09: essas camadas existem **só como dado**; o canvas desenha o que o JSON descreve e nenhuma delas ganha código próprio antes da Etapa 4 (arte das camadas `wall` e `growth` fica para lá).

## 7. Ordem

- Lote 2 da Etapa 2: aplicar a regra da seção 6 no que for tocado (crescimento, NPC spots, cerimônia); sem mapa ainda.
- Etapa 3: Biblioteca vira cena própria (torre do Sábio) e a Mina vira cena (entrada e túneis), já pelo motor de cenas; o botão Mundo aparece com Vila, Mina e Biblioteca.
- Etapa 4 (renomeada "O Mundo"): mapa do mundo pintado, transição com o minerador andando, Fazenda 1 (canteiros, 5 plantas, rega por dia completo), animais dos pets, Montanha fechada com placa, Praia no modo férias; vida na vila e decorações como já previsto; kit de minijogo extraído do Mine Rush e Gol de Placa como segundo jogo de ação (seção 5).
- Etapa 4B: Arena como região e kit de tabuleiro vivo, um jogo por entrega. Etapa 5: Castelo da Lenda e polimento.
