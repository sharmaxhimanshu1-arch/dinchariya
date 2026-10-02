'use strict';
/* =========================================================
   Views A — Today, Habits, Schedule, Tasks
   ========================================================= */

const prioSort = (a, b) => (b.priority || 2) - (a.priority || 2) || (a.due || '9').localeCompare(b.due || '9');
const dueChip = (x) => {
  if (!x.due) return '';
  const t = dkey();
  const cls = x.done ? '' : x.due < t ? 'bad' : x.due === t ? 'warn' : '';
  return `<span class="pill ${cls}">${relDay(x.due)}</span>`;
};
const head = (title, sub, tools = '') => `<div class="pagehead"><div><h1>${title}</h1>${sub ? `<div class="sub">${sub}</div>` : ''}</div><div class="tools">${tools}</div></div>`;
const empty = (msg, btn = '') => `<div class="empty"><p>${msg}</p>${btn}</div>`;
const bar = (pct, color) => `<div class="progress"><i style="width:${clamp(pct, 0, 100)}%;${color ? `background:${color}` : ''}"></i></div>`;

function habitRow(h, d) {
  const on = isDone(h.id, d), s = streakOf(h);
  return `<div class="row"><button class="check ${on ? 'on' : ''}" style="--c:${h.color}" data-act="hab" data-id="${h.id}" data-d="${d}" aria-label="Mark ${esc(h.name)}">${on ? icon('check', 14) : ''}</button><span class="emo">${h.emoji}</span><span class="grow ${on ? 'strike' : ''}">${esc(h.name)}</span>${s ? `<span class="streak" title="Current streak">${icon('flame', 13)} ${s}</span>` : ''}</div>`;
}
function taskRow(x) {
  const g = x.goalId && S.goals.find((q) => q.id === x.goalId);
  const pr = PRIO[x.priority || 2];
  return `<div class="row trow ${x.done ? 'done' : ''}"><button class="check ${x.done ? 'on' : ''}" data-act="task-toggle" data-id="${x.id}" aria-label="Complete task">${x.done ? icon('check', 14) : ''}</button><div class="grow tt" data-act="task-edit" data-id="${x.id}"><div class="ttl">${esc(x.title)}</div>${(x.due || g) ? `<div class="meta">${dueChip(x)}${g ? `<span class="pill">🎯 ${esc(g.title)}</span>` : ''}</div>` : ''}</div><span class="dot" title="${pr[0]} priority" style="background:${pr[1]}"></span></div>`;
}

/* ---------- day ribbon (Today) ---------- */
function dayRibbon(d) {
  const a = 5 * 60, b = 24 * 60, span = b - a;
  const evs = occurrences(d);
  const pos = (m) => clamp(((m - a) / span) * 100, 0, 100);
  const ticks = [6, 9, 12, 15, 18, 21].map((h) => `<span class="tick" style="left:${pos(h * 60)}%">${fmtH(h)}</span>`).join('');
  const segs = evs.map((e) => {
    const s = pos(toMin(e.start)), w = Math.max(pos(Math.max(toMin(e.end), toMin(e.start) + 20)) - s, 1.2);
    return `<span class="seg-ev" data-act="ev-edit" data-id="${e.id}" title="${esc(e.title)}, ${fmtTime(e.start)}" style="left:${s}%;width:${w}%;--c:${catColor(e.cat)}"></span>`;
  }).join('');
  const nm = nowMin();
  const now = d === dkey() && nm >= a ? `<span class="now" style="left:${pos(nm)}%"></span>` : '';
  return `<div class="ribbon"><div class="rtrack">${segs}${now}</div><div class="rticks">${ticks}</div></div>`;
}

