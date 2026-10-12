import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { localDayKey } from '../sport-epg'
import { HOUR, fakeCtx, fxDay, fxMatch, mountSport } from '../__sport-fixture'
import { SportFeed } from '../tv/sport-feed'
import { SportFollows } from '../tv/sport-follows'
import { PhoneFollows } from '../mobile/sport-follows-phone'
import { MatchInfoDrawer } from '../match-info/match-info-drawer'

vi.mock('../../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string } }) => <div data-testid="player">{channel.name}</div> }))

/*
  Var lag- och ligasidan öppnas: Dina lag (Flöde), Mina lag (TV och telefon),
  lagnamnen och ligan i matchinfon — och att skalen ritar sidan.
*/

afterEach(cleanup)
const now = Date.now()
const today = localDayKey(now)
const ham = { sport: 'football' as const, kind: 'team' as const, key: 'hammarby', name: 'Hammarby', providerIds: { 'api-sports': '363' } }
const allsv = { sport: 'football' as const, kind: 'league' as const, key: 'allsvenskan', name: 'Allsvenskan' }
const m = fxMatch({ id: 'm', home: 'AIK', away: 'Hammarby', homeKey: 'aik', awayKey: 'hammarby', start: now + 2 * HOUR, homeIds: { 'api-sports': '377' }, awayIds: { 'api-sports': '363' }, coverage: 'full', fixture: { provider: 'api-sports', id: '9', leagueId: '113', season: '2026' } })

describe('Dina lag och Mina lag öppnar sidan', () => {
  it('Flöde: ett lag öppnar lagsidan, en liga ligasidan (inte nästa match)', () => {
    const ctx = fakeCtx({ now, follows: [ham, allsv] })
    render(<SportFeed ctx={ctx} matches={[m]} days={[fxDay(today, [m]), null]} />)
    const [team, league] = screen.getAllByTestId('feed-team')
    fireEvent.click(team)
    expect(ctx.openTeam).toHaveBeenCalledWith(expect.objectContaining({ key: 'hammarby', ids: { 'api-sports': '363' }, league: expect.objectContaining({ id: '113' }) }))
    fireEvent.click(league)
    expect(ctx.openLeague).toHaveBeenCalledWith(expect.objectContaining({ key: 'allsvenskan', ref: expect.objectContaining({ provider: 'api-sports', id: '113' }) }))
    expect(ctx.openMatch).not.toHaveBeenCalled()
  })
  it('Mina lag på TV: raden öppnar lagsidan; hjärtat är kvar för sig', () => {
    const ctx = fakeCtx({ now, follows: [ham] })
    render(<SportFollows ctx={ctx} days={[fxDay(today, [m])]} />)
    fireEvent.click(screen.getByTestId('follow-open'))
    expect(ctx.openTeam).toHaveBeenCalledWith(expect.objectContaining({ name: 'Hammarby' }))
    expect(ctx.openMatch).not.toHaveBeenCalled()
  })
  it('Mina lag på telefon: raden öppnar lagsidan, klockan och hjärtat gör det inte', () => {
    const ctx = fakeCtx({ now, follows: [ham] })
    render(<PhoneFollows ctx={ctx} days={[fxDay(today, [m])]} onAdd={() => {}} />)
    fireEvent.click(screen.getByTestId('sport-phone-follow-bell'))
    expect(ctx.openTeam).not.toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('sport-phone-follow'))
    expect(ctx.openTeam).toHaveBeenCalledTimes(1)
  })
})

describe('Matchinfon', () => {
  it('lagnamnet öppnar lagets sida med källans id; ligan öppnar ligasidan', () => {
    const ctx = fakeCtx({ now })
    render(<MatchInfoDrawer ctx={ctx} match={m} onClose={() => {}} />)
    fireEvent.click(screen.getByTestId('mc-team-away'))
    expect(ctx.openTeam).toHaveBeenCalledWith(expect.objectContaining({ name: 'Hammarby', ids: { 'api-sports': '363' } }))
    fireEvent.click(screen.getByTestId('mc-context'))
    expect(ctx.openLeague).toHaveBeenCalledWith(expect.objectContaining({ ref: expect.objectContaining({ id: '113' }) }))
  })
  it('en liga bara i tablån är ingen länk', () => {
    const ctx = fakeCtx({ now })
    render(<MatchInfoDrawer ctx={ctx} match={fxMatch({ start: now + HOUR })} onClose={() => {}} />)
    fireEvent.click(screen.getByTestId('mc-context'))
    expect(ctx.openLeague).not.toHaveBeenCalled()
  })
})

describe('Skalen ritar sidan', () => {
  const later = fxMatch({ id: 'later', home: 'AIK', away: 'Hammarby', homeKey: 'aik', awayKey: 'hammarby', start: now + 2 * HOUR })
  it('Sport på TV: Mina lag → lagsidan; Bakåt (stäng) tar tillbaka till listan', async () => {
    mountSport({}, { days: { [today]: [later] }, follows: [ham] })
    fireEvent.click(await screen.findByTestId('sport-tab-follows'))
    fireEvent.click(await screen.findByTestId('follow-open'))
    const page = await screen.findByTestId('team-page')
    // Utan nyckel: bara tablåns nästa match, ingen källa frågas.
    expect(within(page).getByTestId('tp-next-card')).toHaveTextContent('Hammarby')
    expect(within(page).getByTestId('tp-no-key')).toBeInTheDocument()
    fireEvent.click(within(page).getByTestId('tp-close'))
    await waitFor(() => expect(screen.queryByTestId('team-page')).toBeNull())
    expect(screen.getByTestId('follow-open')).toBeInTheDocument()
  })
  it('Sport som egen sida och på telefon: samma sida', async () => {
    mountSport({}, { page: true, days: { [today]: [later] }, follows: [ham] })
    fireEvent.click(await screen.findByTestId('sport-tab-follows'))
    fireEvent.click(await screen.findByTestId('follow-open'))
    expect(await screen.findByTestId('team-page')).toBeInTheDocument()
    cleanup()
    mountSport({}, { phone: true, days: { [today]: [later] }, follows: [ham] })
    fireEvent.click(await screen.findByTestId('sport-phone-tab-follows'))
    fireEvent.click(await screen.findByTestId('sport-phone-follow'))
    const sheet = await screen.findByTestId('team-page')
    expect(sheet).toHaveAttribute('data-platform')
    expect(within(sheet).queryByTestId('tp-close')).toBeNull()
  })
  it('ingen sidans anrop går mot källan utan nyckel', async () => {
    const { fetchSpy } = mountSport({}, { days: { [today]: [later] }, follows: [ham] })
    fireEvent.click(await screen.findByTestId('sport-tab-follows'))
    fireEvent.click(await screen.findByTestId('follow-open'))
    await screen.findByTestId('team-page')
    const urls = fetchSpy.mock.calls.map(([u]) => String(u))
    expect(urls.some((u) => u.includes('/api/live-tv/sport/fetch'))).toBe(false)
  })
})
