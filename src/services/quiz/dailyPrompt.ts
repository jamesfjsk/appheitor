import type { QuizThemeSeed } from '../../config/quizCurriculum';
import { levelFor } from '../../config/englishLevels';
import { knowledgeAreasForWeekday } from './provaRules';
import { QUIZ_SPARE } from './quizTokens';
import type { QuizSlot } from './validateQuestion';

const LESSON_QUESTIONS = 3;

export interface BuildPromptInput {
  seed: QuizThemeSeed;
  count: number;
  spare?: number;
  age: number;
  weekday: number;
  englishLevel: number;
  avoidHashes?: string[];
  /** Quando a substituição pede posições vazias, o prompt deixa de numerar a prova cheia. */
  slots?: QuizSlot[];
}

export function buildPrompt(input: BuildPromptInput): string {
  if (input.slots && input.slots.length > 0) return buildReplacementPrompt(input);
  const spare = input.spare ?? QUIZ_SPARE;
  const asked = input.count + spare;
  const knowledge = Math.max(input.count - LESSON_QUESTIONS, 2);
  const areas = Array.from({ length: knowledge }, (_, i) => knowledgeAreasForWeekday(input.weekday)[i % 5]);
  const areaLines = areas.map((area, i) => `${i + 4}) ${areaRule(area)}`).join('\n');
  const lv = levelFor(input.englishLevel);
  const avoid = (input.avoidHashes ?? []).slice(0, 40);
  const avoidBlock = avoid.length
    ? `Não repita nem parafraseie estas provas (hash):\n- ${avoid.join('\n- ')}`
    : 'Primeira leva: capriche.';

  return `Você prepara a "prova do dia" de uma criança de ${input.age} anos, 5º ano do ensino fundamental (BNCC). Curiosa, gosta de futebol, lógica e ciências. Português do Brasil. Tom respeitoso, direto, sem infantilizar e sem lição de moral.

TEMA DO DIA: ${input.seed.title} (categoria: ${input.seed.category})
Orientação: ${input.seed.seed}

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
2) LIC.APLICA — a ideia do dia dentro de um caso concreto (escola, casa, uma partida), com uma só resposta certa. Proibido perguntar o que ele faria, o que ele acha, o que ele prefere, "como você pode aplicar" ou "como você pode usar". As 4 opções têm o mesmo tamanho (± 2 palavras) e nenhuma é caricata. Exemplo: "O gelo fica em cima" / "O gelo afunda no copo" / "O gelo some no ar" / "O gelo vira pedra".
3) LIC.DILEMA — um dilema: uma só atitude é justa; as outras três são omissão ou desculpa, não uma segunda forma de ajudar. Proibido "peço ajuda ao adulto", "deixo ele descobrir", "pesquiso depois" — isso vira duas certas. kind: "dilemma" (não "lesson"). skill: "LIC.DILEMA". subject: "tema". Não entra na nota nem no gold. A pergunta descreve a situação e termina com "Qual atitude é a mais justa?". Não escreva "o que você faz" nem "o que fazer". As 4 opções têm o mesmo tamanho (± 2 palavras) e nenhuma é caricata. Exemplo: "Chamo ele para entrar" / "Fico quieto no banco" / "Sigo jogando sem ele" / "Digo que o time fechou". A certa tem o mesmo número de palavras que pelo menos uma errada. A explicação mostra a consequência de cada uma.

As outras ${knowledge} são "knowledge", nesta ordem (gira pelo dia da semana). Numeração da prova:
${areaLines}

Pelo menos 3 perguntas da prova inteira exigem DUAS etapas (ler, juntar, concluir). Pelo menos 2 das de conhecimento usam formato diferente da pergunta direta: estimar um número, "o que aconteceria se", "ache o erro", "qual frase é verdadeira".

Nível por área:
- matemática: MAT.OP2 — problema de DUAS etapas com números até 1000, frações simples, porcentagem simples, tempo ou dinheiro. Nunca uma conta de um passo ("5 maçãs menos 2"). A conta precisa fechar em inteiro. Os números das duas etapas estão na pergunta: 500 g e 2 kg não fecham; escreva 500 g e 2000 g.
- ciências: CIE.CAUSA — causa e efeito ou "o que aconteceria se". Sem caricatura (célula azul, átomo verde).
- inglês: UMA pergunta, UMA regra do nível ${lv.level}. O enunciado traz a frase com a lacuna ("There ___ a dog in the park."), nunca "Which sentence is correct?". As 4 opções são palavras da regra (is, are, am, be), não a frase inteira repetida. Quando as opções são formas do mesmo verbo, a frase traz uma marca de tempo que só aceita uma forma (every day, always, now, right now, yesterday, last week, tomorrow, next week). audioText = a frase certa, no máximo ${lv.maxWords} palavras. why e trap em português. Nunca duas variantes válidas (proibido soccer/football, color/colour, mom/mum). Proibido was, were, because, -ing e don't dentro da frase em inglês.
- história e geografia: HIS.FATO ou GEO.FATO — fato de consenso. Proibido "mais avançado", "melhor", "principal", "famoso" sem consenso.
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
- a opção certa ser a única com mais palavras. Outra opção tem de ter o mesmo número de palavras que a certa;
- misturar rótulo de 1 palavra ("Escanteio") com frase de 3 ("Tiro de meta"): ou as 4 têm até 2 palavras, ou as 4 são frases;
- conta de um passo (90 dividido por 3, 7 vezes 2). A resposta não pode ser soma, diferença, produto ou quociente de dois números do enunciado;
- "como você pode aplicar", "o que você faria", "o que você acha", "o que você faz", "o que você deve fazer" (opinião; só o dilema LIC.DILEMA pergunta atitude);
- why, trap ou explanation em inglês. Os três são em português; inglês só entre aspas, com a regra nomeada em português.

Exigências:
- distratores nascem do erro típico de um aluno de 5º ano (conta invertida, unidade trocada, causa invertida);
- a explanation e o why dizem por que a alternativa mais tentadora está errada, não só por que a certa está certa;
- 4 alternativas, só 1 correta; sem numeração nas options.

${avoidBlock}

MODELO de forma (não copie o tema nem as abelhas). why e trap em português, 16 palavras ou mais. A certa não é a única mais longa:
{"question":"Uma abelha constrói 6 células por dia. Em 5 dias, quantas 4 abelhas constroem juntas?","options":["120","30","24","20"],"answer":"120","why":"A resposta certa é 120 porque primeiro 6 vezes 5 dá 30 de uma abelha e depois 30 vezes 4 fecha 120.","trap":"Quem marca 30 parou na primeira etapa: isso é o que uma abelha faz em 5 dias, não as quatro.","kind":"knowledge","subject":"matematica","skill":"MAT.OP2","bloom":"aplicar"}
MODELO de inglês (troque o bicho e o lugar; não use "Which sentence is correct?"). why e trap em português:
{"question":"There ___ a cat on the mat.","options":["is","are","am","be"],"answer":"is","audioText":"There is a cat on the mat.","why":"A resposta certa é is porque there is vale para um gato só, e are fica para quando são dois ou mais.","trap":"Quem marca are pensa em várias coisas e esquece que a frase fala de um gato só no tapete.","kind":"knowledge","subject":"ingles","skill":"ING.N1.BE","bloom":"aplicar"}

AUTO-REVISÃO (obrigatória, na mesma resposta): antes de devolver o JSON, conte os objetos de questions (tem que dar exatamente ${asked}) e releia CADA pergunta. Se alguma falhar (resposta no enunciado, duas certas, conta de um passo, capital, inglês com duas válidas, fato discutível, why ou trap com menos de 14 palavras, why sem palavra da resposta, opções de tamanhos diferentes, opinião), troque essa pergunta. Só então responda SOMENTE com o JSON.`;
}

