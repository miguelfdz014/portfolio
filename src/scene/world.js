import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Water } from 'three/addons/objects/Water.js';
import { mulberry32 } from './noise.js';
import {
  createGenerator,
  toMaps,
  toMoon,
  toVolume,
  bannerTextures,
  bannerTallTexture,
  roseWindowTexture,
  gateGlowTexture,
  glowTexture,
  smokeTexture,
} from './textures.js';
import { CloudPass } from './clouds.js';
import { buildMount } from './mount.js';
import { buildBay, buildCauseway, buildHorizon } from './terrain.js';
import { buildSky, SKY_LAYER } from './sky.js';

const CRIMSON = 0xc8102e;
const FOG_COLOR = 0x0b0b0e;
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

// 1×1 stand-ins so every material compiles with its final shader before the real maps arrive.
function placeholder(rgba, srgb) {
  const t = new THREE.DataTexture(new Uint8Array(rgba), 1, 1, THREE.RGBAFormat);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
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
  mesh.layers.set(SKY_LAYER);
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
    return null;
  }

  // Quality tier: phones and small screens get cheaper clouds, water and no shadows.
  const mobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 760;
  const q = mobile
    ? { dpr: 1.25, tex: 256, moon: 512, noise: 48, cloudCss: 0.32, steps: 24, lsteps: 2, water: 256, shadows: false, petals: 90 }
    : { dpr: 1.6, tex: 512, moon: 768, noise: 64, cloudCss: 0.5, steps: 44, lsteps: 4, water: 512, shadows: true, petals: 200 };
  const dpr = Math.min(window.devicePixelRatio || 1, q.dpr);
  renderer.setPixelRatio(dpr);
  // Skip the blocking shader-status checks outside development.
  renderer.debug.checkShaderErrors = import.meta.env.DEV;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = q.shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // The geometry is static, so the shadow map is drawn once.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  container.appendChild(renderer.domElement);

  // Textures are generated in parallel workers: hero pieces (moon, clouds) first.
  const generator = createGenerator();
  const job = (name, size) => generator.run(name, size);
  const moonJob = job('moon', q.moon);
  const cloudJob = job('cloudVolume', q.noise);
  const waterJob = job('water', q.tex);
  const stoneJob = job('stone', q.tex);
  const slateJob = job('slate', q.tex);
  const rockJob = job('rock', q.tex);
  const sandJob = job('sand', q.tex);

  const rand = mulberry32(966);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050506);
  scene.fog = new THREE.Fog(FOG_COLOR, 260, 1700);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 7000);
  camera.layers.enable(SKY_LAYER);

  const sky = buildSky({ rand, pixelRatio: dpr, mobile, moonPos: MOON_POS });
  scene.add(sky.group);

  // A dim night environment so stone, slate and wet sand pick up soft reflections.
  const envScene = new THREE.Scene();
  envScene.add(sky.group.children[0].clone());
  const envMoon = new THREE.Mesh(new THREE.SphereGeometry(80, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  envMoon.position.copy(MOON_POS).normalize().multiplyScalar(900);
  envScene.add(envMoon);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(envScene, 0.04, 1, 3200).texture;
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

  // Materials start with placeholders and receive their generated maps when the workers finish.
  const grey = () => placeholder([90, 90, 92, 255], true);
  const flat = () => placeholder([128, 128, 255, 255], false);
  const mats = {
    stone: new THREE.MeshStandardMaterial({ map: grey(), normalMap: flat(), roughness: 0.88 }),
    roof: new THREE.MeshStandardMaterial({ map: grey(), normalMap: flat(), roughness: 0.86, envMapIntensity: 0.2 }),
    spire: new THREE.MeshStandardMaterial({ map: grey(), normalMap: flat(), color: 0x9a9aa4, roughness: 0.45, metalness: 0.25 }),
    rock: new THREE.MeshStandardMaterial({ map: grey(), normalMap: flat(), roughness: 0.95 }),
    sand: new THREE.MeshStandardMaterial({
      map: grey(),
      normalMap: flat(),
      vertexColors: true,
      color: 0x6a6a6a,
      roughness: 1,
      envMapIntensity: 0.15,
    }),
  };
  mats.stone.normalScale.set(1.2, 1.2);
  mats.rock.normalScale.set(1.4, 1.4);

  const tex = {
    banner: bannerTextures(),
    bannerTall: bannerTallTexture(),
    rose: roseWindowTexture(),
    gateGlow: gateGlowTexture(),
    smoke: smokeTexture(),
  };
  const { mount, update: updateMount } = buildMount({ mats, tex, rand });
  scene.add(mount);
  scene.add(buildBay({ sand: mats.sand, rock: mats.rock, rand, detail: !mobile }));
  scene.add(buildCauseway({ stone: mats.stone }));
  scene.add(buildHorizon({ rand, mobile }));

  // Water: planar reflection with moving normals and a moonlight glitter path
  const water = new Water(new THREE.PlaneGeometry(12000, 12000), {
    textureWidth: q.water,
    textureHeight: q.water,
    waterNormals: flat(),
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

  // Moon: a camera-facing disc with a proper lunar surface, plus a soft halo
  const moon = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: placeholder([0, 0, 0, 0], true), alphaTest: 0.02, fog: false, toneMapped: false }),
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
    lightDir: MOON_POS.clone().normalize(),
  });
  composer.addPass(clouds);
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.7, 0.6, 0.82);
  composer.addPass(bloom);
  const output = new OutputPass();
  composer.addPass(output);

  // Generated maps replace the placeholders as they arrive (same shader, so no recompile).
  const apply = (mat, raw, repeat = 1) => {
    const m = toMaps(raw);
    m.map.repeat.set(repeat, repeat);
    m.normalMap.repeat.set(repeat, repeat);
    mat.map = m.map;
    mat.normalMap = m.normalMap;
  };
  stoneJob.then((r) => apply(mats.stone, r, 2));
  slateJob.then((r) => {
    apply(mats.roof, r);
    apply(mats.spire, r);
  });
  rockJob.then((r) => apply(mats.rock, r));
  sandJob.then((r) => apply(mats.sand, r, 140));
  waterJob.then((r) => {
    water.material.uniforms.normalSampler.value = toMaps(r).normalMap;
  });
  const heroReady = Promise.all([
    moonJob.then((r) => {
      moon.material.map = toMoon(r);
    }),
    cloudJob.then((r) => clouds.setNoise(toVolume(r))),
  ]);
  Promise.all([stoneJob, slateJob, rockJob, sandJob, waterJob, heroReady]).then(() => generator.dispose());

  // ---------------------------------------------------------------- Camera path
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
    if (!(y > 0) || stopY.length < 2) return 0;
    for (let i = 0; i < stopY.length - 1; i++) {
      if (y < stopY[i + 1]) return i + (y - stopY[i]) / (stopY[i + 1] - stopY[i]);
    }
    return stopY.length - 1;
  }

  let running = false;
  let raf = 0;
  let shiftApplied = -1;

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
  let start = performance.now();
  let last = start;
  let u = null;

  function placeCamera(t, dt) {
    // Ease toward the scroll position. Reduced motion: a fixed view of the mount.
    const targetU = reducedMotion ? 2 : scrollToU(window.scrollY);
    if (u === null || reducedMotion || !Number.isFinite(u)) u = targetU;
    else u += (targetU - u) * (1 - Math.exp(-dt * 3.2));
    const k = Math.min(Math.max(u / (CAM_STOPS.length - 1), 0), 1);
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
    camera.updateMatrixWorld();

    const shift = lensShift * Math.min(Math.max(u - 1, 0), 1);
    if (Math.abs(shift - shiftApplied) > 0.0005) {
      if (shift > 0) camera.setViewOffset(width, height, 0, height * shift, width, height);
      else camera.clearViewOffset();
      shiftApplied = shift;
    }
  }

  function render(now) {
    const t = (now - start) / 1000;
    // rAF timestamps can precede performance.now(), so clamp to a sane, non-negative step.
    const dt = Math.min(Math.max((now - last) / 1000, 0), 0.05);
    last = now;
    placeCamera(t, dt);
    sky.update(t, dt, camera);

    if (!reducedMotion) {
      updateMount(t, dt);
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

  function play() {
    if (running || reducedMotion) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  window.addEventListener('resize', () => {
    layout();
    if (!running && container.classList.contains('is-ready')) render(performance.now());
  });
  window.addEventListener('load', measure);
  layout();
  placeCamera(0, 0);

  // Compile every shader in the background, then fade in once the hero's moon and clouds are ready.
  // Post-processing materials aren't part of the scene, so precompile them through a stand-in scene.
  const postScene = new THREE.Scene();
  const postMats = [clouds.march, clouds.composite, output.material];
  for (const v of Object.values(bloom)) {
    if (v?.isMaterial) postMats.push(v);
    else if (Array.isArray(v)) postMats.push(...v.filter((m) => m?.isMaterial));
  }
  output.material.defines = { SRGB_TRANSFER: '', ACES_FILMIC_TONE_MAPPING: '' };
  const quad = new THREE.PlaneGeometry(2, 2);
  for (const m of postMats) postScene.add(new THREE.Mesh(quad, m));
  const compiled = Promise.all([renderer.compileAsync(scene, camera), renderer.compileAsync(postScene, camera)]).catch(() => {});
  Promise.all([compiled, heroReady]).then(() => {
    start = performance.now();
    last = start;
    render(start);
    container.classList.add('is-ready');
    play();
  });

  // Pause while the tab is hidden.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      running = false;
      cancelAnimationFrame(raf);
    } else if (container.classList.contains('is-ready')) {
      play();
    }
  });

  return { remeasure: measure };
}
