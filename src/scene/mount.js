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

// Round-headed (or pointed, with `point` > 0) arch outline standing on y=0.
function archShape(w, spring, point = 0) {
  const s = new THREE.Shape();
  const r = w / 2;
  s.moveTo(-r, 0);
  s.lineTo(-r, spring);
  if (point) {
    s.quadraticCurveTo(-r, spring + r * 1.1, 0, spring + r * (1 + point));
    s.quadraticCurveTo(r, spring + r * 1.1, r, spring);
  } else {
    s.absarc(0, spring, r, Math.PI, 0, true);
  }
  s.lineTo(r, 0);
  s.closePath();
  return s;
}

// The rampart ring and where its main gate sits (the causeway arrives here).
const A0 = -2.1;
const A1 = 2.1;
const SEGS = 14;
const GATE_INDEX = 8;
export const RAMPART_R = 63;
export const GATE_ANGLE = A0 + ((A1 - A0) * GATE_INDEX) / SEGS;
export const GATE_DEPTH = 5.2;

export function buildMount({ mats, tex, rand }) {
  const range = (a, b) => a + rand() * (b - a);
  const { stone, roof, spire, rock } = mats;
  const mount = new THREE.Group();
  const add = (geo, mat, x, y, z, ry = 0, parent = mount) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    parent.add(m);
    return m;
  };
  const merlons = [];
  const windows = [];
  const lamps = [];
  const flags = [];

  const flagMat = new THREE.MeshStandardMaterial({
    map: tex.banner.map,
    normalMap: tex.banner.normalMap,
    roughness: 0.85,
    side: THREE.DoubleSide,
  });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.9 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x151517, roughness: 0.45, metalness: 0.8 });

  // ---------------------------------------------------------------- Rock
  const rockGeo = new THREE.LatheGeometry(ROCK_PROFILE.map(([r, y]) => new THREE.Vector2(r, y)), 96);
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
  add(rockGeo, rock, 0, 0, 0);

  // ---------------------------------------------------------------- Ramparts
  const R = RAMPART_R;
  for (let i = 0; i < SEGS; i++) {
    const aa = A0 + ((A1 - A0) * i) / SEGS;
    const ab = A0 + ((A1 - A0) * (i + 1)) / SEGS;
    const xA = Math.sin(aa) * R;
    const zA = Math.cos(aa) * R;
    const xB = Math.sin(ab) * R;
    const zB = Math.cos(ab) * R;
    const len = Math.hypot(xB - xA, zB - zA);
    const ang = -Math.atan2(zB - zA, xB - xA);
    add(new THREE.BoxGeometry(len + 0.4, 9, 2.2), stone, (xA + xB) / 2, 4.5, (zA + zB) / 2, ang);
    add(new THREE.BoxGeometry(len + 0.4, 0.6, 2.9), stone, (xA + xB) / 2, 8.7, (zA + zB) / 2, ang);
    // machicolation corbels under the walkway
    const mid = (aa + ab) / 2;
    for (let s = 0.6; s < len; s += 1.2) {
      const t = s / len;
      add(new THREE.BoxGeometry(0.35, 0.7, 0.5), stone, xA + (xB - xA) * t + Math.sin(mid) * 1.3, 8.1, zA + (zB - zA) * t + Math.cos(mid) * 1.3, ang);
    }
    for (let s = 0.8; s < len; s += 1.6) {
      merlons.push([xA + ((xB - xA) * s) / len, 9.4, zA + ((zB - zA) * s) / len, ang]);
    }
    if (i % 2 === 0 && i !== GATE_INDEX) {
      const tr = 3.2;
      const th = 12;
      add(new THREE.CylinderGeometry(tr, tr * 1.1, th, 24), stone, xA, th / 2, zA);
      add(new THREE.CylinderGeometry(tr * 1.14, tr, 0.9, 24), stone, xA, th + 0.45, zA);
      if (i % 4 === 0) {
        add(new THREE.ConeGeometry(tr * 1.2, 5.5, 24), roof, xA, th + 3.6, zA);
      } else {
        for (let k = 0; k < 10; k++) {
          const t = (k / 10) * Math.PI * 2;
          merlons.push([xA + Math.sin(t) * tr, th + 1.3, zA + Math.cos(t) * tr, t]);
        }
      }
      windows.push({ x: xA + Math.sin(aa) * (tr + 0.05), y: th * 0.55, z: zA + Math.cos(aa) * (tr + 0.05), ry: aa, w: 0.3, h: 1.4, kind: 'dark' });
    }
  }

  // ---------------------------------------------------------------- Gatehouse
  const gate = new THREE.Group();
  gate.position.set(Math.sin(GATE_ANGLE) * R, 0, Math.cos(GATE_ANGLE) * R);
  gate.rotation.y = GATE_ANGLE;
  mount.add(gate);
  const front = GATE_DEPTH - 0.2;
  add(new THREE.BoxGeometry(9, 12, GATE_DEPTH + 2), stone, 0, 6, (GATE_DEPTH - 2) / 2, 0, gate);
  for (const sx of [-1, 1]) {
    add(new THREE.CylinderGeometry(3.1, 3.4, 16, 24), stone, sx * 5.4, 8, 1.8, 0, gate);
    add(new THREE.CylinderGeometry(3.5, 3.1, 1, 24), stone, sx * 5.4, 16.5, 1.8, 0, gate);
    add(new THREE.ConeGeometry(3.7, 7.5, 24), spire, sx * 5.4, 20.75, 1.8, 0, gate);
    windows.push({ x: sx * 5.8, y: 10, z: 1.8 + 3.17, ry: 0, w: 0.35, h: 1.6, kind: 'warm', parent: gate });
    add(new THREE.CylinderGeometry(0.1, 0.1, 4, 6), ironMat, sx * 5.4, 26, 1.8, 0, gate);
    flags.push({ x: sx * 5.4, y: 27.2, z: 1.8, parent: gate, w: 3.4, h: 1.7, flip: sx < 0 });
  }
  // archway: lit passage, stone archivolt, doors swung open, raised portcullis
  const glowMat = new THREE.MeshBasicMaterial({ map: tex.gateGlow, toneMapped: false });
  glowMat.color.setScalar(1.25);
  add(new THREE.ShapeGeometry(archShape(3.6, 3.4), 24), glowMat, 0, 0, front + 0.02, 0, gate);
  const ring = add(new THREE.TorusGeometry(2.15, 0.38, 8, 24, Math.PI), stone, 0, 3.4, front + 0.1, 0, gate);
  ring.scale.z = 0.6;
  for (const sx of [-1, 1]) {
    add(new THREE.BoxGeometry(0.75, 3.4, 0.6), stone, sx * 2.15, 1.7, front + 0.1, 0, gate);
    const door = add(new THREE.BoxGeometry(0.95, 4.4, 0.14), woodMat, sx * 1.35, 2.2, front - 0.4, sx * 1.1, gate);
    for (const y of [0.9, 3.4]) add(new THREE.BoxGeometry(1, 0.12, 0.18), ironMat, door.position.x, y, front - 0.4, sx * 1.1, gate);
  }
  for (let k = -3; k <= 3; k++) {
    add(new THREE.BoxGeometry(0.1, 1.5, 0.1), ironMat, k * 0.42, 4.55, front + 0.06, 0, gate);
    add(new THREE.ConeGeometry(0.07, 0.25, 4), ironMat, k * 0.42, 3.68, front + 0.06, 0, gate).rotation.x = Math.PI;
  }
  add(new THREE.BoxGeometry(3.3, 0.1, 0.1), ironMat, 0, 4.2, front + 0.06, 0, gate);
  // machicolations and crenellated parapet across the top
  for (let k = -4; k <= 4; k++) add(new THREE.BoxGeometry(0.45, 1, 0.8), stone, k * 1.05, 11.3, front + 0.4, 0, gate);
  add(new THREE.BoxGeometry(9.6, 1.4, 1.1), stone, 0, 12.3, front + 0.55, 0, gate);
  for (let k = -4; k <= 4; k += 2) add(new THREE.BoxGeometry(0.85, 1, 1.1), stone, k * 1.05, 13.5, front + 0.55, 0, gate);
  // lantern over the arch
  const lanternMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.4, 0.7), toneMapped: false });
  add(new THREE.BoxGeometry(0.5, 0.75, 0.5), lanternMat, 0, 6.6, front + 0.6, 0, gate);
  add(new THREE.ConeGeometry(0.45, 0.4, 4), ironMat, 0, 7.15, front + 0.6, Math.PI / 4, gate);
  // heraldic banner hanging above the gate
  const tallMat = flagMat.clone();
  tallMat.map = tex.bannerTall;
  tallMat.side = THREE.FrontSide;
  add(new THREE.PlaneGeometry(2.2, 3.6), tallMat, 0, 8.9, front + 0.12, 0, gate);
  lamps.push({ local: new THREE.Vector3(0, 6, front + 2.5), parent: gate, color: 0xffa860, intensity: 120 });
  lamps.push({ local: new THREE.Vector3(0, 2.5, front - 2), parent: gate, color: 0xff9a50, intensity: 60 });

  // ---------------------------------------------------------------- Village
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
  const roofMesh = new THREE.InstancedMesh(prismGeometry(), roof, houses.length);
  const chimneyMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 2, 0.7).translate(0, 1, 0), stone, houses.length);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const col = new THREE.Color();
  const smokeFrom = [];
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
      const ch = range(0.8, 1.4);
      m4.compose(new THREE.Vector3(cx, h.y + h.h + rh * 0.6, cz), q, new THREE.Vector3(1, ch, 1));
      chimneyMesh.setMatrixAt(chimneys++, m4);
      if (smokeFrom.length < 7 && rand() < 0.15) smokeFrom.push(new THREE.Vector3(cx, h.y + h.h + rh * 0.6 + ch * 2, cz));
    }
    if (rand() < 0.32) {
      const lx = range(-0.3, 0.3) * h.w;
      const lz = h.d / 2 + 0.05;
      windows.push({
        x: x + lx * Math.cos(ang) + lz * Math.sin(ang),
        y: h.y + h.h * range(0.35, 0.65),
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

  for (const [a, y] of [[-0.9, 12], [0.1, 18], [0.8, 10], [-0.3, 27], [0.5, 31]]) {
    const r = rockRadiusAt(y) + 3;
    lamps.push({ local: new THREE.Vector3(Math.sin(a) * r, y + 2, Math.cos(a) * r), color: 0xffa860, intensity: 90 });
  }

  // Woods on the north and west flanks
  const treeCount = 150;
  const trees = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 1),
    new THREE.MeshStandardMaterial({ color: 0x121811, roughness: 1, flatShading: true }),
    treeCount,
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < treeCount; i++) {
    const a = rand() < 0.5 ? range(-3.1, -2.05) : range(2.05, 2.9);
    const y = range(3, 30);
    const r = rockRadiusAt(y) + 0.5;
    const s = range(1.8, 3.6);
    dummy.position.set(Math.sin(a) * r, y + s * 0.6, Math.cos(a) * r);
    dummy.rotation.set(rand(), rand() * 6, rand());
    dummy.scale.set(s, s * range(1.1, 1.6), s);
    dummy.updateMatrix();
    trees.setMatrixAt(i, dummy.matrix);
  }
  mount.add(trees);

  // ---------------------------------------------------------------- Abbey
  add(new THREE.BoxGeometry(24, 13, 30), stone, 0, 44, -3); // foundations
  add(new THREE.BoxGeometry(12, 30, 28), stone, -13, 30, -10); // La Merveille (north flank)
  for (let z = -22; z <= 2; z += 4) add(new THREE.BoxGeometry(1.4, 30, 1.6), stone, -19.6, 30, z);
  for (let z = -20; z <= 0; z += 4) windows.push({ x: -19.06, y: 38, z, ry: -Math.PI / 2, w: 0.9, h: 3.2, kind: 'warm' });
  add(new THREE.BoxGeometry(9, 12, 26), stone, 0, 56.5, 3); // nave
  add(prismGeometry(), roof, 0, 62.5, 3, Math.PI / 2).scale.set(26, 4.2, 5.4);
  add(new THREE.BoxGeometry(22, 11, 8), stone, 0, 56, -7); // transept
  add(prismGeometry(), roof, 0, 61.5, -7).scale.set(22, 3.8, 4.8);
  add(new THREE.CylinderGeometry(6, 6, 14, 20, 1, false, Math.PI / 2, Math.PI), stone, 0, 57, -11); // apse
  add(new THREE.ConeGeometry(6.4, 6, 20, 1, false, Math.PI / 2, Math.PI), roof, 0, 67, -11);
  // west facade with gable and rose window
  add(new THREE.BoxGeometry(11, 15, 1.4), stone, 0, 57.5, 16.2);
  add(prismGeometry(), stone, 0, 65, 16.2, Math.PI / 2).scale.set(1.4, 3.2, 6.4);
  const rose = add(
    new THREE.PlaneGeometry(4.6, 4.6),
    new THREE.MeshBasicMaterial({ map: tex.rose, transparent: true, toneMapped: false }),
    0,
    59.5,
    16.95,
  );
  rose.material.color.setScalar(2.4);
  add(new THREE.TorusGeometry(2.4, 0.32, 8, 40), stone, 0, 59.5, 16.98);
  // west portal and lancets
  add(new THREE.ShapeGeometry(archShape(2.2, 1.8, 0.35), 16), new THREE.MeshBasicMaterial({ color: 0x050304 }), 0, 50.5, 16.93);
  const lancetMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.1, 0.5, 0.25), toneMapped: false });
  for (const sx of [-1, 1]) add(new THREE.ShapeGeometry(archShape(0.9, 2.2, 0.45), 12), lancetMat, sx * 3.3, 54, 16.93);
  // buttresses with pinnacles, and flying buttresses over the aisles
  for (let z = -6; z <= 14; z += 4) {
    for (const sx of [-1, 1]) {
      add(new THREE.BoxGeometry(1.4, 12, 1.4), stone, sx * 5.2, 56, z);
      add(new THREE.ConeGeometry(0.7, 3, 4), spire, sx * 5.2, 63.5, z);
      if (z > -6) {
        add(new THREE.BoxGeometry(1.2, 9, 1.2), stone, sx * 9.2, 54.5, z);
        add(new THREE.ConeGeometry(0.6, 2.6, 4), spire, sx * 9.2, 60.3, z);
        add(new THREE.BoxGeometry(4.4, 0.6, 0.7), stone, sx * 7.2, 59.4, z).rotation.z = sx * -0.42;
      }
    }
  }
  for (const [x, z] of [[-11, -10.5], [11, -10.5], [-11, -3.5], [11, -3.5]]) {
    add(new THREE.BoxGeometry(1.6, 13, 1.6), stone, x, 56.5, z);
    add(new THREE.ConeGeometry(0.9, 4, 4), spire, x, 65, z);
  }
  // crossing tower, belfry, spire and the archangel
  add(new THREE.BoxGeometry(8, 10, 8), stone, 0, 67, -7);
  add(new THREE.BoxGeometry(8.8, 0.8, 8.8), stone, 0, 72.2, -7);
  add(new THREE.CylinderGeometry(3.6, 3.8, 10, 8), stone, 0, 77, -7);
  for (let k = 0; k < 8; k++) {
    const t = (k / 8) * Math.PI * 2 + Math.PI / 8;
    add(new THREE.ConeGeometry(0.5, 4, 4), spire, Math.sin(t) * 4, 83.5, -7 + Math.cos(t) * 4);
    windows.push({ x: Math.sin(t) * 3.66, y: 77, z: -7 + Math.cos(t) * 3.66, ry: t, w: 0.8, h: 4, kind: 'dark' });
  }
  add(new THREE.ConeGeometry(3.6, 30, 8), spire, 0, 97, -7);
  // bands of carved stone up the spire
  for (let y = 86; y < 108; y += 5) {
    const r = 3.6 * (1 - (y - 82) / 30) + 0.15;
    add(new THREE.CylinderGeometry(r, r, 0.3, 8), spire, 0, y, -7);
  }
  const angelMat = new THREE.MeshStandardMaterial({ color: 0xd8c08a, metalness: 1, roughness: 0.3, emissive: 0x3a2a10 });
  add(new THREE.CylinderGeometry(0.25, 0.45, 3, 6), angelMat, 0, 113.4, -7);
  add(new THREE.ConeGeometry(0.6, 2.2, 3), angelMat, 0, 114.4, -7.3).rotation.x = 0.6;
  add(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 4), angelMat, 0.5, 115.6, -7);

  // Gothic windows on the church
  for (let z = -4; z <= 12; z += 4) {
    for (const sx of [-1, 1]) windows.push({ x: sx * 4.56, y: 56, z, ry: (sx * Math.PI) / 2, w: 1.1, h: 4.5, kind: 'red' });
  }
  for (const [x, y] of [[-7, 46], [-3, 46], [3, 46], [7, 46], [-5, 41], [5, 41]]) {
    windows.push({ x, y, z: 12.06, ry: 0, w: 0.8, h: 1.6, kind: 'warm' });
  }
  lamps.push({ local: new THREE.Vector3(0, 58, 22), color: CRIMSON, intensity: 70 });

  // ---------------------------------------------------------------- Instanced details
  const merlonMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.8, 0.9, 0.9), stone, merlons.length);
  merlons.forEach(([x, y, z, ry], i) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, ry, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    merlonMesh.setMatrixAt(i, dummy.matrix);
  });
  mount.add(merlonMesh);

  const colors = {
    warm: new THREE.Color(1.1, 0.72, 0.38),
    red: new THREE.Color(1.5, 0.06, 0.14),
    dark: new THREE.Color(0.01, 0.01, 0.012),
  };
  const winMat = new THREE.MeshBasicMaterial({ toneMapped: false });
  const byParent = new Map();
  for (const w of windows) {
    const parent = w.parent ?? mount;
    if (!byParent.has(parent)) byParent.set(parent, []);
    byParent.get(parent).push(w);
  }
  for (const [parent, list] of byParent) {
    const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), winMat, list.length);
    list.forEach((w, i) => {
      dummy.position.set(w.x, w.y, w.z);
      dummy.rotation.set(0, w.ry, 0);
      dummy.scale.set(w.w, w.h, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, colors[w.kind]);
    });
    parent.add(mesh);
  }

  for (const l of lamps) {
    const light = new THREE.PointLight(l.color, l.intensity, 34, 2);
    light.position.copy(l.local);
    (l.parent ?? mount).add(light);
  }

  // Banners: woven cloth rippled per frame
  const flagMeshes = flags.map((f) => {
    const geo = new THREE.PlaneGeometry(f.w, f.h, 16, 4).translate(f.w / 2, 0, 0);
    const m = add(geo, flagMat, f.x, f.y, f.z, f.flip ? Math.PI : 0, f.parent);
    m.userData.base = geo.attributes.position.array.slice();
    m.userData.phase = rand() * 6;
    return m;
  });

  // Chimney smoke: a few soft puffs rising and fading
  const smoke = [];
  const smokeMat = new THREE.SpriteMaterial({ map: tex.smoke, color: 0x6a6e7a, transparent: true, depthWrite: false, opacity: 0 });
  for (const src of smokeFrom) {
    for (let k = 0; k < 6; k++) {
      const sp = new THREE.Sprite(smokeMat.clone());
      sp.userData = { src, t: k / 6, speed: range(0.07, 0.11), drift: range(0.6, 1.4) };
      mount.add(sp);
      smoke.push(sp);
    }
  }

  mount.traverse((o) => {
    if (o.isMesh && !o.material.isMeshBasicMaterial && o.material !== flagMat) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  function update(t, dt) {
    for (const fm of flagMeshes) {
      const pos = fm.geometry.attributes.position;
      const base = fm.userData.base;
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3];
        const y = base[i * 3 + 1];
        pos.setZ(i, Math.sin(x * 1.6 - t * 4.2 + fm.userData.phase) * 0.16 * x + Math.sin(y * 2 + t * 3) * 0.04 * x);
        pos.setY(i, y - x * 0.06);
      }
      pos.needsUpdate = true;
      fm.geometry.computeVertexNormals();
    }
    for (const sp of smoke) {
      const d = sp.userData;
      d.t = (d.t + dt * d.speed) % 1;
      sp.position.set(d.src.x + d.t * 6 * d.drift, d.src.y + d.t * 14, d.src.z + d.t * 2);
      const s = 1.5 + d.t * 7;
      sp.scale.set(s, s, 1);
      sp.material.opacity = Math.sin(d.t * Math.PI) * 0.32;
    }
  }

  return { mount, update };
}
