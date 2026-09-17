import type { DialogueEntry } from '../../services/village/dialogue';
import { e, isMorning, isAfternoon, isEvening, isWeekend, dayComplete, nothingYet, oneLeft, quizPending, lv, daysBetween } from './helpers';

// Olheiro: fala de futebol e de caráter. Vê talento no esforço; comenta constância e recordes.
// Sem fala de punição (só Sábio e Ferreiro).
// Camadas: o_first_*, o_day_*, o_prog_*, o_friend_*, o_cur_*.

const N = 'olheiro';

const FIRST: DialogueEntry[] = [
  e(N, 'o_first_build', ['Primeira obra. É como o primeiro treino: ninguém vê, mas o time sente.'], (c) => c.firstTime.has('build'), { once: true, priority: 80 }),
  e(N, 'o_first_craft', ['Fez a própria ferramenta. Jogador que cuida da chuteira joga melhor. Regra antiga.'], (c) => c.firstTime.has('craft'), { once: true, priority: 80 }),
  e(N, 'o_first_quiz8', ['Oito de oito. Isso é pênalti no ângulo. Sem chance para o goleiro.'], (c) => c.firstTime.has('quiz8'), { once: true, priority: 80 }),
  e(N, 'o_first_chest', ['Primeiro Baú. Fechou o dia inteiro, e o prêmio veio.', 'É assim que se ganha campeonato: um jogo de cada vez.'], (c) => c.firstTime.has('chest'), { once: true, priority: 80 }),
  e(N, 'o_first_buy', ['Primeira compra. Escolheu bem? Escolher é parte do jogo.', 'O capitão também escolhe.'], (c) => c.firstTime.has('buy'), { once: true, priority: 80 }),
  e(N, 'o_first_goal', ['Uma meta no Cofrinho. Meta, no futebol e no banco, é onde você mira.', 'Agora chuta na direção dela.'], (c) => c.firstTime.has('goal'), { once: true, priority: 80 }),
  e(N, 'o_first_lv10', ['Nível 10. Camisa 10 é de quem decide o jogo.', 'Você começou a decidir o seu.'], (c) => c.firstTime.has('lv10'), { once: true, priority: 80 }),
  e(N, 'o_first_season', ['Uma temporada inteira. Treze rodadas sem abandonar o campeonato.', 'Poucos aguentam a primeira. Você aguentou.'], (c) => c.firstTime.has('season'), { once: true, priority: 80 }),
];

const DAY: DialogueEntry[] = [
  e(N, 'o_day_morn1', ['Bom dia. Os jogadores que eu mais gosto de ver são os que chegam cedo no treino.'], isMorning, { priority: 10 }),
  e(N, 'o_day_morn2', ['Manhã. Aquece antes de correr. Uma missão leve primeiro.'], isMorning, { priority: 10 }),
  e(N, 'o_day_aft1', ['Boa tarde. O intervalo acabou. O que você faz agora decide o placar.'], isAfternoon, { priority: 10 }),
  e(N, 'o_day_eve1', ['Noite. Acréscimos. É quando os grandes jogos se decidem.'], isEvening, { priority: 12 }),
  e(N, 'o_day_eve2', ['Anoiteceu. Bom jogador dorme cedo. Ninguém corre bem cansado.'], isEvening, { priority: 12 }),
  e(N, 'o_day_full1', ['Dia completo. Não teve golaço, teve trabalho. É disso que eu gosto.'], dayComplete, { priority: 40 }),
  e(N, 'o_day_full2', ["Tudo feito. Se eu estivesse com a prancheta, anotava: 'joga os 90 minutos'."], dayComplete, { priority: 40 }),
  e(N, 'o_day_miss1', ['Ontem faltou uma. Todo time perde uma partida por temporada.', 'O que importa é o próximo jogo.'], (c) => c.yesterday.missed, { priority: 50 }),
  e(N, 'o_day_miss2', ['Ontem escapou uma. Até o melhor centroavante perde gol feito.', 'Ele volta e faz o próximo.'], (c) => c.yesterday.missed, { priority: 50 }),
  e(N, 'o_day_pause1', ['Folga. Descanso faz parte do treino. Músculo cresce quando para.', 'Hoje, banco de reservas com orgulho.'], (c) => Boolean(c.pause), { priority: 45 }),
  e(N, 'o_day_wknd1', ['Fim de semana. Dia de jogo lá fora. Aqui dentro, o mesmo esforço vale.'], isWeekend, { priority: 15 }),
  e(N, 'o_day_quiz1', ['A prova ainda não foi. Oito perguntas. Encara como uma cobrança de pênalti.'], quizPending, { priority: 14 }),
  e(N, 'o_day_none1', ['Nada ainda hoje. Sem problema, o jogo começa no apito, não no relógio.', 'Apita você.'], nothingYet, { priority: 16 }),
  e(N, 'o_day_one1', ['Falta uma. Um a zero para você no fim do jogo. Segura o resultado.'], oneLeft, { priority: 35 }),
  e(N, 'o_day_ycomp1', ['Ontem foi dia inteiro. Jogador que repete o bom jogo vira titular.', 'Hoje é a segunda partida.'], (c) => c.yesterday.complete, { priority: 18 }),
];

