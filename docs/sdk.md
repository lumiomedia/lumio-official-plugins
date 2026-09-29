# Lumio Plugin SDK

This document describes the plugin-facing contracts used by official Lumio
plugins, as they exist in the app today (0.1.615).

The design goal is:

- core stays neutral and legally clean
- plugins register capabilities through the SDK
- playback, auth and sync logic stay provider-driven instead of hardcoded in UI
- official and private plugins share the same contracts
- runtime code stays inside the SDK boundary instead of importing app internals

## Who this is for

- plugin authors
- maintainers of official Lumio plugins
- developers forking an existing plugin
- teams building private plugins against the same SDK

## Current SDK capabilities

A plugin registers capabilities through the `PluginContext` it receives at
load time. The full method-by-method contract is in
[plugin-contracts.md](./plugin-contracts.md); this is the map.

Streams and playback:

- stream providers (a sidebar section in the media detail view)
- stream availability, playback capability and instant-play providers
- resume refresh, playable URL rewriters and stream request config
- episode sidebars for library-backed series
- library providers: a media server (Plex, Jellyfin, Emby …) as the app's
  catalogue — the host owns the index, home, details, search, Zapp and the
  player; the provider only translates the server

Surfaces:

- settings sections, on desktop as a React component and on TV as typed rows
- home rows, home sources, hero contributions and full home overrides
- browse pages, main menu items, topbar items
- bootstrap mounts (headless logic that runs once at startup)
- media detail actions and download actions
- overview status (the status card under Settings → Overview)

Accounts and identity:

- auth capability providers (connect, disconnect, silent reconnect)
- managed auth consumers (for example `google-youtube`)
- sync identity providers

Everything that used to be app-local — HomeKit, Trakt, Live TV, Plex,
Jellyfin, Twitch, YouTube — now ships as a plugin on these contracts. The
scraper/stream engine is not part of the app at all; source plugins provide it.

## How a plugin fits into Lumio

A plugin declares what it contributes; Lumio renders those contributions in the
right places, on every device it runs on: desktop, phone, and TV with a remote.
The plugin does not own navigation or app state outside the SDK.

Read the runtime boundary before writing code:
[runtime-boundary.md](./runtime-boundary.md).

## Typical plugin shape

- a stable plugin ID and slug
- metadata in `plugin.json`, one entry in `marketplace.json`
- runtime source in `runtime/`, the published bundle in `dist/runtime.js`
- a README and a CHANGELOG
- strings shipped inside the runtime (the app catalogue carries no plugin
  vocabulary); `useLang()` gives you the active language

## Runtime model

- `runtime/` is the editable source; `dist/runtime.js` is the self-contained
  IIFE Lumio installs and caches; `runtimeBundlePath` in `plugin.json` and
  `marketplace.json` says where it lives.
- `@/lib/plugin-sdk` is compiled **into** the bundle. Module state is not shared
  with the host: registries in your bundle are empty, and only `ctx`
  registrations and the SDK bridges reach the host.
- React, `react/jsx-runtime` and Hls come from the host through
  `window.__lumioPluginRuntime`. Never bundle your own copy.
- **No UI library in the bundle.** A single `@heroui/react` import pulled six
  megabytes of HeroUI, framer-motion and react-aria into every plugin and
  killed a 3 GB TV on the home screen. The SDK re-exports what you need
  instead: `SimplePagination` for paging, `Card`, `Checkbox`, `PillBtn`,
  `Select`, `Switch`, `FieldGroup`, `Section`, `Metric`, `MetricGrid`,
  `TOKENS`, `eyebrowStyle`, `inputStyle`, `monoFont`, `Icon`. The build gate
  refuses HeroUI imports.
- Styling is inline styles plus `TOKENS`. Tailwind classes only work when the
  host build happens to contain them, so a class of your own is a gamble.

## Every device: desktop, phone, TV

The same runtime runs on all three. What changes is how the host lays it out.

**Settings on TV are rows with a type.** Declare `rows` on the settings section
(`toggle`, `seg`, `select`, `slider`, `text`, `qr`, `action` with nested
`rows`) and the host draws them, moves focus through them and decides what back
does. A row is one station; no panel opens a panel; destructive actions confirm.
Without `rows` the TV shell renders your desktop `Section` inside a panel, and
reachability becomes your problem.

