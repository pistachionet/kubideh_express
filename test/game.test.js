// Fuzzes the pure delivery rules across hundreds of randomized days and
// checks every contract from the spec: day one roster, batch sizes, the
// phone rule, Neema's staged unlock, target growth, the stranded safety
// valve, and the leaderboard.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDay,
  dayTarget,
  tryPickup,
  deliver,
  promoteIfStranded,
  readyCount,
  carryingCount,
  carriedIds,
  CARRY_CAPACITY,
  TIP_MIN,
  TIP_MAX,
} from '../src/game.js';
import { mulberry32 } from '../src/math.js';
import {
  createLeaderboard,
  cleanName,
  MAX_ENTRIES,
  MAX_NAME,
  DEFAULT_NAME,
} from '../src/leaderboard.js';

test('day one never includes Neema and targets three orders', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const rng = mulberry32(seed);
    const day = createDay(1, rng);
    assert.equal(day.target, 3);
    assert.equal(day.orders.length, 3);
    assert.ok(!day.orders.some((o) => o.id === 'neema'), 'no Neema on day 1');
    assert.ok(day.orders.every((o) => o.status === 'ready'));
    assert.equal(day.neemaUnlockAt, null);
  }
});

test('day two stages Neema pending with the halfway unlock mark', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const day = createDay(2, mulberry32(seed));
    assert.equal(day.target, 4);
    const n = day.orders.find((o) => o.id === 'neema');
    assert.ok(n, 'Neema is on the day 2 list');
    assert.equal(n.status, 'pending');
    assert.equal(day.neemaUnlockAt, Math.floor(day.target / 2));
  }
});

test('targets grow by one per day and cap at nine', () => {
  const expected = [3, 4, 5, 6, 7, 8, 9, 9, 9, 9];
  expected.forEach((t, i) => assert.equal(dayTarget(i + 1), t));
  const late = createDay(12, mulberry32(7));
  assert.equal(late.orders.length, 9);
});

function simulateDay(dayNumber, seed) {
  const rng = mulberry32(seed);
  const state = createDay(dayNumber, rng);
  let guard = 0;
  let unlockEventCount = 0;

  while (!state.complete && guard++ < 200) {
    // Box is empty here. The only way anything becomes carried is this
    // at-shop pickup call.
    assert.equal(carryingCount(state), 0);

    if (readyCount(state) === 0) {
      // Nothing waiting: only a pending order can save the day, which is
      // exactly what the safety valve does.
      const promoted = promoteIfStranded(state);
      assert.ok(promoted, 'stranded state must self-heal');
    }

    const readyBefore = readyCount(state);
    const res = tryPickup(state, rng);
    assert.ok(res.ok, 'pickup at the shop with an empty box succeeds');
    assert.ok(res.count >= 1, 'batch at least one');
    assert.ok(
      res.count <= Math.min(readyBefore, CARRY_CAPACITY),
      'batch capped by ready count and capacity'
    );
    assert.equal(carryingCount(state), res.count);

    // A second grab while carrying must refuse.
    const again = tryPickup(state, rng);
    assert.equal(again.ok, false);
    assert.equal(again.reason, 'carrying');

    // Deliver the whole box in random order.
    while (carryingCount(state) > 0) {
      const ids = carriedIds(state);
      const id = ids[Math.floor(rng() * ids.length)];
      const deliveredBefore = state.delivered;
      const out = deliver(state, id, rng);
      assert.ok(out.ok);
      assert.ok(out.tip >= TIP_MIN && out.tip <= TIP_MAX, 'tip in range');
      assert.equal(state.delivered, deliveredBefore + 1);

      const ev = out.events;
      if (ev.includes('dayComplete')) {
        assert.ok(!ev.includes('phone'), 'phone never rings on completion');
        assert.equal(readyCount(state), 0);
        assert.equal(carryingCount(state), 0);
      }
      if (ev.includes('phone')) {
        const boxEmptiedWithWork =
          carryingCount(state) === 0 && readyCount(state) > 0;
        assert.ok(
          boxEmptiedWithWork || ev.includes('neemaUnlocked'),
          'phone only when the box empties with work left, or Neema unlocks'
        );
      }
      if (ev.includes('neemaUnlocked')) {
        unlockEventCount++;
        assert.equal(
          state.delivered,
          state.neemaUnlockAt,
          'Neema unlocks exactly at floor(target / 2) deliveries'
        );
        const n = state.orders.find((o) => o.id === 'neema');
        assert.equal(n.status, 'ready');
      }
    }
  }

  assert.ok(state.complete, 'every day finishes');
  assert.equal(state.delivered, state.target);
  assert.ok(state.orders.every((o) => o.status === 'done'));
  if (dayNumber === 2) {
    assert.equal(unlockEventCount, 1, 'Neema unlock fires once');
  }
  return state;
}

