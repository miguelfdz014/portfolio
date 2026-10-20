import * as THREE from 'three';
import { fbm3, valueNoise3, hash3i, mulberry32 } from './noise.js';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a, b, v) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

function dataTexture(size, data, { srgb }) {
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

// Builds a colour map and a tangent-space normal map from per-pixel height + colour functions.
function materialMaps(size, sample, strength) {
  const height = new Float32Array(size * size);
  const color = new Uint8Array(size * size * 4);
  const c = [0, 0, 0];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      height[i] = sample(x / size, y / size, c);
      color[i * 4] = clamp01(c[0]) * 255;
      color[i * 4 + 1] = clamp01(c[1]) * 255;
      color[i * 4 + 2] = clamp01(c[2]) * 255;
      color[i * 4 + 3] = 255;
    }
  }
  const normal = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const l = height[y * size + ((x - 1 + size) % size)];
      const r = height[y * size + ((x + 1) % size)];
      const d = height[((y - 1 + size) % size) * size + x];
      const u = height[((y + 1) % size) * size + x];
      let nx = (l - r) * strength;
      let ny = (d - u) * strength;
      const len = Math.hypot(nx, ny, 1);
      nx /= len;
      ny /= len;
      const i = (y * size + x) * 4;
      normal[i] = (nx * 0.5 + 0.5) * 255;
      normal[i + 1] = (ny * 0.5 + 0.5) * 255;
      normal[i + 2] = (0.5 / len + 0.5) * 255;
      normal[i + 3] = 255;
    }
  }
  return { map: dataTexture(size, color, { srgb: true }), normalMap: dataTexture(size, normal, { srgb: false }) };
}

// Weathered ashlar masonry: staggered blocks, recessed mortar, grime streaks.
export function stoneMaps(size) {
  const rows = 16;
  const perRow = 8;
  return materialMaps(
    size,
    (u, v, c) => {
      const row = Math.floor(v * rows);
      const off = (row % 2) * 0.5 + hash3i(row, 7, 1) * 0.3;
      const bu = (u * perRow + off) % perRow;
      const col = Math.floor(bu);
      const lu = bu - col;
      const lv = v * rows - row;
      const edge = Math.min(lu, 1 - lu, (lv * perRow) / rows / 1, ((1 - lv) * perRow) / rows);
      const chip = fbm3(u * 24, v * 24, 0.5, 3, 24, 3) * 0.06;
      const block = smooth(0.015, 0.06, edge - chip);
      const id = hash3i(col, row, 3);
      const grain = fbm3(u * 64, v * 64, 1.5, 3, 64, 9);
      const grime = fbm3(u * 4, v * 12, 2.5, 3, 4, 5);
      const tone = (0.36 + id * 0.16) * (0.82 + grain * 0.3) * (0.75 + grime * 0.35);
      const mortar = 0.17 + grain * 0.06;
      const g = mortar + (tone - mortar) * block;
      c[0] = g * 1.02;
      c[1] = g;
      c[2] = g * 0.96;
      return block * (0.85 + id * 0.15) + grain * 0.25;
    },
    5,
  );
}

// Overlapping slate shingles.
export function slateMaps(size) {
  const rows = 24;
  const perRow = 16;
  return materialMaps(
    size,
    (u, v, c) => {
      const row = Math.floor(v * rows);
      const lv = v * rows - row;
      const bu = (u * perRow + (row % 2) * 0.5) % perRow;
      const lu = bu - Math.floor(bu);
      const id = hash3i(Math.floor(bu), row, 11);
      const gap = smooth(0.02, 0.08, Math.min(lu, 1 - lu));
      const grain = fbm3(u * 48, v * 48, 0.3, 3, 48, 2);
      const g = (0.11 + id * 0.07) * (0.85 + grain * 0.3) * (0.6 + gap * 0.4);
      c[0] = g * 0.95;
      c[1] = g;
      c[2] = g * 1.08;
      return lv * gap + grain * 0.15;
    },
    4,
  );
}

// Granite with cracks and lichen.
export function rockMaps(size) {
  return materialMaps(
    size,
    (u, v, c) => {
      const n = fbm3(u * 6, v * 6, 0.7, 6, 6, 21);
      const ridge = 1 - Math.abs(fbm3(u * 10, v * 10, 3.1, 4, 10, 33) * 2 - 1);
      const crack = smooth(0.82, 0.97, ridge);
      const lichen = smooth(0.58, 0.7, fbm3(u * 14, v * 14, 5.3, 3, 14, 41));
      const speck = valueNoise3(u * 256, v * 256, 0.5, 256, 4);
      const g = (0.2 + n * 0.22) * (1 - crack * 0.6) * (0.92 + speck * 0.16);
      c[0] = g * (1 + lichen * 0.12);
      c[1] = g * (1 + lichen * 0.15);
      c[2] = g * (0.95 - lichen * 0.05);
      return n * 0.9 - crack * 0.5 + speck * 0.05;
    },
    6,
  );
}

