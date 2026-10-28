const $ = s => document.querySelector(s);
const S = { games: [], running: {}, sessions: [], view: 'dash', q: '', grp: '', sort: 'recent', loaded: false };
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
  return `<article class="card ${run ? 'run' : ''}" data-id="${g.id}" tabindex="0">
    <div class="art" style="${art(g)}">${g.cover ? '' : `<span>${esc(ini(g.name))}</span>`}</div><div class="shade"></div>
    ${run ? '<div class="live">Playing</div>' : ''}
    <div class="meta"><h3>${esc(g.name)}</h3><p data-t="${g.id}">${run ? clock(total(g)) : dur(total(g))}</p></div>
    <div class="acts"><button class="play">${run ? 'Running' : 'Play'}</button><button class="ico" data-edit title="Edit">⋯</button></div></article>`;
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

function render(anim = true) {
  const v = $('#view');
  v.innerHTML = !S.loaded ? skel() : { dash, lib, hist }[S.view]();
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
  b.innerHTML = `<i style="${art(g)}"></i><div><b>${esc(g.name)}</b><span>Session in progress</span></div><em data-s="${S.running[g.id]}">${clock(Date.now() - S.running[g.id])}</em>`;
  b.classList.add('show');
}
setInterval(() => { // live counters
  const now = Date.now();
  document.querySelectorAll('[data-t]').forEach(el => { const g = S.games.find(x => x.id == el.dataset.t); if (g) el.textContent = isRun(g) ? clock(total(g)) : dur(total(g)); });
  document.querySelectorAll('[data-s]').forEach(el => el.textContent = clock(now - el.dataset.s));
  const a = $('[data-all]'); if (a && !a.dataset.anim) a.textContent = (S.games.reduce((x, g) => x + total(g), 0) / 3.6e6).toFixed(1);
}, 1000);

async function load() { const d = await api.games(); S.games = d.games; S.running = d.running; }
async function go(v) { S.view = v; if (v === 'hist') S.sessions = await api.sessions(); render(); }
function toast(m) { const t = document.createElement('div'); t.textContent = m; $('#toast').append(t); setTimeout(() => t.remove(), 5000); }

async function launch(g, c) {
  if (isRun(g)) return toast(`${g.name} is already running.`);
  c.classList.add('launching');
  const r = await api.launch(g.id);
  if (!r.ok) { c.classList.remove('launching'); toast(r.error); }
}

function edit(g) {
  const d = $('#dlg'), isNew = !g;
  g = g || { name: '', exe: '', args: '', emulator: '', cover: '', track: '', grp: '' };
  const f = (id, label, k, ph = '') => `<label>${label}<span class="in"><input id="f-${id}" value="${esc(g[id])}" placeholder="${ph}">${k ? `<button class="btn ghost" data-f="${id}" data-k="${k}">Browse</button>` : ''}</span></label>`;
  d.innerHTML = `<div class="dl"><h1>${isNew ? 'Add game' : 'Edit game'}</h1>
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
      if (b.dataset.f === 'exe' && !v('name')) d.querySelector('#f-name').value = p.split(/[\\/]/).pop().replace(/\.[^.]+$/, '');
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

document.querySelectorAll('nav button').forEach(b => b.onclick = () => go(b.dataset.v));
$('#view').addEventListener('click', e => {
  if (e.target.closest('[data-add]')) return edit();
  const gr = e.target.closest('[data-grp]'); if (gr) { S.grp = gr.dataset.grp; return render(false); }
  const c = e.target.closest('.card'); if (!c) return;
  const g = S.games.find(x => x.id == c.dataset.id);
  e.target.closest('[data-edit]') ? edit(g) : launch(g, c);
});
$('#view').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.classList.contains('card')) e.target.click(); });
$('#view').addEventListener('input', e => { if (e.target.id === 'q') { S.q = e.target.value; $('#grid').innerHTML = gridHtml(); } });
$('#view').addEventListener('change', e => { if (e.target.id === 'sort') { S.sort = e.target.value; $('#grid').innerHTML = gridHtml(); } });
api.on('run', async () => { await load(); if (S.view === 'hist') S.sessions = await api.sessions(); render(false); });
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
  if (u.state === 'error') return toast('Could not check for updates. Please try again later.');
  updInfo = { ...updInfo, ...u }; upd.className = 'show';
  if (u.state === 'available') upd.innerHTML = `<b>Update available</b><p>Ember v${esc(vf(u.version))} is ready${u.portable ? ' to download' : ''}.</p><div class="ub"><button class="btn" id="u-go">${u.portable ? 'Download' : 'Update now'}</button>${later}</div>`;
  if (u.state === 'progress') upd.innerHTML = `<b>Downloading update…</b><div class="pb"><u style="width:${u.percent}%"></u></div><p>${u.percent}%</p>`;
  if (u.state === 'ready') upd.innerHTML = `<b>Update ready</b><p>Restart to finish installing. Otherwise it installs when you next close Ember.</p><div class="ub"><button class="btn" id="u-rs">Restart &amp; install</button>${later}</div>`;
}
upd.onclick = e => {
  if (e.target.id === 'u-no') upd.className = '';
  if (e.target.id === 'u-go') updInfo.portable ? api.open(updInfo.url) : (updUI({ state: 'progress', percent: 0 }), api.downloadUpdate());
  if (e.target.id === 'u-rs') api.installUpdate();
};
api.on('update', updUI);
api.version().then(v => { $('#ver').textContent = 'v' + vf(v.v); });
$('#ver').onclick = () => { toast('Checking for updates…'); api.checkUpdate(); };

function setTheme(t) {
  document.documentElement.dataset.theme = t; localStorage.setItem('theme', t); api.theme(t);
  $('#theme span').textContent = t === 'light' ? 'Dark mode' : 'Light mode';
}
$('#theme').onclick = () => setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
setTheme(document.documentElement.dataset.theme);

(async () => { // startup: splash plays for at least 1.5 s while the library loads
  const t0 = performance.now();
  await load(); await sleep(Math.max(0, 1500 - (performance.now() - t0)));
  S.loaded = true; render();
  $('#splash').classList.add('hide'); setTimeout(() => $('#splash').remove(), 800);
  if (localStorage.getItem('accepted') !== LEGAL.rev) setTimeout(welcome, 700);
})();
