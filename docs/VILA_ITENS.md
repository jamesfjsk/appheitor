# Itens da Vila: um padrão só para tudo que ele tem, veste, usa e compra

Documento de desenho (fonte de verdade a partir de 15/09/2026). Vale para cosméticos, equipamentos, materiais, raros, presentes de nível, conteúdo do Baú e ícones de prêmio. Entra em código na Etapa 2, Lote 1 (`docs/etapas/ETAPA_2_BANCO_E_TEMPORADA.md`, seção 17).

## Problema (auditoria de 15/09)

A Loja da Vila e o editor de personagem não seguem um padrão: itens com ícone e sem ícone na mesma lista, "Camisa do time" sem imagem, cores de pele como quadrados lisos, nada mostra o que ele já tem nem o que está equipado, comprar não dá resposta visual, clicar num item não comprado fecha o editor. Ele não tem um inventário. Está cru.

## Princípios

1. **Todo item é a mesma coisa na tela**: um `ItemSlot` (quadrado `mc-slot`) com ícone pixel, moldura de raridade, nome, e um **estado** visível. Loja, inventário, editor, Ferraria, presente de nível, Baú do Dia e Comerciante usam o mesmo componente. Se a Loja mostra um item de um jeito e o editor de outro, está errado.
2. **Todo item tem ícone**. Sem ícone, não entra no catálogo (o filtro `hasSprite` da Etapa 1 continua até a arte existir; o líder gera o que falta).
3. **Estado sempre visível**: `bloqueado` (nível mínimo ou etapa), `à venda` (preço), `seu` (comprado, não equipado), `equipado`, `novo` (comprado ou ganho e ainda não visto), `em breve`.
4. **Ver antes de gastar**: qualquer cosmético pode ser **experimentado** no personagem antes de comprar. Comprar mostra antes e depois.
5. **Resposta ao comprar ou ganhar**: som, o ícone voa para a mochila, selo "Novo" no item e no botão da mochila, pergunta "Equipar agora?".
6. Nada de raridade que muda preço por sorte: a moldura é só leitura ("isto é especial"), o preço vem da economia.

## Modelo (código: `src/config/items.ts`, tipos em `src/types/items.ts`)

```
Item {
  id, name, kind: 'cosmetic' | 'gear' | 'material' | 'rare' | 'reward_icon' | 'milestone',
  slot?: 'skin' | 'hair' | 'shirt' | 'pants' | 'hat' | 'cape' | 'pet' | 'pickaxe' | 'helmet' | 'boots' | 'lamp',
  icon: string (32 ou 64 px, transparente), sprite?: string (camada no personagem),
  rarity: 'comum' | 'raro' | 'epico' | 'exclusivo',
  description: string (uma linha: o que é ou o que faz),
  price?: number (gold, cosméticos), cost?: Record<Material, number> + rare? (equipamentos),
  minLevel?: number, stage?: number (etapa em que passa a existir), source: 'loja' | 'oficina' | 'patente' | 'marco' | 'npc' | 'evento' | 'gratis'
}
```
Catálogos atuais (`COSMETICS`, `GEAR` em `config/village.ts`, `REWARD_ICONS`) passam a ser gerados a partir desta lista, sem duplicar dados. Estado do jogador continua onde está (`village.owned`, `village.character`, `village.gear`, `englishBase.materials`, `village.rare`); `village.newItems: string[]` guarda o que ainda tem selo "Novo".

Moldura por raridade (`public/assets/village/ui/frame-<rarity>.png`, 48 x 48, 9-slice): comum = madeira, raro = ferro azulado, épico = ouro, exclusivo = diamante com brilho. Cosméticos comuns da Loja = comum; pets e capas = raro; coroa e itens premium = épico; presentes de patente, marcos e de NPC = exclusivo (nunca vendáveis).

## As telas

### Mochila do Minerador (inventário)

Abre pelo cartão do Baú (construção), pelo botão "Mochila" na grade de distritos e pela tecla I. Abas:

- **Equipado**: o personagem em grande (canvas do editor) com os **slots ao redor** como boneco de papel: cabeça (chapéu), rosto (pele e cabelo), corpo (camisa), pernas (calça), costas (capa), mão (picareta), lado (pet), pés (botas), luz (lanterna). Cada slot mostra o item equipado ou o contorno vazio; clicar abre a lista daquele slot (Roupas ou Equipamentos) já filtrada.
- **Roupas e acessórios**: grade de `ItemSlot` com tudo que ele tem, por slot; "Equipar", "Tirar" (cada slot tem a opção "nenhum" quando faz sentido: chapéu, capa, pet); "Novo" nos recém-ganhos.
- **Equipamentos**: picareta, capacete, botas, lanterna, capa com o nível atual e o efeito em uma linha; forjar é na Ferraria ("Ir para a Ferraria").
- **Materiais e raros**: madeira, pedra, ferro, redstone, esmeralda, diamante com quantidade grande em `mc-num`; "De onde vem" em uma linha cada.
- Rodapé: total de itens, cosméticos ganhos por amizade e por patente com o nome de quem deu.

### Loja da Vila (Mercado)

