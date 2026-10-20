// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createStage } from '../src/scene/stage.js';

// A loader that answers instantly with a fake texture named after its URL.
const loader = { load: (url, onLoad) => queueMicrotask(() => onLoad({ url, dispose: vi.fn() })) };
const flush = () => new Promise((r) => setTimeout(r, 0));

const def = {
  id: 'library',
  layers: [{
    kind: 'video',
    src: { desktop: 'poster-d', mobile: 'poster-m', portrait: 'poster-p' },
    video: { landscape: 'loop.mp4', portrait: 'loop-portrait.mp4' },
    p: 0,
    layout: (W) => ({ x: 0, y: 0, w: W, h: 2 }),
  }],
};

afterEach(() => vi.restoreAllMocks());

describe('library loop and rotation', () => {
  test('turning the phone while the loop plays shows the new poster until the new clip plays', async () => {
    let video = null;
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function () {
      video = this;
      Object.defineProperty(this, 'paused', { configurable: true, get: () => false });
      return Promise.resolve();
    });
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    const st = createStage(def, { loader, orient: 'landscape' });
    await st.ready;
    const map = () => st.scene.children[0].material.uniforms.map.value;
    st.setVideoPlaying(true);
    video.dispatchEvent(new Event('playing'));
    expect(map().isVideoTexture).toBe(true);

    st.setOrientation('portrait');
    await flush();
    expect(map().url).toBe('poster-p');

    video.dispatchEvent(new Event('playing'));
    expect(map().isVideoTexture).toBe(true);
  });
});
