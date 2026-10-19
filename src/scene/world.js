import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const CRIMSON = 0xc8102e;
const FOG_COLOR = 0x0b0b0d;
const BG_COLOR = 0x050506;

// Deterministic pseudo-random so the scene looks the same on every visit.
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(1453);
const range = (a, b) => a + rand() * (b - a);

// Hash of a position, so duplicated seam vertices displace identically.
function hash3(x, y, z) {
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return s - Math.floor(s);
}

function canvasTexture(size, draw, { repeat = false } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function stoneTexture() {
  return canvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#1c1c1e';
      ctx.fillRect(0, 0, s, s);
      const rowH = 16;
      for (let row = 0; row < s / rowH; row++) {
        const offset = row % 2 ? 16 : 0;
        for (let x = -offset; x < s; x += 32) {
          const g = 34 + Math.floor(rand() * 26);
          ctx.fillStyle = `rgb(${g},${g},${g + 2})`;
          ctx.fillRect(x + 1, row * rowH + 1, 30, rowH - 2);
        }
      }
      for (let i = 0; i < 2600; i++) {
        const g = Math.floor(rand() * 70);
        ctx.fillStyle = `rgba(${g},${g},${g},0.35)`;
        ctx.fillRect(rand() * s, rand() * s, 1.5, 1.5);
      }
    },
    { repeat: true },
  );
}

