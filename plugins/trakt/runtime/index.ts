import type { LumioPlugin } from '@/lib/plugin-sdk'
import { traktAuthCapabilityProvider } from './trakt-auth-capability-provider'
import { TraktSettingsSection } from './trakt-settings-section'

export const TraktPlugin: LumioPlugin = {
  id: 'com.lumio.trakt',
  name: { en: 'Trakt', sv: 'Trakt', de: 'Trakt', fr: 'Trakt', es: 'Trakt' },
  version: '0.1.1',
  description: {
    en: 'Sync watched history, watchlists and collection data with Trakt.',
    sv: 'Synka sedda titlar, listor och samling med Trakt.',
    de: 'Synchronisiere Verlauf, Merklisten und Sammlungsdaten mit Trakt.',
    fr: 'Synchronisez l’historique, les listes et les données de collection avec Trakt.',
    es: 'Sincroniza el historial, las listas y los datos de colección con Trakt.',
  },
  preinstalled: true,

  register(ctx) {
    // Drives the connected/not-connected dot next to TRAKT in Settings.
    ctx.registerAuthCapabilityProvider(traktAuthCapabilityProvider)
    ctx.registerSettingsSection({
      id: 'trakt',
      label: { en: 'Trakt', sv: 'Trakt', de: 'Trakt', fr: 'Trakt', es: 'Trakt' },
      Section: TraktSettingsSection,
    })
  },
}
