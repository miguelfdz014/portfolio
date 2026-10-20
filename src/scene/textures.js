import * as THREE from 'three';
import * as gen from './gen.js';
import { mulberry32 } from './noise.js';

// ---------------------------------------------------------------- Worker pool
// Heavy generators run in parallel Web Workers so the page never freezes.
// Falls back to the main thread when workers or OffscreenCanvas aren't available.
const domCanvas = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });
const runLocal = (job, size) => (job === 'moon' ? gen.moon(size, domCanvas) : gen.jobs[job](size));

export function createGenerator() {
  const supported = typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined';
  if (!supported) {
    return { run: (job, size) => new Promise((r) => setTimeout(() => r(runLocal(job, size)))), dispose() {} };
  }
  const count = Math.max(1, Math.min(3, (navigator.hardwareConcurrency || 2) - 1));
  const workers = Array.from({ length: count }, () => new Worker(new URL('./gen.worker.js', import.meta.url), { type: 'module' }));
  const pending = new Map();
  let seq = 0;
  let next = 0;
  for (const w of workers) {
    w.onmessage = ({ data }) => {
      const p = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) p.fallback();
      else p.resolve(data.out);
    };
  }
  return {
    run(job, size) {
      const id = ++seq;
      return new Promise((resolve) => {
        pending.set(id, { resolve, fallback: () => resolve(runLocal(job, size)) });
        workers[next++ % count].postMessage({ id, job, size });
      });
    },
    dispose() {
      workers.forEach((w) => w.terminate());
    },
  };
}

