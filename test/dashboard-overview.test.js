// Run: node test/dashboard-overview.test.js. Verifies Smart Gaming Overview calculations, SQLite queries, and Dashboard rendering.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const root = path.join(__dirname, '..');
const appSrc = fs.readFileSync(path.join(root, 'renderer', 'app.js'), 'utf8');

// Extract the pure dashboard & overview functions from renderer/app.js for deterministic verification
const createOverviewHarness = () => {
  const stopIdx = appSrc.indexOf('function render(');
  assert(stopIdx > 0, 'Could not locate render() in renderer/app.js');
  const slice = appSrc.slice(0, stopIdx);
  const fn = new Function(
    'api',
    `${slice}\nreturn { S, dur, cardDur, clock, relPlayed, computeOverview, dash, recentCard, card, hist, statsView };`
  );
  return fn({ stats: async () => [], games: async () => ({ games: [], running: {} }), sessions: async () => [] });
};

const h = createOverviewHarness();

// 1. Test empty / missing state handling & layout order
{
  const emptyOv = h.computeOverview({ games: [], running: {}, stats: [], sessions: [] });
  assert.strictEqual(emptyOv.weekly.totalMs, 0);
  assert.strictEqual(emptyOv.weekly.sessionCount, 0);
  assert.strictEqual(emptyOv.weekly.days.length, 7);
  assert.deepStrictEqual(
    emptyOv.weekly.days.map(d => d.short),
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    'Weekly chart must always span Monday through Sunday'
  );
  assert.strictEqual(emptyOv.monthly.items.length, 0);
  assert.strictEqual(emptyOv.recent.length, 0);

  const emptyHtml = h.dash();
  assert(emptyHtml.includes('hours played'), 'Must keep hours played stat card');
  assert(emptyHtml.includes('this week'), 'Must keep sessions this week stat card');
  assert(emptyHtml.includes('games in library'), 'Must keep games in library stat card');
  assert(emptyHtml.includes('Weekly Gaming Statistics'));
  assert(emptyHtml.includes('Most Played This Month'));
  assert(emptyHtml.includes('Recently played'));
  assert(!emptyHtml.includes('Gaming Activity Timeline'), 'Gaming Activity Timeline must not be rendered on the dashboard');
  assert(
    emptyHtml.indexOf('Weekly Gaming Statistics') < emptyHtml.indexOf('Recently played'),
    'Weekly Gaming Statistics must appear above Recently played'
  );
  assert(
    emptyHtml.indexOf('Most Played This Month') < emptyHtml.indexOf('Recently played'),
    'Most Played This Month must appear above Recently played'
  );
}

