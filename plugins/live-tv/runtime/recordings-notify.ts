import { hasPendingRecordings, refreshRecordings, type RecStatus, type Recording } from './recordings'

/*
  NOTISER OM INSPELNINGAR.

  Appen äger jobben och skickar inga händelser; pluginet pollar listan (den
  delade cachen i recordings.ts) och jämför med förra ögonblicksbilden.
  Var 30:e sekund medan något jobb väntar eller pågår, annars var 5:e minut.
*/

export type RecEvent = { kind: 'started' | 'finished' | 'failed'; recording: Recording }

export const RECORDING_WATCH_ACTIVE_MS = 30_000
export const RECORDING_WATCH_IDLE_MS = 5 * 60_000

const FINISHED: RecStatus[] = ['done', 'stopped']
const FAILED: RecStatus[] = ['failed', 'disk_full', 'missed']

/** Övergångarna sedan förra listan. Första ögonblicksbilden (`prev === null`) ger inget. */
export function diffRecordings(prev: Recording[] | null, next: Recording[]): RecEvent[] {
  if (prev === null) return []
  const before = new Map(prev.map((r) => [r.id, r]))
  const events: RecEvent[] = []
  for (const r of next) {
    const p = before.get(r.id)
    if (p?.status === r.status) continue
    if (r.status === 'recording') {
      events.push({ kind: 'started', recording: r })
    } else if (p && FINISHED.includes(r.status) && (p.status === 'recording' || p.status === 'scheduled')) {
      // Ett planerat jobb som avbröts via Stopp räknas inte som klart; bara pågående → klart.
      if (p.status === 'recording') events.push({ kind: 'finished', recording: r })
    } else if (p && FAILED.includes(r.status)) {
      events.push({ kind: 'failed', recording: r })
    }
  }
  return events
}

export function startRecordingWatch(onEvent: (e: RecEvent) => void): () => void {
  let prev: Recording[] | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let stopped = false
  const tick = async () => {
    if (stopped) return
    const list = await refreshRecordings()
    if (stopped) return
    if (list) {
      for (const e of diffRecordings(prev, list.recordings)) onEvent(e)
      prev = list.recordings
    }
    timer = setTimeout(() => { void tick() }, hasPendingRecordings(list) ? RECORDING_WATCH_ACTIVE_MS : RECORDING_WATCH_IDLE_MS)
  }
  void tick()
  return () => {
    stopped = true
    if (timer) clearTimeout(timer)
  }
}
