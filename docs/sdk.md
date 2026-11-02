# Lumio Plugin SDK

This document describes the plugin-facing contracts used by official Lumio
plugins, as they exist in the app today (0.1.639). Members that arrived after
0.1.615 say so in their section; call them guarded and raise `minAppVersion`
when your plugin depends on them.

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
- library frames (`registerLibraryFrame`): a plugin-drawn side frame next to
  the host's own library-scoped home
- browse pages, main menu items, topbar items
- bootstrap mounts (headless logic that runs once at startup)
- media detail actions and download actions
- overview status (the status card under Settings → Overview)

Accounts and identity:

- auth capability providers (connect, disconnect, silent reconnect)
- managed auth consumers (for example `google-youtube`)
- sync identity providers

Tracking and lists:

- trackers: receive the player's scrobbles (`registerTracker`)
- list sources: user lists the host shows as ordinary home rows
  (`registerListSource`)
- bulk import of watched history, watchlists and paused positions into the
  host's own stores (`addWatchedMovies`, `addWatchlistEntries`,
  `importPlaybackPositions` …)

Phone, remote and voice:

- couch mode: the paired phone shows a surface the plugin owns (`sport`) and
  drives the plugin's channel player (`registerCouchSurface`,
  `registerCouchChannelPlayer`, `openCouchTip`)
- the remote's extra keys (Info, Guide, Menu, Last, Search) reach the page as
  ordinary key events on Android TV
- voice input through the system speech dialog (`listenForVoice`)

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
  vocabulary); `useLang()` gives you the active language. The app speaks five
  languages since 0.1.637 (`en`, `sv`, `de`, `fr`, `es`), so a `PluginText`
  object should carry all five. A user-made language (`x-<code>`) reads its
  base language before falling back to English, so you never have to know
  about it.

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
(650 ms, `TV_HOLD_MS`), and the clock through `getTvClock()`. A glass menu
target may set `initialKey` to start focus on that action (for example the
selected option); without it focus starts on the first action. These resolve
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

**Keeping the app's top menu.** In TV mode the top navigation menu (HOME,
SEARCH, MOVIES, ...), the quick menu and the clock only render on the home
scene, and on desktop a browse page normally stands on bare chrome. Set
`keepsTvTopChrome: true` (or a function returning a boolean, re-read on every
registry revision like `hideHero`) on a browse page to keep them on TV and on
desktop (not on phones), the way the Sport page does. The host measures the
chrome's height and publishes it on the page: `--host-chrome-top` (screen px)
and, in TV mode, `--tv-scene-chrome-inset` (design px). Start your first row
below it, e.g. `padding-top: calc(var(--tv-scene-chrome-inset, 3.125rem) +
2rem)`. Older hosts ignore the field and do not set the variables, so keep the
fallback. The field and its desktop behaviour both arrived in 0.1.630.

**The remote's extra keys (Android TV, app 0.1.639).** Info, Guide, Menu,
Last channel and Search reach the page as ordinary `keydown`/`keyup` events
with `KeyboardEvent.key` set to `Info`, `Guide`, `ContextMenu`, `MediaLast`
and `BrowserSearch`; the colour keys arrive as `ColorF0Red` … `ColorF3Blue`.
Short press and hold are yours to tell apart (`keyup` arrives on release). The
media keys (play/pause, rewind, fast forward, next, previous) are different:
the host turns them into its `lumio-media-key` window event with no keyup, so
there is only a short press. Keys the host reserves for navigation (arrows,
Enter, Back, channel up/down, volume) never reach a plugin binding. Live TV's
`runtime/tv/remote-keys.ts` is the reference: a user-editable map from key to
action.

**Voice (app 0.1.639).** `voiceAvailable()` answers whether the system speech
dialog exists (Android only today; desktop and older hosts answer `false`),
and `listenForVoice({ lang?, prompt? })` opens it and resolves with what was
said, or `null` when the user cancelled or nothing was recognised. One dialog
at a time; a transient failure is not cached. Both go through the host bridge,
so they are no-ops in a bundle running on an older host.

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
  Trakt sync read the same state. Bulk writers for a first sync (0.1.631):
  `addWatchedMovies(movies, { source })`, `addWatchedEpisodes(episodes, {
  source })`, `addWatchlistEntries(entries, { source })` (series) and
  `addMovieWatchlistEntries(entries, { source })`. Each takes an array of
  plain entries (`tmdbId`, `imdbId`, `title`, `posterUrl`; episodes carry
  `season`/`episode`; watched entries may carry `watchedAt`) and returns how
  many were new; pass `source: 'tracker'` so the change is not echoed back to
  other services (see *Syncing watched titles* below).
