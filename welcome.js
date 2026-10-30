// Startup welcome: message choice, Windows-session identity and once-per-session bookkeeping.
const fs = require('fs'), os = require('os');
const { execFile } = require('child_process');

const MESSAGES = require('./renderer/welcome-messages.js');
const TOLERANCE_MS = 2 * 60 * 1000; // two readings of the same session's start time may differ slightly

function pickMessage(rnd = Math.random) { return MESSAGES[Math.floor(rnd() * MESSAGES.length) % MESSAGES.length]; }

// Identity of the current Windows sign-in session = start time of this session's explorer.exe (a fresh one is
// created at every sign-in and every boot, including "Fast Startup" boots where the kernel uptime does not reset).
// Fallback: boot time derived from uptime. Also reports whether a fullscreen game/presentation is active.
const PS = `
$ErrorActionPreference='SilentlyContinue'
Add-Type -Namespace E -Name N -MemberDefinition '[System.Runtime.InteropServices.DllImport("shell32.dll")] public static extern int SHQueryUserNotificationState(out int s);'
$s=0; [void][E.N]::SHQueryUserNotificationState([ref]$s)
$sid=(Get-Process -Id $PID).SessionId
$t=Get-Process explorer | Where-Object { $_.SessionId -eq $sid } | Sort-Object StartTime | Select-Object -First 1 -ExpandProperty StartTime
$ms=0; if($t){ $ms=[int64]([DateTimeOffset]$t).ToUnixTimeMilliseconds() }
"$s|$ms"`;

function bootTime() { return Date.now() - Math.round(os.uptime() * 1000); }

function querySession(cb) {
  const fallback = { key: bootTime(), busy: false };
  if (process.platform !== 'win32') return cb(fallback);
  execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', Buffer.from(PS, 'utf16le').toString('base64')],
    { windowsHide: true, timeout: 15000 }, (err, out) => {
      if (err || !/^\d+\|\d+$/.test(String(out).trim())) return cb(fallback);
      const [s, ms] = String(out).trim().split('|').map(Number);
      // 2 = busy, 3 = fullscreen Direct3D app (game), 4 = presentation mode
      cb({ key: ms > 0 ? ms : bootTime(), busy: s === 2 || s === 3 || s === 4 });
    });
}

function readState(file) { try { const j = JSON.parse(fs.readFileSync(file, 'utf8')); return Number(j.lastSession) || 0; } catch { return 0; } }
function alreadyShown(file, key) { const last = readState(file); return last > 0 && Math.abs(last - key) <= TOLERANCE_MS; }
function markShown(file, key) { try { fs.writeFileSync(file, JSON.stringify({ lastSession: key })); } catch {} }

// Returns true (and records the session) only the first time it is called for a given session.
function claimSession(file, key) {
  if (alreadyShown(file, key)) return false;
  markShown(file, key); return true;
}

module.exports = { pickMessage, querySession, alreadyShown, claimSession, readState, TOLERANCE_MS, MESSAGES };
