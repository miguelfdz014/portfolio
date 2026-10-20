import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Water } from 'three/addons/objects/Water.js';
import { mulberry32 } from './noise.js';
import { stoneMaps, slateMaps, rockMaps, sandMaps, waterNormals, moonDisc } from './textures.js';
import { CloudPass, cloudNoiseTexture } from './clouds.js';
import { buildMount } from './mount.js';
import { buildBay, buildCauseway, buildCoast } from './terrain.js';

const CRIMSON = 0xc8102e;
const FOG_COLOR = 0x0a0a0d;
const MOON_POS = new THREE.Vector3(0, 250, -700);
const MIN_CAM_Y = 4;

// Camera path: one stop per page section ([data-cam] elements, in order).
// Hero above the clouds → descent → the mount from afar → across the water → up toward the spire.
const CAM_STOPS = [
  { pos: [0, 205, 300], look: [0, 200, -700] },
  { pos: [0, 118, 280], look: [0, 130, -500] },
  { pos: [0, 9, 235], look: [0, 50, 0] },
  { pos: [120, 16, 205], look: [0, 46, 0] },
  { pos: [-58, 66, 100], look: [0, 128, -40] },
];

function skyTexture() {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#020203');
  g.addColorStop(0.42, '#07070a');
  g.addColorStop(0.5, '#15151b');
  g.addColorStop(0.56, '#0a0a0d');
  g.addColorStop(1, '#050506');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.22, 'rgba(255,255,255,0.3)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildStars(rand) {
  const count = 2600;
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(0.02 + rand() * 0.98);
    arr[i * 3] = Math.sin(phi) * Math.cos(theta) * 2400;
    arr[i * 3 + 1] = Math.cos(phi) * 2400;
    arr[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * 2400;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({ color: 0xffffff, size: 1.3, sizeAttenuation: false, transparent: true, opacity: 0.85, fog: false }),
  );
}

