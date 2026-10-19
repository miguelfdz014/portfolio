import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

const CRIMSON = 0xc8102e;
const FOG_COLOR = 0x0a0a0d;
const MOON_POS = new THREE.Vector3(0, 250, -700);

// Camera path: one stop per page section ([data-cam] elements, in order).
// Hero above the clouds → descent → the mount from afar → across the water → up past the spire.
const CAM_STOPS = [
  { pos: [0, 205, 300], look: [0, 200, -700] },
  { pos: [0, 118, 280], look: [0, 130, -500] },
  { pos: [0, 9, 235], look: [0, 50, 0] },
  { pos: [120, 16, 205], look: [0, 46, 0] },
  { pos: [-58, 66, 100], look: [0, 128, -40] },
];

// Deterministic pseudo-random so the scene is identical on every visit.
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(966);
const range = (a, b) => a + rand() * (b - a);

function hash3(x, y, z) {
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return s - Math.floor(s);
}

function canvasTexture(size, draw, { repeat = false, w = size, h = size } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

const stoneTexture = () =>
  canvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#1e1e21';
      ctx.fillRect(0, 0, s, s);
      for (let row = 0; row < s / 12; row++) {
        const off = row % 2 ? 14 : 0;
        for (let x = -off; x < s; x += 28) {
          const g = 38 + Math.floor(rand() * 30);
          ctx.fillStyle = `rgb(${g},${g},${g + 3})`;
          ctx.fillRect(x + 1, row * 12 + 1, 26, 10);
        }
      }
      for (let i = 0; i < 3000; i++) {
        const g = Math.floor(rand() * 80);
        ctx.fillStyle = `rgba(${g},${g},${g},0.35)`;
        ctx.fillRect(rand() * s, rand() * s, 1.5, 1.5);
      }
    },
    { repeat: true },
  );

const rockTexture = () =>
  canvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#26262a';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 5000; i++) {
        const g = 20 + Math.floor(rand() * 60);
        ctx.fillStyle = `rgba(${g},${g},${g + 4},0.5)`;
        ctx.fillRect(rand() * s, rand() * s, range(1, 4), range(1, 3));
      }
    },
    { repeat: true },
  );

const moonTexture = () =>
  canvasTexture(512, (ctx, s) => {
    const g = ctx.createRadialGradient(s * 0.45, s * 0.42, s * 0.05, s / 2, s / 2, s / 2);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.75, '#ececef');
    g.addColorStop(1, '#c4c4ca');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 10; i++) {
      const x = range(0.15, 0.85) * s;
      const y = range(0.15, 0.85) * s;
      const r = range(0.06, 0.2) * s;
      const m = ctx.createRadialGradient(x, y, 0, x, y, r);
      m.addColorStop(0, 'rgba(130,130,140,0.32)');
      m.addColorStop(1, 'rgba(130,130,140,0)');
      ctx.fillStyle = m;
      ctx.fillRect(0, 0, s, s);
    }
    for (let i = 0; i < 70; i++) {
      ctx.strokeStyle = 'rgba(110,110,120,0.22)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(rand() * s, rand() * s, range(2, 12), 0, Math.PI * 2);
      ctx.stroke();
    }
  });

const glowTexture = () =>
  canvasTexture(256, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });

