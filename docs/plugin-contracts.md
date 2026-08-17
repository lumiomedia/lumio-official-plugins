# Lumio Plugin Contracts

This is the reference for everything a plugin can contribute to Lumio, how each
contribution surfaces in the app, and the compatibility rules a published
plugin must follow. It reflects the architecture where the app core is a
neutral media client and every source-specific feature — including the entire
scraper/stream engine — lives in plugin runtimes.

Related documents:

- [PLUGIN_TEMPLATE.md](./PLUGIN_TEMPLATE.md) — folder layout and metadata files
- [runtime-boundary.md](./runtime-boundary.md) — what a runtime may import
- [repo-structure.md](./repo-structure.md) — how a marketplace repo is laid out

## 1. Plugin shape

A runtime bundle exports one `LumioPlugin`:

```ts
import type { LumioPlugin } from '@/lib/plugin-sdk'

export const MyPlugin: LumioPlugin = {
  id: 'com.example.my-plugin',
  name: { en: 'My Plugin', sv: 'Mitt plugin' },
  version: '1.0.0',
  description: { en: '…', sv: '…' },
  // Optional: skip registration on LAN browser clients
  visibility: { hideOnLanClient: true },
  register(ctx) {
    // All contributions are registered here, once, at app bootstrap.
  },
}
```

`register(ctx)` runs once when the host loads the plugin. `ctx` is the host's
`PluginContext` — the complete contribution surface. Everything the plugin adds
to the app goes through `ctx.register*` calls; the host owns rendering, layout
and lifecycle.

## 2. The contribution surface (`PluginContext`)

### Streams & playback

| Method | What it contributes |
| --- | --- |
| `registerStreamProvider` | A stream source for the media detail view: adds the source toggle and renders your `SidebarSection` component where the app shows stream results. |
| `registerMediaStreamCatalogProvider` | A generic stream-catalog provider (scraper-agnostic listing). |
| `registerMediaStreamAvailabilityProvider` | "Does a stream exist for this title/episode?" checks. Drives play buttons, watchlist badges, hero state and Zapp eligibility. |
| `registerPlaybackCapabilityProvider` | Answers `canPlay` / `showPlayButton` / `playVia` per item. `zappRole: 'master'` makes the provider drive the Zapp flow. |
| `registerInstantPlayProvider` | One-click play resolution (Zapp-style: pick an item, resolve a playable URL without opening the detail view). |
| `registerResumeRefreshProvider` | Re-resolves a stale continue-watching link. The host probes the stored URL itself; when it is dead it calls `refresh({ url, sourceId, season, episode })` and expects a fresh `{ url, filename? }` or `null`. The host never learns how the source id becomes a URL. |
| `registerPlayableUrlRewriter` | Consulted right before native playback. Given a URL your source recognises (for example an indirect resolve endpoint), return a direct playable URL — or `null` to leave it untouched. |
| `registerStreamRequestConfigProvider` | Supplies the provider-specific config segment the host bakes into direct availability request URLs. Only your plugin knows how your provider encodes credentials; the host just asks. |
| `registerEpisodeSidebarProvider` | A full episode sidebar for series (library-backed sources). |

The host resolves playback through the registered providers only. There are no
provider-id special cases in core UI: if your plugin can verify cached state,
report it through the availability/capability providers, and hide rows you
cannot actually play.

### Settings

| Method | What it contributes |
| --- | --- |
| `registerSettingsSection` | A settings section: `{ id, label, Section }` where `Section` is a full React component. |

Where a section lands:

- **Unclaimed sections** get their own auto-generated page under the Plugins
  group in Settings, titled with your section label.
- **Claimed sections** render inside a static app page. The app keeps a claim
  map (`CLAIMED_PLUGIN_SECTIONS` in core) from section id to page + tab. Current
  claims: `trakt` → Tracking tab 0, `scrapers` → Sources & catalogs tab 1,
  `debrid` → Sources & catalogs tab 2.
- A claimed tab takes its **label from your section's `label`** — the app
  carries no vocabulary for plugin domains. When no plugin registers the
  claimed section, the tab does not exist at all.

This is exactly how the Scrapers and Debrid tabs under Sources & catalogs work:
the streams-scraper plugin registers two sections with ids `scrapers` and
`debrid`, and the app slots them into the Sources page. A different source
plugin registering the same ids would land in the same places. New claims (new
tab positions for new domains) are added in core by request — file an issue
with the section id and the page where it belongs.

### Home, navigation and pages

| Method | What it contributes |
| --- | --- |
| `registerHomeRow` | A row on the native Home. |
| `registerHomeSource` | A source for user-configurable home sections. |
| `registerHero` | A hero override for Home. |
| `registerHomeOverride` | A full custom Home view replacing native rows (user-armed). |
| `registerBrowsePage` | A browsable page owned by the plugin. |
| `registerMainMenuItem` / `registerTopbarItem` | Navigation entries. |
| `registerBootstrap` | A background mount rendered once at startup (headless logic, syncing, listeners). |

### Media detail view

| Method | What it contributes |
| --- | --- |
| `registerMediaDetailsAction` | An action button in the detail header. |
| `registerMediaDownloadAction` | A download button (`Button` component) in the detail header. |

