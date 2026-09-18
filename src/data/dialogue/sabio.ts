import type { DialogueEntry } from '../../services/village/dialogue';
import { e, isMorning, isAfternoon, isEvening, isWeekend, dayComplete, nothingYet, oneLeft, quizPending, lv, daysBetween, minerBand } from './helpers';

// Sábio: calmo, faz perguntas, cita ideias simples de filosofia e ciência. Nunca dá sermão.
// Camadas: s_first_* (primeira vez), s_day_* (estado do dia), s_prog_* (progresso),
// s_friend_* (amizade), s_cur_* (curiosidade e pergunta para pensar).

const N = 'sabio';

const FIRST: DialogueEntry[] = [
  e(N, 's_first_build', ['Sua primeira obra. Toda vila começou com uma pedra em cima da outra.', 'Qual vai ser a próxima?'], (c) => c.firstTime.has('build'), { once: true, priority: 80 }),
  e(N, 's_first_craft', ['Você fez uma ferramenta. Os humanos fazem isso há dois milhões de anos.', 'Agora ela faz parte de você.'], (c) => c.firstTime.has('craft'), { once: true, priority: 80 }),
  e(N, 's_first_quiz8', ['Oito de oito. Não foi sorte, foi atenção.', 'Guarda esse jeito de ler as perguntas.'], (c) => c.firstTime.has('quiz8'), { once: true, priority: 80 }),
  e(N, 's_first_chest', ['O primeiro Baú abriu. Sabe o que ele guarda de verdade?', 'Um dia inteiro que você fechou.'], (c) => c.firstTime.has('chest'), { once: true, priority: 80 }),
  e(N, 's_first_buy', ['Sua primeira compra. Trocou gold por uma coisa que queria.', 'Escolher já é uma forma de pensar.'], (c) => c.firstTime.has('buy'), { once: true, priority: 80 }),
  e(N, 's_first_goal', ['Uma meta no Cofrinho. Você mandou um recado para o seu futuro.', 'Ele vai receber.'], (c) => c.firstTime.has('goal'), { once: true, priority: 80 }),
  e(N, 's_first_lv10', ['Nível 10. Dois dígitos.', 'Lembra do nível 1? Eu lembro. Você mudou desde lá.'], minerBand(10, 15), { once: true, priority: 80 }),
  e(N, 's_first_season', ['Uma temporada inteira. Treze semanas.', 'A Terra andou um quarto da volta em torno do Sol. Você também andou.'], (c) => c.firstTime.has('season'), { once: true, priority: 80 }),
];

const DAY: DialogueEntry[] = [
  e(N, 's_day_morn1', ['Bom dia. O sol nasce sempre do mesmo lado, e mesmo assim cada dia é novo.'], isMorning, { priority: 10 }),
  e(N, 's_day_morn2', ['Manhã. A cabeça descansou; é a melhor hora para a parte difícil.'], isMorning, { priority: 10 }),
  e(N, 's_day_aft1', ['Boa tarde. Metade do dia já contou a história dela.', 'A outra metade ainda está em branco.'], isAfternoon, { priority: 10 }),
  e(N, 's_day_eve1', ['A noite chegou. Olha para cima quando puder: a luz das estrelas é antiga.'], isEvening, { priority: 12 }),
  e(N, 's_day_eve2', ['Anoiteceu. Uma pergunta antes de dormir:', 'o que você sabe hoje que não sabia ontem?'], isEvening, { priority: 12 }),
  e(N, 's_day_full1', ['Tudo feito. Repara como a Vila fica mais quieta quando o dia está inteiro.'], dayComplete, { priority: 40 }),
  e(N, 's_day_full2', ['Fechou o dia. Aristóteles diria que somos o que repetimos.', 'Hoje você repetiu a coisa certa.'], dayComplete, { priority: 40 }),
  e(N, 's_day_miss1', ['Ontem ficou uma para trás. Acontece com todo mundo que tenta.', 'O que dá para fazer diferente hoje?'], (c) => c.yesterday.missed, { priority: 50 }),
  e(N, 's_day_miss2', ['Ontem escapou uma missão.', 'Os rios também desviam de pedra, e mesmo assim chegam ao mar.'], (c) => c.yesterday.missed, { priority: 50 }),
  e(N, 's_day_pause1', ['Dia de folga. Até o campo precisa descansar para dar boa colheita.', 'Hoje, nada de missão.'], (c) => Boolean(c.pause), { priority: 45 }),
  e(N, 's_day_punish1', ['Mercado fechado por hoje. Não é o fim de nada.', 'Amanhã a porta abre como sempre. A Biblioteca já está aberta.'], (c) => Boolean(c.punish), { priority: 48 }),
  e(N, 's_day_wknd1', ['Fim de semana. O tempo passa igual, mas a gente sente diferente. Curioso, não?'], isWeekend, { priority: 15 }),
  e(N, 's_day_quiz1', ['A prova de hoje ainda espera. Oito perguntas, e nenhuma é pegadinha.'], quizPending, { priority: 14 }),
  e(N, 's_day_none1', ['Nada feito ainda hoje. Sem problema: todo caminho começa parado.', 'Qual missão é a mais fácil? Começa por ela.'], nothingYet, { priority: 16 }),
  e(N, 's_day_one1', ['Falta uma. A última costuma ser a que a gente mais lembra depois.'], oneLeft, { priority: 35 }),
];

