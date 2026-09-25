import type { QuizThemeSeed } from '../../config/quizCurriculum';
import { levelFor } from '../../config/englishLevels';
import { knowledgeAreasForWeekday } from './provaRules';
import { QUIZ_SPARE } from './quizTokens';
import type { QuizSlot } from './validateQuestion';

/** Dias desde 1970-01-01. Dois dias seguidos diferem em 1. */
export function dayNumber(date: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return 0;
  return Math.floor(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86400000);
}

const MATH_MOLDS = [
  {
    id: 'M1',
    question: 'Lucas comprou 3 cadernos de 12 reais e pagou com uma nota de 50 reais. Quanto recebeu de troco?',
    options: ['14 reais', '36 reais', '38 reais', '26 reais'],
    answer: '14 reais',
    why: 'O troco é 14 reais porque primeiro 3 vezes 12 dá 36 reais de cadernos e depois 50 menos 36 fecha 14.',
    trap: 'Quem marca 36 reais parou no preço dos cadernos e esqueceu que a pergunta é quanto volta da nota de 50.',
  },
  {
    id: 'M2',
    question: 'Dos 30 alunos da turma, 2/5 jogam futebol e o resto joga vôlei. Quantos jogam vôlei?',
    options: ['18', '12', '15', '6'],
    answer: '18',
    why: 'São 18 no vôlei porque 2/5 de 30 dá 12 no futebol, e os outros 30 menos 12 fecham 18.',
    trap: 'Quem marca 12 achou quantos jogam futebol e parou ali, sem tirar esse grupo do total de 30 alunos.',
  },
  {
    id: 'M3',
    question: 'O treino começou às 14h40 e durou 1h35. A que horas terminou?',
    options: ['16h15', '15h75', '15h15', '17h15'],
    answer: '16h15',
    why: 'Terminou às 16h15 porque 14h40 mais 1 hora dá 15h40, e mais 35 minutos passa das 16h e fecha 16h15.',
    trap: 'Quem marca 15h75 somou 40 mais 35 minutos e esqueceu que 60 minutos já viram mais uma hora no relógio.',
  },
  {
    id: 'M4',
    question: 'Cada van leva 9 alunos. A escola vai levar 58 alunos ao museu. Quantas vans são necessárias?',
    options: ['7', '6', '4', '8'],
    answer: '7',
    why: 'São 7 vans porque 58 dividido por 9 dá 6 vans cheias e sobram 4 alunos, que precisam de mais uma van.',
    trap: 'Quem marca 6 fez a divisão certa e esqueceu dos 4 alunos que sobraram, que não podem ficar na escola.',
  },
  {
    id: 'M5',
    question: 'Um tênis custa 80 reais e está com 25% de desconto. Quanto ele custa com o desconto?',
    options: ['60 reais', '20 reais', '55 reais', '100 reais'],
    answer: '60 reais',
    why: 'Custa 60 reais porque 25% de 80 é a quarta parte, 20 reais, e depois 80 menos 20 fecha 60.',
    trap: 'Quem marca 55 reais tirou 25 reais do preço, mas 25% de 80 é a quarta parte, que dá só 20.',
  },
  {
    id: 'M6',
    question: 'Na feira, 3 mangas custam 12 reais e 5 mangas custam 15 reais. Quanto se economiza em cada manga na oferta mais barata?',
    options: ['1 real', '3 reais', '4 reais', '2 reais'],
    answer: '1 real',
    why: 'Economiza 1 real porque 12 dividido por 3 dá 4 reais cada, 15 dividido por 5 dá 3, e 4 menos 3 fecha 1.',
    trap: 'Quem marca 3 reais comparou os preços totais, 15 menos 12, e esqueceu que as ofertas têm quantidades diferentes.',
  },
  {
    id: 'M7',
    question: 'Um campinho retangular tem 100 metros de perímetro. Um dos lados mede 30 metros. Quanto mede o outro lado?',
    options: ['20 metros', '70 metros', '40 metros', '50 metros'],
    answer: '20 metros',
    why: 'O outro lado mede 20 metros porque os dois lados de 30 somam 60, sobram 40 do perímetro, e 40 dividido por 2 fecha 20.',
    trap: 'Quem marca 70 metros tirou só um lado de 30 do perímetro e esqueceu que o retângulo tem dois lados iguais a ele.',
  },
];

