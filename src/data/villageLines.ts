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
    'Cerca no lugar. Um dia ruim não apaga as tochas.',
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
