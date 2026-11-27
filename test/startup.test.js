// Run: node test/startup.test.js
const assert = require('assert');
const { TASK_NAME, LEGACY_RUN_VALUES, buildTaskCommand, createStartupManager } = require('../startup.js');

// 1. Task command quoting
assert.strictEqual(buildTaskCommand({ path: 'C:\\Program Files\\NUKRON\\NUKRON.exe', args: ['--hidden'] }), '"C:\\Program Files\\NUKRON\\NUKRON.exe" --hidden');
assert.strictEqual(buildTaskCommand({ path: 'C:\\dev\\electron.exe', args: ['D:\\my app', '--hidden'] }), '"C:\\dev\\electron.exe" "D:\\my app" --hidden');

// 2. Non-elevated mode: uses Electron loginItem API and cleans legacy entries
{
  let regOn = false;
  const cmds = [];
  const mgr = createStartupManager({
    platform: 'win32',
    getOpts: () => ({ path: 'C:\\NUKRON\\NUKRON.exe', args: ['--hidden'] }),
    getLoginItem: () => ({ openAtLogin: regOn }),
    setLoginItem: o => { regOn = !!o.openAtLogin; },
    isElevatedFn: () => false,
    runCmd: (bin, args) => { cmds.push([bin, args]); return { ok: false, out: '' }; }
  });

  assert.strictEqual(mgr.isEnabled(), false);
  assert.strictEqual(mgr.setEnabled(true), true);
  assert.strictEqual(regOn, true);
  assert.ok(cmds.some(([b, a]) => b === 'reg.exe' && a.includes(LEGACY_RUN_VALUES[0])), 'cleans legacy Ember Run key');
  assert.ok(cmds.some(([b, a]) => b === 'reg.exe' && a.includes(LEGACY_RUN_VALUES[1])), 'cleans legacy NUKRON Run key');
  assert.ok(!cmds.some(([b, a]) => b === 'schtasks.exe' && a[0] === '/create'), 'does not create scheduled task when not elevated');

  assert.strictEqual(mgr.setEnabled(false), false);
  assert.strictEqual(regOn, false);
  assert.ok(cmds.some(([b, a]) => b === 'schtasks.exe' && a[0] === '/delete' && a.includes(TASK_NAME)), 'disabling also removes any logon task');
}

// 3. Elevated mode: uses Task Scheduler /rl highest and removes HKCU\Run entry
{
  let regOn = true; // simulate pre-existing HKCU\Run entry that Windows silently ignores when RUNASADMIN
  let taskCmd = null;
  const mgr = createStartupManager({
    platform: 'win32',
    getOpts: () => ({ path: 'D:\\ember\\dist\\win-unpacked\\NUKRON.exe', args: ['--hidden'] }),
    getLoginItem: () => ({ openAtLogin: regOn }),
    setLoginItem: o => { regOn = !!o.openAtLogin; },
    isElevatedFn: () => true,
    runCmd: (bin, args) => {
      if (bin === 'schtasks.exe' && args[0] === '/query') {
        return taskCmd ? { ok: true, out: `TaskName: \\${TASK_NAME}\nTask To Run: ${taskCmd}\n` } : { ok: false, out: '' };
      }
      if (bin === 'schtasks.exe' && args[0] === '/create') {
        taskCmd = args[args.indexOf('/tr') + 1];
        assert.ok(args.includes('/rl') && args.includes('highest'), 'must request highest run level');
        assert.ok(args.includes('/sc') && args.includes('onlogon'), 'must trigger on logon');
        return { ok: true, out: '' };
      }
      if (bin === 'schtasks.exe' && args[0] === '/delete') { taskCmd = null; return { ok: true, out: '' }; }
      return { ok: true, out: '' };
    }
  });

  // Before migration: HKCU\Run is set, but no scheduled task -> isEnabled() is false so main.js auto-migrates!
  assert.strictEqual(mgr.isEnabled(), false, 'elevated app must not consider broken HKCU\\Run entry as working startup');
  assert.strictEqual(mgr.setEnabled(true), true);
  assert.strictEqual(regOn, false, 'clears broken HKCU\\Run entry when creating logon task');
  assert.strictEqual(taskCmd, '"D:\\ember\\dist\\win-unpacked\\NUKRON.exe" --hidden');
  assert.strictEqual(mgr.isEnabled(), true);

  assert.strictEqual(mgr.setEnabled(false), false);
  assert.strictEqual(taskCmd, null);
  assert.strictEqual(mgr.isEnabled(), false);
}

// 4. heal() repairs PCA Compatibility Assistant\Store taint & legacy Run keys even when HKCU\Run is already enabled
{
  const cmds = [];
  const exe = 'D:\\ember\\dist\\win-unpacked\\NUKRON.exe';
  const mgr = createStartupManager({
    platform: 'win32',
    getOpts: () => ({ path: exe, args: ['--hidden'] }),
    getLoginItem: () => ({ openAtLogin: true }),
    setLoginItem: () => {},
    isElevatedFn: () => false,
    runCmd: (bin, args) => { cmds.push([bin, args]); return { ok: false, out: '' }; }
  });
  assert.strictEqual(mgr.isEnabled(), true);
  assert.strictEqual(mgr.heal(), true);
  assert.ok(cmds.some(([b, a]) => b === 'reg.exe' && a[0] === 'delete' && a.includes(exe)), 'clears PCA Compatibility Assistant\\Store entry on heal');
  assert.ok(cmds.some(([b, a]) => b === 'reg.exe' && a[0] === 'delete' && a.includes(LEGACY_RUN_VALUES[0])), 'cleans legacy Ember Run key on heal');
}

console.log('startup tests passed!');
