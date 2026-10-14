import { beforeEach, describe, expect, it } from 'vitest'
import type { SportMatch, MatchSource } from '../sport-model'
import type { FixtureDetail } from '../provider'
import { __resetFollowUndoForTests, answerSportQuery, runSportCommand, type SportDeps } from './commands'
import { __resetPresenceForTests, hasCouchPresence } from './presence'
import { __resetGoalsForTests, addGoal, openGoals } from './goals'
import type { MultiviewState } from '../../tv/tv-multiview-store'
import { __resetPluginStorageForTests } from '@/lib/plugin-sdk'
import { getFollows, getSportSettings, type SportSettings } from '../sport-store'
import type { CouchSportDetail } from '@/lib/plugin-sdk'
import { __resetSpoilerForTests, hiddenOnTv, noteReplays } from './spoiler'
import { tvText } from '../../tv/tv-strings'

const src = (key: string): MatchSource => ({ channelKey: key, name: key, url: `http://${key}`, logo: null, group: 'g', tvgId: null, sourceId: 's', quality: null, programmeStart: 0, programmeStop: 10, liveFlag: true })
const match = (o: Partial<SportMatch>): SportMatch => ({ id: 'm', kind: 'football', league: 'L', leagueKey: 'l', home: 'A', away: 'B', homeKey: 'a', awayKey: 'b', event: null, start: 0, stop: 7_200_000, status: 'live', rerun: false, round: null, venue: null, sources: [src('k1')], coverage: 'full', fixture: { provider: 'p', id: '1' }, ...o })
const detail: FixtureDetail = {
  fixture: {} as FixtureDetail['fixture'],
  events: [
    { minute: 12, extra: null, side: 'home', type: 'goal', detail: 'Normal Goal', player: 'Ett', assist: null },
    { minute: 44, extra: null, side: 'away', type: 'goal', detail: 'Normal Goal', player: 'Två', assist: 'Tre' },
    { minute: 58, extra: null, side: 'home', type: 'sub', detail: 'Substitution 1', player: 'In', assist: 'Ut' },
    { minute: 60, extra: null, side: 'away', type: 'goal', detail: 'Missed Penalty', player: 'Två', assist: null },
    { minute: 67, extra: null, side: 'home', type: 'goal', detail: 'Normal Goal', player: 'Ett', assist: null },
  ],
  stats: [{ label: 'Ball Possession', home: '54%', away: '46%' }],
  lineups: [{ side: 'home', formation: '4-4-2', startXI: [{ number: 9, name: 'Ett', pos: 'F' }, { number: 4, name: 'Ut', pos: 'D' }], subs: [{ number: 14, name: 'In', pos: 'M' }] }],
}
let opened: unknown[] = []
let mv: MultiviewState | null = null
const deps = (ms: SportMatch[], o: Partial<SportDeps> = {}): SportDeps => ({
  matches: () => ms, focusId: () => 'm', overrides: () => ({}), open: (t) => { opened.push(t) }, detail: async () => detail, now: () => 1_000,
  multiview: () => mv, setMultiview: (s) => { mv = s },
  settings: () => ({ alert: '15' }) as unknown as SportSettings,
  follows: getFollows,
  text: () => ({ tt: (k, v) => tvText('sv', k, v), locale: 'sv-SE' }),
  searchDeps: () => ({ candidates: () => [], hasKey: false, provider: async () => [], sports: () => [], primary: 'api-sports', label: (s) => s }),
  ...o,
})
beforeEach(() => { opened = []; mv = null; __resetPresenceForTests(); __resetGoalsForTests(); __resetPluginStorageForTests(); __resetFollowUndoForTests() })

