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
  test('phones held upright (aspect <= 0.7) place controls over the portrait art', () => {
    expect(useFlowLayout({ width: 390, height: 844, worldReady: true })).toBe(false);
    expect(useFlowLayout({ width: 430, height: 932, worldReady: true })).toBe(false);
    expect(useFlowLayout({ width: 360, height: 640, worldReady: true })).toBe(false);
  });
  test('tablets, squarish windows and landscape phones use the flow layout', () => {
    expect(useFlowLayout({ width: 768, height: 1024, worldReady: true })).toBe(true);
    expect(useFlowLayout({ width: 1024, height: 768, worldReady: true })).toBe(true);
    expect(useFlowLayout({ width: 1180, height: 820, worldReady: true })).toBe(true);
    expect(useFlowLayout({ width: 700, height: 450, worldReady: true })).toBe(true);
  });
  test('wide landscape phones (over 760px, 3:2 or wider) keep controls over the 16:9 art, as before', () => {
    expect(useFlowLayout({ width: 844, height: 390, worldReady: true })).toBe(false);
  });
  test('phones without the world running still use the flow layout', () => {
    expect(useFlowLayout({ width: 390, height: 844, worldReady: false })).toBe(true);
  });
});

describe('desk painting', () => {
  test('lifted desk still covers the whole view at any aspect', () => {
    for (const W of [2.4, 3.2, 3.556, 4.78]) {
      const r = deskRect(W, 'landscape');
      expect(r.y - r.h / 2).toBeLessThanOrEqual(-1 + 1e-9);
      expect(r.y + r.h / 2).toBeGreaterThanOrEqual(1 - 1e-9);
      expect(r.w).toBeGreaterThanOrEqual(W);
    }
  });
  test('portrait desk covers the whole view', () => {
    for (const W of [0.8, 0.92, 1.2]) {
      const r = deskRect(W, 'portrait');
      expect(r.y - r.h / 2).toBeLessThanOrEqual(-1 + 1e-9);
      expect(r.y + r.h / 2).toBeGreaterThanOrEqual(1 - 1e-9);
      expect(r.w).toBeGreaterThanOrEqual(W - 1e-9);
      expect(r.w / r.h).toBeCloseTo(9 / 16);
    }
  });
});
