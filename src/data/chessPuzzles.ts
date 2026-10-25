// Gerado por scripts/build-chess-puzzles.mjs. Não editar à mão.
// Desafios do Sábio: brancas jogam e dão xeque-mate em 1. Todo lance que dá mate vale.

export type PuzzleTheme = "corredor" | "beijo" | "cavalo" | "escada" | "diagonal";

export interface ChessPuzzle {
  id: string;
  theme: PuzzleTheme;
  fen: string;
  /** lances que dão mate (SAN) */
  mates: string[];
}

export const PUZZLE_THEMES: Record<PuzzleTheme, { name: string; tip: string }> = {
  corredor: { name: "Mate do corredor", tip: "O rei preto está preso atrás dos próprios peões. Uma peça na última fileira resolve." },
  beijo: { name: "Dama e rei juntos", tip: "O rei branco chega perto e fecha as fugas. A dama dá o mate." },
  cavalo: { name: "Mate do cavalo", tip: "O rei está cercado pelas próprias peças. Só o cavalo, que pula, consegue dar xeque." },
  escada: { name: "Escada das torres", tip: "Uma torre segura uma fileira e a outra dá o mate na de cima." },
  diagonal: { name: "Dama e bispo", tip: "O bispo, de longe, protege a casa onde a dama vai dar o mate." },
};

export const CHESS_PUZZLES: ChessPuzzle[] = [
  { id: "corredor-1", theme: "corredor", fen: "6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1", mates: ["Rd8#"] },
  { id: "beijo-2", theme: "beijo", fen: "5k2/8/5K2/8/8/8/8/3Q4 w - - 0 1", mates: ["Qd8#"] },
  { id: "cavalo-1", theme: "cavalo", fen: "1q4rk/6pp/8/6N1/8/1Q6/8/6K1 w - - 0 1", mates: ["Nf7#"] },
  { id: "escada-1", theme: "escada", fen: "7k/R7/8/8/8/8/8/1R4K1 w - - 0 1", mates: ["Rb8#"] },
  { id: "diagonal-1", theme: "diagonal", fen: "6k1/5p1p/6pQ/8/8/2B5/5PPP/6K1 w - - 0 1", mates: ["Qg7#"] },
  { id: "corredor-1e", theme: "corredor", fen: "1k6/ppp5/8/8/8/8/PPP5/1K2R3 w - - 0 1", mates: ["Re8#"] },
  { id: "beijo-2e", theme: "beijo", fen: "2k5/8/2K5/8/8/8/8/4Q3 w - - 0 1", mates: ["Qe8#"] },
  { id: "cavalo-1e", theme: "cavalo", fen: "kr4q1/pp6/8/1N6/8/6Q1/8/1K6 w - - 0 1", mates: ["Nc7#"] },
  { id: "escada-1e", theme: "escada", fen: "k7/7R/8/8/8/8/8/1K4R1 w - - 0 1", mates: ["Rg8#"] },
  { id: "diagonal-1e", theme: "diagonal", fen: "1k6/p1p5/Qp6/8/8/5B2/PPP5/1K6 w - - 0 1", mates: ["Qb7#"] },
  { id: "corredor-3", theme: "corredor", fen: "6k1/5ppp/1p6/8/8/8/6PP/4R2K w - - 0 1", mates: ["Re8#"] },
  { id: "beijo-3", theme: "beijo", fen: "6k1/8/6K1/8/8/8/8/Q7 w - - 0 1", mates: ["Qa8#","Qg7#"] },
  { id: "cavalo-2", theme: "cavalo", fen: "r5rk/6pp/8/4N3/8/8/8/6K1 w - - 0 1", mates: ["Nf7#"] },
  { id: "escada-2", theme: "escada", fen: "4k3/7R/8/8/8/8/R7/2K5 w - - 0 1", mates: ["Ra8#"] },
  { id: "corredor-3e", theme: "corredor", fen: "1k6/ppp5/6p1/8/8/8/PP6/K2R4 w - - 0 1", mates: ["Rd8#"] },
  { id: "beijo-3e", theme: "beijo", fen: "1k6/8/1K6/8/8/8/8/7Q w - - 0 1", mates: ["Qb7#","Qh8#"] },
  { id: "cavalo-2e", theme: "cavalo", fen: "kr5r/pp6/8/3N4/8/8/8/1K6 w - - 0 1", mates: ["Nc7#"] },
  { id: "escada-2e", theme: "escada", fen: "3k4/R7/8/8/8/8/7R/5K2 w - - 0 1", mates: ["Rh8#"] },
  { id: "corredor-4", theme: "corredor", fen: "6k1/pp3ppp/8/8/8/8/6PP/2Q3K1 w - - 0 1", mates: ["Qc8#"] },
  { id: "beijo-4", theme: "beijo", fen: "2k5/8/2K5/8/8/8/7Q/8 w - - 0 1", mates: ["Qc7#","Qh8#"] },
  { id: "escada-3", theme: "escada", fen: "3k4/1R6/8/8/8/7R/8/4K3 w - - 0 1", mates: ["Rh8#"] },
  { id: "corredor-4e", theme: "corredor", fen: "1k6/ppp3pp/8/8/8/8/PP6/1K3Q2 w - - 0 1", mates: ["Qf8#"] },
  { id: "beijo-4e", theme: "beijo", fen: "5k2/8/5K2/8/8/8/Q7/8 w - - 0 1", mates: ["Qa8#","Qf7#"] },
  { id: "escada-3e", theme: "escada", fen: "4k3/6R1/8/8/8/R7/8/3K4 w - - 0 1", mates: ["Ra8#"] },
];