const SCIENCE_MOLDS = [
  'C1. O mecanismo. Por que algo acontece. A certa é o mecanismo; as erradas são explicações que uma criança daria ("porque é mais leve", "porque é frio").',
  'C2. O que aconteceria se. Uma mudança e duas consequências em cadeia. A certa é a segunda consequência; uma errada é a primeira.',
  'C3. Qual teste mostra. Dois casos que só mudam numa coisa. A certa é o teste justo; as erradas mudam duas coisas ao mesmo tempo.',
  'C4. Ache o erro. Um colega explica algo com um erro. A certa aponta o erro.',
  'C5. O que vem primeiro. Uma sequência (a água que evapora, a semente que germina). A certa é a ordem.',
];

const HISTORY_MOLDS = [
  'H1. Por que aconteceu. A causa de um fato.',
  'H2. O que mudou depois. A consequência de um fato.',
  'H3. Antes e hoje. Como se fazia antes e o que mudou.',
  'H4. Por que ali. Por que as pessoas se fixaram num lugar (rio, porto, minério, clima).',
  'H5. Dois lugares. Por que um lugar é diferente do outro (chuva, frio, cidade grande).',
];

const ENGLISH_MOLDS = [
  'I1. to be com I: "I ___ ten years old." (am · is · are · be) → am',
  'I2. to be no plural: "My brothers ___ at school now." (are · is · am · be) → are',
  'I3. there are: "There ___ three balls under the bed." (are · is · am · be) → are',
  'I4. pergunta com do you: "___ you like pizza?" (Do · Are · Is · Am) → Do',
  'I5. has: "Pedro ___ a new red bike." (has · have · is · are) → has',
  'I6. have com we: "We ___ a big dog." (have · has · are · is) → have',
  'I7. there is: "There ___ a ball on the grass." (is · are · am · be) → is',
];

export const HISTORY_LINE =
  'A resposta é uma causa ou uma consequência que se explica, não um nome ou uma data para decorar. Nunca "Qual fato é verdadeiro" nem "Qual frase é verdadeira".';

export const DILEMMA_RULE =
  'O dilema usa a ideia do dia numa situação da vida dele (escola, casa, pelada). As 4 opções são atitudes em primeira pessoa, do mesmo tamanho. Cada errada tem uma vantagem de verdade, por isso tenta, e cobra um preço depois; no máximo uma é ficar parado. A melhor cuida dos dois lados. O why começa pelo que a melhor atitude resolve, com as palavras da situação, e nunca diz "a resposta certa"; o trap diz o preço de uma das outras.';

const DISTRACTOR_LINE =
  'Cada distrator é o que um aluno de 5º ano marcaria pensando pela metade: a primeira etapa da conta, a causa invertida, a regra da frase vizinha. Proibido distrator que se descarta sem saber a matéria: explode, flutua, fica invisível, some, vira pedra, cor e tamanho.';

function mathJson(index: number): string {
  const mold = MATH_MOLDS[index];
  return JSON.stringify({
    question: mold.question,
    options: mold.options,
    answer: mold.answer,
    why: mold.why,
    trap: mold.trap,
    kind: 'knowledge',
    subject: 'matematica',
    skill: 'MAT.OP2',
    bloom: 'aplicar',
  });
}

/** Um molde do dia. Dois dias seguidos não repetem a mesma área. */
export function moldOfDay(area: string, date: string, englishLevel = 1): string {
  const n = dayNumber(date);
  if (area === 'matemática') return mathJson(n % MATH_MOLDS.length);
  if (area === 'ciências') return SCIENCE_MOLDS[n % SCIENCE_MOLDS.length];
  if (area === 'história ou geografia') return HISTORY_MOLDS[n % HISTORY_MOLDS.length];
  if (area === 'inglês') {
    if (englishLevel <= 1) return ENGLISH_MOLDS[n % ENGLISH_MOLDS.length];
    const allowed = levelFor(englishLevel).promptAllowed;
    return allowed[n % allowed.length] ?? '';
  }
  return '';
}

