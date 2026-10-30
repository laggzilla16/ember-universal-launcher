# Ember: project rules for AI agents

## Version management
- **Never change Ember's version on your own.** That covers `package.json`, `package-lock.json`, installer/build config, update metadata and any other version-related file.
- Features, bug fixes and internal commits do **not** change the version. All work continues under the current version (see `package.json`).
- Only change the version when the user explicitly asks for it (e.g. "upgrade to 1.4.0").

## What's New? (`renderer/changelog.js`)
- The top entry must always match the current app version in `package.json`.
- Until a version upgrade is requested, **add new items to the existing top entry** (cumulative). Never create an entry for an individual task and never create duplicate version entries.
- Never edit or remove entries for earlier versions. Never invent entries: list only changes that were actually implemented.

## When the user requests a version upgrade
1. Update the version consistently in every relevant file (`package.json`, and `package-lock.json` via `npm install --package-lock-only` if requested/appropriate).
2. Add one new top entry in `renderer/changelog.js` with the exact new version, consolidating everything implemented since the previous version (check `git log` and the previous entry). Keep older entries untouched.
3. Run `node test/version.test.js` (checks changelog/package.json match, no duplicates, ordering) and confirm the update check (`newer()` in `main.js`, GitHub release tag `v<version>`) still works.

