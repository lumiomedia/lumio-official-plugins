import type { CouchAck, CouchFollow, CouchFollowHit, CouchSportDetail, CouchSportEvent, CouchSportLineupEntry, SportCommand, SportQuery, TipMatchInfo, TipStatusAnswer } from '@/lib/plugin-sdk'
import type { TvStringKey } from '../../tv/tv-strings'
import { encodeChannelParams, LIVE_TV_SPORT_PAGE_ID } from '../../live-tv-shell'
import type { FixtureDetail, FixtureEvent, LineupEntry } from '../provider'
import { rankedSources } from '../sport-day-model'
import { SPORT_KINDS, sourceChannel, type MatchSource, type SportKind, type SportMatch } from '../sport-model'
import { getFollows, isFollowing, setFollowAlert, toggleFollow, type SportFollow, type SportOverrides, type SportSettings } from '../sport-store'
import { followList, searchFollows, type SearchDeps } from './follows'
import { assignTile, enlargeTile, setLayout, tileCount, type MultiviewState } from '../../tv/tv-multiview-store'
import { dismissGoal } from './goals'
import { markPresence, TIP_PRESENCE_PREFIX } from './presence'
import { zapTarget } from './snapshot'
import { hiddenForPhone, revealPhone, revealTv, spoilerKey, spoilerProtected } from './spoiler'
import { hasTeams, tipMatchInfo, tipNeedsLive, tipStatus, tipTooLate } from './tip'

/** Det Soffläges sportkommandon behöver av pluginet (injiceras, så att logiken går att testa). */
export type SportDeps = {
  matches(): SportMatch[]
  focusId(): string | null
  overrides(): SportOverrides
  open(target: { pageId: string; params: Record<string, string> }): void
  detail(m: SportMatch): Promise<FixtureDetail | null>
  now(): number
  /** Multiviews tillstånd, eller null när TV:n inte visar Multiview. */
  multiview(): MultiviewState | null
  setMultiview(s: MultiviewState): void
  settings(): SportSettings
  follows(): SportFollow[]
  /** Texterna för Följer-listan på värdens språk. */
  text(): { tt: (k: TvStringKey, v?: Record<string, string | number>) => string; locale: string }
  searchDeps(): Omit<SearchDeps, 'follows'>
  /** Källan har nyckel (resultatcontrollern finns): avgör om värden kan rapportera Tippa-resultatet själv. */
  hasKey(): boolean
  /** Be värden öppna ett Tippa-rum. `false` = upptaget (eller en äldre app utan Tippa). */
  openTip(info: TipMatchInfo, starterPhoneId: string | null): boolean
}

const isSport = (s: string): s is SportKind => (SPORT_KINDS as readonly string[]).includes(s)

// Via Sport-sidan: spelaren går tillbaka till Sport när den stängs (som sportRowTarget).
function playSource(d: SportDeps, s: MatchSource): void {
  d.open({ pageId: LIVE_TV_SPORT_PAGE_ID, params: { view: 'sport', autoplay: '1', ...encodeChannelParams(sourceChannel(s)) } })
}

type MvCommand = Extract<SportCommand, { type: 'mv-audio' | 'mv-enlarge' | 'mv-assign' }>

/**
 * Multiview från telefonen: samma rena funktioner som TV:ns egen Multiview,
 * och vyn följer lagringen. Ljudet och förstoringen pekar aldrig på en tom
 * ruta; en ruta tilldelas alltid matchens bästa kanal, aldrig en kanal ur telefonen.
 */
function runMultiview(cmd: MvCommand, d: SportDeps): CouchAck | void {
  const state = d.multiview()
  if (!state) return { id: cmd.id, ok: false, error: 'no-multiview' }
  const inLayout = Number.isInteger(cmd.index) && cmd.index >= 0 && cmd.index < tileCount(state.layout)
  const filled = inLayout && state.tiles[cmd.index] != null
  switch (cmd.type) {
    case 'mv-audio':
      if (!filled) return { id: cmd.id, ok: false, error: 'empty-tile' }
      d.setMultiview({ ...state, audioIndex: cmd.index })
      return
    case 'mv-enlarge': {
      if (!filled) return { id: cmd.id, ok: false, error: 'empty-tile' }
      // Den stora rutan igen: tillbaka till rutnätet (fyra rutor om fler än två är fyllda).
      if (state.layout === 3 && cmd.index === 0) {
        const n = state.tiles.filter((t) => t != null).length
        d.setMultiview(setLayout(state, n > 2 ? 4 : 2))
      } else d.setMultiview(enlargeTile(state, cmd.index))
      return
    }
    case 'mv-assign': {
      if (!inLayout) return { id: cmd.id, ok: false, error: 'bad-index' }
      const m = d.matches().find((x) => x.id === cmd.matchId)
      const s = m ? rankedSources(m, d.overrides())[0] : null
      if (!s) return { id: cmd.id, ok: false, error: 'no-source' }
      d.setMultiview(assignTile(state, cmd.index, s.channelKey))
      return
    }
  }
}

/** Ångra efter "Ta bort" på telefonen: posten som togs bort, i 30 s. */
const UNDO_MS = 30_000
let lastRemoved: { follow: SportFollow; at: number } | null = null
export function __resetFollowUndoForTests(): void { lastRemoved = null }

