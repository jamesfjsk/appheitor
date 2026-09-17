// ========================================
// Currículo do Quiz Diário (v2, 17/09/2026)
// Cada dia tem um tema. A IA recebe o tema e uma orientação curta,
// e escreve a "ideia do dia" + perguntas em cima disso. A lista é
// intercalada por categoria para que dias seguidos nunca pareçam iguais.
//
// 127 temas: filosofia 8, quimica 6, carater 8, geografia 6, matematica 6, dinheiro 6, astronomia 6, ingles 6, corpo 7, minecraft 6, arte 6, historia 6, futebol 6, invencoes 6, cidadania 6, mitologia 6, cotidiano 6, animais 6, brasil 6, logica 8.
// Lista legível para o pai em docs/conteudo/CURRICULO_PROVA.md.
// ========================================

export type QuizCategory =
  | 'geografia'
  | 'quimica'
  | 'matematica'
  | 'astronomia'
  | 'corpo'
  | 'arte'
  | 'invencoes'
  | 'mitologia'
  | 'dinheiro'
  | 'cidadania'
  | 'animais'
  | 'cotidiano'
  | 'brasil'
  | 'minecraft'
  | 'futebol'
  | 'filosofia'
  | 'historia'
  | 'carater'
  | 'ingles'
  | 'logica';

export interface QuizThemeSeed {
  id: string;
  category: QuizCategory;
  title: string;
  /** orientação para a IA: o que a ideia do dia deve ensinar */
  seed: string;
  /** 1 = primeiro contato, 2 = aprofunda, 3 = conecta com outra área */
  depth: 1 | 2 | 3;
  /** três jeitos diferentes de abordar o mesmo tema (o motor de rotação escolhe um) */
  angles: [string, string, string];
  /** tema ligado a um interesse do Heitor (no máximo 15 marcados) */
  interest?: 'futebol' | 'minecraft' | 'ciencia';
}

