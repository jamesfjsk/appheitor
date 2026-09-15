# Relatório — Etapa 1 (Vila jogável) + revisão seção 10

Sem commit. O pai revisa e commita.

Data: 15/09/2026. Inclui o pacote **até 18/09** da `REVISAO_ETAPA_1.md` seção 10.

## O que entrou

A Vila passou a ser a tela inicial da criança: cena em canvas 2D (sem PixiJS), missões pagando gold/XP/materiais, Oficina, Mercado, Baú do Dia, primeiro acesso, prova como portão do jogo, aba Vila no painel, conta de teste, observabilidade e manual do pai.

Nesta revisão (seção 10): portão da prova que persiste, cena que respeita o cadeado, cosméticos sem sprite escondidos, “Não foi feita” só hoje, nova fase atômica, `modules` na prova/TTS, pedidos do pai (ícones, cena, dica do turno), conteúdo do Baú, custos na Oficina, tochas de dias completos, sprites de construção, ícones de prêmio reais, `BUILD_XP` zero, `allDoneBonus` zero e **curva de nível nova** (teto 40) com presente à escolha.

## Arquivos principais

### Novos

- `src/types/village.ts`, `src/config/village.ts`, `src/config/rewardIcons.ts`, `src/config/villageAchievements.ts`
- `src/utils/isoWeek.ts`
- `src/services/village/{schedule,loot,claims,chest,shop,notices}.ts` e `__tests__/village.test.ts`
- `src/services/{villageService,settingsService,observability}.ts`
- `src/contexts/VillageContext.tsx`, `src/hooks/useModules.ts`
- `src/components/hero/village/{VillageHome,VillageScene,Onboarding,DailyChest,Oficina,Mercado,CharacterEditor,LevelUpModal,CharacterPreview}.tsx`
- `src/components/hero/village/drawCharacter.ts`
- `src/data/{villageLines,habitLines}.ts`
- `src/components/parent/{VillageManager,PlacaManager}.tsx`
- `docs/VILA_API.md`, `docs/MANUAL_DO_PAI.md`
- `scripts/{pixellab-gen,setup-test-account}.mjs` (wrappers dos `.cjs` já existentes), `scripts/cleanup-test-account.mjs`

### Alterados nesta revisão (entre outros)

- `HeroPanel`, `HeroHeader`, `DailyQuiz`, `DailyRulesManager`, `LevelUpModal`
- `DataContext` (presente de nível só depois da escolha no modal)
- `firestoreService.revertTaskCompletion`, `villageService.startNewSeason` / `grantLevelGift`
- `dailyQuizService`, `englishTts`, `englishRewards` (`BUILD_XP`)
- `levelSystem.ts`, `rules.ts` (`LEVEL_CAP`, `SEASON_WEEKS`, `allDoneBonus: 0`)
- `VillageHome`, `VillageScene`, `Oficina`, `Mercado`, `CharacterEditor`, `DailyChest`

Não tocados de propósito: `src/index.css`, `ComicBackdrop.tsx`, `src/components/hero/english/**` além do `onClose` já existente da Base.

## Decisões

1. **Canvas 2D**, no padrão da Mina, em vez de PixiJS.
2. Pagamentos novos só com `runTransaction` (loja, baú, missão, reversão). Sem `adjustUserGold`/`adjustUserXP` novo.
3. `englishBase` só em `materials` (incremento) e `buildingSprite`.
4. Painel dos pais continua Tailwind branco/azul; só a aba Vila e a Placa/ícones de prêmio mudam função.
5. Em DEV: `?h=11` força a hora da cena; `?quiz=lock` desenha os cadeados; `?onboard=1` reabre o primeiro acesso. Não vale em produção.
6. Onboarding e a Vila usam `relative z-10` para ficarem na frente do fundo da mina.
7. **`BUILD_XP = [0, 0, 0]`**. Construir não paga XP. A Base (`english/**`) não foi editada; com XP 0 o `adjustUserXP` da construção não roda (some o toast de nível do personagem). A linha “(+0 XP)” na Base fica até a etapa que puder mexer nesses arquivos.
8. **`allDoneBonus` padrão 0.** O Baú do Dia é a recompensa de dia completo. Se `settings/dailyRules` no Firestore ainda tiver 10, salvar 0 no painel (Ajustes → Fechamento do dia).
9. Cosméticos sem sprite (`hair_2`, `hair_3`, `hair_4`, `cape_blue`) escondidos por `cosmeticHasSprite`.
10. Curva `getXPForLevel(L) = 5 * (L - 1) * (L + 10)`, teto 40. Snapshot da nova fase usa a **curva antiga** (`getLegacyLevelFromXP`). Presente de nível: 1 material à escolha (madeira/pedra/ferro) na mesma transação; raro nos marcos 5/15/25/35 (esmeralda) e 10/20/30/40 (diamante). Chave `level:<season>:<n>`. Sem gold.
11. Hábitos viraram “Dica do turno” na Placa (sem botão, sem toast). Confirmação volta na Etapa 2.
12. “Não foi feita” só para conclusões de **hoje**.

## Seção 10 — o que foi feito

