'use strict';
/* =========================================================
   Views C — Books and the in-app Guide
   ========================================================= */

/* ---------- Books ---------- */
const stars = (n) => `<span class="stars" aria-label="${n} out of 5">${'★'.repeat(n)}<s>${'★'.repeat(5 - n)}</s></span>`;
const optName = (list, k) => (list.find((x) => x[0] === k) || [0, ''])[1];

function cover(b) {
  const t = String(b.title || '?').trim().replace(/^(the|a|an)\s+/i, '');
  return `<div class="cover" style="--c:${bookColor(b)}" aria-hidden="true"><b>${esc((t[0] || '?').toUpperCase())}</b><i></i></div>`;
}

function bookRow(b) {
  const tags = [b.genre, optName(BOOK_SRC, b.source), optName(BOOK_FMT, b.format), b.pages > 0 ? b.pages + ' pages' : ''].filter(Boolean).map((x) => `<span class="pill">${esc(x)}</span>`).join('');
  let mid = '';
  if (b.status === 'reading') {
    const eta = bookEta(b);
    mid = `<div class="bprog"><div class="gl"><span>${b.pages > 0 ? `Page ${b.current || 0} of ${b.pages}` : `Page ${b.current || 0}`}</span><b>${b.pages > 0 ? bookPct(b) + '%' : ''}</b></div>${b.pages > 0 ? bar(bookPct(b)) : ''}${eta ? `<div class="mini-note">${eta}</div>` : ''}</div>
      <div class="bact"><span class="muted small">Log pages</span>${[5, 10, 20].map((n) => `<button class="btn sm" data-act="book-pages" data-id="${b.id}" data-v="${n}">+${n}</button>`).join('')}<input class="pgin" type="number" min="0" data-act="noop" data-bp="${b.id}" value="${b.current || 0}" title="I am on page…" aria-label="Current page"><button class="btn sm primary" data-act="book-status" data-id="${b.id}" data-v="read">Finished</button></div>`;
  } else if (b.status === 'unread') {
    mid = `<div class="bact"><button class="btn sm primary" data-act="book-status" data-id="${b.id}" data-v="reading">Start reading</button></div>`;
  } else {
    mid = `<div class="btags">${b.rating ? stars(b.rating) : ''}<span class="muted small">${b.finishedOn ? 'Finished ' + fmtDate(b.finishedOn, { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span></div>${b.takeaway ? `<p class="take">“${esc(b.takeaway)}”</p>` : ''}`;
  }
  return `<div class="book" data-act="book-edit" data-id="${b.id}">${cover(b)}<div class="binfo"><div class="bt">${esc(b.title)}</div>${b.author ? `<div class="ba">${esc(b.author)}</div>` : ''}<div class="btags">${tags}</div>${mid}</div></div>`;
}

function bookMatches(b) {
  const q = UI.bQ.trim().toLowerCase();
  if (UI.bSrc && b.source !== UI.bSrc) return false;
  return !q || [b.title, b.author, b.genre].join(' ').toLowerCase().includes(q);
}

function bookList() {
  if (!S.books.length) return empty('Add the books you own, the one you are reading, and the ones you want next.', '<button class="btn primary" data-act="book-new">Add your first book</button>');
  const all = S.books.filter(bookMatches);
  const by = { reading: all.filter((b) => b.status === 'reading'), unread: all.filter((b) => b.status === 'unread'), read: all.filter((b) => b.status === 'read') };
  by.reading.sort((a, b) => (b.startedOn || '').localeCompare(a.startedOn || ''));
  by.unread.sort((a, b) => (a.source === 'wish' ? 1 : 0) - (b.source === 'wish' ? 1 : 0) || (b.added || 0) - (a.added || 0));
  by.read.sort((a, b) => (b.finishedOn || '').localeCompare(a.finishedOn || ''));
  const tab = UI.bTab, names = { reading: 'Reading now', unread: 'Not read yet', read: 'Read' };
  const groups = tab === 'all' ? ['reading', 'unread', 'read'] : [tab];
  const out = groups.filter((g) => by[g].length).map((g) => (tab === 'all' ? `<div class="bgroup">${names[g]}<small>${by[g].length}</small></div>` : '') + by[g].map(bookRow).join('')).join('');
  return out || empty('No books match.');
}

