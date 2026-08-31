# Changelog

## 0.3.34

- The aspect-ratio button in the player controls shows its icon only when the
  bar is too narrow for the label — the phone's portrait width (360 px) could
  not fit it. The current value moves into the aria-label so it is still
  announced. Width-based, not orientation-based: space is the constraint, so a
  narrow desktop window behaves the same.

## 0.3.33

- Playback on Android: the engine choice now separates desktop (mpv) from
  Android (the native media3 player). Published 0.3.32 picked mpv on Android
  too, where the command does not exist — the channel failed with "playback
  failed" and ExoPlayer never started. Measured on device: rejected with
  `Command mpv_set_bounds not found`.
- The player no longer draws underneath Android's status and navigation bars.
- The TV guide is no longer clipped by the desktop floating side menu (WebKit
  clips `position: fixed` against the nav's overflow container).
- The auto-derived EPG source can be turned off.
- reload-on-play moved into the source, engine-independent.

## 0.3.30

- The whole UI follows the app language. The TV guide, the player
  controls and five components had no translator at all and mixed Swedish
  and English within the same view; the "use as home page" block also had
  its Swedish diacritics stripped.

## 0.3.27

- Full-bleed player stage: the MPV overlay now fills the entire viewport instead of being letterboxed between the top header and bottom controls. Chrome overlays sit on top of the video with their existing gradient backgrounds.
- Add aspect-ratio control in the player controls bar — cycles Auto / 16:9 / 4:3 / 2.35:1 via MPV `video-aspect-override` for channels that ship non-square pixels or sidebar logos.
- Add volume slider + mute toggle in the player controls bar; speaker icon reflects the current level.

## 0.3.26

- Treat EPG sources as shared Live TV metadata so All, custom lists, favorites and the player can all resolve programme data from the same XMLTV sources.
- Add a Favorites tab from pinned channels; it appears only when channels are pinned and becomes the initial tab.
- Replace automatic per-card NOW lookups with a small manual EPG button on each card to avoid loading guide data for every visible channel at once.

## 0.3.25

- Keep the current programme text only in the bottom player channel-info row, so it cannot show through the schedule/guide overlay.
- Improve full-guide scroll synchronisation and add a direct channel filter dropdown.
- Extend the full-guide backdrop above the webview content area to cover the visible titlebar gap.

## 0.3.24

- Move the current programme text into the player channel-info row instead of drawing it as a separate overlay over the controls.
- Keep the guide/calendar button behavior unchanged: it still opens the full schedule overlay for the current channel.

## 0.3.23

- Make the full EPG guide sit flush to the top of the player window.
- Keep the channel column and programme timeline vertically scroll-synced.
- Add an "Alla / vald kanal" filter for focusing the guide on the selected channel.

## 0.3.22

- Make desktop plugin storage prefer Lumio's native storage snapshot so large EPG caches remain readable when WKWebView localStorage has a stale smaller value.

## 0.3.21

- Add a delayed EPG cache sync for the guide after opening, so already-fetched XMLTV data is picked up even when the storage event was missed.
- Replace the generic empty guide copy with source-aware diagnostics: no source, fetching, fetch error, no matched channels, or no programmes in the visible time window.
- Update the runtime bridge/plugin version from the old internal `0.3.3` value to the current release version.

## 0.3.20

- Refresh EPG immediately when the configured XMLTV URL list changes instead of treating the previous cache as fresh for six hours.
- Persist XMLTV fetch failures into the EPG cache so settings can show source-specific errors such as `HTTP 404` when all sources fail.

## 0.3.19

- Improve EPG matching across XMLTV providers by using each source's `<channel><display-name>` values as aliases for provider-specific channel ids. This lets playlists with names like `TV3 FHD SE` match XMLTV feeds whose programme ids do not resemble the M3U channel name, as long as the XMLTV channel declares a useful display name.
- Show per-source EPG diagnostics in Live TV settings when available, including channel/programme counts and fetch errors.

## 0.3.18

- Restore auto-hide for the player chrome. Hiding controls during playback is the standard player UX. The underlying "hover stops working after a while" bug is fixed on the host side by a custom NSView subclass (`LumioMpvView`) in `mpv_embed.rs` whose `hitTest:` returns nil — so MPV's native video view can no longer steal first-responder status from WKWebView, and mousemove keeps flowing to WebKit for the entire session.

## 0.3.17

- Disable controls auto-hide. After a few interactions in MPV mode, the native MPV NSView (positioned behind the transparent WKWebView) starts intercepting mouse events for the middle band. Once that happens, `revealControls` is no longer triggered by mousemove, and any hidden chrome becomes permanent — controls can never be revealed again until the channel is reopened. Solution: keep the player chrome always visible. The previous 2.4s auto-hide was a stale carry-over from the windowed-video UX where mouse events always reach WebKit.

## 0.3.16

- TRUE root cause: the host app's Tailwind `content` config does not scan plugin runtime sources (they live outside Moviefinder's tree at `lumio-official-plugins/plugins/*/runtime/`), so any Tailwind class used only by a plugin — including `top-20`/`bottom-32` on the live-tv stage — never gets generated into the compiled CSS bundle. The stage `<div>` then has no top/bottom rule, collapses to height=0, and `mpvSetBounds` skips its `if (rect.width <= 0 || rect.height <= 0) return` guard. The result: MPV NSView stays at its initial full-window frame, and what looks like a black overlay over the stream is actually the NSWindow's black background showing through the transparent WKWebView in regions where MPV is positioned outside the visible viewport rect.
- Fix: stage uses inline `style={{ position: 'absolute', left: 0, right: 0, top: '5rem', bottom: '8rem', background: 'transparent' }}` so the geometry works regardless of which Tailwind classes the host happens to ship in its CSS bundle. Companion change in the host repo adds the plugin runtime path to Tailwind's `content` so future SPA builds also pick up plugin-unique class usage as a permanent fix.

