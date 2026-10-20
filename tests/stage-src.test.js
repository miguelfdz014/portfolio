import { describe, expect, test } from 'vitest';
import { pickSrc } from '../src/scene/stage.js';

describe('pickSrc', () => {
  const src = { desktop: 'd', mobile: 'm', portrait: 'p' };
  test('portrait screens get the portrait painting', () => {
    expect(pickSrc(src, { orient: 'portrait', wide: true })).toBe('p');
  });
  test('a painting without a portrait version falls back to the 16:9 one', () => {
    expect(pickSrc({ desktop: 'd', mobile: 'm' }, { orient: 'portrait', wide: true })).toBe('d');
  });
  test('landscape picks by pixel width', () => {
    expect(pickSrc(src, { orient: 'landscape', wide: false })).toBe('m');
    expect(pickSrc(src, { orient: 'landscape', wide: true })).toBe('d');
  });
});

describe('artOrientation', () => {
  test('portrait layout only when the painting has a portrait version that loaded', async () => {
    const { artOrientation } = await import('../src/scene/stage.js');
    expect(artOrientation('portrait', { desktop: 'd', mobile: 'm', portrait: 'p' }, false)).toBe('portrait');
    expect(artOrientation('portrait', { desktop: 'd', mobile: 'm' }, false)).toBe('landscape');
    expect(artOrientation('portrait', { desktop: 'd', mobile: 'm', portrait: 'p' }, true)).toBe('landscape');
    expect(artOrientation('landscape', { desktop: 'd', mobile: 'm', portrait: 'p' }, false)).toBe('landscape');
  });
});
