# Etapa 1B: Cena da Vila v2 (entra na versão de 18/09)

Mini-etapa para o Cursor, em paralelo às correções da Etapa 1 (`docs/etapas/REVISAO_ETAPA_1.md`). Mexe só em `src/components/hero/village/VillageScene.tsx`, no que `VillageHome.tsx` passa para ela, em `public/assets/village/scene/` e em `docs/VILA_API.md`. Tema: `docs/MINER_MISSIONS_TEMA.md`. Contexto: `docs/MINER_MISSIONS_ROADMAP.md`.

## 0. Por que

A cena atual (tile de grama repetido em grade, cubos flutuando nas laterais, placas iguais em fila, personagens de lado sobre chão visto de cima, céu preto) parece protótipo. O pai pediu "nível jogo de verdade" já na primeira versão. A diferença entre protótipo e jogo aqui é **montagem**, não sprite: fundo pintado em camadas, sprites ancorados em pontos fixos e na escala certa, sombra, luz por horário e pequenos sinais de vida.

## 1. Decisões já tomadas (não reabrir)

1. Continua canvas 2D em `VillageScene.tsx` (sem PixiJS). Tamanho lógico da cena: **1280 x 640**, desenhado num `<canvas>` com `image-rendering: pixelated`, CSS `width: 100%; height: auto` (mantém a proporção; hotspots convertem coordenadas pela razão real).
2. O chão **não é mais tile**: é uma imagem pintada, `public/assets/village/scene/backdrop-day.png` (1280 x 640), gerada pelo líder por IA e escolhida pelo pai. O código nunca desenha grama, caminho ou cubos.
3. **Âncoras em JSON** (`public/assets/village/scene/anchors.json`, entregue pelo líder junto com o fundo): posição e tamanho de cada lote, do personagem, dos NPCs e dos pontos de luz. O código só lê o JSON; nada de coordenadas fixas no `.tsx`.
4. Sprites atuais continuam (`buildings/*.png` 96 px, `char/*.png` e `npc/*.png` 64 px). Construção escala para a largura do lote (`w` da âncora), ancorada pelo **centro da base**; personagem e NPCs escalam para `character.h` do JSON (aprox. 96 px de altura na cena).
5. Horário: um fundo só (dia) com **camada de luz** desenhada por cima; nada de três imagens.
6. Sem emojis; textos em português; rótulos e balões em Fredoka (fonte do corpo), não na fonte pixel.
7. Entrega mínima obrigatória para 18/09 são as seções 3, 3b e 3c. A seção 4 só se sobrar tempo, sem atrasar a entrega.

## 2. Arquivos que o líder entrega (a IA de código só consome)

- `scene/backdrop-day.png` (1280 x 640): vila em três quartos, luz de dia, sete lotes vazios pintados (seis em duas fileiras de três e um maior à direita para o Cofre da Etapa 2), caminho, árvores, cerca, água (lago ou rio) e uma entrada de mina ou outro marco do tema.
- `scene/anchors.json`:
```json
{
  "size": { "w": 1280, "h": 640 },
  "spriteScale": 1.5,
  "lots": [
    { "id": "fornalha", "x": 170, "y": 178, "w": 160, "h": 88 },
    { "id": "bau",      "x": 365, "y": 178, "w": 155, "h": 88 },
    { "id": "cerca",    "x": 205, "y": 315, "w": 165, "h": 86 },
    { "id": "torre",    "x": 410, "y": 315, "w": 160, "h": 86 },
    { "id": "mesa",     "x": 245, "y": 450, "w": 170, "h": 82 },
    { "id": "campinho", "x": 455, "y": 450, "w": 170, "h": 82 },
    { "id": "cofre",    "x": 750, "y": 548, "w": 170, "h": 84 }
  ],
  "character": { "x": 700, "y": 445, "h": 96 },
  "npcs": {
    "sabio": { "x": 800, "y": 215, "h": 96 },
    "comerciante": { "x": 1090, "y": 385, "h": 96 }
  },
  "hotspots": {
    "mine": { "x": 500, "y": 0, "w": 170, "h": 150 }
  },
  "lights": [
    { "id": "mina", "x": 585, "y": 75, "r": 90 },
    { "id": "fogueira", "x": 890, "y": 400, "r": 70 }
  ],
  "water": { "x": 1040, "y": 455, "w": 210, "h": 135 },
  "smokeOffset": { "dx": 100, "dy": -70 }
}
```
  `x, y` de lote = canto superior esquerdo do retângulo do lote no fundo; construção desenhada com base em `y + h` e centro em `x + w/2`, escalada por `spriteScale` (96 px vira 144 px; a placa de lote vazio a 60% disso). Personagem e NPCs: 64 px vira 96 px. `hotspots.mine` é a entrada da mina: clicável, abre a Mina (`onClickSpot('mine')`), com o mesmo tratamento de cadeado dos lotes. `character`/`npcs`: `x, y` = ponto onde os pés tocam o chão. `lights`: onde acender brilho à noite (entrada da mina, lampiões, janelas das construções construídas são adicionadas pelo código a partir dos lotes). `water`: retângulo para o reflexo. Este JSON já está no repositório com os valores reais do fundo escolhido (variante B, vila de mineração: entrada da mina no alto, trilhos, fogueira, lago). Exemplos de montagem em `docs/exemplos/cena/montagem-B.png` (dia) e `montagem-B-noite.png` (noite): é esse o resultado esperado, com os sprites nessas posições e escala.
