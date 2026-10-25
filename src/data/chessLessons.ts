// Escola do Sábio (25/10/2026): uma lição por peça. A peça sozinha no tabuleiro pega os diamantes;
// a meta de lances mostra o caminho mais curto. Brancas sempre na vez (o tabuleiro é de treino).
import type { PieceType } from '../services/arena/chessGame';

export interface ChessLesson {
  id: string;
  piece: PieceType;
  title: string;
  /** o Sábio explica antes de começar */
  intro: string;
  /** o Sábio comemora no fim */
  done: string;
  fen: string;
  targets: string[];
  /** menor número de lances que pega tudo */
  par: number;
}

export const CHESS_LESSONS: ChessLesson[] = [
  {
    id: 'torre',
    piece: 'r',
    title: 'A torre',
    intro: 'A torre anda em linha reta: para a frente, para trás e para os lados, quantas casas quiser. Pegue os 3 diamantes.',
    done: 'Isso! A torre manda nas linhas abertas.',
    fen: '8/8/8/8/8/8/8/R7 w - - 0 1',
    targets: ['a5', 'e5', 'e8'],
    par: 3,
  },
  {
    id: 'bispo',
    piece: 'b',
    title: 'O bispo',
    intro: 'O bispo anda só na diagonal, quantas casas quiser. Repare: ele nunca muda a cor da casa.',
    done: 'Viu? Ele começou na casa escura e terminou na casa escura.',
    fen: '8/8/8/8/8/8/8/2B5 w - - 0 1',
    targets: ['a3', 'd6', 'h2'],
    par: 3,
  },
  {
    id: 'dama',
    piece: 'q',
    title: 'A dama',
    intro: 'A dama junta a torre e o bispo: anda reto e na diagonal. É a peça mais forte do jogo.',
    done: 'A dama vai longe. Por isso não se perde a dama à toa.',
    fen: '8/8/8/8/8/8/8/3Q4 w - - 0 1',
    targets: ['d7', 'a4', 'h4'],
    par: 3,
  },
  {
    id: 'rei',
    piece: 'k',
    title: 'O rei',
    intro: 'O rei anda uma casa só, para qualquer lado. Ele é lento, mas é o mais importante: sem rei, acabou o jogo.',
    done: 'Devagar e sempre. Proteger o rei é o primeiro trabalho.',
    fen: '8/8/8/8/8/8/8/4K3 w - - 0 1',
    targets: ['e2', 'f3', 'e4'],
    par: 3,
  },
  {
    id: 'cavalo',
    piece: 'n',
    title: 'O cavalo',
    intro: 'O cavalo anda em L: duas casas para um lado e uma para o outro. Ele é o único que pula por cima das peças.',
    done: 'Pulou por cima de tudo! O L confunde muita gente; você já pegou o jeito.',
    fen: '8/8/8/8/8/8/PPPP4/1N6 w - - 0 1',
    targets: ['c3', 'd5', 'f6'],
    par: 3,
  },
  {
    id: 'peao',
    piece: 'p',
    title: 'O peão',
    intro: 'O peão anda para a frente uma casa (na primeira vez, pode andar duas). Para pegar, ele vai na diagonal. Se chegar ao fim do tabuleiro, vira outra peça!',
    done: 'De peão a dama! Todo peão sonha em chegar lá.',
    fen: '8/8/8/3p4/8/8/4P3/8 w - - 0 1',
    targets: ['e4', 'd5', 'd8'],
    par: 5,
  },
];

/** Estrelas da lição: na meta, 3; até 2 lances a mais, 2; senão, 1. */
export function lessonStars(moves: number, par: number): 1 | 2 | 3 {
  if (moves <= par) return 3;
  if (moves <= par + 2) return 2;
  return 1;
}
