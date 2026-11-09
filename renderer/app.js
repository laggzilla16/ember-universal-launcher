const $ = s => document.querySelector(s);
const S = { games: [], running: {}, sessions: [], view: 'dash', q: '', grp: '', sort: 'recent', loaded: false, stats: [], smode: 'daily', rank: '7', overlayOn: false };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const furl = p => 'file:///' + encodeURI(p.replace(/\\/g, '/')).replace(/#/g, '%23').replace(/'/g, '%27');
const pad = n => String(n).padStart(2, '0');
const safeMs = ms => (Number.isFinite(ms) && ms > 0 ? ms : 0);
const clock = ms => { const s = Math.max(0, Math.floor(safeMs(ms) / 1000)); return `${Math.floor(s / 3600)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`; };
const dur = ms => { const v = safeMs(ms), m = Math.round(v / 60000); return m < 1 ? (v > 0 ? '<1m' : '0m') : m < 60 ? m + 'm' : Math.floor(m / 60) + 'h ' + pad(m % 60) + 'm'; };
const cardDur = ms => {
  const v = safeMs(ms), m = Math.round(v / 60000);
  if (m < 1) return v > 0 ? '&lt;1<i>m</i>' : '0<i>m</i>';
  if (m < 60) return `${m}<i>m</i>`;
  const h = Math.floor(m / 60), rm = pad(m % 60);
  if (h < 24) return `${h}<i>h</i> ${rm}<i>m</i>`;
  return `${Math.floor(h / 24)}<i>d</i> ${h % 24}<i>h</i> ${rm}<i>m</i>`;
};
const hue = s => [...String(s || '')].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
const ini = n => String(n || '').split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
const isRun = g => !!(g && g.id in S.running);
const total = g => safeMs(Number(g?.total)) + (isRun(g) ? safeMs(Date.now() - Number(S.running[g.id])) : 0);
const art = g => g?.cover ? `background-image:url('${furl(g.cover)}')`
  : `background:linear-gradient(150deg,hsl(${hue(g?.name)} 55% 30%),hsl(${(hue(g?.name) + 60) % 360} 60% 12%))`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const dkey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const monday = d => addDays(d, -((d.getDay() + 6) % 7));
const sumRows = f => S.stats.reduce((a, r) => f(r) ? a + safeMs(Number(r.ms)) : a, 0);
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function relPlayed(ts, now = Date.now()) {
  const t = Number(ts);
  if (!Number.isFinite(t) || t <= 0) return 'Never played';
  const d = new Date(t), today = new Date(now);
  const dk = dkey(d), tk = dkey(today), yk = dkey(addDays(today, -1));
  if (dk === tk) {
    const mins = Math.max(0, Math.floor((now - t) / 60000));
    if (mins < 2) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return hrs < 8 ? `${hrs}h ago` : 'Today';
  }
  if (dk === yk) return 'Yesterday';
  const dayDiff = Math.floor((new Date(today.getFullYear(), today.getMonth(), today.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5);
  if (dayDiff > 1 && dayDiff <= 6) return `${dayDiff}d ago`;
  return d.toLocaleDateString(undefined, d.getFullYear() === today.getFullYear() ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
}

function computeOverview(state = S, now = Date.now()) {
  const games = (Array.isArray(state?.games) ? state.games : []).filter(g => g && Number.isFinite(Number(g.id)));
  const running = state?.running && typeof state.running === 'object' ? state.running : {};
  const byId = new Map(games.map(g => [Number(g.id), g]));

  // Normalize and validate sessions chronologically
  const sessions = [];
  for (const s of (Array.isArray(state?.sessions) ? state.sessions : [])) {
    if (!s || typeof s !== 'object') continue;
    const g = byId.get(Number(s.game_id));
    const started = Number(s.started);
    if (!g || !Number.isFinite(started) || started <= 0 || started > now + 864e5) continue;
    const live = !!(s.live && (g.id in running));
    const rawEnd = live ? now : Number(s.ended ?? s.beat ?? started);
    const ended = Number.isFinite(rawEnd) && rawEnd >= started ? Math.min(rawEnd, now + 864e5) : started;
    sessions.push({
      id: s.id ?? `${g.id}-${started}`,
      game_id: g.id,
      g,
      started,
      ended,
      ms: Math.max(0, ended - started),
      live
    });
  }
  for (const [gid, rStartRaw] of Object.entries(running)) {
    const g = byId.get(Number(gid)), rStart = Number(rStartRaw);
    if (g && Number.isFinite(rStart) && rStart > 0 && rStart <= now + 864e5 && !sessions.some(x => x.game_id === g.id && x.live)) {
      sessions.push({ id: `live-${g.id}`, game_id: g.id, g, started: rStart, ended: Math.max(rStart, now), ms: Math.max(0, now - rStart), live: true });
    }
  }
  sessions.sort((a, b) => b.started - a.started || b.ended - a.ended);

  // Build daily split playtime rows (uses pre-split stats when present, or splits normalized sessions)
  let dailyRows = (Array.isArray(state?.stats) ? state.stats : []).filter(
    r => r && typeof r.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.day) && byId.has(Number(r.g)) && safeMs(Number(r.ms)) > 0
  ).map(r => ({ day: r.day, g: Number(r.g), ms: safeMs(Number(r.ms)) }));

  if (!dailyRows.length && sessions.length) {
    const splitMap = {};
    for (const s of sessions) {
      for (let t = s.started; t < s.ended;) {
        const d = new Date(t), next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
        if (!Number.isFinite(next) || next <= t) break;
        const k = `${dkey(d)}|${s.game_id}`;
        splitMap[k] = (splitMap[k] || 0) + Math.min(s.ended, next) - t;
        t = next;
      }
    }
    dailyRows = Object.entries(splitMap).map(([k, ms]) => { const [day, g] = k.split('|'); return { day, g: +g, ms }; });
  }

  // 1. Weekly Gaming Statistics (Monday - Sunday of current week)
  const today = new Date(now), todayKey = dkey(today);
  const mon = monday(today), sun = addDays(mon, 6), nextMon = addDays(mon, 7);
  const monMs = mon.getTime(), nextMonMs = nextMon.getTime();
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(mon, i), k = dkey(d);
    const dStart = d.getTime(), dEnd = addDays(d, 1).getTime();
    const ms = dailyRows.reduce((acc, r) => r.day === k ? acc + r.ms : acc, 0);
    const daySessions = sessions.filter(s => s.ended > dStart && s.started < dEnd).length;
    days.push({
      index: i,
      key: k,
      short: DAY_SHORT[i],
      full: DAY_FULL[i],
      dateNum: d.getDate(),
      title: d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
      ms,
      sessions: daySessions,
      now: k === todayKey,
      future: k > todayKey
    });
  }
  const weekTotalMs = days.reduce((a, d) => a + d.ms, 0);
  const weekSessions = sessions.filter(s => s.ended > monMs && s.started < nextMonMs);
  const activeDays = days.filter(d => d.ms > 0).length;
  const elapsedDays = Math.max(1, Math.min(7, Math.floor((today.getTime() - monMs) / 864e5) + 1));
  const weekly = {
    days,
    totalMs: weekTotalMs,
    sessionCount: weekSessions.length,
    activeDays,
    dailyAvgMs: weekTotalMs / elapsedDays,
    maxDayMs: Math.max(1, ...days.map(d => d.ms)),
    rangeLabel: `${mon.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${sun.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
  };

  // 2. Most Played This Month
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthStartKey = dkey(monthStart), monthStartMs = monthStart.getTime();
  const rollStart = addDays(today, -29), rollStartKey = dkey(rollStart), rollStartMs = rollStart.getTime();
  const calMap = {}, rollMap = {};
  for (const r of dailyRows) {
    if (r.day >= monthStartKey) calMap[r.g] = (calMap[r.g] || 0) + r.ms;
    if (r.day >= rollStartKey) rollMap[r.g] = (rollMap[r.g] || 0) + r.ms;
  }
  const useCal = Object.keys(calMap).length > 0;
  const activeMap = useCal ? calMap : rollMap;
  const sinceMs = useCal ? monthStartMs : rollStartMs;
  const monthLabel = useCal || !Object.keys(rollMap).length
    ? today.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : 'Last 30 days';

  const rankedMonth = games.map(g => {
    const ms = safeMs(activeMap[g.id] || 0);
    const sessCount = sessions.filter(s => s.game_id === g.id && s.ended > sinceMs).length || (ms > 0 ? 1 : 0);
    const gTotal = safeMs(Number(g.total)) + ((g.id in running) ? safeMs(now - Number(running[g.id])) : 0);
    return { g, ms, sessions: sessCount, gTotal };
  }).filter(x => x.ms > 0).sort((a, b) => b.ms - a.ms || b.gTotal - a.gTotal);

  const totalMonthMs = rankedMonth.reduce((a, x) => a + x.ms, 0);
  const maxMonthGameMs = rankedMonth[0]?.ms || 1;
  const monthly = {
    label: monthLabel,
    totalMs: totalMonthMs,
    items: rankedMonth.slice(0, 3).map((x, idx) => ({
      g: x.g,
      ms: x.ms,
      sessions: x.sessions,
      rank: idx + 1,
      pct: totalMonthMs > 0 ? Math.max(1, Math.round(x.ms / totalMonthMs * 100)) : 0,
      barPct: Math.max(4, Math.round(x.ms / maxMonthGameMs * 100))
    }))
  };

  // 3. Recently Played (top 3 most recently played games, highlighting the most-played among them)
  const recent = games.map(g => {
    const latestSess = sessions.find(s => s.game_id === g.id);
    const lastTs = Math.max(safeMs(Number(g.last)), latestSess ? latestSess.started : 0);
    const run = g.id in running;
    const totalMs = safeMs(Number(g.total)) + (run ? safeMs(now - Number(running[g.id])) : 0);
    return { g, lastTs, totalMs, run, featured: false, lastLabel: run ? 'Playing now' : (lastTs ? relPlayed(lastTs, now) : '') };
  }).filter(x => x.lastTs > 0 || x.run)
    .sort((a, b) => (b.run ? 1 : 0) - (a.run ? 1 : 0) || b.lastTs - a.lastTs)
    .slice(0, 3);

  if (recent.length) {
    let bestIdx = 0;
    for (let i = 1; i < recent.length; i++) {
      if (recent[i].totalMs > recent[bestIdx].totalMs) bestIdx = i;
    }
    recent[bestIdx].featured = true;
  }

  return { weekly, monthly, recent, totalSessions: sessions.length };
}

function card(g) {
  const run = isRun(g), t = total(g);
  return `<article class="card ${run ? 'run' : ''} ${g.missing ? 'missing' : ''}" data-id="${g.id}" tabindex="0">
    <div class="art" style="${art(g)}">${g.cover ? '' : `<span>${esc(ini(g.name))}</span>`}</div><div class="shade"></div>
    ${run ? '<div class="live">Playing</div>' : ''}${g.missing ? '<div class="gone" title="Game files not found (uninstalled, moved or drive disconnected). Playtime is kept.">Not installed</div>' : ''}
    <div class="meta"><h3>${esc(g.name)}</h3><div class="ptime${!run && t <= 0 ? ' zero' : ''}"><svg class="ptime-ico" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path class="ptime-hand" d="M8 4.8V8l2.2 1.4"/></svg><span class="ptime-val" data-t="${g.id}">${run ? clock(t) : cardDur(t)}</span></div></div>
    <div class="acts"><button class="play">${run ? 'Running' : g.missing ? 'Locate' : 'Play'}</button><button class="ico" data-edit title="Edit">⋯</button></div></article>`;
}

function recentCard(item) {
  const g = item.g || item, run = isRun(g), t = total(g), feat = !!item.featured;
  const lastLbl = item.lastLabel || (g.last ? relPlayed(g.last) : '');
  const playSvg = '<svg class="q-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 3.2l8.3 4.8-8.3 4.8z"/></svg>';
  const starSvg = '<svg class="feat-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.6l2 4 4.4.6-3.2 3.1.8 4.4L8 11.6l-4 2.1.8-4.4L1.6 6.2 6 5.6z"/></svg>';
  return `<article class="card recent-card ${feat ? 'featured' : ''} ${run ? 'run' : ''} ${g.missing ? 'missing' : ''}" data-id="${g.id}" tabindex="0">
    <div class="art" style="${art(g)}">${g.cover ? '' : `<span>${esc(ini(g.name))}</span>`}</div><div class="shade"></div>
    <div class="card-top">
      <div class="card-badges">
        ${feat ? `<span class="feat-badge" title="Most played among your recently played games">${starSvg}Most Played</span>` : ''}
        ${run ? '<div class="live">Playing</div>' : g.missing ? '<div class="gone" title="Game files not found (uninstalled, moved or drive disconnected). Playtime is kept.">Not installed</div>' : lastLbl ? `<div class="rec-badge" title="Last played ${esc(new Date(item.lastTs || g.last).toLocaleString())}">${esc(lastLbl)}</div>` : ''}
      </div>
      ${g.grp ? `<span class="grp-tag">${esc(g.grp)}</span>` : ''}
    </div>
    <div class="meta">
      <h3>${esc(g.name)}</h3>
      <div class="meta-row">
        <div class="ptime${!run && t <= 0 ? ' zero' : ''}"><svg class="ptime-ico" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path class="ptime-hand" d="M8 4.8V8l2.2 1.4"/></svg><span class="ptime-val" data-t="${g.id}">${run ? clock(t) : cardDur(t)}</span></div>
        <span class="qlaunch" aria-hidden="true" title="${run ? 'Running' : g.missing ? 'Locate game' : 'Quick launch ' + esc(g.name)}">${playSvg}${feat ? `<b>${run ? 'Running' : g.missing ? 'Locate' : 'Play'}</b>` : ''}</span>
      </div>
    </div>
    <div class="acts"><button class="play">${playSvg}<span>${run ? 'Running' : g.missing ? 'Locate' : 'Quick Launch'}</span></button><button class="ico" data-edit title="Edit">⋯</button></div></article>`;
}
const skel = () => `<div class="grid">${'<div class="sk"></div>'.repeat(8)}</div>`;

function dash(now = Date.now()) {
  const all = S.games.reduce((a, g) => a + total(g), 0);
  const rg = S.games.find(isRun);
  const ov = computeOverview(S, now);
  const wk = ov.weekly, mp = ov.monthly, recent = ov.recent;
  const playSvg = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 3.2l8.3 4.8-8.3 4.8z"/></svg>';

  return `<div class="dash-head"><h1>Dashboard</h1><span class="ov-pill"><i class="ov-dot"></i>Smart Gaming Overview</span></div>
    <section class="stats dash-stats">
      <div class="stat"><b data-all data-count="${all / 3.6e6}" data-dec="1">${(all / 3.6e6).toFixed(1)}</b><span>hours played</span></div>
      <div class="stat"><b data-wk-stat>${dur(wk.totalMs)}</b><span>${wk.sessionCount} session${wk.sessionCount === 1 ? '' : 's'} this week</span></div>
      <div class="stat"><b data-count="${S.games.length}">${S.games.length}</b><span>games in library</span></div>
      ${rg ? `<div class="stat now"><span>Playing now</span><b data-s="${S.running[rg.id]}">${clock(now - S.running[rg.id])}</b><span>${esc(rg.name)}</span></div>`
        : `<div class="stat"><b>—</b><span>nothing running</span></div>`}
    </section>

    <div class="dash-overview-grid">
      <section class="panel ov-panel wk-panel" aria-label="Weekly Gaming Statistics">
        <div class="panel-h wk-head">
          <div>
            <h2>Weekly Gaming Statistics</h2>
            <p class="panel-sub">${esc(wk.rangeLabel)} · Avg ${dur(wk.dailyAvgMs)}/day</p>
          </div>
          <div class="wk-pills">
            <span class="wk-pill"><b data-wk-total>${dur(wk.totalMs)}</b><span>played</span></span>
            <span class="wk-pill"><b data-wk-sessions>${wk.sessionCount}</b><span>session${wk.sessionCount === 1 ? '' : 's'}</span></span>
            <span class="wk-pill"><b>${wk.activeDays}/7</b><span>days</span></span>
          </div>
        </div>
        <div class="chart wk-chart">
          ${wk.days.map(c => `<div class="col ${c.now ? 'now' : ''} ${c.future ? 'future' : ''}" title="${esc(c.title)}: ${dur(c.ms)} (${c.sessions} session${c.sessions === 1 ? '' : 's'})">
            <span class="v">${c.ms ? dur(c.ms) : (c.now ? '0m' : '')}</span>
            <div class="b ${c.ms ? '' : 'z'}" style="height:${c.ms ? Math.max(6, Math.round(c.ms / wk.maxDayMs * 56)) : 4}px"></div>
            <span class="l"><b>${c.short}</b><i>${c.dateNum}</i></span>
          </div>`).join('')}
        </div>
      </section>

      <section class="panel ov-panel mp-panel" aria-label="Most Played This Month">
        <div class="panel-h">
          <div>
            <h2>Most Played This Month</h2>
            <p class="panel-sub">${esc(mp.label)}${mp.totalMs ? ' · ' + dur(mp.totalMs) + ' tracked' : ''}</p>
          </div>
          ${mp.items.length ? `<span class="ov-tag">Top ${mp.items.length}</span>` : ''}
        </div>
        ${mp.items.length ? `<div class="mp-list">${mp.items.map(({ g, ms, sessions, rank, pct, barPct }) => {
          const run = isRun(g);
          return `<div class="rk mp-row ${rank === 1 ? 'top1' : ''} ${run ? 'is-run' : ''}" data-game-id="${g.id}">
            <span class="n">${rank}</span>
            <i class="art-thumb" style="${art(g)}">${g.cover ? '' : `<span>${esc(ini(g.name))}</span>`}</i>
            <div class="mp-info">
              <b>${esc(g.name)}</b>
              <span>${pct}% of month · ${sessions} session${sessions === 1 ? '' : 's'}${g.missing ? ' · not installed' : ''}</span>
            </div>
            <em class="mp-dur">${dur(ms)}</em>
            <button class="mp-play ${run ? 'on' : ''}" data-launch="${g.id}" title="${run ? esc(g.name) + ' is running' : g.missing ? 'Locate ' + esc(g.name) : 'Quick launch ' + esc(g.name)}" aria-label="${run ? 'Running' : 'Quick launch ' + esc(g.name)}">
              ${run ? '<span class="mp-dot"></span>' : playSvg}
            </button>
            <u style="width:${barPct}%"></u>
          </div>`;
        }).join('')}</div>`
        : `<div class="empty ov-empty"><p>No tracked playtime this month yet. Launch a game to see your monthly rankings.</p></div>`}
      </section>
    </div>

    <div class="sec-head">
      <h2>Recently played</h2>
      <div class="sec-actions">
        ${S.games.length ? `<button class="sec-link" data-nav="lib">Browse Library →</button>` : ''}
      </div>
    </div>
    ${recent.length ? `<div class="grid recent-grid">${recent.map(recentCard).join('')}</div>`
      : `<div class="empty"><p>${S.games.length ? 'Games you play show up here with one-click quick launch.' : 'Games you play show up here.'}</p>${S.games.length ? '<button class="btn ghost" data-nav="lib">Open Library</button> ' : ''}<button class="btn" data-add>Add a game</button></div>`}`;
}

function filtered() {
  const k = { recent: (a, b) => (b.last || 0) - (a.last || 0) || b.added - a.added, name: (a, b) => a.name.localeCompare(b.name), played: (a, b) => total(b) - total(a) }[S.sort];
  return S.games.filter(g => (!S.grp || g.grp === S.grp) && g.name.toLowerCase().includes(S.q.toLowerCase())).sort(k);
}
const gridHtml = () => {
  const l = filtered(); return l.length ? l.map(card).join('')
    : `<div class="empty" style="grid-column:1/-1"><p>${S.games.length ? 'No games match your search.' : 'Your library is empty.'}</p>${S.games.length ? '' : '<button class="btn" data-add>Add your first game</button>'}</div>`;
};
function lib() {
  const groups = [...new Set(S.games.map(g => g.grp).filter(Boolean))].sort();
  return `<h1>Library</h1><div class="bar"><input id="q" placeholder="Search games" value="${esc(S.q)}">
    <select id="sort">${[['recent', 'Recently played'], ['name', 'Name'], ['played', 'Most played']].map(([v, t]) => `<option value="${v}" ${S.sort === v ? 'selected' : ''}>${t}</option>`).join('')}</select>
    <button class="btn" data-add>Add game</button></div>
    ${groups.length ? `<div class="bar"><button class="chip ${S.grp ? '' : 'on'}" data-grp="">All</button>${groups.map(x => `<button class="chip ${S.grp === x ? 'on' : ''}" data-grp="${esc(x)}">${esc(x)}</button>`).join('')}</div>` : ''}
    <div class="grid" id="grid">${gridHtml()}</div>`;
}

function hist() {
  const valid = S.sessions.filter(s => s && Number(s.started) > 0 && S.games.some(x => x.id === s.game_id));
  if (!valid.length) return `<h1>History</h1><div class="empty"><p>Play sessions will be listed here.</p></div>`;
  let day = '';
  const tf = { hour: '2-digit', minute: '2-digit' }, now = Date.now();
  return '<h1>History</h1>' + valid.map(s => {
    const g = S.games.find(x => x.id === s.game_id); if (!g) return '';
    const live = !!(s.live && isRun(g));
    const ended = live ? Math.max(s.started, now) : Math.max(s.started, Number(s.ended) || s.started);
    const d = new Date(s.started).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    const head = d !== day ? `<h2>${esc(day = d)}</h2>` : '';
    return head + `<div class="row"><i class="art-thumb" style="${art(g)}">${g.cover ? '' : `<span>${esc(ini(g.name))}</span>`}</i><div><b>${esc(g.name)}</b><span>${new Date(s.started).toLocaleTimeString([], tf)} – ${live ? 'now' : new Date(ended).toLocaleTimeString([], tf)}</span></div>
      ${live ? `<em class="on" data-s="${s.started}">${clock(now - s.started)}</em>` : `<em>${dur(ended - s.started)}</em>`}</div>`;
  }).join('');
}

function statsView() {
  const today = new Date(), tk = dkey(today), mk = dkey(monday(today));
  const tDay = sumRows(r => r.day === tk), tWeek = sumRows(r => r.day >= mk), l7 = sumRows(r => r.day >= dkey(addDays(today, -6)));
  const cols = [];
  if (S.smode === 'daily') for (let i = 13; i >= 0; i--) {
    const d = addDays(today, -i), k = dkey(d);
    cols.push({
      ms: sumRows(r => r.day === k), now: !i, t: d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
      l: `${d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 3)}<br>${d.getDate()}`
    });
  } else for (let i = 7; i >= 0; i--) {
    const m = monday(addDays(today, -7 * i)), a = dkey(m), b = dkey(addDays(m, 7)), t = 'Week of ' + m.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    cols.push({ ms: sumRows(r => r.day >= a && r.day < b), now: !i, t, l: m.toLocaleDateString(undefined, { month: 'short' }) + '<br>' + m.getDate() });
  }
  const max = Math.max(1, ...cols.map(c => c.ms));
  const n = S.rank === 'all' ? 0 : +S.rank, since = n ? dkey(addDays(today, -(n - 1))) : '', per = {};
  if (n) S.stats.forEach(r => { if (r.day >= since) per[r.g] = (per[r.g] || 0) + safeMs(Number(r.ms)); });
  const ranked = S.games.map(g => ({ g, ms: n ? (per[g.id] || 0) : total(g) })).filter(x => x.ms > 0).sort((a, b) => b.ms - a.ms);
  const sum = ranked.reduce((a, x) => a + x.ms, 0);
  const seg = (attr, cur, items) => `<div class="seg">${items.map(([v, t]) => `<button data-${attr}="${v}" class="${cur === v ? 'on' : ''}">${t}</button>`).join('')}</div>`;
  return `<h1>Statistics</h1><section class="stats">
    <div class="stat"><b>${dur(tDay)}</b><span>played today</span></div>
    <div class="stat"><b>${dur(tWeek)}</b><span>this week (Mon–Sun)</span></div>
    <div class="stat"><b>${dur(l7 / 7)}</b><span>daily average, last 7 days</span></div></section>
    <div class="panel"><div class="panel-h"><h2>Playtime</h2>${seg('sm', S.smode, [['daily', 'Daily'], ['weekly', 'Weekly']])}</div>
      <div class="chart">${cols.map(c => `<div class="col ${c.now ? 'now' : ''}" title="${esc(c.t)}: ${dur(c.ms)}"><span class="v">${c.ms ? dur(c.ms) : ''}</span><div class="b ${c.ms ? '' : 'z'}" style="height:${c.ms ? Math.max(6, c.ms / max * 150) : 4}px"></div><span class="l">${c.l}</span></div>`).join('')}</div></div>
    <div class="panel"><div class="panel-h"><h2>Most played</h2>${seg('rk', S.rank, [['7', '7 days'], ['30', '30 days'], ['all', 'All time']])}</div>
      ${ranked.length ? ranked.slice(0, 10).map(({ g, ms }, i) => `<div class="rk"><span class="n">${i + 1}</span><i class="art-thumb" style="${art(g)}">${g.cover ? '' : `<span>${esc(ini(g.name))}</span>`}</i>
        <div><b>${esc(g.name)}</b><span>${Math.round(ms / sum * 100)}% of playtime${g.missing ? ' · not installed' : ''}</span></div><em>${dur(ms)}</em><u style="width:${Math.max(2, ms / ranked[0].ms * 100)}%"></u></div>`).join('')
      : '<div class="empty"><p>No playtime recorded in this period yet.</p></div>'}</div>`;
}
async function loadStats() { S.stats = await api.stats(); }

function render(anim = true, grow = anim) {
  const v = $('#view'); v.classList.toggle('still', !grow);
  v.innerHTML = !S.loaded ? skel() : { dash, lib, stats: statsView, hist }[S.view]();
  if (anim) { v.classList.remove('in'); void v.offsetWidth; v.classList.add('in'); }
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.v === S.view));
  bar(); if (anim && S.loaded) count();
}
function count() {
  document.querySelectorAll('[data-count]').forEach(el => {
    const to = +el.dataset.count, dec = +el.dataset.dec || 0, t0 = performance.now(); el.dataset.anim = 1;
    const f = t => { const p = Math.min(1, (t - t0) / 800); el.textContent = (to * (1 - Math.pow(1 - p, 3))).toFixed(dec); p < 1 ? requestAnimationFrame(f) : delete el.dataset.anim; };
    requestAnimationFrame(f);
  });
}

function bar() {
  const b = $('#bar'), g = S.games.find(isRun);
  if (!g) return b.classList.remove('show');
  b.innerHTML = `<i style="${art(g)}"></i><div><b>${esc(g.name)}</b><span>Session in progress</span></div><em data-s="${S.running[g.id]}">${clock(Date.now() - S.running[g.id])}</em>
    <button class="ovl-btn${S.overlayOn ? ' on' : ''}" id="ovl-toggle" title="${S.overlayOn ? 'Hide performance overlay' : 'Show performance overlay'}">
      <svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 8h2l1.5 4L12 7l1.5 5L15 8h2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>`;
  b.classList.add('show');
}

setInterval(() => { // live counters
  const now = Date.now();
  document.querySelectorAll('[data-t]').forEach(el => {
    const g = S.games.find(x => x.id == el.dataset.t);
    if (!g) return;
    const t = total(g), run = isRun(g), html = run ? clock(t) : cardDur(t);
    if (el.innerHTML !== html) el.innerHTML = html;
    el.closest('.ptime')?.classList.toggle('zero', !run && t <= 0);
  });
  document.querySelectorAll('[data-s]').forEach(el => el.textContent = clock(now - el.dataset.s));
  const a = $('[data-all]'); if (a && !a.dataset.anim) a.textContent = (S.games.reduce((x, g) => x + total(g), 0) / 3.6e6).toFixed(1);
}, 1000);

// Overlay toggle handler on #bar
$('#bar').addEventListener('click', async e => {
  if (e.target.closest('#ovl-toggle')) {
    S.overlayOn = await api.overlayToggle();
    bar();
  }
});

async function load() {
  const [d, stats, sessions] = await Promise.all([api.games(), api.stats(), api.sessions()]);
  S.games = Array.isArray(d?.games) ? d.games : [];
  S.running = d?.running && typeof d.running === 'object' ? d.running : {};
  S.stats = Array.isArray(stats) ? stats : [];
  S.sessions = Array.isArray(sessions) ? sessions : [];
}
async function go(v) { S.view = v; await load(); render(); }
function toast(m) { const t = document.createElement('div'); t.textContent = m; $('#toast').append(t); setTimeout(() => t.remove(), 5000); }

async function launch(g, c) {
  if (g.missing) {
    if (g.method === 'aumid') { toast(`${g.name} is no longer registered in the Windows Start menu. It may have been uninstalled. You can remove it here; your playtime is kept until you do.`); return edit(g); }
    toast(`${g.name} isn't installed here. Pick its new location; your playtime and stats are kept.`); return edit(g);
  }
  if (isRun(g)) return toast(`${g.name} is already running.`);
  c.classList.add('launching');
  const r = await api.launch(g.id);
  if (!r.ok) { c.classList.remove('launching'); toast(r.error); }
}

function resetDlgScroll(d) {
  d.scrollTop = 0;
  d.scrollLeft = 0;
  requestAnimationFrame(() => { d.scrollTop = 0; d.scrollLeft = 0; });
}
function openDlg(d) {
  d.scrollTop = 0;
  d.scrollLeft = 0;
  if (!d.open) d.showModal();
  resetDlgScroll(d);
}

function edit(g) {
  const d = $('#dlg'), isNew = !g;
  g = g || { name: '', exe: '', args: '', emulator: '', cover: '', track: '', grp: '' };
  const aum = g.method === 'aumid'; // Windows app: launched by AppID, so no file / emulator / arguments
  const f = (id, label, k, ph = '') => `<label>${label}<span class="in"><input id="f-${id}" value="${esc(g[id])}" placeholder="${ph}">${k ? `<button class="btn ghost" data-f="${id}" data-k="${k}">Browse</button>` : ''}</span></label>`;
  d.innerHTML = `<div class="dl"><h1>${isNew ? 'Add game' : 'Edit game'}</h1>${isNew ? '<button class="btn ghost imp-open" id="to-import">Import Windows Applications</button>' : ''}${g.missing ? (aum ? '<p class="lead"><b>App not found.</b> It is no longer registered in the Windows Start menu, so it may have been uninstalled. Playtime, history and stats are kept until you remove it.</p>' : '<p class="lead"><b>Game files not found.</b> It may be uninstalled or on a disconnected drive. Playtime, history and stats are kept. Browse to the new location to relink it, or leave it as is to keep it in your library.</p>') : ''}
    ${aum ? `<label>Windows App ID<span class="in"><input value="${esc(g.aumid)}" readonly></span></label>` : f('exe', 'Game file (.exe, or a ROM/disc image when using an emulator)', 'file')}
    ${f('name', 'Name', '', 'Defaults to the file name')}
    ${f('cover', 'Cover image', 'image')}
    ${f('grp', 'Group', '', 'e.g. RPG, Emulated, Favorites')}
    ${aum ? '' : f('emulator', 'Emulator (optional)', 'exe', 'Leave empty for normal PC games')}
    ${aum ? '' : f('args', 'Launch arguments (optional)', '', '-windowed')}
    ${f('track', 'Process to track (optional)', '', aum ? 'Only needed if NUKRON cannot detect the app, e.g. game.exe' : 'e.g. game.exe — for games started through another launcher')}
    <div class="end">${isNew ? '' : '<button class="btn danger" id="del">Remove</button>'}<button class="btn ghost" id="cancel">Cancel</button><button class="btn" id="save">Save</button></div></div>`;
  const v = id => (d.querySelector('#f-' + id)?.value ?? '').trim();
  d.onclick = async e => {
    if (e.target.id === 'to-import') return importDlg();

    const b = e.target.closest('[data-f]');
    if (b) {
      const p = await api.pick(b.dataset.k); if (!p) return;
      d.querySelector('#f-' + b.dataset.f).value = p;
      if (b.dataset.f === 'exe' && !v('name')) d.querySelector('#f-name').value = p.split(/[\\\/]/).pop().replace(/\.[^.]+$/, '');
    }
    if (e.target.id === 'cancel') d.close();
    if (e.target.id === 'del') {
      if (e.target.dataset.sure) { await api.remove(g.id); d.close(); await load(); return render(false); }
      e.target.dataset.sure = 1; e.target.textContent = 'Click again to delete history too';
    }
    if (e.target.id === 'save') {
      if (!aum && !v('exe')) return toast('Choose a game file first.');
      await api.save({ ...g, name: v('name'), exe: v('exe'), cover: v('cover'), grp: v('grp'), emulator: v('emulator'), args: v('args'), track: v('track') });
      d.close(); await load(); render(false);
    }
  };
  openDlg(d);
}

// ---- Import Windows applications (Get-StartApps)
async function importDlg() {
  const d = $('#dlg'), sel = new Set();
  let apps = null, q = '';
  const shell = body => { d.innerHTML = `<div class="dl"><h1>Import Windows Applications</h1>${body}</div>`; resetDlgScroll(d); };
  const back = '<button class="btn ghost" id="imp-back">Back</button>';
  d.onclick = null;
  shell('<p class="lead">Reading applications registered in the Windows Start menu…</p><div class="end"><button class="btn ghost" id="imp-back">Cancel</button></div>');
  d.onclick = e => { if (e.target.id === 'imp-back') d.close(); };
  const r = await api.importList();
  if (!d.open) return;
  if (!r.ok) {
    shell(`<p class="lead"><b>Couldn't list applications.</b> ${esc(r.error)}</p><div class="end">${back}<button class="btn" id="imp-retry">Try again</button></div>`);
    d.onclick = e => { if (e.target.id === 'imp-back') edit(); if (e.target.id === 'imp-retry') importDlg(); };
    return;
  }
  apps = r.apps;
  const shown = () => apps.filter(a => a.name.toLowerCase().includes(q) || a.aumid.toLowerCase().includes(q)).slice(0, 400);
  const list = () => {
    const l = shown(); return l.length ? l.map(a => `<label class="imp-row ${a.imported ? 'done' : ''}"><input type="checkbox" data-id="${esc(a.aumid)}" ${a.imported ? 'disabled checked' : sel.has(a.aumid) ? 'checked' : ''}><div><b>${esc(a.name)}</b><span>${a.imported ? 'Already in your library' : esc(a.aumid)}</span></div></label>`).join('')
      : '<div class="empty" style="padding:24px"><p style="margin:0">No applications match your search.</p></div>';
  };
  const count = () => { const b = d.querySelector('#imp-go'); b.textContent = sel.size ? `Import ${sel.size} selected` : 'Import selected'; b.disabled = !sel.size; };
  shell(`<p class="lead">Pick the games to add. Store and Xbox games that can't be started from an .exe show up here.</p>
    <input id="imp-q" class="imp-q" placeholder="Search ${apps.length} applications" autocomplete="off">
    <div class="imp-list" id="imp-list">${list()}</div>
    <div class="end">${back}<button class="btn" id="imp-go" disabled>Import selected</button></div>`);
  d.querySelector('#imp-q').oninput = e => { q = e.target.value.trim().toLowerCase(); const il = d.querySelector('#imp-list'); il.innerHTML = list(); il.scrollTop = 0; };
  d.querySelector('#imp-list').onchange = e => { const c = e.target; if (!c.dataset.id) return; c.checked ? sel.add(c.dataset.id) : sel.delete(c.dataset.id); count(); };
  d.onclick = async e => {
    if (e.target.id === 'imp-back') return edit();
    if (e.target.id !== 'imp-go' || !sel.size) return;
    e.target.disabled = true;
    const res = await api.importAdd(apps.filter(a => sel.has(a.aumid) && !a.imported).map(({ name, aumid }) => ({ name, aumid })));
    d.close(); await load(); render(false);
    toast(res.added ? `Imported ${res.added} application${res.added > 1 ? 's' : ''}.${res.skipped ? ` ${res.skipped} skipped (already added or unavailable).` : ''}` : 'Nothing was imported (already added or unavailable).');
  };
  d.querySelector('#imp-q').focus();
}

// ---- Settings dialog
let overlaySettingsCache = null;

async function openSettings() {
  const initialOverlay = await api.overlayGetSettings();
  const initialApp = await api.appGetSettings();
  overlaySettingsCache = JSON.parse(JSON.stringify(initialOverlay));
  const s = overlaySettingsCache, app0 = { ...initialApp };
  const d = $('#dlg');

  const tog = (id, checked, label) =>
    `<label class="tog-row"><span>${label}</span><span class="tog"><input type="checkbox" id="${id}" ${checked ? 'checked' : ''}><span class="tog-thumb"></span></span></label>`;

  const layouts = [
    ['vertical', 'Vertical', '<svg viewBox="0 0 24 24"><rect x="6" y="3" width="12" height="18" rx="2.5"/><path d="M9 8h6M9 12h6M9 16h6"/></svg>'],
    ['horizontal', 'Horizontal', '<svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="10" rx="2.5"/><path d="M6 12h2M11 12h2M16 12h2"/></svg>'],
    ['compact', 'Compact', '<svg viewBox="0 0 24 24"><rect x="5" y="6" width="14" height="12" rx="3"/><path d="M9 10h2M13 10h2M9 14h2M13 14h2"/></svg>'],
    ['expanded', 'Expanded', '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 8h10M7 12h10M7 16h6"/></svg>']
  ];

  const sizes = [
    ['small', 'Small'],
    ['medium', 'Medium'],
    ['large', 'Large']
  ];

  const positions = [
    ['top-left', 'Top Left'],
    ['top-right', 'Top Right'],
    ['bottom-left', 'Bottom Left'],
    ['bottom-right', 'Bottom Right']
  ];

  d.innerHTML = `<div class="dl settings-dl">
    <div class="stab-bar">
      <button class="stab on" data-stab="perf">Performance Overlay</button>
      <button class="stab" data-stab="general">General</button>
    </div>

    <div class="stab-panel" id="stab-perf">
      <div class="tog-section">
        ${tog('s-enabled', s.enabled, 'Enable Performance Overlay')}
      </div>

      <h3 class="tog-head">Overlay Layout</h3>
      <div class="ovl-layout-grid" id="s-layout-group">
        ${layouts.map(([val, label, icon]) => `<button type="button" class="ovl-opt-btn ${s.layout === val ? 'on' : ''}" data-layout="${val}">${icon}<span>${label}</span></button>`).join('')}
      </div>

      <h3 class="tog-head">Overlay Size</h3>
      <div class="ovl-size-row" id="s-size-group">
        ${sizes.map(([val, label]) => `<button type="button" class="ovl-opt-btn ${s.size === val ? 'on' : ''}" data-size="${val}"><span>${label}</span></button>`).join('')}
      </div>

      <h3 class="tog-head">Screen Position</h3>
      <div class="ovl-pos-grid" id="s-pos-group">
        ${positions.map(([val, label]) => `<button type="button" class="ovl-pos-btn ${s.position === val ? 'on' : ''}" data-pos="${val}"><span>${label}</span><i class="p-dot"></i></button>`).join('')}
        <button type="button" class="ovl-pos-btn ovl-pos-custom ${s.position === 'custom' ? 'on' : ''}" data-pos="custom">
          <i class="p-dot"></i><span>Custom Position (Drag overlay on screen)</span>
        </button>
      </div>

      <h3 class="tog-head">Displayed Metrics</h3>
      <div class="tog-section metrics-grid">
        ${tog('s-fps', s.metrics.fps !== false, 'FPS Counter')}
        ${tog('s-cpu', s.metrics.cpu, 'CPU Usage')}
        ${tog('s-gpu', s.metrics.gpu, 'GPU Usage')}
        ${tog('s-vram', s.metrics.vram, 'VRAM Usage')}
        ${tog('s-ram', s.metrics.ram, 'RAM Usage')}
        ${tog('s-cpuTemp', s.metrics.cpuTemp, 'CPU Temperature')}
        ${tog('s-gpuTemp', s.metrics.gpuTemp, 'GPU Temperature')}
      </div>
      <p class="tog-note">Tip: You can drag the overlay directly to any custom spot on your screen while it is visible. All preferences persist automatically when saved.</p>
    </div>

    <div class="stab-panel hidden" id="stab-general">
      <div class="tog-section">
        ${tog('s-startup', app0.launchAtStartup, 'Launch NUKRON when Windows starts')}
      </div>
      <p class="tog-note">When on, NUKRON starts automatically when you sign into Windows (hidden in the system tray if Minimize to system tray is on). Turn off to stop it launching at sign-in.</p>
      <div class="tog-section">
        ${tog('s-bg', app0.background, 'Minimize to system tray')}
      </div>
      <p class="tog-note">When on, closing the window hides NUKRON to the system tray (look under the ^ "Show hidden icons" arrow in the taskbar). Playtime keeps being tracked, and the performance overlay still works. Right-click the tray icon and choose Quit NUKRON to exit completely. When off, closing the window exits NUKRON.</p>
      <div class="tog-section">
        ${tog('s-welcome', app0.showStartupMessage !== false, 'Show startup message')}
      </div>
      <p class="tog-note">When on, a small quote fades in for a few seconds in the corner of your screen the first time NUKRON starts with Windows. Shown once per Windows session, never over fullscreen games.</p>
    </div>

    <div class="end">
      <button class="btn ghost" id="cancel">Cancel</button>
      <button class="btn" id="save-settings">Save</button>
    </div>
  </div>`;

  let curLayout = s.layout || 'vertical';
  let curSize = s.size || 'medium';
  let curPos = s.position || 'top-right';

  const collectAndApply = async () => {
    const get = id => !!d.querySelector('#' + id)?.checked;
    const nextSettings = {
      enabled: get('s-enabled'),
      layout: curLayout,
      size: curSize,
      position: curPos,
      metrics: {
        fps: get('s-fps'),
        cpu: get('s-cpu'),
        gpu: get('s-gpu'),
        vram: get('s-vram'),
        ram: get('s-ram'),
        cpuTemp: get('s-cpuTemp'),
        gpuTemp: get('s-gpuTemp')
      }
    };
    overlaySettingsCache = await api.overlaySettings(nextSettings);
    S.overlayOn = overlaySettingsCache.enabled;
    bar();
  };

  // Tab switching
  d.querySelectorAll('.stab').forEach(btn => btn.onclick = () => {
    d.querySelectorAll('.stab').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    d.querySelectorAll('.stab-panel').forEach(p => p.classList.add('hidden'));
    d.querySelector('#stab-' + btn.dataset.stab).classList.remove('hidden');
    resetDlgScroll(d);
  });

  // Live checkbox changes
  d.querySelectorAll('#stab-perf input[type="checkbox"]').forEach(cb => {
    cb.onchange = () => collectAndApply();
  });

  d.onclick = async e => {
    const lBtn = e.target.closest('[data-layout]');
    if (lBtn) {
      curLayout = lBtn.dataset.layout;
      d.querySelectorAll('[data-layout]').forEach(b => b.classList.toggle('on', b.dataset.layout === curLayout));
      await collectAndApply();
      return;
    }
    const sBtn = e.target.closest('[data-size]');
    if (sBtn) {
      curSize = sBtn.dataset.size;
      d.querySelectorAll('[data-size]').forEach(b => b.classList.toggle('on', b.dataset.size === curSize));
      await collectAndApply();
      return;
    }
    const pBtn = e.target.closest('[data-pos]');
    if (pBtn) {
      curPos = pBtn.dataset.pos;
      d.querySelectorAll('[data-pos]').forEach(b => b.classList.toggle('on', b.dataset.pos === curPos));
      await collectAndApply();
      return;
    }
    if (e.target.id === 'cancel') {
      overlaySettingsCache = await api.overlaySettings(initialOverlay);
      await api.appSettings(initialApp);
      S.overlayOn = overlaySettingsCache.enabled;
      bar();
      d.close();
      return;
    }
    if (e.target.id === 'save-settings') {
      const get = id => !!d.querySelector('#' + id)?.checked;
      await api.appSettings({ background: get('s-bg'), launchAtStartup: get('s-startup'), showStartupMessage: get('s-welcome') });
      await collectAndApply();
      d.close();
      toast('Settings saved.');
    }
  };
  openDlg(d);
}

api.on('overlay:settings-updated', s => {
  overlaySettingsCache = s;
  S.overlayOn = !!s.enabled;
  bar();
  const d = $('#dlg');
  if (d && d.open && d.querySelector('#s-pos-group')) {
    d.querySelectorAll('[data-pos]').forEach(b => b.classList.toggle('on', b.dataset.pos === s.position));
  }
});

document.querySelectorAll('nav button').forEach(b => b.onclick = () => go(b.dataset.v));
$('#view').addEventListener('click', e => {
  if (e.target.closest('[data-add]')) return edit();
  const nav = e.target.closest('[data-nav]'); if (nav) return go(nav.dataset.nav);
  const ql = e.target.closest('[data-launch]');
  if (ql) {
    const g = S.games.find(x => x.id == ql.dataset.launch);
    if (g) return launch(g, ql.closest('.card, .rk, .tl-item') || ql);
  }
  const sm = e.target.closest('[data-sm]'); if (sm) { S.smode = sm.dataset.sm; return render(false, true); }
  const rk = e.target.closest('[data-rk]'); if (rk) { S.rank = rk.dataset.rk; return render(false, true); }
  const gr = e.target.closest('[data-grp]'); if (gr) { S.grp = gr.dataset.grp; return render(false); }
  const c = e.target.closest('.card'); if (!c) return;
  const g = S.games.find(x => x.id == c.dataset.id);
  e.target.closest('[data-edit]') ? edit(g) : launch(g, c);
});
$('#view').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.classList.contains('card')) e.target.click(); });
$('#view').addEventListener('input', e => { if (e.target.id === 'q') { S.q = e.target.value; $('#grid').innerHTML = gridHtml(); } });
$('#view').addEventListener('change', e => { if (e.target.id === 'sort') { S.sort = e.target.value; $('#grid').innerHTML = gridHtml(); } });
api.on('run', async () => { await load(); render(false, false); });
window.addEventListener('focus', async () => { // pick up reinstalled / reconnected games and updated stats
  if (!S.loaded || $('#dlg').open) return; await load(); render(false, false);
});
setInterval(async () => { if ((S.view === 'stats' || S.view === 'dash' || S.view === 'hist') && Object.keys(S.running).length && !$('#dlg').open) { await load(); render(false, false); } }, 30000);
api.on('toast', toast);

