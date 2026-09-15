# Pipeline de arte por IA (PixelLab) para o Miner Missions

Decisão do pai (15/09/2026): toda a arte é gerada por IA, sem ninguém desenhar; o Aseprite entra só para automação (paleta, recorte, folhas), nunca para desenhar à mão. Prova de estilo aprovada em `docs/exemplos/prova-de-estilo.png` (personagem com equipamentos, itens, três níveis da Fornalha, Baú, Campinho, NPCs e chão), sprites em `public/assets/village/`.

## Serviço

- **PixelLab** (`https://api.pixellab.ai/v1`, `Authorization: Bearer <chave>`). Chave em `.env` como `PIXELLAB_API_KEY` (gitignored; só scripts em Node a leem; nunca vai para o bundle). OpenAPI em `https://api.pixellab.ai/v1/openapi.json`. Plano cobra por geração; `GET /balance` mostra saldo em dólar quando for pré-pago.
- Endpoints usados: `POST /generate-image-pixflux` (texto → sprite), `POST /generate-image-bitforge` (texto + `style_image`/`init_image`/`color_image`), `POST /inpaint` (repintar região com máscara), `POST /animate-with-text` e `/animate-with-skeleton` (quadros), `POST /rotate`.
- Tempo: 15-45 s por imagem. Gerar em lote, em segundo plano, com cache por arquivo (não regenerar o que já existe).

## Regras que aprendemos (calibração de 15/09)

1. **Tamanhos fixos por classe de asset**: personagem e NPC 64x64; item de inventário 32x32; construção 96x96; tile de chão 64x64; ícone de interface 32x32 ou 64x64. `style_image` precisa ter exatamente o tamanho da saída (a API recusa 64 para saída 96).
2. **Parâmetros que dão o estilo do jogo**: `outline: 'single color black outline'`, `shading: 'basic shading'`, `detail: 'medium detail'`, `no_background: true`; personagens `view: 'side'`, `direction: 'south'`; construções `view: 'low top-down'`; tiles `view: 'high top-down'`, `outline: 'lineless'`, `shading: 'flat shading'`, `no_background: false`. `negative_description` sempre com "blurry, text, watermark"; em construções acrescentar "people, characters, faces".
3. **Personagem e NPCs**: `pixflux` direto, prompt com roupa, cores, ferramenta, "full body, standing idle, facing the viewer, pixel art game sprite". Um seed fixo por personagem (repetível). NPCs com `bitforge` + `style_image` = personagem base (64x64) e `style_strength` 60 ficam no mesmo traço.
4. **Equipamentos no personagem**: NÃO usar `init_image` (mantém tudo igual e ignora a mudança). Usar `inpaint` com máscara branca só na região a trocar (máscaras em `public/assets/village/masks/`: capacete = x 14..50, y 2..26; picareta = x 30..62, y 4..38; torso = x 14..50, y 24..44) e descrição da peça ("gray IRON mining helmet with a headlamp"). O resto do sprite fica idêntico, então as variantes se sobrepõem perfeitamente.
5. **Construções**: NÃO usar personagem como `style_image` (contamina: pedra com rosto). Gerar com `pixflux`, mesmo `seed` para todas as construções da vila, mesma estrutura de prompt ("small/medium/large village <tipo>, cobblestone walls, wooden plank roof, <detalhes que crescem por nível>, cute game building sprite"). Os três níveis saem coerentes e crescentes.
6. **Itens** (Oficina, Loja, materiais): `pixflux` 32x32, "game item icon", seed fixo por família.
7. **Animação**: `animate-with-text` sem `init_images` (com eles a API deu erro de shape); com `reference_image` = sprite base e `image_guidance_scale` alto (2 a 2,5). Perdeu fidelidade na primeira tentativa (picareta sumiu); para a cena viva, balanço e comemoração são feitos por código sobre o sprite parado. Animação real fica para a Etapa 4, se valer.
8. **Consistência final**: todo asset passa por um pós-processo em Node (`sharp`): confirmar tamanho, fundo transparente, e (Etapa 1) quantização para a paleta única do jogo (32 cores, arquivo `public/assets/village/palette.png`) por vizinho mais próximo. Montar sempre uma folha de contato (`sheet.png`) antes de aprovar um lote.
9. **Curadoria**: gerar 2-3 variantes (seeds diferentes) e escolher; refugo de ~1 em 3 é normal e custa centavos.

## Script (Etapa 1)

`scripts/pixellab-gen.mjs`: lê um manifesto JSON (`docs/arte/manifesto.json`: lista de assets com `file`, `endpoint`, `body`, `mask?`) e gera o que faltar em `public/assets/village/`, com pós-processo e folha de contato; `--only <prefixo>` e `--force` para regenerar. O manifesto é a fonte de verdade da arte: nomes e prompts versionados no git.

## Lista de assets da Etapa 1 (manifesto inicial)

- Personagem: base (feito), capacete de ferro (feito), picareta de pedra/ferro/ouro/diamante (diamante feito), botas, capa, camisa do time (feito), 3 penteados, 4 peles (inpaint no rosto/cabelo).
- NPCs: Comerciante (feito), Sábio (feito), Ferreiro, Olheiro.
- Construções (96x96, níveis 1-3): Fornalha (feita), Baú (n1 feito), Cerca, Torre, Mesa de Encantamento, Campinho (n1 feito), Cofre (Etapa 2); placa de lote vazio.
- Itens (32x32): picaretas x5, capacete de ferro (feito), botas (feitas), lanterna, capa, materiais (usar os ícones já existentes de madeira/pedra/ferro/redstone), esmeralda e diamante (existentes), baú fechado/aberto do dia, baú das tochas.
- Cena: tile de grama com caminho (feito), tile de grama pura, tile de pedra, cerca, árvore, tocha de chão, fumaça (3 quadros), céu dia/noite (gradiente por código).
