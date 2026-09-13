import type { M3uChannel } from '../live-tv-data'
import type { EpgProgramme } from '../epg/types'

function norm(s: string): string {
  return s.trim().toLowerCase()
}

export function searchChannels(query: string, channels: M3uChannel[], limit = 30): M3uChannel[] {
  const q = norm(query)
  if (!q) return []
  const prefix: M3uChannel[] = []
  const contains: M3uChannel[] = []
  for (const channel of channels) {
    const name = norm(channel.name)
    if (name.startsWith(q)) prefix.push(channel)
    else if (name.includes(q)) contains.push(channel)
    if (prefix.length >= limit) break
  }
  return [...prefix, ...contains].slice(0, limit)
}

export interface ProgrammeHit { channel: M3uChannel; programme: EpgProgramme }

export function searchProgrammes(
  query: string,
  channels: M3uChannel[],
  scheduleFor: (channel: M3uChannel, fromMs: number, toMs: number) => EpgProgramme[],
  day: { start: number; end: number },
  limit = 30,
): ProgrammeHit[] {
  const q = norm(query)
  if (!q) return []
  const out: ProgrammeHit[] = []
  for (const channel of channels) {
    for (const programme of scheduleFor(channel, day.start, day.end)) {
      if (norm(programme.title).includes(q)) out.push({ channel, programme })
      if (out.length >= limit) return out.sort((a, b) => a.programme.start - b.programme.start)
    }
  }
  return out.sort((a, b) => a.programme.start - b.programme.start)
}

export function suggestions(query: string, channels: M3uChannel[], programmeTitles: string[], limit = 6): string[] {
  const q = norm(query)
  if (!q) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const text of [...channels.map((c) => c.name), ...programmeTitles]) {
    const key = norm(text)
    if (!key.startsWith(q) || seen.has(key)) continue
    seen.add(key)
    out.push(text)
    if (out.length >= limit) break
  }
  return out
}
