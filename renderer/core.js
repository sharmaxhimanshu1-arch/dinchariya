'use strict';
/* =========================================================
   Dinchariya — core: utils, state, storage, forms, modals
   ========================================================= */

/* ---------- storage bridge (Electron, with browser fallback) ---------- */
const store = window.api || {
  isElectron: false,
  load: async () => localStorage.getItem('dinchariya-data'),
  save: async (j) => { localStorage.setItem('dinchariya-data', j); return true; },
  notify: async (t, b) => { try { new Notification(t, { body: b }); } catch (e) { /* ignore */ } },
  setPrefs: async () => true,
  openFolder: async () => {},
  exportData: async (j) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([j], { type: 'application/json' }));
    a.download = 'dinchariya-backup.json';
    a.click();
    return 'downloaded';
  },
  importData: () => new Promise((res) => {
    const i = document.createElement('input');
    i.type = 'file'; i.accept = '.json';
    i.onchange = () => {
      const f = i.files[0]; if (!f) return res(null);
      const r = new FileReader(); r.onload = () => res(r.result); r.readAsText(f);
    };
    i.click();
  }),
  onPalette: () => {}
};

/* ---------- small utils ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const pad = (n) => String(n).padStart(2, '0');
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const dkey = (d = new Date()) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const parse = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (k, n) => { const d = parse(k); d.setDate(d.getDate() + n); return dkey(d); };
const dow = (k) => parse(k).getDay();
const toMin = (t) => { const [h, m] = (t || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
const fromMin = (m) => pad(Math.floor(m / 60) % 24) + ':' + pad(m % 60);
const fmtTime = (t) => { const [h, m] = t.split(':').map(Number); return ((h % 12) || 12) + ':' + pad(m) + ' ' + (h >= 12 ? 'PM' : 'AM'); };
const fmtH = (h) => ((h % 12) || 12) + ' ' + (h >= 12 && h < 24 ? 'PM' : 'AM');
const fmtDate = (k, o) => parse(k).toLocaleDateString('en-IN', o);
const nowMin = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sum = (a) => a.reduce((x, y) => x + y, 0);
const avg = (a) => (a.length ? sum(a) / a.length : 0);
const money = (n) => (S.settings.currency || '₹') + Math.round(n).toLocaleString('en-IN');

function relDay(k) {
  const t = dkey();
  if (k === t) return 'Today';
  if (k === addDays(t, 1)) return 'Tomorrow';
  if (k === addDays(t, -1)) return 'Yesterday';
  const diff = Math.round((parse(k) - parse(t)) / 864e5);
  if (diff > 0 && diff < 7) return fmtDate(k, { weekday: 'long' });
  return fmtDate(k, { day: 'numeric', month: 'short' });
}
function daysLeft(k) {
  const diff = Math.round((parse(k) - parse(dkey())) / 864e5);
  if (diff === 0) return 'due today';
  if (diff === 1) return '1 day left';
  if (diff > 1) return diff + ' days left';
  return Math.abs(diff) + (Math.abs(diff) === 1 ? ' day overdue' : ' days overdue');
}
const weekStartOf = (k) => addDays(k, -((dow(k) - S.settings.weekStart + 7) % 7));
const weekLabel = (ws) => fmtDate(ws, { day: 'numeric', month: 'short' }) + ' to ' + fmtDate(addDays(ws, 6), { day: 'numeric', month: 'short' });
const dayName = (k, style = 'short') => fmtDate(k, { weekday: style });

/* ---------- icons ---------- */
const ICONS = {
  today: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  habits: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  schedule: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  tasks: '<path d="M9 6h12M9 12h12M9 18h12M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',
  goals: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  journal: '<path d="M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z"/><path d="M8 4v16"/>',
  focus: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
  money: '<path d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 7l12-4v4M17 14h.01"/>',
  notes: '<path d="M5 3h14v12l-6 6H5z"/><path d="M13 21v-6h6"/>',
  review: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
  settings: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  chevL: '<path d="m15 6-6 6 6 6"/>',
  chevR: '<path d="m9 6 6 6-6 6"/>',
  flame: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  pin: '<path d="M12 17v5M8 3h8l-1 6 3 4H6l3-4z"/>',
  minus: '<path d="M5 12h14"/>',
  books: '<path d="M4 4h4v16H4zM10 4h4v16h-4z"/><path d="m16.5 5.5 3.5-1 3 14.5-3.5 1z"/>',
  guide: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8M12 17h.01"/>'
};
const icon = (n, s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

/* ---------- constants ---------- */
const CATS = { work: ['Work', '#2f6fdd'], personal: ['Personal', '#b7791f'], health: ['Health', '#1a8917'], learning: ['Learning', '#0e8f9c'], social: ['Social', '#c2416b'], other: ['Other', '#8a8a8a'] };
const catColor = (k) => (CATS[k] || CATS.other)[1];
const catName = (k) => (CATS[k] || CATS.other)[0];
const catChips = Object.entries(CATS).map(([k, [l, c]]) => [k, l, c]);
const COLORS = ['#1a8917', '#c2416b', '#2f6fdd', '#b7791f', '#7c4dcc', '#0e8f9c', '#d9622b', '#242424'];
const colorChips = COLORS.map((c) => [c, '', c]);
const EMOJIS = ['💧', '🏃', '📖', '🧘', '💪', '🥗', '😴', '✍️', '🎯', '🧠', '🚶', '🎸', '☀️', '🦷', '📵', '🌱'];
const emojiChips = EMOJIS.map((e) => [e, e]);
const MOODS = ['😞', '🙁', '😐', '🙂', '😄'];
const MOOD_L = ['Rough', 'Low', 'Okay', 'Good', 'Great'];
const PRIO = { 1: ['Low', '#8a8a8a'], 2: ['Medium', '#b7791f'], 3: ['High', '#c94a4a'] };
const EXP_CATS = ['Food', 'Transport', 'Bills', 'Shopping', 'Health', 'Fun', 'Learning', 'Other'];
const EXP_COL = { Food: '#b7791f', Transport: '#0e8f9c', Bills: '#2f6fdd', Shopping: '#c2416b', Health: '#1a8917', Fun: '#7c4dcc', Learning: '#d9622b', Other: '#8a8a8a' };
const NOTE_COL = ['', '#b7791f', '#c2416b', '#2f6fdd', '#1a8917', '#7c4dcc'];
const ACCENTS = [['#1a8917', 'Green'], ['#242424', 'Black'], ['#2f6fdd', 'Blue'], ['#c2416b', 'Rose'], ['#b7791f', 'Amber'], ['#7c4dcc', 'Violet']];
const DEFAULT_ACCENT = '#1a8917';
const STARTER_HABITS = [['💧', 'Drink 2 litres of water'], ['🚶', 'Walk for 30 minutes'], ['📖', 'Read 20 pages'], ['🧘', 'Meditate for 10 minutes'], ['😴', 'Sleep before 11:30 PM'], ['✍️', 'Write in the journal']];
const BOOK_ST = [['unread', 'Not read'], ['reading', 'Reading'], ['read', 'Read']];
const BOOK_GENRES = ['Fiction', 'Non-fiction', 'Poetry', 'Biography', 'Business', 'Self-growth', 'Tech', 'History', 'Comics', 'Other'];
const BOOK_SRC = [['own', 'I own it'], ['borrowed', 'Borrowed'], ['wish', 'Wishlist']];
const BOOK_FMT = [['paper', 'Paperback'], ['hard', 'Hardcover'], ['ebook', 'eBook'], ['audio', 'Audiobook']];
const BOOK_COLORS = ['#1a8917', '#2f6fdd', '#c2416b', '#b7791f', '#7c4dcc', '#0e8f9c', '#d9622b', '#3b3b3b'];
const PROMPTS = [
  'What is one thing you did today that you are proud of?',
  'What drained your energy today, and what gave it back?',
  'Who made your day easier, and have you told them?',
  'What did you learn today that you want to keep?',
  'What are you avoiding, and what is the smallest step toward it?',
  'Describe today in three words, then explain each.',
  'What would you do differently if you could replay today?',
  'What are you looking forward to tomorrow?',
  'Which moment today deserves to be remembered?',
  'What do you need more of this week? What do you need less of?',
  'What is something small that made you smile?',
  'If today were a chapter, what would its title be?'
];

/* ---------- state ---------- */
let S;
const UI = {
  view: 'today', date: dkey(), hWeek: null, sched: 'day', jDate: dkey(), jQ: '', jPrompt: Math.floor(Math.random() * PROMPTS.length),
  mMonth: dkey().slice(0, 7), nQ: '', rWeek: null, gTab: 'active', tDone: false, bTab: 'all', bQ: '', bSrc: '', guideQ: '', guideAt: 'start'
};
const VIEWS = {}, AFTER = {}, A = {};

const DATA_VERSION = 2;
const DEFAULT = () => ({
  v: DATA_VERSION,
  settings: {
    name: 'Himanshu', theme: 'light', accent: DEFAULT_ACCENT, weekStart: 1, currency: '₹', budget: 0, booksGoal: 12,
    waterGoal: 8, sleepGoal: 8, morningTime: '08:30', eveningTime: '21:30',
    notifications: true, startOnLogin: false, closeToTray: true
  },
  habits: [], habitLog: {}, tasks: [], events: [], journal: {}, goals: [], checkins: {},
  expenses: [], notes: [], reviews: {}, notified: {}, books: [], readLog: {}
});
function mergeState(base, d) {
  const o = { ...base, ...d };
  o.settings = { ...base.settings, ...((d && d.settings) || {}) };
  for (const k of ['habits', 'tasks', 'events', 'goals', 'expenses', 'notes', 'books']) if (!Array.isArray(o[k])) o[k] = [];
  for (const k of ['habitLog', 'journal', 'checkins', 'reviews', 'notified', 'readLog']) if (!o[k] || typeof o[k] !== 'object') o[k] = {};
  // data saved by the first version: move to the new look once, keep everything else
  if (!d || (Number(d.v) || 1) < DATA_VERSION) {
    o.settings.theme = base.settings.theme;
    if (!ACCENTS.some(([c]) => c === o.settings.accent)) o.settings.accent = DEFAULT_ACCENT;
  }
  o.v = DATA_VERSION;
  return o;
}
let saveTimer = null;
function persist(now = false) {
  clearTimeout(saveTimer);
  const go = () => { try { store.save(JSON.stringify(S)); } catch (e) { console.error(e); } };
  if (now) go(); else saveTimer = setTimeout(go, 350);
}
function flush() { if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; try { store.save(JSON.stringify(S)); } catch (e) { /* ignore */ } } }

