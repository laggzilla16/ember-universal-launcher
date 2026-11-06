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

function renderFaqPage({ basePath = '.', baselineVersion = '1.5.0' }) {
  const faqHtml = FAQ_ITEMS.map((item, idx) => {
    const isOpen = idx < 2;
    return `
      <details class="faq-item" id="${item.id}" data-faq-cat="${item.category}" ${isOpen ? 'open' : ''}>
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
        <span class="section-eyebrow">Questions &amp; Answers</span>
        <h1 class="page-headline">Frequently Asked <span class="text-gradient">Questions</span></h1>
        <p class="page-lead">
          Accurate answers about how ${constants.productFullName} works, how playtime is tracked locally, and how updates and data storage operate.
        </p>
      </div>

      <!-- Search & Category Filter Bar -->
      <div class="faq-controls reveal-up" data-delay="60">
        <div class="faq-search-wrap">
          <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" class="faq-search-ico"><circle cx="9" cy="9" r="6"/><path d="M13.5 13.5L17 17"/></svg>
          <input type="search" id="faq-search-input" class="faq-search-input" placeholder="Search questions (e.g. SQLite, playtime, emulator, updates)…" aria-label="Search frequently asked questions">
        </div>
        <div class="faq-cat-pills" role="group" aria-label="Filter FAQ by topic">
          <button type="button" class="faq-cat-btn on" data-faq-filter="all">All Questions</button>
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
      <div class="faq-support-card reveal-up">
        <div>
          <h2>Need additional help or found a bug?</h2>
          <p>Visit the official GitHub repository to open an issue or inspect the documentation.</p>
        </div>
        <div class="faq-support-actions">
          <a href="${constants.github.issuesUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
            Report an Issue on GitHub ↗
          </a>
          <a href="${basePath}/download.html" class="btn btn-glass">
            Download NUKRON (<span data-ember-version>v${baselineVersion}</span>)
          </a>
        </div>
      </div>
    </div>
  </section>
  `;
}

module.exports = { renderFaqPage, FAQ_ITEMS };