- Cabeçalho com o saldo (`gold.webp` + número grande) e o "dia de renda" ("você ganha cerca de 45 gold por dia").
- Filtros em chips: Tudo, Chapéus, Capas, Pets, Roupas, Premium; ordenação padrão: o que ele pode comprar agora primeiro, depois por preço.
- Grade de `ItemSlot` (4 por linha a 1280 px): ícone, moldura, nome, preço com ícone de gold, "cerca de N dias no seu ritmo" (pela renda real), estado: "Seu", "Equipado", "Nível 15", "Em breve". Sem imagem = não aparece.
- Clicar abre o **cartão do item**: ícone grande, descrição, preço, e o personagem com o item **experimentado** (preview em canvas, sem salvar), botões "Comprar" e "Só olhar". Confirmação: "Com 60 gold você leva o Capacete decorativo. Sobram 40. Ou guarda para o prêmio X." Depois: som, o ícone voa para o botão da Mochila, "Equipar agora?".
- Itens exclusivos aparecem numa faixa separada "Só se ganha" com a origem (patente 10, amizade do Ferreiro), sem botão de compra.

### Editor de personagem

- Vira a aba **Equipado** da Mochila (um lugar só). Miniaturas de pele mostram o **rosto do minerador** com aquela pele (recorte do sprite pela máscara do rosto), não um quadrado de cor; cabelo e roupa idem (recorte do sprite recolorido). Item não comprado aparece com cadeado, preço e o botão "Ver na loja" **sem fechar** o editor; o rascunho fica.
- "Experimentar" e "Salvar" separados; ao salvar, o avatar do cabeçalho e a cena mudam na hora.

### Ferraria (a Oficina deixa de ser uma lista solta)

Hoje a Oficina é uma terceira tela desconectada da Loja e do personagem: lista cinza de equipamentos, "Faltam materiais" sem dizer quanto, "Na ordem" sem explicar, itens "visual nesta etapa" que gastam material sem fazer nada, e o que ele crafta não aparece em lugar nenhum.

- **É o fogo do Ferreiro.** Fornalha e Ferraria são o mesmo lugar. O lote da Fornalha (nível 1+) abre a aba **Fogo**; a tecla O e a Mochila abrem **Forjar**. O Ferreiro na cena continua falando pelo sistema de diálogos. Abas: **Fogo** (máquina: fundir 3 por 1 no nível 2, queima no nível 3), **Forjar** (equipamentos) e **Obras** (visão geral, só leitura, cada linha abre o cartão da construção). A aba "Construir" some: construir é no cartão de cada construção.
- **Mesmo padrão de item.** Cada equipamento é um `ItemSlot` com moldura de raridade (pedra comum, ferro raro, ouro épico, diamante exclusivo; botas e capacete raros; lanterna e capa épicos), o efeito em uma linha e o custo como chips **tenho/preciso** ("6/10 ferro" em vermelho quando falta, verde quando dá), não texto solto. "Na ordem" vira "Precisa da picareta de ferro antes" com o ícone dela.
- **Ver no corpo.** Ao selecionar um equipamento, o minerador ao lado (o mesmo `CharacterPreview` da Loja e da Mochila) aparece com ele; os sprites já existem (`miner-iron-helmet`, `miner-diamond-pickaxe`, botas, capa). Forjar tem cerimônia: o Ferreiro martela (dois quadros por inpaint, três sons de bigorna), faísca em partículas, o item aparece no minerador e vai para a Mochila com "Novo".
- **Sem gastar em nada.** Equipamento cujo efeito ainda não existe em código não pode ser forjado: botão "Abre na Etapa 2" (capacete, lanterna); a capa é visual de propósito e diz isso ("Capa: só estilo, e estilo conta"). O texto "Visual nesta etapa" some.
- **Materiais à mão.** No topo, os chips de materiais com quantidade e "de onde vem" ao passar o mouse (madeira: missões da manhã; pedra: tarde; ferro: noite; redstone: Mina e Fornalha nível 3).
- **Ligações.** Mochila > Equipamentos tem "Ir para a Ferraria"; a Ferraria tem "Abrir a Mochila"; a Loja não vende equipamento e a Ferraria não vende cosmético, e os dois dizem isso quando ele procura no lugar errado ("Chapéu é com o Comerciante").

### Onde mais o padrão aparece

Presente de nível (três `ItemSlot` de material para escolher), conteúdo do Baú do Dia (`ItemSlot` com "+2" no canto), Comerciante (o que ele vende, com quantidade), Ferraria aba Forjar (mesmo `ItemSlot`, custo como chips tenho/preciso, "Feito" como estado), Torre (troféus e presentes de patente), prêmios de verdade do pai (ícone de prêmio na mesma moldura, categoria como raridade visual).

## Arte que o líder gera

Ícones que faltam (camisa do time, cabelos, capa azul, camisas e calças por cor como recortes), quatro molduras de raridade, selo "Novo", contorno vazio de cada slot da Mochila, ícone da mochila. Pipeline em `docs/ARTE_PIPELINE.md`.

## Aceite (quando entrar em código)

Toda lista de itens do app usa `ItemSlot`; nenhum item sem ícone visível; comprar um chapéu mostra o preview antes, som e "Equipar agora?" depois, e ele aparece com "Novo" na Mochila até ser visto; na aba Equipado dá para tirar o chapéu; clicar num item bloqueado no editor não fecha o editor; a Loja mostra "Seu" e "Equipado" corretamente após recarregar; fotos da Loja, da Mochila (4 abas), do cartão do item e da Ferraria (Forjar com preview no minerador e Fundição bloqueada/liberada); forjar a picareta de ferro mostra o Ferreiro martelando e a picareta no minerador; capacete e lanterna não podem ser forjados antes do efeito existir.
