import { createElement } from 'react'
import * as sdk from '@/lib/plugin-sdk'
import { type BrowsePageProps, type LumioPlugin } from '@/lib/plugin-sdk'
import { getLiveTvHideHero, onLiveTvHideHeroChanged } from './live-tv-data'
import { LiveTvSettingsSection } from './live-tv-settings-section'
import { LiveTvHomeOverride } from './live-tv-home-override'
import { LiveTvRemindersMount } from './live-tv-reminders-mount'
import { LiveTvTvShell } from './tv/tv-shell'
import { getVodStreams } from './vod-streams'
import { useEpgNowNextLater } from './hooks/useEpgNowNextLater'
import { useEpgLoadStatus } from './hooks/useEpgLoadStatus'
import { useChannelSchedule } from './hooks/useChannelSchedule'
import { vodLibraryProvider } from './vod-library-provider'

declare global {
  interface Window {
    __LumioLiveTvEpg?: {
      useEpgNowNextLater: typeof useEpgNowNextLater
      useEpgLoadStatus: typeof useEpgLoadStatus
      useChannelSchedule: typeof useChannelSchedule
      version: string
    }
  }
}

if (typeof window !== 'undefined') {
  window.__LumioLiveTvEpg = {
    useEpgNowNextLater,
      useEpgLoadStatus,
      useChannelSchedule,
    version: '0.10.0',
  }
  // Notify late-mounting consumers (e.g. core home-row badges that rendered
  // before the plugin runtime finished loading). The wrapper hook in core
  // listens for this event and re-renders.
  try {
    window.dispatchEvent(new CustomEvent('lumio-live-tv-bridge-ready'))
  } catch {
    // CustomEvent unavailable — fine, the polling fallback will pick it up.
  }
}

const LIVE_TV_BROWSE_PAGE_ID = 'live-tv-browse'

// EN YTA, TRE INMATNINGSVÄGAR (0.6.0).
//
// Här grenade sidan förut på `useTvMode()`: TV fick `tv/`-trädet, skrivbordet
// och telefonen fick hubben, EPG-sidan och kanalsidan. Två parallella
// implementationer av samma sju vyer — varje funktion byggd, testad och
// felsökt två gånger. Grenen är borta: `LiveTvTvShell` renderas överallt,
// och det som faktiskt skiljer ytorna åt är bara INMATNINGEN (fjärr,
// mus, finger) och SKALAN.
//
// `useTvMode()` finns kvar INNE i skalet, för exakt tre skillnader som är
// affordanser och inte vyer: skärmtangentbordet mot ett riktigt textfält,
// "…"-knappen vid hovring, och Bakåt-posten i ikonraden. Ingen av dem ritas
// i TV-läge — TV-designen är godkänd och ska inte ändras.
//
// SKALAN äger värden. `tvSceneBox: true` på sidbidraget nedan ber om TV:ns
// designrymd: appen lindar sidan i en scenlåda (`components/tv/tv-scene-box`)
// som skalar 1080-designpixlar till innehållsytan, medan appens sidomeny och
// rubrik ligger kvar utanför i skärmpixlar. I TV-läge finns ingen låda —
// body-scenen äger skalan där, och två scener hade skalat två gånger.
//
// Sidans params är oförändrade: `view` (hub, guide, favs, channel, search,
// multi, settings) och en direktlänkad kanal via `url`; skalet tolkar dem i
// `viewFromParams`.
export function LiveTvBrowsePage(props: BrowsePageProps) {
  return createElement(LiveTvTvShell, props)
}

