import type { LumioPlugin } from '@/lib/plugin-sdk'

export const TwitchPlugin: LumioPlugin = {
  id: 'com.lumio.twitch',
  name: { en: 'Twitch', sv: 'Twitch' },
  version: '1.0.0',
  description: {
    en: 'Browse live channels, categories, followed streams, VODs and clips from Twitch.',
    sv: 'Bläddra bland live-kanaler, kategorier, följda streams, VOD:er och klipp från Twitch.',
  },
  preinstalled: true,
  register(_ctx) {
    // Surfaces are registered in later tasks.
  },
}

export default TwitchPlugin
