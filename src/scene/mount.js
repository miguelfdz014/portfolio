import * as THREE from 'three';
import { hash3i } from './noise.js';

const CRIMSON = 0xc8102e;

// Radius of the rock at a given height (lathe profile, [radius, y]).
export const ROCK_PROFILE = [
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

// Triangular prism for gable roofs: ridge along local x, base at y=0, apex at y=1.5.
function prismGeometry() {
  const g = new THREE.CylinderGeometry(1, 1, 1, 3, 1, false, Math.PI / 2);
  g.rotateZ(Math.PI / 2);
  g.translate(0, 0.5, 0);
  return g;
}

// Angle of the main gate on the rampart ring (also where the causeway arrives).
export const GATE_ANGLE = -2.1 + ((2.1 * 2) * 8) / 14;
export const RAMPART_R = 63;

export function buildMount({ stone, slate, rock, rand }) {
  const range = (a, b) => a + rand() * (b - a);
  const mount = new THREE.Group();
  const roofMat = new THREE.MeshStandardMaterial({ map: slate.map, normalMap: slate.normalMap, roughness: 0.86, metalness: 0, envMapIntensity: 0.2 });
  roofMat.map.repeat.set(1, 1);
  const spireMat = new THREE.MeshStandardMaterial({
    map: slate.map,
    normalMap: slate.normalMap,
    color: 0x9a9aa4,
    roughness: 0.45,
    metalness: 0.25,
  });
  const add = (geo, mat, x, y, z, ry = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    mount.add(m);
    return m;
  };

  // Rock
  const rockGeo = new THREE.LatheGeometry(ROCK_PROFILE.map(([r, y]) => new THREE.Vector2(r, y)), 96, 0, Math.PI * 2);
  const p = rockGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    if (y > 43.5) continue;
    const n = hash3i(Math.round(x * 3), Math.round(y * 3), Math.round(z * 3), 5);
    const k = 1 + (n - 0.5) * 0.1 + Math.sin(Math.atan2(x, z) * 7 + y * 0.35) * 0.05;
    p.setXYZ(i, x * k, y + (n - 0.5) * 1.4, z * k);
  }
  rockGeo.computeVertexNormals();
  const rockMat = new THREE.MeshStandardMaterial({ map: rock.map, normalMap: rock.normalMap, roughness: 0.95 });
  rockMat.normalScale.set(1.4, 1.4);
  add(rockGeo, rockMat, 0, 0, 0);

  const merlons = [];
  const windows = [];
  const lamps = [];

  // Ramparts with round towers
  const a0 = -2.1;
  const a1 = 2.1;
  const segs = 14;
  const R = RAMPART_R;
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
    // walkway corbel
    add(new THREE.BoxGeometry(len + 0.4, 0.6, 2.9), stone, (xA + xB) / 2, 8.7, (zA + zB) / 2, ang);
    for (let s = 0.8; s < len; s += 1.6) {
      merlons.push([xA + ((xB - xA) * s) / len, 9.4, zA + ((zB - zA) * s) / len, ang]);
    }
    if (i % 2 === 0) {
      const gate = i === 8;
      const tr = gate ? 4.2 : 3.2;
      const th = gate ? 15 : 12;
      add(new THREE.CylinderGeometry(tr, tr * 1.1, th, 24), stone, xA, th / 2, zA);
      add(new THREE.CylinderGeometry(tr * 1.12, tr, 0.8, 24), stone, xA, th + 0.4, zA);
      if (gate) add(new THREE.ConeGeometry(tr * 1.25, 6, 24), roofMat, xA, th + 3.8, zA);
      else
        for (let k = 0; k < 10; k++) {
          const t = (k / 10) * Math.PI * 2;
          merlons.push([xA + Math.sin(t) * tr, th + 1.2, zA + Math.cos(t) * tr, t]);
        }
      // arrow slits
      windows.push({ x: xA + Math.sin(aa) * (tr + 0.05), y: th * 0.55, z: zA + Math.cos(aa) * (tr + 0.05), ry: aa, w: 0.3, h: 1.4, kind: 'dark' });
    }
  }
  // Gate arch
  const gx = Math.sin(GATE_ANGLE) * (R + 1.2);
  const gz = Math.cos(GATE_ANGLE) * (R + 1.2);
  add(new THREE.BoxGeometry(3.2, 5, 0.4), new THREE.MeshBasicMaterial({ color: 0x050303 }), gx, 2.5, gz, GATE_ANGLE);
  lamps.push({ x: Math.sin(GATE_ANGLE) * (R + 4), y: 4, z: Math.cos(GATE_ANGLE) * (R + 4), color: CRIMSON, intensity: 160 });

  // Village houses climbing the front face
  const houses = [];
  for (let y = 7; y < 37; y += 2.6) {
    const r = rockRadiusAt(y);
    const span = 1.9 - (y / 40) * 0.6;
    const step = 6.2 / r;
    for (let a = -span; a < span; a += step * range(0.85, 1.25)) {
      if (rand() < 0.12) continue;
      houses.push({
        a,
        y: y - 1 + range(-1.1, 1.1),
        r: r - range(0.2, 1.4),
        w: range(2.6, 6),
        h: range(3, 7.5),
        d: range(3, 4.5),
        turn: range(-0.25, 0.25),
      });
    }
  }
  const bodyMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), stone, houses.length);
  const roofMesh = new THREE.InstancedMesh(prismGeometry(), roofMat, houses.length);
  const chimneyMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 2, 0.7).translate(0, 1, 0), stone, houses.length);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const col = new THREE.Color();
  let chimneys = 0;
  houses.forEach((h, i) => {
    const ang = h.a + h.turn;
    const x = Math.sin(h.a) * h.r;
    const z = Math.cos(h.a) * h.r;
    q.setFromAxisAngle(up, ang);
    m4.compose(new THREE.Vector3(x, h.y, z), q, new THREE.Vector3(h.w, h.h, h.d));
    bodyMesh.setMatrixAt(i, m4);
    const g = range(0.7, 1.2);
    bodyMesh.setColorAt(i, col.setRGB(g * 1.02, g, g * 0.95));
    const rh = range(1.2, 2.1);
    m4.compose(new THREE.Vector3(x, h.y + h.h, z), q, new THREE.Vector3(h.w * 1.08, rh, h.d * 0.64));
    roofMesh.setMatrixAt(i, m4);
    if (rand() < 0.4) {
      const cx = x + Math.cos(ang) * h.w * 0.3;
      const cz = z - Math.sin(ang) * h.w * 0.3;
      m4.compose(new THREE.Vector3(cx, h.y + h.h + rh * 0.6, cz), q, new THREE.Vector3(1, range(0.8, 1.4), 1));
      chimneyMesh.setMatrixAt(chimneys++, m4);
    }
    if (rand() < 0.32) {
      const lx = range(-0.3, 0.3) * h.w;
      const ly = h.y + h.h * range(0.35, 0.65);
      const lz = h.d / 2 + 0.05;
      windows.push({
        x: x + lx * Math.cos(ang) + lz * Math.sin(ang),
        y: ly,
        z: z - lx * Math.sin(ang) + lz * Math.cos(ang),
        ry: ang,
        w: 0.6,
        h: 1,
        kind: rand() < 0.25 ? 'red' : 'warm',
      });
    }
  });
  chimneyMesh.count = chimneys;
  mount.add(bodyMesh, roofMesh, chimneyMesh);

  // Warm lamplight among the houses
  for (const [a, y] of [[-0.9, 12], [0.1, 18], [0.8, 10], [-0.3, 27], [0.5, 31]]) {
    const r = rockRadiusAt(y) + 3;
    lamps.push({ x: Math.sin(a) * r, y: y + 2, z: Math.cos(a) * r, color: 0xffa860, intensity: 90 });
  }

  // Abbey on the summit
  add(new THREE.BoxGeometry(24, 13, 30), stone, 0, 44, -3); // foundations
  add(new THREE.BoxGeometry(12, 30, 28), stone, -13, 30, -10); // La Merveille (north flank)
  for (let z = -22; z <= 2; z += 4) add(new THREE.BoxGeometry(1.4, 30, 1.6), stone, -19.6, 30, z); // its buttresses
  add(new THREE.BoxGeometry(9, 12, 26), stone, 0, 56.5, 3); // nave
  const naveRoof = add(prismGeometry(), roofMat, 0, 62.5, 3, Math.PI / 2);
  naveRoof.scale.set(26, 4.2, 5.4);
  add(new THREE.BoxGeometry(22, 11, 8), stone, 0, 56, -7); // transept
  const transRoof = add(prismGeometry(), roofMat, 0, 61.5, -7);
  transRoof.scale.set(22, 3.8, 4.8);
  add(new THREE.CylinderGeometry(6, 6, 14, 20, 1, false, Math.PI / 2, Math.PI), stone, 0, 57, -11); // apse
  add(new THREE.ConeGeometry(6.4, 6, 20, 1, false, Math.PI / 2, Math.PI), roofMat, 0, 67, -11);
  // west facade with gable
  add(new THREE.BoxGeometry(11, 15, 1.4), stone, 0, 57.5, 16.2);
  const gable = add(prismGeometry(), stone, 0, 65, 16.2, Math.PI / 2);
  gable.scale.set(1.4, 3.2, 6.4);
  // buttresses with pinnacles
  for (let z = -6; z <= 14; z += 4) {
    for (const sx of [-1, 1]) {
      add(new THREE.BoxGeometry(1.4, 12, 1.4), stone, sx * 5.2, 56, z);
      add(new THREE.ConeGeometry(0.7, 3, 4), spireMat, sx * 5.2, 63.5, z);
    }
  }
  for (const [x, z] of [[-11, -10.5], [11, -10.5], [-11, -3.5], [11, -3.5]]) {
    add(new THREE.BoxGeometry(1.6, 13, 1.6), stone, x, 56.5, z);
    add(new THREE.ConeGeometry(0.9, 4, 4), spireMat, x, 65, z);
  }
  // crossing tower, belfry, spire and the archangel
  add(new THREE.BoxGeometry(8, 10, 8), stone, 0, 67, -7);
  add(new THREE.CylinderGeometry(3.6, 3.8, 10, 8), stone, 0, 77, -7);
  for (let k = 0; k < 8; k++) {
    const t = (k / 8) * Math.PI * 2 + Math.PI / 8;
    add(new THREE.ConeGeometry(0.5, 4, 4), spireMat, Math.sin(t) * 4, 83.5, -7 + Math.cos(t) * 4);
    windows.push({ x: Math.sin(t) * 3.66, y: 77, z: -7 + Math.cos(t) * 3.66, ry: t, w: 0.8, h: 4, kind: 'dark' });
  }
  add(new THREE.ConeGeometry(3.6, 30, 8), spireMat, 0, 97, -7);
  const angelMat = new THREE.MeshStandardMaterial({ color: 0xd8c08a, metalness: 1, roughness: 0.3, emissive: 0x3a2a10 });
  add(new THREE.CylinderGeometry(0.25, 0.45, 3, 6), angelMat, 0, 113.4, -7);
  const wing = add(new THREE.ConeGeometry(0.6, 2.2, 3), angelMat, 0, 114.4, -7.3);
  wing.rotation.x = 0.6;
  add(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 4), angelMat, 0.5, 115.6, -7);

  // Gothic windows on the church
  for (let z = -4; z <= 12; z += 4) {
    for (const sx of [-1, 1]) windows.push({ x: sx * 4.56, y: 56, z, ry: (sx * Math.PI) / 2, w: 1.1, h: 4.5, kind: 'red' });
  }
  for (const [x, y] of [[-7, 46], [-3, 46], [3, 46], [7, 46], [-5, 41], [5, 41]]) {
    windows.push({ x, y, z: 12.06, ry: 0, w: 0.8, h: 1.6, kind: 'warm' });
  }
  const rose = add(
    new THREE.CircleGeometry(2, 28),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 0.06, 0.14), toneMapped: false }),
    0,
    59,
    16.95,
  );
  rose.renderOrder = 1;
  lamps.push({ x: 0, y: 58, z: 22, color: CRIMSON, intensity: 70 });

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

  // Windows: one instanced unlit mesh with per-instance colour
  const winMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ toneMapped: false }), windows.length);
  const colors = {
    warm: new THREE.Color(1.1, 0.72, 0.38),
    red: new THREE.Color(1.5, 0.06, 0.14),
    dark: new THREE.Color(0.01, 0.01, 0.012),
  };
  windows.forEach((w, i) => {
    dummy.position.set(w.x, w.y, w.z);
    dummy.rotation.set(0, w.ry, 0);
    dummy.scale.set(w.w, w.h, 1);
    dummy.updateMatrix();
    winMesh.setMatrixAt(i, dummy.matrix);
    winMesh.setColorAt(i, colors[w.kind]);
  });
  mount.add(winMesh);

  for (const l of lamps) {
    const light = new THREE.PointLight(l.color, l.intensity, 34, 2);
    light.position.set(l.x, l.y, l.z);
    mount.add(light);
  }

  // Banner on the gate tower
  const flagMat = new THREE.MeshStandardMaterial({ color: CRIMSON, emissive: 0x3a000c, roughness: 0.8, side: THREE.DoubleSide });
  const fx = Math.sin(GATE_ANGLE) * R;
  const fz = Math.cos(GATE_ANGLE) * R;
  add(new THREE.CylinderGeometry(0.12, 0.12, 6, 6), roofMat, fx, 24, fz);
  const flagGeo = new THREE.PlaneGeometry(4, 2.2, 14, 2).translate(2, 0, 0);
  const flag = add(flagGeo, flagMat, fx, 25.6, fz);
  flag.userData.base = flagGeo.attributes.position.array.slice();

  mount.traverse((o) => {
    if (o.isMesh && o.material !== winMesh.material && !o.material.isMeshBasicMaterial) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  flag.castShadow = false;

  return { mount, flag };
}
