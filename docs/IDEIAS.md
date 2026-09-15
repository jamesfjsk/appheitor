# Ideias e desejos para o Miner Missions (o "norte")

Lista viva do que queremos ver no projeto pronto. Tudo o que o pai ou o Claude pensar entra aqui primeiro; cada etapa puxa daqui o que cabe. Nada aqui é compromisso de prazo. Quando uma ideia vira parte de uma etapa, marcar a etapa; quando for descartada, dizer por quê.

## Já decididas (onde entram)

- Vila viva em canvas com sprites gerados por IA, sem andar (Etapa 1).
- Personagem com equipamentos e cosméticos; loja em gold; construções e equipamentos em materiais (Etapa 1-2).
- Missões pagam gold, XP e material por período; Baú do Dia; horários por período; reversão pelo pai (Etapa 1).
- Prova do dia como portão do jogo, não modal (Etapa 1).
- Placa da Vila no lugar dos lembretes: recados do pai com prazo, avisos automáticos, hábito do turno com um toque (Etapa 1-3).
- Prêmios de verdade recadastrados do zero com ícones pixel próprios (Etapa 1).
- Nova fase: XP zerado, conquistas novas com tema de mina (fim da Etapa 1).
- Cofrinho com juros e teto, Extrato do minerador, Desafios com prazo, Temporadas, Conserto, Missão atrasada (Etapa 2).
- Sábio e Diário do Minerador, Oficina de Redstone (lógica), falas dos NPCs com humor, Cartas com dilema, Capítulo da semana em português, Conta do Comerciante, Museu (Etapa 3).
- Datas especiais, Novidades, decorações, pets, Campinho e futebol, Turno na Mina, animações (Etapa 4).
- Trilha sonora, cinemáticas, primeiro acesso guiado, PWA, relatório mensal, fundo da tela refeito, lapidação visual tela por tela (Etapa 5).

## Em aberto (anotar aqui conforme surgir)

- Fundo da tela do Heitor ainda não agrada: cena de mina gerada, com profundidade (Etapa 5).
- Voz dos NPCs (TTS) nas falas da Placa e do Sábio, com botão de ouvir.
- Modo tela cheia "arcade" com música ao abrir a Vila.
- Segredos escondidos na Vila (3 na Etapa 4).
- Álbum de figurinhas dos "achados" (Museu).
- Ranking pessoal semanal (Troféu da semana) e recordes.
- Avatar animado comemorando quando fecha o dia.
- Integração com a agenda da família (compromissos viram recados da Placa automaticamente).


## Auditoria da tela da criança (15/09/2026): o que está perdido e o que vira

Pedido do pai: apontar de forma proativa o que não serve e propor algo útil. Cada item abaixo já tem destino no roteiro.

| Hoje | Problema | Vira | Quando |
|---|---|---|---|
| Cronômetro ("Ampulheta") | ferramenta solta, sem ligação com nada | **Agenda do Minerador**: provas, eventos, treinos e aniversários com lembrete por push, plano de estudo com blocos "Foco" (o cronômetro vive aqui), XP por organização | Etapa 2, Lote 1 (`ETAPA_2_BANCO_E_TEMPORADA.md`, seção 13) |
| Mapa (calendário só de histórico) | olha só para trás | aba Mês da Agenda: passado (tochas, gold) e futuro (itens) no mesmo lugar | junto com a Agenda |
| Clicar numa construção abre a Oficina inteira | confuso: a construção não tem "cara" própria | **Cartão da construção**: o que ela faz, nível, próximo nível com custo e "Melhorar", e a ação dela (Baú = inventário, Torre = conquistas, Mesa = tema de amanhã, Fornalha = Mina) | Etapa 1B (seção 3b) |
| Placa da Vila | só avisos fixos | mostra "Hoje" e "Amanhã" da Agenda, resposta do Sábio ao check-in, troféu da semana | Etapa 2 |
| Torre (conquistas) vazia | "Peça para o papai criar" | pacote de conquistas entra na "nova fase" (18/09); recordes, troféus e mapa de habilidades | 18/09 e Etapa 2 |
| Chat FlashGPT (desligado) | código morto na tela | o Sábio da Biblioteca (conversa curta antes da prova, resposta ao Diário) | Etapa 3 |
| Missão surpresa (30 perguntas de uma vez) | cansativa | Expedição do conhecimento em checkpoints, só fim de semana | Etapa 3 |
| Resumo de ontem | só constata | "Conserte hoje": o que aconteceu e o que fazer, lote rachado que se conserta | Etapa 2 |
| Botão "Baú de recompensas" no cabeçalho | mesmo conteúdo da aba do Mercado e nome confunde com o Baú do Dia | um lugar só: Mercado > Prêmios de verdade; o cabeçalho ganha o chip do próximo evento da Agenda | Etapa 2 |
| "Turno em andamento / mínimo / completo" | jargão | "Ainda tem missão", "Prova e missões feitas", "Dia completo, Baú aberto" | correção rápida (revisão da Etapa 1, item M17) |
| Editor de personagem escondido no clique do boneco | ninguém descobre | botão "Meu minerador" na grade e dica no primeiro acesso | Etapa 1B (hover) e Etapa 2 |

