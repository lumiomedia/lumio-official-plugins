import type { M3uChannel } from '../live-tv-data'

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

/**
 * Programsökningen gjordes tidigare här, genom att slå upp hela dagens tablå
 * för varje kanal i minnet. Sedan lagring v2 söker APPEN i tablån
 * (`/api/live-tv/epg/search`) och `hooks/useProgrammeSearch.ts` äger frågan —
 * en genomsökning av 17 000 kanaler per tangenttryck finns inte längre.
 */

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
