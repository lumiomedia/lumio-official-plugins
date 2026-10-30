import { describe, expect, it } from 'vitest'
import { XP_ALL, buildExperienceRows, type XpInput } from './hub-experience-data'
import { FAVS_GROUP } from './tv-guide-shared'
import type { M3uChannel } from '../live-tv-data'
import type { EpgProgramme } from '../epg/types'
import type { CatchUpItem } from '../catch-up'
import type { SportMatch } from '../sport/sport-model'

const now = 1_800_000_000_000
const ch = (name: string, group: string): M3uChannel => ({ name, logo: null, group, url: `http://x/${name}`, tvgId: null })
const S1 = ch('S1', 'Sport'), S2 = ch('S2', 'Sport'), N1 = ch('N1', 'News'), K1 = ch('K1', 'Kids')
const live = (title: string): EpgProgramme => ({ title, start: now - 600_000, stop: now + 600_000 })
const nowFor = (c: M3uChannel) => ({ now: c === K1 ? null : live(`Now ${c.name}`), next: null, later: null })
const replay = (channel: M3uChannel, title: string): CatchUpItem => ({ channel, programme: { title, start: now - 7_200_000, stop: now - 3_600_000 }, url: `http://x/r/${title}`, expiresAt: now + 86_400_000, progress: 1 })

const base = (over: Partial<XpInput> = {}): XpInput => ({
  channels: [S1, S2, N1, K1],
  favourites: [N1],
  recent: [S2],
  nowFor,
  replays: [replay(S1, 'Match')],
  soon: [
    { channel: N1, programme: { title: 'Late news', start: now + 30 * 60_000, stop: now + 60 * 60_000 } },
    { channel: S2, programme: { title: 'Too late', start: now + 3 * 3_600_000, stop: now + 4 * 3_600_000 } },
    { channel: S2, programme: { title: 'Kickoff', start: now + 10 * 60_000, stop: now + 100 * 60_000 } },
  ],
  groups: ['Sport', 'News', 'Kids'],
  counts: new Map([['Sport', 2], ['News', 1], ['Kids', 1]]),
  chip: null,
  nowMs: now,
  ...over,
})
const ids = (out: ReturnType<typeof buildExperienceRows>) => out.rows.map((r) => r.id)
const row = (out: ReturnType<typeof buildExperienceRows>, id: string) => out.rows.find((r) => r.id === id)!

describe('buildExperienceRows', () => {
  it('Sänds nu ligger först och dess första kort är toppkortet — förhandsvisningen är redan igång när man går ner (Jerry 2026-10-30)', () => {
    const out = buildExperienceRows(base())
    expect(ids(out)[0]).toBe('onNow')
    expect(ids(out)[1]).toBe('continue')
    expect(out.featured!.key).toBe(row(out, 'onNow').items[0]!.key)
    expect(out.featured).toMatchObject({ kind: 'live', channel: N1 })
    expect(row(out, 'continue').items.map((i) => i.kind)).toEqual(['continue', 'replay'])
  })

  it('toppkortet följer Sänds nu även utan senast sedda', () => {
    const out = buildExperienceRows(base({ recent: [] }))
    expect(out.featured!.key).toBe(row(out, 'onNow').items[0]!.key)
  })

  it('Sänds nu (hem): favoriter först, sedan spellistans ordning — utan kanalerna i Fortsätt titta (Jerry 2026-10-30: "dumt att de är likadana")', () => {
    const out = buildExperienceRows(base())
    expect(row(out, 'onNow').items.map((i) => i.channel!.name)).toEqual(['N1', 'S1', 'K1'])
    expect(row(out, 'continue').items.filter((i) => i.kind === 'continue').map((i) => i.channel!.name)).toEqual(['S2'])
    expect(row(out, 'yours').items.map((i) => i.channel!.name)).toEqual(['N1', 'S1', 'S2', 'K1'])
  })

  it('utan vald chip: hemraderna, ofiltrerade (Jerry 2026-10-30: "Alla" ska inte vara aktiv)', () => {
    const out = buildExperienceRows(base({ chip: null }))
    expect(ids(out)).toEqual(['onNow', 'continue', 'yours', 'soon', 'explore'])
    expect(out.rows.some((r) => r.id === 'grid')).toBe(false)
  })

  it('Börjar snart: bara start inom 2 h, sorterat på start', () => {
    const out = buildExperienceRows(base())
    expect(row(out, 'soon').items.map((i) => [i.kind, i.programme!.title])).toEqual([['upcoming', 'Kickoff'], ['upcoming', 'Late news']])
  })

  it('Utforska = grupper med antal', () => {
    const out = buildExperienceRows(base())
    expect(row(out, 'explore').items.map((i) => [i.kind, i.category, i.count])).toEqual([['category', 'Sport', 2], ['category', 'News', 1], ['category', 'Kids', 1]])
  })

  it('tomma rader utelämnas (tom favoritlista, inga program, ingen kategori med kanaler)', () => {
    const out = buildExperienceRows(base({ chip: FAVS_GROUP, favourites: [], recent: [], replays: [], soon: [], counts: new Map() }))
    expect(ids(out)).toEqual([])
    expect(out.featured).toMatchObject({ kind: 'live', channel: S1 })
  })

  it('kapar raderna även med tusentals kanaler', () => {
    const many = Array.from({ length: 5000 }, (_, i) => ch(`C${i}`, 'Grp'))
    const out = buildExperienceRows(base({ channels: many, favourites: [], recent: [] }))
    expect(row(out, 'onNow').items.length).toBeLessThanOrEqual(24)
    expect(row(out, 'yours').items.length).toBeLessThanOrEqual(30)
  })
})

