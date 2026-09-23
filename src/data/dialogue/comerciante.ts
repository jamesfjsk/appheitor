import type { DialogueEntry } from '../../services/village/dialogue';
import { e, isMorning, isAfternoon, isEvening, isWeekend, dayComplete, nothingYet, oneLeft, quizPending, lv, daysBetween, minerBand } from './helpers';

// Comerciante: pão-duro e engraçado. Fala de preço, troca e material. Adora pedra.
// Sem fala de punição (só Sábio e Ferreiro).
// Camadas: c_first_*, c_day_*, c_prog_*, c_friend_*, c_cur_*.

const N = 'comerciante';

const FIRST: DialogueEntry[] = [
  e(N, 'c_first_build', ['Construiu! Gastou material, mas gastou certo.', 'Eu quase chorei vendo a pedra ir embora. Quase.'], (c) => c.firstTime.has('build'), { once: true, priority: 80 }),
  e(N, 'c_first_craft', ['Uma ferramenta feita em casa. Sabe quanto eu cobraria por essa? Muito.', 'E você fez de graça. Esperto.'], (c) => c.firstTime.has('craft'), { once: true, priority: 80 }),
  e(N, 'c_first_quiz8', ['Todas certas na prova. Isso não se compra, eu já tentei.', 'Fica com o troco.'], (c) => c.firstTime.has('quiz8'), { once: true, priority: 80 }),
  e(N, 'c_first_chest', ['Seu primeiro Baú do Dia. Abriu sozinho, sem chave e sem taxa.', 'Aproveita, que aqui na barraca nada é assim.'], (c) => c.firstTime.has('chest'), { once: true, priority: 80 }),
  e(N, 'c_first_buy', ['Sua primeira compra! Fico feliz. O gold, nem tanto.', 'Brincadeira. Gold bem gasto volta em alegria.'], (c) => c.firstTime.has('buy'), { once: true, priority: 80 }),
  e(N, 'c_first_goal', ['Uma meta no Cofrinho? Guardar em vez de gastar? Comigo aqui do lado?', 'Tá bom, admito: foi bem pensado.'], (c) => c.firstTime.has('goal'), { once: true, priority: 80 }),
  e(N, 'c_first_lv10', ['Nível 10. Nesse ritmo, daqui a pouco você vai querer comprar a minha barraca.', 'Não está à venda. Ainda.'], minerBand(10, 15), { once: true, priority: 80 }),
  e(N, 'c_first_season', ['Uma temporada inteira e a barraca continua de pé. Milagre.', 'Treze semanas de negócio. Você é o meu melhor cliente.'], (c) => c.firstTime.has('season'), { once: true, priority: 80 }),
];

