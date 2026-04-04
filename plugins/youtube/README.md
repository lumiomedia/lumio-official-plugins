# YouTube Plugin

YouTube for Lumio Media Player.

This plugin lets Lumio connect to a user’s YouTube account and surface personal
content directly inside the app.

## What it does

- sign in with YouTube / Google
- show a feed from followed channels
- browse subscribed channels
- open channel-specific video views
- browse playlists and Watch later
- add YouTube rows to the Lumio home screen
- optionally hide shorts from video grids

## Sign-in model

By default, the plugin can use Lumio's built-in app credentials.

That gives users a simple flow:

`Install plugin -> Connect YouTube -> done`

For users who want their own quota budget or a separate Google project, the
plugin also supports a personal app override.

See:

- [Personal app override guide](../../docs/youtube-own-app.md)
- [Privacy policy](./PRIVACY.md)
- [Terms](./TERMS.md)

## Notes for Google setup

If you are using this plugin with a packaged Lumio desktop build, the relevant
OAuth client type is `Desktop app`.

If you are only testing a personal override in a local browser environment, you
can still use a `Web application` client for that override flow.
