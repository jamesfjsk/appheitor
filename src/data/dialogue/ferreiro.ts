import type { DialogueEntry } from '../../services/village/dialogue';
import { e, isMorning, isAfternoon, isEvening, isWeekend, dayComplete, nothingYet, oneLeft, quizPending, lv, daysBetween, minerBand } from './helpers';

// Ferreiro: poucas palavras, frases curtas. Fala de ferro, fogo e trabalho bem feito.
// Camadas: f_first_*, f_day_*, f_prog_*, f_friend_*, f_cur_*.

const N = 'ferreiro';

const FIRST: DialogueEntry[] = [
  e(N, 'f_first_build', ['Primeira obra.', 'Base firme. É assim que começa.'], (c) => c.firstTime.has('build'), { once: true, priority: 80 }),
  e(N, 'f_first_craft', ['Primeiro craft.', 'Ferramenta na mão muda o dia.'], (c) => c.firstTime.has('craft'), { once: true, priority: 80 }),
  e(N, 'f_first_quiz8', ['Oito de oito.', 'Sem rebarba. Trabalho limpo.'], (c) => c.firstTime.has('quiz8'), { once: true, priority: 80 }),
  e(N, 'f_first_chest', ['Baú aberto.', 'Dia inteiro rende. Viu?'], (c) => c.firstTime.has('chest'), { once: true, priority: 80 }),
  e(N, 'f_first_buy', ['Comprou.', 'Gold vira coisa. Coisa boa, espero.'], (c) => c.firstTime.has('buy'), { once: true, priority: 80 }),
  e(N, 'f_first_goal', ['Meta no Cofre.', 'Ferro também é assim: primeiro junta, depois forja.'], (c) => c.firstTime.has('goal'), { once: true, priority: 80 }),
  e(N, 'f_first_lv10', ['Nível 10.', 'Agora aguenta martelo pesado.'], minerBand(10, 15), { once: true, priority: 80 }),
  e(N, 'f_first_season', ['Uma temporada.', 'Treze semanas de fogo. Nunca apagou.'], (c) => c.firstTime.has('season'), { once: true, priority: 80 }),
];

const DAY: DialogueEntry[] = [
  e(N, 'f_day_morn1', ['Manhã. Carvão no fogo.', 'Madeira vem cedo. Junta.'], isMorning, { priority: 10 }),
  e(N, 'f_day_morn2', ['Cedo. Ferro frio corta mal.', 'Aquece o dia primeiro.'], isMorning, { priority: 10 }),
  e(N, 'f_day_aft1', ['Tarde. Pedra vem agora. Junta.'], isAfternoon, { priority: 10 }),
  e(N, 'f_day_eve1', ['Noite. Hora do ferro.', 'Depois, descanso.'], isEvening, { priority: 12 }),
  e(N, 'f_day_eve2', ['Escureceu. Brasa guardada rende amanhã.'], isEvening, { priority: 12 }),
  e(N, 'f_day_full1', ['Tudo feito.', 'Peça pronta. Sem trinca.'], dayComplete, { priority: 40 }),
  e(N, 'f_day_full2', ['Dia inteiro.', 'Assim se tempera ferro: todo dia, sem pular.'], dayComplete, { priority: 40 }),
  e(N, 'f_day_miss1', ['Ontem faltou uma.', 'Ferro também trinca. Aí a gente refaz.'], (c) => c.yesterday.missed, { priority: 50 }),
  e(N, 'f_day_miss2', ['Ontem escapou.', 'Hoje é peça nova. Começa.'], (c) => c.yesterday.missed, { priority: 50 }),
  e(N, 'f_day_pause1', ['Folga. Forja fria.', 'Até o fogo descansa.'], (c) => Boolean(c.pause), { priority: 45 }),
  e(N, 'f_day_punish1', ['Loja fechada hoje.', 'Martelo não sabe disso. Trabalha igual.'], (c) => Boolean(c.punish), { priority: 48 }),
  e(N, 'f_day_wknd1', ['Fim de semana. Forja não sabe que dia é.', 'Eu sei. Vai com calma.'], isWeekend, { priority: 15 }),
  e(N, 'f_day_quiz1', ['Prova ainda aberta.', 'Vai lá. Volta depois.'], quizPending, { priority: 14 }),
  e(N, 'f_day_none1', ['Nada feito ainda.', 'Uma só. A primeira martelada é a mais dura.'], nothingYet, { priority: 16 }),
  e(N, 'f_day_one1', ['Falta uma.', 'A última batida fecha a peça.'], oneLeft, { priority: 35 }),
];

