/**
 * Official Ember Universal Launcher Constants & Metadata
 * Single source of truth for repository URLs, GitHub Releases API endpoints, and installer rules.
 */
const EMBER_CONSTANTS = {
  productName: 'Ember',
  productFullName: 'Ember Universal Launcher',
  desktopPackageName: 'ember-launcher',
  appId: 'local.ember.launcher',
  tagline: 'Your games. Your space. Your Ember.',
  supportingHeadline: 'A better home for your PC gaming experience.',
  description:
    'Discover a cleaner way to organize, launch, and experience your PC games. Everything you need, in one beautifully designed launcher.',
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
    setupPrefix: 'Ember-Launcher-Setup-',
    portablePrefix: 'Ember-Launcher-Portable-',
    allowedExtension: '.exe',
    excludedExtensions: ['.blockmap', '.yml', '.yaml', '.zip', '.tar.gz', '.7z', '.nupkg', '.msi.blockmap']
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EMBER_CONSTANTS;
}
if (typeof window !== 'undefined') {
  window.EMBER_CONSTANTS = EMBER_CONSTANTS;
}