describe('runSportCommand', () => {
  it('play-match öppnar Sport med bästa kanalen och autoplay', async () => {
    expect(await runSportCommand({ id: 'c', type: 'play-match', matchId: 'm' }, deps([match({})]))).toBeUndefined()
    expect(opened[0]).toMatchObject({ pageId: 'live-tv-sport', params: { view: 'sport', autoplay: '1', url: 'http://k1' } })
  })
  it('play-match med vald egen kanal', async () => {
    await runSportCommand({ id: 'c', type: 'play-match', matchId: 'm', channel: 'k2' }, deps([match({ sources: [src('k1'), src('k2')] })]))
    expect(opened[0]).toMatchObject({ params: { url: 'http://k2' } })
  })
  it('play-match med främmande kanal vägras', async () => {
    expect(await runSportCommand({ id: 'c', type: 'play-match', matchId: 'm', channel: 'evil' }, deps([match({})]))).toEqual({ id: 'c', ok: false, error: 'no-source' })
    expect(opened).toEqual([])
  })
  it('okänd match eller match utan kanal ger no-source', async () => {
    expect(await runSportCommand({ id: 'c', type: 'play-match', matchId: 'x' }, deps([match({})]))).toEqual({ id: 'c', ok: false, error: 'no-source' })
    expect(await runSportCommand({ id: 'c', type: 'play-match', matchId: 'm' }, deps([match({ sources: [] })]))).toEqual({ id: 'c', ok: false, error: 'no-source' })
  })
  it('sport-zap byter till nästa i ligan, eller svarar no-target', async () => {
    const ms = [match({ id: 'm', start: 0 }), match({ id: 'n', start: 1, sources: [src('k2')] })]
    await runSportCommand({ id: 'c', type: 'sport-zap', dir: 1 }, deps(ms))
    expect(opened[0]).toMatchObject({ params: { url: 'http://k2' } })
    expect(await runSportCommand({ id: 'c', type: 'sport-zap', dir: 1 }, deps([match({})]))).toEqual({ id: 'c', ok: false, error: 'no-target' })
    expect(await runSportCommand({ id: 'c', type: 'sport-zap', dir: 1 }, deps(ms, { focusId: () => null }))).toEqual({ id: 'c', ok: false, error: 'no-target' })
  })
  it('sport-presence markerar telefonen', async () => {
    await runSportCommand({ id: 'c', type: 'sport-presence', on: true, phoneId: 'p1' }, deps([]))
    expect(hasCouchPresence()).toBe(true)
  })
  it('sport-presence utan phoneId gör ingenting', async () => {
    await runSportCommand({ id: 'c', type: 'sport-presence', on: true }, deps([]))
    expect(hasCouchPresence()).toBe(false)
  })
  it('sport-open-settings öppnar Live TV:s inställningar', async () => {
    await runSportCommand({ id: 'c', type: 'sport-open-settings' }, deps([]))
    expect(opened[0]).toEqual({ pageId: 'live-tv-browse', params: { view: 'settings' } })
  })
})