function moonTexture() {
  return canvasTexture(512, (ctx, s) => {
    const g = ctx.createRadialGradient(s * 0.42, s * 0.4, s * 0.05, s / 2, s / 2, s / 2);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.7, '#e9e9ec');
    g.addColorStop(1, '#b9b9c0');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    // Maria: large soft darker patches.
    for (let i = 0; i < 9; i++) {
      const x = range(0.15, 0.85) * s;
      const y = range(0.15, 0.85) * s;
      const r = range(0.06, 0.18) * s;
      const m = ctx.createRadialGradient(x, y, 0, x, y, r);
      m.addColorStop(0, 'rgba(140,140,150,0.35)');
      m.addColorStop(1, 'rgba(140,140,150,0)');
      ctx.fillStyle = m;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 60; i++) {
      const x = rand() * s;
      const y = rand() * s;
      const r = range(2, 12);
      ctx.strokeStyle = 'rgba(120,120,130,0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
}

function softTexture(blobs = 1) {
  return canvasTexture(256, (ctx, s) => {
    for (let i = 0; i < blobs; i++) {
      const x = blobs === 1 ? s / 2 : range(0.3, 0.7) * s;
      const y = blobs === 1 ? s / 2 : range(0.4, 0.6) * s;
      const r = blobs === 1 ? s / 2 : range(0.18, 0.3) * s;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,255,255,${blobs === 1 ? 1 : 0.35})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
    }
  });
}

function buildCastle(stoneMat) {
  const castle = new THREE.Group();
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.55, metalness: 0.25 });
  const voidMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const merlons = [];
  const windows = [];
  const flags = [];

  const add = (geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    castle.add(m);
    return m;
  };

  function wall(x1, z1, x2, z2, h, t = 0.9) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const angle = -Math.atan2(dz, dx);
    const m = add(new THREE.BoxGeometry(len, h, t), stoneMat, (x1 + x2) / 2, h / 2, (z1 + z2) / 2);
    m.rotation.y = angle;
    for (let s = 0.4; s < len - 0.2; s += 0.85) {
      merlons.push({ x: x1 + (dx / len) * s, y: h + 0.25, z: z1 + (dz / len) * s, ry: angle });
    }
  }

  function tower({ x, z, r, h, base = 0, roof = 0, win = 3 }) {
    add(new THREE.CylinderGeometry(r, r * 1.06, h, 24), stoneMat, x, base + h / 2, z);
    // Corbelled ring under the roof / battlements.
    add(new THREE.CylinderGeometry(r * 1.2, r, 0.6, 24), stoneMat, x, base + h + 0.3, z);
    const top = base + h + 0.6;
    if (roof) {
      add(new THREE.ConeGeometry(r * 1.32, roof, 24), roofMat, x, top + roof / 2, z);
      add(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6), roofMat, x, top + roof + 0.8, z);
      flags.push({ x, y: top + roof + 1.2, z, s: Math.min(1, r / 1.4) });
    } else {
      const n = Math.round(r * 6);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        merlons.push({ x: x + Math.sin(a) * r * 1.1, y: top + 0.25, z: z + Math.cos(a) * r * 1.1, ry: a });
      }
    }
    for (let i = 0; i < win; i++) {
      const a = range(-0.5, 0.5);
      windows.push({
        x: x + Math.sin(a) * (r + 0.02),
        y: base + h * (0.32 + i * (0.5 / Math.max(win - 1, 1))),
        z: z + Math.cos(a) * (r + 0.02),
        ry: a,
      });
    }
  }

  // Keep and its spire
  add(new THREE.BoxGeometry(7, 10, 6), stoneMat, 0, 5, -1);
  for (let s = -3.2; s <= 3.2; s += 0.85) {
    merlons.push({ x: s, y: 10.25, z: 1.85, ry: 0 }, { x: s, y: 10.25, z: -3.85, ry: 0 });
  }
  for (let s = -3.4; s <= 1.4; s += 0.85) {
    merlons.push({ x: -3.35, y: 10.25, z: s, ry: Math.PI / 2 }, { x: 3.35, y: 10.25, z: s, ry: Math.PI / 2 });
  }
  for (const [x, y] of [[-2, 4], [0, 4.6], [2, 4], [-2, 7.4], [2, 7.4]]) {
    windows.push({ x, y, z: 2.03, ry: 0 });
  }
  tower({ x: 0, z: -1, r: 1.5, h: 7, base: 10, roof: 6.5, win: 2 });

  // Towers
  tower({ x: -6, z: 3, r: 1.4, h: 9, roof: 4.5 });
  tower({ x: 6, z: 3, r: 1.4, h: 8 });
  tower({ x: -5.5, z: -5, r: 1.6, h: 13, roof: 6 });
  tower({ x: 5.5, z: -5, r: 1.3, h: 11, roof: 5 });
  tower({ x: -2.8, z: -3.6, r: 0.8, h: 15, roof: 4, win: 2 });
  tower({ x: -1.9, z: 3.7, r: 1, h: 7, roof: 2.6, win: 1 });
  tower({ x: 1.9, z: 3.7, r: 1, h: 7, roof: 2.6, win: 1 });

  // Curtain walls
  wall(-6, 3, -2.6, 3.4, 5);
  wall(2.6, 3.4, 6, 3, 5);
  wall(-1.2, 3.8, 1.2, 3.8, 5.6, 1.2);
  wall(-6, 3, -5.5, -5, 6);
  wall(6, 3, 5.5, -5, 6);
  wall(-5.5, -5, 5.5, -5, 7);

  // Gate: a dark arch with a crimson glow behind
  const gate = add(new THREE.BoxGeometry(1.5, 2.6, 0.2), voidMat, 0, 1.3, 4.42);
  const glow = add(
    new THREE.PlaneGeometry(1.3, 2.3),
    new THREE.MeshBasicMaterial({ color: CRIMSON, transparent: true, opacity: 0.55 }),
    0,
    1.2,
    4.53,
  );
  gate.renderOrder = 1;
  glow.renderOrder = 2;

  // Merlons as one instanced mesh
  const merlonMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.5, 0.5), stoneMat, merlons.length);
  const dummy = new THREE.Object3D();
  merlons.forEach((m, i) => {
    dummy.position.set(m.x, m.y, m.z);
    dummy.rotation.set(0, m.ry, 0);
    dummy.updateMatrix();
    merlonMesh.setMatrixAt(i, dummy.matrix);
  });
  castle.add(merlonMesh);

  // Windows: a few materials so they flicker out of sync
  const winMats = [0, 1, 2].map(
    () => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: CRIMSON, emissiveIntensity: 2.4 }),
  );
  winMats.push(new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xfff4e8, emissiveIntensity: 0.9 }));
  const winGeo = new THREE.BoxGeometry(0.26, 0.7, 0.08);
  windows.forEach((w) => {
    const mat = winMats[rand() < 0.22 ? 3 : Math.floor(rand() * 3)];
    const m = add(winGeo, mat, w.x, w.y, w.z);
    m.rotation.y = w.ry;
  });

  // Banners: plane geometry rippled per frame
  const flagMat = new THREE.MeshStandardMaterial({
    color: CRIMSON,
    emissive: 0x4a0010,
    roughness: 0.7,
    side: THREE.DoubleSide,
  });
  const flagMeshes = flags.map((f) => {
    const geo = new THREE.PlaneGeometry(1.5, 0.75, 12, 2);
    geo.translate(0.75, 0, 0);
    const m = add(geo, flagMat, f.x, f.y, f.z);
    m.scale.setScalar(f.s);
    m.userData.base = geo.attributes.position.array.slice();
    m.userData.phase = rand() * 6;
    return m;
  });

  return { castle, winMats, flagMeshes };
}