const LESSON_QUESTIONS = 3;

export interface BuildPromptInput {
  seed: QuizThemeSeed;
  count: number;
  spare?: number;
  age: number;
  weekday: number;
  englishLevel: number;
  avoidHashes?: string[];
  /** Ângulo do dia (§8.2). Entra no texto do prompt. */
  angle?: string;
  /** 1 primeiro contato, 2 aprofunda, 3 conecta com outra área. */
  depth?: 1 | 2 | 3;
  /** Quando a substituição pede posições vazias, o prompt deixa de numerar a prova cheia. */
  slots?: QuizSlot[];
  /** Linha do desafio quando ele acerta rápido. Vazia se não houver dados. */
  challenge?: string;
  /** Data da prova. Escolhe o molde do dia. */
  date?: string;
}

const DEPTH_LINE: Record<1 | 2 | 3, string> = {
  1: 'primeiro contato',
  2: 'aprofunde',
  3: 'conecte com outra área',
};

function angleBlock(input: BuildPromptInput): string {
  if (!input.angle || !input.depth) return '';
  return `Ângulo de hoje: ${input.angle}
Profundidade ${input.depth}: ${DEPTH_LINE[input.depth]}
`;
}

export function buildPrompt(input: BuildPromptInput): string {
  if (input.slots && input.slots.length > 0) return buildReplacementPrompt(input);
  const spare = input.spare ?? QUIZ_SPARE;
  const asked = input.count + spare;
  const knowledge = Math.max(input.count - LESSON_QUESTIONS, 2);
  const areas = Array.from({ length: knowledge }, (_, i) => knowledgeAreasForWeekday(input.weekday)[i % 5]);
  const date = input.date ?? '';
  const areaLines = areas.map((area, i) => `${i + 4}) ${areaRule(area, date, input.englishLevel)}`).join('\n');
  const lv = levelFor(input.englishLevel);
  const avoid = (input.avoidHashes ?? []).slice(0, 60);
  const avoidBlock = avoid.length
    ? `Não repita nem parafraseie estas provas (hash):\n- ${avoid.join('\n- ')}`
    : 'Primeira leva: capriche.';

  return `Você prepara a "prova do dia" de uma criança de ${input.age} anos, 5º ano do ensino fundamental (BNCC). Curiosa, gosta de futebol, lógica e ciências. Português do Brasil. Tom respeitoso, direto, sem infantilizar e sem lição de moral.

TEMA DO DIA: ${input.seed.title} (categoria: ${input.seed.category})
Orientação: ${input.seed.seed}
${angleBlock(input)}
Monte um JSON com exatamente esta forma:
{
  "theme": {
    "title": "título curto e atraente",
    "lesson": "a ideia do dia em 90 a 130 palavras: comece com uma situação concreta ou história curta, depois explique a ideia e termine com como usar isso hoje",
    "whyItMatters": "uma frase sobre por que isso importa na vida dele",
    "curiosity": "1 ou 2 frases surpreendentes sobre o tema, fato verdadeiro, sem spoiler das respostas"
  },
  "questions": [ exatamente ${asked} objetos ]
  "reflectionPrompt": "uma pergunta aberta e pessoal sobre o tema, para ele responder com as próprias palavras em 1 ou 2 frases"
}

O array questions tem exatamente ${asked} perguntas, nem mais nem menos. ${input.count} valem e ${spare} são folga.

Cada pergunta: {"question":"...","options":["...","...","...","..."],"answer":"igual a uma das options","explanation":"1 a 2 frases em português","why":"16+ palavras em português, contém a resposta e o porquê","trap":"16+ palavras em português, nomeia o distrator tentador e por que ele engana","kind":"lesson, dilemma ou knowledge","subject":"tema|matematica|ciencias|ingles|historia|geografia","skill":"código","bloom":"entender|aplicar|analisar","scenario":"futebol só quando a partida é o cenário","audioText":"frase EN só se subject for ingles"}.

why, trap e explanation: em português do Brasil; inglês só nas palavras ou frase entre aspas; nomeie a regra em português com um exemplo. Ex.: Depois de 'yesterday' o verbo vai para o passado: 'defended'. 'Defends' é o presente, de todo dia.

As ${LESSON_QUESTIONS} primeiras são "lesson", sobre a ideia do dia:
1) LIC.IDEIA — compreensão da ideia. Não comece com "O que é", "Qual é a função", "Qual é o nome" nem "Para que serve".
2) LIC.APLICA — a ideia do dia dentro de um caso concreto (escola, casa, uma partida), com uma só resposta certa. Proibido perguntar o que ele faria, o que ele acha, o que ele prefere, "como você pode aplicar" ou "como você pode usar". As 4 opções têm o mesmo tamanho (± 2 palavras) e nenhuma é caricata. Exemplo: "O gelo boia porque é menos denso" / "O gelo boia porque é mais frio" / "O gelo boia porque tem ar dentro" / "O gelo boia porque é pequeno".
3) LIC.DILEMA — um dilema. ${DILEMMA_RULE} kind: "dilemma" (não "lesson"). skill: "LIC.DILEMA". subject: "tema". Não entra na nota nem no gold. A pergunta descreve a situação e termina com "Qual atitude é a mais justa?". Não escreva "o que você faz" nem "o que fazer". ${OPTION_SIZE}

As outras ${knowledge} são "knowledge", nesta ordem (gira pelo dia da semana). Numeração da prova:
${areaLines}
${input.challenge ? `\n${input.challenge}\n` : ''}
Pelo menos 3 perguntas da prova inteira exigem DUAS etapas (ler, juntar, concluir). Pelo menos 2 das de conhecimento usam formato diferente da pergunta direta: estimar um número, "o que aconteceria se", "ache o erro".

Nível por área:
- matemática: MAT.OP2 — problema de DUAS etapas com números até 1000, frações simples, porcentagem simples, tempo ou dinheiro. Nunca uma conta de um passo ("5 maçãs menos 2"). A conta precisa fechar em inteiro. Os números das duas etapas estão na pergunta: 500 g e 2 kg não fecham; escreva 500 g e 2000 g.
- ciências: CIE.CAUSA — o mecanismo, não o efeito óbvio. Sem caricatura (célula azul, átomo verde).
- inglês: UMA pergunta, UMA regra do nível ${lv.level}. Use as quatro opções do molde. Nada de passado (had, was, were, did). O enunciado traz a frase com a lacuna ("There ___ a dog in the park."), nunca "Which sentence is correct?". As 4 opções são palavras da regra (is, are, am, be), não a frase inteira repetida. Quando as opções são formas do mesmo verbo, a frase traz uma marca de tempo que só aceita uma forma (every day, always, now, right now, yesterday, last week, tomorrow, next week). audioText = a frase certa, no máximo ${lv.maxWords} palavras. why e trap em português. Nunca duas variantes válidas (proibido soccer/football, color/colour, mom/mum). Proibido was, were, because, -ing e don't dentro da frase em inglês.
- história e geografia: HIS.FATO ou GEO.FATO — ${HISTORY_LINE} Proibido "mais avançado", "melhor", "principal", "famoso" sem consenso.
- cenário de futebol: a partida é o cenário, não a matéria. A pergunta ensina outra área — MAT.OP2 (gols, minutos, pontos na tabela, duas etapas), CIE.CAUSA (curva da bola, gramado molhado, fôlego), leitura de tabela, inglês no nível (frase da partida) ou a decisão do capitão no dilema. subject é o da área ensinada. scenario: "futebol". Proibido regra ("o que acontece se sair do campo", "quantos jogadores"), história, definição, "qual é a função", "quem é o melhor/mais famoso".

Nível de inglês ${lv.level} (${lv.label}):
Pode: ${lv.promptAllowed.join('; ')}.
Não pode: ${lv.promptForbidden.join('; ')}.
Teto: ${lv.maxWords} palavras na frase EN (audioText).

Proibido (a pergunta inteira é jogada fora se falhar um item):
- a resposta aparecer no enunciado (ex.: "qual o nome da técnica de driblar" quando a resposta é drible);
- alternativas sinônimas ou duas certas;
- pergunta que se responde sem ler a ideia do dia;
- "qual a capital de";
- why ou trap com menos de 16 palavras. Conte. "Marcar 50 erra porque é outro número" tem 8 e morre. Copie o tamanho do MODELO;
- why sem uma palavra de 4 letras da resposta, ou sem o número dela;
- trap que não repete o texto de uma opção errada;
- a opção certa ser a única com mais palavras. Outra opção tem de ter o mesmo número de palavras que a certa. Nas de explicação (ideia, ciências, história, dilema), escreva a certa primeiro e as três erradas com o mesmo número de palavras dela. Conte.
- misturar rótulo de 1 palavra ("Escanteio") com frase de 3 ("Tiro de meta"): ou as 4 têm até 2 palavras, ou as 4 são frases;
- conta de um passo (90 dividido por 3, 7 vezes 2). A resposta não pode ser soma, diferença, produto ou quociente de dois números do enunciado;
- "como você pode aplicar", "o que você faria", "o que você acha", "o que você faz", "o que você deve fazer" (opinião; só o dilema LIC.DILEMA pergunta atitude);
- why, trap ou explanation em inglês. Os três são em português; inglês só entre aspas, com a regra nomeada em português.

Exigências:
- ${DISTRACTOR_LINE}
- a explanation e o why dizem por que a alternativa mais tentadora está errada, não só por que a certa está certa;
- 4 alternativas, só 1 correta; sem numeração nas options.

${avoidBlock}

MODELO de forma. A conta de hoje segue este molde, com outra história e outros números. why e trap em português, 16 palavras ou mais. A certa não é a única mais longa:
${moldOfDay('matemática', date)}

AUTO-REVISÃO (obrigatória, na mesma resposta): antes de devolver o JSON, conte os objetos de questions (tem que dar exatamente ${asked}) e releia CADA pergunta. Se alguma falhar (resposta no enunciado, duas certas, conta de um passo, capital, inglês com duas válidas, fato discutível, why ou trap com menos de 14 palavras, why sem palavra da resposta, opções de tamanhos diferentes, opinião), troque essa pergunta. Só então responda SOMENTE com o JSON.`;
}

