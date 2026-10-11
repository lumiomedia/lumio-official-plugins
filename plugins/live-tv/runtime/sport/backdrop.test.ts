import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import {
  STANDARD_IMAGES, __resetBackdropForTests, backdropPreview, averageRgb, backdropSrc, cardSurfaceVars, chooseSportBackdrop, darkTone, resolveBackdropMode, standardImageFor, useHeroTeamArt,
} from './backdrop'
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
const STD = '/sport-backgrounds/football.webp'
const base = { mode: 'auto' as const, slot: 'all' as const, hasKey: true, hero, art: null, uploads: {}, standard: STD }
const DAY = { today: '2026-10-10', tz: 'Europe/Stockholm', dayEndMs: Date.UTC(2026, 9, 10, 22) }
const std = { kind: 'image', url: STD, from: 'standard' }

describe('en vald medföljande bild', () => {
  it('visas oavsett sport, nyckel och arena', () => {
    expect(chooseSportBackdrop({ ...base, mode: 'image:hockey', hero: { ...hero, venueImage: VENUE }, art })).toEqual({ kind: 'image', url: '/sport-backgrounds/hockey.webp', from: 'standard' })
  })
  it('går den inte att ladda blir det sportens toning', () => {
    expect(chooseSportBackdrop({ ...base, mode: 'image:hockey', broken: new Set(['/sport-backgrounds/hockey.webp']) })).toEqual({ kind: 'gradient', sport: 'football' })
  })
})

describe('backdropPreview (miniatyren i inställningarna)', () => {
  const day = '2026-10-11'
  it('Automatisk från före omtaget utan nyckel visar Standard-bilden, aldrig ingenting', () => {
    expect(backdropPreview({ all: 'auto', sports: {} }, 'football', {}, day)).toEqual({ mode: 'auto', slot: 'all', inherited: true, url: '/sport-backgrounds/football.webp' })
  })
  it('sportens eget val: vald bild, Egen bild med och utan uppladdning, Av', () => {
    const b = { all: 'standard' as const, sports: { hockey: 'image:tennis' as const, tennis: 'custom' as const, football: 'off' as const, basketball: 'custom' as const } }
    expect(backdropPreview(b, 'hockey', {}, day).url).toBe('/sport-backgrounds/tennis.webp')
    expect(backdropPreview(b, 'tennis', { tennis: 3 }, day)).toEqual({ mode: 'custom', slot: 'tennis', inherited: false, url: '/api/live-tv/sport/backdrop?slot=tennis&v=3' })
    expect(backdropPreview(b, 'basketball', {}, day).url).toBe('/sport-backgrounds/basketball.webp')
    expect(backdropPreview(b, 'football', {}, day).url).toBeNull()
  })
  it('Alla sporter på Standard: dagens bild för Alla sporter', () => {
    expect(backdropPreview({ all: 'standard', sports: {} }, 'all', {}, day).url).toBe(standardImageFor('all', day))
  })
})

describe('chooseSportBackdrop', () => {
  it('Automatisk: arenan, sedan lagets arenabild, sedan fanart, sist Standard-bilden', () => {
    expect(chooseSportBackdrop({ ...base, hero: { ...hero, venueImage: VENUE }, art })).toEqual({ kind: 'image', url: VENUE, from: 'venue' })
    expect(chooseSportBackdrop({ ...base, art })).toEqual({ kind: 'image', url: art.stadium, from: 'stadium' })
    expect(chooseSportBackdrop({ ...base, art: { stadium: null, fanart: art.fanart } })).toEqual({ kind: 'image', url: art.fanart, from: 'fanart' })
    expect(chooseSportBackdrop(base)).toEqual(std)
  })
  it('Automatisk utan nyckel eller utan hero: Standard-bilden, aldrig en bild ur källan', () => {
    expect(chooseSportBackdrop({ ...base, hasKey: false, hero: { ...hero, venueImage: VENUE }, art })).toEqual(std)
    expect(chooseSportBackdrop({ ...base, hero: null })).toEqual(std)
  })
  it('Standard: den medföljande bilden även med nyckel och arena', () => {
    expect(chooseSportBackdrop({ ...base, mode: 'standard', hero: { ...hero, venueImage: VENUE }, art })).toEqual(std)
  })
  it('en bild som inte gick att ladda hoppas över; trasig Standard blir sportens gradient', () => {
    expect(chooseSportBackdrop({ ...base, hero: { ...hero, venueImage: VENUE }, art, broken: new Set([VENUE]) })).toEqual({ kind: 'image', url: art.stadium, from: 'stadium' })
    expect(chooseSportBackdrop({ ...base, art, broken: new Set([art.stadium, art.fanart]) })).toEqual(std)
    expect(chooseSportBackdrop({ ...base, mode: 'standard', broken: new Set([STD]) })).toEqual({ kind: 'gradient', sport: 'football' })
  })
  it('Egen bild: den uppladdade bilden för platsen; saknas den på värden blir det Standard', () => {
    const url = '/api/live-tv/sport/backdrop?slot=hockey&v=7'
    expect(chooseSportBackdrop({ ...base, mode: 'custom', slot: 'hockey', hasKey: false, uploads: { hockey: 7 } })).toEqual({ kind: 'image', url, from: 'custom' })
    expect(chooseSportBackdrop({ ...base, mode: 'custom', slot: 'hockey', uploads: { all: 3 } })).toEqual(std)
    expect(chooseSportBackdrop({ ...base, mode: 'custom', slot: 'hockey', uploads: { hockey: 7 }, broken: new Set([url]) })).toEqual(std)
  })
  it('Av: ingenting, inte ens med arena', () => {
    expect(chooseSportBackdrop({ ...base, mode: 'off', hero: { ...hero, venueImage: VENUE } })).toEqual({ kind: 'none' })
  })
})

