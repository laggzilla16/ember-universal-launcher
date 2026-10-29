const $ = s => document.querySelector(s);
const S = { games: [], running: {}, sessions: [], view: 'dash', q: '', grp: '', sort: 'recent', loaded: false, stats: [], smode: 'daily', rank: '7', overlayOn: false };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const furl = p => 'file:///' + encodeURI(p.replace(/\\/g, '/')).replace(/#/g, '%23').replace(/'/g, '%27');
const pad = n => String(n).padStart(2, '0');
const clock = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 3600)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`; };
const dur = ms => { const m = Math.round(ms / 60000); return m < 1 ? (ms > 0 ? '<1m' : '0m') : m < 60 ? m + 'm' : Math.floor(m / 60) + 'h ' + pad(m % 60) + 'm'; };
const hue = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
const ini = n => n.split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
const isRun = g => g.id in S.running;
const total = g => g.total + (isRun(g) ? Date.now() - S.running[g.id] : 0);
const art = g => g.cover ? `background-image:url('${furl(g.cover)}')`
  : `background:linear-gradient(150deg,hsl(${hue(g.name)} 55% 30%),hsl(${(hue(g.name) + 60) % 360} 60% 12%))`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function card(g) {
  const run = isRun(g);
  return `<article class="card ${run ? 'run' : ''} ${g.missing ? 'missing' : ''}" data-id="${g.id}" tabindex="0">
    <div class="art" style="${art(g)}">${g.cover ? '' : `<span>${esc(ini(g.name))}</span>`}</div><div class="shade"></div>
    ${run ? '<div class="live">Playing</div>' : ''}${g.missing ? '<div class="gone" title="Game files not found (uninstalled, moved or drive disconnected). Playtime is kept.">Not installed</div>' : ''}
    <div class="meta"><h3>${esc(g.name)}</h3><p data-t="${g.id}">${run ? clock(total(g)) : dur(total(g))}</p></div>
    <div class="acts"><button class="play">${run ? 'Running' : g.missing ? 'Locate' : 'Play'}</button><button class="ico" data-edit title="Edit">⋯</button></div></article>`;
}
const skel = () => `<div class="grid">${'<div class="sk"></div>'.repeat(8)}</div>`;

function dash() {
  const all = S.games.reduce((a, g) => a + total(g), 0);
  const recent = S.games.filter(g => g.last).sort((a, b) => b.last - a.last).slice(0, 6);
  const rg = S.games.find(isRun);
  return `<h1>Dashboard</h1><section class="stats">
    <div class="stat"><b data-all data-count="${all / 3.6e6}" data-dec="1">${(all / 3.6e6).toFixed(1)}</b><span>hours played</span></div>
    <div class="stat"><b data-count="${S.games.length}">${S.games.length}</b><span>games in library</span></div>
    ${rg ? `<div class="stat now"><span>Playing now</span><b data-s="${S.running[rg.id]}">${clock(Date.now() - S.running[rg.id])}</b><span>${esc(rg.name)}</span></div>`
         : `<div class="stat"><b>—</b><span>nothing running</span></div>`}</section>
    <h2>Recently played</h2>${recent.length ? `<div class="grid">${recent.map(card).join('')}</div>`
      : `<div class="empty"><p>Games you play show up here.</p><button class="btn" data-add>Add a game</button></div>`}`;
}

function filtered() {
  const k = { recent: (a, b) => (b.last || 0) - (a.last || 0) || b.added - a.added, name: (a, b) => a.name.localeCompare(b.name), played: (a, b) => total(b) - total(a) }[S.sort];
  return S.games.filter(g => (!S.grp || g.grp === S.grp) && g.name.toLowerCase().includes(S.q.toLowerCase())).sort(k);
}
const gridHtml = () => { const l = filtered(); return l.length ? l.map(card).join('')
  : `<div class="empty" style="grid-column:1/-1"><p>${S.games.length ? 'No games match your search.' : 'Your library is empty.'}</p>${S.games.length ? '' : '<button class="btn" data-add>Add your first game</button>'}</div>`; };
function lib() {
  const groups = [...new Set(S.games.map(g => g.grp).filter(Boolean))].sort();
  return `<h1>Library</h1><div class="bar"><input id="q" placeholder="Search games" value="${esc(S.q)}">
    <select id="sort">${[['recent', 'Recently played'], ['name', 'Name'], ['played', 'Most played']].map(([v, t]) => `<option value="${v}" ${S.sort === v ? 'selected' : ''}>${t}</option>`).join('')}</select>
    <button class="btn" data-add>Add game</button></div>
    ${groups.length ? `<div class="bar"><button class="chip ${S.grp ? '' : 'on'}" data-grp="">All</button>${groups.map(x => `<button class="chip ${S.grp === x ? 'on' : ''}" data-grp="${esc(x)}">${esc(x)}</button>`).join('')}</div>` : ''}
    <div class="grid" id="grid">${gridHtml()}</div>`;
}

function hist() {
  if (!S.sessions.length) return `<h1>History</h1><div class="empty"><p>Play sessions will be listed here.</p></div>`;
  let day = '';
  const tf = { hour: '2-digit', minute: '2-digit' };
  return '<h1>History</h1>' + S.sessions.map(s => {
    const g = S.games.find(x => x.id === s.game_id); if (!g) return '';
    const d = new Date(s.started).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    const head = d !== day ? `<h2>${esc(day = d)}</h2>` : '';
    return head + `<div class="row"><i style="${art(g)}"></i><div><b>${esc(g.name)}</b><span>${new Date(s.started).toLocaleTimeString([], tf)} – ${s.live ? 'now' : new Date(s.ended).toLocaleTimeString([], tf)}</span></div>
      ${s.live ? `<em class="on" data-s="${s.started}">${clock(Date.now() - s.started)}</em>` : `<em>${dur(s.ended - s.started)}</em>`}</div>`;
  }).join('');
}

const dkey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const monday = d => addDays(d, -((d.getDay() + 6) % 7));
const sumRows = f => S.stats.reduce((a, r) => f(r) ? a + r.ms : a, 0);
function statsView() {
  const today = new Date(), tk = dkey(today), mk = dkey(monday(today));
  const tDay = sumRows(r => r.day === tk), tWeek = sumRows(r => r.day >= mk), l7 = sumRows(r => r.day >= dkey(addDays(today, -6)));
  const cols = [];
  if (S.smode === 'daily') for (let i = 13; i >= 0; i--) {
    const d = addDays(today, -i), k = dkey(d);
    cols.push({ ms: sumRows(r => r.day === k), now: !i, t: d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
      l: `${d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 3)}<br>${d.getDate()}` });
  } else for (let i = 7; i >= 0; i--) {
    const m = monday(addDays(today, -7 * i)), a = dkey(m), b = dkey(addDays(m, 7)), t = 'Week of ' + m.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    cols.push({ ms: sumRows(r => r.day >= a && r.day < b), now: !i, t, l: m.toLocaleDateString(undefined, { month: 'short' }) + '<br>' + m.getDate() });
  }
  const max = Math.max(1, ...cols.map(c => c.ms));
  const n = S.rank === 'all' ? 0 : +S.rank, since = n ? dkey(addDays(today, -(n - 1))) : '', per = {};
  if (n) S.stats.forEach(r => { if (r.day >= since) per[r.g] = (per[r.g] || 0) + r.ms; });
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
      ${ranked.length ? ranked.slice(0, 10).map(({ g, ms }, i) => `<div class="rk"><span class="n">${i + 1}</span><i style="${art(g)}"></i>
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
  document.querySelectorAll('[data-t]').forEach(el => { const g = S.games.find(x => x.id == el.dataset.t); if (g) el.textContent = isRun(g) ? clock(total(g)) : dur(total(g)); });
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

