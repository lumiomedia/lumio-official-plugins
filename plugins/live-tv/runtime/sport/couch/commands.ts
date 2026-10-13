import type { CouchAck, CouchSportDetail, CouchSportEvent, CouchSportLineupEntry, SportCommand, SportQuery } from '@/lib/plugin-sdk'
import { encodeChannelParams, LIVE_TV_SPORT_PAGE_ID } from '../../live-tv-shell'
import type { FixtureDetail, FixtureEvent, LineupEntry } from '../provider'
import { rankedSources } from '../sport-day-model'
import { sourceChannel, type MatchSource, type SportMatch } from '../sport-model'
import type { SportOverrides } from '../sport-store'
import { markPresence } from './presence'
import { zapTarget } from './snapshot'

/** Det Soffläges sportkommandon behöver av pluginet (injiceras, så att logiken går att testa). */
export type SportDeps = {
  matches(): SportMatch[]
  focusId(): string | null
  overrides(): SportOverrides
  open(target: { pageId: string; params: Record<string, string> }): void
  detail(m: SportMatch): Promise<FixtureDetail | null>
  now(): number
}

// Via Sport-sidan: spelaren går tillbaka till Sport när den stängs (som sportRowTarget).
function playSource(d: SportDeps, s: MatchSource): void {
  d.open({ pageId: LIVE_TV_SPORT_PAGE_ID, params: { view: 'sport', autoplay: '1', ...encodeChannelParams(sourceChannel(s)) } })
}

export async function runSportCommand(cmd: SportCommand, d: SportDeps): Promise<CouchAck | void> {
  switch (cmd.type) {
    case 'sport-presence':
      // phoneId stämplas av Rust; saknas det kan närvaron inte räknas per telefon.
      if (cmd.phoneId) markPresence(cmd.phoneId, cmd.on, d.now())
      return
    case 'sport-open-settings':
      d.open({ pageId: 'live-tv-browse', params: { view: 'settings' } })
      return
    case 'play-match': {
      const m = d.matches().find((x) => x.id === cmd.matchId)
      // Kanalen får bara vara en av matchens egna källor: telefonen kan aldrig välja en godtycklig ström.
      const s = m && (cmd.channel ? m.sources.find((x) => x.channelKey === cmd.channel) : rankedSources(m, d.overrides())[0])
      if (!s) return { id: cmd.id, ok: false, error: 'no-source' }
      playSource(d, s)
      return
    }
    case 'sport-zap': {
      const focus = d.focusId()
      const next = focus ? zapTarget(d.matches(), focus, cmd.dir, d.now()) : null
      const s = next ? rankedSources(next, d.overrides())[0] : null
      if (!s) return { id: cmd.id, ok: false, error: 'no-target' }
      playSource(d, s)
      return
    }
  }
}

const minuteText = (e: Pick<FixtureEvent, 'minute' | 'extra'>) => (e.minute == null ? '' : e.extra ? `${e.minute}+${e.extra}'` : `${e.minute}'`)
const counts = (e: FixtureEvent) => e.type === 'goal' && !/missed/i.test(e.detail)

/**
 * Byten: `player` = in, `assist` = ut (API-Sports). Verifieras mot en riktig
 * match i den manuella kontrollen; telefonens copy följer samma tolkning.
 */
export function toCouchDetail(fd: FixtureDetail, at: number): CouchSportDetail {
  const chrono = [...fd.events].sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0) || (a.extra ?? 0) - (b.extra ?? 0))
  let home = 0
  let away = 0
  const events: CouchSportEvent[] = chrono.map((e) => {
    // Källan sätter `side` till laget som får målet tillgodo (även självmål).
    if (counts(e)) { if (e.side === 'home') home++; else if (e.side === 'away') away++ }
    return {
      minute: minuteText(e), type: e.type, side: e.side, player: e.player, assist: e.assist, detail: e.detail,
      ...(counts(e) ? { score: [home, away] as [number, number] } : {}),
    }
  }).reverse()
  const subMinute = (pick: (e: FixtureEvent) => string | null, name: string) => {
    const e = fd.events.find((x) => x.type === 'sub' && pick(x) === name)
    return e ? minuteText(e) : null
  }
  const entry = (p: LineupEntry): CouchSportLineupEntry => ({
    number: p.number, name: p.name, pos: p.pos,
    goals: fd.events.filter((e) => counts(e) && e.player === p.name && !/own/i.test(e.detail)).length,
    subbedOff: subMinute((e) => e.assist, p.name),
    subbedOn: subMinute((e) => e.player, p.name),
  })
  return {
    events,
    stats: fd.stats.map((s) => ({ label: s.label, home: s.home, away: s.away })),
    lineups: fd.lineups.map((l) => ({ side: l.side, formation: l.formation, startXI: l.startXI.map(entry), subs: l.subs.map(entry) })),
    updatedAt: at,
  }
}

export async function answerSportQuery(q: SportQuery, d: SportDeps): Promise<CouchSportDetail | { error: string }> {
  const m = d.matches().find((x) => x.id === q.matchId)
  if (!m) return { error: 'unknown-match' }
  const fd = await d.detail(m).catch(() => null)
  return fd ? toCouchDetail(fd, d.now()) : { events: [], stats: [], lineups: [], updatedAt: null }
}