const vf = v => String(v).replace(/\.0$/, '');
function showLegal(k, back) {
  const L = LEGAL[k], d = $('#dlg');
  d.innerHTML = `<div class="dl legal"><h1>${esc(L.title)}</h1><span class="date">Last updated ${esc(L.date)}</span>
    ${L.sections.map(([h, ps]) => `<h2>${esc(h)}</h2>${ps.map(p => `<p>${esc(p)}</p>`).join('')}`).join('')}
    <div class="end"><button class="btn" id="cancel">Close</button></div></div>`;
  d.onclick = e => { if (e.target.id === 'cancel') d.close(); };
  d.onclose = () => { d.onclose = null; if (back) welcome(); };
  openDlg(d);
}
function welcome() {
  const d = $('#dlg');
  d.innerHTML = `<div class="dl"><h1>Welcome to NUKRON</h1>
    <p class="lead">NUKRON launches your games and tracks your playtime. Everything stays on this PC.</p>
    <p class="lead"><b>Please play fair.</b> NUKRON is made for games you own, from any store or platform (Steam, Epic, GOG, Xbox, standalone installers, or emulators with your own legal copies). Downloading cracked or pirated games isn't advised: it's illegal in many places, hurts the developers who make them, and cracked files are a common way malware spreads.</p>
    <p class="lead">By continuing you agree to the <a data-l="terms">Terms of Service</a> and <a data-l="privacy">Privacy Policy</a>.</p>
    <div class="end"><button class="btn" id="ok">I understand &amp; agree</button></div></div>`;
  d.oncancel = e => e.preventDefault();
  d.onclick = e => {
    const l = e.target.closest('[data-l]');
    if (l) { d.oncancel = null; return showLegal(l.dataset.l, true); }
    if (e.target.id === 'ok') { localStorage.setItem('accepted', LEGAL.rev); d.oncancel = null; d.close(); }
  };
  openDlg(d);
}
document.querySelector('.foot').addEventListener('click', e => { const l = e.target.closest('[data-l]'); if (l) showLegal(l.dataset.l); if (e.target.closest('#whatsnew')) showNews(); });

