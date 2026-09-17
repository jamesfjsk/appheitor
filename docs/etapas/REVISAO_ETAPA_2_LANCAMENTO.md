# Revisão do fechamento da Etapa 2 (lançamento de 20/09/2026)

Revisor: Claude. Uma seção por pacote, na ordem em que o Cursor entrega. Cada seção abre com "Entrou sem doc" (regra do modo de trabalho desde 17/09).

## P0. Estabilizar a árvore (17/09, 13h40; relatório `RELATORIO_ETAPA_2_LANCAMENTO.md`, seção P0)

**Entrou sem doc**: nada de código. Fora do pacote, já estava na árvore antes do P0 e entra no mesmo commit: os cinco `public/assets/village/char/pick-*.png` regenerados (`?v=7` em `src/config/village.ts`) e o `scripts/paint-pickaxe-overlays.py` reescrito (picareta na mão a partir do sprite da Mochila). É ajuste visual do look, aceito como o último antes de domingo; a partir daqui, look e Vagoneta seguem congelados.

**Conferido por mim (17/09, 14h)**:

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | 0 erros |
| `npx eslint src --max-warnings 7` | 0 erros, 7 avisos (6 antigos em `src/icons/index.tsx`, 1 em `CharacterEditor.tsx:153`) |
| `npm run test:english` | 16 arquivos, todos verdes (`levels.test.ts` 13/13) |
| `npx vite build` | ok, sem chunk `phaser`; nenhuma string `Phaser` em `dist/assets/*.js` |
| imports de `RedstoneBench` ou `phaser` fora de `src/game` | nenhum |
| arquivos abandonados | os 7 da lista apagados; nenhuma referência restante em `src` nem no `anchors.json`; `tmp-arena/` e os 26 `_shot_*.mjs` fora |

Código lido: `CharacterEditor.tsx` (slots opcionais viram `null`, obrigatórios só recebem valor existente; correto), `redstoneService.ts` (`result` tipado depois da transação; correto), `englishBase.publicFilePath` (só tira `?v=`; usado só no teste), `itemGlyphs.ts` (helpers puros movidos; `ItemGlyph.tsx` só exporta componente), `redstone.ts` (`coachOf` sem `Tool`; `sealLogic` passa `layoutHash` antigo para dentro de `finish`, o que muda a entrada do hash mas continua determinístico; módulo órfão até a Etapa 3, sem efeito no jogo).

Meu ajuste: `.gitignore` ganhou `__pycache__/` (o Python dos scripts de arte deixou `scripts/__pycache__/` solto) e `backups/` (para o `export-user.cjs` do P3 nunca subir dados reais).

**Veredito: P0 aprovado.** O pai commita a árvore inteira ("P0: árvore estável; look de picareta v7") e o Cursor segue para o P1 (seção 4 do arquivo de etapa, itens 1 a 13 na ordem).

Pendências do pai que entram no P4 quando ele decidir (revisão das construções, 17/09): Biblioteca n2 e n3 sem efeito no código (dar efeito com a Memória da Prova ou trancar "Melhorar"), Cofre n3 (trancar até a Etapa 3), texto da Torre n3 ("propor desafios" saiu) e do Armazém n1 (cita o Campinho).
