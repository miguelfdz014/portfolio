import { describe, expect, test } from 'vitest';
import { orientation } from '../src/scene/orient.js';

describe('orientation', () => {
  test('upright screens are portrait', () => {
    expect(orientation({ width: 390, height: 844 })).toBe('portrait');
    expect(orientation({ width: 768, height: 1024 })).toBe('portrait');
  });
  test('square and wide screens are landscape', () => {
    expect(orientation({ width: 1000, height: 1000 })).toBe('landscape');
    expect(orientation({ width: 1600, height: 900 })).toBe('landscape');
  });
});
