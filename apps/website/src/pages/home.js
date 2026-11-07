const { constants } = require('../../../../packages/shared');

function renderHomePage({ basePath = '.', baselineVersion = '1.5.0' }) {
  return `
  <!-- =====================================================================
       SECTION 1 — HERO
       ===================================================================== -->
  <section class="hero-section" id="top">
    <div class="container hero-container">
      <div class="hero-copy reveal-up">
        <div class="hero-badge-row">
          <a href="${basePath}/whats-new.html" class="release-pill" title="View latest release notes">
            <span class="release-pill-dot"></span>
            <span class="release-pill-brand">NUKRON <strong data-ember-version>v${baselineVersion}</strong></span>
            <span class="release-pill-sep">·</span>
            <span class="release-pill-cta" data-ember-release-status>Latest Release →</span>
          </a>
        </div>

        <div class="hero-identity">
          <img src="${basePath}/assets/nukron-logo.png" alt="NUKRON Logo" width="56" height="56" class="hero-logo">
          <span class="hero-eyebrow">NUKRON</span>
        </div>

        <h1 class="hero-headline">
          Your games. <span class="text-gradient">Your universe.</span>
        </h1>

        <p class="hero-subheadline">
          A better home for your PC gaming experience.
        </p>

        <p class="hero-description">
          Discover a cleaner way to organize, launch, and experience your PC games. Everything you need, in one beautifully designed launcher.
        </p>

        <div class="hero-actions">
          <button type="button" class="btn btn-primary btn-lg" data-ember-download>
            <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M10 3v10m0 0l-4-4m4 4l4-4M3 16h14"/>
            </svg>
            <span>Download for Windows</span>
          </button>

          <a href="#introduction" class="btn btn-glass btn-lg">
            <span>Explore NUKRON</span>
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 8l5 5 5-5"/>
            </svg>
          </a>
        </div>

        <div class="hero-meta-bar" aria-label="Release and compatibility details">
          <div class="hero-meta-item">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
              <path d="M1.5 2.75L7 2v5.5H1.5V2.75zm0 5.75H7V14l-5.5-.75V8.5zM7.75 1.9L14.5 1v6.5H7.75V1.9zm0 6.6H14.5V15l-6.75-.9V8.5z"/>
            </svg>
            <span>Windows 10 &amp; 11 (64-bit)</span>
          </div>
          <span class="meta-dot">·</span>
          <div class="hero-meta-item">
            <span>Version <strong data-ember-version>v${baselineVersion}</strong></span>
          </div>
          <span class="meta-dot">·</span>
          <div class="hero-meta-item">
            <span data-ember-installer-label>NSIS Setup Installer (.exe)</span>
          </div>
          <span class="meta-dot">·</span>
          <div class="hero-meta-item">
            <a href="${constants.github.releasesUrl}" target="_blank" rel="noopener noreferrer" class="meta-link">All Releases ↗</a>
          </div>
        </div>
      </div>

      <!-- HERO VISUAL CENTERPIECE: Interactive Replica of the Real NUKRON Desktop Interface -->
      <div class="hero-stage-wrap reveal-up" data-delay="100">
        <div class="hero-stage-caption">
          <span class="stage-tag"><i class="dot-amber"></i> Interactive Product Concept — Actual NUKRON Desktop UI</span>
          <span class="stage-hint">Click sidebar tabs, launch a game, or toggle the live HUD overlay</span>
        </div>

        <div class="ember-app-window" id="hero-app-window" role="region" aria-label="Interactive NUKRON Desktop Launcher preview">
          <!-- Custom Gaming Window Controls (from renderer/index.html) -->
          <div class="app-win-bar">
            <div class="app-upd-pill" id="preview-upd-pill" title="Seamless in-app updates via GitHub Releases">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 3v12M7 10l5 5 5-5M5 20h14"/></svg>
              <span>Up to date · <b data-ember-version>v${baselineVersion}</b></span>
            </div>
            <div class="app-win-ctrls" aria-hidden="true">
              <span class="app-wbtn"><svg viewBox="0 0 16 16"><path d="M3 8.5h10"/></svg></span>
              <span class="app-wbtn"><svg viewBox="0 0 16 16"><rect x="3.5" y="3.5" width="9" height="9" rx="1.5"/></svg></span>
              <span class="app-wbtn w-close"><svg viewBox="0 0 16 16"><path d="M4.2 4.2l7.6 7.6M11.8 4.2l-7.6 7.6"/></svg></span>
            </div>
          </div>

          <div class="app-shell-grid">
            <!-- Left Sidebar (218px scale replica) -->
            <aside class="app-sidebar">
              <div class="app-brand">
                <img src="${basePath}/assets/nukron-logo.png" alt="NUKRON" width="28" height="28">
                <b>NUKRON</b>
              </div>
              <div class="app-nav" role="tablist" aria-label="NUKRON Desktop Views">
                <button type="button" class="app-nav-btn on" role="tab" aria-selected="true" data-app-tab="dash">
                  <svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>
                  <span>Dashboard</span>
                </button>
                <button type="button" class="app-nav-btn" role="tab" aria-selected="false" data-app-tab="lib">
                  <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
                  <span>Library</span>
                </button>
                <button type="button" class="app-nav-btn" role="tab" aria-selected="false" data-app-tab="stats">
                  <svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>
                  <span>Statistics</span>
                </button>
                <button type="button" class="app-nav-btn" role="tab" aria-selected="false" data-app-tab="hist">
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                  <span>History</span>
                </button>
              </div>

              <div class="app-sidebar-bottom">
                <button type="button" class="app-side-action" id="hero-toggle-overlay-btn">
                  <svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 8h2l1.5 4L12 7l1.5 5L15 8h2"/></svg>
                  <span>Toggle Overlay HUD</span>
                </button>
                <div class="app-side-foot">
                  <span class="app-ver" data-ember-version>v${baselineVersion}</span>
                  <span>What's New · Privacy · Terms</span>
                </div>
              </div>
            </aside>

            <!-- Main App Viewport -->
            <div class="app-viewport" id="hero-app-viewport">
              <!-- Populated and interactive via interactions.js, pre-rendered with Dashboard for instant load & SEO -->
              <div class="app-view-pane" data-pane="dash">
                <div class="app-view-header">
                  <h2>Dashboard</h2>
                  <span class="app-local-tag">Local SQLite · %APPDATA%\ember-launcher</span>
                </div>
                <div class="app-stats-row">
                  <div class="app-stat-card">
                    <b id="hero-total-hours">184.6</b>
                    <span>hours played</span>
                  </div>
                  <div class="app-stat-card">
                    <b>16</b>
                    <span>games in library</span>
                  </div>
                  <div class="app-stat-card now" id="hero-now-card">
                    <span class="now-label">Playing now</span>
                    <b id="hero-live-timer">00:42:19</b>
                    <span id="hero-live-game">Elden Ring: Shadow of the Erdtree</span>
                  </div>
                </div>

                <h3 class="app-subhead">Recently played</h3>
                <div class="app-game-grid">
                  <article class="app-game-card run" data-preview-game="Elden Ring: Shadow of the Erdtree">
                    <div class="app-card-art art-elden"><span>ER</span></div>
                    <div class="app-card-shade"></div>
                    <div class="app-badge-live">Playing</div>
                    <div class="app-card-meta">
                      <h4>Elden Ring</h4>
                      <div class="app-ptime"><span class="ptime-clock">◷</span><span class="ptime-text" data-live-clock>00:42:19</span></div>
                    </div>
                    <div class="app-card-acts">
                      <button type="button" class="app-play-btn" data-sim-launch="Elden Ring">Running</button>
                    </div>
                  </article>

                  <article class="app-game-card" data-preview-game="Cyberpunk 2077">
                    <div class="app-card-art art-cyber"><span>CP</span></div>
                    <div class="app-card-shade"></div>
                    <div class="app-card-meta">
                      <h4>Cyberpunk 2077</h4>
                      <div class="app-ptime"><span class="ptime-clock">◷</span><span class="ptime-text">68<i>h</i> 15<i>m</i></span></div>
                    </div>
                    <div class="app-card-acts">
                      <button type="button" class="app-play-btn" data-sim-launch="Cyberpunk 2077">Play</button>
                    </div>
                  </article>

                  <article class="app-game-card" data-preview-game="Hades II">
                    <div class="app-card-art art-hades"><span>H2</span></div>
                    <div class="app-card-shade"></div>
                    <div class="app-card-meta">
                      <h4>Hades II</h4>
                      <div class="app-ptime"><span class="ptime-clock">◷</span><span class="ptime-text">34<i>h</i> 50<i>m</i></span></div>
                    </div>
                    <div class="app-card-acts">
                      <button type="button" class="app-play-btn" data-sim-launch="Hades II">Play</button>
                    </div>
                  </article>

                  <article class="app-game-card" data-preview-game="Baldur's Gate 3">
                    <div class="app-card-art art-bg3"><span>BG</span></div>
                    <div class="app-card-shade"></div>
                    <div class="app-card-meta">
                      <h4>Baldur's Gate 3</h4>
                      <div class="app-ptime"><span class="ptime-clock">◷</span><span class="ptime-text">81<i>h</i> 10<i>m</i></span></div>
                    </div>
                    <div class="app-card-acts">
                      <button type="button" class="app-play-btn" data-sim-launch="Baldur's Gate 3">Play</button>
                    </div>
                  </article>
                </div>
              </div>
            </div>

            <!-- Floating In-Game Performance Overlay HUD Replica (from renderer/overlay.html) -->
            <div class="app-floating-overlay" id="hero-floating-overlay" aria-label="NUKRON Performance Overlay HUD preview">
              <div class="ovl-head">
                <img src="${basePath}/assets/nukron-logo.png" alt="" width="16" height="16">
                <span class="ovl-title">NUKRON</span>
                <span class="ovl-grip">⋮⋮</span>
              </div>
              <div class="ovl-metrics">
                <div class="ovl-row fps">
                  <span class="ovl-ico">⚡</span>
                  <span class="ovl-lbl">FPS</span>
                  <span class="ovl-sub" id="hero-ovl-ms">6.9 ms</span>
                  <strong class="ovl-val good" id="hero-ovl-fps">144</strong>
                </div>
                <div class="ovl-bar"><div class="ovl-fill good" style="width:88%"></div></div>
                <div class="ovl-row">
                  <span class="ovl-ico">⬡</span>
                  <span class="ovl-lbl">CPU</span>
                  <strong class="ovl-val good" id="hero-ovl-cpu">34%</strong>
                </div>
                <div class="ovl-row">
                  <span class="ovl-ico">⬡</span>
                  <span class="ovl-lbl">GPU</span>
                  <strong class="ovl-val good" id="hero-ovl-gpu">82%</strong>
                </div>
                <div class="ovl-row">
                  <span class="ovl-ico">◈</span>
                  <span class="ovl-lbl">VRAM</span>
                  <strong class="ovl-val good">7.4 GB</strong>
                </div>
                <div class="ovl-row">
                  <span class="ovl-ico">🌡</span>
                  <span class="ovl-lbl">GPU °C</span>
                  <strong class="ovl-val good">64°C</strong>
                </div>
              </div>
              <div class="ovl-foot">
                <span class="dot-live"></span>
                <span>Live Telemetry</span>
              </div>
            </div>

            <!-- Bottom Active Session Bar (#bar from renderer/app.js) -->
            <div class="app-session-bar" id="hero-session-bar">
              <div class="session-art art-elden" id="hero-session-art"></div>
              <div class="session-info">
                <b id="hero-session-title">Elden Ring: Shadow of the Erdtree</b>
                <span>Session in progress · Heartbeat saved to SQLite</span>
              </div>
              <em class="session-clock" id="hero-session-clock">00:42:19</em>
              <button type="button" class="session-ovl-toggle on" id="hero-bar-ovl-btn" title="Toggle Performance Overlay">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 8h2l1.5 4L12 7l1.5 5L15 8h2"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- =====================================================================
       SECTION 2 — INTRODUCTION ("Everything starts here.")
       ===================================================================== -->
  <section class="intro-section section-spacer" id="introduction">
    <div class="container">
      <div class="intro-header reveal-up">
        <span class="section-eyebrow">The Philosophy</span>
        <h2 class="section-headline">Everything starts here.</h2>
        <p class="section-lead">
          PC gaming shouldn't begin with five competing storefront popups, mandatory sign-in screens, and cluttered ad feeds. NUKRON brings your personal library together into a calm, fast, locally operated space on Windows.
        </p>
      </div>

      <div class="intro-pillars reveal-up">
        <article class="pillar-card pillar-featured">
          <div class="pillar-num">01</div>
          <h3>One personal library for every way you play</h3>
          <p>
            Whether your games live as standalone Windows executables, launch through Steam, Epic, GOG, or Xbox, or run inside an emulator with your own ROMs and disc images, NUKRON organizes them under one roof with custom cover artwork and groups.
          </p>
          <div class="pillar-chips">
            <span>Standalone .exe</span>
            <span>Store &amp; Xbox Apps (AUMID)</span>
            <span>Emulators + Launch Args</span>
            <span>Launcher Hand-offs</span>
          </div>
        </article>

        <article class="pillar-card">
          <div class="pillar-num">02</div>
          <h3>Owned by your PC, not a cloud server</h3>
          <p>
            Your library, cover images, session history, and settings live locally in <code>%APPDATA%\ember-launcher\</code> powered by built-in SQLite. No account to register, no telemetry, and no internet connection needed to launch or track your games.
          </p>
        </article>

        <article class="pillar-card">
          <div class="pillar-num">03</div>
          <h3>Built to respect your focus</h3>
          <p>
            From the glass dark interface to a playtime tracker that survives crashes via 4-second heartbeats, every detail in NUKRON is engineered to make launching and enjoying your games effortless.
          </p>
        </article>
      </div>
    </div>
  </section>

  <!-- =====================================================================
       SECTION 3 — FEATURE SHOWCASE (8 Features, Varied Compositions)
       ===================================================================== -->
  <section class="features-section section-spacer" id="features">
    <div class="container">
      <div class="section-title-block reveal-up">
        <span class="section-eyebrow">Crafted Capabilities</span>
        <h2 class="section-headline">Engineered for how PC gamers actually play.</h2>
        <p class="section-lead">
          Every feature in NUKRON exists to solve a real part of daily PC gaming—without bloat, subscriptions, or unnecessary complexity.
        </p>
      </div>

      <!-- COMPOSITION A: Large Split Showcase — Feature 1 (Your Gaming Library) & Feature 3 (Automatic Game Discovery) -->
      <div class="feature-split-block reveal-up">
        <div class="feature-split-copy">
          <div class="feature-tag-row">
            <span class="feature-index">01 · Library Management</span>
            <span class="feature-index">03 · Automatic Discovery</span>
          </div>
          <h3>Your Gaming Library &amp; Automatic Windows Discovery</h3>
          <p class="feature-desc">
            Keep your games organized in one place with a clean and beautiful library. Filter instantly by custom groups, sort by recent activity or total playtime, and keep full history even when a game is uninstalled or stored on an external drive.
          </p>
          <ul class="feature-check-list">
            <li>
              <strong>Automatic Windows Application Discovery:</strong> Scan registered Windows Start Menu, Microsoft Store, and Xbox games directly into your library without hunting for hidden <code>WindowsApps</code> folders.
            </li>
            <li>
              <strong>Manual &amp; Emulator Flexibility:</strong> Add any <code>.exe</code>, specify custom launch arguments, configure an emulator executable with ROM hand-off, or define a custom child process to track.
            </li>
            <li>
              <strong>Non-Destructive Uninstalled State:</strong> Moved or uninstalled games stay marked as <em>Not installed</em> with all playtime and statistics preserved until you click <em>Locate</em> or choose to remove them.
            </li>
          </ul>
        </div>

        <div class="feature-split-visual">
          <div class="discovery-demo-window">
            <div class="demo-tabs" role="tablist" aria-label="Library and Discovery Demo">
              <button type="button" class="demo-tab on" data-lib-demo="library">Library Grid</button>
              <button type="button" class="demo-tab" data-lib-demo="scanner">Import Windows Applications</button>
            </div>

            <!-- View 1: Library Grid with Group Chips -->
            <div class="demo-pane" id="demo-pane-library">
              <div class="demo-filter-bar">
                <button type="button" class="demo-chip on" data-demo-grp="all">All (6)</button>
                <button type="button" class="demo-chip" data-demo-grp="rpg">RPG</button>
                <button type="button" class="demo-chip" data-demo-grp="action">Action</button>
                <button type="button" class="demo-chip" data-demo-grp="emulated">Emulated</button>
              </div>
              <div class="demo-mini-grid" id="demo-mini-grid">
                <div class="demo-mini-card" data-grp="rpg">
                  <div class="dm-art art-elden"><span>ER</span></div>
                  <div class="dm-info"><b>Elden Ring</b><span>42h 18m · RPG</span></div>
                </div>
                <div class="demo-mini-card" data-grp="rpg">
                  <div class="dm-art art-bg3"><span>BG</span></div>
                  <div class="dm-info"><b>Baldur's Gate 3</b><span>81h 10m · RPG</span></div>
                </div>
                <div class="demo-mini-card" data-grp="action">
                  <div class="dm-art art-hades"><span>H2</span></div>
                  <div class="dm-info"><b>Hades II</b><span>34h 50m · Action</span></div>
                </div>
                <div class="demo-mini-card" data-grp="rpg">
                  <div class="dm-art art-cyber"><span>CP</span></div>
                  <div class="dm-info"><b>Cyberpunk 2077</b><span>68h 15m · RPG</span></div>
                </div>
                <div class="demo-mini-card" data-grp="emulated">
                  <div class="dm-art art-zelda"><span>ZD</span></div>
                  <div class="dm-info"><b>Breath of the Wild</b><span>52h 04m · Emulated</span></div>
                </div>
                <div class="demo-mini-card is-missing" data-grp="action">
                  <div class="dm-art art-alan"><span>AW</span><em class="dm-gone">Not installed</em></div>
                  <div class="dm-info"><b>Alan Wake 2</b><span>19h 40m · Locate</span></div>
                </div>
              </div>
            </div>

            <!-- View 2: Windows Application Scanner (from importDlg in renderer/app.js) -->
            <div class="demo-pane" id="demo-pane-scanner" hidden>
              <p class="scanner-lead">Pick the games to add. Store and Xbox games that can't be started from an .exe show up here.</p>
              <div class="scanner-list">
                <label class="scanner-row">
                  <input type="checkbox" checked data-scan-item>
                  <div>
                    <b>Forza Horizon 5</b>
                    <span>Microsoft.624F8B84B80_8wekyb3d8bbwe!ForzaHorizon5</span>
                  </div>
                </label>
                <label class="scanner-row">
                  <input type="checkbox" checked data-scan-item>
                  <div>
                    <b>Sea of Thieves</b>
                    <span>Microsoft.SeaofThieves_8wekyb3d8bbwe!AthenaClientShipping</span>
                  </div>
                </label>
                <label class="scanner-row done">
                  <input type="checkbox" checked disabled>
                  <div>
                    <b>Elden Ring</b>
                    <span>Already in your library</span>
                  </div>
                </label>
                <label class="scanner-row">
                  <input type="checkbox" data-scan-item>
                  <div>
                    <b>Hollow Knight: Silksong</b>
                    <span>TeamCherry.HollowKnightSilksong_!App</span>
                  </div>
                </label>
              </div>
              <div class="scanner-foot">
                <span class="scanner-status" id="scanner-status-text">2 Windows applications selected</span>
                <button type="button" class="btn btn-primary btn-xs" id="scanner-import-btn">Import 2 selected</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- COMPOSITION B: Full-Width Interactive Studio — Feature 4 (Performance Overlay) -->
      <div class="feature-studio-block reveal-up">
        <div class="studio-header">
          <div>
            <span class="feature-index">04 · Customizable In-Game HUD</span>
            <h3>Performance Overlay</h3>
            <p class="feature-desc">
              Monitor gaming performance using a customizable in-game overlay powered by a lightweight native Windows helper daemon (NVML, FrameView SDK, PDH, and Win32 system telemetry—zero PowerShell spawning overhead).
            </p>
          </div>
          <div class="studio-badges">
            <span class="spec-badge">4 Layouts</span>
            <span class="spec-badge">3 Sizes</span>
            <span class="spec-badge">Drag Anywhere on Screen</span>
          </div>
        </div>

        <div class="overlay-studio-grid">
          <!-- Interactive Controls matching Settings > Performance Overlay in renderer/app.js -->
          <div class="studio-controls" aria-label="Customize overlay preview">
            <div class="studio-ctrl-group">
              <label class="studio-label">Overlay Layout</label>
              <div class="studio-btn-row" id="studio-layout-btns">
                <button type="button" class="studio-opt on" data-ovl-layout="vertical">Vertical</button>
                <button type="button" class="studio-opt" data-ovl-layout="horizontal">Horizontal</button>
                <button type="button" class="studio-opt" data-ovl-layout="compact">Compact</button>
                <button type="button" class="studio-opt" data-ovl-layout="expanded">Expanded</button>
              </div>
            </div>

            <div class="studio-ctrl-group">
              <label class="studio-label">Overlay Size</label>
              <div class="studio-btn-row" id="studio-size-btns">
                <button type="button" class="studio-opt" data-ovl-size="small">Small</button>
                <button type="button" class="studio-opt on" data-ovl-size="medium">Medium</button>
                <button type="button" class="studio-opt" data-ovl-size="large">Large</button>
              </div>
            </div>

            <div class="studio-ctrl-group">
              <label class="studio-label">Displayed Metrics</label>
              <div class="studio-metric-toggles" id="studio-metric-toggles">
                <label class="metric-chip on"><input type="checkbox" value="fps" checked><span>FPS Counter</span></label>
                <label class="metric-chip on"><input type="checkbox" value="cpu" checked><span>CPU Usage</span></label>
                <label class="metric-chip on"><input type="checkbox" value="gpu" checked><span>GPU Usage</span></label>
                <label class="metric-chip on"><input type="checkbox" value="vram" checked><span>VRAM</span></label>
                <label class="metric-chip on"><input type="checkbox" value="ram" checked><span>System RAM</span></label>
                <label class="metric-chip on"><input type="checkbox" value="cpuTemp" checked><span>CPU °C</span></label>
                <label class="metric-chip on"><input type="checkbox" value="gpuTemp" checked><span>GPU °C</span></label>
              </div>
            </div>
          </div>

          <!-- Live Rendered Overlay Viewport -->
          <div class="studio-viewport">
            <div class="studio-game-backdrop">
              <div class="studio-corner-label">In-Game Screen Preview · Top-Right Anchor</div>
              <div id="studio-overlay-preview" class="live-ovl layout-vertical size-medium">
                <div class="ovl-head">
                  <img src="${basePath}/assets/nukron-logo.png" alt="" width="18" height="18">
                  <span class="ovl-title">NUKRON</span>
                  <span class="ovl-grip">⋮⋮</span>
                </div>
                <div class="live-ovl-metrics">
                  <div class="live-metric m-fps" data-m="fps">
                    <div class="lm-top"><span class="lm-ico">⚡</span><span class="lm-lbl">FPS</span><span class="lm-sub">6.1 ms</span><strong class="lm-val good">165</strong></div>
                    <div class="lm-bar"><div class="lm-fill good" style="width:92%"></div></div>
                  </div>
                  <div class="live-metric" data-m="cpu">
                    <div class="lm-top"><span class="lm-ico">⬡</span><span class="lm-lbl">CPU</span><strong class="lm-val good">28%</strong></div>
                    <div class="lm-bar"><div class="lm-fill good" style="width:28%"></div></div>
                  </div>
                  <div class="live-metric" data-m="gpu">
                    <div class="lm-top"><span class="lm-ico">⬡</span><span class="lm-lbl">GPU</span><strong class="lm-val warn">86%</strong></div>
                    <div class="lm-bar"><div class="lm-fill warn" style="width:86%"></div></div>
                  </div>
                  <div class="live-metric" data-m="vram">
                    <div class="lm-top"><span class="lm-ico">◈</span><span class="lm-lbl">VRAM</span><strong class="lm-val good">8.2 GB</strong></div>
                    <div class="lm-bar"><div class="lm-fill good" style="width:68%"></div></div>
                  </div>
                  <div class="live-metric" data-m="ram">
                    <div class="lm-top"><span class="lm-ico">◈</span><span class="lm-lbl">RAM</span><strong class="lm-val good">14.6 GB</strong></div>
                    <div class="lm-bar"><div class="lm-fill good" style="width:45%"></div></div>
                  </div>
                  <div class="live-metric" data-m="cpuTemp">
                    <div class="lm-top"><span class="lm-ico">🌡</span><span class="lm-lbl">CPU °C</span><strong class="lm-val good">58°C</strong></div>
                  </div>
                  <div class="live-metric" data-m="gpuTemp">
                    <div class="lm-top"><span class="lm-ico">🌡</span><span class="lm-lbl">GPU °C</span><strong class="lm-val good">65°C</strong></div>
                  </div>
                </div>
                <div class="ovl-foot">
                  <span class="dot-live"></span>
                  <span>Live</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- COMPOSITION C: Alternating Deep-Dive — Feature 2 (Playtime Tracking & Statistics) -->
      <div class="feature-split-block reverse reveal-up">
        <div class="feature-split-copy">
          <span class="feature-index">02 · Automatic Playtime Tracking</span>
          <h3>Playtime Tracking That Never Loses a Minute</h3>
          <p class="feature-desc">
            Track the time you spend playing your favorite games automatically whenever you launch through NUKRON. One tracker per game ensures double-clicking never creates duplicate timers.
          </p>
          <div class="tracking-specs-grid">
            <div class="ts-item">
              <strong>4s Process Heartbeat</strong>
              <span>Writes session progress to SQLite every 4 seconds. If your PC loses power mid-game, your session closes cleanly at the last heartbeat.</span>
            </div>
            <div class="ts-item">
              <strong>15s Grace Period</strong>
              <span>Handles launcher-to-game hand-offs seamlessly and waits 15 seconds after the last matching process exits before finalizing.</span>
            </div>
            <div class="ts-item">
              <strong>Daily &amp; Weekly Analytics</strong>
              <span>Explore 14-day daily charts, 8-week trends, daily averages, and most-played rankings across 7 days, 30 days, and all time.</span>
            </div>
          </div>
        </div>

        <div class="feature-split-visual">
          <div class="stats-showcase-card">
            <div class="sc-top-metrics">
              <div class="sc-stat"><b>2h 45m</b><span>played today</span></div>
              <div class="sc-stat"><b>14h 20m</b><span>this week (Mon–Sun)</span></div>
              <div class="sc-stat"><b>2h 03m</b><span>daily avg (7 days)</span></div>
            </div>
            <div class="sc-chart-box">
              <div class="sc-chart-head">
                <strong>Playtime · Last 14 Days</strong>
                <span class="sc-pill">Daily</span>
              </div>
              <div class="sc-bars" aria-hidden="true">
                <div class="sc-col"><div class="sc-b" style="height:35%"></div><span>Mon</span></div>
                <div class="sc-col"><div class="sc-b" style="height:55%"></div><span>Tue</span></div>
                <div class="sc-col"><div class="sc-b" style="height:20%"></div><span>Wed</span></div>
                <div class="sc-col"><div class="sc-b" style="height:70%"></div><span>Thu</span></div>
                <div class="sc-col"><div class="sc-b" style="height:90%"></div><span>Fri</span></div>
                <div class="sc-col"><div class="sc-b" style="height:100%"></div><span>Sat</span></div>
                <div class="sc-col now"><div class="sc-b" style="height:78%"></div><span>Today</span></div>
              </div>
            </div>
            <div class="sc-rank-list">
              <div class="sc-rank-row">
                <span class="rk-num">1</span>
                <div class="rk-body"><b>Baldur's Gate 3</b><span>44% of playtime · 81h 10m</span><u style="width:100%"></u></div>
              </div>
              <div class="sc-rank-row">
                <span class="rk-num">2</span>
                <div class="rk-body"><b>Cyberpunk 2077</b><span>37% of playtime · 68h 15m</span><u style="width:84%"></u></div>
              </div>
              <div class="sc-rank-row">
                <span class="rk-num">3</span>
                <div class="rk-body"><b>Hades II</b><span>19% of playtime · 34h 50m</span><u style="width:43%"></u></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- COMPOSITION D: Editorial Bento Trio — Features 5, 6, 7, 8 -->
      <div class="feature-editorial-grid reveal-up">
        <!-- Feature 5: Designed Around You -->
        <article class="editorial-card span-6">
          <div class="ed-top">
            <span class="feature-index">05 · Custom Interface</span>
            <h3>Designed Around You</h3>
            <p>
              Enjoy a customizable glass interface with carefully designed interactions, specular borders, responsive playtime badges, and instant switching between Dark Mode and Light Mode.
            </p>
          </div>
          <div class="theme-preview-widget" id="theme-preview-widget" data-preview-mode="dark">
            <div class="tp-header">
              <span>Live Theme Preview</span>
              <div class="tp-switch-group">
                <button type="button" class="tp-btn on" data-set-tp="dark">Dark Mode</button>
                <button type="button" class="tp-btn" data-set-tp="light">Light Mode</button>
              </div>
            </div>
            <div class="tp-sample-surface">
              <div class="tp-sample-card">
                <div class="tp-dot"></div>
                <div>
                  <b>Glass Surface</b>
                  <span>Adaptive contrast, crisp typography, and zero visual clutter.</span>
                </div>
              </div>
            </div>
          </div>
        </article>

        <!-- Feature 8: A Calmer Startup -->
        <article class="editorial-card span-6">
          <div class="ed-top">
            <span class="feature-index">08 · Mindful Welcome</span>
            <h3>A Calmer Startup</h3>
            <p>
              When NUKRON starts with Windows, an optional corner message fades in with a thoughtful quote for a few seconds, then quietly disappears. It never steals window focus, never covers fullscreen games, and shows only once per Windows session.
            </p>
          </div>
          <div class="welcome-quote-stage">
            <div class="welcome-toast-replica" id="welcome-quote-card">
              <img src="${basePath}/assets/nukron-logo.png" alt="" width="24" height="24">
              <div class="wt-copy">
                <span class="wt-brand">NUKRON</span>
                <p class="wt-msg" id="welcome-quote-text">“Take a breath. The game will wait for you.”</p>
              </div>
            </div>
            <button type="button" class="btn btn-ghost btn-xs" id="cycle-quote-btn">
              Show another startup quote ↻
            </button>
          </div>
        </article>

        <!-- Feature 6: Stay Updated -->
        <article class="editorial-card span-6">
          <div class="ed-top">
            <span class="feature-index">06 · Seamless Updates</span>
            <h3>Stay Updated Without Setup Wizards</h3>
            <p>
              Receive native Windows toast notifications when a new release is published—even while minimized to the system tray. Choosing Update downloads, verifies the SHA-512 checksum, installs silently, and reopens NUKRON with What's New ready to read.
            </p>
          </div>
          <div class="updater-mini-replica">
            <div class="umr-row">
              <img src="${basePath}/assets/nukron-logo.png" alt="" width="22" height="22">
              <div class="umr-text">
                <b>NUKRON Update Ready · <span data-ember-version>v${baselineVersion}</span></b>
                <span>SHA-512 verified · Silent install preserves all games &amp; settings</span>
              </div>
              <a href="${basePath}/whats-new.html" class="umr-link">Changelog →</a>
            </div>
          </div>
        </article>

        <!-- Feature 7: System Tray Integration -->
        <article class="editorial-card span-6">
          <div class="ed-top">
            <span class="feature-index">07 · Always Accessible</span>
            <h3>System Tray Integration</h3>
            <p>
              Keep NUKRON accessible without occupying your taskbar. Configure NUKRON to launch quietly in the Windows system tray at sign-in and minimize on close so your playtime tracking and performance overlay stay ready whenever you start a game.
            </p>
          </div>
          <div class="tray-settings-replica">
            <div class="tray-toggle-line">
              <span>Launch NUKRON when Windows starts</span>
              <span class="fake-toggle on"><i></i></span>
            </div>
            <div class="tray-toggle-line">
              <span>Minimize to system tray on close</span>
              <span class="fake-toggle on"><i></i></span>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>

  <!-- =====================================================================
       SECTION 4 — THE NUKRON EXPERIENCE ("Less managing. More playing.")
       ===================================================================== -->
  <section class="experience-section section-spacer" id="experience">
    <div class="container">
      <div class="section-title-block reveal-up">
        <span class="section-eyebrow">Your Daily Flow</span>
        <h2 class="section-headline">Less managing. More playing.</h2>
        <p class="section-lead">
          See how NUKRON fits naturally into every gaming session from the moment you sit down at your PC.
        </p>
      </div>

      <div class="journey-layout reveal-up">
        <ol class="journey-steps" id="journey-steps" role="tablist" aria-label="The NUKRON daily gaming journey">
          <li class="journey-step active" data-step="0" role="tab" tabindex="0" aria-selected="true">
            <span class="step-num">01</span>
            <div class="step-body">
              <h3>Open NUKRON</h3>
              <p>Wake NUKRON from your Windows system tray or launch it directly—greeted by a calm, instant interface with zero login prompts.</p>
            </div>
          </li>
          <li class="journey-step" data-step="1" role="tab" tabindex="0" aria-selected="false">
            <span class="step-num">02</span>
            <div class="step-body">
              <h3>Access your gaming library</h3>
              <p>Browse your unified collection across PC stores, standalone installs, and emulators with instant search and group filters.</p>
            </div>
          </li>
          <li class="journey-step" data-step="2" role="tab" tabindex="0" aria-selected="false">
            <span class="step-num">03</span>
            <div class="step-body">
              <h3>Launch your favorite game</h3>
              <p>Click any game card to start playing immediately. NUKRON handles launch arguments, emulator ROM paths, or Windows App IDs automatically.</p>
            </div>
          </li>
          <li class="journey-step" data-step="3" role="tab" tabindex="0" aria-selected="false">
            <span class="step-num">04</span>
            <div class="step-body">
              <h3>Track your playtime</h3>
              <p>A single session tracker monitors the running process every 4 seconds and records heartbeats locally to SQLite until you finish playing.</p>
            </div>
          </li>
          <li class="journey-step" data-step="4" role="tab" tabindex="0" aria-selected="false">
            <span class="step-num">05</span>
            <div class="step-body">
              <h3>Monitor your gaming performance</h3>
              <p>Toggle the performance overlay anytime to inspect live FPS, frame time, CPU/GPU load, VRAM, RAM, and temperatures.</p>
            </div>
          </li>
        </ol>

        <div class="journey-stage" id="journey-stage" aria-live="polite">
          <div class="js-card" id="journey-stage-card">
            <div class="js-step-badge" id="js-badge">Step 01 · Instant Startup</div>
            <h4 class="js-title" id="js-title">Ready in the background before you even pick a game</h4>
            <p class="js-desc" id="js-desc">
              With single-instance locking and optional Windows startup in the system tray, NUKRON is already waiting quietly when you sign in—accompanied by a gentle, optional welcome quote once per session.
            </p>
            <div class="js-visual" id="js-visual">
              <div class="js-mock-box">
                <div class="js-mock-row">
                  <span class="dot-live"></span>
                  <strong>NUKRON Single-Instance Lock Active</strong>
                  <code>%APPDATA%\ember-launcher\launcher.db</code>
                </div>
                <div class="js-mock-quote">
                  “Welcome back. Take your time.”
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- =====================================================================
       SECTION 5 — PERFORMANCE AND SIMPLICITY ("Made to stay out of your way.")
       ===================================================================== -->
  <section class="simplicity-section section-spacer" id="simplicity">
    <div class="container">
      <div class="simplicity-shell reveal-up">
        <div class="simplicity-intro">
          <span class="section-eyebrow">Local-First Architecture</span>
          <h2 class="section-headline">Made to stay out of your way.</h2>
          <p class="section-lead">
            NUKRON is built as a practical gaming companion rather than another noisy platform competing for your attention. It runs locally on your machine and respects your system resources.
          </p>
        </div>

        <div class="simplicity-grid">
          <div class="simp-card">
            <div class="simp-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
            </div>
            <h3>100% Local Operation</h3>
            <p>
              Built on Electron's built-in <code>node:sqlite</code> engine with zero cloud dependencies. Your game paths, cover images, and session timestamps never leave your PC.
            </p>
          </div>

          <div class="simp-card">
            <div class="simp-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
            </div>
            <h3>Simple Organization</h3>
            <p>
              No convoluted nested menus or store tabs. Group your games the way you think about them, find anything in keystrokes, and launch with a single click.
            </p>
          </div>

          <div class="simp-card">
            <div class="simp-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </div>
            <h3>Practical Native Helper</h3>
            <p>
              Process scanning and hardware telemetry run through a persistent, lightweight native Windows helper rather than repeatedly spawning heavy background shells.
            </p>
          </div>

          <div class="simp-card">
            <div class="simp-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <h3>Zero Unnecessary Complexity</h3>
            <p>
              No mandatory user accounts. No subscriptions. No ads, chat popups, or telemetry trackers. Only network requests are checking GitHub Releases for app updates.
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- =====================================================================
       SECTION 6 — FINAL DOWNLOAD SECTION ("Ready to make room for NUKRON?")
       ===================================================================== -->
  <section class="final-cta-section section-spacer" id="download-cta">
    <div class="container">
      <div class="final-cta-card reveal-up">
        <div class="final-cta-glow" aria-hidden="true"></div>
        <img src="${basePath}/assets/nukron-logo.png" alt="NUKRON logo" width="64" height="64" class="final-cta-logo">
        <h2 class="final-cta-headline">Ready to make room for NUKRON?</h2>
        <p class="final-cta-desc">Your next gaming session starts here.</p>

        <div class="final-cta-actions">
          <button type="button" class="btn btn-primary btn-xl" data-ember-download>
            <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M10 3v10m0 0l-4-4m4 4l4-4M3 16h14"/>
            </svg>
            <span>Download for Windows</span>
          </button>
          <a href="${basePath}/download.html" class="btn btn-glass btn-xl">
            Installation &amp; Release Details
          </a>
        </div>

        <div class="final-cta-meta">
          <span>Latest Release: <strong data-ember-version>v${baselineVersion}</strong></span>
          <span class="meta-dot">·</span>
          <span data-ember-release-date>Official GitHub Release</span>
          <span class="meta-dot">·</span>
          <span>Windows 10 &amp; 11 (64-bit)</span>
          <span class="meta-dot">·</span>
          <a href="${constants.github.releasesUrl}" target="_blank" rel="noopener noreferrer">View all releases on GitHub ↗</a>
        </div>
      </div>
    </div>
  </section>
  `;
}

module.exports = { renderHomePage };

