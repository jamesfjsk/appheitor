// ========================================
// Arena de Inglês: banco de reserva (seção 4.9) para Carta, Recado e Ferraria.
// 6 de cada por nível, no formato cru que validateLetter/validateNote/validateForge
// esperam (englishAi.ts valida a reserva do mesmo jeito que a resposta da IA).
// englishAi.ts lê OFFLINE_CONTRACTS[type][level] (entradas { id, content }) e evita
// repetir em 14 dias pela offlineKey; pickOffline(type, level, seed, recentlyUsedIds)
// faz a mesma escolha por id, determinística. Módulo puro: sem Firebase, sem React.
// Comerciante não está aqui: é gerado por código (merchantRoom.ts).
// ========================================

import type { ForgeContent, ForgeItem, LetterContent, LetterQuestion, LetterQuestionKind, NoteContent } from '../types/english';
import { levelFor, tokenize, type LevelNumber } from '../config/englishLevels';

export type OfflineLevel = LevelNumber;
export type OfflineType = 'letter' | 'note' | 'forge';
/** O Recado da reserva não traz templates: o validador preenche com os moldes do nível */
export type OfflineNoteContent = Omit<NoteContent, 'templates'>;

export interface OfflineEntry<T> {
  /** Único no banco inteiro (ex.: l1-01, n2-03, f3-06) */
  id: string;
  level: OfflineLevel;
  /** Tema em PT, para o painel */
  theme: string;
  content: T;
}
export type OfflineLetter = OfflineEntry<LetterContent>;
export type OfflineNote = OfflineEntry<OfflineNoteContent>;
export type OfflineForge = OfflineEntry<ForgeContent>;

// ---------- utilitários de escrita ----------

/** Pergunta com a opção certa sempre na posição 0 (o validador embaralha com semente) */
const q = (kind: LetterQuestionKind, question: string, options: [string, string, string, string], evidence: string, explanation: string): LetterQuestion => ({
  kind,
  question,
  options,
  answer: 0,
  evidence,
  explanation,
});

const scramble = (answer: string, rule: string): ForgeItem => ({ kind: 'scramble', words: tokenize(answer), answer, rule });
/** Opção certa na posição 0 (o validador embaralha) */
const gap = (sentence: string, options: [string, string, string], rule: string): ForgeItem => ({ kind: 'gap', sentence, options, answer: 0, rule });
const typed = (prompt: string, sentence: string, accepted: string[], rule: string): ForgeItem => ({ kind: 'typed', prompt, sentence, accepted, rule });

// ========================================
// Cartas
// ========================================

const LETTERS_1: OfflineLetter[] = [
  {
    id: 'l1-01',
    level: 1,
    theme: 'a mina',
    content: {
      genre: 'letter',
      title: 'A sword for the bats',
      sender: 'Kira, the miner',
      text:
        'Hello! I am Kira, the miner. My mine is under the hill. It is dark and cold. I have one pickaxe and two torches. There are four bats in the tunnel. I need a sword for the bats. My dog is next to the door. Give me a sword, please. Thank you, friend!',
      glossary: [
        { en: 'pickaxe', pt: 'picareta' },
        { en: 'torches', pt: 'tochas' },
        { en: 'bats', pt: 'morcegos' },
        { en: 'tunnel', pt: 'túnel' },
        { en: 'sword', pt: 'espada' },
        { en: 'hill', pt: 'colina' },
      ],
      questions: [
        q('decision', 'You have a sword and a cake. What do you give Kira?', ['the sword', 'the cake', 'the dog', 'the door'], 'I need a sword for the bats', 'Kira diz que precisa de uma espada para os morcegos.'),
        q('comprehension', 'Where is the mine?', ['under the hill', 'next to the door', 'in the tunnel', 'on the table'], 'My mine is under the hill', 'Kira diz que a mina fica embaixo da colina.'),
        q('comprehension', 'What is in the tunnel?', ['four bats', 'two dogs', 'four cats', 'two torches'], 'There are four bats in the tunnel', 'O texto diz que há quatro morcegos no túnel.'),
      ],
      translation:
        'Olá! Eu sou Kira, a mineradora. Minha mina fica embaixo da colina. Ela é escura e fria. Eu tenho uma picareta e duas tochas. Há quatro morcegos no túnel. Eu preciso de uma espada para os morcegos. Meu cachorro está ao lado da porta. Me dê uma espada, por favor. Obrigada, amigo!',
    },
  },
  {
    id: 'l1-02',
    level: 1,
    theme: 'o campinho de futebol',
    content: {
      genre: 'scout_report',
      title: 'Scout report: two players',
      sender: 'Scout Dani',
      text:
        'Scout report. Player one: Theo. He is a striker. He is fast and tall. He has a strong kick. Price: four emeralds. Player two: Nico. He is a goalkeeper. He is short but brave. He has big gloves. Price: two emeralds. The final is on Sunday. We need a fast striker.',
      glossary: [
        { en: 'striker', pt: 'atacante' },
        { en: 'goalkeeper', pt: 'goleiro' },
        { en: 'kick', pt: 'chute' },
        { en: 'gloves', pt: 'luvas' },
        { en: 'brave', pt: 'corajoso' },
        { en: 'emeralds', pt: 'esmeraldas' },
      ],
      questions: [
        q('decision', 'You have four emeralds and you need a striker. Who do you hire?', ['Theo', 'Nico', 'Dani', 'the coach'], 'He is a striker. He is fast and tall.', 'Theo é o atacante rápido e custa quatro esmeraldas.'),
        q('comprehension', 'Who has big gloves?', ['Nico', 'Theo', 'Dani', 'the striker'], 'Nico. He is a goalkeeper. He is short but brave. He has big gloves', 'Nico, o goleiro, tem luvas grandes.'),
        q('comprehension', 'What is Nico?', ['a goalkeeper', 'a striker', 'a scout', 'a coach'], 'He is a goalkeeper', 'O texto diz que Nico é goleiro.'),
      ],
      translation:
        'Relatório do olheiro. Jogador um: Theo. Ele é atacante. Ele é rápido e alto. Ele tem um chute forte. Preço: quatro esmeraldas. Jogador dois: Nico. Ele é goleiro. Ele é baixo, mas corajoso. Ele tem luvas grandes. Preço: duas esmeraldas. A final é no domingo. Nós precisamos de um atacante rápido.',
    },
  },
  {
    id: 'l1-03',
    level: 1,
    theme: 'a base',
    content: {
      genre: 'notice',
      title: 'Notice for the base',
      sender: 'Lena, the builder',
      text:
        'Notice! The base is open. The kitchen is on the left. The beds are under the window. Put your boots next to the door. There is cake on the table. Close the door at night. The dog is a guard.',
      glossary: [
        { en: 'kitchen', pt: 'cozinha' },
        { en: 'beds', pt: 'camas' },
        { en: 'boots', pt: 'botas' },
        { en: 'window', pt: 'janela' },
        { en: 'guard', pt: 'guarda' },
        { en: 'cake', pt: 'bolo' },
      ],
      questions: [
        q('decision', 'You are hungry. What do you eat?', ['the cake', 'the dog', 'the boots', 'the beds'], 'There is cake on the table', 'Há bolo na mesa; o cachorro é o guarda, não comida.'),
        q('comprehension', 'Where do you put your boots?', ['next to the door', 'next to the window', 'under the window', 'on the table'], 'Put your boots next to the door', 'O aviso manda colocar as botas ao lado da porta.'),
        q('comprehension', 'Where are the beds?', ['under the window', 'on the left', 'next to the door', 'in the kitchen'], 'The beds are under the window', 'O aviso diz que as camas ficam embaixo da janela.'),
      ],
      translation:
        'Aviso! A base está aberta. A cozinha fica à esquerda. As camas ficam embaixo da janela. Coloque suas botas ao lado da porta. Há bolo na mesa. Feche a porta à noite. O cachorro é um guarda.',
    },
  },
  {
    id: 'l1-04',
    level: 1,
    theme: 'a escola dos mineradores',
    content: {
      genre: 'dialogue',
      title: 'Two friends at school',
      sender: 'Max and Lia',
      text:
        'Max: Hi, Lia! Is the test today?\nLia: No. The test is on Friday.\nMax: Good. I need my blue book.\nLia: Your book is under my chair.\nMax: Thank you! I have two pencils.\nLia: Give me one pencil, please.\nMax: Ok. The teacher is next to the door.\nLia: Open your book. Class is here.',
      glossary: [
        { en: 'test', pt: 'prova' },
        { en: 'pencils', pt: 'lápis' },
        { en: 'teacher', pt: 'professora' },
        { en: 'class', pt: 'aula' },
        { en: 'Friday', pt: 'sexta-feira' },
        { en: 'today', pt: 'hoje' },
      ],
      questions: [
        q('decision', 'You are Max. You need your book. Where do you look?', ['under the chair', 'on the table', 'next to the door', 'in the class'], 'Your book is under my chair', 'Lia diz que o livro está embaixo da cadeira dela.'),
        q('comprehension', 'When is the test?', ['on Friday', 'on Monday', 'today', 'on Sunday'], 'The test is on Friday', 'Lia diz que a prova é na sexta-feira.'),
        q('comprehension', 'Who has two pencils?', ['Max', 'Lia', 'the teacher', 'the class'], 'Max: Thank you! I have two pencils', 'Max diz que tem dois lápis.'),
      ],
      translation:
        'Max: Oi, Lia! A prova é hoje?\nLia: Não. A prova é na sexta-feira.\nMax: Que bom. Eu preciso do meu livro azul.\nLia: Seu livro está embaixo da minha cadeira.\nMax: Obrigado! Eu tenho dois lápis.\nLia: Me dê um lápis, por favor.\nMax: Ok. A professora está ao lado da porta.\nLia: Abra seu livro. A aula começou.',
    },
  },
  {
    id: 'l1-05',
    level: 1,
    theme: 'os animais da vila',
    content: {
      genre: 'list',
      title: 'Farm list for the new helper',
      sender: 'Farmer Joel',
      text:
        'Farm list for the new helper:\n- Two brown horses in the barn.\n- One black cat on the roof.\n- Five white sheep next to the fence.\n- Three pigs in the mud.\n- One big dog under the tree.\nGive water to the horses. Give milk to the cat. The pigs eat apples.',
      glossary: [
        { en: 'barn', pt: 'celeiro' },
        { en: 'roof', pt: 'telhado' },
        { en: 'sheep', pt: 'ovelhas' },
        { en: 'fence', pt: 'cerca' },
        { en: 'mud', pt: 'lama' },
        { en: 'pigs', pt: 'porcos' },
      ],
      questions: [
        q('decision', 'You have a bucket of water. Where do you go?', ['to the horses', 'to the cat', 'to the pigs', 'to the dog'], 'Give water to the horses', 'A lista diz para dar água aos cavalos.'),
        q('comprehension', 'Where is the cat?', ['on the roof', 'in the barn', 'in the mud', 'under the tree'], 'One black cat on the roof', 'O gato preto está no telhado.'),
        q('comprehension', 'What do the pigs eat?', ['apples', 'milk', 'water', 'grapes'], 'The pigs eat apples', 'O texto diz que os porcos comem maçãs.'),
      ],
      translation:
        'Lista da fazenda para o novo ajudante:\n- Dois cavalos marrons no celeiro.\n- Um gato preto no telhado.\n- Cinco ovelhas brancas ao lado da cerca.\n- Três porcos na lama.\n- Um cachorro grande embaixo da árvore.\nDê água aos cavalos. Dê leite ao gato. Os porcos comem maçãs.',
    },
  },
  {
    id: 'l1-06',
    level: 1,
    theme: 'a cozinha',
    content: {
      genre: 'letter',
      title: 'Cake for the team',
      sender: 'Paco, the cook',
      text:
        'Hello, friend! I am Paco, the cook. The team is hungry. I have a big cake and ten apples. There is milk in the fridge. But there is no flour. I need two eggs and flour. The eggs are for the cake. Buy the eggs in the market. The market is next to the school. Thank you!',
      glossary: [
        { en: 'cook', pt: 'cozinheiro' },
        { en: 'hungry', pt: 'com fome' },
        { en: 'fridge', pt: 'geladeira' },
        { en: 'flour', pt: 'farinha' },
        { en: 'eggs', pt: 'ovos' },
        { en: 'market', pt: 'mercado' },
      ],
      questions: [
        q('decision', 'You are in the market. What do you buy?', ['two eggs', 'ten apples', 'a big cake', 'the milk'], 'Buy the eggs in the market', 'Paco pede para comprar os ovos no mercado.'),
        q('comprehension', 'Where is the milk?', ['in the fridge', 'in the market', 'on the table', 'next to the school'], 'There is milk in the fridge', 'O leite está na geladeira.'),
        q('comprehension', 'Where is the market?', ['next to the school', 'next to the fridge', 'in the fridge', 'in the market'], 'The market is next to the school', 'Paco diz que o mercado fica ao lado da escola.'),
      ],
      translation:
        'Olá, amigo! Eu sou Paco, o cozinheiro. O time está com fome. Eu tenho um bolo grande e dez maçãs. Há leite na geladeira. Mas não há farinha. Eu preciso de dois ovos e farinha. Os ovos são para o bolo. Compre os ovos no mercado. O mercado fica ao lado da escola. Obrigado!',
    },
  },
];

