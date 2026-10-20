// Stage 4: the tower writing desk (Contact). The raven waits on the sill; when a link is clicked it takes the
// sealed letter and flies off toward the moon, then comes back (timeline in ../raven.js).
import hotspots from '../../art/hotspots.json';
import { createRaven } from '../raven.js';

const ASPECT = 16 / 9;
const art = (name) => ({
  desktop: new URL(`../../art/desk/${name}-2560.webp`, import.meta.url).href,
  mobile: new URL(`../../art/desk/${name}-1280.webp`, import.meta.url).href,
});

// Lifted a little: Contact is the last stop, where the footer covers the bottom of the screen.
const LIFT = 0.15;
// Tall enough that, lifted, it still reaches the bottom of the view.
export function deskRect(W) {
  const h = Math.max(W / ASPECT, 2 + 2 * LIFT);
  return { x: 0, y: LIFT, w: h * ASPECT, h };
}

const D = hotspots.desk;
const P = 0.05;
// Raven sprite: 0.983 aspect; the bird's feet sit at v .968 of the sprite. Height in units of the scene height.
const RAVEN_H = 0.3;
const RAVEN_ASPECT = 0.983;
const FEET_V = 0.968;

const point = ([u, v], W) => {
  const R = deskRect(W);
  return { x: R.x + (u - 0.5) * R.w, y: R.y + (0.5 - v) * R.h };
};

// The characters painting split in two: the writer (left half) shifts further left so his arm clears the links.
const half = (side, shift) => ({
  kind: 'paint',
  src: art('characters'),
  p: P,
  opts: { uvRect: side === 'left' ? [0, 0, 0.5, 1] : [0.5, 0, 0.5, 1] },
  layout: (W) => {
    const R = deskRect(W);
    return { x: R.x + (side === 'left' ? -0.25 : 0.25) * R.w + shift * R.w, y: R.y, w: R.w / 2, h: R.h };
  },
});

// The raven's path is in scene units at a reference width; layout() rescales it to the current view.
const REF_W = 2 * ASPECT;
const ref = deskRect(REF_W);
const bird = createRaven({ sill: point(D.sill, REF_W), moon: point(D.moon, REF_W) });

// The raven runs on the world's animation clock (t, which stops while motion is paused), so pausing freezes it
// mid-flight and playing resumes the same timeline. Contact gets this handle; launch() ignores its argument.
let clockMs = 0;
export const raven = {
  perk: (on) => bird.perk(on),
  launch: () => bird.launch(clockMs),
};

export const deskDef = {
  id: 'desk',
  travel: 0,
  layers: [
    { kind: 'paint', src: art('room'), p: P, layout: (W) => deskRect(W) },
    {
      kind: 'glow',
      p: P,
      opts: { color: [1, 0.62, 0.28], flicker: true, strength: 0.3 },
      layout: (W) => ({ ...point(D.candle, W), w: 0.8, h: 0.8 }),
    },
    half('left', -0.07),
    half('right', 0),
    {
      kind: 'paint',
      src: art('raven-sit'),
      frames: {
        sit: art('raven-sit'),
        letter: art('raven-letter'),
        fly1: art('raven-fly-1'),
        fly2: art('raven-fly-2'),
        fly3: art('raven-fly-3'),
      },
      p: P,
      layout: (W, t) => {
        clockMs = t * 1000;
        const f = bird.update(clockMs);
        const R = deskRect(W);
        const k = R.w / ref.w;
        const h = R.h * RAVEN_H * f.scale;
        const w = h * RAVEN_ASPECT;
        // Feet on the sill: shift the sprite up so its feet (not its centre) sit on the path point.
        return { x: f.x * k, y: (f.y - LIFT) * k + R.y + h * (FEET_V - 0.5), w, h, frame: f.frame, alpha: f.alpha, visible: f.visible };
      },
    },
    { kind: 'petals', p: 0, opts: { count: 22, size: 1.1, opacity: 0.9 } },
  ],
};
