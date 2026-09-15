# Revisão da Etapa 0 (tema visual Miner Missions)

Revisor: Claude, 16/09/2026. Executor: Cursor (Grok 4.6). Base: `docs/etapas/ETAPA_0_TEMA_VISUAL.md`, relatório `docs/etapas/RELATORIO_ETAPA_0.md`, três revisores independentes (diff de lógica arquivo a arquivo, conformidade com a especificação, conferência visual no navegador em 1280 e 390 px) e verificações mecânicas.

## Veredito

**Aprovada com ajustes já aplicados.** A conversão respeitou a fronteira "só apresentação": nenhuma regra de negócio, efeito, handler, chamada de serviço ou prop mudou nos 21 arquivos (diff conferido contra o HEAD); as duas adições pedidas (confirmação no Baú, som ao concluir missão) estão corretas; textos sem "Flash" e sem emoji na tela da criança; identificadores mantidos. Verificações finais depois dos ajustes: `tsc` 0 erros; `eslint` só os 6 avisos pré-existentes de `src/icons/index.tsx`; `npm run test:english` 8/8; `vite build` OK; zero erros de console nas duas larguras. **Pode commitar** (sugestão de mensagem: "Etapa 0: tema Miner Missions na tela da criança").

## O que eu corrigi diretamente (pequenos ajustes)

1. Fundo da página: `ComicBackdrop` ganhou a variante `mine` (padrão): pedra escura com brilho de tochas, só CSS (`src/styles/miner.css`, classes `mn-backdrop*`); o embed de vídeo do TikTok continua disponível na variante `video`, desligada. O pai ainda não gostou do resultado: refazer como cena de mina gerada por IA na Etapa 5 (registrado no roteiro).
2. Números em fonte pixel que ficavam em 12 px (a classe `mc-num` vencia o `text-*` do Tailwind): cronômetro (36 px), resultados dos quizzes e contagem da punição (28 px), gold e contagem do Baú (16/18 px), aniversário e calendário. Fonte: `style={{ fontSize }}` inline.
3. Anel dourado da missão em foco no modo guiado nunca aparecia (o `ring` perdia para o `box-shadow` do `mc-row`): classe `is-focus` em `miner.css`.
4. Botões do login alinhados à esquerda (`mc-btn-row`).
5. `VacationBanner`: "Último dia" com acento e chip em Fredoka.
6. `PunishmentModeScreen`: spinner sem página aninhada (dois `mn-page` de 100vh).
7. `BirthdayCelebration`: o som de abertura tocava de novo a cada re-render do provedor de som; agora toca uma vez por abertura.
8. `RewardsPanel`: se a troca deixa de ser possível entre "Trocar" e "Confirmar", a confirmação fecha em vez de ficar aberta sem resposta.
9. Alvos de toque no celular: `w-11` virava 39 px abaixo de 768 px (a raiz tem 14 px de fonte): botões do cabeçalho, fechar do Baú/Calendário/Cronômetro/Conquistas, "Ocultar" dos lembretes e filtros passaram a 44 px reais.
10. Linhas do Baú e das missões a 390 px: o botão desce para baixo do texto (`flex-wrap` + `w-full sm:w-auto`) em vez de espremer o título em 72 px.
11. Conquistas bloqueadas quase invisíveis (borrão preto): `brightness(.9)` com opacidade 0,5.
12. Rótulos com acento fora da fonte pixel (regra 3 da especificação): "Manhã: 0/3", "gold disponível", "Nível N", tipo da conquista.
13. Ícone dos prêmios: o campo de emoji legado caía sempre na estrela; agora o ícone é pixel por categoria (guloseima = maçã, brinquedo = baú, atividade = mapa, privilégio = ouro). Provisório até os ícones próprios de prêmio da Etapa 1.
14. Toasts fora da lista da etapa, mas visíveis à criança, sem emoji: `DataContext` (conquista, sequência, nível, recompensa, missão surpresa, novo dia, troca) e `AuthContext`.

## O que fica para depois (registrado no roteiro)

- Fundo da tela: cena de mina gerada por IA (Etapa 5, lapidação visual).
- Dados no Firestore ainda com "Flash": lembretes "Hidratação Flash"/"Organização Flash" e conquistas "Flash Nível N", "Flash do Cubo Magico". Os lembretes serão substituídos pela Placa da Vila e as conquistas pelo pacote novo na Etapa 1 ("Iniciar nova fase"); não vale editar à mão.
- `LoadingSpinner` ainda aceita props `size`/`color` sem uso (limpeza futura).
- Quebras de linha misturadas (CRLF/LF) nos arquivos reescritos: inofensivo (o git normaliza); não normalizar agora.
- Relatório do Cursor, "dúvida 3" (acentos quebrados em `mc-h`/`mc-title`): as fotos mostram acentos corretos; ignorar.
- Painel dos pais: textos padrão "velocista" em `FlashReminderForm` e `NotificationSender` (fora do escopo; somem quando a Placa da Vila substituir o formulário).

## Fotos

Do Cursor: `docs/exemplos/telas/tema/` (login, início, Baú, calendário, conquistas, prova do dia, cronômetro, nas duas larguras). Da revisão (depois dos ajustes): Baú a 1280 e 390 px conferidos; nenhuma sobreposição ou texto cortado.
