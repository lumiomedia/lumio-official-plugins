# Lumio Official Plugins

Official Lumio plugin marketplace repository.

This repo is designed to hold multiple plugins in one place. Lumio reads a single
`marketplace.json` file at the repo root, then installs or updates plugin entries
one by one.

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

- [SDK overview](./docs/sdk.md)
- [Contributing](./CONTRIBUTING.md)
- [Plugin template](./docs/PLUGIN_TEMPLATE.md)
- [Repository structure](./docs/repo-structure.md)

These docs explain:

- what the Lumio plugin SDK exposes
- how browse pages, menu items and home rows work
- how playback and auth providers fit into the plugin model
- how multiple plugins live in one marketplace repo
- how to structure a new plugin or fork

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
