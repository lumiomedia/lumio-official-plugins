# Changelog

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
