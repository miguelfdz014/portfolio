// Small deterministic noise toolkit used to generate textures at load time.

export function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash3i(x, y, z, seed = 0) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177) ^ Math.imul(seed + 1, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const fade = (t) => t * t * (3 - 2 * t);
const wrap = (a, p) => (p ? ((a % p) + p) % p : a);

// Trilinear value noise in [0,1]. A non-zero period makes it tile.
export function valueNoise3(x, y, z, period = 0, seed = 0) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const u = fade(x - xi);
  const v = fade(y - yi);
  const w = fade(z - zi);
  const x0 = wrap(xi, period);
  const x1 = wrap(xi + 1, period);
  const y0 = wrap(yi, period);
  const y1 = wrap(yi + 1, period);
  const z0 = wrap(zi, period);
  const z1 = wrap(zi + 1, period);
  const a = hash3i(x0, y0, z0, seed) + (hash3i(x1, y0, z0, seed) - hash3i(x0, y0, z0, seed)) * u;
  const b = hash3i(x0, y1, z0, seed) + (hash3i(x1, y1, z0, seed) - hash3i(x0, y1, z0, seed)) * u;
  const c = hash3i(x0, y0, z1, seed) + (hash3i(x1, y0, z1, seed) - hash3i(x0, y0, z1, seed)) * u;
  const d = hash3i(x0, y1, z1, seed) + (hash3i(x1, y1, z1, seed) - hash3i(x0, y1, z1, seed)) * u;
  const ab = a + (b - a) * v;
  const cd = c + (d - c) * v;
  return ab + (cd - ab) * w;
}

export function fbm3(x, y, z, octaves = 4, period = 0, seed = 0) {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise3(x * freq, y * freq, z * freq, period ? period * freq : 0, seed + o * 17);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

// Cellular (Worley) noise: distance to the nearest feature point, roughly [0,1].
export function worley3(x, y, z, period = 0, seed = 0) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  let best = 9;
  for (let dz = -1; dz <= 1; dz++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cx = xi + dx;
        const cy = yi + dy;
        const cz = zi + dz;
        const wx = wrap(cx, period);
        const wy = wrap(cy, period);
        const wz = wrap(cz, period);
        const px = cx + hash3i(wx, wy, wz, seed + 1) - x;
        const py = cy + hash3i(wx, wy, wz, seed + 2) - y;
        const pz = cz + hash3i(wx, wy, wz, seed + 3) - z;
        const d = px * px + py * py + pz * pz;
        if (d < best) best = d;
      }
    }
  }
  return Math.min(Math.sqrt(best), 1);
}
