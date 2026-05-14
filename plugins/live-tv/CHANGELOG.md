# Changelog

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
