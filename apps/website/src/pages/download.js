const { constants } = require('../../../../packages/shared');

function renderDownloadPage({ basePath = '.', baselineVersion = '1.5.2' }) {
  return `
  <section class="page-hero download-hero">
    <div class="container">
      <div class="page-hero-header reveal-up">
        <span class="section-eyebrow">Official Windows Distribution</span>
        <h1 class="page-headline">Download <span class="text-gradient">NUKRON</span></h1>
        <p class="page-lead">
          Get the latest official release of ${constants.productFullName} directly from GitHub Releases. Free, locally operated, and ready in seconds.
        </p>
      </div>

      <!-- Primary Download Centerpiece Card -->
      <div class="download-hub-grid reveal-up" data-delay="80">
        <div class="download-primary-card">
          <div class="dpc-top">
            <div class="dpc-brand">
              <img src="${basePath}/assets/nukron-logo.png?v=${baselineVersion}" alt="NUKRON logo" width="52" height="52">
              <div>
                <span class="dpc-badge"><i class="dot-live"></i> Latest Official Release</span>
                <h2>NUKRON</h2>
                <p class="dpc-sub">Windows Desktop Application · <strong data-ember-version>v${baselineVersion}</strong></p>
              </div>
            </div>
            <div class="dpc-version-box">
              <span class="dpc-v-label">Version</span>
              <strong class="dpc-v-num" data-ember-version>v${baselineVersion}</strong>
              <span class="dpc-v-date" data-ember-release-date>Synced with GitHub</span>
            </div>
          </div>

          <div class="dpc-installer-panel">
            <div class="dpc-file-info">
              <span class="dpc-file-label">Primary Windows Installer (NSIS Setup Executable)</span>
              <code class="dpc-filename" data-ember-installer-name>NUKRON-Setup-${baselineVersion}.exe</code>
              <span class="dpc-file-meta">
                <span data-ember-installer-size>Verified Windows .exe Installer</span>
                <span>·</span>
                <span>Supports automatic in-app updates</span>
              </span>
            </div>

            <div class="dpc-cta-group">
              <button type="button" class="btn btn-primary btn-xl btn-block" data-ember-download>
                <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M10 3v10m0 0l-4-4m4 4l4-4M3 16h14"/>
                </svg>
                <span>Download for Windows (<span data-ember-version>v${baselineVersion}</span>)</span>
              </button>
              <p class="dpc-status-note" id="download-page-status" aria-live="polite">
                Connected to <code>${constants.github.owner}/${constants.github.repo}</code> Releases. Blockmaps, update metadata, and source archives are automatically excluded.
              </p>
            </div>
          </div>

          <!-- Secondary / Portable & Fallback Options -->
          <div class="dpc-secondary-row">
            <div class="dpc-alt-item" id="portable-download-box">
              <div>
                <strong>Portable Executable (Optional)</strong>
                <span>Run without installation. Note: Portable copies notify you of updates and link to the release page instead of auto-installing.</span>
              </div>
              <a href="${constants.github.latestReleasePageUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm" id="portable-download-link" data-ember-portable-link>
                View Portable / Assets ↗
              </a>
            </div>

            <div class="dpc-alt-item">
              <div>
                <strong>Direct GitHub Releases Fallback</strong>
                <span>If your network or browser blocks API requests, you can always download installers directly from the official GitHub Releases page.</span>
              </div>
              <a href="${constants.github.releasesUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm">
                All GitHub Releases ↗
              </a>
            </div>
          </div>
        </div>

        <!-- System Requirements & Compatibility Sidebar -->
        <aside class="download-specs-card">
          <h3>Compatibility &amp; Specs</h3>
          <dl class="specs-list">
            <div class="spec-row">
              <dt>Operating System</dt>
              <dd>Windows 10 or Windows 11 (64-bit)</dd>
            </div>
            <div class="spec-row">
              <dt>Installer Type</dt>
              <dd>NSIS Setup (<code>.exe</code>) with customizable install directory</dd>
            </div>
            <div class="spec-row">
              <dt>Local Data Path</dt>
              <dd><code>%APPDATA%\ember-launcher\</code></dd>
            </div>
            <div class="spec-row">
              <dt>Database Engine</dt>
              <dd>Built-in local SQLite (<code>launcher.db</code>)</dd>
            </div>
            <div class="spec-row">
              <dt>Account Requirement</dt>
              <dd>None — 100% offline-capable</dd>
            </div>
            <div class="spec-row">
              <dt>License &amp; Cost</dt>
              <dd>Free desktop software</dd>
            </div>
          </dl>

          <div class="specs-links">
            <a href="${basePath}/whats-new.html" class="text-link">Read What's New in <span data-ember-version>v${baselineVersion}</span> →</a>
            <a href="${constants.github.repoUrl}" target="_blank" rel="noopener noreferrer" class="text-link">Inspect Source on GitHub ↗</a>
          </div>
        </aside>
      </div>
    </div>
  </section>

  <!-- Installation Instructions Section -->
  <section class="install-steps-section section-spacer">
    <div class="container">
      <div class="section-title-block reveal-up">
        <span class="section-eyebrow">Quick Setup</span>
        <h2 class="section-headline">Up and running in three steps.</h2>
      </div>

      <div class="install-steps-grid reveal-up">
        <article class="install-step-card">
          <span class="is-num">01</span>
          <h3>Download the Setup Installer</h3>
          <p>
            Click <strong>Download for Windows</strong> above to fetch <code>NUKRON-Setup-<span data-ember-version>${baselineVersion}</span>.exe</code> directly from the latest published GitHub release.
          </p>
        </article>

        <article class="install-step-card">
          <span class="is-num">02</span>
          <h3>Run the Installer</h3>
          <p>
            Open the downloaded <code>.exe</code> installer and choose your preferred installation directory. Installed copies automatically check GitHub Releases for future updates and install them seamlessly in-app.
          </p>
        </article>

        <article class="install-step-card">
          <span class="is-num">03</span>
          <h3>Add or Scan Your Games</h3>
          <p>
            Launch NUKRON and click <strong>Add game</strong> in your Library to pick any game <code>.exe</code> or emulator ROM, or choose <strong>Import Windows Applications</strong> to scan installed Start Menu, Store, and Xbox games.
          </p>
        </article>
      </div>
    </div>
  </section>

  <!-- Troubleshooting & Practical Guidance -->
  <section class="troubleshooting-section section-spacer">
    <div class="container">
      <div class="troubleshooting-box reveal-up">
        <div class="tb-header">
          <span class="section-eyebrow">Helpful Guidance</span>
          <h2>Installation &amp; Troubleshooting Notes</h2>
          <p>Practical answers based on how NUKRON operates on Windows.</p>
        </div>

        <div class="tb-grid">
          <div class="tb-item">
            <h3>Windows SmartScreen prompt on first run</h3>
            <p>
              Because NUKRON is an independent open-source project distributed directly via GitHub Releases, Windows Defender SmartScreen may display an <em>"Windows protected your PC"</em> prompt when running a newly published installer. Click <strong>More info</strong> → <strong>Run anyway</strong> after verifying the download came from <code>github.com/laggzilla16/ember-universal-launcher</code>.
            </p>
          </div>

          <div class="tb-item">
            <h3>Games requiring Administrator privileges</h3>
            <p>
              If a specific game executable requires Administrator rights to start, Windows will block standard user processes from launching it. Run NUKRON as Administrator when launching elevated games.
            </p>
          </div>

          <div class="tb-item">
            <h3>Games started through another launcher</h3>
            <p>
              If the executable you select only opens a secondary launcher before starting the actual game, open <strong>Edit game</strong> in NUKRON and set <strong>Process to track</strong> to the real game executable name (for example, <code>Game-Win64-Shipping.exe</code>).
            </p>
          </div>

          <div class="tb-item">
            <h3>Updating from versions older than v1.1</h3>
            <p>
              Installed copies on v1.1 and newer include the automatic updater and seamless v1.4+ silent update flow. If you are running an early copy older than v1.1, download and run the latest Setup installer once manually to enable automatic updates.
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
  `;
}

module.exports = { renderDownloadPage };

