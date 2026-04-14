import { type PlaybackCapabilityProvider } from '@/lib/plugin-sdk'
import { findBestPlexMatch, isPlexItemPlayable } from './playback-utils'

export const plexPlaybackCapabilityProvider: PlaybackCapabilityProvider = {
  id: 'plex-playback',
  pluginId: 'com.lumio.plex',
  label: { en: 'Plex', sv: 'Plex' },
  async getCapability({ item }) {
    const source = (item as { source?: string }).source
    if (item.type === 'tv' && source !== 'plex') {
      return {
        canPlay: false,
        showPlayButton: false,
        playVia: 'details',
        reason: 'not_in_library',
        priority: 20,
      }
    }

    // Capability checks can run for many cards in parallel; avoid network fetches
    // here to prevent repeated Plex sync bursts and log spam.
    const matchedItem = await findBestPlexMatch(item, { fetchIfMissing: false })
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
      priority:
        (matchedItem as { source?: string }).source === 'plex' && source === 'plex'
          ? 100
          : 50,
    }
  },
}
