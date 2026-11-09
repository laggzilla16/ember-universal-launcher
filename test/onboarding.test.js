// Run: node test/onboarding.test.js. Verifies the Driver.js first-time onboarding flow, persistence, skip, graceful fallback, and Replay Tutorial.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const NukronOnboarding = require('../renderer/onboarding.js');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const indexHtml = fs.readFileSync(path.join(root, 'renderer', 'index.html'), 'utf8');
const appSrc = fs.readFileSync(path.join(root, 'renderer', 'app.js'), 'utf8');
const mainSrc = fs.readFileSync(path.join(root, 'main.js'), 'utf8');

// 1. Verify Driver.js dependency, vendor assets, and HTML/Settings wiring
{
  assert(pkg.dependencies && pkg.dependencies['driver.js'], 'driver.js must be installed in package.json dependencies');
  assert.strictEqual(pkg.version, '1.5.3', 'Application version must match 1.5.3');
  assert(fs.existsSync(path.join(root, 'renderer', 'vendor', 'driver.css')), 'renderer/vendor/driver.css must exist');
  assert(fs.existsSync(path.join(root, 'renderer', 'vendor', 'driver.js.iife.js')), 'renderer/vendor/driver.js.iife.js must exist');
  assert(indexHtml.includes('vendor/driver.css'), 'index.html must include driver.css');
  assert(indexHtml.includes('vendor/driver.js.iife.js'), 'index.html must include driver.js.iife.js');
  assert(indexHtml.includes('onboarding.js'), 'index.html must include onboarding.js');
  assert(appSrc.includes('Replay Tutorial'), 'Settings must include Replay Tutorial option');
  assert(appSrc.includes('data-replay-tutorial'), 'Settings must wire data-replay-tutorial trigger');
  assert(mainSrc.includes('onboardingCompleted'), 'main.js must persist onboardingCompleted in appSettings');

  // Verify the bundled Driver.js IIFE script executes and exposes driver.js.driver
  const iifeSrc = fs.readFileSync(path.join(root, 'renderer', 'vendor', 'driver.js.iife.js'), 'utf8');
  const winCtx = {};
  new Function(iifeSrc).call(winCtx);
  assert(winCtx.driver && winCtx.driver.js && typeof winCtx.driver.js.driver === 'function', 'driver.js.iife.js must expose window.driver.js.driver');
}

// 2. Verify the 6 required onboarding steps and their controls
{
  const steps = NukronOnboarding.ONBOARDING_STEPS;
  assert.strictEqual(steps.length, 6, 'Onboarding tour must have 6 steps');
  assert.deepStrictEqual(
    steps.map(s => s.id),
    ['welcome', 'add-game', 'game-details', 'library', 'dashboard', 'finish'],
    'Onboarding steps must follow: Welcome -> Add Game -> Game Details -> Library -> Dashboard -> Finish'
  );

  // Welcome step
  assert.strictEqual(steps[0].centered, true);
  assert.strictEqual(steps[0].showSkip, true);
  assert(steps[0].showButtons.includes('next'));
  assert(!steps[0].showButtons.includes('previous'), 'First step should not show Back button');

  // Add Your First Game step
  assert(steps[1].description.includes('.exe'), 'Add Game step must explain selecting a .exe file');
  assert.strictEqual(steps[1].showSkip, true);
  assert(steps[1].showButtons.includes('previous') && steps[1].showButtons.includes('next'));

  // Game Details step
  assert.strictEqual(steps[2].openEditDialog, true);
  assert.strictEqual(steps[2].showSkip, true);
  assert(steps[2].showButtons.includes('previous') && steps[2].showButtons.includes('next'));

  // Game Library step
  assert.strictEqual(steps[3].view, 'lib');
  assert.strictEqual(steps[3].showSkip, true);

  // Dashboard step
  assert.strictEqual(steps[4].view, 'dash');
  assert.strictEqual(steps[4].showSkip, true);

  // Finish step
  assert.strictEqual(steps[5].centered, true);
  assert.strictEqual(steps[5].doneBtnText, 'Finish');
  assert.strictEqual(steps[5].showSkip, false, 'Final step uses Finish button instead of Skip');
}

