// Um quadro por chamada (gpt-image-1 edits com a referência do personagem). Uso: node gen-frames2.cjs <personagem> [acao]
const fs = require('fs'); const path = require('path');
const APP = require('path').resolve(__dirname, '..');
const sharp = require('sharp');
const env = fs.readFileSync(path.join(APP, '.env'), 'utf8');
const KEY = (env.match(/^VITE_OPENAI_API_KEY=(.+)$/m) || [])[1].trim();
const cfg = JSON.parse(fs.readFileSync(path.join(APP, 'docs/arte/quadros.json'), 'utf8'));
fs.mkdirSync(path.join(APP, 'docs/arte/quadros'), { recursive: true });
const [charName, onlyAction] = process.argv.slice(2);
const c = cfg[charName];
if (!c) { console.error('personagem desconhecido'); process.exit(1); }
(async () => {
  const ref = await sharp(path.join(APP, c.ref)).resize(512, 512, { kernel: 'nearest', fit: 'contain', background: { r: 255, g: 0, b: 255, alpha: 1 } }).png().toBuffer();
  for (const [action, poses] of Object.entries(c.actions)) {
    if (onlyAction && action !== onlyAction) continue;
    for (let i = 0; i < poses.length; i++) {
      const outFile = path.join(APP, 'docs/arte/quadros', `frame-${charName}-${action}-${i}.png`);
      if (fs.existsSync(outFile)) { console.log(charName, action, i, 'existe'); continue; }
      const prompt = `Pixel art of EXACTLY this same character (${c.desc}), ${poses[i]}. Single character, full body, centered, seen from the side, on a flat solid magenta (#FF00FF) background with generous empty margin all around (character about 60% of the image height). Clean 1px black outline, flat shading, same limited palette as the reference, no text, no ground shadow.`;
      const form = new FormData();
      form.append('model', 'gpt-image-1');
      form.append('prompt', prompt);
      form.append('size', '1024x1024');
      form.append('quality', 'medium');
      form.append('image', new Blob([ref], { type: 'image/png' }), 'ref.png');
      const r = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: 'Bearer ' + KEY }, body: form });
      const j = await r.json();
      if (!j.data) { console.log(charName, action, i, 'erro', r.status, JSON.stringify(j).slice(0, 160)); continue; }
      fs.writeFileSync(outFile, Buffer.from(j.data[0].b64_json, 'base64'));
      console.log(charName, action, i, 'ok');
    }
  }
})().catch((e) => { console.error(e); process.exit(1); });