async function load() { const d = await api.games(); S.games = d.games; S.running = d.running; }
async function go(v) { S.view = v; if (v === 'hist') S.sessions = await api.sessions(); if (v === 'stats') await loadStats(); render(); }
function toast(m) { const t = document.createElement('div'); t.textContent = m; $('#toast').append(t); setTimeout(() => t.remove(), 5000); }

async function launch(g, c) {
  if (g.missing) { toast(`${g.name} isn't installed here. Pick its new location; your playtime and stats are kept.`); return edit(g); }
  if (isRun(g)) return toast(`${g.name} is already running.`);
  c.classList.add('launching');
  const r = await api.launch(g.id);
  if (!r.ok) { c.classList.remove('launching'); toast(r.error); }
}

function edit(g) {
  const d = $('#dlg'), isNew = !g;
  g = g || { name: '', exe: '', args: '', emulator: '', cover: '', track: '', grp: '' };
  const f = (id, label, k, ph = '') => `<label>${label}<span class="in"><input id="f-${id}" value="${esc(g[id])}" placeholder="${ph}">${k ? `<button class="btn ghost" data-f="${id}" data-k="${k}">Browse</button>` : ''}</span></label>`;
  d.innerHTML = `<div class="dl"><h1>${isNew ? 'Add game' : 'Edit game'}</h1>${g.missing ? '<p class="lead"><b>Game files not found.</b> It may be uninstalled or on a disconnected drive. Playtime, history and stats are kept. Browse to the new location to relink it, or leave it as is to keep it in your library.</p>' : ''}
    ${f('exe', 'Game file (.exe, or a ROM/disc image when using an emulator)', 'file')}
    ${f('name', 'Name', '', 'Defaults to the file name')}
    ${f('cover', 'Cover image', 'image')}
    ${f('grp', 'Group', '', 'e.g. RPG, Emulated, Favorites')}
    ${f('emulator', 'Emulator (optional)', 'exe', 'Leave empty for normal PC games')}
    ${f('args', 'Launch arguments (optional)', '', '-windowed')}
    ${f('track', 'Process to track (optional)', '', 'e.g. game.exe — for games started through another launcher')}
    <div class="end">${isNew ? '' : '<button class="btn danger" id="del">Remove</button>'}<button class="btn ghost" id="cancel">Cancel</button><button class="btn" id="save">Save</button></div></div>`;
  const v = id => d.querySelector('#f-' + id).value.trim();
  d.onclick = async e => {
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
      if (!v('exe')) return toast('Choose a game file first.');
      await api.save({ ...g, name: v('name'), exe: v('exe'), cover: v('cover'), grp: v('grp'), emulator: v('emulator'), args: v('args'), track: v('track') });
      d.close(); await load(); render(false);
    }
  };
  d.showModal();
}

