import { describe, expect, test } from 'vitest';
import { useFlowLayout } from '../src/ui/flow.js';
import { deskRect } from '../src/scene/stages/desk.js';

describe('in-flow fallback for scene controls', () => {
  test('before the painted world is running, controls sit in the page flow', () => {
    expect(useFlowLayout({ width: 1600, height: 900, worldReady: false })).toBe(true);
  });
  test('wide screens with the world running place controls over the art', () => {
    expect(useFlowLayout({ width: 1600, height: 900, worldReady: true })).toBe(false);
    expect(useFlowLayout({ width: 3440, height: 1440, worldReady: true })).toBe(false);
  });
  test('phones and screens narrower than 3:2 (which crop the paintings) use the flow layout', () => {
    expect(useFlowLayout({ width: 390, height: 844, worldReady: true })).toBe(true);
    expect(useFlowLayout({ width: 1024, height: 768, worldReady: true })).toBe(true);
    expect(useFlowLayout({ width: 1180, height: 820, worldReady: true })).toBe(true);
  });
});

describe('desk painting', () => {
  test('lifted desk still covers the whole view at any aspect', () => {
    for (const W of [2.4, 3.2, 3.556, 4.78]) {
      const r = deskRect(W);
      expect(r.y - r.h / 2).toBeLessThanOrEqual(-1 + 1e-9);
      expect(r.y + r.h / 2).toBeGreaterThanOrEqual(1 - 1e-9);
      expect(r.w).toBeGreaterThanOrEqual(W);
    }
  });
});