- `scene/clouds.png` (512 x 128, fundo transparente, 3 nuvens) e `scene/glow.png` (128 x 128, círculo quente com borda difusa) para a luz da noite: já estão no repositório.
- Os sprites já existentes: `buildings/<id>-<nível>.png`, `buildings/placa.png`, `char/miner-*.png`, `npc/sabio.png`, `npc/comerciante.png`, `ui/moon.webp`, `ui/torch.webp`, `masks/*`.

## 3. Entrega mínima (18/09)

Ordem de desenho em cada quadro:

1. **Céu**: gradiente vertical na faixa acima do horizonte (o fundo pintado já tem grama até em cima; o céu só aparece se o `backdrop` tiver área transparente no topo; se não tiver, pular). Cores por horário: 6 a 10 h `#9fd3ff` para `#e8f4ff`; 10 a 16 h `#79bdf2` para `#cfe9ff`; 16 a 19 h `#f5a463` para `#ffd9a3`; 19 a 6 h `#0e1a3a` para `#243a6b` com lua (`ui/moon.webp`, 64 px, canto superior direito) e 30 estrelas fixas (seed pela data).
2. **Nuvens**: duas cópias de `clouds.png` deslizando devagar (12 px por segundo, alphas 0,5 e 0,3), só de dia; à noite alpha 0,15.
3. **Fundo**: `backdrop-day.png` inteiro.
4. **Sombras**: elipse escura (alpha 0,25) sob cada construção, personagem e NPC, largura 70% do sprite.
5. **Sprites ordenados por `y` da base** (o que está mais abaixo desenha por cima): construções (nível 0 = `placa.png` a 60% da largura do lote, centrada; nível 1 a 3 = `buildings/<id>-<n>.png` escalado para `w` do lote, ancorado na base), personagem (`characterBaseSrc` já existente, altura `character.h`), NPCs. Balanço de repouso: personagem e NPCs sobem e descem 2 px a cada 600 ms com fases diferentes; construções paradas.
6. **Partículas**: fumaça da Fornalha quando nível 1 ou mais: até 5 círculos cinza (alpha 0,5 caindo para 0) subindo 20 px por segundo e crescendo, nascendo em `lot.x + smokeOffset.dx`, `lot.y + smokeOffset.dy`; vagalumes à noite: 10 pontos amarelos (raio 2) com deriva senoidal e pisca; reflexo da água: faixa clara com alpha oscilando 0,1 a 0,2 no retângulo `water`.
7. **Luz por horário**: `fillRect` com `globalCompositeOperation = 'multiply'`: manhã `rgba(255,240,210,0.15)`, dia nada, tarde `rgba(255,170,90,0.28)`, noite `rgba(30,45,110,0.60)`. À noite, com `globalCompositeOperation = 'lighter'`, um `glow.png` (ou gradiente radial) alpha 0,5 em cada `lights[]`, nas janelas das construções construídas (centro do lote, raio 40) e ao lado do personagem (tocha: `ui/torch.webp` 24 px na mão, com flicker de alpha 0,8 a 1,0).
8. **Rótulos**: nome sob cada NPC ("Sábio", "Comerciante") em Fredoka 13 px branca com contorno preto de 3 px; nome do personagem (`village.characterName`) sob ele.
9. **Hover e clique**: hotspots = retângulos dos lotes, do personagem e dos NPCs (convertidos pela escala real do canvas). Ao passar o mouse: contorno arredondado branco alpha 0,6 com brilho e `cursor: pointer` só ali; fora, cursor normal. Clique chama o `onClickSpot(id)` que já existe (`build:<id>`, `character`, `npc:sabio`, `npc:comerciante`).
10. **Cadeado da prova** (`gated`): sobre cada lote (nunca sobre o personagem) um cadeado de 28 px desenhado no canvas e o sprite do lote com `filter: grayscale(1) brightness(.6)` (desenhar num canvas auxiliar com `ctx.filter`); tooltip no hover "Faça a prova do dia".
11. **Balão de fala no canvas**: quando `speech` (nova prop `{ npc: 'sabio' | 'comerciante', text }`) existir, desenhar um balão branco arredondado com rabo apontando para o NPC, texto Fredoka 14 px preto quebrando em 240 px, animação de entrada (escala 0,8 para 1 em 150 ms) e saída ao clicar em qualquer lugar ou após 6 s. `VillageHome` deixa de mostrar o cartão abaixo do canvas quando a cena está visível.
12. **Desempenho e acessibilidade**: `requestAnimationFrame` limitado a 30 quadros por segundo, parado quando a aba está oculta (`visibilitychange`) ou o canvas está fora da tela (`IntersectionObserver`); imagens carregadas uma vez (cache por URL) e **redesenho no `onload`** de cada uma (hoje a cena fica vazia quando uma imagem chega depois do primeiro quadro); `prefers-reduced-motion`: sem balanço, sem partículas, sem nuvens, mas tudo desenhado.
13. **Larguras menores**: o canvas escala pelo CSS; hotspots usam `canvas.getBoundingClientRect()` para converter; nada de `scrollWidth` acima da tela.