const DAY: DialogueEntry[] = [
  e(N, 'c_day_morn1', ['Bom dia! Preço da manhã: o mesmo de ontem. Eu sou consistente.'], isMorning, { priority: 10 }),
  e(N, 'c_day_morn2', ['Manhã é hora de madeira. Junta bastante, que madeira eu não pago muito.'], isMorning, { priority: 10 }),
  e(N, 'c_day_aft1', ['Boa tarde. Hora da pedra. Minha hora preferida do dia, por motivos óbvios.'], isAfternoon, { priority: 10 }),
  e(N, 'c_day_eve1', ['Noite. Hora do ferro. Ferro pesa, mas vale.', 'Traz que eu confiro.'], isEvening, { priority: 12 }),
  e(N, 'c_day_eve2', ['Anoiteceu. Contei o estoque três vezes. Continua faltando pedra.', 'Sempre falta pedra.'], isEvening, { priority: 12 }),
  e(N, 'c_day_full1', ['Tudo feito hoje. O Baú abre às 18h, e é de graça. De graça!', 'Nem eu entendo esse modelo de negócio.'], dayComplete, { priority: 40 }),
  e(N, 'c_day_full2', ['Dia completo. Cliente que fecha o dia é cliente que volta.', 'E cliente que volta paga a minha janta.'], dayComplete, { priority: 40 }),
  e(N, 'c_day_miss1', ['Ontem ficou uma missão para trás. Já fiz negócio pior e sobrevivi.', 'Hoje o balcão está limpo.'], (c) => c.yesterday.missed, { priority: 50 }),
  e(N, 'c_day_miss2', ['Uma missão escapou ontem. Eu já perdi uma carga inteira num rio.', 'A gente seca e segue.'], (c) => c.yesterday.missed, { priority: 50 }),
  e(N, 'c_day_pause1', ['Folga! Barraca fechada, eu deitado na rede.', 'Nem pedra eu vendo hoje. E olha que eu vendo sempre.'], (c) => Boolean(c.pause), { priority: 45 }),
  e(N, 'c_day_wknd1', ['Fim de semana. Movimento fraco, preço firme.', 'Se aparecer pedra, eu topo.'], isWeekend, { priority: 15 }),
  e(N, 'c_day_quiz1', ['A prova do Sábio ainda está lá. É a única coisa de graça nessa Vila.', 'Aproveita antes que eu convença ele a cobrar.'], quizPending, { priority: 14 }),
  e(N, 'c_day_none1', ['Meio-dia e nada no quadro? O estoque não se enche sozinho.', 'Uma missãozinha e o dia destrava.'], nothingYet, { priority: 16 }),
  e(N, 'c_day_one1', ['Falta uma. Uma só. É como faltar uma moeda para fechar a conta.', 'Eu odeio quando falta uma moeda.'], oneLeft, { priority: 35 }),
  e(N, 'c_day_ycomp1', ['Ontem você fechou tudo. O estoque do dia entrou certinho.', 'Se fosse assim sempre, eu teria que aumentar a barraca.'], (c) => c.yesterday.complete, { priority: 18 }),
];

const PROG: DialogueEntry[] = [
  e(N, 'c_prog_lv5', ['Nível 5. Já sabe onde a pedra fica e quanto ela vale.', 'Que é muito, para constar.'], minerBand(5, 10), { once: true, priority: 30 }),
  e(N, 'c_prog_lv10', ['Nível 10. Cliente de dois dígitos ganha desconto. Brincadeira, não ganha.', 'Mas ganha meu respeito, que é mais raro.'], minerBand(10, 15), { once: true, priority: 30 }),
  e(N, 'c_prog_lv15', ['Nível 15. Nessa altura, eu já não te vendo nada errado.', 'Você repararia.'], minerBand(15, 20), { once: true, priority: 30 }),
  e(N, 'c_prog_lv20', ['Nível 20. Quando eu tinha o seu nível, minha barraca era uma caixa virada.', 'Ainda é, mas agora tem toldo.'], minerBand(20, 30), { once: true, priority: 30 }),
  e(N, 'c_prog_lv30', ['Nível 30. Se você abrisse uma barraca, eu ficaria preocupado.', 'Não abre, por favor.'], minerBand(30, 40), { once: true, priority: 30 }),
  e(N, 'c_prog_lv40', ['Nível 40. Já vi muito minerador passar por aqui. Nenhum chegou tão longe.', 'Estou até pensando em dar desconto. Pensando.'], minerBand(40), { once: true, priority: 30 }),
  e(N, 'c_prog_mercado1', ['A barraca de pé! Toldo novo, balcão firme.', 'Agora sim: Prêmios, Loja e eu. Bem-vindo ao comércio.'], (c) => lv(c, 'mercado') >= 1, { once: true, priority: 30 }),
  e(N, 'c_prog_bau1', ['Armazém construído. Agora dá para ver o que você tem.', 'E o que você tem, eu sei contar de longe.'], (c) => lv(c, 'bau') >= 1, { once: true, priority: 30 }),
  e(N, 'c_prog_cofre1', ['O Cofre. Gold guardado rende bônus de paciência.', 'Rende sem trabalhar. Eu devia ter inventado isso.'], (c) => lv(c, 'cofre') >= 1, { once: true, priority: 30 }),
  e(N, 'c_prog_fornalha2', ['Fornalha nível 2: a Fundição abriu. Troca três por um.', 'Três por um! É quase o meu preço.'], (c) => lv(c, 'fornalha') >= 2, { once: true, priority: 30 }),
  e(N, 'c_prog_days3', ['Três tochas. Três dias sem furo. Comércio gosta de gente assim.'], (c) => daysBetween(c, 3, 6), { priority: 30 }),
  e(N, 'c_prog_days7', ['Sete tochas. Uma semana de dias inteiros.', 'Se você fosse fornecedor, eu assinava contrato.'], (c) => daysBetween(c, 7, 20), { priority: 30 }),
  e(N, 'c_prog_days21', ['Vinte e uma tochas. Três semanas. Isso já é uma parede de fogo.', 'Cuidado para não queimar o toldo.'], (c) => daysBetween(c, 21, 49), { priority: 30 }),
  e(N, 'c_prog_days50', ['Cinquenta dias inteiros. Eu contei duas vezes, não acreditei.', 'Cinquenta. Nem a minha pedra mais rara vale isso.'], (c) => c.fullDays >= 50, { priority: 30 }),
];

