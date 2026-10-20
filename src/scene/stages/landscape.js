// Stage 1: the moon, then the castle rising beneath it (hero and descent).
// Layouts are the final composition (concept E); before scrolling every layer sits p * travel lower.
import { coverLayout } from '../layout.js';
import moon from '../../art/landscape/moon.json';

const art = (name) => ({
  desktop: new URL(`../../art/landscape/${name}-2560.webp`, import.meta.url).href,
  mobile: new URL(`../../art/landscape/${name}-1280.webp`, import.meta.url).href,
});

const WIDE = 3840 / 1648; // clouds, forest, roses
const FRAME = 3840 / 2160; // castle, trees
const MOON_R = 0.42;
const moonX = (W) => 0.13 * W;

// Measured on the final art: the castle's spire tip (u .515, v .018) and the forest's treeline (v ~.25).
const CASTLE_TIP = { u: 0.515, v: 0.018 };
const TREELINE_V = 0.25;

// Copies repeat every `gap` widths, leaving open sky between them as they drift.
function cloudStrip({ y, speed, scale, gap, flip, opacity, p }) {
  return [-1, 0, 1].map((k) => ({
    kind: 'paint',
    src: art('clouds'),
    p,
    opts: { flipX: flip, opacity },
    layout: (W, t) => {
      const w = Math.max(W * scale, 2.4);
      const period = w * gap;
      const base = ((((t * speed) % period) + period * 1.5) % period) - period / 2;
      return { x: base + k * period, y, w, h: w / WIDE };
    },
  }));
}

// The framing trees are one painting split in two, so each half can part like a curtain before you scroll.
const TREE_H = 2.55;
const TREE_HALF_W = TREE_H * (FRAME / 2);
const treeHalf = (side) => ({
  kind: 'paint',
  src: art('trees'),
  p: 0.3,
  opts: { uvRect: side === 'left' ? [0, 0, 0.5, 1] : [0.5, 0, 0.5, 1], sway: 0.0022, swayBand: [0.45, 1] },
  layout: (W, t, s) => {
    // Narrow (portrait) screens push the trunks further out so they frame the view instead of filling it.
    const out = 0.35 * W * (1 - s) + Math.max(0, 1.6 - W) * 1.3;
    return side === 'left'
      ? { x: -W / 2 - 0.45 + TREE_HALF_W / 2 - out, y: 0.08, w: TREE_HALF_W, h: TREE_H }
      : { x: W / 2 + 0.15 - TREE_HALF_W / 2 + out, y: 0.08, w: TREE_HALF_W, h: TREE_H };
  },
});

export const landscapeDef = {
  id: 'landscape',
  travel: 2.2,
  layers: [
    { kind: 'sky', p: 0.1, layout: (W) => ({ x: 0, y: 0, w: W * 1.3, h: 4.5 }) },
    { kind: 'glow', p: 0.12, layout: (W) => ({ x: moonX(W), y: 0.5, w: MOON_R * 5.5, h: MOON_R * 5.5 }) },
    {
      kind: 'moon',
      src: art('moon'),
      p: 0.12,
      opts: { bg: [0.035, 0.085, 0.175] },
      layout: (W) => ({ x: moonX(W), y: 0.5, w: MOON_R / moon.radiusUv, h: MOON_R / moon.radiusUv }),
    },
    ...cloudStrip({ y: 0.95, speed: 0.03, scale: 0.6, gap: 1.6, flip: true, opacity: 0.6, p: 0.16 }),
    ...cloudStrip({ y: 0.5, speed: 0.016, scale: 0.9, gap: 1.45, flip: false, opacity: 1, p: 0.2 }),
    {
      kind: 'paint',
      src: art('castle'),
      p: 0.62,
      opts: { windows: true, fadeX: 0.12 },
      layout: (W) => {
        const w = 2.7, h = w / FRAME;
        return { x: moonX(W) + (0.5 - CASTLE_TIP.u) * w, y: 0.78 - (0.5 - CASTLE_TIP.v) * h, w, h };
      },
    },
    { kind: 'mist', p: 0.66, opts: { opacity: 0.55, speed: 0.02 }, layout: (W) => ({ x: 0, y: -0.36, w: W * 1.3, h: 0.9 }) },
    { kind: 'petals', p: 0.6, opts: { count: 55, size: 0.65, opacity: 0.7 } },
    {
      kind: 'paint',
      src: art('forest'),
      p: 0.75,
      layout: (W) => {
        const w = Math.max(W * 1.2, 3.6), h = w / WIDE;
        return { x: 0, y: -0.32 - (0.5 - TREELINE_V) * h, w, h };
      },
    },
    { kind: 'mist', p: 0.85, opts: { opacity: 0.35, speed: 0.035 }, layout: (W) => ({ x: 0, y: -0.62, w: W * 1.3, h: 0.7 }) },
    treeHalf('left'),
    treeHalf('right'),
    {
      kind: 'paint',
      src: art('roses'),
      p: 1,
      opts: { sway: 0.005, swayBand: [0, 0.75] },
      layout: (W) => {
        const { w, h } = coverLayout(WIDE, W, { widthFactor: 1.12, minWidth: 3.4 });
        return { x: 0, y: -1.2 + h / 2, w, h };
      },
    },
    { kind: 'petals', p: 0, opts: { count: 30, size: 1.25, opacity: 0.95 } },
  ],
};
