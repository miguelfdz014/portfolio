// Shaders for the painted stages (ported from the design spike).
// Every factory takes `uniforms = { time, fade }`: shared { value } objects. `fade` (0..1) dims the whole stage,
// which is how stages hand over to each other through darkness.
// Textures stay in NoColorSpace and colours pass through raw, so the paintings look exactly as painted.
import * as THREE from 'three';

const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const NOISE = /* glsl */ `
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float v = 0., a = .5; for (int k = 0; k < 5; k++) { v += a * noise(p); p *= 2.03; a *= .5; } return v; }`;

const base = (uniforms, extra, opts = {}) => ({
  transparent: true,
  depthTest: false,
  depthWrite: false,
  uniforms: { time: uniforms.time, fade: uniforms.fade, ...extra },
  vertexShader: VERT,
  ...opts,
});

export function paintMaterial(tex, uniforms, o = {}) {
  return new THREE.ShaderMaterial(
    base(uniforms, {
      map: { value: tex },
      uvRect: { value: new THREE.Vector4(...(o.uvRect ?? [0, 0, 1, 1])) },
      flipX: { value: o.flipX ? 1 : 0 },
      fadeX: { value: o.fadeX ?? 0 },
      sway: { value: o.sway ?? 0 },
      swayBand: { value: new THREE.Vector2(...(o.swayBand ?? [0, 1])) },
      windows: { value: o.windows ? 1 : 0 },
      opacity: { value: o.opacity ?? 1 },
    }, {
      fragmentShader: /* glsl */ `
        uniform sampler2D map; uniform float time, fade, flipX, fadeX, sway, windows, opacity;
        uniform vec4 uvRect; uniform vec2 swayBand;
        varying vec2 vUv;
        void main() {
          vec2 uv = vUv;
          if (flipX > .5) uv.x = 1. - uv.x;
          uv = uvRect.xy + uv * uvRect.zw;
          if (sway > 0.) {
            // Wind: a slow gust wave travels across, small ripples ride on it. Anchored at the bottom of the band.
            float w = smoothstep(swayBand.x, swayBand.y, uv.y);
            float gust = .55 + .45 * sin(uv.x * 3.1 - time * .9);
            uv.x += sin(time * 1.7 + uv.x * 19. + uv.y * 7.) * sway * w * gust;
            uv.y += cos(time * 1.3 + uv.x * 13.) * sway * .45 * w * gust;
          }
          vec4 c = texture2D(map, uv);
          if (windows > .5) {
            // Crimson windows flicker like candlelight.
            float red = smoothstep(.1, .28, c.r - max(c.g, c.b));
            float f = .7 + .3 * sin(time * 7.3 + uv.x * 60.) * sin(time * 4.1 + uv.y * 37.) + .12 * sin(time * 21. + uv.x * 90.);
            c.rgb += c.rgb * red * f * 1.6;
          }
          float a = c.a * opacity;
          if (fadeX > 0.) a *= smoothstep(0., fadeX, uv.x) * smoothstep(0., fadeX, 1. - uv.x);
          gl_FragColor = vec4(c.rgb * fade, a);
        }`,
    }),
  );
}

export function skyMaterial(uniforms) {
  return new THREE.ShaderMaterial(
    base(uniforms, { size: { value: new THREE.Vector2(4, 4.5) } }, {
      transparent: false,
      fragmentShader: /* glsl */ `
        uniform float time, fade; uniform vec2 size; varying vec2 vUv;
        ${NOISE}
        void main() {
          vec3 top = vec3(.024, .062, .15), bot = vec3(.13, .25, .5);
          vec3 col = mix(bot, top, smoothstep(.22, .72, vUv.y));
          col += vec3(.05, .07, .13) * smoothstep(.45, .9, fbm(vUv * size * .6 + vec2(time * .01, 0.))) * .6;
          vec2 p = vUv * size * 38.; vec2 id = floor(p); vec2 f = fract(p) - .5;
          float r = hash(id);
          if (r > .965) {
            vec2 o = vec2(hash(id + 1.3), hash(id + 2.7)) - .5;
            float tw = .5 + .5 * sin(time * (1. + r * 3.) + r * 80.);
            col += vec3(.8, .88, 1.) * smoothstep(.09, 0., length(f - o * .6)) * tw * (r - .965) * 28. * smoothstep(.3, .6, vUv.y);
          }
          gl_FragColor = vec4(col * fade, 1.);
        }`,
    }),
  );
}

// Additive: the crop's painted sky is subtracted first, so only the moon and its halo add light (no visible disc).
export function moonMaterial(tex, uniforms, { bg = [0.04, 0.09, 0.18] } = {}) {
  return new THREE.ShaderMaterial(
    base(uniforms, { map: { value: tex }, bg: { value: new THREE.Vector3(...bg) } }, {
      blending: THREE.AdditiveBlending,
      fragmentShader: /* glsl */ `
        uniform sampler2D map; uniform float time, fade; uniform vec3 bg; varying vec2 vUv;
        void main() {
          float d = distance(vUv, vec2(.5));
          vec3 c = max(texture2D(map, vUv).rgb - bg, 0.) * (1. - smoothstep(.4, .5, d));
          gl_FragColor = vec4(c * (1. + .04 * sin(time * .6)) * fade, 1.);
        }`,
    }),
  );
}