describe('buildExperienceRows, Live sport', () => {
  const src = (c: M3uChannel) => ({ channelKey: `${c.name}::${c.url}`, name: c.name, url: c.url, logo: null, group: c.group, tvgId: null, sourceId: 's', quality: null, programmeStart: now - 3_600_000, programmeStop: now + 3_600_000, liveFlag: true })
  const match = (id: string, over: Partial<SportMatch> = {}): SportMatch => ({
    id, kind: 'football', league: 'Allsvenskan', leagueKey: 'allsvenskan', home: `Home ${id}`, away: `Away ${id}`, homeKey: null, awayKey: null, event: null,
    start: now - 1_800_000, stop: now + 3_600_000, status: 'live', rerun: false, round: null, venue: null, sources: [src(S1)], ...over,
  })
  const byKey = new Map([S1, S2, N1, K1].map((c) => [`${c.name}::${c.url}`, c]))
  const channelFor = (key: string) => byKey.get(key)

  it('raden ligger direkt efter Sänds nu och visar matcher som pågår nu, med matchtiteln', () => {
    const out = buildExperienceRows(base({ sport: [match('a')], channelFor }))
    expect(ids(out).slice(0, 2)).toEqual(['onNow', 'sport'])
    expect(row(out, 'sport').items).toHaveLength(1)
    expect(row(out, 'sport').items[0]).toMatchObject({ kind: 'live', channel: S1, sport: { title: 'Home a - Away a', league: 'Allsvenskan' } })
  })

  it('bara pågående: kommande, slutspelade och repriser hoppas över, och okända kanaler likaså', () => {
    const out = buildExperienceRows(base({
      channelFor,
      sport: [
        match('later', { start: now + 3_600_000, stop: now + 7_200_000, status: 'upcoming' }),
        match('done', { start: now - 7_200_000, stop: now - 600_000, status: 'finished' }),
        match('rerun', { rerun: true }),
        match('nowhere', { sources: [{ ...src(S1), channelKey: 'missing::x' }] }),
      ],
    }))
    expect(ids(out)).not.toContain('sport')
  })

  it('utelämnas utan sportdata, och i kategoriläget', () => {
    expect(ids(buildExperienceRows(base()))).not.toContain('sport')
    expect(ids(buildExperienceRows(base({ sport: [match('a')], channelFor, chip: 'Sport' })))).not.toContain('sport')
  })

  it('ett kort per match, favoritkanalen väljs bland källorna; en kanal visar bara en match; kapat vid 24', () => {
    const out = buildExperienceRows(base({ channelFor, sport: [match('a', { sources: [src(S1), src(N1)] }), match('b', { sources: [src(N1)] })] }))
    expect(row(out, 'sport').items.map((i) => i.channel!.name)).toEqual(['N1'])
    const many = Array.from({ length: 40 }, (_, i) => ch(`X${i}`, 'Sport'))
    const lookup = new Map(many.map((c) => [`${c.name}::${c.url}`, c]))
    const big = buildExperienceRows(base({ channels: many, channelFor: (k) => lookup.get(k), sport: many.map((c, i) => match(`m${i}`, { sources: [src(c)] })) }))
    expect(row(big, 'sport').items.length).toBe(24)
  })
})