export const LiveTvPlugin: LumioPlugin = {
  id: 'com.lumio.live-tv',
  name: { en: 'Live TV', sv: 'Live TV' },
  version: '0.10.0',
  description: {
    en: 'Manage M3U sources, browse live TV channels, and see EPG (now/next) inside Lumio.',
    sv: 'Hantera M3U-källor, bläddra bland live-TV-kanaler och se EPG (nu/härnäst) i Lumio.',
  },
  preinstalled: true,

  register(ctx) {
    // Påminnelser om kommande program, oavsett var i appen man står.
    ctx.registerBootstrap({ id: 'live-tv-reminders', Mount: LiveTvRemindersMount })
    ctx.registerSettingsSection({
      id: 'm3u',
      label: { en: 'Live TV', sv: 'Live TV' },
      Section: LiveTvSettingsSection,
    })
    ctx.registerHomeOverride({
      id: 'live-tv-home',
      label: { en: 'Live TV', sv: 'Live TV' },
      View: LiveTvHomeOverride,
    })
    // hideHero läses av appar från 0.1.57; typen saknas i äldre SDK, därför
    // castet. Vid ändring i inställningarna knuffas registret så heron
    // uppdateras direkt (funktionen finns bara i nyare appar — valfri).
    ctx.registerBrowsePage({
      id: LIVE_TV_BROWSE_PAGE_ID,
      label: { en: 'Live TV', sv: 'Live TV' },
      Page: LiveTvBrowsePage,
      hideHero: () => getLiveTvHideHero(),
      // Värdens scenlåda runt sidan (app 0.1.597). Äldre appar känner inte
      // fältet, hoppar över det och ritar sidan oskalad — därför är
      // minAppVersion höjd i plugin.json i stället för att gissa här.
      tvSceneBox: true,
    } as Parameters<typeof ctx.registerBrowsePage>[0])
    /**
     * Spellistans film och serier som en strömkälla i appens detaljvy.
     *
     * Biblioteket öppnar `movie-<tmdb>`/`tv-<tmdb>` och appen ritar sin
     * vanliga TMDB-sida; Spela-knappen där frågar registrerade leverantörer,
     * inte pluginet. Utan den här registreringen hade detaljvyn varit ett
     * uppslagsverk man inte kunde spela ur.
     *
     * Registreringen är VALFRI: `registerMediaStreamCatalogProvider` kom i en
     * senare SDK, och ett äldre värd ska köra biblioteket ändå — utan
     * Spela-knapp, men med allt annat.
     */
    /*
      VOD SOM BIBLIOTEKSKÄLLA.

      Registreringen är VALFRI på samma sätt som strömkatalogen nedan:
      `registerLibraryProvider` kom i en senare SDK, och ett äldre värd ska
      köra Live TV ändå — utan biblioteksläge, med allt annat.

      Leverantören gör ingenting av sig själv. Källan finns först när någon
      startar en genomgång; tills dess är det här bara ett erbjudande.
    */
    const registerLibrary = (ctx as unknown as {
      registerLibraryProvider?: (provider: unknown) => void
    }).registerLibraryProvider
    if (typeof registerLibrary === 'function') registerLibrary.call(ctx, vodLibraryProvider)

    const registerStreams = (ctx as unknown as {
      registerMediaStreamCatalogProvider?: (provider: {
        id: string
        label: { en: string; sv: string }
        pluginId?: string
        getStreams: (query: {
          mediaType: 'movie' | 'tv'
          tmdbId?: string | null
          season?: number | null
          episode?: number | null
        }) => Promise<{ id: string; label: string; directUrl: string }[]>
      }) => void
    }).registerMediaStreamCatalogProvider
    if (typeof registerStreams === 'function') {
      registerStreams({
        id: 'live-tv-vod',
        label: { en: 'Playlist library', sv: 'Spellistans bibliotek' },
        pluginId: 'com.lumio.live-tv',
        getStreams: (query) => getVodStreams(query),
      })
    }
    if (typeof window !== 'undefined') {
      onLiveTvHideHeroChanged(() => {
        const notify = (sdk as unknown as { notifyPluginRegistryChanged?: () => void }).notifyPluginRegistryChanged
        if (typeof notify === 'function') notify()
      })
    }
  },
}