// ---- Settings dialog
let overlaySettingsCache = null;

async function openSettings() {
  overlaySettingsCache = await api.overlayGetSettings();
  const s = overlaySettingsCache, app0 = await api.appGetSettings();
  const d = $('#dlg');

  const tog = (id, checked, label) =>
    `<label class="tog-row"><span>${label}</span><span class="tog"><input type="checkbox" id="${id}" ${checked ? 'checked' : ''}><span class="tog-thumb"></span></span></label>`;

  d.innerHTML = `<div class="dl settings-dl">
    <div class="stab-bar">
      <button class="stab on" data-stab="perf">Performance Overlay</button>
      <button class="stab" data-stab="general">General</button>
    </div>

    <div class="stab-panel" id="stab-perf">
      <div class="tog-section">
        ${tog('s-enabled', s.enabled, 'Enable Performance Overlay')}
      </div>
      <h3 class="tog-head">Visible Metrics</h3>
      <div class="tog-section">
        ${tog('s-cpu', s.metrics.cpu, 'CPU Usage')}
        ${tog('s-gpu', s.metrics.gpu, 'GPU Usage')}
        ${tog('s-vram', s.metrics.vram, 'VRAM Usage')}
        ${tog('s-ram', s.metrics.ram, 'RAM Usage')}
        ${tog('s-cpuTemp', s.metrics.cpuTemp, 'CPU Temperature')}
        ${tog('s-gpuTemp', s.metrics.gpuTemp, 'GPU Temperature')}
      </div>
      <p class="tog-note">Overlay appears automatically when a game launches (if enabled). Use the monitor button in the bottom bar to toggle it while playing.</p>
    </div>

    <div class="stab-panel hidden" id="stab-general">
      <div class="tog-section">
        ${tog('s-bg', app0.background, 'Keep Ember running in the background when closed')}
      </div>
      <p class="tog-note">When on, closing the window hides Ember to the system tray (look under the ^ "Show hidden icons" arrow in the taskbar). Playtime keeps being tracked, and the performance overlay still works. Right-click the tray icon and choose Quit Ember to exit completely. When off, closing the window exits Ember.</p>
    </div>

    <div class="end">
      <button class="btn ghost" id="cancel">Cancel</button>
      <button class="btn" id="save-settings">Save</button>
    </div>
  </div>`;

  // Tab switching
  d.querySelectorAll('.stab').forEach(btn => btn.onclick = () => {
    d.querySelectorAll('.stab').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    d.querySelectorAll('.stab-panel').forEach(p => p.classList.add('hidden'));
    d.querySelector('#stab-' + btn.dataset.stab).classList.remove('hidden');
  });

  d.onclick = async e => {
    if (e.target.id === 'cancel') { d.close(); return; }
    if (e.target.id === 'save-settings') {
      const get = id => d.querySelector('#' + id).checked;
      const newSettings = {
        enabled: get('s-enabled'),
        metrics: {
          cpu: get('s-cpu'), gpu: get('s-gpu'), vram: get('s-vram'),
          ram: get('s-ram'), cpuTemp: get('s-cpuTemp'), gpuTemp: get('s-gpuTemp')
        }
      };
      await api.appSettings({ background: get('s-bg') });
      overlaySettingsCache = await api.overlaySettings(newSettings);
      S.overlayOn = overlaySettingsCache.enabled && Object.keys(S.running).length > 0;
      bar();
      d.close();
      toast('Settings saved.');
    }
  };
  d.showModal();
}

