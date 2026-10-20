import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { fbm3, worley3 } from './noise.js';

// Tileable 3D density noise: value-noise fbm blended with inverted Worley for billowy shapes.
export function cloudNoiseTexture(n) {
  const data = new Uint8Array(n * n * n);
  const P = 4;
  for (let z = 0; z < n; z++) {
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const u = (x / n) * P;
        const v = (y / n) * P;
        const w = (z / n) * P;
        const f = fbm3(u, v, w, 4, P, 5);
        const c = 1 - worley3(u * 2, v * 2, w * 2, P * 2, 9);
        data[x + y * n + z * n * n] = Math.min(255, Math.max(0, (f * 0.55 + c * 0.45) * 255));
      }
    }
  }
  const tex = new THREE.Data3DTexture(data, n, n, n);
  tex.format = THREE.RedFormat;
  tex.type = THREE.UnsignedByteType;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = tex.wrapR = THREE.RepeatWrapping;
  tex.unpackAlignment = 1;
  tex.needsUpdate = true;
  return tex;
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const marchShader = /* glsl */ `
  uniform sampler2D tDepth;
  uniform sampler3D tNoise;
  uniform mat4 projInv;
  uniform mat4 camWorld;
  uniform vec3 camPos;
  uniform vec3 lightDir;
  uniform vec3 lightCol;
  uniform vec3 ambCol;
  uniform vec3 fogCol;
  uniform float time;
  uniform float clearAmt;
  uniform float lightScale;
  varying vec2 vUv;

  // The cloud deck we fly above and then descend through.
  const float B = 82.0;
  const float TOP = 168.0;
  const float SIGMA = 0.085;

  // A clearing over the mount that opens as the camera descends, so the moon shines through from below.
  float clearing(vec3 p) {
    vec2 e = (p.xz - vec2(0.0, -150.0)) / vec2(185.0, 290.0);
    return smoothstep(0.62, 1.12, length(e));
  }

  float deck(vec3 p) {
    float h = (p.y - B) / (TOP - B);
    if (h < 0.0 || h > 1.0) return 0.0;
    float shape = smoothstep(0.0, 0.22, h) * smoothstep(1.0, 0.45, h);
    vec3 wind = vec3(time * 2.2, 0.0, time * 0.9);
    float base = texture(tNoise, (p + wind) * 0.0016).r;
    float c = clamp((base - 0.44) * 2.6, 0.0, 1.0) * shape;
    if (c <= 0.01) return 0.0;
    float detail = texture(tNoise, (p + wind * 1.7) * 0.0082).r;
    c = clamp(c - (1.0 - detail) * 0.42 * (1.0 - c * 0.5), 0.0, 1.0);
    return c * mix(1.0, clearing(p), clearAmt);
  }

  float density(vec3 p) { return deck(p); }

  float hg(float c, float g) {
    float g2 = g * g;
    return (1.0 - g2) / (12.566 * pow(1.0 + g2 - 2.0 * g * c, 1.5));
  }

  float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }

  bool slab(vec3 ro, vec3 rd, float b, float t, out float t0, out float t1) {
    if (abs(rd.y) < 1e-5) {
      t0 = 0.0;
      t1 = 1e7;
      return ro.y >= b && ro.y <= t;
    }
    float a = (b - ro.y) / rd.y;
    float c = (t - ro.y) / rd.y;
    t0 = max(min(a, c), 0.0);
    t1 = max(a, c);
    return t1 > t0;
  }

  void main() {
    vec2 ndc = vUv * 2.0 - 1.0;
    vec4 far = projInv * vec4(ndc, 1.0, 1.0);
    vec3 rd = normalize(mat3(camWorld) * (far.xyz / far.w));
    vec3 ro = camPos;

    float d = texture(tDepth, vUv).x;
    float sceneT = 1e7;
    if (d < 1.0) {
      vec4 q = projInv * vec4(ndc, d * 2.0 - 1.0, 1.0);
      sceneT = length(q.xyz / q.w);
    }

    float cosT = dot(rd, lightDir);
    float phase = min(mix(hg(cosT, 0.62), hg(cosT, -0.2), 0.3) * 9.0 + 0.18, 3.2);
    float jitter = ign(gl_FragCoord.xy);

    vec3 L = vec3(0.0);
    float T = 1.0;
    float t0;
    float t1;
    if (slab(ro, rd, B, TOP, t0, t1)) {
      t1 = min(min(t1, sceneT), t0 + 1500.0);
      float dt = (t1 - t0) / float(STEPS);
      float t = t0 + dt * jitter;
      for (int i = 0; i < STEPS; i++) {
        if (t1 <= t0 || T < 0.02) break;
        vec3 p = ro + rd * t;
        float den = density(p);
        if (den > 0.004) {
          float ls = 0.0;
          vec3 lp = p;
          // Sample most of the deck's thickness toward the moon so undersides fall into shadow.
          const float LSTEP = 84.0 / float(LSTEPS);
          for (int j = 0; j < LSTEPS; j++) {
            lp += lightDir * LSTEP;
            ls += density(lp);
          }
          float lt = exp(-ls * SIGMA * LSTEP);
          float h = clamp((p.y - B) / (TOP - B), 0.0, 1.0);
          // Powder term darkens dense cores so edges read as lit.
          float powder = 1.0 - exp(-den * 6.0);
          vec3 col = (lightCol * lt * phase * mix(0.6, 1.0, powder) + ambCol * (0.35 + 0.65 * h)) * lightScale;
          col = mix(fogCol, col, exp(-t * 0.00065));
          float tr = exp(-den * SIGMA * dt);
          L += T * (1.0 - tr) * col;
          T *= tr;
        }
        t += dt;
      }
    }
    gl_FragColor = vec4(L, T);
  }
`;

