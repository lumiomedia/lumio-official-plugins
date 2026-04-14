# Changelog

## 1.0.24

- Restored Plex capability matching to fetch missing library cache when needed, fixing "series play shows splash but never starts" on cold cache.
- Stabilized cached poster/backdrop URLs across refreshes by reusing existing artwork URLs for unchanged items, reducing full image redraws.
- Synced runtime bundle + marketplace version for in-app update visibility.

## 1.0.23

- Restored stable episode play flow (non-blocking click-to-play) to prevent "nothing happens" in series sidebar.
- Kept Plex grid cache stable across server URI churn so opening Plex does not redraw from empty as often.
- Improved direct-play resilience via app-side fallback when `/playback-url` resolution is slow or fails.

## 1.0.22

- Fixed Plex series playback startup by resolving episode stream URLs through the same `/api/plugins/plex/playback-url` path as movies.
- Added async episode play request de-duping to avoid race conditions when rapidly opening/changing episodes.
- Reduced repetitive Plex sync "server fetch start" logs to explicit refreshes only.

## 1.0.21

- Shipped latest Plex browse caching/refresh behavior and reduced sync log noise.
- Synced plugin marketplace/runtime version for in-app update detection.

## 1.0.20

- Added explicit Plex browse refresh button so server reload only happens when requested.
- Keep Plex grid startup cache-first to avoid forced reload on every open.
- Reduced repetitive Plex sync logging by avoiding network fetches during capability checks.

## 1.0.19

- Synced version bump for latest hero startup/randomization compatibility release.

## 1.0.18

- Restore Plex browse controls (all/movies/series) and search input inside the Plex view.
- Keep Plex server selection stable by matching by id, uri, or name on refresh.

## 1.0.17

- Synced version metadata with the latest app-side Plex fetch improvements.

## 1.0.16

- Increased Plex library fetch timeout in the desktop app to prevent premature aborts.

## 1.0.14

- Added a Plex browse page and top menu entry for quicker navigation.
- Allows Plex items to open the core details view from plugin browse pages.

## 1.0.15

- Added explicit Plex sync diagnostics so empty libraries show the last failure cause.

## 1.0.13

- Moved Plex runtime helpers into the plugin package to keep core separation intact.
- Updated Plex runtime API paths to use `/api/plugins/plex/*`.

## 1.0.12

- Added a "Rensa Plex-cache" button in Plex settings to clear cached library data and refresh poster art.

## 1.0.11

- Added a "Rensa Plex-cache" button in Plex settings to clear cached library data and refresh poster art.

## 1.0.10

- Sync with latest app-side Plex fixes and runtime bundle rebuild.

## 1.0.9

- Guarded `crypto.randomUUID()` in non-secure contexts with try/catch and safe fallback.
- Prevents Tauri webview crashes when `randomUUID()` throws despite being present.

## 1.0.8

- Restored a safe random ID fallback chain so Plex no longer crashes in non-secure contexts (e.g. Tauri webview).
- Keeps behavior identical in secure contexts while avoiding `crypto.randomUUID()` TypeErrors.

## 1.0.7

- Replaced the Plex profile PIN field from HeroUI `Input` to native `<input>` to avoid client runtime crashes when opening Plex settings.
- No behavior change for auth flow; this is a stability-only UI dependency reduction.

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