/* ---------- Today ---------- */
function readingPanel() {
  const rn = readingNow().slice(0, 2);
  if (!rn.length) return '';
  return `<div class="panel"><div class="ph"><h3>Reading now</h3><button class="link" data-act="go" data-v="books">All books</button></div>
    ${rn.map((b) => `<div class="readbox"><div class="gl"><span><b>${esc(b.title)}</b>${b.author ? ` <span class="muted">${esc(b.author)}</span>` : ''}</span><b>${b.pages > 0 ? bookPct(b) + '%' : ''}</b></div>${b.pages > 0 ? bar(bookPct(b)) : ''}
      <div class="bact"><span class="muted small">${b.pages > 0 ? `Page ${b.current || 0} of ${b.pages}` : `Page ${b.current || 0}`}</span><span class="grow"></span>${[5, 10, 20].map((n) => `<button class="btn sm" data-act="book-pages" data-id="${b.id}" data-v="${n}">+${n}</button>`).join('')}</div></div>`).join('')}
    <div class="mini-note">Pages read today: ${pagesOn(dkey())}</div>
  </div>`;
}

VIEWS.today = () => {
  const t = dkey(), ci = S.checkins[t] || {}, set = S.settings;
  const hs = dueHabits(t), hd = hs.filter((h) => isDone(h.id, t)).length;
  const due = S.tasks.filter((x) => !x.done && x.due && x.due <= t).sort(prioSort);
  const doneToday = S.tasks.filter((x) => x.done && x.doneAt === t).length;
  const evs = occurrences(t), nm = nowMin();
  const nextEv = evs.find((e) => toMin(e.end) > nm);
  const hr = new Date().getHours();
  const greet = hr < 5 ? 'Still up' : hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : hr < 21 ? 'Good evening' : 'Good night';
  const isEmpty = !S.habits.length && !S.tasks.length && !S.events.length && !S.goals.length;
  const goals = S.goals.filter((g) => !goalDone(g)).sort((a, b) => (a.deadline || '9').localeCompare(b.deadline || '9')).slice(0, 3);
  const w = ci.water || 0, wg = set.waterGoal;
  const stat = (label, value, sub, act, pct) => `<button class="stat" data-act="go" data-v="${act}"><span class="sl">${label}</span><span class="sv">${value}</span><span class="ss">${sub}</span>${pct !== undefined ? bar(pct) : ''}</button>`;
  const jDone = !!(S.journal[t] && (S.journal[t].text || '').trim());
  return `
  <section class="hero">
    <div>
      <h1 class="big">${greet}, ${esc(set.name)}.</h1>
      <div class="sub">${fmtDate(t, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
    </div>
    <label class="oneThing"><span>Today’s one thing</span><input data-ci-text="focus" value="${esc(ci.focus || '')}" placeholder="What would make today a win?"></label>
  </section>
  ${dayRibbon(t)}
  ${isEmpty ? `<div class="starter"><div><h3>Start with a few things</h3><p class="muted">Add what you want to track. You can change everything later.</p></div><div class="tools"><button class="btn primary" data-act="starter-habits">Add 6 starter habits</button><button class="btn" data-act="goal-new">Set a goal</button><button class="btn" data-act="ev-new">Add an event</button><button class="btn ghost" data-act="go" data-v="guide">Read the guide</button></div></div>` : ''}
  <div class="stats">
    ${stat('Habits', `${hd}/${hs.length}`, hs.length ? (hd === hs.length ? 'All done for today' : `${hs.length - hd} to go`) : 'None due today', 'habits', hs.length ? (hd / hs.length) * 100 : 0)}
    ${stat('Tasks', `${due.length}`, `${doneToday} finished today`, 'tasks')}
    ${stat('Schedule', `${evs.length}`, nextEv ? `Next: ${esc(nextEv.title)} at ${fmtTime(nextEv.start)}` : evs.length ? 'Nothing left today' : 'A clear day', 'schedule')}
    ${stat('Focus', `${ci.focusMin || 0} min`, `${ci.sessions || 0} sessions`, 'focus')}
  </div>
  <div class="cols">
    <div class="col">
      <div class="panel"><div class="ph"><h3>Habits</h3><button class="link" data-act="go" data-v="habits">Manage</button></div>
        ${hs.length ? hs.map((h) => habitRow(h, t)).join('') : empty('No habits due today.', '<button class="btn sm" data-act="hab-new">New habit</button>')}
      </div>
      <div class="panel"><div class="ph"><h3>Tasks due</h3><button class="link" data-act="go" data-v="tasks">All tasks</button></div>
        <div class="quick"><input data-quick="task" placeholder="Add a task for today and press Enter. Try “!” for high priority or “tomorrow”."></div>
        ${due.length ? due.slice(0, 8).map(taskRow).join('') : empty('Nothing due. Add a task above.')}
        ${due.length > 8 ? `<div class="more"><button class="link" data-act="go" data-v="tasks">${due.length - 8} more</button></div>` : ''}
      </div>
    </div>
    <div class="col">
      <div class="panel"><div class="ph"><h3>Today’s schedule</h3><button class="link" data-act="ev-new">Add event</button></div>
        ${evs.length ? evs.map((e) => `<div class="row ev ${toMin(e.end) <= nm ? 'past' : ''}" data-act="ev-edit" data-id="${e.id}"><span class="bar" style="background:${catColor(e.cat)}"></span><span class="time">${fmtTime(e.start)}</span><span class="grow">${esc(e.title)}</span></div>`).join('') : empty('Nothing scheduled today.')}
      </div>
      <div class="panel"><div class="ph"><h3>Check-in</h3></div>
        <div class="ci"><span class="lbl">Mood</span><div class="moods">${MOODS.map((m, i) => `<button class="mood ${ci.mood === i + 1 ? 'on' : ''}" data-act="ci" data-k="mood" data-v="${i + 1}" title="${MOOD_L[i]}">${m}</button>`).join('')}</div></div>
        <div class="ci"><span class="lbl">Energy</span><div class="lvl">${[1, 2, 3, 4, 5].map((n) => `<button class="${(ci.energy || 0) >= n ? 'on' : ''}" data-act="ci" data-k="energy" data-v="${n}" aria-label="Energy ${n}">${n}</button>`).join('')}</div></div>
        <div class="ci"><span class="lbl">Sleep</span><div class="stepper"><button class="icon-btn" data-act="sleep" data-v="-0.5">${icon('minus', 14)}</button><b>${ci.sleep ? ci.sleep + ' h' : '—'}</b><button class="icon-btn" data-act="sleep" data-v="0.5">${icon('plus', 14)}</button></div></div>
        <div class="ci"><span class="lbl">Water <small class="muted">${w}/${wg}</small></span><div class="glasses">${Array.from({ length: wg }, (_, i) => `<button class="glass ${i < w ? 'on' : ''}" data-act="water" data-v="${i + 1}" aria-label="${i + 1} glasses"></button>`).join('')}</div></div>
      </div>
      <div class="panel"><div class="ph"><h3>Goals</h3><button class="link" data-act="go" data-v="goals">All goals</button></div>
        ${goals.length ? goals.map((g) => `<div class="grow-row" data-act="goal-open" data-id="${g.id}"><div class="gl"><span>${esc(g.title)}</span><b>${goalPct(g)}%</b></div>${bar(goalPct(g), catColor(g.cat))}</div>`).join('') : empty('No active goals.', '<button class="btn sm" data-act="goal-new">Set a goal</button>')}
      </div>
      ${readingPanel()}
      <button class="journal-cta" data-act="j-today"><span>${jDone ? 'Today’s entry is written' : 'Write today’s journal'}</span><small>${jDone ? 'Open it to add more' : PROMPTS[UI.jPrompt]}</small></button>
    </div>
  </div>`;
};

