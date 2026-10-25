import type { LumioPlugin } from '@/lib/plugin-sdk'
import { YouTubeBackgroundBootstrap, YouTubeBrowsePage, YouTubeHeroBanner, YouTubeHomeOverride, YouTubeHomeRow } from './youtube-browser'
import { youtubeAuthCapabilityProvider } from './youtube-auth-capability-provider'
import { YouTubeSettingsSection } from './youtube-settings-section'

export const YouTubePlugin: LumioPlugin = {
  id: 'com.lumio.youtube',
  name: { en: 'YouTube', sv: 'YouTube', de: 'YouTube', fr: 'YouTube', es: 'YouTube' },
  version: '1.0.0',
  description: {
    en: 'Browse subscriptions, playlists and channels from YouTube.',
    sv: 'Bläddra bland prenumerationer, spellistor och kanaler från YouTube.',
    de: 'Stöbere in Abos, Playlists und Kanälen von YouTube.',
    fr: 'Parcourez vos abonnements, playlists et chaînes YouTube.',
    es: 'Explora suscripciones, listas de reproducción y canales de YouTube.',
  },
  preinstalled: true,

  register(ctx) {
    ctx.registerAuthCapabilityProvider(youtubeAuthCapabilityProvider)
    ctx.registerSettingsSection({
      id: 'youtube',
      label: { en: 'YouTube', sv: 'YouTube', de: 'YouTube', fr: 'YouTube', es: 'YouTube' },
      Section: YouTubeSettingsSection,
    })
    ctx.registerBootstrap({
      id: 'youtube-background-bootstrap',
      Mount: YouTubeBackgroundBootstrap,
    })
    ctx.registerHero({
      id: 'youtube-hero',
      Hero: YouTubeHeroBanner,
    })
    ctx.registerHomeOverride({
      id: 'youtube-home',
      label: { en: 'YouTube', sv: 'YouTube', de: 'YouTube', fr: 'YouTube', es: 'YouTube' },
      View: YouTubeHomeOverride,
    })

    ctx.registerBrowsePage({
      id: 'youtube-following',
      label: { en: 'Following', sv: 'Följer', de: 'Abos', fr: 'Abonnements', es: 'Suscripciones' },
      Page: YouTubeBrowsePage,
    })
    ctx.registerBrowsePage({
      id: 'youtube-channels',
      label: { en: 'Channels', sv: 'Kanaler', de: 'Kanäle', fr: 'Chaînes', es: 'Canales' },
      Page: YouTubeBrowsePage,
    })
    ctx.registerBrowsePage({
      id: 'youtube-playlists',
      label: { en: 'Playlists', sv: 'Spellistor', de: 'Playlists', fr: 'Playlists', es: 'Listas' },
      Page: YouTubeBrowsePage,
    })
    ctx.registerBrowsePage({
      id: 'youtube-playlist',
      label: { en: 'Playlist', sv: 'Spellista', de: 'Playlist', fr: 'Playlist', es: 'Lista' },
      Page: YouTubeBrowsePage,
    })
    ctx.registerBrowsePage({
      id: 'youtube-channel',
      label: { en: 'Channel', sv: 'Kanal', de: 'Kanal', fr: 'Chaîne', es: 'Canal' },
      Page: YouTubeBrowsePage,
    })

    const youtubeEntry = {
      id: 'youtube',
      label: { en: 'YouTube', sv: 'YouTube', de: 'YouTube', fr: 'YouTube', es: 'YouTube' },
      defaultEnabled: true,
      target: { pageId: 'youtube-following' },
    }

    ctx.registerMainMenuItem(youtubeEntry)

    ctx.registerHomeRow({
      id: 'youtube-following-row',
      title: { en: 'YouTube following', sv: 'YouTube följer', de: 'YouTube-Abos', fr: 'Abonnements YouTube', es: 'Suscripciones de YouTube' },
      showOnHome: false,
      Row: (props) => <YouTubeHomeRow {...props} />,
    })
    ctx.registerHomeSource({
      id: 'youtube-following',
      label: { en: 'YouTube following', sv: 'YouTube följer', de: 'YouTube-Abos', fr: 'Abonnements YouTube', es: 'Suscripciones de YouTube' },
      rowId: 'youtube-following-row',
    })
  },
}
