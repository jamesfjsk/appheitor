export const VILLAGE_LINES = {
  sabio: [
    { id: 's1', text: 'Antes de minerar, o livro do dia.' },
    { id: 's2', text: 'As missões de casa pagam o ouro da vila.' },
    { id: 's3', text: 'O Baú do Dia abre à noite, quando o trabalho acabou.' },
  ],
  comerciante: [
    { id: 'c1', text: 'Gold bem gasto vira coisa boa. Gold jogado some.' },
    { id: 'c2', text: 'Olha o preço duas vezes. Eu olho três.' },
    { id: 'c3', text: 'Se faltar gold, espera. A pressa cobra juros.' },
  ],
  ferreiro: [
    { id: 'f1', text: 'Três de um, um de outro. Sem conversa.' },
    { id: 'f2', text: 'Picareta boa, missão mais rica.' },
    { id: 'f3', text: 'Sem ferro não sobe de nível. Simples.' },
  ],
  olheiro: [
    { id: 'o1', text: 'Eu olho o campo. Você olha as missões.' },
    { id: 'o2', text: 'Quem observa bem escolhe o time certo.' },
    { id: 'o3', text: 'A Torre mostra o que você já ganhou.' },
  ],
};

const BUILD_LINES: Record<string, [string, string, string]> = {
  fornalha: [
    'Fornalha acesa. O ferro começa aqui.',
    'Agora funde. Três de um, um de outro.',
    'Queima madeira, sai redstone. Cuida do fogo.',
  ],
  bau: [
    'Armazém de pé. Guarda o que for seu.',
    'Baú do Dia rende mais material.',
    'Esmeralda mais cedo. Não espalha as coisas.',
  ],
  cerca: [
    'Cerca simples na entrada. Um dia ruim não apaga as tochas.',
    'Rachadura some sozinha. Ainda vale consertar.',
    'Penalidade curta. Planejou, protegeu.',
  ],
  torre: [
    'Torre no morro. Sobe quando quiser ver o que já ganhou.',
    'Recordes ficam lá em cima. Não perde.',
    'Desafio e mapa de habilidades. Olha com calma.',
  ],
  mesa: [
    'Mesa do Sábio. Amanhã a história é a que você pediu.',
    'Estante de erros. Errou, aprende.',
    'Uma dica grátis no Recado. Não desperdice.',
  ],
  campinho: [
    'Campinho aberto. Bola e missão no fim de semana.',
    'Sábado e domingo pagam mais material.',
    'Torneio no mês. Recorde na Torre.',
  ],
  arena: [
    'Coliseu no gramado. O tabuleiro espera o pai.',
    'Melhor de 3. Recorde na Torre.',
    'A Placa avisa quando for a sua vez.',
  ],
  cofre: [
    'Cofre no chão. Meta uma de cada vez.',
    'Duas metas e juros. Quem guarda, constrói.',
    'Faixa da temporada. Extrato no mês.',
  ],
  agenda: [
    'Sino no lugar. Hoje e amanhã ficam na Placa.',
    'Agenda não tem segundo nível. Usa o que tem.',
    'Agenda não tem segundo nível. Usa o que tem.',
  ],
  mercado: [
    'Barraca montada. Agora a gente faz negócio.',
    'Mercado é um. Não tem melhorar por agora.',
    'Mercado é um. Não tem melhorar por agora.',
  ],
};

export function buildLine(id: string, level: number): string {
  const set = BUILD_LINES[id];
  const i = Math.max(0, Math.min(2, (level || 1) - 1));
  return set ? set[i] : (level <= 1 ? 'Tá de pé. Agora trabalha.' : 'Ficou mais forte. Bom material.');
}

export function repairLine(): string {
  return 'Levantei. Não deixa cair de novo.';
}

/** Banco de 30 falas do Sábio para a manhã seguinte ao check-in. */
export const SAGE_REPLIES: string[] = [
  'Bom dia. O turno de ontem ficou registrado.',
  'Anotei o recado. Hoje é outro dia.',
  'Quem fecha o dia dorme mais leve.',
  'Água, alongar, gentileza, tela. Quatro tochas pequenas.',
  'Amanhã começa agora, na primeira missão.',
  'O Baú espera quem fez o turno, não quem prometeu.',
  'Gold bem gasto vira coisa boa. Gold jogado some.',
  'Uma missão de manhã vale duas de pressa.',
  'Se faltou ontem, hoje não cobra juros. Só trabalho.',
  'A Vila não grita. Ela espera você.',
  'Três palavras para amanhã já mudam o turno.',
  'Tela apagada cedo é minério raro.',
  'Gentileza não paga gold. Paga o time.',
  'Alongou? A picareta agradece.',
  'Um gole de água vale mais que pressa.',
  'O Ferreiro não fala muito. Ele constrói.',
  'O Comerciante conta duas vezes. Você também.',
  'O Olheiro olha o campo. Você olha a lista.',
  'Tocha acesa é dia feito, não dia perfeito.',
  'Guardar 20% ensina mais que gastar 100.',
  'A prova não é emprego. É o livro do dia.',
  'Inglês na Mina não paga ouro extra. Paga palavra.',
  'Pedido do NPC não é missão. É história.',
  'Fechar o dia não cobra. Só escuta.',
  'Se o recado de amanhã for curto, o turno fica claro.',
  'Constância é sete tochas, não um dia sozinho.',
  'A Cerca protege um dia ruim. Você protege o próximo.',
  'Nível novo não apaga o ouro. Apaga só o XP.',
  'A Torre mostra o que já é seu. Olha lá.',
  'Hoje: uma de cada vez. Depois, o Baú.',
];