const LETTERS_2: OfflineLetter[] = [
  {
    id: 'l2-01',
    level: 2,
    theme: 'a expedição na mina',
    content: {
      genre: 'letter',
      title: 'Job in the deep mine',
      sender: 'Tomas, the mine boss',
      text:
        "Hello! My name is Tomas. I run the deep mine next to the river. I need a new miner because two are sick. The job is hard but the pay is good. You get three emeralds a day. You can't use a wood pickaxe here. The rock is very hard. Do you have an iron pickaxe? We start at six. Bring some water and a torch. My son Leo works with me. He likes digging, but he doesn't like spiders. There are some spiders in the tunnel.",
      glossary: [
        { en: 'deep', pt: 'funda' },
        { en: 'river', pt: 'rio' },
        { en: 'sick', pt: 'doentes' },
        { en: 'pay', pt: 'pagamento' },
        { en: 'emeralds', pt: 'esmeraldas' },
        { en: 'iron', pt: 'ferro' },
        { en: 'spiders', pt: 'aranhas' },
        { en: 'tunnel', pt: 'túnel' },
      ],
      questions: [
        q('decision', 'You want the job. What do you need?', ['an iron pickaxe', 'a wood pickaxe', 'a gold sword', 'a new boat'], "You can't use a wood pickaxe here. The rock is very hard. Do you have an iron pickaxe?", 'Picareta de madeira não serve na rocha dura; Tomas pergunta pela de ferro.'),
        q('comprehension', 'How many emeralds do you get a day?', ['three', 'two', 'six', 'ten'], 'You get three emeralds a day', 'O pagamento é de três esmeraldas por dia.'),
        q('comprehension', 'Why does Tomas need a new miner?', ['because two miners are sick', 'because the pay is bad', 'because Leo likes spiders', 'because the river is dry'], 'I need a new miner because two are sick', 'Tomas precisa de outro minerador porque dois estão doentes.'),
      ],
      translation:
        'Olá! Meu nome é Tomas. Eu comando a mina funda ao lado do rio. Eu preciso de um minerador novo porque dois estão doentes. O trabalho é duro, mas o pagamento é bom. Você ganha três esmeraldas por dia. Você não pode usar picareta de madeira aqui. A rocha é muito dura. Você tem uma picareta de ferro? Começamos às seis. Traga um pouco de água e uma tocha. Meu filho Leo trabalha comigo. Ele gosta de cavar, mas não gosta de aranhas. Há algumas aranhas no túnel.',
    },
  },
  {
    id: 'l2-02',
    level: 2,
    theme: 'o time de futebol',
    content: {
      genre: 'scout_report',
      title: 'Scout report: three players for the final',
      sender: 'Scout Marta',
      text:
        "Scout report for coach Rui. Player one: Bruno, striker. He scores a lot but doesn't pass. He wants five emeralds. Player two: Sara, midfielder. She runs all game and she passes well. She can't shoot from far. She wants three emeralds. Player three: Ivan, goalkeeper. He is calm and he catches every ball. He doesn't like rain. He wants four emeralds. We have seven emeralds. The final is on Saturday and rain is possible.",
      glossary: [
        { en: 'coach', pt: 'técnico' },
        { en: 'striker', pt: 'atacante' },
        { en: 'midfielder', pt: 'meio-campista' },
        { en: 'goalkeeper', pt: 'goleiro' },
        { en: 'calm', pt: 'calmo' },
        { en: 'catches', pt: 'pega' },
        { en: 'rain', pt: 'chuva' },
        { en: 'emeralds', pt: 'esmeraldas' },
      ],
      questions: [
        q('decision', 'You have seven emeralds and you need two players. Who do you hire?', ['Sara and Ivan', 'Bruno and Sara', 'Bruno and Ivan', 'Sara and Rui'], 'He wants four emeralds. We have seven emeralds.', 'Sara (3) + Ivan (4) = 7 esmeraldas; Bruno custa 5 e não cabe com outro.'),
        q('comprehension', "Who doesn't pass the ball?", ['Bruno', 'Sara', 'Ivan', 'Rui'], "Bruno, striker. He scores a lot but doesn't pass", 'Bruno faz gols, mas não passa a bola.'),
        q('comprehension', 'Why is Ivan a good goalkeeper?', ['he catches every ball', 'he scores a lot', 'he wants four emeralds', 'he runs all game'], 'He is calm and he catches every ball', 'Ivan é calmo e pega todas as bolas.'),
      ],
      translation:
        'Relatório do olheiro para o técnico Rui. Jogador um: Bruno, atacante. Ele faz muitos gols, mas não passa. Ele quer cinco esmeraldas. Jogadora dois: Sara, meio-campista. Ela corre o jogo todo e passa bem. Ela não consegue chutar de longe. Ela quer três esmeraldas. Jogador três: Ivan, goleiro. Ele é calmo e pega todas as bolas. Ele não gosta de chuva. Ele quer quatro esmeraldas. Nós temos sete esmeraldas. A final é no sábado e pode chover.',
    },
  },
  {
    id: 'l2-03',
    level: 2,
    theme: 'a noite na base',
    content: {
      genre: 'dialogue',
      title: 'The chest in the kitchen',
      sender: 'Nina and Dad',
      text:
        'Nina: Dad, where is my helmet?\nDad: Look in the chest next to the oven.\nNina: This chest is full of potions.\nDad: Then look under the stairs.\nNina: Here it is! Can I take the lamp too?\nDad: No, that lamp is for the tower.\nNina: Why do we need a lamp in the tower?\nDad: Because the tower has no windows.\nNina: Ok. Do we have any apples?\nDad: We have some apples in the box. Take two.\nNina: Thanks! I love eating apples on the roof.',
      glossary: [
        { en: 'helmet', pt: 'capacete' },
        { en: 'chest', pt: 'baú' },
        { en: 'oven', pt: 'forno' },
        { en: 'potions', pt: 'poções' },
        { en: 'stairs', pt: 'escada' },
        { en: 'lamp', pt: 'lampião' },
        { en: 'tower', pt: 'torre' },
        { en: 'roof', pt: 'telhado' },
      ],
      questions: [
        q('decision', 'You are Nina. Where do you find the helmet?', ['under the stairs', 'in the chest', 'next to the oven', 'in the box'], 'Then look under the stairs', 'O pai manda olhar embaixo da escada, e lá está o capacete.'),
        q('comprehension', 'Why is the lamp for the tower?', ['it has no windows', 'it is full of potions', 'it has no door', 'it is next to the oven'], 'Because the tower has no windows', 'A torre não tem janelas, por isso precisa do lampião.'),
        q('comprehension', 'How many apples does Nina take?', ['two', 'some', 'five', 'ten'], 'Take two', 'O pai diz para pegar duas maçãs.'),
      ],
      translation:
        'Nina: Pai, onde está meu capacete?\nPai: Olhe no baú ao lado do forno.\nNina: Este baú está cheio de poções.\nPai: Então olhe embaixo da escada.\nNina: Aqui está! Posso levar o lampião também?\nPai: Não, aquele lampião é para a torre.\nNina: Por que precisamos de um lampião na torre?\nPai: Porque a torre não tem janelas.\nNina: Ok. Temos alguma maçã?\nPai: Temos algumas maçãs na caixa. Pegue duas.\nNina: Valeu! Eu adoro comer maçãs no telhado.',
    },
  },
  {
    id: 'l2-04',
    level: 2,
    theme: 'a escola dos mineradores',
    content: {
      genre: 'notice',
      title: 'Notice: cave class on Thursday',
      sender: 'Teacher Ana',
      text:
        "Notice for all students. The cave class is on Thursday at nine. Meet next to the school door. Bring a pickaxe and a torch. You can't bring pets because the cave is small. The class needs some rope. Write your name on this list.",
      glossary: [
        { en: 'students', pt: 'alunos' },
        { en: 'Thursday', pt: 'quinta-feira' },
        { en: 'pickaxe', pt: 'picareta' },
        { en: 'pets', pt: 'bichos de estimação' },
        { en: 'cave', pt: 'caverna' },
        { en: 'rope', pt: 'corda' },
        { en: 'list', pt: 'lista' },
        { en: 'torch', pt: 'tocha' },
      ],
      questions: [
        q('decision', 'You have a dog and a torch. What do you bring to class?', ['the torch', 'the dog', 'the pets', 'the list'], "You can't bring pets because the cave is small", 'Bichos não podem ir porque a caverna é pequena; a tocha, sim.'),
        q('comprehension', 'What does the class need?', ['some rope', 'a pickaxe', 'a dog', 'some cake'], 'The class needs some rope', 'O aviso diz que a turma precisa de corda.'),
        q('comprehension', 'Where do you meet?', ['next to the school', 'next to the cave door', 'on this list', 'in the cave'], 'Meet next to the school door', 'O encontro é ao lado da porta da escola.'),
      ],
      translation:
        'Aviso para todos os alunos. A aula na caverna é na quinta-feira às nove. Encontro ao lado da porta da escola. Traga uma picareta e uma tocha. Vocês não podem trazer bichos de estimação porque a caverna é pequena. A turma precisa de corda. Escreva seu nome nesta lista.',
    },
  },
  {
    id: 'l2-05',
    level: 2,
    theme: 'os animais da vila',
    content: {
      genre: 'list',
      title: 'Jobs for the new keeper',
      sender: 'Keeper Bia',
      text:
        "Jobs for the new keeper:\n- The horses eat at seven. They don't eat bread.\n- The parrot likes singing. Give it some seeds.\n- The wolf doesn't like cats.\n- Feed the fish at night.\n- How many rabbits are in the pen?\nThe rabbits can jump, so close the gate.",
      glossary: [
        { en: 'keeper', pt: 'tratador' },
        { en: 'bread', pt: 'pão' },
        { en: 'parrot', pt: 'papagaio' },
        { en: 'seeds', pt: 'sementes' },
        { en: 'wolf', pt: 'lobo' },
        { en: 'rabbits', pt: 'coelhos' },
        { en: 'pen', pt: 'cercado' },
        { en: 'gate', pt: 'portão' },
      ],
      questions: [
        q('decision', 'You have bread and seeds. What do you give the parrot?', ['the seeds', 'the bread', 'the fish', 'the cats'], 'The parrot likes singing. Give it some seeds', 'O papagaio ganha sementes; pão é o que os cavalos não comem.'),
        q('comprehension', "What doesn't the wolf like?", ['cats', 'bread', 'fish', 'rabbits'], "The wolf doesn't like cats", 'O lobo não gosta de gatos.'),
        q('comprehension', 'When do you feed the fish?', ['at night', 'at seven', 'at nine', 'at noon'], 'Feed the fish at night', 'Os peixes comem à noite.'),
      ],
      translation:
        'Tarefas para o novo tratador:\n- Os cavalos comem às sete. Eles não comem pão.\n- O papagaio gosta de cantar. Dê sementes a ele.\n- O lobo não gosta de gatos.\n- Alimente os peixes à noite.\n- Quantos coelhos há no cercado?\nOs coelhos conseguem pular, então feche o portão.',
    },
  },
  {
    id: 'l2-06',
    level: 2,
    theme: 'a feira da vila',
    content: {
      genre: 'letter',
      title: 'Dinner for the miners',
      sender: 'Rosa, the cook',
      text:
        "Hi, chef! I am Rosa, the cook of the base. Tonight twelve miners come for dinner. They love eating soup after the mine. I have carrots and potatoes. But I don't have any meat. Can you buy some chicken in the village? The shop closes at five. Don't buy fish because Tomas hates fish. We also need bread and eight apples. This dinner is very important. The miners work hard and they are hungry. Thanks!",
      glossary: [
        { en: 'chef', pt: 'chefe de cozinha' },
        { en: 'dinner', pt: 'jantar' },
        { en: 'soup', pt: 'sopa' },
        { en: 'carrots', pt: 'cenouras' },
        { en: 'potatoes', pt: 'batatas' },
        { en: 'meat', pt: 'carne' },
        { en: 'chicken', pt: 'frango' },
        { en: 'village', pt: 'vila' },
      ],
      questions: [
        q('decision', 'You are in the shop. What do you buy?', ['chicken and bread', 'fish and bread', 'soup and carrots', 'meat and fish'], "Don't buy fish because Tomas hates fish. We also need bread", 'Rosa pede frango e pão; peixe não, porque Tomas odeia peixe.'),
        q('comprehension', 'How many miners come for dinner?', ['twelve', 'eight', 'five', 'ten'], 'Tonight twelve miners come for dinner', 'Doze mineradores vêm jantar.'),
        q('comprehension', 'Why is fish a bad idea?', ['one miner hates fish', 'the shop has no fish', 'the miners love soup', 'fish is not cheap'], "Don't buy fish because Tomas hates fish", 'Tomas, um dos mineradores, odeia peixe.'),
      ],
      translation:
        'Oi, chefe! Eu sou Rosa, a cozinheira da base. Hoje à noite doze mineradores vêm jantar. Eles adoram comer sopa depois da mina. Eu tenho cenouras e batatas. Mas não tenho carne nenhuma. Você pode comprar frango na vila? A loja fecha às cinco. Não compre peixe porque o Tomas odeia peixe. Também precisamos de pão e oito maçãs. Este jantar é muito importante. Os mineradores trabalham duro e estão com fome. Valeu!',
    },
  },
];

