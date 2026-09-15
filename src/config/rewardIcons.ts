export interface RewardIconDef {
  id: string;
  label: string;
  file: string;
}

const file = (id: string) => `/assets/village/rewards/${id}.png`;

export const REWARD_ICONS: RewardIconDef[] = [
  { id: 'amigo', label: 'Chamar amigo', file: file('amigo') },
  { id: 'bicicleta', label: 'Bicicleta', file: file('bicicleta') },
  { id: 'blocos', label: 'Blocos de montar', file: file('blocos') },
  { id: 'brinquedo', label: 'Brinquedo', file: file('brinquedo') },
  { id: 'carrinho', label: 'Carrinho', file: file('carrinho') },
  { id: 'chocolate', label: 'Chocolate', file: file('chocolate') },
  { id: 'chuteira', label: 'Chuteira', file: file('chuteira') },
  { id: 'dinheiro', label: 'Dinheiro', file: file('dinheiro') },
  { id: 'doce', label: 'Doce', file: file('doce') },
  { id: 'dormir-tarde', label: 'Dormir tarde', file: file('dormir-tarde') },
  { id: 'filme', label: 'Filme', file: file('filme') },
  { id: 'futebol', label: 'Futebol', file: file('futebol') },
  { id: 'hamburguer', label: 'Hambúrguer', file: file('hamburguer') },
  { id: 'jantar', label: 'Escolha do jantar', file: file('jantar') },
  { id: 'livro', label: 'Livro', file: file('livro') },
  { id: 'mochila', label: 'Mochila', file: file('mochila') },
  { id: 'passeio', label: 'Passeio', file: file('passeio') },
  { id: 'pelucia', label: 'Pelúcia', file: file('pelucia') },
  { id: 'pesca', label: 'Vara de pesca', file: file('pesca') },
  { id: 'pipoca', label: 'Pipoca', file: file('pipoca') },
  { id: 'piscina', label: 'Piscina', file: file('piscina') },
  { id: 'pizza', label: 'Pizza', file: file('pizza') },
  { id: 'presente', label: 'Presente', file: file('presente') },
  { id: 'refrigerante', label: 'Refrigerante', file: file('refrigerante') },
  { id: 'skate', label: 'Skate', file: file('skate') },
  { id: 'sorvete', label: 'Sorvete', file: file('sorvete') },
  { id: 'tablet', label: 'Tablet', file: file('tablet') },
  { id: 'tabuleiro', label: 'Tabuleiro', file: file('tabuleiro') },
  { id: 'tela', label: 'Tempo de tela', file: file('tela') },
  { id: 'videogame', label: 'Videogame', file: file('videogame') },
];

const ALIAS: Record<string, string> = {
  dormir: 'dormir-tarde',
};

export const REWARD_ICON_BY_ID: Record<string, RewardIconDef> = Object.fromEntries(
  REWARD_ICONS.map((i) => [i.id, i])
);

export function rewardIconSrc(emoji: string): string | null {
  if (!emoji?.startsWith('reward:')) return null;
  const raw = emoji.slice('reward:'.length);
  const id = ALIAS[raw] || raw;
  return REWARD_ICON_BY_ID[id]?.file ?? null;
}
