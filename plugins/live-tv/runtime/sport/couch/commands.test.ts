import { beforeEach, describe, expect, it } from 'vitest'
import type { SportMatch, MatchSource } from '../sport-model'
import type { FixtureDetail } from '../provider'
import { answerSportQuery, runSportCommand, type SportDeps } from './commands'
import { __resetPresenceForTests, hasCouchPresence } from './presence'
import { __resetGoalsForTests, addGoal, openGoals } from './goals'
import type { MultiviewState } from '../../tv/tv-multiview-store'

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
  multiview: () => mv, setMultiview: (s) => { mv = s }, ...o,
})
beforeEach(() => { opened = []; mv = null; __resetPresenceForTests(); __resetGoalsForTests() })

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

describe('answerSportQuery', () => {
  it('händelser senaste överst med löpande ställning; missad straff räknas inte', async () => {
    const d = await answerSportQuery({ id: 'q', type: 'sport-match', matchId: 'm' }, deps([match({})]))
    if ('error' in d) throw new Error(d.error)
    expect(d.events.map((e) => e.minute)).toEqual(["67'", "60'", "58'", "44'", "12'"])
    expect(d.events[0].score).toEqual([2, 1])
    expect(d.events[1].score).toBeUndefined()
    expect(d.events[4].score).toEqual([1, 0])
  })
  it('uppställningen bär mål och byten', async () => {
    const d = await answerSportQuery({ id: 'q', type: 'sport-match', matchId: 'm' }, deps([match({})]))
    if ('error' in d) throw new Error(d.error)
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
