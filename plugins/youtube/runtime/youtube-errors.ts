'use client'

/**
 * User-facing failures raised by the plain-module parts of this plugin
 * (`youtube-auth.ts`, `youtube-client.ts`) cannot be translated where they are
 * thrown: those files are not components, so they cannot call the `useLang()`
 * hook. Instead they throw an Error whose message is a host i18n key from this
 * registry, and the component that surfaces the error runs it through `t()`.
 *
 * Messages that come straight from the YouTube API are still passed through
 * verbatim — `isYouTubeErrorKey()` tells the two apart at the call site.
 */
export const YOUTUBE_ERROR_KEYS = {
  requestFailed: 'pluginYoutubeRequestFailed',
  quotaExceeded: 'pluginYoutubeQuotaExceeded',
  sessionExpired: 'pluginYoutubeSessionExpired',
  channelLoadFailed: 'pluginYoutubeChannelLoadFailed',
  channelPlaylistLoadFailed: 'pluginYoutubeChannelPlaylistLoadFailed',
  browserOnly: 'pluginYoutubeBrowserOnly',
  identityServicesLoadFailed: 'pluginYoutubeIdentityServicesLoadFailed',
  identityServicesInitFailed: 'pluginYoutubeIdentityServicesInitFailed',
  desktopLoginStartFailed: 'pluginYoutubeDesktopLoginStartFailed',
  loginSessionExpired: 'pluginYoutubeLoginSessionExpired',
  loginFailed: 'pluginYoutubeLoginFailed',
  loginTimedOut: 'pluginYoutubeLoginTimedOut',
  missingClientId: 'pluginYoutubeMissingClientId',
  missingPlaylistId: 'pluginYoutubeMissingPlaylistId',
  missingChannelId: 'pluginYoutubeMissingChannelId',
} as const

export type YouTubeErrorKey = (typeof YOUTUBE_ERROR_KEYS)[keyof typeof YOUTUBE_ERROR_KEYS]

const YOUTUBE_ERROR_KEY_VALUES = new Set<string>(Object.values(YOUTUBE_ERROR_KEYS))

/** True when `value` is one of the i18n keys thrown by this plugin. */
export function isYouTubeErrorKey(value: string): value is YouTubeErrorKey {
  return YOUTUBE_ERROR_KEY_VALUES.has(value)
}

/** Builds an Error that carries an i18n key instead of literal copy. */
export function youTubeError(key: YouTubeErrorKey): Error {
  return new Error(key)
}
