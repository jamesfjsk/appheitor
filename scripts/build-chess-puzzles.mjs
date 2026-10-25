// Desafios do Sábio (25/10/2026): "xeque-mate em 1" montados a partir dos mates clássicos, conferidos pelo chess.js.
// Uso: node scripts/build-chess-puzzles.mjs  -> src/data/chessPuzzles.ts
import fs from 'node:fs';
import path from 'node:path';
import { Chess } from 'chess.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const FILES = 'abcdefgh';

/** Monta o FEN a partir de { a1: 'K', g8: 'k', ... }, brancas jogam. */
function fenOf(pieces) {
  const rows = [];
  for (let rank = 8; rank >= 1; rank--) {
    let row = '';
    let empty = 0;
    for (const f of FILES) {
      const p = pieces[`${f}${rank}`];
      if (p) {
        if (empty) row += empty;
        empty = 0;
        row += p;
      } else empty += 1;
    }
    if (empty) row += empty;
    rows.push(row);
  }
  return `${rows.join('/')} w - - 0 1`;
}

const mirror = (pieces) => Object.fromEntries(Object.entries(pieces).map(([sq, p]) => [`${FILES[7 - FILES.indexOf(sq[0])]}${sq[1]}`, p]));

function mates(fen) {
  let c;
  try {
    c = new Chess(fen);
  } catch {
    return null;
  }
  if (c.inCheck()) return null;
  const out = [];
  for (const m of c.moves({ verbose: true })) {
    c.move(m);
    if (c.isCheckmate()) out.push(m.san);
    c.undo();
  }
  return out;
}

const THEMES = {
  corredor: {
    name: 'Mate do corredor',
    tip: 'O rei preto está preso atrás dos próprios peões. Uma peça na última fileira resolve.',
    variants: [
      { K: 'g1', P: ['f2', 'g2', 'h2'], R: 'd1', k: 'g8', p: ['f7', 'g7', 'h7'] },
      { K: 'g1', P: ['f2', 'g2', 'h2'], R: 'a1', k: 'h8', p: ['g7', 'h7'], extra: { f8: 'b' } },
      { K: 'h1', P: ['g2', 'h2'], R: 'e1', k: 'g8', p: ['f7', 'g7', 'h7'], extra: { b6: 'p' } },
      { K: 'g1', P: ['g2', 'h2'], Q: 'c1', k: 'g8', p: ['f7', 'g7', 'h7'], extra: { a7: 'p', b7: 'p' } },
    ],
  },
  beijo: {
    name: 'Dama e rei juntos',
    tip: 'O rei branco chega perto e fecha as fugas. A dama dá o mate.',
    variants: [
      { K: 'b6', Q: 'h7', k: 'a8' },
      { K: 'f6', Q: 'd1', k: 'f8' },
      { K: 'g6', Q: 'a1', k: 'g8' },
      { K: 'c6', Q: 'h2', k: 'c8' },
    ],
  },
  cavalo: {
    name: 'Mate do cavalo',
    tip: 'O rei está cercado pelas próprias peças. Só o cavalo, que pula, consegue dar xeque.',
    variants: [
      { K: 'g1', N: 'g5', Q: 'b3', k: 'h8', p: ['g7', 'h7'], extra: { g8: 'r', b8: 'q' } },
      { K: 'g1', N: 'e5', k: 'h8', p: ['g7', 'h7'], extra: { g8: 'r', a8: 'r' } },
      { K: 'h1', N: 'h6', k: 'h8', p: ['g7', 'h7'], extra: { g8: 'r', c7: 'q' } },
    ],
  },
  escada: {
    name: 'Escada das torres',
    tip: 'Uma torre segura uma fileira e a outra dá o mate na de cima.',
    variants: [
      { K: 'g1', R: 'a7', R2: 'b1', k: 'h8' },
      { K: 'c1', R: 'h7', R2: 'a2', k: 'e8' },
      { K: 'e1', R: 'b7', R2: 'h3', k: 'd8' },
    ],
  },
  diagonal: {
    name: 'Dama e bispo',
    tip: 'O bispo, de longe, protege a casa onde a dama vai dar o mate.',
    variants: [
      { K: 'g1', P: ['f2', 'g2', 'h2'], Q: 'h6', B: 'c3', k: 'g8', p: ['f7', 'g6', 'h7'] },
      { K: 'g1', P: ['g2', 'h2'], Q: 'g4', B: 'd3', k: 'h8', p: ['g7', 'f7'], extra: { f8: 'r' } },
      { K: 'b1', P: ['a2', 'b2'], Q: 'f6', B: 'b2', k: 'g8', p: ['f7', 'h7', 'g6'], extra: {} },
    ],
  },
};

