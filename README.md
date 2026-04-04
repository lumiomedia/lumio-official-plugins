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
    plex/
      plugin.json
      README.md
```

## Lumio integration notes

Lumio core should:

- read one marketplace manifest
- show install/remove/update per plugin
- keep bundled/private-compatible plugins separate from official marketplace ones
- allow manual install metadata for private plugin repos

See [docs/sdk.md](./docs/sdk.md) and [docs/repo-structure.md](./docs/repo-structure.md).
For YouTube personal auth override, see [docs/youtube-own-app.md](./docs/youtube-own-app.md).
