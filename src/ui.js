import { hexString } from './palette.js';

// The whole UI is a DOM overlay injected by code. Warm paper panels, ink
// borders, chunky rounded corners. Baloo 2 for display, Vazirmatn for UI
// text, Space Mono for numbers.

const INK = hexString('ink');
const PAPER = hexString('paper');
const PAPER_DEEP = hexString('paperDeep');
const SAFFRON = hexString('saffron');
const POM = hexString('pom');

const CSS = `
#ke-ui, #ke-ui * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
#ke-ui {
  position: fixed; inset: 0; pointer-events: none; z-index: 10;
  font-family: 'Vazirmatn', sans-serif; color: ${INK};
  --paper: rgba(242, 235, 218, 0.94);
}
#ke-ui .panel {
  background: var(--paper); border: 3px solid ${INK}; border-radius: 14px;
  box-shadow: 0 4px 0 rgba(35, 32, 28, 0.25);
}
#ke-ui .display { font-family: 'Baloo 2', cursive; }
#ke-ui .mono { font-family: 'Space Mono', monospace; }
#ke-ui button {
  font-family: 'Baloo 2', cursive; color: ${INK}; cursor: pointer;
  border: 3px solid ${INK}; border-radius: 12px; background: ${PAPER};
  padding: 8px 16px; font-size: 17px; font-weight: 700;
  box-shadow: 0 3px 0 ${INK}; pointer-events: auto;
}
#ke-ui button:active { transform: translateY(2px); box-shadow: 0 1px 0 ${INK}; }

/* Start screen */
#ke-start {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 14px;
  background: radial-gradient(ellipse at center, rgba(35,32,28,0) 55%, rgba(35,32,28,0.28) 100%);
  pointer-events: auto;
}
#ke-start h1 {
  font-family: 'Baloo 2', cursive; font-weight: 800; margin: 0;
  font-size: clamp(44px, 9vw, 84px); color: ${PAPER};
  text-shadow: 0 4px 0 ${INK}, -2px 0 0 ${INK}, 2px 0 0 ${INK}, 0 -2px 0 ${INK};
  letter-spacing: 1px;
}
#ke-start .subtitle {
  background: var(--paper); border: 3px solid ${INK}; border-radius: 999px;
  padding: 6px 18px; font-size: 15px; font-weight: 500;
}
#ke-start .go {
  font-size: 24px; padding: 12px 34px; background: ${SAFFRON}; color: ${PAPER};
  text-shadow: 0 2px 0 ${INK}; border-radius: 999px; margin-top: 8px;
}
#ke-start .pills { display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap; justify-content: center; }
#ke-start .pill {
  font-family: 'Vazirmatn', sans-serif; font-size: 13px; font-weight: 500;
  padding: 6px 14px; border-radius: 999px; box-shadow: 0 2px 0 ${INK};
}
#ke-start .pill .dot {
  display: inline-block; width: 8px; height: 8px; border-radius: 50%;
  background: #5e8c57; margin-right: 6px;
}
#ke-start .foot { font-size: 12px; color: ${PAPER}; text-shadow: 0 1px 0 ${INK}; opacity: 0.9; }

/* HUD */
#ke-hud { position: absolute; top: 12px; left: 12px; display: none; flex-direction: column; gap: 8px; }
#ke-hud .panel { padding: 8px 14px; }
#ke-hud .day { font-size: 20px; font-weight: 800; line-height: 1.1; }
#ke-hud .progress { font-size: 13px; }
#ke-hud .coins { font-size: 15px; padding: 6px 14px; border-radius: 999px; display: inline-block; }

/* Radar */
#ke-radar { position: absolute; top: 12px; right: 12px; display: none; }
#ke-radar canvas { display: block; }

/* Right-side buttons */
#ke-side {
  position: absolute; right: 12px; bottom: 12px; display: none;
  flex-direction: column; gap: 10px; align-items: flex-end;
}
#ke-side .round {
  width: 58px; height: 58px; border-radius: 50%; font-size: 26px; padding: 0;
  position: relative; background: ${PAPER};
}
#ke-side .badge {
  position: absolute; top: -6px; right: -6px; min-width: 24px; height: 24px;
  border-radius: 12px; background: ${POM}; color: ${PAPER}; border: 2px solid ${INK};
  font-family: 'Space Mono', monospace; font-size: 13px; font-weight: 700;
  display: none; align-items: center; justify-content: center; padding: 0 5px;
}
@keyframes ke-ring {
  0%, 100% { transform: rotate(0); }
  10% { transform: rotate(-14deg); } 20% { transform: rotate(12deg); }
  30% { transform: rotate(-10deg); } 40% { transform: rotate(8deg); }
  50% { transform: rotate(-5deg); } 60% { transform: rotate(3deg); }
}
#ke-side .ringing { animation: ke-ring 1.4s ease-in-out; }

/* Toasts */
#ke-toasts {
  position: absolute; top: 14px; left: 50%; transform: translateX(-50%);
  display: flex; flex-direction: column; gap: 8px; align-items: center;
  width: min(92vw, 460px);
}
.ke-toast {
  padding: 9px 18px; font-size: 14px; font-weight: 500; text-align: center;
  opacity: 0; transform: translateY(-8px); transition: opacity 0.3s, transform 0.3s;
}
.ke-toast.show { opacity: 1; transform: translateY(0); }

/* Dialogue */
#ke-dialogue {
  position: absolute; bottom: 18px; left: 50%; transform: translate(-50%, 20px);
  width: min(94vw, 440px); overflow: hidden; padding: 0; display: none;
  opacity: 0; transition: opacity 0.25s, transform 0.25s; pointer-events: auto;
}
#ke-dialogue.show { opacity: 1; transform: translate(-50%, 0); }
#ke-dialogue .head { padding: 8px 16px; color: ${PAPER}; border-bottom: 3px solid ${INK}; }
#ke-dialogue .head .name { font-family: 'Baloo 2', cursive; font-weight: 800; font-size: 19px; }
#ke-dialogue .head .role { font-size: 12px; opacity: 0.95; }
#ke-dialogue .line { padding: 14px 16px 6px; font-size: 15px; line-height: 1.45; }
#ke-dialogue .responses { display: flex; gap: 8px; padding: 12px 16px 16px; flex-wrap: wrap; }
#ke-dialogue .responses button { font-size: 15px; flex: 1 1 auto; }

/* Modals */
.ke-modal-wrap {
  position: absolute; inset: 0; display: none; align-items: center; justify-content: center;
  background: rgba(35, 32, 28, 0.35); pointer-events: auto; padding: 14px;
}
.ke-modal { max-width: 620px; width: 100%; max-height: 86vh; overflow: auto; padding: 18px; }
.ke-modal h2 { font-family: 'Baloo 2', cursive; font-weight: 800; margin: 0 0 8px; font-size: 26px; }

/* Ticket book */
#ke-book .spread { display: flex; gap: 0; }
#ke-book .page { flex: 1; padding: 10px 14px; min-width: 0; }
#ke-book .page.left { border-right: 2px dashed ${INK}; }
.ke-ticket {
  border: 2px solid ${INK}; border-radius: 10px; background: ${PAPER};
  padding: 8px 10px; margin-bottom: 8px;
}
.ke-ticket .who { font-weight: 700; font-size: 14px; }
.ke-ticket .what { font-size: 12px; color: rgba(35,32,28,0.75); }
.ke-stamp {
  display: inline-block; margin-top: 5px; padding: 2px 8px; border-radius: 6px;
  font-family: 'Space Mono', monospace; font-size: 11px; font-weight: 700;
  border: 2px solid ${INK}; transform: rotate(-2deg);
}
.ke-stamp.done { background: #7ba86a; color: ${PAPER}; }
.ke-stamp.active { background: ${SAFFRON}; color: ${PAPER}; }
.ke-stamp.ready { background: #4e86a6; color: ${PAPER}; }
.ke-stamp.pending { background: ${PAPER_DEEP}; font-style: italic; text-transform: none; }

/* Leaderboard */
#ke-board table { width: 100%; border-collapse: collapse; font-size: 14px; }
#ke-board th, #ke-board td { text-align: left; padding: 6px 8px; border-bottom: 2px solid ${PAPER_DEEP}; }
#ke-board .score { font-family: 'Space Mono', monospace; }
#ke-board input {
  font-family: 'Vazirmatn', sans-serif; font-size: 15px; padding: 6px 10px;
  border: 3px solid ${INK}; border-radius: 10px; background: ${PAPER}; width: 100%;
}

/* Day card */
#ke-day .big { font-size: 30px; }
#ke-day .toman { font-size: 20px; margin: 6px 0 14px; }
#ke-day .row { display: flex; gap: 10px; flex-wrap: wrap; }
#ke-day .warm { font-size: 15px; margin: 2px 0 10px; }

/* Touch controls */
#ke-touch { position: absolute; inset: 0; display: none; }
#ke-touch .cluster { position: absolute; bottom: 18px; display: flex; gap: 12px; }
#ke-touch .cluster.left { left: 14px; }
#ke-touch .cluster.right { right: 84px; flex-direction: column-reverse; }
#ke-touch button {
  width: 64px; height: 64px; border-radius: 50%; font-size: 24px; padding: 0;
  opacity: 0.92; touch-action: none; user-select: none; -webkit-user-select: none;
}
#ke-touch .go { background: #7ba86a; }
#ke-touch .brake { background: ${POM}; color: ${PAPER}; }
`;

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

