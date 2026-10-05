# Emby

Emby as a library provider for Lumio. The plugin translates your Emby server
into the app's library index: the host owns the home page, details page,
search, Zapp and the player.

- Settings → Emby: server address, username, password, libraries, Build index.
- Home → Layout → Library: make the library the home page, or open the Emby
  tab in the menu for the same view without changing the home page.
- Playback uses direct stream URLs; progress is reported back to Emby.
- The server address can be the plain server (`http://host:8096`) or a path
  behind a reverse proxy; the plugin finds the API root itself.