const OPTION_SIZE = 'As 4 opções têm o mesmo tamanho (± 2 palavras) e nenhuma é caricata.';

export function replacementBrief(slots: QuizSlot[], date = '', englishLevel = 1): string {
  const lines = slots.map((slot) => {
    const pos = slot.index + 1;
    if (slot.skill === 'LIC.DILEMA') {
      return `${pos}) posição ${pos}, kind ${slot.kind}, skill ${slot.skill}. ${DILEMMA_RULE} ${OPTION_SIZE}`;
    }
    if (slot.skill === 'LIC.APLICA') {
      return `${pos}) posição ${pos}, kind ${slot.kind}, skill ${slot.skill}. ${OPTION_SIZE}`;
    }
    if (slot.scenario === 'futebol') {
      return `${pos}) posição ${pos}, kind knowledge, cenário de futebol. Escreva com outras palavras se a lista de evitar já fala de gols ou de caixa. Proibido "qual é a função" e "o que acontece se". O trap tem mais de 16 palavras:
{"question":"Cada vitória vale 3 pontos e cada empate vale 1. O time venceu 4 e empatou 2. Quantos pontos fez?","options":["14","12","7","6"],"answer":"14","why":"A resposta certa é 14 porque primeiro 3 vezes 4 dá 12 e depois 12 mais 2 fecha 14.","trap":"Quem marca 12 contou só as vitórias e esqueceu os 2 pontos dos empates no fim da tabela.","kind":"knowledge","subject":"matematica","skill":"MAT.OP2","scenario":"futebol","bloom":"aplicar"}`;
    }
    if (slot.skill === 'MAT.OP2') {
      return `${pos}) posição ${pos}, kind knowledge, skill MAT.OP2, subject matematica. A conta de hoje segue este molde, com outra história e outros números. O trap tem mais de 16 palavras.
${moldOfDay('matemática', date)}`;
    }
    if (slot.skill.startsWith('ING.')) {
      return `${pos}) posição ${pos}, kind knowledge, skill ${slot.skill}. ${areaRule('inglês', date, englishLevel)}`;
    }
    if (slot.skill === 'HIS.FATO' || slot.skill === 'GEO.FATO') {
      return `${pos}) posição ${pos}, kind knowledge, skill ${slot.skill}. ${areaRule('história ou geografia', date, englishLevel)}`;
    }
    return `${pos}) posição ${pos}, kind ${slot.kind}, skill ${slot.skill}, área: ${slot.area}.`;
  });
  return `Devolva JSON {"questions":[ exatamente ${slots.length} objetos ]}, um objeto para cada posição abaixo, nesta ordem. Cada objeto ocupa essa posição, com o mesmo kind e o mesmo skill.\n${lines.join('\n')}`;
}

