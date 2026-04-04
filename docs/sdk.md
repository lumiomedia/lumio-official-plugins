# Lumio Plugin SDK

This repo documents the current Lumio plugin SDK as it exists in the app today.

The important design goal is:

- core stays neutral and legally clean
- plugins register capabilities through the SDK
- official and private plugins can share the same contracts

## Current SDK capabilities

The current SDK supports:

- stream providers
- settings sections
- home rows
- browse pages
- main menu items
- topbar dropdown groups
- managed auth consumers

In practice that means a plugin can:

- add a settings section
- add a menu group like `YouTube`
- add browse pages like `Following`, `Channels`, `Playlists`
- add home rows on the front page
- consume core-managed auth like `google-youtube`

## Core design rules

Plugins should describe capabilities, not reach into core internals.

Good:

- `registerBrowsePage(...)`
- `registerHomeRow(...)`
- `registerManagedAuthConsumer(...)`

Bad:

- importing registry internals directly
- naming provider-specific playback logic in core
- assuming a plugin owns app-level navigation outside the SDK

## Managed auth

Official plugins can consume a core-managed auth provider.

Example:

- `google-youtube`

The YouTube plugin also supports a personal auth override, so advanced users can
connect their own Google app instead of Lumio's managed credentials.

## Marketplace expectations

Every marketplace plugin should have:

- a stable plugin ID
- a stable slug
- a clear version
- a `plugin.json`
- a README

The marketplace manifest should be treated as the install/update index.

## Recommended next SDK steps

- remote marketplace manifest loading
- install/update flows from manifest
- external runtime loading for non-bundled plugins
- plugin capability badges in settings
- plugin update notes / changelog support

