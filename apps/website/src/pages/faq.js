const { constants } = require('../../../../packages/shared');

const FAQ_ITEMS = [
  {
    id: 'what-is-nukron',
    category: 'general',
    question: 'What is NUKRON?',
    answer:
      'NUKRON is a lightweight, locally operated Windows desktop gaming launcher crafted with an Optical Glass design system. It gives PC gamers a clean, centralized universe to organize and launch their games across platforms, track playtime automatically, monitor live hardware metrics with a customizable in-game performance overlay, and stay quietly accessible from the Windows system tray.'
  },
  {
    id: 'is-nukron-free',
    category: 'general',
    question: 'Is NUKRON free?',
    answer:
      'Yes. NUKRON is completely free to download and use. There are no paid tiers, no subscriptions, no advertisements, and no locked features.'
  },
  {
    id: 'supported-os',
    category: 'compatibility',
    question: 'Which operating systems are supported?',
    answer:
      'NUKRON is built for Windows (Windows 10 and Windows 11, 64-bit). It integrates directly with Windows APIs for process path detection, Start Menu application discovery (AppUserModelIDs), native toast notifications, and hardware performance telemetry.'
  },
  {
    id: 'require-account',
    category: 'privacy',
    question: 'Does NUKRON require an account?',
    answer:
      'No. NUKRON never requires a user account, login, or internet connection to organize or launch your games. Everything runs locally on your computer.'
  },
  {
    id: 'where-is-data-stored',
    category: 'privacy',
    question: 'Where is my gaming data stored?',
    answer:
      'All of your data lives locally on your PC inside %APPDATA%\\ember-launcher\\ (including the SQLite database launcher.db, copied cover images, overlay-settings.json, and app-settings.json). Nothing is uploaded to the cloud. If you ever want to erase all data, simply uninstall NUKRON and delete the %APPDATA%\\ember-launcher\\ folder.'
  },
  {
    id: 'how-playtime-tracking-works',
    category: 'features',
    question: 'How does playtime tracking work?',
    answer:
      'When you launch a game through NUKRON, a single session tracker starts for that game (preventing duplicate timers if clicked twice). Every 4 seconds, NUKRON checks running process paths locally and writes a heartbeat to SQLite. A process counts if it matches the game executable, lives in the game folder (handling launcher-to-game hand-offs), matches the configured emulator, or matches a custom "Process to track" executable name. If your PC or the app closes unexpectedly mid-game, the session is safely closed at the last 4-second heartbeat on next start. When you exit the game, the session ends 15 seconds after the last matching process closes.'
  },
  {
    id: 'how-to-add-games',
    category: 'features',
    question: 'How do I add games?',
    answer:
      'Open the Library tab and click "Add game". You can add games in three ways: (1) Standard PC games: browse to the game\'s .exe file, and optionally set a display name, custom cover image, group, launch arguments, or a specific "Process to track" (such as Game-Win64-Shipping.exe) for games started through another launcher; (2) Emulated games: set "Game file" to the ROM or disc image and "Emulator" to the emulator\'s .exe file; (3) Automatic Windows Discovery: click "Import Windows Applications" inside the Add Game dialog to scan and import applications registered in the Windows Start Menu, including Microsoft Store and Xbox games launched by Windows App ID.'
  },
  {
    id: 'how-performance-overlay-works',
    category: 'features',
    question: 'How does the in-game Performance Overlay work?',
    answer:
      'NUKRON includes a lightweight, transparent always-on-top HUD window that displays live FPS, frame time (ms), CPU utilization & temperature, GPU utilization & temperature, VRAM usage, and system RAM usage. You can toggle the overlay from the sidebar button, the active session bar, or the Settings dialog, drag it anywhere on your screen, and customize its layout (Vertical, Horizontal, Compact, Expanded), size (Small, Medium, Large), and opacity (35%–100%).'
  },
  {
    id: 'how-automatic-updates-work',
    category: 'updates',
    question: 'How do automatic updates work?',
    answer:
      'Installed copies of NUKRON check GitHub Releases automatically on startup and every 6 hours. When a new version is published, NUKRON shows an update indicator in the app and sends a single native Windows notification (even if minimized to the system tray). When you choose to update, NUKRON opens a compact progress window, downloads the update from GitHub Releases, verifies its SHA-512 integrity, installs silently without a setup wizard, and reopens automatically with your games and settings intact. Portable copies notify you when an update is available and open the official GitHub release page.'
  },
  {
    id: 'how-to-report-problem',
    category: 'support',
    question: 'How can I report a problem?',
    answer:
      'You can report bugs, share feedback, or inspect existing issues directly on the official GitHub Issues page at https://github.com/laggzilla16/ember-universal-launcher/issues.'
  }
];

function getFaqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer
      }
    }))
  };
}

