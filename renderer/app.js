'use strict';
/* =========================================================
   App — navigation, actions, palette, reminders, boot
   ========================================================= */

const NAV = [
  ['Plan', [['today', 'Today'], ['schedule', 'Schedule'], ['tasks', 'Tasks']]],
  ['Grow', [['habits', 'Habits'], ['goals', 'Goals'], ['books', 'Books'], ['journal', 'Journal'], ['focus', 'Focus']]],
  ['Life', [['money', 'Money'], ['notes', 'Notes'], ['review', 'Review']]]
];
const NAV_FLAT = NAV.flatMap(([, items]) => items);

function buildSide() {
  $('#side').innerHTML = `
    <div class="brand"><b>Dinchariya<i>.</i></b></div>
    <nav>${NAV.map(([g, items]) => `<div class="ngroup">${g}</div>${items.map(([v, l]) => `<button class="navbtn" data-nav="${v}" data-act="go" data-v="${v}">${icon(v, 18)}<span>${l}</span></button>`).join('')}`).join('')}</nav>
    <div class="sidefoot">
      <button class="navbtn" data-act="palette">${icon('search', 18)}<span>Quick find</span><kbd>Ctrl K</kbd></button>
      <button class="navbtn" data-nav="guide" data-act="go" data-v="guide">${icon('guide', 18)}<span>Guide</span><kbd>F1</kbd></button>
      <button class="navbtn" data-nav="settings" data-act="go" data-v="settings">${icon('settings', 18)}<span>Settings</span></button>
    </div>`;
}
function renderNav() { $$('[data-nav]').forEach((b) => b.classList.toggle('on', b.dataset.nav === UI.view)); }

function notify(title, body) { if (S.settings.notifications) { try { store.notify(title, body); } catch (e) { /* ignore */ } } }

/* ---------- actions ---------- */
const addHabit = (emoji, name, color) => S.habits.push({ id: uid(), name, emoji, color: color || COLORS[S.habits.length % COLORS.length], days: [0, 1, 2, 3, 4, 5, 6], created: dkey() });

