import * as THREE from 'three';
import { fbm3 } from './noise.js';
import { GATE_ANGLE, RAMPART_R } from './mount.js';

// Height of the bay floor. Water sits at y=0, so anything above it is exposed sand.
export function bayHeight(x, z) {
  const r = Math.hypot(x, z);
  let h = (fbm3(x * 0.0035 + 11, z * 0.0035 - 4, 0.3, 5) - 0.5) * 4.2 - 0.55;
  // A sandbank skirting the island
  h += 2.3 * Math.exp(-((r - 82) ** 2) / 700);
  // Tidal channels
  h -= 1.2 * Math.pow(Math.abs(Math.sin(x * 0.006 + Math.sin(z * 0.004) * 2.2)), 18);
  return h;
}

export function buildBay({ sand, rock, rand, detail }) {
  const range = (a, b) => a + rand() * (b - a);
  const group = new THREE.Group();

  // Tidal flats
  const seg = detail ? 260 : 150;
  const geo = new THREE.PlaneGeometry(2600, 2600, seg, seg);
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
  sand.map.repeat.set(140, 140);
  sand.normalMap.repeat.set(140, 140);
  const flats = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      map: sand.map,
      normalMap: sand.normalMap,
      vertexColors: true,
      color: 0x6a6a6a,
      roughness: 1,
      // Grazing views of the flats otherwise reflect the sky like snow.
      envMapIntensity: 0.15,
      metalness: 0,
    }),
  );
  flats.receiveShadow = true;
  group.add(flats);

  // Boulders around the base of the rock
  const boulderGeo = new THREE.IcosahedronGeometry(1, 2);
  const bp = boulderGeo.attributes.position;
  for (let i = 0; i < bp.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(bp, i);
    v.multiplyScalar(0.75 + fbm3(v.x * 1.8, v.y * 1.8, v.z * 1.8, 3) * 0.55);
    bp.setXYZ(i, v.x, v.y, v.z);
  }
  boulderGeo.computeVertexNormals();
  const count = 180;
  const boulders = new THREE.InstancedMesh(
    boulderGeo,
    new THREE.MeshStandardMaterial({ map: rock.map, normalMap: rock.normalMap, roughness: 0.9 }),
    count,
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2;
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

// The raised causeway from the mainland to the gate, with lamps.
export function buildCauseway({ stone }) {
  const group = new THREE.Group();
  const dir = new THREE.Vector3(Math.sin(GATE_ANGLE), 0, Math.cos(GATE_ANGLE));
  const start = RAMPART_R + 2;
  const end = 1300;
  const len = end - start;
  const mid = dir.clone().multiplyScalar((start + end) / 2);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(7, 2.4, len), stone);
  deck.position.set(mid.x, 0.5, mid.z);
  deck.rotation.y = GATE_ANGLE;
  deck.receiveShadow = true;
  group.add(deck);
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, len), stone);
    wall.position.set(mid.x + Math.cos(GATE_ANGLE) * side * 3.3, 2.1, mid.z - Math.sin(GATE_ANGLE) * side * 3.3);
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
    const d = start + 14 + i * 40;
    const side = i % 2 ? 1 : -1;
    const x = dir.x * d + Math.cos(GATE_ANGLE) * side * 3.3;
    const z = dir.z * d - Math.sin(GATE_ANGLE) * side * 3.3;
    dummy.position.set(x, 1.7, z);
    dummy.updateMatrix();
    posts.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x, 6.9, z);
    dummy.updateMatrix();
    bulbs.setMatrixAt(i, dummy.matrix);
  }
  group.add(posts, bulbs);
  // Real light only from the lamps nearest the island
  for (let i = 0; i < 2; i++) {
    const d = start + 14 + i * 40;
    const l = new THREE.PointLight(0xffa860, 110, 30, 2);
    l.position.set(dir.x * d, 7, dir.z * d);
    group.add(l);
  }
  return group;
}

// Low coastline around the bay with distant village lights.
export function buildCoast({ rand }) {
  const range = (a, b) => a + rand() * (b - a);
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: 1, flatShading: true });
  for (let i = 0; i < 46; i++) {
    const a = (i / 46) * Math.PI * 2 + range(-0.05, 0.05);
    const r = range(1150, 1350);
    const geo = new THREE.ConeGeometry(1, 1, 7, 3);
    const m = new THREE.Mesh(geo, mat);
    const h = range(14, 46);
    m.scale.set(range(110, 200), h, range(60, 110));
    m.position.set(Math.sin(a) * r, h / 2 - 4, Math.cos(a) * r);
    m.rotation.y = a + Math.PI / 2;
    group.add(m);
  }
  const lights = 160;
  const pos = new Float32Array(lights * 3);
  for (let i = 0; i < lights; i++) {
    const a = range(0, Math.PI * 2);
    const r = range(1120, 1180);
    pos[i * 3] = Math.sin(a) * r;
    pos[i * 3 + 1] = range(1, 7);
    pos[i * 3 + 2] = Math.cos(a) * r;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  group.add(
    new THREE.Points(
      g,
      new THREE.PointsMaterial({ color: 0xffb070, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.55, fog: false }),
    ),
  );
  return group;
}
