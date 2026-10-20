import * as THREE from 'three';
import { skyTexture, glowTexture, streakTexture, hazeTexture } from './textures.js';

// Objects on this layer are seen by the main camera but not by the water's reflection camera,
// so stars don't scatter grey specks across the sea.
export const SKY_LAYER = 1;

const starVertex = /* glsl */ `
  attribute float size;
  attribute float phase;
  attribute vec3 tint;
  uniform float time;
  uniform float pixelRatio;
  varying vec3 vTint;
  void main() {
    // Scintillation: brighter stars twinkle more slowly and less.
    float tw = 0.72 + 0.28 * sin(time * (1.2 + phase * 2.4) + phase * 37.0);
    vTint = tint * tw;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * pixelRatio;
  }
`;
const starFragment = /* glsl */ `
  varying vec3 vTint;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vTint, a * a);
  }
`;

function starMaterial(pixelRatio) {
  return new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, pixelRatio: { value: pixelRatio } },
    vertexShader: starVertex,
    fragmentShader: starFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

// Black-body-ish star colours, from hot blue to cool orange.
const TEMPS = [
  [0.75, 0.82, 1.0],
  [0.9, 0.93, 1.0],
  [1.0, 1.0, 1.0],
  [1.0, 0.95, 0.85],
  [1.0, 0.85, 0.68],
];