const OPTION_SIZE =
  'As 4 opções têm o mesmo tamanho (± 2 palavras) e nenhuma é caricata. Exemplo: "Chamo ele para entrar" / "Fico quieto no banco" / "Sigo jogando sem ele" / "Digo que o time fechou". Só a primeira ajuda; as outras três são omissão ou desculpa.';

export function replacementBrief(slots: QuizSlot[]): string {
  const lines = slots.map((slot) => {
    const pos = slot.index + 1;
    if (slot.skill === 'LIC.APLICA' || slot.skill === 'LIC.DILEMA') {
      return `${pos}) posição ${pos}, kind ${slot.kind}, skill ${slot.skill}. ${OPTION_SIZE}`;
    }
    if (slot.scenario === 'futebol') {
      return `${pos}) posição ${pos}, kind knowledge, cenário de futebol. Escreva com outras palavras se a lista de evitar já fala de gols ou de caixa. Proibido "qual é a função" e "o que acontece se". O trap tem mais de 16 palavras:
{"question":"Cada vitória vale 3 pontos e cada empate vale 1. O time venceu 4 e empatou 2. Quantos pontos fez?","options":["14","12","7","6"],"answer":"14","why":"A resposta certa é 14 porque primeiro 3 vezes 4 dá 12 e depois 12 mais 2 fecha 14.","trap":"Quem marca 12 contou só as vitórias e esqueceu os 2 pontos dos empates no fim da tabela.","kind":"knowledge","subject":"matematica","skill":"MAT.OP2","scenario":"futebol","bloom":"aplicar"}`;
    }
    if (slot.skill === 'MAT.OP2') {
      return `${pos}) posição ${pos}, kind knowledge, skill MAT.OP2, subject matematica. Escolha o molde que não parecer com a lista de evitar e troque as palavras, não só os números. O trap tem mais de 16 palavras.
A) {"question":"Heitor junta 5 figurinhas por semana. Em 3 semanas ele deu 4 para o primo. Quantas ficaram?","options":["11","15","12","9"],"answer":"11","why":"A resposta certa é 11 porque primeiro 5 vezes 3 dá 15 e depois 15 menos 4 fecha 11.","trap":"Quem marca 15 parou no total das três semanas e esqueceu de tirar as 4 figurinhas dadas ao primo.","kind":"knowledge","subject":"matematica","skill":"MAT.OP2","bloom":"aplicar"}
B) {"question":"O treino tem 8 minutos de aquecimento. Depois são 5 blocos de 6 minutos. Quantos minutos no total?","options":["38","30","40","48"],"answer":"38","why":"A resposta certa é 38 porque primeiro 5 vezes 6 dá 30 e depois 30 mais 8 fecha 38.","trap":"Quem marca 30 parou nos blocos e esqueceu de somar os 8 minutos de aquecimento no começo do treino.","kind":"knowledge","subject":"matematica","skill":"MAT.OP2","bloom":"aplicar"}`;
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

Devolva JSON {"questions":[ exatamente ${slots.length} objetos ]}, na ordem das posições pedidas. Não numere uma prova nova.

why, trap e explanation: em português do Brasil; inglês só nas palavras ou frase entre aspas; nomeie a regra em português com um exemplo. Ex.: Depois de 'yesterday' o verbo vai para o passado: 'defended'. 'Defends' é o presente, de todo dia.
Quando as opções são formas do mesmo verbo, a frase traz uma marca de tempo (every day, always, now, right now, yesterday, last week, tomorrow, next week).
LIC.APLICA e LIC.DILEMA: ${OPTION_SIZE} O dilema usa kind "dilemma", skill "LIC.DILEMA", subject "tema", e a pergunta termina em "Qual atitude é a mais justa?".
Cenário de futebol ensina outra área. skill é MAT.OP2 ou CIE.CAUSA (código, não o nome da matéria). subject não é futebol. scenario: "futebol".
Nível de inglês ${lv.level}: teto ${lv.maxWords} palavras. why e trap com 16 palavras ou mais. subject é obrigatório. O trap começa com "Quem marca" e repete uma opção errada.

MODELO de dilema (copie a forma, troque a história):
{"question":"O amigo ficou de fora da pelada. Qual atitude é a mais justa?","options":["Chamo ele para entrar","Fico quieto no banco","Sigo jogando sem ele","Digo que o time fechou"],"answer":"Chamo ele para entrar","why":"A resposta certa é Chamo ele para entrar porque ele volta para o jogo com o grupo e as outras atitudes deixam o amigo de fora.","trap":"Quem marca Fico quieto no banco evita a briga e esquece que o amigo continua de fora da pelada.","kind":"dilemma","subject":"tema","skill":"LIC.DILEMA","bloom":"analisar"}

${replacementBrief(slots)}

Responda SOMENTE com o JSON.`;
}

function areaRule(area: string): string {
  if (area === 'matemática') return 'matemática — MAT.OP2, duas etapas, números até 1000, fração, porcentagem, tempo ou dinheiro';
  if (area === 'ciências') return 'ciências — causa e efeito ou "o que aconteceria se" (CIE.CAUSA)';
  if (area === 'inglês') return 'inglês — uma só forma correta, mesma regra do nível em três frases';
  if (area === 'história ou geografia') return 'história ou geografia — HIS.FATO ou GEO.FATO, fato de consenso';
  return 'cenário de futebol — a partida é o cenário; ensina matemática, ciências, inglês ou história; scenario "futebol"; subject não é futebol';
}
