// Run: node test/welcome.test.js
const assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path');
const w = require('../welcome.js');
const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ember-welcome-')), 'state.json');

// random pick stays in range and covers the whole collection
assert(w.MESSAGES.length >= 15 && w.MESSAGES.every(m => typeof m === 'string' && m.length < 80));
assert.strictEqual(w.pickMessage(() => 0), w.MESSAGES[0]);
assert.strictEqual(w.pickMessage(() => 0.9999999), w.MESSAGES[w.MESSAGES.length - 1]);

const T = Date.parse('2026-10-30T08:00:00Z');
assert.strictEqual(w.claimSession(f, T), true, 'first launch of a session shows');
assert.strictEqual(w.claimSession(f, T), false, 'restart in same session does not show');
assert.strictEqual(w.claimSession(f, T + 5000), false, 'jittery boot-time reading is still the same session');
assert.strictEqual(w.claimSession(f, T + 3 * 3600e3), true, 'next Windows session shows again');
assert.strictEqual(w.claimSession(f, T + 3 * 3600e3), false);
fs.writeFileSync(f, 'garbage');
assert.strictEqual(w.claimSession(f, T), true, 'corrupt state file is treated as no state');

// real query: session key stable across calls
w.querySession(a => w.querySession(b => {
  console.log('session', a, b);
  assert(a.key > 0 && Math.abs(a.key - b.key) <= w.TOLERANCE_MS);
  const g = f + '.2';
  assert.strictEqual(w.claimSession(g, a.key), true);
  assert.strictEqual(w.claimSession(g, b.key), false);
  console.log('all passed');
}));

