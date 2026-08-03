// Local leaderboard, persisted in localStorage when available, top 10 by
// total toman. Falls back to in-memory storage without complaint.

const BOARD_KEY = 'kubideh-express-leaderboard-v1';
const NAME_KEY = 'kubideh-express-name-v1';
export const MAX_ENTRIES = 10;
export const MAX_NAME = 16;
export const DEFAULT_NAME = 'Courier';

function safeStorage(storage) {
  if (!storage) return null;
  try {
    storage.setItem('kubideh-probe', '1');
    storage.removeItem('kubideh-probe');
    return storage;
  } catch (e) {
    return null;
  }
}

export function cleanName(raw) {
  const s = String(raw ?? '').trim().slice(0, MAX_NAME);
  return s.length > 0 ? s : DEFAULT_NAME;
}

export function createLeaderboard(storage = null) {
  const store = safeStorage(storage);
  let entries = [];
  let name = DEFAULT_NAME;

  if (store) {
    try {
      const raw = store.getItem(BOARD_KEY);
      if (raw) entries = JSON.parse(raw).filter((e) => e && typeof e.score === 'number');
      const n = store.getItem(NAME_KEY);
      if (n) name = cleanName(n);
    } catch (e) {
      entries = [];
    }
  }

  function save() {
    if (!store) return;
    try {
      store.setItem(BOARD_KEY, JSON.stringify(entries));
      store.setItem(NAME_KEY, name);
    } catch (e) {
      // In-memory only from here on, which is fine.
    }
  }

  function sortAndCap() {
    entries.sort((a, b) => b.score - a.score || b.day - a.day);
    entries = entries.slice(0, MAX_ENTRIES);
  }

  return {
    getName() {
      return name;
    },
    setName(raw) {
      name = cleanName(raw);
      for (const e of entries) if (e.session === currentSession) e.name = name;
      save();
      return name;
    },
    // One entry per play session, updated as the run grows.
    submit({ session, score, day }) {
      let e = entries.find((x) => x.session === session);
      if (!e) {
        e = { session, name, score: 0, day: 0 };
        entries.push(e);
      }
      e.name = name;
      e.score = score;
      e.day = Math.max(e.day, day);
      sortAndCap();
      save();
      return this.entries();
    },
    entries() {
      return entries.map((e) => ({ name: e.name, score: e.score, day: e.day }));
    },
  };
}

let currentSession = 'session-' + Math.floor(Math.random() * 1e9);
export function sessionId() {
  return currentSession;
}
