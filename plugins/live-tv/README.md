# Live TV

Live TV is the planned official Lumio plugin for M3U playlists, channel groups,
favorites and direct live playback.

This plugin has been scaffolded in metadata-first form while the remaining Live
TV logic is still being moved out of core.

## Intended scope

- manage one or more M3U playlist sources
- browse channels and groups as plugin-owned pages
- contribute Live TV rows to Home
- expose Live TV as a top-level navigation entry
- keep channel caching and logos behind plugin-owned services

## Migration status

Current Lumio builds still keep most Live TV behavior in core.

The next extraction steps are:

1. move M3U settings UI into the plugin runtime
2. register browse pages and home rows through the SDK
3. move channel caching and source management behind plugin contracts
4. publish a runtime bundle once the plugin can run outside the app repo
