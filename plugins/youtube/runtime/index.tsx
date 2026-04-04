import type { LumioPlugin } from '@/lib/plugin-sdk'
import { YouTubeBrowsePage, YouTubeHomeRow } from './youtube-browser'
import { YouTubeSettingsSection } from './youtube-settings-section'

export const YouTubePlugin: LumioPlugin = {
  id: 'com.lumio.youtube',
  name: 'YouTube',
  version: '1.0.0',
  description: 'Browse subscriptions, watch later, playlists and channels from YouTube.',
  preinstalled: true,

  register(ctx) {
    ctx.registerManagedAuthConsumer({
      id: 'youtube-managed-auth',
      label: 'YouTube',
      providerId: 'google-youtube',
    })

    ctx.registerSettingsSection({
      id: 'youtube',
      label: 'YouTube',
      Section: YouTubeSettingsSection,
    })

    ctx.registerBrowsePage({
      id: 'youtube-following',
      label: 'Following',
      Page: YouTubeBrowsePage,
    })
    ctx.registerBrowsePage({
      id: 'youtube-channels',
      label: 'Channels',
      Page: YouTubeBrowsePage,
    })
    ctx.registerBrowsePage({
      id: 'youtube-playlists',
      label: 'Playlists',
      Page: YouTubeBrowsePage,
    })
    ctx.registerBrowsePage({
      id: 'youtube-watch-later',
      label: 'Watch later',
      Page: YouTubeBrowsePage,
    })
    ctx.registerBrowsePage({
      id: 'youtube-playlist',
      label: 'Playlist',
      Page: YouTubeBrowsePage,
    })
    ctx.registerBrowsePage({
      id: 'youtube-channel',
      label: 'Channel',
      Page: YouTubeBrowsePage,
    })

    const youtubeGroup = {
      id: 'youtube',
      label: 'YouTube',
      defaultEnabled: true,
      items: [
        { id: 'youtube-following-item', label: 'Following', target: { pageId: 'youtube-following' } },
        { id: 'youtube-channels-item', label: 'Channels', target: { pageId: 'youtube-channels' } },
        { id: 'youtube-playlists-item', label: 'Playlists', target: { pageId: 'youtube-playlists' } },
        { id: 'youtube-watch-later-item', label: 'Watch later', target: { pageId: 'youtube-watch-later' } },
      ],
    }

    ctx.registerMainMenuItem(youtubeGroup)
    ctx.registerTopbarItem(youtubeGroup)

    ctx.registerHomeRow({
      id: 'youtube-following-row',
      title: 'YouTube following',
      position: 'bottom',
      Row: (props) => <YouTubeHomeRow {...props} kind="following" />,
    })
    ctx.registerHomeRow({
      id: 'youtube-watch-later-row',
      title: 'Watch later',
      position: 'bottom',
      Row: (props) => <YouTubeHomeRow {...props} kind="watch-later" />,
    })
    ctx.registerHomeRow({
      id: 'youtube-playlists-row',
      title: 'YouTube playlists',
      position: 'bottom',
      Row: (props) => <YouTubeHomeRow {...props} kind="playlists" />,
    })
  },
}
