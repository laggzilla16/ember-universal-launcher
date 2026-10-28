const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const { DatabaseSync } = require('node:sqlite');
const { spawn, execFile } = require('child_process');
const path = require('path'), fs = require('fs');

if (!app.requestSingleInstanceLock()) app.quit();

const POLL = 4000, GRACE = 15000, NOSHOW = 90000;
let win, db;
const active = new Map(); // gameId -> one tracker per game (prevents duplicate timers)

function initDb() {
  db = new DatabaseSync(path.join(app.getPath('userData'), 'launcher.db'));
  db.exec(`PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS games(id INTEGER PRIMARY KEY, name TEXT NOT NULL, exe TEXT NOT NULL,
      args TEXT DEFAULT '', emulator TEXT DEFAULT '', cover TEXT DEFAULT '', track TEXT DEFAULT '',
      grp TEXT DEFAULT '', added INTEGER);
    CREATE TABLE IF NOT EXISTS sessions(id INTEGER PRIMARY KEY, game_id INTEGER NOT NULL,
      started INTEGER NOT NULL, ended INTEGER, beat INTEGER);
    CREATE INDEX IF NOT EXISTS s_game ON sessions(game_id);`);
  // Crash recovery: sessions left open are closed at their last heartbeat.
  db.prepare('UPDATE sessions SET ended=MAX(started,COALESCE(beat,started)) WHERE ended IS NULL').run();
}
const all = (sql, ...p) => JSON.parse(JSON.stringify(db.prepare(sql).all(...p)));
const send = (ch, ...a) => { if (win && !win.isDestroyed()) win.webContents.send(ch, ...a); };

// Lists full executable paths of every running process (works for elevated games too).
const scan = () => new Promise(res => execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
  'Get-CimInstance Win32_Process -Property ProcessId,ExecutablePath | Where-Object ExecutablePath | ForEach-Object { $_.ExecutablePath }'],
  { windowsHide: true, maxBuffer: 1 << 25 },
  (e, out) => res(e ? null : out.split(/\r?\n/).filter(Boolean).map(s => s.toLowerCase()))));

// A process belongs to the game if it is: the emulator exe, anything in the game's folder
// (covers launcher -> game hand-offs), or the optional "process to track" name.
function matcher(g) {
  const exe = (g.emulator || g.exe).toLowerCase(), dir = path.dirname(exe) + path.sep;
  const t = g.track.trim().toLowerCase();
  return p => p === exe || (!g.emulator && p.startsWith(dir)) || (t && path.basename(p) === t);
}

