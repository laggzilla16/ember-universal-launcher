const { app, BrowserWindow, Menu, ipcMain, dialog, shell, screen, Tray, nativeImage } = require('electron');
const { DatabaseSync } = require('node:sqlite');
const { spawn, execFile } = require('child_process');
const path = require('path'), fs = require('fs');

if (!app.requestSingleInstanceLock()) app.quit();

const POLL = 4000, GRACE = 15000, NOSHOW = 90000;
let win, db, overlayWin;
const active = new Map(); // gameId -> one tracker per game (prevents duplicate timers)

// ---- Overlay settings
const OVERLAY_SETTINGS_PATH = () => path.join(app.getPath('userData'), 'overlay-settings.json');
const DEFAULT_OVERLAY = { enabled: false, metrics: { cpu: true, gpu: true, vram: true, ram: true, cpuTemp: true, gpuTemp: true } };
let overlaySettings = { ...DEFAULT_OVERLAY };
let perfTimer = null;

function loadOverlaySettings() {
  try {
    const raw = fs.readFileSync(OVERLAY_SETTINGS_PATH(), 'utf8');
    overlaySettings = { ...DEFAULT_OVERLAY, ...JSON.parse(raw) };
    overlaySettings.metrics = { ...DEFAULT_OVERLAY.metrics, ...(overlaySettings.metrics || {}) };
  } catch { overlaySettings = { ...DEFAULT_OVERLAY, metrics: { ...DEFAULT_OVERLAY.metrics } }; }
}

function saveOverlaySettings() {
  try { fs.writeFileSync(OVERLAY_SETTINGS_PATH(), JSON.stringify(overlaySettings, null, 2)); } catch {}
}

// ---- Performance polling via PowerShell
async function pollMetrics() {
  const script = `
$r = @{ cpu=$null; gpu=$null; vramMB=$null; ramUsedGB=$null; ramTotalGB=$null; cpuTemp=$null; gpuTemp=$null }
try {
  $r.cpu = [math]::Round((Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average, 1)
} catch {}
try {
  $os = Get-CimInstance Win32_OperatingSystem
  $r.ramUsedGB = [math]::Round(($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / 1MB, 2)
  $r.ramTotalGB = [math]::Round($os.TotalVisibleMemorySize / 1MB, 2)
} catch {}
try {
  $gpuSamples = (Get-Counter '\\GPU Engine(*engtype_3D)\\Utilization Percentage' -ErrorAction Stop).CounterSamples | Where-Object CookedValue -gt 0
  if ($gpuSamples) { $r.gpu = [math]::Round(($gpuSamples | Measure-Object -Property CookedValue -Sum).Sum, 1) }
} catch {}
try {
  $vramSamples = (Get-Counter '\\GPU Process Memory(*)\\Local Usage' -ErrorAction Stop).CounterSamples
  if ($vramSamples) { $r.vramMB = [math]::Round(($vramSamples | Measure-Object -Property CookedValue -Sum).Sum / 1MB, 1) }
} catch {}
try {
  $temps = Get-WmiObject MSAcpi_ThermalZoneTemperature -Namespace 'root/wmi' -ErrorAction Stop
  if ($temps) {
    $kelvin = ($temps | Measure-Object -Property CurrentTemperature -Average).Average
    $r.cpuTemp = [math]::Round($kelvin / 10.0 - 273.15, 1)
  }
} catch {}
$r | ConvertTo-Json -Compress
`;
  return new Promise(res => {
    execFile('powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { windowsHide: true, maxBuffer: 1 << 20, timeout: 8000 },
      (err, out) => {
        if (err || !out) return res(null);
        try { res(JSON.parse(out.trim())); } catch { res(null); }
      }
    );
  });
}

function startPerfPolling() {
  if (perfTimer) return;
  perfTimer = setInterval(async () => {
    if (!overlayWin || overlayWin.isDestroyed() || !overlayWin.isVisible()) return;
    if (!active.size) return;
    const data = await pollMetrics();
    if (!data) return;
    // Compute RAM/VRAM percentages
    if (data.ramUsedGB != null && data.ramTotalGB) {
      data.ramPct = Math.round(data.ramUsedGB / data.ramTotalGB * 100);
    }
    data.vramPct = null; // can't easily know VRAM total from PDH; omit pct bar fill
    data.settings = overlaySettings;
    if (overlayWin && !overlayWin.isDestroyed()) {
      overlayWin.webContents.send('metrics', data);
    }
  }, 1000);
}

