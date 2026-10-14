import { beforeEach, describe, expect, it } from 'vitest'
import type { MatchSource, SportMatch } from '../sport-model'
import type { SportSettings } from '../sport-store'
import { getFollows } from '../sport-store'
import { tvText } from '../../tv/tv-strings'
import { __resetPluginStorageForTests } from '@/lib/plugin-sdk'
import { answerSportQuery, runSportCommand, type SportDeps } from './commands'
import { __resetPresenceForTests, hasCouchPresence } from './presence'
import { __resetSpoilerForTests, noteReplays } from './spoiler'
import { tipMatchInfo, tipStatus } from './tip'

const src = (key: string): MatchSource => ({ channelKey: key, name: key, url: `http://${key}`, logo: null, group: 'g', tvgId: null, sourceId: 's', quality: null, programmeStart: 0, programmeStop: 10, liveFlag: true })
const match = (o: Partial<SportMatch>): SportMatch => ({ id: 'm', kind: 'football', league: 'L', leagueKey: 'l', home: 'A', away: 'B', homeKey: 'a', awayKey: 'b', event: null, start: 0, stop: 7_200_000, status: 'live', rerun: false, round: null, venue: null, sources: [src('k1')], coverage: 'full', fixture: { provider: 'p', id: '1' }, ...o })
const deps = (ms: SportMatch[], o: Partial<SportDeps> = {}): SportDeps => ({
  matches: () => ms, focusId: () => 'm', overrides: () => ({}), open: () => {}, detail: async () => null, now: () => 1_000,
  multiview: () => null, setMultiview: () => {},
  settings: () => ({ alert: '15' }) as unknown as SportSettings,
  follows: getFollows,
  text: () => ({ tt: (k, v) => tvText('sv', k, v), locale: 'sv-SE' }),
  searchDeps: () => ({ candidates: () => [], hasKey: false, provider: async () => [], sports: () => [], primary: 'api-sports', label: (s) => s }),
  hasKey: () => false,
  openTip: () => true,
  ...o,
})

describe('Tippa från telefonen', () => {
  beforeEach(() => { __resetPresenceForTests(); __resetSpoilerForTests(); __resetPluginStorageForTests() })
  it('tip-open öppnar rummet med lagen, avsparken och startaren', async () => {
    const opened: unknown[] = []
    const up = match({ id: 'u', status: 'upcoming', start: 10_000, stop: 20_000, homeCrest: 'https://c/h.png' })
    const ack = await runSportCommand({ id: 'c', type: 'tip-open', matchId: 'u', phoneId: 'p1' },
      deps([up], { hasKey: () => true, openTip: (m, s) => { opened.push([m, s]); return true } }))
    expect(ack).toBeUndefined()
    expect(opened[0]).toEqual([expect.objectContaining({ matchId: 'u', kickoffMs: 10_000, autoResult: true,
      home: { name: 'A', short: 'A', crest: 'https://c/h.png' } }), 'p1'])
  })
  it('för sent, okänd match eller upptaget', async () => {
    const o = { hasKey: () => true, openTip: () => true }
    expect(await runSportCommand({ id: 'c', type: 'tip-open', matchId: 'l', phoneId: 'p1' }, deps([match({ id: 'l', start: 0 })], o))).toEqual({ id: 'c', ok: false, error: 'too-late' })
    expect(await runSportCommand({ id: 'c', type: 'tip-open', matchId: 'x', phoneId: 'p1' }, deps([], o))).toEqual({ id: 'c', ok: false, error: 'unknown-match' })
    const up = match({ id: 'u', status: 'upcoming', start: 10_000 })
    expect(await runSportCommand({ id: 'c', type: 'tip-open', matchId: 'u', phoneId: 'p1' }, deps([up], { ...o, openTip: () => false }))).toEqual({ id: 'c', ok: false, error: 'busy' })
  })
  it('motorsport utan lag ger no-teams; en repris som har börjat sändas är för sen', async () => {
    const o = { hasKey: () => true, openTip: () => true }
    const race = match({ id: 'f1', kind: 'motorsport', home: null, away: null, event: 'GP', status: 'upcoming', start: 10_000 })
    expect(await runSportCommand({ id: 'c', type: 'tip-open', matchId: 'f1' }, deps([race], o))).toEqual({ id: 'c', ok: false, error: 'no-teams' })
    const rr = match({ id: 'r', rerun: true, start: 500, stop: 5_000 })
    expect(await runSportCommand({ id: 'c', type: 'tip-open', matchId: 'r' }, deps([rr], o))).toEqual({ id: 'c', ok: false, error: 'unsupported' })
  })
  it('en repris kan aldrig tippas, inte ens före sändningen', async () => {
    let opened = false
    const rr = match({ id: 'r', rerun: true, status: 'upcoming', start: 10_000, stop: 20_000, replayOf: { kickoff: -1, score: { home: 3, away: 0 }, fixture: { provider: 'p', id: '7' } } })
    expect(await runSportCommand({ id: 'c', type: 'tip-open', matchId: 'r', phoneId: 'p1' }, deps([rr], { hasKey: () => true, openTip: () => { opened = true; return true } })))
      .toEqual({ id: 'c', ok: false, error: 'unsupported' })
    expect(opened).toBe(false)
  })
  it('utan startare (TV:n) går null till värden', async () => {
    const opened: unknown[] = []
    const up = match({ id: 'u', status: 'upcoming', start: 10_000 })
    await runSportCommand({ id: 'c', type: 'tip-open', matchId: 'u' }, deps([up], { openTip: (_m, s) => { opened.push(s); return true } }))
    expect(opened).toEqual([null])
  })
  it('tip-status: slutresultat vid slut; med känt resultat behövs ingen mer pollning', async () => {
    const fin = match({ id: 'f', status: 'finished', score: { home: 2, away: 1 } })
    expect(await answerSportQuery({ id: 'i', type: 'tip-status', matchId: 'f' }, deps([fin]))).toEqual({ status: 'finished', score: [2, 1], spoilerTv: false })
    expect(hasCouchPresence()).toBe(false)
  })
  it('tip-status håller efterfrågan bara när livedata behövs', async () => {
    const ask = (m: SportMatch, now: number) => answerSportQuery({ id: 'i', type: 'tip-status', matchId: m.id }, deps([m], { now: () => now }))
    // Ett rum öppnat timmar före avspark drar ingen pollning.
    await ask(match({ id: 'u', status: 'upcoming', start: 4 * 3_600_000, stop: 6 * 3_600_000 }), 1_000)
    expect(hasCouchPresence()).toBe(false)
    // En repris (originalets resultat är redan känt) inte heller.
    await ask(match({ id: 'r', rerun: true, start: 0, stop: 5_000, replayOf: { kickoff: -1, score: { home: 3, away: 0 }, fixture: { provider: 'p', id: '7' } } }), 1_000)
    expect(hasCouchPresence()).toBe(false)
    // Live: ja.
    await ask(match({ id: 'l', status: 'live', start: 0 }), 1_000)
    expect(hasCouchPresence()).toBe(true)
    __resetPresenceForTests()
    // Halvtid: ja.
    await ask(match({ id: 'h', status: 'live', phase: 'ht', start: 0 }), 1_000)
    expect(hasCouchPresence()).toBe(true)
    __resetPresenceForTests()
    // Slut utan källans resultat ännu: ja, tills resultatet finns.
    await ask(match({ id: 'f', status: 'finished', score: undefined }), 8_000_000)
    expect(hasCouchPresence()).toBe(true)
  })
  it('tip-status för en repris: resultat först när sändningen är slut', async () => {
    const rr = match({ id: 'r', rerun: true, start: 0, stop: 5_000, replayOf: { kickoff: -1, score: { home: 3, away: 0 }, fixture: { provider: 'p', id: '7' } } })
    expect(await answerSportQuery({ id: 'i', type: 'tip-status', matchId: 'r' }, deps([rr], { now: () => 1_000 }))).toMatchObject({ status: 'live' })
    expect(await answerSportQuery({ id: 'i', type: 'tip-status', matchId: 'r' }, deps([rr], { now: () => 6_000 }))).toMatchObject({ status: 'finished', score: [3, 0] })
  })
  it('tip-status: okänd match', async () => {
    expect(await answerSportQuery({ id: 'i', type: 'tip-status', matchId: 'x' }, deps([]))).toEqual({ error: 'unknown-match' })
  })
})

