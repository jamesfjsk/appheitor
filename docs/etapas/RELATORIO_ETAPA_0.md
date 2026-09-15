# Relatório — Etapa 0 (tema visual Miner Missions)

Sem commit. O pai revisa e commita.

Data da execução: 15/09/2026. Aniversário do Heitor: 18/09/2026.

## Arquivos

### Alterados

- `index.html`
- `public/firebase-messaging-sw.js`
- `src/contexts/DataContext.tsx` (só strings de toast de lembrete)
- `src/components/auth/LoginScreen.tsx`
- `src/components/common/LoadingSpinner.tsx`
- `src/components/common/OfflineBanner.tsx`
- `src/components/hero/BirthdayCelebration.tsx`
- `src/components/hero/HeroPanel.tsx`
- `src/components/hero/HeroHeader.tsx`
- `src/components/hero/ProgressBar.tsx`
- `src/components/hero/VacationBanner.tsx`
- `src/components/hero/YesterdaySummary.tsx`
- `src/components/hero/DailyChecklist.tsx`
- `src/components/hero/TaskItem.tsx`
- `src/components/hero/RewardsPanel.tsx`
- `src/components/hero/AchievementsBadges.tsx`
- `src/components/hero/FlashReminders.tsx`
- `src/components/hero/CalendarModal.tsx`
- `src/components/hero/DailyQuiz.tsx`
- `src/components/hero/SurpriseMissionQuiz.tsx`
- `src/components/hero/PunishmentModeScreen.tsx`
- `src/components/hero/FlashTimer.tsx`

### Criados

- `public/manifest.webmanifest`
- `docs/exemplos/telas/tema/login-desktop.png`
- `docs/exemplos/telas/tema/login-390.png`
- `docs/exemplos/telas/tema/inicio-desktop.png`
- `docs/exemplos/telas/tema/inicio-390.png`
- `docs/exemplos/telas/tema/bau.png`
- `docs/exemplos/telas/tema/calendario.png`
- `docs/exemplos/telas/tema/conquistas.png`
- `docs/exemplos/telas/tema/prova-do-dia.png`
- `docs/exemplos/telas/tema/cronometro.png`
- `docs/etapas/RELATORIO_ETAPA_0.md` (este arquivo)

### Apagados

- `src/components/hero/SpeedForce.tsx`

### Intocados (proibido nesta etapa)

- `src/index.css`
- `src/components/common/ComicBackdrop.tsx`
- `src/components/parent/**`
- `src/components/hero/english/**`
- `src/components/common/ChatFlashGPT.tsx`
- serviços, tipos, `firestore.rules` (exceto os toasts em `DataContext.tsx`)

## O que mudou por arquivo

- **index.html**: `lang="pt-BR"`, título/descrição Miner Missions, `theme-color` `#2f2a27`, ícones miner, manifest.
- **manifest.webmanifest**: PWA standalone com ícones 192/512.
- **firebase-messaging-sw.js**: título padrão "Miner Missions" e ícone `/icons/miner-192.png`.
- **DataContext.tsx**: toasts "Lembrete criado/atualizado/excluído." Identificadores `FlashReminder*` iguais.
- **LoginScreen.tsx**: página `mn-page` + cartão `mc-panel` com banner da mina; botões Heitor/Pai; sem ComicBackdrop e sem foto da criança.
- **LoadingSpinner.tsx**: `mn-page` + `mc-panel` com picareta e "Carregando...".
- **OfflineBanner.tsx**: texto "O Miner Missions precisa de internet".
- **BirthdayCelebration.tsx**: overlay de mina, bolo pixel, fogos em quadradinhos CSS, prêmios em `mc-slot`; lógica de eventos/prêmios intacta.
- **HeroPanel.tsx**: fundo `mn-page`, grade 1fr/340px, faixa de boas-vindas, cartão da missão surpresa e toasts de período no tema; ComicBackdrop intacto; som saiu daqui.
- **HeroHeader.tsx**: painel de pedra, avatar miner.webp (sem foto pública), chips de streak/gold/nível sempre visíveis, botões 44 px, frases de minerador.
- **ProgressBar.tsx**: "Progresso do minerador", barra `mc-bar`, slots de XP/missões, overlay de nível sem raio; frases do dia reescritas.
- **VacationBanner.tsx**: `mc-panel` com sol e chips de multiplicador; sem lucide/faíscas.
- **YesterdaySummary.tsx**: trophy ou creeper + gold ganho/perdido.
- **DailyChecklist.tsx**: `mc-inv` + hotbar manhã/tarde/noite + `TaskItem`; modo guiado e vazios no tema.
- **TaskItem.tsx**: linha `mc-row`, ícone pixel por título, botão Feita/Concluir; `playClick` no caminho válido; toast sem emoji.
- **RewardsPanel.tsx**: "Baú de recompensas", confirmação Trocar/Confirmar/Cancelar, filtros em hotbar.
- **AchievementsBadges.tsx**: grade de slots pixel; detalhe inline ao clicar (sem modal).
- **FlashReminders.tsx**: lista de todos os ativos (sem carrossel); Ocultar/Mostrar.
- **CalendarModal.tsx**: calendário em `mc-panel`, dias da semana em Fredoka, legenda em `mc-lbl`.
- **DailyQuiz.tsx**: modal "Prova do dia" com `book.webp`, ideia em `mc-paper`, opções em `mc-row`.
- **SurpriseMissionQuiz.tsx**: mesmo padrão com `emerald.webp` e slots por matéria.
- **PunishmentModeScreen.tsx**: tela `mn-page` + creeper, "Modo punição", barras e seletor em `mc-inv`.
- **FlashTimer.tsx**: modal "Cronômetro", presets, `mc-bar`, Iniciar/Pausar/Zerar.
- **SpeedForce.tsx**: apagado; `grep SpeedForce src` vazio.