function launch(id) {
  const g = db.prepare('SELECT * FROM games WHERE id=?').get(id);
  if (!g) return { ok: false, error: 'Game not found.' };
  if (active.has(id)) return { ok: true };
  const exe = g.emulator || g.exe;
  if (!fs.existsSync(exe)) return { ok: false, error: 'File not found: ' + exe };
  if (g.emulator && [...active.values()].some(s => s.exe === exe.toLowerCase()))
    return { ok: false, error: 'Another game is already running in this emulator.' };
  const argv = (g.args.match(/"[^"]*"|\S+/g) || []).map(s => s.replace(/^"|"$/g, ''));
  if (g.emulator) argv.push(g.exe); // ROM / disc image goes to the emulator
  let child;
  try { child = spawn(exe, argv, { cwd: path.dirname(exe), detached: true, stdio: 'ignore' }); }
  catch (e) { return { ok: false, error: e.message }; }
  child.on('error', e => finish(id, true, `Could not start ${g.name}: ${e.message}. If it needs admin rights, run Ember as administrator.`));
  child.unref();
  const now = Date.now();
  const sid = Number(db.prepare('INSERT INTO sessions(game_id,started,beat) VALUES(?,?,?)').run(id, now, now).lastInsertRowid);
  const st = { sid, started: now, last: now, seen: false, busy: false, exe: exe.toLowerCase(), match: matcher(g) };
  st.timer = setInterval(() => tick(id), POLL);
  active.set(id, st);
  setTimeout(() => tick(id), 1500);
  send('run');
  return { ok: true };
}

async function tick(id) {
  const st = active.get(id);
  if (!st || st.busy) return;
  st.busy = true;
  const procs = await scan();
  st.busy = false;
  if (!active.has(id) || !procs) return; // a failed scan never ends a session
  const now = Date.now();
  if (procs.some(st.match)) {
    st.seen = true; st.last = now;
    db.prepare('UPDATE sessions SET beat=? WHERE id=?').run(now, st.sid); // heartbeat
  } else if (st.seen && now - st.last >= GRACE) finish(id);
  else if (!st.seen && now - st.started > NOSHOW)
    finish(id, true, 'Ember could not detect the game running. Set "Process to track" in the game settings.');
}

function finish(id, discard, msg) {
  const st = active.get(id);
  if (!st) return;
  clearInterval(st.timer); active.delete(id);
  if (discard) db.prepare('DELETE FROM sessions WHERE id=?').run(st.sid);
  else db.prepare('UPDATE sessions SET ended=? WHERE id=?').run(Math.max(st.last, st.started), st.sid);
  send('run'); if (msg) send('toast', msg);
}

const h = (c, f) => ipcMain.handle(c, (_, ...a) => f(...a));
h('games', () => ({
  games: all(`SELECT g.*, COALESCE((SELECT SUM(ended-started) FROM sessions WHERE game_id=g.id AND ended IS NOT NULL),0) total,
    (SELECT MAX(started) FROM sessions WHERE game_id=g.id) last FROM games g`),
  running: Object.fromEntries([...active].map(([i, s]) => [i, s.started]))
}));
h('sessions', () => all(`SELECT s.id, s.game_id, s.started, COALESCE(s.ended,s.beat) ended, s.ended IS NULL live
  FROM sessions s ORDER BY s.started DESC LIMIT 300`));
h('save', g => {
  const v = [(g.name || '').trim() || path.parse(g.exe).name, g.exe, g.args || '', g.emulator || '', g.cover || '', g.track || '', g.grp || ''];
  if (g.id) db.prepare('UPDATE games SET name=?,exe=?,args=?,emulator=?,cover=?,track=?,grp=? WHERE id=?').run(...v, g.id);
  else db.prepare('INSERT INTO games(name,exe,args,emulator,cover,track,grp,added) VALUES(?,?,?,?,?,?,?,?)').run(...v, Date.now());
  return true;
});
h('remove', id => {
  finish(id, false);
  db.prepare('DELETE FROM sessions WHERE game_id=?').run(id);
  db.prepare('DELETE FROM games WHERE id=?').run(id);
  return true;
});
h('launch', id => launch(id));
h('theme', t => {
  const c = t === 'light' ? { color: '#f3f4fb', symbolColor: '#5f6590' } : { color: '#0d0f1c', symbolColor: '#8e94bb' };
  if (win && !win.isDestroyed()) { win.setTitleBarOverlay({ ...c, height: 40 }); win.setBackgroundColor(c.color); }
});
h('pick', async kind => {
  const filters = { exe: [{ name: 'Programs', extensions: ['exe', 'lnk', 'bat'] }], file: [{ name: 'All files', extensions: ['*'] }],
    image: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }] }[kind];
  const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters });
  if (r.canceled) return null;
  if (kind !== 'image') return r.filePaths[0];
  const dir = path.join(app.getPath('userData'), 'covers'); // copy so covers survive moves/deletes
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, Date.now() + path.extname(r.filePaths[0]));
  fs.copyFileSync(r.filePaths[0], dest);
  return dest;
});

// ---- Updates: installed copies update in-app via GitHub Releases; portable copies are pointed to the release page.
const REPO = 'laggzilla16/ember-universal-launcher';
const portable = !!process.env.PORTABLE_EXECUTABLE_DIR;
const canAuto = app.isPackaged && !portable;
let manualCheck = false, updater;
const newer = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); return false; };
function initUpdates() {
  if (!canAuto) return;
  updater = require('electron-updater').autoUpdater;
  updater.autoDownload = false;
  updater.on('update-available', i => send('update', { state: 'available', version: i.version }));
  updater.on('update-not-available', () => manualCheck && send('update', { state: 'none' }));
  updater.on('download-progress', p => send('update', { state: 'progress', percent: Math.round(p.percent) }));
  updater.on('update-downloaded', i => send('update', { state: 'ready', version: i.version }));
  updater.on('error', e => manualCheck && send('update', { state: 'error', message: e.message }));
}
async function checkUpdates(manual) {
  manualCheck = manual;
  try {
    if (canAuto) return void await updater.checkForUpdates();
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { 'User-Agent': 'ember-launcher' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json(), v = String(j.tag_name).replace(/^v/, '');
    if (newer(v, app.getVersion())) send('update', { state: 'available', version: v, portable: true, url: j.html_url });
    else if (manual) send('update', { state: 'none' });
  } catch (e) { if (manual) send('update', { state: 'error', message: e.message }); }
}
h('version', () => ({ v: app.getVersion(), auto: canAuto }));
h('update:check', () => checkUpdates(true));
h('update:download', () => updater && updater.downloadUpdate());
h('update:install', () => updater && updater.quitAndInstall());
h('open', url => { if (String(url).startsWith(`https://github.com/${REPO}`)) shell.openExternal(url); });

app.on('before-quit', () => {
  for (const [id, st] of active) { if (st.seen) st.last = Date.now(); finish(id, !st.seen); }
});
app.whenReady().then(() => {
  initDb();
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 720, minHeight: 520, backgroundColor: '#0d0f1c', show: false,
    titleBarStyle: 'hidden', titleBarOverlay: { color: '#0d0f1c', symbolColor: '#8e94bb', height: 40 },
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true }
  });
  win.loadFile('renderer/index.html');
  win.once('ready-to-show', () => win.show());
  initUpdates();
  setTimeout(() => checkUpdates(false), 6000);
  setInterval(() => checkUpdates(false), 6 * 3600 * 1000);
});
app.on('window-all-closed', () => app.quit());
