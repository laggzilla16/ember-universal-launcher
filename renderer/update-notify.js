// Native Windows update notification helper: version comparison, once-per-version deduplication, and safe toast dispatch.
const APP_ID = 'local.ember.launcher';

let activeNotification = null;

function cleanVersion(v) {
  return String(v ?? '').trim().replace(/^v/i, '');
}

function newer(a, b) {
  const ca = cleanVersion(a), cb = cleanVersion(b);
  if (!ca || !/^\d+(\.\d+)*$/.test(ca)) return false;
  if (!cb || !/^\d+(\.\d+)*$/.test(cb)) return true;
  const x = ca.split('.').map(Number), y = cb.split('.').map(Number), len = Math.max(x.length, y.length, 3);
  for (let i = 0; i < len; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  return false;
}

function shouldNotify(newVer, currentVer, lastNotifiedVer) {
  const nv = cleanVersion(newVer);
  if (!nv) return false;
  if (currentVer && !newer(nv, currentVer)) return false;
  if (lastNotifiedVer && !newer(nv, lastNotifiedVer)) return false;
  return true;
}

function buildNotificationPayload(version, iconPath) {
  const v = cleanVersion(version);
  const payload = {
    title: 'Ember Launcher',
    body: `A new Ember update is available!\nVersion ${v} is ready. Check out what's new.`,
    silent: false
  };
  if (iconPath) payload.icon = iconPath;
  return payload;
}

function notifyIfNewUpdate(opts = {}) {
  const {
    version,
    currentVersion,
    getLastNotified,
    setLastNotified,
    NotificationClass,
    icon,
    onClick
  } = opts;

  const v = cleanVersion(version);
  if (!v) return { notified: false, reason: 'invalid-version' };

  let last = '';
  try { last = cleanVersion(getLastNotified ? getLastNotified() : ''); } catch {}

  if (!shouldNotify(v, currentVersion, last)) {
    return { notified: false, reason: 'duplicate-or-not-newer' };
  }

  try {
    if (!NotificationClass || (typeof NotificationClass.isSupported === 'function' && !NotificationClass.isSupported())) {
      return { notified: false, reason: 'notifications-disabled-or-unsupported' };
    }

    const payload = buildNotificationPayload(v, icon);
    const n = new NotificationClass(payload);
    activeNotification = n;

    if (typeof n.on === 'function') {
      n.on('click', () => {
        try { if (onClick) onClick(v); } catch {}
      });
      n.on('close', () => { if (activeNotification === n) activeNotification = null; });
      n.on('failed', () => { if (activeNotification === n) activeNotification = null; });
    }

    n.show();
    try { if (setLastNotified) setLastNotified(v); } catch {}
    return { notified: true, version: v, payload, notification: n };
  } catch {
    return { notified: false, reason: 'notification-error' };
  }
}

module.exports = {
  APP_ID,
  cleanVersion,
  newer,
  shouldNotify,
  buildNotificationPayload,
  notifyIfNewUpdate
};
