# Contributing

Thanks for building for Lumio.

This repository is both:

- the official Lumio plugin marketplace
- a reference point for developers building or adapting plugins against the Lumio SDK

## Who this guide is for

- maintainers of official Lumio plugins
- developers creating private plugins
- contributors improving an existing plugin
- anyone forking a plugin as a starting point

## Before you add a plugin

Make sure the plugin has:

- a stable plugin ID
- a stable slug
- a clear name and description
- a `plugin.json`
- a `README.md`
- ideally a `CHANGELOG.md`

## Repository model

This repository can host multiple plugins at once.

Each plugin lives in its own folder:

```text
plugins/<slug>/
```

Each plugin is represented in the root `marketplace.json`.

That means a new plugin usually requires:

1. a new plugin folder
2. plugin metadata files
3. a marketplace entry

## Plugin design expectations

Lumio plugins should register capabilities through the SDK rather than reaching
into core internals.

Common capabilities include:

- settings sections
- browse pages
- menu groups
- home rows
- managed auth consumers

If you are building a plugin, the SDK overview in [docs/sdk.md](./docs/sdk.md)
is the best place to start.

For a concrete starting point, see:

- [Plugin template](./docs/PLUGIN_TEMPLATE.md)
- `plugins/example-template/`

## Forking an existing plugin

Forking is a valid way to start a new plugin.

When you fork a plugin:

1. change the plugin ID
2. change the plugin slug
3. update the display name and description
4. update the marketplace entry

This avoids ID collisions and keeps installs predictable inside Lumio.

## Official vs private plugins

Use this repository for official, user-facing Lumio plugins.

If a plugin is:

- experimental
- internal
- scraper-related
- legally sensitive

it is usually better placed in a private marketplace repo instead.

See [docs/private-plugins.md](./docs/private-plugins.md).

## Documentation quality

Public plugin pages should read like product documentation, not internal notes.

Try to keep:

- README files user-facing
- changelogs short and useful
- SDK notes clear for outside developers

## Recommended plugin checklist

- metadata is complete
- README is public-facing
- changelog exists
- marketplace entry is accurate
- version is updated
- auth requirements are documented