/* ---------- Habits ---------- */
function openHabit(id) {
  const h = id ? S.habits.find((x) => x.id === id) : null;
  openForm({
    title: h ? 'Edit habit' : 'New habit',
    values: h ? { ...h, days: h.days.join(',') } : { emoji: '💧', color: COLORS[0], days: '0,1,2,3,4,5,6' },
    fields: [
      { key: 'name', label: 'Habit', ph: 'e.g. Read 20 pages' },
      { key: 'emoji', label: 'Icon', type: 'chips', options: emojiChips },
      { key: 'color', label: 'Colour', type: 'chips', options: colorChips },
      { key: 'days', label: 'Repeat on', type: 'chips', multi: true, options: [['1', 'Mon'], ['2', 'Tue'], ['3', 'Wed'], ['4', 'Thu'], ['5', 'Fri'], ['6', 'Sat'], ['0', 'Sun']] }
    ],
    del: h ? () => { S.habits = S.habits.filter((x) => x.id !== h.id); Object.keys(S.habitLog).forEach((k) => { S.habitLog[k] = S.habitLog[k].filter((i) => i !== h.id); if (!S.habitLog[k].length) delete S.habitLog[k]; }); closeModal(); persist(); render(); } : null,
    extra: h ? [{ label: h.archived ? 'Restore' : 'Archive', run: () => { h.archived = !h.archived; persist(); render(); } }] : [],
    onSave: (v) => {
      const name = v.name.trim(); if (!name) return 'Give the habit a name.';
      const days = v.days.split(',').filter((x) => x !== '').map(Number); if (!days.length) return 'Pick at least one day.';
      if (h) Object.assign(h, { name, emoji: v.emoji, color: v.color, days });
      else S.habits.push({ id: uid(), name, emoji: v.emoji, color: v.color, days, created: dkey() });
      persist(); render();
    }
  });
}

