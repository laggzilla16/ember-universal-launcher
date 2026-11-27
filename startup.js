// Windows startup registration helper.
// Uses Electron's login item API (HKCU\...\Run) for normal runs, and a per-user highest-privilege
// Task Scheduler logon task when NUKRON is run as administrator (because Windows silently skips
// elevated apps in HKCU\...\Run at sign-in).
const { execFileSync } = require('child_process');

const TASK_NAME = 'NUKRON';
const RUN_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
const LAYERS_KEY = 'HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers';
const PCA_STORE_KEY = 'HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Compatibility Assistant\\Store';
const LEGACY_RUN_VALUES = ['electron.app.Ember Launcher', 'electron.app.NUKRON'];

const quote = s => '"' + String(s).replace(/"/g, '\\"') + '"';
const buildTaskCommand = ({ path: exe, args = [] }) => [quote(exe), ...args.map(a => /\s/.test(a) ? quote(a) : a)].join(' ');

function defaultRunCmd(bin, args) {
  try {
    const out = execFileSync(bin, args, { windowsHide: true, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return { ok: true, out: out || '' };
  } catch {
    return { ok: false, out: '' };
  }
}

function createStartupManager({ platform = process.platform, getOpts, getLoginItem, setLoginItem, runCmd = defaultRunCmd, isElevatedFn }) {
  let elevatedCache = null;
  const isElevated = () => {
    if (platform !== 'win32') return false;
    if (elevatedCache !== null) return elevatedCache;
    elevatedCache = typeof isElevatedFn === 'function' ? !!isElevatedFn() : runCmd('net.exe', ['session']).ok;
    return elevatedCache;
  };

  const taskMatchesCurrent = () => {
    if (platform !== 'win32') return false;
    const q = runCmd('schtasks.exe', ['/query', '/tn', TASK_NAME, '/fo', 'LIST', '/v']);
    if (!q.ok) return false;
    const exe = String(getOpts().path || '').toLowerCase();
    return !!exe && q.out.toLowerCase().includes(exe);
  };

  const deleteTask = () => { if (platform === 'win32') runCmd('schtasks.exe', ['/delete', '/tn', TASK_NAME, '/f']); };
  const cleanLegacyRun = () => {
    if (platform !== 'win32') return;
    for (const v of LEGACY_RUN_VALUES) runCmd('reg.exe', ['delete', RUN_KEY, '/v', v, '/f']);
  };
  const hasAdminLayer = exe => {
    if (platform !== 'win32' || !exe) return false;
    const r = runCmd('reg.exe', ['query', LAYERS_KEY, '/v', exe]);
    return r.ok && /\bRUNASADMIN\b/i.test(r.out);
  };
  const clearPcaStore = exe => {
    // Windows PCA records 0x60000020 in Compatibility Assistant\Store after a one-off "Run as administrator",
    // which causes explorer.exe to abort HKCU\...\Run at sign-in with PID 0.
    if (platform === 'win32' && exe) runCmd('reg.exe', ['delete', PCA_STORE_KEY, '/v', exe, '/f']);
  };
  const needsTask = exe => isElevated() || hasAdminLayer(exe);

  const isEnabled = () => {
    const opts = getOpts();
    let regOn = false;
    try { regOn = !!(getLoginItem(opts) && getLoginItem(opts).openAtLogin); } catch {}
    if (platform !== 'win32') return regOn;
    if (needsTask(opts.path)) return taskMatchesCurrent(); // HKCU\Run is silently ignored by Windows for elevated apps
    return regOn || taskMatchesCurrent();
  };

  const setEnabled = on => {
    const opts = getOpts();
    const enable = !!on;
    cleanLegacyRun();
    if (platform === 'win32' && needsTask(opts.path)) {
      // Clear HKCU\Run so Windows doesn't have a broken/duplicate entry, then manage the logon task.
      try { setLoginItem({ ...opts, openAtLogin: false }); } catch {}
      if (enable) {
        const tr = buildTaskCommand(opts);
        const r = runCmd('schtasks.exe', ['/create', '/tn', TASK_NAME, '/tr', tr, '/sc', 'onlogon', '/rl', 'highest', '/f']);
        if (!r.ok) {
          // Fallback to Run key if Task Scheduler is disabled on this machine
          clearPcaStore(opts.path);
          try { setLoginItem({ ...opts, openAtLogin: true }); } catch {}
          return true;
        }
      } else {
        deleteTask();
      }
      return isEnabled();
    }
    if (enable) clearPcaStore(opts.path);
    try { setLoginItem({ ...opts, openAtLogin: enable }); } catch {}
    if (!enable) deleteTask();
    return isEnabled();
  };

  const heal = () => {
    cleanLegacyRun();
    if (!isEnabled()) return setEnabled(true);
    const opts = getOpts();
    if (platform === 'win32' && !needsTask(opts.path) && !taskMatchesCurrent()) clearPcaStore(opts.path);
    return true;
  };

  return { isElevated, isEnabled, setEnabled, heal };
}

module.exports = { TASK_NAME, LEGACY_RUN_VALUES, buildTaskCommand, createStartupManager };
