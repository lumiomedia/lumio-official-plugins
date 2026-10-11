import { formatClock } from '../../live-tv-ui'
import type { TvStringKey } from '../../tv/tv-strings'
import { backdropSrc, chooseSportBackdrop, resolveBackdropMode, standardImageFor, type BackdropScope } from '../backdrop'
import { KIND_KEYS } from '../sport-ctx'
import { localDayKey, shiftDay } from '../sport-epg'
import { matchesFollow, rankedSources, statusAt } from '../sport-day-model'
import { matchStatusLabel, showsScore } from '../score-model'
import { matchTitle, type SportMatch } from '../sport-model'
import type { SportFollow, SportOverrides, SportSettings } from '../sport-store'

/*
  TV-HERON FÖR ETT SPORTKORT.

  Startsidans scen speglar kortet man står på i heron. Pluginkortet når inte
  värdens React-kontext, så speglingen går som JSON i stationens
  `data-tv-mirror` (värdens `tvHeroMirrorFromAttr`). Här byggs innehållet: allt
  vi redan vet om matchen — inget hämtas för heron.
*/

type TT = (key: TvStringKey, vars?: Record<string, string | number>) => string

export interface SportHeroMirror {
  kicker: string
  title: string
  metaLine: string
  overview: string
  backdropUrl: string | null
}

export interface SportMirrorDeps {
  now: number
  locale: string
  tt: TT
  overrides: SportOverrides
  follows: SportFollow[]
  settings: Pick<SportSettings, 'backdrops' | 'keys'>
  uploads: Partial<Record<BackdropScope, number>>
  /** Resultatradens "Dölj ställning": ingen ställning i heron heller. */
  hideScore: boolean
}

/** "19:00" idag, "Imorgon 19:00", annars "lör 19:00". */
export function whenText(m: SportMatch, now: number, locale: string, tt: TT): string {
  const time = formatClock(m.start, locale)
  const day = localDayKey(m.start)
  const today = localDayKey(now)
  if (day === today) return time
  if (day === shiftDay(today, 1)) return tt('sportTomorrowAt', { time })
  return `${new Date(m.start).toLocaleDateString(locale, { weekday: 'short' })} ${time}`
}

/**
 * Sportsidans bakgrund för matchens sport, med samma val (Standard, vald
 * bild, Egen bild, Automatisk = arenans bild från källan). Lagbilder hämtas
 * aldrig härifrån — de kostar kvot. Av och färgytor ger sportens Standard:
 * heron behöver en bild.
 */
export function sportHeroBackdrop(m: SportMatch, d: Pick<SportMirrorDeps, 'now' | 'settings' | 'uploads'>): string {
  const standard = standardImageFor(m.kind, localDayKey(d.now))
  const { mode, slot } = resolveBackdropMode(d.settings.backdrops, m.kind)
  const choice = chooseSportBackdrop({
    mode, slot, hasKey: Object.values(d.settings.keys).some(Boolean), hero: m, art: null, uploads: d.uploads, standard,
  })
  return (choice.kind === 'image' ? backdropSrc(choice) : null) ?? standard
}

export function sportHeroMirror(m: SportMatch, d: SportMirrorDeps): SportHeroMirror {
  const { tt } = d
  const st = statusAt(m, d.now)
  const label = matchStatusLabel(m, tt)
  const kicker = st === 'live'
    ? [tt('live'), label && label !== tt('sportLiveShort') ? label : null].filter(Boolean).join(' · ')
    : st === 'finished'
      ? label ?? tt('sportEnded')
      : (label ?? tt('sportKickoffAt', { time: whenText(m, d.now, d.locale, tt) }))
  const title = m.home && m.away ? `${m.home} – ${m.away}` : matchTitle(m)
  const score = !d.hideScore && showsScore(m) && m.score ? `${m.score.home}–${m.score.away}` : null
  const metaLine = [m.league || null, tt(KIND_KEYS[m.kind]), m.venue || null, score].filter(Boolean).join(' · ')
  const ranked = rankedSources(m, d.overrides)
  const best = ranked[0] ?? null
  const followed = d.follows.find((f) => matchesFollow(m, f)) ?? null
  const overview = [
    best ? best.name : tt('sportResultOnly'),
    ranked.length > 1 ? tt('sportSourcesShort', { n: ranked.length }) : null,
    best?.quality ?? null,
    `${formatClock(m.start, d.locale)}–${formatClock(m.stop, d.locale)}`,
    followed ? tt('sportRowFollowNote', { name: followed.name }) : null,
  ].filter(Boolean).join(' · ')
  return { kicker, title, metaLine, overview, backdropUrl: sportHeroBackdrop(m, d) }
}
