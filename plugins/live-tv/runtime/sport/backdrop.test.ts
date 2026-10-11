import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { __resetBackdropForTests, backdropSrc, chooseSportBackdrop, resolveCustomBackdrop, useHeroTeamArt } from './backdrop'
import { apiSports } from './api-sports'
import { theSportsDb } from './thesportsdb'
import { mergeLinked } from './merge'
import footballDate from './__fixtures__/api-sports/football-fixtures-date.json'
import lookupteam from './__fixtures__/thesportsdb/lookupteam.json'
import type { SportMatch } from './sport-model'

const h = vi.hoisted(() => ({ run: vi.fn() }))
vi.mock('./budget', async () => {
  const { theSportsDb: provider } = await import('./thesportsdb')
  return { currentBudget: () => ({ provider, run: h.run }) }
})

const VENUE = 'https://media.api-sports.io/football/venues/1460.png'
const art = { stadium: 'https://r2.thesportsdb.com/images/media/team/stadium/malmo.jpg', fanart: 'https://r2.thesportsdb.com/images/media/team/fanart/malmo1.jpg' }
const hero = { kind: 'football' as const, venueImage: null as string | null }
const base = { mode: 'auto' as const, hasKey: true, hero, art: null, custom: null }
const DAY = { today: '2026-10-10', tz: 'Europe/Stockholm', dayEndMs: Date.UTC(2026, 9, 10, 22) }

describe('chooseSportBackdrop', () => {
  it('Automatisk: arenan, sedan lagets arenabild, sedan fanart, sist sportens gradient', () => {
    expect(chooseSportBackdrop({ ...base, hero: { ...hero, venueImage: VENUE }, art })).toEqual({ kind: 'image', url: VENUE, from: 'venue' })
    expect(chooseSportBackdrop({ ...base, art })).toEqual({ kind: 'image', url: art.stadium, from: 'stadium' })
    expect(chooseSportBackdrop({ ...base, art: { stadium: null, fanart: art.fanart } })).toEqual({ kind: 'image', url: art.fanart, from: 'fanart' })
    expect(chooseSportBackdrop(base)).toEqual({ kind: 'gradient', sport: 'football' })
  })
  it('utan nyckel eller utan hero: neutral gradient, aldrig en bild ur källan', () => {
    expect(chooseSportBackdrop({ ...base, hasKey: false, hero: { ...hero, venueImage: VENUE }, art })).toEqual({ kind: 'gradient', sport: 'football' })
    expect(chooseSportBackdrop({ ...base, hero: null })).toEqual({ kind: 'gradient', sport: 'other' })
  })
  it('en bild som inte gick att ladda hoppas över', () => {
    expect(chooseSportBackdrop({ ...base, hero: { ...hero, venueImage: VENUE }, art, broken: new Set([VENUE]) })).toEqual({ kind: 'image', url: art.stadium, from: 'stadium' })
    expect(chooseSportBackdrop({ ...base, art, broken: new Set([art.stadium, art.fanart]) })).toEqual({ kind: 'gradient', sport: 'football' })
  })
  it('Egen bild gäller även utan nyckel; saknas bilden blir det gradient', () => {
    expect(chooseSportBackdrop({ ...base, mode: 'custom', hasKey: false, custom: 'data:image/png;base64,AA' })).toEqual({ kind: 'image', url: 'data:image/png;base64,AA', from: 'custom' })
    expect(chooseSportBackdrop({ ...base, mode: 'custom', custom: null })).toEqual({ kind: 'gradient', sport: 'football' })
  })
  it('Av: ingenting, inte ens med arena', () => {
    expect(chooseSportBackdrop({ ...base, mode: 'off', hero: { ...hero, venueImage: VENUE } })).toEqual({ kind: 'none' })
  })
})

describe('bildens källor', () => {
  it('Egen bild slås upp i startsidans lista per index, eller är länken', () => {
    expect(resolveCustomBackdrop({ from: 'home', index: 1 }, ['a', 'b'])).toBe('b')
    expect(resolveCustomBackdrop({ from: 'home', index: 5 }, ['a'])).toBeNull()
    expect(resolveCustomBackdrop({ from: 'url', url: 'https://x/y.jpg' }, [])).toBe('https://x/y.jpg')
    expect(resolveCustomBackdrop(null, ['a'])).toBeNull()
  })
  it('källornas bilder går genom appens bildcache; Egen bild används som den är', () => {
    expect(backdropSrc({ kind: 'image', url: VENUE, from: 'venue' })).toBe('/api/live-tv/sport/image?src=' + encodeURIComponent(VENUE))
    expect(backdropSrc({ kind: 'image', url: 'data:image/png;base64,AA', from: 'custom' })).toBe('data:image/png;base64,AA')
    expect(backdropSrc({ kind: 'image', url: 'https://min.server/bild.jpg', from: 'custom' })).toBe('https://min.server/bild.jpg')
  })
  it('API-Sports: arenans bild ur fixturens venue-id utan anrop, och den följer med in i SportMatch', () => {
    const [live] = apiSports.day('football', '2026-10-10', DAY).parse([footballDate])
    expect(live!.venueImage).toBe(VENUE)
    expect(apiSports.teamArt('football', '375')).toBeNull()
    const [merged] = mergeLinked({ epg: [], fixtures: [live!], links: {}, overrides: {}, coverage: () => 'full' })
    expect(merged!.venueImage).toBe(VENUE)
  })
  it('TheSportsDB: lookupteam ger arenabild och fanart, cachas 30 dygn', () => {
    const call = theSportsDb.teamArt('football', '134001')!
    expect(call.requests).toEqual([{ sport: 'football', path: '/v1/lookupteam.php?id=134001', ttlS: 2_592_000 }])
    expect(call.parse([lookupteam])).toEqual(art)
    expect(call.parse([{ teams: null }])).toBeNull()
  })
})

describe('useHeroTeamArt', () => {
  const tsdbHero = (over: Partial<SportMatch> = {}) => ({ id: 'x', kind: 'football', venueImage: null, fixture: { provider: 'thesportsdb', id: 'e1' }, homeIds: { thesportsdb: '134001' }, ...over }) as unknown as SportMatch

  it('ett lookupteam per lag genom kvothanteraren, sedan minnet', async () => {
    __resetBackdropForTests()
    h.run.mockReset().mockResolvedValue({ ok: true, data: art, cached: false, fetchedAt: 1 })
    const a = renderHook(() => useHeroTeamArt(tsdbHero()))
    await waitFor(() => expect(a.result.current).toEqual(art))
    const b = renderHook(() => useHeroTeamArt(tsdbHero()))
    expect(b.result.current).toEqual(art)
    expect(h.run).toHaveBeenCalledTimes(1)
    expect(h.run).toHaveBeenCalledWith('search', 'football', expect.objectContaining({ requests: [expect.objectContaining({ path: '/v1/lookupteam.php?id=134001' })] }))
  })
  it('arenabild på hero, ingen hero eller ingen fixtur: inget anrop', () => {
    __resetBackdropForTests()
    h.run.mockReset()
    renderHook(() => useHeroTeamArt(tsdbHero({ venueImage: VENUE })))
    renderHook(() => useHeroTeamArt(null))
    renderHook(() => useHeroTeamArt(tsdbHero({ fixture: undefined })))
    expect(h.run).not.toHaveBeenCalled()
  })
})
