import type { NpcId } from '../../types/village';

/**
 * Falas ociosas (pedido do pai em 18/09): o Heitor está na Vila andando ou explorando com o mouse,
 * sem clicar em ninguém, e os personagens comentam sozinhos, um balão curto de cada vez, sem botão.
 * Regras de uso em docs/etapas/ETAPA_2_LANCAMENTO.md (P2.11). Sem XP, sem repetir em 14 dias.
 */
export type AmbientWhen = 'morning' | 'afternoon' | 'night' | 'any';
export type AmbientNeeds = 'quizPending' | 'missionsPending' | 'chestReady' | 'dayComplete' | 'nearHero' | 'rain';

export interface AmbientLine {
  id: string;
  npc: NpcId;
  text: string;
  when?: AmbientWhen;
  needs?: AmbientNeeds;
}

const a = (npc: NpcId, id: string, text: string, when: AmbientWhen = 'any', needs?: AmbientNeeds): AmbientLine => ({ npc, id, text, when, ...(needs ? { needs } : {}) });

export const AMBIENT_LINES: AmbientLine[] = [
  // Sábio
  a('sabio', 'amb_s_01', 'Hm. O vento mudou. Amanhã chove ou eu me engano.', 'afternoon'),
  a('sabio', 'amb_s_02', 'Quem lê um pouco todo dia lê um livro por mês. Fiz a conta.', 'any'),
  a('sabio', 'amb_s_03', 'A prova está na Biblioteca. Ela não foge, mas também não se faz sozinha.', 'any', 'quizPending'),
  a('sabio', 'amb_s_04', 'Bom dia, Vila. Bom dia, montanha.', 'morning'),
  a('sabio', 'amb_s_05', 'As estrelas já estavam aí antes de qualquer minerador.', 'night'),
  a('sabio', 'amb_s_06', 'Pitágoras contava tudo. Eu conto as tochas.', 'any'),
  a('sabio', 'amb_s_07', 'Dia completo. A chaminé sabe antes de mim.', 'any', 'dayComplete'),
  a('sabio', 'amb_s_08', 'Você por aqui. Sente o cheiro de carvão? É a Fornalha acordando.', 'any', 'nearHero'),
  a('sabio', 'amb_s_09', 'Uma pergunta boa vale mais que três respostas prontas.', 'any'),
  a('sabio', 'amb_s_10', 'O lago está parado. Bom para pensar.', 'afternoon'),
  a('sabio', 'amb_s_11', 'Dizem que o Ferreiro nunca dorme. Eu digo que ele dorme em pé.', 'any'),
  a('sabio', 'amb_s_12', 'Hoje aprendi uma coisa nova. Não vou contar qual.', 'any'),
  a('sabio', 'amb_s_13', 'Se a missão é pequena, começa por ela. O resto encolhe.', 'any', 'missionsPending'),
  a('sabio', 'amb_s_14', 'A lua cheia deixa a mina mais clara. Ou é impressão.', 'night'),
  a('sabio', 'amb_s_15', 'O Baú abriu. Vai lá antes que a coruja pegue.', 'any', 'chestReady'),
  a('sabio', 'amb_s_16', 'Chuva. Dia bom de Biblioteca.', 'any', 'rain'),
  a('sabio', 'amb_s_17', 'Sabia que o ferro vem de estrelas antigas? Nem eu, até ontem.', 'any'),
  a('sabio', 'amb_s_18', 'Boa tarde. A tarde é longa; a paciência também.', 'afternoon'),
  a('sabio', 'amb_s_19', 'Um passo de cada vez. O caminho de terra concorda.', 'any'),
  a('sabio', 'amb_s_20', 'Já é noite. Quem fechou o dia dorme melhor.', 'night'),

  // Comerciante
  a('comerciante', 'amb_c_01', 'Pedra! Compro pedra! Pago bem, pago em gold... pago razoável.', 'any'),
  a('comerciante', 'amb_c_02', 'Toldo novo, negócio velho. Aceito propostas.', 'any'),
  a('comerciante', 'amb_c_03', 'Bom dia, freguesia. Preço da manhã é o mesmo de ontem.', 'morning'),
  a('comerciante', 'amb_c_04', 'Esse capacete... quanto você quer por ele? Brincadeira. Ou não.', 'any', 'nearHero'),
  a('comerciante', 'amb_c_05', 'Contei o estoque três vezes. Deu três números.', 'any'),
  a('comerciante', 'amb_c_06', 'Quem faz contrato na Mina volta com material. Quem não faz, volta com história.', 'any', 'missionsPending'),
  a('comerciante', 'amb_c_07', 'Fecho às nove. Às nove e um já é amanhã.', 'afternoon'),
  a('comerciante', 'amb_c_08', 'Gold guardado no Cofre rende. Gold no bolso some. Sei por experiência.', 'any'),
  a('comerciante', 'amb_c_09', 'O Ferreiro me deve um prego desde a semana passada.', 'any'),
  a('comerciante', 'amb_c_10', 'Sol quente. Água da barraca é de graça hoje. Só hoje.', 'afternoon'),
  a('comerciante', 'amb_c_11', 'Dez pedra por dois gold. É promoção, não é caridade.', 'any'),
  a('comerciante', 'amb_c_12', 'Prova feita, Mina aberta, Mercado feliz.', 'any', 'dayComplete'),
  a('comerciante', 'amb_c_13', 'O Baú das seis abriu. Se sobrar madeira, você sabe onde me achar.', 'any', 'chestReady'),
  a('comerciante', 'amb_c_14', 'Chuva é ruim para o toldo e boa para a pedra. Vai entender.', 'any', 'rain'),
  a('comerciante', 'amb_c_15', 'Noite. Vou contar as moedas. Não olha.', 'night'),
  a('comerciante', 'amb_c_16', 'Prêmio de verdade custa dias de trabalho. É assim que vale.', 'any'),
  a('comerciante', 'amb_c_17', 'A prova primeiro, freguês. Com o cadeado eu não vendo nem ar.', 'any', 'quizPending'),
  a('comerciante', 'amb_c_18', 'Já vendi uma tocha para o Olheiro. Ele usou de lanterna. Funcionou.', 'any'),
  a('comerciante', 'amb_c_19', 'Barriga cheia, barraca arrumada. Ordem certa.', 'morning'),
  a('comerciante', 'amb_c_20', 'Sabe o que é raro? Esmeralda. E cliente que não pechincha.', 'any'),

  // Ferreiro
  a('ferreiro', 'amb_f_01', 'Fogo baixo. Precisa de madeira.', 'any'),
  a('ferreiro', 'amb_f_02', 'Bigorna boa não reclama.', 'any'),
  a('ferreiro', 'amb_f_03', 'Ferro frio não dobra. Espera esquentar.', 'any'),
  a('ferreiro', 'amb_f_04', 'Manhã. Carvão no fogo, mãos no martelo.', 'morning'),
  a('ferreiro', 'amb_f_05', 'Sua picareta. Deixa eu ver. Ainda serve.', 'any', 'nearHero'),
  a('ferreiro', 'amb_f_06', 'Três de um, um de outro. A Fundição é assim.', 'any'),
  a('ferreiro', 'amb_f_07', 'Obra em pé é obra cuidada.', 'any'),
  a('ferreiro', 'amb_f_08', 'Tarde. O ferro amolece com o sol.', 'afternoon'),
  a('ferreiro', 'amb_f_09', 'Missão feita, material na mão. Simples.', 'any', 'missionsPending'),
  a('ferreiro', 'amb_f_10', 'Noite. A forja dorme. Eu não.', 'night'),
  a('ferreiro', 'amb_f_11', 'Redstone brilha. Não é ouro. É melhor.', 'any'),
  a('ferreiro', 'amb_f_12', 'O Comerciante fala demais. Eu martelo.', 'any'),
  a('ferreiro', 'amb_f_13', 'Chuva apaga fogueira. Não apaga forja.', 'any', 'rain'),
  a('ferreiro', 'amb_f_14', 'Dia completo. Chaminé acesa. Bom.', 'any', 'dayComplete'),
  a('ferreiro', 'amb_f_15', 'Baú aberto. Pega o que é seu.', 'any', 'chestReady'),
  a('ferreiro', 'amb_f_16', 'Capacete protege a cabeça. E a semana.', 'any'),
  a('ferreiro', 'amb_f_17', 'Prova. Depois a Mina. Ordem.', 'any', 'quizPending'),
  a('ferreiro', 'amb_f_18', 'Martelo pesado, braço forte. Um faz o outro.', 'any'),
  a('ferreiro', 'amb_f_19', 'Costas retas. Sempre.', 'any'),
  a('ferreiro', 'amb_f_20', 'Amanhã tem mais ferro. Sempre tem.', 'night'),

  // Olheiro
  a('olheiro', 'amb_o_01', 'Daqui de cima eu vejo o campo inteiro. E o lago. E você.', 'any', 'nearHero'),
  a('olheiro', 'amb_o_02', 'Bom dia. Treino de manhã vale dois.', 'morning'),
  a('olheiro', 'amb_o_03', 'Ronaldo Fenômeno treinava finalização até escurecer. Todo dia.', 'any'),
  a('olheiro', 'amb_o_04', 'Sequência de tochas é sequência de vitórias. Mesma coisa.', 'any'),
  a('olheiro', 'amb_o_05', 'Passe curto, passe certo. Missão curta, missão feita.', 'any', 'missionsPending'),
  a('olheiro', 'amb_o_06', 'A Arena vai ter jogo com o seu pai. Estou de olho nos dois.', 'any'),
  a('olheiro', 'amb_o_07', 'Tarde quente. Hidrata, atleta.', 'afternoon'),
  a('olheiro', 'amb_o_08', 'Vi um chute de longe ontem. Era o Comerciante espantando um pombo.', 'any'),
  a('olheiro', 'amb_o_09', 'Dia completo. Isso é gol de placa.', 'any', 'dayComplete'),
  a('olheiro', 'amb_o_10', 'Noite no torreão. Melhor lugar para ver a Vila dormir.', 'night'),
  a('olheiro', 'amb_o_11', 'O Baú abriu. Vai buscar o prêmio da partida.', 'any', 'chestReady'),
  a('olheiro', 'amb_o_12', 'Chuva. Campo molhado, bola rápida.', 'any', 'rain'),
  a('olheiro', 'amb_o_13', 'Prova pendente é pênalti a cobrar. Cobra logo.', 'any', 'quizPending'),
  a('olheiro', 'amb_o_14', 'Goleiro grita em inglês na Arena. Prepara o ouvido.', 'any'),
  a('olheiro', 'amb_o_15', 'Quem chega cedo no treino escolhe o time.', 'morning'),
  a('olheiro', 'amb_o_16', 'Time bom não se gaba. Só joga.', 'any'),
  a('olheiro', 'amb_o_17', 'Vento lateral. Chuta com o pé de dentro.', 'afternoon'),
  a('olheiro', 'amb_o_18', 'Já fui goleiro. Uma vez. Não pergunte.', 'any'),
  a('olheiro', 'amb_o_19', 'A Torre guarda seus recordes. Vai lá conferir.', 'any'),
  a('olheiro', 'amb_o_20', 'Descansar também é treino. Ninguém acredita, mas é.', 'night'),
];
