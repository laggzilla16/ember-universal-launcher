# NUKRON

**Your games. Your universe.**

NUKRON (formerly Ember Universal Launcher) is a lightweight, locally operated Windows gaming launcher with automatic playtime tracking, a Snell's Law-inspired **Optical Glass** interface, and a customizable in-game performance overlay. No mandatory account, no subscriptions, and no cloud lock-in.

All local application data lives in `%APPDATA%\ember-launcher\` (`launcher.db` + copied cover images + local preferences), preserving seamless upgrades and 100% compatibility for existing installations.

---

## Monorepo Architecture

This repository houses both the **NUKRON Windows Desktop Application** and the **Official NUKRON Website** using a non-destructive monorepo layout:

```text
ember-universal-launcher/
├── apps/
│   ├── desktop/            # Workspace entry & docs for the Electron desktop app
│   └── website/            # Official NUKRON website (static generator, pages, styles, client JS)
│       ├── src/            # Modular page templates, Optical Glass CSS, & GitHub Releases client
│       ├── scripts/        # Build (build.js) and development server (dev.js)
│       ├── test/           # Automated website & release resolution tests
│       └── dist/           # Production static website output (git-ignored)
├── packages/
│   └── shared/             # Shared brand tokens, product constants, and release utilities
│       ├── brand/          # Official NUKRON Optical Glass palette & typography tokens
│       ├── constants/      # Product metadata, GitHub repo & API constants
│       └── utilities/      # Semver comparison, installer asset filtering, & safe Markdown parser
├── assets/
│   ├── branding/           # Shared fonts (Unbounded, Inter) & design tokens JSON
│   ├── logos/              # Official NUKRON logo (nukron-logo.png, nukron-logo.svg, nukron-wordmark.svg) & Windows icon (icon.ico)
│   └── screenshots/        # Vector product concepts & Open Graph social preview assets
├── renderer/               # Desktop Electron renderer UI, styles, overlay, & changelog
├── test/                   # Desktop application unit tests (version, update-notify, welcome)
├── main.js                 # Desktop Electron main process, SQLite DB, & native helper daemon
├── preload.js              # Desktop context-isolated IPC bridge
├── preload-updater.js      # Seamless updater window IPC bridge
├── welcome.js              # Per-session startup quote manager
├── package.json            # Root scripts & Electron Builder configuration
├── PRIVACY.md              # Official Privacy Policy
└── TERMS.md                # Official Terms of Service
```

> **Desktop Preservation Note:** The core Electron entry points (`main.js`, `preload.js`, `renderer/**`, `build/icon.ico`) remain anchored at the repository root so `electron-builder` packaging (`files` allowlist), `electron-updater`, and existing desktop test suites work without modification.

---

## Quick Start & Commands

### Prerequisites
- **Node.js 22.13 or newer** (https://nodejs.org)

Install root dependencies once:
```bash
npm install
```

### Desktop Application Commands

```bash
# Run the NUKRON Electron desktop launcher in development
npm start
# or
npm run dev:desktop

# Package the Windows NSIS installer and Portable .exe into dist/
npm run dist
# or
npm run build:desktop

# Run desktop unit tests
node test/version.test.js
node test/update-notify.test.js
node test/welcome.test.js
```

### Official Website Commands

The website has zero external npm runtime dependencies and builds directly via Node.js:

```bash
# Start the local website development server with auto-rebuild (http://127.0.0.1:3080)
npm run dev:website

# Build the production static website into apps/website/dist/
npm run build:website

# Preview the built production website locally
npm run preview:website

# Run the website & GitHub Releases verification test suite
npm run test:website
```

---

## Using the Desktop Application

- **Add game** (Library): pick the game's `.exe`, optionally a display name, cover image, and group.
- **Automatic Windows Discovery**: inside *Add game*, click **Import Windows Applications** to scan applications registered in the Windows Start Menu (including Microsoft Store and Xbox games launched via Windows App ID).
- **Emulated games**: set *Game file* to the ROM/disc image and *Emulator* to the emulator's `.exe`. Add emulator arguments (e.g. `-f`) under *Launch arguments*; the ROM is appended automatically.
- **Games started through another launcher**: if the `.exe` you pick only starts a launcher, set *Process to track* to the real game's `.exe` name (e.g. `Game-Win64-Shipping.exe`).
- **Launch & Track**: click a game card to launch. A session starts at launch and ends 15 seconds after the last matching process exits.
- **Performance Overlay**: toggle the in-game hardware HUD from the active session bar or configure layouts (`Vertical`, `Horizontal`, `Compact`, `Expanded`), sizes (`Small`, `Medium`, `Large`), screen position, and metrics (`FPS`, `CPU`, `GPU`, `VRAM`, `RAM`, `CPU °C`, `GPU °C`) in **Settings > Performance Overlay**.
- **Startup & System Tray**: configure *Launch NUKRON when Windows starts*, *Minimize to system tray*, and *Show startup message* under **Settings > General**.

### How Playtime Tracking Works
- One tracker per game, so double-clicking or launching twice never creates a second timer.
- Every 4 seconds the app checks running processes locally. A process counts if it is the emulator `.exe`, lives in the game's folder (launcher -> game hand-offs), or matches *Process to track*.
- A heartbeat is written to SQLite every poll. If the app or PC shuts down unexpectedly mid-game, the session is closed at the last heartbeat on next start.
- If nothing matching appears within 90 seconds of launching, the session is discarded and you are notified why.
- Failed process scans never end a session.
- Closing NUKRON while a game runs ends that session at that moment (unless minimized to the system tray); the game itself keeps running.
- Games whose files are uninstalled, moved, or on a disconnected drive stay in the library marked *Not installed* with all playtime, history, and statistics preserved. Click *Locate* to relink them. Only **Remove** deletes a game's history.

### Notes
- Games requiring administrator rights fail to launch unless NUKRON is also run as administrator.
- `node:sqlite` is built into the Electron runtime, so there are no native modules to compile.

---

## GitHub Releases Integration & Updating

### Desktop Updater (v1.1+, Seamless Flow in v1.4+)
Installed copies check GitHub Releases (`laggzilla16/ember-universal-launcher`) on startup and every 6 hours:
1. Bump `"version"` in `package.json` (only when explicitly releasing a new desktop version) and update `renderer/changelog.js`.
2. Run `npm run dist`.
3. On GitHub, create a **published** (not draft, not pre-release) Release tagged `v<version>` and attach from `dist\`:
   - `latest.yml`
   - `NUKRON-Setup-<version>.exe`
   - `NUKRON-Setup-<version>.exe.blockmap`
   - *(Optionally)* `NUKRON-Portable-<version>.exe`
4. Installed users receive a native Windows notification and in-app update button that downloads, verifies the SHA-512 checksum, silently installs, and relaunches NUKRON. Portable copies are directed to the release page.

### Website Dynamic Release Resolution
The official website (`apps/website`) connects directly to the GitHub Releases API in the browser:
- Queries `https://api.github.com/repos/laggzilla16/ember-universal-launcher/releases` and `/releases/latest`.
- Automatically detects the newest published release without requiring manual website edits.
- Resolves `NUKRON-Setup-<version>.exe` (and legacy `Ember-Launcher-Setup-<version>.exe` for older tags) as the primary Windows download while strictly filtering out `.blockmap`, `latest.yml`, and source code archives.
- Renders Markdown release notes safely on the **What's New** page and synchronizes with `renderer/changelog.js`.
- Provides graceful fallback links to `https://github.com/laggzilla16/ember-universal-launcher/releases` if the GitHub API is offline or rate-limited.

---

## Website Deployment

The website is 100% static (`apps/website/dist/`) and deploys independently from the desktop application:
- **GitHub Pages (Automated Workflow Prepared)**: `.github/workflows/deploy-website.yml` builds `npm run build:website`, runs `npm run test:website`, and uploads `apps/website/dist` to GitHub Pages whenever website or shared files change. It never triggers desktop builds or publishes desktop releases.
- **Cloudflare Pages / Vercel / Netlify**:
  - **Build Command:** `npm run build:website`
  - **Output / Publish Directory:** `apps/website/dist`

See [`PRIVACY.md`](PRIVACY.md) and [`TERMS.md`](TERMS.md) for the policies shown inside the app and on the website.
