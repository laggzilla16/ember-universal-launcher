/**
 * Ember Release & Installer Resolution Utilities
 * Used by the website and test suite to safely parse GitHub Releases,
 * identify the authentic Windows installer (.exe), exclude blockmaps/metadata/source archives,
 * and format Markdown release notes safely without XSS risks.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.EmberReleaseUtils = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * Normalizes a version tag such as "v1.4.2" -> "1.4.2"
   */
  function cleanVersion(version) {
    return String(version || '')
      .trim()
      .replace(/^v/i, '');
  }

  /**
   * Compares two semantic version strings (e.g., "1.4.2" vs "1.4.1").
   * Returns 1 if a > b, -1 if a < b, 0 if equal.
   */
  function compareVersions(a, b) {
    const pa = cleanVersion(a).split('-')[0].split('.').map(n => parseInt(n, 10) || 0);
    const pb = cleanVersion(b).split('-')[0].split('.').map(n => parseInt(n, 10) || 0);
    const len = Math.max(pa.length, pb.length, 3);
    for (let i = 0; i < len; i++) {
      const na = pa[i] || 0;
      const nb = pb[i] || 0;
      if (na !== nb) return na > nb ? 1 : -1;
    }
    return 0;
  }

  function newer(a, b) {
    return compareVersions(a, b) > 0;
  }

  /**
   * Checks whether a GitHub Release asset is an excluded non-installer artifact
   * (blockmap, electron-updater yml metadata, source archive, checksum file, etc.)
   */
  function isExcludedAssetName(name) {
    const lower = String(name || '').toLowerCase().trim();
    if (!lower) return true;
    if (
      lower.endsWith('.blockmap') ||
      lower.endsWith('.yml') ||
      lower.endsWith('.yaml') ||
      lower.endsWith('.zip') ||
      lower.endsWith('.tar.gz') ||
      lower.endsWith('.tgz') ||
      lower.endsWith('.7z') ||
      lower.endsWith('.sha256') ||
      lower.endsWith('.sha512') ||
      lower.endsWith('.sig') ||
      lower.endsWith('.asc') ||
      lower.endsWith('.json') ||
      lower.endsWith('.txt')
    ) {
      return true;
    }
    if (lower.includes('source') || lower === 'latest.yml') {
      return true;
    }
    return false;
  }

  /**
   * Determines if an asset is a valid Windows executable (.exe) and not a blockmap or archive.
   */
  function isValidWindowsExeAsset(asset) {
    if (!asset || typeof asset !== 'object') return false;
    const name = String(asset.name || '').trim();
    const url = String(asset.browser_download_url || '').trim();
    if (!name || !url) return false;
    if (isExcludedAssetName(name)) return false;
    const lower = name.toLowerCase();
    if (!lower.endsWith('.exe')) return false;
    if (!/^https:\/\/github\.com\/laggzilla16\/ember-universal-launcher\/releases\/download\//i.test(url) &&
        !/^https:\/\/objects\.githubusercontent\.com\//i.test(url) &&
        !/^https:\/\//i.test(url)) {
      return false;
    }
    return true;
  }

  /**
   * Scores Windows .exe assets so that the official NSIS Setup installer
   * ("Ember-Launcher-Setup-X.Y.Z.exe") is always prioritized as the primary download,
   * while Portable ("Ember-Launcher-Portable-X.Y.Z.exe") is recognized separately.
   */
  function classifyReleaseAssets(assets) {
    const list = Array.isArray(assets) ? assets : [];
    const validExes = list.filter(isValidWindowsExeAsset);

    let setupAsset = null;
    let portableAsset = null;
    let fallbackExeAsset = null;

    for (const asset of validExes) {
      const name = String(asset.name || '');
      const lower = name.toLowerCase();
      if (/^ember-launcher-setup-[\d.]+.*\.exe$/i.test(name) || lower.includes('setup') || lower.includes('install')) {
        if (!setupAsset) setupAsset = asset;
      } else if (/^ember-launcher-portable-[\d.]+.*\.exe$/i.test(name) || lower.includes('portable')) {
        if (!portableAsset) portableAsset = asset;
      } else if (!fallbackExeAsset) {
        fallbackExeAsset = asset;
      }
    }

    const primaryInstaller = setupAsset || fallbackExeAsset || portableAsset || null;

    return {
      primaryInstaller,
      setupInstaller: setupAsset || fallbackExeAsset || null,
      portableExe: portableAsset || null,
      allValidExes: validExes
    };
  }

  /**
   * Normalizes a single GitHub Release API object into a structured release record.
   * Returns null for draft releases so drafts are never exposed publicly.
   */
  function normalizeRelease(rawRelease) {
    if (!rawRelease || typeof rawRelease !== 'object') return null;
    if (rawRelease.draft === true) return null;

    const tagName = String(rawRelease.tag_name || '').trim();
    const version = cleanVersion(tagName || rawRelease.name || '');
    if (!version) return null;

    const classified = classifyReleaseAssets(rawRelease.assets);
    const primary = classified.primaryInstaller;
    const portable = classified.portableExe;

    return {
      id: rawRelease.id || tagName,
      tagName: tagName || `v${version}`,
      version,
      title: String(rawRelease.name || `Ember v${version}`).trim(),
      publishedAt: rawRelease.published_at || rawRelease.created_at || null,
      prerelease: Boolean(rawRelease.prerelease),
      draft: false,
      htmlUrl:
        rawRelease.html_url ||
        `https://github.com/laggzilla16/ember-universal-launcher/releases/tag/${encodeURIComponent(tagName || 'v' + version)}`,
      body: String(rawRelease.body || '').trim(),
      hasValidInstaller: Boolean(primary),
      installer: primary
        ? {
            name: primary.name,
            url: primary.browser_download_url,
            size: Number(primary.size) || 0,
            downloadCount: Number(primary.download_count) || 0,
            isSetup: primary === classified.setupInstaller
          }
        : null,
      portable: portable
        ? {
            name: portable.name,
            url: portable.browser_download_url,
            size: Number(portable.size) || 0,
            downloadCount: Number(portable.download_count) || 0
          }
        : null
    };
  }

  /**
   * Resolves the best release state from an array of GitHub Releases (and optional /releases/latest).
   * - Filters out all drafts.
   * - Separates stable published releases from prereleases.
   * - Identifies the latest published release AND the latest release with a verified .exe installer.
   * - Never silently serves an outdated installer: if the newest tag lacks an installer asset,
   *   `usingFallbackRelease` is set to true with explicit metadata so the UI can inform the user.
   */
  function resolveReleasesState(rawReleases, latestSingleRelease) {
    const combined = [];
    const seenTags = new Set();

    if (latestSingleRelease && typeof latestSingleRelease === 'object' && !Array.isArray(latestSingleRelease)) {
      const normLatest = normalizeRelease(latestSingleRelease);
      if (normLatest) {
        combined.push(normLatest);
        seenTags.add(normLatest.tagName);
      }
    }

    if (Array.isArray(rawReleases)) {
      for (const r of rawReleases) {
        const norm = normalizeRelease(r);
        if (norm && !seenTags.has(norm.tagName)) {
          combined.push(norm);
          seenTags.add(norm.tagName);
        }
      }
    }

    // Sort newest first by semantic version, then by publishedAt date
    combined.sort((a, b) => {
      const vc = compareVersions(b.version, a.version);
      if (vc !== 0) return vc;
      const da = a.publishedAt ? Date.parse(a.publishedAt) : 0;
      const db = b.publishedAt ? Date.parse(b.publishedAt) : 0;
      return db - da;
    });

    const stableReleases = combined.filter(r => !r.prerelease);
    const latestPublished = stableReleases[0] || combined[0] || null;
    const latestWithInstaller =
      stableReleases.find(r => r.hasValidInstaller) ||
      combined.find(r => r.hasValidInstaller) ||
      null;

    const usingPreviousInstaller = Boolean(
      latestPublished &&
        latestWithInstaller &&
        latestPublished.version !== latestWithInstaller.version
    );

    return {
      allReleases: combined,
      stableReleases,
      prereleases: combined.filter(r => r.prerelease),
      latestPublished,
      latestWithInstaller,
      usingPreviousInstaller
    };
  }

  /**
   * Formats byte counts into human-readable MB/KB strings.
   */
  function formatBytes(bytes) {
    const n = Number(bytes);
    if (!Number.isFinite(n) || n <= 0) return '';
    if (n >= 1024 * 1024) {
      return (n / (1024 * 1024)).toFixed(1) + ' MB';
    }
    return Math.round(n / 1024) + ' KB';
  }

  /**
   * Formats an ISO date string into a clean readable date (e.g., "November 2, 2026").
   */
  function formatReleaseDate(dateInput) {
    if (!dateInput) return 'Official GitHub Release';
    const d = new Date(dateInput);
    if (Number.isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Escapes raw strings for safe HTML insertion.
   */
  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, ch => {
      switch (ch) {
        case '&':
          return '&amp;';
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '"':
          return '&quot;';
        case "'":
          return '&#39;';
        default:
          return ch;
      }
    });
  }

  /**
   * Formats inline Markdown tokens (bold, italic, inline code, safe https links) on already HTML-escaped text.
   */
  function formatInlineMarkdown(escapedText) {
    let out = escapedText;
    // Inline code `code`
    out = out.replace(/`([^`]+)`/g, '<code class="md-code">$1</code>');
    // Bold **text**
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Italic *text* or _text_
    out = out.replace(/(^|[\s(])\*([^*]+)\*(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>');
    // Safe Markdown links [label](https://...)
    out = out.replace(
      /\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>'
    );
    return out;
  }

  /**
   * Safely renders GitHub Release Markdown notes into clean semantic HTML.
   * Escapes all raw HTML first so untrusted tags/scripts can never execute.
   */
  function renderReleaseNotesMarkdown(markdown) {
    const raw = String(markdown || '').trim();
    if (!raw) {
      return '<p class="md-empty">Release notes are available on the official GitHub release page.</p>';
    }

    const lines = raw.replace(/\r\n/g, '\n').split('\n');
    const htmlParts = [];
    let inList = false;

    const closeList = () => {
      if (inList) {
        htmlParts.push('</ul>');
        inList = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        closeList();
        continue;
      }

      // Headings
      const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
      if (headingMatch) {
        closeList();
        const level = Math.min(4, headingMatch[1].length + 2); // map # -> h3, ## -> h4
        const text = formatInlineMarkdown(escapeHtml(headingMatch[2]));
        htmlParts.push(`<h${level} class="md-heading">${text}</h${level}>`);
        continue;
      }

      // Bullet list items (-, *, •)
      const listMatch = line.match(/^[-*•]\s+(.+)$/);
      if (listMatch) {
        if (!inList) {
          htmlParts.push('<ul class="md-list">');
          inList = true;
        }
        const itemText = formatInlineMarkdown(escapeHtml(listMatch[1]));
        htmlParts.push(`<li>${itemText}</li>`);
        continue;
      }

      // Numbered list items
      const numMatch = line.match(/^\d+\.\s+(.+)$/);
      if (numMatch) {
        if (!inList) {
          htmlParts.push('<ul class="md-list">');
          inList = true;
        }
        const itemText = formatInlineMarkdown(escapeHtml(numMatch[1]));
        htmlParts.push(`<li>${itemText}</li>`);
        continue;
      }

      // Standard paragraph
      closeList();
      htmlParts.push(`<p class="md-para">${formatInlineMarkdown(escapeHtml(line))}</p>`);
    }

    closeList();
    return htmlParts.join('\n');
  }

  return {
    cleanVersion,
    compareVersions,
    newer,
    isExcludedAssetName,
    isValidWindowsExeAsset,
    classifyReleaseAssets,
    normalizeRelease,
    resolveReleasesState,
    formatBytes,
    formatReleaseDate,
    escapeHtml,
    renderReleaseNotesMarkdown
  };
});

