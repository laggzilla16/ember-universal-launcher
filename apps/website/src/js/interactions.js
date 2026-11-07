/**
 * NUKRON Official Website — Interactive Product Demonstrations & UI Polish
 */
(function () {
  'use strict';

  const pad = n => String(n).padStart(2, '0');
  const formatClock = totalSec => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor(totalSec / 60) % 60;
    const s = totalSec % 60;
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  document.addEventListener('DOMContentLoaded', () => {
    initHeaderAndMobileNav();
    initScrollReveal();
    initHeroDesktopPreview();
    initDiscoveryDemo();
    initOverlayStudio();
    initThemeAndWelcomeWidgets();
    initJourneyTimeline();
    initFaqSearchAndFilter();
  });

  /* 1. Sticky Glass Navigation & Mobile Menu */
  function initHeaderAndMobileNav() {
    const header = document.getElementById('site-header');
    const toggleBtn = document.getElementById('mobile-menu-toggle');
    const drawer = document.getElementById('mobile-nav-drawer');

    if (header) {
      const onScroll = () => {
        header.classList.toggle('scrolled', window.scrollY > 18);
      };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    if (toggleBtn && drawer) {
      const setOpen = open => {
        toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        drawer.hidden = !open;
      };
      toggleBtn.addEventListener('click', () => {
        const isOpen = toggleBtn.getAttribute('aria-expanded') === 'true';
        setOpen(!isOpen);
      });
      drawer.querySelectorAll('a, [data-mobile-close]').forEach(link => {
        link.addEventListener('click', () => setOpen(false));
      });
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !drawer.hidden) setOpen(false);
      });
    }
  }

  /* 2. Scroll Reveal (respects prefers-reduced-motion) */
  function initScrollReveal() {
    const items = document.querySelectorAll('.reveal-up');
    if (!items.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      items.forEach(el => el.classList.add('in-view'));
      return;
    }

    document.documentElement.classList.add('js-anim-ready');
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const delay = parseInt(entry.target.getAttribute('data-delay') || '0', 10);
            if (delay > 0) {
              setTimeout(() => entry.target.classList.add('in-view'), delay);
            } else {
              entry.target.classList.add('in-view');
            }
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -30px 0px' }
    );

    items.forEach(el => io.observe(el));
  }

  /* 3. Hero Interactive NUKRON Desktop Preview */
  function initHeroDesktopPreview() {
    const win = document.getElementById('hero-app-window');
    if (!win) return;

    const viewport = document.getElementById('hero-app-viewport');
    const floatingOvl = document.getElementById('hero-floating-overlay');
    const sideOvlBtn = document.getElementById('hero-toggle-overlay-btn');
    const barOvlBtn = document.getElementById('hero-bar-ovl-btn');
    const sessionClockEl = document.getElementById('hero-session-clock');
    const sessionTitleEl = document.getElementById('hero-session-title');
    const sessionArtEl = document.getElementById('hero-session-art');

    let activeTab = 'dash';
    let activeGame = {
      name: 'Elden Ring: Shadow of the Erdtree',
      short: 'Elden Ring',
      artClass: 'art-elden',
      elapsedSec: 42 * 60 + 19
    };

    const gamesData = [
      { name: 'Elden Ring: Shadow of the Erdtree', short: 'Elden Ring', code: 'ER', artClass: 'art-elden', ptime: '42<i>h</i> 19<i>m</i>', grp: 'RPG' },
      { name: 'Cyberpunk 2077', short: 'Cyberpunk 2077', code: 'CP', artClass: 'art-cyber', ptime: '68<i>h</i> 15<i>m</i>', grp: 'RPG' },
      { name: 'Hades II', short: 'Hades II', code: 'H2', artClass: 'art-hades', ptime: '34<i>h</i> 50<i>m</i>', grp: 'Action' },
      { name: "Baldur's Gate 3", short: "Baldur's Gate 3", code: 'BG', artClass: 'art-bg3', ptime: '81<i>h</i> 10<i>m</i>', grp: 'RPG' }
    ];

    function renderHeroTab(tab) {
      activeTab = tab;
      win.querySelectorAll('[data-app-tab]').forEach(btn => {
        const isCurrent = btn.getAttribute('data-app-tab') === tab;
        btn.classList.toggle('on', isCurrent);
        btn.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
      });

      const clockStr = formatClock(activeGame.elapsedSec);

      if (tab === 'dash') {
        viewport.innerHTML = `
          <div class="app-view-pane" data-pane="dash">
            <div class="app-view-header">
              <h2>Dashboard</h2>
              <span class="app-local-tag">Local SQLite · %APPDATA%\\ember-launcher</span>
            </div>
            <div class="app-stats-row">
              <div class="app-stat-card"><b>184.6</b><span>hours played</span></div>
              <div class="app-stat-card"><b>16</b><span>games in library</span></div>
              <div class="app-stat-card now">
                <span class="now-label">Playing now</span>
                <b id="hero-live-timer">${clockStr}</b>
                <span id="hero-live-game">${activeGame.name}</span>
              </div>
            </div>
            <h3 class="app-subhead">Recently played</h3>
            <div class="app-game-grid">
              ${gamesData
                .map(g => {
                  const isRunning = g.short === activeGame.short;
                  return `
                  <article class="app-game-card ${isRunning ? 'run' : ''}">
                    <div class="app-card-art ${g.artClass}"><span>${g.code}</span></div>
                    <div class="app-card-shade"></div>
                    ${isRunning ? '<div class="app-badge-live">Playing</div>' : ''}
                    <div class="app-card-meta">
                      <h4>${g.short}</h4>
                      <div class="app-ptime"><span class="ptime-clock">◷</span><span class="ptime-text" ${isRunning ? 'data-live-clock' : ''}>${isRunning ? clockStr : g.ptime}</span></div>
                    </div>
                    <div class="app-card-acts">
                      <button type="button" class="app-play-btn" data-sim-launch="${g.short}">${isRunning ? 'Running' : 'Play'}</button>
                    </div>
                  </article>`;
                })
                .join('')}
            </div>
          </div>`;
      } else if (tab === 'lib') {
        viewport.innerHTML = `
          <div class="app-view-pane" data-pane="lib">
            <div class="app-view-header">
              <h2>Library</h2>
              <span class="app-local-tag">16 Games · .exe, Emulators &amp; Windows AppIDs</span>
            </div>
            <div class="demo-filter-bar" style="margin-bottom:16px">
              <span class="demo-chip on">All Games</span>
              <span class="demo-chip">RPG</span>
              <span class="demo-chip">Action</span>
              <span class="demo-chip">Emulated</span>
            </div>
            <div class="app-game-grid">
              ${gamesData
                .map(g => {
                  const isRunning = g.short === activeGame.short;
                  return `
                  <article class="app-game-card ${isRunning ? 'run' : ''}">
                    <div class="app-card-art ${g.artClass}"><span>${g.code}</span></div>
                    <div class="app-card-shade"></div>
                    ${isRunning ? '<div class="app-badge-live">Playing</div>' : ''}
                    <div class="app-card-meta">
                      <h4>${g.short}</h4>
                      <div class="app-ptime"><span class="ptime-clock">◷</span><span class="ptime-text" ${isRunning ? 'data-live-clock' : ''}>${isRunning ? clockStr : g.ptime}</span></div>
                    </div>
                    <div class="app-card-acts">
                      <button type="button" class="app-play-btn" data-sim-launch="${g.short}">${isRunning ? 'Running' : 'Play'}</button>
                    </div>
                  </article>`;
                })
                .join('')}
            </div>
          </div>`;
      } else if (tab === 'stats') {
        viewport.innerHTML = `
          <div class="app-view-pane" data-pane="stats">
            <div class="app-view-header">
              <h2>Statistics</h2>
              <span class="app-local-tag">14-Day Daily &amp; 8-Week Playtime Analytics</span>
            </div>
            <div class="app-stats-row">
              <div class="app-stat-card"><b>2h 45m</b><span>played today</span></div>
              <div class="app-stat-card"><b>14h 20m</b><span>this week (Mon–Sun)</span></div>
              <div class="app-stat-card"><b>2h 03m</b><span>daily average, last 7 days</span></div>
            </div>
            <div class="sc-rank-list">
              <div class="sc-rank-row"><span class="rk-num">1</span><div class="rk-body"><b>Baldur's Gate 3 · 81h 10m</b><span>44% of all-time playtime</span><u style="width:100%"></u></div></div>
              <div class="sc-rank-row"><span class="rk-num">2</span><div class="rk-body"><b>Cyberpunk 2077 · 68h 15m</b><span>37% of all-time playtime</span><u style="width:84%"></u></div></div>
              <div class="sc-rank-row"><span class="rk-num">3</span><div class="rk-body"><b>Elden Ring · 42h 19m</b><span>19% of all-time playtime</span><u style="width:52%"></u></div></div>
            </div>
          </div>`;
      } else if (tab === 'hist') {
        viewport.innerHTML = `
          <div class="app-view-pane" data-pane="hist">
            <div class="app-view-header">
              <h2>History</h2>
              <span class="app-local-tag">Every Session Logged with 4s SQLite Heartbeats</span>
            </div>
            <div class="sc-rank-list">
              <div class="sc-rank-row"><span class="dot-live"></span><div class="rk-body"><b>${activeGame.name}</b><span>Started today · Live session in progress (${clockStr})</span></div></div>
              <div class="sc-rank-row"><span class="rk-num">✓</span><div class="rk-body"><b>Cyberpunk 2077</b><span>Yesterday · 19:40 – 21:55 (2h 15m)</span></div></div>
              <div class="sc-rank-row"><span class="rk-num">✓</span><div class="rk-body"><b>Hades II</b><span>Yesterday · 17:10 – 18:30 (1h 20m)</span></div></div>
            </div>
          </div>`;
      }
    }

    // Tab clicks
    win.querySelectorAll('[data-app-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        renderHeroTab(btn.getAttribute('data-app-tab'));
      });
    });

    // Simulate launching another game card inside the Hero preview
    win.addEventListener('click', e => {
      const launchBtn = e.target.closest('[data-sim-launch]');
      if (!launchBtn) return;
      const targetShort = launchBtn.getAttribute('data-sim-launch');
      const found = gamesData.find(g => g.short === targetShort);
      if (found && found.short !== activeGame.short) {
        activeGame = {
          name: found.name,
          short: found.short,
          artClass: found.artClass,
          elapsedSec: 1
        };
        if (sessionTitleEl) sessionTitleEl.textContent = activeGame.name;
        if (sessionArtEl) sessionArtEl.className = `session-art ${activeGame.artClass}`;
        renderHeroTab(activeTab);
      }
    });

    // Toggle floating overlay HUD
    const toggleHeroOverlay = () => {
      if (!floatingOvl) return;
      const isHidden = floatingOvl.classList.toggle('hidden-ovl');
      if (barOvlBtn) barOvlBtn.classList.toggle('on', !isHidden);
    };
    if (sideOvlBtn) sideOvlBtn.addEventListener('click', toggleHeroOverlay);
    if (barOvlBtn) barOvlBtn.addEventListener('click', toggleHeroOverlay);

    // Live 1-second session timer tick
    setInterval(() => {
      activeGame.elapsedSec += 1;
      const formatted = formatClock(activeGame.elapsedSec);
      const timerEl = document.getElementById('hero-live-timer');
      if (timerEl) timerEl.textContent = formatted;
      if (sessionClockEl) sessionClockEl.textContent = formatted;
      win.querySelectorAll('[data-live-clock]').forEach(el => {
        el.textContent = formatted;
      });
    }, 1000);
  }

  /* 4. Feature 1 & 3: Library Group Filter + Windows Application Discovery Scanner */
  function initDiscoveryDemo() {
    const libPane = document.getElementById('demo-pane-library');
    const scanPane = document.getElementById('demo-pane-scanner');
    const tabBtns = document.querySelectorAll('[data-lib-demo]');

    if (tabBtns.length && libPane && scanPane) {
      tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const mode = btn.getAttribute('data-lib-demo');
          tabBtns.forEach(b => b.classList.toggle('on', b === btn));
          libPane.hidden = mode !== 'library';
          scanPane.hidden = mode !== 'scanner';
        });
      });
    }

    // Group filter chips
    const grpBtns = document.querySelectorAll('[data-demo-grp]');
    const cards = document.querySelectorAll('#demo-mini-grid .demo-mini-card');
    grpBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const grp = btn.getAttribute('data-demo-grp');
        grpBtns.forEach(b => b.classList.toggle('on', b === btn));
        cards.forEach(card => {
          const cGrp = card.getAttribute('data-grp');
          card.hidden = grp !== 'all' && cGrp !== grp;
        });
      });
    });

    // Scanner checkboxes
    const scanChecks = document.querySelectorAll('[data-scan-item]');
    const statusText = document.getElementById('scanner-status-text');
    const importBtn = document.getElementById('scanner-import-btn');

    const syncScannerCount = () => {
      let count = 0;
      scanChecks.forEach(cb => {
        if (cb.checked) count++;
      });
      if (statusText) {
        statusText.textContent = count
          ? `${count} Windows application${count === 1 ? '' : 's'} selected`
          : 'Select applications to import';
      }
      if (importBtn) {
        importBtn.textContent = count ? `Import ${count} selected` : 'Import selected';
        importBtn.disabled = count === 0;
      }
    };

    scanChecks.forEach(cb => cb.addEventListener('change', syncScannerCount));
    if (importBtn) {
      importBtn.addEventListener('click', () => {
        if (statusText) {
          statusText.textContent = '✓ Imported into local SQLite library (%APPDATA%\\ember-launcher\\launcher.db)';
        }
      });
    }
  }

  /* 5. Feature 4: Interactive Performance Overlay Studio */
  function initOverlayStudio() {
    const preview = document.getElementById('studio-overlay-preview');
    if (!preview) return;

    let currentLayout = 'vertical';
    let currentSize = 'medium';

    const syncClasses = () => {
      preview.className = `live-ovl layout-${currentLayout} size-${currentSize}`;
    };

    document.querySelectorAll('[data-ovl-layout]').forEach(btn => {
      btn.addEventListener('click', () => {
        currentLayout = btn.getAttribute('data-ovl-layout');
        document.querySelectorAll('[data-ovl-layout]').forEach(b => b.classList.toggle('on', b === btn));
        syncClasses();
      });
    });

    document.querySelectorAll('[data-ovl-size]').forEach(btn => {
      btn.addEventListener('click', () => {
        currentSize = btn.getAttribute('data-ovl-size');
        document.querySelectorAll('[data-ovl-size]').forEach(b => b.classList.toggle('on', b === btn));
        syncClasses();
      });
    });

    document.querySelectorAll('#studio-metric-toggles input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        const metricKey = cb.value;
        const chip = cb.closest('.metric-chip');
        if (chip) chip.classList.toggle('on', cb.checked);
        const row = preview.querySelector(`[data-m="${metricKey}"]`);
        if (row) row.classList.toggle('hidden-metric', !cb.checked);
      });
    });
  }

  /* 6. Feature 5 & 8: Theme Switcher Preview + Startup Welcome Quotes */
  function initThemeAndWelcomeWidgets() {
    const themeWidget = document.getElementById('theme-preview-widget');
    if (themeWidget) {
      themeWidget.querySelectorAll('[data-set-tp]').forEach(btn => {
        btn.addEventListener('click', () => {
          const mode = btn.getAttribute('data-set-tp');
          themeWidget.setAttribute('data-preview-mode', mode);
          themeWidget.querySelectorAll('[data-set-tp]').forEach(b => b.classList.toggle('on', b === btn));
        });
      });
    }

    const quoteText = document.getElementById('welcome-quote-text');
    const cycleBtn = document.getElementById('cycle-quote-btn');
    const baseline = window.EMBER_BASELINE_DATA || {};
    const messages =
      Array.isArray(baseline.welcomeMessages) && baseline.welcomeMessages.length
        ? baseline.welcomeMessages
        : [
            'Take a breath. The game will wait for you.',
            'Make today a good save point.',
            'A calm mind plays better.',
            'Welcome back. Take your time.',
            'Your pace is the right pace.',
            'Small steps still move you forward.'
          ];

    let qIdx = 0;
    if (cycleBtn && quoteText) {
      cycleBtn.addEventListener('click', () => {
        qIdx = (qIdx + 1) % messages.length;
        quoteText.textContent = `“${messages[qIdx]}”`;
      });
    }
  }

  /* 7. Section 4: The NUKRON Experience 5-Step Journey */
  function initJourneyTimeline() {
    const steps = document.querySelectorAll('#journey-steps .journey-step');
    const badgeEl = document.getElementById('js-badge');
    const titleEl = document.getElementById('js-title');
    const descEl = document.getElementById('js-desc');
    const visualEl = document.getElementById('js-visual');
    if (!steps.length || !badgeEl || !titleEl || !descEl || !visualEl) return;

    const stepData = [
      {
        badge: 'Step 01 · Open NUKRON',
        title: 'Ready in the background before you even pick a game',
        desc: 'With single-instance locking and optional Windows startup in the system tray, NUKRON is already waiting quietly when you sign in—accompanied by a gentle, optional welcome quote once per session.',
        html: `
          <div class="js-mock-box">
            <div class="js-mock-row">
              <span class="dot-live"></span>
              <strong>NUKRON Single-Instance Lock Active</strong>
              <code>%APPDATA%\\ember-launcher\\launcher.db</code>
            </div>
            <div class="js-mock-quote">“Welcome back. Take your time.”</div>
          </div>`
      },
      {
        badge: 'Step 02 · Access Your Gaming Library',
        title: 'Every game you own in one calm, searchable space',
        desc: 'Filter by custom groups like RPG, Action, or Emulated, search in real time, or scan installed Windows Start Menu and Xbox applications without digging through system folders.',
        html: `
          <div class="js-mock-box">
            <div class="js-mock-row">
              <span class="spec-badge">All Games (16)</span>
              <span class="spec-badge">RPG</span>
              <span class="spec-badge">Action</span>
              <span class="spec-badge">Emulated</span>
            </div>
            <div class="js-mock-quote">Instant local filtering · Custom cover art &amp; group tags</div>
          </div>`
      },
      {
        badge: 'Step 03 · Launch Your Favorite Game',
        title: 'One click starts the game and arms the session tracker',
        desc: 'NUKRON spawns your game executable directly, passes custom launch arguments or ROM files to your emulator, or triggers the registered Windows AppUserModelID.',
        html: `
          <div class="js-mock-box">
            <div class="js-mock-row">
              <span class="dot-live"></span>
              <strong>Launching: Elden Ring</strong>
              <code>Session tracker armed · Duplicate timer lock active</code>
            </div>
            <div class="js-mock-quote">Supports .exe, launcher hand-offs, emulators, and Store apps</div>
          </div>`
      },
      {
        badge: 'Step 04 · Track Your Playtime',
        title: '4-second SQLite heartbeats that survive unexpected shutdowns',
        desc: 'Every 4 seconds, NUKRON inspects active process paths locally and updates your session heartbeat in SQLite. When you quit the game, the session closes cleanly after a 15-second grace period.',
        html: `
          <div class="js-mock-box">
            <div class="js-mock-row">
              <span class="dot-live"></span>
              <strong>Heartbeat #634 saved to launcher.db</strong>
              <code>00:42:19 elapsed</code>
            </div>
            <div class="js-mock-quote">14-day daily charts · 8-week trends · All-time rankings</div>
          </div>`
      },
      {
        badge: 'Step 05 · Monitor Your Gaming Performance',
        title: 'Real-time hardware telemetry whenever you want a closer look',
        desc: 'Toggle the overlay in-game to monitor FPS, frame time, CPU/GPU utilization, VRAM, system RAM, and temperatures across four customizable layouts.',
        html: `
          <div class="js-mock-box">
            <div class="js-mock-row">
              <span class="spec-badge">⚡ 144 FPS (6.9 ms)</span>
              <span class="spec-badge">CPU 34%</span>
              <span class="spec-badge">GPU 82% · 64°C</span>
              <span class="spec-badge">VRAM 7.4 GB</span>
            </div>
            <div class="js-mock-quote">Draggable anywhere on screen · Saved per layout &amp; size</div>
          </div>`
      }
    ];

    const activateStep = idx => {
      const data = stepData[idx];
      if (!data) return;
      steps.forEach((s, i) => {
        const active = i === idx;
        s.classList.toggle('active', active);
        s.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      badgeEl.textContent = data.badge;
      titleEl.textContent = data.title;
      descEl.textContent = data.desc;
      visualEl.innerHTML = data.html;
    };

    steps.forEach((stepEl, idx) => {
      stepEl.addEventListener('click', () => activateStep(idx));
      stepEl.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activateStep(idx);
        }
      });
    });
  }

  /* 8. FAQ Live Search & Category Filtering */
  function initFaqSearchAndFilter() {
    const searchInput = document.getElementById('faq-search-input');
    const catBtns = document.querySelectorAll('[data-faq-filter]');
    const items = document.querySelectorAll('#faq-list .faq-item');
    const emptyState = document.getElementById('faq-empty-state');
    if (!items.length) return;

    let activeCategory = 'all';
    let query = '';

    const applyFilter = () => {
      let visibleCount = 0;
      items.forEach(item => {
        const cat = item.getAttribute('data-faq-cat');
        const text = item.textContent.toLowerCase();
        const matchesCat = activeCategory === 'all' || cat === activeCategory || (activeCategory === 'updates' && cat === 'support') || (activeCategory === 'general' && cat === 'compatibility');
        const matchesQuery = !query || text.includes(query);
        const show = matchesCat && matchesQuery;
        item.hidden = !show;
        if (show) {
          visibleCount++;
          if (query.length > 1) item.open = true;
        }
      });
      if (emptyState) emptyState.hidden = visibleCount > 0;
    };

    if (searchInput) {
      searchInput.addEventListener('input', e => {
        query = e.target.value.trim().toLowerCase();
        applyFilter();
      });
    }

    catBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        activeCategory = btn.getAttribute('data-faq-filter');
        catBtns.forEach(b => b.classList.toggle('on', b === btn));
        applyFilter();
      });
    });
  }
})();

