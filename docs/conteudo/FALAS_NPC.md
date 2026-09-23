# Falas dos NPCs (bancos de `src/data/dialogue/`)

Gerado a partir dos arquivos `sabio.ts`, `comerciante.ts`, `ferreiro.ts` e `olheiro.ts`. Cada linha mostra o id e a primeira frase da entrada; as entradas do `fallback.ts` continuam valendo e não estão aqui.

Camadas: primeira vez (`*_first_*`, uma vez na vida, prioridade 80), estado do dia (`*_day_*`, 10 a 50), progresso (`*_prog_*`, 30), amizade (`*_friend_t<nível>_*`, 20) e curiosidade ou pergunta para pensar (`*_cur_*`, 2).

Para vetar: marque o id e o motivo; a fala sai do arquivo.

## Sábio (71 entradas)

| id | camada | primeira frase |
|---|---|---|
| `s_first_build` | primeira vez | Sua primeira obra. Toda vila começou com uma pedra em cima da outra. |
| `s_first_craft` | primeira vez | Você fez uma ferramenta. Os humanos fazem isso há dois milhões de anos. |
| `s_first_quiz8` | primeira vez | Acertou todas. Não foi sorte, foi atenção. |
| `s_first_chest` | primeira vez | O primeiro Baú abriu. Sabe o que ele guarda de verdade? |
| `s_first_buy` | primeira vez | Sua primeira compra. Trocou gold por uma coisa que queria. |
| `s_first_goal` | primeira vez | Uma meta no Cofrinho. Você mandou um recado para o seu futuro. |
| `s_first_lv10` | primeira vez | Nível 10. Dois dígitos. |
| `s_first_season` | primeira vez | Uma temporada inteira. Treze semanas. |
| `s_day_morn1` | estado do dia | Bom dia. O sol nasce sempre do mesmo lado, e mesmo assim cada dia é novo. |
| `s_day_morn2` | estado do dia | Manhã. A cabeça descansou; é a melhor hora para a parte difícil. |
| `s_day_aft1` | estado do dia | Boa tarde. Metade do dia já contou a história dela. |
| `s_day_eve1` | estado do dia | A noite chegou. Olha para cima quando puder: a luz das estrelas é antiga. |
| `s_day_eve2` | estado do dia | Anoiteceu. Uma pergunta antes de dormir: |
| `s_day_full1` | estado do dia | Tudo feito. Repara como a Vila fica mais quieta quando o dia está inteiro. |
| `s_day_full2` | estado do dia | Fechou o dia. Aristóteles diria que somos o que repetimos. |
| `s_day_miss1` | estado do dia | Ontem ficou uma para trás. Acontece com todo mundo que tenta. |
| `s_day_miss2` | estado do dia | Ontem escapou uma missão. |
| `s_day_pause1` | estado do dia | Dia de folga. Até o campo precisa descansar para dar boa colheita. |
| `s_day_punish1` | estado do dia | Mercado fechado por hoje. Não é o fim de nada. |
| `s_day_wknd1` | estado do dia | Fim de semana. O tempo passa igual, mas a gente sente diferente. Curioso, não? |
| `s_day_quiz1` | estado do dia | A prova de hoje ainda espera. Oito perguntas, e nenhuma é pegadinha. |
| `s_day_none1` | estado do dia | Nada feito ainda hoje. Sem problema: todo caminho começa parado. |
| `s_day_one1` | estado do dia | Falta uma. A última costuma ser a que a gente mais lembra depois. |
| `s_prog_lv5` | progresso | Nível 5. Você já entende como a Vila funciona. |
| `s_prog_lv10` | progresso | Nível 10. Pitágoras achava que os números explicam o mundo. |
| `s_prog_lv15` | progresso | Nível 15. Sócrates dizia que só sabia que nada sabia. |
| `s_prog_lv20` | progresso | Nível 20. Metade de 40, o dobro de 10. |
| `s_prog_lv30` | progresso | Nível 30. Poucos chegam aqui, e nenhum chega por acaso. |
| `s_prog_lv40` | progresso | Nível 40. Eu já não tenho muito a te ensinar. |
| `s_prog_mesa1` | progresso | A Biblioteca abriu. Um livro é uma conversa com alguém que não está aqui. |
| `s_prog_fornalha1` | progresso | A Fornalha acesa. Fogo controlado foi a primeira grande invenção humana. |
| `s_prog_torre1` | progresso | A Torre de pé. Lá de cima dá para ver o que você já fez. |
| `s_prog_cofre1` | progresso | O Cofre existe. Guardar é uma forma de esperar. |
| `s_prog_days3` | progresso | Três dias inteiros. Um hábito começa mais ou menos assim: três vezes seguidas. |
| `s_prog_days7` | progresso | Sete tochas. Uma semana: a Lua mudou de fase e você não mudou de rumo. |
| `s_prog_days21` | progresso | Vinte e uma tochas. |
| `s_prog_days50` | progresso | Cinquenta dias inteiros. Isso já não é esforço. É quem você é. |
| `s_friend_t0_1` | amizade | Ainda não sei muito de você. Mas todo mundo começa desconhecido. |
| `s_friend_t0_2` | amizade | Passa aqui quando quiser. Eu gosto mais de perguntas do que de respostas. |
| `s_friend_t1_1` | amizade | Já nos conhecemos um pouco. Me diz: você prefere descobrir ou inventar? |
| `s_friend_t1_2` | amizade | Conhecido, então. Tem uma pergunta que eu guardo para quem volta. |
| `s_friend_t2_1` | amizade | Colega. Sabe por que eu leio tanto? Porque cada livro é uma vida a mais. |
| `s_friend_t2_2` | amizade | Já conversamos bastante. O que você acha que existia antes das estrelas? |
| `s_friend_t3_1` | amizade | Amigo. Eu não uso essa palavra à toa. |
| `s_friend_t3_2` | amizade | Entre amigos dá para dizer: eu também erro na prova às vezes. |
| `s_friend_t4_1` | amizade | Parceiro. Você e eu já pensamos em muita coisa juntos. |
| `s_friend_t4_2` | amizade | Parceiro, uma confissão: a Biblioteca era minha. |
| `s_friend_t5_1` | amizade | Lenda da Vila. Eu já vi muita gente passar por aqui. |
| `s_friend_t5_2` | amizade | Lenda. Um dia você vai contar essa história para alguém. |
| `s_cur_01` | curiosidade | Sabia que a luz do Sol leva oito minutos para chegar aqui? |
| `s_cur_02` | curiosidade | Um filósofo grego disse que ninguém entra duas vezes no mesmo rio. |
| `s_cur_03` | curiosidade | Pergunta para pensar: uma pedra sabe que é pedra? |
| `s_cur_04` | curiosidade | O seu corpo troca quase todas as células em alguns anos. |
| `s_cur_05` | curiosidade | O diamante e o carvão são feitos do mesmo carbono. |
| `s_cur_06` | curiosidade | Sabia que o ferro do seu sangue nasceu dentro de uma estrela? |
| `s_cur_07` | curiosidade | Sócrates achava que perguntar vale mais do que responder. |
| `s_cur_08` | curiosidade | A redstone lembra a eletricidade. E a de verdade são elétrons correndo. |
| `s_cur_09` | curiosidade | Se você trocasse todas as tábuas de um barco, ele ainda seria o mesmo barco? |
| `s_cur_10` | curiosidade | A Lua se afasta da Terra uns quatro centímetros por ano. |
| `s_cur_11` | curiosidade | Água ferve a cem graus aqui embaixo. No alto de uma montanha, ferve antes. |
| `s_cur_12` | curiosidade | Pergunta: se ninguém ouvir uma árvore cair, ela fez barulho? |
| `s_cur_13` | curiosidade | Uma formiga carrega cinquenta vezes o próprio peso. |
| `s_cur_14` | curiosidade | Aristóteles dizia que a coragem fica no meio: entre o medo e a imprudência. |
| `s_cur_15` | curiosidade | O som viaja mais devagar que a luz. Por isso o trovão chega depois do raio. |
| `s_cur_16` | curiosidade | Sabia que o ouro não enferruja? Por isso o de dois mil anos ainda brilha. |
| `s_cur_17` | curiosidade | Pergunta para hoje: o que é mais difícil, começar ou continuar? |
| `s_cur_18` | curiosidade | Os antigos achavam que a Terra era o centro de tudo. |
| `s_cur_19` | curiosidade | Um cientista não diz 'tenho certeza'. Ele diz 'até agora, os dados mostram isso'. |
| `s_cur_20` | curiosidade | A gente esquece a maior parte do que lê. Mas o que fica muda o jeito de pensar. |
| `s_cur_21` | curiosidade | O vidro é feito de areia derretida. A janela da sua casa já foi praia. |
| `s_cur_22` | curiosidade | Pergunta: se você pudesse saber uma coisa, qualquer coisa, qual seria? |