const ciw = (d = dkey()) => S.checkins[d] || (S.checkins[d] = {});

/* ---------- domain helpers ---------- */
const activeHabits = () => S.habits.filter((h) => !h.archived);
const isDue = (h, d) => d >= h.created && h.days.includes(dow(d));
const dueHabits = (d) => activeHabits().filter((h) => isDue(h, d));
const isDone = (id, d) => (S.habitLog[d] || []).includes(id);
function streakOf(h) {
  const t = dkey(); let k = t, s = 0;
  for (let i = 0; i < 1500 && k >= h.created; i++) {
    if (h.days.includes(dow(k))) { if (isDone(h.id, k)) s++; else if (k !== t) break; }
    k = addDays(k, -1);
  }
  return s;
}
function bestStreak(h) {
  const t = dkey(); let k = h.created, cur = 0, best = 0;
  while (k <= t) {
    if (h.days.includes(dow(k))) { if (isDone(h.id, k)) { cur++; best = Math.max(best, cur); } else if (k !== t) cur = 0; }
    k = addDays(k, 1);
  }
  return best;
}
function rateOf(h, days = 30, end = dkey()) {
  let due = 0, done = 0;
  for (let i = 0; i < days; i++) { const k = addDays(end, -i); if (isDue(h, k)) { due++; if (isDone(h.id, k)) done++; } }
  return due ? Math.round((done / due) * 100) : 0;
}
function dayHabitStat(d) { const l = dueHabits(d); return { due: l.length, done: l.filter((h) => isDone(h.id, d)).length }; }
function toggleHabit(id, d) {
  const a = S.habitLog[d] || (S.habitLog[d] = []);
  const i = a.indexOf(id); if (i < 0) a.push(id); else a.splice(i, 1);
  if (!a.length) delete S.habitLog[d];
  persist(); render();
  if (d === dkey() && i < 0) { const st = dayHabitStat(d); if (st.due && st.done === st.due) toast('All habits done for today'); }
}