// ---- What's New
function showNews() {
  const d = $('#dlg');
  d.innerHTML = `<div class="dl legal"><h1>What's New</h1>
    ${CHANGELOG.map(c => `<h2>v${esc(c.v)}</h2>${c.items.map(i => `<p>${esc(i)}</p>`).join('')}`).join('')}</div>`;
  d.onclick = null;
  openDlg(d);
}

// ---- Click outside a popup to dismiss it (same as Cancel/Close; never saves)
(() => {
  const d = $('#dlg');
  let downOutside = false;
  const outside = e => {
    if (e.target !== d) return false; // clicks on content bubble from children
    const r = d.getBoundingClientRect(); // ignore the dialog's own scrollbar
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  };
  d.addEventListener('mousedown', e => { downOutside = outside(e); }); // so a text-selection drag released outside doesn't dismiss
  d.addEventListener('click', e => {
    const was = downOutside; downOutside = false;
    if (!was || !outside(e) || !d.open) return;
    if (d.oncancel) return; // mandatory dialogs (welcome / terms acceptance) can't be dismissed
    const c = d.querySelector('#save-settings') && d.querySelector('#cancel');
    c ? c.click() : d.close(); // Settings: Cancel also reverts live-previewed changes
  });
})();

// ---- updates
const upd = $('#upd');
const later = '<button class="btn ghost" id="u-no">Later</button>';
let updInfo = {};
function updUI(u) {
  if (u.state === 'none') return toast("You're up to date.");
  if (u.state === 'failed') return toast(String(u.message || 'The last update could not be installed.'));
  if (u.state === 'error') {
    if (updInfo.state === 'progress') { updInfo.clicked = false; updUI({ state: 'available', version: updInfo.version }); } // failed download: let the user retry
    const m = String(u.message || '');
    if (/404|latest\.yml|not found/i.test(m)) return toast("You're up to date. No newer release has been published yet.");
    return toast('Could not check for updates: ' + m.split('\n')[0].slice(0, 120));
  }
  updInfo = { ...updInfo, ...u };
  const b = $('#updbtn'), dl = '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M5 20h14"/></svg>';
  b.className = 'show' + (u.state === 'ready' ? ' ready' : '');
  b.disabled = u.state === 'progress';
  if (u.state === 'available') {
    if (u.version) localStorage.setItem('lastNotifiedVersion', u.version);
    b.innerHTML = `${dl}<span>Update available${u.portable ? '' : ' · v' + esc(vf(u.version))}</span>`;
  }
  if (u.state === 'progress') b.innerHTML = `${dl}<span>Downloading… ${u.percent}%</span><u style="width:${u.percent}%"></u>`;
  if (u.state === 'ready') {
    if (updInfo.clicked) return api.installUpdate(); // user already asked to update: restart straight away
    b.innerHTML = `${dl}<span>Restart to update</span>`;
  }
}
$('#updbtn').onclick = () => {
  if (updInfo.state === 'available') {
    if (updInfo.portable) return api.open(updInfo.url);
    updInfo.clicked = true; updUI({ state: 'progress', percent: 0 }); api.downloadUpdate();
  } else if (updInfo.state === 'ready') api.installUpdate();
};
api.on('update', updUI);
api.on('update:focus', u => {
  if (u && u.version) updUI({ state: 'available', ...u });
  const d = $('#dlg');
  if (!d.oncancel) showNews();
  $('#updbtn')?.focus();
});
api.version().then(v => {
  $('#ver').textContent = 'v' + vf(v.v);
  // Show What's New once after an update (fresh installs see the welcome dialog instead)
  const seen = localStorage.getItem('seenVersion');
  localStorage.setItem('seenVersion', v.v);
  if (seen !== v.v && localStorage.getItem('accepted') === LEGAL.rev) setTimeout(() => { if (!$('#dlg').open) showNews(); }, 2500);
});
$('#ver').onclick = () => { toast('Checking for updates…'); api.checkUpdate(); };