## 0.3.15

- Identified and reverted the regression introduced in `aeba5a1` ("Keep Live TV MPV controls accessible"): that commit's diff actually re-broke clicks by reverting the stage from `inset-x-0 bottom-32 top-20` (the working layout from `6134c56`) to `inset-0`. Full-window stage meant MPV NSView covered the entire window, which on macOS-Tauri causes both (a) the native video layer's black CALayer background to show in letterbox regions and (b) clicks on the React controls to be swallowed by the NSView underneath transparent WebView regions.
- Stage now uses `absolute inset-x-0 bottom-32 top-20 bg-transparent` again: MPV NSView only covers the middle band, leaving the top 80px and bottom 128px purely WebKit. Controls are clickable, right-click → Inspect works, and there's no black mask over the stream.
- All EPG features (PlayerNowOverlay, PlayerScheduleOverlay, schedule grid, NOW badge, channel switcher) are preserved unchanged.

## 0.3.14

- Root-cause fix: add transparent click-capture layer over the MPV stage, mirroring the main video-player-modal pattern. Without it WKWebView's hit-test returned nil over fully-transparent regions, causing every click (including right-click → Inspect Element and the player's own play/fullscreen/guide buttons) to fall through to the MPV NSView and get swallowed. The click layer gives WebKit a concrete hit target so all events reach React.

## 0.3.13

- Match the main video-player-modal MPV layout exactly: drop the `bg-black/60` fullscreen dimmer and the `bg-slate-950/30` card backdrop. Both painted opaque WebView pixels on top of the MPV NSView and turned the stream into a black mask. Player is now a transparent fullscreen overlay with only the top/bottom gradient chrome painting any pixels — the rest of the WebView stays transparent so MPV shows through.

## 0.3.12

- Restore the pre-EPG centered-card MPV layout. The 0.3.x fullscreen overlay caused the MPV NSView to span the whole window and show as an opaque black layer above the stream — fixed regression where audio played but video was hidden under a black mask, and controls became hard to click. Bottom controls and the Guide overlay now live inside the card alongside the aspect-video stage.

## 0.3.11

- Cache-bust republish so installations that already wrote 0.3.10 into local plugin state can still detect a newer runtime update. No runtime changes.

## 0.3.10

- Bump alongside Moviefinder bundle refresh to pick up the transparent MPV stage + non-blocking loading overlay fixes. Resolves "black overlay covers live stream" regression.

## 0.3.9

- Republish the Live TV MPV transparency fix so installations that already cached 0.3.8 can still detect a newer runtime update.

## 0.3.8

- Match the main MPV player's transparent container structure for Live TV so the MPV video layer shows through instead of being covered by a black webview layer.

## 0.3.7

- Keep Live TV on MPV for desktop playback, make the MPV video surface cover the player, and keep controls visible so the window can always be closed.

## 0.3.6

- Play direct `.m3u8` live streams through the webview's native HLS player on desktop to avoid MPV native-surface click capture.

## 0.3.5

- Keep the MPV video surface away from Live TV controls and avoid a stuck black loading layer when MPV audio starts before frame events arrive.

## 0.3.4

- Improve EPG channel matching for XMLTV sources with provider-specific ids, including EPGShare-style ids such as `[TV3HD].TV3.HD.se`.

## 0.2.4

- Route live TV playback through MPV on desktop (Tauri) so HEVC-in-MPEG-TS streams play correctly. Previously native HLS / hls.js could decode only the AAC audio, leaving the video black on common IPTV streams.

## 0.2.1

- Runtime bundle refresh for latest SDK contract and separation updates

## 0.2.0

- Full self-contained runtime with all UI components (grid, player, settings, logo, pagination)
- Live TV browse page with channel deep-linking support
- Home override tab for quick channel access
- M3U source management via settings section
- Channel data layer with caching and group filtering

## 0.1.0

- Scaffolded metadata for the upcoming Live TV official plugin

## 0.3.38
- Om-release av 0.3.37: Ta bort-knapp per M3U-lista och egen Ta bort (utloggning) per Xtream-inloggning — så uppdateringen når appar som står kvar på 0.3.36.

## 0.3.39
- TV: kanalkortet är EN fokusstation (hela blocket markeras). OK kliver in och markerar Spela — som är orange och ligger först — OK igen startar strömmen. Vänster/höger vandrar i kortets knapprad, Bakåt lämnar tillbaka fokus till kortet.

## 0.3.40
- Sökningen hittar kanaler ur HELA Xtream-utbudet (inte bara de 2000 lagrade): hela namnlistan hämtas en gång per session och träffarna spelas/nålas direkt. En rensa-knapp nollställer söket och lämnar tillbaka fokus till sökfältet.
