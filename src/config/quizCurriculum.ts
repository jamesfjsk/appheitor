// ========================================
// Currículo do Quiz Diário
// Cada dia tem um tema. A IA recebe o tema e uma orientação curta,
// e escreve a "ideia do dia" + perguntas em cima disso. A lista é
// intercalada por categoria para que dias seguidos nunca pareçam iguais.
// ========================================

export type QuizCategory =
  | 'filosofia'
  | 'caráter'
  | 'ciência'
  | 'história'
  | 'lógica'
  | 'inglês'
  | 'natureza'
  | 'tecnologia'
  | 'futebol';

export interface QuizThemeSeed {
  id: string;
  category: QuizCategory;
  title: string;
  /** orientação para a IA: o que a ideia do dia deve ensinar */
  seed: string;
}

export const QUIZ_THEMES: QuizThemeSeed[] = [
  { id: 'socrates-nao-sei', category: 'filosofia', title: 'Só sei que nada sei', seed: 'Sócrates e a coragem de admitir que não sabemos tudo; perguntar é mais inteligente do que fingir saber.' },
  { id: 'honestidade', category: 'caráter', title: 'Falar a verdade mesmo quando custa', seed: 'Honestidade: por que a confiança é construída devagar e perdida rápido; contar a verdade sobre um erro.' },
  { id: 'ceu-azul', category: 'ciência', title: 'Por que o céu é azul', seed: 'Luz do sol, cores e o espalhamento da luz no ar; por que o pôr do sol fica laranja.' },
  { id: 'estoicismo-controle', category: 'filosofia', title: 'O que está nas minhas mãos', seed: 'Estoicismo para crianças: separar o que eu controlo (esforço, atitude) do que não controlo (resultado, o que os outros fazem).' },
  { id: 'perseveranca', category: 'caráter', title: 'Errar faz parte de aprender', seed: 'Perseverança e mentalidade de crescimento: o cérebro cresce com o esforço; exemplos de atletas que erraram muito antes de acertar.' },
  { id: 'gravidade', category: 'ciência', title: 'Por que as coisas caem', seed: 'Gravidade: Newton, a Lua caindo em volta da Terra, por que astronautas flutuam.' },
  { id: 'padroes-numericos', category: 'lógica', title: 'Descobrindo padrões', seed: 'Sequências numéricas e padrões; como enxergar a regra por trás dos números.' },
  { id: 'empatia', category: 'caráter', title: 'Ver com os olhos do outro', seed: 'Empatia: imaginar como o outro se sente antes de agir; o colega novo na escola.' },
  { id: 'brasil-independencia', category: 'história', title: 'Como o Brasil virou um país', seed: 'Independência do Brasil de forma simples: o que mudou e o que não mudou na vida das pessoas.' },
  { id: 'aristoteles-habito', category: 'filosofia', title: 'Somos o que repetimos', seed: 'Aristóteles: a virtude é um hábito; quem quer ser corajoso pratica pequenos atos de coragem todo dia.' },
  { id: 'ingles-cotidiano', category: 'inglês', title: 'Inglês do dia a dia', seed: 'Frases úteis em inglês para situações reais: escola, esporte, pedir ajuda, contar o que fez no dia.' },
  { id: 'gratidao', category: 'caráter', title: 'Reparar no que já temos', seed: 'Gratidão: por que agradecer muda o humor; três coisas boas do dia.' },
  { id: 'fotossintese', category: 'natureza', title: 'Plantas comem luz', seed: 'Fotossíntese: como uma folha transforma luz, água e ar em comida e oxigênio.' },
  { id: 'coragem', category: 'caráter', title: 'Coragem não é não ter medo', seed: 'Coragem é agir apesar do medo; defender alguém que está sendo tratado mal.' },
  { id: 'futebol-tatica', category: 'futebol', title: 'Ler o jogo', seed: 'Tática básica de futebol: espaço, posicionamento, por que passar é muitas vezes melhor do que driblar.' },
  { id: 'logica-deducao', category: 'lógica', title: 'Pensar como detetive', seed: 'Dedução lógica: usar pistas para eliminar possibilidades; enigmas curtos.' },
  { id: 'internet-como-funciona', category: 'tecnologia', title: 'Como a internet funciona', seed: 'O caminho de uma mensagem pela internet: pacotes, cabos, servidores; por que a senha é importante.' },
  { id: 'responsabilidade', category: 'caráter', title: 'Assumir o que é meu', seed: 'Responsabilidade: cuidar das próprias coisas e das consequências; não culpar os outros.' },
  { id: 'sistema-solar', category: 'ciência', title: 'Nossa vizinhança no espaço', seed: 'Sistema solar: tamanhos, distâncias, por que Vênus é mais quente do que Mercúrio.' },
  { id: 'justica', category: 'filosofia', title: 'O que é justo?', seed: 'Justiça: igual não é sempre justo; dividir de acordo com a necessidade e o esforço.' },
  { id: 'egito-antigo', category: 'história', title: 'Segredos do Egito antigo', seed: 'Egito antigo: o rio Nilo, as pirâmides e a escrita; como sabemos o que sabemos.' },
  { id: 'autocontrole', category: 'caráter', title: 'Esperar vale a pena', seed: 'Autocontrole e o teste do marshmallow: escolher a recompensa maior depois em vez da menor agora.' },
  { id: 'fracoes-no-dia-a-dia', category: 'lógica', title: 'Frações que aparecem na vida', seed: 'Frações e proporções em pizza, tempo de jogo e receitas; comparar metades e terços.' },
  { id: 'animais-adaptacao', category: 'natureza', title: 'Truques de sobrevivência', seed: 'Adaptações dos animais: camuflagem, hibernação, migração; por que existem.' },
  { id: 'humildade', category: 'caráter', title: 'Ganhar e perder com classe', seed: 'Humildade e esportividade: cumprimentar o adversário, não se gabar, aprender com quem é melhor.' },
  { id: 'agua-estados', category: 'ciência', title: 'A viagem da água', seed: 'Estados da água e o ciclo da água: por que chove, de onde vem a nuvem.' },
  { id: 'ingles-esporte', category: 'inglês', title: 'Inglês do futebol', seed: 'Vocabulário do futebol em inglês e frases de jogo; palavras que já usamos em português.' },
  { id: 'generosidade', category: 'caráter', title: 'Dar sem esperar de volta', seed: 'Generosidade com tempo, atenção e coisas; a diferença entre dar e emprestar.' },
  { id: 'grecia-democracia', category: 'história', title: 'Quem inventou o voto', seed: 'Grécia antiga e a ideia de decidir junto; o que mudou até hoje.' },
  { id: 'estoicismo-obstaculo', category: 'filosofia', title: 'O obstáculo vira o caminho', seed: 'Marco Aurélio: um problema pode virar treino; o que fazer quando algo dá errado.' },
  { id: 'corpo-humano', category: 'ciência', title: 'A máquina do corpo', seed: 'Coração, pulmões e músculos: o que acontece no corpo quando corremos; por que dormir importa.' },
  { id: 'amizade', category: 'caráter', title: 'O que faz um bom amigo', seed: 'Amizade: lealdade, escutar, pedir desculpas; diferença entre amigo e popular.' },
  { id: 'futebol-historia', category: 'futebol', title: 'De onde veio o futebol', seed: 'História do futebol: origem na Inglaterra, chegada ao Brasil, Copas do Mundo; regras que mudaram.' },
  { id: 'probabilidade', category: 'lógica', title: 'Sorte tem matemática', seed: 'Probabilidade simples: dado, moeda, chances em porcentagem; por que "quase ganhei" engana.' },
  { id: 'inventores', category: 'tecnologia', title: 'Ideias que mudaram o mundo', seed: 'Invenções e inventores: lâmpada, avião (Santos Dumont), vacina; tentativa e erro.' },
  { id: 'paciencia', category: 'caráter', title: 'Devagar também chega', seed: 'Paciência: crescer, aprender um instrumento, treinar um chute; por que a pressa atrapalha.' },
  { id: 'dinossauros-fosseis', category: 'natureza', title: 'Como sabemos dos dinossauros', seed: 'Fósseis e paleontologia: como cientistas descobrem o passado; o que uma pegada conta.' },
  { id: 'respeito', category: 'caráter', title: 'Tratar bem quem é diferente', seed: 'Respeito às diferenças: jeitos, gostos, origens; discordar sem ofender.' },
  { id: 'mapas-geografia', category: 'história', title: 'Lendo o mundo num mapa', seed: 'Geografia: continentes, oceanos, por que o Brasil tem tantos climas.' },
  { id: 'platao-caverna', category: 'filosofia', title: 'Será que estou vendo tudo?', seed: 'A caverna de Platão em versão simples: às vezes só vemos uma parte; buscar a história completa antes de julgar.' },
  { id: 'ingles-descrever', category: 'inglês', title: 'Descrever em inglês', seed: 'Adjetivos e comparações em inglês: bigger, faster, the best; descrever pessoas e lugares.' },
  { id: 'eletricidade', category: 'ciência', title: 'De onde vem a energia da tomada', seed: 'Eletricidade: usinas, circuitos, por que não se mexe em tomada com a mão molhada.' },
  { id: 'medo-e-ansiedade', category: 'caráter', title: 'Quando o coração acelera', seed: 'Lidar com nervosismo antes de prova ou jogo: respiração, preparo, pensar no que se controla.' },
  { id: 'logica-argumentos', category: 'lógica', title: 'Isso prova o quê?', seed: 'Pensamento crítico: diferença entre opinião e fato; "todo mundo faz" não é argumento.' },
  { id: 'oceanos', category: 'natureza', title: 'O planeta azul', seed: 'Oceanos: profundidade, marés, por que o mar é salgado; cuidar do plástico.' },
];

/**
 * Escolhe o tema de um dia: caminha pela lista a partir de um ponto que depende
 * da data e pula temas usados recentemente. Mesma data, mesma escolha.
 */
export function pickThemeForDate(date: string, recentlyUsedIds: string[]): QuizThemeSeed {
  const [y, m, d] = date.split('-').map(Number);
  const dayOfYear = Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86_400_000) + 1;
  const start = (dayOfYear * 7 + y) % QUIZ_THEMES.length;
  const used = new Set(recentlyUsedIds);
  for (let i = 0; i < QUIZ_THEMES.length; i++) {
    const theme = QUIZ_THEMES[(start + i) % QUIZ_THEMES.length];
    if (!used.has(theme.id)) return theme;
  }
  return QUIZ_THEMES[start];
}
