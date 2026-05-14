import { describe, expect, it } from 'vitest'

import { buildNameToTvgIdIndex, normalizeTvgId, resolveTvgId } from './name-match'

describe('EPG name matching', () => {
  it('normalizes epgshare bracket-prefixed HD ids to channel-name stems', () => {
    expect(normalizeTvgId('[TV3HD].TV3.HD.se')).toBe('tv3')
    expect(normalizeTvgId('[SVT1HD].SVT1.HD.se')).toBe('svt1')
  })

  it('resolves channel names against epgshare ids', () => {
    const index = buildNameToTvgIdIndex([
      '[SVT1HD].SVT1.HD.se',
      '[TV3HD].TV3.HD.se',
    ])

    expect(resolveTvgId(null, 'SVT 1 Skane SE', index)).toBe('[SVT1HD].SVT1.HD.se')
    expect(resolveTvgId(null, 'TV3 HD SE', index)).toBe('[TV3HD].TV3.HD.se')
  })

  it('falls back to the channel name when explicit tvg-id is not in the cache', () => {
    const index = buildNameToTvgIdIndex(['[TV3HD].TV3.HD.se'])

    expect(resolveTvgId('TV3.se', 'TV3 HD SE', index)).toBe('[TV3HD].TV3.HD.se')
  })

  it('resolves explicit tvg-id aliases before falling back to the channel name', () => {
    const index = buildNameToTvgIdIndex(['[TV3HD].TV3.HD.se'])

    expect(resolveTvgId('TV3HD.se', 'Some other name', index)).toBe('[TV3HD].TV3.HD.se')
  })

  it('uses XMLTV channel display-names as aliases for provider-specific ids', () => {
    const index = buildNameToTvgIdIndex({
      index: {
        'tv3.se.provider-specific': [{ title: 'News', start: 1, stop: 2 }],
      },
      fetchedAt: 1000,
      sources: ['https://example.test/se.xml'],
      sourceStats: [
        {
          url: 'https://example.test/se.xml',
          ok: true,
          channelCount: 1,
          programmeCount: 1,
          channels: [
            {
              id: 'tv3.se.provider-specific',
              displayNames: ['TV3 HD', 'TV3'],
            },
          ],
        },
      ],
    })

    expect(resolveTvgId(null, 'TV3 FHD SE', index)).toBe('tv3.se.provider-specific')
  })
})
