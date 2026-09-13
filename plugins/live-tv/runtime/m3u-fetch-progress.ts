'use client'

/**
 * Hämtningstillståndet för M3U-listor bor UTANFÖR React.
 *
 * Förut låg det i inställningssektionens egen useState, och hela
 * återkopplingen var knappens text ("Hämtar…" → "Klart", nollställd av en
 * setTimeout efter 1,8 s). Två saker gick fel av det, och en betatestare
 * träffade båda: en stor spellista tar tiotals sekunder, och lämnar man
 * inställningarna och kommer tillbaka monteras sektionen om — tillståndet
 * var borta, det såg ut som att ingenting hänt, och hämtningen startades
 * igen ovanpå den som redan pågick (Jerry 2026-09-09: "fattade inte att den
 * fetchade, den gick tillbaka till fetch igen").
 *
 * Därför: modulnivå, prenumeration, och `runM3uFetch` vägrar starta medan en
 * hämtning pågår. Klart-läget har ingen timer — det ligger kvar till nästa
 * hämtning, så kvittot finns även för den som tittar efteråt.
 *
 * Modulen gör inga anrop själv. Anroparen skickar in `fetchOne`, som gör
 * jobbet för en adress och svarar med antalet kanaler; då är stegningen
 * testbar utan nätverk och utan att hämtningslogiken flyttar hit.
 */

export type M3uFetchStatus = 'idle' | 'fetching' | 'done' | 'error'

export interface M3uFetchResult {
  url: string
  channels: number
}

export interface M3uFetchProgress {
  status: M3uFetchStatus
  /** 1-baserat: vilken adress i kön som hämtas just nu. 0 när inget pågår. */
  current: number
  total: number
  /** Adressen som hämtas just nu, för radens text. */
  url: string | null
  /** Klara adresser med kanalantal, i hämtningsordning. */
  results: M3uFetchResult[]
  error: string | null
  /**
   * Importjobbets EGET framsteg (`ImportStatus.received`/`total`) för adressen
   * som hämtas just nu — en stor Xtream-panel eller M3U-lista kan ha tiotusen-
   * tals kanaler och ta lång tid inom ETT steg i kön ovan. `null` när inget
   * jobb rapporterat något än (eller mellan adresser).
   */
  jobProgress: { received: number; total: number | null } | null
}

const IDLE: M3uFetchProgress = {
  status: 'idle',
  current: 0,
  total: 0,
  url: null,
  results: [],
  error: null,
  jobProgress: null,
}

let progress: M3uFetchProgress = IDLE
const listeners = new Set<() => void>()

function publish(next: M3uFetchProgress): void {
  progress = next
  for (const listener of [...listeners]) listener()
}

export function getM3uFetchProgress(): M3uFetchProgress {
  return progress
}

export function subscribeM3uFetch(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Bara för tester: nollar modulens tillstånd mellan fall. */
export function resetM3uFetchProgressForTests(): void {
  progress = IDLE
  listeners.clear()
}

/**
 * Rapporterar in ett pågående jobbs `received`/`total` (t.ex. `importList`s
 * `onProgress`) för adressen som hämtas just nu. No-op utanför en pågående
 * hämtning, så en försenad rapport från ett jobb som redan avslutats (eller
 * som aldrig var en del av en `runM3uFetch`-kö, t.ex. Xtream-sektionens egen
 * hämtning) inte skriver in sig i fel tillstånd.
 */
export function reportM3uFetchJobProgress(received: number, total?: number | null): void {
  if (progress.status !== 'fetching') return
  publish({ ...progress, jobProgress: { received, total: total ?? null } })
}

/**
 * Hämtar varje adress i ordning och stegar tillståndet. Svarar `true` när
 * alla gick igenom, `false` när något föll eller när det inte fanns något
 * att göra (tom kö, eller en hämtning som redan pågår).
 */
export async function runM3uFetch(
  urls: readonly string[],
  fetchOne: (url: string) => Promise<number>,
): Promise<boolean> {
  if (progress.status === 'fetching') return false
  const queue = urls.map((url) => url.trim()).filter(Boolean)
  if (queue.length === 0) return false

  const results: M3uFetchResult[] = []
  publish({ status: 'fetching', current: 1, total: queue.length, url: queue[0], results, error: null, jobProgress: null })

  for (let index = 0; index < queue.length; index += 1) {
    const url = queue[index]
    publish({ ...progress, current: index + 1, url, jobProgress: null })
    try {
      const channels = await fetchOne(url)
      results.push({ url, channels })
      publish({ ...progress, results: [...results], jobProgress: null })
    } catch (err) {
      publish({
        status: 'error',
        current: index + 1,
        total: queue.length,
        url,
        results: [...results],
        error: err instanceof Error ? err.message : String(err),
        jobProgress: null,
      })
      return false
    }
  }

  publish({
    status: 'done',
    current: queue.length,
    total: queue.length,
    url: null,
    results: [...results],
    error: null,
    jobProgress: null,
  })
  return true
}
