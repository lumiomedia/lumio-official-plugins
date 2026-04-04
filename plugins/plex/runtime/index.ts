import type { LumioPlugin } from '@/lib/plugin-sdk'
import { PlexSection } from '@/components/settings/plex-section'

export const PlexPlugin: LumioPlugin = {
  id: 'com.lumio.plex',
  name: 'Plex',
  version: '1.0.0',
  description: 'Browse and play media from your Plex Media Server.',
  preinstalled: true,

  register(ctx) {
    ctx.registerSettingsSection({
      id: 'plex',
      label: 'Plex',
      Section: PlexSection,
    })
  },
}