const LETTERS_3: OfflineLetter[] = [
  {
    id: 'l3-01',
    level: 3,
    theme: 'a mina abandonada',
    content: {
      genre: 'letter',
      title: 'Trouble in the abandoned mine',
      sender: 'Captain Mira',
      text:
        'Dear friend, I am writing from the abandoned mine. It was a busy mine many years ago. Now it is empty and quiet. My team is digging the lower tunnel. We want to find the old gold room. The tunnel is narrower than the map says. Yesterday the water was very high. So we always sleep on the upper floor. We must be careful: there are skeletons near the gold room. Pedro is guarding the door with his bow. I need a bigger boat for crossing the flooded tunnel. Please send it before Friday. We never work at night here. Mira.',
      glossary: [
        { en: 'abandoned', pt: 'abandonada' },
        { en: 'empty', pt: 'vazia' },
        { en: 'quiet', pt: 'silenciosa' },
        { en: 'narrower', pt: 'mais estreito' },
        { en: 'upper', pt: 'de cima' },
        { en: 'skeletons', pt: 'esqueletos' },
        { en: 'bow', pt: 'arco' },
        { en: 'boat', pt: 'barco' },
        { en: 'flooded', pt: 'inundado' },
        { en: 'careful', pt: 'cuidadosos' },
      ],
      questions: [
        q('decision', 'You want to help Mira. What do you send?', ['a bigger boat', 'a busy mine', 'the old gold room', 'his bow'], 'I need a bigger boat for crossing the flooded tunnel', 'Mira pede um barco maior para atravessar o túnel inundado.'),
        q('comprehension', 'Where does the team sleep?', ['on the upper floor', 'in the lower tunnel', 'near the gold room', 'in the boat'], 'we always sleep on the upper floor', 'A equipe sempre dorme no andar de cima.'),
        q('inference', 'Why is the team careful near the gold room?', ['there are skeletons there', 'the water is high there', 'Pedro is there', 'the boat is small'], 'We must be careful: there are skeletons near the gold room', 'O texto liga o cuidado aos esqueletos perto da sala do ouro.'),
      ],
      translation:
        'Querido amigo, estou escrevendo da mina abandonada. Ela era uma mina movimentada há muitos anos. Agora está vazia e silenciosa. Minha equipe está cavando o túnel de baixo. Queremos encontrar a antiga sala do ouro. O túnel é mais estreito do que o mapa diz. Ontem a água estava muito alta. Por isso sempre dormimos no andar de cima. Precisamos ter cuidado: há esqueletos perto da sala do ouro. Pedro está guardando a porta com seu arco. Preciso de um barco maior para atravessar o túnel inundado. Por favor, mande antes de sexta-feira. Nunca trabalhamos à noite aqui. Mira.',
    },
  },
  {
    id: 'l3-02',
    level: 3,
    theme: 'o campeonato da vila',
    content: {
      genre: 'scout_report',
      title: 'Scout report: the final against Red Creek',
      sender: 'Scout Helena',
      text:
        'Report for coach Rui before the final. Red Creek is stronger than last year. Their striker, Vitor, is faster than everyone on our team. He always shoots from the left side. Their goalkeeper was sick last week and he is still weak. We must attack on the right, far from Vitor. Our defender Caio is taller than Vitor. He must mark him all game. Our team is training every morning for the final. The field was wet yesterday, so the ball is slower. Bring the light boots, not the heavy ones. We never lose when we play at home. Helena.',
      glossary: [
        { en: 'report', pt: 'relatório' },
        { en: 'stronger', pt: 'mais forte' },
        { en: 'striker', pt: 'atacante' },
        { en: 'goalkeeper', pt: 'goleiro' },
        { en: 'weak', pt: 'fraco' },
        { en: 'defender', pt: 'zagueiro' },
        { en: 'mark', pt: 'marcar' },
        { en: 'wet', pt: 'molhado' },
        { en: 'heavy', pt: 'pesadas' },
        { en: 'lose', pt: 'perder' },
      ],
      questions: [
        q('decision', 'You are the coach. Where does your team attack?', ['on the right', 'on the left', 'at home', 'in the morning'], 'We must attack on the right, far from Vitor', 'Helena manda atacar pela direita, longe do Vitor.'),
        q('comprehension', 'Who must mark Vitor?', ['Caio', 'Rui', 'Helena', 'the goalkeeper'], 'Our defender Caio is taller than Vitor. He must mark him all game', 'Caio, o zagueiro mais alto, deve marcar o Vitor.'),
        q('inference', 'Why is the ball slower?', ['the field is wet', 'the boots are heavy', 'Vitor is very fast', 'the ball is new'], 'The field was wet yesterday, so the ball is slower', 'A bola está mais lenta porque o campo ficou molhado.'),
      ],
      translation:
        'Relatório para o técnico Rui antes da final. O Red Creek está mais forte do que no ano passado. O atacante deles, Vitor, é mais rápido que todo mundo do nosso time. Ele sempre chuta pelo lado esquerdo. O goleiro deles estava doente na semana passada e ainda está fraco. Devemos atacar pela direita, longe do Vitor. Nosso zagueiro Caio é mais alto que o Vitor. Ele deve marcá-lo o jogo inteiro. Nosso time está treinando toda manhã para a final. O campo estava molhado ontem, então a bola está mais lenta. Traga as chuteiras leves, não as pesadas. Nunca perdemos quando jogamos em casa. Helena.',
    },
  },
  {
    id: 'l3-03',
    level: 3,
    theme: 'a tempestade',
    content: {
      genre: 'dialogue',
      title: 'Storm night at the base',
      sender: 'Luca and Grandpa',
      text:
        'Luca: Grandpa, the wind is getting stronger. Is the roof safe?\nGrandpa: Yes, but you must close every window now.\nLuca: I am closing them. The kitchen window was open all day.\nGrandpa: Then the floor is wet. Bring the mop from the storage room.\nLuca: Where are the candles? The lights are going out.\nGrandpa: They are always in the red box under the stairs.\nLuca: There is nothing here. The box is empty!\nGrandpa: Then take the torch next to my bed. Is the dog inside?\nLuca: Yes, he is sleeping under the table. He never likes storms.\nGrandpa: Good. Storms are shorter than they feel. Sit with me.',
      glossary: [
        { en: 'wind', pt: 'vento' },
        { en: 'roof', pt: 'telhado' },
        { en: 'safe', pt: 'seguro' },
        { en: 'mop', pt: 'esfregão' },
        { en: 'storage', pt: 'depósito' },
        { en: 'candles', pt: 'velas' },
        { en: 'stairs', pt: 'escada' },
        { en: 'empty', pt: 'vazia' },
        { en: 'storms', pt: 'tempestades' },
        { en: 'shorter', pt: 'mais curtas' },
      ],
      questions: [
        q('decision', 'The lights are going out. What do you take?', ['the torch', 'the candles', 'the mop', 'the red box'], 'Then take the torch next to my bed', 'As velas acabaram (a caixa está vazia), então sobra a tocha ao lado da cama.'),
        q('comprehension', 'Where is the dog?', ['under the table', 'under the stairs', 'next to my bed', 'in the red box'], 'he is sleeping under the table', 'O cachorro está dormindo embaixo da mesa.'),
        q('inference', 'Why is the kitchen floor wet?', ['the window was open all day', 'the dog is sleeping there', 'the mop is in the kitchen', 'the roof is not safe'], 'The kitchen window was open all day', 'O avô conclui que o chão está molhado porque a janela ficou aberta.'),
      ],
      translation:
        'Luca: Vô, o vento está ficando mais forte. O telhado é seguro?\nVô: É, mas você precisa fechar todas as janelas agora.\nLuca: Estou fechando. A janela da cozinha ficou aberta o dia todo.\nVô: Então o chão está molhado. Traga o esfregão do depósito.\nLuca: Onde estão as velas? As luzes estão apagando.\nVô: Elas ficam sempre na caixa vermelha embaixo da escada.\nLuca: Não tem nada aqui. A caixa está vazia!\nVô: Então pegue a tocha ao lado da minha cama. O cachorro está dentro de casa?\nLuca: Está, ele está dormindo embaixo da mesa. Ele nunca gosta de tempestade.\nVô: Bom. As tempestades são mais curtas do que parecem. Senta aqui comigo.',
    },
  },
  {
    id: 'l3-04',
    level: 3,
    theme: 'o dia do torneio',
    content: {
      genre: 'notice',
      title: 'Notice: tournament day at school',
      sender: 'Principal Dias',
      text:
        'Attention, students! The school tournament is on Thursday. Every team must bring two balls and water. The big field is wetter than the small one. So the first games are in the gym. Teams are arriving at eight. Winners clean the gym.',
      glossary: [
        { en: 'tournament', pt: 'torneio' },
        { en: 'Thursday', pt: 'quinta-feira' },
        { en: 'field', pt: 'campo' },
        { en: 'wetter', pt: 'mais molhado' },
        { en: 'gym', pt: 'ginásio' },
        { en: 'teams', pt: 'times' },
        { en: 'arriving', pt: 'chegando' },
        { en: 'winners', pt: 'vencedores' },
        { en: 'clean', pt: 'limpam' },
        { en: 'attention', pt: 'atenção' },
      ],
      questions: [
        q('decision', 'You are a team captain. What must you bring?', ['water and two balls', 'boots and two balls', 'water and one ball', 'water and a torch'], 'Every team must bring two balls and water', 'O aviso diz: cada time deve trazer duas bolas e água.'),
        q('comprehension', 'When are teams arriving?', ['at eight', 'at nine', 'on Thursday', 'at the gym'], 'Teams are arriving at eight', 'Os times chegam às oito.'),
        q('inference', 'Why are the first games in the gym?', ['the big field is too wet', 'the small field is too wet', 'the gym is bigger', 'the teams are late'], 'The big field is wetter than the small one. So the first games are in the gym', 'O campo grande está mais molhado, por isso os primeiros jogos são no ginásio.'),
      ],
      translation:
        'Atenção, alunos! O torneio da escola é na quinta-feira. Cada time deve trazer duas bolas e água. O campo grande está mais molhado que o pequeno. Por isso os primeiros jogos são no ginásio. Os times estão chegando às oito. Os vencedores limpam o ginásio.',
    },
  },
  {
    id: 'l3-05',
    level: 3,
    theme: 'a montanha de gelo',
    content: {
      genre: 'list',
      title: 'Night watch list: the animals',
      sender: 'Ranger Kai',
      text:
        'Night watch list:\n- The wolves are howling near the north fence. Never go there alone.\n- The horses were nervous yesterday. Give them more hay tonight.\n- The owl always sleeps in the tallest tree.\n- The bear is bigger than last year. Keep the food locked.\n- Feed the chickens at six.',
      glossary: [
        { en: 'watch', pt: 'vigia' },
        { en: 'wolves', pt: 'lobos' },
        { en: 'howling', pt: 'uivando' },
        { en: 'fence', pt: 'cerca' },
        { en: 'alone', pt: 'sozinho' },
        { en: 'nervous', pt: 'nervosos' },
        { en: 'hay', pt: 'feno' },
        { en: 'owl', pt: 'coruja' },
        { en: 'tallest', pt: 'mais alta' },
        { en: 'bear', pt: 'urso' },
      ],
      questions: [
        q('decision', 'It is night and you hear the wolves. What do you do?', ['stay away from the fence', 'give the wolves some hay', 'run to the north fence', 'open the food box'], 'Never go there alone', 'A lista manda nunca ir sozinho perto da cerca onde os lobos uivam.'),
        q('comprehension', 'Where does the owl sleep?', ['in the tallest tree', 'near the north fence', 'in the food box', 'under the fence'], 'The owl always sleeps in the tallest tree', 'A coruja dorme na árvore mais alta.'),
        q('inference', 'Why do the horses get more hay tonight?', ['they were nervous yesterday', 'they are bigger than last year', 'the wolves eat their hay', 'the owl is in their tree'], 'The horses were nervous yesterday. Give them more hay tonight', 'O feno extra vem logo depois de dizer que os cavalos estavam nervosos.'),
      ],
      translation:
        'Lista da vigia noturna:\n- Os lobos estão uivando perto da cerca norte. Nunca vá lá sozinho.\n- Os cavalos estavam nervosos ontem. Dê mais feno a eles hoje à noite.\n- A coruja sempre dorme na árvore mais alta.\n- O urso está maior que no ano passado. Mantenha a comida trancada.\n- Alimente as galinhas às seis.',
    },
  },
  {
    id: 'l3-06',
    level: 3,
    theme: 'o mercado noturno',
    content: {
      genre: 'letter',
      title: 'The night market needs a helper',
      sender: 'Chef Omar',
      text:
        'Hello, young miner! I am Omar, the chef of the night market. Every night I cook for two hundred people. Tonight my helper is sick, so I am cooking alone. I need someone to cut vegetables and carry water. The work starts at seven and ends at midnight. The kitchen is hotter than the desert, so wear light clothes. You must never touch the big pot; the soup is boiling. Yesterday a boy was careless and now his hand hurts. The pay is six emeralds and free bread. Are you coming? Omar.',
      glossary: [
        { en: 'chef', pt: 'chefe de cozinha' },
        { en: 'market', pt: 'mercado' },
        { en: 'helper', pt: 'ajudante' },
        { en: 'vegetables', pt: 'legumes' },
        { en: 'midnight', pt: 'meia-noite' },
        { en: 'hotter', pt: 'mais quente' },
        { en: 'desert', pt: 'deserto' },
        { en: 'clothes', pt: 'roupas' },
        { en: 'pot', pt: 'panela' },
        { en: 'careless', pt: 'descuidado' },
      ],
      questions: [
        q('decision', 'You take the job. What do you wear?', ['light clothes', 'heavy clothes', 'the big pot', 'free bread'], 'The kitchen is hotter than the desert, so wear light clothes', 'A cozinha é muito quente, então Omar manda usar roupas leves.'),
        q('comprehension', 'When does the work start?', ['at seven', 'at midnight', 'at six', 'at night'], 'The work starts at seven and ends at midnight', 'O trabalho começa às sete.'),
        q('inference', 'Why must you never touch the big pot?', ['it is very hot', 'it is empty', "it is Omar's", 'it has bread inside'], 'You must never touch the big pot; the soup is boiling', 'A sopa está fervendo: a panela queima, como aconteceu com a mão do menino.'),
      ],
      translation:
        'Olá, jovem minerador! Eu sou Omar, o chefe de cozinha do mercado noturno. Toda noite eu cozinho para duzentas pessoas. Hoje meu ajudante está doente, então estou cozinhando sozinho. Preciso de alguém para cortar legumes e carregar água. O trabalho começa às sete e termina à meia-noite. A cozinha é mais quente que o deserto, então use roupas leves. Você nunca deve tocar na panela grande; a sopa está fervendo. Ontem um menino foi descuidado e agora a mão dele dói. O pagamento é seis esmeraldas e pão de graça. Você vem? Omar.',
    },
  },
];

