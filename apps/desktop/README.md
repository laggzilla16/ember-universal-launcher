# Ember Desktop Application (`apps/desktop`)

Ember Universal Launcher is a local Windows desktop gaming launcher built with Electron and `node:sqlite`.

## Monorepo Preservation Note

To protect the existing Electron build pipeline (`electron-builder`), `electron-updater` configuration, relative preload/renderer asset resolution, and existing unit tests (`test/*.test.js`), the core Electron entry points remain anchored at the repository root:

- `main.js` — Main Electron process, SQLite database (`%APPDATA%\ember-launcher\launcher.db`), native telemetry & process helper daemon, system tray, and auto-updater.
- `preload.js` / `preload-updater.js` — Context-isolated IPC bridges.
- `welcome.js` — Per-session startup message manager.
- `renderer/` — Application interface (`index.html`, `app.js`, `styles.css`, `overlay.html`, `overlay.css`, `overlay.js`, `changelog.js`, `update-notify.js`, `welcome.html`).
- `build/icon.ico` — Windows installer and executable icon.

## Commands

Run from the repository root:

```bash
# Start desktop application in development
npm start
# or
npm run dev:desktop

# Package Windows NSIS installer and Portable executable into dist/
npm run dist
# or
npm run build:desktop
```