function buildReplacementPrompt(input: BuildPromptInput): string {
  const slots = input.slots ?? [];
  const lv = levelFor(input.englishLevel);
  return `Você completa buracos da prova do dia de uma criança de ${input.age} anos, 5º ano do ensino fundamental (BNCC). Português do Brasil.

TEMA DO DIA: ${input.seed.title} (categoria: ${input.seed.category})
Orientação: ${input.seed.seed}
${angleBlock(input)}
Devolva JSON {"questions":[ exatamente ${slots.length} objetos ]}, na ordem das posições pedidas. Não numere uma prova nova.

why, trap e explanation: em português do Brasil; inglês só nas palavras ou frase entre aspas; nomeie a regra em português com um exemplo. Ex.: Depois de 'yesterday' o verbo vai para o passado: 'defended'. 'Defends' é o presente, de todo dia.
Quando as opções são formas do mesmo verbo, a frase traz uma marca de tempo (every day, always, now, right now, yesterday, last week, tomorrow, next week). Use as quatro opções do molde. Nada de passado (had, was, were, did).
LIC.APLICA: ${OPTION_SIZE} LIC.DILEMA: ${DILEMMA_RULE} O dilema usa kind "dilemma", skill "LIC.DILEMA", subject "tema", e a pergunta termina em "Qual atitude é a mais justa?".
Cenário de futebol ensina outra área. skill é MAT.OP2 ou CIE.CAUSA (código, não o nome da matéria). subject não é futebol. scenario: "futebol".
Nível de inglês ${lv.level}: teto ${lv.maxWords} palavras. why e trap com 16 palavras ou mais. subject é obrigatório. O trap começa com "Quem marca" e repete uma opção errada.

MODELO de dilema (copie a forma, troque a história):
{"question":"Você prometeu ajudar seu irmão no dever às 17h, e os amigos chamaram para um jogo às 17h. Qual atitude é a mais justa?","options":["Aviso os amigos e ajudo meu irmão","Jogo agora e ajudo meu irmão depois","Ajudo meu irmão bem rápido","Peço para minha mãe ajudar ele"],"answer":"Aviso os amigos e ajudo meu irmão","why":"Quem avisa os amigos cumpre a promessa ao irmão e combina o jogo sem deixar ninguém esperando.","trap":"Quem marca Jogo agora e ajudo meu irmão depois atende a vontade de jogar, mas o irmão fica esperando e a promessa atrasa.","kind":"dilemma","subject":"tema","skill":"LIC.DILEMA","bloom":"analisar"}

${replacementBrief(slots, input.date ?? '', input.englishLevel)}

Responda SOMENTE com o JSON.`;
}

function areaRule(area: string, date: string, englishLevel: number): string {
  const mold = moldOfDay(area, date, englishLevel);
  if (area === 'matemática') return `matemática — MAT.OP2, duas etapas, números até 1000, fração, porcentagem, tempo ou dinheiro. Molde de hoje: ${mold}`;
  if (area === 'ciências') return `ciências — o mecanismo, não o efeito óbvio (CIE.CAUSA). Molde de hoje: ${mold}`;
  if (area === 'inglês') return `inglês — uma só forma correta, a regra do dia. Molde de hoje: ${mold} Use as quatro opções do molde. Nada de passado (had, was, were, did).`;
  if (area === 'história ou geografia') return `história ou geografia — HIS.FATO ou GEO.FATO. ${HISTORY_LINE} Molde de hoje: ${mold}`;
  return 'cenário de futebol — a partida é o cenário; ensina matemática, ciências, inglês ou história; scenario "futebol"; subject não é futebol';
}
