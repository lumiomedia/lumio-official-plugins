import type { LumioPlugin } from '@/lib/plugin-sdk'
import { ensureFreshTwitchSession } from './twitch-auth'
import { twitchAuthCapabilityProvider } from './twitch-auth-capability-provider'
import { TwitchSettingsSection } from './twitch-settings-section'
import {
  TwitchBrowsePage,
  TwitchCategoriesPage,
  TwitchSearchPage,
  TwitchFollowingPage,
  TwitchLiveRow,
  TwitchFollowingRow,
  TwitchCategoryRow,
  TwitchChannelsRow,
} from './twitch-browser'

/** Mobil: Twitch-sidorna visar ingen hero — Tillbaka-pillret bredvid Live är
 *  vägen ut (Jerry 2026-09-07). Läses vid varje layoutpass av värden. */
const twitchHidesHeroOnMobile = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 639px)').matches

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
    // Auto-reconnect at app start: a once-connected account whose access
    // token expired is silently renewed from the stored refresh token, so
    // Following/home-rows work without re-running the device flow.
    if (typeof window !== 'undefined') void ensureFreshTwitchSession()
    ctx.registerAuthCapabilityProvider(twitchAuthCapabilityProvider)
    ctx.registerSettingsSection({
      id: 'twitch',
      label: { en: 'Twitch', sv: 'Twitch' },
      Section: TwitchSettingsSection,
    })
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
    ctx.registerBrowsePage({ id: 'twitch-live', label: { en: 'Live', sv: 'Live' }, Page: TwitchBrowsePage, hideHero: twitchHidesHeroOnMobile })
    ctx.registerBrowsePage({ id: 'twitch-categories', label: { en: 'Categories', sv: 'Kategorier' }, Page: TwitchCategoriesPage, hideHero: twitchHidesHeroOnMobile })
    ctx.registerBrowsePage({ id: 'twitch-search', label: { en: 'Search', sv: 'Sök' }, Page: TwitchSearchPage, hideHero: twitchHidesHeroOnMobile })

    ctx.registerHomeRow({
      id: 'twitch-following-row',
      title: { en: 'Twitch: Following', sv: 'Twitch: Följer' },
      showOnHome: false,
      Row: (props) => <TwitchFollowingRow {...props} />,
    })
    ctx.registerHomeSource({
      id: 'twitch-following',
      label: { en: 'Twitch: Following', sv: 'Twitch: Följer' },
      rowId: 'twitch-following-row',
    })
    ctx.registerBrowsePage({ id: 'twitch-following', label: { en: 'Following', sv: 'Följer' }, Page: TwitchFollowingPage, hideHero: twitchHidesHeroOnMobile })

    // Configurable rows: which category / channels they show is set under
    // Settings → Twitch (getTwitchHomeCategory / getTwitchHomeChannels).
    ctx.registerHomeRow({
      id: 'twitch-category-row',
      title: { en: 'Twitch: Category', sv: 'Twitch: Kategori' },
      showOnHome: false,
      Row: (props) => <TwitchCategoryRow {...props} />,
    })
    ctx.registerHomeSource({
      id: 'twitch-category',
      label: { en: 'Twitch: Category', sv: 'Twitch: Kategori' },
      rowId: 'twitch-category-row',
    })
    ctx.registerHomeRow({
      id: 'twitch-channels-row',
      title: { en: 'Twitch: Channels', sv: 'Twitch: Kanaler' },
      showOnHome: false,
      Row: (props) => <TwitchChannelsRow {...props} />,
    })
    ctx.registerHomeSource({
      id: 'twitch-channels',
      label: { en: 'Twitch: Channels', sv: 'Twitch: Kanaler' },
      rowId: 'twitch-channels-row',
    })

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