export const QUIZ_THEMES: QuizThemeSeed[] = [
  {
    id: 'socrates-nao-sei', category: 'filosofia', depth: 1,
    title: 'Só sei que nada sei',
    seed: 'Sócrates andava por Atenas fazendo perguntas até as pessoas perceberem que não sabiam o que achavam que sabiam. Por que admitir "não sei" é o começo de aprender de verdade, e não uma vergonha.',
    angles: [
      'o julgamento de Sócrates e por que ele não fugiu da prisão',
      'fazer o método de Sócrates em casa: cinco "por quês" seguidos sobre uma coisa que parece óbvia',
      'o que a ciência tem de socrático: toda resposta abre outra pergunta',
    ],
  },
  {
    id: 'agua-estados', category: 'quimica', depth: 1,
    title: 'A viagem da água',
    seed: 'Sólido, líquido, gás: a mesma molécula (H2O) em três disfarces. Por que a tampa da panela embaça, de onde vem a nuvem e por que o vapor queima mais do que a água fervendo.',
    angles: [
      'ciclo da água: a mesma gota que um dinossauro bebeu pode estar no seu copo',
      'experimento: um prato de água ao sol some sem ferver, por quê?',
      'por que o gelo seco não molha e vira fumaça',
    ],
  },
  {
    id: 'honestidade', category: 'carater', depth: 1,
    title: 'Falar a verdade mesmo quando custa',
    seed: 'Confiança se constrói devagar e se perde de uma vez: por que a mentira "pequena" sai cara depois. Como contar um erro antes que descubram e o que muda na reação dos outros quando você faz isso.',
    angles: [
      'o menino e o lobo: o que a história diz sobre crédito que acaba',
      'o cientista que inventou dados e perdeu a carreira inteira',
      'mentira, exagero e segredo: qual é qual',
    ],
  },
  {
    id: 'mapas-geografia', category: 'geografia', depth: 1,
    title: 'Lendo o mundo num mapa',
    seed: 'Como um mapa achata uma bola: por que a Groenlândia parece do tamanho da África no mapa da escola, mas é 14 vezes menor. Latitude, longitude e o que a escala esconde.',
    angles: [
      'a história dos primeiros mapas e do que os navegadores erravam',
      'medir uma distância real com a escala de um mapa em casa',
      'por que o GPS do celular precisa de satélites e de matemática',
    ],
  },
  {
    id: 'fracoes-no-dia-a-dia', category: 'matematica', depth: 1,
    title: 'Frações que aparecem na vida',
    seed: 'Metade de um terço, três quartos de um jogo: frações como pedaços de um todo. Por que 1/2 é maior do que 1/3 apesar de o 3 ser maior do que o 2.',
    angles: [
      'dividir uma pizza entre 3 amigos e entre 4: quem come mais?',
      'frações no tempo de jogo: quantos minutos são 3/4 de uma partida',
      'como os egípcios escreviam frações só com o número 1 em cima',
    ],
  },
  {
    id: 'troco-e-conta', category: 'dinheiro', depth: 1,
    title: 'Conferir o troco de cabeça',
    seed: 'Como calcular troco rápido: completar até o próximo real, depois até a nota. Somar uma compra de padaria de cabeça e perceber quando o total está errado.',
    angles: [
      'o truque de completar até a dezena',
      'simular uma compra com moedas e notas de verdade',
      'por que os preços terminam em 0,99',
    ],
  },
  {
    id: 'gravidade', category: 'astronomia', depth: 1,
    title: 'Por que as coisas caem',
    seed: 'Gravidade: Newton, a Lua caindo em volta da Terra sem nunca chegar, e por que astronautas flutuam (eles estão caindo o tempo todo). Quanto você pesaria em Marte.',
    angles: [
      'a lenda de Galileu na torre de Pisa: pesado e leve caem juntos',
      'experimento: papel amassado e papel aberto caindo, o que o ar faz',
      'quanto você pesaria em Marte e em Júpiter',
    ],
  },
  {
    id: 'ingles-cotidiano', category: 'ingles', depth: 1,
    title: 'Inglês do dia a dia',
    seed: 'Frases úteis para situações reais: pedir ajuda, contar o dia, se apresentar. Por que é "I am 10" e não "I have 10 years", e como a ordem das palavras muda em inglês.',
    angles: [
      'dez frases de sobrevivência para uma viagem',
      'falsos amigos: push não é puxar',
      'o que muda entre "I am", "I have" e "there is"',
    ],
  },
  {
    id: 'corpo-humano', category: 'corpo', depth: 1,
    title: 'A máquina do corpo',
    seed: 'O que acontece no corpo quando você corre: o coração acelera, os pulmões puxam mais ar, os músculos queimam açúcar. Por que dormir é a hora em que o corpo conserta tudo.',
    angles: [
      'medir os batimentos em repouso e depois de 20 polichinelos',
      'como o coração de um atleta fica diferente',
      'o que acontece com alguém que fica 3 dias sem dormir',
    ],
  },
  {
    id: 'redstone-de-verdade', category: 'minecraft', depth: 1, interest: 'minecraft',
    title: 'O que é redstone de verdade',
    seed: 'Redstone não existe, mas o cobre existe: por que alguns materiais conduzem eletricidade e outros não. Um fio de redstone é um fio de cobre; um repetidor é um amplificador. O que um circuito real exige que o jogo simplifica: ida e volta.',
    angles: [
      'experimento: pilha, fio e lâmpada para acender um circuito de verdade',
      'por que o cobre e não a madeira: os elétrons livres',
      'o que o jogo simplifica e o que a física exige (o circuito fechado)',
    ],
  },
  {
    id: 'cores-mistura', category: 'arte', depth: 1,
    title: 'De onde vêm as cores',
    seed: 'Misturar tinta e misturar luz dão resultados opostos: azul e amarelo dão verde na tinta, mas vermelho e verde dão amarelo na luz. Como a tela do celular faz todas as cores com só três pontinhos.',
    angles: [
      'experimento: lupa na tela do celular para ver os pontos vermelho, verde e azul',
      'o azul que valia mais do que ouro: o lápis-lazúli dos pintores',
      'por que a gente enxerga cores e o cachorro vê bem menos',
    ],
  },
  {
    id: 'egito-antigo', category: 'historia', depth: 1,
    title: 'Segredos do Egito antigo',
    seed: 'O Nilo inundava todo ano e deixava terra fértil: por isso uma civilização nasceu no deserto. Como as pirâmides foram erguidas (rampas e trabalhadores pagos, não alienígenas) e como a Pedra de Roseta destravou os hieróglifos.',
    angles: [
      'Champollion e a corrida para ler a Pedra de Roseta',
      'escrever o próprio nome em hieróglifos',
      'o que uma múmia conta sobre a comida e as doenças da época',
    ],
  },
  {
    id: 'futebol-tatica', category: 'futebol', depth: 1, interest: 'futebol',
    title: 'Ler o jogo',
    seed: 'Espaço e posicionamento: por que o time que "não corre" às vezes ganha. O que é linha de passe, por que a bola corre mais do que o jogador e o que o zagueiro olha antes de a bola chegar.',
    angles: [
      'o Barcelona de Guardiola: por que a bola corre mais do que o jogador',
      'desenhar um lance num papel e achar o passe melhor',
      'o que muda quando um time fica com 10',
    ],
  },
  {
    id: 'internet-como-funciona', category: 'invencoes', depth: 1,
    title: 'Como a internet funciona',
    seed: 'Uma mensagem vira pacotes que viajam por cabos no fundo do mar e servidores até o outro celular em menos de um segundo. O que é um endereço IP e por que a senha protege esse caminho.',
    angles: [
      'os cabos submarinos que ligam o Brasil ao mundo',
      'o que acontece no segundo entre apertar enviar e o amigo receber',
      'como um site sabe que você é você',
    ],
  },
  {
    id: 'grecia-democracia', category: 'cidadania', depth: 1,
    title: 'Quem inventou o voto',
    seed: 'Os atenienses decidiam tudo votando na praça, mas só homens livres podiam. Como funciona o voto hoje no Brasil, por que aos 16 já se pode votar e o que um vereador decide na sua rua.',
    angles: [
      'um dia de votação em Atenas, com cacos de cerâmica',
      'o que o prefeito, o vereador e o presidente decidem na sua vida',
      'por que o voto é secreto',
    ],
  },
  {
    id: 'mitos-gregos-olimpo', category: 'mitologia', depth: 1,
    title: 'Os deuses do Olimpo',
    seed: 'Zeus, Poseidon e Atena: os gregos explicavam raios, terremotos e sabedoria com deuses que brigavam como humanos. Por que tantas palavras de hoje vêm daí: atlas, pânico, eco.',
    angles: [
      'a guerra de Troia e o cavalo de madeira: mito ou história?',
      'palavras do dia a dia que vieram dos mitos gregos',
      'o que um mito explicava antes da ciência',
    ],
  },
  {
    id: 'ceu-azul', category: 'cotidiano', depth: 1,
    title: 'Por que o céu é azul',
    seed: 'A luz do Sol é branca, mas tem todas as cores; o ar espalha mais o azul. Por que o pôr do sol fica laranja e por que o pôr do sol em Marte é azul.',
    angles: [
      'Newton e o prisma: a luz branca escondia o arco-íris',
      'experimento: copo de água com leite e lanterna faz um pôr do sol',
      'por que as nuvens são brancas se o céu é azul',
    ],
  },
  {
    id: 'animais-adaptacao', category: 'animais', depth: 1,
    title: 'Truques de sobrevivência',
    seed: 'Camuflagem, hibernação, migração: por que a evolução fez o urso dormir cinco meses e a andorinha atravessar continentes. Como uma adaptação surge ao longo de milhares de gerações.',
    angles: [
      'Darwin e os tentilhões: bicos diferentes em ilhas diferentes',
      'animais brasileiros com truques: bicho-preguiça, tamanduá, peixe-boi',
      'o que aconteceria com um animal se o clima mudasse rápido demais',
    ],
  },
  {
    id: 'brasil-independencia', category: 'brasil', depth: 1,
    title: 'Como o Brasil virou um país',
    seed: '1822: um príncipe português declara o Brasil independente de Portugal e vira imperador. O que mudou (e o que não mudou) para quem vivia aqui, e por que o grito foi à beira de um riacho.',
    angles: [
      'por que a família real fugiu de Napoleão para o Rio',
      'o que era diferente na vida de uma criança de 1822',
      'como os vizinhos da América ficaram independentes de jeitos diferentes',
    ],
  },
  {
    id: 'padroes-numericos', category: 'logica', depth: 1,
    title: 'Descobrindo padrões',
    seed: 'Sequências: 2, 4, 8, 16, 32 e 1, 1, 2, 3, 5, 8 (Fibonacci, que aparece no girassol). Como achar a regra por trás dos números e prever o próximo.',
    angles: [
      'Fibonacci e as espirais do girassol e da pinha',
      'criar uma sequência e desafiar alguém a achar a regra',
      'padrões que enganam: quando o próximo não é o que parece',
    ],
  },
  {
    id: 'estoicismo-controle', category: 'filosofia', depth: 1,
    title: 'O que está nas minhas mãos',
    seed: 'Epicteto nasceu escravo e ensinou imperadores: separe o que você controla (esforço, atitude, preparo) do que não controla (resultado, o que os outros fazem, a chuva). Como usar isso num jogo perdido ou numa prova difícil.',
    angles: [
      'Epicteto: o escravo manco que virou o professor mais procurado de Roma',
      'antes de um jogo, listar em duas colunas o que dá e o que não dá para controlar',
      'por que ficar bravo com a chuva é energia jogada fora',
    ],
  },
  {
    id: 'fotossintese', category: 'quimica', depth: 1,
    title: 'Plantas comem luz',
    seed: 'Fotossíntese é uma reação química: luz, água e gás carbônico viram açúcar e oxigênio. Todo o oxigênio que você respira saiu de uma folha ou de uma alga do mar.',
    angles: [
      'Van Helmont e o salgueiro: a árvore ganhou 74 kg e a terra do vaso quase não mudou de peso',
      'experimento: tapar metade de uma folha com papel-alumínio por uma semana',
      'o que aconteceria com o ar se as florestas e as algas sumissem',
    ],
  },
  {
    id: 'perseveranca', category: 'carater', depth: 1,
    title: 'Errar faz parte de aprender',
    seed: 'O cérebro cresce com esforço, e o erro é o sinal de que está crescendo. Michael Jordan foi cortado do time da escola; Edison errou milhares de vezes. O que a palavra "ainda" muda numa frase.',
    angles: [
      'atletas que erraram muito antes de acertar',
      'o que acontece no cérebro quando você erra e tenta de novo',
      'a diferença entre desistir e mudar de estratégia',
    ],
  },
  {
    id: 'oceanos', category: 'geografia', depth: 1,
    title: 'O planeta azul',
    seed: 'Por que o mar é salgado se os rios são doces, e como as marés seguem a Lua. O que vive no fundo, onde a luz não chega, e por que sabemos mais da Lua do que do fundo do mar.',
    angles: [
      'a corrida para medir o ponto mais fundo do oceano',
      'experimento: o ovo que afunda na água doce e boia na salgada',
      'o que aconteceria com o clima se as correntes do oceano parassem',
    ],
  },
  {
    id: 'probabilidade', category: 'matematica', depth: 2,
    title: 'Sorte tem matemática',
    seed: 'Dado, moeda, sorteio: como contar chances. Por que "quase ganhei" não muda nada, por que a loteria é uma aposta péssima e por que a casa sempre ganha no fim.',
    angles: [
      'jogar uma moeda 50 vezes e ver o padrão aparecer',
      'numa sala de 23 alunos, a chance de dois fazerem aniversário no mesmo dia passa de 50%',
      'por que quem vende a rifa ganha sempre',
    ],
  },
  {
    id: 'poupar-e-juros', category: 'dinheiro', depth: 2,
    title: 'Dinheiro que faz dinheiro',
    seed: 'Juros compostos: R$ 100 guardados a 1% ao mês viram R$ 127 em dois anos sem fazer nada; a mesma conta ao contrário mostra por que uma dívida cresce como bola de neve.',
    angles: [
      'a bola de neve: por que os juros dos juros crescem tão rápido',
      'a conta: quanto rende guardar metade da mesada por um ano',
      'por que o cartão de crédito é o juro mais caro que existe',
    ],
  },
  {
    id: 'sistema-solar', category: 'astronomia', depth: 1,
    title: 'Nossa vizinhança no espaço',
    seed: 'Tamanhos e distâncias em escala: se a Terra fosse uma bola de gude, o Sol seria uma bola de 1,4 m a 150 m de distância. Por que Vênus é mais quente do que Mercúrio, que está mais perto do Sol.',
    angles: [
      'montar o sistema solar em escala na rua com frutas',
      'as sondas Voyager que saíram do sistema solar levando um disco de ouro',
      'o que fez Plutão deixar de ser planeta',
    ],
  },
  {
    id: 'ingles-esporte', category: 'ingles', depth: 1,
    title: 'Inglês do futebol',
    seed: 'Vocabulário do jogo: goalkeeper, offside, kick-off, corner, striker. Palavras que o português pegou do inglês (gol, pênalti, time) e frases para jogar com um estrangeiro.',
    angles: [
      'palavras do futebol que vieram do inglês',
      'narrar um lance em inglês em 3 frases',
      'os nomes das posições em inglês e o que cada um faz',
    ],
  },
  {
    id: 'cerebro-memoria', category: 'corpo', depth: 1,
    title: 'Como o cérebro guarda as coisas',
    seed: 'Memória não é um HD: lembrar é reconstruir. Por que repetir espaçado funciona melhor do que decorar na véspera, e por que o sono grava o que você estudou de dia.',
    angles: [
      'o paciente H.M., que não conseguia formar memórias novas',
      'testar em casa: lista de palavras lida uma vez versus três vezes em dias diferentes',
      'como o cérebro de um jogador de xadrez ou de futebol "vê" a jogada antes',
    ],
  },
  {
    id: 'diamante-real', category: 'minecraft', depth: 1, interest: 'minecraft',
    title: 'Como nasce um diamante',
    seed: 'Diamante é carbono apertado a 150 km de profundidade e trazido por vulcões antigos. Por que corta vidro, por que a maioria vai para brocas e não para anéis, e onde tem no Brasil.',
    angles: [
      'a mina de Kimberley e a corrida do diamante na África',
      'carbono: o mesmo átomo que vira lápis (grafite) e diamante',
      'como se testa se um diamante é verdadeiro',
    ],
  },
  {
    id: 'musica-som', category: 'arte', depth: 3,
    title: 'Por que música é matemática',
    seed: 'Som é vibração; nota é a velocidade da vibração. Pitágoras descobriu que cordas com tamanhos em proporção simples soam bem juntas. Por que violão e piano tocando a mesma nota soam diferentes.',
    angles: [
      'experimento: copos com água em níveis diferentes fazem uma escala',
      'como a orelha separa uma música em notas',
      'por que algumas músicas dão arrepio',
    ],
  },
  {
    id: 'roma-imperio', category: 'historia', depth: 1,
    title: 'Roma: a cidade que virou império',
    seed: 'Como uma cidade dominou o mundo com estradas, aquedutos e um exército organizado, e como caiu. Palavras, leis e o calendário que ainda usamos (julho e agosto são imperadores).',
    angles: [
      'o dia a dia de uma criança em Roma',
      'aquedutos: água correndo 50 km só com a inclinação certa',
      'por que um império tão forte caiu',
    ],
  },
  {
    id: 'futebol-historia', category: 'futebol', depth: 1, interest: 'futebol',
    title: 'De onde veio o futebol',
    seed: 'Inglaterra, 1863: as regras escritas numa taverna; Charles Miller trouxe duas bolas para o Brasil em 1894. Copas, regras que mudaram (impedimento, VAR) e por que o Brasil virou o país do futebol.',
    angles: [
      'o Maracanazo de 1950 e o silêncio de 200 mil pessoas',
      'regras que mudaram: quando o goleiro podia pegar o recuo com a mão',
      'como o futebol chegou aos times de fábrica e às várzeas',
    ],
  },
  {
    id: 'inventores', category: 'invencoes', depth: 1,
    title: 'Ideias que mudaram o mundo',
    seed: 'Como uma invenção nasce: lâmpada, avião, vacina. Edison testou milhares de materiais para o filamento; Santos Dumont voou em público quando ninguém acreditava.',
    angles: [
      'o que Santos Dumont e os irmãos Wright fizeram de diferente',
      'inventar uma solução para um problema pequeno da casa',
      'invenções que aconteceram por acidente: micro-ondas, velcro, post-it',
    ],
  },
  {
    id: 'leis-e-regras', category: 'cidadania', depth: 1,
    title: 'Por que existem leis',
    seed: 'Regra de trânsito, regra da escola, lei do país: quem faz, como muda e o que acontece sem elas. A diferença entre uma lei justa e uma injusta ao longo da história.',
    angles: [
      'o Código de Hamurabi: as primeiras leis escritas em pedra',
      'inventar as regras de um jogo e ver o que dá errado sem elas',
      'leis que já existiram e hoje parecem absurdas',
    ],
  },
  {
    id: 'mitos-nordicos', category: 'mitologia', depth: 1,
    title: 'Thor, Odin e o fim do mundo',
    seed: 'Mitologia nórdica de verdade: os vikings acreditavam num mundo ligado por uma árvore gigante e num fim do mundo já anunciado. De onde vêm os nomes dos dias da semana em inglês.',
    angles: [
      'Thursday é o dia de Thor: os dias da semana em inglês',
      'como os vikings navegavam sem bússola',
      'o que o Ragnarök diz sobre como os vikings viam a coragem',
    ],
  },
  {
    id: 'eletricidade', category: 'cotidiano', depth: 1,
    title: 'De onde vem a energia da tomada',
    seed: 'Da usina até a tomada: uma hidrelétrica gira um ímã dentro de um fio e a eletricidade viaja por quilômetros. Por que não se mexe em tomada com a mão molhada e o que o disjuntor faz.',
    angles: [
      'a guerra das correntes entre Edison e Tesla',
      'experimento: balão no cabelo e a eletricidade estática',
      'o que aconteceria na sua casa em 24 horas sem energia',
    ],
  },
  {
    id: 'dinossauros-fosseis', category: 'animais', depth: 1,
    title: 'Como sabemos dos dinossauros',
    seed: 'Fósseis: como um osso vira pedra e como um paleontólogo descobre a velocidade de um dinossauro por uma pegada. Por que as aves são dinossauros vivos.',
    angles: [
      'Mary Anning, a menina que achava fósseis para vender e mudou a ciência',
      'fazer um fóssil com massa e uma folha',
      'o asteroide: como sabemos o que matou os dinossauros',
    ],
  },
  {
    id: 'povos-indigenas', category: 'brasil', depth: 1,
    title: 'Os primeiros brasileiros',
    seed: 'Mais de 300 povos e quase 300 línguas: quem vivia aqui antes de 1500, o que inventaram (rede, canoa, mandioca sem veneno) e palavras do dia a dia que vêm do tupi.',
    angles: [
      'como tiraram o veneno da mandioca: uma tecnologia de milhares de anos',
      'palavras tupi que você usa todo dia: pipoca, jacaré, Ipanema',
      'como vivem povos indígenas hoje, nas cidades e nas aldeias',
    ],
  },
  {
    id: 'logica-deducao', category: 'logica', depth: 1,
    title: 'Pensar como detetive',
    seed: 'Dedução: usar pistas para eliminar o impossível até sobrar a resposta. O método de Sherlock Holmes e enigmas de "quem mora em qual casa".',
    angles: [
      'como Sherlock deduz de onde alguém veio pelo sapato',
      'resolver um enigma de grade com 3 pistas',
      'dedução e chute: qual é a diferença',
    ],
  },
  {
    id: 'aristoteles-habito', category: 'filosofia', depth: 1,
    title: 'Somos o que repetimos',
    seed: 'Aristóteles: ninguém nasce corajoso ou justo, vira praticando; a virtude é um hábito. E a virtude fica no meio-termo entre dois exageros: coragem está entre a covardia e a imprudência.',
    angles: [
      'o meio-termo: achar onde a coragem fica entre o medo e a loucura',
      'escolher um hábito minúsculo de 2 minutos e testar por uma semana',
      'como o cérebro cria um hábito: a trilha que se abre no mato de tanto passar',
    ],
  },
  {
    id: 'atomos-e-elementos', category: 'quimica', depth: 3, interest: 'ciencia',
    title: 'Tudo é feito de peças',
    seed: 'Átomos são as peças de montar do universo: 118 tipos formam tudo, de ouro a chocolate. O ferro do seu sangue e o cálcio dos seus ossos foram fabricados dentro de estrelas que explodiram.',
    angles: [
      'Mendeleev e a tabela com buracos que previu elementos ainda não descobertos',
      'quantos átomos cabem num grão de sal (e por que o número é absurdo)',
      'como o ferro do sangue veio de uma estrela que explodiu antes de o Sol existir',
    ],
  },
  {
    id: 'empatia', category: 'carater', depth: 1,
    title: 'Ver com os olhos do outro',
    seed: 'Empatia é imaginar o que o outro sente antes de agir: o colega novo, o irmão que perdeu. O cérebro tem neurônios que "imitam" o que a gente vê, e isso ajuda a ser um bom capitão de time.',
    angles: [
      'neurônios-espelho: por que a gente faz careta quando vê alguém se machucar',
      'o colega novo na escola: três coisas concretas que ajudam',
      'dá para ter empatia com quem está errado?',
    ],
  },
  {
    id: 'vulcoes-terremotos', category: 'geografia', depth: 1,
    title: 'Por que a Terra treme',
    seed: 'Placas tectônicas: o chão que a gente pisa flutua e se move alguns centímetros por ano, como unha crescendo. Onde os vulcões nascem e por que o Brasil quase não tem terremoto.',
    angles: [
      'Pompeia: a cidade que o vulcão guardou por 1.700 anos',
      'montar uma erupção de bicarbonato e vinagre e entender o que é diferente numa de verdade',
      'como o Japão constrói prédios que balançam e não caem',
    ],
  },
  {
    id: 'porcentagem', category: 'matematica', depth: 2,
    title: 'O que 30% de desconto significa de verdade',
    seed: 'Porcentagem é fração de 100. Desconto de 30% e depois 20% não é 50%. Como calcular de cabeça 10%, 5% e 50% de qualquer preço.',
    angles: [
      'o truque: 10% é só mover a vírgula',
      'desconto em cima de desconto: por que não soma',
      'porcentagem no futebol: o aproveitamento de um time',
    ],
  },
  {
    id: 'de-onde-vem-o-preco', category: 'dinheiro', depth: 2,
    title: 'Por que o pão custa o que custa',
    seed: 'Preço é custo, mais lucro, mais o quanto as pessoas querem pagar. Oferta e demanda com exemplos: a figurinha rara, o guarda-chuva no dia de chuva, a água no estádio.',
    angles: [
      'a figurinha rara do álbum e o preço que dispara',
      'montar uma venda de limonada no papel: custo, preço, lucro',
      'por que uma garrafa de água custa três vezes mais no estádio',
    ],
  },
  {
    id: 'lua-fases-eclipses', category: 'astronomia', depth: 1,
    title: 'A Lua muda de forma?',
    seed: 'A Lua não muda: a gente vê a parte iluminada de ângulos diferentes. Fases, eclipses, e por que a Lua sempre mostra a mesma cara para a Terra.',
    angles: [
      'experimento: bola e lanterna no quarto escuro para ver as fases',
      'como os antigos previam eclipses e assustavam reis',
      'a ida à Lua em 1969 e as pegadas que ainda estão lá',
    ],
  },
  {
    id: 'ingles-descrever', category: 'ingles', depth: 2,
    title: 'Descrever em inglês',
    seed: 'Adjetivos e comparações: big, bigger, the biggest; fast, faster; good, better, best (os irregulares). Descrever pessoas, lugares e o seu jogador favorito.',
    angles: [
      'comparar dois animais em inglês',
      'as comparações irregulares que todo mundo erra',
      'descrever alguém para outra pessoa adivinhar quem é',
    ],
  },
  {
    id: 'sistema-imune', category: 'corpo', depth: 2,
    title: 'O exército dentro de você',
    seed: 'Como o corpo luta contra vírus e bactérias: febre é arma, não defeito. O que uma vacina ensina ao sistema imune e por que você fica imune depois de uma catapora.',
    angles: [
      'Jenner, as vacas e a primeira vacina',
      'por que a febre sobe e quando ela é boa',
      'como o corpo lembra de um vírus por anos',
    ],
  },
  {
    id: 'obsidiana-e-lava', category: 'minecraft', depth: 2, interest: 'minecraft',
    title: 'Obsidiana: o vidro do vulcão',
    seed: 'Obsidiana é lava que esfriou rápido demais para formar cristais: vira vidro natural. Os astecas faziam facas mais afiadas do que bisturi. O que a lava vira quando esfria devagar: granito.',
    angles: [
      'facas de obsidiana usadas em cirurgia hoje',
      'rápido vira vidro, devagar vira cristal: o que decide',
      'quais rochas do jogo existem de verdade e quais não',
    ],
  },
  {
    id: 'perspectiva-desenho', category: 'arte', depth: 2,
    title: 'Como desenhar profundidade num papel plano',
    seed: 'Perspectiva: por que os trilhos parecem se encontrar no horizonte, e como os pintores do Renascimento descobriram a regra e mudaram a pintura para sempre.',
    angles: [
      'Brunelleschi e o espelho que provou a perspectiva',
      'desenhar uma rua com um ponto de fuga em 5 minutos',
      'por que os egípcios desenhavam pessoas de lado',
    ],
  },
  {
    id: 'grandes-navegacoes', category: 'historia', depth: 2,
    title: 'Quando o mundo ficou redondo',
    seed: 'Século 15: portugueses e espanhóis navegando sem saber o que havia depois do horizonte; escorbuto, bússola, astrolábio e o erro de Colombo. O que a chegada deles causou nos povos da América.',
    angles: [
      'Fernão de Magalhães e a primeira volta ao mundo: dos 240, só 18 voltaram',
      'como se navegava pelas estrelas',
      'o que o encontro de dois mundos trocou: batata, cavalo, doenças',
    ],
  },
  {
    id: 'fisica-da-bola', category: 'futebol', depth: 3, interest: 'futebol',
    title: 'A física do chute',
    seed: 'Por que a bola faz curva (efeito Magnus), por que o chute de bico é forte e impreciso, e o que o ar rarefeito faz com a bola em La Paz, a 3.600 m de altitude.',
    angles: [
      'o gol de Roberto Carlos em 1997 que os físicos estudaram',
      'experimento: bola de papel girando desviando no ar',
      'por que a bola da Copa muda e os goleiros reclamam',
    ],
  },
  {
    id: 'roda-e-alavanca', category: 'invencoes', depth: 1,
    title: 'As máquinas mais simples do mundo',
    seed: 'Roda, alavanca, plano inclinado e polia: como os egípcios ergueram blocos de toneladas e por que Arquimedes disse "me deem uma alavanca e moverei o mundo".',
    angles: [
      'Arquimedes e a alavanca',
      'experimento: levantar um livro pesado com uma régua e um apoio',
      'onde as máquinas simples estão escondidas numa bicicleta',
    ],
  },
  {
    id: 'direitos-da-crianca', category: 'cidadania', depth: 1,
    title: 'O que toda criança tem direito',
    seed: 'Escola, saúde, brincar, não trabalhar, ser ouvida: o ECA e a Convenção da ONU dizem isso. Por que essas regras existem (crianças já trabalharam em minas) e a quem pedir ajuda.',
    angles: [
      'crianças que trabalhavam em fábricas há 150 anos',
      'o direito de ser ouvido: o que isso significa numa decisão da família',
      'como o Disque 100 e o conselho tutelar funcionam',
    ],
  },
  {
    id: 'folclore-brasileiro', category: 'mitologia', depth: 1,
    title: 'Saci, Curupira e Boitatá',
    seed: 'Lendas brasileiras que misturam indígena, africano e europeu: o Curupira de pés virados que protege a floresta, o Boitatá que era o fogo-fátuo. O que cada lenda tentava explicar ou proteger.',
    angles: [
      'de onde vêm as lendas: o que os povos indígenas viam na mata',
      'Boitatá e o fogo-fátuo: o fenômeno real por trás',
      'inventar uma lenda para explicar algo da sua cidade',
    ],
  },
  {
    id: 'bolo-cresce', category: 'cotidiano', depth: 1,
    title: 'Por que o bolo cresce',
    seed: 'O fermento faz gás dentro da massa e o calor prende as bolhas. Por que abrir o forno cedo murcha o bolo, e a diferença entre o fermento químico e o fermento vivo do pão.',
    angles: [
      'a descoberta do fermento: padeiros egípcios e a massa que "estragou"',
      'experimento: fermento, água morna e açúcar enchendo um balão',
      'a química: bicarbonato mais ácido igual a gás',
    ],
  },
  {
    id: 'insetos-formigas', category: 'animais', depth: 1,
    title: 'O superorganismo da formiga',
    seed: 'Um formigueiro é um único "animal" de milhões: rainha, operárias, soldados. Formigas cortadeiras cultivam fungo há milhões de anos. Como elas se comunicam por cheiro.',
    angles: [
      'formigas que fazem agricultura desde antes dos humanos',
      'seguir uma trilha de formigas e apagar o rastro de cheiro com o dedo',
      'por que os insetos são o grupo de animais mais numeroso da Terra',
    ],
  },
  {
    id: 'biomas-do-brasil', category: 'brasil', depth: 1,
    title: 'Seis Brasis diferentes',
    seed: 'Amazônia, Cerrado, Caatinga, Mata Atlântica, Pantanal e Pampa: por que cada um tem chuva, plantas e animais diferentes. O Cerrado é uma floresta de cabeça para baixo, com raízes gigantes.',
    angles: [
      'os rios voadores: como a Amazônia manda chuva para São Paulo',
      'descobrir em qual bioma você mora e quanto dele ainda existe',
      'por que a Caatinga fica verde em uma semana quando chove',
    ],
  },
  {
    id: 'logica-argumentos', category: 'logica', depth: 2,
    title: 'Isso prova o quê?',
    seed: 'Fato, opinião e argumento: "todo mundo faz" não prova nada; "meu time é o melhor" é opinião. As falhas mais comuns (atacar a pessoa, generalizar com um exemplo) e como perceber.',
    angles: [
      'caçar uma falha de argumento numa propaganda',
      'por que "eu vi um caso" não prova uma regra',
      'como discordar com argumento em vez de com grito',
    ],
  },
  {
    id: 'justica', category: 'filosofia', depth: 1,
    title: 'O que é justo?',
    seed: 'Igual não é sempre justo: dividir um bolo entre um bebê e um adulto. Justiça como igualdade, como mérito e como necessidade, e por que às vezes as três brigam entre si.',
    angles: [
      'a balança de olhos vendados: por que a justiça não olha para quem está na frente',
      'dividir 10 figurinhas entre três amigos que ajudaram de formas diferentes',
      'regras de jogo que parecem injustas mas equilibram (o mais fraco começa com vantagem)',
    ],
  },
  {
    id: 'acidos-e-bases', category: 'quimica', depth: 2,
    title: 'Azedo, amargo e a química do limão',
    seed: 'Ácidos e bases no dia a dia: limão, vinagre, sabão, bicarbonato. Por que o suco de repolho roxo muda de cor e por que o estômago, que é ácido, não digere a si mesmo.',
    angles: [
      'experimento: indicador de repolho roxo testando coisas da cozinha',
      'por que o refrigerante ataca o dente e o que a saliva faz para defender',
      'como um antiácido apaga a azia',
    ],
  },
  {
    id: 'coragem', category: 'carater', depth: 1,
    title: 'Coragem não é não ter medo',
    seed: 'Coragem é agir apesar do medo, não sem ele. Bombeiros sentem medo; a diferença é o treino. Defender alguém tratado mal, falar em público, admitir um erro: coragens de todo dia.',
    angles: [
      'por que os bombeiros treinam tanto: o medo fica, mas o corpo sabe o que fazer',
      'coragem pequena: dizer "não concordo" no meio do grupo',
      'a diferença entre coragem e imprudência',
    ],
  },
  {
    id: 'rios-agua-doce', category: 'geografia', depth: 1,
    title: 'Onde a água doce se esconde',
    seed: 'Só cerca de 1% da água do planeta é doce e acessível. De onde vem a água da torneira, para onde vai a do ralo, e por que o Aquífero Guarani está debaixo dos nossos pés.',
    angles: [
      'a viagem de uma gota da nascente até a torneira',
      'medir quanta água uma torneira pingando desperdiça em um dia',
      'por que as cidades antigas nasceram na beira dos rios',
    ],
  },
  {
    id: 'geometria-formas', category: 'matematica', depth: 3,
    title: 'Por que a colmeia é feita de hexágonos',
    seed: 'Formas na natureza e na construção: triângulos que não entortam, hexágonos que não desperdiçam espaço, círculos que rolam. Por que as abelhas resolveram um problema de matemática antes dos matemáticos.',
    angles: [
      'as abelhas e o hexágono: o máximo de mel com o mínimo de cera',
      'experimento: construir com palitos e ver qual forma aguenta peso',
      'como medir uma distância inacessível usando triângulos',
    ],
  },
  {
    id: 'imposto', category: 'dinheiro', depth: 3,
    title: 'Para onde vai o dinheiro do imposto',
    seed: 'Uma parte de tudo o que se compra vai para o governo: o que é imposto, o que ele paga (escola, hospital, estrada) e como olhar a nota fiscal e achar quanto foi.',
    angles: [
      'a Inconfidência Mineira começou por causa de um imposto',
      'pegar uma nota fiscal e achar o valor do imposto',
      'o que uma cidade não teria se ninguém pagasse',
    ],
  },
  {
    id: 'terra-gira', category: 'astronomia', depth: 1,
    title: 'Dia, noite e as estações',
    seed: 'A Terra gira em 24 horas e dá a volta no Sol em 365 dias, inclinada. Por que existem estações e por que no Brasil o Natal é no verão e no Canadá é na neve.',
    angles: [
      'como Eratóstenes mediu o tamanho da Terra com uma sombra e um poço',
      'experimento: globo, lanterna e a inclinação que faz o inverno',
      'por que o ano bissexto existe',
    ],
  },
  {
    id: 'ingles-jogos', category: 'ingles', depth: 1,
    title: 'Inglês dos jogos',
    seed: 'As palavras que aparecem em todo jogo: level, craft, inventory, quest, spawn, settings. O que significam de verdade e como usar em frases fora do jogo.',
    angles: [
      'palavras do Minecraft que têm sentido fora do jogo',
      'ler um menu de jogo em inglês sem chutar',
      'verbos de ação em frases: jump, run, build, mine',
    ],
  },
  {
    id: 'digestao', category: 'corpo', depth: 1,
    title: 'A viagem de um pedaço de pão',
    seed: 'Da boca ao intestino: a saliva já começa a digerir, o estômago tem um ácido forte o bastante para corroer metal, e trilhões de bactérias no intestino ajudam. Quanto tempo leva a viagem?',
    angles: [
      'experimento: mastigar pão por um minuto e sentir ficar doce',
      'como a vaca digere o capim que a gente não consegue',
      'por que existem alimentos que o corpo não digere e ainda assim são importantes',
    ],
  },
  {
    id: 'carvao-como-se-forma', category: 'minecraft', depth: 1, interest: 'minecraft',
    title: 'De floresta a carvão',
    seed: 'Carvão mineral é floresta de 300 milhões de anos enterrada e apertada; carvão vegetal é madeira queimada sem ar. Por que o carvão moveu a Revolução Industrial e por que o mundo quer parar de usá-lo.',
    angles: [
      'as minas de carvão inglesas e as crianças que trabalhavam nelas',
      'por que a tocha do jogo é carvão numa vareta e o que a de verdade tinha',
      'carvão, petróleo e gás: os três combustíveis fósseis',
    ],
  },
  {
    id: 'historias-estrutura', category: 'arte', depth: 1,
    title: 'Toda história tem um esqueleto',
    seed: 'Por que quase todo filme e livro segue o mesmo caminho: alguém quer algo, encontra um obstáculo, muda. Como reconhecer isso num jogo, num desenho ou numa partida de futebol.',
    angles: [
      'a jornada do herói de Star Wars a Harry Potter',
      'inventar uma história em 3 frases usando o esqueleto',
      'por que a gente torce por um personagem e não por outro',
    ],
  },
  {
    id: 'idade-media-castelos', category: 'historia', depth: 1,
    title: 'Castelos, cavaleiros e a peste',
    seed: 'Como era viver num castelo de verdade (frio, escuro, cheiro), quem eram os cavaleiros e a Peste Negra, que matou um terço da Europa e mudou até o salário de quem sobreviveu.',
    angles: [
      'um dia na vida de um escudeiro de 10 anos',
      'por que os castelos têm as formas que têm',
      'a Peste Negra: como uma doença mudou o valor do trabalho',
    ],
  },
  {
    id: 'estatistica-no-futebol', category: 'futebol', depth: 3, interest: 'futebol',
    title: 'Números que ganham jogo',
    seed: 'Posse de bola, gols esperados (xG), aproveitamento: como analistas usam números para escalar o time, e por que quem finaliza mais nem sempre ganha.',
    angles: [
      'Moneyball: o time pobre que venceu com matemática',
      'calcular o aproveitamento do seu time nos últimos 10 jogos',
      'por que o pênalti é 75% e o que o goleiro faz para baixar isso',
    ],
  },
  {
    id: 'escrita-e-imprensa', category: 'invencoes', depth: 2,
    title: 'A invenção que guardou o pensamento',
    seed: 'Da escrita em argila ao papel chinês e à prensa de Gutenberg: copiar um livro à mão levava um ano, e a prensa fez o conhecimento explodir. O que a internet tem em comum com isso.',
    angles: [
      'os monges que copiavam livros e os erros que se espalhavam',
      'experimento: carimbo de batata como uma prensa',
      'o que mudou na vida das pessoas quando os livros ficaram baratos',
    ],
  },
  {
    id: 'bullying-e-grupo', category: 'cidadania', depth: 2,
    title: 'Quando o grupo erra junto',
    seed: 'Por que pessoas fazem em grupo o que não fariam sozinhas (efeito manada). O que é bullying, o que é brincadeira, e o poder de quem está só assistindo. Ciência do comportamento, sem sermão.',
    angles: [
      'o experimento de Asch: pessoas dizendo o que sabem que está errado só para concordar com o grupo',
      'o espectador: o que quem assiste pode fazer que muda tudo',
      'a diferença entre zoar entre amigos e humilhar',
    ],
  },
  {
    id: 'mitos-egipcios', category: 'mitologia', depth: 1,
    title: 'O julgamento do coração',
    seed: 'Os egípcios acreditavam que o coração era pesado numa balança contra uma pena depois da morte. Rá, o Sol que atravessa o céu de barco, e por que mumificavam faraós e gatos.',
    angles: [
      'por que guardavam o corpo e tiravam o cérebro pelo nariz',
      'Rá e o barco solar: como explicavam o nascer do Sol',
      'gatos sagrados: o que acontecia com quem machucava um',
    ],
  },
  {
    id: 'gelo-boia', category: 'cotidiano', depth: 1,
    title: 'Por que o gelo boia',
    seed: 'Quase tudo encolhe quando esfria, mas a água cresce ao congelar: por isso o gelo boia e a garrafa estoura no congelador. Se não fosse assim, os lagos congelariam de baixo para cima e os peixes morreriam.',
    angles: [
      'experimento: copo cheio até a borda com gelo, transborda quando derrete?',
      'o Titanic e por que os icebergs escondem 90% embaixo',
      'por que a vida nos lagos depende dessa esquisitice',
    ],
  },
  {
    id: 'cerebro-dos-animais', category: 'animais', depth: 2,
    title: 'Quem é o animal mais inteligente',
    seed: 'Corvos que usam ferramentas, polvos que abrem potes, golfinhos com nomes: como os cientistas medem inteligência sem palavras. Por que "inteligente" depende do problema.',
    angles: [
      'o corvo que resolve um quebra-cabeça de 8 etapas',
      'o teste do espelho: quais animais se reconhecem',
      'o que o cachorro entende do que você fala',
    ],
  },
  {
    id: 'regioes-e-sotaques', category: 'brasil', depth: 1,
    title: 'Um país, muitos jeitos de falar',
    seed: 'Por que o carioca fala "chiado" e o gaúcho diz "tu": sotaques, comidas e festas das cinco regiões. De onde vieram os imigrantes de cada região.',
    angles: [
      'a mesma coisa com três nomes: mandioca, aipim e macaxeira',
      'de onde vieram os italianos, alemães e japoneses do Brasil',
      'festas regionais e o que celebram: Parintins, São João, Oktoberfest',
    ],
  },
  {
    id: 'portas-logicas', category: 'logica', depth: 3, interest: 'minecraft',
    title: 'E, OU e NÃO: a lógica das máquinas',
    seed: 'Toda decisão de um computador é feita de três portas: E, OU, NÃO. Uma porta E são dois interruptores em série; no jogo, o mesmo se monta com redstone. De onde o computador tira o "pensar".',
    angles: [
      'George Boole: o professor que inventou a lógica do computador antes de existir computador',
      'montar uma porta E com dois interruptores e uma lâmpada (ou no jogo)',
      'quantas portas cabem num chip de celular',
    ],
  },
  {
    id: 'estoicismo-obstaculo', category: 'filosofia', depth: 2,
    title: 'O obstáculo vira o caminho',
    seed: 'Marco Aurélio, imperador de Roma, escrevia um diário só para si: o que atrapalha a ação vira a ação. Quando algo dá errado há três saídas (reclamar, desistir, usar), e só uma leva a algum lugar.',
    angles: [
      'Marco Aurélio escrevendo à luz de vela depois de um dia de guerra',
      'pegar um problema desta semana e transformá-lo numa tarefa concreta',
      'atletas que voltaram melhores de uma lesão longa',
    ],
  },
  {
    id: 'metais-ferrugem', category: 'quimica', depth: 2,
    title: 'Por que o ferro enferruja e o ouro não',
    seed: 'Ferrugem é o ferro "queimando" devagar com o ar e a água. Por que o ouro dos faraós ainda brilha, como a tinta e o zinco protegem um portão e por que a Estátua da Liberdade é verde.',
    angles: [
      'o Titanic sendo comido pela ferrugem no fundo do mar',
      'experimento: três pregos, um na água, um no óleo, um no ar seco, por uma semana',
      'por que a Estátua da Liberdade era marrom e ficou verde',
    ],
  },
  {
    id: 'autocontrole', category: 'carater', depth: 2,
    title: 'Esperar vale a pena',
    seed: 'O teste do marshmallow: crianças que esperaram 15 minutos ganharam dois; os que conseguiram tinham truques (desviar o olhar, cantar). Como o cérebro de 10 anos ainda está construindo o freio.',
    angles: [
      'o teste do marshmallow e o que descobriram sobre as crianças anos depois',
      'truques que funcionam de verdade para esperar',
      'por que é mais difícil se controlar cansado ou com fome',
    ],
  },
  {
    id: 'clima-e-tempo', category: 'geografia', depth: 1,
    title: 'Tempo e clima não são a mesma coisa',
    seed: 'Por que chove tanto em Belém e tão pouco em Petrolina; o que é umidade e como o meteorologista acerta (e erra) a previsão. Tempo é hoje; clima é o costume do lugar.',
    angles: [
      'como se faz uma previsão do tempo com satélites e balões',
      'construir um pluviômetro com garrafa e medir a chuva da semana',
      'por que o deserto é gelado à noite',
    ],
  },
  {
    id: 'numeros-grandes', category: 'matematica', depth: 1,
    title: 'Milhão, bilhão e o tamanho das coisas',
    seed: 'Quanto é um milhão? Contando um número por segundo, leva 12 dias sem dormir. Como o cérebro se perde com números grandes e como estimar antes de calcular.',
    angles: [
      'a lenda do tabuleiro de xadrez e os grãos de arroz que dobram',
      'quantos segundos você já viveu (fazer a conta)',
      'como os cientistas escrevem números gigantes com potências de 10',
    ],
  },
  {
    id: 'querer-vs-precisar', category: 'dinheiro', depth: 1,
    title: 'Precisar, querer e esperar',
    seed: 'Como decidir uma compra: precisar ou querer, custo de oportunidade (o que deixo de comprar) e a regra de esperar uma semana antes de gastar com o que deu vontade na hora.',
    angles: [
      'custo de oportunidade: cada real gasto é um real que não vai para outra coisa',
      'montar um orçamento da mesada com três potes',
      'como a propaganda é desenhada para dar vontade',
    ],
  },
  {
    id: 'estrelas-vida-morte', category: 'astronomia', depth: 2, interest: 'ciencia',
    title: 'Estrelas nascem e morrem',
    seed: 'O Sol é uma estrela comum de meia-idade. Como uma estrela nasce de uma nuvem de gás, brilha por bilhões de anos e morre, às vezes explodindo em supernova. O que é um buraco negro.',
    angles: [
      'como sabemos do que uma estrela é feita só pela luz dela',
      'olhar para o céu é olhar para o passado: a luz que demora anos para chegar',
      'o que é um buraco negro e por que ele não é um buraco',
    ],
  },
  {
    id: 'ingles-perguntas', category: 'ingles', depth: 2,
    title: 'Fazer perguntas em inglês',
    seed: 'Who, what, where, when, why, how: como montar uma pergunta em inglês (e o "do" que aparece do nada). Perguntar a idade, o nome e o time de alguém.',
    angles: [
      'as 6 palavras de pergunta com um exemplo de cada',
      'jogo: adivinhar um animal só com perguntas de sim ou não',
      'por que é "do you like" e não "you like?"',
    ],
  },
  {
    id: 'sentidos', category: 'corpo', depth: 1,
    title: 'Cinco sentidos ou mais?',
    seed: 'Como olhos, ouvidos e pele viram sinais elétricos, por que o gosto depende do cheiro, e o sentido que ninguém cita: o equilíbrio. Ilusões que enganam o cérebro.',
    angles: [
      'experimento: tapar o nariz e tentar adivinhar o sabor',
      'ilusões de ótica: o que o cérebro completa sem você perceber',
      'como o morcego "enxerga" com o som',
    ],
  },
  {
    id: 'ferro-e-forja', category: 'minecraft', depth: 2, interest: 'minecraft',
    title: 'Do minério à espada',
    seed: 'Minério de ferro é ferro preso em pedra e ferrugem; a forja usa carvão para separar. Por que o ferro precisa de um pouco de carbono para virar aço, e por que a Idade do Ferro mudou tudo. O Brasil é dos maiores produtores.',
    angles: [
      'a Idade do Bronze veio antes da do Ferro: por que essa ordem',
      'o que um ferreiro fazia de verdade: aquecer, bater, temperar',
      'Minas Gerais e as montanhas de minério que viram navio',
    ],
  },
  {
    id: 'arquitetura', category: 'arte', depth: 2,
    title: 'Por que os prédios não caem',
    seed: 'Arcos, cúpulas e vigas: como os romanos construíram coisas que estão de pé há 2.000 anos, e por que um prédio moderno é concreto com ferro dentro.',
    angles: [
      'o Panteão de Roma: a cúpula que ninguém superou por 1.300 anos',
      'experimento: ponte de papel que aguenta peso se você dobrar do jeito certo',
      'como um arranha-céu balança no vento de propósito',
    ],
  },
  {
    id: 'revolucao-industrial', category: 'historia', depth: 2,
    title: 'Quando as máquinas chegaram',
    seed: 'Máquina a vapor, fábricas, trens: em 100 anos a vida mudou mais do que nos 1.000 anteriores. Como era o trabalho nas fábricas (crianças de 8 anos) e por que as cidades explodiram.',
    angles: [
      'James Watt e a chaleira: mito e verdade',
      'o que mudou numa casa entre 1800 e 1900',
      'as primeiras leis contra o trabalho infantil',
    ],
  },
  {
    id: 'corpo-do-atleta', category: 'futebol', depth: 3, interest: 'futebol',
    title: 'O que o treino faz no corpo',
    seed: 'Por que um jogador corre 10 km por jogo, o que é resistência versus explosão, o que comer antes do jogo e por que dormir é parte do treino (Cristiano Ronaldo dorme em blocos).',
    angles: [
      'como o coração de um jogador profissional é diferente',
      'montar um treino de 15 minutos com aquecimento e explicação',
      'por que alongar parado antes do jogo não ajuda como parece',
    ],
  },
  {
    id: 'motor-e-combustivel', category: 'invencoes', depth: 1,
    title: 'O que faz um carro andar',
    seed: 'Motor a combustão: uma explosão controlada dezenas de vezes por segundo empurra um pistão. Como gasolina, etanol e a bateria do carro elétrico guardam energia de jeitos diferentes.',
    angles: [
      'a primeira locomotiva e o medo de andar a 30 km/h',
      'por que o Brasil é o país do carro a álcool',
      'o que aconteceria com o mundo se o petróleo acabasse amanhã',
    ],
  },
  {
    id: 'noticia-falsa', category: 'cidadania', depth: 2,
    title: 'Isso é verdade?',
    seed: 'Uma notícia falsa se espalha mais rápido do que a verdadeira. Três perguntas para checar: quem publicou, tem fonte, outros sites sérios dizem o mesmo? Como um vídeo pode enganar.',
    angles: [
      'a Guerra dos Mundos no rádio em 1938: uma ficção, um susto e um exagero da imprensa',
      'checar uma notícia em 3 passos',
      'por que o cérebro acredita mais no que já queria acreditar',
    ],
  },
  {
    id: 'herois-e-monstros', category: 'mitologia', depth: 2,
    title: 'Hércules, Perseu e Medusa',
    seed: 'Os 12 trabalhos de Hércules e Perseu vencendo Medusa com um escudo-espelho: os heróis dos mitos vencem com astúcia, não só força. O que um herói de mito tem em comum com um herói de jogo.',
    angles: [
      'Ulisses e o ciclope: enganar em vez de lutar',
      'por que os monstros dos mitos são tão parecidos no mundo todo',
      'criar um herói com uma fraqueza e um truque',
    ],
  },
  {
    id: 'sabao-limpa', category: 'cotidiano', depth: 1,
    title: 'Como o sabão limpa',
    seed: 'A molécula do sabão tem uma ponta que gosta de água e outra que gosta de gordura: ela cerca a sujeira e a água leva embora. Por que 20 segundos de lavagem funcionam contra vírus.',
    angles: [
      'experimento: pimenta na água fugindo do detergente',
      'por que a água sozinha não tira gordura',
      'como o sabão desmonta um vírus',
    ],
  },
  {
    id: 'cadeia-alimentar', category: 'animais', depth: 3,
    title: 'Quem come quem',
    seed: 'Cadeia alimentar e equilíbrio: quando os lobos voltaram a Yellowstone, os cervos mudaram de comportamento, a mata voltou e até os rios mudaram. Por que tirar um animal de um lugar muda tudo.',
    angles: [
      'os lobos de Yellowstone e os rios que mudaram',
      'montar uma teia alimentar de um bioma brasileiro',
      'por que a onça-pintada importa para a floresta inteira',
    ],
  },
  {
    id: 'invencoes-brasileiras', category: 'brasil', depth: 3,
    title: 'Inventado no Brasil',
    seed: 'O avião do Santos Dumont, o relógio de pulso, a urna eletrônica, o Pix, o carro a álcool. Quem foram esses inventores e como o Brasil resolve problemas do seu jeito.',
    angles: [
      'Santos Dumont e o relógio de pulso feito para pilotar',
      'a urna eletrônica e por que o Brasil conta os votos em horas',
      'a Embrapa e a soja que aprendeu a crescer no Cerrado',
    ],
  },
  {
    id: 'algoritmo-receita', category: 'logica', depth: 1,
    title: 'Algoritmo é uma receita',
    seed: 'Algoritmo é uma sequência de passos que sempre funciona: receita de bolo, amarrar o cadarço, achar uma palavra no dicionário. Por que o computador precisa de cada passo escrito e o que acontece se pular um.',
    angles: [
      'procurar um número: por que começar pelo meio é mais rápido do que pelo começo',
      'escrever os passos de escovar os dentes para um robô',
      'Al-Khwarizmi: o matemático que deu nome ao algoritmo',
    ],
  },
  {
    id: 'platao-caverna', category: 'filosofia', depth: 2,
    title: 'Será que estou vendo tudo?',
    seed: 'A caverna de Platão: pessoas presas de costas para a entrada só veem sombras na parede e acham que as sombras são o mundo. Como saber se a gente está vendo só uma parte (o feed do celular, uma briga contada por um lado só).',
    angles: [
      'a história da caverna contada como se fosse um filme',
      'o feed do celular como uma caverna moderna: quem escolhe as sombras',
      'o que a ciência faz para sair da caverna: testar em vez de confiar na sombra',
    ],
  },
  {
    id: 'fogo-combustao', category: 'quimica', depth: 1,
    title: 'O que é o fogo',
    seed: 'Fogo é uma reação entre combustível, oxigênio e calor: tire um dos três e ele apaga. Por que uma vela apaga debaixo de um copo, por que se sopra a brasa e por que água não apaga fogo de óleo.',
    angles: [
      'como os humanos dominaram o fogo e o que isso mudou na comida e no cérebro',
      'experimento: vela, copo e o tempo até apagar (com adulto)',
      'o que um bombeiro faz que é o contrário do que parece',
    ],
  },
  {
    id: 'humildade', category: 'carater', depth: 1,
    title: 'Ganhar e perder com classe',
    seed: 'Humildade não é se achar pequeno; é saber o próprio tamanho. Cumprimentar o adversário, não se gabar, aprender com quem é melhor. Por que os melhores do mundo ainda têm treinador.',
    angles: [
      'Messi e o treinador: por que o melhor ainda ouve',
      'o que fazer nos 10 segundos depois de ganhar e depois de perder',
      'confiança e arrogância: qual é qual',
    ],
  },
  {
    id: 'fusos-horarios', category: 'geografia', depth: 3,
    title: 'Por que é dia aqui e noite no Japão',
    seed: 'A Terra gira, então o Sol não pode ser meio-dia para todo mundo ao mesmo tempo: fusos horários, a linha onde o dia muda de data, e por que o Brasil tem mais de um horário.',
    angles: [
      'a volta ao mundo de Magalhães: a tripulação chegou com um dia a menos no calendário',
      'calcular que horas são em Tóquio, Londres e Nova York agora',
      'por que o horário de verão existe e por que o Brasil parou de usar',
    ],
  },
  {
    id: 'medidas-e-estimativa', category: 'matematica', depth: 3,
    title: 'Medir sem régua',
    seed: 'Estimar altura, distância e peso com o corpo e com comparações: passo, palmo, sombra. Como medir a altura de uma árvore sem subir nela, e o que acontece quando alguém erra a unidade.',
    angles: [
      'como Tales mediu a pirâmide com a sombra',
      'medir o quarto em passos e conferir com fita métrica',
      'a sonda da NASA que se perdeu em Marte por misturar unidades inglesas com métricas',
    ],
  },
  {
    id: 'historia-do-dinheiro', category: 'dinheiro', depth: 1,
    title: 'Do sal ao Pix',
    seed: 'Antes do dinheiro, trocava-se sal, gado e conchas; por que a moeda resolveu o problema e como o Pix é dinheiro sem papel. O que dá valor a um papel de R$ 50, se é só papel.',
    angles: [
      'a palavra salário vem de sal',
      'por que uma nota vale algo se é só papel',
      'como seria um dia sem dinheiro nenhum, só troca',
    ],
  },
  {
    id: 'vida-fora-da-terra', category: 'astronomia', depth: 2,
    title: 'Tem alguém lá fora?',
    seed: 'Como os cientistas procuram vida: água líquida, luas de Júpiter e Saturno, planetas fora do sistema solar. Por que "não achamos" não é a mesma coisa que "não existe".',
    angles: [
      'a descoberta do primeiro planeta fora do sistema solar, em 1995',
      'o que Marte tem que faz os cientistas mandarem robôs para lá',
      'como mandaríamos uma mensagem para alguém a anos-luz de distância',
    ],
  },
  {
    id: 'ingles-tempo-verbal', category: 'ingles', depth: 2,
    title: 'Ontem, hoje e amanhã em inglês',
    seed: 'Passado, presente e futuro com verbos simples: I play, I played, I will play; os irregulares mais usados (go/went, eat/ate). Contar o que fez ontem em três frases.',
    angles: [
      'os 10 verbos irregulares que mais aparecem',
      'contar o fim de semana em inglês em 3 frases',
      'como a música em inglês ajuda a lembrar o passado dos verbos',
    ],
  },
  {
    id: 'ossos-musculos', category: 'corpo', depth: 1,
    title: 'O esqueleto que se refaz',
    seed: 'Ossos são vivos e se reconstroem: por que uma fratura cola, por que um bebê tem mais ossos do que um adulto e como os músculos puxam (nunca empurram).',
    angles: [
      'como o raio-X funciona e quem o descobriu por acidente',
      'por que astronautas perdem osso no espaço',
      'como o esporte na infância deixa o osso mais forte',
    ],
  },
  {
    id: 'camadas-da-terra', category: 'minecraft', depth: 2, interest: 'minecraft',
    title: 'As camadas da Terra de verdade',
    seed: 'Quanto mais fundo, mais quente: crosta, manto e núcleo; o buraco mais fundo já cavado tem só 12 km. Por que ouro e diamante aparecem em lugares diferentes e por que o "bedrock" não existe.',
    angles: [
      'o poço de Kola: por que pararam de cavar',
      'como os geólogos "veem" o núcleo sem ir lá: os terremotos',
      'quais biomas do jogo existem no Brasil',
    ],
  },
  {
    id: 'fotografia-cinema', category: 'arte', depth: 1,
    title: 'Como uma foto captura a luz',
    seed: 'Câmera escura: a luz entrando por um furo faz uma imagem de cabeça para baixo. O cinema é 24 fotos por segundo que o cérebro emenda em movimento.',
    angles: [
      'a primeira foto da história levou 8 horas de exposição',
      'construir uma câmera escura com uma caixa de sapato',
      'por que uma roda parece girar ao contrário no filme',
    ],
  },
  {
    id: 'segunda-guerra', category: 'historia', depth: 2,
    title: 'A maior guerra da história',
    seed: '1939 a 1945: por que começou, quem lutou (o Brasil mandou soldados para a Itália), o que foi o Holocausto contado com cuidado, e o que o mundo criou depois para tentar evitar outra: a ONU.',
    angles: [
      'os pracinhas brasileiros na Itália e a cobra que fumou',
      'Anne Frank: o diário de uma menina escondida',
      'por que a ONU foi criada e o que ela faz',
    ],
  },
  {
    id: 'arbitragem-e-regras', category: 'futebol', depth: 2, interest: 'futebol',
    title: 'Por que o juiz marcou isso',
    seed: 'As 17 regras do futebol e as que mais confundem: impedimento (com desenho), mão na bola, lei da vantagem. O que o VAR pode e não pode ver e por que o juiz corre tanto.',
    angles: [
      'a regra do impedimento e por que ela existe',
      'julgar lances reais: pênalti ou não',
      'como virar árbitro e quanto ele ganha',
    ],
  },
  {
    id: 'computador-bits', category: 'invencoes', depth: 2,
    title: 'Como um computador pensa com 0 e 1',
    seed: 'Tudo no computador é 0 e 1: letras, fotos, músicas. Como se escreve um número em binário e por que um chip com bilhões de interruptores minúsculos consegue rodar um jogo.',
    angles: [
      'Ada Lovelace e o primeiro programa, antes de existir computador',
      'contar até 31 nos dedos de uma mão com binário',
      'como uma foto vira uma lista de números',
    ],
  },
  {
    id: 'cidade-e-servicos', category: 'cidadania', depth: 1,
    title: 'Quem cuida da cidade',
    seed: 'De onde vem a luz, a água e a coleta de lixo, e para onde vai o esgoto. O que é público e o que é privado, e como reclamar de um buraco na rua pelo canal da prefeitura.',
    angles: [
      'o que acontece com o lixo depois do caminhão',
      'descobrir quem é responsável por cada coisa da sua rua',
      'como uma cidade sem saneamento vira doença',
    ],
  },
  {
    id: 'mitos-e-ciencia', category: 'mitologia', depth: 3,
    title: 'O que o mito acertou',
    seed: 'Muitos mitos guardam ciência disfarçada: o dilúvio que aparece em várias culturas, a fúria do Vesúvio, a Atlântida e a ilha que explodiu. Como separar a parte inventada da lembrança real.',
    angles: [
      'Santorini: o vulcão que pode ter inspirado a Atlântida',
      'por que tantos povos contam uma história de dilúvio',
      'o que é lenda e o que é evidência: como um arqueólogo decide',
    ],
  },
  {
    id: 'micro-ondas', category: 'cotidiano', depth: 1,
    title: 'O forno que esquenta de dentro',
    seed: 'O micro-ondas faz as moléculas de água vibrarem; por isso o prato fica frio e a comida quente, e por isso metal solta faísca. Foi descoberto por acidente com uma barra de chocolate.',
    angles: [
      'Percy Spencer e o chocolate derretido no bolso',
      'experimento: por que a comida esquenta desigual e o prato gira',
      'o que muda entre micro-ondas, forno comum e fogo',
    ],
  },
  {
    id: 'animais-extremos', category: 'animais', depth: 1,
    title: 'Recordes do mundo animal',
    seed: 'O tardígrado sobrevive no vácuo do espaço, o falcão-peregrino passa de 300 km/h, a baleia-azul tem um coração do tamanho de um carro pequeno. Por que a evolução produz extremos.',
    angles: [
      'tardígrado: o animal que sobrevive ao espaço',
      'comparar velocidades: você, um cachorro, um guepardo e um carro',
      'como a baleia-azul respira e por que ela é mamífero',
    ],
  },
  {
    id: 'escravidao-e-abolicao', category: 'brasil', depth: 2,
    title: 'O Brasil e a escravidão',
    seed: 'Por quase 350 anos, pessoas africanas foram trazidas à força para trabalhar; quilombos, resistência e a Lei Áurea de 1888. Como isso aparece na cultura (capoeira, comida, música) e nas desigualdades de hoje.',
    angles: [
      'Zumbi e o quilombo dos Palmares, que durou 100 anos',
      'capoeira, feijoada e samba: o que veio da África',
      'por que o Brasil foi o último país das Américas a abolir',
    ],
  },
  {
    id: 'enigmas-travessia', category: 'logica', depth: 1,
    title: 'O lobo, a cabra e o repolho',
    seed: 'Enigmas de travessia e de pesagem: como atravessar o rio com lobo, cabra e repolho, e achar a moeda falsa entre 12 em só 3 pesagens. O truque: pensar de trás para frente.',
    angles: [
      'resolver o enigma do rio desenhando cada estado',
      'a moeda falsa e a balança: só 3 pesagens',
      'por que trabalhar de trás para frente funciona',
    ],
  },
  {
    id: 'kant-e-se-todos', category: 'filosofia', depth: 2,
    title: 'E se todo mundo fizesse isso?',
    seed: 'Kant propôs um teste para saber se algo é certo: e se todo mundo fizesse o mesmo? Colar na prova, furar fila, mentir "só uma vez". O que o teste acerta e onde ele fica difícil de aplicar.',
    angles: [
      'Kant, o filósofo tão pontual que os vizinhos acertavam o relógio pela caminhada dele',
      'aplicar o teste em três situações de escola e ver o resultado',
      'quando duas regras boas brigam: mentir para proteger um amigo',
    ],
  },
  {
    id: 'responsabilidade', category: 'carater', depth: 1,
    title: 'Assumir o que é meu',
    seed: 'Responsabilidade é o que fica quando ninguém está olhando: a mochila, a tarefa, a consequência. Por que culpar o outro alivia na hora e atrapalha depois.',
    angles: [
      'o capitão que assume o erro da tripulação',
      'o que é seu para cuidar aos 10 anos (e o que ainda não é)',
      'como consertar quando você causou o problema',
    ],
  },
  {
    id: 'sono-e-telas', category: 'corpo', depth: 2,
    title: 'O que acontece enquanto você dorme',
    seed: 'O cérebro limpa o próprio lixo e grava o que aprendeu; a luz da tela adia o sono porque engana o relógio interno. Quantas horas aos 10 anos e o que muda no dia seguinte quando faltam.',
    angles: [
      'a descoberta do cérebro que "se lava" à noite',
      'experimento: uma semana sem tela na hora antes de dormir, anotando como acorda',
      'por que o adolescente quer dormir tarde (e não é preguiça)',
    ],
  },
  {
    id: 'cavaleiros-e-mentirosos', category: 'logica', depth: 2,
    title: 'Quem está mentindo?',
    seed: 'Na ilha dos cavaleiros (sempre verdade) e escudeiros (sempre mentira), uma pergunta certa revela tudo. Como montar tabelas de "se isso, então aquilo" para resolver.',
    angles: [
      'o enigma das duas portas e dos dois guardas',
      'montar a tabela verdadeiro/falso de um enigma',
      'o paradoxo do mentiroso: "esta frase é falsa"',
    ],
  },
  {
    id: 'navio-de-teseu', category: 'filosofia', depth: 3,
    title: 'Você ainda é o mesmo?',
    seed: 'O navio de Teseu: se trocar todas as tábuas, uma por uma, ainda é o mesmo navio? Suas células mudam quase todas ao longo dos anos; o que faz você ser você: o corpo, as memórias ou as escolhas?',
    angles: [
      'o navio de Teseu e o time de futebol que trocou todos os jogadores e o técnico',
      'quanto do seu corpo de 5 anos ainda existe hoje',
      'o que um robô precisaria ter para ser "alguém"',
    ],
  },
  {
    id: 'amizade', category: 'carater', depth: 2,
    title: 'O que faz um bom amigo',
    seed: 'Lealdade, escutar, pedir desculpas: amizade é feita de pequenas ações repetidas. A diferença entre amigo e popular, e por que uma briga não acaba uma amizade de verdade.',
    angles: [
      'Aristóteles e os três tipos de amizade: a útil, a divertida e a de verdade',
      'como pedir desculpas de um jeito que funcione',
      'amigo que faz coisa errada: o que fazer',
    ],
  },
  {
    id: 'combinacoes-contar', category: 'logica', depth: 2,
    title: 'Quantas maneiras existem?',
    seed: 'Contar sem listar: quantas camisas e calças dão quantos looks, quantas senhas de 4 dígitos existem (por que 1234 é péssima). Multiplicar em vez de contar um a um.',
    angles: [
      'quantas formas de escalar um time de 5 entre 8 amigos',
      'por que uma senha de 4 dígitos cai em minutos',
      'o jogo de Senha e a lógica de eliminar',
    ],
  },
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
