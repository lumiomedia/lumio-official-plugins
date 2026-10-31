import { describe, expect, it } from 'vitest'

import { buildNameToTvgIdIndex, normalizeChannelName, normalizeTvgId, resolveTvgId } from './name-match'

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

/* Diakritiska tecken viks i stället för att strykas (Jerry 2026-10-31, listan från konkurrenten):
   "Ålesund" och "Alesund" ska ge samma stam, och å/ä/ö får inte bara försvinna. */
describe('normalizeChannelName viker diakritiska tecken', () => {
  it('å/ä/ö och andra accenter blir sina grundbokstäver', () => {
    expect(normalizeChannelName('Sjuan Ålesund')).toBe(normalizeChannelName('Sjuan Alesund'))
    expect(normalizeChannelName('Café Télé')).toBe('cafetele')
    expect(normalizeChannelName('Søndag Æble')).toBe('sondagaeble')
    expect(normalizeChannelName('TV Öresund')).toBe('tvoresund')
  })
  it('regionorden tas bort även när de skrivs med å/ä/ö', () => {
    expect(normalizeChannelName('SVT1 Skåne')).toBe(normalizeChannelName('SVT1'))
    expect(normalizeChannelName('SVT1 Väst')).toBe(normalizeChannelName('SVT1'))
  })
})