## Comerciante (71 entradas)

| id | camada | primeira frase |
|---|---|---|
| `c_first_build` | primeira vez | Construiu! Gastou material, mas gastou certo. |
| `c_first_craft` | primeira vez | Uma ferramenta feita em casa. Sabe quanto eu cobraria por essa? Muito. |
| `c_first_quiz8` | primeira vez | Todas certas na prova. Isso não se compra, eu já tentei. |
| `c_first_chest` | primeira vez | Seu primeiro Baú do Dia. Abriu sozinho, sem chave e sem taxa. |
| `c_first_buy` | primeira vez | Sua primeira compra! Fico feliz. O gold, nem tanto. |
| `c_first_goal` | primeira vez | Uma meta no Cofrinho? Guardar em vez de gastar? Comigo aqui do lado? |
| `c_first_lv10` | primeira vez | Nível 10. Nesse ritmo, daqui a pouco você vai querer comprar a minha barraca. |
| `c_first_season` | primeira vez | Uma temporada inteira e a barraca continua de pé. Milagre. |
| `c_day_morn1` | estado do dia | Bom dia! Preço da manhã: o mesmo de ontem. Eu sou consistente. |
| `c_day_morn2` | estado do dia | Manhã é hora de madeira. Junta bastante, que madeira eu não pago muito. |
| `c_day_aft1` | estado do dia | Boa tarde. Hora da pedra. Minha hora preferida do dia, por motivos óbvios. |
| `c_day_eve1` | estado do dia | Noite. Hora do ferro. Ferro pesa, mas vale. |
| `c_day_eve2` | estado do dia | Anoiteceu. Contei o estoque três vezes. Continua faltando pedra. |
| `c_day_full1` | estado do dia | Tudo feito hoje. O Baú abre às 18h, e é de graça. De graça! |
| `c_day_full2` | estado do dia | Dia completo. Cliente que fecha o dia é cliente que volta. |
| `c_day_miss1` | estado do dia | Ontem ficou uma missão para trás. Já fiz negócio pior e sobrevivi. |
| `c_day_miss2` | estado do dia | Uma missão escapou ontem. Eu já perdi uma carga inteira num rio. |
| `c_day_pause1` | estado do dia | Folga! Barraca fechada, eu deitado na rede. |
| `c_day_wknd1` | estado do dia | Fim de semana. Movimento fraco, preço firme. |
| `c_day_quiz1` | estado do dia | A prova do Sábio ainda está lá. É a única coisa de graça nessa Vila. |
| `c_day_none1` | estado do dia | Meio-dia e nada no quadro? O estoque não se enche sozinho. |
| `c_day_one1` | estado do dia | Falta uma. Uma só. É como faltar uma moeda para fechar a conta. |
| `c_day_ycomp1` | estado do dia | Ontem você fechou tudo. O estoque do dia entrou certinho. |
| `c_prog_lv5` | progresso | Nível 5. Já sabe onde a pedra fica e quanto ela vale. |
| `c_prog_lv10` | progresso | Nível 10. Cliente de dois dígitos ganha desconto. Brincadeira, não ganha. |
| `c_prog_lv15` | progresso | Nível 15. Nessa altura, eu já não te vendo nada errado. |
| `c_prog_lv20` | progresso | Nível 20. Quando eu tinha o seu nível, minha barraca era uma caixa virada. |
| `c_prog_lv30` | progresso | Nível 30. Se você abrisse uma barraca, eu ficaria preocupado. |
| `c_prog_lv40` | progresso | Nível 40. Já vi muito minerador passar por aqui. Nenhum chegou tão longe. |
| `c_prog_mercado1` | progresso | A barraca de pé! Toldo novo, balcão firme. |
| `c_prog_bau1` | progresso | Armazém construído. Agora dá para ver o que você tem. |
| `c_prog_cofre1` | progresso | O Cofre. Gold guardado rende bônus de paciência. |
| `c_prog_fornalha2` | progresso | Fornalha nível 2: a Fundição abriu. Troca três por um. |
| `c_prog_days3` | progresso | Três tochas. Três dias sem furo. Comércio gosta de gente assim. |
| `c_prog_days7` | progresso | Sete tochas. Uma semana de dias inteiros. |
| `c_prog_days21` | progresso | Vinte e uma tochas. Três semanas. Isso já é uma parede de fogo. |
| `c_prog_days50` | progresso | Cinquenta dias inteiros. Eu contei duas vezes, não acreditei. |
| `c_friend_t0_1` | amizade | Desconhecido, mas cliente. Toda amizade começa com uma troca. |
| `c_friend_t0_2` | amizade | Ainda não te conheço. Mas se tiver pedra, a gente se conhece rápido. |
| `c_friend_t1_1` | amizade | Conhecido! Já sei o seu nome e quanto material você traz. As duas coisas importam. |
| `c_friend_t1_2` | amizade | Agora que a gente se conhece, um segredo: eu não sou tão pão-duro assim. |
| `c_friend_t2_1` | amizade | Colega. Sabe o que eu faria com cinco pedras? Nada. Só olharia. É lindo. |
| `c_friend_t2_2` | amizade | Colega de barraca. Se eu cochilar no balcão, você vigia? |
| `c_friend_t3_1` | amizade | Amigo. Isso vale mais que gold. Não muito mais, mas vale. |
| `c_friend_t3_2` | amizade | Amigo, uma dica de comerciante: o melhor negócio é o que os dois saem sorrindo. |
| `c_friend_t4_1` | amizade | Parceiro. Se um dia a barraca cair, eu sei quem vai me ajudar a levantar. |
| `c_friend_t4_2` | amizade | Parceiro de negócios. Você é o único que eu deixo olhar o estoque de trás. |
| `c_friend_t5_1` | amizade | Lenda da Vila. Eu vou pendurar o seu nome no toldo. |
| `c_friend_t5_2` | amizade | Lenda. Sabe quantos clientes chegaram aqui? Um. Você. |
| `c_cur_01` | curiosidade | Antes do dinheiro, a gente trocava: sal por pele, pele por trigo. |
| `c_cur_02` | curiosidade | A primeira moeda foi feita há uns 2.600 anos, de ouro misturado com prata. |
| `c_cur_03` | curiosidade | Sabia que o papel-moeda nasceu na China? Papel! Que valia ouro! |
| `c_cur_04` | curiosidade | Pergunta de comerciante: uma coisa é cara porque é rara ou é rara porque é cara? |
| `c_cur_05` | curiosidade | Diamante é só carbono apertado. Pedra também é pedra apertada. |
| `c_cur_06` | curiosidade | Troca boa é quando cada um dá o que tem sobrando e leva o que faltava. |
| `c_cur_07` | curiosidade | Poupar é comprar tempo. Você guarda hoje para escolher melhor depois. |
| `c_cur_08` | curiosidade | Sabia que os romanos pagavam soldados com sal? |
| `c_cur_09` | curiosidade | Preço não é o que a coisa vale. É o que alguém topa pagar. |
| `c_cur_10` | curiosidade | Pergunta para pensar: se todo mundo tivesse diamante, o diamante valeria alguma coisa? |
| `c_cur_11` | curiosidade | O primeiro banco do mundo era um templo. Guardavam trigo, não gold. |
| `c_cur_12` | curiosidade | Juro é o preço de esperar. Quem guarda ganha; quem tem pressa paga. |
| `c_cur_13` | curiosidade | Sabia que 'pecúnia', uma palavra antiga para dinheiro, vem de gado? |
| `c_cur_14` | curiosidade | Um comerciante bom conta o estoque todo dia. Não porque some. Porque ele conhece. |
| `c_cur_15` | curiosidade | Ouro é raro, macio e não enferruja. Por isso virou dinheiro. |
| `c_cur_16` | curiosidade | Pergunta: o que você compraria se tivesse gold infinito? E depois disso? |
| `c_cur_17` | curiosidade | Barganha é conversa com número no meio. Quem escuta mais, paga menos. |
| `c_cur_18` | curiosidade | O cheque foi inventado para ninguém carregar moeda pesada na estrada. |
| `c_cur_19` | curiosidade | Pergunta de comerciante: você prefere dez pedras hoje ou quinze daqui a uma semana? |
| `c_cur_20` | curiosidade | Todo material tem estação. Madeira de manhã, pedra à tarde, ferro à noite. |
| `c_cur_21` | curiosidade | Redstone eu não troco na Fundição. Coisa rara não entra em promoção. |
| `c_cur_22` | curiosidade | Sabia que 'mercado' vem de 'mercar', que é negociar? |

