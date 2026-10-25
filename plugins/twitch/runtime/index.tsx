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
  TwitchPageFrame,
} from './twitch-browser'

/** Twitch-sidorna visar ingen hero — på NÅGON bredd (Jerry 2026-09-19:
 *  "Twitch i desktop visar hero, det ska den ej").
 *
 *  Mobilen har varit utan sedan 2026-09-07; skrivbordet fick den kvar, och en
 *  filmkarusell ovanför en lista med live-kanaler hör inte ihop med något på
 *  sidan. Ett konstant värde och inte längre en matchMedia-funktion: värden
 *  läser flaggan vid varje layoutpass, och det finns inte längre något att
 *  fråga fönstret om. */
const twitchHidesHero = true

export const TwitchPlugin: LumioPlugin = {
  id: 'com.lumio.twitch',
  name: { en: 'Twitch', sv: 'Twitch', de: 'Twitch', fr: 'Twitch', es: 'Twitch' },
  version: '1.0.0',
  description: {
    en: 'Browse live channels, categories, followed streams, VODs and clips from Twitch.',
    sv: 'Bläddra bland live-kanaler, kategorier, följda streams, VOD:er och klipp från Twitch.',
    de: 'Stöbere in Live-Kanälen, Kategorien, gefolgten Streams, VODs und Clips von Twitch.',
    fr: 'Parcourez les chaînes en direct, catégories, streams suivis, VOD et clips de Twitch.',
    es: 'Explora canales en directo, categorías, streams que sigues, VODs y clips de Twitch.',
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
      label: { en: 'Twitch', sv: 'Twitch', de: 'Twitch', fr: 'Twitch', es: 'Twitch' },
      Section: TwitchSettingsSection,
    })
    ctx.registerHomeRow({
      id: 'twitch-live-row',
      title: { en: 'Twitch: Live now', sv: 'Twitch: Live nu', de: 'Twitch: Jetzt live', fr: 'Twitch : en direct', es: 'Twitch: en directo' },
      showOnHome: false,
      Row: (props) => <TwitchLiveRow {...props} />,
    })
    ctx.registerHomeSource({
      id: 'twitch-live',
      label: { en: 'Twitch: Live now', sv: 'Twitch: Live nu', de: 'Twitch: Jetzt live', fr: 'Twitch : en direct', es: 'Twitch: en directo' },
      rowId: 'twitch-live-row',
    })
    ctx.registerBrowsePage({ id: 'twitch-live', label: { en: 'Live', sv: 'Live', de: 'Live', fr: 'En direct', es: 'En directo' }, Page: (props) => <TwitchPageFrame><TwitchBrowsePage {...props} /></TwitchPageFrame>, hideHero: twitchHidesHero })
    ctx.registerBrowsePage({ id: 'twitch-categories', label: { en: 'Categories', sv: 'Kategorier', de: 'Kategorien', fr: 'Catégories', es: 'Categorías' }, Page: (props) => <TwitchPageFrame><TwitchCategoriesPage {...props} /></TwitchPageFrame>, hideHero: twitchHidesHero })
    ctx.registerBrowsePage({ id: 'twitch-search', label: { en: 'Search', sv: 'Sök', de: 'Suche', fr: 'Recherche', es: 'Buscar' }, Page: (props) => <TwitchPageFrame><TwitchSearchPage {...props} /></TwitchPageFrame>, hideHero: twitchHidesHero })

    ctx.registerHomeRow({
      id: 'twitch-following-row',
      title: { en: 'Twitch: Following', sv: 'Twitch: Följer', de: 'Twitch: Gefolgt', fr: 'Twitch : suivis', es: 'Twitch: siguiendo' },
      showOnHome: false,
      Row: (props) => <TwitchFollowingRow {...props} />,
    })
    ctx.registerHomeSource({
      id: 'twitch-following',
      label: { en: 'Twitch: Following', sv: 'Twitch: Följer', de: 'Twitch: Gefolgt', fr: 'Twitch : suivis', es: 'Twitch: siguiendo' },
      rowId: 'twitch-following-row',
    })
    ctx.registerBrowsePage({ id: 'twitch-following', label: { en: 'Following', sv: 'Följer', de: 'Gefolgt', fr: 'Suivis', es: 'Siguiendo' }, Page: (props) => <TwitchPageFrame><TwitchFollowingPage {...props} /></TwitchPageFrame>, hideHero: twitchHidesHero })

    // Configurable rows: which category / channels they show is set under
    // Settings → Twitch (getTwitchHomeCategory / getTwitchHomeChannels).
    ctx.registerHomeRow({
      id: 'twitch-category-row',
      title: { en: 'Twitch: Category', sv: 'Twitch: Kategori', de: 'Twitch: Kategorie', fr: 'Twitch : catégorie', es: 'Twitch: categoría' },
      showOnHome: false,
      Row: (props) => <TwitchCategoryRow {...props} />,
    })
    ctx.registerHomeSource({
      id: 'twitch-category',
      label: { en: 'Twitch: Category', sv: 'Twitch: Kategori', de: 'Twitch: Kategorie', fr: 'Twitch : catégorie', es: 'Twitch: categoría' },
      rowId: 'twitch-category-row',
    })
    ctx.registerHomeRow({
      id: 'twitch-channels-row',
      title: { en: 'Twitch: Channels', sv: 'Twitch: Kanaler', de: 'Twitch: Kanäle', fr: 'Twitch : chaînes', es: 'Twitch: canales' },
      showOnHome: false,
      Row: (props) => <TwitchChannelsRow {...props} />,
    })
    ctx.registerHomeSource({
      id: 'twitch-channels',
      label: { en: 'Twitch: Channels', sv: 'Twitch: Kanaler', de: 'Twitch: Kanäle', fr: 'Twitch : chaînes', es: 'Twitch: canales' },
      rowId: 'twitch-channels-row',
    })

    const twitchEntry = {
      id: 'twitch',
      label: { en: 'Twitch', sv: 'Twitch', de: 'Twitch', fr: 'Twitch', es: 'Twitch' },
      defaultEnabled: true,
      target: { pageId: 'twitch-live' },
    }

    ctx.registerMainMenuItem(twitchEntry)

    // Remaining surfaces are registered in later tasks.
  },
}

export default TwitchPlugin
