import type { LumioPlugin } from '@/lib/plugin-sdk'
import { YouTubeBackgroundBootstrap, YouTubeBrowsePage, YouTubeHeroBanner, YouTubeHomeRow } from './youtube-browser'
import { youtubeAuthCapabilityProvider } from './youtube-auth-capability-provider'
import { YouTubeSettingsSection } from './youtube-settings-section'

export const YouTubePlugin: LumioPlugin = {
  id: 'com.lumio.youtube',
  name: { en: 'YouTube', sv: 'YouTube' },
  version: '1.0.0',
  description: {
    en: 'Browse subscriptions, playlists and channels from YouTube.',
    sv: 'Bladdra bland prenumerationer, spellistor och kanaler från YouTube.',
  },
  preinstalled: true,

  register(ctx) {
    ctx.registerAuthCapabilityProvider(youtubeAuthCapabilityProvider)
    ctx.registerSettingsSection({
      id: 'youtube',
      label: { en: 'YouTube', sv: 'YouTube' },
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

    ctx.registerBrowsePage({
      id: 'youtube-following',
      label: { en: 'Following', sv: 'Följer' },
      Page: YouTubeBrowsePage,
    })
    ctx.registerBrowsePage({
      id: 'youtube-channels',
      label: { en: 'Channels', sv: 'Kanaler' },
      Page: YouTubeBrowsePage,
    })
    ctx.registerBrowsePage({
      id: 'youtube-playlists',
      label: { en: 'Playlists', sv: 'Spellistor' },
      Page: YouTubeBrowsePage,
    })
    ctx.registerBrowsePage({
      id: 'youtube-playlist',
      label: { en: 'Playlist', sv: 'Spellista' },
      Page: YouTubeBrowsePage,
    })
    ctx.registerBrowsePage({
      id: 'youtube-channel',
      label: { en: 'Channel', sv: 'Kanal' },
      Page: YouTubeBrowsePage,
    })

    const youtubeEntry = {
      id: 'youtube',
      label: { en: 'YouTube', sv: 'YouTube' },
      defaultEnabled: true,
      target: { pageId: 'youtube-following' },
    }

    ctx.registerMainMenuItem(youtubeEntry)
    ctx.registerTopbarItem(youtubeEntry)

    ctx.registerHomeRow({
      id: 'youtube-following-row',
      title: { en: 'YouTube following', sv: 'YouTube följer' },
      showOnHome: false,
      Row: (props) => <YouTubeHomeRow {...props} />,
    })
    ctx.registerHomeSource({
      id: 'youtube-following',
      label: { en: 'YouTube following', sv: 'YouTube följer' },
      rowId: 'youtube-following-row',
    })
  },
}