// ========================================
// Recados
// ========================================

const NOTES_1: OfflineNote[] = [
  {
    id: 'n1-01',
    level: 1,
    theme: 'a lição da tarde',
    content: {
      brief: 'Escreva um recado para o papai. Diga que você faz a lição primeiro. Depois você joga bola.',
      mustInclude: [
        { pt: 'faço a lição', en: ['my homework', 'the homework', 'do my homework'] },
        { pt: 'primeiro', en: ['homework first', 'do first', 'first'] },
        { pt: 'jogo bola', en: ['play soccer', 'play football', 'I play soccer'] },
      ],
      wordBank: ['do', 'homework', 'first', 'then', 'play', 'soccer', 'want', 'need', 'ball', 'dinner', 'book', 'help'],
      model: 'I do my homework first. Then I play soccer.',
      hint: '',
    },
  },
  {
    id: 'n1-02',
    level: 1,
    theme: 'a pia da cozinha',
    content: {
      brief: 'Escreva um recado para a mamãe. Diga que você lava o prato. Diga que é para ela.',
      mustInclude: [
        { pt: 'lavo o prato', en: ['wash the plate', 'I wash the plate', 'wash plate'] },
        { pt: 'o prato', en: ['the plate', 'plate'] },
        { pt: 'para a mamãe', en: ['for mom', 'for my mom', 'for you'] },
      ],
      wordBank: ['wash', 'plate', 'now', 'for', 'mom', 'need', 'want', 'cup', 'dinner', 'help', 'ready', 'home'],
      model: 'I wash the plate now. It is for mom.',
      hint: '',
    },
  },
  {
    id: 'n1-03',
    level: 1,
    theme: 'a mochila da noite',
    content: {
      brief: 'Escreva um recado para você. Diga que a mochila fica na cadeira. Diga que você está pronto para a escola.',
      mustInclude: [
        { pt: 'a mochila', en: ['my bag', 'the bag', 'bag'] },
        { pt: 'na cadeira', en: ['on the chair', 'on my chair', 'on chair'] },
        { pt: 'pronto para a escola', en: ['ready for school', 'I am ready', 'ready'] },
      ],
      wordBank: ['put', 'bag', 'chair', 'ready', 'school', 'want', 'book', 'bed', 'door', 'help', 'first', 'play'],
      model: 'I put my bag on the chair. I am ready for school.',
      hint: '',
    },
  },
  {
    id: 'n1-04',
    level: 1,
    theme: 'um copo de água',
    content: {
      brief: 'Escreva um recado para a mamãe. Peça com educação uma água. Diga que você tem sede.',
      mustInclude: [
        { pt: 'por favor', en: ['Please, I want', 'please I want', 'Please'] },
        { pt: 'quero água', en: ['I want water', 'want water', 'want a water', 'need water'] },
        { pt: 'tenho sede', en: ['I am thirsty', 'am thirsty', 'thirsty'] },
      ],
      wordBank: ['please', 'want', 'water', 'thirsty', 'need', 'help', 'juice', 'cup', 'now', 'first', 'dinner', 'play'],
      model: 'Please, I want water. I am thirsty.',
      hint: '',
    },
  },
  {
    id: 'n1-05',
    level: 1,
    theme: 'o jogo de amanhã',
    content: {
      brief: 'Escreva um recado para o amigo. Peça desculpa. Diga que você está atrasado para o jogo.',
      mustInclude: [
        { pt: 'desculpa', en: ['I am sorry', 'am sorry', 'sorry'] },
        { pt: 'estou atrasado', en: ['I am late', 'am late', 'late'] },
        { pt: 'para o jogo', en: ['for the game', 'for my game', 'for game'] },
      ],
      wordBank: ['sorry', 'late', 'game', 'play', 'soccer', 'want', 'help', 'friend', 'ball', 'now', 'first', 'ready'],
      model: 'I am sorry. I am late for the game.',
      hint: '',
    },
  },
  {
    id: 'n1-06',
    level: 1,
    theme: 'o almoço em casa',
    content: {
      brief: 'Escreva um recado para o papai. Agradeça o almoço. Diga que você gosta da comida.',
      mustInclude: [
        { pt: 'obrigado', en: ['Thank you', 'thank you', 'thanks'] },
        { pt: 'pelo almoço', en: ['for lunch', 'thank you for lunch'] },
        { pt: 'gosto da comida', en: ['I like the food', 'like the food', 'like food'] },
      ],
      wordBank: ['thank', 'lunch', 'like', 'food', 'dinner', 'want', 'plate', 'help', 'mom', 'now', 'ready', 'water'],
      model: 'Thank you for lunch. I like the food.',
      hint: '',
    },
  },
];