const PROG: DialogueEntry[] = [
  e(N, 'f_prog_lv5', ['Nível 5.', 'Já sabe segurar o martelo.'], minerBand(5, 10), { once: true, priority: 30 }),
  e(N, 'f_prog_lv10', ['Nível 10.', 'O ferro te respeita agora.'], minerBand(10, 15), { once: true, priority: 30 }),
  e(N, 'f_prog_lv15', ['Nível 15.', 'Trabalho bem feito. Continua.'], minerBand(15, 20), { once: true, priority: 30 }),
  e(N, 'f_prog_lv20', ['Nível 20.', 'Nível 3 das obras abre para você. Vai com calma.'], minerBand(20, 30), { once: true, priority: 30 }),
  e(N, 'f_prog_lv30', ['Nível 30.', 'Poucos aguentam esse calor.'], minerBand(30, 40), { once: true, priority: 30 }),
  e(N, 'f_prog_lv40', ['Nível 40.', 'Mestre. Não digo isso à toa.'], minerBand(40), { once: true, priority: 30 }),
  e(N, 'f_prog_fornalha1', ['Fornalha acesa.', 'Primeiro contrato do dia rende mais. Usa.'], (c) => lv(c, 'fornalha') >= 1, { once: true, priority: 30 }),
  e(N, 'f_prog_fornalha2', ['Fundição aberta.', 'Três viram um. Não desperdiça.'], (c) => lv(c, 'fornalha') >= 2, { once: true, priority: 30 }),
  e(N, 'f_prog_fornalha3', ['Fornalha no máximo.', 'Cinco madeira, uma redstone. Uma vez por dia.'], (c) => lv(c, 'fornalha') >= 3, { once: true, priority: 30 }),
  e(N, 'f_prog_cerca1', ['Cerca de pé.', 'Um dia ruim por mês não apaga a tocha. Bom trabalho.'], (c) => lv(c, 'cerca') >= 1, { once: true, priority: 30 }),
  e(N, 'f_prog_days3', ['Três tochas.', 'O fogo pegou.'], (c) => daysBetween(c, 3, 6), { priority: 30 }),
  e(N, 'f_prog_days7', ['Sete tochas.', 'Uma semana de brasa. Ferro bom.'], (c) => daysBetween(c, 7, 20), { priority: 30 }),
  e(N, 'f_prog_days21', ['Vinte e uma tochas.', 'Isso é têmpera. Não quebra fácil.'], (c) => daysBetween(c, 21, 49), { priority: 30 }),
  e(N, 'f_prog_days50', ['Cinquenta.', 'Nunca vi. Aço puro.'], (c) => c.fullDays >= 50, { priority: 30 }),
];

const FRIEND: DialogueEntry[] = [
  e(N, 'f_friend_t0_1', ['Não te conheço.', 'Trabalha. Aí eu conheço.'], () => true, { tier: 0, priority: 20 }),
  e(N, 'f_friend_t0_2', ['Fala pouco. Faz muito.', 'É assim que eu gosto.'], () => true, { tier: 0, priority: 20 }),
  e(N, 'f_friend_t1_1', ['Conhecido.', 'Já sei o barulho do seu passo.'], () => true, { tier: 1, priority: 20 }),
  e(N, 'f_friend_t1_2', ['Você volta. Isso conta.'], () => true, { tier: 1, priority: 20 }),
  e(N, 'f_friend_t2_1', ['Colega.', 'Senta perto do fogo. Não precisa falar.'], () => true, { tier: 2, priority: 20 }),
  e(N, 'f_friend_t2_2', ['Colega de forja.', 'Meu pai me ensinou o ofício. Não com palavras.'], () => true, { tier: 2, priority: 20 }),
  e(N, 'f_friend_t3_1', ['Amigo.', 'Palavra pesada. Eu uso pouco.'], () => true, { tier: 3, priority: 20 }),
  e(N, 'f_friend_t3_2', ['Amigo, uma coisa:', 'a melhor peça que eu fiz quebrou. Fiz outra. Melhor.'], () => true, { tier: 3, priority: 20 }),
  e(N, 'f_friend_t4_1', ['Parceiro.', 'Martelo tem dois lados. Você é o outro.'], () => true, { tier: 4, priority: 20 }),
  e(N, 'f_friend_t4_2', ['Parceiro de bigorna.', 'O fogo cuida de quem cuida dele.'], () => true, { tier: 4, priority: 20 }),
  e(N, 'f_friend_t5_1', ['Lenda.', 'Um dia essa forja é sua.'], () => true, { tier: 5, priority: 20 }),
  e(N, 'f_friend_t5_2', ['Lenda da Vila.', 'Eu não digo muito. Mas digo isso: obrigado.'], () => true, { tier: 5, priority: 20 }),
];

