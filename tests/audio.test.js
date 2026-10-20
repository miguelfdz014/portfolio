// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createMusic, readSoundPref, writeSoundPref } from '../src/audio.js';

function fakeAudio({ rejectFirst = false } = {}) {
  let calls = 0;
  return {
    src: '',
    loop: false,
    volume: 1,
    paused: true,
    play: vi.fn(function () {
      calls++;
      if (rejectFirst && calls === 1) return Promise.reject(new Error('NotAllowedError'));
      this.paused = false;
      return Promise.resolve();
    }),
    pause: vi.fn(function () {
      this.paused = true;
    }),
  };
}

const storage = (items = {}) => ({
  getItem: (k) => items[k] ?? null,
  setItem: (k, v) => (items[k] = v),
});
const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };

describe('sound preference', () => {
  test('off unless saved as on', () => {
    expect(readSoundPref(storage())).toBe(false);
    expect(readSoundPref(storage({ 'portfolio-sound': 'on' }))).toBe(true);
    expect(readSoundPref(storage({ 'portfolio-sound': 'off' }))).toBe(false);
  });
  test('storage that throws reads as off and never breaks a write', () => {
    expect(readSoundPref(broken)).toBe(false);
    expect(() => writeSoundPref(broken, true)).not.toThrow();
  });
  test('writes on and off', () => {
    const s = storage();
    writeSoundPref(s, true);
    expect(s.getItem('portfolio-sound')).toBe('on');
    writeSoundPref(s, false);
    expect(s.getItem('portfolio-sound')).toBe('off');
  });
});

describe('music', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  test('no audio element (and no download) until sound is turned on', () => {
    const createAudio = vi.fn(() => fakeAudio());
    createMusic({ src: '/night.m4a', createAudio });
    expect(createAudio).not.toHaveBeenCalled();
  });

  test('turning on loads, loops, plays and fades up to 0.35 over 2 s', async () => {
    const a = fakeAudio();
    const music = createMusic({ src: '/night.m4a', createAudio: () => a });
    music.setOn(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(a.src).toBe('/night.m4a');
    expect(a.loop).toBe(true);
    expect(a.play).toHaveBeenCalled();
    expect(a.volume).toBeLessThan(0.35);
    await vi.advanceTimersByTimeAsync(2100);
    expect(a.volume).toBeCloseTo(0.35);
  });

  test('turning off fades to silence over 1 s, then pauses', async () => {
    const a = fakeAudio();
    const music = createMusic({ src: '/night.m4a', createAudio: () => a });
    music.setOn(true);
    await vi.advanceTimersByTimeAsync(2100);
    music.setOn(false);
    expect(a.pause).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1100);
    expect(a.volume).toBeCloseTo(0);
    expect(a.pause).toHaveBeenCalled();
    expect(music.on).toBe(false);
  });

  test('pauses while the tab is hidden and resumes when it comes back', async () => {
    const a = fakeAudio();
    const music = createMusic({ src: '/night.m4a', createAudio: () => a });
    music.setOn(true);
    await vi.advanceTimersByTimeAsync(2100);
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(a.pause).toHaveBeenCalled();
    a.play.mockClear();
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(a.play).toHaveBeenCalled();
    music.dispose();
  });

  test('a touch pointerdown (not a user activation on phones) does not retry; the following click does', async () => {
    const a = fakeAudio({ rejectFirst: true });
    const music = createMusic({ src: '/night.m4a', createAudio: () => a });
    music.setOn(true);
    await vi.advanceTimersByTimeAsync(0);
    document.dispatchEvent(new Event('pointerdown'));
    await vi.advanceTimersByTimeAsync(0);
    expect(a.play).toHaveBeenCalledTimes(1);
    document.dispatchEvent(new Event('click'));
    await vi.advanceTimersByTimeAsync(0);
    expect(a.play).toHaveBeenCalledTimes(2);
    music.dispose();
  });

  test('repeated refusals never stack more than one pending retry', async () => {
    const a = fakeAudio();
    let n = 0;
    a.play = vi.fn(() => (++n <= 2 ? Promise.reject(new Error('NotAllowedError')) : Promise.resolve()));
    const music = createMusic({ src: '/night.m4a', createAudio: () => a });
    music.setOn(true);
    await vi.advanceTimersByTimeAsync(0);
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0);
    expect(a.play).toHaveBeenCalledTimes(2);
    document.dispatchEvent(new Event('click'));
    await vi.advanceTimersByTimeAsync(0);
    expect(a.play).toHaveBeenCalledTimes(3);
    music.dispose();
  });

  test('a blocked play stays on and retries on the next click or key', async () => {
    const a = fakeAudio({ rejectFirst: true });
    const music = createMusic({ src: '/night.m4a', createAudio: () => a });
    music.setOn(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(music.on).toBe(true);
    expect(a.play).toHaveBeenCalledTimes(1);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    await vi.advanceTimersByTimeAsync(0);
    expect(a.play).toHaveBeenCalledTimes(2);
    music.dispose();
  });
});