document.querySelectorAll('nav button').forEach(b => b.onclick = () => go(b.dataset.v));
$('#view').addEventListener('click', e => {
  if (e.target.closest('[data-add]')) return edit();
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
api.on('run', async () => { await load(); if (S.view === 'hist') S.sessions = await api.sessions(); if (S.view === 'stats') await loadStats(); render(false); });
window.addEventListener('focus', async () => { // pick up reinstalled / reconnected games
  if (!S.loaded || $('#dlg').open || S.view === 'stats') return; await load(); render(false);
});
setInterval(async () => { if (S.view === 'stats' && Object.keys(S.running).length && !$('#dlg').open) { await loadStats(); render(false); } }, 30000);
api.on('toast', toast);

const vf = v => String(v).replace(/\.0$/, '');
function showLegal(k, back) {
  const L = LEGAL[k], d = $('#dlg');
  d.innerHTML = `<div class="dl legal"><h1>${esc(L.title)}</h1><span class="date">Last updated ${esc(L.date)}</span>
    ${L.sections.map(([h, ps]) => `<h2>${esc(h)}</h2>${ps.map(p => `<p>${esc(p)}</p>`).join('')}`).join('')}
    <div class="end"><button class="btn" id="cancel">Close</button></div></div>`;
  d.onclick = e => { if (e.target.id === 'cancel') d.close(); };
  d.onclose = () => { d.onclose = null; if (back) welcome(); };
  d.showModal();
}
function welcome() {
  const d = $('#dlg');
  d.innerHTML = `<div class="dl"><h1>Welcome to Ember</h1>
    <p class="lead">Ember launches your games and tracks your playtime. Everything stays on this PC.</p>
    <p class="lead"><b>Please play fair.</b> Ember is made for games you own, from any store or platform (Steam, Epic, GOG, Xbox, standalone installers, or emulators with your own legal copies). Downloading cracked or pirated games isn't advised: it's illegal in many places, hurts the developers who make them, and cracked files are a common way malware spreads.</p>
    <p class="lead">By continuing you agree to the <a data-l="terms">Terms of Service</a> and <a data-l="privacy">Privacy Policy</a>.</p>
    <div class="end"><button class="btn" id="ok">I understand &amp; agree</button></div></div>`;
  d.oncancel = e => e.preventDefault();
  d.onclick = e => {
    const l = e.target.closest('[data-l]');
    if (l) { d.oncancel = null; return showLegal(l.dataset.l, true); }
    if (e.target.id === 'ok') { localStorage.setItem('accepted', LEGAL.rev); d.oncancel = null; d.close(); }
  };
  d.showModal();
}
document.querySelector('.foot').addEventListener('click', e => { const l = e.target.closest('[data-l]'); if (l) showLegal(l.dataset.l); });

// ---- updates
const upd = $('#upd');
const later = '<button class="btn ghost" id="u-no">Later</button>';
let updInfo = {};
function updUI(u) {
  if (u.state === 'none') return toast("You're up to date.");
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
  if (u.state === 'available') b.innerHTML = `${dl}<span>Update available${u.portable ? '' : ' · v' + esc(vf(u.version))}</span>`;
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
api.version().then(v => { $('#ver').textContent = 'v' + vf(v.v); });
$('#ver').onclick = () => { toast('Checking for updates…'); api.checkUpdate(); };

function setTheme(t) {
  document.documentElement.dataset.theme = t; localStorage.setItem('theme', t); api.theme(t);
  $('#theme span').textContent = t === 'light' ? 'Dark mode' : 'Light mode';
}
$('#theme').onclick = () => setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
$('#settings-btn').onclick = () => openSettings();
setTheme(document.documentElement.dataset.theme);

(async () => { // startup: splash plays for at least 1.5 s while the library loads
  const t0 = performance.now();
  await load(); await sleep(Math.max(0, 1500 - (performance.now() - t0)));
  S.loaded = true; render();
  $('#splash').classList.add('hide'); setTimeout(() => $('#splash').remove(), 800);
  if (localStorage.getItem('accepted') !== LEGAL.rev) setTimeout(welcome, 700);
  // Sync overlay state
  const os = await api.overlayGetSettings();
  S.overlayOn = os.enabled && Object.keys(S.running).length > 0;
})();
