# Revisão da Etapa 1B (Cena da Vila v2)

15/09/2026, fim da tarde. Relatório do Cursor em `RELATORIO_ETAPA_1B.md`; especificação em `ETAPA_1B_CENA_V2.md`.

## Veredito

**Aprovada, com uma pendência pequena (3c) antes do commit.** A cena virou jogo: fundo pintado, sprites ancorados e na escala certa, sombras, luz por horário com brilhos à noite, fumaça na Fornalha, balão de fala no canvas, hover só no que é clicável, cadeados nos lotes, cartão da construção com "o que dá agora", "próximo nível" e a ação própria. O Cursor foi além do pedido em dois pontos bons: gerou sprites do minerador e dos quatro NPCs na mesma perspectiva do fundo (`char/miner-iso.png`, `npc/*-iso.png`) e colocou o Ferreiro e o Olheiro na cena (âncoras novas em `anchors.json`).

## Verificações

- `tsc` limpo; eslint só com os 6 avisos pré-existentes; testes 9 arquivos ok; build ok.
- Código: `VillageScene.tsx` lê `backdrop-day.png`, `clouds.png` e `anchors.json`; luz com `multiply`; redesenho no `onload`; `IntersectionObserver` e limite de 30 quadros; `prefers-reduced-motion` respeitado; `BuildingCard.tsx` com Construir/Melhorar, "Falta 2 Pedra, 1 Redstone", "Ir para a Mina", inventário do Baú, "Ver todas as obras"; textos de efeito de `englishBase.ts` copiados de `VILA_CONSTRUCOES.md`; Campinho "Abre na Etapa 4".
- Fotos do Cursor em `docs/exemplos/telas/cena-v2/` (9h, 14h, 18h, 22h, hover, balão, cadeado, cartões, 390 px): conferidas, batem com a especificação.
- Navegador, conta de teste, por mim: cursor vira mão sobre o lote; clicar no lote da Fornalha abre o cartão "Fornalha / Furnace"; "Construir" pelo cartão deu o toast "Fornalha chegou ao nível 1" e debitou 1 madeira, 1 pedra e 1 ferro no Firestore; clicar na entrada da mina abre a Mina; clicar no Sábio mostra o balão; sem erro de console. Conta de teste resetada depois.

## Pendência obrigatória antes do commit

- **3c, Loja da Vila em "Em breve"**: não entrou. A aba "Loja da Vila" continua listando 12 itens com "Comprar" (`settings/modules.shop` já está `false`, então a compra é recusada pelo serviço, mas a tela não diz nada). Fazer o que a seção 3c pede: com `modules.shop === false`, nenhum item, placa `mc-paper` com o Comerciante e o texto "Em breve: o Comerciante está arrumando a barraca. Por enquanto, seu gold vale nos Prêmios de verdade."; editor de personagem só com peças grátis e as já compradas.

## Corrigido por mim durante a revisão

- **A Vila ficava sempre de noite em desenvolvimento** (o pai viu noite às 13h31; o teste de navegador da Etapa 1 também tinha visto "céu noturno às 11h"). Causa em `VillageHome.tsx`, `brazilHour()`: o atalho de DEV `?h=` fazia `Number(null)`, que é 0, e 0 passava na checagem "entre 0 e 23"; sem `?h` na URL a hora virava 0. Só afetava `npm run dev` (em produção o atalho não existe). Agora o atalho só vale quando `?h=` está de fato na URL. A hora do jogo continua sendo a de Brasília via `Intl` (`America/Sao_Paulo`); o Relógio da Vila da Etapa 2 (seção 16) é o que impede este tipo de erro de voltar.

## Observações (não bloqueiam; entram na Etapa 2 pelos documentos de desenho)

- O rótulo do Heitor aparece acima da cabeça e o dos NPCs abaixo dos pés; padronizar abaixo (seção 3, item 8).
- A hotbar e a grade ainda dizem "Oficina", o cabeçalho ainda tem "Baú de recompensas", calendário e cronômetro: tudo previsto em `VILA_MAPA.md` (Etapa 2, Lote 1).
- O Ferreiro ficou no canto inferior esquerdo, longe da Fornalha; em `VILA_CONSTRUCOES.md` ele mora ao lado dela. Ajustar a âncora quando a Casa do Minerador entrar (a âncora `house` e a mudança do Comerciante estão na construção 8).
- Escopo: além dos arquivos previstos, o Cursor mexeu em `Teaser.tsx` (ícones do teaser trocados pelos sprites da Vila, aceitável), `miner.css`, `HeroHeader`, `ProgressBar`, `DailyChecklist`, `TaskItem`, `LoginScreen`, `BaseMap`, `EnglishBase`, `Onboarding`, `DailyChest`, `Mercado`, `Oficina`, `CharacterEditor`, `CharacterPreview`, `drawCharacter` e `englishBaseService` (moldura 9-slice nos modais e a câmera nova nos avatares). O resultado ficou coerente e as verificações passaram; registrar no relatório o que mudou em cada um e não repetir esse alcance sem pedir.
- `RELATORIO_ETAPA_1B.md` não lista as saídas dos comandos nem o que mudou fora da cena; completar.
- "Máscaras isométricas de verdade" (cabelo, chapéu, capa como PNG na nova câmera) ficam para o Sistema de itens da Etapa 2; até lá a Loja está em "Em breve" e nada disso é visível.

## Próximos passos

1. Cursor: 3c e o relatório completo.
2. Pai: commit "Etapa 1 e 1B: Vila jogável com cena v2".
3. 18/09: "Iniciar nova fase" no painel e repor o gold.
4. Depois: Etapa 2, Lote 1, começando pelo Relógio da Vila (`ETAPA_2_BANCO_E_TEMPORADA.md`).
