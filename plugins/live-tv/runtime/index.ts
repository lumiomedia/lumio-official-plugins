import type { LumioPlugin } from '@/lib/plugin-sdk'
import { LiveTvSettingsSection } from '@/components/settings/live-tv-settings-section'
import { LiveTvHomeOverride } from '@/lib/plugins/live-tv/live-tv-home-override'

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
  },
}
