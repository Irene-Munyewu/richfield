// One-off generator: rasterizes richfield.svg into all the PNG assets Expo
// needs (app icon, Android adaptive icon layers, favicon, splash image).
// Not part of the app's runtime — run manually with `node scripts/generate-app-icons.mjs`
// whenever the logo changes.
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const svgSource = readFileSync(path.join(root, 'richfield.svg'), 'utf8');

const PRIMARY = '#1B4B91';
const CANVAS = 1024;

function logoSvg({ scale = 1, fill1 = '#FFFFFF', fill2 = '#108CB9' } = {}) {
  return svgSource
    .replace('width="89" height="80"', `width="${89 * scale}" height="${80 * scale}"`)
    .replace('fill="white"', `fill="${fill1}"`)
    .replace('fill="#108CB9"', `fill="${fill2}"`);
}

async function logoBuffer(logoWidth, opts) {
  // Render at a high scale then trim + resize, so trimming isn't limited by
  // the source viewBox's low resolution and edges stay clean.
  const renderScale = (logoWidth / 89) * 4;
  const rendered = await sharp(Buffer.from(logoSvg({ scale: renderScale, ...opts }))).png().toBuffer();
  const trimmed = await sharp(rendered).trim().toBuffer();
  return sharp(trimmed).resize({ width: logoWidth }).png().toBuffer();
}

async function flatIcon(outPath, { background, logoWidth, canvas = CANVAS, ...opts }) {
  const logo = await logoBuffer(logoWidth, opts);
  const meta = await sharp(logo).metadata();
  await sharp({
    create: { width: canvas, height: canvas, channels: 4, background },
  })
    .composite([{ input: logo, left: Math.round((canvas - meta.width) / 2), top: Math.round((canvas - meta.height) / 2) }])
    .png()
    .toFile(outPath);
  console.log('wrote', outPath);
}

async function transparentIcon(outPath, { logoWidth, ...opts }) {
  const logo = await logoBuffer(logoWidth, opts);
  const meta = await sharp(logo).metadata();
  await sharp({
    create: { width: CANVAS, height: CANVAS, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: logo, left: Math.round((CANVAS - meta.width) / 2), top: Math.round((CANVAS - meta.height) / 2) }])
    .png()
    .toFile(outPath);
  console.log('wrote', outPath);
}

const assets = path.join(root, 'assets');

await flatIcon(path.join(assets, 'icon.png'), {
  background: PRIMARY,
  logoWidth: 560,
});

await transparentIcon(path.join(assets, 'splash-icon.png'), {
  logoWidth: 200,
});

// Android adaptive icon: foreground content must sit inside the ~66% safe
// zone or the system mask clips it.
await transparentIcon(path.join(assets, 'android-icon-foreground.png'), {
  logoWidth: 460,
});

await sharp({
  create: { width: CANVAS, height: CANVAS, channels: 4, background: PRIMARY },
})
  .png()
  .toFile(path.join(assets, 'android-icon-background.png'));
console.log('wrote', path.join(assets, 'android-icon-background.png'));

// Android 13+ themed icon: single-color silhouette, tinted by the system.
await transparentIcon(path.join(assets, 'android-icon-monochrome.png'), {
  logoWidth: 460,
  fill1: '#FFFFFF',
  fill2: '#FFFFFF',
});

await flatIcon(path.join(assets, 'favicon.png'), {
  background: PRIMARY,
  logoWidth: 100,
  canvas: 196,
});
