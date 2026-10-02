// Banco das 10 unidades, transcrito de docs/conteudo/INGLES_UNIDADES.md sem mudar o texto.
// Aprovado pelo pai em 02/10/2026.

export interface UnitExample {
  en: string;
  pt: string;
}

export interface UnitNote {
  mold: string;
  brief: string;
  model: string;
  ideas: [string, string, string];
}

export interface EnglishUnit {
  id: string;
  level: 1 | 2;
  name: string;
  lesson: string;
  examples: UnitExample[];
  wrong: string;
  right: string;
  notes: [UnitNote, UnitNote];
  /** Palavras que a barra pode usar, além das comuns. */
  words: string[];
}

export const UNIT_ORDER = ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8', 'u9', 'u10'] as const;

export const ENGLISH_UNITS: Record<string, EnglishUnit> = {
  u1: {
    id: 'u1',
    level: 1,
    name: 'am / is / are',
    lesson: 'I usa am. Uma pessoa, um bicho ou uma coisa usa is. Duas ou mais usam are, e you, we e they também.',
    examples: [
      { en: 'I am ready.', pt: 'Eu estou pronto.' },
      { en: 'The eggs are cold.', pt: 'Os ovos estão frios.' },
    ],
    wrong: 'The eggs is cold.',
    right: 'The eggs are cold.',
    notes: [
      {
        mold: 'I am ___. My ___ are ___. They are ___.',
        brief: 'Escreva um recado para a mamãe. Diga que você está cansado, que as suas botas estão molhadas e onde elas estão.',
        model: 'I am tired. My boots are wet. They are in the garden.',
        ideas: ['estou cansado', 'as botas estão molhadas', 'estão no jardim'],
      },
      {
        mold: 'Dad, I am ___. The table is ___. The plates are ___.',
        brief: 'Escreva um recado para o papai. Diga que você está com fome, que a mesa está pronta e que os pratos estão limpos.',
        model: 'Dad, I am hungry. The table is ready. The plates are clean.',
        ideas: ['estou com fome', 'a mesa está pronta', 'os pratos estão limpos'],
      },
    ],
    words: ['i', 'am', 'is', 'are', 'he', 'she', 'leo', 'ana', 'my', 'dog', 'the', 'cat', 'you', 'we', 'they', 'and', 'dogs', 'it', 'lamp', 'ball', 'bag', 'eggs', 'boots', 'books', 'hungry', 'tired', 'happy', 'ready', 'late', 'at', 'school', 'in', 'garden', 'cold', 'big', 'wet', 'new', 'on', 'table', 'box', 'under', 'bed'],
  },
  u2: {
    id: 'u2',
    level: 1,
    name: 'a / an',
    lesson: 'Antes de som de vogal, an: an apple, an egg. Antes dos outros sons, a: a dog, a ball. Quem decide é a palavra que vem logo depois.',
    examples: [
      { en: 'I have an orange.', pt: 'Eu tenho uma laranja.' },
      { en: 'It is a big egg.', pt: 'É um ovo grande.' },
    ],
    wrong: 'I want a apple.',
    right: 'I want an apple.',
    notes: [
      {
        mold: 'I want an ___ and a ___. I am ___.',
        brief: 'Escreva um recado para a mamãe. Diga que você quer uma maçã e uma banana e que está com fome.',
        model: 'I want an apple and a banana. I am hungry.',
        ideas: ['quero uma maçã', 'e uma banana', 'estou com fome'],
      },
      {
        mold: 'There is an ___ in my bag. I have a ___. It is ___.',
        brief: 'Escreva um recado para um amigo. Diga que tem um guarda-chuva na sua mochila, que você tem uma bola e que ela é nova.',
        model: 'There is an umbrella in my bag. I have a ball. It is new.',
        ideas: ['um guarda-chuva na mochila', 'tenho uma bola', 'ela é nova'],
      },
    ],
    words: ['a', 'an', 'apple', 'egg', 'orange', 'onion', 'umbrella', 'owl', 'elephant', 'ant', 'dog', 'cat', 'ball', 'box', 'lamp', 'bag', 'banana', 'pencil', 'book', 'helmet', 'bucket', 'cake', 'old', 'big', 'small', 'red', 'blue', 'i', 'have', 'want', 'there', 'is', 'in', 'the', 'it'],
  },
  u3: {
    id: 'u3',
    level: 1,
    name: 'plural com -s',
    lesson: 'Mais de um, a palavra ganha -s: one dog, two dogs. O número vem antes.',
    examples: [
      { en: 'I have two dogs.', pt: 'Eu tenho dois cachorros.' },
      { en: 'There are three eggs.', pt: 'Tem três ovos.' },
    ],
    wrong: 'I have two dog.',
    right: 'I have two dogs.',
    notes: [
      {
        mold: 'I have ___ ___. I need ___ ___. Thank you.',
        brief: 'Escreva um recado para a professora. Diga que você tem dois lápis, que precisa de três livros e agradeça.',
        model: 'I have two pencils. I need three books. Thank you.',
        ideas: ['tenho dois lápis', 'preciso de três livros', 'obrigado'],
      },
      {
        mold: 'Mom, I want ___ ___ and ___ ___, please.',
        brief: 'Escreva um recado para a mamãe. Diga que você quer duas bananas e três biscoitos. Peça por favor.',
        model: 'Mom, I want two bananas and three cookies, please.',
        ideas: ['duas bananas', 'três biscoitos', 'por favor'],
      },
    ],
    words: ['dog', 'dogs', 'cat', 'cats', 'apple', 'apples', 'egg', 'eggs', 'ball', 'balls', 'book', 'books', 'pencil', 'pencils', 'banana', 'bananas', 'bag', 'bags', 'boot', 'boots', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'i', 'have', 'see', 'need', 'there', 'are'],
  },
  u4: {
    id: 'u4',
    level: 1,
    name: 'there is / there are',
    lesson: 'Para dizer que tem alguma coisa num lugar: uma coisa, there is; duas ou mais, there are.',
    examples: [
      { en: 'There is a cat in the shed.', pt: 'Tem um gato no galpão.' },
      { en: 'There are two eggs in the box.', pt: 'Tem dois ovos na caixa.' },
    ],
    wrong: 'There is two eggs.',
    right: 'There are two eggs.',
    notes: [
      {
        mold: 'There is a ___ in my room. There are ___ ___ on the bed. Help me, please.',
        brief: 'Escreva um recado para o papai. Diga que tem uma aranha no seu quarto e dois livros na cama. Peça ajuda.',
        model: 'There is a spider in my room. There are two books on the bed. Help me, please.',
        ideas: ['uma aranha no quarto', 'dois livros na cama', 'me ajuda, por favor'],
      },
      {
        mold: 'There are ___ ___ in the fridge. There is a ___ too. It is for ___.',
        brief: 'Escreva um recado para a mamãe. Diga que tem três ovos na geladeira, que tem um bolo também e que o bolo é para a vovó.',
        model: 'There are three eggs in the fridge. There is a cake too. It is for grandma.',
        ideas: ['três ovos na geladeira', 'tem um bolo', 'é para a vovó'],
      },
    ],
    words: ['there', 'is', 'are', 'a', 'an', 'one', 'two', 'three', 'cat', 'egg', 'eggs', 'book', 'books', 'ball', 'balls', 'lamp', 'in', 'the', 'box', 'bag', 'fridge', 'on', 'table', 'bed', 'under', 'next', 'to', 'door'],
  },
  u5: {
    id: 'u5',
    level: 2,
    name: 'want to / need to',
    lesson: 'Depois de want e need, quando vem uma ação, entra o to: I want to play. Quando vem uma coisa, fica sem to: I want water.',
    examples: [
      { en: 'I want to play soccer.', pt: 'Eu quero jogar bola.' },
      { en: 'I need to do my homework.', pt: 'Eu preciso fazer a lição.' },
      { en: 'I want water.', pt: 'Eu quero água.' },
    ],
    wrong: "I don't want play soccer now.",
    right: "I don't want to play soccer now.",
    notes: [
      {
        mold: 'I want to ___ now. I need to ___ first. Then I ___.',
        brief: 'Escreva um recado para o papai. Diga que você quer jogar bola agora, que precisa fazer a lição primeiro e que depois você joga.',
        model: 'I want to play soccer now. I need to do my homework first. Then I play.',
        ideas: ['quero jogar bola agora', 'preciso fazer a lição primeiro', 'depois eu jogo'],
      },
      {
        mold: 'I need to ___. I want ___, please.',
        brief: 'Escreva um recado para a mamãe. Diga que você precisa dormir e que quer um copo de água. Peça por favor.',
        model: 'I need to sleep. I want a glass of water, please.',
        ideas: ['preciso dormir', 'quero um copo de água', 'por favor'],
      },
    ],
    words: ['i', 'you', 'we', 'they', 'want', 'need', 'to', 'play', 'soccer', 'eat', 'sleep', 'read', 'go', 'home', 'watch', 'tv', 'help', 'do', 'homework', 'drink', 'water', 'pizza', 'apple', 'book', 'ball'],
  },
  u6: {
    id: 'u6',
    level: 2,
    name: "can / can't",
    lesson: "can quer dizer consegue ou pode. can't quer dizer não consegue ou não pode. Depois vem a ação, sem to: I can swim.",
    examples: [
      { en: 'I can swim.', pt: 'Eu sei nadar.' },
      { en: "A fish can't walk.", pt: 'Um peixe não consegue andar.' },
    ],
    wrong: 'I can to swim.',
    right: 'I can swim.',
    notes: [
      {
        mold: "Can I ___ after my homework? I can't ___ now. Thank you.",
        brief: 'Escreva um recado para o papai. Pergunte se você pode jogar bola depois da lição, diga que agora não pode e agradeça.',
        model: "Can I play soccer after my homework? I can't play now. Thank you.",
        ideas: ['posso jogar bola depois da lição?', 'agora não posso', 'obrigado'],
      },
      {
        mold: "I can ___, but I can't ___. Please help me.",
        brief: 'Escreva um recado para o treinador. Diga que você consegue chutar forte, mas não consegue pegar a bola. Peça ajuda.',
        model: "I can kick hard, but I can't catch the ball. Please help me.",
        ideas: ['consigo chutar forte', 'não consigo pegar a bola', 'me ajuda, por favor'],
      },
    ],
    words: ['can', "can't", 'cannot', 'a', 'bird', 'fly', 'fish', 'swim', 'frog', 'jump', 'horse', 'run', 'runs', 'fast', 'cat', 'climb', 'tree', 'cow', 'walk', 'dog', 'read', 'baby', 'drive', 'car', 'chair', 'talk', 'i', 'to'],
  },
  u7: {
    id: 'u7',
    level: 2,
    name: 'he plays',
    lesson: 'Com he, she, it ou o nome de alguém, a ação ganha -s: I play, he plays. Com I, you, we e they, fica sem -s.',
    examples: [
      { en: 'Leo plays chess.', pt: 'O Leo joga xadrez.' },
      { en: 'My mom likes tea.', pt: 'Minha mãe gosta de chá.' },
    ],
    wrong: 'He play soccer.',
    right: 'He plays soccer.',
    notes: [
      {
        mold: 'My dad likes ___. My mom likes ___. I like ___.',
        brief: 'Escreva um recado para um amigo. Diga que o seu pai gosta de café, que a sua mãe gosta de chá e que você gosta de suco.',
        model: 'My dad likes coffee. My mom likes tea. I like juice.',
        ideas: ['meu pai gosta de café', 'minha mãe gosta de chá', 'eu gosto de suco'],
      },
      {
        mold: 'My friend Leo plays ___. He runs ___. I play with him.',
        brief: 'Escreva um recado para o treinador. Diga que o seu amigo Leo joga bola, que ele corre rápido e que você joga com ele.',
        model: 'My friend Leo plays soccer. He runs fast. I play with him.',
        ideas: ['o Leo joga bola', 'ele corre rápido', 'eu jogo com ele'],
      },
    ],
    words: ['play', 'plays', 'like', 'likes', 'eat', 'eats', 'drink', 'drinks', 'read', 'reads', 'sleep', 'sleeps', 'run', 'runs', 'walk', 'walks', 'want', 'wants', 'need', 'needs', 'help', 'helps', 'cook', 'cooks', 'he', 'she', 'it', 'leo', 'ana', 'my', 'dad', 'dog', 'i', 'you', 'we', 'they', 'soccer', 'chess', 'tea', 'milk', 'books', 'pizza', 'fast', 'mom'],
  },
  u8: {
    id: 'u8',
    level: 2,
    name: "don't / doesn't",
    lesson: "Para dizer que não faz: I, you, we e they usam don't; he, she e it usam doesn't. Depois vem a ação sem -s: She doesn't like fish.",
    examples: [
      { en: "I don't like fish.", pt: 'Eu não gosto de peixe.' },
      { en: "Leo doesn't play chess.", pt: 'O Leo não joga xadrez.' },
    ],
    wrong: "She don't like fish.",
    right: "She doesn't like fish.",
    notes: [
      {
        mold: "I don't like ___. I like ___. Can I eat ___ today?",
        brief: 'Escreva um recado para a mamãe. Diga que você não gosta de peixe, que gosta de frango, e pergunte se pode comer frango hoje.',
        model: "I don't like fish. I like chicken. Can I eat chicken today?",
        ideas: ['não gosto de peixe', 'gosto de frango', 'posso comer frango hoje?'],
      },
      {
        mold: "I don't have a ___. I don't have an ___. Can you help me?",
        brief: 'Escreva um recado para o professor. Diga que você não tem lápis, que não tem borracha e peça ajuda.',
        model: "I don't have a pencil. I don't have an eraser. Can you help me?",
        ideas: ['não tenho lápis', 'não tenho borracha', 'pode me ajudar?'],
      },
    ],
    words: ["don't", "doesn't", 'does', 'not', 'i', 'you', 'we', 'they', 'he', 'she', 'it', 'leo', 'ana', 'my', 'mom', 'dog', 'friends', 'like', 'likes', 'play', 'drink', 'eat', 'fish', 'chess', 'coffee', 'milk', 'carrots', 'watch', 'tv', 'cats', 'sleep'],
  },
  u9: {
    id: 'u9',
    level: 2,
    name: 'some / any',
    lesson: 'Na frase que afirma, some. Na pergunta e na frase com not, any. Assim: I have some apples. Do you have any apples? I don\'t have any apples.',
    examples: [
      { en: 'There are some eggs.', pt: 'Tem alguns ovos.' },
      { en: 'Are there any eggs?', pt: 'Tem ovos?' },
    ],
    wrong: "I don't have some water.",
    right: "I don't have any water.",
    notes: [
      {
        mold: 'I have some ___. I don\'t have any ___. Can you buy ___?',
        brief: 'Escreva um recado para a mamãe. Diga que você tem algumas maçãs, que não tem nenhuma banana, e pergunte se ela pode comprar bananas.',
        model: "I have some apples. I don't have any bananas. Can you buy bananas?",
        ideas: ['tenho algumas maçãs', 'não tenho banana', 'pode comprar bananas?'],
      },
      {
        mold: 'Are there any ___? I need some ___ for the ___.',
        brief: 'Escreva um recado para o papai. Pergunte se tem ovos e diga que você precisa de alguns para o bolo.',
        model: 'Are there any eggs? I need some eggs for the cake.',
        ideas: ['tem ovos?', 'preciso de alguns ovos', 'é para o bolo'],
      },
    ],
    words: ['some', 'any', 'apples', 'eggs', 'cookies', 'bananas', 'milk', 'water', 'bread', 'juice', 'books', 'pencils', 'i', 'have', 'there', 'are', 'we', 'need', 'do', 'you', 'is', "don't", "aren't"],
  },
  u10: {
    id: 'u10',
    level: 2,
    name: 'because',
    lesson: 'because quer dizer porque. Primeiro vem o que acontece. Depois vem because e o motivo, sempre com alguém fazendo: because it is cold, because I am tired.',
    examples: [
      { en: 'I am happy because it is Friday.', pt: 'Estou feliz porque é sexta.' },
      { en: 'I wait because dinner is first.', pt: 'Eu espero porque o jantar vem primeiro.' },
    ],
    wrong: 'I am happy because is Friday.',
    right: 'I am happy because it is Friday.',
    notes: [
      {
        mold: 'I am late because ___. I am sorry.',
        brief: 'Escreva um recado para o professor. Diga que você está atrasado porque o ônibus está devagar, e peça desculpa.',
        model: 'I am late because the bus is slow. I am sorry.',
        ideas: ['estou atrasado', 'o ônibus está devagar', 'desculpa'],
      },
      {
        mold: 'I want to ___, but I wait because ___.',
        brief: 'Escreva um recado para o papai. Diga que você quer jogar videogame, mas que espera, porque a lição vem primeiro.',
        model: 'I want to play video games, but I wait because my homework is first.',
        ideas: ['quero jogar videogame', 'mas eu espero', 'a lição vem primeiro'],
      },
    ],
    words: ['because', 'i', 'sleep', 'eat', 'am', 'tired', 'hungry', 'wear', 'coat', 'it', 'is', 'cold', 'stay', 'home', 'late', 'the', 'bus', 'slow', 'wait', 'dinner', 'first', 'happy', 'friday'],
  },
};

export function unitById(id: string): EnglishUnit {
  return ENGLISH_UNITS[id] ?? ENGLISH_UNITS.u1;
}

export function nextUnitId(id: string): string {
  const i = UNIT_ORDER.indexOf(id as (typeof UNIT_ORDER)[number]);
  if (i < 0 || i >= UNIT_ORDER.length - 1) return UNIT_ORDER[UNIT_ORDER.length - 1];
  return UNIT_ORDER[i + 1];
}