describe('tipMatchInfo', () => {
  it('autoResult kräver nyckel, full täckning och en fixtur (repris: originalets resultat)', () => {
    expect(tipMatchInfo(match({}), { hasKey: false }).autoResult).toBe(false)
    expect(tipMatchInfo(match({ coverage: 'epg' }), { hasKey: true }).autoResult).toBe(false)
    expect(tipMatchInfo(match({ fixture: undefined }), { hasKey: true }).autoResult).toBe(false)
    expect(tipMatchInfo(match({ rerun: true, replayOf: { kickoff: 0, score: null, fixture: { provider: 'p', id: '7' } } }), { hasKey: true }).autoResult).toBe(false)
    expect(tipMatchInfo(match({ rerun: true, replayOf: { kickoff: 0, score: { home: 1, away: 0 }, fixture: { provider: 'p', id: '7' } } }), { hasKey: true }).autoResult).toBe(true)
  })
  it('märken och bakgrund som Rust inte tar emot blir null; bakgrunden är sportens medföljande bild', () => {
    const info = tipMatchInfo(match({ homeCrest: 'javascript:alert(1)', awayCrest: '/crests/b.png' }), { hasKey: true })
    expect(info.home.crest).toBeNull()
    expect(info.away.crest).toBe('/crests/b.png')
    expect(info.backdrop).toBe('/sport-backgrounds/football.webp')
    expect(info).toMatchObject({ sport: 'football', league: 'L', home: { name: 'A', short: 'A' }, away: { name: 'B', short: 'B' } })
  })
})

describe('tipStatus', () => {
  beforeEach(() => { __resetSpoilerForTests(); __resetPluginStorageForTests() })
  const on = { spoilerReplays: true } as SportSettings
  it('paus, live utan ställning, kommande', () => {
    expect(tipStatus(match({ phase: 'ht', score: { home: 1, away: 0 } }), 1_000, on)).toEqual({ status: 'ht', spoilerTv: false })
    expect(tipStatus(match({ score: { home: 1, away: 0 } }), 1_000, on)).toEqual({ status: 'live', spoilerTv: false })
    expect(tipStatus(match({ status: 'upcoming', start: 10_000 }), 1_000, on)).toEqual({ status: 'upcoming', spoilerTv: false })
  })
  it('slut utan källans ställning: inget resultat', () => {
    expect(tipStatus(match({ status: 'finished', coverage: 'epg', score: { home: 1, away: 1 } }), 1_000, on)).toEqual({ status: 'finished', spoilerTv: false })
  })
  it('en spoilerdold repris rapporterar ändå resultatet, med spoilerTv', () => {
    const rr = match({ id: 'r', rerun: true, start: 0, stop: 5_000, replayOf: { kickoff: -1, score: { home: 3, away: 0 }, fixture: { provider: 'p', id: '7' } } })
    noteReplays([rr], 6_000)
    expect(tipStatus(rr, 6_000, on)).toEqual({ status: 'finished', score: [3, 0], spoilerTv: true })
  })
})
