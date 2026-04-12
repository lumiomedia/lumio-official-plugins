import { createElement } from 'react'
import type { BrowsePageProps, LumioPlugin } from '@/lib/plugin-sdk'
import { LiveTvSettingsSection } from './live-tv-settings-section'
import { LiveTvHomeOverride } from './live-tv-home-override'
import { LiveTvGrid } from './live-tv-grid'

interface M3uChannel {
  name: string
  logo: string | null
  group: string
  url: string
}

function decodeInitialChannel(params?: BrowsePageProps['params']): M3uChannel | null {
  const url = params?.url?.trim()
  if (!url) return null
  return {
    name: params?.name?.trim() || 'Unknown',
    logo: params?.logo?.trim() || null,
    group: params?.group?.trim() || 'Other',
    url,
  }
}

function LiveTvBrowsePage({ params }: BrowsePageProps) {
  return createElement(LiveTvGrid, { initialChannel: decodeInitialChannel(params) })
}

export const LiveTvPlugin: LumioPlugin = {
  id: 'com.lumio.live-tv',
  name: { en: 'Live TV', sv: 'Live TV' },
  version: '0.1.1',
  description: {
    en: 'Manage M3U sources and browse live TV channels.',
    sv: 'Hantera M3U-kallor och bladdra bland live-TV-kanaler.',
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
