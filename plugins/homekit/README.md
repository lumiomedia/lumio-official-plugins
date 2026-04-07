# HomeKit

HomeKit is the planned official Lumio plugin for playback-triggered lighting
and automation scenes.

This plugin is currently scaffolded as metadata-first while core still owns the
runtime event pipeline.

## Intended scope

- configure HomeKit accessory and pairing state
- react to playback events such as start, pause and close
- drive dimming and scene transitions from Lumio playback state
- own HomeKit status and reset flows through a plugin settings section

## SDK gap

HomeKit needs a plugin-facing playback event contract so core can emit neutral
events without importing HomeKit-specific code directly.

## Migration status

Current Lumio builds still call HomeKit from core playback components. This
plugin folder is the starting point for moving that behavior behind the SDK.