function renderFaqPage({ basePath = '.', baselineVersion = '1.5.0' }) {
  const faqHtml = FAQ_ITEMS.map((item, idx) => {
    const isOpen = idx < 2;
    return `
      <details class="faq-item glass-frosted" id="${item.id}" data-faq-cat="${item.category}" ${isOpen ? 'open' : ''}>
        <summary class="faq-question">
          <span>${item.question}</span>
          <span class="faq-chevron" aria-hidden="true">
            <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 8l5 5 5-5"/></svg>
          </span>
        </summary>
        <div class="faq-answer">
          <p>${item.answer.replace(/%APPDATA%\\ember-launcher\\(?:launcher\.db)?/g, m => `<code>${m}</code>`).replace(/https:\/\/github\.com\/laggzilla16\/ember-universal-launcher\/issues/g, `<a href="${constants.github.issuesUrl}" target="_blank" rel="noopener noreferrer">${constants.github.issuesUrl} ↗</a>`)}</p>
        </div>
      </details>`;
  }).join('\n');

  return `
  <section class="page-hero faq-hero">
    <div class="container">
      <div class="page-hero-header reveal-up">
        <span class="section-eyebrow">Documentation, FAQ &amp; Support</span>
        <h1 class="page-headline">Documentation &amp; <span class="text-gradient">FAQ</span></h1>
        <p class="page-lead">
          Complete documentation and accurate answers about how ${constants.productFullName} works, how playtime is tracked locally, and how updates and data storage operate.
        </p>
      </div>

      <!-- Quick Documentation Reference Grid -->
      <div class="docs-ref-grid reveal-up" data-delay="40">
        <article class="doc-ref-card glass-frosted">
          <span class="drc-tag">Guide 01 · Game Management</span>
          <h3>Adding Games, Emulators &amp; Store Apps</h3>
          <p>Add direct <code>.exe</code> games with optional launch arguments and a custom <code>Process to track</code>, pair ROMs with emulator executables, or run <strong>Import Windows Applications</strong> to discover Start Menu &amp; Xbox AUMIDs.</p>
        </article>
        <article class="doc-ref-card glass-frosted">
          <span class="drc-tag">Guide 02 · Playtime &amp; SQLite</span>
          <h3>Local Storage &amp; Crash-Safe Sessions</h3>
          <p>All library entries, session heartbeats (every 4s), and settings are stored locally inside <code>%APPDATA%\ember-launcher\launcher.db</code>. Sessions end cleanly 15s after the game process exits.</p>
        </article>
        <article class="doc-ref-card glass-frosted">
          <span class="drc-tag">Guide 03 · Hardware HUD</span>
          <h3>Performance Overlay Configuration</h3>
          <p>Toggle the always-on-top HUD from the sidebar or active session bar. Customize metrics (FPS, frame time, CPU/GPU load &amp; temp, VRAM, RAM), layout mode, size, and opacity in Settings.</p>
        </article>
      </div>

      <!-- Search & Category Filter Bar -->
      <div class="faq-controls glass-frosted reveal-up" data-delay="60">
        <div class="faq-search-wrap">
          <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" class="faq-search-ico"><circle cx="9" cy="9" r="6"/><path d="M13.5 13.5L17 17"/></svg>
          <input type="search" id="faq-search-input" class="faq-search-input" placeholder="Search documentation &amp; questions (e.g. SQLite, playtime, emulator, overlay, updates)…" aria-label="Search frequently asked questions">
        </div>
        <div class="faq-cat-pills" role="group" aria-label="Filter FAQ by topic">
          <button type="button" class="faq-cat-btn on" data-faq-filter="all">All Topics</button>
          <button type="button" class="faq-cat-btn" data-faq-filter="general">General</button>
          <button type="button" class="faq-cat-btn" data-faq-filter="features">Features &amp; Tracking</button>
          <button type="button" class="faq-cat-btn" data-faq-filter="privacy">Data &amp; Privacy</button>
          <button type="button" class="faq-cat-btn" data-faq-filter="updates">Updates &amp; Support</button>
        </div>
      </div>

      <!-- Accordion List -->
      <div class="faq-list reveal-up" id="faq-list" data-delay="90">
        ${faqHtml}
      </div>

      <div class="faq-empty-state" id="faq-empty-state" hidden>
        <p>No questions match your search filter. Try clearing the search box or browse all categories.</p>
      </div>

      <!-- Still Have a Question Card -->
      <div class="faq-support-card glass-optical reveal-up">
        <div>
          <h2>Need additional help or found a bug?</h2>
          <p>Visit the official GitHub repository to open an issue, request a feature, or inspect the source code.</p>
        </div>
        <div class="faq-support-actions">
          <a href="${constants.github.issuesUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
            Report an Issue on GitHub ↗
          </a>
          <a href="${basePath}/download.html" class="btn btn-glass">
            Download NUKRON (<span data-nukron-version>v${baselineVersion}</span>)
          </a>
        </div>
      </div>
    </div>
  </section>
  `;
}

module.exports = { renderFaqPage, FAQ_ITEMS, getFaqJsonLd };
