// What's New entries, newest first. `v` should match package.json's version.
const CHANGELOG = [
  {
    v: '1.5.3',
    items: [
      'Redesigned the Windows installer into a custom NUKRON Optical Glass setup wizard with a 5-step guided installation flow (Welcome, Installation Directory with live disk space telemetry, Optional Settings for Desktop/Start Menu shortcuts and Windows startup, animated Progress tracking, and Completion screen with one-click launch).',
      'New interactive first-time onboarding guide powered by Driver.js with NUKRON Optical Glass tooltips, walking new users through adding a game (.exe), configuring game details and artwork, exploring the Game Library, and using the Smart Gaming Dashboard — plus a Replay Tutorial option in Settings.',
      'Refined the Smart Gaming Overview on the Dashboard with NUKRON\'s Optical Glass visual identity, consistent surface hierarchy, and smooth section transitions.',
      'Polished Dashboard statistic cards with clearer typographic hierarchy, Optical Glass icon badges, and subtle hover highlights.',
      'Weekly Gaming Statistics: improved Monday–Sunday activity chart with subtle reference gridlines, a clean baseline, distinct inactive-day markers, staggered bar animations, and detailed daily playtime and session tooltips.',
      'Most Played This Month: refined ranking cards with a highlighted #1 rank treatment, rank badges, animated multi-stop gradient progress indicators, and one-click quick launch.',
      'Recently Played: interactive game artwork cards with consistent proportions, smooth hover zoom, refined activity and category badges, and hover-revealed quick launch controls.'
    ]
  },
  {
    v: '1.5.2',
    items: [
      'New Smart Gaming Overview on the Dashboard, designed for desktop clarity with NUKRON\'s Optical Glass visual identity.',
      'Weekly Gaming Statistics: compact weekly summary with inline playtime, session count, and active-day pills alongside a Monday–Sunday daily gaming activity chart.',
      'Most Played This Month: automatic monthly leaderboard highlighting your most-played games with playtime share, session counts, and one-click quick launch.',
      'Improved Recently Played section showcasing your 3 most recently played games, featuring an expanded Optical Glass hero card for the most-played game among them.'
    ]
  },
  {
    v: '1.5.1',
    items: [
      'Updated the official NUKRON application emblem and multi-resolution Windows icon across the splash screen, sidebar header, in-game performance overlay, updater window, system tray, and Windows toast notifications.',
      'Restored the clean original website layout and structure while applying the updated NUKRON branding, logo, and colour palette.'
    ]
  },
  {
    v: '1.5.0',
    items: [
      'Complete rebranding from Ember Universal Launcher to NUKRON ("Your games. Your universe.") across the Windows desktop application, in-game performance overlay, startup quote toast, seamless updater, system tray, and official website.',
      'New NUKRON visual identity featuring a custom geometric N-prism optical monogram, wordmark, multi-resolution Windows icon, and Electric Blue (#2563EB) + Crimson Red (#E63946) over Deep Midnight (#090D19) palette.',
      'Snell\'s Law-inspired three-tier Optical Glass design system (Clear Glass, Frosted Glass, and Optical Accent Glass) with realistic light transmission, subtle chromatic edge refraction, specular highlights, and full reduced-motion and reduced-transparency support.',
      'Official NUKRON website launched in the monorepo with interactive desktop and overlay studios, searchable FAQ, and live GitHub Releases integration that automatically resolves the latest verified Windows installer.',
      'Seamless in-place upgrade and migration path preserving your entire SQLite game library, playtime history, custom cover art, Windows startup registration, and performance overlay configuration.',
      'Improved FrameView SDK FPS accuracy by excluding NUKRON and background web browsers from fallback frame rate detection.'
    ]
  },
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