## Ferreiro (71 entradas)

| id | camada | primeira frase |
|---|---|---|
| `f_first_build` | primeira vez | Primeira obra. |
| `f_first_craft` | primeira vez | Primeiro craft. |
| `f_first_quiz8` | primeira vez | Todas certas. |
| `f_first_chest` | primeira vez | Baú aberto. |
| `f_first_buy` | primeira vez | Comprou. |
| `f_first_goal` | primeira vez | Meta no Cofre. |
| `f_first_lv10` | primeira vez | Nível 10. |
| `f_first_season` | primeira vez | Uma temporada. |
| `f_day_morn1` | estado do dia | Manhã. Carvão no fogo. |
| `f_day_morn2` | estado do dia | Cedo. Ferro frio corta mal. |
| `f_day_aft1` | estado do dia | Tarde. Pedra vem agora. Junta. |
| `f_day_eve1` | estado do dia | Noite. Hora do ferro. |
| `f_day_eve2` | estado do dia | Escureceu. Brasa guardada rende amanhã. |
| `f_day_full1` | estado do dia | Tudo feito. |
| `f_day_full2` | estado do dia | Dia inteiro. |
| `f_day_miss1` | estado do dia | Ontem faltou uma. |
| `f_day_miss2` | estado do dia | Ontem escapou. |
| `f_day_pause1` | estado do dia | Folga. Forja fria. |
| `f_day_punish1` | estado do dia | Loja fechada hoje. |
| `f_day_wknd1` | estado do dia | Fim de semana. Forja não sabe que dia é. |
| `f_day_quiz1` | estado do dia | Prova ainda aberta. |
| `f_day_none1` | estado do dia | Nada feito ainda. |
| `f_day_one1` | estado do dia | Falta uma. |
| `f_prog_lv5` | progresso | Nível 5. |
| `f_prog_lv10` | progresso | Nível 10. |
| `f_prog_lv15` | progresso | Nível 15. |
| `f_prog_lv20` | progresso | Nível 20. |
| `f_prog_lv30` | progresso | Nível 30. |
| `f_prog_lv40` | progresso | Nível 40. |
| `f_prog_fornalha1` | progresso | Fornalha acesa. |
| `f_prog_fornalha2` | progresso | Fundição aberta. |
| `f_prog_fornalha3` | progresso | Fornalha no máximo. |
| `f_prog_cerca1` | progresso | Cerca de pé. |
| `f_prog_days3` | progresso | Três tochas. |
| `f_prog_days7` | progresso | Sete tochas. |
| `f_prog_days21` | progresso | Vinte e uma tochas. |
| `f_prog_days50` | progresso | Cinquenta. |
| `f_friend_t0_1` | amizade | Não te conheço. |
| `f_friend_t0_2` | amizade | Fala pouco. Faz muito. |
| `f_friend_t1_1` | amizade | Conhecido. |
| `f_friend_t1_2` | amizade | Você volta. Isso conta. |
| `f_friend_t2_1` | amizade | Colega. |
| `f_friend_t2_2` | amizade | Colega de forja. |
| `f_friend_t3_1` | amizade | Amigo. |
| `f_friend_t3_2` | amizade | Amigo, uma coisa: |
| `f_friend_t4_1` | amizade | Parceiro. |
| `f_friend_t4_2` | amizade | Parceiro de bigorna. |
| `f_friend_t5_1` | amizade | Lenda. |
| `f_friend_t5_2` | amizade | Lenda da Vila. |
| `f_cur_01` | curiosidade | Ferro derrete a mil e quinhentos graus. |
| `f_cur_02` | curiosidade | Aço é ferro com um pouco de carvão. |
| `f_cur_03` | curiosidade | Bronze veio antes do ferro. |
| `f_cur_04` | curiosidade | Ferrugem é ferro comendo ar e água. |
| `f_cur_05` | curiosidade | Têmpera: esquenta, esfria rápido. |
| `f_cur_06` | curiosidade | Martelo é mais velho que a roda. |
| `f_cur_07` | curiosidade | Bigorna boa dura cem anos. |
| `f_cur_08` | curiosidade | Ouro é mole. Dá para riscar com a unha. |
| `f_cur_09` | curiosidade | Fogo precisa de três coisas: calor, ar e o que queimar. |
| `f_cur_10` | curiosidade | Diamante corta vidro. |
| `f_cur_11` | curiosidade | Ferro vem da mina. Mina vem de pedra velha. |
| `f_cur_12` | curiosidade | Pergunta: uma ferramenta gasta ainda é boa? |
| `f_cur_13` | curiosidade | Carvão é madeira que queimou sem ar. |
| `f_cur_14` | curiosidade | Cobre conduz. Por isso o fio é de cobre. |
| `f_cur_15` | curiosidade | Faísca é pedaço de ferro queimando. |
| `f_cur_16` | curiosidade | Espada boa é flexível. Dobra, não quebra. |
| `f_cur_17` | curiosidade | Pergunta: martelo pesado ou martelo certo? |
| `f_cur_18` | curiosidade | Prego antigo era feito um por um. |
| `f_cur_19` | curiosidade | Ferro quente fica laranja. Mais quente, amarelo. Depois branco. |
| `f_cur_20` | curiosidade | Alumínio já foi mais caro que ouro. |
| `f_cur_21` | curiosidade | Ferradura protege o casco. Cavalo não reclama. |
| `f_cur_22` | curiosidade | Pergunta: o que vale mais, uma peça rápida ou uma peça certa? |

