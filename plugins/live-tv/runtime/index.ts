import { createElement } from 'react'
import type { BrowsePageProps, LumioPlugin } from '@/lib/plugin-sdk'
import { LiveTvSettingsSection } from './live-tv-settings-section'
import { LiveTvHomeOverride } from './live-tv-home-override'
import { LiveTvGrid } from './live-tv-grid'
import { useEpgNowNextLater } from './hooks/useEpgNowNextLater'
import { useEpgLoadStatus } from './hooks/useEpgLoadStatus'

declare global {
  interface Window {
    __LumioLiveTvEpg?: {
      useEpgNowNextLater: typeof useEpgNowNextLater
      useEpgLoadStatus: typeof useEpgLoadStatus
      version: string
    }
  }
}

if (typeof window !== 'undefined') {
  window.__LumioLiveTvEpg = {
    useEpgNowNextLater,
    useEpgLoadStatus,
    version: '0.3.0',
  }
}

interface M3uChannel {
  name: string
  logo: string | null
  group: string
  url: string
  tvgId: string | null
}

function decodeInitialChannel(params?: BrowsePageProps['params']): M3uChannel | null {
  const url = params?.url?.trim()
  if (!url) return null
  return {
    name: params?.name?.trim() || 'Unknown',
    logo: params?.logo?.trim() || null,
    group: params?.group?.trim() || 'Other',
    url,
    tvgId: params?.tvgId?.trim() || null,
  }
}

function LiveTvBrowsePage({ params }: BrowsePageProps) {
  return createElement(LiveTvGrid, { initialChannel: decodeInitialChannel(params) })
}

export const LiveTvPlugin: LumioPlugin = {
  id: 'com.lumio.live-tv',
  name: { en: 'Live TV', sv: 'Live TV' },
  version: '0.3.0',
  description: {
    en: 'Manage M3U sources, browse live TV channels, and see EPG (now/next) inside Lumio.',
    sv: 'Hantera M3U-källor, bläddra bland live-TV-kanaler och se EPG (nu/härnäst) i Lumio.',
  },
  preinstalled: true,

  register(ctx) {
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
    ctx.registerBrowsePage({
      id: 'live-tv-browse',
      label: { en: 'Live TV', sv: 'Live TV' },
      Page: LiveTvBrowsePage,
    })
  },
}
