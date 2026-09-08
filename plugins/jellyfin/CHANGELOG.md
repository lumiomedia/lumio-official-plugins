# Changelog

## Unreleased

- Trickplay: when the server has generated scrubbing images for a file, Lumio shows them in the player's seek bubble.
- Incremental sync now picks up new episodes in series that are already indexed. A new episode does not change the series itself in Jellyfin, so the series stayed without the episode until the daily full scan.
- A failed episode request fails the scan instead of silently indexing the series with no episodes.
- The Jellyfin menu entry is enabled by default, like Plex. It was hidden until switched on in the menu settings, even with an active server.

## 0.1.0

- First version: sign in with server address, username and password; pick movie and series libraries; build the index; Jellyfin tab and library mode; direct-play versions; progress back to Jellyfin.
