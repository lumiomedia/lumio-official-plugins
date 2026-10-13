import { describe, expect, it, vi } from 'vitest'
import type { FollowHit } from '../follow-search'
import type { MatchSource, SportMatch } from '../sport-model'
import type { SportFollow, SportSettings } from '../sport-store'
import { tvText } from '../../tv/tv-strings'
import { followList, searchFollows, searchSports, type SearchDeps } from './follows'

const tt = (k: Parameters<typeof tvText>[1], v?: Record<string, string | number>) => tvText('sv', k, v)
const src: MatchSource = { channelKey: 'k1', name: 'K1', url: 'u', logo: null, group: 'g', tvgId: null, sourceId: 's', quality: null, programmeStart: 0, programmeStop: 10, liveFlag: true }
const at = (h: number, m = 0, day = 13) => new Date(2026, 9, day, h, m).getTime()
const NOW = at(18)
const match = (o: Partial<SportMatch>): SportMatch => ({
  id: 'm', kind: 'football', league: 'Allsvenskan', leagueKey: 'se1', home: 'Djurgården', away: 'Hammarby', homeKey: 'dif', awayKey: 'ham',
  event: null, start: at(17), stop: at(19), status: 'live', rerun: false, round: 24, venue: null, sources: [src],
  coverage: 'full', fixture: { provider: 'api-sports', id: '1' }, score: { home: 2, away: 1 }, minute: 67, ...o,
})
const settings = { alert: '15' } as unknown as SportSettings
const dif: SportFollow = { sport: 'football', kind: 'team', key: 'dif', name: 'Djurgården' }

describe('followList', () => {
  it('pågående match: LIVE med ställning från lagets håll och minut', () => {
    const [f] = followList([dif], [match({})], settings, NOW, tt)
    expect(f.next).toEqual({ text: "LIVE 2–1 mot Hammarby · 67'", live: true })
    const [h] = followList([{ ...dif, key: 'ham', name: 'Hammarby' }], [match({})], settings, NOW, tt)
    expect(h.next?.text).toBe("LIVE 1–2 mot Djurgården · 67'")
  })
  it('pågående utan ställning (ingen nyckel): bara LIVE mot X', () => {
    const [f] = followList([dif], [match({ fixture: undefined, score: undefined, minute: undefined })], settings, NOW, tt)
    expect(f.next).toEqual({ text: 'LIVE mot Hammarby', live: true })
  })
  it('kommande: Ikväll, annan dag med veckodag; ingen match ger null', () => {
    const tonight = match({ status: 'upcoming', start: at(19), stop: at(21), score: undefined, minute: undefined })
    expect(followList([dif], [tonight], settings, NOW, tt)[0].next).toEqual({ text: 'Ikväll 19:00 mot Hammarby', live: false })
    const later = match({ status: 'upcoming', start: at(15, 0, 17), stop: at(17, 0, 17), score: undefined, minute: undefined })
    expect(followList([dif], [later], settings, NOW, tt)[0].next?.text).toBe('Lördag 15:00 mot Hammarby')
    expect(followList([dif], [], settings, NOW, tt)[0].next).toBeNull()
  })
  it('klockan per följ: egen, annars den allmänna', () => {
    const list = followList([dif, { ...dif, key: 'aik', name: 'AIK', alert: 'kickoff' }], [], settings, NOW, tt)
    expect(list.map((f) => f.bell)).toEqual(['15', 'kickoff'])
  })
})

const hit = (o: Partial<FollowHit>): FollowHit => ({ kind: 'team', sport: 'football', id: '1', name: 'Malmö FF', crest: null, country: 'Sweden', provider: 'api-sports', ...o })
const deps = (o: Partial<SearchDeps> = {}): SearchDeps => ({
  candidates: () => [
    { sport: 'football', kind: 'team', key: 'malmo ff', name: 'Malmö FF', count: 1, league: 'Allsvenskan' },
    { sport: 'football', kind: 'league', key: 'se1', name: 'Allsvenskan', count: 2 },
    { sport: 'hockey', kind: 'team', key: 'fbk', name: 'Färjestad', count: 1, league: 'SHL' },
  ],
  hasKey: false,
  provider: vi.fn(async () => []),
  sports: () => ['football', 'hockey', 'basketball'],
  follows: [],
  primary: 'api-sports',
  label: (s) => (s === 'football' ? 'Fotboll' : 'Hockey'),
  ...o,
})

describe('searchFollows', () => {
  it('utan nyckel: källan anropas aldrig, lokala träffar returneras', async () => {
    const d = deps()
    const r = await searchFollows('malm', d)
    expect(d.provider).not.toHaveBeenCalled()
    expect(r.teams).toEqual([{ sport: 'football', kind: 'team', key: 'malmo ff', name: 'Malmö FF', crest: null, subtitle: 'Fotboll · Allsvenskan', following: false }])
    expect(r.leagues).toEqual([])
    expect((await searchFollows('allsv', d)).leagues[0]).toMatchObject({ key: 'se1', subtitle: 'Fotboll' })
  })
  it('med nyckel: 2 tecken frågar inte källan; 3 tecken frågar högst 2 sporter', async () => {
    const provider = vi.fn(async () => [])
    await searchFollows('ma', deps({ hasKey: true, provider }))
    expect(provider).not.toHaveBeenCalled()
    await searchFollows('mal', deps({ hasKey: true, provider }))
    expect(provider.mock.calls).toEqual([['football', 'mal'], ['hockey', 'mal']])
  })
  it('dubbletter tas bort (lokalt först); källans träffar får nyckel och providerIds', async () => {
    const provider = vi.fn(async (sport: string) => (sport === 'football'
      ? [hit({}), hit({ id: '9', name: 'Malmö Redhawks' }), hit({ kind: 'league', id: '113', name: 'Allsvenskan' })]
      : []))
    const r = await searchFollows('malm', deps({ hasKey: true, provider }))
    expect(r.teams.map((t) => t.key)).toEqual(['malmo ff', 'malmo redhawks'])
    expect(r.teams[1]).toMatchObject({ providerIds: { 'api-sports': '9' }, subtitle: 'Fotboll · Sweden' })
    expect(r.leagues.map((l) => l.key)).toEqual(['fx:api-sports:113'])
  })
  it('following sätts mot följda', async () => {
    const r = await searchFollows('malm', deps({ follows: [{ sport: 'football', kind: 'team', key: 'malmo ff', name: 'Malmö FF' }] }))
    expect(r.teams[0].following).toBe(true)
  })
  it('en källa som kastar ger bara de lokala träffarna', async () => {
    const r = await searchFollows('malm', deps({ hasKey: true, provider: async () => { throw new Error('kvot') } }))
    expect(r.teams.map((t) => t.key)).toEqual(['malmo ff'])
  })
})

describe('searchSports', () => {
  it('följda lags och dagens sporter, fotboll först', () => {
    expect(searchSports([{ sport: 'hockey', kind: 'team', key: 'x', name: 'X' }], [match({ kind: 'basketball' }), match({ kind: 'football' })])).toEqual(['football', 'hockey', 'basketball'])
  })
})
