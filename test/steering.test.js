// Locks in the steering contract: a left input curves the ride to the
// left, and the shared surface frame is right-handed and orthonormal.

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createPlayerState, stepPlayer } from '../src/player.js';
import {
  orientToSurface,
  surfacePoint,
  roadForward,
  PLANET_RADIUS,
} from '../src/math.js';

test('left input rotates the heading left around the surface up', () => {
  const state = createPlayerState(0);
  const dt = 1 / 60;

  // Get up to cruising speed first, straight ahead.
  for (let i = 0; i < 120; i++) stepPlayer(state, { throttle: 1, steer: 0 }, dt);
  assert.ok(state.speed > 8, 'moped reaches speed');

  const up = state.pos.clone().normalize();
  const before = state.forward.clone();

  // Hold a left input for half a second.
  for (let i = 0; i < 30; i++) stepPlayer(state, { throttle: 1, steer: 1 }, dt);

  const after = state.forward.clone();
  // Signed rotation about up: positive means counterclockwise seen from
  // above, which is a left turn.
  const signed = up.dot(new THREE.Vector3().crossVectors(before, after));
  assert.ok(signed > 0.01, `left steer must turn left, got ${signed}`);
});

test('left input drifts the position toward the left of the old path', () => {
  const state = createPlayerState(0);
  const dt = 1 / 60;
  for (let i = 0; i < 120; i++) stepPlayer(state, { throttle: 1, steer: 0 }, dt);

  const up = state.pos.clone().normalize();
  const fwd = state.forward.clone();
  const left = new THREE.Vector3().crossVectors(up, fwd);
  const start = state.pos.clone();

  for (let i = 0; i < 60; i++) stepPlayer(state, { throttle: 1, steer: 1 }, dt);

  const moved = state.pos.clone().sub(start);
  assert.ok(moved.dot(left) > 0.2, 'ride curves to the left side');
  assert.ok(moved.dot(fwd) > 0, 'still travels forward while curving');
});

test('right input mirrors to the right', () => {
  const state = createPlayerState(0);
  const dt = 1 / 60;
  for (let i = 0; i < 120; i++) stepPlayer(state, { throttle: 1, steer: 0 }, dt);
  const up = state.pos.clone().normalize();
  const before = state.forward.clone();
  for (let i = 0; i < 30; i++) stepPlayer(state, { throttle: 1, steer: -1 }, dt);
  const signed = up.dot(
    new THREE.Vector3().crossVectors(before, state.forward)
  );
  assert.ok(signed < -0.01, 'right steer must turn right');
});

test('player stays glued to the planet surface', () => {
  const state = createPlayerState(0.5);
  const dt = 1 / 60;
  const rng = () => Math.sin(state.pos.x * 12.9898) * 0.5 + 0.5;
  for (let i = 0; i < 600; i++) {
    stepPlayer(state, { throttle: 1, steer: rng() * 2 - 1 }, dt);
    assert.ok(
      Math.abs(state.pos.length() - PLANET_RADIUS) < 1e-6,
      'radius pinned'
    );
    assert.ok(
      Math.abs(state.forward.dot(state.pos.clone().normalize())) < 1e-6,
      'forward tangent'
    );
  }
});

test('orientToSurface builds a right-handed orthonormal frame', () => {
  const samples = [
    [0.0, 0], [0.13, 3], [0.25, -4], [0.5, 0], [0.62, 6],
    [0.75, -2], [0.9, 1], [0.97, 0],
  ];
  for (const [u, lat] of samples) {
    const pos = surfacePoint(u, lat);
    const hint = roadForward(u);
    const obj = new THREE.Object3D();
    orientToSurface(obj, pos, hint);
    const m = new THREE.Matrix4().makeRotationFromQuaternion(obj.quaternion);
    const e = m.elements;
    const r = new THREE.Vector3(e[0], e[1], e[2]);
    const up = new THREE.Vector3(e[4], e[5], e[6]);
    const f = new THREE.Vector3(e[8], e[9], e[10]);

    assert.ok(Math.abs(r.length() - 1) < 1e-6, 'right unit');
    assert.ok(Math.abs(up.length() - 1) < 1e-6, 'up unit');
    assert.ok(Math.abs(f.length() - 1) < 1e-6, 'forward unit');
    assert.ok(Math.abs(r.dot(up)) < 1e-6, 'right perp up');
    assert.ok(Math.abs(up.dot(f)) < 1e-6, 'up perp forward');
    assert.ok(Math.abs(f.dot(r)) < 1e-6, 'forward perp right');

    // Up matches the radial direction, forward matches the hint's
    // tangent projection.
    assert.ok(up.dot(pos.clone().normalize()) > 0.999999, 'up is radial');
    assert.ok(f.dot(hint) > 0.9, 'forward follows the hint');

    // Right-handed: right = up cross forward, so right cross up equals
    // forward and the determinant is +1.
    const rxu = new THREE.Vector3().crossVectors(r, up);
    assert.ok(rxu.distanceTo(f) < 1e-6, 'r cross up equals forward');
    assert.ok(Math.abs(m.determinant() - 1) < 1e-6, 'determinant +1');
  }
});
