# Pipeline de arte por IA (PixelLab) para o Miner Missions

Decisão do pai (15/09/2026): toda a arte é gerada por IA, sem ninguém desenhar; o Aseprite entra só para automação (paleta, recorte, folhas), nunca para desenhar à mão. Prova de estilo aprovada em `docs/exemplos/prova-de-estilo.png` (personagem com equipamentos, itens, três níveis da Fornalha, Baú, Campinho, NPCs e chão), sprites em `public/assets/village/`.

## Serviço

- **PixelLab** (`https://api.pixellab.ai/v1`, `Authorization: Bearer <chave>`). Chave em `.env` como `PIXELLAB_API_KEY` (gitignored; só scripts em Node a leem; nunca vai para o bundle). OpenAPI em `https://api.pixellab.ai/v1/openapi.json`. Plano cobra por geração; `GET /balance` mostra saldo em dólar quando for pré-pago.
- Endpoints usados: `POST /generate-image-pixflux` (texto → sprite), `POST /generate-image-bitforge` (texto + `style_image`/`init_image`/`color_image`), `POST /inpaint` (repintar região com máscara), `POST /animate-with-text` e `/animate-with-skeleton` (quadros), `POST /rotate`.
- Tempo: 15-45 s por imagem. Gerar em lote, em segundo plano, com cache por arquivo (não regenerar o que já existe).

## Regras que aprendemos (calibração de 15/09)

1. **Tamanhos fixos por classe de asset**: personagem e NPC 64x64 (cena escala para ~96 px); item de inventário 32x32; construção 96x96 (cena escala à largura do lote); tile de chão só no manifesto legado — a Vila v2 usa fundo pintado 1280x640. `style_image` precisa ter exatamente o tamanho da saída (a API recusa 64 para saída 96).
2. **Câmera da Vila (Etapa 1B + direção 15/09)**: construções `view: 'low top-down'`; personagem e NPCs novos também `low top-down` (os sprites de lado continuam até o lote isométrico chegar). UI: `create_ui_asset` + 9-slice. Não misturar cubo Minecraft (`grass.webp`) com casas isométricas.
3. **Parâmetros que dão o estilo do jogo**: `outline: 'single color black outline'`, `shading: 'basic shading'`, `detail: 'medium detail'`, `no_background: true`; tiles legado `view: 'high top-down'`, `outline: 'lineless'`. `negative_description` sempre com "blurry, text, watermark"; em construções acrescentar "people, characters, faces".
4. **Personagem e NPCs**: `pixflux` direto, prompt com roupa, cores, ferramenta, "full body, standing idle, facing the viewer, pixel art game sprite". Um seed fixo por personagem (repetível). NPCs com `bitforge` + `style_image` = personagem base (64x64) e `style_strength` 60 ficam no mesmo traço.
5. **Equipamentos no personagem**: NÃO usar `init_image` (mantém tudo igual e ignora a mudança). Usar `inpaint` com máscara branca só na região a trocar (máscaras em `public/assets/village/masks/`: capacete = x 14..50, y 2..26; picareta = x 30..62, y 4..38; torso = x 14..50, y 24..44) e descrição da peça ("gray IRON mining helmet with a headlamp"). O resto do sprite fica idêntico, então as variantes se sobrepõem perfeitamente.
6. **Construções**: NÃO usar personagem como `style_image` (contamina: pedra com rosto). Gerar com `pixflux`, mesmo `seed` para todas as construções da vila, mesma estrutura de prompt ("small/medium/large village <tipo>, cobblestone walls, wooden plank roof, <detalhes que crescem por nível>, cute game building sprite"). Os três níveis saem coerentes e crescentes.
7. **Itens** (Oficina, Loja, materiais): `pixflux` 32x32, "game item icon", seed fixo por família.
8. **Animação**: `animate-with-text` sem `init_images` (com eles a API deu erro de shape); com `reference_image` = sprite base e `image_guidance_scale` alto (2 a 2,5). Perdeu fidelidade na primeira tentativa (picareta sumiu); para a cena viva, balanço e comemoração são feitos por código sobre o sprite parado. Animação real fica para a Etapa 4, se valer.
9. **Consistência final**: todo asset passa por um pós-processo em Node (`sharp`): confirmar tamanho, fundo transparente, e (Etapa 1) quantização para a paleta única do jogo (32 cores, arquivo `public/assets/village/palette.png`) por vizinho mais próximo. Montar sempre uma folha de contato (`sheet.png`) antes de aprovar um lote.
10. **Curadoria**: gerar 2-3 variantes (seeds diferentes) e escolher; refugo de ~1 em 3 é normal e custa centavos.

## Script (Etapa 1)

`scripts/pixellab-gen.mjs`: lê um manifesto JSON (`docs/arte/manifesto.json`: lista de assets com `file`, `endpoint`, `body`, `mask?`) e gera o que faltar em `public/assets/village/`, com pós-processo e folha de contato; `--only <prefixo>` e `--force` para regenerar. O manifesto é a fonte de verdade da arte: nomes e prompts versionados no git.

## Lista de assets da Etapa 1 (manifesto inicial)

