# Changelog

## 0.1.4

- Indexing large Jellyfin servers no longer stops halfway. A slow answer or a dropped connection used to end the whole scan ("signal is aborted without reason" or "Failed to fetch"); each request now waits longer and is retried before giving up.

## 0.1.3

- Loads again on Lumio 0.1.617. The copy of the plugin that ships inside that app version stopped at startup, so the plugin never appeared; this version replaces it automatically.

## 0.1.2

- Large libraries with many series can be indexed again. Series were sent to Lumio 200 at a time with every episode included, which could be several megabytes per request. That was more than Lumio accepts, so the scan stopped with "Failed to fetch" and the index was never marked as synced. Titles are now sent in smaller batches.

## 0.1.1

- Uses much less memory and responds faster to the remote. The plugin no longer carries its own copy of a large UI library it barely used, which made it several megabytes smaller and removed dozens of duplicate keyboard and focus listeners that ran on every key press.

## 0.1.0

- Trickplay: when the server has generated scrubbing images for a file, Lumio shows them in the player's seek bubble.
- Incremental sync now picks up new episodes in series that are already indexed. A new episode does not change the series itself in Jellyfin, so the series stayed without the episode until the daily full scan.
- A failed episode request fails the scan instead of silently indexing the series with no episodes.
- The Jellyfin menu entry is enabled by default, like Plex. It was hidden until switched on in the menu settings, even with an active server.

## 0.1.0

- First version: sign in with server address, username and password; pick movie and series libraries; build the index; Jellyfin tab and library mode; direct-play versions; progress back to Jellyfin.
