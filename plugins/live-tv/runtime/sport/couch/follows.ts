import type { CouchFollow, CouchFollowHit } from '@/lib/plugin-sdk'
import type { TvStringKey } from '../../tv/tv-strings'
import { MIN_PROVIDER_QUERY, matchesQuery, type FollowHit } from '../follow-search'
import { foldTeamKey } from '../merge'
import { crestForFollow, showsScore } from '../score-model'
import { matchesFollow, statusAt, type FollowCandidate } from '../sport-day-model'
import { localDayKey } from '../sport-epg'
import { matchTitle, SPORT_KINDS, type SportKind, type SportMatch } from '../sport-model'
import { followAlert, isFollowing, teamKeysMatch, type SportFollow, type SportSettings } from '../sport-store'

/** Soffläge: Följ lag (handoff 2h och 2i). Telefonen frågar alltid TV:n; källan nås bara härifrån. */
type TT = (k: TvStringKey, v?: Record<string, string | number>) => string

/** Sök hos källan i högst så här många sporter per fråga (varje sport kostar ett `search`). */
export const PROVIDER_SPORTS_MAX = 2
const HITS_MAX = 30
/** Från den här timmen heter en match idag "Ikväll". */
const EVENING_HOUR = 17

const clock = (ms: number, locale: string) => new Date(ms).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
const capital = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1)

function nextFor(f: SportFollow, matches: SportMatch[], now: number): SportMatch | null {
  return matches
    .filter((m) => !m.rerun && statusAt(m, now) !== 'finished' && matchesFollow(m, f))
    .sort((a, b) => a.start - b.start)[0] ?? null
}

function whenText(start: number, now: number, tt: TT, locale: string): string {
  const time = clock(start, locale)
  if (localDayKey(start) === localDayKey(now)) return new Date(start).getHours() >= EVENING_HOUR ? tt('couchFollowTonight', { time }) : tt('sportTodayAt', { time })
  if (localDayKey(start) === localDayKey(now + 86_400_000)) return tt('sportTomorrowAt', { time })
  return tt('couchFollowDayAt', { day: capital(new Date(start).toLocaleDateString(locale, { weekday: 'long' })), time })
}

/**
 * Följer-listan: klockan per följ och nästa (eller pågående) match.
 * "LIVE 2–1 mot Hammarby · 67'" (ställningen från lagets håll, utan ställning
 * när den saknas) eller "Ikväll 19:00 mot X" / "Lördag 15:00 mot X".
 */
export function followList(follows: SportFollow[], matches: SportMatch[], settings: SportSettings, now: number, tt: TT, locale = 'sv-SE'): CouchFollow[] {
  return follows.map((f) => {
    const m = nextFor(f, matches, now)
    let next: CouchFollow['next'] = null
    if (m) {
      const team = f.kind === 'team' && !!m.home && !!m.away
      const homeSide = team && teamKeysMatch(f.key, m.homeKey)
      const what = team ? tt('sportVs', { opponent: (homeSide ? m.away : m.home)! }) : matchTitle(m)
      if (statusAt(m, now) === 'live') {
        const scored = showsScore(m) && !!m.score
        const score = scored && m.score ? (team && !homeSide ? `${m.score.away}–${m.score.home}` : `${m.score.home}–${m.score.away}`) : null
        const minute = scored && m.minute != null ? ` · ${m.minute}'` : ''
        next = { text: `${[tt('couchFollowLive'), score, what].filter(Boolean).join(' ')}${minute}`, live: true }
      } else next = { text: `${whenText(m.start, now, tt, locale)} ${what}`, live: false }
    }
    return {
      sport: f.sport, kind: f.kind, key: f.key, name: f.name,
      crest: f.kind === 'team' ? crestForFollow(f, matches) : f.crest ?? null,
      bell: followAlert(f, settings.alert), next,
    }
  })
}

/** Sporterna att söka i hos källan: följda lags och dagens, fotboll först. */
export function searchSports(follows: SportFollow[], matches: SportMatch[]): SportKind[] {
  const seen = new Set<SportKind>([...follows.map((f) => f.sport), ...matches.map((m) => m.kind)])
  seen.delete('other')
  return SPORT_KINDS.filter((k) => seen.has(k)).sort((a, b) => Number(b === 'football') - Number(a === 'football'))
}

export type SearchDeps = {
  /** Lag och ligor ur dagens EPG (ingen kvot). Lag bär sin liga för underraden. */
  candidates(): Array<FollowCandidate & { league?: string }>
  hasKey: boolean
  provider(sport: SportKind, q: string): Promise<FollowHit[]>
  sports(): SportKind[]
  follows: SportFollow[]
  /** Källan en träff utan egen källa kommer från (inställningarnas primära). */
  primary: string
  label(sport: SportKind): string
}

/**
 * Följ lag-sökningen: först de lokala kandidaterna (alltid, även utan nyckel),
 * sedan med nyckel och minst tre tecken källans träffar i högst två sporter.
 * Nycklarna byggs som TV:ns väljare (sport-follows.tsx), så att `sport-follow`
 * följer samma post.
 */
export async function searchFollows(q: string, d: SearchDeps): Promise<{ teams: CouchFollowHit[]; leagues: CouchFollowHit[] }> {
  const query = q.trim()
  const out: CouchFollowHit[] = []
  const seen = new Set<string>()
  const add = (h: Omit<CouchFollowHit, 'following'>) => {
    const id = `${h.kind}:${h.key}`
    if (seen.has(id)) return
    seen.add(id)
    out.push({ ...h, following: isFollowing(d.follows, { sport: h.sport as SportKind, kind: h.kind, key: h.key }) })
  }
  if (query) {
    for (const c of d.candidates()) {
      if (!matchesQuery(c, query)) continue
      add({ sport: c.sport, kind: c.kind, key: c.key, name: c.name, crest: c.crest ?? null, subtitle: c.kind === 'team' && c.league ? `${d.label(c.sport)} · ${c.league}` : d.label(c.sport) })
    }
  }
  if (d.hasKey && query.length >= MIN_PROVIDER_QUERY) {
    const sports = d.sports().slice(0, PROVIDER_SPORTS_MAX)
    const results = await Promise.all(sports.map((s) => d.provider(s, query).catch(() => [] as FollowHit[])))
    for (const hit of results.flat()) {
      const provider = hit.provider ?? d.primary
      add({
        sport: hit.sport, kind: hit.kind,
        key: hit.kind === 'league' ? `fx:${provider}:${hit.id}` : foldTeamKey(hit.name),
        name: hit.name, crest: hit.crest ?? null,
        subtitle: hit.kind === 'team' && hit.country ? `${d.label(hit.sport)} · ${hit.country}` : d.label(hit.sport),
        providerIds: { [provider]: hit.id },
      })
    }
  }
  return {
    teams: out.filter((h) => h.kind === 'team').slice(0, HITS_MAX),
    leagues: out.filter((h) => h.kind === 'league').slice(0, HITS_MAX),
  }
}
