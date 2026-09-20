// Gera folhas de animação (quadros lado a lado) pela API do PixelLab, a partir de docs/arte/animacoes.json.
// Uso: node scripts/pixellab-anim.cjs [--only <prefixo>] [--force]
// Cada item: { file: 'tunnel/hero-attack.png', reference: 'char/miner-ref.png', action: 'swinging a pickaxe attack',
//   description: 'young miner boy with yellow helmet...', n_frames: 6, direction: 'east', view: 'side', width: 64, height: 64 }
// Saída: PNG com n quadros na horizontal (n*width x height) e um .json ao lado com { frames, width, height }.
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
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/arte/animacoes.json'), 'utf8'));
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const force = args.includes('--force');

const b64 = (rel) => ({ type: 'base64', base64: fs.readFileSync(path.join(OUT, rel)).toString('base64') });

async function animate(item) {
  const file = path.join(OUT, item.file);
  if (fs.existsSync(file) && !force) return 'existe';
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const w = item.width || 64;
  const h = item.height || 64;
  const body = {
    description: item.description,
    action: item.action,
    image_size: { width: w, height: h },
    reference_image: b64(item.reference),
    n_frames: item.n_frames || 6,
    direction: item.direction || 'east',
    view: item.view || 'side',
    text_guidance_scale: item.text_guidance_scale ?? 7.5,
    image_guidance_scale: item.image_guidance_scale ?? 2.2,
    negative_description: item.negative_description || 'blurry, text, watermark, extra limbs, different character',
    ...(item.seed ? { seed: item.seed } : {}),
  };
  const t0 = Date.now();
  const r = await fetch(`${API}/animate-with-text`, { method: 'POST', headers: H, body: JSON.stringify(body) });
  const j = await r.json();
  const frames = Array.isArray(j.images) ? j.images : null;
  if (!frames || !frames.length) return `erro ${r.status} ${JSON.stringify(j).slice(0, 160)}`;
  const bufs = frames.map((f) => Buffer.from(f.base64, 'base64'));
  const comps = [];
  for (let i = 0; i < bufs.length; i++) {
    const frame = await sharp(bufs[i]).resize(w, h, { kernel: 'nearest', fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    comps.push({ input: frame, left: i * w, top: 0 });
  }
  await sharp({ create: { width: w * bufs.length, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(comps).png().toFile(file);
  fs.writeFileSync(file.replace(/\.png$/, '.json'), JSON.stringify({ frames: bufs.length, width: w, height: h, action: item.action }, null, 2));
  return `ok ${bufs.length} quadros ${Date.now() - t0} ms`;
}

(async () => {
  const items = manifest.items.filter((it) => !only || it.file.startsWith(only));
  let ok = 0, skipped = 0, failed = 0;
  for (const item of items) {
    try {
      const res = await animate(item);
      console.log(item.file, res);
      if (res === 'existe') skipped++; else if (res.startsWith('ok')) ok++; else failed++;
    } catch (e) {
      console.log(item.file, 'falha', e.message);
      failed++;
    }
  }
  console.log(`animações ${ok}, existentes ${skipped}, falhas ${failed}`);
})();