// ---------------------------------------------------------------- GPU wrappers
function dataTexture(size, data, srgb, repeat = true) {
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

export const toMaps = (raw) => ({
  map: raw.color ? dataTexture(raw.size, raw.color, true) : null,
  normalMap: dataTexture(raw.size, raw.normal, false),
});

export const toMoon = (raw) => dataTexture(raw.size, raw.color, true, false);

export function toVolume(raw) {
  const n = raw.size;
  const tex = new THREE.Data3DTexture(raw.data, n, n, n);
  tex.format = THREE.RedFormat;
  tex.type = THREE.UnsignedByteType;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = tex.wrapR = THREE.RepeatWrapping;
  tex.unpackAlignment = 1;
  tex.needsUpdate = true;
  return tex;
}

// ---------------------------------------------------------------- Small canvas textures (cheap)
function canvasTexture(w, h, draw, srgb = true) {
  const c = domCanvas(w, h);
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Mont-Saint-Michel silhouette used as the heraldic emblem on banners.
function drawMount(ctx, cx, base, s) {
  ctx.beginPath();
  ctx.moveTo(cx - 1.0 * s, base);
  ctx.lineTo(cx - 0.62 * s, base - 0.22 * s);
  ctx.lineTo(cx - 0.36 * s, base - 0.42 * s);
  ctx.lineTo(cx - 0.18 * s, base - 0.5 * s);
  ctx.lineTo(cx - 0.18 * s, base - 0.66 * s);
  ctx.lineTo(cx - 0.07 * s, base - 0.66 * s);
  ctx.lineTo(cx - 0.07 * s, base - 0.82 * s);
  ctx.lineTo(cx, base - 1.25 * s);
  ctx.lineTo(cx + 0.07 * s, base - 0.82 * s);
  ctx.lineTo(cx + 0.07 * s, base - 0.66 * s);
  ctx.lineTo(cx + 0.2 * s, base - 0.62 * s);
  ctx.lineTo(cx + 0.38 * s, base - 0.42 * s);
  ctx.lineTo(cx + 0.64 * s, base - 0.22 * s);
  ctx.lineTo(cx + 1.0 * s, base);
  ctx.closePath();
  ctx.fill();
}

// Woven crimson banner with a bone border and the mount as its charge.
export function bannerTextures() {
  const W = 512;
  const H = 256;
  const rand = mulberry32(12);
  const map = canvasTexture(W, H, (ctx) => {
    ctx.fillStyle = '#8f0b22';
    ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 2) {
      ctx.fillStyle = `rgba(0,0,0,${0.06 + rand() * 0.08})`;
      ctx.fillRect(0, y, W, 1);
    }
    for (let x = 0; x < W; x += 2) {
      ctx.fillStyle = `rgba(255,255,255,${0.02 + rand() * 0.03})`;
      ctx.fillRect(x, 0, 1, H);
    }
    ctx.strokeStyle = '#d8d0bd';
    ctx.lineWidth = 10;
    ctx.strokeRect(14, 14, W - 28, H - 28);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 24, W - 48, H - 48);
    ctx.fillStyle = '#e8e2d0';
    drawMount(ctx, W * 0.42, H * 0.8, 105);
    // wear and grime
    for (let i = 0; i < 1400; i++) {
      ctx.fillStyle = `rgba(0,0,0,${rand() * 0.08})`;
      ctx.fillRect(rand() * W, rand() * H, 2 + rand() * 4, 1 + rand() * 2);
    }
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.25)');
    g.addColorStop(0.15, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  });
  // Woven-cloth normal map
  const normalMap = canvasTexture(
    64,
    64,
    (ctx, w, h) => {
      const img = ctx.createImageData(w, h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          img.data[i] = (0.5 + Math.sin(x * Math.PI) * 0.17) * 255;
          img.data[i + 1] = (0.5 + Math.sin(y * Math.PI) * 0.17) * 255;
          img.data[i + 2] = 230;
          img.data[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    },
    false,
  );
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(24, 12);
  return { map, normalMap };
}

// Tall heraldic banner for hanging above the gate.
export function bannerTallTexture() {
  const W = 256;
  const H = 420;
  const rand = mulberry32(14);
  return canvasTexture(W, H, (ctx) => {
    ctx.fillStyle = '#8f0b22';
    ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 2) {
      ctx.fillStyle = `rgba(0,0,0,${0.06 + rand() * 0.08})`;
      ctx.fillRect(0, y, W, 1);
    }
    ctx.strokeStyle = '#d8d0bd';
    ctx.lineWidth = 9;
    ctx.strokeRect(12, 12, W - 24, H - 24);
    ctx.fillStyle = '#e8e2d0';
    drawMount(ctx, W / 2, H * 0.68, 95);
    ctx.fillRect(W * 0.2, H * 0.78, W * 0.6, 5);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0.35)');
    g.addColorStop(0.2, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  });
}

// Gothic rose window: radiating mullions and foils over leaded glass.
export function roseWindowTexture() {
  const S = 512;
  return canvasTexture(S, S, (ctx) => {
    const c = S / 2;
    const glass = ['#b3102b', '#d4213f', '#8a0a20', '#c98a3a', '#f0d9a8'];
    const rand = mulberry32(31);
    ctx.fillStyle = '#050304';
    ctx.fillRect(0, 0, S, S);
    for (let r = 20; r < c - 18; r += 14) {
      const n = Math.floor((r * Math.PI * 2) / 18);
      for (let k = 0; k < n; k++) {
        const a0 = (k / n) * Math.PI * 2;
        const a1 = ((k + 1) / n) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(c, c, r + 14, a0, a1);
        ctx.arc(c, c, r, a1, a0, true);
        ctx.closePath();
        const outer = r / c > 0.75;
        ctx.fillStyle = outer ? glass[rand() < 0.5 ? 3 : 4] : glass[rand() < 0.1 ? 3 : Math.floor(rand() * 3)];
        ctx.fill();
      }
    }
    ctx.strokeStyle = 'rgba(5,3,4,0.85)';
    ctx.lineWidth = 2;
    for (let r = 20; r < c - 4; r += 14) {
      ctx.beginPath();
      ctx.arc(c, c, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = '#17141a';
    ctx.lineCap = 'round';
    ctx.lineWidth = 9;
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(c + Math.cos(a) * 46, c + Math.sin(a) * 46);
      ctx.lineTo(c + Math.cos(a) * (c - 22), c + Math.sin(a) * (c - 22));
      ctx.stroke();
    }
    ctx.lineWidth = 7;
    for (let k = 0; k < 12; k++) {
      const a = ((k + 0.5) / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(c + Math.cos(a) * (c - 62), c + Math.sin(a) * (c - 62), 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(c + Math.cos(a) * 112, c + Math.sin(a) * 112, 20, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(c, c, 46, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(c, c, c - 14, 0, Math.PI * 2);
    ctx.stroke();
    const glow = ctx.createRadialGradient(c, c, 0, c, c, c);
    glow.addColorStop(0, 'rgba(255,220,180,0.25)');
    glow.addColorStop(1, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(c, c, c - 14, 0, Math.PI * 2);
    ctx.fill();
    // Outside the window is transparent
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.arc(c, c, c - 8, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Warm light seen through the open gate, fading into the passage.
export function gateGlowTexture() {
  return canvasTexture(128, 256, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h * 0.8, 0, w / 2, h * 0.8, h * 0.8);
    g.addColorStop(0, '#ffcf8a');
    g.addColorStop(0.35, '#c26a2a');
    g.addColorStop(1, '#120805');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

export function glowTexture() {
  return canvasTexture(256, 256, (ctx) => {
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.22, 'rgba(255,255,255,0.3)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  });
}

export function smokeTexture() {
  return canvasTexture(128, 128, (ctx) => {
    const rand = mulberry32(5);
    for (let i = 0; i < 14; i++) {
      const x = 64 + (rand() - 0.5) * 50;
      const y = 64 + (rand() - 0.5) * 50;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 30 + rand() * 20);
      g.addColorStop(0, 'rgba(255,255,255,0.18)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
    }
  });
}

// Night sky gradient with a faint glow along the horizon.
export function skyTexture() {
  return canvasTexture(4, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#010102');
    g.addColorStop(0.36, '#06060a');
    g.addColorStop(0.46, '#0e0f16');
    g.addColorStop(0.497, '#1d1f29');
    g.addColorStop(0.5, '#23252f');
    g.addColorStop(0.53, '#0c0c10');
    g.addColorStop(1, '#050506');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

// Vertical haze band that sits on the horizon ring.
export function hazeTexture() {
  return canvasTexture(4, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(150,155,175,0)');
    g.addColorStop(0.65, 'rgba(150,155,175,0.16)');
    g.addColorStop(0.92, 'rgba(150,155,175,0.3)');
    g.addColorStop(1, 'rgba(150,155,175,0.1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

// A thin bright streak for shooting stars (head on the right).
export function streakTexture() {
  return canvasTexture(256, 16, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.85, 'rgba(220,228,255,0.6)');
    g.addColorStop(1, 'rgba(255,255,255,1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, h / 2 - 1.5, w, 3);
  });
}
