// Run: node test/version.test.js. Checks What's New? consistency with the app version.
const assert = require('assert'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const src = fs.readFileSync(path.join(root, 'renderer', 'changelog.js'), 'utf8');
const CHANGELOG = new Function(src + '; return CHANGELOG;')();

const vs = CHANGELOG.map(e => e.v);
const parse = v => v.split('.').map(Number);
assert.strictEqual(vs[0], pkg.version, `top changelog entry (${vs[0]}) must equal package.json version (${pkg.version})`);
assert.strictEqual(new Set(vs).size, vs.length, 'duplicate changelog versions');
for (let i = 1; i < vs.length; i++) {
  const a = parse(vs[i - 1]), b = parse(vs[i]), k = a.findIndex((n, j) => n !== b[j]);
  assert(k >= 0 && a[k] > b[k], `entries must be newest first: ${vs[i - 1]} before ${vs[i]}`);
}
assert(CHANGELOG.every(e => Array.isArray(e.items) && e.items.length), 'every entry needs items');
console.log('version OK:', pkg.version);
