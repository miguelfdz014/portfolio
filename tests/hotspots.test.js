import { describe, expect, test } from 'vitest';
import { hotspotsFor } from '../src/scene/hotspots.js';

describe('hotspots per orientation', () => {
  test('landscape and portrait sets differ', () => {
    expect(hotspotsFor('library', 'landscape').book).toEqual([0.38, 0.57]);
  });
  test('portrait book differs from landscape', () => {
    expect(hotspotsFor('library', 'portrait').book).not.toEqual(hotspotsFor('library', 'landscape').book);
  });
  test('portrait board has five slots', () => {
    expect(hotspotsFor('board', 'portrait').slots).toHaveLength(5);
  });
  test('every stage has both orientations with the same keys', () => {
    for (const stage of ['library', 'board', 'desk']) {
      expect(Object.keys(hotspotsFor(stage, 'portrait')).sort()).toEqual(Object.keys(hotspotsFor(stage, 'landscape')).sort());
    }
  });
});
