// Stage 4: the tower writing desk (Contact). The raven waits on the sill; when a link is clicked it takes the
// sealed letter and flies off toward the moon, then comes back (timeline in ../raven.js).
import { hotspotsFor } from '../hotspots.js';
import { PORTRAIT_ASPECT, coverRect } from '../layout.js';
import { createRaven } from '../raven.js';

const ASPECT = 16 / 9;
const art = (name) => ({
  desktop: new URL(`../../art/desk/${name}-2560.webp`, import.meta.url).href,
  mobile: new URL(`../../art/desk/${name}-1280.webp`, import.meta.url).href,
});

// Lifted a little: Contact is the last stop, where the footer covers the bottom of the screen.
const LIFT = 0.15;
// Tall enough that, lifted, it still reaches the bottom of the view. The portrait painting is composed for the
// phone screen and isn't lifted.
export function deskRect(W, orient) {
  if (orient === 'portrait') return coverRect(W, PORTRAIT_ASPECT);
  const h = Math.max(W / ASPECT, 2 + 2 * LIFT);
  return { x: 0, y: LIFT, w: h * ASPECT, h };
}

const P = 0.05;
// Raven sprite: 0.983 aspect; the bird's feet sit at v .968 of the sprite.
const RAVEN_ASPECT = 0.983;
const FEET_V = 0.968;

const point = ([u, v], W, orient = 'landscape') => {
  const R = deskRect(W, orient);
  return { x: R.x + (u - 0.5) * R.w, y: R.y + (0.5 - v) * R.h };
};

// The raven's path is in painting units (the painting's centre is 0, its edges are ±0.5), one per painting, so it
// lands on whichever sill is shown. Both birds share every launch, so turning the phone mid-flight keeps the timeline.
const uv = ([u, v]) => ({ x: u - 0.5, y: 0.5 - v });
const birds = Object.fromEntries(['landscape', 'portrait'].map((o) => {
  const H = hotspotsFor('desk', o);
  return [o, createRaven({ sill: uv(H.sill), moon: uv(H.moon) })];
}));
// Raven height as a share of the painting's height: the portrait painting is framed closer, so the bird is smaller.
const RAVEN_H = { landscape: 0.3, portrait: 0.15 };

// The raven runs on the world's animation clock (t, which stops while motion is paused), so pausing freezes it
// mid-flight and playing resumes the same timeline. Contact gets this handle; launch() ignores its argument.
let clockMs = 0;
export const raven = {
  perk: (on) => Object.values(birds).forEach((b) => b.perk(on)),
  launch: () => Object.values(birds).forEach((b) => b.launch(clockMs)),
};

export const deskDef = {
  id: 'desk',
  travel: 0,
  layers: [
    { kind: 'paint', src: { ...art('room'), portrait: new URL('../../art/desk/room-portrait-1280.webp', import.meta.url).href }, p: P, layout: (W, t, s, orient) => deskRect(W, orient) },
    {
      kind: 'glow',
      p: P,
      opts: { color: [1, 0.62, 0.28], flicker: true, strength: 0.3 },
      layout: (W, t, s, orient) => ({ ...point(hotspotsFor('desk', orient).candle, W, orient), w: 0.8, h: 0.8 }),
    },
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
      layout: (W, t, s, orient = 'landscape') => {
        clockMs = t * 1000;
        const o = orient === 'portrait' ? 'portrait' : 'landscape';
        // Both birds advance together; the one for the painting on screen is drawn.
        const f = Object.entries(birds).map(([k, b]) => [k, b.update(clockMs)]).find(([k]) => k === o)[1];
        const R = deskRect(W, o);
        const h = R.h * RAVEN_H[o] * f.scale;
        const w = h * RAVEN_ASPECT;
        // Feet on the sill: shift the sprite up so its feet (not its centre) sit on the path point.
        return { x: R.x + f.x * R.w, y: R.y + f.y * R.h + h * (FEET_V - 0.5), w, h, frame: f.frame, alpha: f.alpha, visible: f.visible };
      },
    },
    { kind: 'petals', p: 0, opts: { count: 22, size: 1.1, opacity: 0.9 } },
  ],
};
