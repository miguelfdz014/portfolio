import { describe, expect, test } from 'vitest';
import { createRaven } from '../src/scene/raven.js';

const sill = { x: -0.1, y: -0.2 };
const moon = { x: 0.6, y: 0.8 };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

describe('raven', () => {
  test('idle sits on the sill', () => {
    const r = createRaven({ sill, moon });
    expect(r.update(0)).toMatchObject({ frame: 'sit', visible: true, x: sill.x, y: sill.y });
  });

  test('launch flies toward the moon', () => {
    const r = createRaven({ sill, moon });
    r.launch(1000);
    const f = r.update(1250 + 1000);
    expect(['fly1', 'fly2', 'fly3']).toContain(f.frame);
    expect(dist(f, moon)).toBeLessThan(dist(f, sill));
  });

  test('away then returns', () => {
    const r = createRaven({ sill, moon });
    r.launch(1000);
    expect(r.update(1000 + 3000).visible).toBe(false);
    const back = r.update(1000 + 5700);
    expect(r.state).toBe('idle');
    expect(back.frame).toBe('sit');
  });

  test('launch is ignored mid-flight', () => {
    const r = createRaven({ sill, moon });
    r.launch(1000);
    r.launch(1500);
    expect(r.update(1000 + 2300).visible).toBe(false);
  });

  test('perked raven still sits but is marked perked', () => {
    const r = createRaven({ sill, moon });
    r.perk(true);
    expect(r.state).toBe('perked');
    expect(r.update(0).frame).toBe('sit');
    r.perk(false);
    expect(r.state).toBe('idle');
  });
});