const STAMPS = {
  done: ['DELIVERED', 'done'],
  active: ['IN YOUR BOX', 'active'],
  ready: ['READY AT SHOP', 'ready'],
  pending: ['later today', 'pending'],
};

export function createUI(handlers) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const root = el('div');
  root.id = 'ke-ui';
  document.body.appendChild(root);

  // Start screen.
  const start = el('div');
  start.id = 'ke-start';
  start.innerHTML = `
    <h1>Kubideh Express</h1>
    <div class="subtitle">Behrouz is home for the summer, and the whole road is hungry.</div>
    <button class="go">Start your shift</button>
    <div class="pills">
      <button class="pill board-pill">Leaderboard</button>
      <button class="pill music-pill">Music: off</button>
    </div>
    <div class="foot">Ride gentle. Everyone out here knows your grandmother.</div>
  `;
  root.appendChild(start);
  start.querySelector('.go').addEventListener('click', () => handlers.onStart());
  start.querySelector('.board-pill').addEventListener('click', () => handlers.onOpenLeaderboard());
  const musicPill = start.querySelector('.music-pill');
  musicPill.addEventListener('click', () => {
    const on = handlers.onToggleMusic();
    musicPill.textContent = on ? 'Music: on' : 'Music: off';
  });

  // HUD.
  const hud = el('div');
  hud.id = 'ke-hud';
  hud.innerHTML = `
    <div class="panel" style="display:inline-block">
      <div class="day display">Day 1</div>
      <div class="progress">0 of 3 delivered</div>
    </div>
    <div class="panel coins mono">0 toman</div>
  `;
  root.appendChild(hud);

  // Radar.
  const radarWrap = el('div', 'panel');
  radarWrap.id = 'ke-radar';
  radarWrap.style.borderRadius = '50%';
  radarWrap.style.overflow = 'hidden';
  const radarCanvas = document.createElement('canvas');
  const RADAR = 128;
  radarCanvas.width = RADAR * 2;
  radarCanvas.height = RADAR * 2;
  radarCanvas.style.width = RADAR + 'px';
  radarCanvas.style.height = RADAR + 'px';
  radarWrap.appendChild(radarCanvas);
  root.appendChild(radarWrap);
  const rctx = radarCanvas.getContext('2d');

  // Right-side buttons: ticket book above the phone.
  const side = el('div');
  side.id = 'ke-side';
  side.innerHTML = `
    <button class="round book" title="Ticket book">&#128214;</button>
    <button class="round phone" title="Phone">&#9742;<span class="badge">1</span></button>
  `;
  root.appendChild(side);
  const phoneBtn = side.querySelector('.phone');
  const badge = side.querySelector('.badge');
  side.querySelector('.book').addEventListener('click', () => handlers.onToggleBook());
  phoneBtn.addEventListener('click', () => handlers.onPhoneTap());

  // Toasts.
  const toasts = el('div');
  toasts.id = 'ke-toasts';
  root.appendChild(toasts);

  // Dialogue card.
  const dialogue = el('div', 'panel');
  dialogue.id = 'ke-dialogue';
  root.appendChild(dialogue);
  let dialogueOpen = false;

  // Ticket book modal.
  const bookWrap = el('div', 'ke-modal-wrap');
  const book = el('div', 'panel ke-modal');
  book.id = 'ke-book';
  bookWrap.appendChild(book);
  root.appendChild(bookWrap);
  bookWrap.addEventListener('click', (e) => {
    if (e.target === bookWrap) handlers.onToggleBook();
  });

  // Day card modal.
  const dayWrap = el('div', 'ke-modal-wrap');
  const dayCard = el('div', 'panel ke-modal');
  dayCard.id = 'ke-day';
  dayWrap.appendChild(dayCard);
  root.appendChild(dayWrap);

  // Leaderboard modal.
  const boardWrap = el('div', 'ke-modal-wrap');
  const board = el('div', 'panel ke-modal');
  board.id = 'ke-board';
  boardWrap.appendChild(board);
  root.appendChild(boardWrap);
  boardWrap.addEventListener('click', (e) => {
    if (e.target === boardWrap) api.closeBoard();
  });

  // Touch controls.
  const touch = el('div');
  touch.id = 'ke-touch';
  touch.innerHTML = `
    <div class="cluster left">
      <button class="panel steer-left">&#9664;</button>
      <button class="panel steer-right">&#9654;</button>
    </div>
    <div class="cluster right">
      <button class="panel go">&#9650;</button>
      <button class="panel brake">&#9660;</button>
    </div>
  `;
  root.appendChild(touch);
  for (const [sel, key] of [
    ['.steer-left', 'left'],
    ['.steer-right', 'right'],
    ['.go', 'go'],
    ['.brake', 'brake'],
  ]) {
    const b = touch.querySelector(sel);
    const down = (e) => {
      e.preventDefault();
      handlers.onTouchInput(key, true);
    };
    const up = (e) => {
      e.preventDefault();
      handlers.onTouchInput(key, false);
    };
    b.addEventListener('pointerdown', down);
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('pointerleave', up);
  }

  const api = {
    hideStart() {
      start.style.display = 'none';
    },
    showPlayUI(touchToo) {
      hud.style.display = 'flex';
      radarWrap.style.display = 'block';
      side.style.display = 'flex';
      if (touchToo) touch.style.display = 'block';
    },
    setHud(day, done, target, coins) {
      hud.querySelector('.day').textContent = 'Day ' + day;
      hud.querySelector('.progress').textContent = done + ' of ' + target + ' delivered';
      hud.querySelector('.coins').textContent = coins + ' toman';
    },
    setBadge(n) {
      if (n > 0) {
        badge.style.display = 'flex';
        badge.textContent = String(n);
      } else {
        badge.style.display = 'none';
      }
    },
    ringPhone() {
      phoneBtn.classList.remove('ringing');
      void phoneBtn.offsetWidth;
      phoneBtn.classList.add('ringing');
    },
    toast(text, ms = 4200) {
      const t = el('div', 'ke-toast panel', text);
      toasts.appendChild(t);
      requestAnimationFrame(() => t.classList.add('show'));
      setTimeout(() => {
        t.classList.remove('show');
        setTimeout(() => t.remove(), 350);
      }, ms);
    },
    openDialogue(customer, onRespond) {
      dialogueOpen = true;
      dialogue.innerHTML = `
        <div class="head" style="background:${hexString(customer.color)}">
          <div class="name">${customer.name}</div>
          <div class="role">${customer.role}</div>
        </div>
        <div class="line">${customer.line}</div>
        <div class="responses"></div>
      `;
      const row = dialogue.querySelector('.responses');
      for (const r of customer.responses) {
        const b = el('button', '', r);
        b.addEventListener('click', () => {
          api.closeDialogue();
          onRespond(r);
        });
        row.appendChild(b);
      }
      dialogue.style.display = 'block';
      requestAnimationFrame(() => dialogue.classList.add('show'));
    },
    closeDialogue() {
      dialogueOpen = false;
      dialogue.classList.remove('show');
      setTimeout(() => {
        if (!dialogueOpen) dialogue.style.display = 'none';
      }, 260);
    },
    isDialogueOpen() {
      return dialogueOpen;
    },
    openBook(tickets) {
      const half = Math.ceil(tickets.length / 2);
      const page = (list) =>
        list
          .map(
            (t) => `
        <div class="ke-ticket">
          <div class="who">${t.name}</div>
          <div class="what">${t.items}</div>
          <span class="ke-stamp ${STAMPS[t.status][1]}">${STAMPS[t.status][0]}</span>
        </div>`
          )
          .join('');
      book.innerHTML = `
        <h2>Today's tickets</h2>
        <div class="spread">
          <div class="page left">${page(tickets.slice(0, half))}</div>
          <div class="page">${page(tickets.slice(half))}</div>
        </div>
      `;
      bookWrap.style.display = 'flex';
    },
    closeBook() {
      bookWrap.style.display = 'none';
    },
    isBookOpen() {
      return bookWrap.style.display === 'flex';
    },
    showDayCard({ day, coins, warmLine }) {
      dayCard.innerHTML = `
        <h2 class="big">Day ${day} complete</h2>
        <div class="warm">${warmLine}</div>
        <div class="toman mono">${coins} toman so far</div>
        <div class="row">
          <button class="next" style="background:${SAFFRON};color:${PAPER}">Start day ${day + 1}</button>
          <button class="lb">Leaderboard</button>
        </div>
      `;
      dayCard.querySelector('.next').addEventListener('click', () => {
        dayWrap.style.display = 'none';
        handlers.onNextDay();
      });
      dayCard.querySelector('.lb').addEventListener('click', () => handlers.onOpenLeaderboard());
      dayWrap.style.display = 'flex';
    },
    isDayCardOpen() {
      return dayWrap.style.display === 'flex';
    },
    openBoard(entries, name) {
      const rows = entries.length
        ? entries
            .map(
              (e, i) => `
        <tr><td class="mono">${i + 1}</td><td>${e.name}</td>
        <td class="score">${e.score} toman</td><td class="mono">day ${e.day}</td></tr>`
            )
            .join('')
        : '<tr><td colspan="4">No runs yet. The road is waiting.</td></tr>';
      board.innerHTML = `
        <h2>Leaderboard</h2>
        <div style="margin-bottom:10px">
          <label style="font-size:13px;font-weight:600">Your courier name</label>
          <input class="name" maxlength="16" value="${name.replace(/"/g, '&quot;')}" />
        </div>
        <table>
          <tr><th>#</th><th>Name</th><th>Toman</th><th>Day</th></tr>
          ${rows}
        </table>
        <div style="margin-top:12px"><button class="close">Close</button></div>
      `;
      board.querySelector('.close').addEventListener('click', () => api.closeBoard());
      board.querySelector('.name').addEventListener('change', (e) => {
        e.target.value = handlers.onNameChange(e.target.value);
      });
      boardWrap.style.display = 'flex';
    },
    closeBoard() {
      boardWrap.style.display = 'none';
    },
    // Replaces just the table rows, used after an async refresh from the
    // shared leaderboard so an in-progress name edit is not clobbered.
    updateBoardEntries(entries) {
      const table = board.querySelector('table');
      if (!table) return;
      const rows = entries.length
        ? entries
            .map(
              (e, i) => `
        <tr><td class="mono">${i + 1}</td><td>${e.name}</td>
        <td class="score">${e.score} toman</td><td class="mono">day ${e.day}</td></tr>`
            )
            .join('')
        : '<tr><td colspan="4">No runs yet. The road is waiting.</td></tr>';
      table.innerHTML = `<tr><th>#</th><th>Name</th><th>Toman</th><th>Day</th></tr>${rows}`;
    },
    isBoardOpen() {
      return boardWrap.style.display === 'flex';
    },
    anyModalOpen() {
      return api.isBookOpen() || api.isDayCardOpen() || api.isBoardOpen() || dialogueOpen;
    },
    // The bearing radar. The player is fixed at the center pointing up.
    // Each item: { nx, ny, dist, color, kind } where nx points to the
    // player's right and ny along the facing. kind is one of dot,
    // carried, carriedNear, home.
    drawRadar(items) {
      const s = RADAR * 2;
      const c = s / 2;
      rctx.clearRect(0, 0, s, s);
      rctx.fillStyle = 'rgba(242, 235, 218, 0.94)';
      rctx.beginPath();
      rctx.arc(c, c, c, 0, Math.PI * 2);
      rctx.fill();
      rctx.strokeStyle = 'rgba(35,32,28,0.18)';
      rctx.lineWidth = 2;
      for (const rr of [0.42, 0.74]) {
        rctx.beginPath();
        rctx.arc(c, c, c * rr, 0, Math.PI * 2);
        rctx.stroke();
      }
      const rim = c - 16;
      for (const it of items) {
        const rr = rim * (it.dist / (it.dist + 34));
        const x = c + it.nx * rr;
        const y = c - it.ny * rr;
        rctx.fillStyle = it.color;
        rctx.strokeStyle = INK;
        rctx.lineWidth = 3;
        if (it.kind === 'home') {
          rctx.save();
          rctx.translate(x, y);
          rctx.rotate(Math.PI / 4);
          rctx.fillRect(-7, -7, 14, 14);
          rctx.strokeRect(-7, -7, 14, 14);
          rctx.restore();
        } else if (it.kind === 'carried' || it.kind === 'carriedNear') {
          if (it.kind === 'carriedNear') {
            rctx.save();
            rctx.strokeStyle = 'rgba(217,138,61,0.9)';
            rctx.lineWidth = 4;
            rctx.beginPath();
            rctx.arc(x, y, 15, 0, Math.PI * 2);
            rctx.stroke();
            rctx.restore();
          }
          rctx.beginPath();
          rctx.arc(x, y, 9, 0, Math.PI * 2);
          rctx.fill();
          rctx.stroke();
        } else {
          rctx.beginPath();
          rctx.arc(x, y, 5, 0, Math.PI * 2);
          rctx.fill();
          rctx.lineWidth = 2;
          rctx.stroke();
        }
      }
      // The player wedge, fixed at center, pointing up.
      rctx.fillStyle = INK;
      rctx.beginPath();
      rctx.moveTo(c, c - 12);
      rctx.lineTo(c - 8, c + 9);
      rctx.lineTo(c + 8, c + 9);
      rctx.closePath();
      rctx.fill();
    },
  };

  return api;
}