VIEWS.habits = () => {
  const ws = UI.hWeek || (UI.hWeek = weekStartOf(dkey()));
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const t = dkey(), hs = activeHabits();
  const archived = S.habits.filter((h) => h.archived);
  const tools = `<button class="icon-btn" data-act="hweek" data-v="-1" aria-label="Previous week">${icon('chevL')}</button><button class="btn" data-act="hweek" data-v="0">This week</button><button class="icon-btn" data-act="hweek" data-v="1" aria-label="Next week">${icon('chevR')}</button><button class="btn primary" data-act="hab-new">${icon('plus', 16)} New habit</button>`;
  if (!hs.length) {
    return head('Habits', 'Small things, done daily.', `<button class="btn primary" data-act="hab-new">${icon('plus', 16)} New habit</button>`) +
      `<div class="panel"><div class="ph"><h3>Pick a few to begin</h3></div><div class="chips big">${STARTER_HABITS.map((h, i) => `<button class="chip" data-act="starter-habit" data-i="${i}">${h[0]} ${h[1]}</button>`).join('')}</div><div class="more"><button class="btn" data-act="starter-habits">Add all six</button></div></div>`;
  }
  let dueN = 0, doneN = 0;
  days.forEach((d) => { if (d <= t) { const s = dayHabitStat(d); dueN += s.due; doneN += s.done; } });
  const rows = hs.map((h) => {
    const cells = days.map((d) => {
      const due = isDue(h, d), on = isDone(h.id, d), fut = d > t;
      return `<td>${due ? `<button class="cell ${on ? 'on' : ''}" style="--c:${h.color}" data-act="hab" data-id="${h.id}" data-d="${d}" ${fut ? 'disabled' : ''} aria-label="${esc(h.name)} ${d}">${on ? icon('check', 13) : ''}</button>` : '<span class="cell off"></span>'}</td>`;
    }).join('');
    const s = streakOf(h);
    return `<tr><td class="hname" data-act="hab-edit" data-id="${h.id}"><span class="emo">${h.emoji}</span><span>${esc(h.name)}</span></td>${cells}<td class="num">${s ? icon('flame', 13) + ' ' + s : '—'}</td><td class="num">${rateOf(h)}%</td></tr>`;
  }).join('');
  // 13-week consistency heatmap
  const first = addDays(t, -90), off = (dow(first) - S.settings.weekStart + 7) % 7;
  let cellsH = Array.from({ length: off }, () => '<i class="hc e"></i>').join('');
  for (let i = 0; i <= 90; i++) {
    const d = addDays(first, i), s = dayHabitStat(d), p = s.due ? s.done / s.due : -1;
    cellsH += `<i class="hc" title="${fmtDate(d, { day: 'numeric', month: 'short' })}: ${s.due ? s.done + '/' + s.due : 'nothing due'}" style="${p >= 0 ? `--p:${p}` : ''}" ${p < 0 ? 'data-n="1"' : ''}></i>`;
  }
  return head('Habits', `Week of ${weekLabel(ws)}. ${dueN ? Math.round((doneN / dueN) * 100) + '% done so far' : ''}`, tools) + `
  <div class="panel flush"><table class="hgrid"><thead><tr><th></th>${days.map((d) => `<th class="${d === t ? 'today' : ''}">${dayName(d)}<b>${parse(d).getDate()}</b></th>`).join('')}<th class="num">Streak</th><th class="num">30 days</th></tr></thead><tbody>${rows}</tbody></table></div>
  <div class="panel"><div class="ph"><h3>Last 90 days</h3><span class="muted small">Brighter means more habits done that day</span></div><div class="heat">${cellsH}</div></div>
  ${archived.length ? `<div class="panel"><div class="ph"><h3>Archived</h3></div>${archived.map((h) => `<div class="row" data-act="hab-edit" data-id="${h.id}"><span class="emo">${h.emoji}</span><span class="grow muted">${esc(h.name)}</span><span class="pill">Restore from edit</span></div>`).join('')}</div>` : ''}`;
};

