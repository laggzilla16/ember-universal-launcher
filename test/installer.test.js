'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function verifyBmpHeader(filePath, expectedWidth, expectedHeight) {
  assert.ok(fs.existsSync(filePath), `Expected BMP to exist: ${filePath}`);
  const buf = fs.readFileSync(filePath);
  assert.strictEqual(buf.toString('ascii', 0, 2), 'BM', `Invalid BMP magic in ${filePath}`);
  assert.strictEqual(buf.readInt32LE(18), expectedWidth, `Unexpected BMP width in ${filePath}`);
  assert.strictEqual(buf.readInt32LE(22), expectedHeight, `Unexpected BMP height in ${filePath}`);
  assert.strictEqual(buf.readUInt16LE(28), 24, `Expected 24-bit BMP in ${filePath}`);
}

function queryRegValue(keyPath, valueName) {
  try {
    const out = execFileSync('reg.exe', ['query', keyPath, '/v', valueName], {
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8'
    });
    const lines = out.split(/\r?\n/);
    for (const line of lines) {
      if (line.includes(valueName)) {
        const parts = line.trim().split(/\s{2,}/);
        return parts[parts.length - 1] || '';
      }
    }
  } catch {
    return null;
  }
  return null;
}

function deleteRegKey(keyPath) {
  try {
    execFileSync('reg.exe', ['delete', keyPath, '/f'], { stdio: 'ignore' });
  } catch {}
}

function setRegValue(keyPath, valueName, valueData) {
  try {
    execFileSync('reg.exe', ['add', keyPath, '/v', valueName, '/t', 'REG_SZ', '/d', valueData, '/f'], {
      stdio: 'ignore'
    });
  } catch {}
}

function deleteRegValue(keyPath, valueName) {
  try {
    execFileSync('reg.exe', ['delete', keyPath, '/v', valueName, '/f'], { stdio: 'ignore' });
  } catch {}
}