// 2. Test SQLite database queries, 3 most recently played limit & malformed/incomplete session resilience
{
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE games(id INTEGER PRIMARY KEY, name TEXT NOT NULL, exe TEXT NOT NULL,
      args TEXT DEFAULT '', emulator TEXT DEFAULT '', cover TEXT DEFAULT '', track TEXT DEFAULT '',
      grp TEXT DEFAULT '', added INTEGER, aumid TEXT DEFAULT '', method TEXT DEFAULT '');
    CREATE TABLE sessions(id INTEGER PRIMARY KEY, game_id INTEGER NOT NULL,
      started INTEGER NOT NULL, ended INTEGER, beat INTEGER);
    CREATE INDEX s_game ON sessions(game_id);
    CREATE INDEX s_started ON sessions(started);
  `);

  // Fix reference time: Wednesday, Nov 11, 2026 at 18:00:00 local time
  const refNow = new Date(2026, 10, 11, 18, 0, 0, 0).getTime();
  const monStart = new Date(2026, 10, 9, 10, 0, 0, 0).getTime();   // Monday Nov 9, 10:00 AM
  const tueStart = new Date(2026, 10, 10, 20, 0, 0, 0).getTime();  // Tuesday Nov 10, 8:00 PM
  const wedStart = new Date(2026, 10, 11, 14, 0, 0, 0).getTime();  // Wednesday Nov 11, 2:00 PM
  const earlyMonthStart = new Date(2026, 10, 2, 12, 0, 0, 0).getTime(); // Nov 2, 12:00 PM

  db.prepare('INSERT INTO games(id, name, exe, grp, added) VALUES(1, ?, ?, ?, ?)').run('Cyberpunk 2077', 'C:\\Games\\cp2077.exe', 'RPG', earlyMonthStart);
  db.prepare('INSERT INTO games(id, name, exe, grp, added) VALUES(2, ?, ?, ?, ?)').run('Hades II', 'C:\\Games\\hades2.exe', 'Roguelike', earlyMonthStart);
  db.prepare('INSERT INTO games(id, name, exe, grp, added) VALUES(3, ?, ?, ?, ?)').run('Elden Ring', 'C:\\Games\\eldenring.exe', 'Action', earlyMonthStart);
  db.prepare('INSERT INTO games(id, name, exe, grp, added) VALUES(4, ?, ?, ?, ?)').run('Baldur\'s Gate 3', 'C:\\Games\\bg3.exe', 'RPG', earlyMonthStart);
  db.prepare('INSERT INTO games(id, name, exe, grp, added) VALUES(5, ?, ?, ?, ?)').run('Unplayed Title', 'C:\\Games\\unplayed.exe', 'Action', earlyMonthStart);

  const hr = 3600 * 1000;
  // Game 1: 3h earlier this month (Nov 2), 2h on Monday (Nov 9), 1.5h on Wednesday (Nov 11) -> 3.5h this week, 6.5h this month
  db.prepare('INSERT INTO sessions(game_id, started, ended, beat) VALUES(1, ?, ?, ?)').run(earlyMonthStart, earlyMonthStart + 3 * hr, earlyMonthStart + 3 * hr);
  db.prepare('INSERT INTO sessions(game_id, started, ended, beat) VALUES(1, ?, ?, ?)').run(monStart, monStart + 2 * hr, monStart + 2 * hr);
  db.prepare('INSERT INTO sessions(game_id, started, ended, beat) VALUES(1, ?, ?, ?)').run(wedStart, wedStart + 1.5 * hr, wedStart + 1.5 * hr);

  // Game 2: 4h on Tuesday (Nov 10) -> 4h this week, 4h this month
  db.prepare('INSERT INTO sessions(game_id, started, ended, beat) VALUES(2, ?, ?, ?)').run(tueStart, tueStart + 4 * hr, tueStart + 4 * hr);

  // Game 3: 1h on Monday afternoon (Nov 9) -> 1h this week, 1h this month
  db.prepare('INSERT INTO sessions(game_id, started, ended, beat) VALUES(3, ?, ?, ?)').run(monStart + 3 * hr, monStart + 4 * hr, monStart + 4 * hr);

  // Game 4: 2h earlier this month (Nov 3) -> 0h this week, 2h this month (4th most recent, should be excluded from top 3 recent)
  db.prepare('INSERT INTO sessions(game_id, started, ended, beat) VALUES(4, ?, ?, ?)').run(earlyMonthStart + 24 * hr, earlyMonthStart + 26 * hr, earlyMonthStart + 26 * hr);

  // Malformed / incomplete / orphaned rows that must be handled gracefully:
  db.prepare('INSERT INTO sessions(game_id, started, ended, beat) VALUES(1, ?, ?, ?)').run(monStart + 5 * hr, monStart + 4 * hr, monStart + 4 * hr);
  db.prepare('INSERT INTO sessions(game_id, started, ended, beat) VALUES(2, ?, NULL, NULL)').run(tueStart - 2 * hr);
  db.prepare('INSERT INTO sessions(game_id, started, ended, beat) VALUES(999, ?, ?, ?)').run(wedStart, wedStart + 5 * hr, wedStart + 5 * hr);
  db.prepare('INSERT INTO sessions(game_id, started, ended, beat) VALUES(1, 0, 1000, 1000)').run();

  const games = db.prepare(`
    SELECT g.*, COALESCE((SELECT SUM(MAX(0, ended-started)) FROM sessions WHERE game_id=g.id AND ended IS NOT NULL AND started>0),0) total,
      (SELECT MAX(started) FROM sessions WHERE game_id=g.id AND started>0) last FROM games g
  `).all();

  const sessions = db.prepare(`
    SELECT s.id, s.game_id, s.started, MAX(s.started, COALESCE(s.ended, s.beat, s.started)) ended, s.ended IS NULL live
    FROM sessions s INNER JOIN games g ON g.id=s.game_id WHERE s.started>0 ORDER BY s.started DESC LIMIT 300
  `).all().map(s => ({ ...s, live: false }));

  const state = { games, running: {}, stats: [], sessions };
  const ov = h.computeOverview(state, refNow);

  // Verify Weekly Gaming Statistics (Mon Nov 9 - Sun Nov 15)
  // Mon: 2h (G1) + 1h (G3) = 3h, Tue: 4h (G2), Wed: 1.5h (G1) => Total = 8.5h
  assert.strictEqual(ov.weekly.totalMs, 8.5 * hr, 'Weekly playtime should sum Monday, Tuesday, and Wednesday sessions');
  assert.strictEqual(ov.weekly.days[0].short, 'Mon');
  assert.strictEqual(ov.weekly.days[0].ms, 3 * hr);
  assert.strictEqual(ov.weekly.days[0].sessions, 2, 'Monday should count 2 valid sessions and exclude malformed rows');
  assert.strictEqual(ov.weekly.days[1].short, 'Tue');
  assert.strictEqual(ov.weekly.days[1].ms, 4 * hr);
  assert.strictEqual(ov.weekly.days[1].sessions, 1, 'Tuesday should count 1 valid session and exclude incomplete rows');
  assert.strictEqual(ov.weekly.days[2].short, 'Wed');
  assert.strictEqual(ov.weekly.days[2].ms, 1.5 * hr);
  assert.strictEqual(ov.weekly.days[2].sessions, 1, 'Wednesday should count 1 valid session');
  assert.strictEqual(ov.weekly.days[2].now, true, 'Wednesday must be marked as today');
  assert.strictEqual(ov.weekly.days[3].future, true, 'Thursday must be marked as future');
  assert.strictEqual(ov.weekly.activeDays, 3, '3 days had active playtime this week');

  // Verify Most Played This Month (Top 3: Cyberpunk: 6.5h, Hades II: 4h, Baldur's Gate 3: 2h)
  assert.strictEqual(ov.monthly.items.length, 3);
  assert.strictEqual(ov.monthly.items[0].g.name, 'Cyberpunk 2077');
  assert.strictEqual(ov.monthly.items[0].ms, 6.5 * hr);
  assert.strictEqual(ov.monthly.items[1].g.name, 'Hades II');
  assert.strictEqual(ov.monthly.items[1].ms, 4 * hr);
  assert.strictEqual(ov.monthly.items[2].g.name, 'Baldur\'s Gate 3');
  assert.strictEqual(ov.monthly.items[2].ms, 2 * hr);

  // Verify Recently Played shows exactly the top 3 most recently played games
  assert.strictEqual(ov.recent.length, 3, 'Dashboard Recently Played must display at most 3 most recently played games');
  assert.deepStrictEqual(
    ov.recent.map(r => r.g.name),
    ['Cyberpunk 2077', 'Hades II', 'Elden Ring'],
    'Top 3 recently played games must be ordered by most recent session'
  );
  assert.strictEqual(ov.recent[0].featured, true, 'Most played game among the 3 recent games must be marked featured');
  assert.strictEqual(ov.recent[1].featured, false);
  assert.strictEqual(ov.recent[2].featured, false);
  assert.strictEqual(ov.recent[1].lastLabel, 'Yesterday');

  // Verify full Dashboard HTML render with real data
  Object.assign(h.S, state);
  const html = h.dash(refNow);
  assert(html.includes('Cyberpunk 2077'));
  assert(html.includes('Hades II'));
  assert(html.includes('Elden Ring'));
  assert(html.includes('Quick Launch'));
  assert(html.includes('recent-card featured'), 'Most played of the 3 recently played games must render with featured hero card');
  assert(html.includes('Most Played'), 'Featured recent game card must display the Most Played badge');
  assert(html.includes('wk-pills'), 'Weekly Gaming Statistics must render compact inline pills');
  assert(html.includes('wk-grid'), 'Weekly Gaming Statistics must render subtle reference gridlines and baseline');
  assert(html.includes('wk-tip'), 'Weekly Gaming Statistics must render detailed daily playtime and session tooltips');
  assert(html.includes('b-track'), 'Weekly Gaming Statistics must render bar tracks for active and inactive days');
  assert(html.includes('stat-kicker'), 'Statistic cards must render structured typographic hierarchy');
  assert(html.includes('mp-crown'), 'First-ranked monthly game must include subtle #1 rank badge');
  assert(html.includes('rec-acts'), 'Recently played cards must include hover-revealed quick launch controls');
  assert(html.includes('data-launch="1"'));
  assert(html.includes('data-launch="2"'));
  assert(!html.includes('Gaming Activity Timeline'));
  assert(html.indexOf('Weekly Gaming Statistics') < html.indexOf('Recently played'));
  assert(html.indexOf('Most Played This Month') < html.indexOf('Recently played'));

  // 3. Verify midnight-crossing session splitting & live running session handling
  const monLate = new Date(2026, 10, 9, 23, 0, 0, 0).getTime(); // Mon 11:00 PM -> Tue 1:00 AM (1h Mon + 1h Tue)
  const liveStart = refNow - 30 * 60000; // Started 30m ago on Wednesday
  const liveState = {
    games,
    running: { 2: liveStart },
    stats: [],
    sessions: [
      { id: 10, game_id: 1, started: monLate, ended: monLate + 2 * hr, live: false }
    ]
  };
  const liveOv = h.computeOverview(liveState, refNow);
  assert.strictEqual(liveOv.weekly.days[0].ms, 1 * hr, 'Midnight-crossing session should allocate 1h to Monday');
  assert.strictEqual(liveOv.weekly.days[1].ms, 1 * hr, 'Midnight-crossing session should allocate 1h to Tuesday');
  assert.strictEqual(liveOv.weekly.days[2].ms, 30 * 60000, 'Live running session should allocate 30m to Wednesday');
  assert.strictEqual(liveOv.weekly.sessionCount, 2, 'Both completed and live sessions this week must be counted');
  assert.strictEqual(liveOv.recent[0].g.id, 2, 'Currently running game must be prioritized first in Recently Played');
}

// 4. Verify update version comparison for 1.5.2
{
  const updateNotify = require('../renderer/update-notify.js');
  assert.strictEqual(updateNotify.newer('1.5.2', '1.5.1'), true);
  assert.strictEqual(updateNotify.newer('v1.5.2', '1.5.1'), true);
  assert.strictEqual(updateNotify.newer('1.5.2', '1.5.2'), false);
  assert.strictEqual(updateNotify.newer('1.5.1', '1.5.2'), false);
}

console.log('dashboard-overview tests passed!');