/* ---------- Schedule ---------- */
function openEvent(id, date, startMin) {
  const e = id ? S.events.find((x) => x.id === id) : null;
  const s0 = startMin !== undefined ? fromMin(startMin) : fromMin(Math.min(23 * 60, (Math.floor(nowMin() / 60) + 1) * 60));
  openForm({
    title: e ? 'Edit event' : 'New event',
    values: e || { date: date || UI.date, start: s0, end: fromMin(Math.min(23 * 60 + 59, toMin(s0) + 60)), cat: 'personal', repeat: 'none', remind: 10 },
    fields: [
      { key: 'title', label: 'Title', ph: 'e.g. Team standup' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'start', label: 'Starts', type: 'time' },
      { key: 'end', label: 'Ends', type: 'time' },
      { key: 'cat', label: 'Type', type: 'chips', options: catChips },
      { key: 'repeat', label: 'Repeats', type: 'select', options: [['none', 'Does not repeat'], ['daily', 'Every day'], ['weekdays', 'Weekdays'], ['weekly', 'Every week'], ['monthly', 'Every month']] },
      { key: 'remind', label: 'Remind me', type: 'select', options: [['-1', 'No reminder'], ['0', 'At start time'], ['5', '5 minutes before'], ['10', '10 minutes before'], ['15', '15 minutes before'], ['30', '30 minutes before'], ['60', '1 hour before']] },
      { key: 'notes', label: 'Notes', type: 'textarea', rows: 2 }
    ],
    del: e ? () => { S.events = S.events.filter((x) => x.id !== e.id); closeModal(); persist(); render(); } : null,
    onSave: (v) => {
      if (!v.title.trim()) return 'Give the event a title.';
      if (!v.date || !v.start) return 'Pick a date and start time.';
      if (!v.end || toMin(v.end) <= toMin(v.start)) v.end = fromMin(Math.min(23 * 60 + 59, toMin(v.start) + 60));
      const rec = { title: v.title.trim(), date: v.date, start: v.start, end: v.end, cat: v.cat, repeat: v.repeat, remind: Number(v.remind), notes: v.notes };
      if (e) Object.assign(e, rec); else S.events.push({ id: uid(), ...rec });
      persist(); render();
    }
  });
}
function layoutEvents(evs) {
  evs.sort((a, b) => a.sm - b.sm || b.em - a.em);
  const out = []; let cluster = [], cEnd = -1;
  const flush = () => {
    const lanes = [];
    cluster.forEach((ev) => { let i = lanes.findIndex((end) => end <= ev.sm); if (i < 0) { i = lanes.length; lanes.push(0); } lanes[i] = ev.em; ev.lane = i; });
    cluster.forEach((ev) => { ev.lanes = lanes.length; });
    out.push(...cluster); cluster = [];
  };
  evs.forEach((ev) => { if (cluster.length && ev.sm >= cEnd) { flush(); cEnd = -1; } cluster.push(ev); cEnd = Math.max(cEnd, ev.em); });
  if (cluster.length) flush();
  return out;
}

