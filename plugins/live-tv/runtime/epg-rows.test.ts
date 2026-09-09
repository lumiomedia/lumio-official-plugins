import { describe, expect, it, vi } from 'vitest'
import { selectEpgRows } from './epg-rows'
import type { M3uChannel } from './live-tv-data'

const ch = (name: string, group: string): M3uChannel => ({
  name, group, logo: null, url: `http://s/${name}`, tvgId: name,
})

const guideFor = (withGuide: string[]) => (channel: M3uChannel) =>
  withGuide.includes(channel.name) ? [{ title: `${channel.name} nu`, start: 0, stop: 1 }] : []

describe('selectEpgRows', () => {
  it('hoppar över kanaler utan tablå — en tom rad säger inget', () => {
    const channels = [ch('A', 'Sport'), ch('B', 'Sport'), ch('C', 'Sport')]
    const { rows, hasMore } = selectEpgRows(channels, guideFor(['A', 'C']), null, 10)
    expect(rows.map((row) => row.channel.name)).toEqual(['A', 'C'])
    expect(hasMore).toBe(false)
  })

  it('filtrerar på grupp', () => {
    const channels = [ch('A', 'Sport'), ch('B', 'Nyheter'), ch('C', 'Sport')]
    const { rows } = selectEpgRows(channels, guideFor(['A', 'B', 'C']), 'Sport', 10)
    expect(rows.map((row) => row.channel.name)).toEqual(['A', 'C'])
  })

  it('stannar vid gränsen och rapporterar att det finns mer', () => {
    const channels = [ch('A', 'S'), ch('B', 'S'), ch('C', 'S')]
    const { rows, hasMore } = selectEpgRows(channels, guideFor(['A', 'B', 'C']), null, 2)
    expect(rows).toHaveLength(2)
    expect(hasMore).toBe(true)
  })

  it('slutar leta så fort gränsen är nådd — genomsökningen får inte kosta hela listan', () => {
    // 1 100 kanaler i en Xtream-panel: en uppslagning per kanal vid varje
    // minuttick hade ätit upp den prestanda testaren just berömde.
    const channels = Array.from({ length: 1100 }, (_, i) => ch(`K${i}`, 'S'))
    const lookup = vi.fn((channel: M3uChannel) => [{ title: channel.name, start: 0, stop: 1 }])
    const { rows, hasMore } = selectEpgRows(channels, lookup, null, 80)
    expect(rows).toHaveLength(80)
    expect(hasMore).toBe(true)
    // 80 träffar + en till för att veta att det finns mer.
    expect(lookup.mock.calls.length).toBeLessThanOrEqual(81)
  })

  it('hasMore är falskt när gränsen råkar träffa exakt sista kanalen med tablå', () => {
    const channels = [ch('A', 'S'), ch('B', 'S'), ch('C', 'S')]
    const { rows, hasMore } = selectEpgRows(channels, guideFor(['A', 'B']), null, 2)
    expect(rows).toHaveLength(2)
    expect(hasMore).toBe(false)
  })
})