| NPCs parados com balão | placa com desenho | **Vida dos personagens**: reagem ao toque (viram, falam com a boca mexendo, acenam), piscam, andam entre pontos por hora, reagem a missão, nível e Baú; animação desenhada na Etapa 4 | Etapa 2, Lote 2 (seção 14) e Etapa 4 |
| Falas fixas dos NPCs | repetem e não sabem quem o Heitor é | **Diálogos que evoluem**: amizade por NPC (corações), pedidos em capítulos, falas condicionadas ao dia, ao progresso e à primeira vez de cada coisa; presentes de amizade sem gold | Etapa 2, Lote 2 (seção 15); bancos grandes na Etapa 3 |
| Hora lida de 24 jeitos (PC, UTC, Intl) | Baú, períodos e datas podem discordar; PC com relógio errado engana o jogo | **Relógio da Vila**: um módulo só, horário de Brasília corrigido pelo servidor, virada de meia-noite tratada, relógio visível no cabeçalho | Etapa 2, Lote 1, item 0 (seção 16) |
| Loja e editor sem padrão, sem inventário, sem resposta ao comprar | ele não sabe o que tem nem o que está usando; comprar não emociona | **Sistema de itens** (`docs/VILA_ITENS.md`): um `ItemSlot` para tudo, moldura de raridade, estados (seu, equipado, bloqueado, novo), Mochila com boneco de papel, experimentar antes de comprar, ícone voando para a mochila | Etapa 2, Lote 1 (seção 17) |
| Oficina desconectada da Loja e do personagem | lista cinza, "Faltam materiais" sem dizer quanto, "Na ordem" sem explicar, itens sem efeito gastando material | **Ferraria** do Ferreiro: Forjar com preview no minerador e cerimônia, Fundição liberada pela Fornalha, Obras só leitura; mesmo `ItemSlot`; bloqueio do que ainda não tem efeito | Etapa 2, Lote 1 (seção 17, `VILA_ITENS.md`) |
| "Baú" com três sentidos, prêmios com duas portas, histórico dentro dos prêmios, Banco sem lugar | ele não entende onde o gold entra, sai e fica | **Mapa da Vila** (`docs/VILA_MAPA.md`): glossário de uma palavra por coisa, cabeçalho com chips que abrem Extrato/Torre/Mochila, 8 distritos, Mercado com prêmios embutidos e "Meus pedidos", Banco com Cofrinho, Extrato e Paciência | Etapa 2, Lote 1 (seção 18) |

Regra geral (15/09): o jogo é um universo conectado; cada módulo recebe de outro e entrega para outro (tabela "O universo conectado" no roadmap). Ideia nova só entra aqui com essas duas ligações escritas.
| Missões soltas abaixo da cena, "fora da vila" | a coisa mais importante do jogo não tem lugar no mundo | **Casa do Minerador**: construção fixa na cena onde moram as missões, o plano do turno, o fechar o dia e o diário; cresce por temporada; a Vila mostra só a faixa "Hoje" | Etapa 2, Lote 1 (`VILA_CONSTRUCOES.md`, construção 8) |
