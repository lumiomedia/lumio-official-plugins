import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { SportMatchday } from './sport-matchday'
import { SportFeed } from './sport-feed'
import { localDayKey } from '../sport-epg'
import { HOUR, MIN, fakeCtx, fxMatch, mountSport } from '../__sport-fixture'
import { __setTvModeForTests } from '@/lib/plugin-sdk'
import { SportReplays } from './sport-replays'

vi.mock('../../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string } }) => <div data-testid="player">{channel.name}</div> }))

afterEach(cleanup)
const now = new Date(2026, 9, 12, 13, 0).getTime()
const dayFrom = new Date(2026, 9, 12, 0, 0).getTime()
const live = fxMatch({ id: 'live', home: 'GAIS', away: 'Sirius', start: now - 30 * MIN, stop: now + 90 * MIN })
// TV4 Fotboll sänder om Mjällby–Degerfors (spelad lör 10/10, 2–0) just nu.
const replay = fxMatch({
  id: 'mjd', home: 'Mjällby AIF', away: 'Degerfors IF', start: now - 60 * MIN, stop: now + 60 * MIN, rerun: true, status: 'finished', coverage: 'full',
  replayOf: { kickoff: new Date(2026, 9, 10, 17, 30).getTime(), score: { home: 2, away: 0 }, fixture: { provider: 'api-sports', id: '1494296' } },
})

describe('Repriser i Matchdag och Flöde (TV/skrivbord)', () => {
  it('Matchdag: egen grupp sist med neutral REPRIS-tagg, originalets resultat och datum; inte i remsan eller tidslinjen', () => {
    const ctx = fakeCtx({ now })
    render(<SportMatchday ctx={ctx} matches={[live]} dayFrom={dayFrom} replays={[replay]} />)
    const section = screen.getByTestId('sport-replays')
    expect(section).toHaveTextContent('Replays')
    const row = within(section).getByTestId('sport-replay-row')
    expect(within(row).getByTestId('replay-tag')).toHaveTextContent('Replay')
    expect(within(row).getByTestId('sport-replay-score')).toHaveTextContent('2–0')
    expect(within(row).getByTestId('sport-replay-meta')).toHaveTextContent(/^Played Sat 10 Oct · Allsvenskan · TV4 Fotboll FHD SE$/)
    expect(row).not.toHaveTextContent(/LIVE|'/)
    expect(screen.queryByTestId('sport-block-mjd')).toBeNull()
    expect(screen.getByTestId('sport-strip').querySelector('[data-match-id="mjd"]')).toBeNull()
    // Gruppen står sist.
    const body = section.parentElement!
    expect(body.lastElementChild).toBe(section)
    fireEvent.click(within(row).getByTestId('sport-replay-play'))
    expect(ctx.watch).toHaveBeenCalledWith(replay)
  })

  it('Flöde: repriser sist, inte i Just nu', () => {
    const ctx = fakeCtx({ now })
    render(<SportFeed ctx={ctx} matches={[live]} days={[null]} replays={[replay]} />)
    expect(within(screen.getByTestId('feed-now')).queryByText(/Mjällby/)).toBeNull()
    expect(screen.getAllByTestId('feed-now-row')).toHaveLength(1)
    expect(within(screen.getByTestId('sport-replays')).getByTestId('sport-replay-row')).toHaveTextContent('Mjällby AIF - Degerfors IF')
  })

  it('utan originalmatch: taggen och tiden, ingen ställning', () => {
    render(<SportMatchday ctx={fakeCtx({ now })} matches={[live]} dayFrom={dayFrom} replays={[{ ...replay, replayOf: undefined }]} />)
    expect(screen.queryByTestId('sport-replay-score')).toBeNull()
    expect(screen.getByTestId('sport-replay-meta')).toHaveTextContent(/^Allsvenskan · TV4 Fotboll FHD SE$/)
  })
})

describe('Repriser i sportskalet', () => {
  it('räknas inte i rubrikens "N live", visas i gruppen, och en dag med bara repriser är inte tom', async () => {
    const t = Date.now()
    const today = localDayKey(t)
    const lv = fxMatch({ id: 'lv', home: 'GAIS', away: 'Sirius', start: t - 30 * MIN, stop: t + 90 * MIN })
    const rp = fxMatch({ id: 'rp', home: 'Mjällby AIF', away: 'Degerfors IF', start: t - 30 * MIN, stop: t + HOUR, rerun: true })
    mountSport({}, { days: { [today]: [lv, rp] } })
    // TV: repriserna är en egen underflik i Matchdag.
    fireEvent.click(await screen.findByTestId('page-tab-replays'))
    expect(await screen.findByTestId('sport-replays')).toHaveTextContent('Mjällby AIF - Degerfors IF')
    expect(screen.getByTestId('sport-summary')).toHaveTextContent('Today · 1 matches · 1 live')
  })
})

describe('Sportens listor i TV-skala (Jerry 2026-10-12)', () => {
  afterEach(() => __setTvModeForTests(false))
  it('reprisraden: text ≥ 24 och rad ≥ 56 på TV; skrivbordet oförändrat', () => {
    const ctx = fakeCtx({ now })
    __setTvModeForTests(true)
    const { unmount } = render(<SportReplays ctx={ctx} matches={[replay]} />)
    const row = screen.getByTestId('sport-replay-row')
    const title = row.querySelector<HTMLElement>('[data-f] > div')!
    expect(parseFloat(title.style.fontSize)).toBeGreaterThanOrEqual(24)
    expect(parseFloat(row.style.minHeight)).toBeGreaterThanOrEqual(56)
    expect(parseFloat(screen.getByTestId('sport-replay-meta').style.fontSize)).toBeGreaterThanOrEqual(20)
    unmount()
    __setTvModeForTests(false)
    render(<SportReplays ctx={ctx} matches={[replay]} />)
    expect(screen.getByTestId('sport-replay-meta').style.fontSize).toBe('15px')
  })
})