const compositeShader = /* glsl */ `
  uniform sampler2D tScene;
  uniform sampler2D tCloud;
  uniform vec2 cloudTexel;
  varying vec2 vUv;
  void main() {
    vec4 s = texture(tScene, vUv);
    // Small tent blur hides the raymarch dither when upscaling.
    vec4 c = texture(tCloud, vUv) * 0.4;
    c += texture(tCloud, vUv + vec2(cloudTexel.x, 0.0)) * 0.15;
    c += texture(tCloud, vUv - vec2(cloudTexel.x, 0.0)) * 0.15;
    c += texture(tCloud, vUv + vec2(0.0, cloudTexel.y)) * 0.15;
    c += texture(tCloud, vUv - vec2(0.0, cloudTexel.y)) * 0.15;
    gl_FragColor = vec4(s.rgb * c.a + c.rgb, 1.0);
  }
`;

// Renders the scene (with depth), raymarches clouds at reduced resolution, and composites.
export class CloudPass extends Pass {
  constructor(scene, camera, { scale, steps, lightSteps, noise, lightDir }) {
    super();
    this.scene = scene;
    this.camera = camera;
    this.scale = scale;
    this.time = 0;
    const depthTexture = new THREE.DepthTexture(1, 1);
    this.sceneRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthTexture });
    this.cloudRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    this.march = new THREE.ShaderMaterial({
      defines: { STEPS: steps, LSTEPS: lightSteps },
      uniforms: {
        tDepth: { value: depthTexture },
        tNoise: { value: noise },
        projInv: { value: new THREE.Matrix4() },
        camWorld: { value: new THREE.Matrix4() },
        camPos: { value: new THREE.Vector3() },
        lightDir: { value: lightDir.clone().normalize() },
        lightCol: { value: new THREE.Color(0.74, 0.78, 0.9).multiplyScalar(0.85) },
        ambCol: { value: new THREE.Color(0.035, 0.037, 0.046) },
        fogCol: { value: new THREE.Color(0.04, 0.04, 0.05) },
        time: { value: 0 },
        clearAmt: { value: 0 },
        lightScale: { value: 1 },
      },
      vertexShader,
      fragmentShader: marchShader,
      depthTest: false,
      depthWrite: false,
    });
    this.composite = new THREE.ShaderMaterial({
      uniforms: { tScene: { value: this.sceneRT.texture }, tCloud: { value: this.cloudRT.texture }, cloudTexel: { value: new THREE.Vector2() } },
      vertexShader,
      fragmentShader: compositeShader,
      depthTest: false,
      depthWrite: false,
    });
    this.marchQuad = new FullScreenQuad(this.march);
    this.compositeQuad = new FullScreenQuad(this.composite);
  }

  setSize(w, h) {
    this.sceneRT.setSize(w, h);
    const cw = Math.max(1, Math.round(w * this.scale));
    const ch = Math.max(1, Math.round(h * this.scale));
    this.cloudRT.setSize(cw, ch);
    this.composite.uniforms.cloudTexel.value.set(1 / cw, 1 / ch);
  }

  render(renderer, writeBuffer) {
    renderer.setRenderTarget(this.sceneRT);
    renderer.clear();
    renderer.render(this.scene, this.camera);

    const u = this.march.uniforms;
    u.projInv.value.copy(this.camera.projectionMatrixInverse);
    u.camWorld.value.copy(this.camera.matrixWorld);
    u.camPos.value.setFromMatrixPosition(this.camera.matrixWorld);
    u.time.value = this.time;
    // Clouds part over the mount only once we're below the deck top.
    const y = u.camPos.value.y;
    u.clearAmt.value = 1 - Math.min(Math.max((y - 110) / 65, 0), 1);
    // Inside the deck it should feel like a dark cloud, not a white-out.
    const inside = Math.min(Math.max((y - 70) / 25, 0), 1) * Math.min(Math.max((180 - y) / 25, 0), 1);
    u.lightScale.value = 1 - inside * 0.72;
    renderer.setRenderTarget(this.cloudRT);
    this.marchQuad.render(renderer);

    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.compositeQuad.render(renderer);
  }

  dispose() {
    this.sceneRT.dispose();
    this.cloudRT.dispose();
    this.march.dispose();
    this.composite.dispose();
    this.marchQuad.dispose();
    this.compositeQuad.dispose();
  }
}