function piecesOf(v) {
  const out = {};
  out[v.K] = 'K';
  out[v.k] = 'k';
  for (const sq of v.P ?? []) out[sq] = 'P';
  for (const sq of v.p ?? []) out[sq] = 'p';
  if (v.R) out[v.R] = 'R';
  if (v.R2) out[v.R2] = 'R';
  if (v.Q) out[v.Q] = 'Q';
  if (v.N) out[v.N] = 'N';
  if (v.B) out[v.B] = 'B';
  Object.assign(out, v.extra ?? {});
  return out;
}

const puzzles = [];
const rejected = [];
for (const [themeId, theme] of Object.entries(THEMES)) {
  theme.variants.forEach((v, i) => {
    for (const flip of [false, true]) {
      const pieces = flip ? mirror(piecesOf(v)) : piecesOf(v);
      const fen = fenOf(pieces);
      const ok = mates(fen);
      if (!ok || ok.length === 0 || ok.length > 2) {
        rejected.push(`${themeId}-${i + 1}${flip ? 'e' : ''}: ${ok ? `${ok.length} mates` : 'posição inválida'}`);
        continue;
      }
      puzzles.push({ id: `${themeId}-${i + 1}${flip ? 'e' : ''}`, theme: themeId, fen, mates: ok });
    }
  });
}

// Uma de cada tema por vez, para variar
const byTheme = Object.keys(THEMES).map((t) => puzzles.filter((p) => p.theme === t));
const ordered = [];
for (let i = 0; byTheme.some((l) => l[i]); i++) for (const l of byTheme) if (l[i]) ordered.push(l[i]);

const themeBlock = Object.entries(THEMES)
  .map(([id, t]) => `  ${id}: { name: ${JSON.stringify(t.name)}, tip: ${JSON.stringify(t.tip)} },`)
  .join('\n');
const body = ordered.map((p) => `  { id: ${JSON.stringify(p.id)}, theme: ${JSON.stringify(p.theme)}, fen: ${JSON.stringify(p.fen)}, mates: ${JSON.stringify(p.mates)} },`).join('\n');
fs.writeFileSync(
  path.join(ROOT, 'src/data/chessPuzzles.ts'),
  `// Gerado por scripts/build-chess-puzzles.mjs. Não editar à mão.\n// Desafios do Sábio: brancas jogam e dão xeque-mate em 1. Todo lance que dá mate vale.\n\nexport type PuzzleTheme = ${Object.keys(THEMES).map((t) => JSON.stringify(t)).join(' | ')};\n\nexport interface ChessPuzzle {\n  id: string;\n  theme: PuzzleTheme;\n  fen: string;\n  /** lances que dão mate (SAN) */\n  mates: string[];\n}\n\nexport const PUZZLE_THEMES: Record<PuzzleTheme, { name: string; tip: string }> = {\n${themeBlock}\n};\n\nexport const CHESS_PUZZLES: ChessPuzzle[] = [\n${body}\n];\n`,
);
console.log(`desafios: ${ordered.length} | recusados: ${rejected.length}`);
for (const r of rejected) console.log('  recusado', r);
