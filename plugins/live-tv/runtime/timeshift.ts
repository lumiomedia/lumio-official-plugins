import { getTvSettings, onTvSettingsChanged, type TvSettings } from './tv/tv-settings-store'

/*
  TIMESHIFT — pausa och spola i direktsändning.

  Appen (mpv) håller en bakre buffert på disk och skickar det sökbara
  intervallet som `cacheRange` via `useMpvPlayer`. Här räknas det om till det
  kromet ritar: hur långt efter sändningen man ligger, var knoppen står och
  om man är vid live-kanten. Inställningen speglas till appen över HTTP så
  mpv får rätt optioner redan när kanalen öppnas.
*/

export interface CacheRange { start: number; end: number }

/** Så nära live-kanten (sekunder) räknas som live: etiketten visar LIVE, inte "−0:02". */
export const LIVE_EDGE_SLACK_S = 3
/** Samma sak för den lokala HLS-bufferten på Android: ExoPlayer ligger några sekunder (sitt liveoffset) efter listans slut. */
export const LIVE_EDGE_SLACK_S_HLS = 8
export const TIMESHIFT_MINUTES = [15, 30, 60] as const
export type TimeshiftMinutes = (typeof TIMESHIFT_MINUTES)[number]
export const TIMESHIFT_API = '/api/live-tv/timeshift/settings'

export function timeshiftModel(a: { range: CacheRange | null; timePos: number }): { available: boolean; behindMs: number; fraction: number; atLive: boolean } {
  const { range, timePos } = a
  if (!range || !(range.end > range.start)) return { available: false, behindMs: 0, fraction: 1, atLive: true }
  const behindS = Math.max(0, range.end - timePos)
  const atLive = behindS <= LIVE_EDGE_SLACK_S
  const fraction = Math.min(1, Math.max(0, (timePos - range.start) / (range.end - range.start)))
  return { available: true, behindMs: atLive ? 0 : Math.round(behindS * 1000), fraction: atLive ? 1 : fraction, atLive }
}

/** "−4:32", "−1:02:05". */
/**
 * Play efter paus: utan buffert laddas kanalen om (livekanten har rullat
 * vidare och en omladdning räddar en hängd motor); med buffert fortsätter
 * bilden där den stannade. `<video>` sköter sin egen buffert.
 */
export function resumeAction(a: { engine: 'mpv' | 'droid' | 'html'; timeshiftAvailable: boolean }): 'unpause' | 'reload' {
  return a.engine === 'html' || a.timeshiftAvailable ? 'unpause' : 'reload'
}

export function formatBehind(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  return `−${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`
}

export function timeshiftBody(s: Pick<TvSettings, 'timeshiftEnabled' | 'timeshiftMinutes'>): { enabled: boolean; minutes: number } {
  return { enabled: s.timeshiftEnabled, minutes: s.timeshiftMinutes }
}

export async function pushTimeshiftSettings(s: { enabled: boolean; minutes: number }): Promise<void> {
  try {
    await fetch(TIMESHIFT_API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(s) })
  } catch {
    // Äldre app utan rutten, eller nätfel: bufferten blir bara av.
  }
}

/** Speglar inställningen till appen nu och vid varje ändring. */
export function startTimeshiftSettingsSync(): () => void {
  let last = JSON.stringify(timeshiftBody(getTvSettings()))
  void pushTimeshiftSettings(JSON.parse(last) as { enabled: boolean; minutes: number })
  return onTvSettingsChanged(() => {
    const next = JSON.stringify(timeshiftBody(getTvSettings()))
    if (next === last) return
    last = next
    void pushTimeshiftSettings(JSON.parse(next) as { enabled: boolean; minutes: number })
  })
}
