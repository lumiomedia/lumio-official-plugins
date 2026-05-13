import type { EpgCacheEntry } from './types'

export async function fetchEpg(urls: string[]): Promise<EpgCacheEntry> {
  if (urls.length === 0) throw new Error('No URLs provided')
  const res = await fetch('/api/xmltv', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ urls }),
  })
  if (!res.ok) throw new Error(`/api/xmltv returned ${res.status}`)
  const data = await res.json()
  if (!data || typeof data !== 'object' || !data.index || typeof data.index !== 'object') {
    throw new Error('Invalid response from /api/xmltv')
  }
  return data as EpgCacheEntry
}