describe('Multiview-kommandon', () => {
  it('utan öppen Multiview: no-multiview', async () => {
    for (const cmd of [{ id: 'c', type: 'mv-audio', index: 0 }, { id: 'c', type: 'mv-enlarge', index: 0 }, { id: 'c', type: 'mv-assign', index: 0, matchId: 'm' }] as const) {
      expect(await runSportCommand(cmd, deps([match({})]))).toEqual({ id: 'c', ok: false, error: 'no-multiview' })
    }
  })
  it('mv-audio mot en tom ruta ger empty-tile; mot en fylld flyttar ljudet', async () => {
    mv = { layout: 4, tiles: ['k1', null, 'k2', null], audioIndex: 0 }
    expect(await runSportCommand({ id: 'c', type: 'mv-audio', index: 1 }, deps([]))).toEqual({ id: 'c', ok: false, error: 'empty-tile' })
    expect(await runSportCommand({ id: 'c', type: 'mv-audio', index: 9 }, deps([]))).toEqual({ id: 'c', ok: false, error: 'empty-tile' })
    expect(mv.audioIndex).toBe(0)
    await runSportCommand({ id: 'c', type: 'mv-audio', index: 2 }, deps([]))
    expect(mv.audioIndex).toBe(2)
  })
  it('mv-enlarge växlar fram och tillbaka (4 rutor ↔ förstorad)', async () => {
    mv = { layout: 4, tiles: ['k1', 'k2', 'k3', null], audioIndex: 0 }
    await runSportCommand({ id: 'c', type: 'mv-enlarge', index: 2 }, deps([]))
    expect(mv).toMatchObject({ layout: 3, tiles: ['k3', 'k1', 'k2'], audioIndex: 0 })
    await runSportCommand({ id: 'c', type: 'mv-enlarge', index: 0 }, deps([]))
    expect(mv).toMatchObject({ layout: 4, audioIndex: 0 })
    expect(mv!.tiles.filter(Boolean)).toHaveLength(3)
  })
  it('mv-enlarge med två rutor går tillbaka till 2; mot en tom ruta ger empty-tile', async () => {
    mv = { layout: 2, tiles: ['k1', 'k2'], audioIndex: 1 }
    await runSportCommand({ id: 'c', type: 'mv-enlarge', index: 1 }, deps([]))
    await runSportCommand({ id: 'c', type: 'mv-enlarge', index: 0 }, deps([]))
    expect(mv).toMatchObject({ layout: 2, tiles: ['k2', 'k1'], audioIndex: 0 })
    mv = { layout: 4, tiles: ['k1', null, null, null], audioIndex: 0 }
    expect(await runSportCommand({ id: 'c', type: 'mv-enlarge', index: 1 }, deps([]))).toEqual({ id: 'c', ok: false, error: 'empty-tile' })
  })
  it('mv-assign tar matchens bästa kanal; okänd match ger no-source; rutan utanför layouten vägras', async () => {
    mv = { layout: 4, tiles: [null, null, null, null], audioIndex: 0 }
    expect(await runSportCommand({ id: 'c', type: 'mv-assign', index: 1, matchId: 'x' }, deps([match({})]))).toEqual({ id: 'c', ok: false, error: 'no-source' })
    await runSportCommand({ id: 'c', type: 'mv-assign', index: 1, matchId: 'm' }, deps([match({ sources: [src('k1'), src('k2')] })]))
    expect(mv).toMatchObject({ tiles: [null, 'k1', null, null], audioIndex: 1 })
    mv = { layout: 2, tiles: ['k1', null], audioIndex: 0 }
    expect(await runSportCommand({ id: 'c', type: 'mv-assign', index: 3, matchId: 'm' }, deps([match({})]))).toEqual({ id: 'c', ok: false, error: 'bad-index' })
  })
  it('sport-goal-dismiss stänger målet', async () => {
    addGoal({ goalId: 'g', matchId: 'm', team: { name: 'A', short: 'A', crest: null }, opponent: 'B', score: [1, 0], minute: null, league: 'L', channel: null, at: 0 }, 1_000)
    await runSportCommand({ id: 'c', type: 'sport-goal-dismiss', goalId: 'g' }, deps([]))
    expect(openGoals(1_000)).toEqual([])
  })
})

