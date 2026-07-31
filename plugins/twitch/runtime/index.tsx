import type { LumioPlugin } from '@/lib/plugin-sdk'
import { twitchAuthCapabilityProvider } from './twitch-auth-capability-provider'
import { TwitchSettingsSection } from './twitch-settings-section'
import { TwitchBrowsePage, TwitchCategoriesPage, TwitchHero, TwitchLiveRow } from './twitch-browser'

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
    ctx.registerHero({ id: 'twitch-hero', Hero: TwitchHero })
    ctx.registerHomeRow({
      id: 'twitch-live-row',
      title: { en: 'Twitch: Live now', sv: 'Twitch: Live nu' },
      showOnHome: false,
      Row: (props) => <TwitchLiveRow {...props} />,
    })
    ctx.registerHomeSource({
      id: 'twitch-live',
      label: { en: 'Twitch: Live now', sv: 'Twitch: Live nu' },
      rowId: 'twitch-live-row',
    })
    ctx.registerBrowsePage({ id: 'twitch-live', label: { en: 'Live', sv: 'Live' }, Page: TwitchBrowsePage })
    ctx.registerBrowsePage({ id: 'twitch-categories', label: { en: 'Categories', sv: 'Kategorier' }, Page: TwitchCategoriesPage })

    const twitchEntry = {
      id: 'twitch',
      label: { en: 'Twitch', sv: 'Twitch' },
      defaultEnabled: true,
      target: { pageId: 'twitch-live' },
    }

    ctx.registerMainMenuItem(twitchEntry)

    // Remaining surfaces are registered in later tasks.
  },
}

export default TwitchPlugin