## Textos renomeados (visíveis)

| Antes | Depois |
| --- | --- |
| Flash Missions (título/PWA/push/offline) | Miner Missions |
| Progresso Flash | Progresso do minerador |
| Lembretes Flash | Lembretes |
| Conquistas Flash | Conquistas |
| Missões Diárias | Missões do dia |
| Loja de Recompensas | Baú de recompensas |
| Flash Timer | Cronômetro |
| Calendário de Missões | Calendário |
| Resgatar Agora! | Trocar |
| Resgates Liberados/Bloqueados | Trocas liberadas/bloqueadas |
| Gold Insuficiente | Faltam N gold |
| Meus Resgates | Minhas trocas |
| Rejeitado | Recusado |
| Quase lá, velocista! ... | Quase lá. Faltam poucas missões. |
| Incrível! Você completou todas as missões hoje! | Todas as missões de hoje concluídas. |
| Iniciar Missão Surpresa! | Iniciar Missão Surpresa |
| Lembrete Flash criado/atualizado/excluído com sucesso! | Lembrete criado/atualizado/excluído. |
| Missão já feita hoje (com emoji) | Missão já feita hoje. Volta amanhã. |
| Conquista desbloqueada (com emoji) | Conquista desbloqueada: {título} |
| Modo punição (título visível) | Modo punição |
| Prova do dia | Prova do dia (mantido; só o visual) |

Frases do `HeroHeader` e da frase do dia em `ProgressBar` seguem a lista da especificação (escavação, blocos, picareta, armadura, diamante, etc.).

Identificadores mantidos: `FlashReminders`, `FlashTimer`, `FlashIcon`, `FlashReminder`, `mensagensHeitorFlash`.

## Saídas dos comandos (seção 5)

### `npx tsc --noEmit -p tsconfig.app.json`

```
TSC_EXIT:0
```

(sem erros)

### `npx eslint src --max-warnings 0`

```
C:\Users\Nobody\Downloads\Samsonite\appheitor\src\icons\index.tsx
    4:14  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components
  103:14  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components
  184:17  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components
  278:17  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components
  356:14  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components
  434:17  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

✖ 6 problems (0 errors, 6 warnings)

ESLint found too many warnings (maximum: 0).
```

Aceito pela especificação: só os 6 avisos pré-existentes de `src/icons/index.tsx`.

### `npm run test:english`

```
Todos os 8 arquivos de teste passaram
```

(15+12+7+6+16+9+8+11 casos)

### `npx vite build`

```
vite v5.4.19 building for production...
✓ 2807 modules transformed.
dist/index.html                     1.06 kB │ gzip:   0.52 kB
dist/assets/index-DRm8_0QU.css     84.18 kB │ gzip:  15.43 kB
dist/assets/index-DLlS4c-i.js   1,631.28 kB │ gzip: 432.44 kB
✓ built in 5.66s
```

Aviso de chunk > 500 kB pré-existente; build ok.

### grep (`rg` equivalente no Windows)

Comando: `rg -n "Flash Missions|velocista|velocidade da luz|Speed Force" src --glob "*.tsx" --glob "*.ts"`