**Pages you draw yourself** use `useTvMode()` to decide whether to render focus
stations (`data-f`, `data-init`, `data-panel-root`, `data-f-left/right`,
`data-scroll`). Text input on a remote goes through `getTvKeyboardPanel()`,
hold-OK menus through `getTvGlassMenu()` with `tvHoldHandlers(onShort, onHold)`
(650 ms, `TV_HOLD_MS`), and the clock through `getTvClock()`. These resolve
against the host at runtime; never import a copy of the host's TV modules by
another path — a bundled copy has its own React context and reads `false`
forever.

**The TV design space outside TV mode.** Set `tvSceneBox: true` on a browse
page and the host wraps it in a scene box: the page is laid out in 1080-design
pixels on desktop and phone too, `position: fixed` children land inside the
box, and `tvSceneBoxPortalTarget()` is the portal target for overlays. The box
carries three attributes for CSS and `closest()`:

- `TV_SCENE_BOX_ATTR` — the box itself
- `TV_SCENE_NARROW_ATTR` — the measured surface is under `TV_SCENE_NARROW_PX`
  (1024 physical px); write the narrow layout as a CSS rule under it
- `TV_SCENE_PHONE_ATTR` — the shortest physical side is under 640 px: a phone.
  Always set together with the narrow attribute. An older host that does not
  set it gets the narrow layout, so the phone branch is an enhancement, not a
  requirement.

The design width never drops below 1280, so "am I small?" is read from the
attributes, never from the scene's own width.

**Pointer and mouse on a TV tree.** The focus engine also runs inside the scene
box on desktop and phone. `tvPointerHoldHandlers(onShort, onHold)` is the
pointer twin of `tvHoldHandlers` (long-press and right-click open the hold
menu). Draw the focus ring for keys only:
`:root:not([data-focus-source='pointer']) [data-f]:focus { … }` — written as
*not pointer*, because the attribute is absent on older hosts.

**Leaving the page.** `requestBrowseBack()` asks the host to go back one step
in its own navigation (the side menu on TV, the previous page elsewhere); use it
for a visible Back station rather than reaching into history.

**Android.** `setAndroidImmersive()` and `setAndroidOrientation()` control the
system bars and the screen orientation from a plugin page; the Fullscreen API
and `screen.orientation.lock` do not exist in the webview. Release the
orientation when your page closes.

## Host helpers worth knowing

- Storage: `readPluginJson` / `writePluginJson`, `readPluginStorageItem` /
  `writePluginStorageItem`, `getScopedStorageItem` / `setScopedStorageItem`
  (profile-scoped), `onPluginStorageChanged`, `getActiveProfileId`,
  `onProfileChanged`.
- Watched and watchlist: `isMovieWatched`, `toggleMovieWatched`, `setWatched`,
  `getWatchedMovies`, `getWatchedForSeries`, `onWatchedMoviesChanged`,
  `onWatchedEpisodesChanged`, `getWatchlist`, `addToWatchlist`,
  `removeFromWatchlist`, `toggleWatchlist`, `onWatchlistChanged`, `isWatching`.
  Use these instead of keeping a parallel list: the host's rows, badges and
  Trakt sync read the same state.
- Navigation: `requestOpenMediaItem`, `requestOpenBrowsePage`,
  `requestPlaySeriesEpisode`, `requestZappLaunch`, `requestBrowseBack`.
- Library: `fetchLibraryStatus`, `queryLibrary`, `libraryHas`,
  `fetchLibraryItem`, `resetLibrarySource`, `runLibraryScan`,
  `isLibraryScanRunning`, `getLibraryMode` / `setLibraryMode` /
  `onLibraryModeChanged`.
- Player: `openMpvPlayer` / `closeMpvPlayer`, `openNativePlayer` /
  `closeNativePlayer`, `useMpvPlayer`, `useNativePlayer`, `VideoPlayerModal`,
  `capturePlayerFrame` / `playerFrameUrl`, `createVideoSurface` and
  `getVideoSurfaceCapabilities` for extra video surfaces (multiview).