describe('Följ lag', () => {
  it('sport-follow växlar följet med källans id; sport-follow-bell sätter klockan', async () => {
    await runSportCommand({ id: 'c', type: 'sport-follow', sport: 'football', kind: 'team', key: 'malmo ff', name: 'Malmö FF', providerIds: { 'api-sports': '9' } }, deps([]))
    expect(getFollows()).toEqual([{ sport: 'football', kind: 'team', key: 'malmo ff', name: 'Malmö FF', providerIds: { 'api-sports': '9' } }])
    await runSportCommand({ id: 'c', type: 'sport-follow-bell', sport: 'football', kind: 'team', key: 'malmo ff', bell: 'kickoff' }, deps([]))
    expect(getFollows()[0].alert).toBe('kickoff')
    await runSportCommand({ id: 'c', type: 'sport-follow', sport: 'football', kind: 'team', key: 'malmo ff', name: 'Malmö FF' }, deps([]))
    expect(getFollows()).toEqual([])
  })
  it('Ångra inom 30 s återställer hela posten: klocka och källans id', async () => {
    const follow = { id: 'c', type: 'sport-follow' as const, sport: 'football', kind: 'team' as const, key: 'malmo ff', name: 'Malmö FF' }
    await runSportCommand({ ...follow, providerIds: { 'api-sports': '9' } }, deps([]))
    await runSportCommand({ id: 'c', type: 'sport-follow-bell', sport: 'football', kind: 'team', key: 'malmo ff', bell: 'kickoff' }, deps([]))
    await runSportCommand(follow, deps([]))
    expect(getFollows()).toEqual([])
    await runSportCommand(follow, deps([]))
    expect(getFollows()).toEqual([{ sport: 'football', kind: 'team', key: 'malmo ff', name: 'Malmö FF', providerIds: { 'api-sports': '9' }, alert: 'kickoff' }])
  })
  it('efter 30 s blir det ett nytt, tomt följ', async () => {
    const follow = { id: 'c', type: 'sport-follow' as const, sport: 'football', kind: 'team' as const, key: 'malmo ff', name: 'Malmö FF' }
    let t = 1_000
    const dd = deps([], { now: () => t })
    await runSportCommand({ ...follow, providerIds: { 'api-sports': '9' } }, dd)
    await runSportCommand(follow, dd)
    t += 31_000
    await runSportCommand(follow, dd)
    expect(getFollows()).toEqual([{ sport: 'football', kind: 'team', key: 'malmo ff', name: 'Malmö FF' }])
  })
  it('okänd sport vägras', async () => {
    expect(await runSportCommand({ id: 'c', type: 'sport-follow', sport: 'curling', kind: 'team', key: 'x', name: 'X' }, deps([]))).toEqual({ id: 'c', ok: false, error: 'bad-sport' })
    expect(getFollows()).toEqual([])
  })
  it('frågorna sport-follows och sport-follow-search', async () => {
    await runSportCommand({ id: 'c', type: 'sport-follow', sport: 'football', kind: 'team', key: 'a', name: 'A' }, deps([]))
    const live = match({ start: 0, stop: 7_200_000 })
    expect(await answerSportQuery({ id: 'q', type: 'sport-follows' }, deps([live]))).toEqual({
      follows: [{ sport: 'football', kind: 'team', key: 'a', name: 'A', crest: null, bell: '15', next: { text: 'LIVE mot B', live: true } }],
    })
    const r = await answerSportQuery({ id: 'q', type: 'sport-follow-search', q: 'a' }, deps([], { searchDeps: () => ({ candidates: () => [{ sport: 'football', kind: 'team', key: 'a', name: 'A', count: 1 }], hasKey: false, provider: async () => [], sports: () => [], primary: 'api-sports', label: () => 'Fotboll' }) }))
    expect(r).toEqual({ teams: [{ sport: 'football', kind: 'team', key: 'a', name: 'A', crest: null, subtitle: 'Fotboll', following: true }], leagues: [] })
  })
})

describe('answerSportQuery', () => {
  it('händelser senaste överst med löpande ställning; missad straff räknas inte', async () => {
    const d = await answerSportQuery({ id: 'q', type: 'sport-match', matchId: 'm' }, deps([match({})]))
    if (!('events' in d)) throw new Error(JSON.stringify(d))
    expect(d.events.map((e) => e.minute)).toEqual(["67'", "60'", "58'", "44'", "12'"])
    expect(d.events[0].score).toEqual([2, 1])
    expect(d.events[1].score).toBeUndefined()
    expect(d.events[4].score).toEqual([1, 0])
  })
  it('uppställningen bär mål och byten', async () => {
    const d = await answerSportQuery({ id: 'q', type: 'sport-match', matchId: 'm' }, deps([match({})]))
    if (!('events' in d)) throw new Error(JSON.stringify(d))
    const xi = d.lineups[0].startXI
    expect(xi.find((p) => p.name === 'Ett')?.goals).toBe(2)
    expect(xi.find((p) => p.name === 'Ut')?.subbedOff).toBe("58'")
    expect(d.lineups[0].subs[0].subbedOn).toBe("58'")
  })
  it('en repris skickar aldrig händelser eller ställning, och detaljen hämtas inte', async () => {
    let asked = false
    const r = match({ rerun: true })
    expect(await answerSportQuery({ id: 'q', type: 'sport-match', matchId: 'm' }, deps([r], { detail: async () => { asked = true; return detail } })))
      .toEqual({ events: [], stats: [], lineups: [], updatedAt: null })
    expect(asked).toBe(false)
  })
  it('okänd match ger fel; saknad eller kastande detalj ger tomma listor', async () => {
    expect(await answerSportQuery({ id: 'q', type: 'sport-match', matchId: 'x' }, deps([match({})]))).toEqual({ error: 'unknown-match' })
    const empty = { events: [], stats: [], lineups: [], updatedAt: null }
    expect(await answerSportQuery({ id: 'q', type: 'sport-match', matchId: 'm' }, deps([match({})], { detail: async () => null }))).toEqual(empty)
    expect(await answerSportQuery({ id: 'q', type: 'sport-match', matchId: 'm' }, deps([match({})], { detail: async () => { throw new Error('x') } }))).toEqual(empty)
  })
})

