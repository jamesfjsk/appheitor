// ========================================
// 🎁 SISTEMA DE RECOMPENSAS POR NÍVEL
// ========================================

export interface LevelRewardTemplate {
  title: string;
  description: string;
  category: 'toy' | 'activity' | 'treat' | 'privilege' | 'custom';
  costGold: number;
  emoji: string;
  requiredLevel: number;
  levelRange: string;
}

export const LEVEL_REWARD_TEMPLATES: LevelRewardTemplate[] = [
  // Níveis 1-5: Guloseimas básicas
  {
    title: 'Doce especial',
    description: 'Um doce gostoso como recompensa',
    category: 'treat',
    costGold: 15,
    emoji: 'candy',
    requiredLevel: 1,
    levelRange: 'Flash Iniciante'
  },
  {
    title: 'Biscoito favorito',
    description: 'Seu biscoito preferido de sobremesa',
    category: 'treat',
    costGold: 20,
    emoji: 'cookie',
    requiredLevel: 3,
    levelRange: 'Flash Iniciante'
  },
  {
    title: 'Sorvete pequeno',
    description: 'Um sorvete delicioso',
    category: 'treat',
    costGold: 25,
    emoji: 'ice-cream',
    requiredLevel: 5,
    levelRange: 'Flash Iniciante'
  },

  // Níveis 6-10: Tempo extra de tela
  {
    title: '15 min de videogame extra',
    description: 'Tempo adicional para jogar seus jogos favoritos',
    category: 'activity',
    costGold: 30,
    emoji: 'gamepad',
    requiredLevel: 6,
    levelRange: 'Flash Iniciante'
  },
  {
    title: '30 min de tablet extra',
    description: 'Tempo adicional no tablet ou celular',
    category: 'activity',
    costGold: 45,
    emoji: 'phone',
    requiredLevel: 8,
    levelRange: 'Flash Iniciante'
  },
  {
    title: '1 hora de TV extra',
    description: 'Uma hora a mais de desenho ou filme',
    category: 'activity',
    costGold: 60,
    emoji: 'tv',
    requiredLevel: 10,
    levelRange: 'Flash Iniciante'
  },

  // Níveis 11-20: Escolhas familiares
  {
    title: 'Escolher o filme da noite',
    description: 'Você decide qual filme assistir em família',
    category: 'privilege',
    costGold: 50,
    emoji: 'movie',
    requiredLevel: 11,
    levelRange: 'Flash Aprendiz'
  },
  {
    title: 'Escolher o lanche',
    description: 'Você decide o lanche da tarde',
    category: 'privilege',
    costGold: 40,
    emoji: 'sandwich',
    requiredLevel: 15,
    levelRange: 'Flash Aprendiz'
  },
  {
    title: 'Escolher o jantar',
    description: 'Você decide o que vamos jantar hoje',
    category: 'privilege',
    costGold: 75,
    emoji: 'pizza',
    requiredLevel: 20,
    levelRange: 'Flash Aprendiz'
  },

  // Níveis 21-35: Atividades especiais
  {
    title: 'Ida ao parque',
    description: 'Um passeio especial no parque',
    category: 'activity',
    costGold: 100,
    emoji: 'park',
    requiredLevel: 21,
    levelRange: 'Flash Aprendiz'
  },
  {
    title: 'Sessão de cinema',
    description: 'Ir ao cinema assistir um filme',
    category: 'activity',
    costGold: 150,
    emoji: 'theater',
    requiredLevel: 25,
    levelRange: 'Flash Aprendiz'
  },
  {
    title: 'Dia na piscina',
    description: 'Um dia inteiro de diversão na piscina',
    category: 'activity',
    costGold: 120,
    emoji: 'swim',
    requiredLevel: 30,
    levelRange: 'Flash Júnior'
  },
  {
    title: 'Festa do pijama',
    description: 'Convidar um amigo para dormir em casa',
    category: 'activity',
    costGold: 200,
    emoji: 'home',
    requiredLevel: 35,
    levelRange: 'Flash Júnior'
  },

  // Níveis 36-50: Brinquedos pequenos
  {
    title: 'Carrinho novo',
    description: 'Um carrinho legal para brincar',
    category: 'toy',
    costGold: 180,
    emoji: 'car',
    requiredLevel: 36,
    levelRange: 'Flash Júnior'
  },
  {
    title: 'Boneco de ação',
    description: 'Um super-herói para suas aventuras',
    category: 'toy',
    costGold: 220,
    emoji: 'hero',
    requiredLevel: 40,
    levelRange: 'Flash Júnior'
  },
  {
    title: 'Jogo de tabuleiro',
    description: 'Um jogo novo para jogar em família',
    category: 'toy',
    costGold: 250,
    emoji: 'dice',
    requiredLevel: 45,
    levelRange: 'Flash Júnior'
  },
  {
    title: 'Kit de arte',
    description: 'Materiais para desenhar e criar',
    category: 'toy',
    costGold: 200,
    emoji: 'art',
    requiredLevel: 50,
    levelRange: 'Flash Júnior'
  },

  // Níveis 51-75: Brinquedos médios, roupas
  {
    title: 'Camiseta do Flash',
    description: 'Uma camiseta oficial do seu herói favorito',
    category: 'toy',
    costGold: 300,
    emoji: 'shirt',
    requiredLevel: 51,
    levelRange: 'Flash Responsável'
  },
  {
    title: 'Tênis novo',
    description: 'Um tênis legal para correr como o Flash',
    category: 'toy',
    costGold: 400,
    emoji: 'sneaker',
    requiredLevel: 60,
    levelRange: 'Flash Responsável'
  },
  {
    title: 'LEGO médio',
    description: 'Um set LEGO para construir aventuras',
    category: 'toy',
    costGold: 500,
    emoji: 'lego',
    requiredLevel: 70,
    levelRange: 'Flash Responsável'
  },
  {
    title: 'Bicicleta nova',
    description: 'Uma bicicleta para suas aventuras',
    category: 'toy',
    costGold: 800,
    emoji: 'bike',
    requiredLevel: 75,
    levelRange: 'Flash Responsável'
  },

  // Níveis 76-90: Eletrônicos, passeios grandes
  {
    title: 'Fone de ouvido gamer',
    description: 'Fone especial para jogos',
    category: 'toy',
    costGold: 600,
    emoji: 'headphones',
    requiredLevel: 76,
    levelRange: 'Flash Disciplinado'
  },
  {
    title: 'Tablet próprio',
    description: 'Seu próprio tablet para estudar e se divertir',
    category: 'toy',
    costGold: 1200,
    emoji: 'phone',
    requiredLevel: 80,
    levelRange: 'Flash Disciplinado'
  },
  {
    title: 'Viagem de fim de semana',
    description: 'Uma viagem especial em família',
    category: 'activity',
    costGold: 1000,
    emoji: 'plane',
    requiredLevel: 85,
    levelRange: 'Flash Disciplinado'
  },
  {
    title: 'Console de videogame',
    description: 'Seu próprio console para jogar',
    category: 'toy',
    costGold: 1500,
    emoji: 'gamepad',
    requiredLevel: 90,
    levelRange: 'Flash Disciplinado'
  },

  // Níveis 91-100: Recompensas épicas
  {
    title: 'Viagem dos sonhos',
    description: 'Uma viagem incrível para onde você quiser',
    category: 'activity',
    costGold: 8000,
    emoji: 'beach',
    requiredLevel: 91,
    levelRange: 'Flash Master'
  },
  {
    title: 'Festa de aniversário épica',
    description: 'Uma festa de aniversário inesquecível',
    category: 'activity',
    costGold: 6000,
    emoji: 'party',
    requiredLevel: 95,
    levelRange: 'Flash Master'
  },
  {
    title: 'Presente especial dos sonhos',
    description: 'O presente que você sempre quis',
    category: 'custom',
    costGold: 10000,
    emoji: 'gift',
    requiredLevel: 100,
    levelRange: 'Flash Master'
  }
];

export function isRewardUnlocked(requiredLevel: number, currentLevel: number): boolean {
  return currentLevel >= requiredLevel;
}