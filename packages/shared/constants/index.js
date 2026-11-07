/**
 * Official NUKRON Constants & Metadata
 * Single source of truth for repository URLs, GitHub Releases API endpoints, and installer rules.
 */
const NUKRON_CONSTANTS = {
  productName: 'NUKRON',
  productFullName: 'NUKRON',
  desktopPackageName: 'ember-launcher',
  appId: 'local.ember.launcher',
  tagline: 'Your games. Your universe.',
  supportingHeadline: 'A precision optical-glass home for your PC gaming universe.',
  description:
    'Organize, launch, and experience every game you own on Windows inside a genuine optical-glass interface—with automatic SQLite playtime tracking and a real-time hardware performance overlay.',
  platform: {
    os: 'Windows 10 / Windows 11 (64-bit)',
    shortOs: 'Windows 10 & 11',
    architecture: 'x64',
    storageLocation: '%APPDATA%\\ember-launcher\\',
    databaseFile: 'launcher.db'
  },
  github: {
    owner: 'laggzilla16',
    repo: 'ember-universal-launcher',
    repoUrl: 'https://github.com/laggzilla16/ember-universal-launcher',
    releasesUrl: 'https://github.com/laggzilla16/ember-universal-launcher/releases',
    latestReleasePageUrl: 'https://github.com/laggzilla16/ember-universal-launcher/releases/latest',
    issuesUrl: 'https://github.com/laggzilla16/ember-universal-launcher/issues',
    apiLatestRelease: 'https://api.github.com/repos/laggzilla16/ember-universal-launcher/releases/latest',
    apiAllReleases: 'https://api.github.com/repos/laggzilla16/ember-universal-launcher/releases?per_page=30'
  },
  installer: {
    setupPrefix: 'NUKRON-Setup-',
    legacySetupPrefix: 'Ember-Launcher-Setup-',
    portablePrefix: 'NUKRON-Portable-',
    legacyPortablePrefix: 'Ember-Launcher-Portable-',
    allowedExtension: '.exe',
    excludedExtensions: ['.blockmap', '.yml', '.yaml', '.zip', '.tar.gz', '.7z', '.nupkg', '.msi.blockmap']
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = NUKRON_CONSTANTS;
}
if (typeof window !== 'undefined') {
  window.NUKRON_CONSTANTS = NUKRON_CONSTANTS;
  window.EMBER_CONSTANTS = NUKRON_CONSTANTS;
}
