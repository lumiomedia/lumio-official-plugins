import { describe, expect, it } from 'vitest'
import { buildExperienceRows, type XpInput } from './hub-experience-data'
import { FAVS_GROUP } from './tv-guide-shared'
import type { M3uChannel } from '../live-tv-data'
import type { EpgProgramme } from '../epg/types'
import type { CatchUpItem } from '../catch-up'

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
    expect(out.featured).toMatchObject({ kind: 'live', channel: S2 })
    expect(row(out, 'continue').items.map((i) => i.kind)).toEqual(['continue', 'replay'])
  })

  it('toppkortet följer Sänds nu även utan senast sedda', () => {
    const out = buildExperienceRows(base({ recent: [] }))
    expect(out.featured!.key).toBe(row(out, 'onNow').items[0]!.key)
  })

  it('Sänds nu: senast sedda + favoriter först, sedan spellistans ordning', () => {
    const out = buildExperienceRows(base())
    expect(row(out, 'onNow').items.map((i) => i.channel!.name)).toEqual(['S2', 'N1', 'S1', 'K1'])
    expect(row(out, 'yours').items.map((i) => i.channel!.name)).toEqual(['N1', 'S1', 'S2', 'K1'])
  })

  it('chip Sport filtrerar Sänds nu och Dina kanaler men inte Börjar snart', () => {
    const out = buildExperienceRows(base({ chip: 'Sport' }))
    expect(row(out, 'onNow').items.map((i) => i.channel!.name)).toEqual(['S2', 'S1'])
    expect(row(out, 'yours').items.map((i) => i.channel!.name)).toEqual(['S1', 'S2'])
    expect(row(out, 'soon').items.map((i) => i.programme!.title)).toEqual(['Kickoff', 'Late news'])
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
