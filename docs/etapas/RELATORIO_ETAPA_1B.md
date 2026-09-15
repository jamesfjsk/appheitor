# Relatório — Etapa 1B (cena da Vila v2)

Sem commit. 15/09/2026.

## O que entrou

A Vila deixou de ser grade de cubos. A cena lê o fundo pintado `backdrop-day.png` e as âncoras de `anchors.json` (plano em `docs/etapas/ETAPA_1B_CENA_V2.md`): lotes, personagem, NPCs, mina, luz, água, fumaça, balão de fala no canvas.

Personagem e NPCs em low top-down: `char/miner-iso.png`, `npc/sabio-iso.png`, `npc/comerciante-iso.png`, `npc/ferreiro-iso.png`, `npc/olheiro-iso.png`. HUD, editor, teaser e cena usam essa câmera. Camisa, calça, pele, cabelo, chapéu e capa no iso são tinta no sprite (não máscaras laterais).

Cartão da construção (`BuildingCard.tsx`): clique no lote abre o lugar (não a Oficina). Textos de efeito em `englishBase.ts` copiados de `VILA_CONSTRUCOES.md`. Campinho não se constrói (`Abre na Etapa 4`).

**3c.** Com `modules.shop === false`, a aba Loja da Vila não lista itens: placa `mc-paper` com `npc/comerciante.png` e o texto de “Em breve”. O editor só mostra peças grátis e as já compradas, sem preço. Mercado pela grade/hotbar abre na aba Prêmios de verdade.

Modais usam 9-slice de `ui/panel-frame.png` (recorte de `panel-wood.png`). Hotbar e teaser trocaram cubos/`miner.webp` pelos sprites da Vila.

## Fotos

Em `docs/exemplos/telas/cena-v2/`: `vila-h9.png`, `vila-h14.png`, `vila-h18.png`, `vila-h22.png`, `hover-lote.png`, `balao-sabio.png`, `quiz-lock.png`, `vila-390.png`, `cartao-fornalha.png`, `cartao-vazio.png`, `cartao-bau.png`, `sombra.png`, `vila-dia.png`, `base-lotes.png`.

## Pendências

- Máscaras isométricas de verdade (cabelo/chapéu/capa como PNG, não só recolor) — Sistema de itens da Etapa 2; até lá a Loja fica em “Em breve”.
- Efeitos da Cerca, Fundição/Queima e Cofre (Etapa 2).
- Campinho jogável (Etapa 4).