- Personagem: base (feito), capacete de ferro (feito), picareta de pedra/ferro/ouro/diamante (diamante feito), botas, capa, camisa do time (feito), 3 penteados, 4 peles (inpaint no rosto/cabelo).
- NPCs: Comerciante (feito), Sábio (feito), Ferreiro, Olheiro.
- Construções (96x96, níveis 1-3): Fornalha (feita), Baú (n1 feito), Cerca, Torre, Mesa de Encantamento, Campinho (n1 feito), Cofre (Etapa 2); placa de lote vazio.
- Itens (32x32): picaretas x5, capacete de ferro (feito), botas (feitas), lanterna, capa, materiais (usar os ícones já existentes de madeira/pedra/ferro/redstone), esmeralda e diamante (existentes), baú fechado/aberto do dia, baú das tochas.
- Cena: tile de grama com caminho (feito), tile de grama pura, tile de pedra, cerca, árvore, tocha de chão, fumaça (3 quadros), céu dia/noite (gradiente por código).

## Lote gerado em 15/09 (Etapa 1)

`node scripts/pixellab-gen.cjs --sheet` gerou os 79 sprites do manifesto sem falhas (folha de contato em `public/assets/village/sheet.png`; ordem: buildings, char, items, npc, pets, rewards, tiles). Dois foram refeitos depois de olhar a folha, com prompt ajustado no manifesto: `buildings/placa.png` (saiu como estacas sem placa; agora é a placa de madeira no terreno vazio) e `rewards/amigo.png` (saiu como silhuetas pretas; agora são duas crianças coloridas). Observação de curadoria: a Mesa de Encantamento nos níveis 2-3 fica roxa e diferente das outras construções de propósito (prompt "enchanting library"); se o pai não gostar, regenerar com `--only buildings/mesa --force` depois de trocar a descrição. Aprovação do lote pelo pai: pendente.

## Regra de aceite do líder (19/09/2026; a Lei da Excelência de `.cursor/rules/lei-excelencia-aaa.mdc` vale para a arte)

Nenhum sprite, fundo ou ícone entra no jogo sem passar por três portas: (1) gerar pelo manifesto; (2) montar a prancha (`sharp`, 96 px, fundo escuro) e **olhar** cada peça: se não se reconhece sem o nome, refaz com prompt mais concreto (caso real de 18/09: capacete virou casa, tocha virou farol, bola virou bolo; refeitos); (3) só então apontar o código para o arquivo, e fotografar a tela onde ele aparece. Conjuntos sempre no mesmo estilo (um prompt de estilo por conjunto), nunca misturar fontes (`ui/`, `images/`, `village/`) numa mesma tela. Lote do Comerciante (19/09): `public/assets/village/merchant/spot-*.png` (12 lugares, 96 px) e `item-*.png` (17 itens, 64 px), todos conferidos.

## Lição de 19/09: animação de personagem não sai do `animate-with-text`

Dois ciclos para o herói do Túnel (corrida, apanhar, cair), com referência e `image_guidance_scale` 2,2 e 2,8: a picareta some ou vira rastro, quadros inventam formas, o personagem não cai. Só o golpe (movimento grande e curto) ficou usável. Regra a partir daqui: PixelLab gera **bases paradas, props, ícones, fundos por inpaint e no máximo um golpe ou salto**; folhas de ação de personagem (andar, atacar, apanhar, cair) são de **pixel artist contratado** (`docs/arte/BRIEF_TUNEL_PIXEL_ARTIST.md`) ou de animação por código sobre partes separadas. Script de animação: `scripts/pixellab-anim.cjs` com `docs/arte/animacoes.json` (fica para props e golpes).

## Pipeline de animação aprovado (19/09): gpt-image quadro a quadro

Testados no mesmo dia, com o herói do Túnel: (1) PixelLab `animate-with-text`, dois ciclos, reprovado (perde a picareta, inventa formas); (2) PixelLab `animate-with-skeleton` (`scripts/pixellab-skel.cjs`, poses em coordenadas), reprovado (identidade boa, poses ignoradas); (3) **gpt-image-1 `/images/edits` com a referência do personagem, um quadro por chamada, a pose descrita em texto, fundo magenta**: aprovado. A identidade é a mesma em todos os quadros e cada pose sai de verdade (corrida com quatro passadas, apanhar de olhos fechados, cair deitado com estrelinhas). Custo por quadro em torno de US$ 0,04 na qualidade média. Ferramentas no repositório: `docs/arte/quadros.json` (personagem, referência, descrição, ações e poses), `node scripts/gpt-frames.cjs <personagem> [ação]` (gera `docs/arte/quadros/frame-<p>-<ação>-<n>.png`, 1024 px, fora do git), `node scripts/frames-to-sheet.cjs <personagem> <ação> [célula]` (tira o magenta e a franja, recorta, alinha os pés, reduz sem borrar, grava `public/assets/village/tunnel/<p>-<ação>.png` e o `.json` com o número de quadros, e a prancha `board-*.png`). Regra de aceite: prancha em 3x lida pelo líder; quadro que muda roupa, cabeça ou some com a ferramenta é refeito com a pose reescrita.

