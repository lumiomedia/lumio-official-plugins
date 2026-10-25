import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { SportFeed } from './sport-feed'
import { HOUR, MIN, fakeCtx, fxDay, fxMatch, fxSource } from '../__sport-fixture'

afterEach(cleanup)
const now = new Date(2026, 9, 10, 19, 15).getTime()
const live = fxMatch({ id: 'live', home: 'FC Barcelona', away: 'Paris SG', homeKey: 'barcelona', start: now - 30 * MIN, stop: now + 90 * MIN, sources: [fxSource('V Sport Fotboll FHD', { quality: 'FHD' }), fxSource('B'), fxSource('C')] })
const a = fxMatch({ id: 'a', home: 'AIK', away: 'Hammarby', start: now + 35 * MIN })
const b = fxMatch({ id: 'b', home: 'Malmö', away: 'Göteborg', start: now + 60 * MIN })
const c = fxMatch({ id: 'c', home: 'Liverpool', away: 'Chelsea', start: now + 4 * HOUR })
const done = fxMatch({ id: 'done', home: 'Örgryte', away: 'GAIS', start: now - 4 * HOUR, stop: now - 2 * HOUR })
const matches = [done, live, a, b, c]
const follows = [
  { sport: 'football' as const, kind: 'team' as const, key: 'barcelona', name: 'FC Barcelona' },
  { sport: 'football' as const, kind: 'team' as const, key: 'hammarby', name: 'Hammarby' },
  { sport: 'football' as const, kind: 'team' as const, key: 'djurgarden', name: 'Djurgården' },
]

describe('Flöde', () => {
  it('Dina lag: röd ring för live, vit för idag, svag annars; + Lägg till öppnar väljaren', () => {
    const tomorrow = fxMatch({ id: 't', home: 'Djurgården', away: 'IFK', homeKey: 'djurgarden', start: now + 24 * HOUR })
    const ctx = fakeCtx({ now, follows })
    render(<SportFeed ctx={ctx} matches={matches} days={[fxDay('d0', matches), fxDay('d1', [tomorrow])]} />)
    const teams = screen.getAllByTestId('feed-team')
    expect(teams.map((t) => t.getAttribute('data-ring'))).toEqual(['live', 'today', 'none'])
    expect(teams[0]).toHaveTextContent('LIVE')
    expect(teams[2]).toHaveTextContent('Tomorrow')
    fireEvent.click(screen.getByTestId('feed-add'))
    expect(ctx.openFollowPicker).toHaveBeenCalled()
    // Favoriter märks med Live TV:s hjärta, inte en stjärna: AIK–Hammarby i kvällsplanen.
    const planRows = screen.getAllByTestId('feed-plan-row')
    expect(within(planRows[0]!).getByTestId('feed-plan-fav').querySelector('svg path')?.getAttribute('d')).toMatch(/^M12 21s/)
    expect(within(planRows[1]!).queryByTestId('feed-plan-fav')).toBeNull()
  })
  it('Just nu: källchip med antal och kvalitet, spela startar matchen', () => {
    const ctx = fakeCtx({ now, follows })
    render(<SportFeed ctx={ctx} matches={matches} days={[fxDay('d0', matches), null]} />)
    const row = screen.getByTestId('feed-now-row')
    expect(row).toHaveTextContent('FC Barcelona - Paris SG')
    expect(within(row).getByTestId('feed-source-chip')).toHaveTextContent('3 sources · FHD')
    fireEvent.click(within(row).getByTestId('feed-play'))
    expect(ctx.watch).toHaveBeenCalledWith(live)
  })
  it('Kvällsplan: kryssrutan växlar påminnelsen, Din kväll varnar för krockar under 100 min', () => {
    const ctx = fakeCtx({ now, isReminded: (m) => m.id === 'a' || m.id === 'b' })
    render(<SportFeed ctx={ctx} matches={matches} days={[fxDay('d0', matches), null]} />)
    const checks = screen.getAllByTestId('feed-plan-check')
    expect(checks.map((c) => c.getAttribute('aria-checked'))).toEqual(['true', 'true', 'false'])
    fireEvent.click(checks[2]!)
    expect(ctx.toggleRemind).toHaveBeenCalledWith(c)
    const evening = screen.getByTestId('sport-evening')
    expect(evening).toHaveTextContent('2 matches with a reminder')
    expect(within(evening).getAllByTestId('evening-clash')).toHaveLength(2)
    expect(within(screen.getByTestId('feed-finished')).getByText(/Örgryte - GAIS/)).toBeInTheDocument()
  })
  it('Kvällsplan: en match utan kanal (bara resultat) visar "No channel" i stället för en bock som inte gör något', () => {
    const noChannel = { ...c, id: 'nc', home: 'Barcelona', away: 'Real Madrid', homeKey: 'barcelona', awayKey: 'real madrid', sources: [] }
    const ctx = fakeCtx({ now })
    render(<SportFeed ctx={ctx} matches={[...matches, noChannel]} days={[fxDay('d0', [...matches, noChannel]), null]} />)
    const row = screen.getAllByTestId('feed-plan-row').find((r) => r.textContent?.includes('Barcelona - Real Madrid'))!
    expect(within(row).queryByTestId('feed-plan-check')).toBeNull()
    expect(within(row).getByTestId('feed-plan-no-channel')).toHaveTextContent('No channel')
    expect(screen.getAllByTestId('feed-plan-check')).toHaveLength(3)
  })
  it('Din kväll börjar i höjd med kvällsplanens första rad — rubriken står ovanför båda kolumnerna', () => {
    const ctx = fakeCtx({ now })
    render(<SportFeed ctx={ctx} matches={matches} days={[fxDay('d0', matches), null]} />)
    const body = screen.getByTestId('feed-plan-body')
    const list = screen.getAllByTestId('feed-plan-row')[0]!.parentElement!
    expect(list.parentElement).toBe(body)
    expect(screen.getByTestId('sport-evening').parentElement).toBe(body)
    expect(list.firstElementChild).toBe(screen.getAllByTestId('feed-plan-row')[0])
    expect(within(body).queryByText('Evening plan')).toBeNull()
    expect(within(screen.getByTestId('feed-plan')).getByText('Evening plan')).toBeInTheDocument()
  })
})
