'use client'

import type { TvViewProps } from './tv-shell'
import { ALL_STEP, useHubData } from './hub-data'
import { HubClassic } from './hub-classic'
import { HubExperience } from './hub-experience'
import { TvHubPhone } from './mobile/hub-phone'

// Datahooken bor i `hub-data.ts` (ingen importcykel mot telefongrenen) men
// hör hit: det är hubbens urval, filter och steg.
export { ALL_STEP, useHubData }

/**
 * Kanaler: väljaren. Telefonen har sin egen gren; TV och skrivbord ritar
 * layouten ur inställningarna (`hubLayout`, Klassisk som standard).
 */
export function TvHub(props: TvViewProps) {
  if (props.phone) return <TvHubPhone {...props} />
  if (props.settings.hubLayout === 'experience') return <HubExperience {...props} />
  return <HubClassic {...props} />
}
