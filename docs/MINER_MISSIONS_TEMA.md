# Miner Missions: tema de mina para a tela do Heitor

Decisão do pai (15/09/2026): o app inteiro da criança sai do tema Flash/HQ e entra no tema de mina que já existe na Arena de Inglês e na Base ("ficou bem legal", "muito top a temática"), com foco em usabilidade. O painel dos pais continua limpo (Tailwind, cards brancos, azul).

## Princípios

1. **Fonte pixel (Press Start 2P, classes `mc-font`/`mc-title`/`mc-lbl`/`mc-num`/`mc-h`) só em títulos, rótulos curtos e números.** Texto corrido, descrições, mensagens e botões longos ficam na Fredoka (`var(--mc-body)`, já é a fonte padrão da tela do herói). Acentos maiúsculos na fonte pixel ficam feios: títulos em caixa mista ("Arena de Inglês"), rótulos curtos podem ser maiúsculos se não tiverem acento.
2. **Moldura escura, conteúdo claro.** Cabeçalho, XP, cartões laterais e modais usam o painel de pedra (`mc-panel`, `mc-card`). O conteúdo que ele lê e opera todo dia (lista de missões, recompensas, quiz) usa o painel claro de inventário (`mc-inv`) com linhas `mc-row`. Contraste alto sempre: texto claro em fundo escuro, texto escuro (`--mc-inv-ink`) em fundo claro.
3. **Hierarquia: o que fazer agora fica em cima.** Ordem da tela inicial: cabeçalho (saudação + chips de dias seguidos, gold, nível) → barra de XP → Missões do dia (com barra de itens manhã/tarde/noite) → coluna lateral: Arena de Inglês (cartão da Base, já pronto), Baú de recompensas, Conquistas, Lembretes. No celular vira uma coluna nessa mesma ordem.
4. **Botões grandes e poucos.** `mc-btn mc-btn-green` para a ação principal, `mc-btn-wood`/`mc-btn-stone` para secundárias, `mc-btn-gold` para recompensa, `mc-btn-red` só para sair/cancelar. Nada de gradientes, sombras difusas ou cantos muito redondos (raio máximo 8 px).
5. **Sem emojis, sem "Flash".** Ícones: os pixel art de `public/assets/english/ui/` e `public/assets/english/ui/base/` (lista abaixo), com `mc-pixel` para não borrar; os `FlashIcon` do projeto podem continuar onde não houver ícone pixel equivalente (relógio, olho, seta), sempre em tamanho pequeno. Mascote/avatar: a foto do Heitor (`CHILD_PHOTO_URL`) onde já existe; sem foto, `miner.webp`.
6. **Som e resposta.** Reaproveitar `useSound()` (playClick, playTaskComplete, playLevelUp) e, onde couber, `createMineSfx` de `src/components/hero/english/mine/sfx.ts` (acerto, erro, baú). Animações curtas com as classes `mc-pop`, `mc-build`, `mc-shake`; respeitar `prefers-reduced-motion`.
7. **Legibilidade infantil.** Corpo 16-17 px, títulos de linha 17-18 px, rótulos pixel 9-11 px, botões com 44 px de altura mínima, alvos de toque de 44 px no celular.

## Tokens e classes

