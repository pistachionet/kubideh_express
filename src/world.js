import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MeshBVH } from 'three-mesh-bvh';
import {
  PLANET_RADIUS,
  surfacePoint,
  frameAt,
  surfaceFrame,
  tangentToward,
  mulberry32,
} from './math.js';
import { Bag, M, framed, box, cyl, cone, ball, ico, disc } from './parts.js';
import { ROSTER } from './roster.js';
import { addPerson, addSheep, addDog } from './characters.js';

export const ROAD_HALF = 2.3;
export const DEST_OFFSET = 5.0;
export const HOME_OFFSET = 5.6;
const R = PLANET_RADIUS;

// A band that follows the ring road on the sphere between two lateral
// arc offsets, slightly above the surface.
function ringStrip(latA, latB, rOff, segs = 240) {
  const pos = [];
  const nor = [];
  const uv = [];
  for (let i = 0; i < segs; i++) {
    const u0 = i / segs;
    const u1 = (i + 1) / segs;
    const corners = [
      surfacePoint(u0, latA, R + rOff),
      surfacePoint(u1, latA, R + rOff),
      surfacePoint(u1, latB, R + rOff),
      surfacePoint(u0, latB, R + rOff),
    ];
    const order = [0, 1, 2, 0, 2, 3];
    for (const k of order) {
      const p = corners[k];
      pos.push(p.x, p.y, p.z);
      const n = p.clone().normalize();
      nor.push(n.x, n.y, n.z);
      uv.push(0, 0);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

function polarCap(north) {
  const g = new THREE.SphereGeometry(R + 0.06, 48, 10, 0, Math.PI * 2, 0, 0.55);
  if (!north) g.rotateX(Math.PI);
  return g;
}

// Structure builders keyed by customer id. Each gets a framed put with
// origin at the anchor, +Y up, +Z facing the road. Overhead pieces are
// solid: false so they never collide.

const STRUCTURES = {
  reza(bag, frame) {
    const p = framed(bag, frame);
    p(box(1.7, 2.5, 1.7), 'signBlue', M(0, 1.25, 0));
    p(box(1.3, 0.8, 0.06), 'paper', M(0, 1.7, 0.86), { solid: false });
    p(box(2.1, 0.14, 2.1), 'ink', M(0, 2.62, 0), { solid: false });
    // The barrier arm reaches over the shoulder of the road, raised, and
    // never collides.
    p(cyl(0.09, 0.09, 1.4, 8), 'ink', M(1.1, 0.7, 0.9));
    p(box(4.6, 0.16, 0.16), 'pom', M(2.6, 2.05, 0.9, 0, 0, 0.62), { solid: false });
    p(box(0.7, 0.18, 0.18), 'paper', M(3.6, 2.8, 0.9, 0, 0, 0.62), { solid: false });
  },

  trucker(bag, frame) {
    const p = framed(bag, frame);
    const yaw = 0.35;
    p(box(2.0, 2.1, 2.0), 'pom', M(-2.6, 1.25, 0.2, 0, yaw, 0));
    p(box(1.7, 0.9, 0.1), 'signBlue', M(-2.6, 1.6, 1.2, 0, yaw, 0), { solid: false });
    p(box(2.3, 2.5, 5.6), 'cream', M(1.2, 1.55, -0.9, 0, yaw, 0));
    for (const z of [-2.8, -0.9, 1.0]) {
      p(cyl(0.5, 0.5, 0.3, 10), 'ink', M(1.2 + Math.sin(yaw) * z, 0.5, -0.9 + Math.cos(yaw) * z, 0, yaw, Math.PI / 2), { solid: false });
    }
    p(cyl(0.1, 0.1, 1.0, 8), 'slate', M(-3.4, 2.7, -0.4), { solid: false });
  },

  wedding(bag, frame) {
    const p = framed(bag, frame);
    // The arch: posts solid, the beam and drape cross overhead and never
    // collide.
    p(cyl(0.14, 0.16, 3.0, 8), 'cream', M(-1.6, 1.5, 0.6));
    p(cyl(0.14, 0.16, 3.0, 8), 'cream', M(1.6, 1.5, 0.6));
    p(box(3.9, 0.2, 0.2), 'cream', M(0, 3.05, 0.6), { solid: false });
    p(box(3.5, 0.5, 0.08), 'plum', M(0, 2.72, 0.62), { solid: false });
    for (const x of [-1.6, -0.55, 0.55, 1.6]) {
      p(ball(0.2, 7, 5), 'pom', M(x, 3.15, 0.6), { solid: false, flat: true });
    }
    // Cake table.
    p(cyl(0.85, 0.9, 0.85, 12), 'paper', M(-2.9, 0.45, -1.2));
    p(cyl(0.55, 0.55, 0.3, 12), 'snow', M(-2.9, 1.0, -1.2), { solid: false });
    p(cyl(0.38, 0.38, 0.26, 12), 'snow', M(-2.9, 1.28, -1.2), { solid: false });
    p(cyl(0.22, 0.22, 0.22, 12), 'snow', M(-2.9, 1.52, -1.2), { solid: false });
    p(ball(0.09, 7, 5), 'pom', M(-2.9, 1.7, -1.2), { solid: false });
    // A long guest table.
    p(box(3.4, 0.16, 1.0), 'paper', M(2.6, 0.8, -1.6));
    p(box(0.16, 0.8, 0.9), 'terra', M(1.2, 0.4, -1.6));
    p(box(0.16, 0.8, 0.9), 'terra', M(4.0, 0.4, -1.6));
  },

  student(bag, frame) {
    const p = framed(bag, frame);
    p(cyl(0.1, 0.1, 2.5, 8), 'slate', M(-1.3, 1.25, -0.3));
    p(cyl(0.1, 0.1, 2.5, 8), 'slate', M(1.3, 1.25, -0.3));
    p(box(3.4, 0.14, 1.9), 'terra', M(0, 2.55, 0.15), { solid: false });
    p(box(2.6, 0.14, 0.7), 'terra', M(0, 0.62, -0.35));
    p(box(0.14, 0.6, 0.6), 'terra', M(-1.1, 0.31, -0.35));
    p(box(0.14, 0.6, 0.6), 'terra', M(1.1, 0.31, -0.35));
    p(cyl(0.07, 0.07, 2.6, 8), 'ink', M(2.1, 1.3, 0.7));
    p(box(0.7, 0.7, 0.08), 'signBlue', M(2.1, 2.5, 0.7), { solid: false });
  },

  mechanic(bag, frame) {
    const p = framed(bag, frame);
    for (const x of [-2.2, 2.2]) {
      for (const z of [-1.2, 1.2]) {
        p(cyl(0.12, 0.14, 3.2, 8), 'cream', M(x, 1.6, z));
      }
    }
    p(box(5.6, 0.35, 3.4), 'pom', M(0, 3.35, 0), { solid: false });
    p(box(5.7, 0.2, 3.5), 'cream', M(0, 3.6, 0), { solid: false });
    p(box(0.9, 1.5, 0.7), 'saffron', M(-0.7, 0.75, 0));
    p(box(0.5, 0.3, 0.1), 'ink', M(-0.7, 1.25, 0.36), { solid: false });
    p(cyl(0.42, 0.42, 1.0, 10), 'slate', M(1.1, 0.5, -0.6));
    p(cyl(0.42, 0.42, 1.0, 10), 'turq', M(2.0, 0.5, -0.9));
    p(box(1.4, 0.9, 0.9), 'ink', M(0.6, 0.45, 1.1));
  },

  shepherd(bag, frame) {
    const p = framed(bag, frame);
    // The hill he stands on. Solid, gentle, climbable in spirit.
    p(ball(3.2, 12, 8), 'green', M(0, -0.4, 0, 0, 0, 0, 1, 0.75, 1), { flat: true });
  },

  elders(bag, frame) {
    const p = framed(bag, frame);
    p(box(5.0, 0.55, 3.8), 'terra', M(0, 0.28, -0.2));
    p(box(3.9, 0.08, 2.7), 'pom', M(0, 0.6, -0.2), { solid: false });
    p(box(1.5, 0.4, 1.0), 'ink', M(0, 0.85, -0.2), { solid: false });
    p(box(1.1, 0.06, 0.7), 'paper', M(0, 1.08, -0.2), { solid: false });
    p(box(0.5, 0.02, 0.7), 'ink', M(0, 1.12, -0.2), { solid: false });
    // Samovar.
    p(cyl(0.3, 0.36, 0.7, 10), 'turq', M(1.9, 1.0, -1.1), { solid: false });
    p(ball(0.16, 8, 6), 'turq', M(1.9, 1.45, -1.1), { solid: false });
    p(box(1.2, 0.3, 1.2), 'plum', M(-1.4, 0.75, 0.6), { solid: false });
    p(box(1.2, 0.3, 1.2), 'turq', M(1.4, 0.75, 0.6), { solid: false });
    // Four posts and a shade roof, open at the sides, overhead so it
    // never collides.
    for (const x of [-2.3, 2.3]) {
      for (const z of [-1.8, 1.4]) {
        p(cyl(0.1, 0.12, 3.0, 8), 'terra', M(x, 1.5, z));
      }
    }
    p(box(5.4, 0.16, 4.2), 'dryGrass', M(0, 3.05, -0.2), { solid: false });
  },

  film(bag, frame) {
    const p = framed(bag, frame);
    // Camera on a tripod.
    for (const a of [0, 2.1, 4.2]) {
      p(cyl(0.05, 0.06, 1.6, 6), 'ink', M(Math.sin(a) * 0.4, 0.7, Math.cos(a) * 0.4, 0.3 * Math.cos(a), 0, -0.3 * Math.sin(a)));
    }
    p(box(0.7, 0.5, 0.9), 'slate', M(0, 1.6, 0), { solid: false });
    p(cyl(0.16, 0.16, 0.4, 10), 'ink', M(0, 1.6, 0.6, Math.PI / 2, 0, 0), { solid: false });
    // A light on a stand.
    p(cyl(0.05, 0.07, 2.4, 6), 'ink', M(-1.7, 1.2, -0.6));
    p(box(0.6, 0.6, 0.3), 'saffron', M(-1.7, 2.5, -0.5, 0.4, 0, 0), { solid: false });
    // Director's chair and a crate.
    p(box(0.7, 1.1, 0.7), 'plum', M(1.6, 0.55, -0.8));
    p(box(0.9, 0.6, 0.9), 'terra', M(2.6, 0.3, 0.2));
  },

  neema(bag, frame) {
    // No structure. Just him by the road.
  },
};

function addShamshiry(bag, frame) {
  const p = framed(bag, frame);
  // Cream plastered building with a low terra pyramid roof.
  p(box(7.0, 3.4, 5.0), 'cream', M(0, 1.7, -0.6));
  p(cone(5.6, 2.2, 4), 'terra', M(0, 4.5, -0.6, 0, Math.PI / 4, 0), { solid: false, flat: true });
  // The blank red sign board. No readable brand marks anywhere.
  p(box(4.2, 1.1, 0.24), 'pom', M(0, 3.1, 2.05), { solid: false });
  p(box(1.2, 2.2, 0.15), 'ink', M(0, 1.1, 1.93), { solid: false });
  p(box(1.5, 1.1, 0.12), 'signBlue', M(-2.2, 1.9, 1.93), { solid: false });
  p(box(1.5, 1.1, 0.12), 'signBlue', M(2.2, 1.9, 1.93), { solid: false });
  // The charcoal grill out front, steam rising from the coals.
  p(box(1.7, 0.9, 0.8), 'ink', M(3.2, 0.45, 2.4));
  p(box(1.6, 0.08, 0.7), 'saffron', M(3.2, 0.94, 2.4), { solid: false });
  bag.marker('steam', p.point(3.0, 1.1, 2.4));
  bag.marker('steam', p.point(3.3, 1.1, 2.3));
  bag.marker('steam', p.point(3.5, 1.1, 2.5));
}

const CAST_LOOKS = {
  reza: { hat: 'cap', hatColor: 'signBlue', mustache: true, shirt: 'signBlue' },
  trucker: { hat: 'cap', hatColor: 'ink', beard: true, shirt: 'slate' },
  wedding: { hat: 'bun', shirt: 'plum', trouser: 'plum', prop: 'megaphone', propColor: 'saffron' },
  student: { hat: 'short', shirt: 'turq', prop: 'backpack', propColor: 'terra' },
  mechanic: { hat: 'beret', hatColor: 'ink', beard: true, shirt: 'terra' },
  shepherd: { hat: 'scarf', hatColor: 'dryGrass', beard: true, shirt: 'greenDeep', prop: 'staff' },
  elders: { hat: 'bald', beard: true, shirt: 'pom', seated: true },
  film: { hat: 'beret', hatColor: 'plum', glasses: true, shirt: 'plum', prop: 'megaphone', propColor: 'ink' },
  neema: { hat: 'short', glasses: true, shirt: 'placket' },
};

function scatterAllowed(u, lateral, keepOut) {
  const p = surfacePoint(u, lateral);
  for (const k of keepOut) {
    if (p.distanceTo(k.pos) < k.r) return false;
  }
  return true;
}

// Builds the entire static world. materialFor(colorName) supplies the cel
// material for each merged color mesh. Returns the merged group, the
// collision BVH, destination anchors, steam markers, and merge stats.
export function buildWorld({ materialFor, buildBVH = true, seed = 20260727 } = {}) {
  const rng = mulberry32(seed);
  const bag = new Bag();

  // The planet itself, the seas, the road, and its edge bands ride on the
  // analytic sphere and stay out of the collision set.
  bag.add(new THREE.IcosahedronGeometry(R, 5), 'green', null, { solid: false });
  bag.add(polarCap(true), 'sea', null, { solid: false });
  bag.add(polarCap(false), 'sea', null, { solid: false });
  bag.add(ringStrip(-ROAD_HALF, ROAD_HALF, 0.05), 'road', null, { solid: false });
  bag.add(ringStrip(-ROAD_HALF - 0.55, -ROAD_HALF, 0.04), 'paperDeep', null, { solid: false });
  bag.add(ringStrip(ROAD_HALF, ROAD_HALF + 0.55, 0.04), 'paperDeep', null, { solid: false });

  const keepOut = [];
  const destinations = new Map();
  const homeAnchor = surfacePoint(0, HOME_OFFSET);
  keepOut.push({ pos: homeAnchor, r: 9 });

  for (const c of ROSTER) {
    const anchor = surfacePoint(c.u, c.side * DEST_OFFSET);
    destinations.set(c.id, { anchor, u: c.u, side: c.side, color: c.color, customer: c });
    keepOut.push({ pos: anchor, r: 8 });
  }

  // Home base.
  {
    const pos = homeAnchor;
    const facing = tangentToward(pos, surfacePoint(0, 0));
    const frame = surfaceFrame(pos, facing);
    addShamshiry(bag, frame);
    // A landing pad in front of the shop.
    bag.add(disc(3.0, 26), 'paperDeep', padFrame(0, HOME_OFFSET - 2.2), { solid: false });
  }

  // Landmark structures, pads, and the cast.
  for (const c of ROSTER) {
    const d = destinations.get(c.id);
    const facing = tangentToward(d.anchor, surfacePoint(c.u, 0));
    const frame = surfaceFrame(d.anchor, facing);
    STRUCTURES[c.id](bag, frame);
    bag.add(disc(2.6, 24), 'paperDeep', padFrame(c.u, c.side * (DEST_OFFSET - 1.6)), { solid: false });

    const look = CAST_LOOKS[c.id];
    if (c.id === 'shepherd') {
      const top = surfaceFrame(
        surfacePoint(c.u, c.side * DEST_OFFSET).normalize().multiplyScalar(R + 1.95),
        facing
      );
      addPerson(bag, top, look);
      addDog(bag, top.clone().multiply(M(1.1, 0, 0.4, 0, 0.5, 0)));
      for (const [sx, sz] of [[-3.6, 1.4], [3.8, 0.6], [-2.9, -2.6], [4.1, -2.2]]) {
        addSheep(bag, frame.clone().multiply(M(sx, 0, sz, 0, rng() * 6.28, 0)));
      }
    } else if (c.id === 'elders') {
      addPerson(bag, frame.clone().multiply(M(-1.4, 0.9, 0.6, 0, 0.5, 0)), look);
      addPerson(bag, frame.clone().multiply(M(1.4, 0.9, 0.6, 0, -0.5, 0)), { ...look, hat: 'scarf', shirt: 'turq' });
    } else {
      const off = c.id === 'reza' ? M(-1.6, 0, 1.2, 0, 0.2, 0) : M(0.9, 0, 1.6, 0, -0.15, 0);
      addPerson(bag, frame.clone().multiply(off), look);
    }
  }

  // The Alborz range: faceted peaks with snow caps, set back from one
  // side of the road.
  const peakUs = [0.04, 0.13, 0.24, 0.33, 0.46, 0.55, 0.66, 0.77, 0.86, 0.95];
  for (const pu of peakUs) {
    const lat = 15 + rng() * 8;
    const h = 9 + rng() * 6;
    const r = 4.5 + rng() * 3.5;
    const frame = frameAt(pu, lat, rng() * 6.28);
    bag.add(cone(r, h, 5), 'slate', frame.clone().multiply(M(0, h * 0.42, 0)), { flat: true });
    bag.add(cone(r * 0.42, h * 0.34, 5), 'snow', frame.clone().multiply(M(0, h * 0.78, 0)), { flat: true, solid: false });
  }

  // Dressing: cypress trees, bushes, rounded hills, rice paddies, rocks.
  let placed = 0;
  let guard = 0;
  while (placed < 92 && guard++ < 3000) {
    const u = rng();
    const side = rng() < 0.5 ? -1 : 1;
    const lat = side * (3.6 + rng() * 9.5);
    if (!scatterAllowed(u, lat, keepOut)) continue;
    const s = 0.8 + rng() * 0.7;
    const frame = frameAt(u, lat, rng() * 6.28);
    bag.add(cyl(0.09, 0.13, 0.6 * s, 6), 'terra', frame.clone().multiply(M(0, 0.3 * s, 0)));
    bag.add(
      ball(0.55, 6, 8),
      rng() < 0.5 ? 'green' : 'greenDeep',
      frame.clone().multiply(M(0, (0.6 + 1.15) * s, 0, 0, 0, 0, s, 2.4 * s, s)),
      { flat: true }
    );
    placed++;
  }

  placed = 0;
  guard = 0;
  while (placed < 60 && guard++ < 2000) {
    const u = rng();
    const lat = (rng() < 0.5 ? -1 : 1) * (3.4 + rng() * 12);
    if (!scatterAllowed(u, lat, keepOut)) continue;
    const s = 0.6 + rng() * 0.9;
    bag.add(
      ico(0.7, 0),
      rng() < 0.5 ? 'green' : 'greenDeep',
      frameAt(u, lat, rng() * 6.28).clone().multiply(M(0, 0.35 * s, 0, 0, 0, 0, s, 0.7 * s, s)),
      { flat: true }
    );
    placed++;
  }

  placed = 0;
  guard = 0;
  while (placed < 40 && guard++ < 2000) {
    const u = rng();
    const lat = (rng() < 0.5 ? -1 : 1) * (3.2 + rng() * 13);
    if (!scatterAllowed(u, lat, keepOut)) continue;
    const s = 0.45 + rng() * 0.75;
    bag.add(ico(0.6 * s, 0), 'slate', frameAt(u, lat, rng() * 6.28).clone().multiply(M(0, 0.3 * s, 0, rng(), rng(), rng())), { flat: true });
    placed++;
  }

  placed = 0;
  guard = 0;
  while (placed < 9 && guard++ < 1500) {
    const u = rng();
    const lat = (rng() < 0.5 ? -1 : 1) * (8 + rng() * 7);
    if (!scatterAllowed(u, lat, keepOut)) continue;
    const s = 2.4 + rng() * 2.2;
    bag.add(ball(s, 11, 8), 'green', frameAt(u, lat).clone().multiply(M(0, -s * 0.55, 0)), { flat: true });
    placed++;
  }

  placed = 0;
  guard = 0;
  while (placed < 10 && guard++ < 1500) {
    const u = rng();
    const lat = (rng() < 0.5 ? -1 : 1) * (6 + rng() * 6);
    if (!scatterAllowed(u, lat, keepOut)) continue;
    bag.add(disc(2.2 + rng() * 1.8, 18), 'paddy', padFrame(u, lat, 0.035), { solid: false });
    placed++;
  }

  // Merge everything by color into one draw call each.
  const group = new THREE.Group();
  const meshes = [];
  for (const [colorName, geos] of bag.byColor) {
    const merged = mergeGeometries(geos);
    const mesh = new THREE.Mesh(merged, materialFor(colorName));
    mesh.matrixAutoUpdate = false;
    group.add(mesh);
    meshes.push(mesh);
  }

  // Bake every solid triangle into one static BVH for collision.
  const collisionGeometry = mergeGeometries(bag.solid.map((g) => g.clone()));
  const bvh = buildBVH ? new MeshBVH(collisionGeometry) : null;
  if (bvh) collisionGeometry.boundsTree = bvh;

  return {
    group,
    meshes,
    collisionGeometry,
    bvh,
    destinations,
    homeAnchor,
    steamSpots: bag.markers.filter((m) => m.type === 'steam').map((m) => m.pos),
    stats: {
      sourceCount: bag.sourceCount,
      mergedCount: meshes.length,
      collisionTriangles: collisionGeometry.attributes.position.count / 3,
    },
  };
}

// A flat disc lying on the sphere at the given road coordinates.
function padFrame(u, lateral, rOff = 0.05) {
  const pos = surfacePoint(u, lateral, R + rOff);
  const frame = surfaceFrame(pos, roadForwardAt(u));
  return frame.multiply(M(0, 0, 0, -Math.PI / 2, 0, 0));
}

function roadForwardAt(u) {
  const theta = u * Math.PI * 2;
  return new THREE.Vector3(-Math.sin(theta), 0, Math.cos(theta));
}

// Resolves a moving sphere against the world BVH with slide response.
// Mutates center in place and returns the accumulated push direction so
// the caller can project velocity off the contact.
const _tmpPoint = new THREE.Vector3();
const _tmpDir = new THREE.Vector3();
export function collideSphere(bvh, center, radius) {
  const sphere = new THREE.Sphere(center, radius);
  const push = new THREE.Vector3();
  let hit = false;
  for (let iter = 0; iter < 3; iter++) {
    let moved = false;
    bvh.shapecast({
      intersectsBounds: (boxBounds) => boxBounds.intersectsSphere(sphere),
      intersectsTriangle: (tri) => {
        tri.closestPointToPoint(center, _tmpPoint);
        const d2 = _tmpPoint.distanceToSquared(center);
        if (d2 < radius * radius) {
          const d = Math.sqrt(d2);
          if (d > 1e-6) {
            _tmpDir.copy(center).sub(_tmpPoint).divideScalar(d);
          } else {
            tri.getNormal(_tmpDir);
          }
          center.addScaledVector(_tmpDir, radius - d);
          push.add(_tmpDir);
          hit = true;
          moved = true;
        }
        return false;
      },
    });
    if (!moved) break;
  }
  if (push.lengthSq() > 0) push.normalize();
  return { hit, push };
}
