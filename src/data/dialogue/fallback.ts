import type { DialogueEntry } from '../../services/village/dialogue';
import type { NpcId } from '../../types/village';
import { minerBand } from './helpers';

function e(
  npc: NpcId,
  id: string,
  lines: string[],
  when: DialogueEntry['when'],
  extra?: Partial<DialogueEntry>
): DialogueEntry {
  return { npc, id, lines, when, tier: extra?.tier ?? 0, priority: extra?.priority ?? 1, once: extra?.once };
}

const FALLBACK: DialogueEntry[] = [
  e('sabio', 's_first', ['Primeira vez aqui. Antes de minerar, o livro do dia.'], (c) => c.firstTime.has('sabio'), { once: true, priority: 80 }),
  e('sabio', 's_morn', ['Bom dia. O turno começa na Casa.'], (c) => c.hour < 12, { priority: 10 }),
  e('sabio', 's_aft', ['A tarde pede pedra. Missão primeiro.'], (c) => c.hour >= 12 && c.hour < 18, { priority: 10 }),
  e('sabio', 's_eve', ['Boa noite. Fecha o dia quando o Baú abrir.'], (c) => c.hour >= 20, { priority: 12 }),
  e('sabio', 's_done', ['Dia completo. A chaminé acendeu.'], (c) => c.today.due > 0 && c.today.done >= c.today.due, { priority: 40 }),
  e('sabio', 's_miss', ['Ontem faltou uma. Hoje é outro dia.'], (c) => c.yesterday.missed, { priority: 50 }),
  e('sabio', 's_pause', ['Folga. A Vila descansa com você.'], (c) => Boolean(c.pause), { priority: 45 }),
  e('sabio', 's_punish', ['Hoje o Mercado fecha. Prova e Mina continuam.'], (c) => Boolean(c.punish), { priority: 48 }),
  e('sabio', 's_lv10', ['Nível 10. A Forja já te conhece.'], minerBand(10, 15), { once: true, priority: 30 }),
  e('sabio', 's_quiz', ['A prova de hoje está na Biblioteca.'], (c) => !c.today.quizDone && c.hour < 21, { priority: 8 }),
  e('sabio', 's_t3', ['Colega. Posso te fazer uma pergunta de verdade.'], (c) => c.tier >= 2, { priority: 6 }),
  e('sabio', 's_generic', ['As missões de casa pagam o ouro da vila.'], () => true, { priority: 1 }),

  e('comerciante', 'c_first', ['Sou o Comerciante. Gold bem gasto vira coisa boa.'], (c) => c.firstTime.has('comerciante'), { once: true, priority: 80 }),
  e('comerciante', 'c_morn', ['Manhã no lago. A barraca abre cedo.'], (c) => c.hour < 12, { priority: 10 }),
  e('comerciante', 'c_aft', ['Tarde na fogueira. Olha o preço duas vezes.'], (c) => c.hour >= 12 && c.hour < 21, { priority: 10 }),
  e('comerciante', 'c_eve', ['Às 21h eu fecho. Volto às 7h.'], (c) => c.hour >= 20, { priority: 12 }),
  e('comerciante', 'c_done', ['Dia feito. Agora pensa no que guardar.'], (c) => c.today.due > 0 && c.today.done >= c.today.due, { priority: 40 }),
  e('comerciante', 'c_miss', ['Ontem falhou uma. Hoje o preço não muda.'], (c) => c.yesterday.missed, { priority: 50 }),
  e('comerciante', 'c_t3', ['Amigo. Traga 5 pedra, minha barraca está caindo.'], (c) => c.tier >= 3, { priority: 20 }),
  e('comerciante', 'c_generic', ['Se faltar gold, espera. A pressa cobra juros.'], () => true, { priority: 1 }),

  e('ferreiro', 'f_first', ['Ferreiro. Três de um, um de outro. Sem conversa.'], (c) => c.firstTime.has('ferreiro'), { once: true, priority: 80 }),
  e('ferreiro', 'f_morn', ['Fornalha fria de manhã. Missão primeiro.'], (c) => c.hour < 12, { priority: 10 }),
  e('ferreiro', 'f_eve', ['Boa noite. Material na caixa, fogo baixo.'], (c) => c.hour >= 20, { priority: 12 }),
  e('ferreiro', 'f_done', ['Dia completo. Agora dá para forjar.'], (c) => c.today.due > 0 && c.today.done >= c.today.due, { priority: 40 }),
  e('ferreiro', 'f_miss', ['Ontem faltou. A parede não mente.'], (c) => c.yesterday.missed, { priority: 50 }),
  e('ferreiro', 'f_punish', ['Hoje não vende. Forja continua.'], (c) => Boolean(c.punish), { priority: 48 }),
  e('ferreiro', 'f_t3', ['Construa a Fornalha. Depois a gente fala.'], (c) => c.tier >= 1 && (c.baseLevels.fornalha || 0) < 1, { priority: 22 }),
  e('ferreiro', 'f_generic', ['Sem ferro não sobe de nível. Simples.'], () => true, { priority: 1 }),

  e('olheiro', 'o_first', ['Olheiro. Eu olho o campo. Você olha as missões.'], (c) => c.firstTime.has('olheiro'), { once: true, priority: 80 }),
  e('olheiro', 'o_morn', ['Bom dia. Quem observa bem escolhe o time certo.'], (c) => c.hour < 12, { priority: 10 }),
  e('olheiro', 'o_eve', ['Boa noite. A Torre mostra o que você já ganhou.'], (c) => c.hour >= 20, { priority: 12 }),
  e('olheiro', 'o_done', ['Dia completo. Isso é caráter, não sorte.'], (c) => c.today.due > 0 && c.today.done >= c.today.due, { priority: 40 }),
  e('olheiro', 'o_miss', ['Ontem o time falhou uma. Hoje tem segundo tempo.'], (c) => c.yesterday.missed, { priority: 50 }),
  e('olheiro', 'o_streak', ['Três tochas. Constância.'], (c) => c.fullDays >= 3, { priority: 18 }),
  e('olheiro', 'o_generic', ['Quando a Arena abrir, eu quero ver você ganhar do seu pai no xadrez.'], () => true, { priority: 1 }),
];

export const DIALOGUE_FALLBACK = FALLBACK;