function stopPerfPolling() {
  if (perfTimer) { clearInterval(perfTimer); perfTimer = null; }
}

function createOverlayWin() {
  const { width } = screen.getPrimaryDisplay().workAreaSize;
  overlayWin = new BrowserWindow({
    width: 200, height: 320,
    x: width - 220, y: 60,
    transparent: true, frame: false,
    alwaysOnTop: true, skipTaskbar: true,
    focusable: false, show: false,
    resizable: false, movable: false,
    webPreferences: {
      preload: path.join(__dirname, 'renderer', 'overlay-preload.js'),
      contextIsolation: true, sandbox: true
    }
  });
  overlayWin.setAlwaysOnTop(true, 'screen-saver');
  overlayWin.setIgnoreMouseEvents(true, { forward: true });
  overlayWin.loadFile('renderer/overlay.html');
  overlayWin.on('closed', () => { overlayWin = null; });
}

function overlayShowIfEnabled() {
  if (!overlayWin || overlayWin.isDestroyed()) return;
  if (overlaySettings.enabled && active.size > 0) {
    overlayWin.showInactive();
    startPerfPolling();
  }
}

function overlayHide() {
  if (!overlayWin || overlayWin.isDestroyed()) return;
  overlayWin.hide();
}

// ---- Background mode: keep running in the system tray after the window is closed
const APP_SETTINGS_PATH = () => path.join(app.getPath('userData'), 'app-settings.json');
let appSettings = { background: true }, tray = null, quitting = false;
function loadAppSettings() { try { appSettings = { ...appSettings, ...JSON.parse(fs.readFileSync(APP_SETTINGS_PATH(), 'utf8')) }; } catch {} }
function saveAppSettings() { try { fs.writeFileSync(APP_SETTINGS_PATH(), JSON.stringify(appSettings, null, 2)); } catch {} }
function trayIcon() { // flame-coloured dot drawn in code (BGRA), so no image asset is needed
  const n = 32, buf = Buffer.alloc(n * n * 4), c = (n - 1) / 2;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const d = Math.hypot(x - c, y - c), a = Math.max(0, Math.min(1, c - d + 0.5)), t = (x + y) / (2 * n), i = (y * n + x) * 4;
    buf[i] = 255 * (1 - t) + 162 * t; buf[i + 1] = 108 * (1 - t) + 95 * t; buf[i + 2] = 124 * (1 - t) + 255 * t; buf[i + 3] = Math.round(255 * a); // B,G,R,A: purple -> pink
  }
  return nativeImage.createFromBitmap(buf, { width: n, height: n });
}
function showMain() { if (!win || win.isDestroyed()) return; if (win.isMinimized()) win.restore(); win.show(); win.focus(); }
function applyTray() {
  if (appSettings.background && !tray) {
    tray = new Tray(trayIcon()); tray.setToolTip('Ember Launcher');
    tray.setContextMenu(Menu.buildFromTemplate([{ label: 'Open Ember', click: showMain }, { type: 'separator' }, { label: 'Quit Ember', click: () => app.quit() }]));
    tray.on('click', showMain);
  } else if (!appSettings.background && tray) { tray.destroy(); tray = null; }
}

function initDb() {
  db = new DatabaseSync(path.join(app.getPath('userData'), 'launcher.db'));
  db.exec(`PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS games(id INTEGER PRIMARY KEY, name TEXT NOT NULL, exe TEXT NOT NULL,
      args TEXT DEFAULT '', emulator TEXT DEFAULT '', cover TEXT DEFAULT '', track TEXT DEFAULT '',
      grp TEXT DEFAULT '', added INTEGER);
    CREATE TABLE IF NOT EXISTS sessions(id INTEGER PRIMARY KEY, game_id INTEGER NOT NULL,
      started INTEGER NOT NULL, ended INTEGER, beat INTEGER);
    CREATE INDEX IF NOT EXISTS s_game ON sessions(game_id);`);
  // Backward-compatible migration: Windows (AUMID) apps. Existing rows get '' = classic exe/emulator launch.
  const cols = db.prepare('PRAGMA table_info(games)').all().map(c => c.name);
  if (!cols.includes('aumid')) db.exec("ALTER TABLE games ADD COLUMN aumid TEXT DEFAULT ''");
  if (!cols.includes('method')) db.exec("ALTER TABLE games ADD COLUMN method TEXT DEFAULT ''");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS g_aumid ON games(aumid) WHERE aumid<>''"); // no duplicate imports
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

// ---- Windows (Start menu) applications, launched through their registered AppID (AUMID)
const pending = new Set(); // games whose AUMID launch is still being prepared (blocks double clicks)
let startIds = null, startIdsAt = 0, startBusy = false; // cache of registered AppIDs, used to flag uninstalled apps
const validAumid = s => typeof s === 'string' && s.length > 0 && s.length <= 512 && /^[^\x00-\x1f"<>|*?]+$/.test(s);
const ps = (script, env) => new Promise(res => execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
  "[Console]::OutputEncoding=[Text.Encoding]::UTF8;$ErrorActionPreference='Stop';" + script],
  { windowsHide: true, maxBuffer: 1 << 25, timeout: 30000, env: { ...process.env, ...env } }, (e, out, err) => res({ e, out: out || '', err: err || '' })));