const FRIEND: DialogueEntry[] = [
  e(N, 'c_friend_t0_1', ['Desconhecido, mas cliente. Toda amizade começa com uma troca.'], () => true, { tier: 0, priority: 20 }),
  e(N, 'c_friend_t0_2', ['Ainda não te conheço. Mas se tiver pedra, a gente se conhece rápido.'], () => true, { tier: 0, priority: 20 }),
  e(N, 'c_friend_t1_1', ['Conhecido! Já sei o seu nome e quanto material você traz. As duas coisas importam.'], () => true, { tier: 1, priority: 20 }),
  e(N, 'c_friend_t1_2', ['Agora que a gente se conhece, um segredo: eu não sou tão pão-duro assim.', 'Sou mais.'], () => true, { tier: 1, priority: 20 }),
  e(N, 'c_friend_t2_1', ['Colega. Sabe o que eu faria com cinco pedras? Nada. Só olharia. É lindo.'], () => true, { tier: 2, priority: 20 }),
  e(N, 'c_friend_t2_2', ['Colega de barraca. Se eu cochilar no balcão, você vigia?', 'Pago em conversa.'], () => true, { tier: 2, priority: 20 }),
  e(N, 'c_friend_t3_1', ['Amigo. Isso vale mais que gold. Não muito mais, mas vale.'], () => true, { tier: 3, priority: 20 }),
  e(N, 'c_friend_t3_2', ['Amigo, uma dica de comerciante: o melhor negócio é o que os dois saem sorrindo.', 'O segundo melhor é pedra.'], () => true, { tier: 3, priority: 20 }),
  e(N, 'c_friend_t4_1', ['Parceiro. Se um dia a barraca cair, eu sei quem vai me ajudar a levantar.', 'Você. Trazendo pedra.'], () => true, { tier: 4, priority: 20 }),
  e(N, 'c_friend_t4_2', ['Parceiro de negócios. Você é o único que eu deixo olhar o estoque de trás.'], () => true, { tier: 4, priority: 20 }),
  e(N, 'c_friend_t5_1', ['Lenda da Vila. Eu vou pendurar o seu nome no toldo.', 'Vai custar uma pedra. Brincadeira. Duas.'], () => true, { tier: 5, priority: 20 }),
  e(N, 'c_friend_t5_2', ['Lenda. Sabe quantos clientes chegaram aqui? Um. Você.', 'Guarda esse número.'], () => true, { tier: 5, priority: 20 }),
];

