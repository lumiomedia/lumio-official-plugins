# Repo Structure

This repo is a marketplace repo, not a single-plugin repo.

## Multiple plugins in one git repo

The correct pattern is:

1. one repo
2. one root `marketplace.json`
3. one folder per plugin

Example:

```text
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

Lumio reads `marketplace.json`, then treats each entry as a separate plugin.

That means:

- one repo can expose many plugins
- each plugin still has a unique ID and path
- official marketplace UI can show them separately

## Why this is better than one repo per plugin

- simpler discovery
- easier official branding
- easier version curation
- one raw manifest URL in Lumio core
- better for screenshots, docs and badges later

## Typical additions over time

- `CHANGELOG.md` per plugin
- `runtime/` source per plugin
- `dist/runtime.js` bundles for published plugin runtimes
- screenshots/assets per plugin
- compatibility metadata per plugin
- plugin signing / trust metadata later
