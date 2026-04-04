# Lumio Plugins

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

`streams-scraper` is intentionally not listed here. It should live in a separate
private repo later.

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
lumio-plugins/
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

## Private repo setup for now

Recommended while this is still in flux:

1. Create a new private GitHub repo called `lumio-plugins`
2. Push this folder to it
3. Point Lumio's official marketplace URL to the raw `marketplace.json`
4. Keep `streams-scraper` in a separate private repo later

## First push

```bash
cd "/Users/jerry/Local Sites/lumio-plugins"
git add .
git commit -m "Initial Lumio plugin marketplace"
git branch -M main
git remote add origin git@github.com:lumioplayer/lumio-plugins.git
git push -u origin main
```

If you prefer HTTPS:

```bash
git remote add origin https://github.com/lumioplayer/lumio-plugins.git
```

## Lumio integration notes

Lumio core should:

- read one marketplace manifest
- show install/remove/update per plugin
- keep bundled/private-compatible plugins separate from official marketplace ones
- allow manual install metadata for private plugin repos

See [docs/sdk.md](./docs/sdk.md) and [docs/repo-structure.md](./docs/repo-structure.md).
For YouTube personal auth override, see [docs/youtube-own-app.md](./docs/youtube-own-app.md).
