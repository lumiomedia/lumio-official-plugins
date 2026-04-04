# YouTube Google Project Setup

The YouTube plugin is designed around a bring-your-own Google project setup.

Each user supplies:

- their own Google OAuth client
- their own YouTube Data API key

This keeps quota separate per user and avoids a shared app-wide rate limit.

For normal private use, you do not need your own domain.

## Which client type should I create?

- `Desktop app`
  Use this for normal YouTube plugin usage inside Lumio.

- `Web application`
  Use this only if you are testing in localhost or a browser environment.

## Normal Lumio usage

1. Create a Google Cloud project
2. Enable `YouTube Data API v3`
3. Configure the OAuth consent screen
4. Create an `OAuth client ID` for `Desktop app`
5. Create an `API key`
6. Restrict that key to `YouTube Data API v3`
7. In Lumio, open the YouTube plugin settings
8. Paste:
   - Google OAuth Client ID
   - YouTube API key
9. Press `Connect YouTube`

## Localhost / browser testing

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
9. Paste:
   - Google OAuth Client ID
   - YouTube API key
10. Press `Connect YouTube`

## Important note

YouTube Data API calls still consume quota.

This setup does not remove quota limits.
It simply puts usage on the user's own Google project instead of a shared app-wide budget.