Object.assign(A, {
  go: (el) => go(el.dataset.v),
  'modal-close': () => closeModal(),
  palette: () => openPalette(),
  noop: () => {},

  /* books */
  'book-new': () => openBook(),
  'book-edit': (el) => openBook(el.dataset.id),
  'b-tab': (el) => { UI.bTab = el.dataset.v; render(false); },
  'book-status': (el) => {
    const b = S.books.find((x) => x.id === el.dataset.id); if (!b) return;
    setBookStatus(b, el.dataset.v); persist(); render();
    if (b.status === 'read') setTimeout(() => openBook(b.id, true), 120);
  },
  'book-pages': (el) => {
    const b = S.books.find((x) => x.id === el.dataset.id); if (!b) return;
    const fin = setBookPage(b, (b.current || 0) + Number(el.dataset.v)); persist(); render();
    if (fin) { toast('Finished: ' + b.title); setTimeout(() => openBook(b.id, true), 120); }
  },

  /* guide */
  'guide-jump': (el) => {
    UI.guideAt = el.dataset.id;
    const sec = document.getElementById('g-' + el.dataset.id); if (sec && sec.scrollIntoView) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    $$('#gtoc button').forEach((b) => b.classList.toggle('on', b === el));
  },

  /* habits */
  hab: (el) => toggleHabit(el.dataset.id, el.dataset.d),
  'hab-new': () => openHabit(),
  'hab-edit': (el) => openHabit(el.dataset.id),
  'starter-habit': (el) => { const h = STARTER_HABITS[Number(el.dataset.i)]; if (h && !S.habits.some((x) => x.name === h[1])) addHabit(h[0], h[1]); persist(); render(); },
  'starter-habits': () => { STARTER_HABITS.forEach((h) => { if (!S.habits.some((x) => x.name === h[1])) addHabit(h[0], h[1]); }); persist(); render(); toast('Starter habits added'); },
  hweek: (el) => { const v = Number(el.dataset.v); UI.hWeek = v === 0 ? weekStartOf(dkey()) : addDays(UI.hWeek || weekStartOf(dkey()), v * 7); render(false); },

  /* schedule */
  'sched-mode': (el) => { UI.sched = el.dataset.v; UI._schedScrolled = null; render(false); },
  'sched-nav': (el) => { UI.date = addDays(UI.date, Number(el.dataset.v) * (UI.sched === 'week' ? 7 : 1)); UI._schedScrolled = null; render(false); },
  'sched-today': () => { UI.date = dkey(); UI._schedScrolled = null; render(false); },
  'sched-day': (el) => { UI.date = el.dataset.d; UI.sched = 'day'; UI._schedScrolled = null; render(false); },
  'ev-new': (el) => openEvent(null, el.dataset.d || (UI.view === 'schedule' ? UI.date : dkey())),
  'ev-new-at': (el) => openEvent(null, UI.date, Number(el.dataset.h) * 60),
  'ev-edit': (el) => openEvent(el.dataset.id),

  /* tasks */
  'task-toggle': (el) => { const x = S.tasks.find((q) => q.id === el.dataset.id); if (!x) return; x.done = !x.done; x.doneAt = x.done ? dkey() : ''; persist(); render(); },
  'task-edit': (el) => openTask(el.dataset.id),
  'task-add': () => {
    const t = $('#qt-title'); if (!t) return;
    if (!addTask(t.value, $('#qt-due').value, Number($('#qt-prio').value))) { toast('Write the task first.'); t.focus(); return; }
    const n = $('#qt-title'); if (n) n.focus();
  },
  'tasks-done-toggle': () => { UI.tDone = !UI.tDone; render(); },

  /* check-in */
  ci: (el) => { const d = el.dataset.d || dkey(), c = ciw(d), k = el.dataset.k, v = Number(el.dataset.v); if (c[k] === v) delete c[k]; else c[k] = v; persist(); render(); },
  sleep: (el) => { const c = ciw(), base = c.sleep ?? (Number(el.dataset.v) > 0 ? S.settings.sleepGoal - 0.5 : S.settings.sleepGoal + 0.5); c.sleep = clamp(base + Number(el.dataset.v), 0, 14); persist(); render(); },
  water: (el) => { const c = ciw(), v = Number(el.dataset.v); c.water = c.water === v ? v - 1 : v; persist(); render(); },

  /* goals */
  'goal-new': () => openGoalNew(),
  'goal-open': (el) => openGoal(el.dataset.id),
  'g-tab': (el) => { UI.gTab = el.dataset.v; render(false); },
  'ms-add': () => {
    const g = S.goals.find((x) => x.id === UI.goalId), i = $('#ms-new'); if (!g || !i || !i.value.trim()) return;
    g.milestones.push({ id: uid(), text: i.value.trim(), done: false }); persist(); openGoal(g.id); const n = $('#ms-new'); if (n) n.focus();
  },
  'ms-toggle': (el) => { const g = S.goals.find((x) => x.id === UI.goalId); const m = g && g.milestones.find((q) => q.id === el.dataset.id); if (!m) return; m.done = !m.done; persist(); openGoal(g.id); },
  'ms-del': (el) => { const g = S.goals.find((x) => x.id === UI.goalId); if (!g) return; g.milestones = g.milestones.filter((q) => q.id !== el.dataset.id); persist(); openGoal(g.id); },
  'num-step': (el) => { const g = S.goals.find((x) => x.id === UI.goalId); if (!g) return; g.current = Math.max(0, (Number(g.current) || 0) + Number(el.dataset.v)); persist(); openGoal(g.id); },
  'goal-complete': (el) => { const g = S.goals.find((x) => x.id === el.dataset.id); if (!g) return; g.done = !g.done; persist(); openGoal(g.id); },
  'goal-del': (el) => confirmBox('This goal and its milestones will be deleted. Linked tasks stay.', 'Delete goal', () => { S.tasks.forEach((t) => { if (t.goalId === el.dataset.id) t.goalId = ''; }); S.goals = S.goals.filter((g) => g.id !== el.dataset.id); persist(); render(); }),

  /* journal */
  'j-today': () => { UI.jDate = dkey(); go('journal'); },
  'j-nav': (el) => { const n = addDays(UI.jDate, Number(el.dataset.v)); if (n <= dkey()) { UI.jDate = n; render(false); } },
  'j-pick': (el) => { UI.jDate = el.dataset.d; if (UI.view !== 'journal') go('journal'); else render(false); },
  'j-prompt': () => { UI.jPrompt = (UI.jPrompt + 1 + Math.floor(Math.random() * (PROMPTS.length - 1))) % PROMPTS.length; const p = $('.prompt span'); if (p) p.textContent = PROMPTS[UI.jPrompt]; },

  /* focus */
  'f-preset': (el) => focusSet(el.dataset.mode, Number(el.dataset.m)),
  'f-toggle': () => focusToggle(),
  'f-reset': () => focusSet(FOC.mode, FOC.total / 60),

  /* money, notes, review */
  'exp-new': () => openExpense(),
  'exp-edit': (el) => openExpense(el.dataset.id),
  'm-nav': (el) => { const v = Number(el.dataset.v); if (v === 0) UI.mMonth = dkey().slice(0, 7); else { const [y, m] = UI.mMonth.split('-').map(Number); const d = new Date(y, m - 1 + v, 1); UI.mMonth = d.getFullYear() + '-' + pad(d.getMonth() + 1); } render(false); },
  'note-new': () => openNote(),
  'note-edit': (el) => openNote(el.dataset.id),
  'note-pin': (el) => { const n = S.notes.find((x) => x.id === el.dataset.id); if (n) { n.pinned = !n.pinned; persist(); const g = $('#notegrid'); if (g) g.innerHTML = noteGrid(); } },
  'r-nav': (el) => { const v = Number(el.dataset.v); UI.rWeek = v === 0 ? weekStartOf(dkey()) : addDays(UI.rWeek || weekStartOf(dkey()), v * 7); render(false); },

  /* settings & data */
  set: (el) => { const k = el.dataset.k; S.settings[k] = k === 'weekStart' ? Number(el.dataset.v) : el.dataset.v; persist(); applySettings(); render(); },
  'test-notify': () => { store.notify('Dinchariya', 'Reminders are working.'); toast('Test notification sent'); },
  export: async () => { try { const p = await store.exportData(JSON.stringify(S, null, 2)); if (p) toast('Backup saved'); } catch (e) { toast('Could not export'); } },
  import: async () => {
    try {
      const raw = await store.importData(); if (!raw) return;
      const d = JSON.parse(raw);
      if (!d || typeof d !== 'object' || !('habits' in d || 'tasks' in d || 'settings' in d)) { toast('That file is not a Dinchariya backup.'); return; }
      confirmBox('This replaces everything currently in the app with the backup.', 'Import backup', () => { S = mergeState(DEFAULT(), d); persist(true); applySettings(); render(false); toast('Backup imported'); });
    } catch (e) { toast('Could not read that file.'); }
  },
  folder: () => store.openFolder(),
  reset: () => confirmBox('All habits, tasks, journal entries, goals and settings will be erased from this computer.', 'Erase everything', () => { S = DEFAULT(); persist(true); applySettings(); go('today'); toast('All data erased'); })
});

