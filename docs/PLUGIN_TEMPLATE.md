# Plugin Template

Use this template when starting a new Lumio plugin for this marketplace or for a forked/private variant.

## Suggested folder structure

```text
plugins/<slug>/
  plugin.json
  README.md
  CHANGELOG.md
  runtime/
    index.tsx
  dist/
    runtime.js
```

If your plugin is still metadata-only, `runtime/` and `dist/` can be added later.

## `plugin.json`

```json
{
  "id": "com.example.my-plugin",
  "slug": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "Short description of what the plugin adds to Lumio.",
  "runtimeBundlePath": "dist/runtime.js",
  "official": false,
  "bundled": false,
  "removable": true,
  "sdkCapabilities": [
    "settings-section",
    "browse-pages",
    "main-menu",
    "home-rows"
  ]
}
```

## `README.md`

Suggested structure:

```md
# My Plugin

Short introduction to the plugin.

## Features

- feature one
- feature two
- feature three

## Setup

Explain what the user needs to connect or configure.

## Notes

Anything useful for users or maintainers.
```

## `CHANGELOG.md`

Suggested structure:

```md
# Changelog

## 1.0.0

- Initial release
```

## Marketplace entry

Each plugin should also get an entry in the root `marketplace.json`.

Example:

```json
{
  "id": "com.example.my-plugin",
  "slug": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "Short description of what the plugin adds to Lumio.",
  "path": "plugins/my-plugin",
  "runtimeBundlePath": "dist/runtime.js",
  "readmePath": "plugins/my-plugin/README.md",
  "changelogPath": "plugins/my-plugin/CHANGELOG.md",
  "official": false,
  "bundled": false,
  "removable": true
}
```

## Runtime notes

- `runtime/index.tsx` is a good default entry for plugin source
- `dist/runtime.js` is the published bundle Lumio installs from GitHub source or ZIP
- only include `runtimeBundlePath` when the bundle is actually published
- metadata-only plugins can omit `runtimeBundlePath` until runtime packaging is ready

## Capability hints

Common capability labels used in this repository:

- `settings-section`
- `browse-pages`
- `main-menu`
- `topbar-group`
- `home-rows`
- `managed-auth`
- `stream-provider`

Choose only the ones your plugin actually exposes.
