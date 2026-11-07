const { constants } = require('../../../../packages/shared');

function renderWhatsNewPage({ basePath = '.', baselineVersion = '1.5.1', changelogEntries = [] }) {
  const latestLocal = changelogEntries[0] || { v: baselineVersion, items: [] };

  const preRenderedTimeline = changelogEntries
    .map((entry, idx) => {
      const isLatest = idx === 0;
      return `
      <article class="changelog-entry${isLatest ? ' is-latest' : ''}" data-release-version="${entry.v}" data-release-type="stable">
        <div class="ce-meta">
          <span class="ce-version">v${entry.v}</span>
          <span class="ce-channel badge-stable">${isLatest ? 'Latest Release' : 'Published Release'}</span>
          <span class="ce-date" data-release-date-for="${entry.v}">Official Release</span>
        </div>
        <div class="ce-card">
          <div class="ce-card-head">
            <div>
              <h2 class="ce-title">NUKRON v${entry.v}</h2>
              <p class="ce-subtitle">${isLatest ? 'Current stable version synchronized with NUKRON Desktop' : 'Verified desktop release changelog'}</p>
            </div>
            <div class="ce-actions">
              ${
                isLatest
                  ? `<button type="button" class="btn btn-primary btn-sm" data-ember-download>
                       <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M10 3v10m0 0l-4-4m4 4l4-4M3 16h14"/></svg>
                       <span>Download Installer</span>
                     </button>`
                  : ''
              }
              <a href="${constants.github.releasesUrl}/tag/v${entry.v}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm">
                GitHub Tag ↗
              </a>
            </div>
          </div>
          <div class="ce-body" data-release-notes-for="${entry.v}">
            <ul class="md-list">
              ${entry.items.map(item => `<li>${item.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</li>`).join('\n              ')}
            </ul>
          </div>
        </div>
      </article>`;
    })
    .join('\n');

  return `
  <section class="page-hero whats-new-hero">
    <div class="container">
      <div class="page-hero-header reveal-up">
        <span class="section-eyebrow">Live Release History</span>
        <h1 class="page-headline">What’s New in <span class="text-gradient">NUKRON</span></h1>
        <p class="page-lead">
          Every improvement, feature, and fix shipped in ${constants.productFullName}—synchronized directly with official GitHub Releases and the in-app changelog.
        </p>
      </div>

      <!-- Toolbar: API Sync Status + Release Channel Filter -->
      <div class="changelog-toolbar reveal-up" data-delay="60">
        <div class="ct-status">
          <span class="dot-live" id="gh-sync-dot"></span>
          <span id="gh-sync-status-text">Synchronizing release history with GitHub Releases API…</span>
        </div>

        <div class="ct-controls">
          <div class="ct-filter-group" role="group" aria-label="Filter releases by type">
            <button type="button" class="ct-filter-btn on" data-release-filter="all">All Public</button>
            <button type="button" class="ct-filter-btn" data-release-filter="stable">Stable Only</button>
            <button type="button" class="ct-filter-btn" data-release-filter="prerelease">Pre-releases</button>
          </div>
          <button type="button" class="btn btn-ghost btn-xs" id="refresh-releases-btn" title="Re-fetch releases from GitHub API">
            Refresh ↻
          </button>
        </div>
      </div>

      <!-- Dynamic Spotlight for the Newest Published Release -->
      <div id="latest-release-spotlight" class="latest-spotlight-wrap reveal-up" data-delay="90">
        <div class="spotlight-banner">
          <div class="sb-left">
            <span class="sb-eyebrow"><i class="dot-live"></i> Latest Published Version</span>
            <h2 class="sb-version">NUKRON <span data-ember-version>v${latestLocal.v}</span></h2>
            <p class="sb-meta">
              <span data-ember-release-date>Latest Official Release</span>
              <span>·</span>
              <span data-ember-installer-name>NUKRON-Setup-${latestLocal.v}.exe</span>
            </p>
          </div>
          <div class="sb-right">
            <button type="button" class="btn btn-primary btn-lg" data-ember-download>
              <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M10 3v10m0 0l-4-4m4 4l4-4M3 16h14"/></svg>
              <span>Download Latest for Windows</span>
            </button>
            <a href="${constants.github.releasesUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-glass btn-lg">
              View on GitHub ↗
            </a>
          </div>
        </div>
      </div>

      <!-- Chronological Timeline Container (Pre-rendered with verified changelog, enhanced live via GitHub Releases API) -->
      <div class="changelog-timeline" id="changelog-timeline" aria-live="polite">
        ${preRenderedTimeline}
      </div>
    </div>
  </section>
  `;
}

module.exports = { renderWhatsNewPage };