async function runTests() {
  console.log('1. Verifying package.json and build configuration...');
  assert.strictEqual(pkg.version, '1.5.2', 'Application version must remain 1.5.2');
  assert.strictEqual(pkg.build.appId, 'local.ember.launcher');
  assert.strictEqual(pkg.build.productName, 'NUKRON');
  assert.strictEqual(pkg.build.nsis.oneClick, false);
  assert.strictEqual(pkg.build.nsis.allowToChangeInstallationDirectory, true);
  assert.strictEqual(pkg.build.nsis.include, 'build/installer.nsh');
  assert.strictEqual(pkg.build.nsis.installerSidebar, 'build/installerSidebar.bmp');
  assert.strictEqual(pkg.build.nsis.uninstallerSidebar, 'build/uninstallerSidebar.bmp');
  assert.strictEqual(pkg.build.nsis.installerHeader, 'build/installerHeader.bmp');

  console.log('2. Verifying compiled NUKRON Setup Wizard and branded BMP assets...');
  const wizardExe = path.join(ROOT, 'build', 'NukronSetupUI.exe');
  assert.ok(fs.existsSync(wizardExe), 'build/NukronSetupUI.exe must exist');
  const exeBuf = fs.readFileSync(wizardExe);
  assert.strictEqual(exeBuf.toString('ascii', 0, 2), 'MZ', 'NukronSetupUI.exe must be a valid Win32/PE executable');
  assert.ok(exeBuf.length > 500 * 1024, 'NukronSetupUI.exe must contain embedded NUKRON logo resource');

  verifyBmpHeader(path.join(ROOT, 'build', 'installerSidebar.bmp'), 164, 314);
  verifyBmpHeader(path.join(ROOT, 'build', 'uninstallerSidebar.bmp'), 164, 314);
  verifyBmpHeader(path.join(ROOT, 'build', 'installerHeader.bmp'), 150, 57);

  console.log('3. Verifying all 5 wizard screens render via --capture-screens...');
  const screenDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nukron-wizard-screens-'));
  try {
    execFileSync(wizardExe, ['--capture-screens', screenDir], { stdio: 'pipe' });
    const expectedScreens = [
      'screen-1-welcome.png',
      'screen-2-directory.png',
      'screen-3-options.png',
      'screen-4-progress.png',
      'screen-5-complete.png'
    ];
    for (const name of expectedScreens) {
      const p = path.join(screenDir, name);
      assert.ok(fs.existsSync(p), `Missing rendered wizard screen: ${name}`);
      const png = fs.readFileSync(p);
      assert.strictEqual(png.slice(0, 4).toString('hex'), '89504e47', `${name} is not a valid PNG`);
      assert.ok(png.length > 20 * 1024, `${name} appears empty or truncated (${png.length} bytes)`);
    }
  } finally {
    fs.rmSync(screenDir, { recursive: true, force: true });
  }

  console.log('4. Verifying generated NSIS installer and electron-updater artifacts in dist/...');
  const installerExe = path.join(ROOT, 'dist', `NUKRON-Setup-${pkg.version}.exe`);
  const blockmapFile = path.join(ROOT, 'dist', `NUKRON-Setup-${pkg.version}.exe.blockmap`);
  const latestYml = path.join(ROOT, 'dist', 'latest.yml');

  assert.ok(fs.existsSync(installerExe), `Missing installer binary: ${installerExe}`);
  assert.ok(fs.existsSync(blockmapFile), `Missing blockmap for differential updates: ${blockmapFile}`);
  assert.ok(fs.existsSync(latestYml), `Missing latest.yml for electron-updater: ${latestYml}`);

  const ymlContent = fs.readFileSync(latestYml, 'utf8');
  assert.ok(ymlContent.includes(`version: ${pkg.version}`), 'latest.yml must contain current version');
  assert.ok(ymlContent.includes(`NUKRON-Setup-${pkg.version}.exe`), 'latest.yml must reference NUKRON-Setup-1.5.2.exe');

  if (process.env.SKIP_LIVE_INSTALLER_RUN === '1') {
    console.log('Skipping live installer execution (SKIP_LIVE_INSTALLER_RUN=1).');
    return;
  }

  console.log('5. Running end-to-end interactive 5-step wizard installation, upgrade data preservation, and uninstall tests...');
  const installRegKey = 'HKCU\\Software\\local.ember.launcher';
  const uninstallRegKey = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\local.ember.launcher';
  const runRegKey = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
  const runValueName = 'electron.app.NUKRON';

  // Snapshot any pre-existing registry values so we restore user state afterwards
  const prevInstallLoc = queryRegValue(installRegKey, 'InstallLocation');
  const prevNoDesktop = queryRegValue(installRegKey, 'NoDesktopShortcut');
  const prevRunVal = queryRegValue(runRegKey, runValueName);

  const desktopDir = path.join(process.env.USERPROFILE || os.homedir(), 'Desktop');
  const desktopShortcut = path.join(desktopDir, 'NUKRON.lnk');
  const hadDesktopShortcutBefore = fs.existsSync(desktopShortcut);
  const desktopShortcutBackup = hadDesktopShortcutBefore ? fs.readFileSync(desktopShortcut) : null;

  const appDataRoot = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  const nukronAppData = path.join(appDataRoot, 'NUKRON');
  const backupAppData = path.join(os.tmpdir(), `nukron-appdata-backup-${Date.now()}`);
  const hadAppDataBefore = fs.existsSync(nukronAppData);

  const testRoot = path.join(os.tmpdir(), `nukron-e2e-install-${Date.now()}`);
  const targetDir = path.join(testRoot, 'NUKRON');
  const autoTestLog = path.join(testRoot, 'wizard-steps.log');

  try {
    fs.mkdirSync(testRoot, { recursive: true });

    if (hadAppDataBefore) {
      fs.cpSync(nukronAppData, backupAppData, { recursive: true });
    }

    // Seed %APPDATA%\NUKRON with simulated user database, settings, and cover artwork
    fs.mkdirSync(path.join(nukronAppData, 'covers'), { recursive: true });
    const dbPath = path.join(nukronAppData, 'launcher.db');
    const appSettingsPath = path.join(nukronAppData, 'app-settings.json');
    const overlaySettingsPath = path.join(nukronAppData, 'overlay-settings.json');
    const welcomeStatePath = path.join(nukronAppData, 'welcome-state.json');
    const coverFile = path.join(nukronAppData, 'covers', 'cyberpunk-2077.png');

    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, 'SQLite format 3\0NUKRON_TEST_GAME_LIBRARY_PRESERVATION_PAYLOAD_152', 'utf8');
    }
    if (!fs.existsSync(appSettingsPath)) {
      fs.writeFileSync(appSettingsPath, JSON.stringify({ launchAtStartup: false, closeToTray: true }, null, 2), 'utf8');
    }
    if (!fs.existsSync(overlaySettingsPath)) {
      fs.writeFileSync(overlaySettingsPath, JSON.stringify({ hotkey: 'Alt+Z', position: 'top-right' }, null, 2), 'utf8');
    }
    if (!fs.existsSync(welcomeStatePath)) {
      fs.writeFileSync(welcomeStatePath, JSON.stringify({ onboardingCompleted: true }, null, 2), 'utf8');
    }
    if (!fs.existsSync(coverFile)) {
      fs.writeFileSync(coverFile, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }

    const preHashes = {
      db: sha256(dbPath),
      appSettings: sha256(appSettingsPath),
      overlaySettings: sha256(overlaySettingsPath),
      welcomeState: sha256(welcomeStatePath),
      cover: sha256(coverFile)
    };

    // --- TEST A: Interactive 5-Step Custom Wizard Clean Install (with Desktop Shortcut enabled) ---
    console.log('   -> Step 5A: Executing interactive 5-step NUKRON Setup Wizard (clean install)...');
    execFileSync(installerExe, [], {
      env: {
        ...process.env,
        NUKRON_INSTALLER_AUTOTEST: '1',
        NUKRON_AUTOTEST_DIR: targetDir,
        NUKRON_AUTOTEST_LOG: autoTestLog,
        NUKRON_AUTOTEST_DESKTOP_SHORTCUT: '1',
        NUKRON_AUTOTEST_STARTMENU_SHORTCUT: '1',
        NUKRON_AUTOTEST_LAUNCH: '0'
      },
      stdio: 'ignore',
      timeout: 180000
    });

    assert.ok(fs.existsSync(autoTestLog), 'Wizard auto-test log must be created');
    const stepLog = fs.readFileSync(autoTestLog, 'utf8');
    assert.ok(stepLog.includes('STEP 1: Welcome'), 'Wizard must visit Step 1 (Welcome)');
    assert.ok(stepLog.includes('STEP 2: Directory'), 'Wizard must visit Step 2 (Directory Selection)');
    assert.ok(stepLog.includes('STEP 3: Options'), 'Wizard must visit Step 3 (Optional Settings)');
    assert.ok(stepLog.includes('STEP 4: Starting Installation'), 'Wizard must visit Step 4 (Progress)');
    assert.ok(stepLog.includes('STEP 5: Complete'), 'Wizard must visit Step 5 (Complete)');

    assert.ok(fs.existsSync(path.join(targetDir, 'NUKRON.exe')), 'NUKRON.exe must be installed in selected directory');
    assert.ok(fs.existsSync(path.join(targetDir, 'Uninstall NUKRON.exe')), 'Uninstall NUKRON.exe must be created');
    assert.ok(fs.existsSync(path.join(targetDir, 'resources', 'app.asar')), 'resources/app.asar must be installed');
    assert.strictEqual(queryRegValue(installRegKey, 'InstallLocation'), targetDir, 'Registry InstallLocation must match selected directory');
    assert.strictEqual(queryRegValue(uninstallRegKey, 'DisplayVersion'), pkg.version, 'Uninstall registry DisplayVersion must match 1.5.2');
    assert.ok(fs.existsSync(desktopShortcut), 'Desktop shortcut should exist when DesktopShortcut=1');

    // --- TEST B: Interactive 5-Step Wizard Upgrade (with Desktop Shortcut disabled & data preservation check) ---
    console.log('   -> Step 5B: Executing interactive 5-step NUKRON Setup Wizard upgrade (DesktopShortcut=0)...');
    fs.unlinkSync(autoTestLog);
    execFileSync(installerExe, [], {
      env: {
        ...process.env,
        NUKRON_INSTALLER_AUTOTEST: '1',
        NUKRON_AUTOTEST_DIR: targetDir,
        NUKRON_AUTOTEST_LOG: autoTestLog,
        NUKRON_AUTOTEST_DESKTOP_SHORTCUT: '0',
        NUKRON_AUTOTEST_STARTMENU_SHORTCUT: '1',
        NUKRON_AUTOTEST_LAUNCH: '0'
      },
      stdio: 'ignore',
      timeout: 180000
    });

    const upgradeLog = fs.readFileSync(autoTestLog, 'utf8');
    assert.ok(upgradeLog.includes('IsUpgrade=True'), 'Second run must detect existing installation as upgrade');
    assert.ok(upgradeLog.includes('STEP 5: Complete'), 'Upgrade wizard must complete Step 5');
    assert.strictEqual(queryRegValue(installRegKey, 'NoDesktopShortcut'), 'true', 'NoDesktopShortcut registry value must be set when unchecked');
    assert.ok(!fs.existsSync(desktopShortcut), 'Desktop shortcut must be absent when unchecked in Step 3');

    // --- TEST C: Silent In-App Auto-Update Simulation (--updated /S) & User Data Preservation ---
    console.log('   -> Step 5C: Executing silent in-app update mode (--updated /S) & verifying SQLite/settings preservation...');
    execFileSync(installerExe, ['--updated', '/S', `/D=${targetDir}`], {
      stdio: 'ignore',
      timeout: 180000
    });

    assert.ok(fs.existsSync(path.join(targetDir, 'NUKRON.exe')), 'NUKRON.exe must remain intact after silent update');
    assert.strictEqual(sha256(dbPath), preHashes.db, 'SQLite database (launcher.db) must be 100% preserved across upgrades');
    assert.strictEqual(sha256(appSettingsPath), preHashes.appSettings, 'app-settings.json must be 100% preserved across upgrades');
    assert.strictEqual(sha256(overlaySettingsPath), preHashes.overlaySettings, 'overlay-settings.json must be 100% preserved across upgrades');
    assert.strictEqual(sha256(welcomeStatePath), preHashes.welcomeState, 'welcome-state.json must be 100% preserved across upgrades');
    assert.strictEqual(sha256(coverFile), preHashes.cover, 'Cover artwork must be 100% preserved across upgrades');

    // --- TEST D: Uninstallation Verification ---
    console.log('   -> Step 5D: Executing uninstaller (Uninstall NUKRON.exe /S) & verifying clean removal...');
    const uninstallerExe = path.join(targetDir, 'Uninstall NUKRON.exe');
    execFileSync(uninstallerExe, ['/S', `_?=${targetDir}`], {
      stdio: 'ignore',
      timeout: 120000
    });

    assert.ok(!fs.existsSync(path.join(targetDir, 'NUKRON.exe')), 'NUKRON.exe must be removed by uninstaller');
    assert.strictEqual(sha256(dbPath), preHashes.db, 'User database in %APPDATA%\\NUKRON must remain safe after standard uninstall');
  } finally {
    // Clean up test directory and restore original system state
    try {
      fs.rmSync(testRoot, { recursive: true, force: true });
    } catch {}

    if (hadAppDataBefore && fs.existsSync(backupAppData)) {
      fs.rmSync(nukronAppData, { recursive: true, force: true });
      fs.cpSync(backupAppData, nukronAppData, { recursive: true });
      fs.rmSync(backupAppData, { recursive: true, force: true });
    } else if (!hadAppDataBefore && fs.existsSync(nukronAppData)) {
      fs.rmSync(nukronAppData, { recursive: true, force: true });
    }

    if (prevInstallLoc) {
      setRegValue(installRegKey, 'InstallLocation', prevInstallLoc);
    } else {
      deleteRegKey(installRegKey);
    }
    if (prevNoDesktop) {
      setRegValue(installRegKey, 'NoDesktopShortcut', prevNoDesktop);
    }
    if (prevRunVal) {
      setRegValue(runRegKey, runValueName, prevRunVal);
    } else {
      deleteRegValue(runRegKey, runValueName);
    }

    if (hadDesktopShortcutBefore && desktopShortcutBackup) {
      fs.writeFileSync(desktopShortcut, desktopShortcutBackup);
    } else if (!hadDesktopShortcutBefore && fs.existsSync(desktopShortcut)) {
      try { fs.unlinkSync(desktopShortcut); } catch {}
    }
  }

  console.log('ALL NUKRON INSTALLER TESTS PASSED!');
}

runTests().catch((err) => {
  console.error('INSTALLER TEST FAILED:', err);
  process.exit(1);
});

