// Decides which painted stage is on screen for a scroll position. Sections are stops (where each one is centred);
// consecutive stops of one stage form a run. Between runs of different stages, the middle 40% of the gap is the
// handover: the outgoing stage fades to dark, then the incoming one fades up. Two stages are never shown at once.
const BAND = 0.4;

function runProgress(i, stops, stageOfStop) {
  let first = i, last = i;
  while (first > 0 && stageOfStop[first - 1] === stageOfStop[i]) first--;
  while (last < stops.length - 1 && stageOfStop[last + 1] === stageOfStop[i]) last++;
  return { first, last };
}

function progressIn(y, i, stops, stageOfStop) {
  const { first, last } = runProgress(i, stops, stageOfStop);
  if (first === last) return 1;
  return Math.min(1, Math.max(0, (y - stops[first]) / (stops[last] - stops[first])));
}

export function stageFrame(y, stops, stageOfStop) {
  if (y <= stops[0]) return { stage: stageOfStop[0], s: progressIn(y, 0, stops, stageOfStop), fade: 1 };
  const n = stops.length - 1;
  if (y >= stops[n]) return { stage: stageOfStop[n], s: progressIn(y, n, stops, stageOfStop), fade: 1 };

  let i = 0;
  while (y >= stops[i + 1]) i++;
  const a = stageOfStop[i], b = stageOfStop[i + 1];
  if (a === b) return { stage: a, s: progressIn(y, i, stops, stageOfStop), fade: 1 };

  const gap = stops[i + 1] - stops[i];
  const start = stops[i] + gap * ((1 - BAND) / 2);
  const mid = stops[i] + gap / 2;
  const end = stops[i] + gap * ((1 + BAND) / 2);
  if (y < start) return { stage: a, s: progressIn(y, i, stops, stageOfStop), fade: 1 };
  if (y > end) return { stage: b, s: progressIn(y, i + 1, stops, stageOfStop), fade: 1 };
  if (y < mid) return { stage: a, s: progressIn(y, i, stops, stageOfStop), fade: (mid - y) / (mid - start) };
  return { stage: b, s: progressIn(y, i + 1, stops, stageOfStop), fade: (y - mid) / (end - mid) };
}

// Strength of the full-screen mist veil drawn over the stage while it is dimmed.
export const mistAt = (fade) => 1 - fade;