const NOTES_2: OfflineNote[] = [
  {
    id: 'n2-01',
    level: 2,
    theme: 'bola depois da lição',
    content: {
      brief: 'Escreva um recado para o papai. Peça para jogar bola. Explique que é porque a lição já está pronta.',
      mustInclude: [
        { pt: 'jogar bola', en: ['play soccer', 'play football', 'Can I play soccer'] },
        { pt: 'a lição', en: ['my homework', 'the homework', 'homework'] },
        { pt: 'porque a lição está pronta', en: ['because my homework is ready', 'because homework is ready', 'because it is ready'] },
      ],
      wordBank: ['play', 'soccer', 'now', 'because', 'homework', 'ready', 'want', 'ball', 'dinner', 'help', 'first', 'wait'],
      model: 'Can I play soccer now? I can play because my homework is ready.',
      hint: '',
    },
  },
  {
    id: 'n2-02',
    level: 2,
    theme: 'a tela depois do jantar',
    content: {
      brief: 'Escreva um recado para a mamãe. Diga que você não liga a tela agora. Explique que é porque o jantar vem primeiro.',
      mustInclude: [
        { pt: 'não quero a tela', en: ["don't want the screen", 'do not want the screen', 'not want the screen', "don't want screen", 'not want screen'] },
        { pt: 'o jantar', en: ['dinner', 'because dinner'] },
        { pt: 'porque o jantar vem primeiro', en: ['because dinner is first', 'dinner is first'] },
      ],
      wordBank: ['want', 'screen', 'now', 'wait', 'because', 'dinner', 'first', 'play', 'soccer', 'help', 'bed', 'food'],
      model: "I don't want the screen now. I wait because dinner is first.",
      hint: '',
    },
  },
  {
    id: 'n2-03',
    level: 2,
    theme: 'a palavra difícil',
    content: {
      brief: 'Escreva um recado para o professor. Peça ajuda com esta palavra. Explique que é porque ela é nova.',
      mustInclude: [
        { pt: 'ajuda', en: ['help me', 'Please help me', 'help'] },
        { pt: 'esta palavra', en: ['this word', 'the word', 'word'] },
        { pt: 'porque é nova', en: ['because this word is new', 'because it is new', 'because I am new'] },
      ],
      wordBank: ['please', 'help', 'word', 'hard', 'because', 'new', 'book', 'school', 'want', 'read', 'write', 'now'],
      model: 'Please help me with this word. It is hard because this word is new.',
      hint: '',
    },
  },
  {
    id: 'n2-04',
    level: 2,
    theme: 'água no treino',
    content: {
      brief: 'Escreva um recado para o time. Diga que você bebe água no jogo. Explique que é porque você está com calor.',
      mustInclude: [
        { pt: 'bebo água', en: ['drink water', 'I drink water', 'water'] },
        { pt: 'no jogo', en: ['at the game', 'in the game', 'at soccer', 'at the soccer game'] },
        { pt: 'porque estou com calor', en: ['because I am hot', 'because it is hot', 'because I feel hot'] },
      ],
      wordBank: ['drink', 'water', 'game', 'because', 'hot', 'play', 'soccer', 'want', 'help', 'now', 'first', 'team'],
      model: 'I drink water at the game. I do this because I am hot.',
      hint: '',
    },
  },
  {
    id: 'n2-05',
    level: 2,
    theme: 'a cama feita',
    content: {
      brief: 'Escreva um recado para a mamãe. Diga que a cama está pronta. Explique que é porque o quarto fica limpo.',
      mustInclude: [
        { pt: 'a cama está pronta', en: ['The bed is ready', 'bed is ready', 'the bed'] },
        { pt: 'o quarto', en: ['the room', 'room'] },
        { pt: 'porque o quarto fica limpo', en: ['because the room is clean', 'the room is clean'] },
      ],
      wordBank: ['bed', 'ready', 'because', 'room', 'clean', 'want', 'help', 'now', 'first', 'chair', 'bag', 'school'],
      model: 'The bed is ready. I do this because the room is clean.',
      hint: '',
    },
  },
  {
    id: 'n2-06',
    level: 2,
    theme: 'atraso em casa',
    content: {
      brief: 'Escreva um recado para o amigo. Peça desculpa pelo atraso. Explique que é porque você ajuda em casa.',
      mustInclude: [
        { pt: 'desculpa', en: ['I am sorry', 'am sorry', 'sorry'] },
        { pt: 'atrasado', en: ['I am late', 'am late', 'late'] },
        { pt: 'porque ajudo em casa', en: ['because I help at home', 'I help at home', 'help at home'] },
      ],
      wordBank: ['sorry', 'late', 'because', 'help', 'home', 'want', 'dinner', 'plate', 'now', 'friend', 'game', 'first'],
      model: 'I am sorry. I am late because I help at home.',
      hint: '',
    },
  },
];

