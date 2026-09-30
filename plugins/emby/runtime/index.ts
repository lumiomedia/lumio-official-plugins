import type { LumioPlugin } from '@/lib/plugin-sdk'
import { LIBRARY_BROWSE_PAGE_ID, notifyPluginRegistryChanged } from '@/lib/plugin-sdk'
import { isEmbyConnected, onEmbySettingsChanged } from './emby-storage'
import { embyLibraryProvider } from './emby-library-provider'
import { EmbySection } from './emby-section'
import { EmbyFallbackPage } from './emby-fallback-page'

/**
 * Emby som bibliotek: leverantören fyller kärnans index, inställningarna
 * ansluter och bygger, och menyvalet öppnar värdens biblioteksvy för källan.
 * Ingen egen bläddersida behövs — kärnan äger startsida, sök och spelare.
 */
export const EmbyPlugin: LumioPlugin = {
  id: 'com.lumio.emby',
  name: { en: 'Emby', sv: 'Emby' },
  version: '0.1.0',
  description: {
    en: 'Index your Emby server as a library: home rows, search, details and playback straight from what you own.',
    sv: 'Indexera din Emby-server som bibliotek: startsida, sök, detaljsida och uppspelning direkt ur det du äger.',
  },
  preinstalled: true,

  register(ctx) {
    ctx.registerLibraryProvider(embyLibraryProvider)
    ctx.registerSettingsSection({
      id: 'emby',
      label: { en: 'Emby', sv: 'Emby' },
      Section: EmbySection,
    })
    ctx.registerBrowsePage({
      id: 'emby-setup',
      label: { en: 'Emby', sv: 'Emby' },
      Page: EmbyFallbackPage,
    })
    // Menyvalet är på som standard, precis som Plex och Jellyfin: fliken
    // öppnar kärnans biblioteksvy för källan, och utan index visas
    // reservsidan. (Jellyfin började med `defaultEnabled: false`, och en
    // aktiverad server syntes då aldrig i menyn.)
    ctx.registerMainMenuItem({
      id: 'emby',
      label: { en: 'Emby', sv: 'Emby' },
      defaultEnabled: true,
      /* Bara med en ANSLUTEN server. Registret är statiskt per aktivering, så
         utan det låg posten kvar efter frånkoppling och ledde bara till
         inloggningssidan (samma lärdom som i Jellyfin). */
      visible: () => isEmbyConnected(),
      target: { pageId: LIBRARY_BROWSE_PAGE_ID, params: { provider: 'emby', fallbackPageId: 'emby-setup' } },
    })
    /* Menyn läser `visible` vid varje rendering, men den ritar bara om när
       registret säger till. Utan den här bryggan försvann posten först vid
       nästa omstart. */
    onEmbySettingsChanged(() => notifyPluginRegistryChanged())
  },
}

export default EmbyPlugin
