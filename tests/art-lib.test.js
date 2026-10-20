import { describe, expect, test } from 'vitest';
import { budget, findMoon, variantNames } from '../scripts/art-lib.mjs';

function syntheticSky() {
  const w = 400, h = 400;
  const rgba = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) rgba.set([9, 22, 44, 255], i * 4);
  const white = (x, y) => rgba.set([255, 255, 255, 255], (y * w + x) * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((x - 250) ** 2 + (y - 150) ** 2 <= 60 ** 2) white(x, y);
  white(20, 20);
  white(380, 390);
  return { rgba, w, h };
}

describe('art pipeline', () => {
  test('findMoon locates a synthetic disc and ignores stars', () => {
    const { rgba, w, h } = syntheticSky();
    const m = findMoon(rgba, w, h);
    expect(Math.abs(m.cx - 250)).toBeLessThanOrEqual(3);
    expect(Math.abs(m.cy - 150)).toBeLessThanOrEqual(3);
    expect(Math.abs(m.r - 60)).toBeLessThanOrEqual(3);
  });

  test('findMoon ignores large stars far from the moon', () => {
    const { rgba, w, h } = syntheticSky();
    // A 4K painting has stars several pixels wide, wider than the 6 px neighbour check.
    for (let y = 340; y < 349; y++) for (let x = 30; x < 39; x++) rgba.set([255, 255, 255, 255], (y * w + x) * 4);
    const m = findMoon(rgba, w, h);
    expect(Math.abs(m.cx - 250)).toBeLessThanOrEqual(3);
    expect(Math.abs(m.cy - 150)).toBeLessThanOrEqual(3);
    expect(Math.abs(m.r - 60)).toBeLessThanOrEqual(3);
  });

  test('variantNames', () => {
    expect(variantNames('castle')).toEqual({ desktop: 'castle-2560.webp', mobile: 'castle-1280.webp' });
  });

  test('budget flags an over-limit group', () => {
    const files = [{ path: 'assets/a.webp', bytes: 900 }, { path: 'assets/b.webp', bytes: 300 }];
    const limits = [{ name: 'art', match: (p) => p.endsWith('.webp'), max: 1000 }];
    expect(budget(files, limits)).toEqual([{ name: 'art', bytes: 1200, max: 1000, ok: false }]);
  });
});
