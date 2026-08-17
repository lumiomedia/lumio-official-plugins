# Lumio Official Plugins

Official Lumio plugin marketplace repository.

This repo is designed to hold multiple plugins in one place. Lumio reads a single
`marketplace.json` file at the repo root, then installs or updates plugin entries
one by one.

Runtime source in this repository is expected to stay inside the plugin boundary:

- import from `@/lib/plugin-sdk`
- import from relative plugin-local files
- do not import app-specific Lumio core modules

See [docs/runtime-boundary.md](./docs/runtime-boundary.md).

## What lives here

- `marketplace.json`
  The public manifest Lumio reads.
- `plugins/<slug>/plugin.json`
  Plugin metadata for each official plugin.
- `plugins/<slug>/README.md`
  Plugin-specific notes and setup details.
- `docs/`
  SDK and publishing documentation for plugin authors.

## Current official plugins

- `youtube`
- `plex`
- `live-tv` (metadata scaffold)
- `homekit` (metadata scaffold)
- `trakt` (metadata scaffold)

## For developers

This repository is also the starting point for developers who want to understand
how Lumio plugins are structured.

If you want to build, fork or adapt a plugin, start here:

- [Plugin contracts](./docs/plugin-contracts.md) — the full contribution
  surface: streams/playback seams, settings sections and claimed tabs, home
  and navigation contributions, player integration limits, versioning and
  `minAppVersion` rules
- [SDK overview](./docs/sdk.md)
- [Contributing](./CONTRIBUTING.md)
- [Plugin template](./docs/PLUGIN_TEMPLATE.md)
- [Repository structure](./docs/repo-structure.md)

These docs explain:

- what the Lumio plugin SDK exposes
- where the runtime/core boundary is enforced
- how browse pages, menu items and home rows work
- how playback and auth providers fit into the plugin model
- how multiple plugins live in one marketplace repo
- how to structure a new plugin or fork

## Publishing an update

Use this checklist when pushing a plugin update that should appear in Lumio's
Settings -> Plugins -> Check updates flow.

1. Bump the plugin version everywhere.

   For `plugins/<slug>` update:

   - `plugins/<slug>/plugin.json`
   - `plugins/<slug>/package.json`, if present
   - `plugins/<slug>/package-lock.json`, if present
   - the matching entry in root `marketplace.json`

   Lumio compares the installed version with the marketplace version, so the
   marketplace entry must be higher than the user's installed version.

2. Keep the marketplace entry complete.

   Every plugin entry in root `marketplace.json` must include both the legacy
   `path` field and the app-facing `repoPath` field:

   ```json
   {
     "id": "com.lumio.live-tv",
     "slug": "live-tv",
     "version": "0.3.9",
     "path": "plugins/live-tv",
     "repoPath": "plugins/live-tv",
     "runtimeBundlePath": "dist/runtime.js"
   }
   ```

   `repoPath` is required by Lumio's marketplace parser. If it is missing, the
   app may fall back to bundled/static metadata and the update may not appear.

3. Rebuild and commit the runtime bundle.

   From the Lumio app repo:

   ```bash
   rtk node scripts/build-plugin-runtime.mjs ../lumio-official-plugins/plugins/<slug>
   ```

   Commit the generated `plugins/<slug>/dist/runtime.js` together with the
   source and version changes. The `dist/` directory may be gitignored, so add
   it explicitly when needed:

   ```bash
   rtk git add marketplace.json plugins/<slug>/plugin.json plugins/<slug>/package.json plugins/<slug>/package-lock.json plugins/<slug>/CHANGELOG.md plugins/<slug>/runtime
   rtk git add -f plugins/<slug>/dist/runtime.js
   ```

4. Add a changelog note.

   Put the new version at the top of `plugins/<slug>/CHANGELOG.md`. Lumio shows
   a changelog excerpt in the marketplace UI, so this is the user's confirmation
   that the fetched update is the one they expect.

5. Push to `main`.

   ```bash
   rtk git commit -m "Update <plugin> to <version>"
   rtk git push origin main
   ```

6. Verify GitHub and Lumio see the same version.

   Check raw GitHub:

   ```bash
   rtk proxy curl -s https://raw.githubusercontent.com/lumiomedia/lumio-official-plugins/main/plugins/<slug>/plugin.json
   rtk proxy curl -s https://raw.githubusercontent.com/lumiomedia/lumio-official-plugins/main/marketplace.json
   ```

   If Lumio is running locally, verify its marketplace endpoint too:

   ```bash
   rtk proxy curl -s 'http://127.0.0.1:3011/api/plugins/marketplace?refresh=1'
   ```

   The response should have `"live": true`, and the plugin entry should show the
   new `version`, `repoPath`, and `runtimeBundleUrl`.

GitHub raw responses are CDN-cached for a few minutes. If GitHub API shows the
new commit but raw GitHub still returns the old version, wait for the raw cache
to expire before assuming the app-side update flow is broken.

## Why one repo for multiple plugins?

One shared repo keeps official plugins easier to manage:

- one marketplace manifest
- one place for docs and versioning
- one official source for install/update metadata
- simpler badges and trust model inside Lumio

Lumio should treat this repo as the official marketplace, not as a single plugin.
Each plugin is represented by a separate entry in `marketplace.json`.

## Repo structure

```text
lumio-official-plugins/
  marketplace.json
  docs/
    sdk.md
    repo-structure.md
    private-plugins.md
  plugins/
    youtube/
      plugin.json
      README.md
      runtime/
    plex/
      plugin.json
      README.md
      runtime/
```

## Marketplace model

Lumio reads one marketplace manifest and treats each entry as a separate installable plugin.

That means users can:

- browse official plugins in one place
- install or remove plugins one by one
- see plugin metadata, README content and changelog notes per plugin

See [docs/sdk.md](./docs/sdk.md) and [docs/repo-structure.md](./docs/repo-structure.md).
For YouTube personal auth override, see [docs/youtube-own-app.md](./docs/youtube-own-app.md).
