# Runtime Boundary

Official Lumio plugins are moving toward a hard separation:

- plugin runtime code may import from `@/lib/plugin-sdk`
- plugin runtime code may import from relative plugin-local files
- plugin runtime code must not import app-specific modules from Lumio core

In other words, runtime source should not depend on paths like:

- `@/components/...`
- `@/lib/plugins/...`
- `@/lib/playback-capabilities`
- any other app-internal implementation module

## Why this exists

We want:

- a clean app/core repo that only owns host concerns and SDK contracts
- plugin repos to be the source of truth for plugin behavior
- fewer duplicate code paths between bundled plugins, cached runtime bundles and app internals
- safer upgrades and debugging when a plugin is updated independently

## Current state

The repository still contains some legacy imports while older plugin surfaces are
being moved out of core. Those legacy exceptions are tracked in:

- `scripts/check-runtime-boundaries.mjs`

That script acts as the debt register. New app-internal imports are forbidden,
and old ones must be removed plugin by plugin until the allowlist is empty.

## Rule of thumb

If a runtime file needs something that feels generic, add it to the SDK.

If it needs something Plex-, YouTube-, Live TV-, HomeKit- or Trakt-specific,
that code belongs in the plugin repo, not in Lumio core.

