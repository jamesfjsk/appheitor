// Treinos do Engenheiro da Vila. Gerado de docs/conteudo/ENGENHEIRO_TREINOS.md (01/10/2026), sem reescrever o texto.
// Para mudar um treino, mude o documento e gere de novo.

export interface TrainingDef {
  n: number;
  title: string;
  objective?: string;
  uses?: string;
  how?: string;
  problem?: string;
  idea?: string;
  before?: string;
  choose?: string[];
  steps: string[];
  worksWhen: string[];
  deliveryQuestion?: string;
  hints: string[];
  hintsNote?: string;
  competencies: string[];
  time: string;
  xp: number;
  unlocks: number[];
  unlocksTool?: string;
}

export const ENGENHEIRO_TREINOS: TrainingDef[] = [
  {
    "n": 1,
    "title": "Conheça seu micro:bit",
    "objective": "achar as partes do micro:bit e colocar um programa nele pela primeira vez.",
    "uses": "micro:bit, cabo USB, computador.",
    "steps": [
      "Ache os botões A e B, os 25 LEDs, o logo dourado (que também é um botão) e os pinos 0, 1, 2, 3V e GND.",
      "Abra o MakeCode e crie um projeto novo.",
      "Em \"no iniciar\", coloque \"mostrar ícone\" com uma carinha feliz.",
      "Ligue o micro:bit no USB e clique em \"Baixar\"."
    ],
    "worksWhen": [
      "a carinha aparece nos LEDs."
    ],
    "hints": [
      "A luz amarela atrás da placa acendeu quando você ligou o cabo?",
      "O micro:bit aparece no computador como uma unidade chamada MICROBIT? O arquivo foi para lá?",
      "O bloco \"mostrar ícone\" está dentro de \"no iniciar\"?",
      "Clique em \"Baixar\" de novo e espere a luz de trás parar de piscar.",
      "Se o botão \"Baixar\" pedir para parear, escolha o micro:bit na lista e confirme."
    ],
    "competencies": [
      "mb-basico"
    ],
    "time": "15 min",
    "xp": 15,
    "unlocks": [
      2
    ]
  },
  {
    "n": 2,
    "title": "Mostre seu nome",
    "objective": "fazer o nome passar na matriz de LEDs.",
    "steps": [
      "Em \"sempre\", coloque \"mostrar texto\" com o seu nome.",
      "Baixe.",
      "Depois troque para \"HEITOR ENGENHEIRO\"."
    ],
    "worksWhen": [
      "o nome passa, repetindo, da direita para a esquerda."
    ],
    "hints": [
      "O cabo continua ligado?",
      "Você baixou o programa novo, ou o micro:bit ainda roda o antigo?",
      "O texto está em \"sempre\" (repete) ou em \"no iniciar\" (uma vez só)?",
      "O texto está entre as aspas do bloco?",
      "Nome comprido demora: conte até dez antes de achar que não funcionou."
    ],
    "competencies": [
      "mb-basico",
      "saidas"
    ],
    "time": "10 min",
    "xp": 15,
    "unlocks": [
      3
    ]
  },
  {
    "n": 3,
    "title": "Coração que pisca",
    "objective": "fazer um coração acender e apagar sem parar, entendendo o que \"pausa\" faz.",
    "steps": [
      "Em \"sempre\", coloque \"mostrar ícone\" (coração), \"pausa\" (500 ms), \"limpar tela\" e \"pausa\" (500 ms).",
      "Baixe.",
      "Mude as pausas para 100 e depois para 1000, e veja a diferença."
    ],
    "worksWhen": [
      "o coração pisca, e você mostra ao pai como mudar a velocidade."
    ],
    "hints": [
      "O micro:bit está ligado?",
      "O programa novo foi baixado?",
      "Tem \"limpar tela\" entre os dois estados? Sem ele, o coração nunca apaga.",
      "Tem pausa depois do \"limpar tela\"? Sem ela, o apagado dura tão pouco que não se vê.",
      "A ordem certa é: coração, pausa, limpar, pausa."
    ],
    "competencies": [
      "mb-basico",
      "saidas"
    ],
    "time": "15 min",
    "xp": 15,
    "unlocks": [
      4,
      5
    ]
  },
  {
    "n": 4,
    "title": "Botões: contador",
    "objective": "contar quantas vezes o botão foi apertado.",
    "steps": [
      "Crie a variável \"contagem\".",
      "Em \"no botão A pressionado\", \"mudar contagem por 1\" e \"mostrar número contagem\".",
      "Em \"no botão B pressionado\", \"definir contagem para 0\" e mostrar."
    ],
    "worksWhen": [
      "A soma um e B zera. Conte até 10 na frente do pai."
    ],
    "hints": [
      "Ligado?",
      "Baixado?",
      "O botão do bloco é o A mesmo, e não o B ou o A+B?",
      "\"mudar por 1\" soma; \"definir para 1\" sempre volta para 1. Qual dos dois você usou?",
      "O \"mostrar número\" precisa vir depois do \"mudar\"."
    ],
    "competencies": [
      "entradas",
      "saidas"
    ],
    "time": "20 min",
    "xp": 20,
    "unlocks": [
      6
    ]
  },
  {
    "n": 5,
    "title": "Movimento: dado eletrônico",
    "objective": "usar o sensor de movimento para sortear um número de 1 a 6.",
    "steps": [
      "Use \"ao agitar\".",
      "Dentro dele, \"mostrar número\" com \"escolher aleatório de 1 a 6\"."
    ],
    "worksWhen": [
      "a cada chacoalhada sai um número de 1 a 6. Jogue 10 vezes: o 0 e o 7 nunca aparecem."
    ],
    "hints": [
      "Ligado? No USB, chacoalhe com cuidado para o cabo não soltar. Com pilhas fica mais fácil.",
      "Baixado?",
      "O evento é \"ao agitar\", e não \"ao pressionar\"?",
      "O aleatório vai \"de 1 a 6\"? Se começar em 0, pode sair 0.",
      "Chacoalhe de verdade: um toque leve não conta como agitar."
    ],
    "competencies": [
      "entradas",
      "saidas"
    ],
    "time": "20 min",
    "xp": 20,
    "unlocks": [
      7
    ]
  },
  {
    "n": 6,
    "title": "Luz: o micro:bit que sente o escuro",
    "objective": "usar os próprios LEDs como sensor de luz e reagir quando fica escuro.",
    "steps": [
      "Em \"sempre\", use \"se nível de luz < 30 então mostrar ícone (lua), senão limpar tela\".",
      "Tampe o micro:bit com a mão."
    ],
    "worksWhen": [
      "a lua aparece no escuro e some na luz. Mostre ao pai tampando e destampando."
    ],
    "hints": [
      "Ligado?",
      "Baixado?",
      "O sensor de luz fica na frente, nos LEDs. Você tampou a frente?",
      "O sinal é \"menor que\" (<)? Com \"maior que\", o programa faz o contrário.",
      "Se a sala for escura, troque 30 por 80 e teste de novo: o número certo depende do lugar."
    ],
    "competencies": [
      "entradas"
    ],
    "time": "20 min",
    "xp": 20,
    "unlocks": [
      7
    ]
  },
  {
    "n": 7,
    "title": "LED externo: o primeiro circuito",
    "objective": "acender um LED na protoboard pelo pino 0.",
    "uses": "shield ou garras, protoboard, 1 LED, 1 resistor de 220 Ω (vermelho, vermelho, marrom), 2 fios.",
    "steps": [
      "Monte o caminho: pino 0, resistor, perna comprida do LED, perna curta do LED, GND.",
      "No código, em \"sempre\": \"escrever digital pino P0 para 1\", \"pausa 500\", \"escrever digital P0 para 0\", \"pausa 500\"."
    ],
    "worksWhen": [
      "o LED da protoboard pisca."
    ],
    "hints": [
      "O micro:bit está ligado e o shield bem encaixado?",
      "Siga o caminho com o dedo: P0, resistor, LED, GND. Algum fio está na fileira errada da protoboard?",
      "O LED tem lado: a perna comprida vai para o lado do P0. Experimente virar o LED.",
      "O código escreve no P0, no mesmo pino onde está o fio?",
      "Sem resistor, o LED pode queimar. Ele está no caminho, entre o pino e o LED?"
    ],
    "competencies": [
      "circuito",
      "atuador",
      "bancada"
    ],
    "time": "30 min",
    "xp": 25,
    "unlocks": [
      8,
      9
    ],
    "unlocksTool": "metodo"
  },
  {
    "n": 8,
    "title": "Buzzer: som de fora",
    "objective": "tocar uma melodia num buzzer ligado no pino 0.",
    "uses": "o buzzer do kit e 2 fios. A perna marcada com + (ou a mais comprida) vai no P0, e a outra no GND.",
    "steps": [
      "Ligue o buzzer: + no P0 e a outra perna no GND.",
      "Em \"no botão A pressionado\", coloque \"tocar melodia\"."
    ],
    "worksWhen": [
      "o som sai do buzzer. O alto-falante da placa pode tocar junto; tudo bem."
    ],
    "hints": [
      "Ligado?",
      "O fio da perna + está no P0?",
      "O botão A é a entrada, e o buzzer é a saída. Você está apertando o A?",
      "Tem o bloco de melodia dentro do \"no botão A pressionado\"?",
      "Buzzer tem lado: troque os dois fios de lugar e teste de novo."
    ],
    "competencies": [
      "circuito",
      "atuador"
    ],
    "time": "25 min",
    "xp": 25,
    "unlocks": [
      10
    ]
  },
  {
    "n": 9,
    "title": "Botão externo: a campainha",
    "objective": "ler um botão da protoboard no pino 1.",
    "uses": "1 botão, 2 fios.",
    "steps": [
      "Ligue uma perna do botão no P1 e a outra no GND.",
      "No código, \"no iniciar\": \"definir puxar pino P1 para cima\".",
      "Em \"sempre\": \"se ler digital P1 = 0 então mostrar ícone (sino) e tocar tom, senão limpar tela\"."
    ],
    "worksWhen": [
      "apertar o botão da protoboard mostra o sino e toca."
    ],
    "hints": [
      "Ligado?",
      "O botão atravessa o vão do meio da protoboard? As pernas precisam ficar em fileiras diferentes.",
      "O botão é a entrada, no P1. O código lê o P1?",
      "Com \"puxar para cima\", apertado vale 0, e não 1. O \"se\" compara com 0?",
      "Sem o \"puxar para cima\" no iniciar, o pino fica solto e a leitura muda sozinha."
    ],
    "competencies": [
      "circuito",
      "sensor"
    ],
    "time": "30 min",
    "xp": 25,
    "unlocks": [
      10
    ]
  },
  {
    "n": 10,
    "title": "LDR: sensor de luz de verdade",
    "objective": "medir a luz com um LDR no pino 2 e ver o número mudar.",
    "uses": "1 LDR, 1 resistor de 10 kΩ, 3 fios.",
    "steps": [
      "Monte: 3V, LDR, fileira do meio, resistor de 10 kΩ, GND. Da fileira do meio sai um fio para o P2.",
      "Em \"sempre\": \"mostrar número ler analógico P2\" e \"pausa 500\"."
    ],
    "worksWhen": [
      "o número cai (ou sobe) quando você tampa o LDR. Anote dois números, claro e escuro, e mostre ao pai."
    ],
    "hints": [
      "Ligado?",
      "O fio do P2 sai da fileira onde o LDR encontra o resistor? Tem que ser exatamente no meio dos dois.",
      "O LDR é a entrada. O código lê o P2 em analógico, e não em digital?",
      "Números grandes demoram para passar: use \"pausa 500\" ou mostre só quando mudar.",
      "Se o número não muda nada, troque o resistor: o de 10 kΩ tem as cores marrom, preto, laranja."
    ],
    "competencies": [
      "circuito",
      "sensor"
    ],
    "time": "30 min",
    "xp": 25,
    "unlocks": [
      11
    ]
  },
  {
    "n": 11,
    "title": "Combine dois componentes: luz automática",
    "objective": "juntar uma entrada e uma saída de fora num aparelho só.",
    "steps": [
      "Monte o LDR do treino 10 e o LED do treino 7 no mesmo micro:bit (LDR no P2, LED no P0).",
      "Anote o número do escuro que você mediu.",
      "Programe: se a leitura passar desse número, acende o LED; senão, apaga."
    ],
    "worksWhen": [
      "tampando o LDR, o LED acende sozinho; destampando, apaga."
    ],
    "hints": [
      "Ligado?",
      "Os dois circuitos continuam certos? Teste um de cada vez com os programas dos treinos 7 e 10.",
      "Entrada no P2, saída no P0. O código usa cada pino no lugar certo?",
      "O número do \"se\" é o que você mediu no seu quarto? Use a sua anotação.",
      "Se acende no claro e apaga no escuro, troque \"maior\" por \"menor\"."
    ],
    "competencies": [
      "circuito",
      "sensor",
      "atuador",
      "projeto"
    ],
    "time": "40 min",
    "xp": 30,
    "unlocks": [
      12
    ]
  },
  {
    "n": 12,
    "title": "Encontre o erro",
    "objective": "descobrir sozinho por que um circuito não funciona, usando o Método do Engenheiro.",
    "how": "o pai monta o circuito do treino 7 ou do 11 com um erro de propósito: LED virado, fio na fileira errada, pino trocado no código ou resistor fora do caminho. Ele não conta qual.",
    "steps": [
      "siga o Método, um passo por vez, e mude uma coisa só antes de testar de novo."
    ],
    "worksWhen": [
      "o circuito volta a funcionar;",
      "você explica ao pai qual era o erro e como achou."
    ],
    "deliveryQuestion": "\"O que estava errado e como você descobriu?\"",
    "hints": [],
    "hintsNote": "só o Método. Sem pista específica neste treino: ele existe para treinar a procura.",
    "competencies": [
      "debug",
      "circuito"
    ],
    "time": "20 a 40 min",
    "xp": 30,
    "unlocks": [
      13
    ]
  },
  {
    "n": 13,
    "title": "Modifique um projeto",
    "objective": "mudar um programa que já funciona sem quebrar o que estava certo.",
    "choose": [
      "o dado do treino 5 vira dado de 1 a 20 e mostra uma carinha quando sai 20;",
      "a campainha do treino 9 toca uma música diferente se apertar duas vezes seguidas;",
      "a luz automática do treino 11 pisca em vez de ficar acesa."
    ],
    "steps": [],
    "worksWhen": [
      "a mudança funciona e o resto continua funcionando."
    ],
    "deliveryQuestion": "\"O que você mudou e o que testou depois?\"",
    "hints": [
      "alimentação;",
      "ligação;",
      "qual parte do programa faz o que você quer mudar?;",
      "salve uma cópia antes de mexer (\"Projetos\", \"Duplicar\");",
      "mude um bloco por vez e teste a cada mudança."
    ],
    "competencies": [
      "debug",
      "projeto"
    ],
    "time": "30 min",
    "xp": 30,
    "unlocks": [
      14
    ]
  },
  {
    "n": 14,
    "title": "Primeiro projeto orientado: alarme de gaveta",
    "objective": "resolver um problema de verdade seguindo as etapas de um engenheiro: entender, planejar, montar, testar, corrigir e mostrar.",
    "problem": "\"Precisamos saber quando a gaveta foi aberta.\"",
    "idea": "dentro da gaveta fechada é escuro, e ao abrir entra luz. O sensor de luz da placa (treino 6) ou o LDR (treino 10) percebem a mudança. O micro:bit toca e mostra um ícone.",
    "before": "\"O que você pretende fazer?\" (uma linha).",
    "steps": [
      "Meça a luz com a gaveta fechada e aberta.",
      "Escolha o número do meio.",
      "Programe o alarme.",
      "Coloque o micro:bit, com pilhas, dentro da gaveta.",
      "Teste 5 vezes."
    ],
    "worksWhen": [
      "as 5 aberturas disparam o alarme e nenhum alarme toca com a gaveta fechada."
    ],
    "deliveryQuestion": "\"Deu algum problema antes de funcionar? O que você mudou?\"",
    "hints": [
      "As pilhas estão boas e bem encaixadas?",
      "O micro:bit ficou com os LEDs virados para cima, onde a luz entra?",
      "A luz é a entrada e o som, a saída. Tem os dois no código?",
      "O número do \"se\" veio das suas duas medições?",
      "Se toca com a gaveta fechada, sobra uma fresta de luz: suba o número."
    ],
    "competencies": [
      "projeto",
      "sensor",
      "debug"
    ],
    "time": "2 a 3 dias",
    "xp": 40,
    "unlocks": [
      15
    ]
  }
];

/** O marco 15 não é treino: o painel avisa o pai. */
export const ENGENHEIRO_MARCO = {
  "n": 15,
  "title": "Marco: primeira encomenda de engenharia",
  "notes": [
    "Não é treino. O painel avisa o pai: \"Ele está pronto para a primeira encomenda de engenharia.\"",
    "O modelo \"Projeto de engenharia\" já vem preenchido com uma sugestão: \"Luz automática para a caixa de ferramentas\" (faixa projeto, cerca de 1 D).",
    "A partir daqui, os projetos pagos contam para o título de Engenheiro."
  ]
};
