# Ember Launcher

A local game launcher for Windows with automatic playtime tracking. No account, no cloud.
Data lives in `%APPDATA%\ember-launcher\` (`launcher.db` + copied cover images).

## Run
1. Install Node.js 22.13 or newer (https://nodejs.org).
2. In this folder:
   ```
   npm install
   npm start
   ```

## Build an installer / portable exe
```
npm run dist
```
Output is in `dist\` (an NSIS installer and a portable .exe).

## Using it
- **Add game** (Library): pick the game's `.exe`, optionally a name, cover image and group.
- **Emulated games**: set *Game file* to the ROM/disc image and *Emulator* to the emulator's `.exe`.
  Add emulator arguments (e.g. `-f`) under *Launch arguments*; the ROM is appended automatically.
- **Games started through another launcher**: if the exe you pick only starts a launcher, set
  *Process to track* to the real game's exe name (e.g. `Game-Win64-Shipping.exe`).
- Click a card to launch. A session starts at launch and ends 15 s after the last matching process exits.

## How tracking works
- One tracker per game, so double-clicking or launching twice never creates a second timer.
- Every 4 s the app checks running processes (full exe paths via PowerShell/CIM, no admin needed to read them).
  A process counts if it is the emulator exe, lives in the game's folder (launcher -> game hand-offs), or matches *Process to track*.
- A heartbeat is written to SQLite every poll. If the app or PC dies mid-game, the session is closed at the last heartbeat on next start.
- If nothing matching appears within 90 s of launching, the session is discarded and you're told why.
- Failed process scans never end a session.
- Closing Ember while a game runs ends that session at that moment; the game itself keeps running.

## Notes
- Games requiring administrator rights fail to launch unless Ember is also run as administrator.
- `node:sqlite` is built into the Electron runtime, so there are no native modules to compile.

## Releasing an update (v1.1+)
Installed copies check GitHub Releases on start (and every 6 h) and offer **Update now** in the app.
1. Bump `"version"` in `package.json` (e.g. `1.1.1`).
2. `npm run dist`
3. On GitHub create a **published** (not draft, not pre-release) Release tagged `v1.1.1` and attach, from `dist\`:
   `latest.yml`, `Ember-Launcher-Setup-1.1.1.exe`, `Ember-Launcher-Setup-1.1.1.exe.blockmap` (and optionally the Portable exe).
4. Users on an installed copy see the update banner. Portable copies are sent to the release page.

Copies older than 1.1 have no updater and must be updated manually once by running the new installer.

See `PRIVACY.md` and `TERMS.md` for the policies shown inside the app.