const NOTES_3: OfflineNote[] = [
  {
    id: 'n3-01',
    level: 3,
    theme: 'a lição agora',
    content: {
      brief: 'Escreva um recado para o papai. Diga que você está fazendo a lição agora. Diga que depois você quer jogar. Diga que você deve esperar.',
      mustInclude: [
        { pt: 'estou fazendo a lição', en: ['doing my homework', 'I am doing', 'am doing my homework'] },
        { pt: 'para jogar', en: ['to play', 'want to play', 'to play after'] },
        { pt: 'devo esperar', en: ['I must wait', 'must wait'] },
      ],
      wordBank: ['do', 'homework', 'now', 'want', 'play', 'dinner', 'must', 'wait', 'soccer', 'first', 'help', 'school', 'ready'],
      model: 'I am doing my homework now. I want to play after dinner. I must wait.',
      hint: 'Frase 1: am/is + verbo-ing (agora). Frase 2: to + verbo. Frase 3: must + verbo.',
    },
  },
  {
    id: 'n3-02',
    level: 3,
    theme: 'o prato na pia',
    content: {
      brief: 'Escreva um recado para a mamãe. Diga que você está lavando o prato. Diga que você deve guardar o copo. Diga que é para ela.',
      mustInclude: [
        { pt: 'estou lavando o prato', en: ['washing the plate', 'I am washing', 'am washing the plate'] },
        { pt: 'devo guardar o copo', en: ['I must put', 'must put the cup'] },
        { pt: 'para a mamãe', en: ['for mom', 'for my mom', 'for you'] },
      ],
      wordBank: ['wash', 'plate', 'now', 'must', 'put', 'cup', 'mom', 'help', 'dinner', 'ready', 'home', 'water'],
      model: 'I am washing the plate now. I must put the cup away. It is for mom.',
      hint: 'Frase 1: am + verbo-ing. Frase 2: must + verbo. Frase 3: for + pessoa.',
    },
  },
  {
    id: 'n3-03',
    level: 3,
    theme: 'tela apagada',
    content: {
      brief: 'Escreva um recado para você. Diga que a tela está apagada agora. Diga que você deve dormir para jogar amanhã.',
      mustInclude: [
        { pt: 'a tela está apagada', en: ['screen is off', 'The screen is off', 'is off now'] },
        { pt: 'devo dormir', en: ['I must sleep', 'must sleep'] },
        { pt: 'para jogar', en: ['to play', 'sleep to play', 'to play tomorrow'] },
      ],
      wordBank: ['screen', 'off', 'now', 'must', 'sleep', 'play', 'tomorrow', 'ready', 'bed', 'want', 'help', 'dinner'],
      model: 'The screen is off now. I must sleep to play tomorrow. I am ready for bed.',
      hint: 'Frase 1: o que está agora. Frase 2: must + verbo + to + verbo (para quê).',
    },
  },
  {
    id: 'n3-04',
    level: 3,
    theme: 'a mochila de amanhã',
    content: {
      brief: 'Escreva um recado para o papai. Diga que você está pondo os livros na mochila. Diga que você deve terminar hoje. Diga que é para a escola.',
      mustInclude: [
        { pt: 'estou pondo os livros', en: ['putting books', 'I am putting', 'am putting books'] },
        { pt: 'devo terminar', en: ['I must finish', 'must finish'] },
        { pt: 'para a escola', en: ['for school', 'for the school'] },
      ],
      wordBank: ['put', 'book', 'bag', 'now', 'must', 'finish', 'today', 'school', 'ready', 'help', 'first', 'want'],
      model: 'I am putting books in my bag. I must finish it today. It is for school.',
      hint: 'Frase 1: am + verbo-ing. Frase 2: must + verbo. Frase 3: for + lugar da vida.',
    },
  },
  {
    id: 'n3-05',
    level: 3,
    theme: 'o jantar em família',
    content: {
      brief: 'Escreva um recado para a mamãe. Agradeça o jantar. Diga que você deve ajudar na cozinha. Diga que você está lavando agora.',
      mustInclude: [
        { pt: 'obrigado pelo jantar', en: ['Thank you for dinner', 'for dinner', 'thank you'] },
        { pt: 'devo ajudar', en: ['I must help', 'must help'] },
        { pt: 'estou lavando', en: ['I am washing', 'am washing now', 'washing now'] },
      ],
      wordBank: ['thank', 'dinner', 'must', 'help', 'kitchen', 'wash', 'now', 'plate', 'mom', 'ready', 'home', 'water'],
      model: 'Thank you for dinner. I must help in the kitchen. I am washing now.',
      hint: 'Frase 1: Thank you for. Frase 2: must + verbo. Frase 3: am + verbo-ing.',
    },
  },
  {
    id: 'n3-06',
    level: 3,
    theme: 'a verdade ao amigo',
    content: {
      brief: 'Escreva um recado para o amigo. Peça desculpa. Diga que você deve falar a verdade. Diga que você está tentando agora.',
      mustInclude: [
        { pt: 'desculpa', en: ['I am sorry', 'am sorry', 'sorry'] },
        { pt: 'devo falar a verdade', en: ['must tell the truth', 'I must tell', 'tell the truth'] },
        { pt: 'estou tentando', en: ['I am trying', 'am trying now', 'trying now'] },
      ],
      wordBank: ['sorry', 'friend', 'must', 'tell', 'truth', 'try', 'now', 'help', 'home', 'late', 'game', 'wait'],
      model: 'I am sorry my friend. I must tell the truth. I am trying now.',
      hint: 'Frase 1: I am sorry. Frase 2: must + verbo. Frase 3: am + verbo-ing.',
    },
  },
];

// ========================================
// Ferrarias: um contrato por alvo do cartão do nível (LEVELS[n].forgeTargets).
// Alvo de ordem = 6 scrambles; alvo de forma = gap + typed na mistura de forgeItemMixFor
// (n1 4+2, n2 3+3, n3 2+4).
// ========================================