// Cumulus-like puff made of overlapping soft blobs.
const cloudTexture = () =>
  canvasTexture(
    256,
    (ctx, w, h) => {
      for (let i = 0; i < 26; i++) {
        const x = w * (0.5 + (rand() - 0.5) * 0.62);
        const y = h * (0.56 + (rand() - 0.5) * 0.3 - Math.abs(x / w - 0.5) * 0.15);
        const r = range(0.12, 0.26) * h;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(255,255,255,0.32)');
        g.addColorStop(0.6, 'rgba(255,255,255,0.12)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
    },
    { w: 512, h: 256 },
  );

const rippleTexture = () =>
  canvasTexture(
    256,
    (ctx, s) => {
      ctx.clearRect(0, 0, s, s);
      for (let i = 0; i < 260; i++) {
        ctx.fillStyle = `rgba(5,5,8,${range(0.25, 0.8)})`;
        ctx.fillRect(rand() * s, rand() * s, range(8, 50), range(1, 2.5));
      }
    },
    { repeat: true },
  );

const skyTexture = () =>
  canvasTexture(
    16,
    (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#020203');
      g.addColorStop(0.42, '#08080b');
      g.addColorStop(0.5, '#16161c');
      g.addColorStop(0.56, '#0a0a0d');
      g.addColorStop(1, '#050506');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
    { w: 4, h: 256 },
  );

// Triangular prism for gable roofs: ridge along local x, base at y=0, apex at y=1.5.
function prismGeometry() {
  const g = new THREE.CylinderGeometry(1, 1, 1, 3, 1, false, Math.PI / 2);
  g.rotateZ(Math.PI / 2);
  g.translate(0, 0.5, 0);
  return g;
}

// ---------------------------------------------------------------- Mont-Saint-Michel
const ROCK_PROFILE = [
  [64, -2], [62, 0], [57, 3], [51, 8], [45, 13], [39, 19], [33, 25], [27, 31], [21, 36], [16, 40], [13, 43], [0, 44],
];
function rockRadiusAt(y) {
  for (let i = 0; i < ROCK_PROFILE.length - 1; i++) {
    const [r0, y0] = ROCK_PROFILE[i];
    const [r1, y1] = ROCK_PROFILE[i + 1];
    if (y >= y0 && y <= y1) return r0 + ((y - y0) / (y1 - y0)) * (r1 - r0);
  }
  return 0;
}

function buildMount() {
  const mount = new THREE.Group();
  const stoneTex = stoneTexture();
  stoneTex.repeat.set(2, 2);
  const stone = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.9 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1f, roughness: 0.88, metalness: 0 });
  const spireMat = new THREE.MeshStandardMaterial({ color: 0x141418, roughness: 0.55, metalness: 0.3 });
  const add = (geo, mat, x, y, z, ry = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    mount.add(m);
    return m;
  };

  // Rock
  const rockGeo = new THREE.LatheGeometry(ROCK_PROFILE.map(([r, y]) => new THREE.Vector2(r, y)), 72);
  const p = rockGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    if (y > 43.5) continue;
    const n = hash3(Math.round(x * 4), Math.round(y * 4), Math.round(z * 4));
    const k = 1 + (n - 0.5) * 0.12 + Math.sin(Math.atan2(x, z) * 5 + y * 0.3) * 0.04;
    p.setXYZ(i, x * k, y + (n - 0.5) * 1.2, z * k);
  }
  rockGeo.computeVertexNormals();
  const rockTex = rockTexture();
  rockTex.repeat.set(8, 4);
  add(rockGeo, new THREE.MeshStandardMaterial({ map: rockTex, roughness: 1, flatShading: true }), 0, 0, 0);

  const merlons = [];
  const windows = [];

  // Ramparts around the front of the base, with round towers
  const R = 63;
  const a0 = -2.1;
  const a1 = 2.1;
  const segs = 14;
  for (let i = 0; i < segs; i++) {
    const aa = a0 + ((a1 - a0) * i) / segs;
    const ab = a0 + ((a1 - a0) * (i + 1)) / segs;
    const xA = Math.sin(aa) * R;
    const zA = Math.cos(aa) * R;
    const xB = Math.sin(ab) * R;
    const zB = Math.cos(ab) * R;
    const len = Math.hypot(xB - xA, zB - zA);
    const ang = -Math.atan2(zB - zA, xB - xA);
    add(new THREE.BoxGeometry(len + 0.4, 9, 2.2), stone, (xA + xB) / 2, 4.5, (zA + zB) / 2, ang);
    for (let s = 0.8; s < len; s += 1.6) {
      merlons.push([xA + ((xB - xA) * s) / len, 9.4, zA + ((zB - zA) * s) / len, ang]);
    }
    if (i % 2 === 0) {
      const tr = i === 8 ? 4.2 : 3.2;
      const th = i === 8 ? 15 : 12;
      add(new THREE.CylinderGeometry(tr, tr * 1.08, th, 20), stone, xA, th / 2, zA);
      if (i === 8) add(new THREE.ConeGeometry(tr * 1.25, 6, 20), roofMat, xA, th + 3, zA);
      else
        for (let k = 0; k < 10; k++) {
          const t = (k / 10) * Math.PI * 2;
          merlons.push([xA + Math.sin(t) * tr, th + 0.4, zA + Math.cos(t) * tr, t]);
        }
    }
  }

  // Village houses climbing the front face
  const houses = [];
  for (let y = 7; y < 37; y += 2.6) {
    const r = rockRadiusAt(y);
    const span = 1.9 - (y / 40) * 0.6;
    const step = 6.2 / r;
    for (let a = -span; a < span; a += step * range(0.85, 1.25)) {
      if (rand() < 0.12) continue;
      houses.push({ a, y: y - 1 + range(-1.1, 1.1), r: r - range(0.2, 1.4), w: range(2.6, 6), h: range(3, 7.5), d: range(3, 4.5), turn: range(-0.25, 0.25) });
    }
  }
  const bodyMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), stone, houses.length);
  const roofMesh = new THREE.InstancedMesh(prismGeometry(), roofMat, houses.length);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const col = new THREE.Color();
  houses.forEach((h, i) => {
    const x = Math.sin(h.a) * h.r;
    const z = Math.cos(h.a) * h.r;
    q.setFromAxisAngle(up, h.a + h.turn);
    m4.compose(new THREE.Vector3(x, h.y, z), q, new THREE.Vector3(h.w, h.h, h.d));
    bodyMesh.setMatrixAt(i, m4);
    const g = range(0.75, 1.15);
    bodyMesh.setColorAt(i, col.setRGB(g, g, g));
    m4.compose(new THREE.Vector3(x, h.y + h.h, z), q, new THREE.Vector3(h.w * 1.06, range(1.2, 2), h.d * 0.62));
    roofMesh.setMatrixAt(i, m4);
    const nWin = rand() < 0.3 ? 1 : 0;
    for (let k = 0; k < nWin; k++) {
      const lx = (k - (nWin - 1) / 2) * h.w * 0.4;
      const ly = h.y + h.h * range(0.4, 0.7);
      const lz = h.d / 2 + 0.05;
      windows.push({
        x: x + lx * Math.cos(h.a) + lz * Math.sin(h.a),
        y: ly,
        z: z - lx * Math.sin(h.a) + lz * Math.cos(h.a),
        ry: h.a,
        w: 0.55,
        h: 0.9,
        crimson: rand() < 0.3,
      });
    }
  });
  mount.add(bodyMesh, roofMesh);

  // Abbey on the summit
  add(new THREE.BoxGeometry(24, 13, 30), stone, 0, 44, -3); // foundations
  add(new THREE.BoxGeometry(12, 30, 28), stone, -13, 30, -10); // La Merveille (north flank)
  add(new THREE.BoxGeometry(9, 12, 26), stone, 0, 56.5, 3); // nave
  const naveRoof = add(prismGeometry(), roofMat, 0, 62.5, 3, Math.PI / 2);
  naveRoof.scale.set(26, 4.2, 5.4);
  add(new THREE.BoxGeometry(22, 11, 8), stone, 0, 56, -7); // transept
  const transRoof = add(prismGeometry(), roofMat, 0, 61.5, -7);
  transRoof.scale.set(22, 3.8, 4.8);
  add(new THREE.CylinderGeometry(6, 6, 14, 16, 1, false, Math.PI / 2, Math.PI), stone, 0, 57, -11); // apse
  add(new THREE.ConeGeometry(6.4, 6, 16, 1, false, Math.PI / 2, Math.PI), roofMat, 0, 67, -11);
  // buttresses with pinnacles
  for (let z = -6; z <= 14; z += 4) {
    for (const sx of [-1, 1]) {
      add(new THREE.BoxGeometry(1.4, 12, 1.4), stone, sx * 5.2, 56, z);
      add(new THREE.ConeGeometry(0.7, 3, 4), roofMat, sx * 5.2, 63.5, z);
    }
  }
  for (const [x, z] of [[-11, -10.5], [11, -10.5], [-11, -3.5], [11, -3.5]]) {
    add(new THREE.BoxGeometry(1.6, 13, 1.6), stone, x, 56.5, z);
    add(new THREE.ConeGeometry(0.9, 4, 4), roofMat, x, 65, z);
  }
  // crossing tower, belfry, spire and the archangel
  add(new THREE.BoxGeometry(8, 10, 8), stone, 0, 67, -7);
  add(new THREE.CylinderGeometry(3.6, 3.8, 10, 8), stone, 0, 77, -7);
  for (let k = 0; k < 8; k++) {
    const t = (k / 8) * Math.PI * 2 + Math.PI / 8;
    add(new THREE.ConeGeometry(0.5, 4, 4), roofMat, Math.sin(t) * 4, 83.5, -7 + Math.cos(t) * 4);
  }
  add(new THREE.ConeGeometry(3.6, 30, 8), spireMat, 0, 97, -7);
  const angelMat = new THREE.MeshStandardMaterial({ color: 0xd8c9a0, metalness: 0.9, roughness: 0.35, emissive: 0x2a2010 });
  add(new THREE.CylinderGeometry(0.25, 0.45, 3, 6), angelMat, 0, 113.4, -7);
  const wing = add(new THREE.ConeGeometry(0.6, 2.2, 3), angelMat, 0, 114.4, -7.3);
  wing.rotation.x = 0.6;
  add(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 4), angelMat, 0.5, 115.6, -7);

  // Gothic windows on the church
  for (let z = -4; z <= 12; z += 4) {
    for (const sx of [-1, 1]) windows.push({ x: sx * 4.56, y: 56, z, ry: (sx * Math.PI) / 2, w: 1.1, h: 4.5, crimson: true });
  }
  for (const [x, y] of [[-7, 46], [-3, 46], [3, 46], [7, 46], [-5, 41], [5, 41]]) {
    windows.push({ x, y, z: 12.06, ry: 0, w: 0.8, h: 1.6, crimson: false });
  }

  // West rose window
  const rose = add(new THREE.CircleGeometry(1.9, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 0.06, 0.14), toneMapped: false }), 0, 57.5, 16.08);
  rose.renderOrder = 1;

  // Merlons
  const merlonMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.8, 0.9, 0.9), stone, merlons.length);
  const dummy = new THREE.Object3D();
  merlons.forEach(([x, y, z, ry], i) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, ry, 0);
    dummy.updateMatrix();
    merlonMesh.setMatrixAt(i, dummy.matrix);
  });
  mount.add(merlonMesh);

  // Windows: one instanced emissive mesh with per-instance colour
  const winMat = new THREE.MeshBasicMaterial({ toneMapped: false });
  const winMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), winMat, windows.length);
  const warm = new THREE.Color(0.95, 0.78, 0.55);
  const red = new THREE.Color(1.5, 0.06, 0.14);
  windows.forEach((w, i) => {
    dummy.position.set(w.x, w.y, w.z);
    dummy.rotation.set(0, w.ry, 0);
    dummy.scale.set(w.w, w.h, 1);
    dummy.updateMatrix();
    winMesh.setMatrixAt(i, dummy.matrix);
    winMesh.setColorAt(i, w.crimson ? red : warm);
  });
  mount.add(winMesh);

  // Banner on the gate tower
  const flagMat = new THREE.MeshStandardMaterial({ color: CRIMSON, emissive: 0x4a0010, side: THREE.DoubleSide });
  const gx = Math.sin(a0 + ((a1 - a0) * 8) / segs) * R;
  const gz = Math.cos(a0 + ((a1 - a0) * 8) / segs) * R;
  add(new THREE.CylinderGeometry(0.12, 0.12, 6, 6), roofMat, gx, 24, gz);
  const flagGeo = new THREE.PlaneGeometry(4, 2.2, 14, 2).translate(2, 0, 0);
  const flag = add(flagGeo, flagMat, gx, 25.6, gz);
  flag.userData.base = flagGeo.attributes.position.array.slice();

  return { mount, flag };
}

