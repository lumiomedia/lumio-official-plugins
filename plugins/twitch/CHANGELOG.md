# Changelog

## 1.3.3

- The player close button and the login/account error messages follow the
  app language.

## 1.3.2

- Player modal renders via a portal to `<body>`, so it always covers the whole window — previously a transformed ancestor could offset it and leave a strip of the page visible at the top.

## 1.3.1

- Search page: input now sits beside the heading (title left, search right) instead of below it, and the "Start typing to search Twitch." prompt is gone.

## 1.3.0

- All Twitch UI (browse pages, home rows, settings) now follows the app's language picker. Plugin bundles carry their own copy of the i18n module, so the host's language context never reached them and everything fell back to English; the host's `useLang` now detects that detached state and reads the persisted per-profile language directly, following picker changes live.
- Removed the Twitch hero option (toggle + hero registration).

## 1.2.0

- Two new home-row sources: "Twitch: Category" (top live streams in a category of your choice) and "Twitch: Channels" (your hand-picked channels, live now, in your configured order — with a quiet note when none are live). Which category/channels they show is set under Settings → Twitch; the rows follow config changes live and stay hidden until configured.

## 1.1.0

- Session auto-reconnect: a once-connected account is silently renewed from the stored refresh token — at app start and whenever a Twitch surface opens — instead of demanding a new device-flow login every ~4 h when the access token expires. Requires the app's new `/api/plugins/twitch/device/refresh` endpoint; only a definitive rejection from Twitch (revoked token) clears the stored session.
- Category drilldown: removed the "Back to categories" button — clicking the Categories chip already navigates back.

## 1.0.0

- Initial plugin scaffold
- Twitch data types (streams, categories, videos, clips, users)
- Managed auth support through Lumio core (device code flow)