## Olheiro (71 entradas)

| id | camada | primeira frase |
|---|---|---|
| `o_first_build` | primeira vez | Primeira obra. É como o primeiro treino: ninguém vê, mas o time sente. |
| `o_first_craft` | primeira vez | Fez a própria ferramenta. Jogador que cuida da chuteira joga melhor. Regra antiga. |
| `o_first_quiz8` | primeira vez | Todas certas. Isso é pênalti no ângulo. Sem chance para o goleiro. |
| `o_first_chest` | primeira vez | Primeiro Baú. Fechou o dia inteiro, e o prêmio veio. |
| `o_first_buy` | primeira vez | Primeira compra. Escolheu bem? Escolher é parte do jogo. |
| `o_first_goal` | primeira vez | Uma meta no Cofrinho. Meta, no futebol e no banco, é onde você mira. |
| `o_first_lv10` | primeira vez | Nível 10. Camisa 10 é de quem decide o jogo. |
| `o_first_season` | primeira vez | Uma temporada inteira. Treze rodadas sem abandonar o campeonato. |
| `o_day_morn1` | estado do dia | Bom dia. Os jogadores que eu mais gosto de ver são os que chegam cedo no treino. |
| `o_day_morn2` | estado do dia | Manhã. Aquece antes de correr. Uma missão leve primeiro. |
| `o_day_aft1` | estado do dia | Boa tarde. O intervalo acabou. O que você faz agora decide o placar. |
| `o_day_eve1` | estado do dia | Noite. Acréscimos. É quando os grandes jogos se decidem. |
| `o_day_eve2` | estado do dia | Anoiteceu. Bom jogador dorme cedo. Ninguém corre bem cansado. |
| `o_day_full1` | estado do dia | Dia completo. Não teve golaço, teve trabalho. É disso que eu gosto. |
| `o_day_full2` | estado do dia | Tudo feito. Se eu estivesse com a prancheta, anotava: 'joga os 90 minutos'. |
| `o_day_miss1` | estado do dia | Ontem faltou uma. Todo time perde uma partida por temporada. |
| `o_day_miss2` | estado do dia | Ontem escapou uma. Até o melhor centroavante perde gol feito. |
| `o_day_pause1` | estado do dia | Folga. Descanso faz parte do treino. Músculo cresce quando para. |
| `o_day_wknd1` | estado do dia | Fim de semana. Dia de jogo lá fora. Aqui dentro, o mesmo esforço vale. |
| `o_day_quiz1` | estado do dia | A prova ainda não foi. Oito perguntas. Encara como uma cobrança de pênalti. |
| `o_day_none1` | estado do dia | Nada ainda hoje. Sem problema, o jogo começa no apito, não no relógio. |
| `o_day_one1` | estado do dia | Falta uma. Um a zero para você no fim do jogo. Segura o resultado. |
| `o_day_ycomp1` | estado do dia | Ontem foi dia inteiro. Jogador que repete o bom jogo vira titular. |
| `o_prog_lv5` | progresso | Nível 5. Já passou da peneira. Agora é categoria de base. |
| `o_prog_lv10` | progresso | Nível 10. Se fosse futebol, eu já teria ligado para um clube grande. |
| `o_prog_lv15` | progresso | Nível 15. Sabe o que eu vi? Você não desistiu nos níveis chatos, aqueles do meio. |
| `o_prog_lv20` | progresso | Nível 20. Profissional. Daqui para frente, cada nível custa mais suor. |
| `o_prog_lv30` | progresso | Nível 30. Isso é seleção. Eu olhei muito jogador e poucos chegam aqui. |
| `o_prog_lv40` | progresso | Nível 40. Camisa aposentada. Ninguém mais usa esse número na Vila. |
| `o_prog_torre1` | progresso | A Torre de pé. Todo clube tem sala de troféus. |
| `o_prog_torre2` | progresso | Torre nível 2: agora tem Recordes. |
| `o_prog_cerca1` | progresso | A Cerca protege a tocha uma vez por mês. |
| `o_prog_bau1` | progresso | Armazém construído. Vestiário organizado, time concentrado. |
| `o_prog_days3` | progresso | Três tochas seguidas. Três jogos sem perder. Isso já é sequência. |
| `o_prog_days7` | progresso | Sete tochas. Uma semana invicta. |
| `o_prog_days21` | progresso | Vinte e uma tochas. Três semanas sem perder. |
| `o_prog_days50` | progresso | Cinquenta tochas. Recorde de invencibilidade da Vila. |
| `o_friend_t0_1` | amizade | Ainda não te conheço. Mas eu olho todo mundo do mesmo jeito: pelo esforço. |
| `o_friend_t0_2` | amizade | Desconhecido, por enquanto. Olheiro não julga no primeiro treino. |
| `o_friend_t1_1` | amizade | Conhecido. Já anotei seu nome na prancheta. A lápis, por enquanto. |
| `o_friend_t1_2` | amizade | Agora eu sei quem você é: alguém que volta. Isso já diz muito. |
| `o_friend_t2_1` | amizade | Colega. Me conta: qual é o seu time? O meu é o que joga com raça. |
| `o_friend_t2_2` | amizade | Colega de arquibancada. Eu já vi jogo que virou no último minuto. |
| `o_friend_t3_1` | amizade | Amigo. Passou da prancheta para a memória. Seu nome está lá, a caneta. |
| `o_friend_t3_2` | amizade | Amigo, uma coisa que nunca disse: o jogador que eu mais admirei não era o craque. |
| `o_friend_t4_1` | amizade | Parceiro. Se eu montasse um time hoje, você seria o primeiro nome. E o capitão. |
| `o_friend_t4_2` | amizade | Parceiro. Sabe o que eu aprendi olhando você? Que constância também é talento. |
| `o_friend_t5_1` | amizade | Lenda da Vila. Eu já vi muito jogo. Nunca vi ninguém jogar tantos dias seguidos. |
| `o_friend_t5_2` | amizade | Lenda. Um dia vão perguntar como você chegou aqui. |
| `o_cur_01` | curiosidade | Um jogador de futebol corre uns dez quilômetros por partida. |
| `o_cur_02` | curiosidade | O coração é um músculo. Treina como qualquer outro. |
| `o_cur_03` | curiosidade | Pergunta de olheiro: o que faz um bom capitão? Não é o gol. |
| `o_cur_04` | curiosidade | Água é o combustível mais barato do atleta. |
| `o_cur_05` | curiosidade | Sabia que dormir faz parte do treino? O músculo cresce dormindo, não correndo. |
| `o_cur_06` | curiosidade | Pelé fez mais de mil gols. O primeiro foi com bola de meia. |
| `o_cur_07` | curiosidade | Uma bola de futebol clássica tem 32 gomos: 12 pentágonos e 20 hexágonos. |
| `o_cur_08` | curiosidade | Aquecer não é frescura. Músculo frio rasga. |
| `o_cur_09` | curiosidade | O goleiro toca menos na bola e decide mais jogos. |
| `o_cur_10` | curiosidade | Pergunta: o que é mais difícil, ganhar ou continuar ganhando? |
| `o_cur_11` | curiosidade | Um bom passe vale mais que um drible bonito. O time avança, não só você. |
| `o_cur_12` | curiosidade | Seu corpo tem mais de 600 músculos. Chutar usa uns 200 de uma vez. |
| `o_cur_13` | curiosidade | Recorde não é contra os outros. Recorde é você de ontem contra você de hoje. |
| `o_cur_14` | curiosidade | Sabia que o futebol começou sem trave, sem árbitro e sem regra de mão? |
| `o_cur_15` | curiosidade | Treino no dia sem vontade é o que o olheiro anota. |
| `o_cur_16` | curiosidade | Pergunta de vestiário: |
| `o_cur_17` | curiosidade | Alongar depois do jogo é tão importante quanto antes. |
| `o_cur_18` | curiosidade | Uma partida tem 90 minutos, mas a bola rola uns 55. |
| `o_cur_19` | curiosidade | Sabia que respirar fundo acalma de verdade? O corpo entende como sinal de calma. |
| `o_cur_20` | curiosidade | Marcar no fim do jogo, cansado, é o teste do preparo físico. |
| `o_cur_21` | curiosidade | Time bom tem banco bom. Quem entra no segundo tempo também ganha o jogo. |
| `o_cur_22` | curiosidade | Pergunta: se ninguém estivesse olhando, você treinaria igual? |

