// Leaderboard. Talks to the shared Kubideh Express Worker API when a URL
// is configured and reachable, so every player sees the same top 10.
// Falls back to a localStorage only board (or in memory) if the network
// call fails, so the game never blocks on it.

const BOARD_KEY = 'kubideh-express-leaderboard-v1';
const NAME_KEY = 'kubideh-express-name-v1';
export const MAX_ENTRIES = 10;
export const MAX_NAME = 16;
export const DEFAULT_NAME = 'Courier';

// Set this to the deployed Worker's URL to go live, for example
// 'https://kubideh-leaderboard.yourname.workers.dev'. Leave blank to
// stay local only.
export const LEADERBOARD_API = 'https://kubideh-leaderboard.kubideh-leaderboards.workers.dev';

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

export function createLeaderboard(storage = null, apiBase = LEADERBOARD_API) {
  const store = safeStorage(storage);
  let entries = [];
  let name = DEFAULT_NAME;
  let online = Boolean(apiBase);

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

  function localSubmit({ session, score, day }) {
    let e = entries.find((x) => x.session === session);
    if (!e) {
      e = { session, name, score: 0, day: 0 };
      entries.push(e);
    }
    e.name = name;
    e.score = Math.max(e.score, score);
    e.day = Math.max(e.day, day);
    sortAndCap();
    save();
  }

  async function remoteFetch(path, options) {
    if (!apiBase) throw new Error('no api configured');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      const res = await fetch(apiBase + path, {
        ...options,
        signal: controller.signal,
      });
      if (!res.ok) throw new Error('bad response ' + res.status);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  const api = {
    isOnline() {
      return online;
    },
    getName() {
      return name;
    },
    setName(raw) {
      name = cleanName(raw);
      for (const e of entries) if (e.session === currentSession) e.name = name;
      save();
      return name;
    },
    // One entry per play session, updated as the run grows. Always
    // updates the local board immediately so the UI never waits, then
    // tries the shared board in the background.
    async submit({ session, score, day }) {
      localSubmit({ session, score, day });
      if (apiBase) {
        try {
          const result = await remoteFetch('/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session, name, score, day }),
          });
          online = true;
          if (Array.isArray(result.entries)) {
            entries = result.entries.map((e, i) => ({
              session: 'remote-' + i,
              name: e.name,
              score: e.score,
              day: e.day,
            }));
            return this.entries();
          }
        } catch (e) {
          online = false;
        }
      }
      return this.entries();
    },
    // Pulls the shared board fresh. Call before opening the leaderboard
    // modal. Falls back to whatever is cached locally on failure.
    async refresh() {
      if (!apiBase) return this.entries();
      try {
        const result = await remoteFetch('/leaderboard', { method: 'GET' });
        online = true;
        if (Array.isArray(result.entries)) {
          entries = result.entries.map((e, i) => ({
            session: 'remote-' + i,
            name: e.name,
            score: e.score,
            day: e.day,
          }));
        }
      } catch (e) {
        online = false;
      }
      return this.entries();
    },
    entries() {
      return entries.map((e) => ({ name: e.name, score: e.score, day: e.day }));
    },
  };

  return api;
}

let currentSession = 'session-' + Math.floor(Math.random() * 1e9);
export function sessionId() {
  return currentSession;
}

