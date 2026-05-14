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

export async function fetchEpg(urls: string[]): Promise<EpgCacheEntry> {
  if (urls.length === 0) throw new Error('No URLs provided')
  const res = await fetch('/api/xmltv', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ urls }),
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
