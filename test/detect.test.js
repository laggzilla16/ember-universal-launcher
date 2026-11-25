// Run: node test/detect.test.js
const assert = require('assert');
const { buildIndex, detect, createDetector } = require('../detect.js');

const G = (id, o) => ({ id, exe: '', emulator: '', track: '', method: '', missing: false, ...o });
const games = [
  G(1, { exe: 'C:\\Games\\Alpha\\alpha.exe' }),
  G(2, { exe: 'C:\\Games\\Beta\\beta-launcher.exe', track: 'Beta-Win64-Shipping.exe' }),
  G(3, { exe: 'D:\\Roms\\a.iso', emulator: 'C:\\Emu\\solo\\solo.exe' }),
  G(4, { exe: 'D:\\Roms\\b.iso', emulator: 'C:\\Emu\\shared\\shared.exe' }),
  G(5, { exe: 'D:\\Roms\\c.iso', emulator: 'C:\\Emu\\shared\\shared.exe' }),
  G(6, { exe: 'C:\\Games\\Gone\\gone.exe', missing: true }),
  G(7, { exe: 'C:\\Shared\\one.exe' }),
  G(8, { exe: 'C:\\Shared\\two.exe' }),
  G(9, { exe: '', method: 'aumid', aumid: 'X!App', track: 'winapp.exe' }),
  G(10, { exe: 'E:\\root.exe' })
];
const idx = buildIndex(games);
const run = (...ps) => detect(ps.map((p, i) => [100 + i, p.toLowerCase()]), idx, new Set());

// exact exe, case-insensitive
assert.deepStrictEqual(run('C:\\GAMES\\Alpha\\Alpha.exe'), [1]);
// game folder (launcher -> game hand-off)
assert.deepStrictEqual(run('C:\\Games\\Alpha\\bin\\Win64\\alpha-shipping.exe'), [1]);
// "Process to track" by name, any location
assert.deepStrictEqual(run('F:\\Steam\\common\\Beta\\Beta-Win64-Shipping.exe'), [2]);
// emulator used by exactly one game
assert.deepStrictEqual(run('C:\\Emu\\solo\\solo.exe'), [3]);
// emulator shared by several games is ambiguous, so skipped
assert.deepStrictEqual(run('C:\\Emu\\shared\\shared.exe'), []);
// Not installed games are skipped
assert.deepStrictEqual(run('C:\\Games\\Gone\\gone.exe'), []);
// a folder shared by two library games is never used for folder matching; exact exe still works
assert.deepStrictEqual(run('C:\\Shared\\helper.exe'), []);
assert.deepStrictEqual(run('C:\\Shared\\one.exe'), [7]);
// drive-root games: exact exe only
assert.deepStrictEqual(run('E:\\other.exe'), []);
assert.deepStrictEqual(run('E:\\root.exe'), [10]);
// Windows (AUMID) apps match "Process to track" only
assert.deepStrictEqual(run('C:\\Program Files\\WindowsApps\\x\\winapp.exe'), [9]);
// unrelated processes, junk input
assert.deepStrictEqual(run('C:\\Windows\\explorer.exe', 'C:\\Games\\AlphaX\\y.exe'), []);
assert.deepStrictEqual(detect(null, idx, new Set()), []);
assert.deepStrictEqual(detect(['c:\\games\\alpha\\alpha.exe'], idx, new Set()), [1], 'plain path strings work too');
// same game seen through several processes is reported once; active games are skipped
assert.deepStrictEqual(run('C:\\Games\\Alpha\\alpha.exe', 'C:\\Games\\Alpha\\crash.exe'), [1]);
assert.deepStrictEqual(detect([[1, 'c:\\games\\alpha\\alpha.exe']], idx, new Set([1])), []);
// ignored (NUKRON's own) processes
assert.deepStrictEqual(detect([[1, 'c:\\games\\alpha\\alpha.exe']], idx, new Set(), p => p.includes('alpha')), []);
// one process that fits two games by track name is ambiguous
const amb = buildIndex([G(1, { exe: 'C:\\a\\a.exe', track: 'x.exe' }), G(2, { exe: 'C:\\b\\b.exe', track: 'x.exe' })]);
assert.deepStrictEqual(detect([[1, 'c:\\q\\x.exe']], amb, new Set()), []);

(async () => {
  // ---- detector: no duplicate sessions, failed scans, setting off
  const mk = (over = {}) => {
    const st = { active: new Set(), pending: new Set(), starts: [], procs: [[1, 'c:\\games\\alpha\\alpha.exe']], on: true };
    const det = createDetector({
      enabled: () => st.on, scan: async () => st.procs, getGames: () => games,
      isActive: id => st.active.has(id), isPending: id => st.pending.has(id),
      start: id => { st.active.add(id); st.starts.push(id); return true; }, ignore: () => false, ...over
    });
    return { st, det };
  };

  let { st, det } = mk();
  assert.deepStrictEqual(await det.run(), [1]);
  assert.deepStrictEqual(await det.run(), [], 'second pass never double-counts');
  assert.deepStrictEqual(st.starts, [1]);

  ({ st, det } = mk()); st.active.add(1); // launched from NUKRON first
  assert.deepStrictEqual(await det.run(), []);
  assert.strictEqual(st.starts.length, 0);

  ({ st, det } = mk()); st.pending.add(1); // AUMID launch still being prepared
  assert.deepStrictEqual(await det.run(), []);

  // game becomes active between the scan and the start (launch from NUKRON wins the race)
  ({ st, det } = mk({ scan: async () => { st.active.add(1); return st.procs; } }));
  assert.deepStrictEqual(await det.run(), []);
  assert.strictEqual(st.starts.length, 0);

  // overlapping runs: only one scan is in flight, and still only one session
  let scans = 0;
  ({ st, det } = mk({ scan: async () => { scans++; await new Promise(r => setTimeout(r, 20)); return st.procs; } }));
  const [a, b] = await Promise.all([det.run(), det.run()]);
  assert.strictEqual(scans, 1); assert.strictEqual(a.length + b.length, 1);

  // failed or empty scan does nothing
  ({ st, det } = mk({ scan: async () => null }));
  assert.deepStrictEqual(await det.run(), []);
  ({ st, det } = mk({ scan: async () => { throw new Error('boom'); } }));
  assert.deepStrictEqual(await det.run(), []);
  assert.deepStrictEqual(await det.run(), [], 'detector recovers after an error');

  // setting off
  ({ st, det } = mk()); st.on = false;
  assert.deepStrictEqual(await det.run(), []);
  assert.strictEqual(st.starts.length, 0);

  console.log('detect tests passed!');
})().catch(e => { console.error(e); process.exit(1); });
