// Stage 3: the forest quest board (Projects). One painting with both archers in it (a tall one for upright phones);
// the board is painted empty and the parchments are HTML (src/ui/board.js).
import { hotspotsFor } from '../hotspots.js';
import { LANDSCAPE_ASPECT, coverRect, stageAspect } from '../layout.js';

const art = (name) => ({
  desktop: new URL(`../../art/board/${name}-2560.webp`, import.meta.url).href,
  mobile: new URL(`../../art/board/${name}-1280.webp`, import.meta.url).href,
});

export const boardRect = (W, orient) => coverRect(W, stageAspect(orient));

const P = 0.05;
const B = hotspotsFor('board', 'landscape');

const at = (key, W, orient) => {
  const R = boardRect(W, orient);
  const [u, v] = hotspotsFor('board', orient)[key];
  return { x: (u - 0.5) * R.w, y: (0.5 - v) * R.h };
};
const ref = boardRect(2 * LANDSCAPE_ASPECT, 'landscape');
const [fx0, fy0, fx1, fy1] = B.fireflies;

export const boardDef = {
  id: 'board',
  travel: 0,
  layers: [
    { kind: 'paint', src: { ...art('backdrop'), portrait: new URL('../../art/board/backdrop-portrait-1280.webp', import.meta.url).href }, p: P, layout: (W, t, s, orient) => boardRect(W, orient) },
    {
      kind: 'glow',
      p: P,
      opts: { color: [1, 0.66, 0.3], flicker: true, strength: 0.32 },
      layout: (W, t, s, orient) => ({ ...at('lantern', W, orient), w: 0.7, h: 0.7 }),
    },
    {
      kind: 'motes',
      p: P,
      opts: {
        count: 26,
        size: 1.3,
        color: [1, 0.85, 0.4],
        drift: 0.08,
        area: { x0: (fx0 - 0.5) * ref.w, y0: (0.5 - fy1) * ref.h, x1: (fx1 - 0.5) * ref.w, y1: (0.5 - fy0) * ref.h },
      },
    },
    { kind: 'petals', p: 0, opts: { count: 24, size: 1.1, opacity: 0.9 } },
  ],
};