- Continue watching positions (0.1.636): `canImportPlaybackPositions()` says
  whether the host can take paused positions, and
  `importPlaybackPositions('mdblist' | 'simkl', items)` merges rows in the
  Trakt `/sync/playback` shape (`type`, `progress`, `paused_at`, `movie` /
  `show` + `episode` with `ids.tmdb`) into Continue watching; newest wins
  against a local entry, and the import waits until no title is starting.
  Returns `{ applied }`, or `null` on a host without the receiver.
- Home background (0.1.624): `getHomeBackgroundUrls()` returns the user's own
  background images for the current profile and `onHomeBackgroundChanged(fn)`
  subscribes, for a page that wants to match the app's home.
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
- Operating system: `hostOs()` returns `'windows'`, `'macos'` or `null`
  (Android, browser, LAN client). Use it for anything OS-specific — library
  extensions (`.dll` / `.dylib`), paths, key labels — instead of reading the
  user agent. Added with the Windows app (0.1.636): guard the call
  (`sdk.hostOs?.()`) and raise `minAppVersion`.
- Unsupported platforms: a marketplace entry's `unsupportedPlatforms` accepts
  `'android'`, `'tv'`, `'windows'` and `'macos'`. The OS values apply in TV
  mode on that computer too. The OS values need the Windows app or newer;
  older apps ignore them.
- Streams: `lookupPluginStreams`, `lookupPluginStreamsBatch`,
  `lookupPluginStreamsBatchRanked`, `checkMovieHasStream`,
  `checkEpisodeHasStream`. A stream sidebar receives `runtimeMinutes` in its
  `StreamSidebarProps`; the host uses it to swap away a file that is far
  shorter than the film. Two optional fields were added with the source
  selector: `libraryKey` (the library title key when it can't be read from
  `mediaId`, e.g. an unmatched Plex grid hit) and `preferredSourceGroup`
  (the source group the title was opened from, e.g. `plex`; preselected when
  the title is there, but a source the user saved for the title still wins).
  A sidebar that doesn't care can ignore both.