test('fuzz: three hundred randomized days obey every rule', () => {
  let runs = 0;
  for (let seed = 1; seed <= 34; seed++) {
    for (let dayNumber = 1; dayNumber <= 9; dayNumber++) {
      simulateDay(dayNumber, seed * 1000 + dayNumber);
      runs++;
    }
  }
  assert.ok(runs >= 300, `ran ${runs} days`);
});

test('pickup refuses when nothing is ready or the day is done', () => {
  const rng = mulberry32(5);
  const state = createDay(1, rng);
  for (const o of state.orders) o.status = 'done';
  state.complete = true;
  assert.equal(tryPickup(state, rng).ok, false);

  const s2 = createDay(1, mulberry32(6));
  for (const o of s2.orders) o.status = 'active';
  assert.equal(tryPickup(s2, rng).reason, 'carrying');
});

test('safety valve promotes a pending order in a crafted stranded state', () => {
  const state = {
    day: 2,
    target: 2,
    orders: [
      { id: 'amoo', status: 'done' },
      { id: 'neema', status: 'pending' },
    ],
    delivered: 1,
    neemaUnlockAt: 99,
    complete: false,
  };
  assert.equal(promoteIfStranded(state), true);
  assert.equal(state.orders[1].status, 'ready');
  // Not stranded anymore, so a second call does nothing.
  assert.equal(promoteIfStranded(state), false);
});

test('deliver emits promoted when it empties into a stranded state', () => {
  const rng = mulberry32(9);
  const state = {
    day: 2,
    target: 2,
    orders: [
      { id: 'amoo', status: 'active' },
      { id: 'neema', status: 'pending' },
    ],
    delivered: 0,
    neemaUnlockAt: 99,
    complete: false,
  };
  const out = deliver(state, 'amoo', rng);
  assert.ok(out.events.includes('promoted'));
  assert.ok(out.events.includes('phone'), 'work now waits at the shop');
  assert.ok(!out.events.includes('dayComplete'));
});

test('leaderboard sorts descending, caps at ten, and trims names', () => {
  const board = createLeaderboard(null, '');
  for (let i = 1; i <= 13; i++) {
    board.submit({ session: 's' + i, score: i * 10, day: 1 });
  }
  const entries = board.entries();
  assert.equal(entries.length, MAX_ENTRIES);
  for (let i = 1; i < entries.length; i++) {
    assert.ok(entries[i - 1].score >= entries[i].score, 'sorted descending');
  }
  assert.equal(entries[0].score, 130);
  assert.equal(entries[entries.length - 1].score, 40);

  const longName = 'A'.repeat(40);
  assert.equal(board.setName(longName).length, MAX_NAME);
  assert.equal(cleanName('   '), DEFAULT_NAME);
  assert.equal(cleanName('  Behrouz  '), 'Behrouz');

  // One entry per session, updated in place as the run grows.
  const before = board.entries().length;
  board.submit({ session: 's13', score: 500, day: 3 });
  board.submit({ session: 's13', score: 640, day: 4 });
  const after = board.entries();
  assert.equal(after.length, before);
  assert.equal(after[0].score, 640);
  assert.equal(after[0].day, 4);
});