function goalStrip() {
  const g = Number(S.settings.booksGoal) || 0, yr = new Date().getFullYear(), n = booksReadIn(yr).length;
  if (!g) return `<div class="bgoal"><div class="grow"><b>${n} read in ${yr}</b><div class="muted small">Set a yearly goal in Settings to see whether you are on pace.</div></div></div>`;
  const doy = Math.round((parse(dkey()) - new Date(yr, 0, 0)) / 864e5), diff = n - (g * doy) / 365;
  const pace = n >= g ? 'Goal reached' : diff >= 0.5 ? 'Ahead of pace' : diff <= -0.5 ? `Behind pace by about ${Math.ceil(-diff)} book${Math.ceil(-diff) === 1 ? '' : 's'}` : 'Right on pace';
  return `<div class="bgoal"><div class="grow"><div class="gl"><b>${n} of ${g} books in ${yr}</b><span class="muted small">${pace}</span></div>${bar((n / g) * 100)}</div></div>`;
}

function booksRail() {
  const t = dkey(), days = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6)), vals = days.map(pagesOn), mx = Math.max(20, ...vals);
  const wk = sum(vals), streak = readStreak(), yr = new Date().getFullYear(), ry = booksReadIn(yr);
  const byG = {}; ry.forEach((b) => { const g = b.genre || 'Other'; byG[g] = (byG[g] || 0) + 1; });
  const gs = Object.entries(byG).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const cnt = (st) => S.books.filter((b) => b.status === st).length;
  const line = (l, v) => `<div class="gl"><span>${l}</span><b>${v}</b></div>`;
  return `<div class="rail">
    <div class="panel"><div class="ph"><h3>Pages this week</h3></div>
      <div class="bigstat"><b>${wk}</b><span>pages</span></div>
      <div class="minibars">${vals.map((v, i) => `<div class="mb"><div class="mbar"><i style="height:${(v / mx) * 100}%" title="${v} pages"></i></div><small>${dayName(days[i]).slice(0, 2)}</small></div>`).join('')}</div>
      <div class="mini-note">${streak ? `${streak}-day reading streak` : 'Log pages on any day to start a reading streak.'}</div>
    </div>
    <div class="panel"><div class="ph"><h3>Your shelf</h3></div>
      ${line('All books', S.books.length)}${line('Reading', cnt('reading'))}${line('Not read yet', cnt('unread'))}${line('Read', cnt('read'))}${line('On the wishlist', S.books.filter((b) => b.source === 'wish').length)}
      ${ry.length ? `<div class="mini-note">${yr}: ${ry.length} finished, ${sum(ry.map((b) => b.pages || 0)).toLocaleString('en-IN')} pages</div>` : ''}
    </div>
    ${gs.length ? `<div class="panel"><div class="ph"><h3>What you read in ${yr}</h3></div>${gs.map(([g, n]) => `<div class="grow-row"><div class="gl"><span>${esc(g)}</span><b>${n}</b></div>${bar((n / ry.length) * 100)}</div>`).join('')}</div>` : ''}
  </div>`;
}

