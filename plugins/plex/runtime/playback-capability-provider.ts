import { findBestPlexMatch, isPlexItemPlayable } from '@/lib/playback-capabilities'
import type { PlaybackCapabilityProvider } from '@/lib/plugin-sdk'

export const plexPlaybackCapabilityProvider: PlaybackCapabilityProvider = {
  id: 'plex-playback',
  pluginId: 'com.lumio.plex',
  label: { en: 'Plex', sv: 'Plex' },
  async getCapability({ item }) {
    if (item.type === 'tv' && item.source !== 'plex') {
      return {
        canPlay: false,
        showPlayButton: false,
        playVia: 'details',
        reason: 'not_in_library',
        priority: 20,
      }
    }

    const matchedItem = await findBestPlexMatch(item, { fetchIfMissing: true })
    if (!matchedItem) {
      return {
        canPlay: false,
        showPlayButton: false,
        playVia: 'details',
        reason: 'not_in_library',
        priority: 20,
      }
    }

    const canPlay = isPlexItemPlayable(matchedItem)
    return {
      canPlay,
      showPlayButton: canPlay,
      playVia: 'plex',
      matchedItem,
      reason: canPlay ? undefined : 'not_playable',
      priority: matchedItem.source === 'plex' && item.source === 'plex' ? 100 : 50,
    }
  },
}
