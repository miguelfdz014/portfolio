// The raven's little performance on the Contact desk, as a pure timeline: sit, take the letter, fly to the moon,
// stay away a moment, then return to the sill. `now` is in milliseconds; the desk stage maps the result to a sprite.
const TAKE = 250;
const FLY = 2000;
const AWAY_UNTIL = 5000;
const RETURN = 600;
const FLAP = ['fly1', 'fly2', 'fly3', 'fly2'];

export function createRaven({ sill, moon }) {
  let start = null;
  let perked = false;
  // Control point for the flight curve: up and out of the window before arcing to the moon.
  const ctrl = { x: sill.x + (moon.x - sill.x) * 0.2, y: moon.y };

  const raven = {
    state: 'idle',
    perk(on) {
      perked = on;
      if (raven.state === 'idle' || raven.state === 'perked') raven.state = on ? 'perked' : 'idle';
    },
    launch(now) {
      if (start !== null) return;
      start = now;
      raven.state = 'flying';
    },
    reset() {
      start = null;
      raven.state = perked ? 'perked' : 'idle';
    },
    update(now) {
      const sitting = { frame: 'sit', x: sill.x, y: sill.y, scale: 1, visible: true, alpha: 1 };
      if (start === null) return sitting;
      const t = now - start;
      if (t < TAKE) return { ...sitting, frame: 'letter' };
      if (t < TAKE + FLY) {
        raven.state = 'flying';
        const k = (t - TAKE) / FLY;
        const e = k * k * (3 - 2 * k);
        const u = 1 - e;
        return {
          frame: FLAP[Math.floor((t - TAKE) / 90) % FLAP.length],
          x: u * u * sill.x + 2 * u * e * ctrl.x + e * e * moon.x,
          y: u * u * sill.y + 2 * u * e * ctrl.y + e * e * moon.y,
          scale: 1 - 0.75 * e,
          visible: true,
          alpha: 1,
        };
      }
      if (t < AWAY_UNTIL) {
        raven.state = 'away';
        return { ...sitting, visible: false, alpha: 0 };
      }
      if (t < AWAY_UNTIL + RETURN) {
        raven.state = 'returning';
        return { ...sitting, alpha: (t - AWAY_UNTIL) / RETURN };
      }
      raven.reset();
      return sitting;
    },
  };
  return raven;
}
