import * as THREE from 'three';
import {
  PLANET_RADIUS,
  surfaceUp,
  arcDistance,
  tangentToward,
  orientToSurface,
  slerpUnit,
  smoothstep01,
} from './math.js';
import {
  createSharedUniforms,
  createCelMaterial,
  createSkyMaterial,
  createPipeline,
} from './render.js';
import { buildWorld, collideSphere } from './world.js';
import { buildMopedRider } from './characters.js';
import { createPlayerState, stepPlayer, MOPED } from './player.js';
import {
  createDay,
  tryPickup,
  deliver,
  readyCount,
  carryingCount,
  carriedIds,
  PICKUP_RADIUS,
  DELIVER_RADIUS,
} from './game.js';
import { ROSTER, customerById } from './roster.js';
import { createLeaderboard, sessionId } from './leaderboard.js';
import { createUI } from './ui.js';
import { createAudio } from './audio.js';
import { createSteamColumn, createGuidanceArrow, createBeacons } from './efx.js';
import { hexString } from './palette.js';

THREE.ColorManagement.enabled = false;

// Renderer. Antialias stays off, the outline pass and aastep carry the
// look. The composite does its own linear to sRGB conversion.
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
const DPR = Math.min(window.devicePixelRatio || 1, 2);
renderer.setPixelRatio(DPR);
document.getElementById('app').appendChild(renderer.domElement);

const shared = createSharedUniforms();
const materialCache = new Map();
const materialFor = (name) => {
  if (!materialCache.has(name)) materialCache.set(name, createCelMaterial(name, shared));
  return materialCache.get(name);
};

const scene = new THREE.Scene();
const overlayScene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2000);

const sky = new THREE.Mesh(new THREE.SphereGeometry(620, 24, 16), createSkyMaterial(shared));
sky.frustumCulled = false;
scene.add(sky);

const world = buildWorld({ materialFor });
scene.add(world.group);

const beacons = createBeacons(scene, world.destinations, world.homeAnchor, shared);
const arrow = createGuidanceArrow(overlayScene);
const grillSteam = world.steamSpots.map((p) => createSteamColumn(overlayScene, p, 1));
const rig = buildMopedRider(materialFor);
scene.add(rig.group);
const mopedSteam = createSteamColumn(overlayScene, new THREE.Vector3(), 2);

const pipeline = createPipeline(renderer, shared);
window.KUBIDEH_TUNE = { cel: shared, outline: pipeline.tune };

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  pipeline.setSize(w, h, DPR);
}
window.addEventListener('resize', resize);
resize();

// ------------------------------------------------------------------
// Game state.

const audio = createAudio();
const board = createLeaderboard(typeof localStorage !== 'undefined' ? localStorage : null);

let mode = 'start'; // start, cinematic, play
let dayNumber = 1;
let dayState = createDay(dayNumber);
let coins = 0;
let pickupsEver = 0;
const player = createPlayerState(0.97);

const WARM_LINES = [
  'Maman-bozorg saved you a plate. Sit, eat, the stars can wait.',
  'Somewhere on the road, a dog is still thinking about you.',
  'The samovar is warm and so is everyone you fed today.',
  'The coals settle. The road hums a little song about you.',
];

const ui = createUI({
  onStart: startShift,
  onToggleMusic: () => {
    audio.ensure();
    return audio.toggleMusic();
  },
  onOpenLeaderboard: () => {
    ui.openBoard(board.entries(), board.getName());
    board.refresh().then((entries) => {
      if (ui.isBoardOpen()) ui.updateBoardEntries(entries);
    });
  },
  onNameChange: (v) => board.setName(v),
  onPhoneTap: () => {
    const n = readyCount(dayState);
    if (n > 0) {
      ui.toast(
        'Shamshiry: ' +
          n +
          (n === 1 ? ' kabob is' : ' kabobs are') +
          ' boxed and ready. Come on home, azizam.'
      );
    } else {
      ui.toast('No orders waiting. Deliver the ones in your box.');
    }
  },
  onToggleBook: () => {
    if (ui.isBookOpen()) ui.closeBook();
    else ui.openBook(currentTickets());
  },
  onNextDay: startNextDay,
  onTouchInput: (key, down) => {
    touchInput[key] = down;
  },
});

function currentTickets() {
  return dayState.orders.map((o) => {
    const c = customerById(o.id);
    return { name: c.name, role: c.role, items: c.items, status: o.status };
  });
}