const PROG: DialogueEntry[] = [
  e(N, 'o_prog_lv5', ['Nível 5. Já passou da peneira. Agora é categoria de base.'], (c) => c.level >= 5, { once: true, priority: 30 }),
  e(N, 'o_prog_lv10', ['Nível 10. Se fosse futebol, eu já teria ligado para um clube grande.'], (c) => c.level >= 10, { once: true, priority: 30 }),
  e(N, 'o_prog_lv15', ['Nível 15. Sabe o que eu vi? Você não desistiu nos níveis chatos, aqueles do meio.'], (c) => c.level >= 15, { once: true, priority: 30 }),
  e(N, 'o_prog_lv20', ['Nível 20. Profissional. Daqui para frente, cada nível custa mais suor.', 'Você tem.'], (c) => c.level >= 20, { once: true, priority: 30 }),
  e(N, 'o_prog_lv30', ['Nível 30. Isso é seleção. Eu olhei muito jogador e poucos chegam aqui.'], (c) => c.level >= 30, { once: true, priority: 30 }),
  e(N, 'o_prog_lv40', ['Nível 40. Camisa aposentada. Ninguém mais usa esse número na Vila.'], (c) => c.level >= 40, { once: true, priority: 30 }),
  e(N, 'o_prog_torre1', ['A Torre de pé. Todo clube tem sala de troféus.', 'A sua começou hoje.'], (c) => lv(c, 'torre') >= 1, { once: true, priority: 30 }),
  e(N, 'o_prog_torre2', ['Torre nível 2: agora tem Recordes.', 'Recorde é para quebrar. O seu próprio, principalmente.'], (c) => lv(c, 'torre') >= 2, { once: true, priority: 30 }),
  e(N, 'o_prog_cerca1', ['A Cerca protege a tocha uma vez por mês.', 'É a defesa do time. Sem defesa, o ataque não ganha nada.'], (c) => lv(c, 'cerca') >= 1, { once: true, priority: 30 }),
  e(N, 'o_prog_bau1', ['Armazém construído. Vestiário organizado, time concentrado.'], (c) => lv(c, 'bau') >= 1, { once: true, priority: 30 }),
  e(N, 'o_prog_days3', ['Três tochas seguidas. Três jogos sem perder. Isso já é sequência.'], (c) => daysBetween(c, 3, 6), { priority: 30 }),
  e(N, 'o_prog_days7', ['Sete tochas. Uma semana invicta.', 'Sabe o que eu vejo? Um jogador em quem dá para confiar.'], (c) => daysBetween(c, 7, 20), { priority: 30 }),
  e(N, 'o_prog_days21', ['Vinte e uma tochas. Três semanas sem perder.', 'Isso não é talento. É melhor que talento: é hábito.'], (c) => daysBetween(c, 21, 49), { priority: 30 }),
  e(N, 'o_prog_days50', ['Cinquenta tochas. Recorde de invencibilidade da Vila.', 'Eu vou contar essa história por muito tempo.'], (c) => c.fullDays >= 50, { priority: 30 }),
];

const FRIEND: DialogueEntry[] = [
  e(N, 'o_friend_t0_1', ['Ainda não te conheço. Mas eu olho todo mundo do mesmo jeito: pelo esforço.'], () => true, { tier: 0, priority: 20 }),
  e(N, 'o_friend_t0_2', ['Desconhecido, por enquanto. Olheiro não julga no primeiro treino.'], () => true, { tier: 0, priority: 20 }),
  e(N, 'o_friend_t1_1', ['Conhecido. Já anotei seu nome na prancheta. A lápis, por enquanto.'], () => true, { tier: 1, priority: 20 }),
  e(N, 'o_friend_t1_2', ['Agora eu sei quem você é: alguém que volta. Isso já diz muito.'], () => true, { tier: 1, priority: 20 }),
  e(N, 'o_friend_t2_1', ['Colega. Me conta: qual é o seu time? O meu é o que joga com raça.'], () => true, { tier: 2, priority: 20 }),
  e(N, 'o_friend_t2_2', ['Colega de arquibancada. Eu já vi jogo que virou no último minuto.', 'Nunca saio antes do fim.'], () => true, { tier: 2, priority: 20 }),
  e(N, 'o_friend_t3_1', ['Amigo. Passou da prancheta para a memória. Seu nome está lá, a caneta.'], () => true, { tier: 3, priority: 20 }),
  e(N, 'o_friend_t3_2', ['Amigo, uma coisa que nunca disse: o jogador que eu mais admirei não era o craque.', 'Era o que treinava com ninguém olhando.'], () => true, { tier: 3, priority: 20 }),
  e(N, 'o_friend_t4_1', ['Parceiro. Se eu montasse um time hoje, você seria o primeiro nome. E o capitão.'], () => true, { tier: 4, priority: 20 }),
  e(N, 'o_friend_t4_2', ['Parceiro. Sabe o que eu aprendi olhando você? Que constância também é talento.'], () => true, { tier: 4, priority: 20 }),
  e(N, 'o_friend_t5_1', ['Lenda da Vila. Eu já vi muito jogo. Nunca vi ninguém jogar tantos dias seguidos.'], () => true, { tier: 5, priority: 20 }),
  e(N, 'o_friend_t5_2', ['Lenda. Um dia vão perguntar como você chegou aqui.', 'Responde a verdade: um dia de cada vez.'], () => true, { tier: 5, priority: 20 }),
];