describe('buildExperienceRows, kategoriläge (vald chip)', () => {
  const grid = (out: ReturnType<typeof buildExperienceRows>) => out.rows.filter((r) => r.id === 'grid')

  it('chip Sport: Sänds nu filtrerad, sedan rutnätet med kategorins kanaler — inga hemrader', () => {
    const out = buildExperienceRows(base({ chip: 'Sport' }))
    expect(ids(out)).toEqual(['onNow', 'grid'])
    expect(row(out, 'onNow').items.map((i) => i.channel!.name)).toEqual(['S2', 'S1'])
    expect(grid(out)[0]!.items.map((i) => [i.kind, i.channel!.name])).toEqual([['live', 'S1'], ['live', 'S2']])
    expect(grid(out)[0]!.total).toBe(2)
    expect(out.featured!.key).toBe(row(out, 'onNow').items[0]!.key)
  })

  it('Alla = alla kanaler, Favoriter = favoriterna', () => {
    expect(grid(buildExperienceRows(base({ chip: XP_ALL })))[0]!.items.map((i) => i.channel!.name)).toEqual(['S1', 'S2', 'N1', 'K1'])
    expect(row(buildExperienceRows(base({ chip: XP_ALL })), 'onNow').items).toHaveLength(4)
    const favs = buildExperienceRows(base({ chip: FAVS_GROUP }))
    expect(grid(favs)[0]!.items.map((i) => i.channel!.name)).toEqual(['N1'])
    expect(row(favs, 'onNow').items.map((i) => i.channel!.name)).toEqual(['N1'])
  })

  it('rutnätet: rader om 6, kapat vid gränsen, sist ett Visa fler-kort när fler finns', () => {
    const many = Array.from({ length: 4000 }, (_, i) => ch(`C${i}`, 'Grp'))
    const out = buildExperienceRows(base({ channels: many, favourites: [], recent: [], chip: 'Grp', limit: 60 }))
    const lines = grid(out)
    expect(lines.every((l) => l.items.length <= 6)).toBe(true)
    const items = lines.flatMap((l) => l.items)
    expect(items.filter((i) => i.kind === 'live')).toHaveLength(60)
    expect(items.at(-1)).toMatchObject({ kind: 'more', count: 3940 })
    expect(lines.slice(0, 10).every((l) => l.items.length === 6)).toBe(true)
    expect(lines).toHaveLength(11)
    expect(row(out, 'onNow').items.length).toBeLessThanOrEqual(24)
  })

  it('utan fler kanaler än gränsen: inget Visa fler-kort; sista raden kan vara kort', () => {
    const some = Array.from({ length: 8 }, (_, i) => ch(`C${i}`, 'Grp'))
    const out = buildExperienceRows(base({ channels: some, favourites: [], recent: [], chip: 'Grp', limit: 60 }))
    expect(grid(out).map((l) => l.items.length)).toEqual([6, 2])
    expect(grid(out).flatMap((l) => l.items).some((i) => i.kind === 'more')).toBe(false)
  })

  it('större gräns ger fler kort (Visa fler)', () => {
    const many = Array.from({ length: 200 }, (_, i) => ch(`C${i}`, 'Grp'))
    const out = buildExperienceRows(base({ channels: many, favourites: [], recent: [], chip: 'Grp', limit: 120 }))
    expect(grid(out).flatMap((l) => l.items).filter((i) => i.kind === 'live')).toHaveLength(120)
  })
})