function buildCliff() {
  const geo = new THREE.CylinderGeometry(9.5, 18, 22, 28, 12, false);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const top = v.y > 10.9;
    const n = hash3(Math.round(v.x * 10), Math.round(v.y * 10), Math.round(v.z * 10));
    const wave = Math.sin(v.x * 0.6 + v.y * 0.4) * 0.5 + Math.sin(v.z * 0.9 - v.y * 0.7) * 0.4;
    const k = top ? 1 + (n - 0.5) * 0.05 : 1 + wave * 0.12 + (n - 0.5) * 0.28;
    v.x *= k;
    v.z *= k;
    if (!top) v.y += (n - 0.5) * 1.4;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 1, flatShading: true });
  const cliff = new THREE.Mesh(geo, mat);
  cliff.position.y = -11;
  return cliff;
}

function buildMountains() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x26262b, roughness: 1, flatShading: true });
  // Two ridgelines made of jagged, wide peaks; fog fades the farther one.
  for (const [z, hMin, hMax, count] of [[-150, 18, 34, 16], [-210, 26, 48, 14]]) {
    for (let i = 0; i < count; i++) {
      const h = range(hMin, hMax);
      const geo = new THREE.ConeGeometry(range(28, 48), h, Math.floor(range(6, 10)), 4);
      const pos = geo.attributes.position;
      for (let j = 0; j < pos.count; j++) {
        const y = pos.getY(j);
        if (y < h / 2 - 0.1) {
          const k = range(0.75, 1.25);
          pos.setX(j, pos.getX(j) * k);
          pos.setZ(j, pos.getZ(j) * k);
          pos.setY(j, y + range(-1.5, 1.5));
        }
      }
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, mat);
      m.position.set(-260 + (i / count) * 520 + range(-15, 15), h / 2 - 16, z + range(-15, 15));
      m.scale.x = range(1.2, 1.8);
      m.rotation.y = rand() * Math.PI;
      group.add(m);
    }
  }
  return group;
}

function buildStars() {
  const count = 1800;
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(range(0.05, 1));
    const r = 400;
    arr[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
    arr[i * 3 + 1] = Math.cos(phi) * r;
    arr[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r - 150;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.4,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.8,
    fog: false,
  });
  return new THREE.Points(geo, mat);
}

