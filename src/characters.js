import * as THREE from 'three';
import { Bag, M, framed, box, cyl, cone, ball, torus } from './parts.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// One parametric person builder for the whole cast. Boxes, cylinders,
// spheres, flat palette colors, roughly 2.0 units tall, silhouette first.
// Local space: feet at origin, facing +Z.

export function addPerson(bag, frame, opts = {}) {
  const p = framed(bag, frame);
  const skin = opts.skin || 'skin';
  const shirt = opts.shirt || 'shirt';
  const trouser = opts.trouser || 'trouser';
  const solid = { solid: false };

  if (opts.seated) {
    // Sitting on the ground or a cushion, legs forward.
    p(box(0.2, 0.2, 0.62), trouser, M(-0.15, 0.14, 0.28), solid);
    p(box(0.2, 0.2, 0.62), trouser, M(0.15, 0.14, 0.28), solid);
    p(box(0.56, 0.62, 0.34), shirt, M(0, 0.56, 0), solid);
    p(box(0.15, 0.5, 0.15), shirt, M(-0.34, 0.6, 0.08, 0.5, 0, 0.25), solid);
    p(box(0.15, 0.5, 0.15), shirt, M(0.34, 0.6, 0.08, 0.5, 0, -0.25), solid);
    buildHead(p, 1.12, opts, skin);
  } else {
    p(box(0.22, 0.82, 0.24), trouser, M(-0.14, 0.41, 0), solid);
    p(box(0.22, 0.82, 0.24), trouser, M(0.14, 0.41, 0), solid);
    p(box(0.24, 0.1, 0.34), 'ink', M(-0.14, 0.05, 0.05), solid);
    p(box(0.24, 0.1, 0.34), 'ink', M(0.14, 0.05, 0.05), solid);
    p(box(0.58, 0.66, 0.34), shirt, M(0, 1.14, 0), solid);
    if (opts.placket) {
      p(box(0.12, 0.62, 0.05), opts.placket, M(0, 1.14, 0.17), solid);
    }
    const armDrop = opts.armsForward ? 0.8 : 0;
    p(box(0.16, 0.6, 0.16), shirt, M(-0.37, 1.16, 0.06 + armDrop * 0.1, armDrop ? -1 : 0.12, 0, 0.12), solid);
    p(box(0.16, 0.6, 0.16), shirt, M(0.37, 1.16, 0.06 + armDrop * 0.1, armDrop ? -1 : 0.12, 0, -0.12), solid);
    p(box(0.13, 0.16, 0.13), skin, M(-0.4, 0.82, 0.06), solid);
    p(box(0.13, 0.16, 0.13), skin, M(0.4, 0.82, 0.06), solid);
    buildHead(p, 1.72, opts, skin);
  }

  addProps(p, opts);
}

function buildHead(p, y, opts, skin) {
  const solid = { solid: false };
  p(ball(0.27, 9, 7), skin, M(0, y, 0), solid);

  const hat = opts.hat || 'short';
  if (hat === 'cap') {
    p(ball(0.28, 9, 5, 0), opts.hatColor || 'ink', M(0, y + 0.06, -0.01, 0, 0, 0, 1, 0.7, 1), solid);
    p(box(0.34, 0.05, 0.24), opts.hatColor || 'ink', M(0, y + 0.13, 0.28), solid);
  } else if (hat === 'bun') {
    p(ball(0.28, 9, 6), 'hair', M(0, y + 0.07, -0.03, 0, 0, 0, 1, 0.62, 1), solid);
    p(ball(0.12, 7, 5), 'hair', M(0, y + 0.24, -0.2), solid);
  } else if (hat === 'scarf') {
    p(ball(0.32, 9, 7), opts.hatColor || 'cream', M(0, y + 0.03, -0.06, 0, 0, 0, 1, 0.95, 1), solid);
    p(box(0.3, 0.22, 0.12), opts.hatColor || 'cream', M(0, y - 0.28, -0.12), solid);
  } else if (hat === 'bald') {
    p(torus(0.22, 0.07, 6, 12), 'hair', M(0, y - 0.02, -0.02, 1.35, 0, 0), solid);
  } else if (hat === 'beret') {
    p(cyl(0.26, 0.28, 0.08, 10), opts.hatColor || 'pom', M(0.04, y + 0.22, 0, 0, 0, -0.18), solid);
  } else {
    p(ball(0.285, 9, 5, 0), 'hair', M(0, y + 0.045, -0.02, 0, 0, 0, 1, 0.6, 1), solid);
  }

  if (opts.beard) {
    p(box(0.3, 0.2, 0.1), 'hair', M(0, y - 0.16, 0.2), solid);
  }
  if (opts.mustache) {
    p(box(0.2, 0.05, 0.06), 'hair', M(0, y - 0.06, 0.26), solid);
  }
  if (opts.goatee) {
    p(box(0.12, 0.12, 0.07), 'hair', M(0, y - 0.2, 0.22), solid);
  }
  if (opts.glasses) {
    p(torus(0.085, 0.02, 6, 12), 'ink', M(-0.11, y + 0.02, 0.26), solid);
    p(torus(0.085, 0.02, 6, 12), 'ink', M(0.11, y + 0.02, 0.26), solid);
    p(box(0.06, 0.02, 0.02), 'ink', M(0, y + 0.02, 0.27), solid);
  }
}

