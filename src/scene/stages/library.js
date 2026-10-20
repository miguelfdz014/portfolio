// Stage 2: the tower library (About). The whole painting is a Higgsfield video loop with a fixed camera, so the
// HTML hotspots over the book, scrolls and hobby objects stay aligned; candles glow and dust drifts on top.
import hotspots from '../../art/hotspots.json';

const ASPECT = 16 / 9;
const art = (name) => ({
  desktop: new URL(`../../art/library/${name}-2560.webp`, import.meta.url).href,
  mobile: new URL(`../../art/library/${name}-1280.webp`, import.meta.url).href,
});

// The painting always covers the view (cropping its sides on narrow screens, its top and bottom on wide ones).
export function libraryRect(W) {
  const w = Math.max(W, 2 * ASPECT);
  return { x: 0, y: 0, w, h: w / ASPECT };
}

const at = ([u, v], W) => {
  const r = libraryRect(W);
  return { x: (u - 0.5) * r.w, y: (0.5 - v) * r.h };
};

const P = 0.04; // A hint of mouse parallax; the scene itself is a locked-off shot.

export const shouldPlayVideo = ({ stage, motionOn, reducedMotion }) => stage === 'library' && motionOn && !reducedMotion;

const L = hotspots.library;
const [bx0, by0, bx1, by1] = L.moonbeam;
const ref = libraryRect(2 * ASPECT);

export const libraryDef = {
  id: 'library',
  travel: 0,
  layers: [
    {
      kind: 'video',
      src: art('poster'),
      video: new URL('../../art/library/loop.mp4', import.meta.url).href,
      p: P,
      layout: (W) => libraryRect(W),
    },
    ...L.candles.map((c) => ({
      kind: 'glow',
      p: P,
      opts: { color: [1, 0.62, 0.28], flicker: true, strength: 0.22 },
      layout: (W) => ({ ...at(c, W), w: 0.55, h: 0.55 }),
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
