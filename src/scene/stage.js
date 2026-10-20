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

// Which file of a painting to load: the portrait version on upright screens (when the painting has one), else the
// 16:9 painting at a size that suits the screen's pixel width.
export function pickSrc(src, { orient, wide }) {
  if (orient === 'portrait' && src.portrait) return src.portrait;
  return wide ? src.desktop : src.mobile;
}
// The layout a stage uses: its portrait one only when its painting has a portrait version that actually loaded,
// so a missing portrait painting is shown at its own 16:9 shape instead of squeezed.
export const artOrientation = (orient, src, portraitMissing) =>
  orient === 'portrait' && src?.portrait && !portraitMissing ? 'portrait' : 'landscape';

const isWide = () => window.innerWidth * (window.devicePixelRatio || 1) > 1600;

function loadUrl(loader, url) {
  return new Promise((resolve) => {
    loader.load(
      url,
      (tex) => {
        tex.anisotropy = 8;
        resolve(tex);
      },
      undefined,
      () => resolve(null),
    );
  });
}

// A missing portrait painting falls back to the 16:9 one; a missing painting leaves a gap, never a broken page.
async function loadTexture(loader, src, orient, onPortraitMissing) {
  const url = pickSrc(src, { orient, wide: isWide() });
  const tex = await loadUrl(loader, url);
  if (tex) return tex;
  if (url !== src.portrait) return EMPTY;
  onPortraitMissing?.();
  return (await loadUrl(loader, pickSrc(src, { orient: 'landscape', wide: isWide() }))) ?? EMPTY;
}

// A video source is a URL, or { landscape, portrait } URLs.
const videoUrl = (v, orient) => (typeof v === 'string' ? v : (orient === 'portrait' && v.portrait) || v.landscape);

function createVideo(url) {
  const video = Object.assign(document.createElement('video'), { muted: true, loop: true, playsInline: true, preload: 'none' });
  video.setAttribute('aria-hidden', 'true');
  video.src = url;
  return video;
}

export function createStage(def, { loader, orient: startOrient = 'landscape' }) {
  let orient = startOrient;
  // The base painting (layer 0) decides the stage's layout; set when its portrait file fails to load.
  let portraitMissing = false;
  const missing = (i) => (i === 0 ? () => (portraitMissing = true) : undefined);
  const layoutOrient = () => artOrientation(orient, def.layers[0].src, portraitMissing);
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
            loads.push(loadTexture(loader, src, orient).then((tex) => {
              L.textures[name] = tex;
              if (mat.uniforms.map.value === EMPTY) mat.uniforms.map.value = tex;
            }));
          }
        } else loads.push(loadTexture(loader, L.src, orient, missing(i)).then((tex) => (material.uniforms.map.value = tex)));
        if (L.kind === 'video') {
          video = createVideo(videoUrl(L.video, orient));
          const vtex = new THREE.VideoTexture(video);
          // The poster shows until the loop is actually playing (again after a switch to the other painting).
          video.addEventListener('playing', () => (material.uniforms.map.value = vtex));
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
        const f = layer.def.layout(W, t, s, layoutOrient());
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
    // Switch between the 16:9 and portrait paintings: reload every painting that has a portrait version.
    setOrientation(next) {
      if (next === orient) return;
      orient = next;
      layers.forEach(({ def: L, object }, i) => {
        if (!L.src?.portrait) return;
        const mat = object.material;
        // A loop switching to the other clip shows the new poster until that clip plays (the 'playing' listener
        // swaps the video back in), never a stretched last frame of the old clip.
        const videoSwitch = L.kind === 'video' && video && !video.src.endsWith(videoUrl(L.video, orient));
        loadTexture(loader, L.src, orient, missing(i)).then((tex) => {
          if (orient !== next) return tex !== EMPTY && tex.dispose?.();
          if (L.kind === 'video' && video && !video.paused && !videoSwitch) return tex !== EMPTY && tex.dispose?.();
          const old = mat.uniforms.map.value;
          mat.uniforms.map.value = tex;
          if (old !== EMPTY && !(old instanceof THREE.VideoTexture)) old.dispose?.();
        });
        if (L.kind === 'video' && video) {
          const url = videoUrl(L.video, orient);
          if (!video.src.endsWith(url)) {
            const playing = videoOn;
            video.src = url;
            videoOn = false;
            if (playing) this.setVideoPlaying(true);
          }
        }
      });
    },
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