const CUR: DialogueEntry[] = [
  e(N, 'c_cur_01', ['Antes do dinheiro, a gente trocava: sal por pele, pele por trigo.', 'Sal era tão valioso que virou salário.'], () => true, { priority: 2 }),
  e(N, 'c_cur_02', ['A primeira moeda foi feita há uns 2.600 anos, de ouro misturado com prata.', 'Eu teria pesado antes de aceitar.'], () => true, { priority: 2 }),
  e(N, 'c_cur_03', ['Sabia que o papel-moeda nasceu na China? Papel! Que valia ouro!', 'Gênios do comércio.'], () => true, { priority: 2 }),
  e(N, 'c_cur_04', ['Pergunta de comerciante: uma coisa é cara porque é rara ou é rara porque é cara?'], () => true, { priority: 2 }),
  e(N, 'c_cur_05', ['Diamante é só carbono apertado. Pedra também é pedra apertada.', 'Eu prefiro a segunda. Mais honesta.'], () => true, { priority: 2 }),
  e(N, 'c_cur_06', ['Troca boa é quando cada um dá o que tem sobrando e leva o que faltava.', 'Simples. Difícil é combinar.'], () => true, { priority: 2 }),
  e(N, 'c_cur_07', ['Poupar é comprar tempo. Você guarda hoje para escolher melhor depois.'], () => true, { priority: 2 }),
  e(N, 'c_cur_08', ['Sabia que os romanos pagavam soldados com sal?', 'Hoje eu pago com conversa. Vale menos, mas não acaba.'], () => true, { priority: 2 }),
  e(N, 'c_cur_09', ['Preço não é o que a coisa vale. É o que alguém topa pagar.', 'Coisa diferente, viu?'], () => true, { priority: 2 }),
  e(N, 'c_cur_10', ['Pergunta para pensar: se todo mundo tivesse diamante, o diamante valeria alguma coisa?'], () => true, { priority: 2 }),
  e(N, 'c_cur_11', ['O primeiro banco do mundo era um templo. Guardavam trigo, não gold.', 'O Cofrinho tem uma tradição longa.'], () => true, { priority: 2 }),
  e(N, 'c_cur_12', ['Juro é o preço de esperar. Quem guarda ganha; quem tem pressa paga.', 'O Cofrinho paga a você. Eu pagaria menos.'], () => true, { priority: 2 }),
  e(N, 'c_cur_13', ["Sabia que 'pecúnia', uma palavra antiga para dinheiro, vem de gado?", 'Vaca era moeda. Imagina o troco.'], () => true, { priority: 2 }),
  e(N, 'c_cur_14', ['Um comerciante bom conta o estoque todo dia. Não porque some. Porque ele conhece.'], () => true, { priority: 2 }),
  e(N, 'c_cur_15', ['Ouro é raro, macio e não enferruja. Por isso virou dinheiro.', 'Pedra é dura e tem de sobra. Por isso é melhor. Discordo de todo mundo.'], () => true, { priority: 2 }),
  e(N, 'c_cur_16', ['Pergunta: o que você compraria se tivesse gold infinito? E depois disso?'], () => true, { priority: 2 }),
  e(N, 'c_cur_17', ['Barganha é conversa com número no meio. Quem escuta mais, paga menos.'], () => true, { priority: 2 }),
  e(N, 'c_cur_18', ['O cheque foi inventado para ninguém carregar moeda pesada na estrada.', 'Hoje é tudo chip. O peso sumiu, o valor não.'], () => true, { priority: 2 }),
  e(N, 'c_cur_19', ['Pergunta de comerciante: você prefere dez pedras hoje ou quinze daqui a uma semana?'], () => true, { priority: 2 }),
  e(N, 'c_cur_20', ['Todo material tem estação. Madeira de manhã, pedra à tarde, ferro à noite.', 'Quem sabe a hora não paga a mais.'], () => true, { priority: 2 }),
  e(N, 'c_cur_21', ['Redstone eu não troco na Fundição. Coisa rara não entra em promoção.'], () => true, { priority: 2 }),
  e(N, 'c_cur_22', ["Sabia que 'mercado' vem de 'mercar', que é negociar?", 'Eu negocio até o nome da barraca.'], () => true, { priority: 2 }),
];

export const DIALOGUE: DialogueEntry[] = [...FIRST, ...DAY, ...PROG, ...FRIEND, ...CUR];
