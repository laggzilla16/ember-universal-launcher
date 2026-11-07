const { constants, releases } = require('../../../../packages/shared');

function renderWhatsNewPage({ basePath = '.', baselineVersion = '1.5.0', changelogEntries = [] }) {
  const latestLocal = changelogEntries[0] || { v: baselineVersion, items: [] };
  const portableFallbackUrl = `${constants.github.releasesUrl}/latest/download/NUKRON-Portable-${latestLocal.v}.exe`;

  const versionJumpPills = changelogEntries
    .map((entry, idx) => {
      const safeId = `release-v${entry.v.replace(/\./g, '-')}`;
      return `<a href="#${safeId}" class="vj-pill${idx === 0 ? ' is-latest' : ''}">v${entry.v}${idx === 0 ? ' · Latest' : ''}</a>`;
    })
    .join('\n          ');

  const preRenderedTimeline = changelogEntries
    .map((entry, idx) => {
      const isLatest = idx === 0;
      const safeId = `release-v${entry.v.replace(/\./g, '-')}`;
      const tagUrl = `${constants.github.releasesUrl}/tag/v${entry.v}`;
      const categorizedHtml = releases.renderCategorizedReleaseNotes(entry.items, '', tagUrl);

      return `
      <article class="changelog-entry${isLatest ? ' is-latest' : ''}" id="${safeId}" data-release-version="${entry.v}" data-release-type="stable">
        <div class="ce-meta">
          <span class="ce-version">v${entry.v}</span>
          <span class="ce-channel badge-stable">${isLatest ? 'Latest Release' : 'Published Release'}</span>
          <span class="ce-date" data-release-date-for="${entry.v}">${isLatest ? 'Current Official Release' : 'Official Release'}</span>
        </div>
        <div class="ce-card ${isLatest ? 'glass-optical' : 'glass-frosted'}">
          <div class="ce-card-head">
            <div>
              <h2 class="ce-title">NUKRON v${entry.v}</h2>
              <p class="ce-subtitle">${isLatest ? 'Current stable version synchronized with NUKRON Desktop' : 'Verified desktop release changelog'}</p>
            </div>
            <div class="ce-actions">
              ${
                isLatest
                  ? `<button type="button" class="btn btn-primary btn-sm" data-nukron-download>
                       <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M10 3v10m0 0l-4-4m4 4l4-4M3 16h14"/></svg>
                       <span>Download Setup (.exe)</span>
                     </button>
                     <a href="${portableFallbackUrl}" class="btn btn-glass btn-sm" data-nukron-portable-link target="_blank" rel="noopener noreferrer">
                       <span>Portable (.exe)</span>
                     </a>`
                  : ''
              }
              <a href="${tagUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm">
                GitHub Tag ↗
              </a>
            </div>
          </div>
          <div class="ce-body" data-release-notes-for="${entry.v}">
            ${categorizedHtml}
          </div>
        </div>
      </article>`;
    })
    .join('\n');

  return `
  <section class="page-hero whats-new-hero">
    <div class="container">
      <div class="page-hero-header reveal-up">
        <span class="section-eyebrow">Live Release History &amp; Changelog</span>
        <h1 class="page-headline">What’s New in <span class="text-gradient">NUKRON</span></h1>
        <p class="page-lead">
          Every new feature, improvement, and bug fix shipped in ${constants.productFullName}—synchronized directly with official GitHub Releases and the in-app changelog.
        </p>
      </div>

      <!-- Toolbar: API Sync Status + Release Channel Filter -->
      <div class="changelog-toolbar glass-frosted reveal-up" data-delay="60">
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
        <div class="spotlight-banner glass-optical">
          <div class="sb-left">
            <span class="sb-eyebrow"><i class="dot-live"></i> Latest Published Version</span>
            <h2 class="sb-version">NUKRON <span data-nukron-version>v${latestLocal.v}</span></h2>
            <p class="sb-meta">
              <span data-nukron-release-date>Latest Official Release</span>
              <span>·</span>
              <span data-nukron-installer-name>NUKRON-Setup-${latestLocal.v}.exe</span>
              <span>·</span>
              <span data-nukron-portable-name>NUKRON-Portable-${latestLocal.v}.exe</span>
            </p>
          </div>
          <div class="sb-right">
            <button type="button" class="btn btn-primary btn-lg" data-nukron-download>
              <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M10 3v10m0 0l-4-4m4 4l4-4M3 16h14"/></svg>
              <span>Download Latest for Windows</span>
            </button>
            <a href="${constants.github.releasesUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-glass btn-lg">
              View on GitHub ↗
            </a>
          </div>
        </div>
      </div>

      <!-- Quick Version Jump Navigation -->
      <nav class="version-jump-bar glass-frosted reveal-up" id="version-jump-bar" aria-label="Jump to version">
        <span class="vj-label">Jump to version:</span>
        <div class="vj-pills" id="version-jump-pills">
          ${versionJumpPills}
        </div>
      </nav>

      <!-- Chronological Timeline Container (Pre-rendered with verified changelog, enhanced live via GitHub Releases API) -->
      <div class="changelog-timeline" id="changelog-timeline" aria-live="polite">
        ${preRenderedTimeline}
      </div>
    </div>
  </section>
  `;
}

module.exports = { renderWhatsNewPage };
