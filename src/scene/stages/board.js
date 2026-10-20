// Stage 3: the forest quest board (Projects). The painted board is empty; the parchments are HTML (src/ui/board.js).
// The two characters are cut from one painting and stand either side of the board, clear of the parchments.
import hotspots from '../../art/hotspots.json';

const ASPECT = 16 / 9;
const art = (name) => ({
  desktop: new URL(`../../art/board/${name}-2560.webp`, import.meta.url).href,
  mobile: new URL(`../../art/board/${name}-1280.webp`, import.meta.url).href,
});

export function boardRect(W) {
  const w = Math.max(W, 2 * ASPECT);
  return { x: 0, y: 0, w, h: w / ASPECT };
}

const P = 0.05;
const B = hotspots.board;
const [faceL, , faceR] = B.face;
const LAYER = 3840 / 2160;

// A character sliced from the characters painting (u0..u0+du), scaled to `height` of the scene, feet near the
// bottom, standing with one edge against `edgeU` of the backdrop (`side` = which of its edges touches).
function character({ u0, du, height, edgeU, side }) {
  return {
    kind: 'paint',
    src: art('characters'),
    p: P,
    opts: { uvRect: [u0, 0, du, 1] },
    layout: (W) => {
      const R = boardRect(W);
      const h = R.h * height;
      const w = h * du * LAYER;
      const edge = R.x + (edgeU - 0.5) * R.w;
      return { x: side === 'right' ? edge - w / 2 : edge + w / 2, y: R.y + (0.5 - 0.99) * R.h + h / 2, w, h };
    },
  };
}

const at = ([u, v], W) => {
  const R = boardRect(W);
  return { x: (u - 0.5) * R.w, y: (0.5 - v) * R.h };
};
const ref = boardRect(2 * ASPECT);
const [fx0, fy0, fx1, fy1] = B.fireflies;

export const boardDef = {
  id: 'board',
  travel: 0,
  layers: [
    { kind: 'paint', src: art('backdrop'), p: P, layout: (W) => boardRect(W) },
    {
      kind: 'glow',
      p: P,
      opts: { color: [1, 0.66, 0.3], flicker: true, strength: 0.32 },
      layout: (W) => ({ ...at(B.lantern, W), w: 0.7, h: 0.7 }),
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
    character({ u0: 0.06, du: 0.32, height: 0.82, edgeU: faceL - 0.015, side: 'right' }),
    character({ u0: 0.61, du: 0.31, height: 0.7, edgeU: faceR - 0.03, side: 'left' }),
    { kind: 'petals', p: 0, opts: { count: 24, size: 1.1, opacity: 0.9 } },
  ],
};
