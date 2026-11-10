'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { channelKey, type M3uChannel } from './live-tv-data'
import type { EpgProgramme } from './epg/types'
import { planFromNow } from './recording-plan'
import { RecordRequestError, recordingFor, scheduleRecording, stopRecording, useRecordings, type Recording } from './recordings'
import { recordMargins, useTvSettings } from './tv/tv-settings-store'

/**
 * Inspelningsknappens tillstånd för kanalen i spelaren: det som spelas in på
 * kanalen just nu (oavsett program), och ett växlande start/stopp.
 *
 * En egen krok i stället för en prop från skalet: `buildTvPlayerProps` är
 * ren och anropas från tre ytor (skalet, startsideöverstyrningen, rutnätet),
 * och listan är asynkron. Så får alla ytor knappen utan nya props.
 */
export type RecordingError =
  | { kind: 'noSpace'; freeBytes: number; keepFreeBytes: number }
  | { kind: 'failed'; message: string }

const RECORD_ERROR_MS = 6_000

function recordingErrorFrom(e: unknown): RecordingError {
  if (e instanceof RecordRequestError && e.status === 507) {
    const data = (e.data ?? {}) as { freeBytes?: unknown; keepFreeBytes?: unknown }
    return { kind: 'noSpace', freeBytes: Number(data.freeBytes ?? 0), keepFreeBytes: Number(data.keepFreeBytes ?? 0) }
  }
  return { kind: 'failed', message: e instanceof Error ? e.message : String(e) }
}

export function useChannelRecording(channel: M3uChannel, now: EpgProgramme | null, nowMs: number): {
  enabled: boolean
  active: Recording | undefined
  toggle: () => Promise<void>
  /** Varför senaste tryck inte gav en inspelning; visas vid knappen i sex sekunder. */
  error: RecordingError | null
} {
  const settings = useTvSettings()
  const { list } = useRecordings(false)
  const active = recordingFor(list, channelKey(channel), null)
  // Ett tryck i taget: tills svaret kommit ignoreras nya tryck (dubbeltryck, otålig fjärr).
  const busy = useRef(false)
  const [error, setError] = useState<RecordingError | null>(null)
  useEffect(() => {
    if (!error) return
    const timer = window.setTimeout(() => setError(null), RECORD_ERROR_MS)
    return () => window.clearTimeout(timer)
  }, [error])
  const toggle = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    try {
      if (active) await stopRecording(active.id)
      else await scheduleRecording(planFromNow(channel, now, nowMs, recordMargins(settings)))
      setError(null)
    } catch (e) {
      // Appen svarade med fel: 507 = disken ligger redan under marginalen
      // (Jerry 2026-11-10, Mi TV med 1,5 GB ledigt) — tidigare stod knappen
      // bara kvar och inspelningen dök upp som "disk full" med noll byte.
      setError(recordingErrorFrom(e))
    } finally {
      busy.current = false
    }
  }, [active, channel, now, nowMs, settings])
  return { enabled: settings.recordingEnabled, active, toggle, error }
}
