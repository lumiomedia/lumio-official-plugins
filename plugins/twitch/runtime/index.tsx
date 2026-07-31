import type { LumioPlugin } from '@/lib/plugin-sdk'
import { twitchAuthCapabilityProvider } from './twitch-auth-capability-provider'
import { TwitchSettingsSection } from './twitch-settings-section'

export const TwitchPlugin: LumioPlugin = {
  id: 'com.lumio.twitch',
  name: { en: 'Twitch', sv: 'Twitch' },
  version: '1.0.0',
  description: {
    en: 'Browse live channels, categories, followed streams, VODs and clips from Twitch.',
    sv: 'Bläddra bland live-kanaler, kategorier, följda streams, VOD:er och klipp från Twitch.',
  },
  preinstalled: true,
  register(ctx) {
    ctx.registerAuthCapabilityProvider(twitchAuthCapabilityProvider)
    ctx.registerSettingsSection({
      id: 'twitch',
      label: { en: 'Twitch', sv: 'Twitch' },
      Section: TwitchSettingsSection,
    })
    // Remaining surfaces are registered in later tasks.
  },
}

export default TwitchPlugin