- Source groups: the detail page shows one stream list with a source menu.
  Library versions are grouped per library provider id (`plex`, `jellyfin`,
  `emby`, `webdav` …, labelled with the provider's `label`), Xtream sources
  and every `registerMediaStreamCatalogProvider` hit are grouped as `vod`,
  and core-stream addons as `debrid`. A catalog candidate whose `directUrl`
  equals an indexed library version is dropped, so the same file isn't
  listed twice. Play starts the chosen group first and uses the others as
  reserves.
- Appearance: `getAccent` / `setAccent` / `onAppearanceChanged`,
  `ACCENT_PRESETS`; `useTvMode`, `isTauriEnv`, `isDesktopTauriEnv`,
  `isAndroidTauriEnv`.
- Pages: `FullCastPage` (the host's cast page, for library-backed titles),
  `ResultsPagination`, `ResultsLoadingIndicator`, `NextEpisodeCard`,
  `TraktDeviceCodePanel` / `useTraktDeviceLogin` for device-code logins.

### Channels (app 0.1.630 or newer)

These helpers let a plugin build personal TV channels from the user's own
sources. They are background lookups: they run at background pace, never take
stream focus (they do not interrupt a stream the user is starting) and are
safe to call for a whole schedule. On a host older than 0.1.630 they resolve to
`null` or `[]`, so check `hasChannelHost()` first and fall back gracefully.

- `hasChannelHost(): boolean`: true when the host provides the channel helpers.
- `channelResolveLibraryPlayback({ key, mediaType, season?, episode?, exclude?, allowCatalog? }): Promise<ChannelPlayable | null>`:
  a playable URL for a library title (`key` is the library title key,
  `mediaType` is `'movie' | 'tv'`). `null` when it has no playable version.
  `exclude` lists versions already tried, so the host answers with the next
  one; `allowCatalog: false` never returns the title's IPTV-VOD versions.
  Older hosts ignore both fields.
- `channelResolveTitleStream({ imdbId, mediaType, season?, episode?, exclude? }): Promise<ChannelPlayable | null>`:
  the best stream for a title via the core stream list (`mediaType` is
  `'movie' | 'series'`). `null` when nothing is found. The lookup does not
  remember the chosen stream; see `channelRememberStream`.
- `channelRememberStream(token: string): void`: makes the stream behind
  `ChannelPlayable.rememberToken` the remembered choice for that title (the
  one the details page prefers next time). Call it when the picture is
  actually on screen (the player's `onFirstPlay`), never right after the
  lookup: a preload or a channel zapped past must not become remembered. A
  token is used once; unknown tokens are ignored. A no-op on hosts without
  the helper.

`ChannelPlayable` is `{ url, requestHeaders?, forceProxy?, rememberToken? }`
(`rememberToken` only on stream lookups). Pass the result
to the player as a plain URL; do not pass `mediaId`, `tmdbId` or `imdbId`, so
a channel never writes watched state or resume positions.

Neutral host helpers for a plugin that talks to a source of its own (app
0.1.631; the cloud-specific helpers that shipped in 0.1.630 are gone, that
code lives in the Channels plugin now):

- `channelSourceToken(sourceId): string | null` and
  `channelClearSourceToken(sourceId)`: a saved key for a source the plugin
  itself speaks to (the id is the plugin's own). `null` without a key.
- `channelParseFileName(fileName, parentFolder?): ParsedName | null`: the
  app's file-name parser (title, year, season, episode).
- `channelMatchTitles([{ title, year, kind }]): Promise<Array<TmdbSearchHit | null>>`:
  titles against TMDb through the app's match cache, one hit or `null` per
  input (all `null` on an older host).
- `channelPrefetch(url, headers?)`: on Android, lets the player fetch a file's
  head and tail ahead of a direct stream. Only for an already resolved URL,
  never for a stream lookup; a no-op elsewhere and with the source cache on.
- `channelSourceCacheSetting(): { isPhone, get(), set(on) } | null`: the
  app's own "Cache streams" setting on Android, read and written through the
  host so the bundle never keeps a copy. `null` off Android.

Every host-side helper added after some app version must be called guarded
(`ctx.registerX?.()`, `getTvGlassMenu()` may return `null`), or the plugin
raises `minAppVersion`.

## registerLibraryFrame

`ctx.registerLibraryFrame({ id, Frame })` lets a plugin draw a frame (for
example a side rail) next to the host's regular home, scoped to one library
provider. Use it when you want the app's own home, details, search and player
for a catalogue but your own navigation around it. Guard the call
(`ctx.registerLibraryFrame?.()`) and raise `minAppVersion`.

`Frame` receives `LibraryFrameProps`:

- `platform`: `'tv' | 'desktop' | 'phone'`, the platform the host draws for.
- `onNavigate(target)`: navigate as a browse page (same as
  `openPluginBrowsePage`).
- `onExit()`: leave the library view and go back to the app's normal home
  (the rail's Back).
- `onInset(px)`: report the frame's width in SCREEN pixels (after scaling).
  The host pushes its content right by that much. `0` means no side rail
  (phones).
- `onInsetBottom?(px)` (optional, app 0.1.624 and later): on phones, report
  the height in SCREEN pixels of a bar the frame draws along the bottom edge
  (for example a tab bar), and `0` when it goes away. The host ends its home
  and the details page above that height and draws the frame above the
  details page, so the bar stays visible. The host ignores it on TV and
  desktop. Call it guarded (`onInsetBottom?.(px)`), since older hosts don't
  pass it.

Open the frame by navigating to `pageId: 'library'` with `params.frame` set
to the frame's `id`. The host then renders its regular home scoped to the
library and draws the frame fixed on the left.

The frame is drawn inside a box scaled in the 1920 design space, so lay it out
in design pixels. The box carries `data-tv-scene-box="frame"`; the TV focus
engine ignores it, so the frame handles its own key navigation.

With `params.frame`, all indexed sources of the provider are in scope (for
example every `xtream-vod:<source>`), not just one.

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

The request carries `background: true` (0.1.629) when the question comes from
a row in the background (Continue watching, a watchlist grid) rather than a
title the user opened. A provider that would have to go to the network to
answer should then answer from what it already knows, or `null`, so a home
full of rows never fans out into source lookups.

## Auth capabilities

Auth-capable plugins register through auth providers instead of hardcoded
settings UI. Providers expose the current state, whether connect or disconnect
is possible, whether silent reconnect is supported and whether auth needs a
user gesture. Core renders a generic auth status area from that.

## Trackers and list sources

A **tracker** receives every playback start, pause and stop, including the
player's 30-second pulse:

```ts
ctx.registerTracker?.({
  id: 'my-tracker',
  label: { en: 'My tracker', sv: 'Min tracker' },
  scrobble: async (event) => {
    // event: { action: 'start' | 'pause' | 'stop', mediaType: 'movie' | 'episode',
    //          tmdbId, imdbId, season, episode, progress /* 0–100 */ }
  },
})
```

The host only calls a tracker with a usable id (and season and episode for
episodes). `event.pulse` is `true` for the player's 30-second pause pulse,
which is not a user action. Trakt needs it to save a resume point, but a
service that wants one call per action (SIMKL) should ignore pulses. It drops repeats of the same event within five seconds, and skips
the tracker while its plugin is disabled. Scrobbling is fire-and-forget:
nothing a tracker does can affect playback.

A **list source** turns lists from a service into home rows. The row source
is `plugin_list:<id>`. The user picks the list in the row's settings, the
host stores it in the row, and the host resolves the titles and draws the
cards on desktop, phone and TV:

```ts
ctx.registerListSource?.({
  id: 'my-lists',
  label: { en: 'My list', sv: 'Min lista' },
  listLists: async () => [{ id: '42', name: 'Favourites', itemCount: 12 }],
  loadList: async (listId) => [{ mediaType: 'movie', tmdbId: '603', imdbId: null, title: 'The Matrix', posterUrl: null }],
  resolveListRef: async (input) => null, // optional: a pasted link or id
  describeList: (listId) => null,        // optional, synchronous, from cache
})
```

`loadList` should answer quickly from the plugin's own cache. The host looks
up at most 40 titles per row.

A **home source** (`registerHomeSource`) may declare one per-row setting with
`option: { label, choices() }`; the user picks it in the row editor and the
row receives it as `option` (0.1.624, older apps omit it). See
[plugin-contracts.md](./plugin-contracts.md).

**A first sync from a service.** Pull the service's history once and write it
with the bulk helpers (`addWatchedMovies`, `addWatchedEpisodes`,
`addWatchlistEntries`, `addMovieWatchlistEntries`, all with `source:
'tracker'`), and its paused positions with `importPlaybackPositions` (guard
with `canImportPlaybackPositions()`). MDBList and SIMKL do exactly this. Never
write them one by one through the single-title helpers: every write emits a
change event the host's rows react to.

**Syncing watched titles or watchlists.** A tracker that pulls from a service
writes locally with `source: 'tracker'`. A realtime bridge that pushes
local changes must forward only `isUserMutation(mutation.source)`, which is
`true` only for changes the user made in Lumio. Otherwise a change from one
service echoes to another. Some services sync with each other on their own,
and history APIs are not idempotent. `planWatchlistSync` is the same
three-way merge the built-in Trakt sync uses.

**Waiting for playback start.** `waitForStartIdle()` resolves when no title
is starting. A plugin bundle carries its own copy of the SDK, so this call
goes through the host bridge. A background job that waits on it never
competes with a title the user just pressed play on.

## Couch mode: the paired phone

Couch mode pairs a phone with the app as a remote and second screen. A plugin
can take part in two ways; both go through the host bridge, so a bundle on a
host without couch mode gets no-ops. `hasCouchSdk()` says whether the host
has it (0.1.625; `openCouchTip` 0.1.626). All types are re-exported from the
SDK (`CouchSurface`, `CouchPlayerHandlers`, `CouchCommand`, `CouchPlayer`,
`CouchAck`, the sport and tip protocols).

- `registerCouchSurface('sport', surface)`: the plugin owns a surface in the
  phone's state. `surface.snapshot()` returns what the phone should show (or
  `null` when the surface is idle), `surface.run(cmd)` executes a command the
  phone sent (stamped with the profile), and the optional `surface.query(q)`
  answers a read. Call `notifyCouchSurface('sport')` whenever the snapshot
  changed, so the phone is pushed a new state. The latest registration wins;
  the returned function unregisters. Only `sport` exists today (Live TV's
  matchday surface).
- `registerCouchChannelPlayer(handlers)`: while the plugin's own player is on
  screen, the phone's Now playing view talks to it instead of the app's
  player. `handlers.snapshot()` returns a `CouchPlayer` (or `null` when the
  player is closed), `handlers.run(cmd)` executes play/pause, seek, volume and
  the other `CouchCommand`s, and the optional `handlers.said()` returns the
  subtitle lines of the last 30 seconds ("What did they say?"). Call
  `notifyCouchPlayer()` on every state change. Unregister when the player
  closes so the app's player gets the phone back.
- `openCouchTip(match, starterPhoneId)`: asks the host to open a Tip the match
  room for a `TipMatchInfo` (`matchId`, `sport`, `league`, `home`, `away`,
  `kickoffMs`, `backdrop`, `autoResult`). `false` when a room is already open
  or the host has no Tip.

The phone's own D-pad and channel up/down (0.1.639) arrive at the host as
ordinary key presses, so a plugin page needs nothing extra for them.

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
