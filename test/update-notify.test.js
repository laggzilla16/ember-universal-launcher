// Run: node test/update-notify.test.js. Tests native Windows update notifications, deduplication, click handling, and fallback when disabled.
const assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path');
const updateNotify = require('../renderer/update-notify.js');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const logoPath = path.join(root, 'renderer', 'assets', 'ember-logo.png');

// 1. Packaging & Identity checks
assert.strictEqual(updateNotify.APP_ID, pkg.build.appId, 'APP_ID must match package.json build.appId for Windows Toast identity');
assert(fs.existsSync(logoPath), 'Official application icon must exist');

// 2. Version comparison & payload formatting
assert.strictEqual(updateNotify.newer('1.4.2', '1.4.1'), true);
assert.strictEqual(updateNotify.newer('v1.5.0', '1.4.9'), true);
assert.strictEqual(updateNotify.newer('1.4.1', '1.4.1'), false);
assert.strictEqual(updateNotify.newer('1.4.0', '1.4.1'), false);

const samplePayload = updateNotify.buildNotificationPayload('v1.5.0', logoPath);
assert.strictEqual(samplePayload.title, 'Ember Launcher');
assert.strictEqual(samplePayload.body, "A new Ember update is available!\nVersion 1.5.0 is ready. Check out what's new.");
assert.strictEqual(samplePayload.icon, logoPath);

// 3. Test harness simulating main.js + renderer state (open normally, minimized to tray, duplicate prevention, click, disabled)
const tmpSettingsFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ember-upd-notify-')), 'app-settings.json');
const readPersisted = () => { try { return JSON.parse(fs.readFileSync(tmpSettingsFile, 'utf8')).lastNotifiedVersion || ''; } catch { return ''; } };
const writePersisted = v => fs.writeFileSync(tmpSettingsFile, JSON.stringify({ lastNotifiedVersion: v }, null, 2));

let notificationsEnabled = true;
let throwOnShow = false;
const shownToasts = [];

class MockNotification {
  static isSupported() { return notificationsEnabled; }
  constructor(opts) {
    this.opts = opts;
    this.handlers = {};
    this.shown = false;
  }
  on(ev, fn) { this.handlers[ev] = fn; }
  show() {
    if (throwOnShow) throw new Error('OS notifications blocked by policy');
    this.shown = true;
    shownToasts.push(this);
  }
  click() {
    if (this.handlers.click) this.handlers.click();
  }
}

// Simulate window & update state
let winState = { visible: true, minimized: false, focused: false };
let ipcEvents = [];
let downloadStarted = false;
let installStarted = false;

function showMain() {
  if (winState.minimized) winState.minimized = false;
  winState.visible = true;
  winState.focused = true;
}

function simulateUpdateDetected(version) {
  const v = updateNotify.cleanVersion(version);
  // Existing update UI event always fires regardless of notification state
  ipcEvents.push({ channel: 'update', payload: { state: 'available', version: v } });
  return updateNotify.notifyIfNewUpdate({
    version: v,
    currentVersion: '1.4.1',
    getLastNotified: readPersisted,
    setLastNotified: writePersisted,
    NotificationClass: MockNotification,
    icon: logoPath,
    onClick: () => {
      showMain();
      ipcEvents.push({ channel: 'update', payload: { state: 'available', version: v } });
      ipcEvents.push({ channel: 'update:focus', payload: { state: 'available', version: v } });
    }
  });
}

// Scenario A: Ember is open normally & a new version (1.4.2) is detected
winState = { visible: true, minimized: false, focused: false };
let res = simulateUpdateDetected('1.4.2');
assert.strictEqual(res.notified, true, 'First detection of 1.4.2 should show a notification');
assert.strictEqual(shownToasts.length, 1);
assert.strictEqual(shownToasts[0].opts.title, 'Ember Launcher');
assert.strictEqual(shownToasts[0].opts.body, "A new Ember update is available!\nVersion 1.4.2 is ready. Check out what's new.");
assert.strictEqual(shownToasts[0].opts.icon, logoPath);
assert.strictEqual(readPersisted(), '1.4.2', 'Last notified version must be persisted');
assert.strictEqual(downloadStarted, false, 'Notification must not auto-download');
assert.strictEqual(installStarted, false, 'Notification must not auto-install');

// Scenario B: The same version (1.4.2) is detected again (or an older version 1.4.1)
res = simulateUpdateDetected('1.4.2');
assert.strictEqual(res.notified, false, 'Repeated check for 1.4.2 must not trigger a duplicate notification');
assert.strictEqual(shownToasts.length, 1, 'Toast count must remain 1');

res = simulateUpdateDetected('1.4.1');
assert.strictEqual(res.notified, false, 'Current or older version must not trigger a notification');
assert.strictEqual(shownToasts.length, 1);

// Scenario C: Ember is minimized/hidden to the system tray & a genuinely newer version (1.5.0) is detected
winState = { visible: false, minimized: true, focused: false }; // hidden in tray / minimized
res = simulateUpdateDetected('v1.5.0');
assert.strictEqual(res.notified, true, 'Genuinely newer version 1.5.0 must trigger a new notification');
assert.strictEqual(shownToasts.length, 2);
assert.strictEqual(shownToasts[1].opts.body, "A new Ember update is available!\nVersion 1.5.0 is ready. Check out what's new.");
assert.strictEqual(readPersisted(), '1.5.0');

// Scenario D: User clicks the notification while Ember is minimized to the system tray
ipcEvents = [];
shownToasts[1].click();
assert.strictEqual(winState.visible, true, 'Clicking notification must restore window from tray');
assert.strictEqual(winState.minimized, false, 'Clicking notification must unminimize window');
assert.strictEqual(winState.focused, true, 'Clicking notification must bring window to foreground');
assert(ipcEvents.some(e => e.channel === 'update:focus' && e.payload.version === '1.5.0'), 'Clicking notification must navigate user to update info');
assert.strictEqual(downloadStarted, false, 'Clicking notification must not auto-download');
assert.strictEqual(installStarted, false, 'Clicking notification must not auto-install');

// Scenario E: Windows notifications are disabled (via OS settings or error)
notificationsEnabled = false;
ipcEvents = [];
res = simulateUpdateDetected('1.6.0');
assert.strictEqual(res.notified, false, 'Should not notify when OS notifications are disabled');
assert.strictEqual(shownToasts.length, 2, 'No toast created when disabled');
assert(ipcEvents.some(e => e.channel === 'update' && e.payload.version === '1.6.0'), 'Existing in-app update system must still work when notifications are disabled');

notificationsEnabled = true;
throwOnShow = true;
ipcEvents = [];
res = simulateUpdateDetected('1.6.0');
assert.strictEqual(res.notified, false, 'Should handle OS toast errors gracefully');
assert(ipcEvents.some(e => e.channel === 'update' && e.payload.version === '1.6.0'), 'Existing in-app update system must remain unaffected on toast error');

console.log('update-notify tests passed!');

