/**
 * NUKRON Official Website — Static Site Builder
 * Compiles modular pages, shared brand tokens, official fonts/logos, SEO metadata,
 * sitemap.xml, robots.txt, and GitHub Releases baseline data into apps/website/dist/.
 */
const fs = require('fs');
const path = require('path');

const { constants } = require('../../../packages/shared');
const { renderLayout } = require('../src/components/layout');
const { renderHomePage } = require('../src/pages/home');
const { renderDownloadPage } = require('../src/pages/download');
const { renderWhatsNewPage } = require('../src/pages/whats-new');
const { renderAboutPage } = require('../src/pages/about');
const { renderFaqPage, getFaqJsonLd } = require('../src/pages/faq');
const { renderPrivacyPage } = require('../src/pages/privacy');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const WEBSITE_ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(WEBSITE_ROOT, 'src');
const DIST_DIR = path.join(WEBSITE_ROOT, 'dist');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFileSafe(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function loadDesktopBaseline() {
  const pkgPath = path.join(REPO_ROOT, 'package.json');
  const changelogPath = path.join(REPO_ROOT, 'renderer', 'changelog.js');
  const welcomeMessagesPath = path.join(REPO_ROOT, 'renderer', 'welcome-messages.js');

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const changelogSrc = fs.readFileSync(changelogPath, 'utf8');
  const CHANGELOG = new Function(changelogSrc + '; return CHANGELOG;')();
  const welcomeMessages = require(welcomeMessagesPath);

  return {
    version: pkg.version,
    changelog: CHANGELOG,
    welcomeMessages
  };
}

function buildWebsite() {
  const t0 = Date.now();
  const baseline = loadDesktopBaseline();

  // Clean and recreate dist directory
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  ensureDir(DIST_DIR);

  // 1. Copy official NUKRON branding assets, application screenshots & fonts
  copyFileSafe(
    path.join(REPO_ROOT, 'renderer', 'assets', 'nukron-logo.png'),
    path.join(DIST_DIR, 'assets', 'nukron-logo.png')
  );
  copyFileSafe(
    path.join(REPO_ROOT, 'renderer', 'assets', 'nukron-logo.svg'),
    path.join(DIST_DIR, 'assets', 'nukron-logo.svg')
  );
  copyFileSafe(
    path.join(REPO_ROOT, 'assets', 'logos', 'nukron-wordmark.svg'),
    path.join(DIST_DIR, 'assets', 'nukron-wordmark.svg')
  );
  copyFileSafe(
    path.join(REPO_ROOT, 'build', 'icon.ico'),
    path.join(DIST_DIR, 'assets', 'icon.ico')
  );
  copyFileSafe(
    path.join(REPO_ROOT, 'build', 'icon.ico'),
    path.join(DIST_DIR, 'favicon.ico')
  );
  copyFileSafe(
    path.join(REPO_ROOT, 'assets', 'screenshots', 'og-social-card.svg'),
    path.join(DIST_DIR, 'assets', 'og-social-card.svg')
  );
  copyFileSafe(
    path.join(REPO_ROOT, 'assets', 'screenshots', 'nukron-dashboard-concept.svg'),
    path.join(DIST_DIR, 'assets', 'nukron-dashboard-concept.svg')
  );
  const screenAssets = [
    'nukron-screen-library.svg',
    'nukron-screen-management.svg',
    'nukron-screen-statistics.svg',
    'nukron-screen-overlay.svg',
    'nukron-screen-settings.svg'
  ];
  for (const assetName of screenAssets) {
    copyFileSafe(
      path.join(SRC_DIR, 'assets', assetName),
      path.join(DIST_DIR, 'assets', assetName)
    );
  }
  copyFileSafe(
    path.join(REPO_ROOT, 'renderer', 'fonts', 'unbounded.woff2'),
    path.join(DIST_DIR, 'fonts', 'unbounded.woff2')
  );
  copyFileSafe(
    path.join(REPO_ROOT, 'renderer', 'fonts', 'inter.woff2'),
    path.join(DIST_DIR, 'fonts', 'inter.woff2')
  );

  // 2. Copy CSS & Client JS modules
  copyFileSafe(
    path.join(SRC_DIR, 'styles', 'main.css'),
    path.join(DIST_DIR, 'styles', 'main.css')
  );
  copyFileSafe(
    path.join(REPO_ROOT, 'packages', 'shared', 'utilities', 'releases.js'),
    path.join(DIST_DIR, 'js', 'releases-utils.js')
  );
  copyFileSafe(
    path.join(SRC_DIR, 'js', 'releases-client.js'),
    path.join(DIST_DIR, 'js', 'releases-client.js')
  );
  copyFileSafe(
    path.join(SRC_DIR, 'js', 'interactions.js'),
    path.join(DIST_DIR, 'js', 'interactions.js')
  );

  // 3. Emit release-data.js (read-only snapshot from repository for instant render & offline fallback)
  const releaseDataPayload = {
    version: baseline.version,
    repoUrl: constants.github.repoUrl,
    releasesUrl: constants.github.releasesUrl,
    latestReleasePageUrl: constants.github.latestReleasePageUrl,
    issuesUrl: constants.github.issuesUrl,
    apiLatestRelease: constants.github.apiLatestRelease,
    apiAllReleases: constants.github.apiAllReleases,
    changelog: baseline.changelog,
    welcomeMessages: baseline.welcomeMessages
  };
  ensureDir(path.join(DIST_DIR, 'js'));
  fs.writeFileSync(
    path.join(DIST_DIR, 'js', 'release-data.js'),
    `window.NUKRON_BASELINE_DATA = ${JSON.stringify(releaseDataPayload, null, 2)};\n`,
    'utf8'
  );

  // 4. Define pages to render
  const pages = [
    {
      pageId: 'home',
      file: 'index.html',
      cleanDir: null,
      canonicalPath: '',
      title: 'Home',
      description: constants.description,
      render: basePath =>
        renderHomePage({
          basePath,
          baselineVersion: baseline.version,
          changelogEntries: baseline.changelog
        })
    },
    {
      pageId: 'download',
      file: 'download.html',
      cleanDir: 'download',
      canonicalPath: 'download.html',
      title: 'Download for Windows',
      description:
        'Download the latest official Windows installer and portable build for NUKRON directly from GitHub Releases. Free, local SQLite storage, no account required.',
      render: basePath =>
        renderDownloadPage({
          basePath,
          baselineVersion: baseline.version,
          changelogEntries: baseline.changelog
        })
    },
    {
      pageId: 'whats-new',
      file: 'whats-new.html',
      cleanDir: 'whats-new',
      canonicalPath: 'whats-new.html',
      title: "What's New & Release History",
      description:
        'Explore the official release history, changelog, and latest updates for NUKRON, synchronized directly with GitHub Releases.',
      render: basePath =>
        renderWhatsNewPage({
          basePath,
          baselineVersion: baseline.version,
          changelogEntries: baseline.changelog
        })
    },
    {
      pageId: 'about',
      file: 'about.html',
      cleanDir: 'about',
      canonicalPath: 'about.html',
      title: 'About NUKRON',
      description:
        'Learn about the philosophy behind NUKRON: a personal, locally operated universe for PC gaming on Windows without accounts or cloud bloat.',
      render: basePath => renderAboutPage({ basePath, baselineVersion: baseline.version })
    },
    {
      pageId: 'faq',
      file: 'faq.html',
      cleanDir: 'faq',
      canonicalPath: 'faq.html',
      title: 'Documentation, FAQ & Support',
      description:
        'Documentation and answers to common questions about NUKRON: local SQLite storage, automatic playtime tracking, Windows game discovery, performance overlay, and updates.',
      extraJsonLd: getFaqJsonLd(),
      render: basePath => renderFaqPage({ basePath, baselineVersion: baseline.version })
    },
    {
      pageId: 'privacy',
      file: 'privacy.html',
      cleanDir: 'privacy',
      canonicalPath: 'privacy.html',
      title: 'Privacy Policy & Terms of Service',
      description:
        'Official Privacy Policy and Terms of Service for NUKRON. Your game library and playtime stay on your PC.',
      render: basePath => renderPrivacyPage({ basePath, baselineVersion: baseline.version })
    }
  ];

  for (const p of pages) {
    // Root-level HTML file (e.g., dist/download.html)
    const rootHtml = renderLayout({
      pageId: p.pageId,
      title: p.title,
      description: p.description,
      canonicalPath: p.canonicalPath,
      basePath: '.',
      baselineVersion: baseline.version,
      bodyContent: p.render('.'),
      extraJsonLd: p.extraJsonLd || null
    });
    fs.writeFileSync(path.join(DIST_DIR, p.file), rootHtml, 'utf8');

    // Clean directory index (e.g., dist/download/index.html) for hosts using directory routing
    if (p.cleanDir) {
      const subDir = path.join(DIST_DIR, p.cleanDir);
      ensureDir(subDir);
      const subHtml = renderLayout({
        pageId: p.pageId,
        title: p.title,
        description: p.description,
        canonicalPath: p.canonicalPath,
        basePath: '..',
        baselineVersion: baseline.version,
        bodyContent: p.render('..'),
        extraJsonLd: p.extraJsonLd || null
      });
      fs.writeFileSync(path.join(subDir, 'index.html'), subHtml, 'utf8');
    }
  }

  // 5. Render 404.html fallback page
  const notFoundHtml = renderLayout({
    pageId: '404',
    title: 'Page Not Found',
    description: 'The requested page could not be found on the official NUKRON website.',
    canonicalPath: '404.html',
    basePath: '.',
    baselineVersion: baseline.version,
    bodyContent: `
      <section class="page-hero">
        <div class="container">
          <div class="final-cta-card">
            <img src="./assets/nukron-logo.png" alt="NUKRON logo" width="56" height="56" class="final-cta-logo">
            <h1 class="final-cta-headline">Page not found</h1>
            <p class="final-cta-desc">The page you were looking for doesn't exist or has moved.</p>
            <div class="final-cta-actions">
              <a href="./index.html" class="btn btn-primary btn-lg">Return to Home</a>
              <a href="./download.html" class="btn btn-glass btn-lg">Download NUKRON</a>
            </div>
          </div>
        </div>
      </section>`
  });
  fs.writeFileSync(path.join(DIST_DIR, '404.html'), notFoundHtml, 'utf8');

  // 6. Generate robots.txt, sitemap.xml, and .nojekyll
  const prodBaseUrl = 'https://laggzilla16.github.io/ember-universal-launcher';
  const todayIso = new Date().toISOString().split('T')[0];

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${prodBaseUrl}/</loc>
    <lastmod>${todayIso}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${prodBaseUrl}/download.html</loc>
    <lastmod>${todayIso}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${prodBaseUrl}/whats-new.html</loc>
    <lastmod>${todayIso}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${prodBaseUrl}/about.html</loc>
    <lastmod>${todayIso}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${prodBaseUrl}/faq.html</loc>
    <lastmod>${todayIso}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${prodBaseUrl}/privacy.html</loc>
    <lastmod>${todayIso}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>
`;
  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemapXml, 'utf8');

  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${prodBaseUrl}/sitemap.xml
`;
  fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), robotsTxt, 'utf8');
  fs.writeFileSync(path.join(DIST_DIR, '.nojekyll'), '', 'utf8');

  const elapsed = Date.now() - t0;
  console.log(`[nukron-website] Built ${pages.length} pages + static assets into apps/website/dist in ${elapsed}ms (baseline v${baseline.version})`);
}

if (require.main === module) {
  buildWebsite();
}

module.exports = { buildWebsite, DIST_DIR };

