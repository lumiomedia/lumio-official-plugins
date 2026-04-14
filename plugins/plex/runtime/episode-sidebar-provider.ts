import type { EpisodeSidebarProvider, MediaItem } from '@/lib/plugin-sdk'
import { PlexEpisodeSidebar } from './plex-episode-sidebar'

function isPlexItem(item: MediaItem): boolean {
  return (
    (item as { source?: string }).source === 'plex'
    || item.id?.startsWith('plex-')
    || (item.providers ?? []).includes('Plex')
  )
}

export const plexEpisodeSidebarProvider: EpisodeSidebarProvider = {
  id: 'plex-episode-sidebar',
  label: { en: 'Plex Episodes', sv: 'Plex-avsnitt' },
  canProvide(item) {
    return isPlexItem(item) && item.type === 'tv'
  },
  SidebarSection: PlexEpisodeSidebar,
}
