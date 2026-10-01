// Reserva C1 da Carta (§9.4): até 50 palavras, perguntas em português, 3 opções.
// O padrão da unidade entra no passo 2, quando o banco for aprovado.

import type { LetterMotiveId } from '../services/english/letterLevel';

export interface C1Letter {
  id: string;
  motive: LetterMotiveId;
  title: string;
  sender: string;
  text: string;
  glossary: { en: string; pt: string }[];
  questions: {
    question: string;
    options: [string, string, string];
    answer: 0 | 1 | 2;
    evidence: string;
    explanation: string;
  }[];
  translation: string;
}

export const C1_LETTERS: C1Letter[] = [
  {
    id: 'c1-01',
    motive: 'help',
    title: 'The red book',
    sender: 'Mia',
    text: 'Hello. I am Mia. I am at school. My bag is under the chair. I need my red book. The book is for the test. Please look under the chair. I need help. Thank you, friend.',
    glossary: [
      { en: 'bag', pt: 'mochila' },
      { en: 'under', pt: 'embaixo de' },
      { en: 'chair', pt: 'cadeira' },
      { en: 'book', pt: 'livro' },
    ],
    questions: [
      {
        question: 'Onde está a mochila?',
        options: ['embaixo da cadeira', 'em cima da mesa', 'dentro do armário'],
        answer: 0,
        evidence: 'My bag is under the chair',
        explanation: 'Mia diz que a mochila está embaixo da cadeira. Mesa e armário não aparecem.',
      },
      {
        question: 'O que ela precisa para a prova?',
        options: ['o livro vermelho', 'uma bola', 'um mapa'],
        answer: 0,
        evidence: 'I need my red book',
        explanation: 'O pedido é o livro vermelho. Bola e mapa são outras coisas da escola, não o pedido.',
      },
    ],
    translation: 'Olá. Eu sou a Mia. Estou na escola. Minha mochila está embaixo da cadeira. Preciso do meu livro vermelho. O livro é para a prova. Por favor, olha embaixo da cadeira. Preciso de ajuda. Obrigada, amigo.',
  },
  {
    id: 'c1-02',
    motive: 'invite',
    title: 'Saturday at the park',
    sender: 'Leo',
    text: 'Hi. I am Leo. The game is on Saturday. We play soccer at the park. The park is next to the school. Please come. Bring your ball. We start at four. I want you on my team.',
    glossary: [
      { en: 'game', pt: 'jogo' },
      { en: 'park', pt: 'parque' },
      { en: 'ball', pt: 'bola' },
      { en: 'team', pt: 'time' },
    ],
    questions: [
      {
        question: 'Onde é o jogo?',
        options: ['no parque', 'na praia', 'dentro de casa'],
        answer: 0,
        evidence: 'We play soccer at the park',
        explanation: 'Leo marca o jogo no parque, ao lado da escola. Praia e casa não são o lugar.',
      },
      {
        question: 'O que ele pede para levar?',
        options: ['a bola', 'o lanche', 'a chuteira'],
        answer: 0,
        evidence: 'Bring your ball',
        explanation: 'O convite pede a bola. Lanche e chuteira são chutes comuns, mas ele não pediu.',
      },
    ],
    translation: 'Oi. Eu sou o Leo. O jogo é no sábado. A gente joga bola no parque. O parque fica ao lado da escola. Por favor, vem. Traz a sua bola. A gente começa às quatro. Eu quero você no meu time.',
  },
  {
    id: 'c1-03',
    motive: 'danger',
    title: 'The wet floor',
    sender: 'Ana',
    text: 'Stop. I am Ana. The floor in the kitchen is wet. The cup is on the floor. Please do not run. Walk slow. The wet floor is next to the table. I do not want a fall. Tell mom, please.',
    glossary: [
      { en: 'floor', pt: 'chão' },
      { en: 'wet', pt: 'molhado' },
      { en: 'cup', pt: 'copo' },
      { en: 'table', pt: 'mesa' },
    ],
    questions: [
      {
        question: 'Por que não dá para correr?',
        options: ['o chão está molhado', 'a porta está fechada', 'está escuro'],
        answer: 0,
        evidence: 'The floor in the kitchen is wet',
        explanation: 'O aviso é o chão molhado da cozinha. Porta e escuro não são o perigo desta carta.',
      },
      {
        question: 'Onde está o copo?',
        options: ['no chão', 'na pia', 'na mesa'],
        answer: 0,
        evidence: 'The cup is on the floor',
        explanation: 'O copo caiu no chão. A mesa é o lugar do chão molhado, não do copo.',
      },
    ],
    translation: 'Para. Eu sou a Ana. O chão da cozinha está molhado. O copo está no chão. Por favor, não corre. Anda devagar. O chão molhado fica ao lado da mesa. Eu não quero uma queda. Avisa a mamãe, por favor.',
  },
  {
    id: 'c1-04',
    motive: 'lost',
    title: 'The blue cap',
    sender: 'Rafa',
    text: 'Hello. I am Rafa. My blue cap is missing. I put the cap on the bench. The bench is next to the field. The cap is not in my bag. Please help me look. The cap is small and blue. Thank you.',
    glossary: [
      { en: 'cap', pt: 'boné' },
      { en: 'bench', pt: 'banco' },
      { en: 'field', pt: 'campo' },
      { en: 'missing', pt: 'sumiu' },
    ],
    questions: [
      {
        question: 'O que o Rafa perdeu?',
        options: ['o boné azul', 'a bola', 'a chuteira'],
        answer: 0,
        evidence: 'My blue cap is missing',
        explanation: 'Ele perdeu o boné azul. Bola e chuteira são coisas do jogo, mas não o que sumiu.',
      },
      {
        question: 'Onde o boné estava?',
        options: ['no banco', 'dentro da mochila', 'em casa'],
        answer: 0,
        evidence: 'I put the cap on the bench',
        explanation: 'Estava no banco, ao lado do campo. Ele diz que não está na mochila.',
      },
    ],
    translation: 'Olá. Eu sou o Rafa. Perdi meu boné azul. O boné estava no banco. O banco fica ao lado do campo. Não está na minha mochila. Por favor, me ajuda a procurar. O boné é pequeno e azul. Obrigado.',
  },
  {
    id: 'c1-05',
    motive: 'path',
    title: 'The way to the park',
    sender: 'Lia',
    text: 'Hi. I am Lia. Come to the park with me. Go out of the school. Turn left at the red door. Walk to the bridge. The park is after the bridge. I wait at the gate. Do not turn right. The right road goes to the river.',
    glossary: [
      { en: 'bridge', pt: 'ponte' },
      { en: 'gate', pt: 'portão' },
      { en: 'left', pt: 'esquerda' },
      { en: 'road', pt: 'caminho' },
    ],
    questions: [
      {
        question: 'Para onde ela chama?',
        options: ['para o parque', 'para o rio', 'para casa'],
        answer: 0,
        evidence: 'Come to the park with me',
        explanation: 'O caminho leva ao parque. O rio é o lado errado, se virar à direita.',
      },
      {
        question: 'Onde ela espera?',
        options: ['no portão', 'na ponte', 'na porta vermelha'],
        answer: 0,
        evidence: 'I wait at the gate',
        explanation: 'Lia espera no portão. A ponte e a porta vermelha são pontos do caminho, não o encontro.',
      },
    ],
    translation: 'Oi. Eu sou a Lia. Vem ao parque comigo. Sai da escola. Vira à esquerda na porta vermelha. Anda até a ponte. O parque fica depois da ponte. Eu espero no portão. Não vira à direita. O caminho da direita vai para o rio.',
  },
  {
    id: 'c1-06',
    motive: 'game',
    title: 'We won',
    sender: 'Theo',
    text: 'Hello, dad. I am Theo. My team plays soccer today. We have ten players. The score is three to one. We win the game. I have one goal. The game is at school. I am happy. See you at home.',
    glossary: [
      { en: 'team', pt: 'time' },
      { en: 'goal', pt: 'gol' },
      { en: 'score', pt: 'placar' },
      { en: 'win', pt: 'ganhamos' },
    ],
    questions: [
      {
        question: 'Qual é o placar?',
        options: ['três a um', 'um a zero', 'dois a dois'],
        answer: 0,
        evidence: 'The score is three to one',
        explanation: 'O placar escrito é três a um. Os outros placares são chute de quem não leu.',
      },
      {
        question: 'Quantos gols o Theo fez?',
        options: ['um', 'três', 'dez'],
        answer: 0,
        evidence: 'I have one goal',
        explanation: 'Ele fez um gol. Três é o placar do time. Dez é o número de jogadores.',
      },
    ],
    translation: 'Olá, papai. Eu sou o Theo. A gente jogou bola hoje. Meu time tem dez jogadores. A gente ganhou o jogo. O placar é três a um. Eu chutei um gol. O jogo foi na escola. Eu estou feliz. Te vejo em casa.',
  },
  {
    id: 'c1-07',
    motive: 'list',
    title: 'Before the game',
    sender: 'Nina',
    text: 'Hi. I am Nina. This is my list for the game. First I do my homework. Then I pack my bag. I put the ball in the bag. I need water too. The game is long. The bag is on the chair. Then I go to the park.',
    glossary: [
      { en: 'list', pt: 'lista' },
      { en: 'homework', pt: 'lição' },
      { en: 'water', pt: 'água' },
      { en: 'pack', pt: 'arrumar' },
    ],
    questions: [
      {
        question: 'O que ela faz primeiro?',
        options: ['a lição', 'o jogo', 'o lanche'],
        answer: 0,
        evidence: 'First I do my homework',
        explanation: 'A lista começa pela lição. O jogo vem depois, não primeiro.',
      },
      {
        question: 'Por que ela leva água?',
        options: ['porque o jogo é longo', 'porque está com sede agora', 'porque a mãe pediu suco'],
        answer: 0,
        evidence: 'The game is long',
        explanation: 'O porquê está na carta: o jogo é longo. Sede agora e suco não são o motivo escrito.',
      },
    ],
    translation: 'Oi. Eu sou a Nina. Esta é a minha lista para o jogo. Primeiro eu faço a lição. Depois eu arrumo a mochila. Eu ponho a bola na mochila. Preciso de água também. Eu faço isso porque o jogo é longo. A mochila está na cadeira. Depois eu vou ao parque.',
  },
  {
    id: 'c1-08',
    motive: 'thanks',
    title: 'Thank you for the boots',
    sender: 'Caio',
    text: 'Hello, mom. I am Caio. Thank you for the new boots. I use them in the game. The boots are black. They help me run. I have one goal. The team is happy. I put the boots next to the door. Thank you again.',
    glossary: [
      { en: 'boots', pt: 'chuteiras' },
      { en: 'new', pt: 'novas' },
      { en: 'door', pt: 'porta' },
      { en: 'run', pt: 'correr' },
    ],
    questions: [
      {
        question: 'Pelo que ele agradece?',
        options: ['pelas chuteiras novas', 'pelo lanche', 'pela bola'],
        answer: 0,
        evidence: 'Thank you for the new boots',
        explanation: 'O agradecimento é pelas chuteiras novas. Lanche e bola não são o presente desta carta.',
      },
      {
        question: 'Onde ele deixou as chuteiras?',
        options: ['ao lado da porta', 'embaixo da cama', 'na mochila'],
        answer: 0,
        evidence: 'I put the boots next to the door',
        explanation: 'Ele pôs as chuteiras ao lado da porta. Cama e mochila são lugares comuns, não o da carta.',
      },
    ],
    translation: 'Olá, mamãe. Eu sou o Caio. Obrigado pelas chuteiras novas. Eu usei elas no jogo. As chuteiras são pretas. Elas me ajudam a correr. Eu marquei um gol. O time ficou feliz. Eu pus as chuteiras ao lado da porta. Obrigado de novo.',
  },
  {
    id: 'c1-09',
    motive: 'help',
    title: 'The heavy box',
    sender: 'Eva',
    text: 'Hello. I am Eva. I have a big box. The box is for the class. It is heavy. Please help me. The box is next to the blue door. We take it to the room. Thank you for the help.',
    glossary: [
      { en: 'box', pt: 'caixa' },
      { en: 'heavy', pt: 'pesada' },
      { en: 'door', pt: 'porta' },
      { en: 'room', pt: 'sala' },
    ],
    questions: [
      {
        question: 'Por que ela pede ajuda?',
        options: ['a caixa é pesada', 'a porta está trancada', 'ela está atrasada'],
        answer: 0,
        evidence: 'It is heavy',
        explanation: 'Ela não consegue levantar porque a caixa é pesada. Tranca e atraso não estão na carta.',
      },
      {
        question: 'Para onde a caixa vai?',
        options: ['para a sala', 'para o parque', 'para casa'],
        answer: 0,
        evidence: 'We take it to the room',
        explanation: 'A caixa é da turma e vai para a sala. Parque e casa não são o destino.',
      },
    ],
    translation: 'Olá. Eu sou a Eva. Eu tenho uma caixa grande. A caixa é para a turma. Ela é pesada. Eu não consigo levantar. Por favor, me ajuda. A caixa está ao lado da porta azul. A gente leva ela para a sala. Obrigada pela ajuda.',
  },
  {
    id: 'c1-10',
    motive: 'danger',
    title: 'The broken step',
    sender: 'Otto',
    text: 'Stop, please. I am Otto. The step on the stairs is broken. Do not run down. Walk on the left side. The broken step is the third one. I put a red mark on it. Tell your friends. We fix it today. Thank you.',
    glossary: [
      { en: 'step', pt: 'degrau' },
      { en: 'stairs', pt: 'escada' },
      { en: 'broken', pt: 'quebrado' },
      { en: 'left', pt: 'esquerdo' },
    ],
    questions: [
      {
        question: 'Qual degrau está quebrado?',
        options: ['o terceiro', 'o primeiro', 'o último'],
        answer: 0,
        evidence: 'The broken step is the third one',
        explanation: 'Otto marca o terceiro degrau. Primeiro e último são o erro de quem não contou.',
      },
      {
        question: 'Como descer com segurança?',
        options: ['andando do lado esquerdo', 'correndo', 'pulando o degrau'],
        answer: 0,
        evidence: 'Walk on the left side',
        explanation: 'O aviso manda andar do lado esquerdo, sem correr. Pular não está na carta.',
      },
    ],
    translation: 'Para, por favor. Eu sou o Otto. O degrau da escada está quebrado. Não desce correndo. Anda do lado esquerdo. O degrau quebrado é o terceiro. Eu pus uma marca vermelha nele. Avisa seus amigos. A gente conserta hoje. Obrigado.',
  },
];

export function pickC1Letter(seed: number, avoid: string[] = []): C1Letter {
  const blocked = new Set(avoid);
  const open = C1_LETTERS.filter((letter) => !blocked.has(letter.id));
  const pool = open.length ? open : C1_LETTERS;
  const i = Math.abs(Math.trunc(seed)) % pool.length;
  return pool[i];
}
