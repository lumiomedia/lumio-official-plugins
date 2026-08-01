# Changelog

## 1.2.0

- Two new home-row sources: "Twitch: Category" (top live streams in a category of your choice) and "Twitch: Channels" (your hand-picked channels, live now, in your configured order — with a quiet note when none are live). Which category/channels they show is set under Settings → Twitch; the rows follow config changes live and stay hidden until configured.

## 1.1.0

- Session auto-reconnect: a once-connected account is silently renewed from the stored refresh token — at app start and whenever a Twitch surface opens — instead of demanding a new device-flow login every ~4 h when the access token expires. Requires the app's new `/api/plugins/twitch/device/refresh` endpoint; only a definitive rejection from Twitch (revoked token) clears the stored session.
- Category drilldown: removed the "Back to categories" button — clicking the Categories chip already navigates back.

## 1.0.0

- Initial plugin scaffold
- Twitch data types (streams, categories, videos, clips, users)
- Managed auth support through Lumio core (device code flow)