function occursOn(ev, d) {
  if (d < ev.date) return false;
  switch (ev.repeat) {
    case 'daily': return true;
    case 'weekdays': { const w = dow(d); return w >= 1 && w <= 5; }
    case 'weekly': return dow(d) === dow(ev.date);
    case 'monthly': return parse(d).getDate() === parse(ev.date).getDate();
    default: return d === ev.date;
  }
}
const occurrences = (d) => S.events.filter((e) => occursOn(e, d)).sort((a, b) => a.start.localeCompare(b.start));

function goalPct(g) {
  if (g.type === 'number') return g.target > 0 ? clamp(Math.round((g.current / g.target) * 100), 0, 100) : 0;
  const m = g.milestones || [];
  return m.length ? Math.round((m.filter((x) => x.done).length / m.length) * 100) : (g.done ? 100 : 0);
}
const goalDone = (g) => g.done || goalPct(g) >= 100;

/* ---------- books ---------- */
const bookColor = (b) => { let h = 7; for (const c of String(b.title || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return BOOK_COLORS[h % BOOK_COLORS.length]; };
const bookPct = (b) => (b.status === 'read' ? 100 : b.pages > 0 ? clamp(Math.round(((b.current || 0) / b.pages) * 100), 0, 100) : 0);
const pagesOn = (d) => S.readLog[d] || 0;
function logPages(n, d = dkey()) { if (n > 0) S.readLog[d] = (S.readLog[d] || 0) + n; }
function readStreak() {
  let k = dkey(), n = 0;
  if (!pagesOn(k)) k = addDays(k, -1);
  while (pagesOn(k) > 0 && n < 5000) { n++; k = addDays(k, -1); }
  return n;
}
const booksReadIn = (y) => S.books.filter((b) => b.status === 'read' && String(b.finishedOn || '').slice(0, 4) === String(y));
const readingNow = () => S.books.filter((b) => b.status === 'reading');
function bookEta(b) {
  if (b.status !== 'reading' || !(b.pages > 0) || !(b.current > 0) || !b.startedOn) return '';
  const days = Math.max(1, Math.round((parse(dkey()) - parse(b.startedOn)) / 864e5) + 1);
  const pace = b.current / days; if (pace <= 0) return '';
  const left = Math.max(1, Math.ceil((b.pages - b.current) / pace));
  return `About ${Math.max(1, Math.round(pace))} pages a day, so roughly ${left} ${left === 1 ? 'day' : 'days'} to go`;
}
/* returns true when this page finishes the book */
function setBookPage(b, page) {
  page = Math.max(0, Math.round(Number(page) || 0));
  if (b.pages > 0) page = Math.min(page, b.pages);
  const delta = page - (b.current || 0);
  b.current = page; if (delta > 0) logPages(delta);
  if (b.status === 'unread' && page > 0) { b.status = 'reading'; b.startedOn = b.startedOn || dkey(); }
  if (b.status === 'read' && b.pages > 0 && page < b.pages) { b.status = 'reading'; b.finishedOn = ''; }
  if (b.pages > 0 && page >= b.pages && b.status !== 'read') { b.status = 'read'; b.startedOn = b.startedOn || dkey(); b.finishedOn = dkey(); return true; }
  return false;
}
function setBookStatus(b, st) {
  if (b.status === st) return;
  b.status = st;
  if (st === 'unread') { b.current = 0; b.startedOn = ''; b.finishedOn = ''; }
  if (st === 'reading') { b.startedOn = b.startedOn || dkey(); b.finishedOn = ''; if (b.pages > 0 && b.current >= b.pages) b.current = 0; }
  if (st === 'read') { b.startedOn = b.startedOn || dkey(); b.finishedOn = b.finishedOn || dkey(); if (b.pages > 0) b.current = b.pages; }
}

/* ---------- toast ---------- */
let toastT;
function toast(msg) {
  const t = $('#toast'); if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ---------- modal & forms ---------- */
function closeModal() {
  $$('.modal-ov').forEach((o) => o.remove());
  if (UI.goalId) { UI.goalId = null; render(); }
}
function showModal(title, body, foot = '', cls = '') {
  closeModal();
  const ov = document.createElement('div');
  ov.className = 'overlay modal-ov';
  ov.innerHTML = `<div class="modal ${cls}" role="dialog" aria-modal="true"><div class="mhead"><h3>${title}</h3><button class="icon-btn" data-act="modal-close" aria-label="Close">${icon('x', 18)}</button></div><div class="mbody">${body}</div>${foot ? `<div class="mfoot">${foot}</div>` : ''}</div>`;
  ov.addEventListener('mousedown', (e) => { if (e.target === ov) closeModal(); });
  document.body.appendChild(ov);
  const f = $('input:not([type=hidden]):not([type=checkbox]),textarea', ov);
  if (f) setTimeout(() => f.focus(), 30);
  return ov;
}
function confirmBox(msg, okLabel, fn) {
  const m = showModal('Are you sure?', `<p class="muted">${msg}</p>`, `<span class="grow"></span><button class="btn ghost" data-act="modal-close">Cancel</button><button class="btn danger-solid" id="c-ok">${okLabel}</button>`, 'small');
  $('#c-ok', m).onclick = () => { closeModal(); fn(); };
}

function fieldHtml(f, val) {
  val = val ?? f.def ?? '';
  const L = `<span class="lbl">${f.label}</span>`;
  if (f.type === 'textarea') return `<label class="fld">${L}<textarea name="${f.key}" rows="${f.rows || 3}" placeholder="${esc(f.ph || '')}">${esc(val)}</textarea></label>`;
  if (f.type === 'select') return `<label class="fld">${L}<select name="${f.key}">${f.options.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
  if (f.type === 'chips') {
    const sel = f.multi ? String(val).split(',').filter((x) => x !== '') : [String(val)];
    return `<div class="fld">${L}<div class="chips" data-chips="${f.key}" ${f.multi ? 'data-multi="1"' : ''}><input type="hidden" name="${f.key}" value="${esc(f.multi ? sel.join(',') : val)}">${f.options.map(([v, l, c]) => `<button type="button" class="chip ${l === '' ? 'sw' : ''} ${sel.includes(String(v)) ? 'on' : ''}" data-val="${esc(v)}" ${c ? `style="--c:${c}"` : ''} ${l === '' ? `aria-label="${esc(v)}"` : ''}>${l}</button>`).join('')}</div></div>`;
  }
  return `<label class="fld">${L}<input name="${f.key}" type="${f.type || 'text'}" value="${esc(val)}" placeholder="${esc(f.ph || '')}" ${f.step ? `step="${f.step}"` : ''} ${f.min !== undefined ? `min="${f.min}"` : ''}></label>`;
}
function readForm(root) {
  const o = {};
  $$('[name]', root).forEach((el) => { o[el.name] = el.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value; });
  return o;
}
function openForm({ title, fields, values = {}, onSave, del, extra = [], saveLabel = 'Save', cls = '' }) {
  const body = `<form class="form" id="mform" autocomplete="off" onsubmit="return false">${fields.map((f) => (Array.isArray(f) ? `<div class="two">${f.map((g) => fieldHtml(g, values[g.key])).join('')}</div>` : fieldHtml(f, values[f.key]))).join('')}</form>`;
  const foot = `${del ? '<button type="button" class="btn danger" id="m-del">Delete</button>' : ''}${extra.map((x, i) => `<button type="button" class="btn" data-x="${i}">${x.label}</button>`).join('')}<span class="grow"></span><button type="button" class="btn ghost" data-act="modal-close">Cancel</button><button type="button" class="btn primary" id="m-save">${saveLabel}</button>`;
  const m = showModal(title, body, foot, cls);
  const save = () => { const r = onSave(readForm(m)); if (typeof r === 'string') { toast(r); return; } closeModal(); };
  $('#m-save', m).onclick = save;
  if (del) $('#m-del', m).onclick = () => confirmBox('This can’t be undone.', 'Delete', () => { del(); });
  extra.forEach((x, i) => { $(`[data-x="${i}"]`, m).onclick = () => { closeModal(); x.run(); }; });
  $('#mform', m).addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); save(); }
    if (e.key === 'Enter' && e.ctrlKey && e.target.tagName === 'TEXTAREA') { e.preventDefault(); save(); }
  });
  return m;
}

/* chip groups (forms) */
document.addEventListener('click', (e) => {
  const b = e.target.closest('.chips .chip[data-val]'); if (!b) return;
  const wrap = b.closest('[data-chips]'); const input = $('input[type=hidden]', wrap);
  if (wrap.dataset.multi) { b.classList.toggle('on'); input.value = $$('.chip.on', wrap).map((x) => x.dataset.val).join(','); }
  else { $$('.chip', wrap).forEach((x) => x.classList.toggle('on', x === b)); input.value = b.dataset.val; }
});

/* ---------- theme ---------- */
function applyTheme() {
  const s = S.settings; let th = s.theme;
  if (th === 'auto') th = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = th;
  let hex = /^#[0-9a-f]{6}$/i.test(s.accent) ? s.accent : DEFAULT_ACCENT;
  const lumOf = (h) => 0.299 * parseInt(h.slice(1, 3), 16) + 0.587 * parseInt(h.slice(3, 5), 16) + 0.114 * parseInt(h.slice(5, 7), 16);
  if (th === 'dark' && lumOf(hex) < 80) hex = '#e8e8e8'; // a black accent would vanish on dark
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  const st = document.documentElement.style;
  st.setProperty('--accent', hex);
  st.setProperty('--accent-ink', lumOf(hex) > 170 ? '#121212' : '#ffffff');
  st.setProperty('--accent-soft', `rgba(${r},${g},${b},.12)`);
  st.setProperty('--accent-line', `rgba(${r},${g},${b},.5)`);
}

/* ---------- render ---------- */
function render(keep = true) {
  const v = $('#view'); if (!v) return;
  const st = keep ? v.scrollTop : 0;
  v.innerHTML = (VIEWS[UI.view] || VIEWS.today)();
  v.scrollTop = st;
  if (AFTER[UI.view]) AFTER[UI.view]();
  renderNav();
}
function go(view) { UI.view = view; render(false); }