function buildPetals(count, rand) {
  const range = (a, b) => a + rand() * (b - a);
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.5);
  shape.bezierCurveTo(0.45, -0.3, 0.4, 0.35, 0, 0.5);
  shape.bezierCurveTo(-0.4, 0.35, -0.45, -0.3, 0, -0.5);
  const geo = new THREE.ShapeGeometry(shape, 5).scale(0.5, 0.5, 0.5);
  const mat = new THREE.MeshStandardMaterial({
    color: CRIMSON,
    emissive: 0x5a0012,
    roughness: 0.45,
    side: THREE.DoubleSide,
    fog: false,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.frustumCulled = false;
  // Positions are in camera space and wrap inside a box in front of it.
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

export function startWorld(container, { reducedMotion }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  } catch {
    container.classList.add('no-webgl');
    return;
  }

  // Quality tier: phones and small screens get cheaper clouds, water and no shadows.
  const mobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 760;
  const q = mobile
    ? { dpr: 1.25, tex: 256, moon: 512, noise: 48, cloudCss: 0.34, steps: 26, lsteps: 2, water: 256, shadows: false, petals: 110 }
    : { dpr: 1.75, tex: 512, moon: 768, noise: 64, cloudCss: 0.5, steps: 48, lsteps: 4, water: 768, shadows: true, petals: 220 };
  const dpr = Math.min(window.devicePixelRatio || 1, q.dpr);
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = q.shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // The geometry is static, so the shadow map is drawn once.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  container.appendChild(renderer.domElement);

  const rand = mulberry32(966);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050506);
  scene.fog = new THREE.Fog(FOG_COLOR, 240, 1500);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 6000);
  const skyTex = skyTexture();
  scene.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(3000, 32, 16),
      new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false }),
    ),
  );

  // A dim night environment so stone, slate and wet sand pick up soft reflections.
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide })));
  const envMoon = new THREE.Mesh(new THREE.SphereGeometry(8, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  envMoon.position.copy(MOON_POS).normalize().multiplyScalar(90);
  envScene.add(envMoon);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(envScene, 0.04).texture;
  scene.environmentIntensity = 0.22;
  pmrem.dispose();

  // Lights: cold hemisphere fill, moon rim from behind, a shadow-casting key from the upper left.
  scene.add(new THREE.HemisphereLight(0x3a3f55, 0x0b0b0e, 0.7));
  const moonLight = new THREE.DirectionalLight(0xe8ecff, 1.1);
  moonLight.position.copy(MOON_POS);
  scene.add(moonLight);
  const key = new THREE.DirectionalLight(0xb8bdd2, 1.5);
  key.position.set(-260, 210, 180);
  key.castShadow = q.shadows;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -110, right: 110, top: 130, bottom: -40, near: 100, far: 700 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.4;
  scene.add(key);

  // Materials
  const stone = stoneMaps(q.tex);
  stone.map.repeat.set(2, 2);
  stone.normalMap.repeat.set(2, 2);
  const stoneMat = new THREE.MeshStandardMaterial({ map: stone.map, normalMap: stone.normalMap, roughness: 0.88 });
  stoneMat.normalScale.set(1.2, 1.2);
  const slate = slateMaps(q.tex);
  const rock = rockMaps(q.tex);
  const sand = sandMaps(q.tex);

  const { mount, flag } = buildMount({ stone: stoneMat, slate, rock, rand });
  scene.add(mount);
  scene.add(buildBay({ sand, rock, rand, detail: !mobile }));
  scene.add(buildCauseway({ stone: stoneMat }));
  scene.add(buildCoast({ rand }));

  // Water: real planar reflection with moving normals and a moonlight glitter path
  const water = new Water(new THREE.PlaneGeometry(10000, 10000), {
    textureWidth: q.water,
    textureHeight: q.water,
    waterNormals: waterNormals(q.tex),
    sunDirection: MOON_POS.clone().normalize(),
    sunColor: 0x3c4152,
    waterColor: 0x020407,
    distortionScale: 2.6,
    fog: true,
    alpha: 1,
  });
  water.rotation.x = -Math.PI / 2;
  water.material.uniforms.size.value = 1.6;
  scene.add(water);

  scene.add(buildStars(rand));

  // Moon: a camera-facing disc with a proper lunar surface, plus a soft halo
  const moon = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: moonDisc(q.moon), alphaTest: 0.02, fog: false, toneMapped: false }),
  );
  moon.material.color.setRGB(1.25, 1.25, 1.28);
  moon.position.copy(MOON_POS);
  moon.scale.set(168, 168, 1);
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture(),
      color: 0xc8ceff,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      fog: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  halo.position.copy(MOON_POS).add(new THREE.Vector3(0, 0, 6));
  halo.scale.set(720, 720, 1);
  scene.add(moon, halo);

  const petals = buildPetals(q.petals, rand);
  scene.add(petals.mesh);

  // Post-processing: scene + volumetric clouds → bloom → tone mapping
  const composer = new EffectComposer(renderer);
  const clouds = new CloudPass(scene, camera, {
    scale: q.cloudCss / dpr,
    steps: q.steps,
    lightSteps: q.lsteps,
    noise: cloudNoiseTexture(q.noise),
    lightDir: MOON_POS.clone().normalize(),
  });
  composer.addPass(clouds);
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.7, 0.6, 0.82);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // Camera path
  const posCurve = new THREE.CatmullRomCurve3(CAM_STOPS.map((s) => new THREE.Vector3(...s.pos)), false, 'centripetal');
  const lookCurve = new THREE.CatmullRomCurve3(CAM_STOPS.map((s) => new THREE.Vector3(...s.look)), false, 'centripetal');
  const stopEls = [...document.querySelectorAll('[data-cam]')];
  let stopY = [];
  let distScale = 1;
  let lensShift = 0;
  let width = 0;
  let height = 0;

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
    const w = container.clientWidth;
    const h = container.clientHeight;
    measure();
    // Mobile browsers fire resize as the address bar shows/hides; ignore small height changes.
    if (w === width && Math.abs(h - height) < 140) return;
    width = w;
    height = h;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.resolution.set(w / 2, h / 2);
    camera.aspect = w / h;
    // Pull back (horizontally only) on tall screens so the mount still fits.
    distScale = camera.aspect < 0.8 ? 1.5 : camera.aspect < 1.15 ? 1.15 : 1;
    // On phones shift the frame (not the camera) so the scene sits above the text.
    lensShift = camera.aspect < 0.8 ? 0.17 : 0;
    shiftApplied = -1;
    camera.updateProjectionMatrix();
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
  let shiftApplied = -1;

  function render(now) {
    const t = (now - start) / 1000;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    // Ease the camera toward the scroll position. Reduced motion: a fixed view of the mount.
    const targetU = reducedMotion ? 2 : scrollToU(window.scrollY);
    if (u === null || reducedMotion) u = targetU;
    else u += (targetU - u) * (1 - Math.exp(-dt * 3.2));
    const k = u / (CAM_STOPS.length - 1);
    posCurve.getPoint(k, pos);
    lookCurve.getPoint(k, look);
    pos.x = look.x + (pos.x - look.x) * distScale;
    pos.z = look.z + (pos.z - look.z) * distScale;
    cx += (mx - cx) * 0.04;
    cy += (my - cy) * 0.04;
    pos.x += cx * 10 + Math.sin(t * 0.08) * 2;
    // Never let the camera dip below the water.
    pos.y = Math.max(pos.y - cy * 5, MIN_CAM_Y);
    camera.position.copy(pos);
    camera.lookAt(look);

    const shift = lensShift * Math.min(Math.max(u - 1, 0), 1);
    if (Math.abs(shift - shiftApplied) > 0.0005) {
      if (shift > 0) camera.setViewOffset(width, height, 0, height * shift, width, height);
      else camera.clearViewOffset();
      shiftApplied = shift;
    }

    if (!reducedMotion) {
      const fp = flag.geometry.attributes.position;
      const base = flag.userData.base;
      for (let i = 0; i < fp.count; i++) {
        const x = base[i * 3];
        fp.setZ(i, Math.sin(x * 1.4 - t * 4) * 0.12 * x);
      }
      fp.needsUpdate = true;
      water.material.uniforms.time.value = t * 0.5;
      clouds.time = t;

      const { mesh, data } = petals;
      for (let i = 0; i < data.length; i++) {
        const d = data[i];
        d.y -= d.vy * dt;
        d.x += 1.2 * dt;
        d.rx += d.vrx * dt;
        d.ry += d.vry * dt;
        if (d.y < -35) d.y = 35;
        if (d.x > 60) d.x = -60;
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
