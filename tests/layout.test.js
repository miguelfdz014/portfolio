import { describe, expect, test } from 'vitest';
import { artToScreen, coverLayout, parallax, wrap } from '../src/scene/layout.js';

describe('layout', () => {
  test('parallax at rest', () => {
    const r = parallax({ p: 0.62, travel: 2.2, s: 1, mx: 0, my: 0 });
    expect(r.dx).toBeCloseTo(0);
    expect(r.dy).toBeCloseTo(0);
  });

  test('parallax before scrolling', () => {
    expect(parallax({ p: 0.62, travel: 2.2, s: 0, mx: 0, my: 0 }).dy).toBeCloseTo(-1.364);
  });

  test('wrap', () => {
    expect(wrap(5.3, 4)).toBeCloseTo(1.3);
    expect(wrap(-2, 4)).toBeCloseTo(-2);
    expect(wrap(2, 4)).toBeCloseTo(-2);
  });

  test('coverLayout never leaves a gap', () => {
    for (const W of [0.92, 1.78, 4.78]) {
      expect(coverLayout(2688 / 1152, W, { widthFactor: 1.12, minWidth: 3.4 }).w).toBeGreaterThan(W + 0.12);
    }
  });

  test('artToScreen centre', () => {
    expect(artToScreen(0.5, 0.5, { x: 0, y: 0, w: 2, h: 1 }, 3.556, { width: 1600, height: 900 })).toEqual({ left: 800, top: 450 });
  });

  test('artToScreen corner', () => {
    const p = artToScreen(0, 0, { x: 0, y: 0, w: 2, h: 1 }, 3.556, { width: 1600, height: 900 });
    expect(p.left).toBeCloseTo(350, 0);
    expect(p.top).toBeCloseTo(225, 0);
  });
});