async function listStartApps() {
  const { e, out, err } = await ps('Get-StartApps | Select-Object Name,AppID | ConvertTo-Json -Compress');
  if (e) {
    const m = String(err || e.message);
    return { ok: false, error: e.killed ? 'Windows took too long to list applications. Please try again.'
      : /not recognized|CommandNotFound/i.test(m) ? "Get-StartApps isn't available on this version of Windows."
      : 'Could not read the Windows application list: ' + m.split(/\r?\n/).find(Boolean)?.slice(0, 160) };
  }
  let j = [];
  try { if (out.trim()) j = JSON.parse(out); } catch { return { ok: false, error: 'Could not understand the Windows application list.' }; }
  const seen = new Map(); // Get-StartApps returns a bare object (not an array) when there is a single result
  for (const a of Array.isArray(j) ? j : [j]) {
    const name = String(a?.Name ?? '').trim(), aumid = String(a?.AppID ?? '').trim();
    if (name && validAumid(aumid) && !seen.has(aumid.toLowerCase())) seen.set(aumid.toLowerCase(), { name, aumid });
  }
  const apps = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  startIds = new Set(apps.map(a => a.aumid.toLowerCase())); startIdsAt = Date.now();
  return { ok: true, apps };
}
function refreshStartIds() { // throttled background refresh so uninstalled apps get flagged in the library
  if (startBusy || Date.now() - startIdsAt < 3e5 || !db.prepare("SELECT 1 FROM games WHERE method='aumid' LIMIT 1").get()) return;
  startBusy = true; listStartApps().finally(() => { startBusy = false; startIdsAt = Date.now(); });
}
// Matches processes that live in the app's package folder (the real game, not the explorer.exe that activated it),
// plus the optional "process to track" name (needed for desktop-style AppIDs, which have no package folder).
function aumidMatcher(g, locs) {
  const dirs = locs.map(l => l.toLowerCase().replace(/[\\/]+$/, '') + path.sep), t = (g.track || '').trim().toLowerCase();
  return p => dirs.some(d => p.startsWith(d)) || (!!t && path.basename(p) === t);
}
async function launchAumid(g) {
  if (pending.has(g.id)) return { ok: true };
  pending.add(g.id);
  try {
    // One lookup: is the AppID still registered, and where is the package installed (the folder changes on updates).
    const r = await ps("$ErrorActionPreference='SilentlyContinue';$id=$env:EMBER_AUMID;$r=@{found=$false;loc=@()};"
      + 'if(Get-StartApps | Where-Object {$_.AppID -eq $id}){$r.found=$true};'
      + "if($id.Contains('!')){$f=$id.Split('!')[0];$r.loc=@(Get-AppxPackage -Name $f.Split('_')[0] | Where-Object {$_.PackageFamilyName -eq $f} | ForEach-Object {$_.InstallLocation})};"
      + '$r | ConvertTo-Json -Compress', { EMBER_AUMID: g.aumid });
    let info = null;
    try { info = JSON.parse(r.out.trim()); } catch {}
    if (info && info.found === false)
      return { ok: false, error: `${g.name} is no longer registered in the Windows Start menu. It may have been uninstalled. Remove it, or import it again after reinstalling.` };
    if (active.has(g.id)) return { ok: true };
    const locs = [].concat(info?.loc || []).filter(l => typeof l === 'string' && l);
    let child;
    try { child = spawn('explorer.exe', ['shell:AppsFolder\\' + g.aumid], { detached: true, stdio: 'ignore' }); }
    catch (e) { return { ok: false, error: `Windows could not start ${g.name}: ${e.message}` }; }
    // explorer.exe often exits with code 1 even when activation worked, so only a spawn failure counts here;
    // if the game never appears, the session is discarded with a clear message (see tick).
    child.on('error', e => finish(g.id, true, `Windows could not start ${g.name}: ${e.message}`));
    return startSession(g.id, g, '', aumidMatcher(g, locs), child);
  } finally { pending.delete(g.id); }
}

