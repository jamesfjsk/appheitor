import type { QuizThemeSeed } from '../../config/quizCurriculum';
import { knowledgeAreasForWeekday } from './provaRules';

const LESSON_QUESTIONS = 3;

export function buildPrompt(seed: QuizThemeSeed, count: number, age: number, weekday: number): string {
  const knowledge = Math.max(count - LESSON_QUESTIONS, 2);
  const areas = Array.from({ length: knowledge }, (_, i) => knowledgeAreasForWeekday(weekday)[i % 5]);
  const areaLines = areas.map((area, i) => `${i + 1}) ${areaRule(area)}`).join('\n');
  return `Você prepara a "prova do dia" de uma criança de ${age} anos, 5º ano do ensino fundamental (BNCC). Curiosa, gosta de futebol, lógica e ciências. Português do Brasil. Tom respeitoso, direto, sem infantilizar e sem lição de moral.

TEMA DO DIA: ${seed.title} (categoria: ${seed.category})
Orientação: ${seed.seed}

Monte um JSON com exatamente esta forma:
{
  "theme": {
    "title": "título curto e atraente",
    "lesson": "a ideia do dia em 90 a 130 palavras: comece com uma situação concreta ou história curta, depois explique a ideia e termine com como usar isso hoje",
    "whyItMatters": "uma frase sobre por que isso importa na vida dele",
    "curiosity": "1 ou 2 frases surpreendentes sobre o tema, fato verdadeiro, sem spoiler das respostas"
  },
  "questions": [ ${count} perguntas ],
  "reflectionPrompt": "uma pergunta aberta e pessoal sobre o tema, para ele responder com as próprias palavras em 1 ou 2 frases"
}

Cada pergunta: {"question": "...", "options": ["...","...","...","..."], "answer": "igual a uma das options", "explanation": "1 a 2 frases", "kind": "lesson" ou "knowledge", "subject": "área"}.

As ${LESSON_QUESTIONS} primeiras são "lesson", sobre a ideia do dia:
1. compreensão da ideia;
2. aplicação numa situação real (escola, futebol, família, amigos);
3. um dilema: uma alternativa é a atitude mais sábia; as outras são tentadoras, mas piores.

As outras ${knowledge} são "knowledge", nesta ordem (gira pelo dia da semana):
${areaLines}

Pelo menos 3 perguntas da prova inteira exigem DUAS etapas (ler, juntar, concluir). Pelo menos 2 das de conhecimento usam formato diferente da pergunta direta: estimar um número, "o que aconteceria se", "ache o erro", "qual frase é verdadeira".

Nível por área:
- matemática: problema de DUAS etapas com números até 1000, frações simples, porcentagem simples, tempo ou dinheiro. Nunca uma conta de um passo ("5 maçãs menos 2").
- ciências: causa e efeito ou "o que aconteceria se".
- inglês: frase em contexto com UMA só alternativa gramaticalmente correta. Nunca duas variantes válidas (proibido soccer/football, color/colour, mom/mum).
- história e geografia: fato de consenso. Proibido "mais avançado", "melhor", "principal" sem consenso.
- futebol: regra, tática ou história. Nunca definição ("o que é um gol?").

Proibido:
- a resposta aparecer no enunciado (ex.: "qual o nome da técnica de driblar" quando a resposta é drible);
- alternativas sinônimas ou duas certas;
- pergunta que se responde sem ler a ideia do dia;
- "qual a capital de".

Exigências:
- distratores nascem do erro típico de um aluno de 5º ano (conta invertida, unidade trocada, causa invertida);
- a explanation diz por que a alternativa mais tentadora está errada, não só por que a certa está certa;
- 4 alternativas, só 1 correta; sem numeração.

AUTO-REVISÃO (obrigatória, na mesma resposta): antes de devolver o JSON, relê CADA pergunta contra estas regras. Se alguma falhar (resposta no enunciado, duas certas, conta de um passo, capital, inglês com duas válidas, fato discutível), troque essa pergunta. Só então responda SOMENTE com o JSON.`;
}

function areaRule(area: string): string {
  if (area === 'matemática') return 'matemática — duas etapas, números até 1000, fração, porcentagem, tempo ou dinheiro';
  if (area === 'ciências') return 'ciências — causa e efeito ou "o que aconteceria se"';
  if (area === 'inglês') return 'inglês — frase em contexto, uma só forma correta';
  if (area === 'história ou geografia') return 'história ou geografia — fato de consenso';
  return 'futebol — regra, tática ou história, nunca definição';
}