### Accounts & identity

| Method | What it contributes |
| --- | --- |
| `registerAuthCapabilityProvider` | Connect/disconnect state for the generic plugin-auth settings UI. |
| `registerManagedAuthConsumer` | Declares the plugin consumes a core-managed auth provider. |
| `registerSyncIdentityProvider` | Identity used by watch-state/watchlist sync flows. |

## 3. The player: what plugins can and cannot do

Plugins **integrate with** playback; they do not extend the player's internal
UI.

What a plugin can do today:

- Decide *whether* something is playable and *how* it starts
  (`PlaybackCapabilityProvider`, `InstantPlayProvider`, `StreamProvider`).
- Feed the player: your sidebar/instant-play code resolves a URL and opens the
  host's shared player. The host exposes its `VideoPlayerModal` and
  `NextEpisodeCard` components through the runtime bridge
  (`window.__lumioPluginRuntime.components`), and plugin builds resolve
  imports of those components to the host's live copy automatically — so
  app-side player improvements reach plugin playback paths without a plugin
  release.
- Keep playback alive across sessions (`ResumeRefreshProvider`) and short-cut
  slow indirect URLs (`PlayableUrlRewriter`).
- Hand off to external players through SDK host helpers (desktop command
  helpers, file pickers) rather than importing Tauri directly.

What stays host-owned:

- The player chrome, controls, subtitle/audio pipeline, video tuning and the
  **player layout editor**. These are user configuration surfaces, not plugin
  extension points. A plugin cannot inject buttons or panels into the player
  or the layout editor today.
- The playback engines (embedded mpv on desktop, native engine on Android,
  `<video>` in browser sessions) and engine selection.

If your plugin needs a genuinely new integration point — in the player or
anywhere else — the pattern is: core adds a neutral `ctx.register*` seam, your
plugin implements it. Request the seam in the app repo rather than working
around the boundary; seams ship quickly and stay stable.

## 4. Runtime environment and build

A published runtime is a **self-contained IIFE** (`dist/runtime.js`). At build
time, imports resolve like this:

- `@/lib/plugin-sdk` and other `@/…` specifiers compile against the host app's
  source tree and are bundled in. The bundle carries its own copies — module
  state is **not** shared with the host app's copies.
- Shared state therefore only flows through explicit bridges: the profile/
  scoped-storage SDK helpers, the auth-capability helpers, and
  `window.__lumioPluginRuntime` (react, jsx runtime, Hls, shared player
  components, host SDK functions). Prefer SDK helpers over reading the bridge
  directly.
- React, `react/jsx-runtime` and Hls always come from the host through the
  bridge — never bundle your own copy.

Boundary rules (checked by `scripts/check-runtime-boundaries.mjs`):

- import from `@/lib/plugin-sdk`
- import from relative plugin-local files
- do not import app-internal Lumio modules

Two practical consequences worth knowing:

- **Registry duplication**: your bundle's copy of any host module has empty
  registries. Anything you need the *host* to know must go through `ctx`
  registrations — never by calling a bundled host-module function and hoping
  the host sees it.
- **Styling**: the app compiles the CSS. Stick to the utility classes used by
  the shared settings/sidebar chrome (standard Tailwind utilities); exotic
  one-off classes may not exist in the host build. Follow the card patterns in
  existing plugins.

## 5. Strings and localization

The app's string catalogue is app-only. Plugin UI ships its own strings inside
the runtime (see `local-strings.ts` in the streams-scraper plugin for the
pattern: a small table keyed by language, reading the active language from
scoped storage via the SDK). `useLang()` from the SDK works inside plugin
bundles for the language value and host strings that are part of the SDK
surface — but do not add domain vocabulary to the app catalogue.

## 6. Versioning and compatibility

- `plugin.json` is the source of truth for the served version. Rebuild
  `dist/runtime.js` **before** bumping the version — the app refetches when the
  version changes, and whatever is in `dist/` at that moment is what users get.
- **`minAppVersion`** (in `plugin.json` and the marketplace entry): set it when
  a release depends on host APIs, claims or seams that older apps don't have.
  Older apps keep their working copy and show "needs a newer app" instead of
  installing a build that breaks.
- **Optional-chain new context methods.** If your plugin calls a `ctx` method
  introduced after some app version, call it as `ctx.registerX?.(…)` so the
  plugin still loads on older hosts (the newer feature simply stays off).
- The plugin must keep working when its optional seams are absent, and the app
  must keep working when the plugin is absent: unclaimed tabs disappear,
  play buttons hide, availability reads unknown. Both directions are part of
  the contract.

## 7. Distribution

A marketplace repo needs:

- `marketplace.json` at the root (plugin list with `version`, `repoPath`,
  `runtimeBundlePath`, optional `minAppVersion`)
- `plugins/<slug>/plugin.json`, `README.md`, `CHANGELOG.md`
- `plugins/<slug>/dist/runtime.js` (the built bundle)

Users add the repo URL as a plugin source in Settings → Plugins; the app reads
the manifest, installs the runtime, and checks the same manifest for updates.
The reference third-party implementation of everything in this document is the
streams-scraper plugin: <https://github.com/dev-sketcher/Lumio-scraper>.