export function glowMaterial(uniforms, { color = [0.5, 0.66, 1], flicker = false, strength = 0.3 } = {}) {
  return new THREE.ShaderMaterial(
    base(uniforms, { color: { value: new THREE.Vector3(...color) }, flicker: { value: flicker ? 1 : 0 }, strength: { value: strength } }, {
      blending: THREE.AdditiveBlending,
      fragmentShader: /* glsl */ `
        uniform float time, fade, flicker, strength; uniform vec3 color; varying vec2 vUv;
        void main() {
          float d = distance(vUv, vec2(.5)) * 2.;
          float pulse = flicker > .5
            ? .82 + .12 * sin(time * 9.1) * sin(time * 5.3 + 1.7) + .06 * sin(time * 23.)
            : .9 + .1 * sin(time * .7);
          gl_FragColor = vec4(color * pow(max(0., 1. - d), 2.6) * strength * pulse * fade, 1.);
        }`,
    }),
  );
}

export function mistMaterial(uniforms, { opacity, speed }) {
  return new THREE.ShaderMaterial(
    base(uniforms, { opacity: { value: opacity }, speed: { value: speed } }, {
      fragmentShader: /* glsl */ `
        uniform float time, fade, opacity, speed; varying vec2 vUv;
        ${NOISE}
        void main() {
          vec2 p = vec2(vUv.x * 5. + time * speed, vUv.y * 1.6);
          float m = fbm(p + fbm(p * .7 - time * speed * .5));
          float band = smoothstep(0., .4, vUv.y) * smoothstep(1., .5, vUv.y);
          gl_FragColor = vec4(vec3(.6, .67, .82) * fade, smoothstep(.38, .8, m) * band * opacity);
        }`,
    }),
  );
}

function instanced(count) {
  const geo = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1));
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(new Float32Array(count * 4).map(() => Math.random()), 4));
  geo.instanceCount = count;
  return geo;
}

export function createPetals(uniforms, { count, size, opacity }) {
  const mat = new THREE.ShaderMaterial(
    base(uniforms, { halfW: { value: 1.8 }, size: { value: size }, opacity: { value: opacity } }, {
      vertexShader: /* glsl */ `
        uniform float time, halfW, size; attribute vec4 aSeed; varying vec2 vUv; varying float vFlip;
        void main() {
          vUv = uv;
          float speed = mix(.6, 1.4, aSeed.x);
          float y = mix(1.25, -1.25, fract(aSeed.y + time * .045 * speed)) + sin(time * 1.3 + aSeed.w * 20.) * .04;
          float x = mix(-halfW - .3, halfW + .3, fract(aSeed.z + time * .03 * speed)) + sin(time * .9 + aSeed.y * 30.) * .12;
          float rot = time * (.6 + aSeed.x * 1.5) + aSeed.w * 6.28;
          vFlip = cos(time * (1.2 + aSeed.z * 2.) + aSeed.y * 10.);
          vec2 p = position.xy * vec2(abs(vFlip) * .75 + .25, 1.) * mix(.022, .045, aSeed.w) * size;
          p = mat2(cos(rot), -sin(rot), sin(rot), cos(rot)) * p;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p + vec2(x, y), 0., 1.);
        }`,
      fragmentShader: /* glsl */ `
        uniform float fade, opacity; varying vec2 vUv; varying float vFlip;
        void main() {
          // Rose petal: narrow base, broad rounded top with a soft notch; darker base, lit curled edge.
          vec2 p = vUv * 2. - 1.;
          float wdt = mix(.35, 1., smoothstep(-1., .3, p.y));
          float d = length(vec2(p.x / wdt, p.y * .95));
          d += .25 * smoothstep(.25, 0., abs(p.x)) * smoothstep(.55, .95, p.y);
          float lit = .5 + .5 * vFlip;
          vec3 col = mix(vec3(.3, .01, .04), vec3(.86, .08, .13), lit * .8 + .2);
          col *= .7 + .45 * smoothstep(-1., .8, p.y);
          col += vec3(.35, .06, .08) * smoothstep(.75, .98, d) * lit;
          col += vec3(.12, .14, .3) * smoothstep(.2, 1., p.x) * .4;
          gl_FragColor = vec4(col * fade, smoothstep(1., .9, d) * opacity);
        }`,
    }),
  );
  const mesh = new THREE.Mesh(instanced(count), mat);
  mesh.frustumCulled = false;
  return mesh;
}

// Small glowing points that wander inside an area of the view: fireflies, dust in a moonbeam.
export function createMotes(uniforms, { count, size, color, area, drift = 0.04 }) {
  const mat = new THREE.ShaderMaterial(
    base(uniforms, {
      size: { value: size },
      color: { value: new THREE.Vector3(...color) },
      area: { value: new THREE.Vector4(area.x0, area.y0, area.x1, area.y1) },
      drift: { value: drift },
    }, {
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        uniform float time, size, drift; uniform vec4 area; attribute vec4 aSeed; varying vec2 vUv; varying float vTw;
        void main() {
          vUv = uv;
          vec2 at = mix(area.xy, area.zw, aSeed.xy);
          at += vec2(sin(time * (.3 + aSeed.z * .4) + aSeed.w * 40.), cos(time * (.25 + aSeed.w * .35) + aSeed.z * 30.)) * drift;
          vTw = .5 + .5 * sin(time * (1. + aSeed.z * 2.) + aSeed.x * 50.);
          vec2 p = position.xy * mix(.006, .014, aSeed.w) * size;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p + at, 0., 1.);
        }`,
      fragmentShader: /* glsl */ `
        uniform float fade; uniform vec3 color; varying vec2 vUv; varying float vTw;
        void main() {
          float d = distance(vUv, vec2(.5)) * 2.;
          gl_FragColor = vec4(color * pow(max(0., 1. - d), 2.) * vTw * fade, 1.);
        }`,
    }),
  );
  const mesh = new THREE.Mesh(instanced(count), mat);
  mesh.frustumCulled = false;
  return mesh;
}
