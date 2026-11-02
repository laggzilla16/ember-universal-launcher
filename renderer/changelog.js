// What's New entries, newest first. `v` should match package.json's version.
const CHANGELOG = [
  {
    v: '1.4.2',
    items: [
      'New: native Windows notifications when an Ember update is available, even when minimized to the system tray. You are notified only once per new version, and clicking the notification brings Ember to the foreground and opens What\'s New without starting the update automatically.',
      'Fixed scrollbar clipping in Settings, What\'s New and other scrollable views, removed the redundant close button from What\'s New, and ensured What\'s New always opens scrolled to the very top.'
    ]
  },
  {
    v: '1.4.1',
    items: [
      'Redesigned game card playtime badge with a compact liquid-glass pill, clock icon, refined typography and multi-unit formatting for minutes, hours and days.'
    ]
  },
  {
    v: '1.4.0',
    items: [
      'Updates are now seamless. Choosing Update opens a small Ember update window showing real progress (downloaded size, verifying, installing), then Ember installs the update silently and reopens by itself. There is no setup wizard to click through. Your games, settings, startup and tray preferences are never touched.',
      'If an update download fails, stalls or arrives damaged, Ember explains what happened, keeps your current version working, and lets you try again.'
    ]
  },
  {
    v: '1.3.4',
    items: [
      'New: startup welcome message. When Ember starts with Windows, a small quote or thoughtful phrase fades in at the corner of your screen for a few seconds, then fades away. It never takes focus, never covers fullscreen games, and appears only once per Windows session. Turn it off anytime under Settings > General > Show startup message.'
    ]
  },
  {
    v: '1.3.3',
    items: [
      'New setting: Launch Ember when Windows starts. Ember opens automatically when you sign in, quietly in the system tray, so your playtime tracking and overlay are ready before you start a game. Only one copy of Ember ever runs.',
      'New setting: Minimize to system tray. Closing the window keeps Ember running in the tray; turn it off and closing fully exits Ember. Both settings are independent, found under Settings > General, and are remembered across restarts.'
    ]
  },
  {
    v: '1.3.2',
    items: [
      'Click outside Settings, Edit Game and other popups to dismiss them. Nothing is saved, and unsaved Settings changes are reverted, just like pressing Cancel.'
    ]
  }
];

