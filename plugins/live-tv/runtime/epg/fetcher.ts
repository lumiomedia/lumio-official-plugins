import type { EpgCacheEntry, EpgSourceFailure } from './types'

export class EpgFetchError extends Error {
  status: number
  failures: EpgSourceFailure[]

  constructor(message: string, status: number, failures: EpgSourceFailure[] = []) {
    super(message)
    this.name = 'EpgFetchError'
    this.status = status
    this.failures = failures
  }
}

/**
 * Taket är generöst men MÅSTE finnas: XMLTV-filer är stora och servern hämtar
 * OCH parsar dem, så ett svar kan dröja. Utan tak fanns ingen övre gräns alls
 * — hängde anropet blev laddningsläget permanent, för varken felgrenen eller
 * cachen nåddes någonsin. Ett tak gör en långsam källa till ett synligt fel
 * som går att försöka igen, i stället för en guide som aldrig kommer.
 */
const EPG_FETCH_TIMEOUT_MS = 45_000

export async function fetchEpg(urls: string[]): Promise<EpgCacheEntry> {
  if (urls.length === 0) throw new Error('No URLs provided')
  const res = await fetch('/api/xmltv', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ urls }),
    signal: AbortSignal.timeout(EPG_FETCH_TIMEOUT_MS),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const failures = Array.isArray(data?.failures) ? data.failures as EpgSourceFailure[] : []
    throw new EpgFetchError(`/api/xmltv returned ${res.status}`, res.status, failures)
  }
  if (!data || typeof data !== 'object' || !data.index || typeof data.index !== 'object') {
    throw new Error('Invalid response from /api/xmltv')
  }
  return { ...(data as EpgCacheEntry), requestedSources: urls }
}