function applySettings() {
  applyTheme();
  store.setPrefs({ closeToTray: S.settings.closeToTray, startOnLogin: S.settings.startOnLogin });
}

/* ---------- global event wiring ---------- */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
  const f = A[el.dataset.act]; if (f) f(el, e);
});

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset.ciText) { ciw()[t.dataset.ciText] = t.value; if (!t.value) delete ciw()[t.dataset.ciText]; persist(); }
  else if (t.dataset.jf !== undefined) jSet(t.dataset.jf, t.value);
  else if (t.dataset.jg !== undefined) jSet('grat', t.value, Number(t.dataset.jg));
  else if (t.dataset.rv) { const k = UI.rWeek; (S.reviews[k] || (S.reviews[k] = {}))[t.dataset.rv] = t.value; persist(); }
  else if (t.id === 'jq') { UI.jQ = t.value; $('#jlist').innerHTML = jListHtml(); }
  else if (t.id === 'bq') { UI.bQ = t.value; $('#booklist').innerHTML = bookList(); }
  else if (t.id === 'gq') { UI.guideQ = t.value; $('#garticle').innerHTML = guideArticle(); $('#gtoc').innerHTML = guideToc(); }
  else if (t.id === 'nq') { UI.nQ = t.value; $('#notegrid').innerHTML = noteGrid(); }
  else if (t.dataset.gf) { const g = S.goals.find((x) => x.id === UI.goalId); if (g) { g[t.dataset.gf] = t.value; persist(); } }
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.set) {
    const k = t.dataset.set; let v;
    if (t.type === 'checkbox') v = t.checked;
    else if (t.type === 'number') v = Number(t.value) || 0;
    else v = t.value;
    if (k === 'name') v = String(v).trim() || 'friend';
    S.settings[k] = v; persist(); applySettings();
  } else if (t.id === 'f-task') FOC.task = t.value;
  else if (t.id === 'bsrc') { UI.bSrc = t.value; $('#booklist').innerHTML = bookList(); }
  else if (t.dataset.bp) {
    const b = S.books.find((x) => x.id === t.dataset.bp); if (!b) return;
    const fin = setBookPage(b, t.value); persist(); render();
    if (fin) { toast('Finished: ' + b.title); setTimeout(() => openBook(b.id, true), 120); }
  }
  else if (t.dataset.gn) { const g = S.goals.find((x) => x.id === UI.goalId); if (g) { g[t.dataset.gn] = Number(t.value) || 0; persist(); openGoal(g.id); } }
  else if (t.dataset.gf === 'cat' || t.dataset.gf === 'deadline') { const g = S.goals.find((x) => x.id === UI.goalId); if (g) { openGoal(g.id); } }
});