| Item | Situação |
| --- | --- |
| A1 quiz_completed | Grava em `DailyQuiz` e `HeroPanel.markQuizDone` |
| A2 lote da cena | `build:` com portão chama a prova |
| A3 / decisão 4 | `cosmeticHasSprite` na Loja, editor e `buyCosmetic` |
| A4 | `revertTaskCompletion` recusa data ≠ hoje; painel lista só hoje |
| A5 | Recusa pacote ativo; botão `seasonBusy`; batch desativar+criar; snapshot com nível legado e conquistas; `season: 1` na primeira vez |
| A6 | `modules.aiGeneration` na prova; `modules.tts` no TTS; efeitos = `village.effectsEnabled && modules.effects`; frases do manual |
| Pedido 1 | Ícones na grade e hotbar; cadeado em grayscale + “Faça a prova do dia”; Missões rola `#vila-missoes` |
| Pedido 2 | Grama fora do caminho, tile espelhado, céu noturno + lua, rótulos Sábio/Comerciante, cursor só em hotspot, cadeados nos lotes (não no personagem) |
| Pedido 3 | Uma dica por turno com retrato e `pickLine` |
| M11 | Baú devolve e mostra o conteúdo |
| M12 | Custos na tela; bloqueada vs falta material; craft desabilitado; PNG de item; fala do Ferreiro |
| M14 | Chip “dias completos” = `village.fullDays` |
| M19 | Sprite `buildings/<id>-<nível>.png` (placa no 0) |
| M20 | `rewardIcons.ts` pelos 30 PNG reais; alias `dormir` → `dormir-tarde` |
| Decisão 2 | `BUILD_XP` zero |
| Decisão 3 | `allDoneBonus` zero no padrão e no rótulo do painel |
| Seção 12 | Curva nova, títulos a cada 5, `LEVEL_CAP`/`SEASON_WEEKS`, conquistas 5/10/20/30/40, modal de escolha de material |

**Logo depois (não feito):** M2–M5, M8–M10, M13, M15–M18, itens baixos, `VILA_API.md` completo.

## Saídas dos comandos

### `npx tsc --noEmit -p tsconfig.app.json`

OK (exit 0).

### `npx eslint src --max-warnings 6`

OK. Só os **6 avisos pré-existentes** de `src/icons/index.tsx` (`react-refresh/only-export-components`).

### `npm run test:english`

9 arquivos, todos passaram. Vila: **13/13** (incluindo curva nova e chave de presente por temporada). Inglês: scoring agora espera `BUILD_XP = [0,0,0]`.

### `npx vite build`

OK em 5,07 s. Aviso de chunk > 500 kB pré-existente.

### Regras

Publicadas na Etapa 1 (`village`, `notices`, `habits`, `clientErrors`, `health`). Nesta revisão de código não houve novo deploy de regras.

## Fotos

Pasta: `docs/exemplos/telas/vila/`

Conta `teste@flash.com` no Vite `http://localhost:5174` (botão DEV **Entrar como conta de teste**).

| Arquivo | O quê |
| --- | --- |
| `primeiro-acesso.png` | Crie seu minerador, preview “Assim vai ficar”, só cabelo com sprite |
| `vila-dia.png` | Céu de dia (`?h=11`), Placa, Dica do turno, cena, hotbar com ícones, chip dias completos |
| `vila-noite.png` | Céu noturno + lua (`?h=22`), dica de tela |
| `portao-prova.png` | Cadeados nos lotes (`?quiz=lock`), não no personagem |
| `bau-fechado.png` | Baú do Dia: Abre às 18h |
| `oficina.png` | Custos visíveis; Torre/Mesa/Campinho “Bloqueada: precisa de Fornalha e Baú nível 1” |
| `mercado.png` | Loja da Vila (sem hair_2/3/4 nem capa azul) |

O cabeçalho ainda diz “Bom dia” à noite: o `?h=` só força a hora da **cena**, não a saudação.

Na conta de teste o seed tem 95 XP: com a curva nova isso já é **nível 2**. Antes de o Heitor abrir o app no dia 18, use **Iniciar nova fase** (zera XP; o snapshot guarda o nível da curva antiga).

## O que não deu para fotografar nesta sessão

Sem login do pai no script de fotos:

- aba Vila do painel e cartão Saúde
- botão **Não foi feita** (código limitado a hoje; o revisor da seção 9 já testou o fluxo)

Também não reabertos aqui (já exercitados na revisão seção 9 na conta de teste): toast de material, missão da noite, Baú aberto, craft da picareta, Fornalha subindo, troca 3:1, compra `village_shop`.

## Pendências visuais / de arte

- Cabelos 2–4 e capa azul: escondidos até existir sprite próprio.
- Cosmético exclusivo de marco (10/20/30/40): Etapa 2.
- Lapidação da cena (Etapa 5): balão no canvas, fumaça, tochas, Ferreiro/Olheiro na cena.
- Recadastro dos prêmios atuais com os ícones novos (o pai recadastra).

## Não feito (de propósito)

- Commit.
- Itens “logo depois” da seção 10 (M2–M5, M8–M10, M13, M15–M18, baixos, `VILA_API.md`).
- Mapa andável, personagem desenhado por código, PixiJS.
- Mudança de punição além de `punished: true` no fechamento do dia.
- Arquivos `src/components/hero/english/**` (a Base ainda mostra “+0 XP” ao construir).