describe('läge per sport', () => {
  const b = { all: 'auto' as const, sports: { hockey: 'custom' as const } }
  it('en sport med eget val använder sin plats; annars ärvs Alla sporter', () => {
    expect(resolveBackdropMode(b, 'hockey')).toEqual({ mode: 'custom', slot: 'hockey' })
    expect(resolveBackdropMode(b, 'football')).toEqual({ mode: 'auto', slot: 'all' })
    expect(resolveBackdropMode(b, 'all')).toEqual({ mode: 'auto', slot: 'all' })
  })
})

describe('Standard-bilderna', () => {
  it('fem sporter har en egen bild som appen serverar', () => {
    expect(STANDARD_IMAGES).toEqual({
      football: '/sport-backgrounds/football.webp', hockey: '/sport-backgrounds/hockey.webp', basketball: '/sport-backgrounds/basketball.webp',
      motorsport: '/sport-backgrounds/motorsport.webp', tennis: '/sport-backgrounds/tennis.webp',
    })
    expect(standardImageFor('hockey', '2026-10-11')).toBe('/sport-backgrounds/hockey.webp')
  })
  it('handboll, övrigt och Alla sporter: en av dem, samma hela dagen (inget flimmer), olika dagar varierar', () => {
    const all = Object.values(STANDARD_IMAGES)
    for (const scope of ['handball', 'other', 'all'] as const) {
      const a = standardImageFor(scope, '2026-10-11')
      expect(all).toContain(a)
      expect(standardImageFor(scope, '2026-10-11')).toBe(a)
    }
    const days = Array.from({ length: 20 }, (_, i) => standardImageFor('all', `2026-10-${String(i + 1).padStart(2, '0')}`))
    expect(new Set(days).size).toBeGreaterThan(1)
  })
})

describe('kortens bakgrund', () => {
  it('standardvärdena (inget eget val): svart 85 % med oskärpa utanför TV:n', () => {
    expect(cardSurfaceVars({ opacity: 85, tone: 'black' }, null, { blur: true })).toEqual({ '--sport-card-bg': 'rgba(0, 0, 0, 0.85)', '--sport-card-blur': 'blur(14px)' })
    expect(cardSurfaceVars({ opacity: 85, tone: 'black' }, null, { blur: false })['--sport-card-blur']).toBe('none')
  })
  it('mörkgrå, och ton ur bilden (mörkad); utan prov blir tonen svart', () => {
    expect(cardSurfaceVars({ opacity: 50, tone: 'gray' }, null, { blur: false })['--sport-card-bg']).toBe('rgba(28, 29, 34, 0.5)')
    expect(cardSurfaceVars({ opacity: 100, tone: 'image' }, [200, 100, 50], { blur: false })['--sport-card-bg']).toBe(`rgba(${darkTone([200, 100, 50]).join(', ')}, 1)`)
    expect(cardSurfaceVars({ opacity: 0, tone: 'image' }, null, { blur: false })['--sport-card-bg']).toBe('rgba(0, 0, 0, 0)')
  })
  it('tonen hålls mörk nog för vit text', () => {
    const [r, g, bl] = darkTone([250, 250, 250])
    expect(0.2126 * r + 0.7152 * g + 0.0722 * bl).toBeLessThanOrEqual(42)
    expect(darkTone([40, 60, 20])).toEqual([24, 36, 12])
  })
  it('medelfärgen ur pixeldata hoppar över genomskinliga pixlar', () => {
    expect(averageRgb(new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255, 9, 9, 9, 0]))).toEqual([128, 0, 128])
    expect(averageRgb(new Uint8ClampedArray([1, 2, 3, 0]))).toBeNull()
  })
})

describe('bildens källor', () => {
  it('källornas bilder går genom appens bildcache; Standard och Egen bild kommer redan från värden', () => {
    expect(backdropSrc({ kind: 'image', url: VENUE, from: 'venue' })).toBe('/api/live-tv/sport/image?src=' + encodeURIComponent(VENUE))
    expect(backdropSrc({ kind: 'image', url: STD, from: 'standard' })).toBe(STD)
    expect(backdropSrc({ kind: 'image', url: '/api/live-tv/sport/backdrop?slot=all&v=1', from: 'custom' })).toBe('/api/live-tv/sport/backdrop?slot=all&v=1')
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

describe('handboll följer Övrigt, arv sparas uttryckligen', () => {
  it('handbollens matcher läser Övrigts val och plats', () => {
    const b = { all: 'standard' as const, sports: { other: 'off' as const } }
    expect(resolveBackdropMode(b, 'handball')).toEqual({ mode: 'off', slot: 'other' })
    expect(standardImageFor('handball', '2026-10-11')).toBe(standardImageFor('other', '2026-10-11'))
  })
  it('"inherit" = Alla sporters val', () => {
    expect(resolveBackdropMode({ all: 'auto', sports: { football: 'inherit' } }, 'football')).toEqual({ mode: 'auto', slot: 'all' })
    expect(resolveBackdropMode({ all: 'auto', sports: { football: 'standard' } }, 'football')).toEqual({ mode: 'standard', slot: 'football' })
  })
})
