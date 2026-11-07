/**
 * NUKRON Official Website — Dynamic GitHub Releases & Download Client
 * Connects directly to https://api.github.com/repos/laggzilla16/ember-universal-launcher/releases
 * Resolves the latest valid Windows installer (.exe) and portable build, updates version indicators dynamically,
 * powers the live What's New changelog and Download release notes, and provides graceful fallbacks without fake states.
 */
(function () {
  'use strict';

  const Utils = window.NukronReleaseUtils;
  const Baseline = window.NUKRON_BASELINE_DATA || {
    version: '1.5.0',
    repoUrl: 'https://github.com/laggzilla16/ember-universal-launcher',
    releasesUrl: 'https://github.com/laggzilla16/ember-universal-launcher/releases',
    latestReleasePageUrl: 'https://github.com/laggzilla16/ember-universal-launcher/releases/latest',
    apiLatestRelease: 'https://api.github.com/repos/laggzilla16/ember-universal-launcher/releases/latest',
    apiAllReleases: 'https://api.github.com/repos/laggzilla16/ember-universal-launcher/releases?per_page=30',
    changelog: []
  };

  const CACHE_KEY = 'nukron_gh_releases_cache_v2';
  const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  let currentState = {
    status: 'idle', // 'idle' | 'loading' | 'ready' | 'error'
    errorMessage: null,
    resolved: null,
    fetchPromise: null
  };

  function readCachedReleases() {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || Date.now() - parsed.timestamp > CACHE_TTL_MS) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function writeCachedReleases(allRaw, latestRaw) {
    try {
      sessionStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          timestamp: Date.now(),
          allRaw,
          latestRaw
        })
      );
    } catch {}
  }

  /**
   * Fetches release data from the official GitHub Releases API.
   */
  async function fetchGitHubReleases(forceRefresh = false) {
    if (!forceRefresh && currentState.status === 'ready' && currentState.resolved) {
      return currentState.resolved;
    }
    if (!forceRefresh && currentState.fetchPromise) {
      return currentState.fetchPromise;
    }

    if (!forceRefresh) {
      const cached = readCachedReleases();
      if (cached && Utils) {
        currentState.resolved = Utils.resolveReleasesState(cached.allRaw, cached.latestRaw);
        currentState.status = 'ready';
        applyReleaseStateToDOM(currentState.resolved, true);
        return currentState.resolved;
      }
    }

    currentState.status = 'loading';
    updateSyncStatusUI('loading', 'Checking official GitHub Releases…');

    currentState.fetchPromise = (async () => {
      try {
        const headers = { Accept: 'application/vnd.github+json' };
        const [allResp, latestResp] = await Promise.allSettled([
          fetch(Baseline.apiAllReleases, { headers }),
          fetch(Baseline.apiLatestRelease, { headers })
        ]);

        let allRaw = [];
        let latestRaw = null;
        let anyOk = false;
        let statusErr = '';

        if (allResp.status === 'fulfilled') {
          if (allResp.value.ok) {
            allRaw = await allResp.value.json();
            anyOk = true;
          } else {
            statusErr = `HTTP ${allResp.value.status}`;
          }
        }

        if (latestResp.status === 'fulfilled') {
          if (latestResp.value.ok) {
            latestRaw = await latestResp.value.json();
            anyOk = true;
          } else if (!statusErr) {
            statusErr = `HTTP ${latestResp.value.status}`;
          }
        }

        if (!anyOk) {
          throw new Error(statusErr || 'Unable to reach api.github.com');
        }

        writeCachedReleases(allRaw, latestRaw);
        const resolved = Utils.resolveReleasesState(allRaw, latestRaw);
        currentState.resolved = resolved;
        currentState.status = 'ready';
        currentState.errorMessage = null;
        applyReleaseStateToDOM(resolved, false);
        return resolved;
      } catch (err) {
        currentState.status = 'error';
        currentState.errorMessage = err && err.message ? err.message : 'GitHub API unavailable';
        updateSyncStatusUI(
          'fallback',
          `Live GitHub API unreachable (${currentState.errorMessage}). Showing verified release baseline v${Baseline.version}.`
        );
        return null;
      } finally {
        currentState.fetchPromise = null;
      }
    })();

    return currentState.fetchPromise;
  }

  function updateSyncStatusUI(mode, text) {
    const dot = document.getElementById('gh-sync-dot');
    const label = document.getElementById('gh-sync-status-text');
    if (label) label.textContent = text;
    if (dot) {
      dot.className = mode === 'fallback' ? 'dot-blue' : 'dot-live';
    }
  }

  /**
   * Updates all version indicators, installer/portable filenames, release dates, release notes, and changelog entries across the page.
   */
  function applyReleaseStateToDOM(resolved, fromCache) {
    if (!resolved) return;

    const primaryRelease = resolved.latestPublished;
    const installerRelease = resolved.latestWithInstaller;
    const displayVersion = primaryRelease ? primaryRelease.version : Baseline.version;

    // 1. Update [data-nukron-version]
    document.querySelectorAll('[data-nukron-version]').forEach(el => {
      const currentText = el.textContent.trim();
      const prefix = currentText.startsWith('v') ? 'v' : '';
      el.textContent = `${prefix}${displayVersion}`;
    });

    // 2. Update [data-nukron-release-date]
    if (primaryRelease && primaryRelease.publishedAt) {
      const formattedDate = Utils.formatReleaseDate(primaryRelease.publishedAt);
      document.querySelectorAll('[data-nukron-release-date]').forEach(el => {
        el.textContent = `Released ${formattedDate}`;
      });
    }

    // 3. Update [data-nukron-installer-name] and [data-nukron-installer-size]
    if (installerRelease && installerRelease.installer) {
      const inst = installerRelease.installer;
      document.querySelectorAll('[data-nukron-installer-name]').forEach(el => {
        el.textContent = inst.name;
      });
      const sizeStr = Utils.formatBytes(inst.size);
      document.querySelectorAll('[data-nukron-installer-size]').forEach(el => {
        el.textContent = sizeStr ? `${sizeStr} · Verified Windows .exe Installer` : 'Verified Windows .exe Installer';
      });
    }

    // 4. Update Portable metadata & link if present
    const portableAsset =
      (installerRelease && installerRelease.portable) ||
      (primaryRelease && primaryRelease.portable) ||
      null;

    if (portableAsset) {
      document.querySelectorAll('[data-nukron-portable-name]').forEach(el => {
        el.textContent = portableAsset.name;
      });
      const portSizeStr = Utils.formatBytes(portableAsset.size);
      document.querySelectorAll('[data-nukron-portable-size]').forEach(el => {
        el.textContent = portSizeStr ? `${portSizeStr} · Standalone Portable .exe` : 'Standalone Portable .exe';
      });
      document.querySelectorAll('[data-nukron-portable-link]').forEach(el => {
        el.setAttribute('href', portableAsset.url);
      });
    }

    // 5. Update Download page status note & release notes
    const dlStatus = document.getElementById('download-page-status');
    if (dlStatus) {
      if (installerRelease && installerRelease.installer) {
        if (resolved.usingPreviousInstaller) {
          dlStatus.innerHTML = `Latest tag <code>v${Utils.escapeHtml(displayVersion)}</code> does not have a setup executable attached yet; ready to provide verified installer from <code>v${Utils.escapeHtml(installerRelease.version)}</code> or open GitHub Releases.`;
        } else {
          const portNote = portableAsset ? ` and portable build <code>${Utils.escapeHtml(portableAsset.name)}</code>` : '';
          dlStatus.innerHTML = `Verified installer resolved from GitHub Releases: <code>${Utils.escapeHtml(installerRelease.installer.name)}</code>${portNote}.`;
        }
      } else {
        dlStatus.innerHTML = `Connected to GitHub Releases. Click Download to open the official release assets.`;
      }
    }

    const dlNotesBody = document.getElementById('download-release-notes-body');
    const dlNotesLink = document.getElementById('download-release-gh-link');
    if (dlNotesBody && primaryRelease && Utils.renderCategorizedReleaseNotes) {
      const localMap = new Map();
      if (Array.isArray(Baseline.changelog)) {
        for (const entry of Baseline.changelog) {
          localMap.set(Utils.cleanVersion(entry.v), entry.items || []);
        }
      }
      const localItems = localMap.get(primaryRelease.version) || null;
      dlNotesBody.innerHTML = Utils.renderCategorizedReleaseNotes(
        localItems,
        primaryRelease.body,
        primaryRelease.htmlUrl
      );
      if (dlNotesLink && primaryRelease.htmlUrl) {
        dlNotesLink.setAttribute('href', primaryRelease.htmlUrl);
      }
    }

    // 6. Update What's New page timeline if on What's New
    const timelineEl = document.getElementById('changelog-timeline');
    if (timelineEl) {
      renderLiveChangelogTimeline(timelineEl, resolved);
      const count = resolved.allReleases.length;
      updateSyncStatusUI(
        'live',
        count > 0
          ? `Synchronized with GitHub Releases (${count} public release${count === 1 ? '' : 's'}${fromCache ? ' · cached' : ' · live'})`
          : `Synchronized with GitHub Releases · Showing verified release history`
      );
    }
  }

  /**
   * Merges live GitHub API releases with the verified local changelog from renderer/changelog.js
   * so release notes are always complete, categorized, accurate, and never invented.
   */
  function renderLiveChangelogTimeline(timelineEl, resolved) {
    const localMap = new Map();
    if (Array.isArray(Baseline.changelog)) {
      for (const entry of Baseline.changelog) {
        localMap.set(Utils.cleanVersion(entry.v), entry.items || []);
      }
    }

    const merged = [];
    const seenVersions = new Set();

    // First include all non-draft GitHub releases
    for (const rel of resolved.allReleases) {
      seenVersions.add(rel.version);
      const localItems = localMap.get(rel.version) || null;
      merged.push({
        version: rel.version,
        title: (rel.title || `NUKRON v${rel.version}`).replace(/^Ember(?:\s+Universal\s+Launcher)?/i, 'NUKRON'),
        publishedAt: rel.publishedAt,
        prerelease: rel.prerelease,
        htmlUrl: rel.htmlUrl,
        body: rel.body,
        localItems,
        installer: rel.installer,
        portable: rel.portable
      });
    }

    // Also include any verified local changelog versions not yet listed in the API page
    if (Array.isArray(Baseline.changelog)) {
      for (const entry of Baseline.changelog) {
        const v = Utils.cleanVersion(entry.v);
        if (!seenVersions.has(v)) {
          merged.push({
            version: v,
            title: `NUKRON v${v}`,
            publishedAt: null,
            prerelease: false,
            htmlUrl: `${Baseline.releasesUrl}/tag/v${encodeURIComponent(v)}`,
            body: '',
            localItems: entry.items || [],
            installer: null,
            portable: null
          });
        }
      }
    }

    // Sort newest first
    merged.sort((a, b) => Utils.compareVersions(b.version, a.version));

    if (!merged.length) return;

    // Update quick version jump pills if present
    const jumpPillsEl = document.getElementById('version-jump-pills');
    if (jumpPillsEl) {
      jumpPillsEl.innerHTML = merged
        .map((item, idx) => {
          const safeId = `release-v${item.version.replace(/\./g, '-')}`;
          return `<a href="#${Utils.escapeHtml(safeId)}" class="vj-pill${idx === 0 ? ' is-latest' : ''}">v${Utils.escapeHtml(item.version)}${idx === 0 ? ' · Latest' : ''}</a>`;
        })
        .join('');
    }

    timelineEl.innerHTML = merged
      .map((item, idx) => {
        const isLatest = idx === 0 && !item.prerelease;
        const safeId = `release-v${item.version.replace(/\./g, '-')}`;
        const typeAttr = item.prerelease ? 'prerelease' : 'stable';
        const badgeClass = item.prerelease ? 'badge-prerelease' : 'badge-stable';
        const badgeLabel = item.prerelease
          ? 'Pre-release'
          : isLatest
          ? 'Latest Release'
          : 'Published Release';
        const dateStr = item.publishedAt ? Utils.formatReleaseDate(item.publishedAt) : 'Official Release';

        const notesHtml = Utils.renderCategorizedReleaseNotes
          ? Utils.renderCategorizedReleaseNotes(item.localItems, item.body, item.htmlUrl)
          : item.body && item.body.trim().length > 0
          ? Utils.renderReleaseNotesMarkdown(item.body)
          : '';

        const downloadBtnHtml = item.installer
          ? `<a href="${Utils.escapeHtml(item.installer.url)}" class="btn btn-primary btn-sm" download>
               <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M10 3v10m0 0l-4-4m4 4l4-4M3 16h14"/></svg>
               <span>Download ${Utils.escapeHtml(item.installer.name)}</span>
             </a>`
          : isLatest
          ? `<button type="button" class="btn btn-primary btn-sm" data-nukron-download>
               <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M10 3v10m0 0l-4-4m4 4l4-4M3 16h14"/></svg>
               <span>Download Setup (.exe)</span>
             </button>`
          : '';

        const portableBtnHtml = item.portable
          ? `<a href="${Utils.escapeHtml(item.portable.url)}" class="btn btn-glass btn-sm" download>
               <span>Portable (${Utils.escapeHtml(Utils.formatBytes(item.portable.size) || '.exe')})</span>
             </a>`
          : '';

        return `
        <article class="changelog-entry${isLatest ? ' is-latest' : ''}" id="${Utils.escapeHtml(safeId)}" data-release-version="${Utils.escapeHtml(item.version)}" data-release-type="${typeAttr}">
          <div class="ce-meta">
            <span class="ce-version">v${Utils.escapeHtml(item.version)}</span>
            <span class="ce-channel ${badgeClass}">${badgeLabel}</span>
            <span class="ce-date">${Utils.escapeHtml(dateStr)}</span>
          </div>
          <div class="ce-card ${isLatest ? 'glass-optical' : 'glass-frosted'}">
            <div class="ce-card-head">
              <div>
                <h2 class="ce-title">${Utils.escapeHtml(item.title)}</h2>
                <p class="ce-subtitle">${
                  item.installer
                    ? `Installer: ${Utils.escapeHtml(item.installer.name)}${item.installer.size ? ' (' + Utils.formatBytes(item.installer.size) + ')' : ''}`
                    : 'Official NUKRON Release'
                }</p>
              </div>
              <div class="ce-actions">
                ${downloadBtnHtml}
                ${portableBtnHtml}
                <a href="${Utils.escapeHtml(item.htmlUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm">
                  GitHub Release ↗
                </a>
              </div>
            </div>
            <div class="ce-body">
              ${notesHtml}
            </div>
          </div>
        </article>`;
      })
      .join('\n');
  }

  /**
   * Shows the Download Feedback Drawer with accurate state and action links.
   */
  function showDownloadFeedback({ title, body, actionsHtml }) {
    const drawer = document.getElementById('download-feedback');
    const titleEl = document.getElementById('df-title');
    const bodyEl = document.getElementById('df-body');
    const actionsEl = document.getElementById('df-actions');
    if (!drawer || !titleEl || !bodyEl || !actionsEl) return;

    titleEl.textContent = title;
    bodyEl.innerHTML = body;
    actionsEl.innerHTML = actionsHtml || '';
    drawer.hidden = false;
  }

  function triggerBrowserDownload(url) {
    const a = document.createElement('a');
    a.href = url;
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  /**
   * Handles clicks on any [data-nukron-download] button across the website.
   */
  async function handleDownloadClick(btn) {
    if (btn) btn.disabled = true;

    showDownloadFeedback({
      title: 'Resolving latest Windows installer…',
      body: 'Checking official NUKRON GitHub Releases for the latest verified setup executable…',
      actionsHtml: ''
    });

    const resolved = await fetchGitHubReleases(false);
    if (btn) btn.disabled = false;

    // Case 1: Live GitHub API resolved a valid Windows .exe installer on the latest release
    if (resolved && resolved.latestWithInstaller && resolved.latestWithInstaller.installer) {
      const rel = resolved.latestWithInstaller;
      const inst = rel.installer;

      // Check if the newest published tag lacks an installer and we found one on an earlier release
      if (resolved.usingPreviousInstaller && resolved.latestPublished) {
        showDownloadFeedback({
          title: `Notice: v${resolved.latestPublished.version} installer pending`,
          body: `Release <strong>v${Utils.escapeHtml(resolved.latestPublished.version)}</strong> does not have a Windows setup executable attached yet. Would you like to download the latest verified installer (<strong>v${Utils.escapeHtml(rel.version)}</strong>) or view the GitHub Releases page?`,
          actionsHtml: `
            <a href="${Utils.escapeHtml(inst.url)}" class="btn btn-primary btn-xs" download>Download v${Utils.escapeHtml(rel.version)} (.exe)</a>
            <a href="${Utils.escapeHtml(resolved.latestPublished.htmlUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-xs">Open v${Utils.escapeHtml(resolved.latestPublished.version)} on GitHub ↗</a>
          `
        });
        return;
      }

      // Start the actual installer download immediately
      triggerBrowserDownload(inst.url);
      const sizeInfo = inst.size ? ` (${Utils.formatBytes(inst.size)})` : '';
      const portableBtn = rel.portable
        ? `<a href="${Utils.escapeHtml(rel.portable.url)}" class="btn btn-glass btn-xs" download>Portable Build (.exe)</a>`
        : '';
      showDownloadFeedback({
        title: `Downloading NUKRON v${rel.version}`,
        body: `Started download of <code>${Utils.escapeHtml(inst.name)}</code>${Utils.escapeHtml(sizeInfo)}. If your browser blocked the automatic download prompt, use the direct link below.`,
        actionsHtml: `
          <a href="${Utils.escapeHtml(inst.url)}" class="btn btn-primary btn-xs" download>Direct Installer Link (.exe)</a>
          ${portableBtn}
          <a href="${Utils.escapeHtml(rel.htmlUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-xs">Release Notes ↗</a>
        `
      });
      return;
    }

    // Case 2: API reachable, releases exist, but none have a .exe asset attached
    if (resolved && resolved.latestPublished) {
      showDownloadFeedback({
        title: 'No Windows .exe asset found in API response',
        body: `Release <strong>v${Utils.escapeHtml(resolved.latestPublished.version)}</strong> was found on GitHub, but no <code>.exe</code> installer asset was detected. You can view and download available release files directly on GitHub Releases.`,
        actionsHtml: `
          <a href="${Utils.escapeHtml(resolved.latestPublished.htmlUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-xs">Open Latest Release on GitHub ↗</a>
          <a href="${Utils.escapeHtml(Baseline.releasesUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-xs">All Releases ↗</a>
        `
      });
      return;
    }

    // Case 3: GitHub API unreachable / rate-limited / offline -> Honest fallback to official GitHub Releases
    const directFallbackInstallerUrl = `${Baseline.releasesUrl}/latest/download/NUKRON-Setup-${Baseline.version}.exe`;
    const directFallbackPortableUrl = `${Baseline.releasesUrl}/latest/download/NUKRON-Portable-${Baseline.version}.exe`;
    showDownloadFeedback({
      title: 'Unable to reach GitHub Releases API',
      body: `Your browser could not query <code>api.github.com</code> (${Utils.escapeHtml(currentState.errorMessage || 'network or rate limit')}). Use the official GitHub Releases page below to download the latest Windows installer directly.`,
      actionsHtml: `
        <a href="${Utils.escapeHtml(Baseline.latestReleasePageUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-xs">Open Latest GitHub Release ↗</a>
        <a href="${Utils.escapeHtml(directFallbackInstallerUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-glass btn-xs">Try v${Utils.escapeHtml(Baseline.version)} Setup .exe ↗</a>
        <a href="${Utils.escapeHtml(directFallbackPortableUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-xs">Try Portable .exe ↗</a>
      `
    });
  }

  // Wire up event listeners on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    // Trigger initial GitHub release sync
    fetchGitHubReleases(false);

    // Delegate [data-nukron-download] button clicks
    document.addEventListener('click', e => {
      const dlBtn = e.target.closest('[data-nukron-download]');
      if (dlBtn) {
        e.preventDefault();
        handleDownloadClick(dlBtn);
      }
    });

    // Close feedback drawer button
    const closeBtn = document.getElementById('df-close');
    const drawer = document.getElementById('download-feedback');
    if (closeBtn && drawer) {
      closeBtn.addEventListener('click', () => {
        drawer.hidden = true;
      });
    }

    // What's New filter buttons & refresh
    const filterBtns = document.querySelectorAll('[data-release-filter]');
    if (filterBtns.length) {
      filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const filter = btn.getAttribute('data-release-filter');
          filterBtns.forEach(b => b.classList.toggle('on', b === btn));
          document.querySelectorAll('#changelog-timeline .changelog-entry').forEach(entry => {
            const type = entry.getAttribute('data-release-type');
            entry.hidden = filter !== 'all' && type !== filter;
          });
        });
      });
    }

    const refreshBtn = document.getElementById('refresh-releases-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        fetchGitHubReleases(true);
      });
    }
  });
})();