function startSession(id, g, exeKey, match, child) {
  child.unref();
  const now = Date.now();
  const sid = Number(db.prepare('INSERT INTO sessions(game_id,started,beat) VALUES(?,?,?)').run(id, now, now).lastInsertRowid);
  const st = { sid, started: now, last: now, seen: false, busy: false, exe: exeKey, match, aumid: g.method === 'aumid' };
  st.timer = setInterval(() => tick(id), POLL);
  active.set(id, st);
  setTimeout(() => tick(id), 1500);
  send('run');
  overlayShowIfEnabled(); // auto-show overlay if enabled
  return { ok: true };
}

function launch(id) {
  const g = db.prepare('SELECT * FROM games WHERE id=?').get(id);
  if (!g) return { ok: false, error: 'Game not found.' };
  if (active.has(id)) return { ok: true };
  if (g.method === 'aumid') return launchAumid(g);
  const exe = g.emulator || g.exe;
  if (!fs.existsSync(exe) || (g.emulator && !fs.existsSync(g.exe)))
    return { ok: false, error: `${g.name}'s files were not found. It may be uninstalled. Edit the game to point to its new location; your playtime is kept.` };
  if (g.emulator && [...active.values()].some(s => s.exe === exe.toLowerCase()))
    return { ok: false, error: 'Another game is already running in this emulator.' };
  const argv = (g.args.match(/"[^"]*"|\S+/g) || []).map(s => s.replace(/^"|"$/g, ''));
  if (g.emulator) argv.push(g.exe); // ROM / disc image goes to the emulator
  let child;
  try { child = spawn(exe, argv, { cwd: path.dirname(exe), detached: true, stdio: 'ignore' }); }
  catch (e) { return { ok: false, error: e.message }; }
  child.on('error', e => finish(id, true, `Could not start ${g.name}: ${e.message}. If it needs admin rights, run Ember as administrator.`));
  return startSession(id, g, exe.toLowerCase(), matcher(g), child);
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
    finish(id, true, st.aumid
      ? 'Ember could not detect this Windows app running. It may not support launching this way, or it runs outside its package folder. Set "Process to track" in the game settings.'
      : 'Ember could not detect the game running. Set "Process to track" in the game settings.');
}

function finish(id, discard, msg) {
  const st = active.get(id);
  if (!st) return;
  clearInterval(st.timer); active.delete(id);
  if (discard) db.prepare('DELETE FROM sessions WHERE id=?').run(st.sid);
  else db.prepare('UPDATE sessions SET ended=? WHERE id=?').run(Math.max(st.last, st.started), st.sid);
  send('run'); if (msg) send('toast', msg);
  // Hide overlay if no more games running
  if (!active.size) overlayHide();
}

const h = (c, f) => ipcMain.handle(c, (_, ...a) => f(...a));
h('games', () => (refreshStartIds(), {
  games: all(`SELECT g.*, COALESCE((SELECT SUM(ended-started) FROM sessions WHERE game_id=g.id AND ended IS NOT NULL),0) total,
    (SELECT MAX(started) FROM sessions WHERE game_id=g.id) last FROM games g`).map(g => ({ ...g, missing: g.method === 'aumid' ? !!startIds && !startIds.has(g.aumid.toLowerCase()) : !fs.existsSync(g.emulator || g.exe) || (!!g.emulator && !fs.existsSync(g.exe)) })),
  running: Object.fromEntries([...active].map(([i, s]) => [i, s.started]))
}));
h('sessions', () => all(`SELECT s.id, s.game_id, s.started, COALESCE(s.ended,s.beat) ended, s.ended IS NULL live
  FROM sessions s ORDER BY s.started DESC LIMIT 300`));
// Per-day, per-game playtime for the last 120 days; sessions crossing midnight are split between days.
const pad2 = n => String(n).padStart(2, '0');
h('stats', () => {
  const rows = all('SELECT game_id g, started s, ended e, beat b FROM sessions WHERE COALESCE(ended,beat,started) >= ?', Date.now() - 120 * 864e5);
  const out = {}, now = Date.now();
  for (const r of rows) {
    const end = r.e ?? (active.has(r.g) ? now : (r.b ?? r.s));
    for (let t = r.s; t < end;) {
      const d = new Date(t), next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
      const k = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}|${r.g}`;
      out[k] = (out[k] || 0) + Math.min(end, next) - t; t = next;
    }
  }
  return Object.entries(out).map(([k, ms]) => { const [day, g] = k.split('|'); return { day, g: +g, ms }; });
});
h('save', g => {
  const v = [(g.name || '').trim() || path.parse(g.exe).name || g.aumid || '', g.exe || '', g.args || '', g.emulator || '', g.cover || '', g.track || '', g.grp || ''];
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
// ---- Import Windows applications (Start menu)
h('import:list', async () => {
  const r = await listStartApps();
  if (!r.ok) return r;
  const have = new Set(all("SELECT aumid FROM games WHERE method='aumid'").map(x => x.aumid.toLowerCase()));
  return { ok: true, apps: r.apps.map(a => ({ ...a, imported: have.has(a.aumid.toLowerCase()) })) };
});
h('import:add', list => {
  let added = 0, skipped = 0;
  const ins = db.prepare("INSERT INTO games(name,exe,args,emulator,cover,track,grp,added,aumid,method) VALUES(?,?,?,?,?,?,?,?,?,?)");
  const has = db.prepare("SELECT 1 FROM games WHERE lower(aumid)=lower(?) AND method='aumid'");
  for (const a of (Array.isArray(list) ? list : []).slice(0, 500)) {
    const aumid = String(a?.aumid ?? '').trim(), name = String(a?.name ?? '').trim() || aumid;
    if (!validAumid(aumid) || (startIds && !startIds.has(aumid.toLowerCase())) || has.get(aumid)) { skipped++; continue; }
    try { ins.run(name, '', '', '', '', '', '', Date.now(), aumid, 'aumid'); added++; } catch { skipped++; }
  }
  return { added, skipped };
});
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

// ---- Overlay IPC handlers
h('overlay:toggle', () => {
  if (!overlayWin || overlayWin.isDestroyed()) return overlaySettings.enabled;
  if (overlayWin.isVisible()) {
    overlayHide();
    return false;
  } else {
    if (active.size > 0) { overlayWin.showInactive(); startPerfPolling(); }
    return true;
  }
});

h('overlay:settings', s => {
  overlaySettings = { ...overlaySettings, ...s, metrics: { ...overlaySettings.metrics, ...(s.metrics || {}) } };
  saveOverlaySettings();
  // Propagate settings to overlay window immediately
  if (overlayWin && !overlayWin.isDestroyed()) {
    overlayWin.webContents.send('settings', overlaySettings);
  }
  // If overlay was just enabled and a game is running, show it
  if (overlaySettings.enabled && active.size > 0) {
    overlayShowIfEnabled();
  } else if (!overlaySettings.enabled) {
    overlayHide();
  }
  return overlaySettings;
});

h('overlay:getSettings', () => overlaySettings);
h('app:getSettings', () => appSettings);
h('app:settings', s => { appSettings = { ...appSettings, background: !!s.background }; saveAppSettings(); applyTray(); return appSettings; });

h('overlay:show', () => {
  overlayShowIfEnabled();
  return true;
});

h('overlay:hide', () => {
  overlayHide();
  return true;
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

app.on('second-instance', showMain);
app.on('before-quit', () => {
  quitting = true;
  if (tray) { tray.destroy(); tray = null; }
  for (const [id, st] of active) { if (st.seen) st.last = Date.now(); finish(id, !st.seen); }
  stopPerfPolling();
  if (overlayWin && !overlayWin.isDestroyed()) overlayWin.destroy();
});
app.whenReady().then(() => {
  initDb();
  loadOverlaySettings(); loadAppSettings();
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 720, minHeight: 520, backgroundColor: '#0d0f1c', show: false,
    titleBarStyle: 'hidden', titleBarOverlay: { color: '#0d0f1c', symbolColor: '#8e94bb', height: 40 },
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true }
  });
  applyTray();
  // Closing the window hides it to the tray when background mode is on; otherwise the app really quits
  // (the hidden overlay window would otherwise keep the process alive after the main window closes).
  win.on('close', e => {
    if (appSettings.background && !quitting) { e.preventDefault(); win.hide(); }
    else app.quit();
  });
  win.loadFile('renderer/index.html');
  win.once('ready-to-show', () => { win.show(); createOverlayWin(); });
  initUpdates();
  setTimeout(() => checkUpdates(false), 6000);
  setInterval(() => checkUpdates(false), 6 * 3600 * 1000);
});
app.on('window-all-closed', () => app.quit());
