import { channelKey, type M3uChannel } from './live-tv-data'
import type { EpgProgramme } from './epg/types'

/**
 * Catch-up (repris) — bara Xtream-kanaler med tv_archive. Panelen serverar
 * en avslutad sändning via timeshift-URL:en; M3U-listor har ingen motsvarighet
 * och får därför inga repriskort.
 *
 * Inga egna uppslag: sedan lagring v2 tar funktionerna FÄRDIGA tablåer
 * (`useSchedules(kanaler, nu−arkivfönstret, nu)`) i stället för en EPG-cache
 * att slå i — tablån bor i appen och namnmatchningen görs där.
 */
export interface CatchUpItem {
  channel: M3uChannel
  programme: EpgProgramme
  url: string
  /** När panelen slutar erbjuda sändningen (start + arkivdagar). */
  expiresAt: number
  /** Andel av sändningen som passerat — 1 när den är slut. */
  progress: number
}

export function channelSupportsCatchUp(channel: M3uChannel): boolean {
  const a = channel.archive
  return Boolean(a && a.days > 0 && a.streamId > 0 && a.base && a.username && a.password)
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Xtream timeshift: /timeshift/{user}/{pass}/{minuter}/{YYYY-MM-DD:HH-MM}/{stream_id}.ts (lokal tid hos panelen ≈ klientens). */
export function buildTimeshiftUrl(channel: M3uChannel, startMs: number, durationMs: number): string | null {
  const a = channel.archive
  if (!a || !channelSupportsCatchUp(channel)) return null
  const d = new Date(startMs)
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}:${pad(d.getHours())}-${pad(d.getMinutes())}`
  const minutes = Math.max(1, Math.round(durationMs / 60_000))
  return `${a.base}/timeshift/${encodeURIComponent(a.username)}/${encodeURIComponent(a.password)}/${minutes}/${stamp}/${a.streamId}.ts`
}

/**
 * Repriser för en kanal: sändningar som börjat inom arkivfönstret och redan
 * slutat (pågående program spelas live). Senast först.
 */
export function catchUpForChannel(
  channel: M3uChannel,
  schedule: readonly EpgProgramme[] | null | undefined,
  nowMs: number,
  limit = 12,
): CatchUpItem[] {
  if (!schedule || schedule.length === 0 || !channelSupportsCatchUp(channel)) return []
  const days = channel.archive!.days
  const windowStart = nowMs - days * 86_400_000
  const programmes = schedule.filter((p) => p.stop > windowStart && p.start < nowMs)
  const out: CatchUpItem[] = []
  for (const programme of programmes) {
    if (programme.stop > nowMs || programme.start < windowStart) continue
    const url = buildTimeshiftUrl(channel, programme.start, programme.stop - programme.start)
    if (!url) continue
    out.push({ channel, programme, url, expiresAt: programme.start + days * 86_400_000, progress: 1 })
  }
  return out.sort((left, right) => right.programme.start - left.programme.start).slice(0, limit)
}

/** Repriser över flera kanaler, senast först, max `limit`. `schedulesByKey` är nycklat på `channelKey`. */
export function catchUpAcross(
  channels: readonly M3uChannel[],
  schedulesByKey: Record<string, EpgProgramme[]>,
  nowMs: number,
  limit = 12,
): CatchUpItem[] {
  const all: CatchUpItem[] = []
  for (const channel of channels) {
    if (!channelSupportsCatchUp(channel)) continue
    all.push(...catchUpForChannel(channel, schedulesByKey[channelKey(channel)], nowMs, 4))
  }
  return all.sort((left, right) => right.programme.start - left.programme.start).slice(0, limit)
}

export function expiresLabel(expiresAt: number, nowMs: number): { days: number; hours: number } {
  const ms = Math.max(0, expiresAt - nowMs)
  return { days: Math.floor(ms / 86_400_000), hours: Math.floor(ms / 3_600_000) }
}
