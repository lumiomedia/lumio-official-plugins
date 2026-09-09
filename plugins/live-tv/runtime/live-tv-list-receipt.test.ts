import { describe, expect, it } from 'vitest'
import { getLiveTvLists, upsertLiveTvListFromFetch } from './live-tv-data'

const channel = (name: string) => ({ name, logo: null, group: 'Other', url: `http://stream/${name}`, tvgId: null })

describe('kvitto på hämtad lista', () => {
  it('stämplar fetchedAt vid varje hämtning', () => {
    const first = upsertLiveTvListFromFetch('http://kvitto-ett.tld/get.php', null, [channel('a')])
    expect(first.fetchedAt).toBeTruthy()
    expect(Number.isNaN(Date.parse(first.fetchedAt ?? ''))).toBe(false)

    const stored = getLiveTvLists().find((list) => list.id === first.id)
    expect(stored?.fetchedAt).toBe(first.fetchedAt)
  })

  it('en ny hämtning av samma källa uppdaterar stämpeln', async () => {
    const first = upsertLiveTvListFromFetch('http://kvitto-tva.tld/get.php', null, [channel('a')])
    await new Promise((resolve) => setTimeout(resolve, 2))
    const again = upsertLiveTvListFromFetch('http://kvitto-tva.tld/get.php', null, [channel('a'), channel('b')])

    expect(again.id).toBe(first.id)
    expect(again.channels).toHaveLength(2)
    expect(Date.parse(again.fetchedAt ?? '')).toBeGreaterThan(Date.parse(first.fetchedAt ?? ''))
  })
})
