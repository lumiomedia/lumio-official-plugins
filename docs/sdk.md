# Lumio Plugin SDK

This document describes the plugin-facing contracts used by official Lumio
plugins.

The design goal is:

- core stays neutral and legally clean
- plugins register capabilities through the SDK
- playback and auth logic stay provider-driven instead of hardcoded in UI
- official and private plugins can share the same contracts

## Who this is for

This page is for:

- plugin authors
- maintainers of official Lumio plugins
- developers forking an existing plugin
- teams building private plugins against the same SDK

## Current SDK capabilities

The current SDK supports:

- settings sections
- home rows
- browse pages
- main menu items
- topbar items
- bootstrap mounts
- hero contributions
- playback capability providers
- auth capability providers

Planned next contracts for the current migration work:

- playback event consumers for integrations such as HomeKit
- sync services for watch history, watchlist and collection providers such as Trakt
- live source providers for integrations such as M3U / Live TV

In practice that means a plugin can:

- add a settings section
- add a menu entry like `YouTube`
- add browse pages like `Following`, `Channels`, `Playlists`
- add home rows on the front page
- register a playback source such as Plex
- register a connect or reconnect experience such as YouTube auth

The remaining core-owned integrations are being moved toward the same model.
At the moment, HomeKit, Trakt and Live TV still depend on app-local services
that are not fully exposed through the SDK yet.

## How a plugin fits into Lumio

At a high level, a plugin registers capabilities with Lumio core.

Common examples:

- a settings section
- a topbar or menu contribution
- one or more browse pages
- home rows on the start page
- a playback capability provider
- an auth capability provider

The plugin does not need to own navigation or app state directly. Instead, it
declares what it contributes and Lumio renders those capabilities in the right places.

## Typical plugin shape

A typical plugin has:

- a stable plugin ID
- metadata in `plugin.json`
- one entry in `marketplace.json`
- runtime source in `runtime/`
- a published runtime bundle in `dist/runtime.js` when the plugin is installable as executable external runtime
- one or more UI surfaces registered through the SDK

Typical surfaces include:

- settings
- browse pages
- menu groups
- home rows
- playback providers
- auth providers

## Runtime model

Lumio plugins use a source-and-bundle model:

- `runtime/` contains the editable plugin source
- `dist/runtime.js` is the published browser bundle Lumio can install and cache
- `plugin.json` and `marketplace.json` use `runtimeBundlePath` to tell Lumio where the bundle lives

This keeps the plugin repository as the source of truth while avoiding direct
filesystem imports into the app during development or runtime.

If a plugin has not published a runtime bundle yet, it can still exist in a
metadata-first state and be discovered by Lumio, but external runtime loading
will not be attempted until `runtimeBundlePath` is present.

## Playback capabilities

Playback is resolved by core through registered providers.

Providers report values such as:

- `canPlay`
- `showPlayButton`
- `playVia`
- `reason`
- `matchedItem`
- `priority`

Core uses this summary in:

- detail cards
- hero actions
- watchlists
- recently watched
- Zapp

### Current playback priority

- scraper or stream plugins are the primary playback path when enabled
- Plex is a library-backed playback path
- local files are handled as directly playable from their own UI flows

Zapp follows the same rule:

- if scraper providers are active, they are master
- if only Plex is active, Zapp should browse only playable Plex movies
- if no provider can play, Zapp should fall back to opening the full detail card

## Auth capabilities

Auth-capable plugins register through auth providers instead of hardcoded
settings UI behavior.

Providers expose:

- current auth state
- whether connect or disconnect is possible
- whether silent reconnect is supported
- whether auth requires an explicit user gesture

Core can then render a generic auth status area without needing plugin-specific
special cases.

## Design principles

Plugins should describe capabilities, not reach into core internals.

Good:

- `registerBrowsePage(...)`
- `registerHomeRow(...)`
- `registerPlaybackCapabilityProvider(...)`
- `registerAuthCapabilityProvider(...)`

Bad:

- importing registry internals directly
- naming provider-specific playback logic in core UI
- assuming a plugin owns app-level navigation outside the SDK

## Marketplace expectations

Every marketplace plugin should have:

- a stable plugin ID
- a stable slug
- a clear version
- a `plugin.json`
- a README
- ideally a changelog

If the plugin is ready for external runtime loading, it should also have:

- `runtime/`
- `dist/runtime.js`
- `runtimeBundlePath` in both `plugin.json` and the root `marketplace.json`

The marketplace manifest should be treated as the install and update index.

## Forking a plugin

If you are forking an existing Lumio plugin, the usual path is:

1. copy the plugin folder
2. change the plugin ID and slug
3. update metadata in `plugin.json`
4. publish it through your own marketplace manifest or private repo

That keeps compatibility with Lumio's plugin model while avoiding ID collisions.