// 3. Test harness for onboarding controller (first-time launch, step progression, no auto-import/file-picker, skip, persistence, replay)
function createMockEnvironment(opts = {}) {
  const store = new Map(Object.entries(opts.initialStorage || {}));
  const storage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k)
  };

  let persistedSettings = { onboardingCompleted: false, ...(opts.initialAppSettings || {}) };
  let pickCalled = 0;
  let saveCalled = 0;
  let currentView = 'dash';
  let dlgOpen = false;
  let dlgHasExeField = false;

  const elements = {
    '#view': { id: 'view', classList: { remove: () => {}, toggle: () => {} }, scrollTop: 0, offsetWidth: 900, offsetHeight: 700 },
    '.bar [data-add]': { dataset: { add: '' }, offsetWidth: 110, offsetHeight: 38 },
    '[data-add]': { dataset: { add: '' }, offsetWidth: 110, offsetHeight: 38 },
    '#grid': { id: 'grid', offsetWidth: 860, offsetHeight: 320, querySelector: () => null, getBoundingClientRect: () => ({ height: 320 }) },
    '.dash-stats': { className: 'stats dash-stats', offsetWidth: 860, offsetHeight: 120 },
    '#dlg': {
      id: 'dlg',
      tagName: 'DIALOG',
      get open() { return dlgOpen; },
      oncancel: opts.mandatoryLegalOpen ? () => {} : null,
      offsetWidth: 500,
      offsetHeight: 460,
      querySelector: sel => (sel === '#f-exe' && dlgHasExeField ? { id: 'f-exe' } : null),
      close: () => { dlgOpen = false; dlgHasExeField = false; }
    }
  };
  if (opts.missingSelectors) {
    for (const sel of opts.missingSelectors) delete elements[sel];
  }

  const bodyClasses = new Set();
  const doc = {
    body: {
      dataset: {},
      classList: {
        toggle: (c, force) => (force ? bodyClasses.add(c) : bodyClasses.delete(c)),
        contains: c => bodyClasses.has(c)
      }
    },
    createElement: tag => ({
      tagName: tag.toUpperCase(),
      className: '',
      style: {},
      innerHTML: '',
      textContent: '',
      setAttribute: () => {},
      insertBefore: () => {}
    }),
    querySelector: sel => elements[sel] || null
  };

  // Mock Driver.js instance matching Driver.js 1.11.0 lifecycle
  let driverState = { active: false, index: undefined, config: null };
  const mockDriverFactory = config => {
    driverState = { active: false, index: undefined, config };
    const activateStep = idx => {
      const step = config.steps[idx];
      if (!step) return;
      driverState.index = idx;
      const el = typeof step.element === 'function' ? step.element() : step.element;
      if (step.onHighlightStarted) step.onHighlightStarted(el, step, { config, state: { activeIndex: idx } });
      // Simulate popover render hook
      const fakePopover = {
        wrapper: {
          setAttribute: () => {},
          querySelector: () => null,
          insertBefore: () => {}
        },
        title: {},
        progress: { innerHTML: '' },
        footerButtons: {
          firstChild: null,
          querySelector: () => null,
          insertBefore: function (node) { this.skipBtn = node; }
        }
      };
      if (step.popover && step.popover.onPopoverRender) {
        step.popover.onPopoverRender(fakePopover, { config, state: { activeIndex: idx } });
      }
      driverState.lastPopover = fakePopover;
      driverState.lastElement = el;
    };

    return {
      isActive: () => driverState.active,
      getActiveIndex: () => driverState.index,
      drive: (idx = 0) => {
        driverState.active = true;
        activateStep(idx);
      },
      moveNext: () => {
        if (!driverState.active) return;
        const nextIdx = driverState.index + 1;
        if (nextIdx < config.steps.length) activateStep(nextIdx);
        else {
          driverState.active = false;
          if (config.onDestroyed) config.onDestroyed();
        }
      },
      movePrevious: () => {
        if (!driverState.active) return;
        if (driverState.index > 0) activateStep(driverState.index - 1);
      },
      destroy: () => {
        if (!driverState.active) return;
        driverState.active = false;
        if (config.onDestroyed) config.onDestroyed();
      }
    };
  };

  const api = {
    appGetSettings: async () => ({ ...persistedSettings }),
    appSettings: async s => {
      persistedSettings = { ...persistedSettings, ...s };
      return persistedSettings;
    },
    pick: async () => { pickCalled++; return null; },
    save: async () => { saveCalled++; return true; }
  };

  const controller = NukronOnboarding.createOnboardingController({
    document: doc,
    storage,
    api,
    getDriver: () => mockDriverFactory,
    setView: v => { currentView = v; },
    openAddGameDialog: () => { dlgOpen = true; dlgHasExeField = true; }
  });

  return {
    controller,
    storage,
    getPersistedSettings: () => persistedSettings,
    getCurrentView: () => currentView,
    isDlgOpen: () => dlgOpen,
    getPickCalled: () => pickCalled,
    getSaveCalled: () => saveCalled,
    getDriverState: () => driverState
  };
}