// ---------------------------------------------------------------- Sky
function buildClouds(tex) {
  const group = new THREE.Group();
  const sprites = [];
  const make = (x, y, z, sx, sy, opacity, tint, speed) => {
    const sp = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, color: tint, transparent: true, opacity, depthWrite: false, fog: false }),
    );
    sp.position.set(x, y, z);
    sp.scale.set(sx, sy, 1);
    sp.userData.speed = speed;
    sp.userData.base = tint.r;
    group.add(sp);
    sprites.push(sp);
  };
  // The deck we fly above and then descend through
  for (let i = 0; i < 170; i++) {
    const y = range(92, 150);
    const x = range(-650, 650);
    const z = range(-650, 420);
    // Leave a clearing over the mount so the moon shows through from below.
    if (Math.abs(x) < 190 && z < 190) continue;
    const bright = 0.3 + ((y - 92) / 58) * 0.32;
    const c = new THREE.Color().setScalar(bright);
    make(x, y, z, range(140, 300), range(55, 110), range(0.35, 0.75), c, range(1, 3));
  }
  // Far deck that thins out toward the horizon so there is no hard edge
  for (let i = 0; i < 110; i++) {
    const z = range(-1900, -600);
    const fade = 1 - (-z - 600) / 1300;
    const c = new THREE.Color().setScalar(range(0.28, 0.5));
    make(range(-1400, 1400), range(70, 125), z, range(260, 520), range(50, 100), range(0.25, 0.6) * (0.35 + fade * 0.65), c, range(1, 3));
  }
  // Thin bands drifting across the moon
  for (let i = 0; i < 9; i++) {
    make(range(-420, 420), range(170, 330), range(-640, -600), range(360, 620), range(22, 44), range(0.12, 0.3), new THREE.Color(0.75, 0.75, 0.8), range(2, 5));
  }
  return { group, sprites };
}

