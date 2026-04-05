import type { LumioPlugin } from '@/lib/plugin-sdk'
import { PlexSection } from '@/components/settings/plex-section'
import { plexPlaybackCapabilityProvider } from './playback-capability-provider'

export const PlexPlugin: LumioPlugin = {
  id: 'com.lumio.plex',
  name: { en: 'Plex', sv: 'Plex' },
  version: '1.0.0',
  description: {
    en: 'Browse and play media from your Plex Media Server.',
    sv: 'Bladdra i och spela upp media fran din Plex Media Server.',
  },
  preinstalled: true,

  register(ctx) {
    ctx.registerPlaybackCapabilityProvider(plexPlaybackCapabilityProvider)
    ctx.registerSettingsSection({
      id: 'plex',
      label: { en: 'Plex', sv: 'Plex' },
      Section: PlexSection,
    })
  },
}
