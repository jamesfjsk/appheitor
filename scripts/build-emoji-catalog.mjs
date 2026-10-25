// Gera o catálogo de emojis da Conversa (25/10/2026, pedido do pai: "mais emoticon, igual Telegram").
// Uso: node scripts/build-emoji-catalog.mjs <data-by-group.json> <pt annotations.json> <pt annotationsDerived.json> <noto api.json>
//   data-by-group.json: npm unicode-emoji-json@0.8.0
//   annotations: unicode-org/cldr-json (cldr-annotations-full e cldr-annotations-derived-full, pt)
//   api.json: googlefonts.github.io/noto-emoji-animation/data/api.json (emojis animados, CC BY 4.0)
// Saída: src/data/emojiCatalog.ts (carregado só quando o painel de emojis abre) e src/data/notoAnimated.ts.
import fs from 'node:fs';
import path from 'node:path';

const [groupsPath, ptPath, ptdPath, notoPath] = process.argv.slice(2);
if (!notoPath) {
  console.error('uso: node scripts/build-emoji-catalog.mjs <groups.json> <pt.json> <ptDerived.json> <noto.json>');
  process.exit(1);
}
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const groups = read(groupsPath);
const pt = { ...read(ptdPath).annotationsDerived.annotations, ...read(ptPath).annotations.annotations };
const noto = read(notoPath).icons;

const MAX_EMOJI_VERSION = 15.0;
// Fora para um menino de 10 anos: bebida, cigarro, gesto feio, duplo sentido, arma de fogo e de corte, remédio, aposta, morte
const BLOCK = new Set([
  '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🍾', '🍶', '🚬', '🖕', '🍆', '🍑', '💋', '🫦', '🩲', '💉', '💊',
  '🔫', '💣', '🔪', '🩸', '⚰️', '⚱️', '🎰', '🔞', '🧨', '🪓', '🔞', '🪦', '🥵', '🤤', '🫃', '🫄',
]);
const LABELS = {
  smileys_emotion: ['caras', 'Carinhas', '😀'],
  people_body: ['pessoas', 'Pessoas e gestos', '👋'],
  animals_nature: ['animais', 'Animais e natureza', '🐶'],
  food_drink: ['comidas', 'Comidas', '🍔'],
  activities: ['atividades', 'Atividades', '⚽'],
  travel_places: ['lugares', 'Viagens e lugares', '🚀'],
  objects: ['objetos', 'Objetos', '💡'],
  symbols: ['simbolos', 'Símbolos', '❤️'],
  flags: ['bandeiras', 'Bandeiras', '🏁'],
};

const plain = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const words = (e) => {
  const a = pt[e] || pt[e.replace(/️/g, '')];
  if (!a) return '';
  const all = [...(a.tts || []), ...(a.default || [])].map(plain);
  return [...new Set(all.join(' ').split(/[\s|]+/).filter((w) => w.length > 1))].join(' ');
};

const catalog = [];
let total = 0;
for (const g of groups) {
  const label = LABELS[g.slug];
  if (!label) continue;
  const emojis = [];
  for (const it of g.emojis) {
    if (Number(it.emoji_version) > MAX_EMOJI_VERSION) continue;
    if (BLOCK.has(it.emoji) || BLOCK.has(it.emoji.replace(/️/g, ''))) continue;
    emojis.push({ e: it.emoji, k: words(it.emoji) || plain(it.name) });
  }
  total += emojis.length;
  catalog.push({ id: label[0], label: label[1], icon: label[2], emojis });
}

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const header = '// Gerado por scripts/build-emoji-catalog.mjs. Não editar à mão.\n';
const body = catalog
  .map((g) => `  {\n    id: ${JSON.stringify(g.id)},\n    label: ${JSON.stringify(g.label)},\n    icon: ${JSON.stringify(g.icon)},\n    emojis: [\n${g.emojis.map((x) => `      { e: ${JSON.stringify(x.e)}, k: ${JSON.stringify(x.k)} },`).join('\n')}\n    ],\n  },`)
  .join('\n');
fs.writeFileSync(
  path.join(root, 'src/data/emojiCatalog.ts'),
  `${header}// Emojis por categoria, com palavras em português para a busca (CLDR). Sem bebida, cigarro, arma nem gesto feio.\n\nexport interface EmojiEntry {\n  e: string;\n  /** palavras de busca, minúsculas e sem acento */\n  k: string;\n}\n\nexport interface EmojiGroup {\n  id: string;\n  label: string;\n  icon: string;\n  emojis: EmojiEntry[];\n}\n\nexport const EMOJI_CATALOG: EmojiGroup[] = [\n${body}\n];\n`,
);
const keys = noto.map((i) => i.codepoint).sort();
fs.writeFileSync(
  path.join(root, 'src/data/notoAnimated.ts'),
  `${header}// Emojis com animação no Noto Emoji Animation (Google, CC BY 4.0): https://googlefonts.github.io/noto-emoji-animation/\n// O arquivo de cada um: https://fonts.gstatic.com/s/e/notoemoji/latest/<código>/lottie.json\n\nexport const NOTO_ANIMATED: ReadonlySet<string> = new Set([\n${keys.map((k) => `  '${k}',`).join('\n')}\n]);\n`,
);
console.log(`catálogo: ${catalog.length} grupos, ${total} emojis | animados: ${keys.length}`);