document.addEventListener('keydown', (e) => {
  const t = e.target;
  if (e.key === 'Enter' && t.dataset && t.dataset.quick) {
    e.preventDefault();
    if (t.dataset.quick === 'task') { const p = parseQuick(t.value); if (addTask(p.title, p.due || dkey(), p.priority)) { toast(p.due && p.due !== dkey() ? 'Task added for ' + relDay(p.due).toLowerCase() : 'Task added'); const n = $('[data-quick="task"]'); if (n) n.focus(); } }
    else A['task-add']();
  } else if (e.key === 'Enter' && t.id === 'ms-new') { e.preventDefault(); A['ms-add'](); }
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); }
  else if (e.key === 'F1') { e.preventDefault(); closeModal(); go('guide'); }
  else if (e.key === 'Escape') { if ($('.pal')) closePalette(); else closeModal(); }
  else if (e.altKey && /^[0-9]$/.test(e.key)) { const n = e.key === '0' ? 9 : Number(e.key) - 1; if (NAV_FLAT[n]) { e.preventDefault(); closeModal(); go(NAV_FLAT[n][0]); } }
});

/* ---------- command palette ---------- */
function closePalette() { $$('.pal').forEach((p) => p.remove()); }
function paletteCommands() {
  return [
    ...NAV_FLAT.map(([v, l]) => ({ t: 'Go to ' + l, run: () => go(v) })),
    { t: 'Go to Guide', run: () => go('guide') },
    { t: 'Go to Settings', run: () => go('settings') },
    { t: 'New task', run: () => openTask() },
    { t: 'New habit', run: () => openHabit() },
    { t: 'New event', run: () => openEvent(null, dkey()) },
    { t: 'New goal', run: () => openGoalNew() },
    { t: 'New note', run: () => openNote() },
    { t: 'Add a book', run: () => openBook() },
    { t: 'Log an expense', run: () => openExpense() },
    { t: 'Write today’s journal', run: () => { UI.jDate = dkey(); go('journal'); } },
    { t: 'Start a 25 minute focus session', run: () => { focusSet('focus', 25); go('focus'); focusToggle(); } },
    { t: 'Export a backup', run: () => A.export() }
  ];
}
function openPalette() {
  closePalette(); closeModal();
  const ov = document.createElement('div');
  ov.className = 'overlay pal';
  ov.innerHTML = '<div class="palette"><input id="pq" placeholder="Go to a screen, add something, or type a task…" autocomplete="off"><div id="pl"></div></div>';
  document.body.appendChild(ov);
  const inp = $('#pq', ov), list = $('#pl', ov);
  let sel = 0, items = [];
  const draw = () => {
    const q = inp.value.trim(), ql = q.toLowerCase();
    items = [];
    if (q) {
      items.push({ t: `Add task: ${q}`, run: () => { const p = parseQuick(q); addTask(p.title, p.due, p.priority); toast('Task added'); } });
      items.push({ t: `Save as note: ${q}`, run: () => { S.notes.push({ id: uid(), text: q, color: '', pinned: false, created: Date.now() }); persist(); render(); toast('Note saved'); } });
    }
    items.push(...paletteCommands().filter((c) => !ql || c.t.toLowerCase().includes(ql)));
    items = items.slice(0, 10);
    sel = clamp(sel, 0, Math.max(0, items.length - 1));
    list.innerHTML = items.map((c, i) => `<button class="pitem ${i === sel ? 'on' : ''}" data-i="${i}">${esc(c.t)}</button>`).join('') || '<p class="muted small pad">Nothing matches.</p>';
  };
  const run = (i) => { const c = items[i]; closePalette(); if (c) c.run(); };
  inp.addEventListener('input', () => { sel = 0; draw(); });
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % items.length; draw(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + items.length) % items.length; draw(); }
    else if (e.key === 'Enter') { e.preventDefault(); run(sel); }
  });
  list.addEventListener('click', (e) => { const b = e.target.closest('.pitem'); if (b) run(Number(b.dataset.i)); });
  ov.addEventListener('mousedown', (e) => { if (e.target === ov) closePalette(); });
  draw(); inp.focus();
}

