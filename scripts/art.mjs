// Converts the painted Higgsfield masters into the WebP files the site ships, and checks the size budget.
//   npm run art -- <mastersDir>      masters/<stage>/<layer>.png  ->  src/art/<stage>/<layer>-{2560,1280}.webp
//   npm run art -- --budget dist     prints the budget table, exits 1 if any limit is exceeded
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { budget, findMoon, variantNames } from './art-lib.mjs';

const OUT = path.resolve('src/art');
const MB = 1024 * 1024;
const LANDSCAPE = /(sky|moon|clouds|castle|forest|trees|roses)-1280/;

async function writeVariants(input, outDir, layer) {
  const names = variantNames(layer);
  const sizes = names.portrait ? [[1280, names.portrait]] : [[2560, names.desktop], [1280, names.mobile]];
  for (const [width, name] of sizes) {
    await sharp(input).resize({ width, withoutEnlargement: true }).webp({ quality: 82 }).toFile(path.join(outDir, name));
  }
}

async function cropMoon(skyPath, outDir) {
  const { data, info } = await sharp(skyPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { cx, cy, r } = findMoon(data, info.width, info.height);
  const half = Math.round(1.35 * r);
  // Pad first so a moon near the top edge can still be cropped as a full square.
  const padded = await sharp(skyPath)
    .extend({ top: half, bottom: half, left: half, right: half, background: { r: 0, g: 0, b: 0 } })
    .toBuffer();
  const moon = await sharp(padded)
    .extract({ left: Math.round(cx), top: Math.round(cy), width: half * 2, height: half * 2 })
    .png()
    .toBuffer();
  await writeVariants(moon, outDir, 'moon');
  fs.writeFileSync(path.join(outDir, 'moon.json'), JSON.stringify({ radiusUv: r / (half * 2) }, null, 2) + '\n');
}

async function convert(mastersDir) {
  for (const stage of fs.readdirSync(mastersDir)) {
    const stageDir = path.join(mastersDir, stage);
    if (!fs.statSync(stageDir).isDirectory()) continue;
    const outDir = path.join(OUT, stage);
    fs.mkdirSync(outDir, { recursive: true });
    for (const file of fs.readdirSync(stageDir).filter((f) => f.endsWith('.png'))) {
      const layer = path.basename(file, '.png');
      await writeVariants(path.join(stageDir, file), outDir, layer);
      if (stage === 'landscape' && layer === 'sky') await cropMoon(path.join(stageDir, file), outDir);
      console.log(`${stage}/${layer}`);
    }
  }
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p) : [{ path: p.replaceAll('\\', '/'), bytes: fs.statSync(p).size }];
  });
}

function checkBudget(distDir) {
  const rows = budget(walk(distDir), [
    { name: 'before hero (js + css + landscape 1280)', match: (p) => /\.(js|css)$/.test(p) || LANDSCAPE.test(p), max: 1.5 * MB },
    { name: 'all art (2560 webp)', match: (p) => /-2560[^/]*\.webp$/.test(p), max: 8 * MB },
    { name: 'portrait art (webp)', match: (p) => /-portrait-1280[^/]*\.webp$/.test(p), max: 3 * MB },
    { name: 'music', match: (p) => p.endsWith('.m4a'), max: 1.6 * MB },
    { name: 'library videos', match: (p) => p.endsWith('.mp4'), max: 7 * MB },
  ]);
  for (const r of rows) console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.name}: ${(r.bytes / MB).toFixed(2)} / ${(r.max / MB).toFixed(1)} MB`);
  if (rows.some((r) => !r.ok)) process.exit(1);
}

const [arg, value] = process.argv.slice(2);
if (arg === '--budget') checkBudget(value ?? 'dist');
else if (arg) await convert(arg);
else {
  console.error('usage: npm run art -- <mastersDir> | --budget [dist]');
  process.exit(1);
}
