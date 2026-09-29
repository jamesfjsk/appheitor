// Seis modelos, copiados de docs/conteudo/ENCOMENDAS_MODELOS.md.
// O ponto e vírgula no fim de cada bullet era a lista do markdown; o texto da frase fica.

import type { AssignmentDraft, AssignmentSize, Specialty } from '../../types/assignment';
import type { Proof } from '../../types/proof';

export interface AssignmentTemplate {
  id: string;
  specialty: Specialty;
  title: string;
  story: string;
  deliverable: string;
  criteria: string[];
  questions: string[];
  kinds: Array<'checklist' | 'questions' | 'inPerson' | 'photo'>;
  size: AssignmentSize;
  competencies: string[];
  adult?: boolean;
  childNote?: string;
  meta?: boolean;
  weekdays?: number[];
  dueAfterDays?: number;
  recurring: 'suggest' | 'when-needed' | 'never';
}

export const ASSIGNMENT_TEMPLATES: AssignmentTemplate[] = [
  {
    id: 'teste',
    specialty: 'testador',
    title: 'Testar a Vagoneta por 15 minutos.',
    story: 'O Miner Missions precisa de alguém que teste antes das outras crianças.',
    deliverable: 'uma sessão de teste de 15 minutos, anotada.',
    criteria: [
      'testei pelo tempo combinado',
      'anotei três coisas que testei',
      'anotei o que achei confuso, ou escrevi "nada confuso"',
      'se achei um erro, escrevi os passos para ele acontecer de novo',
    ],
    questions: [
      'O que você testou?',
      'Alguma coisa ficou confusa?',
      'Achou algo estranho? Se achou, como fazer acontecer de novo?',
    ],
    kinds: ['checklist', 'questions'],
    size: 'normal',
    competencies: [],
    weekdays: [2, 6],
    dueAfterDays: 0,
    recurring: 'suggest',
  },
  {
    id: 'almoxarifado',
    specialty: 'organizador',
    title: 'Arrumar a caixa de cabos.',
    story: 'Os cabos da oficina estão todos misturados.',
    deliverable: '25 cabos separados por tipo e guardados na caixa certa.',
    criteria: [
      'cabos separados por tipo',
      'cada um enrolado sem nó',
      'etiqueta legível em cada grupo',
      'tudo na caixa certa',
      'bancada limpa no fim',
    ],
    questions: [],
    kinds: ['checklist', 'photo'],
    size: 'normal',
    competencies: ['bancada'],
    recurring: 'when-needed',
  },
  {
    id: 'inventario',
    specialty: 'catalogador',
    title: 'Catalogar os equipamentos da oficina.',
    story: 'Ninguém sabe direito o que tem na oficina.',
    deliverable: 'uma lista com cada equipamento.',
    criteria: [
      'cada item tem nome, marca, modelo, estado (bom, com defeito, quebrado) e onde fica',
      'nenhum item repetido',
      'os quebrados separados num canto',
    ],
    questions: [
      'Quantos itens você catalogou?',
      'Qual estava em pior estado?',
      'Cole a lista aqui, um item por linha: nome, marca, modelo, estado, onde fica.',
    ],
    kinds: ['checklist', 'questions'],
    size: 'sabado',
    competencies: [],
    weekdays: [6],
    dueAfterDays: 1,
    recurring: 'suggest',
  },
  {
    id: 'pesquisa',
    specialty: 'pesquisador',
    title: 'Pesquisar opções de [o que vamos comprar].',
    story: 'Precisamos comprar [X] e ainda não sabemos qual.',
    deliverable: 'três opções comparadas e uma escolha explicada.',
    criteria: [
      'três opções diferentes',
      'preço de cada uma',
      'uma vantagem e uma desvantagem de cada',
      'qual você escolheria e por quê',
    ],
    questions: [
      'Opção 1: nome, preço, vantagem, desvantagem.',
      'Opção 2: o mesmo.',
      'Opção 3: o mesmo.',
      'Qual você escolheria e por quê?',
    ],
    kinds: ['questions'],
    size: 'normal',
    competencies: [],
    childNote: 'Pesquise com o pai por perto e não compre nada.',
    recurring: 'when-needed',
  },
  {
    id: 'projeto',
    specialty: 'engenheiro',
    title: 'Construir [uma luz automática para a caixa de ferramentas].',
    story: 'A caixa de ferramentas fica num canto escuro.',
    deliverable: 'o aparelho funcionando no lugar, mostrado ao pai.',
    criteria: [
      'funciona 5 vezes seguidas',
      'fica preso no lugar sem cair',
      'fios e peças presos, sem nada solto',
      'bancada arrumada no fim',
    ],
    questions: [],
    kinds: ['checklist', 'inPerson', 'photo'],
    size: 'projeto',
    competencies: ['projeto', 'circuito'],
    meta: true,
    recurring: 'never',
  },
  {
    id: 'problema',
    specialty: 'inventor',
    title: 'Encontrar algo em casa que poderia funcionar melhor.',
    story: 'Toda casa tem alguma coisa que dá trabalho à toa.',
    deliverable: 'um problema de verdade e uma ideia para resolver.',
    criteria: [
      'o problema é da nossa casa, e não inventado',
      'explica quem sofre com ele e quando',
      'tem uma ideia de solução',
      'diz o que precisaria (material ou custo), se souber',
    ],
    questions: [
      'Qual é o problema?',
      'Quem sofre com ele e quando?',
      'Qual é a sua ideia?',
      'O que precisaria para fazer?',
    ],
    kinds: ['questions', 'inPerson'],
    size: 'pequena',
    competencies: [],
    weekdays: [0],
    dueAfterDays: 0,
    recurring: 'suggest',
  },
];

