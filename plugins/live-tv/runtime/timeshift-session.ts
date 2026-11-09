import type { CacheRange } from './timeshift'

/*
  TIMESHIFT-SESSIONEN (Android/media3) — klienten mot appens buffert.

  Appen (`live_tv_timeshift_buffer.rs`) äger den enda anslutningen mot
  panelen, reläar den till spelaren (`liveUrl`) och skriver en lokal HLS-
  buffert (`playlistUrl`). Här skapas, pingas och tas sessionen bort; och
  tidslinjens intervall räknas ut — på spellistan ur ExoPlayers livefönster,
  på reläet ur buffertens längd (man står då vid livekanten).
*/

export const TIMESHIFT_SESSION_API = '/api/live-tv/timeshift/session'
export const HEARTBEAT_MS = 15_000

export interface TimeshiftSession { id: string; liveUrl: string; playlistUrl: string }
export interface TimeshiftSessionStatus { ready: boolean; bytes: number; segments: number; seconds: number }

/** `null` när appen inte kan (507 disk, 503 ffmpeg, äldre app, nätfel): spelaren går direktvägen som i dag. */
export async function createTimeshiftSession(url: string, minutes: number): Promise<TimeshiftSession | null> {
  try {
    const res = await fetch(TIMESHIFT_SESSION_API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url, minutes }) })
    if (!res.ok) return null
    const data = (await res.json()) as Partial<TimeshiftSession>
    if (typeof data.id !== 'string' || typeof data.liveUrl !== 'string' || typeof data.playlistUrl !== 'string') return null
    return { id: data.id, liveUrl: data.liveUrl, playlistUrl: data.playlistUrl }
  } catch {
    return null
  }
}

export async function deleteTimeshiftSession(id: string): Promise<void> {
  try {
    await fetch(`${TIMESHIFT_SESSION_API}?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
  } catch {
    // Sessionen dör ändå på tomgång (45 s) i appen.
  }
}

export async function timeshiftSessionStatus(id: string): Promise<TimeshiftSessionStatus | null> {
  try {
    const res = await fetch(`/api/live-tv/timeshift/${encodeURIComponent(id)}/status`)
    if (!res.ok) return null
    const data = (await res.json()) as Partial<TimeshiftSessionStatus>
    return { ready: data.ready === true, bytes: Number(data.bytes ?? 0), segments: Number(data.segments ?? 0), seconds: Number(data.seconds ?? 0) }
  } catch {
    return null
  }
}

/**
 * Hjärtslaget: appens tomgångsregel räknar varje anrop, så en lång paus (där
 * ExoPlayer slutar läsa spellistan) river inte bufferten. `onStatus` får
 * svaret, så reläläget kan rita buffertens längd.
 */
export function startTimeshiftHeartbeat(id: string, onStatus?: (status: TimeshiftSessionStatus) => void, everyMs = HEARTBEAT_MS): () => void {
  const timer = window.setInterval(() => {
    void timeshiftSessionStatus(id).then((status) => { if (status) onStatus?.(status) })
  }, everyMs)
  return () => window.clearInterval(timer)
}

/**
 * Tidslinjens intervall. På spellistan: ExoPlayers livefönster (`duration`
 * är fönstrets längd, positionen fönsterrelativ). På reläet: buffertens
 * längd, och positionen = slutet (livekanten) — så −30 fungerar även innan
 * man pausat.
 */
export function droidTimeshiftRange(a: { onPlaylist: boolean; isLive: boolean; duration: number; bufferSeconds: number }): CacheRange | null {
  if (a.onPlaylist) return a.isLive && a.duration > 0 ? { start: 0, end: a.duration } : null
  return a.bufferSeconds > 0 ? { start: 0, end: a.bufferSeconds } : null
}