// Wet tidal sand with wind ripples.
export function sandMaps(size) {
  return materialMaps(
    size,
    (u, v, c) => {
      const warp = fbm3(u * 4, v * 4, 0.2, 3, 4, 61);
      const ripple = Math.sin((v * 22 + warp * 3) * Math.PI * 2) * 0.5 + 0.5;
      const grain = valueNoise3(u * 200, v * 200, 0.1, 200, 8);
      const g = (0.1 + warp * 0.05) * (0.9 + ripple * 0.12) * (0.94 + grain * 0.12);
      c[0] = g * 1.05;
      c[1] = g;
      c[2] = g * 0.9;
      return ripple * 0.6 + grain * 0.15;
    },
    3,
  );
}

// Tileable normal map for the water surface.
export function waterNormals(size) {
  return materialMaps(
    size,
    (u, v, c) => {
      c[0] = c[1] = c[2] = 0.5;
      return fbm3(u * 8, v * 8, 0.4, 5, 8, 71) + fbm3(u * 32, v * 32, 1.4, 3, 32, 72) * 0.25;
    },
    9,
  ).normalMap;
}

// The full moon as a lit disc: maria, highlands, foreshortened craters and ray systems.
export function moonDisc(size) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  const R = size / 2 - 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = (x + 0.5 - size / 2) / R;
      const py = (y + 0.5 - size / 2) / R;
      const r2 = px * px + py * py;
      const i = (y * size + x) * 4;
      if (r2 > 1.02) continue;
      const nz = Math.sqrt(Math.max(0, 1 - r2));
      const sx = px * 2.1;
      const sy = py * 2.1;
      const sz = nz * 2.1;
      const maria = smooth(0.44, 0.7, fbm3(sx + 3.1, sy - 1.7, sz, 5, 0, 101));
      const high = fbm3(sx * 7, sy * 7, sz * 7, 4, 0, 102);
      const fine = valueNoise3(sx * 40, sy * 40, sz * 40, 0, 103);
      let g = 0.8 * (1 - maria * 0.32) * (0.88 + high * 0.2) * (0.95 + fine * 0.08);
      g *= 0.78 + 0.22 * Math.pow(nz, 0.35); // gentle limb darkening
      const alpha = clamp01((1 - Math.sqrt(r2)) * R);
      img.data[i] = g * 255;
      img.data[i + 1] = g * 252;
      img.data[i + 2] = g * 246;
      img.data[i + 3] = alpha * 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, R, 0, Math.PI * 2);
  ctx.clip();
  ctx.globalCompositeOperation = 'source-atop';
  const rand = mulberry32(77);
  const crater = (bright) => {
    // Uniform-ish point on the visible hemisphere
    const a = rand() * Math.PI * 2;
    const rr = Math.sqrt(rand()) * 0.98;
    const px = Math.cos(a) * rr;
    const py = Math.sin(a) * rr;
    const nz = Math.sqrt(1 - rr * rr);
    const rad = (bright ? 0.03 : 0.004 + Math.pow(rand(), 3.2) * 0.05) * R;
    ctx.save();
    ctx.translate(size / 2 + px * R, size / 2 + py * R);
    ctx.rotate(a);
    ctx.scale(Math.max(nz, 0.15), 1); // foreshortened toward the limb
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rad * 1.25);
    g.addColorStop(0, bright ? 'rgba(255,255,250,0.5)' : 'rgba(40,40,45,0.12)');
    g.addColorStop(0.7, bright ? 'rgba(255,255,250,0.3)' : 'rgba(40,40,45,0.07)');
    g.addColorStop(0.82, 'rgba(255,255,250,0.14)');
    g.addColorStop(1, 'rgba(255,255,250,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rad * 1.25, 0, Math.PI * 2);
    ctx.fill();
    if (bright) {
      // Ray system
      ctx.strokeStyle = 'rgba(255,255,250,0.07)';
      for (let k = 0; k < 26; k++) {
        const t = rand() * Math.PI * 2;
        const len = rad * (4 + rand() * 14);
        ctx.lineWidth = rad * (0.15 + rand() * 0.35);
        ctx.beginPath();
        ctx.moveTo(Math.cos(t) * rad, Math.sin(t) * rad);
        ctx.lineTo(Math.cos(t) * len, Math.sin(t) * len);
        ctx.stroke();
      }
    }
    ctx.restore();
  };
  for (let k = 0; k < 520; k++) crater(false);
  for (let k = 0; k < 3; k++) crater(true);
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
