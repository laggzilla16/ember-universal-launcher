const { brand, constants } = require('../../../../packages/shared');

/**
 * Renders the complete HTML document shell (head, navigation, main content, download feedback modal, footer)
 * for any page of the official NUKRON website.
 */
function renderLayout({
  pageId,
  title,
  description,
  canonicalPath = '',
  basePath = '.',
  baselineVersion = '1.5.3',
  bodyContent
}) {
  const fullTitle =
    pageId === 'home'
      ? `${constants.productFullName} — ${constants.tagline}`
      : `${title} — ${constants.productFullName}`;

  const metaDesc = description || constants.description;
  const prodBaseUrl = 'https://laggzilla16.github.io/ember-universal-launcher';
  const canonicalUrl = `${prodBaseUrl}${canonicalPath ? '/' + canonicalPath.replace(/^\//, '') : '/'}`;

  const navLink = (id, href, label) => {
    const isCurrent = pageId === id;
    return `<a href="${href}" class="nav-link${isCurrent ? ' active' : ''}"${isCurrent ? ' aria-current="page"' : ''}>${label}</a>`;
  };

  return `<!doctype html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${fullTitle}</title>
  <meta name="description" content="${metaDesc}">
  <meta name="theme-color" content="${brand.colors.dark.bg}">
  <meta name="application-name" content="${constants.productFullName}">
  <meta name="author" content="${constants.productFullName}">
  <link rel="canonical" href="${canonicalUrl}">

  <!-- Open Graph / Social Discovery -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${constants.productFullName}">
  <meta property="og:title" content="${fullTitle}">
  <meta property="og:description" content="${metaDesc}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:image" content="${prodBaseUrl}/assets/og-social-card.svg?v=${baselineVersion}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${fullTitle}">
  <meta name="twitter:description" content="${metaDesc}">
  <meta name="twitter:image" content="${prodBaseUrl}/assets/og-social-card.svg?v=${baselineVersion}">

  <!-- Official NUKRON Icons & Fonts -->
  <link rel="icon" type="image/png" href="${basePath}/assets/nukron-logo.png?v=${baselineVersion}">
  <link rel="shortcut icon" type="image/x-icon" href="${basePath}/assets/icon.ico?v=${baselineVersion}">
  <link rel="apple-touch-icon" href="${basePath}/assets/nukron-logo.png?v=${baselineVersion}">
  <link rel="preload" href="${basePath}/fonts/unbounded.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="${basePath}/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${basePath}/styles/main.css?v=${baselineVersion}">
</head>
<body data-page="${pageId}" data-base-path="${basePath}">
  <a href="#main-content" class="skip-link">Skip to main content</a>

  <!-- Ambient Background Lighting -->
  <div class="ambient-stage" aria-hidden="true">
    <div class="ambient-orb orb-amber"></div>
    <div class="ambient-orb orb-crimson"></div>
    <div class="ambient-orb orb-hearth"></div>
    <div class="ambient-grid"></div>
  </div>

  <!-- Premium Sticky Navigation Bar -->
  <header class="site-header" id="site-header">
    <div class="container nav-container">
      <a href="${basePath}/index.html" class="brand-mark" aria-label="NUKRON Home">
        <span class="brand-logo-wrap">
          <img src="${basePath}/assets/nukron-logo.png?v=${baselineVersion}" alt="NUKRON logo" width="34" height="34" class="brand-logo">
        </span>
        <span class="brand-text">
          <span class="brand-wordmark">NUKRON</span>
          <span class="brand-version-pill" data-ember-version-pill title="Latest release version">v<span data-ember-version>${baselineVersion}</span></span>
        </span>
      </a>

      <nav class="primary-nav" id="primary-nav" aria-label="Primary navigation">
        ${navLink('home', `${basePath}/index.html`, 'Home')}
        <a href="${basePath}/index.html#features" class="nav-link" data-nav-features>Features</a>
        ${navLink('whats-new', `${basePath}/whats-new.html`, "What's New")}
        ${navLink('about', `${basePath}/about.html`, 'About')}
        ${navLink('faq', `${basePath}/faq.html`, 'FAQ')}
      </nav>

      <div class="nav-actions">
        <a href="${constants.github.repoUrl}" target="_blank" rel="noopener noreferrer" class="nav-github-btn" title="Official GitHub Repository" aria-label="GitHub Repository">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
            <path d="M9 18c-4.51 2-5-2-7-2"/>
          </svg>
          <span>GitHub</span>
        </a>

        <a href="${basePath}/download.html" class="btn btn-primary btn-sm nav-download-cta${pageId === 'download' ? ' active-cta' : ''}">
          <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M10 3v10m0 0l-4-4m4 4l4-4M3 16h14"/>
          </svg>
          <span>Download</span>
        </a>

        <button type="button" class="mobile-menu-toggle" id="mobile-menu-toggle" aria-expanded="false" aria-controls="mobile-nav-drawer" aria-label="Toggle navigation menu">
          <span class="hamburger-bar"></span>
          <span class="hamburger-bar"></span>
          <span class="hamburger-bar"></span>
        </button>
      </div>
    </div>

    <!-- Polished Mobile Navigation Drawer -->
    <div class="mobile-nav-drawer" id="mobile-nav-drawer" hidden>
      <div class="mobile-nav-inner">
        <div class="mobile-nav-links">
          ${navLink('home', `${basePath}/index.html`, 'Home')}
          <a href="${basePath}/index.html#features" class="nav-link" data-mobile-close>Features</a>
          ${navLink('whats-new', `${basePath}/whats-new.html`, "What's New")}
          ${navLink('about', `${basePath}/about.html`, 'About')}
          ${navLink('faq', `${basePath}/faq.html`, 'FAQ')}
          ${navLink('download', `${basePath}/download.html`, 'Download')}
          ${navLink('privacy', `${basePath}/privacy.html`, 'Privacy Policy')}
        </div>
        <div class="mobile-nav-cta">
          <button type="button" class="btn btn-primary btn-block" data-ember-download>
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M10 3v10m0 0l-4-4m4 4l4-4M3 16h14"/>
            </svg>
            <span>Download for Windows</span>
          </button>
          <a href="${constants.github.releasesUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-block">
            View GitHub Releases
          </a>
        </div>
      </div>
    </div>
  </header>

  <main id="main-content">
    ${bodyContent}
  </main>

  <!-- Dynamic Download Status Banner / Feedback Toast -->
  <div class="download-feedback-drawer" id="download-feedback" role="status" aria-live="polite" hidden>
    <div class="download-feedback-card">
      <div class="df-head">
        <img src="${basePath}/assets/nukron-logo.png?v=${baselineVersion}" alt="" width="24" height="24" class="df-logo">
        <strong class="df-title" id="df-title">Preparing download…</strong>
        <button type="button" class="df-close" id="df-close" aria-label="Dismiss notification">✕</button>
      </div>
      <p class="df-body" id="df-body">Connecting to official NUKRON GitHub Releases…</p>
      <div class="df-actions" id="df-actions"></div>
    </div>
  </div>

  <!-- Premium Brand Footer -->
  <footer class="site-footer">
    <div class="container">
      <div class="footer-top">
        <div class="footer-brand-col">
          <a href="${basePath}/index.html" class="brand-mark footer-brand">
            <img src="${basePath}/assets/nukron-logo.png?v=${baselineVersion}" alt="NUKRON logo" width="32" height="32" class="brand-logo">
            <span class="brand-wordmark">NUKRON</span>
          </a>
          <p class="footer-tagline">
            ${constants.productFullName} is a lightweight, locally operated Windows gaming launcher. Organize your library, track playtime automatically, and monitor performance without accounts or cloud clutter.
          </p>
          <div class="footer-badges">
            <span class="spec-badge"><i class="dot-live"></i> Windows 10 &amp; 11 (64-bit)</span>
            <span class="spec-badge">100% Local SQLite</span>
            <span class="spec-badge">No Account Required</span>
          </div>
        </div>

        <div class="footer-nav-grid">
          <div class="footer-col">
            <h3 class="footer-heading">Product</h3>
            <ul class="footer-links">
              <li><a href="${basePath}/index.html">Home</a></li>
              <li><a href="${basePath}/index.html#features">Features</a></li>
              <li><a href="${basePath}/index.html#experience">The NUKRON Experience</a></li>
              <li><a href="${basePath}/download.html">Download for Windows</a></li>
              <li><a href="${basePath}/whats-new.html">What's New</a></li>
            </ul>
          </div>

          <div class="footer-col">
            <h3 class="footer-heading">Resources</h3>
            <ul class="footer-links">
              <li><a href="${basePath}/about.html">About NUKRON</a></li>
              <li><a href="${basePath}/faq.html">FAQ &amp; Help</a></li>
              <li><a href="${basePath}/privacy.html">Privacy Policy</a></li>
              <li><a href="${basePath}/privacy.html#terms">Terms of Service</a></li>
            </ul>
          </div>

          <div class="footer-col">
            <h3 class="footer-heading">Official GitHub</h3>
            <ul class="footer-links">
              <li><a href="${constants.github.repoUrl}" target="_blank" rel="noopener noreferrer">GitHub Repository ↗</a></li>
              <li><a href="${constants.github.releasesUrl}" target="_blank" rel="noopener noreferrer">All Releases ↗</a></li>
              <li><a href="${constants.github.latestReleasePageUrl}" target="_blank" rel="noopener noreferrer">Latest Release (<span data-ember-version>v${baselineVersion}</span>) ↗</a></li>
              <li><a href="${constants.github.issuesUrl}" target="_blank" rel="noopener noreferrer">Report an Issue ↗</a></li>
            </ul>
          </div>
        </div>
      </div>

      <div class="footer-bottom">
        <p class="copyright">
          &copy; ${new Date().getFullYear()} ${constants.productFullName}. Free local desktop software for Windows gamers.
        </p>
        <div class="footer-bottom-links">
          <a href="${basePath}/privacy.html">Privacy Policy</a>
          <span class="sep">·</span>
          <a href="${basePath}/whats-new.html">Release History</a>
          <span class="sep">·</span>
          <a href="${constants.github.repoUrl}" target="_blank" rel="noopener noreferrer">Source &amp; Releases on GitHub</a>
        </div>
      </div>
    </div>
  </footer>

  <!-- Shared Release Utilities & Website Client Scripts -->
  <script src="${basePath}/js/release-data.js"></script>
  <script src="${basePath}/js/releases-utils.js"></script>
  <script src="${basePath}/js/releases-client.js"></script>
  <script src="${basePath}/js/interactions.js"></script>
</body>
</html>`;
}

module.exports = { renderLayout };