VIEWS.schedule = () => {
  const d = UI.date, t = dkey(), isWeek = UI.sched === 'week', ws = weekStartOf(d);
  const tools = `<div class="seg"><button class="${!isWeek ? 'on' : ''}" data-act="sched-mode" data-v="day">Day</button><button class="${isWeek ? 'on' : ''}" data-act="sched-mode" data-v="week">Week</button></div><button class="icon-btn" data-act="sched-nav" data-v="-1" aria-label="Previous">${icon('chevL')}</button><button class="btn" data-act="sched-today">Today</button><button class="icon-btn" data-act="sched-nav" data-v="1" aria-label="Next">${icon('chevR')}</button><button class="btn primary" data-act="ev-new">${icon('plus', 16)} New event</button>`;
  if (isWeek) {
    const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    return head('Schedule', weekLabel(ws), tools) + `<div class="weekgrid">${days.map((k) => {
      const evs = occurrences(k), tk = S.tasks.filter((x) => !x.done && x.due === k);
      return `<div class="wday ${k === t ? 'today' : ''}"><div class="wh" data-act="sched-day" data-d="${k}"><span>${dayName(k)}</span><b>${parse(k).getDate()}</b></div>${evs.map((e) => `<div class="wev" data-act="ev-edit" data-id="${e.id}" style="--c:${catColor(e.cat)}"><small>${fmtTime(e.start)}</small>${esc(e.title)}</div>`).join('')}${tk.length ? `<div class="wtask">${tk.length} task${tk.length > 1 ? 's' : ''} due</div>` : ''}<button class="addmini" data-act="ev-new" data-d="${k}" aria-label="Add event">${icon('plus', 14)}</button></div>`;
    }).join('')}</div>`;
  }
  const evs = occurrences(d).map((e) => ({ ...e, sm: toMin(e.start), em: Math.max(toMin(e.end), toMin(e.start) + 15) }));
  let h0 = 6, h1 = 23;
  evs.forEach((x) => { h0 = Math.min(h0, Math.floor(x.sm / 60)); h1 = Math.max(h1, Math.min(24, Math.ceil(x.em / 60))); });
  const HH = 58, laid = layoutEvents(evs);
  const hours = []; for (let h = h0; h < h1; h++) hours.push(`<div class="hour" style="height:${HH}px" data-act="ev-new-at" data-h="${h}"><span>${fmtH(h)}</span></div>`);
  const blocks = laid.map((e) => {
    const top = ((e.sm - h0 * 60) / 60) * HH, ht = Math.max(((e.em - e.sm) / 60) * HH, 26), w = 100 / e.lanes;
    return `<div class="evblock" data-act="ev-edit" data-id="${e.id}" style="top:${top}px;height:${ht - 2}px;left:calc(${e.lane * w}% + 3px);width:calc(${w}% - 6px);--c:${catColor(e.cat)}"><b>${esc(e.title)}</b><span>${fmtTime(e.start)} to ${fmtTime(e.end)}</span></div>`;
  }).join('');
  const nm = nowMin(), nowLine = d === t && nm >= h0 * 60 && nm <= h1 * 60 ? `<div class="nowline" style="top:${((nm - h0 * 60) / 60) * HH}px"></div>` : '';
  const tk = S.tasks.filter((x) => !x.done && x.due === d).sort(prioSort);
  const hs = dueHabits(d);
  return head('Schedule', fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), tools) + `
  <div class="schedwrap">
    <div class="panel flush"><div class="timeline" id="timeline" style="height:${(h1 - h0) * HH}px">${hours.join('')}<div class="evlayer">${blocks}${nowLine}</div></div></div>
    <div class="col">
      <div class="panel"><div class="ph"><h3>Tasks due</h3></div>${tk.length ? tk.map(taskRow).join('') : empty('No tasks due this day.')}</div>
      <div class="panel"><div class="ph"><h3>Habits</h3></div>${hs.length ? hs.map((h) => (d <= t ? habitRow(h, d) : `<div class="row"><span class="emo">${h.emoji}</span><span class="grow muted">${esc(h.name)}</span></div>`)).join('') : empty('No habits due.')}</div>
    </div>
  </div>`;
};
AFTER.schedule = () => {
  const tl = $('#timeline'), v = $('#view');
  if (!tl || UI.sched !== 'day') return;
  if (UI._schedScrolled === UI.date) return;
  UI._schedScrolled = UI.date;
  const target = UI.date === dkey() ? (nowMin() / 60 - 6 - 1.5) * 58 + 90 : 2 * 58 + 90;
  v.scrollTop = Math.max(0, target);
};

