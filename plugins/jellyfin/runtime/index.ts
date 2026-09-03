import type { LumioPlugin } from '@/lib/plugin-sdk'
import { LIBRARY_BROWSE_PAGE_ID } from '@/lib/plugin-sdk'
import { jellyfinLibraryProvider } from './jellyfin-library-provider'
import { JellyfinSection } from './jellyfin-section'
import { JellyfinFallbackPage } from './jellyfin-fallback-page'

/**
 * Jellyfin som bibliotek: leverantören fyller kärnans index, inställningarna
 * ansluter och bygger, och menyvalet öppnar värdens biblioteksvy för källan.
 * Ingen egen bläddersida behövs — kärnan äger startsida, sök och spelare.
 */
export const JellyfinPlugin: LumioPlugin = {
  id: 'com.lumio.jellyfin',
  name: { en: 'Jellyfin', sv: 'Jellyfin' },
  version: '0.1.0',
  description: {
    en: 'Index your Jellyfin server as a library: home rows, search, details and playback straight from what you own.',
    sv: 'Indexera din Jellyfin-server som bibliotek: startsida, sök, detaljsida och uppspelning direkt ur det du äger.',
  },
  preinstalled: true,

  register(ctx) {
    ctx.registerLibraryProvider(jellyfinLibraryProvider)
    ctx.registerSettingsSection({
      id: 'jellyfin',
      label: { en: 'Jellyfin', sv: 'Jellyfin' },
      Section: JellyfinSection,
    })
    ctx.registerBrowsePage({
      id: 'jellyfin-setup',
      label: { en: 'Jellyfin', sv: 'Jellyfin' },
      Page: JellyfinFallbackPage,
    })
    ctx.registerMainMenuItem({
      id: 'jellyfin',
      label: { en: 'Jellyfin', sv: 'Jellyfin' },
      defaultEnabled: false,
      target: { pageId: LIBRARY_BROWSE_PAGE_ID, params: { provider: 'jellyfin', fallbackPageId: 'jellyfin-setup' } },
    })
  },
}

export default JellyfinPlugin