/* ---------- reminders ---------- */
function tick() {
  const now = new Date(), t = dkey(now), nm = now.getHours() * 60 + now.getMinutes();
  if (t !== UI._today) {
    UI._today = t; UI.date = t; UI.jDate = t; UI.hWeek = null; UI.rWeek = null; UI.mMonth = t.slice(0, 7);
    if (!$('.modal-ov')) render();
  }
  Object.keys(S.notified).forEach((k) => { if (k !== t) delete S.notified[k]; });
  const n = S.notified[t] || (S.notified[t] = {});
  let dirty = false;
  if (S.settings.notifications) {
    for (const ev of occurrences(t)) {
      if (typeof ev.remind !== 'number' || ev.remind < 0) continue;
      const start = toMin(ev.start), at = start - ev.remind, key = 'e' + ev.id;
      if (!n[key] && nm >= at && nm <= at + 10 && nm <= start + 5) {
        n[key] = 1; dirty = true;
        notify(ev.title, ev.remind ? `Starts in ${ev.remind} min, at ${fmtTime(ev.start)}` : `Starting now, ${fmtTime(ev.start)}`);
      }
    }
    const mm = toMin(S.settings.morningTime);
    if (!n.morning && nm >= mm && nm < mm + 180) {
      n.morning = 1; dirty = true;
      const h = dueHabits(t).length, tk = S.tasks.filter((x) => !x.done && x.due && x.due <= t).length, ev = occurrences(t).length;
      if (h || tk || ev) notify('Your day', `${h} habit${h === 1 ? '' : 's'}, ${tk} task${tk === 1 ? '' : 's'} due, ${ev} event${ev === 1 ? '' : 's'}.${(S.checkins[t] || {}).focus ? ' Focus: ' + S.checkins[t].focus : ''}`);
    }
    const em = toMin(S.settings.eveningTime);
    if (!n.evening && nm >= em && nm < em + 180) {
      n.evening = 1; dirty = true;
      const st = dayHabitStat(t), left = st.due - st.done, noJ = !jHasContent(S.journal[t]), noR = readingNow().length > 0 && !pagesOn(t);
      if (left > 0 || noJ || noR) notify('Evening check-in', [left > 0 ? `${left} habit${left === 1 ? '' : 's'} still open` : '', noJ ? 'today’s journal is empty' : '', noR ? 'no reading logged yet' : ''].filter(Boolean).join(', ') + '.');
    }
  }
  if (dirty) persist();
}

/* keep the Today/Schedule screens current without disturbing typing */
function softRefresh() {
  if (!['today', 'schedule'].includes(UI.view) || $('.modal-ov') || $('.pal')) return;
  const a = document.activeElement;
  if (a && a.matches('input,textarea,select')) return;
  render();
}

/* ---------- boot ---------- */
async function boot() {
  let raw = null;
  try { raw = await store.load(); } catch (e) { console.error(e); }
  S = DEFAULT();
  if (raw) { try { S = mergeState(DEFAULT(), JSON.parse(raw)); } catch (e) { console.error('Could not read saved data', e); } }
  UI._today = dkey();
  applyTheme(); buildSide(); render(false);
  store.setPrefs({ closeToTray: S.settings.closeToTray, startOnLogin: S.settings.startOnLogin });
  setInterval(focusTick, 500);
  setInterval(tick, 15000); tick();
  setInterval(softRefresh, 60000);
  store.onPalette(() => openPalette());
  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (S.settings.theme === 'auto') applyTheme(); });
  window.addEventListener('beforeunload', flush);
  window.addEventListener('blur', flush);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
}
boot();
