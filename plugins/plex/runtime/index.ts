// lib/plugins/plex/index.ts
// Plex plugin — registers Plex settings section.
// PlexSection will be extracted from settings-panel.tsx in Task 5.

import { plexLibraryProvider } from './plex-library-provider'
import type { LumioPlugin } from '@/lib/plugin-sdk'
import { plexPlaybackCapabilityProvider } from './playback-capability-provider'
import { PlexBrowsePage } from './plex-browse-page'
import { PlexHomeOverride } from './plex-home-override'
import { PlexSection } from './plex-section'
import { plexEpisodeSidebarProvider } from './episode-sidebar-provider'
import { plexSyncIdentityProvider } from './sync-identity-provider'

export const PlexPlugin: LumioPlugin = {
  id: 'com.lumio.plex',
  name: { en: 'Plex', sv: 'Plex', de: 'Plex', fr: 'Plex', es: 'Plex' },
  version: '1.0.26',
  description: {
    en: 'Browse and play media from your Plex Media Server.',
    sv: 'Bläddra i och spela upp media från din Plex Media Server.',
    de: 'Durchsuche und spiele Medien von deinem Plex Media Server ab.',
    fr: 'Parcourez et lisez les médias de votre Plex Media Server.',
    es: 'Explora y reproduce contenido de tu Plex Media Server.',
  },
  preinstalled: true,

  register(ctx) {
    ctx.registerPlaybackCapabilityProvider(plexPlaybackCapabilityProvider)
    ctx.registerLibraryProvider(plexLibraryProvider)
    ctx.registerSyncIdentityProvider(plexSyncIdentityProvider)
    ctx.registerSettingsSection({
      id: 'plex',
      label: { en: 'Plex', sv: 'Plex', de: 'Plex', fr: 'Plex', es: 'Plex' },
      Section: PlexSection,
    })
    ctx.registerBrowsePage({
      id: 'plex-browse',
      label: { en: 'Plex', sv: 'Plex', de: 'Plex', fr: 'Plex', es: 'Plex' },
      Page: PlexBrowsePage,
    })
    // Menyvalet öppnar kärnans biblioteksvy för Plex-källan: startsidans
    // rader, hero, sök och Visa alla — allt filtrerat mot indexet — utan att
    // Plex behöver vara startsida. Pluginets egen bläddersida finns kvar som
    // reserv för appar utan biblioteksvyn.
    ctx.registerMainMenuItem({
      id: 'plex',
      label: { en: 'Plex', sv: 'Plex', de: 'Plex', fr: 'Plex', es: 'Plex' },
      defaultEnabled: true,
      target: { pageId: 'library', params: { provider: 'plex', fallbackPageId: 'plex-browse' } },
    })
    ctx.registerEpisodeSidebarProvider(plexEpisodeSidebarProvider)
    ctx.registerHomeOverride({
      id: 'plex-home',
      label: { en: 'Plex', sv: 'Plex', de: 'Plex', fr: 'Plex', es: 'Plex' },
      View: PlexHomeOverride,
    })
  },
}
