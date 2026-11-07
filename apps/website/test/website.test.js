/**
 * Automated Verification Suite for the NUKRON Official Website & GitHub Release Engine
 * Run: node apps/website/test/website.test.js (or npm run test:website)
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');

const { brand, constants, releases } = require('../../../packages/shared');
const { buildWebsite, DIST_DIR } = require('../scripts/build');

console.log('--- Running NUKRON Website & Monorepo Verification Suite ---');

// 1. Build the static website
buildWebsite();

// 2. Verify all required files and directories exist in apps/website/dist
const requiredDistFiles = [
  'index.html',
  'download.html',
  'whats-new.html',
  'about.html',
  'faq.html',
  'privacy.html',
  '404.html',
  'download/index.html',
  'whats-new/index.html',
  'about/index.html',
  'faq/index.html',
  'privacy/index.html',
  'sitemap.xml',
  'robots.txt',
  '.nojekyll',
  'favicon.ico',
  'assets/nukron-logo.png',
  'assets/nukron-logo.svg',
  'assets/nukron-wordmark.svg',
  'assets/nukron-dashboard-concept.svg',
  'assets/ember-logo.png',
  'assets/icon.ico',
  'assets/og-social-card.svg',
  'assets/ember-dashboard-concept.svg',
  'fonts/unbounded.woff2',
  'fonts/inter.woff2',
  'styles/main.css',
  'js/release-data.js',
  'js/releases-utils.js',
  'js/releases-client.js',
  'js/interactions.js'
];

for (const relPath of requiredDistFiles) {
  const fullPath = path.join(DIST_DIR, relPath);
  assert(fs.existsSync(fullPath), `Expected built file missing: dist/${relPath}`);
  if (relPath !== '.nojekyll') {
    assert(fs.statSync(fullPath).size > 0, `Built file is empty: dist/${relPath}`);
  }
}
console.log('✓ All static pages, clean URL indices, fonts, logos, and SEO files generated');

// 3. Verify Homepage Required Headlines, Storytelling Sections, and Features
const homeHtml = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf8');
const requiredHomeCopy = [
  'Your games.',
  'Your universe.',
  'A better home for your PC gaming experience.',
  'Discover a cleaner way to organize, launch, and experience your PC games. Everything you need, in one beautifully designed launcher.',
  'Everything starts here.',
  'Less managing. More playing.',
  'Made to stay out of your way.',
  'Ready to make room for NUKRON?',
  'Your next gaming session starts here.',
  'Download for Windows',
  'Explore NUKRON'
];
for (const phrase of requiredHomeCopy) {
  assert(homeHtml.includes(phrase), `Homepage missing required copy: "${phrase}"`);
}
console.log('✓ Homepage required sections and copy verified');

// 4. Verify Additional Pages Content (About, FAQ, Privacy, Download, What's New)
const aboutHtml = fs.readFileSync(path.join(DIST_DIR, 'about.html'), 'utf8');
assert(
  aboutHtml.includes('NUKRON was created around a simple idea: PC gaming deserves a better home.'),
  'About page missing required philosophy statement'
);

const faqHtml = fs.readFileSync(path.join(DIST_DIR, 'faq.html'), 'utf8');
const requiredFaqQuestions = [
  'What is NUKRON?',
  'Is NUKRON free?',
  'Which operating systems are supported?',
  'Does NUKRON require an account?',
  'Where is my gaming data stored?',
  'How does playtime tracking work?',
  'How do I add games?',
  'How do automatic updates work?',
  'How can I report a problem?'
];
for (const q of requiredFaqQuestions) {
  assert(faqHtml.includes(q), `FAQ page missing question: "${q}"`);
}
const downloadHtml = fs.readFileSync(path.join(DIST_DIR, 'download.html'), 'utf8');
assert(downloadHtml.includes('NUKRON-Setup-1.5.0.exe'), 'Download page must reference NUKRON-Setup-1.5.0.exe');
const whatsNewHtml = fs.readFileSync(path.join(DIST_DIR, 'whats-new.html'), 'utf8');
assert(whatsNewHtml.includes('NUKRON v1.5.0'), 'What\'s New page must include NUKRON v1.5.0');
assert(whatsNewHtml.includes('Complete rebranding from Ember Universal Launcher to NUKRON'), 'What\'s New page must include 1.5.0 changelog items');
console.log('✓ About, FAQ, Privacy, Download, and What\'s New content verified');

// 5. Verify Internal Links & Asset References Across All Built HTML Files
const htmlFilesToInspect = [
  'index.html',
  'download.html',
  'whats-new.html',
  'about.html',
  'faq.html',
  'privacy.html',
  'download/index.html',
  'whats-new/index.html',
  'about/index.html',
  'faq/index.html',
  'privacy/index.html'
];

for (const htmlRel of htmlFilesToInspect) {
  const htmlFull = path.join(DIST_DIR, htmlRel);
  const htmlDir = path.dirname(htmlFull);
  const content = fs.readFileSync(htmlFull, 'utf8');

  const attrRegex = /\b(?:href|src)="([^"]+)"/g;
  let match;
  while ((match = attrRegex.exec(content)) !== null) {
    const ref = match[1];
    if (
      ref.startsWith('http://') ||
      ref.startsWith('https://') ||
      ref.startsWith('#') ||
      ref.startsWith('mailto:') ||
      ref.startsWith('data:')
    ) {
      continue;
    }
    const cleanRef = ref.split('#')[0].split('?')[0];
    if (!cleanRef) continue;
    const resolvedTarget = path.resolve(htmlDir, cleanRef);
    assert(
      fs.existsSync(resolvedTarget),
      `Broken relative link/asset "${ref}" in dist/${htmlRel} (expected ${resolvedTarget})`
    );
  }
}
console.log('✓ Zero broken internal links or missing local assets across all pages');

// 6. Verify GitHub Releases & Installer Asset Selection Logic (both NUKRON and legacy Ember assets)
const mockNukronAssets = [
  {
    name: 'latest.yml',
    browser_download_url: 'https://github.com/laggzilla16/ember-universal-launcher/releases/download/v1.5.0/latest.yml',
    size: 412
  },
  {
    name: 'NUKRON-Setup-1.5.0.exe.blockmap',
    browser_download_url: 'https://github.com/laggzilla16/ember-universal-launcher/releases/download/v1.5.0/NUKRON-Setup-1.5.0.exe.blockmap',
    size: 89120
  },
  {
    name: 'source-code.zip',
    browser_download_url: 'https://github.com/laggzilla16/ember-universal-launcher/releases/download/v1.5.0/source-code.zip',
    size: 1200000
  },
  {
    name: 'NUKRON-Portable-1.5.0.exe',
    browser_download_url: 'https://github.com/laggzilla16/ember-universal-launcher/releases/download/v1.5.0/NUKRON-Portable-1.5.0.exe',
    size: 78500000
  },
  {
    name: 'NUKRON-Setup-1.5.0.exe',
    browser_download_url: 'https://github.com/laggzilla16/ember-universal-launcher/releases/download/v1.5.0/NUKRON-Setup-1.5.0.exe',
    size: 81200000
  }
];

assert.strictEqual(releases.isValidWindowsExeAsset(mockNukronAssets[0]), false, 'latest.yml must be rejected');
assert.strictEqual(releases.isValidWindowsExeAsset(mockNukronAssets[1]), false, '.blockmap must be rejected');
assert.strictEqual(releases.isValidWindowsExeAsset(mockNukronAssets[2]), false, 'source .zip must be rejected');
assert.strictEqual(releases.isValidWindowsExeAsset(mockNukronAssets[3]), true, 'Portable .exe is a valid exe');
assert.strictEqual(releases.isValidWindowsExeAsset(mockNukronAssets[4]), true, 'Setup .exe is a valid exe');

const classifiedNukron = releases.classifyReleaseAssets(mockNukronAssets);
assert.strictEqual(
  classifiedNukron.primaryInstaller.name,
  'NUKRON-Setup-1.5.0.exe',
  'Primary installer must prioritize NUKRON NSIS Setup .exe over Portable .exe'
);
assert.strictEqual(
  classifiedNukron.portableExe.name,
  'NUKRON-Portable-1.5.0.exe',
  'NUKRON Portable .exe must be identified separately'
);

const mockAssets = [
  {
    name: 'latest.yml',
    browser_download_url: 'https://github.com/laggzilla16/ember-universal-launcher/releases/download/v1.4.2/latest.yml',
    size: 412
  },
  {
    name: 'Ember-Launcher-Setup-1.4.2.exe.blockmap',
    browser_download_url: 'https://github.com/laggzilla16/ember-universal-launcher/releases/download/v1.4.2/Ember-Launcher-Setup-1.4.2.exe.blockmap',
    size: 89120
  },
  {
    name: 'source-code.zip',
    browser_download_url: 'https://github.com/laggzilla16/ember-universal-launcher/releases/download/v1.4.2/source-code.zip',
    size: 1200000
  },
  {
    name: 'Ember-Launcher-Portable-1.4.2.exe',
    browser_download_url: 'https://github.com/laggzilla16/ember-universal-launcher/releases/download/v1.4.2/Ember-Launcher-Portable-1.4.2.exe',
    size: 78500000
  },
  {
    name: 'Ember-Launcher-Setup-1.4.2.exe',
    browser_download_url: 'https://github.com/laggzilla16/ember-universal-launcher/releases/download/v1.4.2/Ember-Launcher-Setup-1.4.2.exe',
    size: 81200000
  }
];

const classified = releases.classifyReleaseAssets(mockAssets);
assert.strictEqual(
  classified.primaryInstaller.name,
  'Ember-Launcher-Setup-1.4.2.exe',
  'Legacy Ember-Launcher-Setup .exe must continue to be supported for historical releases'
);
assert.strictEqual(
  classified.portableExe.name,
  'Ember-Launcher-Portable-1.4.2.exe',
  'Legacy Portable .exe must be identified separately'
);

// Drafts must be excluded, prereleases distinguished, and missing installer on newest tag flagged honestly
const mockReleaseList = [
  {
    tag_name: 'v1.6.0-draft',
    name: 'Draft Release',
    draft: true,
    prerelease: false,
    assets: [mockNukronAssets[4]]
  },
  {
    tag_name: 'v1.5.0-beta.1',
    name: 'NUKRON 1.5.0 Beta 1',
    draft: false,
    prerelease: true,
    published_at: '2026-11-01T10:00:00Z',
    assets: []
  },
  {
    tag_name: 'v1.4.3',
    name: 'NUKRON 1.4.3 (Tag without binary yet)',
    draft: false,
    prerelease: false,
    published_at: '2026-10-31T10:00:00Z',
    assets: [mockNukronAssets[0], mockNukronAssets[1]] // only yml and blockmap
  },
  {
    tag_name: 'v1.4.2',
    name: 'NUKRON 1.4.2',
    draft: false,
    prerelease: false,
    published_at: '2026-10-30T10:00:00Z',
    assets: mockNukronAssets
  }
];

const state = releases.resolveReleasesState(mockReleaseList);
assert.strictEqual(state.allReleases.some(r => r.tagName === 'v1.6.0-draft'), false, 'Drafts must never be exposed');
assert.strictEqual(state.prereleases.length, 1, 'Prerelease must be separated');
assert.strictEqual(state.latestPublished.version, '1.4.3', 'Latest published stable version is 1.4.3');
assert.strictEqual(state.latestWithInstaller.version, '1.4.2', 'Latest release with valid .exe installer is 1.4.2');
assert.strictEqual(
  state.usingPreviousInstaller,
  true,
  'Must flag usingPreviousInstaller=true when newest tag lacks a valid .exe so UI never silently downloads an older version'
);
console.log('✓ GitHub Releases resolution, asset filtering, draft exclusion, and fallback rules verified');

// 7. Verify Safe Markdown Release Notes Formatting (XSS protection)
const untrustedMd = `# What's Changed
<script>alert("xss")</script>
- Added **Optical Glass** badge for \`launcher.db\`
- Fixed [issue #12](https://github.com/laggzilla16/ember-universal-launcher/issues/12)`;
const renderedHtml = releases.renderReleaseNotesMarkdown(untrustedMd);
assert(!renderedHtml.includes('<script>'), 'Raw <script> tags must be escaped');
assert(renderedHtml.includes('&lt;script&gt;'), 'Escaped script tag expected');
assert(renderedHtml.includes('<strong>Optical Glass</strong>'), 'Bold markdown formatting expected');
assert(renderedHtml.includes('<code class="md-code">launcher.db</code>'), 'Inline code formatting expected');
assert(
  renderedHtml.includes('href="https://github.com/laggzilla16/ember-universal-launcher/issues/12"'),
  'Safe https link formatting expected'
);
console.log('✓ Markdown release notes sanitizer and formatter verified');

// 8. Verify route resolution for both clean URLs (/download) and .html URLs (/download.html)
function resolveRouteToFile(urlPath) {
  const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\//, '');
  let target = path.join(DIST_DIR, rel);
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    target = path.join(target, 'index.html');
  } else if (!fs.existsSync(target) && !path.extname(target)) {
    target = target + '.html';
  }
  return fs.existsSync(target) ? target : null;
}

const routesToVerify = [
  '/',
  '/index.html',
  '/download',
  '/download.html',
  '/whats-new',
  '/whats-new.html',
  '/about',
  '/about.html',
  '/faq',
  '/faq.html',
  '/privacy',
  '/privacy.html',
  '/sitemap.xml',
  '/robots.txt'
];

for (const route of routesToVerify) {
  const resolvedFile = resolveRouteToFile(route);
  assert(resolvedFile && fs.existsSync(resolvedFile), `Route ${route} failed to resolve to a built file`);
}
console.log('✓ All clean URLs and .html routes verified');
console.log('--- All NUKRON Website Tests Passed! ---');