Remover: os tiles (`grass-path`, cubos `ui/grass`), as posições fixas dos cadeados, o `forEach` vazio e qualquer constante de grade em `VillageScene.tsx`/`config/village.ts` que só servia ao tile.


## 3b. Cartão da construção (entra junto com a cena; pedido do pai em 15/09)

Problema: clicar numa construção da cena abre a Oficina inteira (três abas, lista de todas as construções). Confuso: cada construção precisa ter a própria cara e a própria função, e tocar nela abre isso.

Novo componente `src/components/hero/village/BuildingCard.tsx` (modal `mc-panel`, 560 px), aberto por `onClickSpot('build:<id>')` no lugar da Oficina (respeitando o portão da prova como hoje):

- Cabeçalho: sprite do nível atual (ou `placa.png` no nível 0) em `mc-slot` 96 px, nome bilíngue, três marcadores de nível (1, 2, 3) com o atual aceso.
- "O que faz agora": o efeito do nível atual (`BUILDINGS[id].effects[level]` de `config/englishBase.ts`); no nível 0, "Ainda não construída".
- "Próximo nível": efeito do nível seguinte, custo com ícones de material (`MATERIAL_ICONS`) e o botão **Construir** (nível 0) ou **Melhorar** (1 e 2), com o mesmo fluxo e a mesma validação da aba Construir da Oficina (`canBuild`, `buildUpgrade`, toast "Fornalha chegou ao nível 2", som `playLevelUp`); desabilitado com "Falta 2 pedra" ou "Bloqueada: precisa de Fornalha e Baú nível 1". No nível 3: "Nível máximo".
- **Ação própria** de cada construção (um botão grande `mc-btn-green` abaixo):
  - Fornalha: "Ir para a Mina" (abre o distrito Mina; é lá que o efeito dela age).
  - Baú: "Ver meu inventário": aba dentro do cartão com materiais, raros, equipamentos craftados e cosméticos comprados (só leitura; ícones existentes).
  - Torre: "Abrir a Torre" (conquistas; recordes na Etapa 2).
  - Mesa de Encantamento: "Escolher o tema de amanhã" (a mesma escolha que já existe na Base, seção da Mesa; se não houver tela própria, abrir a Mina no cartão da Mesa).
  - Cerca e Campinho: sem ação ainda; texto "Efeito chega na Etapa 2" / "Campinho abre na Etapa 4" em `mc-muted`.
  - Cofre (Etapa 2): "Abrir o Cofrinho".
