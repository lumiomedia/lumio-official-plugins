# Lumio Plugin SDK

This document describes the Lumio plugin SDK used by official plugins in this marketplace.

The design goal is:

- core stays neutral and legally clean
- plugins register capabilities through the SDK
- official and private plugins can share the same contracts

## Who this is for

This page is for:

- plugin authors
- maintainers of official Lumio plugins
- developers forking an existing plugin
- teams building private plugins against the same SDK

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

## How a plugin fits into Lumio

At a high level, a plugin registers capabilities with Lumio core.

Common examples:

- a settings section
- a topbar or menu contribution
- one or more browse pages
- home rows on the start page
- a managed auth consumer

The plugin does not need to own navigation or app state directly. Instead, it
declares what it contributes and Lumio renders those capabilities in the right places.

## Typical plugin shape

A typical plugin has:

- a stable plugin ID
- metadata in `plugin.json`
- one entry in `marketplace.json`
- one or more UI surfaces registered through the SDK

Typical surfaces include:

- settings
- browse pages
- menu groups
- home rows

## Browse, menu and home rows

These three parts usually work together:

- browse pages provide full plugin-owned views
- menu items and dropdown groups link to those views
- home rows surface content on the main Lumio home page

The YouTube plugin is a good reference for this pattern:

- menu group: `YouTube`
- browse pages: `Following`, `Channels`, `Playlists`, `Watch later`
- home rows: YouTube-based rows on the main home screen

## Managed auth

Managed auth lets Lumio core own credentials for first-party plugins while still
keeping the plugin interface clean.

That means a plugin can say:

- “I consume `google-youtube`”

without hardcoding app credentials into the plugin itself.

## Design principles

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
- ideally a changelog

The marketplace manifest should be treated as the install/update index.

## Forking a plugin

If you are forking an existing Lumio plugin, the usual path is:

1. copy the plugin folder
2. change the plugin ID and slug
3. update metadata in `plugin.json`
4. publish it through your own marketplace manifest or private repo

That keeps compatibility with Lumio's plugin model while avoiding ID collisions.
