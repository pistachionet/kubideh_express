// The delivery rules as pure logic. No DOM, no three, fully testable
// headless. All state changes to orders happen through createDay,
// tryPickup, deliver, and promoteIfStranded, nothing else.

import { ROSTER } from './roster.js';

export const CARRY_CAPACITY = 3;
export const PICKUP_RADIUS = 6;
export const DELIVER_RADIUS = 5.5;
export const TIP_MIN = 12;
export const TIP_MAX = 20;

export function dayTarget(dayNumber) {
  return Math.min(2 + dayNumber, ROSTER.length);
}

function pickSome(list, n, rng) {
  const pool = list.slice();
  const out = [];
  while (out.length < n && pool.length > 0) {
    const i = Math.floor(rng() * pool.length);
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

// Builds a fresh day. Day 1 excludes Neema entirely. Day 2 includes Neema
// as a staged pending order that unlocks after floor(target / 2)
// deliveries. Day 3 onward he is a normal roster member.
export function createDay(dayNumber, rng = Math.random) {
  const target = dayTarget(dayNumber);
  const others = ROSTER.filter((c) => c.id !== 'neema');
  let chosen;
  let neemaStaged = false;
  if (dayNumber === 1) {
    chosen = pickSome(others, target, rng);
  } else if (dayNumber === 2) {
    chosen = pickSome(others, target - 1, rng);
    chosen.push(ROSTER.find((c) => c.id === 'neema'));
    neemaStaged = true;
  } else {
    chosen = pickSome(ROSTER, target, rng);
  }
  const orders = chosen.map((c) => ({
    id: c.id,
    status: neemaStaged && c.id === 'neema' ? 'pending' : 'ready',
  }));
  return {
    day: dayNumber,
    target,
    orders,
    delivered: 0,
    neemaUnlockAt: neemaStaged ? Math.floor(target / 2) : null,
    complete: false,
  };
}

export function readyCount(state) {
  return state.orders.filter((o) => o.status === 'ready').length;
}

export function carryingCount(state) {
  return state.orders.filter((o) => o.status === 'active').length;
}

export function carriedIds(state) {
  return state.orders.filter((o) => o.status === 'active').map((o) => o.id);
}

export function orderStatus(state, id) {
  const o = state.orders.find((x) => x.id === id);
  return o ? o.status : null;
}

// Pickups happen only at Shamshiry (the caller enforces the location and
// only calls this from the at-shop path) and only when the box is empty.
// Grabs a batch of random size, uniform 1 to min(ready, capacity).
export function tryPickup(state, rng = Math.random) {
  if (state.complete) return { ok: false, reason: 'complete' };
  if (carryingCount(state) > 0) return { ok: false, reason: 'carrying' };
  const ready = state.orders.filter((o) => o.status === 'ready');
  if (ready.length === 0) return { ok: false, reason: 'none' };
  const maxN = Math.min(ready.length, CARRY_CAPACITY);
  const n = 1 + Math.floor(rng() * maxN);
  const picked = pickSome(ready, n, rng);
  for (const o of picked) o.status = 'active';
  return { ok: true, count: n, ids: picked.map((o) => o.id) };
}

// Safety rule: if the box is empty, nothing is ready, and the day is not
// done, promote a pending order so the player is never stranded.
export function promoteIfStranded(state) {
  if (state.complete) return false;
  if (carryingCount(state) > 0 || readyCount(state) > 0) return false;
  const allDone = state.orders.every((o) => o.status === 'done');
  if (allDone) return false;
  const p = state.orders.find((o) => o.status === 'pending');
  if (!p) return false;
  p.status = 'ready';
  return true;
}

// Completes one carried order. Pays a tip of 12 to 20 toman. Emits
// events: neemaUnlocked, promoted, dayComplete, and phone. The phone
// rings when the box empties with orders still waiting, and when Neema
// unlocks, and never on day completion.
export function deliver(state, id, rng = Math.random) {
  const o = state.orders.find((x) => x.id === id && x.status === 'active');
  if (!o) return { ok: false };
  o.status = 'done';
  state.delivered += 1;
  const tip = TIP_MIN + Math.floor(rng() * (TIP_MAX - TIP_MIN + 1));
  const events = [];

  if (state.neemaUnlockAt !== null) {
    const n = state.orders.find((x) => x.id === 'neema');
    if (n && n.status === 'pending' && state.delivered >= state.neemaUnlockAt) {
      n.status = 'ready';
      events.push('neemaUnlocked');
      events.push('phone');
    }
  }

  if (state.orders.every((x) => x.status === 'done')) {
    state.complete = true;
    events.push('dayComplete');
  } else {
    if (promoteIfStranded(state)) events.push('promoted');
    if (carryingCount(state) === 0 && readyCount(state) > 0) {
      events.push('phone');
    }
  }

  const unique = [...new Set(events)];
  return { ok: true, tip, events: unique };
}
