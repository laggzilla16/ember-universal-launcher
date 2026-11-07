const { constants, releases } = require('../../../../packages/shared');

function renderDownloadPage({ basePath = '.', baselineVersion = '1.5.0', changelogEntries = [] }) {
  const latestLocal = changelogEntries[0] || { v: baselineVersion, items: [] };
  const preRenderedNotesHtml = releases.renderCategorizedReleaseNotes(
    latestLocal.items,
    '',
    `${constants.github.releasesUrl}/tag/v${latestLocal.v}`
  );

  return `
  <section class="page-hero download-hero">
    <div class="container">
      <div class="page-hero-header reveal-up">
        <span class="section-eyebrow">Official Windows Distribution</span>
        <h1 class="page-headline">Download <span class="text-gradient">NUKRON</span></h1>
        <p class="page-lead">
          Get the latest official release of ${constants.productFullName} directly from GitHub Releases. Free, locally operated in SQLite, and ready in seconds.
        </p>
      </div>

      <!-- Primary Download Centerpiece Card -->
      <div class="download-hub-grid reveal-up" data-delay="70">
        <div class="download-primary-card glass-optical">
          <div class="dpc-top">
            <div class="dpc-brand">
              <img src="${basePath}/assets/nukron-logo.svg" alt="NUKRON logo" width="54" height="54">
              <div>
                <span class="dpc-badge"><i class="dot-live"></i> Latest Official Release</span>
                <h2>NUKRON for Windows</h2>
                <p class="dpc-sub">Windows 10 &amp; 11 (64-bit) · <strong data-nukron-version>v${baselineVersion}</strong></p>
              </div>
            </div>
            <div class="dpc-version-box glass-clear">
              <span class="dpc-v-label">Latest Version</span>
              <strong class="dpc-v-num" data-nukron-version>v${baselineVersion}</strong>
              <span class="dpc-v-date" data-nukron-release-date>Synced with GitHub</span>
            </div>
          </div>

          <!-- Primary NSIS Setup Installer Panel -->
          <div class="dpc-installer-panel glass-clear">
            <div class="dpc-file-info">
              <span class="dpc-file-label">Recommended · NSIS Windows Setup Installer</span>
              <code class="dpc-filename" data-nukron-installer-name>NUKRON-Setup-${baselineVersion}.exe</code>
              <span class="dpc-file-meta">
                <span data-nukron-installer-size>Verified Windows .exe Installer</span>
                <span>·</span>
                <span>Customizable install path</span>
                <span>·</span>
                <span>Seamless SHA-512 in-app updates</span>
              </span>
            </div>

            <div class="dpc-cta-group">
              <button type="button" class="btn btn-primary btn-xl btn-block" data-nukron-download>
                <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M10 3v10m0 0l-4-4m4 4l4-4M3 16h14"/>
                </svg>
                <span>Download Installer (<span data-nukron-version>v${baselineVersion}</span>)</span>
              </button>
              <p class="dpc-status-note" id="download-page-status" aria-live="polite">
                Connected to <code>${constants.github.owner}/${constants.github.repo}</code> Releases. Blockmaps, update metadata, and source archives are automatically excluded.
              </p>
            </div>
          </div>

          <!-- Secondary / Portable Build & Direct GitHub Fallback -->
          <div class="dpc-secondary-row">
            <div class="dpc-alt-item glass-clear" id="portable-download-box">
              <div>
                <strong>Portable Executable (<code data-nukron-portable-name>NUKRON-Portable-${baselineVersion}.exe</code>)</strong>
                <span data-nukron-portable-size>Standalone .exe · Runs without installation. Notifies you when new releases are available.</span>
              </div>
              <a href="${constants.github.latestReleasePageUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-glass btn-sm" id="portable-download-link" data-nukron-portable-link>
                Download Portable / Assets ↗
              </a>
            </div>

            <div class="dpc-alt-item glass-clear">
              <div>
                <strong>Direct GitHub Releases Archive</strong>
                <span>Inspect SHA-512 checksums, previous versions, or download directly from GitHub if your network restricts API queries.</span>
              </div>
              <a href="${constants.github.releasesUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm">
                All GitHub Releases ↗
              </a>
            </div>
          </div>
        </div>

        <!-- System Requirements & Compatibility Sidebar -->
        <aside class="download-specs-card glass-frosted">
          <h3>System Requirements &amp; Specs</h3>
          <dl class="specs-list">
            <div class="spec-row">
              <dt>Operating System</dt>
              <dd>Windows 10 or Windows 11 (64-bit / x64)</dd>
            </div>
            <div class="spec-row">
              <dt>Distribution Formats</dt>
              <dd>NSIS Setup (<code>NUKRON-Setup-*.exe</code>) &amp; Portable (<code>NUKRON-Portable-*.exe</code>)</dd>
            </div>
            <div class="spec-row">
              <dt>Local Data Directory</dt>
              <dd><code>%APPDATA%\\ember-launcher\\</code></dd>
            </div>
            <div class="spec-row">
              <dt>Database Engine</dt>
              <dd>Built-in local SQLite (<code>launcher.db</code>)</dd>
            </div>
            <div class="spec-row">
              <dt>Telemetry Helper</dt>
              <dd>Native C# daemon (NVML, FrameView SDK, PDH, Win32)</dd>
            </div>
            <div class="spec-row">
              <dt>Account Requirement</dt>
              <dd>None — 100% local &amp; offline-capable</dd>
            </div>
            <div class="spec-row">
              <dt>License &amp; Cost</dt>
              <dd>Free desktop software</dd>
            </div>
          </dl>

          <div class="specs-links">
            <a href="#release-notes" class="text-link">Read <span data-nukron-version>v${baselineVersion}</span> Release Notes below ↓</a>
            <a href="${basePath}/whats-new.html" class="text-link">Explore Full Release History →</a>
            <a href="${constants.github.repoUrl}" target="_blank" rel="noopener noreferrer" class="text-link">Inspect Repository on GitHub ↗</a>
          </div>
        </aside>
      </div>
    </div>
  </section>

  <!-- Latest Release Notes Section (Directly on Download Page) -->
  <section class="download-notes-section section-spacer" id="release-notes">
    <div class="container">
      <div class="ce-card glass-frosted reveal-up">
        <div class="ce-card-head">
          <div>
            <span class="section-eyebrow">Latest Release Notes</span>
            <h2 class="ce-title" id="download-release-title">What’s New in NUKRON <span data-nukron-version>v${baselineVersion}</span></h2>
            <p class="ce-subtitle">
              <span data-nukron-release-date>Official GitHub Release</span> · Synchronized with the desktop changelog
            </p>
          </div>
          <div class="ce-actions">
            <a href="${basePath}/whats-new.html" class="btn btn-glass btn-sm">Full Release History →</a>
            <a href="${constants.github.latestReleasePageUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm" id="download-release-gh-link">
              View Tag on GitHub ↗
            </a>
          </div>
        </div>
        <div class="ce-body" id="download-release-notes-body">
          ${preRenderedNotesHtml}
        </div>
      </div>
    </div>
  </section>

  <!-- Installation Instructions Section -->
  <section class="install-steps-section section-spacer" id="install-guide">
    <div class="container">
      <div class="section-title-block reveal-up">
        <span class="section-eyebrow">Installation Guide</span>
        <h2 class="section-headline">Up and running in three steps.</h2>
      </div>

      <div class="install-steps-grid reveal-up">
        <article class="install-step-card glass-frosted">
          <span class="is-num">STEP 01</span>
          <h3>Download the Setup Installer</h3>
          <p>
            Click <strong>Download Installer</strong> above to fetch <code>NUKRON-Setup-<span data-nukron-version>${baselineVersion}</span>.exe</code> (or choose the standalone Portable build) directly from the latest published GitHub release.
          </p>
        </article>

        <article class="install-step-card glass-frosted">
          <span class="is-num">STEP 02</span>
          <h3>Run the NSIS Setup Wizard</h3>
          <p>
            Open the downloaded <code>.exe</code> installer and choose your preferred installation directory. Installed copies automatically check GitHub Releases for future updates and install them silently in-app.
          </p>
        </article>

        <article class="install-step-card glass-frosted">
          <span class="is-num">STEP 03</span>
          <h3>Add or Scan Your Games</h3>
          <p>
            Launch NUKRON and click <strong>Add game</strong> in your Library to pick any game <code>.exe</code> or emulator ROM, or choose <strong>Import Windows Applications</strong> to scan installed Start Menu, Store, and Xbox games.
          </p>
        </article>
      </div>
    </div>
  </section>

  <!-- Troubleshooting & Practical Guidance -->
  <section class="troubleshooting-section section-spacer" id="troubleshooting">
    <div class="container">
      <div class="troubleshooting-box glass-frosted reveal-up">
        <div class="tb-header">
          <span class="section-eyebrow">Practical Guidance</span>
          <h2>Installation &amp; Upgrade Notes</h2>
          <p>Helpful answers based on how NUKRON operates on Windows 10 and Windows 11.</p>
        </div>

        <div class="tb-grid">
          <div class="tb-item glass-clear">
            <h3>Windows SmartScreen prompt on first run</h3>
            <p>
              Because NUKRON is distributed directly via GitHub Releases, Windows Defender SmartScreen may display a <em>"Windows protected your PC"</em> prompt when running a newly published installer. Click <strong>More info</strong> → <strong>Run anyway</strong> after verifying the download came from <code>github.com/laggzilla16/ember-universal-launcher</code>.
            </p>
          </div>

          <div class="tb-item glass-clear">
            <h3>Games requiring Administrator privileges</h3>
            <p>
              If a specific game executable requires Administrator rights to start, Windows blocks standard user processes from spawning it. Run NUKRON as Administrator when launching elevated games.
            </p>
          </div>

          <div class="tb-item glass-clear">
            <h3>Games started through another launcher</h3>
            <p>
              If the executable you select only opens a secondary launcher before starting the actual game, open <strong>Edit game</strong> in NUKRON and set <strong>Process to track</strong> to the real game executable name (for example, <code>Game-Win64-Shipping.exe</code>).
            </p>
          </div>

          <div class="tb-item glass-clear">
            <h3>Seamless in-place upgrade to NUKRON</h3>
            <p>
              Existing installations upgrade cleanly in-place to NUKRON while preserving your entire SQLite library (<code>%APPDATA%\\ember-launcher\\launcher.db</code>), custom cover artwork, Windows startup preferences, and performance overlay configuration.
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
  `;
}

module.exports = { renderDownloadPage };
