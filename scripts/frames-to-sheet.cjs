// Quadros do gpt-image (fundo magenta) -> folha NxN com pés alinhados, escala única, sem borrar.
// Uso: node frames-to-sheet.cjs <personagem> <acao> [celula=64]
const fs = require('fs'); const path = require('path');
const APP = require('path').resolve(__dirname, '..');
const sharp = require('sharp');
const FRAMES = path.join(APP, 'docs/arte/quadros'); fs.mkdirSync(FRAMES, { recursive: true });
const [charName, action, cellArg] = process.argv.slice(2);
const CELL = Number(cellArg) || 64;
const FOOT_Y = CELL - 6;
const MAX_H = CELL - 10;
const newPrefix = `frame-${charName}-${action}-`;
const oldPrefix = `frame-${action}-`;
const prefix = fs.existsSync(path.join(FRAMES, newPrefix + '0.png')) ? newPrefix : oldPrefix;
(async () => {
  const files = fs.readdirSync(FRAMES).filter((f) => f.startsWith(prefix) && f.endsWith('.png')).sort();
  const frames = [];
  for (const f of files) {
    const { data, info } = await sharp(path.join(FRAMES, f)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const w = info.width, h = info.height;
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4; const r = data[i], g = data[i + 1], b = data[i + 2];
      // magenta puro e a franja rosada do contorno (mistura com o fundo)
      const magenta = (r > 150 && g < 120 && b > 150) || (r > 110 && b > 110 && g < 100 && r - g > 55 && b - g > 55);
      if (magenta) { data[i + 3] = 0; continue; }
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    if (maxX < 0) { console.log(f, 'vazio'); continue; }
    const cut = await sharp(data, { raw: { width: w, height: h, channels: 4 } }).extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 }).png().toBuffer();
    frames.push({ f, buf: cut, w: maxX - minX + 1, h: maxY - minY + 1 });
  }
  if (!frames.length) { console.log('sem quadros para', prefix); process.exit(1); }
  const maxH = Math.max(...frames.map((x) => x.h));
  const scale = MAX_H / maxH;
  const comps = [];
  for (let i = 0; i < frames.length; i++) {
    const fr = frames[i];
    const tw = Math.max(1, Math.round(fr.w * scale)), th = Math.max(1, Math.round(fr.h * scale));
    const small = await sharp(fr.buf).resize(tw, th, { kernel: 'nearest' }).png().toBuffer();
    comps.push({ input: small, left: i * CELL + Math.round((CELL - tw) / 2), top: FOOT_Y - th });
  }
  const outDir = path.join(APP, 'public/assets/village/tunnel');
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `${charName}-${action}.png`);
  await sharp({ create: { width: CELL * frames.length, height: CELL, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(comps).png().toFile(out);
  fs.writeFileSync(out.replace(/\.png$/, '.json'), JSON.stringify({ frames: frames.length, width: CELL, height: CELL, source: 'gpt-image' }, null, 2));
  await sharp(out).resize(CELL * frames.length * 3, CELL * 3, { kernel: 'nearest' }).flatten({ background: '#3a3230' }).png().toFile(path.join(FRAMES, `board-${charName}-${action}.png`));
  console.log(charName, action, frames.length, 'quadros ->', out);
})().catch((e) => { console.error(e); process.exit(1); });