const CUR: DialogueEntry[] = [
  e(N, 'o_cur_01', ['Um jogador de futebol corre uns dez quilômetros por partida.', 'Andando, correndo, parado. Tudo conta.'], () => true, { priority: 2 }),
  e(N, 'o_cur_02', ['O coração é um músculo. Treina como qualquer outro.', 'Correr é treino de coração.'], () => true, { priority: 2 }),
  e(N, 'o_cur_03', ['Pergunta de olheiro: o que faz um bom capitão? Não é o gol.'], () => true, { priority: 2 }),
  e(N, 'o_cur_04', ['Água é o combustível mais barato do atleta.', 'Bebe antes de sentir sede.'], () => true, { priority: 2 }),
  e(N, 'o_cur_05', ['Sabia que dormir faz parte do treino? O músculo cresce dormindo, não correndo.'], () => true, { priority: 2 }),
  e(N, 'o_cur_06', ['Pelé fez mais de mil gols. O primeiro foi com bola de meia.', 'Todo mundo começa com bola de meia.'], () => true, { priority: 2 }),
  e(N, 'o_cur_07', ['Uma bola de futebol clássica tem 32 gomos: 12 pentágonos e 20 hexágonos.', 'Geometria que rola.'], () => true, { priority: 2 }),
  e(N, 'o_cur_08', ['Aquecer não é frescura. Músculo frio rasga.', 'Ferro também: o Ferreiro sabe.'], () => true, { priority: 2 }),
  e(N, 'o_cur_09', ['O goleiro toca menos na bola e decide mais jogos.', 'Tem posição que é assim.'], () => true, { priority: 2 }),
  e(N, 'o_cur_10', ['Pergunta: o que é mais difícil, ganhar ou continuar ganhando?'], () => true, { priority: 2 }),
  e(N, 'o_cur_11', ['Um bom passe vale mais que um drible bonito. O time avança, não só você.'], () => true, { priority: 2 }),
  e(N, 'o_cur_12', ['Seu corpo tem mais de 600 músculos. Chutar usa uns 200 de uma vez.'], () => true, { priority: 2 }),
  e(N, 'o_cur_13', ['Recorde não é contra os outros. Recorde é você de ontem contra você de hoje.'], () => true, { priority: 2 }),
  e(N, 'o_cur_14', ['Sabia que o futebol começou sem trave, sem árbitro e sem regra de mão?', 'A regra deixou o jogo melhor.'], () => true, { priority: 2 }),
  e(N, 'o_cur_15', ['Treino no dia sem vontade é o que o olheiro anota.', 'O resto todo mundo faz.'], () => true, { priority: 2 }),
  e(N, 'o_cur_16', ['Pergunta de vestiário:', 'melhor de um time fraco ou pior de um time forte?'], () => true, { priority: 2 }),
  e(N, 'o_cur_17', ['Alongar depois do jogo é tão importante quanto antes.', 'O corpo agradece no dia seguinte.'], () => true, { priority: 2 }),
  e(N, 'o_cur_18', ['Uma partida tem 90 minutos, mas a bola rola uns 55.', 'O resto é se posicionar. O jogo mental.'], () => true, { priority: 2 }),
  e(N, 'o_cur_19', ['Sabia que respirar fundo acalma de verdade? O corpo entende como sinal de calma.', 'Vale antes do pênalti e da prova.'], () => true, { priority: 2 }),
  e(N, 'o_cur_20', ['Marcar no fim do jogo, cansado, é o teste do preparo físico.', 'Preparo se faz na semana, não no domingo.'], () => true, { priority: 2 }),
  e(N, 'o_cur_21', ['Time bom tem banco bom. Quem entra no segundo tempo também ganha o jogo.'], () => true, { priority: 2 }),
  e(N, 'o_cur_22', ['Pergunta: se ninguém estivesse olhando, você treinaria igual?'], () => true, { priority: 2 }),
];

export const DIALOGUE: DialogueEntry[] = [...FIRST, ...DAY, ...PROG, ...FRIEND, ...CUR];
