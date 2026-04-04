# Plugin Template

Use this template when starting a new Lumio plugin for this marketplace or for a forked/private variant.

## Suggested folder structure

```text
plugins/<slug>/
  plugin.json
  README.md
  CHANGELOG.md
```

## `plugin.json`

```json
{
  "id": "com.example.my-plugin",
  "slug": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "Short description of what the plugin adds to Lumio.",
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
  "readmePath": "plugins/my-plugin/README.md",
  "changelogPath": "plugins/my-plugin/CHANGELOG.md",
  "official": false,
  "bundled": false,
  "removable": true
}
```

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

