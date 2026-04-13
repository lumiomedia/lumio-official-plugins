# Changelog

## 1.0.3

- Refactored runtime to keep Plex UI and capability wiring fully plugin-contained
- Synced runtime bundles with the new core/plugin separation adapter layer

## 1.0.2

- Fixed Plex server URI prioritization so public `plex.direct` endpoints win over stale local LAN addresses during sync
- Reduced repeated sync starts caused by duplicate in-flight Plex library refreshes

## 1.0.1

- Improved slow-library loading by increasing Plex request timeouts
- Added a fallback to recently added items when full library fetch fails or returns empty during refresh
- Reduced false empty-state cases caused by aborted/timeout-prone Plex requests

## 1.0.0

- Initial official Plex plugin release
- Plex settings integration for Lumio
