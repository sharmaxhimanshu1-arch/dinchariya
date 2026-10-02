'use strict';
/* =========================================================
   Views B — Goals, Journal, Focus, Money, Notes, Review, Settings
   ========================================================= */

/* ---------- Goals ---------- */
function openGoalNew() {
  openForm({
    title: 'New goal',
    values: { type: 'milestones', cat: 'personal' },
    fields: [
      { key: 'title', label: 'Goal', ph: 'e.g. Publish my first book' },
      { key: 'type', label: 'Track progress by', type: 'chips', options: [['milestones', 'Milestones'], ['number', 'A number']] },
      { key: 'cat', label: 'Area', type: 'select', options: Object.entries(CATS).map(([k, [l]]) => [k, l]) },
      { key: 'deadline', label: 'Deadline (optional)', type: 'date' }
    ],
    saveLabel: 'Create goal',
    onSave: (v) => {
      if (!v.title.trim()) return 'Name the goal first.';
      const g = { id: uid(), title: v.title.trim(), why: '', cat: v.cat, type: v.type, deadline: v.deadline || '', milestones: [], current: 0, target: v.type === 'number' ? 10 : 0, unit: '', done: false, created: dkey() };
      S.goals.push(g); persist(); render();
      setTimeout(() => openGoal(g.id), 60);
    }
  });
}

