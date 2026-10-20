// Pure helpers for the art pipeline (scripts/art.mjs). No file system access here, so they are easy to test.

const bright = (rgba, w, x, y) => {
  const i = (y * w + x) * 4;
  return rgba[i] + rgba[i + 1] + rgba[i + 2] > 520;
};

// The moon is the largest connected bright region in the painted sky; stars, however wide, are smaller.
// Large paintings are sampled on a grid (about 512 cells across) so the flood fill stays fast.
export function findMoon(rgba, width, height, region = { x0: 0, y0: 0, x1: width, y1: height }) {
  const step = Math.max(1, Math.floor((region.x1 - region.x0) / 512));
  const cols = Math.ceil((region.x1 - region.x0) / step);
  const rows = Math.ceil((region.y1 - region.y0) / step);
  const mask = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) mask[r * cols + c] = bright(rgba, width, region.x0 + c * step, region.y0 + r * step) ? 1 : 0;
  }
  let best = null;
  const seen = new Uint8Array(cols * rows);
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue;
    const box = { size: 0, minC: Infinity, minR: Infinity, maxC: -Infinity, maxR: -Infinity };
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const i = stack.pop();
      const c = i % cols, r = (i - c) / cols;
      box.size++;
      box.minC = Math.min(box.minC, c); box.maxC = Math.max(box.maxC, c);
      box.minR = Math.min(box.minR, r); box.maxR = Math.max(box.maxR, r);
      for (const [nc, nr] of [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]]) {
        const n = nr * cols + nc;
        if (nc >= 0 && nc < cols && nr >= 0 && nr < rows && mask[n] && !seen[n]) {
          seen[n] = 1;
          stack.push(n);
        }
      }
    }
    if (!best || box.size > best.size) best = box;
  }
  if (!best) throw new Error('findMoon: no moon found');
  const x = (c) => region.x0 + c * step, y = (r) => region.y0 + r * step;
  return {
    cx: (x(best.minC) + x(best.maxC)) / 2,
    cy: (y(best.minR) + y(best.maxR)) / 2,
    r: (x(best.maxC) - x(best.minC) + y(best.maxR) - y(best.minR) + 2 * step) / 4,
  };
}

// 16:9 paintings ship at two widths; tall portrait paintings (layer names ending in -portrait) only at phone size.
export const variantNames = (layer) =>
  layer.endsWith('-portrait')
    ? { portrait: `${layer}-1280.webp` }
    : { desktop: `${layer}-2560.webp`, mobile: `${layer}-1280.webp` };

export function budget(files, limits) {
  return limits.map(({ name, match, max }) => {
    const bytes = files.filter((f) => match(f.path)).reduce((sum, f) => sum + f.bytes, 0);
    return { name, bytes, max, ok: bytes <= max };
  });
}
