import { createElement } from 'react'
import * as sdk from '@/lib/plugin-sdk'
import { type BrowsePageProps, type LumioPlugin } from '@/lib/plugin-sdk'
import { getLiveTvHideHero, onLiveTvHideHeroChanged } from './live-tv-data'
import { LiveTvSettingsSection } from './live-tv-settings-section'
import { LiveTvHomeOverride } from './live-tv-home-override'
import { LiveTvHub } from './live-tv-hub'
import { LiveTvRemindersMount } from './live-tv-reminders-mount'
import { LiveTvEpgPage } from './live-tv-epg-page'
import { LiveTvChannelPage } from './live-tv-channel-page'
import { useEpgNowNextLater } from './hooks/useEpgNowNextLater'
import { useEpgLoadStatus } from './hooks/useEpgLoadStatus'
import { useChannelSchedule } from './hooks/useChannelSchedule'

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
    version: '0.3.47',
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

// Sidans vyer (params.view): hub (standard), epg, channel. Sökvyn togs bort
// 2026-09-03 (Jerry): kanalsök sker i hubbens egna fält.
//
// Hubben är vyn på ALLA ytor, TV också (Jerry 2026-09-06, "vill ha samma
// Live TV-plugin som på desktop"). Rutnätet var en äldre parallell yta med
// egen sökning och eget urval; på TV levde det kvar ett tag för att det ägde
// fjärrnavigeringen, men hubben, kanalsidan och EPG-sidan bär numera sina
// egna stationer. Rutnätet finns bara kvar för startsideöverstyrningen
// (live-tv-home-override.tsx), som är en annan funktion. En direktlänkad kanal
// utan view öppnar kanalsidan, som klarar samma params (channelFromParams
// faller tillbaka på params när kanalen inte finns i listorna).
function LiveTvBrowsePage({ params, onNavigate }: BrowsePageProps) {
  const view = params?.view
  if (view === 'epg') return createElement(LiveTvEpgPage, { onNavigate })
  if (view === 'channel' || (!view && params?.url)) return createElement(LiveTvChannelPage, { params, onNavigate })
  return createElement(LiveTvHub, { onNavigate })
}

export const LiveTvPlugin: LumioPlugin = {
  id: 'com.lumio.live-tv',
  name: { en: 'Live TV', sv: 'Live TV' },
  version: '0.3.47',
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
    } as Parameters<typeof ctx.registerBrowsePage>[0])
    if (typeof window !== 'undefined') {
      onLiveTvHideHeroChanged(() => {
        const notify = (sdk as unknown as { notifyPluginRegistryChanged?: () => void }).notifyPluginRegistryChanged
        if (typeof notify === 'function') notify()
      })
    }
  },
}