describe('spoiler: sport-reveal och sport-match', () => {
  const r = match({ id: 'r', rerun: true, fixture: undefined, replayOf: { kickoff: 0, score: { home: 3, away: 0 }, fixture: { provider: 'p', id: '77' } } })
  const on = { settings: () => ({ ...getSportSettings(), spoilerReplays: true }) }
  beforeEach(() => { __resetPluginStorageForTests(); __resetSpoilerForTests(); noteReplays([r], 1_000) })

  it('en telefon som inte visat resultatet får inget och källan frågas inte', async () => {
    let asked = 0
    const a = await answerSportQuery({ id: 'q', type: 'sport-match', matchId: 'r', phoneId: 'p2' }, deps([r], { ...on, detail: async () => { asked++; return detail } }))
    expect(a).toEqual({ events: [], stats: [], lineups: [], updatedAt: null, hidden: true })
    expect(asked).toBe(0)
  })
  it('Visa resultat gäller bara den telefonen', async () => {
    expect(await runSportCommand({ id: 'c', type: 'sport-reveal', matchId: 'r', tv: false, phoneId: 'p1' }, deps([r], on))).toBeUndefined()
    const mine = await answerSportQuery({ id: 'q', type: 'sport-match', matchId: 'r', phoneId: 'p1' }, deps([r], on))
    expect(mine).toMatchObject({ score: [3, 0], revealed: true })
    expect((mine as CouchSportDetail).events.length).toBeGreaterThan(0)
    expect(await answerSportQuery({ id: 'q', type: 'sport-match', matchId: 'r', phoneId: 'p2' }, deps([r], on))).toMatchObject({ hidden: true })
    expect(hiddenOnTv(r, 1_000, { spoilerReplays: true })).toBe(true)
  })
  it('Visa på TV:n också visar för alla', async () => {
    await runSportCommand({ id: 'c', type: 'sport-reveal', matchId: 'r', tv: true, phoneId: 'p1' }, deps([r], on))
    expect(hiddenOnTv(r, 1_000, { spoilerReplays: true })).toBe(false)
    expect(await answerSportQuery({ id: 'q', type: 'sport-match', matchId: 'r', phoneId: 'p2' }, deps([r], on))).toMatchObject({ score: [3, 0] })
  })
  it('utan telefon-id eller med okänd match: fel', async () => {
    expect(await runSportCommand({ id: 'c', type: 'sport-reveal', matchId: 'r', tv: false }, deps([r], on))).toEqual({ id: 'c', ok: false, error: 'no-phone' })
    expect(await runSportCommand({ id: 'c', type: 'sport-reveal', matchId: 'x', tv: false, phoneId: 'p1' }, deps([r], on))).toEqual({ id: 'c', ok: false, error: 'unknown-match' })
  })
  it('skyddet av: reprisen bär resultatet men är inte "revealed"', async () => {
    const a = await answerSportQuery({ id: 'q', type: 'sport-match', matchId: 'r', phoneId: 'p2' }, deps([r], { settings: () => ({ ...getSportSettings(), spoilerReplays: false }) }))
    expect(a).toMatchObject({ score: [3, 0] })
    expect((a as CouchSportDetail).revealed).toBeUndefined()
    expect((a as CouchSportDetail).hidden).toBeUndefined()
  })
  it('originalet (inte reprisen) är också dolt för telefonen', async () => {
    const orig = match({ id: 'o', status: 'finished', fixture: { provider: 'p', id: '77' }, score: { home: 3, away: 0 } })
    expect(await answerSportQuery({ id: 'q', type: 'sport-match', matchId: 'o', phoneId: 'p2' }, deps([r, orig], on))).toMatchObject({ hidden: true })
  })
})
