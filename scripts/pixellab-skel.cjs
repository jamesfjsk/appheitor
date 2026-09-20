// Animação por esqueleto (PixelLab /animate-with-skeleton): 3 quadros por chamada, poses em docs/arte/esqueletos.json.
// Uso: node scripts/pixellab-skel.cjs [--only <prefixo>] [--force]
// Item: { file: 'tunnel/hero-run.png', reference: 'char/miner-ref.png', width, height, direction, guidance_scale, seed,
//   calls: [ [pose, pose, pose], [pose, pose, pose] ] }  // cada chamada gera 3 quadros; a folha junta todas
// Pose: { NOSE:[x,y], NECK:[x,y], ... } com as 18 labels do PixelLab; opcional near: 'RIGHT'|'LEFT' (z_index 1 no lado próximo).
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
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/arte/esqueletos.json'), 'utf8'));
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const force = args.includes('--force');
const b64 = (rel) => ({ type: 'base64', base64: fs.readFileSync(path.join(OUT, rel)).toString('base64') });

const LABELS = ['NOSE', 'NECK', 'RIGHT SHOULDER', 'RIGHT ELBOW', 'RIGHT ARM', 'LEFT SHOULDER', 'LEFT ELBOW', 'LEFT ARM', 'RIGHT HIP', 'RIGHT KNEE', 'RIGHT LEG', 'LEFT HIP', 'LEFT KNEE', 'LEFT LEG', 'RIGHT EYE', 'LEFT EYE', 'RIGHT EAR', 'LEFT EAR'];

function toPoints(pose) {
  const near = pose.near || 'RIGHT';
  return LABELS.filter((l) => pose[l]).map((l) => ({ x: pose[l][0], y: pose[l][1], label: l, z_index: l.startsWith(near) ? 1 : 0 }));
}

async function run(item) {
  const file = path.join(OUT, item.file);
  if (fs.existsSync(file) && !force) return 'existe';
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const w = item.width || 64; const h = item.height || 64;
  const frames = [];
  const t0 = Date.now();
  for (const call of item.calls) {
    const body = {
      image_size: { width: w, height: h },
      reference_image: b64(item.reference),
      skeleton_keypoints: call.map(toPoints),
      view: item.view || 'side',
      direction: item.direction || 'east',
      guidance_scale: item.guidance_scale ?? 6,
      ...(item.seed ? { seed: item.seed } : {}),
    };
    const r = await fetch(`${API}/animate-with-skeleton`, { method: 'POST', headers: H, body: JSON.stringify(body) });
    const j = await r.json();
    if (!Array.isArray(j.images)) return `erro ${r.status} ${JSON.stringify(j).slice(0, 200)}`;
    for (const im of j.images) frames.push(Buffer.from(im.base64, 'base64'));
  }
  const comps = [];
  for (let i = 0; i < frames.length; i++) {
    const fr = await sharp(frames[i]).resize(w, h, { kernel: 'nearest', fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    comps.push({ input: fr, left: i * w, top: 0 });
  }
  await sharp({ create: { width: w * frames.length, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(comps).png().toFile(file);
  fs.writeFileSync(file.replace(/\.png$/, '.json'), JSON.stringify({ frames: frames.length, width: w, height: h, source: 'skeleton' }, null, 2));
  return `ok ${frames.length} quadros ${Date.now() - t0} ms`;
}

(async () => {
  const items = manifest.items.filter((it) => !only || it.file.startsWith(only));
  for (const item of items) {
    try { console.log(item.file, await run(item)); } catch (e) { console.log(item.file, 'falha', e.message); }
  }
})();