function setTheme(t) {
  document.documentElement.dataset.theme = t; localStorage.setItem('theme', t); api.theme(t);
  $('#theme span').textContent = t === 'light' ? 'Dark mode' : 'Light mode';
}
$('#theme').onclick = () => setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
$('#settings-btn').onclick = () => openSettings();
setTheme(document.documentElement.dataset.theme);

// ---- Custom Window Controls
const winMaxBtn = $('#win-max');
function syncMaxState(isMax) {
  if (!winMaxBtn) return;
  winMaxBtn.classList.toggle('is-max', !!isMax);
  winMaxBtn.title = isMax ? 'Restore' : 'Maximize';
  winMaxBtn.setAttribute('aria-label', isMax ? 'Restore' : 'Maximize');
}
$('#win-min')?.addEventListener('click', () => api.winMin());
winMaxBtn?.addEventListener('click', async () => syncMaxState(await api.winMax()));
$('#win-close')?.addEventListener('click', () => api.winClose());
api.on('win:max', syncMaxState);
api.winIsMax().then(syncMaxState);

(async () => { // startup: splash plays for at least 1.5 s while the library loads
  const t0 = performance.now();
  await load(); await sleep(Math.max(0, 1500 - (performance.now() - t0)));
  S.loaded = true; render();
  $('#splash').classList.add('hide'); setTimeout(() => $('#splash').remove(), 800);
  if (localStorage.getItem('accepted') !== LEGAL.rev) setTimeout(welcome, 700);
  // Sync overlay state
  const os = await api.overlayGetSettings();
  overlaySettingsCache = os;
  S.overlayOn = !!os.enabled;
  bar();
})();
