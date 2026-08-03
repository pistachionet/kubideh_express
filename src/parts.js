import * as THREE from 'three';

// A Bag collects raw geometry, pre-transformed into world (or group)
// space, grouped by palette color name. After the build, each color merges
// into one draw call and every solid part feeds the collision BVH.

export class Bag {
  constructor() {
    this.byColor = new Map();
    this.solid = [];
    this.markers = [];
    this.sourceCount = 0;
  }

  add(geo, colorName, matrix = null, opts = {}) {
    let g = geo.index ? geo.toNonIndexed() : geo;
    if (matrix) g.applyMatrix4(matrix);
    if (opts.flat) g.computeVertexNormals();
    if (!this.byColor.has(colorName)) this.byColor.set(colorName, []);
    this.byColor.get(colorName).push(g);
    if (opts.solid !== false) this.solid.push(g);
    this.sourceCount += 1;
    return g;
  }

  marker(type, pos, data = {}) {
    this.markers.push({ type, pos, ...data });
  }
}

// Compose a local transform matrix from position, XYZ euler rotation, and
// scale. Scale falls back component to component so M(x,y,z, 0,0,0, 2)
// scales uniformly.
export function M(px, py, pz, rx = 0, ry = 0, rz = 0, sx = 1, sy = null, sz = null) {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'XYZ'));
  m.compose(
    new THREE.Vector3(px, py, pz),
    q,
    new THREE.Vector3(sx, sy ?? sx, sz ?? sy ?? sx)
  );
  return m;
}

// Returns a placement function bound to a bag and a parent frame. Local
// matrices are premultiplied by the frame so builders can work in a cozy
// local space with +Y up and +Z facing the road.
export function framed(bag, frame) {
  const put = (geo, colorName, local = null, opts = {}) => {
    const m = local ? frame.clone().multiply(local) : frame.clone();
    return bag.add(geo, colorName, m, opts);
  };
  put.point = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(frame);
  put.child = (local) => frame.clone().multiply(local);
  return put;
}

export const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
export const cyl = (rt, rb, h, seg = 10) => new THREE.CylinderGeometry(rt, rb, h, seg);
export const cone = (r, h, seg = 8) => new THREE.ConeGeometry(r, h, seg);
export const ball = (r, w = 8, hseg = 6) => new THREE.SphereGeometry(r, w, hseg);
export const ico = (r, d = 0) => new THREE.IcosahedronGeometry(r, d);
export const disc = (r, seg = 20) => new THREE.CircleGeometry(r, seg);
export const ring = (ri, ro, seg = 36) => new THREE.RingGeometry(ri, ro, seg);
export const torus = (r, t, ts = 6, rs = 12) => new THREE.TorusGeometry(r, t, ts, rs);
