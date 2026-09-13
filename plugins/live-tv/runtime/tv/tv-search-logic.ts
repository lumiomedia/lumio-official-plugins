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

/**
 * Förslagen räknas vid VARJE tangenttryck. Den gamla versionen byggde först
 * `[...channels.map((c) => c.name), ...programmeTitles]` — två nya arrayer med
 * upp till 17 000 strängar — för att sedan i praktiken läsa de första
 * träffarna av dem. Genomgången sker nu på plats, och avbryts så fort taket är
 * nått.
 */
export function suggestions(query: string, channels: M3uChannel[], programmeTitles: string[], limit = 6): string[] {
  const q = norm(query)
  if (!q) return []
  const seen = new Set<string>()
  const out: string[] = []
  /** Sant när taket är nått och genomgången kan sluta. */
  const take = (text: string): boolean => {
    const key = norm(text)
    if (!key.startsWith(q) || seen.has(key)) return false
    seen.add(key)
    out.push(text)
    return out.length >= limit
  }
  for (const channel of channels) if (take(channel.name)) return out
  for (const title of programmeTitles) if (take(title)) return out
  return out
}
