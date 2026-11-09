// First-time interactive onboarding tour for NUKRON powered by Driver.js.
(function (root, factory) {
  const exportsObj = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = exportsObj;
  }
  if (root) {
    root.NukronOnboarding = exportsObj;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this, function () {
  const ONBOARDING_STORAGE_KEY = 'onboardingCompleted';

  const ONBOARDING_STEPS = [
    {
      id: 'welcome',
      kicker: 'Welcome',
      title: 'Welcome to NUKRON',
      description:
        'Your games. Your universe. Let\u2019s take a quick interactive tour to set up your first game, customize its details, and explore your library and dashboard.',
      centered: true,
      view: 'dash',
      showButtons: ['next', 'close'],
      showSkip: true,
      nextBtnText: 'Next'
    },
    {
      id: 'add-game',
      kicker: 'Step 1 \u00b7 Import',
      title: 'Add Your First Game',
      description:
        'Click <b>Add game</b> to add a PC game from your computer. You\u2019ll select the game\u2019s <code>.exe</code> file using <b>Browse</b> \u2014 NUKRON never imports anything without your choice.',
      selectors: ['.bar [data-add]', '[data-add]', 'nav button[data-v="lib"]', '#view'],
      view: 'lib',
      side: 'bottom',
      align: 'end',
      disableActiveInteraction: false,
      showButtons: ['previous', 'next', 'close'],
      showSkip: true,
      prevBtnText: 'Back',
      nextBtnText: 'Next'
    },
    {
      id: 'game-details',
      kicker: 'Step 2 \u00b7 Configure',
      title: 'Game Details & Artwork',
      description:
        'Use <b>Browse</b> to pick your game\u2019s <code>.exe</code> file, customize its display <b>Name</b>, choose a <b>Cover image</b>, assign a <b>Group</b>, or set optional launch arguments. Click <b>Save</b> after picking a file, or <b>Next</b> to continue.',
      selectors: ['#dlg', '#dlg .dl', '.bar [data-add]', '#view'],
      view: 'lib',
      openEditDialog: true,
      side: 'right',
      align: 'center',
      disableActiveInteraction: false,
      showButtons: ['previous', 'next', 'close'],
      showSkip: true,
      prevBtnText: 'Back',
      nextBtnText: 'Next'
    },
    {
      id: 'library',
      kicker: 'Step 3 \u00b7 Collection',
      title: 'Your Game Library',
      description:
        'All of your imported games appear here with cover artwork and live playtime badges. Search by title, filter by group, sort by recent activity or playtime, and launch any game in one click.',
      selectors: ['#grid', '#view'],
      view: 'lib',
      side: 'top',
      align: 'center',
      disableActiveInteraction: true,
      showButtons: ['previous', 'next', 'close'],
      showSkip: true,
      prevBtnText: 'Back',
      nextBtnText: 'Next'
    },
    {
      id: 'dashboard',
      kicker: 'Step 4 \u00b7 Overview',
      title: 'Smart Gaming Dashboard',
      description:
        'Your command center at a glance. Track total hours played, Monday\u2013Sunday activity charts, monthly top-played rankings, and jump straight back into recently played games.',
      selectors: ['.dash-stats', '.dash-overview-grid', '#view'],
      view: 'dash',
      side: 'bottom',
      align: 'center',
      disableActiveInteraction: true,
      showButtons: ['previous', 'next', 'close'],
      showSkip: true,
      prevBtnText: 'Back',
      nextBtnText: 'Next'
    },
    {
      id: 'finish',
      kicker: 'All Set',
      title: 'You\u2019re Ready to Play!',
      description:
        'Setup is complete. Add games anytime from your Library, customize the optical-glass performance overlay in Settings, or use <b>Replay Tutorial</b> in Settings whenever you want a refresher.',
      centered: true,
      view: 'dash',
      showButtons: ['previous', 'next', 'close'],
      showSkip: false,
      prevBtnText: 'Back',
      doneBtnText: 'Finish'
    }
  ];

  function isElementVisible(el) {
    if (!el || typeof el !== 'object') return false;
    if (el.isConnected === false) return false;
    if (el.tagName === 'DIALOG' && !el.open && !el.hasAttribute?.('open')) return false;
    if (typeof el.getClientRects === 'function') {
      const rects = el.getClientRects();
      if (rects && rects.length > 0) return true;
    }
    return !!(el.offsetWidth || el.offsetHeight || el.clientWidth || el.clientHeight);
  }

  function resolveFirstVisible(doc, selectors) {
    if (!doc || !Array.isArray(selectors)) return undefined;
    for (const sel of selectors) {
      try {
        const el = doc.querySelector(sel);
        if (el && isElementVisible(el)) return el;
      } catch {}
    }
    // Fallback if layout dimensions aren't computed (e.g. headless DOM environment)
    for (const sel of selectors) {
      try {
        const el = doc.querySelector(sel);
        if (el) return el;
      } catch {}
    }
    return undefined;
  }

  function isOnboardingCompleted(storage, appSettings) {
    try {
      if (storage && storage.getItem(ONBOARDING_STORAGE_KEY) === '1') return true;
    } catch {}
    if (appSettings && appSettings.onboardingCompleted === true) {
      try {
        if (storage) storage.setItem(ONBOARDING_STORAGE_KEY, '1');
      } catch {}
      return true;
    }
    return false;
  }

  function markOnboardingCompleted(storage, api) {
    try {
      if (storage) storage.setItem(ONBOARDING_STORAGE_KEY, '1');
    } catch {}
    try {
      if (api && typeof api.appSettings === 'function') {
        api.appSettings({ onboardingCompleted: true });
      }
    } catch {}
  }

  function createOnboardingController(options = {}) {
    const doc = options.document || (typeof document !== 'undefined' ? document : null);
    const storage = options.storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    const api = options.api || (typeof window !== 'undefined' ? window.api : null);
    const getDriverFactory =
      options.getDriver ||
      (() => {
        if (typeof window !== 'undefined' && window.driver && window.driver.js && typeof window.driver.js.driver === 'function') {
          return window.driver.js.driver;
        }
        if (typeof window !== 'undefined' && typeof window.driver === 'function') {
          return window.driver;
        }
        return null;
      });

    let activeDriver = null;
    let tourOpenedDlg = false;
    let cachedAppSettings = null;

    function syncBodyStepClass(stepId) {
      if (!doc || !doc.body) return;
      doc.body.classList.toggle('tour-step-details', stepId === 'game-details');
      if (stepId) {
        doc.body.dataset.tourStep = stepId;
      } else {
        delete doc.body.dataset.tourStep;
      }
    }

    function ensureView(targetView) {
      if (!targetView) return;
      try {
        if (typeof options.setView === 'function') {
          options.setView(targetView);
        }
        const viewEl = doc?.querySelector('#view');
        if (viewEl) {
          viewEl.classList.remove('in');
          viewEl.scrollTop = 0;
        }
      } catch {}
    }

    function closeTourDialogIfNeeded() {
      try {
        const dlg = doc?.querySelector('#dlg');
        if (dlg && (dlg.open || dlg.hasAttribute?.('open')) && !dlg.oncancel) {
          if (typeof dlg.close === 'function') dlg.close();
          else dlg.removeAttribute?.('open');
        }
        tourOpenedDlg = false;
      } catch {}
    }

    function prepareStepEnvironment(meta) {
      if (!meta) return;
      syncBodyStepClass(meta.id);
      if (meta.openEditDialog) {
        ensureView(meta.view);
        const dlg = doc?.querySelector('#dlg');
        const hasExeField = !!(dlg && dlg.querySelector?.('#f-exe'));
        const isOpen = !!(dlg && (dlg.open || dlg.hasAttribute?.('open')));
        if (!isOpen || !hasExeField) {
          try {
            if (typeof options.openAddGameDialog === 'function') {
              options.openAddGameDialog();
              tourOpenedDlg = true;
            }
          } catch {}
        }
      } else {
        closeTourDialogIfNeeded();
        ensureView(meta.view);
      }
    }

    function decoratePopoverDOM(popover, stepIndex) {
      if (!popover || !popover.wrapper || !doc) return;
      const meta = ONBOARDING_STEPS[stepIndex] || ONBOARDING_STEPS[0];
      const total = ONBOARDING_STEPS.length;

      popover.wrapper.setAttribute('data-tour-step', meta.id);

      // 1. Optical Header Kicker (prism badge + step count pill)
      let header = popover.wrapper.querySelector('.nukron-tour-header');
      if (!header) {
        header = doc.createElement('div');
        header.className = 'nukron-tour-header';
        popover.wrapper.insertBefore(header, popover.title);
      }
      header.innerHTML =
        `<span class="nukron-tour-kicker"><i class="nukron-tour-prism" aria-hidden="true"></i><span>${meta.kicker}</span></span>` +
        `<span class="nukron-tour-step-pill">${stepIndex + 1} / ${total}</span>`;

      // 2. Optical Progress Dots inside popover.progress
      if (popover.progress) {
        popover.progress.innerHTML =
          `<span class="nukron-tour-dots" aria-label="Step ${stepIndex + 1} of ${total}">` +
          ONBOARDING_STEPS.map((_, idx) => `<i class="${idx === stepIndex ? 'is-active' : idx < stepIndex ? 'is-done' : ''}"></i>`).join('') +
          `</span>`;
      }

      // 3. Skip button in footer (uses .driver-popover-close-btn so Driver.js's capture listener routes clicks to onCloseClick)
      if (popover.footerButtons) {
        let skipBtn = popover.footerButtons.querySelector('.driver-popover-skip-btn');
        if (meta.showSkip) {
          if (!skipBtn) {
            skipBtn = doc.createElement('button');
            skipBtn.type = 'button';
            skipBtn.className = 'driver-popover-skip-btn driver-popover-close-btn driver-popover-footer-btn';
            skipBtn.setAttribute('data-tour-skip', 'true');
            skipBtn.setAttribute('aria-label', 'Skip tutorial');
            skipBtn.textContent = 'Skip';
            popover.footerButtons.insertBefore(skipBtn, popover.footerButtons.firstChild);
          }
          skipBtn.style.display = 'inline-flex';
        } else if (skipBtn) {
          skipBtn.style.display = 'none';
        }
      }
    }

    function buildDriverSteps() {
      return ONBOARDING_STEPS.map((meta, index) => {
        const classes = ['nukron-tour-popover', `nukron-tour-step-${meta.id}`];
        if (meta.centered) classes.push('nukron-tour-centered');
        if (meta.id === 'game-details') classes.push('nukron-tour-details');

        const stepConfig = {
          disableActiveInteraction: meta.disableActiveInteraction ?? false,
          onHighlightStarted: () => {
            prepareStepEnvironment(meta);
          },
          popover: {
            title: meta.title,
            description: meta.description,
            side: meta.side || 'bottom',
            align: meta.align || 'center',
            showButtons: meta.showButtons,
            showProgress: true,
            prevBtnText: meta.prevBtnText || 'Back',
            nextBtnText: meta.nextBtnText || 'Next',
            doneBtnText: meta.doneBtnText || 'Finish',
            closeBtnLabel: 'Skip tutorial',
            popoverClass: classes.join(' '),
            onPopoverRender: (popover, opts) => {
              const activeIdx = typeof opts?.state?.activeIndex === 'number' ? opts.state.activeIndex : index;
              decoratePopoverDOM(popover, activeIdx);
            }
          }
        };

        if (!meta.centered && Array.isArray(meta.selectors)) {
          stepConfig.element = () => {
            prepareStepEnvironment(meta);
            if (meta.id === 'library' && doc) {
              const gridEl = doc.querySelector('#grid');
              if (gridEl && typeof window !== 'undefined' && gridEl.getBoundingClientRect) {
                const rect = gridEl.getBoundingClientRect();
                const firstCard = gridEl.querySelector('.card');
                if (firstCard && rect.height > (window.innerHeight || 800) * 0.58) {
                  return firstCard;
                }
              }
            }
            return resolveFirstVisible(doc, meta.selectors);
          };
        }

        return stepConfig;
      });
    }

    function isCompleted(appSettingsOverride) {
      return isOnboardingCompleted(storage, appSettingsOverride || cachedAppSettings);
    }

    function markCompleted() {
      if (cachedAppSettings && typeof cachedAppSettings === 'object') {
        cachedAppSettings.onboardingCompleted = true;
      }
      markOnboardingCompleted(storage, api);
    }

    function isActive() {
      return !!(activeDriver && typeof activeDriver.isActive === 'function' && activeDriver.isActive());
    }

    function getActiveStepId() {
      if (!isActive()) return null;
      const idx = activeDriver.getActiveIndex();
      return typeof idx === 'number' && ONBOARDING_STEPS[idx] ? ONBOARDING_STEPS[idx].id : null;
    }

    function start(startOpts = {}) {
      const { force = false, animate = true } = startOpts;
      if (!force && isCompleted()) return false;

      const driverFactory = getDriverFactory();
      if (typeof driverFactory !== 'function') return false;

      // Never start over a mandatory legal consent dialog
      const dlg = doc?.querySelector('#dlg');
      if (dlg && (dlg.open || dlg.hasAttribute?.('open')) && dlg.oncancel) {
        return false;
      }

      // If already running, destroy previous instance cleanly before restarting
      if (isActive()) {
        try {
          activeDriver.destroy();
        } catch {}
      }

      // Close any open non-mandatory dialog (e.g. Settings when clicking Replay Tutorial)
      closeTourDialogIfNeeded();

      const steps = buildDriverSteps();
      activeDriver = driverFactory({
        animate: !!animate,
        duration: animate ? 240 : 0,
        allowClose: true,
        allowScroll: true,
        smoothScroll: false,
        overlayColor: '#040711',
        overlayOpacity: 0.74,
        overlayClickBehavior: 'none',
        stagePadding: 8,
        stageRadius: 16,
        popoverOffset: 14,
        showProgress: true,
        progressText: '{{current}} of {{total}}',
        nextBtnText: 'Next',
        prevBtnText: 'Back',
        doneBtnText: 'Finish',
        closeBtnLabel: 'Skip tutorial',
        allowedElements: ['#win-ctrls', '.empty [data-add]'],
        steps,
        onDestroyed: () => {
          syncBodyStepClass(null);
          closeTourDialogIfNeeded();
          markCompleted();
        }
      });

      try {
        activeDriver.drive(0);
        return true;
      } catch {
        syncBodyStepClass(null);
        return false;
      }
    }

    async function maybeStartAuto(startOpts = {}) {
      if (isCompleted()) return false;
      try {
        if (api && typeof api.appGetSettings === 'function') {
          cachedAppSettings = await api.appGetSettings();
          if (isCompleted(cachedAppSettings)) return false;
        }
      } catch {}
      return start({ ...startOpts, force: false });
    }

    function notifyAddGameClicked() {
      if (!isActive()) return;
      if (getActiveStepId() === 'add-game') {
        tourOpenedDlg = true;
        try {
          activeDriver.moveNext();
        } catch {}
      }
    }

    function notifyGameSavedOrClosed() {
      if (!isActive()) return;
      if (getActiveStepId() === 'game-details') {
        tourOpenedDlg = false;
        try {
          activeDriver.moveNext();
        } catch {}
      }
    }

    function stop() {
      if (isActive()) {
        try {
          activeDriver.destroy();
        } catch {}
      }
    }

    return {
      ONBOARDING_STORAGE_KEY,
      ONBOARDING_STEPS,
      isCompleted,
      markCompleted,
      isActive,
      getActiveStepId,
      start,
      maybeStartAuto,
      notifyAddGameClicked,
      notifyGameSavedOrClosed,
      stop,
      getDriverInstance: () => activeDriver
    };
  }

  return {
    ONBOARDING_STORAGE_KEY,
    ONBOARDING_STEPS,
    isOnboardingCompleted,
    markOnboardingCompleted,
    createOnboardingController
  };
});