Tokens em `src/styles/miner.css` (`--mc-stone`, `--mc-inv`, `--mc-grass`, `--mc-gold`, `--mc-diamond`, `--mc-wood`, `--mc-red`, `--mc-white`, `--mc-muted`...). Classes de `src/index.css` (já usadas na Arena e na Base): `mc-panel`, `mc-card`, `mc-card-hover`, `mc-slot`, `mc-slot-selected`, `mc-slot-good`, `mc-slot-bad`, `mc-btn` + `mc-btn-green|stone|dark|gold|red`, `mc-bar` + `mc-bar-fill` (+ `is-gold`), `mc-font`, `mc-title`, `mc-pixel`, `mc-good`, `mc-warn`, `mc-bad`, `mc-diamond`, `mc-muted`, `mc-paper`. Novas em `src/styles/miner.css`: `mn-page` (fundo da página), `mc-inv` (painel claro) com variantes internas de `mc-slot`/`mc-bar`/`mc-lbl`/`mc-h`, `mc-row` (+ `is-done`, `is-locked`), `mc-lbl`, `mc-num`, `mc-h`, `mc-chip` (+ `mc-chip-l`), `mc-hotbar`, `mc-torches`, `mc-pop`, `mc-build`, `mc-shake`, `mc-flicker`. Botão de madeira: `mc-btn` com `style={{ backgroundColor: 'var(--mc-wood)' }}` ou a classe utilitária `bg-[#9a6b3c]`.

Referência visual aprovada: `docs/exemplos/telas/*.png` (Base) e o mockup da tela inicial (arquivo `miner-missions.html` do rascunho; a estrutura dele é a que a tela inicial deve seguir).

## Ícones disponíveis (todos `.webp`, 256 px, fundo transparente)

`/assets/english/ui/`: banner (1200 px, entrada da mina), minecart, memory, creeper, crafting, book, pickaxe, chest, torch, grass, gold, emerald, diamond, sword, bed, clock, miner, sun, sunset, moon, trophy, star, apple, map.
`/assets/english/ui/base/`: mat_madeira, mat_pedra, mat_ferro, mat_redstone, b_terreno, b_fornalha, b_bau, b_cerca, b_torre, b_mesa, b_campinho, c_merchant, c_letter, c_note, c_forge, s_window, s_shelf, s_box, s_oven, s_fence, s_rug, s_barrel, s_bench, i_bone, i_bucket, i_cake, i_key, i_lamp, i_boots, i_helmet, i_potion.
Ícone do app: `/icons/miner-512.png`, `/icons/miner-192.png`, `/icons/miner-180.png` (gerados pelo líder).

Mapa de uso: dias seguidos = torch; gold = gold; nível = diamond; XP total = star; missões concluídas = map; manhã/tarde/noite = sun/sunset/moon; recompensas = chest; conquistas = trophy (desbloqueada) e o mesmo ícone em cinza (`filter: grayscale(1) brightness(.5); opacity:.55`) quando bloqueada; lembretes = torch; calendário = clock; quiz = book; missão surpresa = emerald; aniversário = cake (i_cake); férias = sun; punição = creeper; timer = clock; inglês = pickaxe/minecart.

## Nomes e textos

- Nome do app: **Miner Missions** (título da aba, login, cabeçalho). "Flash Missions" some de todo texto visível.
- "Progresso Flash" → "Progresso do minerador"; "Lembretes Flash" → "Lembretes"; "Conquistas Flash" → "Conquistas"; "Missões Diárias" → "Missões do dia"; "Missão Surpresa" continua; "Flash Timer"/"Cronômetro" → "Cronômetro"; "Speed Force"/"velocidade da luz"/"velocista" somem das frases motivacionais (usar mina, picareta, baú, diamante, esmeralda, redstone, campinho).
- Títulos de nível já trocados em `src/utils/levelSystem.ts` (patentes de minerador).
- Saudações mantêm "Bom dia/Boa tarde/Boa noite, Heitor!". Frases motivacionais curtas, sem exclamação em excesso, sem infantilizar (ele tem 10 anos).

## Mapa de componentes (o que cada um vira)

