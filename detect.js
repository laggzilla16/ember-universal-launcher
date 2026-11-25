// Auto-detection of library games that were started outside NUKRON (Steam, Riot Client, shortcuts...).
// Pure logic with injected dependencies so it can be unit tested without Electron.
const path = require('path').win32;

const low = s => String(s || '').trim().toLowerCase();
const ensureSep = d => (d.endsWith('\\') ? d : d + '\\');
const push = (m, k, id) => { if (!k) return; const a = m.get(k); if (a) { if (!a.includes(id)) a.push(id); } else m.set(k, [id]); };

// games: [{ id, exe, emulator, track, method, missing }]
// Returns lookup tables. "Not installed" (missing) games are never indexed.
function buildIndex(games) {
  const list = (Array.isArray(games) ? games : []).filter(g => g && Number.isFinite(Number(g.id)));
  const emuUsers = new Map();
  for (const g of list) if (low(g.emulator)) push(emuUsers, low(g.emulator), Number(g.id));
  const usable = list.filter(g => !g.missing);
  const idx = { exact: new Map(), track: new Map(), dirs: [] };
  const dirOf = g => ensureSep(path.dirname(low(g.exe)));
  for (const g of usable) {
    const id = Number(g.id), emu = low(g.emulator), aum = g.method === 'aumid', t = low(g.track);
    if (t) push(idx.track, path.basename(t), id);
    if (aum) continue; // Windows apps: "Process to track" only
    if (emu) { if (emuUsers.get(emu).length === 1) push(idx.exact, emu, id); continue; } // a shared emulator is ambiguous
    const exe = low(g.exe); if (!exe) continue;
    push(idx.exact, exe, id);
    const dir = dirOf(g);
    if (path.parse(dir).root === dir) continue; // never match a whole drive
    // the folder must belong to this game alone
    const shared = list.some(o => Number(o.id) !== id && !low(o.emulator) && o.method !== 'aumid' && low(o.exe)
      && (low(o.exe).startsWith(dir) || dir.startsWith(dirOf(o))));
    if (!shared) idx.dirs.push([dir, id]);
  }
  return idx;
}

// procs: [[pid, lowercasePath], ...] (or plain path strings). Returns unique game ids that are running.
// A process that could belong to several games is ambiguous and ignored.
function detect(procs, idx, skipIds, ignore) {
  const skip = skipIds instanceof Set ? skipIds : new Set(skipIds || []);
  const found = new Set();
  for (const item of Array.isArray(procs) ? procs : []) {
    const p = low(Array.isArray(item) ? item[1] : item);
    if (!p || (ignore && ignore(p))) continue;
    let ids = new Set([...(idx.exact.get(p) || []), ...(idx.track.get(path.basename(p)) || [])]);
    if (!ids.size) for (const [dir, id] of idx.dirs) if (p.startsWith(dir)) ids.add(id);
    if (ids.size === 1) found.add([...ids][0]);
  }
  return [...found].filter(id => !skip.has(id));
}

// deps: { scan(): Promise<list|null>, getGames(), isActive(id), isPending(id), start(id) -> bool, ignore(path), enabled() }
function createDetector(deps) {
  let busy = false;
  return {
    async run() {
      if (busy || !deps.enabled()) return [];
      busy = true;
      try {
        const procs = await deps.scan();
        if (!Array.isArray(procs) || !procs.length) return []; // a failed scan changes nothing
        if (!deps.enabled()) return [];
        const ids = detect(procs, buildIndex(deps.getGames()), new Set(), deps.ignore);
        const started = [];
        for (const id of ids) {
          if (deps.isActive(id) || deps.isPending(id)) continue; // single tracker per game, re-checked right before starting
          if (deps.start(id)) started.push(id);
        }
        return started;
      } catch { return []; } finally { busy = false; }
    }
  };
}

module.exports = { buildIndex, detect, createDetector };