const FORGES_1: OfflineForge[] = [
  {
    id: 'f1-01',
    level: 1,
    theme: 'a base',
    content: {
      target: 'Ordem do pedido (Put the X on the Y)',
      items: [
        scramble('Put the torch on the table.', 'Comece com o verbo (Put), depois o objeto e por fim o lugar.'),
        scramble('Give me two red apples.', 'Give + para quem (me) + o que.'),
        scramble('Open the door of the base.', 'O verbo vem primeiro: Open the door.'),
        scramble('Take the sword and the map.', 'Take + o que; junte os dois objetos com and.'),
        scramble('Close the chest next to the bed.', 'Verbo, objeto e depois o lugar com next to.'),
        scramble('Put five torches in the cave.', 'Put + quantidade e item + lugar.'),
      ],
    },
  },
  {
    id: 'f1-02',
    level: 1,
    theme: 'os animais da vila',
    content: {
      target: 'There is / There are',
      items: [
        gap('There ___ two dogs in the barn.', ['are', 'is', 'am'], 'Dois cachorros é plural: There are.'),
        gap('There ___ a torch on the table.', ['is', 'are', 'am'], 'Uma tocha é singular: There is.'),
        gap('There ___ five bats in the cave.', ['are', 'is', 'have'], 'Cinco morcegos, plural: There are.'),
        gap('There ___ one cake in the box.', ['is', 'are', 'has'], 'Um bolo, singular: There is.'),
        typed('Complete com is ou are', 'There ___ three swords in the chest.', ['are'], 'Três espadas, plural: There are.'),
        typed('Complete com is ou are', 'There ___ a dog under the bed.', ['is'], 'Um cachorro, singular: There is.'),
      ],
    },
  },
  {
    id: 'f1-03',
    level: 1,
    theme: 'a cozinha',
    content: {
      target: 'Artigos a/an/the',
      items: [
        gap('I have ___ orange in my bag.', ['an', 'a', 'the'], 'Orange começa com vogal: an orange.'),
        gap('There is ___ cat on the roof.', ['a', 'an', 'two'], 'Cat começa com consoante: a cat.'),
        gap('Give me ___ egg for the cake.', ['an', 'a', 'two'], 'Egg começa com vogal: an egg.'),
        gap('I want ___ blue ball.', ['a', 'an', 'are'], 'Blue começa com consoante: a blue ball.'),
        typed('Escreva a ou an', 'I need ___ apple.', ['an'], 'Apple começa com vogal: an apple.'),
        typed('Escreva a ou an', 'There is ___ horse in the barn.', ['a'], 'Horse começa com consoante (o h tem som): a horse.'),
      ],
    },
  },
  {
    id: 'f1-04',
    level: 1,
    theme: 'a mina',
    content: {
      target: 'Plural regular',
      items: [
        gap('I have two ___.', ['torches', 'torch', 'torchs'], 'Palavras em -ch fazem plural com -es: torches.'),
        gap('There are five ___ in the mine.', ['bats', 'bat', 'bates'], 'Plural regular: bat + s = bats.'),
        gap('Give me three ___.', ['keys', 'key', 'keies'], 'Key termina em vogal + y: só acrescenta s.'),
        gap('The farm has ten ___.', ['boxes', 'box', 'boxs'], 'Palavras em -x fazem plural com -es: boxes.'),
        typed('Escreva o plural de sword', 'I want four ___.', ['swords'], 'Plural regular: sword + s = swords.'),
        typed('Escreva o plural de apple', 'There are six ___ on the table.', ['apples'], 'Plural regular: apple + s = apples.'),
      ],
    },
  },
  {
    id: 'f1-05',
    level: 1,
    theme: 'a caverna',
    content: {
      target: 'am / is / are',
      items: [
        gap('I ___ a miner.', ['am', 'is', 'are'], 'Com I usamos am.'),
        gap('The cave ___ dark.', ['is', 'are', 'am'], 'The cave é singular (it): is.'),
        gap('You ___ my friend.', ['are', 'is', 'am'], 'Com you usamos are.'),
        gap('The dogs ___ under the bed.', ['are', 'is', 'am'], 'The dogs é plural (they): are.'),
        typed('Complete com am, is ou are', 'We ___ in the mine.', ['are'], 'Com we usamos are.'),
        typed('Complete com am, is ou are', 'My sword ___ blue.', ['is'], 'My sword é singular (it): is.'),
      ],
    },
  },
  {
    id: 'f1-06',
    level: 1,
    theme: 'o campinho de futebol',
    content: {
      target: 'Ordem da pergunta (Is it...? Do you...?)',
      items: [
        scramble('Is the cave dark?', 'Na pergunta, is vem antes do sujeito: Is the cave...?'),
        scramble('Do you have a map?', 'Pergunta com do: Do you + verbo.'),
        scramble('Are the dogs in the barn?', 'Com plural, are vem primeiro: Are the dogs...?'),
        scramble('Is there a torch in the chest?', 'Is there...? pergunta se existe algo.'),
        scramble('Do you want an apple?', 'Do you want...? = você quer...?'),
        scramble('Where is my red ball?', 'A palavra de pergunta (where) vem primeiro, depois is.'),
      ],
    },
  },
];

const FORGES_2: OfflineForge[] = [
  {
    id: 'f2-01',
    level: 2,
    theme: 'o time de futebol',
    content: {
      target: 'Presente simples com -s (he likes)',
      items: [
        gap('Leo ___ football every day.', ['plays', 'play', 'playing'], 'Com he/she/it o verbo ganha -s: plays.'),
        gap('My dog ___ bones.', ['likes', 'like', 'liking'], 'My dog = it: likes.'),
        gap('The miner ___ in the cave.', ['works', 'work', 'working'], 'The miner = he: works.'),
        typed('Escreva o verbo eat na forma de he', 'He ___ two apples at lunch.', ['eats'], 'He + eat = eats.'),
        typed('Escreva o verbo run na forma de she', 'She ___ very fast.', ['runs'], 'She + run = runs.'),
        typed('Escreva o verbo watch na forma de he', 'He ___ the game on Sunday.', ['watches'], 'Verbos em -ch ganham -es: watches.'),
      ],
    },
  },
  {
    id: 'f2-02',
    level: 2,
    theme: 'a floresta',
    content: {
      target: "don't / doesn't",
      items: [
        gap('I ___ like spiders.', ["don't", "doesn't", 'not'], "Com I/you/we/they usamos don't."),
        gap('She ___ have a torch.', ["doesn't", "don't", "isn't"], "Com he/she/it usamos doesn't."),
        gap('The cats ___ eat bread.', ["don't", "doesn't", "aren't"], "The cats = they: don't."),
        typed("Escreva don't ou doesn't", 'Ivan ___ like rain.', ["doesn't", 'does not'], "Ivan = he: doesn't."),
        typed("Escreva don't ou doesn't", 'We ___ have any rope.', ["don't", 'do not'], "We usa don't."),
        typed("Escreva don't ou doesn't", 'My horse ___ jump the fence.', ["doesn't", 'does not'], "My horse = it: doesn't."),
      ],
    },
  },
  {
    id: 'f2-03',
    level: 2,
    theme: 'o rio e a ponte',
    content: {
      target: "can / can't",
      items: [
        gap('Sara ___ shoot from far, so she passes.', ["can't", 'can', 'cans'], "Negativo de can é can't."),
        gap("Fish ___ swim, but they can't walk.", ['can', "can't", 'cans'], 'Peixes nadam: can swim.'),
        gap('___ you open this chest?', ['Can', 'Do', 'Is'], 'Pergunta de habilidade começa com Can.'),
        typed("Escreva can ou can't", 'A creeper ___ climb ladders.', ["can't", 'cannot'], "Creeper não sobe escada: can't."),
        typed("Escreva can ou can't", 'Birds ___ fly.', ['can'], 'Pássaros voam: can fly.'),
        typed("Escreva can ou can't", 'I ___ see in the dark without a torch.', ["can't", 'cannot'], "Sem tocha não dá para ver: can't."),
      ],
    },
  },
  {
    id: 'f2-04',
    level: 2,
    theme: 'a feira da vila',
    content: {
      target: 'some / any',
      items: [
        gap('Do you have ___ torches?', ['any', 'some', 'a'], 'Em perguntas usamos any.'),
        gap('We have ___ apples in the box.', ['some', 'any', 'an'], 'Em frases afirmativas usamos some.'),
        gap("I don't have ___ emeralds.", ['any', 'some', 'a'], "Em negativas (don't) usamos any."),
        typed('Escreva some ou any', 'There are ___ spiders in the tunnel.', ['some'], 'Afirmativa: some spiders.'),
        typed('Escreva some ou any', 'Is there ___ water in the bucket?', ['any'], 'Pergunta: any water.'),
        typed('Escreva some ou any', "She doesn't want ___ soup.", ['any'], "Negativa (doesn't): any."),
      ],
    },
  },
  {
    id: 'f2-05',
    level: 2,
    theme: 'a escola dos mineradores',
    content: {
      target: 'Ordem da pergunta (How many...? Does he...?)',
      items: [
        scramble('How many emeralds do you have?', 'How many + substantivo + do you + verbo.'),
        scramble('Does he like spiders?', 'Com he/she/it a pergunta começa com Does.'),
        scramble('Can you open the chest?', 'Can vem antes de you na pergunta.'),
        scramble('Where does the wolf sleep?', 'Palavra de pergunta, depois does, depois o sujeito.'),
        scramble('Do you want some soup?', 'Do you + verbo + o resto.'),
        scramble('How many players can come?', 'How many + substantivo + can + verbo.'),
      ],
    },
  },
  {
    id: 'f2-06',
    level: 2,
    theme: 'a expedição na mina',
    content: {
      target: 'Ordem da frase com because',
      items: [
        scramble('I need a torch because it is dark.', 'Primeiro o que você precisa, depois because e o motivo.'),
        scramble("She doesn't play because she is sick.", 'A ação vem antes; because liga o motivo no fim.'),
        scramble("We can't swim because the river is cold.", 'Frase principal primeiro, depois because + motivo.'),
        scramble('He likes the mine because he finds gold.', 'Because vem no meio, ligando a frase ao motivo.'),
        scramble('Take a rope because the wall is high.', 'Ordem: pedido, because, motivo.'),
        scramble('I want soup because I am hungry.', 'O motivo (I am hungry) vem depois de because.'),
      ],
    },
  },
];