function addProps(p, opts) {
  const solid = { solid: false };
  const prop = opts.prop;
  if (prop === 'backpack') {
    p(box(0.44, 0.52, 0.2), opts.propColor || 'terra', M(0, 1.14, -0.29), solid);
  } else if (prop === 'staff') {
    p(cyl(0.035, 0.045, 2.1, 6), 'terra', M(0.52, 1.05, 0.1, 0, 0, -0.08), solid);
  } else if (prop === 'tray') {
    p(cyl(0.3, 0.3, 0.04, 12), 'saffron', M(-0.52, 1.06, 0.22), solid);
    p(cyl(0.05, 0.04, 0.1, 8), 'turq', M(-0.6, 1.13, 0.16), solid);
    p(cyl(0.05, 0.04, 0.1, 8), 'turq', M(-0.46, 1.13, 0.28), solid);
  } else if (prop === 'megaphone') {
    p(cone(0.16, 0.34, 10), opts.propColor || 'pom', M(0.5, 1.28, 0.28, 1.35, 0, 0), solid);
  }
}

export function addSheep(bag, frame) {
  const p = framed(bag, frame);
  p(ball(0.38, 7, 5), 'snow', M(0, 0.42, 0, 0, 0, 0, 1.1, 0.85, 1.35), { flat: true, solid: false });
  p(box(0.2, 0.18, 0.24), 'ink', M(0, 0.5, 0.52), { solid: false });
  p(box(0.07, 0.28, 0.07), 'ink', M(-0.16, 0.14, 0.3), { solid: false });
  p(box(0.07, 0.28, 0.07), 'ink', M(0.16, 0.14, 0.3), { solid: false });
  p(box(0.07, 0.28, 0.07), 'ink', M(-0.16, 0.14, -0.3), { solid: false });
  p(box(0.07, 0.28, 0.07), 'ink', M(0.16, 0.14, -0.3), { solid: false });
}

export function addDog(bag, frame) {
  const p = framed(bag, frame);
  p(box(0.26, 0.26, 0.6), 'cream', M(0, 0.32, 0), { solid: false });
  p(box(0.22, 0.22, 0.22), 'cream', M(0, 0.5, 0.36), { solid: false });
  p(box(0.06, 0.12, 0.04), 'hair', M(-0.08, 0.64, 0.32), { solid: false });
  p(box(0.06, 0.12, 0.04), 'hair', M(0.08, 0.64, 0.32), { solid: false });
  p(box(0.05, 0.05, 0.3), 'cream', M(0, 0.42, -0.4, -0.7, 0, 0), { solid: false });
  p(box(0.07, 0.2, 0.07), 'cream', M(-0.09, 0.1, 0.2), { solid: false });
  p(box(0.07, 0.2, 0.07), 'cream', M(0.09, 0.1, 0.2), { solid: false });
  p(box(0.07, 0.2, 0.07), 'cream', M(-0.09, 0.1, -0.2), { solid: false });
  p(box(0.07, 0.2, 0.07), 'cream', M(0.09, 0.1, -0.2), { solid: false });
}

// Behrouz on the moped, always on screen, built with care. Returns a
// group whose local space has +Y up and +Z forward, with the geometry
// merged per color into a handful of draw calls. The rider lives in a
// subgroup so he can bob at idle.