(async () => {
  // Scenario A: First-ever launch triggers onboarding automatically and walks through all 6 steps
  {
    const env = createMockEnvironment();
    assert.strictEqual(env.controller.isCompleted(), false, 'Fresh install should not be marked completed');

    const started = await env.controller.maybeStartAuto({ animate: false });
    assert.strictEqual(started, true, 'Onboarding must start automatically on first launch');
    assert.strictEqual(env.controller.isActive(), true);
    assert.strictEqual(env.controller.getActiveStepId(), 'welcome');
    assert.strictEqual(env.getCurrentView(), 'dash');
    assert(env.getDriverState().lastPopover.footerButtons.skipBtn, 'Welcome step must render Skip button');

    // Advance to Step 2: Add Your First Game
    env.controller.getDriverInstance().moveNext();
    assert.strictEqual(env.controller.getActiveStepId(), 'add-game');
    assert.strictEqual(env.getCurrentView(), 'lib', 'Step 2 must switch to Library view so Add Game button is visible');
    assert.strictEqual(env.getPickCalled(), 0, 'Must never automatically open a native file dialog');
    assert.strictEqual(env.getSaveCalled(), 0, 'Must never automatically import or save a game');

    // User clicks the highlighted Add Game button -> advances to Step 3: Game Details
    env.controller.openAddGameSimulate = () => {};
    env.controller.notifyAddGameClicked();
    assert.strictEqual(env.controller.getActiveStepId(), 'game-details');
    assert.strictEqual(env.isDlgOpen(), true, 'Step 3 must show the Game Details dialog');
    assert.strictEqual(env.getPickCalled(), 0, 'Step 3 must not open OS file picker without user clicking Browse');

    // User saves or closes Game Details -> advances to Step 4: Game Library
    env.controller.notifyGameSavedOrClosed();
    assert.strictEqual(env.controller.getActiveStepId(), 'library');
    assert.strictEqual(env.isDlgOpen(), false, 'Game Details dialog must be closed on Step 4');
    assert.strictEqual(env.getCurrentView(), 'lib');

    // Advance to Step 5: Dashboard
    env.controller.getDriverInstance().moveNext();
    assert.strictEqual(env.controller.getActiveStepId(), 'dashboard');
    assert.strictEqual(env.getCurrentView(), 'dash', 'Step 5 must switch to Dashboard view');

    // Test Back button from Step 5 -> Step 4 -> Next back to Step 5
    env.controller.getDriverInstance().movePrevious();
    assert.strictEqual(env.controller.getActiveStepId(), 'library');
    env.controller.getDriverInstance().moveNext();
    assert.strictEqual(env.controller.getActiveStepId(), 'dashboard');

    // Advance to Step 6: Finish
    env.controller.getDriverInstance().moveNext();
    assert.strictEqual(env.controller.getActiveStepId(), 'finish');

    // Click Finish on Step 6 -> completes and persists
    env.controller.getDriverInstance().moveNext();
    assert.strictEqual(env.controller.isActive(), false);
    assert.strictEqual(env.controller.isCompleted(), true, 'Completion must be persisted');
    assert.strictEqual(env.storage.getItem('onboardingCompleted'), '1');
    assert.strictEqual(env.getPersistedSettings().onboardingCompleted, true);

    // Subsequent launch / restart must never auto-start onboarding again
    const restarted = await env.controller.maybeStartAuto({ animate: false });
    assert.strictEqual(restarted, false, 'Onboarding must never auto-trigger again after completion');
  }

  // Scenario B: Skipping the tour mid-way closes dialog state and persists completion so it never nags again
  {
    const env = createMockEnvironment();
    await env.controller.maybeStartAuto({ animate: false });
    env.controller.getDriverInstance().moveNext(); // add-game
    env.controller.getDriverInstance().moveNext(); // game-details (opens #dlg)
    assert.strictEqual(env.isDlgOpen(), true);

    // User skips the tour on Step 3
    env.controller.stop();
    assert.strictEqual(env.controller.isActive(), false);
    assert.strictEqual(env.isDlgOpen(), false, 'Skipping on Step 3 must close the tour-opened Game Details dialog');
    assert.strictEqual(env.controller.isCompleted(), true, 'Skipping must persist onboarding completion');
    assert.strictEqual(await env.controller.maybeStartAuto({ animate: false }), false, 'Must not auto-start after skip');
  }

  // Scenario C: Replay Tutorial from Settings manually launches the tour even after completion
  {
    const env = createMockEnvironment({
      initialStorage: { onboardingCompleted: '1' },
      initialAppSettings: { onboardingCompleted: true }
    });
    assert.strictEqual(await env.controller.maybeStartAuto({ animate: false }), false);

    const replayed = env.controller.start({ force: true, animate: false });
    assert.strictEqual(replayed, true, 'Replay Tutorial (force: true) must launch the tour even when already completed');
    assert.strictEqual(env.controller.isActive(), true);
    assert.strictEqual(env.controller.getActiveStepId(), 'welcome');
  }

  // Scenario D: Graceful handling when required DOM elements are missing
  {
    const env = createMockEnvironment({
      missingSelectors: ['.bar [data-add]', '[data-add]', '#grid', '.dash-stats', '#dlg']
    });
    const started = await env.controller.maybeStartAuto({ animate: false });
    assert.strictEqual(started, true, 'Tour must still start when target elements are missing');
    for (let i = 0; i < 6; i++) {
      env.controller.getDriverInstance().moveNext();
    }
    assert.strictEqual(env.controller.isActive(), false);
    assert.strictEqual(env.controller.isCompleted(), true, 'Tour must complete gracefully without breaking when elements are missing');
  }

  console.log('onboarding tests passed!');
})();
