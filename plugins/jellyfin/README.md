# Jellyfin

Jellyfin as a library provider for Lumio. The plugin translates your Jellyfin
server into the app's library index: the host owns the home page, details
page, search, Zapp and the player.

- Settings → Jellyfin: server address, username, password, libraries, Build index.
- Home → Layout → Library: make the library the home page, or open the
  Jellyfin tab in the menu for the same view without changing the home page.
- Playback uses direct stream URLs; progress is reported back to Jellyfin.