const PROG: DialogueEntry[] = [
  e(N, 's_prog_lv5', ['Nível 5. Você já entende como a Vila funciona.', 'Agora vem a parte boa: escolher o que construir.'], minerBand(5, 10), { once: true, priority: 30 }),
  e(N, 's_prog_lv10', ['Nível 10. Pitágoras achava que os números explicam o mundo.', 'O seu, pelo menos, explica bastante.'], minerBand(10, 15), { once: true, priority: 30 }),
  e(N, 's_prog_lv15', ['Nível 15. Sócrates dizia que só sabia que nada sabia.', 'Você já sabe bem mais do que isso.'], minerBand(15, 20), { once: true, priority: 30 }),
  e(N, 's_prog_lv20', ['Nível 20. Metade de 40, o dobro de 10.', 'Os números são simples; o caminho até eles, não.'], minerBand(20, 30), { once: true, priority: 30 }),
  e(N, 's_prog_lv30', ['Nível 30. Poucos chegam aqui, e nenhum chega por acaso.', 'O que te trouxe até aqui?'], minerBand(30, 40), { once: true, priority: 30 }),
  e(N, 's_prog_lv40', ['Nível 40. Eu já não tenho muito a te ensinar.', 'Talvez agora seja você quem me ensina.'], minerBand(40), { once: true, priority: 30 }),
  e(N, 's_prog_mesa1', ['A Biblioteca abriu. Um livro é uma conversa com alguém que não está aqui.', 'A prova do dia mora nela.'], (c) => lv(c, 'mesa') >= 1, { once: true, priority: 30 }),
  e(N, 's_prog_fornalha1', ['A Fornalha acesa. Fogo controlado foi a primeira grande invenção humana.', 'A sua já rende mais material.'], (c) => lv(c, 'fornalha') >= 1, { once: true, priority: 30 }),
  e(N, 's_prog_torre1', ['A Torre de pé. Lá de cima dá para ver o que você já fez.', 'Sobe de vez em quando.'], (c) => lv(c, 'torre') >= 1, { once: true, priority: 30 }),
  e(N, 's_prog_cofre1', ['O Cofre existe. Guardar é uma forma de esperar.', 'E esperar bem é uma arte.'], (c) => lv(c, 'cofre') >= 1, { once: true, priority: 30 }),
  e(N, 's_prog_days3', ['Três dias inteiros. Um hábito começa mais ou menos assim: três vezes seguidas.'], (c) => daysBetween(c, 3, 6), { priority: 30 }),
  e(N, 's_prog_days7', ['Sete tochas. Uma semana: a Lua mudou de fase e você não mudou de rumo.'], (c) => daysBetween(c, 7, 20), { priority: 30 }),
  e(N, 's_prog_days21', ['Vinte e uma tochas.', 'Dizem que 21 dias fazem um hábito. Não é ciência exata, mas hoje eu acredito.'], (c) => daysBetween(c, 21, 49), { priority: 30 }),
  e(N, 's_prog_days50', ['Cinquenta dias inteiros. Isso já não é esforço. É quem você é.'], (c) => c.fullDays >= 50, { priority: 30 }),
];

const FRIEND: DialogueEntry[] = [
  e(N, 's_friend_t0_1', ['Ainda não sei muito de você. Mas todo mundo começa desconhecido.'], () => true, { tier: 0, priority: 20 }),
  e(N, 's_friend_t0_2', ['Passa aqui quando quiser. Eu gosto mais de perguntas do que de respostas.'], () => true, { tier: 0, priority: 20 }),
  e(N, 's_friend_t1_1', ['Já nos conhecemos um pouco. Me diz: você prefere descobrir ou inventar?'], () => true, { tier: 1, priority: 20 }),
  e(N, 's_friend_t1_2', ['Conhecido, então. Tem uma pergunta que eu guardo para quem volta.', 'Ela vem depois.'], () => true, { tier: 1, priority: 20 }),
  e(N, 's_friend_t2_1', ['Colega. Sabe por que eu leio tanto? Porque cada livro é uma vida a mais.'], () => true, { tier: 2, priority: 20 }),
  e(N, 's_friend_t2_2', ['Já conversamos bastante. O que você acha que existia antes das estrelas?'], () => true, { tier: 2, priority: 20 }),
  e(N, 's_friend_t3_1', ['Amigo. Eu não uso essa palavra à toa.', 'Amigo é quem faz a pergunta difícil e fica para ouvir.'], () => true, { tier: 3, priority: 20 }),
  e(N, 's_friend_t3_2', ['Entre amigos dá para dizer: eu também erro na prova às vezes.', 'Só não conto para o Ferreiro.'], () => true, { tier: 3, priority: 20 }),
  e(N, 's_friend_t4_1', ['Parceiro. Você e eu já pensamos em muita coisa juntos.', 'Qual foi a pergunta mais difícil até agora?'], () => true, { tier: 4, priority: 20 }),
  e(N, 's_friend_t4_2', ['Parceiro, uma confissão: a Biblioteca era minha.', 'Agora é nossa.'], () => true, { tier: 4, priority: 20 }),
  e(N, 's_friend_t5_1', ['Lenda da Vila. Eu já vi muita gente passar por aqui.', 'Ninguém ficou tanto quanto você.'], () => true, { tier: 5, priority: 20 }),
  e(N, 's_friend_t5_2', ['Lenda. Um dia você vai contar essa história para alguém.', 'Conta a parte difícil também.'], () => true, { tier: 5, priority: 20 }),
];