function buildPetals(count) {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.5);
  shape.bezierCurveTo(0.45, -0.3, 0.4, 0.35, 0, 0.5);
  shape.bezierCurveTo(-0.4, 0.35, -0.45, -0.3, 0, -0.5);
  const geo = new THREE.ShapeGeometry(shape, 6);
  geo.scale(0.24, 0.24, 0.24);
  const mat = new THREE.MeshStandardMaterial({
    color: CRIMSON,
    emissive: 0x6a0014,
    emissiveIntensity: 0.9,
    roughness: 0.45,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const data = Array.from({ length: count }, () => ({
    x: range(-34, 34),
    y: range(-6, 30),
    z: range(-14, 26),
    vy: range(1.1, 2.4),
    sway: range(0.6, 1.8),
    swaySpeed: range(0.4, 1.1),
    phase: rand() * Math.PI * 2,
    rx: rand() * 6,
    ry: rand() * 6,
    vrx: range(-2, 2),
    vry: range(-2, 2),
    s: range(0.7, 1.4),
  }));
  return { mesh, data };
}

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
  scene.background = new THREE.Color(BG_COLOR);
  scene.fog = new THREE.Fog(FOG_COLOR, 45, 230);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 1000);

  // Lights: cold moonlight from behind for rim, faint fill, crimson underglow at the gate.
  scene.add(new THREE.AmbientLight(0x2a2a30, 0.7));
  const moonLight = new THREE.DirectionalLight(0xeef0ff, 3.6);
  scene.add(moonLight);
  const fill = new THREE.DirectionalLight(0x8c90a0, 0.7);
  fill.position.set(-30, 20, 50);
  scene.add(fill);

  const world = new THREE.Group();
  scene.add(world);

  const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTexture(), roughness: 0.92 });
  stoneMat.map.repeat.set(1.5, 2);
  const { castle, winMats, flagMeshes } = buildCastle(stoneMat);
  castle.scale.setScalar(0.8);
  const cliff = buildCliff();
  const keepGroup = new THREE.Group();
  keepGroup.add(cliff, castle);
  world.add(keepGroup);

  const gateLight = new THREE.PointLight(CRIMSON, 40, 16, 2);
  gateLight.position.set(0, 1.5, 5.5);
  keepGroup.add(gateLight);

  world.add(buildMountains());
  const stars = buildStars();
  scene.add(stars);

  // Moon with a soft halo
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(12, 48, 48),
    new THREE.MeshBasicMaterial({ map: moonTexture(), color: 0xd6d6d8, fog: false, toneMapped: false }),
  );
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: softTexture(),
      color: 0xd8dcff,
      transparent: true,
      opacity: 0.09,
      depthWrite: false,
      fog: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  halo.scale.set(80, 80, 1);
  scene.add(moon, halo);

  // Fog banks: camera-facing soft sprites drifting sideways
  const fogTex = softTexture(6);
  const fogBanks = Array.from({ length: 22 }, () => {
    const sp = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: fogTex,
        color: 0xc8c8d0,
        transparent: true,
        opacity: range(0.04, 0.1),
        depthWrite: false,
        fog: false,
      }),
    );
    sp.scale.set(range(40, 75), range(9, 16), 1);
    sp.position.set(range(-70, 70), range(-7, 3.5), range(-28, 18));
    sp.userData.speed = range(0.4, 1.2) * (rand() < 0.5 ? -1 : 1);
    world.add(sp);
    return sp;
  });

  const isSmall = window.innerWidth < 760;
  const petals = buildPetals(isSmall ? 140 : 260);
  scene.add(petals.mesh);

  // Post-processing
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.45, 0.88);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // Framing depends on aspect: castle to the right on wide screens, centered and low on tall ones.
  const frame = { camZ: 46, camY: 6, targetY: 9, castleX: 9 };
  const target = new THREE.Vector3();

  function layout() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    const aspect = w / h;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.resolution.set(w / 2, h / 2);
    camera.aspect = aspect;
    if (aspect >= 1.15) {
      Object.assign(frame, { camZ: 54, camY: 1.5, targetY: 10, castleX: Math.min(15, 7 + aspect * 3.6) });
    } else if (aspect >= 0.8) {
      Object.assign(frame, { camZ: 62, camY: 1.5, targetY: 11, castleX: 5 });
    } else {
      Object.assign(frame, { camZ: 80, camY: 0.5, targetY: 19, castleX: 0 });
    }
    keepGroup.position.x = frame.castleX;
    moon.position.set(frame.castleX * 2.4 + 8, frame.targetY + 34, -120);
    halo.position.copy(moon.position);
    // Side-back light from the upper left so tower edges catch a rim.
    moonLight.position.set(frame.castleX - 45, 38, -25);
    moonLight.target = keepGroup;
    camera.updateProjectionMatrix();
    if (reducedMotion || !running) render(performance.now());
  }

  // Interaction state
  let mx = 0;
  let my = 0;
  let cx = 0;
  let cy = 0;
  let scrollP = 0;
  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX / window.innerWidth - 0.5;
      my = e.clientY / window.innerHeight - 0.5;
    },
    { passive: true },
  );
  window.addEventListener(
    'scroll',
    () => {
      scrollP = Math.min(window.scrollY / Math.max(container.clientHeight, 1), 1.2);
    },
    { passive: true },
  );

  const dummy = new THREE.Object3D();
  const start = performance.now();
  let last = start;
  let running = true;
  let raf = 0;

  function render(now) {
    const t = (now - start) / 1000;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    // Intro dolly-in, then mouse + scroll parallax
    const intro = reducedMotion ? 1 : 1 - Math.pow(1 - Math.min(t / 3.8, 1), 3);
    cx += (mx - cx) * 0.04;
    cy += (my - cy) * 0.04;
    camera.position.set(
      cx * 4 + Math.sin(t * 0.07) * 1.2,
      frame.camY + (1 - intro) * 7 - cy * 2 + scrollP * 7,
      frame.camZ + (1 - intro) * 22 - scrollP * 10,
    );
    target.set(frame.castleX * 0.35 + cx * 1.5, frame.targetY + scrollP * 4, 0);
    camera.lookAt(target);

    if (!reducedMotion) {
      winMats.forEach((m, i) => {
        if (i === 3) return;
        const f = Math.sin(t * (2.1 + i * 1.3) + i * 2) * Math.sin(t * (5.7 + i));
        m.emissiveIntensity = 2.2 + f * 0.6;
      });

      for (const fm of flagMeshes) {
        const p = fm.geometry.attributes.position;
        const base = fm.userData.base;
        for (let i = 0; i < p.count; i++) {
          const x = base[i * 3];
          p.setZ(i, Math.sin(x * 3.2 - t * 5 + fm.userData.phase) * 0.14 * x);
          p.setY(i, base[i * 3 + 1] - x * 0.08);
        }
        p.needsUpdate = true;
      }

      for (const sp of fogBanks) {
        sp.position.x += sp.userData.speed * dt;
        if (sp.position.x > 80) sp.position.x = -80;
        if (sp.position.x < -80) sp.position.x = 80;
      }

      stars.material.opacity = 0.7 + Math.sin(t * 0.8) * 0.1;

      const { mesh, data } = petals;
      for (let i = 0; i < data.length; i++) {
        const d = data[i];
        d.y -= d.vy * dt;
        d.x += (0.6 + Math.sin(t * 0.3) * 0.4) * dt;
        d.rx += d.vrx * dt;
        d.ry += d.vry * dt;
        if (d.y < -8) {
          d.y = range(26, 32);
          d.x = range(-34, 34);
        }
        if (d.x > 36) d.x = -36;
        dummy.position.set(d.x + Math.sin(t * d.swaySpeed + d.phase) * d.sway, d.y, d.z);
        dummy.rotation.set(d.rx, d.ry, 0);
        dummy.scale.setScalar(d.s);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    } else {
      const { mesh, data } = petals;
      data.forEach((d, i) => {
        dummy.position.set(d.x, d.y, d.z);
        dummy.rotation.set(d.rx, d.ry, 0);
        dummy.scale.setScalar(d.s);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }

    composer.render();
  }

  function loop(now) {
    render(now);
    if (running) raf = requestAnimationFrame(loop);
  }

  window.addEventListener('resize', layout);
  layout();

  if (reducedMotion) {
    running = false;
    render(performance.now());
    window.addEventListener('scroll', () => requestAnimationFrame(render), { passive: true });
  } else {
    raf = requestAnimationFrame(loop);
    // Pause rendering while the hero is off-screen.
    new IntersectionObserver(([entry]) => {
      const visible = entry.isIntersecting;
      if (visible && !running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(loop);
      } else if (!visible) {
        running = false;
        cancelAnimationFrame(raf);
      }
    }).observe(container);
  }

  container.classList.add('is-ready');
}
