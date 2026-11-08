'use client'

import { useCallback } from 'react'
import { channelKey, type M3uChannel } from './live-tv-data'
import type { EpgProgramme } from './epg/types'
import { planFromNow } from './recording-plan'
import { recordingFor, scheduleRecording, stopRecording, useRecordings, type Recording } from './recordings'
import { recordMargins, useTvSettings } from './tv/tv-settings-store'

/**
 * Inspelningsknappens tillstånd för kanalen i spelaren: det som spelas in på
 * kanalen just nu (oavsett program), och ett växlande start/stopp.
 *
 * En egen krok i stället för en prop från skalet: `buildTvPlayerProps` är
 * ren och anropas från tre ytor (skalet, startsideöverstyrningen, rutnätet),
 * och listan är asynkron. Så får alla ytor knappen utan nya props.
 */
export function useChannelRecording(channel: M3uChannel, now: EpgProgramme | null, nowMs: number): {
  enabled: boolean
  active: Recording | undefined
  toggle: () => Promise<void>
} {
  const settings = useTvSettings()
  const { list } = useRecordings(false)
  const active = recordingFor(list, channelKey(channel), null)
  const toggle = useCallback(async () => {
    try {
      if (active) await stopRecording(active.id)
      else await scheduleRecording(planFromNow(channel, now, nowMs, recordMargins(settings)))
    } catch {
      // Appen svarar med fel (t.ex. ingen lagringsplats): listan uppdateras ändå, knappen står kvar.
    }
  }, [active, channel, now, nowMs, settings])
  return { enabled: settings.recordingEnabled, active, toggle }
}