// The presence pill was cosmetic and never reflected real players, so
// it has been removed rather than left implying something false.

// ------------------------------------------------------------------
// Input.

const keys = new Set();
const touchInput = { left: false, right: false, go: false, brake: false };
const START_KEYS = ['Enter', ' ', 'w', 'W', 'ArrowUp'];

window.addEventListener('keydown', (e) => {
  if (mode === 'start' && START_KEYS.includes(e.key)) {
    e.preventDefault();
    startShift();
    return;
  }
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
    e.preventDefault();
  }
  if (e.key === 'b' || e.key === 'B') {
    if (mode === 'play' && !ui.isDialogueOpen() && !ui.isDayCardOpen()) {
      if (ui.isBookOpen()) ui.closeBook();
      else ui.openBook(currentTickets());
    }
    return;
  }
  if (e.key === 'Escape') {
    if (ui.isBookOpen()) ui.closeBook();
    if (ui.isBoardOpen()) ui.closeBoard();
    return;
  }
  keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
});
window.addEventListener('keyup', (e) => {
  keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
});
window.addEventListener('blur', () => keys.clear());

function readInput() {
  let throttle = 0;
  let steer = 0;
  if (keys.has('w') || keys.has('ArrowUp') || touchInput.go) throttle += 1;
  if (keys.has('s') || keys.has('ArrowDown') || touchInput.brake) throttle -= 1;
  if (keys.has('a') || keys.has('ArrowLeft') || touchInput.left) steer += 1;
  if (keys.has('d') || keys.has('ArrowRight') || touchInput.right) steer -= 1;
  return { throttle, steer };
}

// ------------------------------------------------------------------
// Camera.

let orbitAngle = 0.6;
let cine = null;
const camSmooth = new THREE.Vector3();
let camInit = false;

function chasePose(out) {
  const up = surfaceUp(player.pos);
  out.pos
    .copy(player.pos)
    .addScaledVector(up, 3.4)
    .addScaledVector(player.forward, -7.2);
  out.look.copy(player.pos).addScaledVector(up, 1.3).addScaledVector(player.forward, 2.2);
  out.up.copy(up);
  return out;
}
const _pose = { pos: new THREE.Vector3(), look: new THREE.Vector3(), up: new THREE.Vector3() };

function updateCamera(dt) {
  if (mode === 'start') {
    orbitAngle += dt * 0.05;
    const dir = new THREE.Vector3(
      Math.cos(orbitAngle) * 0.88,
      0.44,
      Math.sin(orbitAngle) * 0.88
    ).normalize();
    camera.position.copy(dir).multiplyScalar(112);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
    camInit = false;
  } else if (mode === 'cinematic') {
    cine.t += dt;
    const k = smoothstep01(cine.t / 3.6);
    chasePose(_pose);
    const dirA = cine.fromDir;
    const dirB = _pose.pos.clone().normalize();
    const dir = slerpUnit(dirA, dirB, k);
    const dist = THREE.MathUtils.lerp(cine.fromDist, _pose.pos.length(), k);
    camera.position.copy(dir).multiplyScalar(dist);
    camera.up.copy(cine.fromUp.clone().lerp(_pose.up, k).normalize());
    const look = cine.fromLook.clone().lerp(_pose.look, k);
    camera.lookAt(look);
    if (cine.t >= 3.6) {
      mode = 'play';
      camInit = false;
      ui.showPlayUI('ontouchstart' in window || navigator.maxTouchPoints > 0);
      ui.toast(
        "Maman-bozorg: The road's already hungry, azizam. Grab a box and follow the arrow.",
        5600
      );
      refreshBeacons();
      updateHud();
    }
  } else {
    chasePose(_pose);
    if (!camInit) {
      camSmooth.copy(_pose.pos);
      camInit = true;
    }
    camSmooth.lerp(_pose.pos, 1 - Math.exp(-7 * dt));
    camera.position.copy(camSmooth);
    camera.up.lerp(_pose.up, 1 - Math.exp(-7 * dt)).normalize();
    camera.lookAt(_pose.look);
  }
}

function startShift() {
  if (mode !== 'start') return;
  audio.ensure();
  ui.hideStart();
  cine = {
    t: 0,
    fromDir: camera.position.clone().normalize(),
    fromDist: camera.position.length(),
    fromUp: camera.up.clone(),
    fromLook: new THREE.Vector3(0, 0, 0),
  };
  mode = 'cinematic';
}

// ------------------------------------------------------------------
// Delivery loop wiring.

