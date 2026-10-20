// Stage 2: the tower library (About). The whole painting is a Higgsfield video loop with a fixed camera (a tall one
// for upright phones), so the HTML hotspots over the book, scrolls and hobby objects stay aligned; candles glow and dust drifts on top.
import { hotspotsFor } from '../hotspots.js';
import { LANDSCAPE_ASPECT, coverRect, stageAspect } from '../layout.js';

const art = (name) => ({
  desktop: new URL(`../../art/library/${name}-2560.webp`, import.meta.url).href,
  mobile: new URL(`../../art/library/${name}-1280.webp`, import.meta.url).href,
});

// The painting always covers the view (cropping its sides on narrow screens, its top and bottom on wide ones).
export const libraryRect = (W, orient) => coverRect(W, stageAspect(orient));

const at = (key, i, W, orient) => {
  const r = libraryRect(W, orient);
  const [u, v] = hotspotsFor('library', orient)[key][i];
  return { x: (u - 0.5) * r.w, y: (0.5 - v) * r.h };
};

const P = 0.04; // A hint of mouse parallax; the scene itself is a locked-off shot.

export const shouldPlayVideo = ({ stage, motionOn, reducedMotion }) => stage === 'library' && motionOn && !reducedMotion;

// Dust drifts in the 16:9 painting's moonbeam (the motes' area is fixed when the stage is built).
const L = hotspotsFor('library', 'landscape');
const [bx0, by0, bx1, by1] = L.moonbeam;
const ref = libraryRect(2 * LANDSCAPE_ASPECT, 'landscape');

export const libraryDef = {
  id: 'library',
  travel: 0,
  layers: [
    {
      kind: 'video',
      src: { ...art('poster'), portrait: new URL('../../art/library/poster-portrait-1280.webp', import.meta.url).href },
      video: {
        landscape: new URL('../../art/library/loop.mp4', import.meta.url).href,
        portrait: new URL('../../art/library/loop-portrait.mp4', import.meta.url).href,
      },
      p: P,
      layout: (W, t, s, orient) => libraryRect(W, orient),
    },
    ...L.candles.map((_, i) => ({
      kind: 'glow',
      p: P,
      opts: { color: [1, 0.62, 0.28], flicker: true, strength: 0.22 },
      layout: (W, t, s, orient) => ({ ...at('candles', i, W, orient), w: 0.55, h: 0.55 }),
    })),
    {
      kind: 'motes',
      p: P,
      opts: {
        count: 40,
        size: 1,
        color: [1, 0.95, 0.85],
        drift: 0.05,
        area: { x0: (bx0 - 0.5) * ref.w, y0: (0.5 - by1) * ref.h, x1: (bx1 - 0.5) * ref.w, y1: (0.5 - by0) * ref.h },
      },
    },
  ],
};
