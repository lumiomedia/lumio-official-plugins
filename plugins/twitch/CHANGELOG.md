# Changelog

## 1.1.0

- Session auto-reconnect: a once-connected account is silently renewed from the stored refresh token — at app start and whenever a Twitch surface opens — instead of demanding a new device-flow login every ~4 h when the access token expires. Requires the app's new `/api/plugins/twitch/device/refresh` endpoint; only a definitive rejection from Twitch (revoked token) clears the stored session.
- Category drilldown: removed the "Back to categories" button — clicking the Categories chip already navigates back.

## 1.0.0

- Initial plugin scaffold
- Twitch data types (streams, categories, videos, clips, users)
- Managed auth support through Lumio core (device code flow)
