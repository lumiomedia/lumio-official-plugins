# YouTube Personal App Override

The official YouTube plugin supports a personal auth override.

That means a user can choose between:

- Lumio-managed YouTube credentials
- their own Google OAuth + YouTube Data API app

This is useful when:

- the shared Lumio quota is exhausted
- a power user wants their own quota
- a user wants a separate Google project for YouTube usage

## Which client type should I create?

- `Desktop app`
  Use this if you are building your own packaged Lumio desktop app and want your own core YouTube credentials.

- `Web application`
  Use this if you only want a personal override for browser or localhost use.

## Personal browser / localhost override

1. Create a Google Cloud project
2. Enable `YouTube Data API v3`
3. Configure the OAuth consent screen
4. Create an `OAuth client ID` for `Web application`
5. Add:
   - `http://localhost:3001`
   - `http://127.0.0.1:3001`
   - optionally the same origins for port `3000`
6. Create an `API key`
7. Restrict that key to `YouTube Data API v3`
8. In Lumio, open the YouTube plugin settings
9. Enable `Override with my own Google app`
10. Paste:
   - Google OAuth Client ID
   - YouTube API key
11. Press `Connect YouTube`

## Packaged desktop build

1. Create a Google Cloud project
2. Enable `YouTube Data API v3`
3. Configure the OAuth consent screen
4. Create an `OAuth client ID` for `Desktop app`
5. Create an `API key`
6. Restrict that key to `YouTube Data API v3`
7. Add the desktop client ID and API key to Lumio core configuration

## Important note

Even with personal auth, YouTube Data API calls still consume quota.

Personal override does not remove quota limits.
It simply moves usage to the user's own Google project instead of Lumio's shared one.

## Why this exists

This keeps the default experience simple for normal users while still giving advanced
users a fallback when shared quota is tight.
