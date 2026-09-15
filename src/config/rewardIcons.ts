export interface RewardIconDef {
  id: string;
  label: string;
  file: string;
}

const file = (id: string) => `/assets/village/rewards/${id}.png`;

export const REWARD_ICONS: RewardIconDef[] = [
  { id: 'doce', label: 'Doce', file: file('doce') },
  { id: 'sorvete', label: 'Sorvete', file: file('sorvete') },
  { id: 'pizza', label: 'Pizza', file: file('pizza') },
  { id: 'brinquedo', label: 'Brinquedo', file: file('brinquedo') },
  { id: 'videogame', label: 'Videogame', file: file('videogame') },
  { id: 'tela', label: 'Tempo de tela', file: file('tela') },
  { id: 'filme', label: 'Filme', file: file('filme') },
  { id: 'pesca', label: 'Vara de pesca', file: file('pesca') },
  { id: 'bicicleta', label: 'Bicicleta', file: file('bicicleta') },
  { id: 'futebol', label: 'Futebol', file: file('futebol') },
  { id: 'passeio', label: 'Passeio', file: file('passeio') },
  { id: 'dormir', label: 'Dormir tarde', file: file('dormir') },
  { id: 'dinheiro', label: 'Dinheiro', file: file('dinheiro') },
  { id: 'livro', label: 'Livro', file: file('livro') },
  { id: 'blocos', label: 'Blocos de montar', file: file('blocos') },
  { id: 'jantar', label: 'Escolha do jantar', file: file('jantar') },
  { id: 'parque', label: 'Parque', file: file('parque') },
  { id: 'cinema', label: 'Cinema', file: file('cinema') },
  { id: 'amigo', label: 'Chamar amigo', file: file('amigo') },
  { id: 'musica', label: 'Música', file: file('musica') },
  { id: 'desenho', label: 'Desenhar', file: file('desenho') },
  { id: 'piscina', label: 'Piscina', file: file('piscina') },
  { id: 'lanche', label: 'Lanche especial', file: file('lanche') },
  { id: 'poster', label: 'Pôster', file: file('poster') },
  { id: 'bola', label: 'Bola nova', file: file('bola') },
  { id: 'jogo', label: 'Jogo novo', file: file('jogo') },
  { id: 'acampamento', label: 'Acampamento', file: file('acampamento') },
  { id: 'massagem', label: 'Massagem', file: file('massagem') },
  { id: 'chocolate', label: 'Chocolate', file: file('chocolate') },
  { id: 'surpresa', label: 'Surpresa do pai', file: file('surpresa') },
];

export const REWARD_ICON_BY_ID: Record<string, RewardIconDef> = Object.fromEntries(
  REWARD_ICONS.map((i) => [i.id, i])
);

export function rewardIconSrc(emoji: string): string | null {
  if (!emoji?.startsWith('reward:')) return null;
  const id = emoji.slice('reward:'.length);
  return REWARD_ICON_BY_ID[id]?.file ?? null;
}