export function templateById(id: string | undefined): AssignmentTemplate | undefined {
  if (!id) return undefined;
  return ASSIGNMENT_TEMPLATES.find((t) => t.id === id);
}

export function templateDraft(t: AssignmentTemplate, dueOn: string, gold: number, xp: number): AssignmentDraft {
  return {
    templateId: t.id,
    specialty: t.specialty,
    title: t.title,
    story: t.story,
    deliverable: t.deliverable,
    criteria: [...t.criteria],
    proof: { kinds: [...t.kinds], ...(t.questions.length ? { questions: [...t.questions] } : {}) },
    size: t.size,
    reward: { gold, xp },
    competencies: [...t.competencies],
    ...(t.adult ? { adult: true } : {}),
    dueOn,
    ...(t.weekdays ? { weekdays: [...t.weekdays], recurring: false } : {}),
    ...(t.dueAfterDays !== undefined ? { dueAfterDays: t.dueAfterDays } : {}),
  };
}

function answerOf(proof: Proof | undefined, q: string): string {
  const hit = proof?.answers?.find((a) => a.q === q);
  return hit?.a.trim() || '';
}

/** Botão "Transformar em encomenda de execução" (§13). Copia o projeto de engenharia. */
export function executionFromProblem(input: {
  title: string;
  story?: string;
  submissions: Array<{ proof: Proof }>;
}): AssignmentDraft {
  const projeto = templateById('projeto');
  const last = input.submissions[input.submissions.length - 1]?.proof;
  const idea = answerOf(last, 'Qual é a sua ideia?');
  const problem = answerOf(last, 'Qual é o problema?');
  const title = idea ? `Construir: ${idea}` : 'Construir a solução do problema da casa.';
  return {
    templateId: 'problema-execucao',
    specialty: 'engenheiro',
    title: title.slice(0, 90),
    story: problem || input.story || input.title,
    deliverable: projeto?.deliverable || 'o aparelho funcionando no lugar, mostrado ao pai.',
    criteria: projeto ? [...projeto.criteria] : [],
    proof: { kinds: ['checklist', 'inPerson', 'photo'] },
    size: 'projeto',
    reward: { gold: 0, xp: 50 },
    competencies: ['projeto'],
  };
}