VIEWS.books = () => {
  const cnt = (st) => S.books.filter((b) => b.status === st).length;
  const tab = (v, l, n) => `<button class="${UI.bTab === v ? 'on' : ''}" data-act="b-tab" data-v="${v}">${l} ${n}</button>`;
  const tools = `<button class="btn primary" data-act="book-new">${icon('plus', 16)} Add book</button>`;
  const sub = S.books.length ? `${cnt('reading')} reading, ${cnt('unread')} waiting, ${cnt('read')} read` : 'Everything you own, read and want to read.';
  return head('Books', sub, tools) + goalStrip() + `
  <div class="cols" style="grid-template-columns:minmax(0,1.7fr) minmax(0,1fr)">
    <div class="col">
      <div class="bhead">
        <div class="seg">${tab('all', 'All', S.books.length)}${tab('reading', 'Reading', cnt('reading'))}${tab('unread', 'Not read', cnt('unread'))}${tab('read', 'Read', cnt('read'))}</div>
      </div>
      <div class="tools" style="margin:14px 0 4px">
        <div class="search grow" style="margin:0">${icon('search', 15)}<input id="bq" placeholder="Search title, author or genre" value="${esc(UI.bQ)}"></div>
        <select id="bsrc" aria-label="Copy"><option value="">All copies</option>${BOOK_SRC.map(([v, l]) => `<option value="${v}" ${UI.bSrc === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      </div>
      <div id="booklist">${bookList()}</div>
    </div>
    <div class="col">${booksRail()}</div>
  </div>`;
};

function openBook(id, finished) {
  const b = id ? S.books.find((x) => x.id === id) : null;
  openForm({
    title: finished ? 'You finished it. How was it?' : b ? 'Edit book' : 'Add a book',
    cls: 'wide',
    values: b ? { ...b, rating: String(b.rating || 0), pages: b.pages || '', current: b.current || '' } : { status: 'unread', source: 'own', format: 'paper', rating: '0', genre: '' },
    fields: [
      { key: 'title', label: 'Title', ph: 'e.g. Atomic Habits' },
      { key: 'author', label: 'Author', ph: 'Optional' },
      { key: 'status', label: 'Where is it?', type: 'chips', options: BOOK_ST },
      { key: 'source', label: 'Your copy', type: 'chips', options: BOOK_SRC },
      [{ key: 'genre', label: 'Genre', type: 'select', options: [['', 'Not set'], ...BOOK_GENRES.map((g) => [g, g])] }, { key: 'format', label: 'Format', type: 'select', options: BOOK_FMT }],
      [{ key: 'pages', label: 'Total pages', type: 'number', min: 0, ph: 'e.g. 320' }, { key: 'current', label: 'Page you are on', type: 'number', min: 0, ph: '0' }],
      { key: 'rating', label: 'Your rating', type: 'chips', options: [['0', 'None'], ['1', '★'], ['2', '★★'], ['3', '★★★'], ['4', '★★★★'], ['5', '★★★★★']] },
      [{ key: 'startedOn', label: 'Started', type: 'date' }, { key: 'finishedOn', label: 'Finished', type: 'date' }],
      { key: 'takeaway', label: 'One line to remember it by', ph: 'The idea you want to keep' },
      { key: 'notes', label: 'Notes and favourite lines', type: 'textarea', rows: 4 }
    ],
    del: b ? () => { S.books = S.books.filter((x) => x.id !== b.id); closeModal(); persist(); render(); } : null,
    onSave: (v) => {
      if (!v.title.trim()) return 'Give the book a title.';
      const rec = { title: v.title.trim(), author: v.author.trim(), genre: v.genre, source: v.source, format: v.format, pages: Number(v.pages) || 0, rating: Number(v.rating) || 0, takeaway: v.takeaway.trim(), notes: v.notes };
      const x = b || { id: uid(), added: Date.now(), status: 'unread', current: 0, startedOn: '', finishedOn: '' };
      const changed = v.status !== x.status;
      Object.assign(x, rec);
      x.startedOn = v.startedOn || ''; x.finishedOn = v.finishedOn || '';
      let cur = Math.max(0, Number(v.current) || 0); if (x.pages > 0) cur = Math.min(cur, x.pages);
      if (changed) setBookStatus(x, v.status);
      if (!(changed && (v.status === 'read' || v.status === 'unread'))) x.current = cur;
      if (x.status === 'reading' && x.pages > 0 && x.current >= x.pages) setBookStatus(x, 'read');
      if (x.status === 'read' && !x.finishedOn) x.finishedOn = dkey();
      if (!b) S.books.push(x);
      persist(); render();
    }
  });
}

/* ---------- Guide ---------- */
const gOpen = (v, label) => `<p class="gopen"><button class="btn sm" data-act="go" data-v="${v}">${label}</button></p>`;
const gTable = (head, rows) => `<table class="gtable"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const callout = (t, body) => `<div class="callout"><strong>${t}</strong>${body}</div>`;

function guideSections() {
  return [
    { id: 'start', title: 'Start here', body: `
      <p class="lead">Dinchariya is a place to put everything you would otherwise try to remember. You put it in once. The app keeps it, and reminds you at the right time.</p>
      <h4>Set it up in five minutes</h4>
      <ol>
        <li><b>Settings.</b> Type your name. Leave notifications on. Turn on <b>Start with Windows</b> so reminders work even when you forget to open the app.</li>
        <li><b>Habits.</b> Add three small habits you want to do most days. Three is enough. You can add more later.</li>
        <li><b>Schedule.</b> Add the fixed things in your week: classes, meetings, gym. For repeating things, choose how often they repeat once.</li>
        <li><b>Tasks.</b> Write down everything you owe someone or yourself. Give each task a due date.</li>
        <li><b>Goals.</b> Add one big goal. Break it into three to five steps.</li>
        <li><b>Books.</b> Add the book you are reading now and a few you want next.</li>
      </ol>
      <h4>A daily rhythm that works</h4>
      ${gTable(['When', 'What to do'], [
        ['Morning, two minutes', 'Open <b>Today</b>. Write your <b>one thing</b>, the single result that would make today a win. Glance at the day ribbon and the tasks due.'],
        ['During the day', 'Tick habits and tasks as you finish them. When a thought or task pops up, press <kbd>Ctrl</kbd> <kbd>K</kbd> and type it. Do not keep it in your head.'],
        ['Evening, five minutes', 'Fill the check-in (mood, energy, sleep, water). Log your reading pages. Write a few lines in the <b>Journal</b>.'],
        ['Once a week', 'Open <b>Review</b>. Look at your week, then write what went well, what to change, and your focus for next week.']
      ])}
      ${callout('The one rule', 'Keep it small. A short list you actually use beats a perfect system you abandon after a week.')}` },

    { id: 'which', title: 'Which one should I use?', body: `
      <p>Many things look alike at first. This table tells you where each thing belongs.</p>
      ${gTable(['If you want to…', 'Use'], [
        ['Do something every day or on certain weekdays (drink water, read, walk)', '<b>Habit</b>'],
        ['Do something once, by a date (pay the bill, send the report)', '<b>Task</b>'],
        ['Be somewhere or do something at a particular time (meeting, class, call)', '<b>Schedule</b> event'],
        ['Reach a bigger result over weeks or months (run 10 km, finish a course)', '<b>Goal</b>, with tasks linked to it'],
        ['Keep track of books you have, are reading, or want to read', '<b>Books</b>'],
        ['Write about your day or how you feel', '<b>Journal</b>'],
        ['Work without distraction for a set time', '<b>Focus</b> timer'],
        ['Track what you spend', '<b>Money</b>'],
        ['Save an idea, a line, a list, a link', '<b>Notes</b>'],
        ['See how your week went and plan the next', '<b>Review</b>']
      ])}
      ${callout('Not sure?', 'If it repeats, it is a habit. If it has a time, it is an event. If it just needs doing, it is a task. If you are unsure, make it a note and decide later.')}` },

    { id: 'today', title: 'Today', body: `
      <p class="lead">Your home screen. It shows what matters right now and nothing else.</p>
      <h4>What you see</h4>
      <ul>
        <li><b>Today’s one thing.</b> Type the one result that would make today a win. It is also used in your morning reminder.</li>
        <li><b>The day ribbon.</b> A strip for the 24 hours of your day. Coloured blocks are your events. The thin vertical line is the time right now.</li>
        <li><b>Four tiles.</b> Habits done, tasks due, events today, and focus minutes. Click a tile to open that screen.</li>
        <li><b>Habits and tasks.</b> Tick them here. Add a task in the box and press <kbd>Enter</kbd>.</li>
        <li><b>Check-in.</b> Mood, energy from 1 to 5, hours slept, and glasses of water. One tap each.</li>
        <li><b>Reading now.</b> Appears when you are reading a book. Tap +5, +10 or +20 to log pages.</li>
        <li><b>Journal button.</b> Takes you straight to today’s entry.</li>
      </ul>
      <h4>Quick task tricks</h4>
      <p>In the task box on Today, add <b>!</b> at the start to make it high priority. Add the word <b>tomorrow</b> at the end to give it tomorrow’s date. For example: <i>! Send invoice tomorrow</i>.</p>
      ${gOpen('today', 'Open Today')}` },

    { id: 'habits', title: 'Habits', body: `
      <p class="lead">Small things you repeat. The goal is not perfection. It is showing up most days.</p>
      <h4>How to use it</h4>
      <ul>
        <li>Press <b>New habit</b>. Give it a name, pick an icon and a colour, and choose the days it repeats.</li>
        <li>Each day, tick the circle for that habit. You can also tick it from Today.</li>
        <li>Missed yesterday? You can still tick any day in the current week. Future days are locked.</li>
        <li>Click a habit’s name to edit it, or to archive it when you no longer want it. Archived habits can be restored from the same place.</li>
      </ul>
      <h4>What the numbers mean</h4>
      <ul>
        <li><b>Streak.</b> How many due days in a row you have done it, counting back from today.</li>
        <li><b>30 days.</b> The share of due days you completed in the last 30 days.</li>
        <li><b>Last 90 days.</b> One square per day. A brighter square means you finished more of your habits that day.</li>
      </ul>
      ${callout('Make it stick', 'Make the habit so small it feels silly. “Read one page” beats “read for an hour”. You can raise the bar after a month.')}
      ${gOpen('habits', 'Open Habits')}` },

    { id: 'schedule', title: 'Schedule', body: `
      <p class="lead">Things that happen at a certain time. Use it for meetings, classes, calls and plans.</p>
      <h4>How to use it</h4>
      <ul>
        <li>Switch between <b>Day</b> and <b>Week</b> at the top. Use the arrows to move around, and <b>Today</b> to come back.</li>
        <li>In Day view, click any empty hour to add an event at that time. Click an event to edit or delete it.</li>
        <li>In Week view, click a day’s name to open that day.</li>
        <li>The red line shows the time right now.</li>
      </ul>
      <h4>Repeating events and reminders</h4>
      <p>When you add an event, choose <b>Repeats</b>: every day, weekdays, every week, or every month. Then choose <b>Remind me</b>, for example 10 minutes before. You will get a Windows notification at that time. The app must be running, even if only in the tray.</p>
      ${gOpen('schedule', 'Open Schedule')}` },

    { id: 'tasks', title: 'Tasks', body: `
      <p class="lead">One-time things to do. Everything you do not want to remember goes here.</p>
      <h4>How to use it</h4>
      <ul>
        <li>Type the task in the top bar, pick a priority and a due date if it has one, and press <kbd>Enter</kbd>.</li>
        <li>Tasks are grouped for you: <b>Overdue</b>, <b>Today</b>, <b>Upcoming</b>, and <b>No date</b>. Overdue ones show first.</li>
        <li>Tick the circle when it is done. It moves to <b>Completed</b>.</li>
        <li>Click a task to edit it, add notes, or link it to a goal.</li>
      </ul>
      ${callout('A tip for long lists', 'Give every task a date, even a rough one. Tasks with no date tend to sit forever. Each morning, pick the few that must be done today.')}
      ${gOpen('tasks', 'Open Tasks')}` },

    { id: 'goals', title: 'Goals', body: `
      <p class="lead">Bigger results that take weeks or months. A goal is the destination. Tasks are the steps.</p>
      <h4>Two ways to measure a goal</h4>
      <ul>
        <li><b>Milestones.</b> Best when the goal is a list of steps. For example “Publish my book”: outline, first draft, edit, cover, publish. Tick each as you finish it.</li>
        <li><b>A number.</b> Best when you can count it. For example “Read 12 books” or “Save ₹50,000”. Enter where you are now and where you want to reach.</li>
      </ul>
      <h4>Getting the most out of it</h4>
      <ul>
        <li>Write <b>Why it matters</b>. On a hard day this is the sentence that keeps you going.</li>
        <li>Add a deadline. The card then tells you how many days are left.</li>
        <li>When you add a task, link it to a goal. The goal card shows how many linked tasks are still open.</li>
        <li>Keep only a few active goals. Three is plenty.</li>
      </ul>
      ${gOpen('goals', 'Open Goals')}` },

    { id: 'books', title: 'Books', body: `
      <p class="lead">Your shelf, in one place. See what you own, what you are reading, and what is waiting.</p>
      <h4>The three stages</h4>
      <ul>
        <li><b>Not read.</b> Books you own or want, but have not started.</li>
        <li><b>Reading.</b> Books you are in the middle of.</li>
        <li><b>Read.</b> Books you have finished.</li>
      </ul>
      <p>Use the tabs at the top to see one stage at a time, or leave it on <b>All</b> to see them grouped.</p>
      <h4>How to use it</h4>
      <ul>
        <li>Press <b>Add book</b>. Only the title is required. Add the author, genre, format and total pages if you like.</li>
        <li><b>Your copy</b> tells you whether you own it, borrowed it, or it is on your wishlist. Use the “All copies” filter to see just one kind.</li>
        <li>Press <b>Start reading</b> on a book to move it to Reading.</li>
        <li>While reading, press <b>+5</b>, <b>+10</b> or <b>+20</b> to log the pages you read. Or type the page you are on in the small box.</li>
        <li>Press <b>Finished</b> when you are done. The book moves to Read, and the app asks for a rating and one line to remember it by.</li>
      </ul>
      <h4>What the app works out for you</h4>
      <ul>
        <li><b>Progress.</b> A bar and a percentage, once you enter the total pages.</li>
        <li><b>Your pace.</b> Pages a day since you started, and about how many days are left.</li>
        <li><b>Reading streak.</b> Days in a row on which you logged pages.</li>
        <li><b>Pages this week.</b> A small chart on the right. The same total appears in your weekly Review.</li>
        <li><b>Yearly goal.</b> Set how many books you want to read this year in Settings. The strip at the top tells you if you are ahead or behind.</li>
        <li><b>What you read.</b> Once you finish books, you see a count by genre.</li>
      </ul>
      ${callout('Why the “one line” matters', 'A rating fades from memory. One sentence about what you took from a book stays useful years later. Write it right when you finish.')}
      ${gOpen('books', 'Open Books')}` },

    { id: 'journal', title: 'Journal', body: `
      <p class="lead">A few lines a day. Over months, it becomes the most valuable thing in the app.</p>
      <h4>How to use it</h4>
      <ul>
        <li>Pick the mood for the day. Then write three small things you are grateful for.</li>
        <li>Write the <b>highlight</b>, the one moment worth keeping.</li>
        <li>Under <b>Write freely</b>, write anything. Stuck? Press <b>Another prompt</b> for a question to start from.</li>
        <li>It saves as you type. There is no save button.</li>
      </ul>
      <h4>Looking back</h4>
      <ul>
        <li>The list on the left shows past entries. Use the search box to find a word.</li>
        <li><b>On this day</b> shows what you wrote on the same date in earlier years.</li>
        <li>Your writing streak counts the days in a row you wrote something.</li>
      </ul>
      ${gOpen('journal', 'Open Journal')}` },

    { id: 'focus', title: 'Focus', body: `
      <p class="lead">A timer for deep work. You work hard for a fixed time, then rest.</p>
      <h4>How to use it</h4>
      <ul>
        <li>Pick a length: <b>Focus 25</b>, <b>50</b> or <b>90</b> minutes. Short breaks are <b>5</b> or <b>15</b>.</li>
        <li>Under <b>Working on</b>, choose the task you are doing. Then press <b>Start</b>.</li>
        <li>Put your phone away and do only that one thing until the timer ends.</li>
        <li>When a focus session finishes, the minutes are added to today’s total and you get a notification. Then take a break.</li>
      </ul>
      <p>The time left also shows in the window title, so you can see it from the taskbar. The screen shows today’s minutes and a chart of the last seven days.</p>
      ${gOpen('focus', 'Open Focus')}` },

    { id: 'money', title: 'Money', body: `
      <p class="lead">A simple record of what you spend, so there are no surprises at month end.</p>
      <h4>How to use it</h4>
      <ul>
        <li>Press <b>Log expense</b>. Enter the amount, pick a category, and add a note if you want. Do it right after you spend.</li>
        <li>Use the arrows at the top to look at other months.</li>
        <li>You see what you spent this month, the average per day, and a bar for each category. Click any entry to edit or delete it.</li>
        <li>Set a <b>monthly budget</b> in Settings. The bar turns red when you go over it.</li>
      </ul>
      ${gOpen('money', 'Open Money')}` },

    { id: 'notes', title: 'Notes', body: `
      <p class="lead">A quick place for ideas, lines, links and lists. Anything that is not a task or an event.</p>
      <h4>How to use it</h4>
      <ul>
        <li>Press <b>New note</b>, write, and press <kbd>Ctrl</kbd> <kbd>Enter</kbd> to save.</li>
        <li>Press the pin icon on a note to keep it at the top.</li>
        <li>Give a note a coloured label to group similar notes.</li>
        <li>Use the search box to find a note by any word.</li>
      </ul>
      ${callout('Fastest way to capture', 'Press <kbd>Ctrl</kbd> <kbd>K</kbd>, type your thought, and choose <b>Save as note</b>. You never have to leave what you were doing.')}
      ${gOpen('notes', 'Open Notes')}` },

    { id: 'review', title: 'Review', body: `
      <p class="lead">Once a week, step back and look at the whole week. This is what turns tracking into improvement.</p>
      <h4>What you see</h4>
      <ul>
        <li>Numbers for the week: habits done, tasks finished, journal days, average mood, sleep, water, focus minutes, pages read, and money spent.</li>
        <li>Small charts for habits and mood by day, and a bar for each habit.</li>
      </ul>
      <h4>What to write</h4>
      <ol>
        <li><b>What went well?</b> Name two or three things.</li>
        <li><b>What should change?</b> One or two honest things.</li>
        <li><b>Focus for next week.</b> One sentence.</li>
      </ol>
      <p>It saves as you type. Use the arrows to read older weeks. Sunday evening works well.</p>
      ${gOpen('review', 'Open Review')}` },

    { id: 'quick', title: 'Quick find and shortcuts', body: `
      <p class="lead">Press <kbd>Ctrl</kbd> <kbd>K</kbd> anywhere. It is the fastest way to use the app.</p>
      <ul>
        <li>Type the name of a screen, like “books”, and press <kbd>Enter</kbd> to go there.</li>
        <li>Type anything else, such as “call the bank tomorrow”. Choose <b>Add task</b> to save it as a task, or <b>Save as note</b> to save it as a note.</li>
        <li>Use it to add a habit, event, goal, book or expense, to start a focus session, or to export a backup.</li>
      </ul>
      ${gTable(['Keys', 'What they do'], [
        ['<kbd>Ctrl</kbd> <kbd>K</kbd>', 'Quick find and quick add'],
        ['<kbd>Alt</kbd> <kbd>1</kbd> to <kbd>9</kbd>', 'Jump to a screen, in the order of the left menu'],
        ['<kbd>F1</kbd>', 'Open this guide'],
        ['<kbd>Enter</kbd>', 'Save a form, or add a task from the task box'],
        ['<kbd>Ctrl</kbd> <kbd>Enter</kbd>', 'Save when you are writing a long note'],
        ['<kbd>Esc</kbd>', 'Close a window or the quick find']
      ])}` },

    { id: 'reminders', title: 'Reminders and the tray', body: `
      <p class="lead">Reminders only work while the app is running. Here is how to keep it running quietly.</p>
      <ul>
        <li>In <b>Settings</b>, turn on <b>Start with Windows</b>. The app opens quietly in the tray whenever you sign in.</li>
        <li>Keep <b>Keep running in the tray</b> on. Closing the window then hides the app instead of quitting it.</li>
        <li>The tray is near the clock. If you cannot see the icon, click the small arrow to show hidden icons.</li>
        <li>To quit completely, right-click the tray icon and choose <b>Quit</b>.</li>
      </ul>
      <h4>What you get</h4>
      <ul>
        <li><b>Event reminders</b>, at the time you chose for each event.</li>
        <li><b>A morning plan</b>, with your habits, tasks due and events. You choose the time in Settings.</li>
        <li><b>An evening check-in</b>, only if habits are still open, the journal is empty, or you are reading a book and have not logged pages.</li>
      </ul>
      ${callout('Not getting notifications?', 'Press <b>Send test</b> in Settings. If nothing appears, check that Windows is not in Do Not Disturb or Focus Assist, and that notifications are allowed for the app in Windows Settings.')}` },

    { id: 'data', title: 'Your data and backups', body: `
      <p class="lead">Everything stays on your computer. Nothing is sent anywhere.</p>
      <ul>
        <li>The app saves automatically every time you change something. There is no save button.</li>
        <li>Your data lives in <b>%APPDATA%\\Dinchariya</b>. In <b>Settings</b>, press <b>Open folder</b> to see it.</li>
        <li>The app also keeps one backup for each of the last 14 days, in a <b>backups</b> folder there.</li>
        <li>Updating or moving the app does not touch your data, because it is stored separately.</li>
      </ul>
      <h4>Moving to another computer</h4>
      <ol>
        <li>On the old one: <b>Settings</b>, then <b>Export</b>. Save the file somewhere you can reach.</li>
        <li>On the new one: install the app, then <b>Settings</b>, then <b>Import</b>, and choose that file.</li>
      </ol>
      ${callout('Be careful with Erase', '<b>Erase data</b> in Settings deletes everything and cannot be undone. Export a backup first if you are unsure.')}` },

    { id: 'tips', title: 'Making it a habit', body: `
      <p class="lead">An app only helps if you keep opening it. A few ideas to make that easy.</p>
      <ul>
        <li><b>Tie it to something you already do.</b> Open Today with your first cup of tea or coffee.</li>
        <li><b>Start with less than you think.</b> Three habits, a short task list, one goal. Add more only when this feels easy.</li>
        <li><b>Never miss twice.</b> If you skip a day, that is fine. Just do not skip the next one.</li>
        <li><b>Capture immediately.</b> Use <kbd>Ctrl</kbd> <kbd>K</kbd> the moment a thought appears. Do not trust your memory.</li>
        <li><b>Do the weekly review.</b> It takes ten minutes and keeps everything honest.</li>
        <li><b>Look for patterns.</b> In Review, notice how sleep, mood and habits move together. Then change one thing.</li>
      </ul>` }
  ];
}

const stripTags = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
function guideArticle() {
  const q = UI.guideQ.trim().toLowerCase();
  const secs = guideSections().filter((s) => !q || (s.title + ' ' + stripTags(s.body)).toLowerCase().includes(q));
  if (!secs.length) return `<div class="gnone">Nothing in the guide matches “${esc(UI.guideQ)}”. Try a simpler word, like “habit” or “reminder”.</div>`;
  return secs.map((s) => `<section class="gsec" id="g-${s.id}"><h2>${s.title}</h2>${s.body}</section>`).join('');
}
function guideToc() {
  const q = UI.guideQ.trim().toLowerCase();
  const secs = guideSections().filter((s) => !q || (s.title + ' ' + stripTags(s.body)).toLowerCase().includes(q));
  return secs.map((s) => `<button data-act="guide-jump" data-id="${s.id}" class="${UI.guideAt === s.id ? 'on' : ''}">${s.title}</button>`).join('');
}
VIEWS.guide = () => `
  <div class="pagehead"><div><h1>Guide</h1><div class="sub">How to use Dinchariya, one screen at a time.</div></div></div>
  <div class="guide">
    <aside class="toc"><div class="search" style="margin-bottom:14px">${icon('search', 15)}<input id="gq" placeholder="Search the guide" value="${esc(UI.guideQ)}"></div><div id="gtoc" class="toc" style="position:static">${guideToc()}</div></aside>
    <article class="gart" id="garticle">${guideArticle()}</article>
  </div>`;
AFTER.guide = () => {
  const v = $('#view'); if (!v) return;
  v.onscroll = () => {
    if (UI.view !== 'guide') return;
    const secs = $$('.gsec'); if (!secs.length) return;
    const top = v.getBoundingClientRect().top + 90; let cur = secs[0].id.slice(2);
    secs.forEach((s) => { if (s.getBoundingClientRect().top <= top) cur = s.id.slice(2); });
    if (cur !== UI.guideAt) { UI.guideAt = cur; $$('#gtoc button').forEach((b) => b.classList.toggle('on', b.dataset.id === cur)); }
  };
};