```
src\types\index.ts:145:  emoji: string; // icon key Flash Missions (legado: emoji)
src\types\index.ts:286:  icon: string; // icon key Flash Missions (legado: emoji)
src\components\common\ChatFlashGPT.tsx:35:- Chame o Heitor de "pequeno velocista", ...
src\components\common\ChatFlashGPT.tsx:63:Exemplo: "⚡ Olá, pequeno velocista! ...
src\icons\index.tsx:380:          <p className="text-xs text-gray-500">Símbolo oficial do Flash Missions</p>
src\components\parent\FlashReminderForm.tsx:149:      message: 'Sente-se direito como um verdadeiro velocista!',
src\components\parent\NotificationSender.tsx:23:      message: 'Você está indo muito bem, velocista! Continue assim!',
```

Nenhum hit na tela da criança nem no login. Os hits restantes são: comentários em `types` (intocado), `ChatFlashGPT` (proibido mexer), `icons/index.tsx` (pré-existente), `parent/**` (proibido mexer).

`SpeedForce.tsx` não existe mais no disco.

## Fotos

Pasta: `docs/exemplos/telas/tema/`

| Arquivo | O quê |
| --- | --- |
| `login-desktop.png` | Login 1280 px |
| `login-390.png` | Login 390 px |
| `inicio-desktop.png` | Tela inicial completa (Prova do dia escondida no teste) |
| `inicio-390.png` | Tela inicial 390 px |
| `bau.png` | Baú de recompensas aberto |
| `calendario.png` | Calendário aberto (setembro 2026) |
| `conquistas.png` | Conquistas com detalhe "Colecionador Expert" aberto |
| `prova-do-dia.png` | Modal Prova do dia (intro) |
| `cronometro.png` | Cronômetro (5:00, Pausado) |

Não fotografados (ver abaixo): Modo punição, aniversário.

Login Heitor via `data-testid="login-heitor"`. Dev server na porta 5173.

## Dúvidas e decisões

1. **ComicBackdrop**: a especificação manda não tocar. Os raios vermelhos de HQ continuam por cima do fundo `mn-page`. Fica visível nas fotos da inicial.
2. **Lembretes com "Flash"**: o código do cartão não escreve "Flash". Os títulos/mensagens vêm do Firestore ("Hidratação Flash", "energia de super-herói", "Organização Flash", "STAR Labs"). Editar isso seria no painel dos pais ou nos dados; ambos fora desta etapa.
3. **Press Start 2P e acentos**: títulos em `mc-h`/`mc-title` com acento saem quebrados (ex.: "Missões" parece "Misses", "Cronômetro"/"Calendário"/"Baú" perdem o acento). A spec pede pixel em títulos e Fredoka só em rótulos acentuados (`mc-lbl`). Segui a spec; não troquei títulos para Fredoka.
4. **Foto da criança**: removida do header/login como pedido (`miner.webp` no lugar).
5. **Confirmação do Baú**: passo inline Trocar → Confirmar/Cancelar, como a spec descreve; não existia antes.
6. **Carrossel de lembretes**: removido; todos os ativos aparecem na lista.
7. **LoadingSpinner no admin**: o spinner novo também aparece no painel dos pais; a spec autoriza.
8. **Fotos**: Puppeteer + Chrome local (não Playwright). Scripts auxiliares `_shot*.mjs` apagados depois das capturas.
9. **Quebras de linha**: Git avisou LF→CRLF em alguns arquivos tocados no Windows (`LoginScreen`, `BirthdayCelebration`, `DailyQuiz`, `HeroHeader`, `RewardsPanel`, `TaskItem`, `YesterdaySummary`, `DataContext`). Não forcei conversão extra.

## O que ficou de fora e por quê

- **Foto do aniversário**: hoje é 15/09; a celebração só abre em 18/09 (`CHILD_BIRTHDAY_MMDD`). Não alterei data nem forcei o overlay. O componente já está no tema novo.
- **Foto do Modo punição**: só renderiza com `isPunished`. A conta do Heitor não está em punição. Não simulei estado no Firebase. Visual do componente já foi convertido.
- **Textos "Flash" nos lembretes ao vivo**: dados, não código da criança; `parent/**` intocado.
- **Raios HQ no fundo**: `ComicBackdrop.tsx` intocado de propósito.
- **ChatFlashGPT / ícones / types / parent**: hits do grep; fora do escopo.
- **`src/index.css` e Arena de Inglês**: intocados.
- **Commit**: não feito, como pedido.