function pointCloud(count, place, style, material) {
  const pos = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const phase = new Float32Array(count);
  const tint = new Float32Array(count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    place(v);
    v.toArray(pos, i * 3);
    const s = style();
    size[i] = s.size;
    phase[i] = s.phase;
    tint.set(s.tint, i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('phase', new THREE.BufferAttribute(phase, 1));
  geo.setAttribute('tint', new THREE.BufferAttribute(tint, 3));
  const pts = new THREE.Points(geo, material);
  pts.frustumCulled = false;
  pts.layers.set(SKY_LAYER);
  return pts;
}

export function buildSky({ rand, pixelRatio, mobile, moonPos }) {
  const range = (a, b) => a + rand() * (b - a);
  const group = new THREE.Group();
  const R = 2400;
  const tex = skyTexture();

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(3000, 32, 24),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false }),
  );
  group.add(dome);

  const material = starMaterial(pixelRatio);
  // Stars, the Milky Way and its glow travel with the camera, as if infinitely far away.
  const celestial = new THREE.Group();
  group.add(celestial);

  // Field stars across the whole sky
  const field = pointCloud(
    mobile ? 2200 : 3600,
    (v) => {
      const theta = rand() * Math.PI * 2;
      const y = range(0.02, 1);
      const r = Math.sqrt(1 - y * y);
      v.set(Math.cos(theta) * r, y, Math.sin(theta) * r).multiplyScalar(R);
    },
    () => {
      const bright = Math.pow(rand(), 6);
      const t = TEMPS[Math.floor(rand() * TEMPS.length)];
      const k = 0.35 + bright * 1.6;
      return { size: 1.1 + bright * 3.6, phase: rand(), tint: [t[0] * k, t[1] * k, t[2] * k] };
    },
    material,
  );
  celestial.add(field);

  // The Milky Way: a dense band of faint stars along a tilted great circle.
  // Rises from the left horizon and arcs up behind the moon toward the upper right of the opening view.
  const a = new THREE.Vector3(-0.55, 0.03, -0.84).normalize();
  const b = new THREE.Vector3(0.4, 0.34, -0.85).normalize();
  const n = new THREE.Vector3().crossVectors(a, b).normalize();
  const u = a.clone();
  const w = new THREE.Vector3().crossVectors(n, u).normalize();
  const bandPoint = (v, spread) => {
    for (;;) {
      const t = rand() * Math.PI * 2;
      // Gaussian-ish spread across the band, wider near its core
      const lat = (rand() + rand() + rand() - 1.5) * spread * (0.7 + 0.6 * Math.abs(Math.sin(t)));
      v.copy(u)
        .multiplyScalar(Math.cos(t))
        .addScaledVector(w, Math.sin(t))
        .multiplyScalar(Math.cos(lat))
        .addScaledVector(n, Math.sin(lat))
        .normalize();
      if (v.y > 0.015) return v.multiplyScalar(R * 0.98);
    }
  };
  const milky = pointCloud(
    mobile ? 12000 : 26000,
    (v) => bandPoint(v, 0.16),
    () => {
      const t = TEMPS[Math.floor(rand() * 3)];
      const k = 0.32 + Math.pow(rand(), 3) * 0.75;
      return { size: 1 + rand() * 1.3, phase: rand(), tint: [t[0] * k, t[1] * k, t[2] * k] };
    },
    material,
  );
  celestial.add(milky);

  // Diffuse glow of the band
  const glow = glowTexture();
  const v = new THREE.Vector3();
  for (let i = 0; i < (mobile ? 50 : 120); i++) {
    bandPoint(v, 0.07);
    const sp = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glow,
        color: new THREE.Color().setRGB(range(0.55, 0.75), range(0.58, 0.72), range(0.7, 0.85)),
        transparent: true,
        opacity: range(0.025, 0.05),
        depthWrite: false,
        fog: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    sp.position.copy(v).multiplyScalar(0.97);
    const s = range(380, 820);
    sp.scale.set(s, s * range(0.55, 0.85), 1);
    sp.layers.set(SKY_LAYER);
    celestial.add(sp);
  }

  // A low haze band around the horizon for depth
  const haze = new THREE.Mesh(
    new THREE.CylinderGeometry(1650, 1650, 140, 64, 1, true),
    new THREE.MeshBasicMaterial({ map: hazeTexture(), transparent: true, depthWrite: false, side: THREE.BackSide, fog: false }),
  );
  haze.position.y = 55;
  group.add(haze);

  // Shooting stars: an occasional streak inside the current view
  const streak = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: streakTexture(),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  streak.layers.set(SKY_LAYER);
  streak.visible = false;
  group.add(streak);
  const meteor = { wait: 3 + rand() * 4, life: 0, dur: 0.9, vel: new THREE.Vector3() };
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const fwd = new THREE.Vector3();

  function update(t, dt, camera) {
    material.uniforms.time.value = t;
    // Keep the dome centred on the camera so the horizon never gets closer
    dome.position.set(camera.position.x, 0, camera.position.z);
    celestial.position.copy(camera.position);
    haze.position.x = camera.position.x;
    haze.position.z = camera.position.z;

    if (meteor.life > 0) {
      meteor.life -= dt;
      const p = 1 - meteor.life / meteor.dur;
      streak.material.opacity = Math.sin(Math.min(p, 1) * Math.PI) * 0.9;
      streak.position.addScaledVector(meteor.vel, dt);
      if (meteor.life <= 0) streak.visible = false;
    } else if ((meteor.wait -= dt) <= 0 && camera.position.y > 40) {
      camera.getWorldDirection(fwd);
      right.crossVectors(fwd, camera.up).normalize();
      up.crossVectors(right, fwd).normalize();
      const ang = -(0.3 + rand() * 0.5) * (rand() < 0.5 ? 1 : -1) - (rand() < 0.5 ? 0 : Math.PI);
      streak.position
        .copy(camera.position)
        .addScaledVector(fwd, 1400)
        .addScaledVector(right, range(-600, 600))
        .addScaledVector(up, range(250, 520));
      meteor.vel.copy(right).multiplyScalar(Math.cos(ang)).addScaledVector(up, Math.sin(ang)).multiplyScalar(range(900, 1400));
      streak.material.rotation = ang;
      streak.scale.set(range(160, 260), 6, 1);
      streak.visible = true;
      meteor.dur = range(0.6, 1.1);
      meteor.life = meteor.dur;
      meteor.wait = range(5, 12);
    }
  }

  return { group, update, moonPos };
}