const CUR: DialogueEntry[] = [
  e(N, 's_cur_01', ['Sabia que a luz do Sol leva oito minutos para chegar aqui?', 'Você vê o Sol de oito minutos atrás.'], () => true, { priority: 2 }),
  e(N, 's_cur_02', ['Um filósofo grego disse que ninguém entra duas vezes no mesmo rio.', 'A água muda. Você também.'], () => true, { priority: 2 }),
  e(N, 's_cur_03', ['Pergunta para pensar: uma pedra sabe que é pedra?'], () => true, { priority: 2 }),
  e(N, 's_cur_04', ['O seu corpo troca quase todas as células em alguns anos.', 'Você ainda é você? Pensa nisso.'], () => true, { priority: 2 }),
  e(N, 's_cur_05', ['O diamante e o carvão são feitos do mesmo carbono.', 'A diferença é pressão e tempo.'], () => true, { priority: 2 }),
  e(N, 's_cur_06', ['Sabia que o ferro do seu sangue nasceu dentro de uma estrela?', 'Todo mundo tem um pouco de estrela.'], () => true, { priority: 2 }),
  e(N, 's_cur_07', ['Sócrates achava que perguntar vale mais do que responder.', 'Qual pergunta você faria a ele?'], () => true, { priority: 2 }),
  e(N, 's_cur_08', ['A redstone lembra a eletricidade. E a de verdade são elétrons correndo.', 'Bem pequenos, bem rápidos.'], () => true, { priority: 2 }),
  e(N, 's_cur_09', ['Se você trocasse todas as tábuas de um barco, ele ainda seria o mesmo barco?', 'Os gregos discutem isso até hoje.'], () => true, { priority: 2 }),
  e(N, 's_cur_10', ['A Lua se afasta da Terra uns quatro centímetros por ano.', 'Devagar, mas sem parar. Como as tochas.'], () => true, { priority: 2 }),
  e(N, 's_cur_11', ['Água ferve a cem graus aqui embaixo. No alto de uma montanha, ferve antes.', 'O ar pesa menos lá.'], () => true, { priority: 2 }),
  e(N, 's_cur_12', ['Pergunta: se ninguém ouvir uma árvore cair, ela fez barulho?'], () => true, { priority: 2 }),
  e(N, 's_cur_13', ['Uma formiga carrega cinquenta vezes o próprio peso.', 'Força não é tamanho.'], () => true, { priority: 2 }),
  e(N, 's_cur_14', ['Aristóteles dizia que a coragem fica no meio: entre o medo e a imprudência.', 'Onde fica a sua?'], () => true, { priority: 2 }),
  e(N, 's_cur_15', ['O som viaja mais devagar que a luz. Por isso o trovão chega depois do raio.', 'Conta os segundos da próxima vez.'], () => true, { priority: 2 }),
  e(N, 's_cur_16', ['Sabia que o ouro não enferruja? Por isso o de dois mil anos ainda brilha.'], () => true, { priority: 2 }),
  e(N, 's_cur_17', ['Pergunta para hoje: o que é mais difícil, começar ou continuar?'], () => true, { priority: 2 }),
  e(N, 's_cur_18', ['Os antigos achavam que a Terra era o centro de tudo.', 'Foi preciso alguém duvidar para descobrir o resto.'], () => true, { priority: 2 }),
  e(N, 's_cur_19', ["Um cientista não diz 'tenho certeza'. Ele diz 'até agora, os dados mostram isso'.", 'Acho bonito.'], () => true, { priority: 2 }),
  e(N, 's_cur_20', ['A gente esquece a maior parte do que lê. Mas o que fica muda o jeito de pensar.', 'Vale a pena mesmo assim.'], () => true, { priority: 2 }),
  e(N, 's_cur_21', ['O vidro é feito de areia derretida. A janela da sua casa já foi praia.'], () => true, { priority: 2 }),
  e(N, 's_cur_22', ['Pergunta: se você pudesse saber uma coisa, qualquer coisa, qual seria?'], () => true, { priority: 2 }),
];

export const DIALOGUE: DialogueEntry[] = [...FIRST, ...DAY, ...PROG, ...FRIEND, ...CUR];
