import type { LumioPlugin } from '@/lib/plugin-sdk'
import { HomeKitSettingsSection } from './homekit-settings-section'

export const HomeKitPlugin: LumioPlugin = {
  id: 'com.lumio.homekit',
  name: { en: 'HomeKit', sv: 'HomeKit' },
  version: '0.1.1',
  description: {
    en: 'Connect Lumio playback events to HomeKit scenes and automations.',
    sv: 'Koppla Lumios uppspelning till HomeKit-scener och automationer.',
  },
  preinstalled: true,

  register(ctx) {
    ctx.registerSettingsSection({
      id: 'homekit',
      label: { en: 'HomeKit', sv: 'HomeKit' },
      Section: HomeKitSettingsSection,
    })
  },
}
