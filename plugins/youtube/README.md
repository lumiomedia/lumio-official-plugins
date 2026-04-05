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
- register YouTube auth status through the shared Lumio auth capability layer
- optionally hide shorts from video grids

## Sign-in model

This plugin is intentionally set up for power users.

Each user connects with their own Google project, which means:

- your own YouTube Data API quota
- no shared Lumio-wide rate limit
- no dependency on Lumio-managed Google credentials

See:

- [Google project setup guide](../../docs/youtube-own-app.md)
- [Privacy policy](./PRIVACY.md)
- [Terms](./TERMS.md)

## Notes for Google setup

For normal plugin use in Lumio, create a `Desktop app` OAuth client.

If you are only testing in a local browser environment, you can also create a
`Web application` client for localhost use.
