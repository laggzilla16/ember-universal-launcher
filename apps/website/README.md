# Ember Official Website (`apps/website`)

Official website for **Ember Universal Launcher** (`https://github.com/laggzilla16/ember-universal-launcher`).

## Architecture

The website is a static-first, zero-external-dependency frontend engineered inside the Ember monorepo. It shares the official **Liquid Glass** design language, typography (`Unbounded` and `Inter`), and brand assets with the Ember desktop launcher while remaining 100% independent of the Electron runtime.

### Pages Built (`apps/website/dist`)

- `/` (`index.html`) — Storytelling homepage:
  1. **Hero** with live interactive Ember Desktop UI concept, dynamic version indicator, and direct Windows installer download.
  2. **Introduction** (*"Everything starts here."*) — Local-first philosophy.
  3. **Feature Showcase** — 8 core capabilities presented across interactive studios and editorial layouts.
  4. **The Ember Experience** (*"Less managing. More playing."*) — Interactive 5-step daily gaming flow.
  5. **Performance and Simplicity** (*"Made to stay out of your way."*).
  6. **Final Download CTA** (*"Ready to make room for Ember?"*).
- `/download.html` (`/download/`) — Dedicated Windows download hub, compatibility specs, 3-step setup guide, and troubleshooting.
- `/whats-new.html` (`/whats-new/`) — Live release history synchronized with the GitHub Releases API and verified in-app changelog.
- `/about.html` (`/about/`) — Brand philosophy, core principles, and Windows technical overview.
- `/faq.html` (`/faq/`) — Interactive searchable FAQ backed by actual desktop application behavior.
- `/privacy.html` (`/privacy/`) — Official Privacy Policy & Terms of Service matching `PRIVACY.md` and `TERMS.md`.

## Development & Build Commands

Run from the repository root:

```bash
# Start local development server with auto-rebuild (http://127.0.0.1:3080)
npm run dev:website

# Build production static files into apps/website/dist/
npm run build:website

# Preview production build locally
npm run preview:website

# Run website & GitHub release resolution test suite
npm run test:website
```

## Dynamic GitHub Releases Integration

At runtime, `js/releases-client.js` queries:
- `https://api.github.com/repos/laggzilla16/ember-universal-launcher/releases?per_page=30`
- `https://api.github.com/repos/laggzilla16/ember-universal-launcher/releases/latest`

Installer resolution rules (`packages/shared/utilities/releases.js`):
1. Filters out `draft` releases so drafts are never shown publicly.
2. Distinguishes stable releases from `prerelease` tags.
3. Prioritizes the official NSIS Windows Setup executable (`Ember-Launcher-Setup-<version>.exe`).
4. Strictly excludes `.blockmap`, `latest.yml`, `.zip`/`.tar.gz` source archives, and checksum metadata files.
5. Never silently downloads an outdated release: if a newly created tag lacks a `.exe` asset, the user is explicitly informed and offered either the latest verified installer or the official GitHub Releases page.
6. Gracefully falls back to `https://github.com/laggzilla16/ember-universal-launcher/releases/latest` if `api.github.com` is unreachable or rate-limited.

