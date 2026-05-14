# Changelog

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
