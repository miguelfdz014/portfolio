// The painted world behind the page: one fixed WebGL canvas showing the current stage.
// Contract used by src/main.js: startWorld(container, { reducedMotion, overlays }) -> { setMotion, remeasure, rect, raven } | null.
// `overlays` (stage id -> overlay, mounted by main.js before this chunk loads) are shown, hidden and placed here.
// Each [data-cam] section names its stage in data-stage; between stages the director dips through mist and dark.
import * as THREE from 'three';
import { mistAt, stageFrame } from './director.js';
import { mistMaterial } from './materials.js';
import { orientation } from './orient.js';
import { createStage } from './stage.js';
import { landscapeDef } from './stages/landscape.js';
import { boardDef } from './stages/board.js';
import { deskDef, raven } from './stages/desk.js';
import { libraryDef, shouldPlayVideo } from './stages/library.js';

// Stages register here as they are built; a section naming an unknown stage shows the landscape.
const DEFS = { landscape: landscapeDef, library: libraryDef, board: boardDef, desk: deskDef };

export function startWorld(container, { reducedMotion, overlays = new Map() }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch {
    container.classList.add('no-webgl');
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.debug.checkShaderErrors = import.meta.env.DEV;
  container.appendChild(renderer.domElement);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
  const loader = new THREE.TextureLoader();
  const stages = new Map();

  function stage(id) {
    const key = DEFS[id] ? id : 'landscape';
    if (!stages.has(key)) {
      const st = createStage(DEFS[key], { loader, orient });
      stages.set(key, st);
      st.ready.then(() => {
        if (key === 'landscape') container.classList.add('is-ready');
        if (reducedMotion) draw();
      });
    }
    return stages.get(key);
  }

  // Mist veil drawn over a dimmed stage during handovers.
  const veilUniforms = { time: { value: 0 }, fade: { value: 1 } };
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mistMaterial(veilUniforms, { opacity: 0, speed: 0.03 }));
  const veilScene = new THREE.Scene();
  veilScene.add(veil);

  const stopEls = [...document.querySelectorAll('[data-cam]')];
  const stageOfStop = stopEls.map((el) => el.dataset.stage ?? 'landscape');
  let stops = [];
  function measure() {
    const vh = window.innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    stops = stopEls.map((el, i) => {
      if (i === 0) return 0;
      if (i === stopEls.length - 1) return max;
      const r = el.getBoundingClientRect();
      return Math.min(max, r.top + window.scrollY + r.height / 2 - vh / 2);
    });
    for (let i = 1; i < stops.length; i++) stops[i] = Math.max(stops[i], stops[i - 1] + 1);
  }

  // Build a stage once the page is within one screen of its first section, so its art loads ahead of time.
  function preload(y) {
    stageOfStop.forEach((id, i) => {
      if (y > stops[i] - window.innerHeight * 1.5) stage(id);
    });
  }

  let W = 2;
  let orient = 'landscape';
  const viewport = { width: 1, height: 1 };
  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    viewport.width = window.innerWidth;
    viewport.height = window.innerHeight;
    W = 2 * (viewport.width / viewport.height);
    const next = orientation(viewport);
    if (next !== orient) {
      orient = next;
      for (const st of stages.values()) st.setOrientation(orient);
    }
    Object.assign(camera, { left: -W / 2, right: W / 2, top: 1, bottom: -1 });
    camera.updateProjectionMatrix();
    veil.scale.set(W, 2, 1);
    measure();
    for (const overlay of overlays.values()) overlay.place(W, viewport);
    if (reducedMotion) draw();
  }

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  let motion = !reducedMotion;
  let t = 0;
  let y = window.scrollY;
  function draw() {
    preload(y);
    const frame = stageFrame(y, stops, stageOfStop);
    // Reduced motion: the still final frame of each stage, no fades.
    const s = reducedMotion ? 1 : frame.s * frame.s * (3 - 2 * frame.s);
    const fade = reducedMotion ? 1 : frame.fade;
    const current = stage(frame.stage);
    current.update({ t, s, mx: mouse.x, my: mouse.y, W, fade });
    renderer.autoClear = true;
    renderer.render(current.scene, camera);
    veilUniforms.time.value = t;
    veil.material.uniforms.opacity.value = mistAt(fade) * 0.55;
    if (fade < 1) {
      renderer.autoClear = false;
      renderer.render(veilScene, camera);
    }
    // The library loop plays only while it is the stage on screen, motion is on and reduced motion is off.
    const play = shouldPlayVideo({ stage: current.id, motionOn: motion, reducedMotion }) && fade > 0;
    for (const st of stages.values()) st.setVideoPlaying(play && st === current);
    for (const [id, overlay] of overlays) {
      const on = id === current.id && fade > 0.95;
      overlay.setActive(on);
      if (on) overlay.place(W, viewport);
    }
  }

  window.addEventListener('resize', resize);
  resize();
  // Section heights change after start (fonts, rendered panels), which moves the stops.
  if ('ResizeObserver' in window) new ResizeObserver(() => measure()).observe(document.querySelector('main') ?? document.body);

  if (reducedMotion) {
    window.addEventListener('scroll', () => {
      y = window.scrollY;
      draw();
    }, { passive: true });
  } else {
    let last = performance.now();
    renderer.setAnimationLoop((now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (motion) t += dt;
      y += (window.scrollY - y) * Math.min(1, dt * 6);
      const k = Math.min(1, dt * 3);
      mouse.x += (mouse.tx - mouse.x) * k;
      mouse.y += (mouse.ty - mouse.y) * k;
      draw();
    });
  }

  return {
    // Section heights or controls changed (language switch): re-measure stops and refresh every overlay.
    remeasure() {
      measure();
      for (const overlay of overlays.values()) overlay.refresh();
      if (reducedMotion) draw();
    },
    rect: (key, i) => stages.get(key)?.rect(i),
    // The Contact raven; a launch while motion is paused or reduced does nothing.
    raven: {
      perk: (on) => raven.perk(on),
      launch: () => motion && raven.launch(),
    },
    setMotion(on) {
      motion = on && !reducedMotion;
    },
  };
}