- `HeroPanel.tsx`: página `mn-page`; layout em grade 1fr + 340 px (uma coluna abaixo de 760 px), gap 16 px, largura máxima 1040 px; `ComicBackdrop` fica montado como está (o pai está mexendo nele), mas o fundo da página passa a ser o `mn-page`.
- `HeroHeader.tsx`: `mc-panel` com avatar em `mc-slot` (foto ou miner), título "Miner Missions" em `mc-title` pequeno, saudação em Fredoka 28 px, subtítulo mudo; chips `mc-slot mc-chip` (torch dias seguidos, gold, diamond nível); botões de calendário/notificações/sair como `mc-btn mc-btn-dark` quadrados 44 px com ícone.
- `ProgressBar.tsx`: `mc-panel` com "Progresso do minerador" (`mc-lbl`), `mc-num` "58 / 350 XP", `mc-bar`, linha nível atual/próximo com patente, dois `mc-slot` (XP total com star, missões concluídas com map), frase motivacional curta.
- `DailyChecklist.tsx` + `TaskItem.tsx`: `mc-inv` com `mc-h` (map) "Missões do dia" e "2/6 feitas" (`mc-lbl`), `mc-hotbar` manhã/tarde/noite (`mc-slot`, selecionada com `mc-slot-selected`), `mc-bar` do período, lista de `mc-row` (ícone em `mc-slot` 52 px: por padrão map; se a tarefa tiver categoria/ícone conhecido use bed/apple/book/sword/grass/clock), título 17 px bold, descrição 13 px muted, recompensas "+10 XP  +5 GOLD" em `mc-font` 8 px (verde/dourado), botão "Concluir" (`mc-btn` madeira) e "Feita" (`mc-btn-green`, `is-done`). Remover `SpeedForce` e efeitos de velocidade.
- `RewardsPanel.tsx` (modal): `mc-panel` com `mc-h` (chest) "Baú de recompensas", gold disponível em `mc-num` dourado, itens em `mc-row` dentro de `mc-inv` com custo em gold e botão "Trocar" (`mc-btn-gold`) ou "Faltam N gold" (`is-locked`); confirmação em `mc-card`.
- `AchievementsBadges.tsx`: `mc-panel` lateral com `mc-h` (trophy) "Conquistas", grade de `mc-slot` quadrados (ícone pixel; bloqueada em cinza), "11 de 13 desbloqueadas" (`mc-lbl`), detalhe ao clicar em `mc-card`.
- `FlashReminders.tsx`: `mc-panel` lateral com `mc-h` (torch) "Lembretes", cada lembrete em `mc-card` com ícone pixel e texto; sem carrossel automático.
- `CalendarModal.tsx`: `mc-panel` com grade do mês em `mc-slot` (dia completo = `mc-slot-good`, parcial = dourado, perdido = `mc-slot-bad`), legenda em `mc-lbl`.
- `DailyQuiz.tsx`: modal `mc-panel` com cabeçalho "Prova do dia" (`mc-title`), corpo em `mc-paper`/`mc-inv` para leitura (ideia do dia, perguntas com opções em `mc-row`), barra de progresso `mc-bar`, botões `mc-btn`.
- `SurpriseMissionQuiz.tsx`: mesmo padrão do quiz, com emerald.
- `BirthdayCelebration.tsx`, `PunishmentModeScreen.tsx`, `VacationBanner.tsx`, `FlashTimer.tsx`, `YesterdaySummary.tsx`: mesmo padrão (painel de pedra, conteúdo claro quando há leitura, botões em bloco), sem confete de HQ; celebração com `mc-pop` e som.
- `LoginScreen.tsx`: página `mn-page` com o banner da mina no topo, título "Miner Missions" em `mc-title`, botão grande "Entrar como Heitor" (`mc-btn mc-btn-green`, foto em `mc-slot`), botão "Entrar como Pai" (`mc-btn-stone`); formulário do pai em `mc-inv`; status de conexão discreto (`mc-lbl`).
- `index.html`: título "Miner Missions", `theme-color` `#2f2a27`, favicon `/icons/miner-192.png`, apple-touch-icon `/icons/miner-180.png`.

## O que não muda

Lógica, contextos, serviços, Firestore, painel dos pais, `ComicBackdrop.tsx`, `src/index.css` (só se adiciona `src/styles/miner.css`, importado em `src/main.tsx`), Arena de Inglês e Base (já no tema).