- Desktop host: `isPluginDesktopHost`, `pickPluginFolder`, `pickPluginFiles`,
  `scanPluginDirectory`, `checkPluginPathExists`, `executePluginDesktopCommand`,
  `spawnPluginDesktopCommand`, `launchPluginProgram`, `fetchDesktopApiJson`.
- Streams: `lookupPluginStreams`, `lookupPluginStreamsBatch`,
  `lookupPluginStreamsBatchRanked`, `checkMovieHasStream`,
  `checkEpisodeHasStream`. A stream sidebar receives `runtimeMinutes` in its
  `StreamSidebarProps`; the host uses it to swap away a file that is far
  shorter than the film.
- Appearance: `getAccent` / `setAccent` / `onAppearanceChanged`,
  `ACCENT_PRESETS`; `useTvMode`, `isTauriEnv`, `isDesktopTauriEnv`,
  `isAndroidTauriEnv`.
- Pages: `FullCastPage` (the host's cast page, for library-backed titles),
  `ResultsPagination`, `ResultsLoadingIndicator`, `NextEpisodeCard`,
  `TraktDeviceCodePanel` / `useTraktDeviceLogin` for device-code logins.

Every host-side helper added after some app version must be called guarded
(`ctx.registerX?.()`, `getTvGlassMenu()` may return `null`), or the plugin
raises `minAppVersion`.

## Playback capabilities

Playback is resolved by core through registered providers, which report
`canPlay`, `showPlayButton`, `playVia`, `reason`, `matchedItem` and `priority`.
Core uses the summary in detail cards, hero actions, watchlists, recently
watched and Zapp. Source plugins are the primary playback path when enabled;
library providers are the library-backed path; local files play from their own
flows. When no provider can play, Zapp falls back to the full detail card.

A film never starts a file the host recognises as a series episode, and a file
far shorter than the film's runtime is swapped for the next candidate. Report
availability truthfully and hide rows you cannot actually play.

## Auth capabilities

Auth-capable plugins register through auth providers instead of hardcoded
settings UI. Providers expose the current state, whether connect or disconnect
is possible, whether silent reconnect is supported and whether auth needs a
user gesture. Core renders a generic auth status area from that.

## Design principles

Plugins describe capabilities; they do not reach into core internals.

Good: `registerBrowsePage(...)`, `registerHomeRow(...)`,
`registerLibraryProvider(...)`, `registerAuthCapabilityProvider(...)`,
settings bodies built from `Card` and the other SDK primitives.

Bad: importing registry internals, importing `@/components/...` or another
app module, bundling a UI library, assuming the plugin owns app-level
navigation, keeping a private watched list.

## Menu entries

Any plugin can get an entry in the main menu: register a browse page and a
`registerMainMenuItem(...)` pointing at it. Library plugins point the entry at
the core library view (`LIBRARY_BROWSE_PAGE_ID`) with `params.provider` and a
`fallbackPageId` for the not-yet-connected state. See
[plugin-contracts.md](./plugin-contracts.md#main-menu-entries).

## Publishing a version

Five places carry the version and must agree: `plugin.json`, `package.json`,
the marketplace entry, the runtime's own `version` fields, and the changelog.

1. Bump the version.
2. Build `dist/runtime.js` from a clean checkout of the lowest app version that
   has the SDK members you use, and set `minAppVersion` to that version.
3. Verify the bundle carries the new version string and the new code before
   committing. Users cache runtimes by version: a bump without a rebuild is
   served as "latest" forever.
4. Commit `dist/runtime.js` together with the sources, push. Apps check the
   manifest at most every six hours and activate on the next start.

The build script's type gate fails the build on undefined names (TS2304): a
component that uses `t()` or a hook it never imported reaches users otherwise.

## Marketplace expectations

Every marketplace plugin has a stable ID and slug, a clear version,
`plugin.json`, `README.md`, `CHANGELOG.md`, `runtime/`, `dist/runtime.js` and
`runtimeBundlePath` in both `plugin.json` and the root `marketplace.json`.
The manifest is the install and update index.

## Forking a plugin

1. copy the plugin folder
2. change the plugin ID and slug
3. update metadata in `plugin.json`
4. publish it through your own marketplace manifest or private repo
