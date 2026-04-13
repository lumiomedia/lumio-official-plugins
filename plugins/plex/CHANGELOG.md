# Changelog

## 1.0.6

- Hotfix: reverted an unstable client cache gate that could trigger startup/runtime crashes when opening Plex.
- Kept the sync-noise reductions from earlier releases while restoring the previous stable fetch flow.

## 1.0.5

- Stabilized Plex library sync singleflight keying so parallel refreshes collapse into one request per server/library scope.
- Throttled repetitive `server fetch deduped` and `cooldown active` debug logs to reduce noise during retry windows.
- Kept retry cooldown behavior intact while preventing high-frequency duplicate log bursts.

## 1.0.4

- Reduced repeated Plex sync fetch storms by hardening in-flight dedupe behavior.
- Improved server URI and token prioritization to recover faster from stale `plex.direct`/LAN endpoint combinations.
- Synced runtime version metadata with marketplace/plugin manifest for reliable update detection.

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
