import { describe, expect, test } from 'vitest';
import { mistAt, stageFrame } from '../src/scene/director.js';

const stops = [0, 900, 1800, 2700, 3600];
const stages = ['landscape', 'landscape', 'library', 'board', 'desk'];

describe('stageFrame', () => {
  test('inside the landscape run', () => {
    expect(stageFrame(450, stops, stages)).toEqual({ stage: 'landscape', s: 0.5, fade: 1 });
  });

  test('centred on the library', () => {
    expect(stageFrame(1800, stops, stages)).toMatchObject({ stage: 'library', fade: 1 });
  });

  test('exact middle of a handover is dark', () => {
    expect(stageFrame(1350, stops, stages).fade).toBeCloseTo(0);
  });

  test('first half of a handover fades the outgoing stage', () => {
    const f = stageFrame(1260, stops, stages);
    expect(f.stage).toBe('landscape');
    expect(f.fade).toBeGreaterThan(0);
    expect(f.fade).toBeLessThan(1);
  });

  test('second half of a handover brings in the next stage', () => {
    const f = stageFrame(1440, stops, stages);
    expect(f.stage).toBe('library');
    expect(f.fade).toBeGreaterThan(0);
    expect(f.fade).toBeLessThan(1);
  });

  test('outside the handover band the nearer stage holds', () => {
    expect(stageFrame(1000, stops, stages)).toMatchObject({ stage: 'landscape', fade: 1 });
  });

  test('mist veil is the inverse of fade', () => {
    expect(mistAt(0.25)).toBeCloseTo(0.75);
  });
});