function openGoal(id) {
  const g = S.goals.find((x) => x.id === id); if (!g) return;
  const pct = goalPct(g);
  const prog = `<div class="gprog"><div class="gl"><span>Progress</span><b>${pct}%</b></div>${bar(pct, catColor(g.cat))}</div>`;
  const detail = g.type === 'number'
    ? `<div class="three"><label class="fld"><span class="lbl">So far</span><input type="number" step="any" data-gn="current" value="${g.current ?? 0}"></label><label class="fld"><span class="lbl">Target</span><input type="number" step="any" data-gn="target" value="${g.target ?? 0}"></label><label class="fld"><span class="lbl">Unit</span><input data-gf="unit" value="${esc(g.unit || '')}" placeholder="books, km, ₹"></label></div><div class="tools"><button class="btn" data-act="num-step" data-v="-1">−1</button><button class="btn" data-act="num-step" data-v="1">+1</button><button class="btn" data-act="num-step" data-v="5">+5</button><button class="btn" data-act="num-step" data-v="10">+10</button></div>`
    : `<div class="fld"><span class="lbl">Milestones</span><div class="mslist">${(g.milestones || []).map((m) => `<div class="row"><button class="check ${m.done ? 'on' : ''}" data-act="ms-toggle" data-id="${m.id}">${m.done ? icon('check', 14) : ''}</button><span class="grow ${m.done ? 'strike' : ''}">${esc(m.text)}</span><button class="icon-btn" data-act="ms-del" data-id="${m.id}" aria-label="Remove">${icon('x', 14)}</button></div>`).join('') || '<p class="muted small">Break the goal into steps you can tick off.</p>'}</div><div class="addline"><input id="ms-new" placeholder="Add a milestone and press Enter"><button class="btn" data-act="ms-add">Add</button></div></div>`;
  const body = `<div class="form">
    <label class="fld"><span class="lbl">Goal</span><input data-gf="title" value="${esc(g.title)}"></label>
    <label class="fld"><span class="lbl">Why it matters</span><textarea data-gf="why" rows="2" placeholder="The reason you will remember on hard days">${esc(g.why || '')}</textarea></label>
    <div class="two"><label class="fld"><span class="lbl">Area</span><select data-gf="cat">${Object.entries(CATS).map(([k, [l]]) => `<option value="${k}" ${g.cat === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label><label class="fld"><span class="lbl">Deadline</span><input type="date" data-gf="deadline" value="${g.deadline || ''}"></label></div>
    ${prog}${detail}</div>`;
  const foot = `<button class="btn danger" data-act="goal-del" data-id="${g.id}">Delete</button><span class="grow"></span><button class="btn" data-act="goal-complete" data-id="${g.id}">${g.done ? 'Reopen goal' : 'Mark complete'}</button><button class="btn primary" data-act="modal-close">Done</button>`;
  showModal('Goal', body, foot, 'wide');
  UI.goalId = id;
}

VIEWS.goals = () => {
  const act = S.goals.filter((g) => !goalDone(g)), dn = S.goals.filter(goalDone);
  const list = UI.gTab === 'active' ? act : dn;
  const tools = `<div class="seg"><button class="${UI.gTab === 'active' ? 'on' : ''}" data-act="g-tab" data-v="active">Active ${act.length}</button><button class="${UI.gTab === 'done' ? 'on' : ''}" data-act="g-tab" data-v="done">Completed ${dn.length}</button></div><button class="btn primary" data-act="goal-new">${icon('plus', 16)} New goal</button>`;
  const card = (g) => {
    const p = goalPct(g), c = catColor(g.cat);
    const sub = g.type === 'number' ? `${g.current ?? 0} of ${g.target ?? 0} ${esc(g.unit || '')}` : `${(g.milestones || []).filter((m) => m.done).length} of ${(g.milestones || []).length} milestones`;
    const open = S.tasks.filter((x) => !x.done && x.goalId === g.id).length;
    return `<div class="gcard" data-act="goal-open" data-id="${g.id}" style="--c:${c}"><div class="gtop"><span class="pill" style="--c:${c}">${catName(g.cat)}</span>${g.deadline ? `<span class="muted small">${daysLeft(g.deadline)}</span>` : ''}</div><h3>${esc(g.title)}</h3>${g.why ? `<p class="muted small clamp">${esc(g.why)}</p>` : ''}<div class="gl"><span class="muted small">${sub}${open ? `, ${open} open task${open > 1 ? 's' : ''}` : ''}</span><b>${p}%</b></div>${bar(p, c)}</div>`;
  };
  return head('Goals', 'What you are building toward.', tools) +
    (list.length ? `<div class="gridcards">${list.map(card).join('')}</div>` : empty(UI.gTab === 'active' ? 'No active goals yet. A good goal has a deadline and a few clear steps.' : 'Completed goals will show up here.', UI.gTab === 'active' ? '<button class="btn primary" data-act="goal-new">Set your first goal</button>' : ''));
};

/* ---------- Journal ---------- */
const jHasContent = (e) => e && (((e.text || '').trim()) || ((e.highlight || '').trim()) || (e.grat || []).some((x) => (x || '').trim()));
const wordCount = (s) => ((s || '').trim().match(/\S+/g) || []).length;
function journalStreak() {
  let k = dkey(), n = 0;
  if (!jHasContent(S.journal[k])) k = addDays(k, -1);
  while (jHasContent(S.journal[k])) { n++; k = addDays(k, -1); }
  return n;
}
function jListHtml() {
  const q = UI.jQ.trim().toLowerCase();
  const keys = Object.keys(S.journal).filter((k) => jHasContent(S.journal[k])).sort().reverse()
    .filter((k) => { if (!q) return true; const e = S.journal[k]; return [e.text, e.highlight, ...(e.grat || [])].join(' ').toLowerCase().includes(q); });
  if (!keys.length) return `<p class="muted small pad">${q ? 'No entries match.' : 'Entries you write will appear here.'}</p>`;
  return keys.map((k) => {
    const e = S.journal[k], mood = (S.checkins[k] || {}).mood;
    const snip = (e.text || e.highlight || (e.grat || []).find(Boolean) || '').replace(/\s+/g, ' ').slice(0, 90);
    return `<button class="jitem ${k === UI.jDate ? 'on' : ''}" data-act="j-pick" data-d="${k}"><span class="jd">${fmtDate(k, { day: 'numeric', month: 'short' })}<small>${dayName(k)}</small></span><span class="js">${mood ? MOODS[mood - 1] + ' ' : ''}${esc(snip)}</span></button>`;
  }).join('');
}
VIEWS.journal = () => {
  const d = UI.jDate, e = S.journal[d] || {}, ci = S.checkins[d] || {}, t = dkey();
  const grat = e.grat || ['', '', ''];
  const d0 = parse(d), past = [];
  for (let y = 1; y <= 5; y++) { const k = (d0.getFullYear() - y) + '-' + pad(d0.getMonth() + 1) + '-' + pad(d0.getDate()); if (jHasContent(S.journal[k])) past.push(k); }
  const st = journalStreak();
  return head('Journal', st ? `${st}-day writing streak` : 'A few lines a day add up.', '') + `
  <div class="jgrid">
    <div class="panel jlist"><div class="search">${icon('search', 15)}<input id="jq" placeholder="Search entries" value="${esc(UI.jQ)}"></div><div id="jlist">${jListHtml()}</div></div>
    <div class="panel jed">
      <div class="jhead"><h2>${fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h2><div class="tools"><button class="icon-btn" data-act="j-nav" data-v="-1" aria-label="Previous day">${icon('chevL')}</button><button class="btn" data-act="j-today">Today</button><button class="icon-btn" data-act="j-nav" data-v="1" ${d >= t ? 'disabled' : ''} aria-label="Next day">${icon('chevR')}</button></div></div>
      <div class="fld"><span class="lbl">How was the day?</span><div class="moods">${MOODS.map((m, i) => `<button class="mood ${ci.mood === i + 1 ? 'on' : ''}" data-act="ci" data-k="mood" data-v="${i + 1}" data-d="${d}" title="${MOOD_L[i]}">${m}</button>`).join('')}</div></div>
      <div class="fld"><span class="lbl">Grateful for</span>${[0, 1, 2].map((i) => `<input class="grat" data-jg="${i}" value="${esc(grat[i] || '')}" placeholder="${['Something small', 'Someone', 'Something you did'][i]}">`).join('')}</div>
      <label class="fld"><span class="lbl">Highlight of the day</span><input data-jf="highlight" value="${esc(e.highlight || '')}" placeholder="The one moment worth keeping"></label>
      <div class="fld"><span class="lbl">Write freely</span>
        <div class="prompt"><span>${PROMPTS[UI.jPrompt]}</span><button class="link" data-act="j-prompt">Another prompt</button></div>
        <textarea data-jf="text" rows="11" placeholder="Write whatever comes. No one is grading this.">${esc(e.text || '')}</textarea>
        <div class="wc" id="wc">${wordCount(e.text)} words</div>
      </div>
      ${past.length ? `<div class="onthisday"><h4>On this day</h4>${past.map((k) => `<div class="otd" data-act="j-pick" data-d="${k}"><b>${parse(k).getFullYear()}</b><span>${esc(((S.journal[k].text || S.journal[k].highlight || '')).slice(0, 140))}</span></div>`).join('')}</div>` : ''}
    </div>
  </div>`;
};
function jSet(field, value, idx) {
  const d = UI.jDate, e = S.journal[d] || (S.journal[d] = {});
  if (field === 'grat') { e.grat = e.grat || ['', '', '']; e.grat[idx] = value; } else e[field] = value;
  e.updated = Date.now();
  if (!jHasContent(e)) delete S.journal[d];
  persist();
  const wc = $('#wc'); if (wc) wc.textContent = wordCount((S.journal[d] || {}).text) + ' words';
  const jl = $('#jlist'); if (jl) jl.innerHTML = jListHtml();
}

/* ---------- Focus ---------- */
const FOC = { mode: 'focus', total: 1500, remaining: 1500, endAt: 0, running: false, task: '' };
const FOC_C = 2 * Math.PI * 96;
const fmtClock = (s) => pad(Math.floor(s / 60)) + ':' + pad(s % 60);
function paintFocus() {
  const el = $('#fTime'); if (el) el.textContent = fmtClock(FOC.remaining);
  const r = $('#fRing'); if (r) r.style.strokeDashoffset = String(FOC_C * (1 - FOC.remaining / FOC.total));
  document.title = FOC.running ? fmtClock(FOC.remaining) + ' | Dinchariya' : 'Dinchariya';
}
VIEWS.focus = () => {
  const t = dkey(), ci = S.checkins[t] || {};
  const open = S.tasks.filter((x) => !x.done).sort(prioSort).slice(0, 40);
  const wk = Array.from({ length: 7 }, (_, i) => { const d = addDays(t, i - 6); return { d, m: (S.checkins[d] || {}).focusMin || 0 }; });
  const mx = Math.max(60, ...wk.map((x) => x.m));
  const pre = (mode, m, label) => `<button class="${FOC.mode === mode && FOC.total === m * 60 ? 'on' : ''}" data-act="f-preset" data-mode="${mode}" data-m="${m}">${label}</button>`;
  return head('Focus', 'One thing at a time.', '') + `
  <div class="focuswrap">
    <div class="panel fpanel">
      <div class="seg wide">${pre('focus', 25, 'Focus 25')}${pre('focus', 50, 'Focus 50')}${pre('focus', 90, 'Focus 90')}${pre('break', 5, 'Break 5')}${pre('break', 15, 'Break 15')}</div>
      <div class="ringbox"><svg viewBox="0 0 220 220" width="300" height="300"><circle cx="110" cy="110" r="96" class="rbg"/><circle id="fRing" cx="110" cy="110" r="96" class="rfg ${FOC.mode}" stroke-dasharray="${FOC_C}" stroke-dashoffset="${FOC_C * (1 - FOC.remaining / FOC.total)}" transform="rotate(-90 110 110)"/></svg><div class="rtime"><b id="fTime">${fmtClock(FOC.remaining)}</b><span>${FOC.mode === 'focus' ? 'Focus' : 'Break'}</span></div></div>
      <div class="tools center"><button class="btn primary big" data-act="f-toggle">${FOC.running ? icon('pause', 18) + ' Pause' : icon('play', 18) + ' ' + (FOC.remaining < FOC.total ? 'Resume' : 'Start')}</button><button class="btn" data-act="f-reset">${icon('reset', 16)} Reset</button></div>
      <label class="fld ftask"><span class="lbl">Working on</span><select id="f-task"><option value="">Nothing specific</option>${open.map((x) => `<option value="${x.id}" ${FOC.task === x.id ? 'selected' : ''}>${esc(x.title)}</option>`).join('')}</select></label>
    </div>
    <div class="col">
      <div class="panel"><div class="ph"><h3>Today</h3></div><div class="bigstat"><b>${ci.focusMin || 0}</b><span>minutes</span></div><p class="muted small">${ci.sessions || 0} focus session${(ci.sessions || 0) === 1 ? '' : 's'} finished</p></div>
      <div class="panel"><div class="ph"><h3>Last 7 days</h3></div><div class="minibars">${wk.map((x) => `<div class="mb"><div class="mbar"><i style="height:${(x.m / mx) * 100}%" title="${x.m} min"></i></div><small>${dayName(x.d).slice(0, 2)}</small></div>`).join('')}</div></div>
    </div>
  </div>`;
};
function focusSet(mode, m) {
  FOC.mode = mode; FOC.total = m * 60; FOC.remaining = FOC.total; FOC.running = false; FOC.endAt = 0;
  document.title = 'Dinchariya'; if (UI.view === 'focus') render();
}
function focusToggle() {
  if (FOC.running) { FOC.running = false; FOC.remaining = Math.max(0, Math.round((FOC.endAt - Date.now()) / 1000)); }
  else { if (FOC.remaining <= 0) FOC.remaining = FOC.total; FOC.running = true; FOC.endAt = Date.now() + FOC.remaining * 1000; }
  if (UI.view === 'focus') render(); paintFocus();
}
function focusDone() {
  FOC.running = false;
  if (FOC.mode === 'focus') {
    const c = ciw(); c.focusMin = (c.focusMin || 0) + Math.round(FOC.total / 60); c.sessions = (c.sessions || 0) + 1; persist();
    notify('Focus session complete', 'Nice work. Take a short break.');
    FOC.mode = 'break'; FOC.total = 300;
  } else {
    notify('Break is over', 'Ready for the next focus session?');
    FOC.mode = 'focus'; FOC.total = 1500;
  }
  FOC.remaining = FOC.total; document.title = 'Dinchariya';
  if (UI.view === 'focus') render();
}
function focusTick() {
  if (!FOC.running) return;
  FOC.remaining = Math.max(0, Math.round((FOC.endAt - Date.now()) / 1000));
  paintFocus();
  if (FOC.remaining <= 0) focusDone();
}

/* ---------- Money ---------- */
function openExpense(id) {
  const x = id ? S.expenses.find((e) => e.id === id) : null;
  openForm({
    title: x ? 'Edit expense' : 'Log expense',
    values: x || { date: dkey(), cat: 'Food' },
    fields: [
      { key: 'amt', label: 'Amount', type: 'number', step: 'any', min: 0, ph: '0' },
      { key: 'cat', label: 'Category', type: 'chips', options: EXP_CATS.map((c) => [c, c, EXP_COL[c]]) },
      { key: 'note', label: 'Note', ph: 'Optional' },
      { key: 'date', label: 'Date', type: 'date' }
    ],
    del: x ? () => { S.expenses = S.expenses.filter((e) => e.id !== x.id); closeModal(); persist(); render(); } : null,
    onSave: (v) => {
      if (!(v.amt > 0)) return 'Enter an amount above zero.';
      const rec = { amt: v.amt, cat: v.cat, note: v.note, date: v.date || dkey() };
      if (x) Object.assign(x, rec); else S.expenses.push({ id: uid(), ...rec });
      persist(); render();
    }
  });
}
const monthLabel = (m) => new Date(Number(m.slice(0, 4)), Number(m.slice(5)) - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
VIEWS.money = () => {
  const m = UI.mMonth, list = S.expenses.filter((e) => e.date.startsWith(m)).sort((a, b) => b.date.localeCompare(a.date));
  const total = sum(list.map((e) => e.amt)), budget = S.settings.budget || 0;
  const by = {}; list.forEach((e) => { by[e.cat] = (by[e.cat] || 0) + e.amt; });
  const cats = Object.entries(by).sort((a, b) => b[1] - a[1]);
  const isNow = m === dkey().slice(0, 7), dim = new Date(Number(m.slice(0, 4)), Number(m.slice(5)), 0).getDate();
  const elapsed = isNow ? new Date().getDate() : dim;
  const groups = {}; list.forEach((e) => (groups[e.date] = groups[e.date] || []).push(e));
  const tools = `<button class="icon-btn" data-act="m-nav" data-v="-1" aria-label="Previous month">${icon('chevL')}</button><button class="btn" data-act="m-nav" data-v="0">This month</button><button class="icon-btn" data-act="m-nav" data-v="1" aria-label="Next month">${icon('chevR')}</button><button class="btn primary" data-act="exp-new">${icon('plus', 16)} Log expense</button>`;
  return head('Money', monthLabel(m), tools) + `
  <div class="moneywrap">
    <div class="col">
      <div class="panel"><div class="ph"><h3>Spent</h3></div><div class="bigstat"><b>${money(total)}</b>${budget ? `<span>of ${money(budget)} budget</span>` : ''}</div>${budget ? bar((total / budget) * 100, total > budget ? 'var(--bad)' : '') : ''}<p class="muted small">${list.length ? `About ${money(total / Math.max(1, elapsed))} a day` : 'Nothing logged this month.'}${budget ? (total > budget ? `. ${money(total - budget)} over budget.` : `. ${money(budget - total)} left.`) : ''}</p></div>
      <div class="panel"><div class="ph"><h3>By category</h3></div>${cats.length ? cats.map(([c, v]) => `<div class="grow-row"><div class="gl"><span>${c}</span><b>${money(v)}</b></div>${bar((v / total) * 100, EXP_COL[c])}</div>`).join('') : empty('No spending yet.')}${!budget ? '<p class="muted small">Set a monthly budget in Settings to track it here.</p>' : ''}</div>
    </div>
    <div class="panel"><div class="ph"><h3>Transactions</h3><span class="muted small">${list.length}</span></div>${Object.keys(groups).length ? Object.keys(groups).sort().reverse().map((d) => `<div class="dgroup">${relDay(d)}, ${fmtDate(d, { day: 'numeric', month: 'short' })}</div>${groups[d].map((e) => `<div class="row" data-act="exp-edit" data-id="${e.id}"><span class="dot" style="background:${EXP_COL[e.cat] || '#8f96b8'}"></span><span class="grow">${esc(e.note || e.cat)}<small class="muted"> ${e.note ? esc(e.cat) : ''}</small></span><b>${money(e.amt)}</b></div>`).join('')}`).join('') : empty('Log your first expense.', '<button class="btn primary" data-act="exp-new">Log expense</button>')}</div>
  </div>`;
};

/* ---------- Notes ---------- */
function noteGrid() {
  const q = UI.nQ.trim().toLowerCase();
  const list = S.notes.filter((n) => !q || n.text.toLowerCase().includes(q)).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.created - a.created);
  if (!list.length) return empty(q ? 'No notes match.' : 'Capture anything you do not want to forget.', q ? '' : '<button class="btn primary" data-act="note-new">New note</button>');
  return `<div class="notes">${list.map((n) => `<div class="note" style="${n.color ? `--c:${n.color}` : ''}" data-act="note-edit" data-id="${n.id}"><button class="pinbtn ${n.pinned ? 'on' : ''}" data-act="note-pin" data-id="${n.id}" aria-label="Pin note">${icon('pin', 14)}</button><p>${esc(n.text)}</p><small>${fmtDate(dkey(new Date(n.created)), { day: 'numeric', month: 'short' })}</small></div>`).join('')}</div>`;
}
function openNote(id) {
  const n = id ? S.notes.find((x) => x.id === id) : null;
  openForm({
    title: n ? 'Edit note' : 'New note',
    values: n || { color: '' },
    fields: [
      { key: 'text', label: 'Note', type: 'textarea', rows: 8, ph: 'Write anything. Ctrl+Enter to save.' },
      { key: 'color', label: 'Label', type: 'chips', options: NOTE_COL.map((c) => [c, c ? '' : 'None', c]) }
    ],
    del: n ? () => { S.notes = S.notes.filter((x) => x.id !== n.id); closeModal(); persist(); render(); } : null,
    onSave: (v) => {
      if (!v.text.trim()) return 'Write something first.';
      if (n) { n.text = v.text; n.color = v.color; } else S.notes.push({ id: uid(), text: v.text, color: v.color, pinned: false, created: Date.now() });
      persist(); render();
    }
  });
}
VIEWS.notes = () => head('Notes', 'Quick capture for ideas, lines and lists.', `<button class="btn primary" data-act="note-new">${icon('plus', 16)} New note</button>`) +
  `<div class="search wide">${icon('search', 15)}<input id="nq" placeholder="Search notes" value="${esc(UI.nQ)}"></div><div id="notegrid">${noteGrid()}</div>`;

/* ---------- Review ---------- */
VIEWS.review = () => {
  const ws = UI.rWeek || (UI.rWeek = weekStartOf(dkey())), t = dkey();
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i)), past = days.filter((d) => d <= t);
  const rv = S.reviews[ws] || {};
  const hp = days.map((d) => { const s = dayHabitStat(d); return d > t || !s.due ? null : Math.round((s.done / s.due) * 100); });
  const moods = days.map((d) => (S.checkins[d] || {}).mood || 0);
  const focus = days.map((d) => (S.checkins[d] || {}).focusMin || 0);
  const tasksDone = S.tasks.filter((x) => x.done && days.includes(x.doneAt)).length;
  const jDays = past.filter((d) => jHasContent(S.journal[d])).length;
  const moodVals = moods.filter(Boolean), sleepVals = past.map((d) => (S.checkins[d] || {}).sleep).filter(Boolean), waterVals = past.map((d) => (S.checkins[d] || {}).water).filter((x) => x !== undefined);
  const spent = sum(S.expenses.filter((e) => days.includes(e.date)).map((e) => e.amt));
  const hv = hp.filter((x) => x !== null);
  const stat = (l, v, s = '') => `<div class="rstat"><span class="sl">${l}</span><b>${v}</b><span class="ss">${s}</span></div>`;
  const chart = (vals, max, fmt, color) => `<div class="minibars tall">${vals.map((v, i) => `<div class="mb"><div class="mbar"><i style="height:${v ? (v / max) * 100 : 0}%;${color ? `background:${color}` : ''}" title="${fmt(v)}"></i></div><small>${dayName(days[i]).slice(0, 2)}</small></div>`).join('')}</div>`;
  const hrows = activeHabits().map((h) => {
    let due = 0, done = 0; days.forEach((d) => { if (d <= t && isDue(h, d)) { due++; if (isDone(h.id, d)) done++; } });
    return due ? `<div class="grow-row"><div class="gl"><span>${h.emoji} ${esc(h.name)}</span><b>${done}/${due}</b></div>${bar((done / due) * 100, h.color)}</div>` : '';
  }).join('');
  const tools = `<button class="icon-btn" data-act="r-nav" data-v="-1" aria-label="Previous week">${icon('chevL')}</button><button class="btn" data-act="r-nav" data-v="0">This week</button><button class="icon-btn" data-act="r-nav" data-v="1" aria-label="Next week">${icon('chevR')}</button>`;
  return head('Weekly review', weekLabel(ws), tools) + `
  <div class="rstats">
    ${stat('Habits', hv.length ? Math.round(avg(hv)) + '%' : '—', 'average completion')}
    ${stat('Tasks finished', tasksDone)}
    ${stat('Journal', jDays + '/' + Math.max(past.length, 1), 'days written')}
    ${stat('Mood', moodVals.length ? MOODS[Math.round(avg(moodVals)) - 1] : '—', moodVals.length ? MOOD_L[Math.round(avg(moodVals)) - 1] + ' on average' : 'no check-ins')}
    ${stat('Sleep', sleepVals.length ? avg(sleepVals).toFixed(1) + ' h' : '—', 'goal ' + S.settings.sleepGoal + ' h')}
    ${stat('Water', waterVals.length ? avg(waterVals).toFixed(1) : '—', 'glasses a day')}
    ${stat('Focus', sum(focus) + ' min')}
    ${stat('Reading', sum(days.map(pagesOn)) + ' pages', S.books.filter((b) => b.status === 'read' && days.includes(b.finishedOn)).length + ' finished')}
    ${stat('Spent', money(spent))}
  </div>
  <div class="cols">
    <div class="col">
      <div class="panel"><div class="ph"><h3>Habits by day</h3></div>${chart(hp.map((x) => x || 0), 100, (v) => v + '%')}</div>
      <div class="panel"><div class="ph"><h3>Mood by day</h3></div>${chart(moods, 5, (v) => (v ? MOOD_L[v - 1] : 'No check-in'), 'var(--good)')}</div>
      <div class="panel"><div class="ph"><h3>Habit by habit</h3></div>${hrows || empty('No habit data for this week.')}</div>
    </div>
    <div class="col">
      <div class="panel"><div class="ph"><h3>Reflect</h3></div>
        <label class="fld"><span class="lbl">What went well?</span><textarea data-rv="well" rows="4">${esc(rv.well || '')}</textarea></label>
        <label class="fld"><span class="lbl">What should change?</span><textarea data-rv="better" rows="4">${esc(rv.better || '')}</textarea></label>
        <label class="fld"><span class="lbl">Focus for next week</span><textarea data-rv="next" rows="3">${esc(rv.next || '')}</textarea></label>
      </div>
    </div>
  </div>`;
};

/* ---------- Settings ---------- */
VIEWS.settings = () => {
  const s = S.settings;
  const row = (label, desc, ctl) => `<div class="setrow"><div><b>${label}</b>${desc ? `<small>${desc}</small>` : ''}</div><div class="ctl">${ctl}</div></div>`;
  const sw = (k) => `<label class="switch"><input type="checkbox" data-set="${k}" ${s[k] ? 'checked' : ''}><span></span></label>`;
  const inp = (k, type = 'text', extra = '') => `<input data-set="${k}" type="${type}" value="${esc(s[k])}" ${extra}>`;
  return head('Settings', '', '') + `
  <div class="panel"><div class="ph"><h3>You</h3></div>
    ${row('Your name', 'Used in the greeting.', inp('name'))}
  </div>
  <div class="panel"><div class="ph"><h3>Appearance</h3></div>
    ${row('Theme', '', `<div class="seg">${['light', 'dark', 'auto'].map((v) => `<button class="${s.theme === v ? 'on' : ''}" data-act="set" data-k="theme" data-v="${v}">${v[0].toUpperCase() + v.slice(1)}</button>`).join('')}</div>`)}
    ${row('Accent colour', '', `<div class="swatches">${ACCENTS.map(([c, n]) => `<button class="swatch ${s.accent === c ? 'on' : ''}" style="--c:${c}" title="${n}" aria-label="${n}" data-act="set" data-k="accent" data-v="${c}"></button>`).join('')}</div>`)}
    ${row('Week starts on', '', `<div class="seg">${[[1, 'Monday'], [0, 'Sunday']].map(([v, l]) => `<button class="${s.weekStart === v ? 'on' : ''}" data-act="set" data-k="weekStart" data-v="${v}">${l}</button>`).join('')}</div>`)}
  </div>
  <div class="panel"><div class="ph"><h3>Reminders</h3></div>
    ${row('Notifications', 'Event reminders, a morning plan and an evening nudge.', sw('notifications'))}
    ${row('Morning plan', 'Summary of your day.', inp('morningTime', 'time'))}
    ${row('Evening check-in', 'Only if habits or the journal are still open.', inp('eveningTime', 'time'))}
    ${row('Test it', 'Sends a sample notification now.', '<button class="btn" data-act="test-notify">Send test</button>')}
  </div>
  <div class="panel"><div class="ph"><h3>Windows</h3></div>
    ${row('Start with Windows', 'Opens quietly in the tray so reminders always run.', sw('startOnLogin'))}
    ${row('Keep running in the tray', 'Closing the window hides it instead of quitting. Reminders need this.', sw('closeToTray'))}
  </div>
  <div class="panel"><div class="ph"><h3>Money, health and reading</h3></div>
    ${row('Currency symbol', '', inp('currency', 'text', 'maxlength="3" style="width:70px"'))}
    ${row('Monthly budget', '0 turns the budget off.', inp('budget', 'number', 'min="0" step="500"'))}
    ${row('Yearly reading goal', 'Books you want to finish this year. 0 turns it off.', inp('booksGoal', 'number', 'min="0" max="365"'))}
    ${row('Water goal', 'Glasses a day.', inp('waterGoal', 'number', 'min="1" max="16"'))}
    ${row('Sleep goal', 'Hours a night.', inp('sleepGoal', 'number', 'min="4" max="12" step="0.5"'))}
  </div>
  <div class="panel"><div class="ph"><h3>Your data</h3></div>
    <p class="muted small pad">Everything is stored on this computer. A backup is also kept for each of the last 14 days.</p>
    ${row('Export backup', 'Save everything to a file.', '<button class="btn" data-act="export">Export</button>')}
    ${row('Import backup', 'Replaces what is here with a backup file.', '<button class="btn" data-act="import">Import</button>')}
    ${row('Data folder', 'Open where the data and daily backups live.', '<button class="btn" data-act="folder">Open folder</button>')}
    ${row('Erase everything', 'Deletes all habits, tasks, entries and settings.', '<button class="btn danger" data-act="reset">Erase data</button>')}
  </div>
  <div class="panel"><div class="ph"><h3>Shortcuts</h3></div>
    ${row('Command palette', 'Jump anywhere or add anything.', '<kbd>Ctrl</kbd> <kbd>K</kbd>')}
    ${row('Go to a screen', 'In sidebar order, from Today down.', '<kbd>Alt</kbd> <kbd>1</kbd> to <kbd>9</kbd>')}
    ${row('Open the guide', 'How every part of the app works.', '<kbd>F1</kbd>')}
    ${row('Save a form', '', '<kbd>Enter</kbd> or <kbd>Ctrl</kbd> <kbd>Enter</kbd> in long text')}
  </div>`;
};
