import type { LumioPlugin } from '@/lib/plugin-sdk'
import { HomeKitSettingsSection } from './homekit-settings-section'

export const HomeKitPlugin: LumioPlugin = {
  id: 'com.lumio.homekit',
  name: { en: 'HomeKit', sv: 'HomeKit', de: 'HomeKit', fr: 'HomeKit', es: 'HomeKit' },
  version: '0.1.1',
  description: {
    en: 'Connect Lumio playback events to HomeKit scenes and automations.',
    sv: 'Koppla Lumios uppspelning till HomeKit-scener och automationer.',
    de: 'Verbinde Lumio-Wiedergabeereignisse mit HomeKit-Szenen und -Automationen.',
    fr: 'Associez les événements de lecture de Lumio aux scènes et automatisations HomeKit.',
    es: 'Vincula los eventos de reproducción de Lumio con escenas y automatizaciones de HomeKit.',
  },
  preinstalled: true,

  register(ctx) {
    ctx.registerSettingsSection({
      id: 'homekit',
      label: { en: 'HomeKit', sv: 'HomeKit', de: 'HomeKit', fr: 'HomeKit', es: 'HomeKit' },
      Section: HomeKitSettingsSection,
    })
  },
}