/* ---------- Tasks ---------- */
function openTask(id) {
  const x = id ? S.tasks.find((q) => q.id === id) : null;
  const goals = S.goals.filter((g) => !goalDone(g) || (x && x.goalId === g.id));
  openForm({
    title: x ? 'Edit task' : 'New task',
    values: x || { priority: 2 },
    fields: [
      { key: 'title', label: 'Task', ph: 'What needs doing?' },
      { key: 'due', label: 'Due date', type: 'date' },
      { key: 'priority', label: 'Priority', type: 'chips', options: [['1', 'Low', PRIO[1][1]], ['2', 'Medium', PRIO[2][1]], ['3', 'High', PRIO[3][1]]] },
      ...(goals.length ? [{ key: 'goalId', label: 'Linked goal', type: 'select', options: [['', 'None'], ...goals.map((g) => [g.id, g.title])] }] : []),
      { key: 'notes', label: 'Notes', type: 'textarea', rows: 2 }
    ],
    del: x ? () => { S.tasks = S.tasks.filter((q) => q.id !== x.id); closeModal(); persist(); render(); } : null,
    onSave: (v) => {
      if (!v.title.trim()) return 'Write the task first.';
      const rec = { title: v.title.trim(), due: v.due || '', priority: Number(v.priority) || 2, goalId: v.goalId || '', notes: v.notes || '' };
      if (x) Object.assign(x, rec); else S.tasks.push({ id: uid(), done: false, created: dkey(), ...rec });
      persist(); render();
    }
  });
}
function addTask(title, due = '', priority = 2) {
  title = title.trim(); if (!title) return false;
  S.tasks.push({ id: uid(), title, due, priority, done: false, created: dkey(), notes: '', goalId: '' });
  persist(); render(); return true;
}
function parseQuick(raw) {
  let s = raw.trim(), priority = 2, due = '';
  if (/^!+\s*/.test(s) || /\s!+$/.test(s)) { priority = 3; s = s.replace(/^!+\s*/, '').replace(/\s!+$/, ''); }
  const m = s.match(/\s+(today|tomorrow)$/i);
  if (m) { due = m[1].toLowerCase() === 'today' ? dkey() : addDays(dkey(), 1); s = s.slice(0, m.index); }
  return { title: s, due, priority };
}

VIEWS.tasks = () => {
  const t = dkey(), open = S.tasks.filter((x) => !x.done);
  const g = {
    over: open.filter((x) => x.due && x.due < t).sort(prioSort),
    today: open.filter((x) => x.due === t).sort(prioSort),
    soon: open.filter((x) => x.due && x.due > t).sort(prioSort),
    none: open.filter((x) => !x.due).sort(prioSort)
  };
  const done = S.tasks.filter((x) => x.done).sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || '')).slice(0, 25);
  const group = (title, list, cls = '') => (list.length ? `<div class="panel ${cls}"><div class="ph"><h3>${title}</h3><span class="muted small">${list.length}</span></div>${list.map(taskRow).join('')}</div>` : '');
  return head('Tasks', `${open.length} open`, '') + `
  <div class="panel quickadd">
    <input id="qt-title" data-quick="task-page" placeholder="Add a task and press Enter">
    <select id="qt-prio" aria-label="Priority"><option value="2">Medium</option><option value="3">High</option><option value="1">Low</option></select>
    <input type="date" id="qt-due" aria-label="Due date">
    <button class="btn primary" data-act="task-add">Add task</button>
  </div>
  ${group('Overdue', g.over, 'bad')}${group('Today', g.today)}${group('Upcoming', g.soon)}${group('No date', g.none)}
  ${!open.length ? empty('All clear. Add a task above.') : ''}
  ${done.length ? `<div class="panel"><div class="ph"><h3>Completed</h3><button class="link" data-act="tasks-done-toggle">${UI.tDone ? 'Hide' : 'Show'} ${done.length}</button></div>${UI.tDone ? done.map(taskRow).join('') : ''}</div>` : ''}`;
};