let paused = false;
let lastRingAt = -99;
let phoneWasWaiting = false;
let ringTimeout = null;
let clockTime = 0;

function updateHud() {
  ui.setHud(dayNumber, dayState.delivered, dayState.target, coins);
  ui.setBadge(readyCount(dayState));
}

function refreshBeacons() {
  const inPlay = new Set(dayState.orders.map((o) => o.id));
  for (const c of ROSTER) {
    const o = dayState.orders.find((x) => x.id === c.id);
    const visible = inPlay.has(c.id) && o && (o.status === 'ready' || o.status === 'active');
    beacons.setVisible(c.id, !!visible);
  }
  beacons.setVisible('home', true);
}

function ringNow() {
  if (clockTime - lastRingAt < 2.5) return;
  lastRingAt = clockTime;
  ui.ringPhone();
  audio.phoneRing();
}

function scheduleRing(force = false) {
  if (ringTimeout) clearTimeout(ringTimeout);
  // The phone rings after a short beat.
  ringTimeout = setTimeout(() => {
    if (force || (carryingCount(dayState) === 0 && readyCount(dayState) > 0 && !dayState.complete)) {
      ringNow();
    }
  }, 900);
}

function handleEvents(events) {
  for (const ev of events) {
    if (ev === 'phone') scheduleRing();
    if (ev === 'neemaUnlocked') {
      ui.toast('Your phone buzzes. A late order just came in from up the road.');
      scheduleRing(true);
    }
  }
  refreshBeacons();
  updateHud();
}

function handlePickup() {
  const d = arcDistance(player.pos, world.homeAnchor);
  if (d > PICKUP_RADIUS) return;
  if (carryingCount(dayState) > 0 || readyCount(dayState) === 0) return;
  const r = tryPickup(dayState);
  if (!r.ok) return;
  pickupsEver += 1;
  audio.chime();
  if (pickupsEver > 1) {
    const names = r.ids.map((id) => customerById(id).name).join(', ');
    ui.toast('Picked up ' + r.count + (r.count === 1 ? ' order: ' : ' orders: ') + names + '.');
  }
  refreshBeacons();
  updateHud();
}

function handleDeliveryProximity() {
  if (ui.isDialogueOpen()) return;
  const carried = carriedIds(dayState);
  let best = null;
  let bestD = DELIVER_RADIUS;
  for (const id of carried) {
    const d = arcDistance(player.pos, world.destinations.get(id).anchor);
    if (d < bestD) {
      bestD = d;
      best = id;
    }
  }
  if (!best) return;
  const customer = customerById(best);
  player.speed = 0;
  paused = true;
  ui.openDialogue(customer, () => {
    const r = deliver(dayState, best);
    paused = false;
    if (!r.ok) return;
    coins += r.tip;
    audio.chime();
    ui.toast(
      'Delivered to ' + customer.name + '. +' + r.tip + ' toman tip, and a little more friendship.'
    );
    handleEvents(r.events);
    if (r.events.includes('dayComplete')) {
      setTimeout(finishDay, 700);
    }
  });
}

function finishDay() {
  board.submit({ session: sessionId(), score: coins, day: dayNumber });
  ui.showDayCard({
    day: dayNumber,
    coins,
    warmLine: WARM_LINES[(dayNumber - 1) % WARM_LINES.length],
  });
}

function startNextDay() {
  dayNumber += 1;
  dayState = createDay(dayNumber);
  ui.toast('Maman-bozorg: Fresh coals, fresh morning. Day ' + dayNumber + ', azizam.', 5200);
  refreshBeacons();
  updateHud();
  phoneWasWaiting = false;
}

// Arrow target: while carrying, the nearest carried customer along the
// surface. With an empty box and orders waiting, home. Mandatory return.
function arrowTargetPos() {
  const carried = carriedIds(dayState);
  if (carried.length > 0) {
    let best = null;
    let bestD = Infinity;
    for (const id of carried) {
      const d = arcDistance(player.pos, world.destinations.get(id).anchor);
      if (d < bestD) {
        bestD = d;
        best = id;
      }
    }
    return world.destinations.get(best).anchor;
  }
  return world.homeAnchor;
}