const FORGES_3: OfflineForge[] = [
  {
    id: 'f3-01',
    level: 3,
    theme: 'a mina abandonada',
    content: {
      target: 'Presente contínuo (is running)',
      items: [
        gap('The team ___ digging the lower tunnel now.', ['is', 'are', 'am'], 'The team (it) + is + verbo-ing.'),
        gap('Look! The wolves ___ running to the fence.', ['are', 'is', 'am'], 'The wolves (they) + are + verbo-ing.'),
        typed('Escreva o verbo run na forma -ing', 'Vitor is ___ to the goal.', ['running'], 'Run dobra o n: running.'),
        typed('Escreva o verbo swim na forma -ing', 'The fish are ___ in the river.', ['swimming'], 'Swim dobra o m: swimming.'),
        typed('Escreva o verbo write na forma -ing', 'I am ___ a letter to Mira.', ['writing'], 'Write perde o e: writing.'),
        typed('Escreva o verbo eat na forma -ing', 'The horses are ___ hay now.', ['eating'], 'Eat + ing = eating.'),
      ],
    },
  },
  {
    id: 'f3-02',
    level: 3,
    theme: 'o campeonato da vila',
    content: {
      target: 'was / were',
      items: [
        gap('Yesterday the field ___ wet.', ['was', 'were', 'is'], 'The field (it) no passado: was.'),
        gap('The horses ___ nervous last night.', ['were', 'was', 'are'], 'The horses (they) no passado: were.'),
        typed('Escreva was ou were', 'I ___ in the cave at six.', ['was'], 'I no passado: was.'),
        typed('Escreva was ou were', 'We ___ at the final on Sunday.', ['were'], 'We no passado: were.'),
        typed('Escreva was ou were', 'The goalkeeper ___ sick last week.', ['was'], 'He no passado: was.'),
        typed('Escreva was ou were', 'You ___ very fast in the game.', ['were'], 'You sempre usa were.'),
      ],
    },
  },
  {
    id: 'f3-03',
    level: 3,
    theme: 'a viagem ao deserto',
    content: {
      target: 'Comparativos (bigger, faster)',
      items: [
        gap('A diamond sword is ___ than an iron sword.', ['stronger', 'strong', 'more strong'], 'Adjetivo curto + er + than: stronger than.'),
        gap('This tunnel is ___ than the map says.', ['narrower', 'narrow', 'narrowest'], 'Comparativo: narrow + er = narrower.'),
        typed('Escreva o comparativo de fast', 'Vitor is ___ than Caio.', ['faster'], 'fast + er = faster.'),
        typed('Escreva o comparativo de big', 'The bear is ___ than last year.', ['bigger'], 'Big dobra o g: bigger.'),
        typed('Escreva o comparativo de hot', 'The kitchen is ___ than the desert.', ['hotter'], 'Hot dobra o t: hotter.'),
        typed('Escreva o comparativo de tall', 'Caio is ___ than Vitor.', ['taller'], 'tall + er = taller.'),
      ],
    },
  },
  {
    id: 'f3-04',
    level: 3,
    theme: 'a montanha de gelo',
    content: {
      target: 'Posição do advérbio (always, never)',
      items: [
        scramble('We never work at night.', 'O advérbio (never) vem antes do verbo principal.'),
        scramble('The owl always sleeps in the tree.', 'Always fica entre o sujeito e o verbo.'),
        scramble('I sometimes play football on Sunday.', 'Sometimes vem antes do verbo play.'),
        scramble('She is always calm in the goal.', 'Com o verbo be, o advérbio vem depois: is always.'),
        scramble('They never lose at home.', 'Never antes do verbo: never lose.'),
        scramble('He usually eats bread at midnight.', 'Usually entre o sujeito (he) e o verbo (eats).'),
      ],
    },
  },
  {
    id: 'f3-05',
    level: 3,
    theme: 'o navio no porto',
    content: {
      target: 'Ordem com to + verbo (finalidade)',
      items: [
        scramble('I need a torch to light the cave.', 'Primeiro o que você precisa, depois to + verbo (para quê).'),
        scramble('We use a boat to cross the river.', 'Objeto primeiro, finalidade (to cross) no fim.'),
        scramble('Take a rope to climb the wall.', 'Pedido, depois to + verbo com a finalidade.'),
        scramble('She wants a net to catch fish.', 'Wants + objeto + to + verbo.'),
        scramble('Bring water to cook the soup.', 'Bring + o que + to + para quê.'),
        scramble('He runs every day to get faster.', 'A finalidade (to get faster) fecha a frase.'),
      ],
    },
  },
  {
    id: 'f3-06',
    level: 3,
    theme: 'o dia do torneio',
    content: {
      target: 'must + verbo',
      items: [
        gap('You ___ close every window before the storm.', ['must', 'have', 'are'], 'Obrigação: must + verbo sem to.'),
        gap('Winners must ___ the gym after the final.', ['clean', 'cleans', 'to clean'], 'Depois de must o verbo fica na forma base.'),
        typed("Escreva must ou mustn't", 'You ___ never touch the big pot.', ['must'], 'must never = nunca deve.'),
        typed('Escreva o verbo mark na forma certa depois de must', 'Caio must ___ Vitor all game.', ['mark'], 'Depois de must, verbo na forma base: mark.'),
        typed('Escreva o verbo bring na forma certa depois de must', 'Every team must ___ two balls.', ['bring'], 'must + bring (sem -s, sem to).'),
        typed('Escreva o verbo be na forma certa depois de must', 'We must ___ careful near the gold room.', ['be'], 'must + be: forma base do verbo ser/estar.'),
      ],
    },
  },
];

// ========================================
// Tabelas e escolha
// ========================================

export const OFFLINE_LETTERS: Record<OfflineLevel, OfflineLetter[]> = { 1: LETTERS_1, 2: LETTERS_2, 3: LETTERS_3 };
export const OFFLINE_NOTES: Record<OfflineLevel, OfflineNote[]> = { 1: NOTES_1, 2: NOTES_2, 3: NOTES_3 };
export const OFFLINE_FORGES: Record<OfflineLevel, OfflineForge[]> = { 1: FORGES_1, 2: FORGES_2, 3: FORGES_3 };

/**
 * Forma que englishAi.ts consome: OFFLINE_CONTRACTS[type][level] com entradas { id, content }
 * (ele extrai `content`, valida e evita repetir pela offlineKey dos últimos 14 dias).
 */
export const OFFLINE_CONTRACTS: {
  letter: Record<OfflineLevel, OfflineLetter[]>;
  note: Record<OfflineLevel, OfflineNote[]>;
  forge: Record<OfflineLevel, OfflineForge[]>;
} = { letter: OFFLINE_LETTERS, note: OFFLINE_NOTES, forge: OFFLINE_FORGES };

export function offlineListFor(type: 'letter', level: number): OfflineLetter[];
export function offlineListFor(type: 'note', level: number): OfflineNote[];
export function offlineListFor(type: 'forge', level: number): OfflineForge[];
export function offlineListFor(type: OfflineType, level: number): OfflineLetter[] | OfflineNote[] | OfflineForge[];
export function offlineListFor(type: OfflineType, level: number): OfflineLetter[] | OfflineNote[] | OfflineForge[] {
  const lv = levelFor(level).level;
  return OFFLINE_CONTRACTS[type][lv];
}

/**
 * Escolha determinística: mesma (type, level, seed, ids recentes) -> mesma entrada.
 * Evita os ids em recentlyUsedIds; se todos forem recentes, volta ao banco inteiro.
 */
export function pickOffline(type: 'letter', level: number, seed: number, recentlyUsedIds?: string[]): OfflineLetter;
export function pickOffline(type: 'note', level: number, seed: number, recentlyUsedIds?: string[]): OfflineNote;
export function pickOffline(type: 'forge', level: number, seed: number, recentlyUsedIds?: string[]): OfflineForge;
export function pickOffline(type: OfflineType, level: number, seed: number, recentlyUsedIds?: string[]): OfflineLetter | OfflineNote | OfflineForge;
export function pickOffline(type: OfflineType, level: number, seed: number, recentlyUsedIds: string[] = []): OfflineLetter | OfflineNote | OfflineForge {
  const list: (OfflineLetter | OfflineNote | OfflineForge)[] = offlineListFor(type, level);
  const recent = new Set(recentlyUsedIds);
  const fresh = list.filter((e) => !recent.has(e.id));
  const pool = fresh.length ? fresh : list;
  return pool[(seed >>> 0) % pool.length];
}
