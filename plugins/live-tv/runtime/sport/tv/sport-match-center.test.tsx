import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { __resetForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from '../../live-tv-data'
import { SPORT_OVERRIDES_KEY, getFollows, getOverrides } from '../sport-store'
import { SportMatchCenter } from './sport-match-center'
import { MIN, fakeCtx, fxMatch, fxSource } from '../__sport-fixture'

afterEach(cleanup)
beforeEach(() => __resetForTests())
const now = Date.now()
const m = fxMatch({
  id: 'm', home: 'FC Barcelona', away: 'Paris SG', homeKey: 'barcelona', awayKey: 'paris saint germain',
  league: 'Champions League', leagueKey: 'uefa-champions-league', venue: 'Estadi Olímpic', round: 5,
  start: now - 30 * MIN, stop: now + 90 * MIN,
  sources: [fxSource('V Sport Fotboll', { quality: 'FHD' }), fxSource('V Sport Fotboll HD', { quality: 'HD', sourceId: 'src-b' })],
})

describe('Matchcentret', () => {
  it('huvud, källor med BÄST och spellista, ett lager', () => {
    const ctx = fakeCtx({ now })
    render(<SportMatchCenter ctx={ctx} match={m} onClose={() => {}} />)
    const mc = screen.getByTestId('match-center')
    expect(mc).toHaveTextContent('LIVE')
    expect(mc).toHaveTextContent('Champions League · Estadi Olímpic · Round 5')
    const rows = screen.getAllByTestId('mc-source')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('V Sport Fotboll')
    expect(rows[0]).toHaveTextContent('Xtream · —')
    expect(rows[1]).toHaveTextContent('Playlist · —')
    expect(screen.getByTestId('mc-best')).toHaveTextContent('BEST')
    expect(ctx.nav.pushLayer).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(/Lineups|Statistics|Events|goal/i)).toBeNull()
  })
  it('vald källa spelas och lådan stängs', () => {
    const ctx = fakeCtx({ now })
    const onClose = vi.fn()
    render(<SportMatchCenter ctx={ctx} match={m} onClose={onClose} />)
    expect(screen.getByTestId('mc-watch')).toHaveTextContent('Watch · FHD')
    fireEvent.click(screen.getAllByTestId('mc-source')[1]!)
    expect(screen.getAllByTestId('mc-source')[1]!.getAttribute('data-selected')).toBe('1')
    fireEvent.click(screen.getByTestId('mc-watch'))
    expect(ctx.watch).toHaveBeenCalledWith(m, m.sources[1])
    expect(onClose).toHaveBeenCalled()
  })
  it('följ hemma och liga, påminn', () => {
    const ctx = fakeCtx({ now })
    render(<SportMatchCenter ctx={ctx} match={m} onClose={() => {}} />)
    fireEvent.click(screen.getByTestId('mc-follow-home'))
    fireEvent.click(screen.getByTestId('mc-follow-league'))
    expect(getFollows()).toEqual([
      { sport: 'football', kind: 'team', key: 'barcelona', name: 'FC Barcelona' },
      { sport: 'football', kind: 'league', key: 'uefa-champions-league', name: 'Champions League' },
    ])
    fireEvent.click(screen.getByTestId('mc-remind'))
    expect(ctx.toggleRemind).toHaveBeenCalledWith(m)
  })
  it('favoritknapparna: små ikonknappar med märke och hjärta, etiketten säger vad ett tryck gör', () => {
    render(<SportMatchCenter ctx={fakeCtx({ now, follows: [{ sport: 'football', kind: 'team', key: 'barcelona', name: 'FC Barcelona' }] })} match={m} onClose={() => {}} />)
    const home = screen.getByTestId('mc-follow-home')
    expect(home).not.toHaveTextContent('FC Barcelona')
    expect(home.querySelector('[data-crest]')).not.toBeNull()
    expect(home.getAttribute('title')).toBe('Remove FC Barcelona from favourites')
    expect(screen.getByTestId('mc-remind').getAttribute('aria-label')).toBe('Remind me')
    expect(screen.getByTestId('mc-remind').textContent).toBe('')
    expect(home.getAttribute('aria-pressed')).toBe('true')
    expect(home.getAttribute('aria-label')).toBe('Remove FC Barcelona from favourites')
    expect(home.querySelector('svg path')?.getAttribute('d')).toMatch(/^M12 21s/)
    expect(home.getAttribute('style')).not.toMatch(/251, ?191, ?36|fde68a/)
    const league = screen.getByTestId('mc-follow-league')
    expect(league.getAttribute('aria-pressed')).toBe('false')
    expect(league.getAttribute('aria-label')).toBe('Add Champions League to favourites')
  })
  it('åsidosättningen står först som Ditt val och kan tas bort', () => {
    const override = { key: 'C::http://y/C', name: 'C 4K', url: 'http://y/C', logo: null, group: 'Sport', tvgId: null }
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_OVERRIDES_KEY, { m: override })
    render(<SportMatchCenter ctx={fakeCtx({ now, overrides: { m: override } })} match={m} onClose={() => {}} />)
    const first = screen.getAllByTestId('mc-source')[0]!
    expect(first).toHaveTextContent('C 4K')
    expect(first).toHaveTextContent('Your choice')
    fireEvent.click(screen.getByTestId('mc-clear-override'))
    expect(getOverrides().m).toBeUndefined()
  })
})