export function buildMopedRider(materialFor) {
  const group = new THREE.Group();
  const riderGroup = new THREE.Group();
  group.add(riderGroup);

  const mopedBag = new Bag();
  const riderBag = new Bag();
  const id = new THREE.Matrix4();
  const mp = framed(mopedBag, id);
  const rp = framed(riderBag, id);

  // The moped: red step-through body and fender, ink wheels, a headlight,
  // and the saffron hot-box on the rear rack with red lid trim.
  mp(box(0.5, 0.16, 1.5), 'pom', M(0, 0.5, 0.1));
  mp(box(0.42, 0.34, 0.5), 'pom', M(0, 0.68, -0.42));
  mp(box(0.16, 0.62, 0.16), 'pom', M(0, 0.82, 0.72, 0.5, 0, 0));
  mp(box(0.42, 0.14, 0.5), 'pom', M(0, 0.96, 0.92, 0.25, 0, 0));
  mp(cyl(0.05, 0.05, 0.62, 8), 'ink', M(0, 1.18, 0.82, 0, 0, Math.PI / 2));
  mp(ball(0.09, 8, 6), 'snow', M(0, 0.98, 1.08));
  mp(cyl(0.4, 0.4, 0.16, 12), 'ink', M(0, 0.4, 0.92, 0, 0, Math.PI / 2));
  mp(cyl(0.4, 0.4, 0.16, 12), 'ink', M(0, 0.4, -0.82, 0, 0, Math.PI / 2));
  mp(box(0.4, 0.1, 0.62), 'ink', M(0, 0.86, -0.15));
  // Rear rack and the hot-box.
  mp(box(0.5, 0.05, 0.5), 'ink', M(0, 0.82, -0.78));
  mp(box(0.56, 0.5, 0.56), 'saffron', M(0, 1.1, -0.82));
  mp(box(0.6, 0.07, 0.6), 'pom', M(0, 1.38, -0.82));

  // Behrouz in a riding pose: bent knees to the deck, arms forward to the
  // bars, round ink glasses, goatee plus mustache, shirt-white top with a
  // teal placket stripe, dark trousers, cream shoes, and the orange
  // crossbody kabob bag with a small red emblem panel.
  const hipY = 1.06;
  rp(box(0.2, 0.24, 0.5), 'trouser', M(-0.16, hipY - 0.06, 0.12, -0.25, 0, 0));
  rp(box(0.2, 0.24, 0.5), 'trouser', M(0.16, hipY - 0.06, 0.12, -0.25, 0, 0));
  rp(box(0.18, 0.44, 0.2), 'trouser', M(-0.2, 0.76, 0.34, 0.25, 0, 0));
  rp(box(0.18, 0.44, 0.2), 'trouser', M(0.2, 0.76, 0.34, 0.25, 0, 0));
  rp(box(0.2, 0.09, 0.32), 'cream', M(-0.2, 0.56, 0.42));
  rp(box(0.2, 0.09, 0.32), 'cream', M(0.2, 0.56, 0.42));
  rp(box(0.56, 0.64, 0.34), 'shirt', M(0, hipY + 0.36, -0.02, 0.2, 0, 0));
  rp(box(0.12, 0.6, 0.05), 'placket', M(0, hipY + 0.36, 0.16, 0.2, 0, 0));
  rp(box(0.15, 0.56, 0.15), 'shirt', M(-0.33, hipY + 0.5, 0.34, -1.15, 0, 0.1));
  rp(box(0.15, 0.56, 0.15), 'shirt', M(0.33, hipY + 0.5, 0.34, -1.15, 0, -0.1));
  rp(box(0.12, 0.14, 0.12), 'skin', M(-0.34, hipY + 0.6, 0.62));
  rp(box(0.12, 0.14, 0.12), 'skin', M(0.34, hipY + 0.6, 0.62));
  // The crossbody bag: strap across the chest, bag at the hip.
  rp(box(0.09, 0.7, 0.06), 'bag', M(0.14, hipY + 0.38, 0.16, 0.2, 0, 0.62));
  rp(box(0.42, 0.34, 0.18), 'bag', M(-0.36, hipY + 0.02, -0.1));
  rp(box(0.2, 0.16, 0.03), 'pom', M(-0.36, hipY + 0.02, 0.0 + 0.0));
  const headY = hipY + 0.94;
  rp(ball(0.27, 10, 8), 'skin', M(0, headY, 0.06));
  rp(ball(0.285, 10, 6, 0), 'hair', M(0, headY + 0.04, 0.04, 0, 0, 0, 1, 0.62, 1));
  rp(torus(0.085, 0.02, 6, 14), 'ink', M(-0.11, headY + 0.02, 0.31));
  rp(torus(0.085, 0.02, 6, 14), 'ink', M(0.11, headY + 0.02, 0.31));
  rp(box(0.07, 0.02, 0.02), 'ink', M(0, headY + 0.02, 0.32));
  rp(box(0.2, 0.05, 0.06), 'hair', M(0, headY - 0.07, 0.3));
  rp(box(0.12, 0.13, 0.07), 'hair', M(0, headY - 0.2, 0.26));

  const meshes = [];
  for (const bag of [mopedBag, riderBag]) {
    const target = bag === riderBag ? riderGroup : group;
    for (const [colorName, geos] of bag.byColor) {
      const merged = mergeGeometries(geos);
      const mesh = new THREE.Mesh(merged, materialFor(colorName));
      target.add(mesh);
      meshes.push(mesh);
    }
  }

  return {
    group,
    riderGroup,
    meshes,
    // Where the hot-box steam rises from, in local space.
    steamLocal: new THREE.Vector3(0, 1.5, -0.82),
  };
}
