import * as THREE from 'three';

export const PLANET_RADIUS = 42;

// u runs 0..1 around the ring road (a great circle in the y = 0 plane).
// lateral is a signed arc length toward the +Y pole, in world units.
export function surfacePoint(u, lateral = 0, radius = PLANET_RADIUS) {
  const theta = u * Math.PI * 2;
  const phi = lateral / PLANET_RADIUS;
  const cp = Math.cos(phi);
  return new THREE.Vector3(
    Math.cos(theta) * cp,
    Math.sin(phi),
    Math.sin(theta) * cp
  ).multiplyScalar(radius);
}

export function surfaceUp(pos) {
  return pos.clone().normalize();
}

// Tangent direction of travel along increasing u, at lateral 0.
export function roadForward(u) {
  const theta = u * Math.PI * 2;
  return new THREE.Vector3(-Math.sin(theta), 0, Math.cos(theta));
}

// The single shared orientation helper. Builds a right-handed local frame
// on the sphere: local +Y is the radial up at pos, local +Z is the
// forward hint projected into the tangent plane, local +X = up cross
// forward, which makes right cross up equal forward. Everything that
// stands on the planet goes through this.
export function orientToSurface(obj, pos, forwardHint) {
  const up = pos.clone().normalize();
  const f = forwardHint
    .clone()
    .addScaledVector(up, -forwardHint.dot(up));
  if (f.lengthSq() < 1e-10) {
    f.set(0, 0, 1).addScaledVector(up, -up.z);
    if (f.lengthSq() < 1e-10) f.set(1, 0, 0);
  }
  f.normalize();
  const r = new THREE.Vector3().crossVectors(up, f).normalize();
  const m = new THREE.Matrix4().makeBasis(r, up, f);
  obj.position.copy(pos);
  obj.quaternion.setFromRotationMatrix(m);
  return obj;
}

// Same frame as a Matrix4 with translation, for baking static geometry.
export function surfaceFrame(pos, forwardHint) {
  const holder = new THREE.Object3D();
  orientToSurface(holder, pos, forwardHint);
  holder.updateMatrix();
  return holder.matrix.clone();
}

// Frame at a road parameter, +Z facing along increasing u, optionally
// yawed around the local up.
export function frameAt(u, lateral = 0, yaw = 0) {
  const pos = surfacePoint(u, lateral);
  const up = pos.clone().normalize();
  const fwd = roadForward(u).applyAxisAngle(up, yaw);
  return surfaceFrame(pos, fwd);
}

// Great circle distance between two points on the planet surface.
export function arcDistance(a, b) {
  return a.angleTo(b) * PLANET_RADIUS;
}

// Direction along the surface from one point toward another, projected
// into the tangent plane at from.
export function tangentToward(from, to) {
  const up = from.clone().normalize();
  const d = to.clone().sub(from);
  d.addScaledVector(up, -d.dot(up));
  if (d.lengthSq() < 1e-10) return roadForward(0);
  return d.normalize();
}

// Spherical interpolation between two unit vectors.
export function slerpUnit(a, b, t) {
  const qa = new THREE.Quaternion();
  const qb = new THREE.Quaternion().setFromUnitVectors(a, b);
  const q = qa.clone().slerp(qb, t);
  return a.clone().applyQuaternion(q);
}

export function smoothstep01(t) {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

// Small deterministic RNG for tests and seeded days.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
