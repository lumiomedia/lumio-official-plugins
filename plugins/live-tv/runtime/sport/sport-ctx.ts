'use client'

import { useMemo } from 'react'
import type { LiveTvModel } from '../live-tv-model'
import { formatClock } from '../live-tv-ui'
import { reminderId, toggleReminder, useReminders, type Reminder } from '../reminders'
import type { TvNav } from '../tv/tv-shell'
import { useTvText, type TvStringKey } from '../tv/tv-strings'
import { localDayKey } from './sport-epg'
import { matchTitle, sourceChannel, type MatchSource, type SportKind, type SportMatch } from './sport-model'
import { rankedSources, statusAt } from './sport-day-model'
import { setAlertSkip, teamKeysMatch, useFollows, useOverrides, useSportSettings, type SportFollow, type SportOverrides, type SportSettings } from './sport-store'

/*
  ALLT EN SPORTVY BEHÖVER, I ETT OBJEKT.

  Vyerna (TV och telefon) får `ctx` som prop i stället för att var och en
  läser lagring, klocka och navigering själv — då går de att testa med en
  falsk kontext (`fakeCtx`) utan att montera hela skalet, och "Titta" betyder
  samma sak överallt: bästa källan, åsidosättningen först.
*/

export const KIND_KEYS: Record<SportKind, TvStringKey> = {
  football: 'sportKindFootball',
  hockey: 'sportKindHockey',
  basketball: 'sportKindBasketball',
  handball: 'sportKindHandball',
  motorsport: 'sportKindMotorsport',
  tennis: 'sportKindTennis',
  other: 'sportKindOther',
}

export interface SportCtx {
  model: LiveTvModel
  nav: TvNav
  now: number
  locale: string
  tt: (key: TvStringKey, vars?: Record<string, string | number>) => string
  follows: SportFollow[]
  overrides: SportOverrides
  settings: SportSettings
  reminders: Reminder[]
  kindLabel(kind: SportKind): string
  playlistName(sourceId: string): string
  openMatch(match: SportMatch): void
  openFollowPicker(): void
  /** Spela matchen: angiven källa, annars bästa (åsidosättningen först). */
  watch(match: SportMatch, source?: MatchSource): void
  toggleRemind(match: SportMatch): void
  isReminded(match: SportMatch): boolean
}

export function buildSportCtx(input: {
  model: LiveTvModel
  nav: TvNav
  tt: SportCtx['tt']
  locale: string
  follows: SportFollow[]
  overrides: SportOverrides
  settings: SportSettings
  reminders: Reminder[]
  openMatch(match: SportMatch): void
  openFollowPicker(): void
}): SportCtx {
  const { model, nav, tt, overrides, reminders } = input
  const best = (m: SportMatch): MatchSource | null => rankedSources(m, overrides)[0] ?? null
  return {
    model,
    nav,
    now: model.nowMs,
    locale: input.locale,
    tt,
    follows: input.follows,
    overrides,
    settings: input.settings,
    reminders,
    kindLabel: (kind) => tt(KIND_KEYS[kind]),
    playlistName: (sourceId) => model.lists.find((list) => list.source === sourceId)?.name ?? tt('sportPlaylistUnknown'),
    openMatch: input.openMatch,
    openFollowPicker: input.openFollowPicker,
    watch: (m, source) => {
      const chosen = source ?? best(m)
      if (chosen) nav.play({ channel: sourceChannel(chosen) })
    },
    toggleRemind: (m) => {
      const chosen = best(m)
      if (!chosen) return
      const channel = sourceChannel(chosen)
      const id = reminderId(channel, { start: chosen.programmeStart })
      const existing = reminders.find((r) => r.id === id)
      // En automatisk (följd) påminnelse som bockas av måste kommas ihåg,
      // annars skapar nästa avsparkssynk den igen. På igen = manuell påminnelse.
      if (existing?.origin === 'sport') setAlertSkip(m.id, m.start, true)
      else if (!existing) setAlertSkip(m.id, m.start, false)
      toggleReminder(channel, { title: matchTitle(m), start: chosen.programmeStart, stop: chosen.programmeStop })
    },
    isReminded: (m) => {
      const chosen = best(m)
      return chosen ? reminders.some((r) => r.id === reminderId(sourceChannel(chosen), { start: chosen.programmeStart })) : false
    },
  }
}

export function useSportCtx(args: { model: LiveTvModel; nav: TvNav; openMatch(match: SportMatch): void; openFollowPicker(): void }): SportCtx {
  const { tt, locale } = useTvText()
  const follows = useFollows()
  const overrides = useOverrides()
  const settings = useSportSettings()
  const reminders = useReminders()
  const { model, nav, openMatch, openFollowPicker } = args
  return useMemo(
    () => buildSportCtx({ model, nav, tt, locale, follows, overrides, settings, reminders, openMatch, openFollowPicker }),
    [model, nav, tt, locale, follows, overrides, settings, reminders, openMatch, openFollowPicker],
  )
}

/** "LIVE · 19:00–21:00" / "21:00" / "SLUT" — ingen ställning i fas 1. */
export function timeLine(m: SportMatch, ctx: SportCtx): string {
  const st = statusAt(m, ctx.now)
  if (st === 'live') return ctx.tt('sportLiveWindow', { from: formatClock(m.start, ctx.locale), to: formatClock(m.stop, ctx.locale) })
  if (st === 'finished') return ctx.tt('sportEnded')
  return formatClock(m.start, ctx.locale)
}

/** "TV4 Fotboll FHD SE · 3 källor" — bästa källan och hur många det finns. */
export function sourceLine(m: SportMatch, ctx: SportCtx): string {
  const ranked = rankedSources(m, ctx.overrides)
  const first = ranked[0]
  if (!first) return ''
  return ranked.length > 1 ? `${first.name} · ${ctx.tt('sportSourcesShort', { n: ranked.length })}` : first.name
}

/** Flödets källchip: "3 källor · FHD", eller kanalens namn när den är ensam. */
export function sourceChip(m: SportMatch, ctx: SportCtx): string {
  const ranked = rankedSources(m, ctx.overrides)
  const first = ranked[0]
  if (!first) return ''
  if (ranked.length === 1) return first.name
  return first.quality ? `${ctx.tt('sportSourcesShort', { n: ranked.length })} · ${first.quality}` : ctx.tt('sportSourcesShort', { n: ranked.length })
}

export function alertLabel(ctx: SportCtx): string {
  return ctx.settings.alert === 'off' ? ctx.tt('sportAlertOff') : ctx.settings.alert === '15' ? ctx.tt('sportAlert15') : ctx.tt('sportAlertKickoff')
}

/** Följkortets rad: "Idag 19:50 · mot AIK" / "LIVE nu · AIK - Hammarby" / "Ingen match i tablån". */
export function followNextLine(ctx: SportCtx, follow: SportFollow, next: SportMatch | null): string {
  if (!next) return ctx.tt('sportNoUpcoming')
  const time = formatClock(next.start, ctx.locale)
  const when = statusAt(next, ctx.now) === 'live'
    ? ctx.tt('sportLiveNowShort')
    : localDayKey(next.start) === localDayKey(ctx.now)
      ? ctx.tt('sportTodayAt', { time })
      : ctx.tt('sportTomorrowAt', { time })
  if (follow.kind === 'league' || !next.home || !next.away) return `${when} · ${matchTitle(next)}`
  const opponent = teamKeysMatch(follow.key, next.homeKey) ? next.away : next.home
  return `${when} · ${ctx.tt('sportVs', { opponent })}`
}