const CUR: DialogueEntry[] = [
  e(N, 'f_cur_01', ['Ferro derrete a mil e quinhentos graus.', 'Fogo de fogueira não chega. Fornalha, sim.'], () => true, { priority: 2 }),
  e(N, 'f_cur_02', ['Aço é ferro com um pouco de carvão.', 'Pouco. Muito, quebra.'], () => true, { priority: 2 }),
  e(N, 'f_cur_03', ['Bronze veio antes do ferro.', 'Cobre e estanho. Mais mole, mais fácil.'], () => true, { priority: 2 }),
  e(N, 'f_cur_04', ['Ferrugem é ferro comendo ar e água.', 'Óleo na lâmina. Sempre.'], () => true, { priority: 2 }),
  e(N, 'f_cur_05', ['Têmpera: esquenta, esfria rápido.', 'Fica duro. Fica forte. Mas pode trincar.'], () => true, { priority: 2 }),
  e(N, 'f_cur_06', ['Martelo é mais velho que a roda.', 'Pedra amarrada num pau. Funcionava.'], () => true, { priority: 2 }),
  e(N, 'f_cur_07', ['Bigorna boa dura cem anos.', 'A minha tem setenta.'], () => true, { priority: 2 }),
  e(N, 'f_cur_08', ['Ouro é mole. Dá para riscar com a unha.', 'Bonito, mas não corta.'], () => true, { priority: 2 }),
  e(N, 'f_cur_09', ['Fogo precisa de três coisas: calor, ar e o que queimar.', 'Tira uma, apaga.'], () => true, { priority: 2 }),
  e(N, 'f_cur_10', ['Diamante corta vidro.', 'Vidro não corta diamante. Dureza é isso.'], () => true, { priority: 2 }),
  e(N, 'f_cur_11', ['Ferro vem da mina. Mina vem de pedra velha.', 'Tudo que é forte demorou.'], () => true, { priority: 2 }),
  e(N, 'f_cur_12', ['Pergunta: uma ferramenta gasta ainda é boa?', 'Depende da mão.'], () => true, { priority: 2 }),
  e(N, 'f_cur_13', ['Carvão é madeira que queimou sem ar.', 'Guarda a força, solta depois.'], () => true, { priority: 2 }),
  e(N, 'f_cur_14', ['Cobre conduz. Por isso o fio é de cobre.', 'Redstone é a mesma ideia.'], () => true, { priority: 2 }),
  e(N, 'f_cur_15', ['Faísca é pedaço de ferro queimando.', 'Pequeno. Quente.'], () => true, { priority: 2 }),
  e(N, 'f_cur_16', ['Espada boa é flexível. Dobra, não quebra.', 'Gente também.'], () => true, { priority: 2 }),
  e(N, 'f_cur_17', ['Pergunta: martelo pesado ou martelo certo?', 'Eu escolho o certo.'], () => true, { priority: 2 }),
  e(N, 'f_cur_18', ['Prego antigo era feito um por um.', 'Hoje sai mil por minuto. O meu ainda é um por um.'], () => true, { priority: 2 }),
  e(N, 'f_cur_19', ['Ferro quente fica laranja. Mais quente, amarelo. Depois branco.', 'A cor diz a temperatura. Não precisa de termômetro.'], () => true, { priority: 2 }),
  e(N, 'f_cur_20', ['Alumínio já foi mais caro que ouro.', 'Difícil de tirar da pedra. Depois ficou fácil.'], () => true, { priority: 2 }),
  e(N, 'f_cur_21', ['Ferradura protege o casco. Cavalo não reclama.', 'Trabalho invisível também é trabalho.'], () => true, { priority: 2 }),
  e(N, 'f_cur_22', ['Pergunta: o que vale mais, uma peça rápida ou uma peça certa?'], () => true, { priority: 2 }),
];

export const DIALOGUE: DialogueEntry[] = [...FIRST, ...DAY, ...PROG, ...FRIEND, ...CUR];