function buildStars() {
  const count = 2600;
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(range(0.02, 1));
    arr[i * 3] = Math.sin(phi) * Math.cos(theta) * 2200;
    arr[i * 3 + 1] = Math.cos(phi) * 2200;
    arr[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * 2200;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({ color: 0xffffff, size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0.85, fog: false }),
  );
}

function buildPetals(count) {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.5);
  shape.bezierCurveTo(0.45, -0.3, 0.4, 0.35, 0, 0.5);
  shape.bezierCurveTo(-0.4, 0.35, -0.45, -0.3, 0, -0.5);
  const geo = new THREE.ShapeGeometry(shape, 5).scale(0.5, 0.5, 0.5);
  const mat = new THREE.MeshStandardMaterial({
    color: CRIMSON,
    emissive: 0x6a0014,
    emissiveIntensity: 1,
    roughness: 0.45,
    side: THREE.DoubleSide,
    fog: false,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.frustumCulled = false;
  // Positions are relative to the camera and wrap inside a box around it.
  const data = Array.from({ length: count }, () => ({
    x: range(-60, 60),
    y: range(-35, 35),
    z: range(-110, -28),
    vy: range(2, 4.5),
    sway: range(1, 3),
    swaySpeed: range(0.4, 1.1),
    phase: rand() * 6,
    rx: rand() * 6,
    ry: rand() * 6,
    vrx: range(-2, 2),
    vry: range(-2, 2),
    s: range(0.7, 1.4),
  }));
  return { mesh, data };
}

// ---------------------------------------------------------------- Main
export function startWorld(container, { reducedMotion }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch {
    container.classList.add('no-webgl');
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050506);
  scene.fog = new THREE.Fog(FOG_COLOR, 220, 1500);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 6000);

  scene.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(3000, 32, 16),
      new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false, depthWrite: false }),
    ),
  );

  scene.add(new THREE.AmbientLight(0x30303a, 0.9));
  const moonLight = new THREE.DirectionalLight(0xeef0ff, 2.6);
  moonLight.position.copy(MOON_POS);
  scene.add(moonLight);
  const side = new THREE.DirectionalLight(0xb0b4c8, 1.1);
  side.position.set(-300, 180, 200);
  scene.add(side);

  const { mount, flag } = buildMount();
  scene.add(mount);

  // Water: a mirror darkened with moving ripple streaks on top
  const water = new Reflector(new THREE.PlaneGeometry(8000, 8000), {
    clipBias: 0.003,
    textureWidth: 512,
    textureHeight: 512,
    color: 0x4a4a52,
  });
  water.rotation.x = -Math.PI / 2;
  scene.add(water);
  const ripTex = rippleTexture();
  ripTex.repeat.set(160, 160);
  const ripples = new THREE.Mesh(
    new THREE.PlaneGeometry(8000, 8000),
    new THREE.MeshBasicMaterial({ map: ripTex, transparent: true, opacity: 0.85, depthWrite: false }),
  );
  ripples.rotation.x = -Math.PI / 2;
  ripples.position.y = 0.08;
  scene.add(ripples);

  scene.add(buildStars());

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(82, 48, 48),
    new THREE.MeshBasicMaterial({ map: moonTexture(), color: 0xf4f4f6, fog: false, toneMapped: false }),
  );
  moon.position.copy(MOON_POS);
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture(),
      color: 0xd0d4ff,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      fog: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  halo.position.copy(MOON_POS).add(new THREE.Vector3(0, 0, 5));
  halo.scale.set(760, 760, 1);
  scene.add(moon, halo);

  const clouds = buildClouds(cloudTexture());
  scene.add(clouds.group);

  const petals = buildPetals(window.innerWidth < 760 ? 120 : 220);
  scene.add(petals.mesh);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.5, 0.86);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // Camera path
  const posCurve = new THREE.CatmullRomCurve3(CAM_STOPS.map((s) => new THREE.Vector3(...s.pos)), false, 'centripetal');
  const lookCurve = new THREE.CatmullRomCurve3(CAM_STOPS.map((s) => new THREE.Vector3(...s.look)), false, 'centripetal');
  const stopEls = [...document.querySelectorAll('[data-cam]')];
  let stopY = [];
  let distScale = 1;
  let panY = 0;

  // Each section's stop is reached when that section is centred in the viewport.
  function measure() {
    const vh = window.innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    stopY = stopEls.map((el, i) => {
      if (i === 0) return 0;
      if (i === stopEls.length - 1) return max;
      const r = el.getBoundingClientRect();
      return Math.min(max, r.top + window.scrollY + r.height / 2 - vh / 2);
    });
    for (let i = 1; i < stopY.length; i++) stopY[i] = Math.max(stopY[i], stopY[i - 1] + 1);
  }

  function scrollToU(y) {
    if (y <= 0) return 0;
    for (let i = 0; i < stopY.length - 1; i++) {
      if (y < stopY[i + 1]) return i + (y - stopY[i]) / (stopY[i + 1] - stopY[i]);
    }
    return stopY.length - 1;
  }

  let running = !reducedMotion;
  let raf = 0;

  function layout() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.resolution.set(w / 2, h / 2);
    camera.aspect = w / h;
    // Pull back on tall screens so the mount still fits horizontally.
    distScale = camera.aspect < 0.8 ? 1.45 : camera.aspect < 1.15 ? 1.15 : 1;
    // On phones, pan down so the scene sits in the upper half above the text.
    panY = camera.aspect < 0.8 ? -22 : 0;
    camera.updateProjectionMatrix();
    measure();
    if (!running) render(performance.now());
  }

  let mx = 0;
  let my = 0;
  let cx = 0;
  let cy = 0;
  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX / window.innerWidth - 0.5;
      my = e.clientY / window.innerHeight - 0.5;
    },
    { passive: true },
  );

  const dummy = new THREE.Object3D();
  const pos = new THREE.Vector3();
  const look = new THREE.Vector3();
  const start = performance.now();
  let last = start;
  let u = null;

  function render(now) {
    const t = (now - start) / 1000;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    // Ease the camera toward the scroll position. Reduced motion: fixed view of the mount.
    const targetU = reducedMotion ? 2 : scrollToU(window.scrollY);
    if (u === null || reducedMotion) u = targetU;
    else u += (targetU - u) * (1 - Math.exp(-dt * 3.2));
    const k = u / (CAM_STOPS.length - 1);
    posCurve.getPoint(k, pos);
    lookCurve.getPoint(k, look);
    pos.sub(look).multiplyScalar(distScale).add(look);
    // Pan applies from the About stop onward; the hero keeps the moon centred.
    const pan = panY * Math.min(Math.max(u - 1, 0), 1);
    pos.y += pan;
    look.y += pan;
    cx += (mx - cx) * 0.04;
    cy += (my - cy) * 0.04;
    pos.x += cx * 10 + Math.sin(t * 0.08) * 2;
    pos.y += -cy * 5;
    camera.position.copy(pos);
    camera.lookAt(look);

    if (!reducedMotion) {
      const fp = flag.geometry.attributes.position;
      const base = flag.userData.base;
      for (let i = 0; i < fp.count; i++) {
        const x = base[i * 3];
        fp.setZ(i, Math.sin(x * 1.4 - t * 4) * 0.12 * x);
      }
      fp.needsUpdate = true;

      for (const sp of clouds.sprites) {
        sp.position.x += sp.userData.speed * dt;
        if (sp.position.x > 1400) sp.position.x = -1400;
        // Clouds seen from underneath are in shadow.
        const below = Math.min(Math.max((sp.position.y - camera.position.y) / 45, 0), 1);
        sp.material.color.setScalar(sp.userData.base * (1 - below * 0.72));
      }
      ripTex.offset.x = t * 0.004;
      ripTex.offset.y = t * 0.002;

      const { mesh, data } = petals;
      for (let i = 0; i < data.length; i++) {
        const d = data[i];
        d.y -= d.vy * dt;
        d.x += 1.2 * dt;
        d.rx += d.vrx * dt;
        d.ry += d.vry * dt;
        if (d.y < -35) d.y = 35;
        if (d.x > 60) d.x = -60;
        // Placed in camera space so petals always drift through the view.
        dummy.position.set(d.x + Math.sin(t * d.swaySpeed + d.phase) * d.sway, d.y, d.z);
        dummy.position.applyQuaternion(camera.quaternion).add(camera.position);
        dummy.rotation.set(d.rx, d.ry, 0);
        dummy.scale.setScalar(d.s);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    } else {
      petals.mesh.visible = false;
    }

    composer.render();
  }

  function loop(now) {
    render(now);
    if (running) raf = requestAnimationFrame(loop);
  }

  window.addEventListener('resize', layout);
  window.addEventListener('load', measure);
  layout();

  if (!reducedMotion) {
    raf = requestAnimationFrame(loop);
    // Pause while the tab is hidden.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    });
  }

  container.classList.add('is-ready');
  return { remeasure: measure };
}
