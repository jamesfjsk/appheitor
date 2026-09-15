// Gera a arte do Miner Missions a partir de docs/arte/manifesto.json usando a API do PixelLab.
// Uso: node scripts/pixellab-gen.cjs [--only <prefixo>] [--force] [--sheet]
// Regras em docs/ARTE_PIPELINE.md. Chave em .env (PIXELLAB_API_KEY). Nunca roda no navegador.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const env = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
const KEY = (env.match(/^PIXELLAB_API_KEY=(.+)$/m) || [])[1]?.trim();
if (!KEY) { console.error('PIXELLAB_API_KEY ausente no .env'); process.exit(1); }
const API = 'https://api.pixellab.ai/v1';
const H = { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
const OUT = path.join(ROOT, 'public/assets/village');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/arte/manifesto.json'), 'utf8'));
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const force = args.includes('--force');

const b64 = (rel) => ({ type: 'base64', base64: fs.readFileSync(path.join(OUT, rel)).toString('base64') });
const resolveImages = (body) => {
  const out = { ...body };
  for (const k of ['style_image', 'init_image', 'inpainting_image', 'mask_image', 'reference_image', 'color_image']) {
    if (typeof out[k] === 'string') out[k] = b64(out[k]);
  }
  return out;
};

async function generate(item) {
  const file = path.join(OUT, item.file);
  if (fs.existsSync(file) && !force) return 'existe';
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const body = resolveImages({ ...(manifest.defaults[item.kind] || {}), ...item.body });
  const t0 = Date.now();
  const r = await fetch(`${API}/${item.endpoint}`, { method: 'POST', headers: H, body: JSON.stringify(body) });
  const j = await r.json();
  if (!j.image) return `erro ${r.status} ${JSON.stringify(j).slice(0, 120)}`;
  let img = sharp(Buffer.from(j.image.base64, 'base64')).png();
  await img.toFile(file);
  return `ok ${Date.now() - t0} ms`;
}

async function sheet() {
  const files = [];
  const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.png') && !p.includes('masks') && f !== 'sheet.png') files.push(p); } };
  walk(OUT);
  files.sort();
  const cell = 120; const cols = 10; const rows = Math.ceil(files.length / cols);
  const comps = [];
  for (let i = 0; i < files.length; i++) {
    const buf = await sharp(files[i]).resize(cell - 12, cell - 12, { kernel: 'nearest', fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    comps.push({ input: buf, left: (i % cols) * cell + 6, top: Math.floor(i / cols) * cell + 6 });
  }
  await sharp({ create: { width: cols * cell, height: rows * cell, channels: 4, background: '#3d3733' } }).composite(comps).png().toFile(path.join(OUT, 'sheet.png'));
  console.log('folha:', path.join(OUT, 'sheet.png'), files.length, 'imagens');
}

(async () => {
  const items = manifest.items.filter((it) => !only || it.file.startsWith(only));
  let ok = 0, skipped = 0, failed = 0;
  for (const it of items) {
    const res = await generate(it);
    if (res === 'existe') skipped++; else if (res.startsWith('ok')) ok++; else failed++;
    if (res !== 'existe') console.log(it.file, res);
  }
  console.log(`gerados ${ok}, existentes ${skipped}, falhas ${failed}`);
  if (args.includes('--sheet') || ok > 0) await sheet();
})().catch((e) => { console.error(e.message); process.exit(1); });