- Rodapé: "Ver todas as construções" abre a Oficina na aba Construir (a Oficina continua existindo pela grade de distritos e pela hotbar, com Equipamentos e Ferreiro).

Aceite: fotos do cartão da Fornalha nível 1 (com "Melhorar" e custo), de um lote vazio (com "Construir") e do inventário do Baú; construir pelo cartão e pela Oficina dá o mesmo resultado no Firestore; portão da prova continua valendo no clique da cena.

Os efeitos, textos e ações de cada construção estão em `docs/VILA_CONSTRUCOES.md` (fonte de verdade); reescrever os textos de `buildings.effects` em `config/englishBase.ts` com as frases de lá e deixar o Campinho não construível ("Abre na Etapa 4").

## 3c. Loja da Vila em "Em breve" (obrigatório, pequeno)

Decisão do pai em 15/09: a Loja da Vila só volta com o Sistema de itens da Etapa 2. `settings/modules.shop` já está `false`. Na aba "Loja da Vila" do Mercado, com `modules.shop === false`: nenhum item; placa `mc-paper` com `npc/comerciante.png` e "Em breve: o Comerciante está arrumando a barraca. Por enquanto, seu gold vale nos Prêmios de verdade." O editor de personagem mostra só peças grátis e as já compradas, sem preço nem "Ver na loja". Detalhe em `docs/etapas/REVISAO_ETAPA_1.md`, seção 14.

## 4. Se sobrar tempo (não atrasa a entrega)

Parallax leve (fundo desloca 4 px ao mover o mouse), zoom suave no lote ao clicar (150 ms, escala 1,08 e volta), pássaro cruzando a tela a cada 40 a 90 s, Ferreiro e Olheiro na cena (`npc/ferreiro.png`, `npc/olheiro.png`, âncoras `npcs.ferreiro`/`npcs.olheiro` quando existirem no JSON), animação de construção (`mc-build` em canvas: 3 quadros de poeira quando o nível sobe).

## 5. Aceite

Fotos em `docs/exemplos/telas/cena-v2/` a 1280 px com o parâmetro DEV `?h=9`, `?h=14`, `?h=18` e `?h=22` (já existe), mais: hover num lote, balão do Sábio, `?quiz=lock`, um lote nível 0 e um construído, e a versão a 390 px. Sem erro de console. `npx tsc --noEmit -p tsconfig.app.json`, `npx eslint src --max-warnings 6`, `npm run test:english`, `npx vite build`. Relatório curto em `docs/etapas/RELATORIO_ETAPA_1B.md`. Sem commit.

## 6. Prompt para colar no Cursor

"Leia `docs/etapas/ETAPA_1B_CENA_V2.md` inteiro e `docs/MINER_MISSIONS_TEMA.md`. Reescreva `src/components/hero/village/VillageScene.tsx` conforme a seção 3 e crie o cartão da construção da seção 3b (leia também `docs/VILA_CONSTRUCOES.md`), usando `public/assets/village/scene/backdrop-day.png` e `anchors.json` (se o JSON ainda não existir, use o exemplo da seção 2). Além de `VillageScene.tsx`, toque só em `VillageHome.tsx` (passar `speech`, tirar o cartão de fala, abrir o `BuildingCard` no clique do lote), `BuildingCard.tsx` (novo), `config/englishBase.ts` (textos de efeito) e `docs/VILA_API.md`. Ao final, tire as fotos da seção 5, rode as verificações e escreva `docs/etapas/RELATORIO_ETAPA_1B.md`. Sem commit."
