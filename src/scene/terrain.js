import * as THREE from 'three';
import { fbm3 } from './noise.js';
import { GATE_ANGLE, RAMPART_R, GATE_DEPTH } from './mount.js';

const smooth = (a, b, v) => {
  const t = Math.min(Math.max((v - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

// Height of the bay floor. Water sits at y=0, so anything above it is exposed sand.
// Sand only breaks the surface near the island; further out the floor drops away.
export function bayHeight(x, z) {
  const r = Math.hypot(x, z);
  let h = (fbm3(x * 0.0035 + 11, z * 0.0035 - 4, 0.3, 4) - 0.5) * 4.2 - 0.55;
  h += 2.3 * Math.exp(-((r - 82) ** 2) / 700);
  h -= 1.2 * Math.pow(Math.abs(Math.sin(x * 0.006 + Math.sin(z * 0.004) * 2.2)), 18);
  h -= smooth(150, 360, r) * 3.2;
  return h;
}

export function buildBay({ sand, rock, rand, detail }) {
  const range = (a, b) => a + rand() * (b - a);
  const group = new THREE.Group();

  // Tidal flats around the island (the far floor is hidden under the water anyway)
  const seg = detail ? 220 : 130;
  const geo = new THREE.PlaneGeometry(900, 900, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  const colors = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const h = bayHeight(x, z);
    p.setY(i, h);
    // Wet sand near the waterline is darker
    const wet = 1 - Math.min(Math.max(h / 1.4, 0), 1);
    const g = 0.95 - wet * 0.45;
    colors[i * 3] = g;
    colors[i * 3 + 1] = g * 0.98;
    colors[i * 3 + 2] = g * 0.93;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const flats = new THREE.Mesh(geo, sand);
  flats.receiveShadow = true;
  group.add(flats);

  // Boulders around the base of the rock
  const boulderGeo = new THREE.IcosahedronGeometry(1, 2);
  const bp = boulderGeo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < bp.count; i++) {
    v.fromBufferAttribute(bp, i);
    v.multiplyScalar(0.75 + fbm3(v.x * 1.8, v.y * 1.8, v.z * 1.8, 3) * 0.55);
    bp.setXYZ(i, v.x, v.y, v.z);
  }
  boulderGeo.computeVertexNormals();
  const count = 200;
  const boulders = new THREE.InstancedMesh(boulderGeo, rock, count);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    let a = rand() * Math.PI * 2;
    // Keep the gate approach clear
    if (Math.abs(a - GATE_ANGLE) < 0.12) a += 0.3;
    const r = range(61, 80) + (rand() < 0.2 ? range(5, 25) : 0);
    const x = Math.sin(a) * r;
    const z = Math.cos(a) * r;
    const s = range(0.8, 4.2);
    dummy.position.set(x, Math.max(bayHeight(x, z), -1.2) - s * 0.25, z);
    dummy.rotation.set(rand() * 6, rand() * 6, rand() * 6);
    dummy.scale.set(s * range(0.9, 1.5), s * range(0.5, 0.9), s * range(0.9, 1.4));
    dummy.updateMatrix();
    boulders.setMatrixAt(i, dummy.matrix);
  }
  boulders.castShadow = true;
  boulders.receiveShadow = true;
  group.add(boulders);
  return group;
}

// The raised causeway from the mainland, ending at the gatehouse doors.
export function buildCauseway({ stone }) {
  const group = new THREE.Group();
  const dir = new THREE.Vector3(Math.sin(GATE_ANGLE), 0, Math.cos(GATE_ANGLE));
  const side = new THREE.Vector3(Math.cos(GATE_ANGLE), 0, -Math.sin(GATE_ANGLE));
  const start = RAMPART_R + GATE_DEPTH;
  const end = 1180;
  const len = end - start;
  const mid = dir.clone().multiplyScalar((start + end) / 2);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(7, 2.4, len), stone);
  deck.position.set(mid.x, 0.5, mid.z);
  deck.rotation.y = GATE_ANGLE;
  deck.receiveShadow = true;
  group.add(deck);
  for (const s of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, len), stone);
    wall.position.copy(mid).addScaledVector(side, s * 3.3);
    wall.position.y = 2.1;
    wall.rotation.y = GATE_ANGLE;
    group.add(wall);
  }

  // Lamp posts with a warm glow
  const n = 26;
  const postMat = new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.5, metalness: 0.6 });
  const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.16, 5, 6).translate(0, 2.5, 0), postMat, n);
  const bulbs = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.35, 10, 8),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.45, 0.75), toneMapped: false }),
    n,
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    const d = start + 18 + i * 40;
    const s = i % 2 ? 1 : -1;
    dummy.position.copy(dir).multiplyScalar(d).addScaledVector(side, s * 3.3);
    dummy.position.y = 1.7;
    dummy.updateMatrix();
    posts.setMatrixAt(i, dummy.matrix);
    dummy.position.y = 6.9;
    dummy.updateMatrix();
    bulbs.setMatrixAt(i, dummy.matrix);
  }
  group.add(posts, bulbs);
  // Real light only from the lamps nearest the island
  for (let i = 0; i < 2; i++) {
    const l = new THREE.PointLight(0xffa860, 110, 30, 2);
    l.position.copy(dir).multiplyScalar(start + 18 + i * 40);
    l.position.y = 7;
    group.add(l);
  }
  return group;
}