export async function runSportCommand(cmd: SportCommand, d: SportDeps): Promise<CouchAck | void> {
  switch (cmd.type) {
    case 'mv-audio':
    case 'mv-enlarge':
    case 'mv-assign':
      return runMultiview(cmd, d)
    case 'sport-goal-dismiss':
      dismissGoal(cmd.goalId)
      return
    case 'sport-follow': {
      if (!isSport(cmd.sport)) return { id: cmd.id, ok: false, error: 'bad-sport' }
      // Samma post som TV:ns väljare bygger (sport-follows.tsx): växlar, så Ångra är samma kommando igen.
      const target: SportFollow = { sport: cmd.sport, kind: cmd.kind, key: cmd.key, name: cmd.name, ...(cmd.providerIds && Object.keys(cmd.providerIds).length ? { providerIds: cmd.providerIds } : {}) }
      const now = d.now()
      const existing = getFollows().find((f) => isFollowing([f], target))
      if (existing) {
        // Borttagning: spara hela posten (klocka, märke, källans id) så att Ångra återställer den.
        lastRemoved = { follow: existing, at: now }
        toggleFollow(existing)
        return
      }
      const undo = lastRemoved && now - lastRemoved.at < UNDO_MS && isFollowing([lastRemoved.follow], target) ? lastRemoved.follow : null
      lastRemoved = null
      toggleFollow(undo ?? target)
      return
    }
    case 'sport-follow-bell':
      if (!isSport(cmd.sport)) return { id: cmd.id, ok: false, error: 'bad-sport' }
      setFollowAlert({ sport: cmd.sport, kind: cmd.kind, key: cmd.key }, cmd.bell)
      return
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
    case 'sport-reveal': {
      // phoneId stämplas av Rust: utan det finns ingen telefon att visa resultatet för.
      if (!cmd.phoneId) return { id: cmd.id, ok: false, error: 'no-phone' }
      const m = d.matches().find((x) => x.id === cmd.matchId)
      const key = m ? spoilerKey(m) : null
      if (!m || !key) return { id: cmd.id, ok: false, error: 'unknown-match' }
      revealPhone(key, cmd.phoneId)
      if (cmd.tv === true) revealTv(key, d.now())
      return
    }
    case 'tip-open': {
      const m = d.matches().find((x) => x.id === cmd.matchId)
      if (!m) return { id: cmd.id, ok: false, error: 'unknown-match' }
      // Tipsen låses vid avspark (en repris: när sändningen börjar).
      if (tipTooLate(m, d.now())) return { id: cmd.id, ok: false, error: 'too-late' }
      if (!hasTeams(m)) return { id: cmd.id, ok: false, error: 'no-teams' }
      // phoneId stämplas av Rust (startaren); utan det öppnar TV:n utan startare.
      if (!d.openTip(tipMatchInfo(m, { hasKey: d.hasKey() }), cmd.phoneId ?? null)) return { id: cmd.id, ok: false, error: 'busy' }
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

export type SportQueryAnswer =
  | CouchSportDetail
  | { follows: CouchFollow[] }
  | { teams: CouchFollowHit[]; leagues: CouchFollowHit[] }
  | TipStatusAnswer
  | { error: string }

export async function answerSportQuery(q: SportQuery, d: SportDeps): Promise<SportQueryAnswer> {
  if (q.type === 'sport-follows') {
    const { tt, locale } = d.text()
    return { follows: followList(d.follows(), d.matches(), d.settings(), d.now(), tt, locale) }
  }
  // Utan nyckel bara EPG:ns kandidater; källan nås aldrig från telefonen direkt.
  if (q.type === 'sport-follow-search') return searchFollows(q.q, { ...d.searchDeps(), follows: d.follows() })
  if (q.type === 'tip-status') {
    const now = d.now()
    const m = d.matches().find((x) => x.id === q.matchId)
    if (!m) return { error: 'unknown-match' }
    // Värdens pollning håller sammanslagningen igång (som en telefon på sportfliken),
    // men bara när rummet behöver livedata: inte timmar före avspark, inte för en repris.
    if (tipNeedsLive(m, now)) markPresence(TIP_PRESENCE_PREFIX + q.matchId, true, now)
    return tipStatus(m, now, d.settings())
  }
  const m = d.matches().find((x) => x.id === q.matchId)
  if (!m) return { error: 'unknown-match' }
  const empty: CouchSportDetail = { events: [], stats: [], lineups: [], updatedAt: null }
  const now = d.now()
  const settings = d.settings()
  // Spoilerskyddet: en telefon som inte har visat resultatet får ingenting, och källan frågas inte.
  if (hiddenForPhone(m, q.phoneId ?? null, now, settings)) return { ...empty, hidden: true }
  // En repris utan känt original har ingen detalj att hämta.
  if (m.rerun && !m.replayOf?.fixture) return empty
  const fd = await d.detail(m).catch(() => null)
  const out = fd ? toCouchDetail(fd, now) : empty
  // Bilden saknar resultatet för en dold match: telefonen som får se det får det här i stället.
  const revealed = settings.spoilerReplays !== false && spoilerProtected(m, now)
  const final = m.rerun ? m.replayOf?.score ?? null : revealed && m.coverage === 'full' && m.status !== 'upcoming' ? m.score ?? null : null
  return {
    ...out,
    ...(final ? { score: [final.home, final.away] as [number, number] } : {}),
    ...(revealed ? { revealed: true } : {}),
  }
}
