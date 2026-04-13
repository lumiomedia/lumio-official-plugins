// lib/plugins/plex/index.ts
// Plex plugin — pre-installed, registers Plex settings section.
// PlexSection will be extracted from settings-panel.tsx in Task 5.

import type { LumioPlugin } from '@/lib/plugin-sdk'
import { PlexSection } from '@/components/settings/plex-section'
import { plexPlaybackCapabilityProvider } from './playback-capability-provider'
import { PlexHomeOverride } from './plex-home-override'
import { plexSyncIdentityProvider } from './sync-identity-provider'

export const PlexPlugin: LumioPlugin = {
  id: 'com.lumio.plex',
  name: { en: 'Plex', sv: 'Plex' },
  version: '1.0.2',
  description: {
    en: 'Browse and play media from your Plex Media Server.',
    sv: 'Bladdra i och spela upp media från din Plex Media Server.',
  },
  preinstalled: true,

  register(ctx) {
    ctx.registerPlaybackCapabilityProvider(plexPlaybackCapabilityProvider)
    ctx.registerSyncIdentityProvider(plexSyncIdentityProvider)
    ctx.registerSettingsSection({
      id: 'plex',
      label: { en: 'Plex', sv: 'Plex' },
      Section: PlexSection,
    })
    ctx.registerHomeOverride({
      id: 'plex-home',
      label: { en: 'Plex', sv: 'Plex' },
      View: PlexHomeOverride,
    })
  },
}
