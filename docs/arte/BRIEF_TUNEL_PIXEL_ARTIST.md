# Especificação das folhas de animação do Túnel (Miner Missions)

Escrito em 19/09/2026 como brief para artista; o pai decidiu não contratar, então este arquivo é a **especificação** que a geração por IA (gpt-image quadro a quadro e PixelLab por esqueleto) precisa cumprir e o aceite que o líder aplica na prancha.

## O jogo

Miner Missions é um jogo educativo para uma criança de 10 anos: uma vila de mineração em pixel art (estilo Stardew Valley, vista 3/4) e minijogos em tela cheia. O Túnel é um jogo de ação de rolagem lateral em que o herói desce uma mina e enfrenta bichos cômicos; cada golpe certo é uma resposta certa. Referências de tom: Stardew Valley, Celeste (peso e clareza), Dead Cells (impacto), sempre fofo e legível, nunca assustador.

## Estilo (obrigatório, para casar com o que já existe)

- Pixel art 1:1, contorno preto simples de 1 px, sombra básica em duas ou três tons, paleta quente (marrons, laranjas de lanterna, azul escuro de rocha, verde musgo). Sem anti-aliasing fora da paleta, sem gradientes.
- Tamanho da célula: herói 64x64; inimigos 64x64 (morcego, aranha), 80x80 (golem), chefe 128x128. O personagem ocupa a célula com pés na linha de base a 4 px do fundo.
- Vista lateral; herói olhando para a direita, inimigos para a esquerda (o motor espelha quando precisa).
- Entrega em PNG com fundo transparente, uma folha por ação (quadros lado a lado, todos na mesma célula), mais os PNGs soltos, e um JSON simples com `frames` e `fps` por ação. Arquivo fonte (Aseprite) incluído.

## Referências que mandam (anexar)

- `public/assets/village/char/miner-ref.png` e `char/miner-walk.png` (o herói e o andar atual: cores, capacete amarelo com lanterna, camisa azul, calça marrom, picareta de madeira).
- `public/assets/village/tunnel/bat-base.png`, `spider-base.png`, `golem-base.png`, `mole-boss.png` (as bases aprovadas dos inimigos; manter cores e proporções).
- `public/assets/village/scenes/tunel/backdrop-a.png` (o cenário onde tudo aparece; testar a leitura dos sprites sobre ele).
- `public/assets/village/scene/backdrop-day.png` e os sprites de `public/assets/village/npc/` (a vila; mesmo traço).

## Lista de ações

**Herói** (64x64):
1. Parado (idle), 4 quadros, respiração leve.
2. Correr, 8 quadros, picareta no ombro, passada larga.
3. Golpe (ataque), 6 quadros: preparação, corte por cima com rastro (smear) de 1 quadro, recuperação.
4. Golpe especial, 6 quadros: giro completo com rastro maior (usado no combo).
5. Apanhar, 4 quadros: recuo curto, mão no peito, volta.
6. Cair, 5 quadros: joelhos dobram, senta, deita de costas; cômico, sem sangue.

**Morcego das Palavras** (64x64): voar (4), atacar (4, mergulho curto), apanhar (3), cair (4, gira e cai de costas com as asas abertas).
**Aranha de Redstone** (64x64): andar (6), atacar (4, pulo curto), apanhar (3), cair (4, vira de barriga para cima).
**Golem de Cálculo** (80x80): andar (6, pesado), atacar (4, soco), apanhar (3), cair (4, desmonta em pedras).
**Toupeira chefe** (128x128): andar (6), atacar (4, garra), apanhar (3), cair (5, afunda no chão), mais 1 quadro "levanta as três placas".

Cada inimigo carrega um **cartaz de madeira** (uma placa presa a ele); o cartaz é desenhado à parte, em 3 tamanhos (48x32, 64x40, 96x56), para o motor escrever o texto por cima.

## Efeitos (folhas pequenas, 32x32 ou 48x48)

Corte (3), poeira de impacto (4), faíscas (4), cartaz virando pó (5), coração cheio e vazio (2), estrela de combo (4), coruja pequena descendo (a Coruja do Sábio, 48x48, 4 quadros de voo e 1 pousada).

## Aceite

- Prancha com todas as folhas em escala 2x sobre o `backdrop-a.png`; lemos cada ação em movimento (gif ou vídeo curto por ação).
- Nenhum quadro muda a cor da roupa, o tamanho da cabeça ou a mão da picareta; a picareta nunca some.
- Contorno e paleta iguais aos das referências; nada de estilo "HD" ou anime.
- Duas rodadas de ajuste incluídas.

Geração: `scratchpad/cena/gen-frames.cjs` (gpt-image, um quadro por chamada) + `frames-to-sheet.cjs` (folha 64 px), ou `scripts/pixellab-skel.cjs` com `docs/arte/esqueletos.json`.