describe('Matchcentret utgår från var matchen sänds', () => {
  it('titelraden: märkena bredvid varandra, titeln, ställningen och minuten i samma rad', () => {
    const live = { ...m, coverage: 'full' as const, status: 'live' as const, minute: 67, score: { home: 2, away: 1 }, fixture: { provider: 'api-sports' as const, id: '1' } }
    render(<SportMatchCenter ctx={fakeCtx({ now })} match={live} onClose={() => {}} />)
    const head = screen.getByTestId('mc-head')
    expect(head.firstElementChild!.querySelectorAll('[data-crest]')).toHaveLength(2)
    expect(screen.getByTestId('mc-title')).toHaveTextContent('FC Barcelona - Paris SG')
    expect(screen.getByTestId('mc-score')).toHaveTextContent('2–1')
    expect(screen.getByTestId('mc-scoreline')).toHaveTextContent("67'")
  })
  it('Sänds på kommer direkt efter titelraden; Fel kanal? är en textlänk efter källorna; data sist', () => {
    render(<SportMatchCenter ctx={fakeCtx({ now })} match={m} onClose={() => {}} />)
    const mc = screen.getByTestId('match-center')
    const kids = Array.from(mc.children)
    expect(kids[0]).toBe(screen.getByTestId('mc-head'))
    expect(kids[1]).toHaveTextContent('Showing on')
    const order = [screen.getAllByTestId('mc-source')[0]!, screen.getByTestId('mc-watch'), screen.getByTestId('mc-pick-channel')]
    for (let i = 1; i < order.length; i++) expect(order[i - 1]!.compareDocumentPosition(order[i]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const link = screen.getByTestId('mc-pick-channel')
    expect(link.tagName).toBe('SPAN')
    expect(link).toHaveTextContent(/^Wrong channel\?$/)
    expect(link.getAttribute('title')).toBe('Link the match to one of your channels')
  })
})

describe('Matchcentret på skrivbordet', () => {
  it('lådan går hela vägen upp; innehållet går fri från mac-titelraden (--tv-scene-top-inset)', () => {
    // Serverrendering: happy-dom kastar stilvärden med var() i calc().
    const markup = renderToStaticMarkup(<SportMatchCenter ctx={fakeCtx({ now })} match={m} onClose={() => {}} />)
    const host = document.createElement('div')
    host.innerHTML = markup
    const style = host.querySelector('[data-testid="match-center"]')?.outerHTML.match(/style="([^"]*)"/)?.[1] ?? ''
    expect(style).toContain('var(--tv-scene-top-inset, 0px)')
  })
})
