// Run: node test/tray.test.js
const assert = require('assert');
const t = require('../tray-model.js');

// ---- accelerator validation
const ok = (i, o) => assert.strictEqual(t.normalizeAccelerator(i), o, i);
ok('Ctrl+Alt+N', 'Ctrl+Alt+N');
ok('alt+ctrl+n', 'Ctrl+Alt+N');
ok('Control+Shift+F12', 'Ctrl+Shift+F12');
ok('Alt+Space', 'Alt+Space');
ok('Ctrl+5', 'Ctrl+5');
for (const bad of ['', 'N', 'Ctrl', 'Ctrl+', 'Shift+N', 'Ctrl+Alt', 'Ctrl+N+M', 'Ctrl+Alt+Nope', 'Ctrl+F25', 'Ctrl+Alt+Esc', 'CommandOrControl+N', 'Ctrl++', null, undefined, 5, {}, 'Ctrl+' + 'a'.repeat(60)])
  assert.strictEqual(t.normalizeAccelerator(bad), null, String(bad));
assert.strictEqual(t.normalizeAccelerator(t.DEFAULT_HOTKEY), 'Ctrl+Alt+N');

// ---- formatting
assert.strictEqual(t.fmtElapsed(3725000), '1:02:05');
assert.strictEqual(t.fmtElapsed(-5), '0:00:00');
assert.strictEqual(t.fmtDur(0), '0m');
assert.strictEqual(t.fmtDur(20000), '<1m');
assert.strictEqual(t.fmtDur(12 * 60000), '12m');
assert.strictEqual(t.fmtDur(125 * 60000), '2h 05m');

// ---- today's playtime (midnight clamp, live and unfinished sessions)
const now = new Date(2026, 10, 25, 15, 0, 0).getTime(), H = 3600000;
const mid = new Date(2026, 10, 25).getTime();
assert.strictEqual(t.todayMs([{ game_id: 1, started: now - 2 * H, ended: now - H }], now, []), H);
assert.strictEqual(t.todayMs([{ game_id: 1, started: mid - H, ended: mid + H }], now, []), H, 'session crossing midnight counts only today');
assert.strictEqual(t.todayMs([{ game_id: 1, started: mid - 5 * H, ended: mid - 4 * H }], now, []), 0, 'yesterday ignored');
assert.strictEqual(t.todayMs([{ game_id: 7, started: now - H, ended: null, beat: now - 30 * 60000 }], now, [7]), H, 'live session runs to now');
assert.strictEqual(t.todayMs([{ game_id: 7, started: now - H, ended: null, beat: now - 30 * 60000 }], now, []), 30 * 60000, 'orphaned session ends at heartbeat');
assert.strictEqual(t.todayMs(null, now, null), 0);
assert.strictEqual(t.todayMs([{ game_id: 1, started: now + H, ended: now + 2 * H }], now, []), 0, 'future rows ignored');

// ---- recent / popup lists
const g = (id, name, o) => ({ id, name, last: 0, added: id, missing: false, ...o });
const games = [g(1, 'Alpha', { last: 100 }), g(2, 'Beta', { last: 500 }), g(3, 'Gamma', { last: 300, missing: true }),
  g(4, 'Delta', { last: 200 }), g(5, 'Epsilon', { last: 50 }), g(6, 'Zeta', { last: 400 }), g(7, 'Eta', { last: 10 }), g(8, 'Never Played')];
assert.deepStrictEqual(t.recentInstalled(games, 5).map(x => x.name), ['Beta', 'Zeta', 'Delta', 'Alpha', 'Epsilon']);
assert.ok(!t.recentInstalled(games, 10).some(x => x.missing || !x.last));
assert.deepStrictEqual(t.recentInstalled(null), []);
assert.deepStrictEqual(t.popupList(games, '').map(x => x.name), ['Beta', 'Zeta', 'Delta', 'Alpha', 'Epsilon', 'Eta', 'Never Played']);
assert.deepStrictEqual(t.popupList(games, 'ta').map(x => x.name), ['Beta', 'Zeta', 'Delta', 'Eta'], 'substring, recent first');
assert.deepStrictEqual(t.popupList(games, 'never pl').map(x => x.name), ['Never Played']);
assert.deepStrictEqual(t.popupList(games, 'gamma'), [], 'not installed games are not launchable');
assert.deepStrictEqual(t.popupList(games, 'zzz'), []);
assert.strictEqual(t.popupList(games, '', 3).length, 3);

// ---- tray model
let m = t.buildTrayModel({ games, running: {}, today: 0, now });
assert.strictEqual(m.session, 'Nothing running');
assert.strictEqual(m.today, 'Today: 0m');
assert.strictEqual(m.recent.length, 5);
m = t.buildTrayModel({ games, running: { 2: now - 65000 }, today: 90 * 60000, now });
assert.strictEqual(m.session, 'Playing Beta · 0:01:05');
assert.strictEqual(m.today, 'Today: 1h 30m');
assert.strictEqual(m.recent[0].running, true);
assert.strictEqual(m.recent[1].running, false);
assert.strictEqual(t.buildTrayModel({ games: [], running: null, today: 0, now }).recent.length, 0);
assert.ok(t.buildTrayModel({ games: [g(1, 'X'.repeat(100), { last: 1 })], running: {}, today: 0, now }).recent[0].label.length <= 38);

console.log('tray tests passed!');
