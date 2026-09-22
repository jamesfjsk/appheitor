import type { QuizThemeSeed } from '../../config/quizCurriculum';
import { levelFor } from '../../config/englishLevels';
import { knowledgeAreasForWeekday } from './provaRules';
import { QUIZ_SPARE } from './quizTokens';

const LESSON_QUESTIONS = 3;

export interface BuildPromptInput {
  seed: QuizThemeSeed;
  count: number;
  spare?: number;
  age: number;
  weekday: number;
  englishLevel: number;
  avoidHashes?: string[];
}

export function buildPrompt(input: BuildPromptInput): string {
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

Cada pergunta: {"question":"...","options":["...","...","...","..."],"answer":"igual a uma das options","explanation":"1 a 2 frases","why":"12+ palavras, contém a resposta e o porquê","trap":"12+ palavras, nomeia o distrator tentador e por que ele engana","kind":"lesson, dilemma ou knowledge","subject":"tema|matematica|ciencias|ingles|historia|geografia|futebol","skill":"código","bloom":"entender|aplicar|analisar","audioText":"frase EN só se subject for ingles"}.

As ${LESSON_QUESTIONS} primeiras são "lesson", sobre a ideia do dia:
1) LIC.IDEIA — compreensão da ideia;
2) LIC.APLICA — a ideia do dia dentro de um caso concreto (escola, futebol, casa), com uma só resposta certa. Proibido perguntar o que ele faria, o que ele acha, o que ele prefere ou "como você pode aplicar".
3) LIC.DILEMA — um dilema: uma alternativa é a atitude mais sábia; as outras são tentadoras, mas piores. kind: "dilemma" (não "lesson"). Não entra na nota nem no gold. As 4 opções são atitudes reais de um menino de 10 anos, nenhuma caricata. A explicação mostra a consequência de cada uma.

As outras ${knowledge} são "knowledge", nesta ordem (gira pelo dia da semana). Numeração da prova:
${areaLines}

Pelo menos 3 perguntas da prova inteira exigem DUAS etapas (ler, juntar, concluir). Pelo menos 2 das de conhecimento usam formato diferente da pergunta direta: estimar um número, "o que aconteceria se", "ache o erro", "qual frase é verdadeira".

Nível por área:
- matemática: MAT.OP2 — problema de DUAS etapas com números até 1000, frações simples, porcentagem simples, tempo ou dinheiro. Nunca uma conta de um passo ("5 maçãs menos 2"). A conta precisa fechar em inteiro.
- ciências: CIE.CAUSA — causa e efeito ou "o que aconteceria se". Sem caricatura (célula azul, átomo verde).
- inglês: UMA pergunta, UMA regra do nível ${lv.level}. O enunciado traz a frase com a lacuna ("There ___ a dog in the park."), nunca "Which sentence is correct?". As 4 opções são palavras da regra (is, are, am, be), não a frase inteira repetida. audioText = a frase certa, no máximo ${lv.maxWords} palavras. why e trap em português. Nunca duas variantes válidas (proibido soccer/football, color/colour, mom/mum). Proibido was, were, because, -ing e don't dentro da frase em inglês.
- história e geografia: HIS.FATO ou GEO.FATO — fato de consenso. Proibido "mais avançado", "melhor", "principal", "famoso" sem consenso.
- futebol: FUT.REGRA — regra, tática ou história. Nunca definição ("o que é um gol?").

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
- why ou trap em inglês. Os dois são sempre em português.

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

function areaRule(area: string): string {
  if (area === 'matemática') return 'matemática — MAT.OP2, duas etapas, números até 1000, fração, porcentagem, tempo ou dinheiro';
  if (area === 'ciências') return 'ciências — causa e efeito ou "o que aconteceria se" (CIE.CAUSA)';
  if (area === 'inglês') return 'inglês — uma só forma correta, mesma regra do nível em três frases';
  if (area === 'história ou geografia') return 'história ou geografia — HIS.FATO ou GEO.FATO, fato de consenso';
  return 'futebol — FUT.REGRA, regra, tática ou história, nunca definição';
}
