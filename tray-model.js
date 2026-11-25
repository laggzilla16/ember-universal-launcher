// Pure helpers for the tray menu, the global quick-launch hotkey and the quick-launch popup.
// No Electron dependency, so they can be unit tested (see test/tray.test.js).

const MODS = ['Ctrl', 'Alt', 'Shift'];
const NAMED = ['Space', 'Up', 'Down', 'Left', 'Right', 'Tab', 'Home', 'End', 'PageUp', 'PageDown', 'Insert', 'Delete'];
const DEFAULT_HOTKEY = 'Ctrl+Alt+N';

// Returns a normalized accelerator ("Ctrl+Alt+N") or null when it is not acceptable.
// Needs Ctrl or Alt (Shift alone would hijack normal typing) and exactly one non-modifier key.
function normalizeAccelerator(input) {
  if (typeof input !== 'string' || input.length > 40) return null;
  const parts = input.split('+').map(s => s.trim());
  if (parts.length < 2 || parts.some(p => !p)) return null;
  const mods = new Set(); let key = null;
  for (const raw of parts) {
    const p = raw.toLowerCase();
    const mod = p === 'control' ? 'Ctrl' : MODS.find(m => m.toLowerCase() === p);
    if (mod) { mods.add(mod); continue; }
    if (key) return null;
    if (/^[a-z0-9]$/.test(p)) key = p.toUpperCase();
    else if (/^f([1-9]|1\d|2[0-4])$/.test(p)) key = p.toUpperCase();
    else { const n = NAMED.find(x => x.toLowerCase() === p); if (!n) return null; key = n; }
  }
  if (!key || !(mods.has('Ctrl') || mods.has('Alt'))) return null;
  return [...MODS.filter(m => mods.has(m)), key].join('+');
}

const pad2 = n => String(n).padStart(2, '0');
function fmtElapsed(ms) {
  const s = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  return `${Math.floor(s / 3600)}:${pad2(Math.floor(s / 60) % 60)}:${pad2(s % 60)}`;
}
function fmtDur(ms) {
  const v = Math.max(0, Number(ms) || 0), m = Math.round(v / 60000);
  return m < 1 ? (v > 0 ? '<1m' : '0m') : m < 60 ? m + 'm' : Math.floor(m / 60) + 'h ' + pad2(m % 60) + 'm';
}
const clip = (s, n = 38) => { s = String(s ?? ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

// Playtime since local midnight. rows: [{ game_id, started, ended, beat }]; liveIds: games with a running session.
function todayMs(rows, now, liveIds) {
  const d = new Date(now), start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const live = liveIds instanceof Set ? liveIds : new Set(liveIds || []);
  let sum = 0;
  for (const r of Array.isArray(rows) ? rows : []) {
    const s = Number(r.started);
    if (!Number.isFinite(s) || s <= 0) continue;
    const raw = r.ended != null ? Number(r.ended) : (live.has(r.game_id) ? now : Number(r.beat ?? s));
    if (!Number.isFinite(raw)) continue;
    const e = Math.min(Math.max(s, raw), now);
    sum += Math.max(0, e - Math.max(s, start));
  }
  return sum;
}

const installed = games => (Array.isArray(games) ? games : []).filter(g => g && !g.missing);
const byRecent = (a, b) => (Number(b.last) || 0) - (Number(a.last) || 0) || (Number(b.added) || 0) - (Number(a.added) || 0) || String(a.name).localeCompare(String(b.name));

// Most recently played installed games (never-played games are not "recent").
function recentInstalled(games, n = 5) {
  return installed(games).filter(g => Number(g.last) > 0).sort(byRecent).slice(0, n);
}

// Quick-launch popup list: installed games only, recent first, filtered by search-as-you-type.
function popupList(games, query, limit = 60) {
  const terms = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
  return installed(games).filter(g => { const n = String(g.name).toLowerCase(); return terms.every(t => n.includes(t)); })
    .sort(byRecent).slice(0, limit);
}

// Text for the tray menu. running: { [gameId]: startedMs }
function buildTrayModel({ games, running, today, now }) {
  const list = Array.isArray(games) ? games : [], run = running || {};
  const cur = list.find(g => g && String(g.id) in run);
  return {
    session: cur ? `Playing ${clip(cur.name)} · ${fmtElapsed(now - Number(run[cur.id]))}` : 'Nothing running',
    today: `Today: ${fmtDur(today)}`,
    recent: recentInstalled(list, 5).map(g => ({ id: g.id, label: clip(g.name), running: String(g.id) in run }))
  };
}

module.exports = { DEFAULT_HOTKEY, normalizeAccelerator, fmtElapsed, fmtDur, todayMs, recentInstalled, popupList, buildTrayModel };
