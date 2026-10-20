// A stage is one painted scene: a stack of layers (paintings, sky, moon, glows, mist, particles, a video)
// described by a StageDef. Layouts are the final composition; parallax() shifts them with scroll and mouse.
import * as THREE from 'three';
import { parallax } from './layout.js';
import {
  createMotes, createPetals, glowMaterial, mistMaterial, moonMaterial, paintMaterial, skyMaterial,
} from './materials.js';

const QUAD = new THREE.PlaneGeometry(1, 1);
const EMPTY = new THREE.DataTexture(new Uint8Array(4), 1, 1);
EMPTY.needsUpdate = true;

const pickSrc = (src) => (window.innerWidth * (window.devicePixelRatio || 1) <= 1600 ? src.mobile : src.desktop);

function loadTexture(loader, src) {
  return new Promise((resolve) => {
    loader.load(
      pickSrc(src),
      (tex) => {
        tex.anisotropy = 8;
        resolve(tex);
      },
      undefined,
      () => resolve(EMPTY), // A missing painting leaves a gap, never a broken page.
    );
  });
}

function createVideo(url) {
  const video = Object.assign(document.createElement('video'), { muted: true, loop: true, playsInline: true, preload: 'none' });
  video.setAttribute('aria-hidden', 'true');
  video.src = url;
  return video;
}

export function createStage(def, { loader }) {
  const scene = new THREE.Scene();
  const uniforms = { time: { value: 0 }, fade: { value: 1 } };
  const travel = def.travel ?? 0;
  const layers = [];
  const loads = [];
  let video = null;
  let videoOn = false;

  def.layers.forEach((L, i) => {
    let object;
    if (L.kind === 'petals') object = createPetals(uniforms, L.opts);
    else if (L.kind === 'motes') object = createMotes(uniforms, L.opts);
    else {
      let material;
      if (L.kind === 'sky') material = skyMaterial(uniforms);
      else if (L.kind === 'glow') material = glowMaterial(uniforms, L.opts);
      else if (L.kind === 'mist') material = mistMaterial(uniforms, L.opts);
      else {
        material = L.kind === 'moon' ? moonMaterial(EMPTY, uniforms, L.opts) : paintMaterial(EMPTY, uniforms, L.opts);
        if (L.frames) {
          // A sprite with several paintings (the raven's poses): its layout() picks one by name each frame.
          const mat = material;
          L.textures = {};
          for (const [name, src] of Object.entries(L.frames)) {
            loads.push(loadTexture(loader, src).then((tex) => {
              L.textures[name] = tex;
              if (mat.uniforms.map.value === EMPTY) mat.uniforms.map.value = tex;
            }));
          }
        } else loads.push(loadTexture(loader, L.src).then((tex) => (material.uniforms.map.value = tex)));
        if (L.kind === 'video') {
          video = createVideo(L.video);
          const vtex = new THREE.VideoTexture(video);
          video.addEventListener('playing', () => (material.uniforms.map.value = vtex), { once: true });
        }
      }
      object = new THREE.Mesh(QUAD, material);
      object.frustumCulled = false;
    }
    object.renderOrder = i;
    scene.add(object);
    layers.push({ def: L, object, rect: { x: 0, y: 0, w: 0, h: 0 } });
  });

  return {
    id: def.id,
    scene,
    ready: Promise.all(loads).then(() => undefined),
    update({ t, s, mx, my, W, fade }) {
      uniforms.time.value = t;
      uniforms.fade.value = fade;
      for (const layer of layers) {
        const u = layer.object.material.uniforms;
        if (u.halfW) u.halfW.value = W / 2;
        if (!layer.def.layout) continue;
        const f = layer.def.layout(W, t, s);
        const { dx, dy } = parallax({ p: layer.def.p, travel, s, mx, my });
        layer.rect = { x: f.x + dx, y: f.y + dy, w: f.w, h: f.h };
        layer.object.position.set(layer.rect.x, layer.rect.y, 0);
        layer.object.scale.set(f.w, f.h, 1);
        if (f.frame && layer.def.textures?.[f.frame]) u.map.value = layer.def.textures[f.frame];
        if (u.opacity && f.alpha != null) u.opacity.value = f.alpha;
        layer.object.visible = f.visible !== false;
      }
    },
    rect: (i) => layers[i]?.rect ?? { x: 0, y: 0, w: 0, h: 0 },
    setVideoPlaying(on) {
      if (!video || on === videoOn) return;
      videoOn = on;
      if (on) video.play().catch(() => (videoOn = false)); // Autoplay refusal just leaves the poster.
      else video.pause();
    },
    dispose() {
      video?.pause();
      for (const { object } of layers) {
        object.material.uniforms.map?.value?.dispose?.();
        object.material.dispose();
        if (object.geometry !== QUAD) object.geometry.dispose();
      }
    },
  };
}