function updateRadar() {
  const up = surfaceUp(player.pos);
  const fwd = player.forward;
  const left = new THREE.Vector3().crossVectors(up, fwd);
  const items = [];
  const carried = new Set(carriedIds(dayState));
  let nearestCarried = null;
  let nearestD = Infinity;
  for (const id of carried) {
    const d = arcDistance(player.pos, world.destinations.get(id).anchor);
    if (d < nearestD) {
      nearestD = d;
      nearestCarried = id;
    }
  }
  const pushItem = (pos, color, kind) => {
    const dir = tangentToward(player.pos, pos);
    const ny = dir.dot(fwd);
    const nx = -dir.dot(left);
    const len = Math.hypot(nx, ny) || 1;
    items.push({
      nx: nx / len,
      ny: ny / len,
      dist: arcDistance(player.pos, pos),
      color,
      kind,
    });
  };
  for (const o of dayState.orders) {
    if (o.status === 'done' || o.status === 'pending') continue;
    const d = world.destinations.get(o.id);
    const kind =
      o.status === 'active'
        ? o.id === nearestCarried
          ? 'carriedNear'
          : 'carried'
        : 'dot';
    pushItem(d.anchor, hexString(d.color), kind);
  }
  pushItem(world.homeAnchor, hexString('saffron'), 'home');
  ui.drawRadar(items);
}

// ------------------------------------------------------------------
// The frame loop.

const sunTarget = new THREE.Vector3();
const clock = new THREE.Clock();
const collideCenter = new THREE.Vector3();

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  clockTime += dt;
  const t = clockTime;

  const modalPause = ui.anyModalOpen();
  const moving = mode === 'play' && !paused && !modalPause;

  if (moving) {
    stepPlayer(player, readInput(), dt);
    // Solid world: resolve the rider as a sphere against the baked BVH
    // and slide along contacts.
    const up = surfaceUp(player.pos);
    collideCenter.copy(player.pos).addScaledVector(up, 1.0);
    const res = collideSphere(world.bvh, collideCenter, 1.05);
    if (res.hit) {
      player.pos.copy(collideCenter).addScaledVector(up, -1.0);
      player.pos.normalize().multiplyScalar(PLANET_RADIUS);
      const headOn = -res.push.dot(player.forward);
      if (headOn > 0.55) player.speed *= Math.max(0, 1 - headOn * 0.35);
      else player.speed *= 0.985;
      const up2 = surfaceUp(player.pos);
      player.forward.addScaledVector(up2, -player.forward.dot(up2)).normalize();
    }
    handlePickup();
    handleDeliveryProximity();
    ui.setBadge(readyCount(dayState));

    // Ring the phone when orders wait and the box is empty, with a beat,
    // then again every so often while the player is on the way home.
    const waiting =
      carryingCount(dayState) === 0 && readyCount(dayState) > 0 && !dayState.complete;
    if (waiting && !phoneWasWaiting) scheduleRing();
    if (waiting && clockTime - lastRingAt > 11) ringNow();
    phoneWasWaiting = waiting;
  }

  // Place the rig on the surface with lean and idle bob.
  orientToSurface(rig.group, player.pos, player.forward);
  rig.group.rotateZ(player.lean);
  const speedNorm = Math.abs(player.speed) / MOPED.maxSpeed;
  rig.riderGroup.position.y = Math.sin(t * 7) * 0.02 + speedNorm * Math.sin(t * 21) * 0.012;

  // Sun follows the player's frame so the lit side stays warm anywhere
  // on the planet.
  const up = surfaceUp(player.pos);
  const right = new THREE.Vector3().crossVectors(player.forward, up).normalize();
  sunTarget.copy(up).addScaledVector(right, 0.72).addScaledVector(player.forward, 0.18).normalize();
  shared.uSunDir.value.lerp(sunTarget, 1 - Math.exp(-2.2 * dt)).normalize();
  pipeline.updateLight(player.pos, up);

  updateCamera(dt);

  // Effects.
  beacons.update(t);
  for (const s of grillSteam) s.update(t + 0.3);
  rig.group.updateMatrixWorld();
  const steamBase = rig.steamLocal.clone().applyMatrix4(rig.group.matrixWorld);
  mopedSteam.setBase(steamBase);
  mopedSteam.update(t, 0.35 + speedNorm * 0.65);

  const arrowVisible = mode === 'play' && !modalPause && !ui.isDialogueOpen();
  const dir = tangentToward(player.pos, arrowTargetPos());
  arrow.update(player.pos, dir, t, arrowVisible);

  if (mode === 'play') updateRadar();
  audio.setEngine(moving ? speedNorm : 0);

  pipeline.render(scene, camera, overlayScene, sky, t);
}

updateHud();
refreshBeacons();
frame();