// The far shore: rolling hills, tree lines and clustered village lights all around the bay.
export function buildHorizon({ rand, mobile }) {
  const range = (a, b) => a + rand() * (b - a);
  const group = new THREE.Group();
  const R0 = 950;
  const R1 = 1650;
  const segA = mobile ? 180 : 320;
  const segR = 14;
  const hill = (a, r) => {
    const x = Math.cos(a) * 3;
    const y = Math.sin(a) * 3;
    const ridge = fbm3(x * 2.2, y * 2.2, r * 0.002, 5, 0, 13);
    const rise = smooth(R0, R0 + 160, r);
    return (ridge * ridge * 95 + 4) * rise - 6 + smooth(R1 - 300, R1, r) * 40;
  };
  const pos = [];
  const idx = [];
  for (let j = 0; j <= segR; j++) {
    const r = R0 + ((R1 - R0) * j) / segR;
    for (let i = 0; i <= segA; i++) {
      const a = (i / segA) * Math.PI * 2;
      pos.push(Math.sin(a) * r, hill(a, r), Math.cos(a) * r);
    }
  }
  for (let j = 0; j < segR; j++) {
    for (let i = 0; i < segA; i++) {
      const p0 = j * (segA + 1) + i;
      const p1 = p0 + segA + 1;
      idx.push(p0, p1, p0 + 1, p0 + 1, p1, p1 + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  group.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x14151a, roughness: 1, side: THREE.DoubleSide })));

  // Tree lines along the shore and up the slopes
  const trees = mobile ? 1400 : 3200;
  const forest = new THREE.InstancedMesh(
    new THREE.ConeGeometry(1, 1, 6).translate(0, 0.5, 0),
    new THREE.MeshStandardMaterial({ color: 0x0b0d0e, roughness: 1 }),
    trees,
  );
  const dummy = new THREE.Object3D();
  let placed = 0;
  for (let tries = 0; placed < trees && tries < trees * 4; tries++) {
    const a = rand() * Math.PI * 2;
    const r = R0 + 40 + Math.pow(rand(), 1.6) * 360;
    const h = hill(a, r);
    if (h < 1) continue;
    const s = range(9, 18);
    dummy.position.set(Math.sin(a) * r, h - 1, Math.cos(a) * r);
    dummy.scale.set(s * 0.38, s, s * 0.38);
    dummy.updateMatrix();
    forest.setMatrixAt(placed++, dummy.matrix);
  }
  forest.count = placed;
  group.add(forest);

  // Villages: little clusters of warm light near the shoreline
  const lights = [];
  for (let c = 0; c < 26; c++) {
    const a = rand() * Math.PI * 2;
    const r = R0 + range(30, 140);
    const n = Math.floor(range(6, 22));
    for (let k = 0; k < n; k++) {
      const aa = a + range(-0.012, 0.012);
      const rr = r + range(-18, 18);
      lights.push(Math.sin(aa) * rr, Math.max(hill(aa, rr), 0) + range(1, 5), Math.cos(aa) * rr);
    }
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(lights, 3));
  group.add(
    new THREE.Points(
      lg,
      new THREE.PointsMaterial({ color: 0xffb070, size: 2, sizeAttenuation: false, transparent: true, opacity: 0.7, fog: false }),
    ),
  );
  return group;
}
