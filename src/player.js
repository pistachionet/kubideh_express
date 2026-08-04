import * as THREE from 'three';
import { PLANET_RADIUS, surfacePoint, roadForward } from './math.js';

export const MOPED = {
  maxSpeed: 16,
  accel: 10,
  brakeDecel: 22,
  coastDecel: 6,
  reverseMax: 4.5,
  reverseAccel: 6,
  steerRate: 2.2,
};

export function createPlayerState(u = 0.97) {
  return {
    pos: surfacePoint(u, 0),
    forward: roadForward(u),
    speed: 0,
    lean: 0,
  };
}

// Pure kinematics. input.throttle in [-1, 1], input.steer in [-1, 1]
// where positive steer is a LEFT input. Steering is non-inverted by
// contract: a left input rotates the heading positively around the local
// surface up, which curves the ride to the left on screen. The headless
// steering test locks this in.
export function stepPlayer(state, input, dt) {
  let s = state.speed;
  const throttle = THREE.MathUtils.clamp(input.throttle || 0, -1, 1);
  const steer = THREE.MathUtils.clamp(input.steer || 0, -1, 1);

  if (throttle > 0) {
    s += MOPED.accel * throttle * dt;
  } else if (throttle < 0) {
    if (s > 0.05) s -= MOPED.brakeDecel * dt;
    else s -= MOPED.reverseAccel * dt;
  } else {
    const d = MOPED.coastDecel * dt;
    if (s > d) s -= d;
    else if (s < -d) s += d;
    else s = 0;
  }
  s = THREE.MathUtils.clamp(s, -MOPED.reverseMax, MOPED.maxSpeed);

  const up = state.pos.clone().normalize();
  const speedFactor = THREE.MathUtils.clamp(Math.abs(s) / 5, 0.12, 1);
  const steerAngle = steer * MOPED.steerRate * speedFactor * dt;
  state.forward.applyAxisAngle(up, steerAngle);

  state.pos.addScaledVector(state.forward, s * dt);
  state.pos.normalize().multiplyScalar(PLANET_RADIUS);
  const up2 = state.pos.clone().normalize();
  state.forward.addScaledVector(up2, -state.forward.dot(up2)).normalize();

  const targetLean =
    steer * THREE.MathUtils.clamp(s / MOPED.maxSpeed, 0, 1) * 0.3;
  state.lean += (targetLean - state.lean) * Math.min(1, dt * 8);
  state.speed = s;
  return state;
}
