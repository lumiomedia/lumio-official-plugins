import type { M3uChannel } from '../live-tv-data'
import type { EpgProgramme } from '../epg/types'
import { formatClock } from '../live-tv-ui'
import { buildTimeshiftUrl, channelSupportsCatchUp } from '../catch-up'
import { isReminded, toggleReminder } from '../reminders'
import type { TvGlassMenuAction } from '@/lib/plugin-sdk'
import type { TvNav } from './tv-shell'
import type { TvStringKey } from './tv-strings'
import { displayTitle } from '../display-title'
import { addEpgWatch, getEpgWatches, hasEpgWatch, normalizeWatchQuery, removeEpgWatch } from '../epg-watches'
import { hubText } from '../hub-strings'

/**
 * OK OCH HÅLL OK PÅ ETT PROGRAM (handoff v2, "Guide navigation").
 *
 * Samma regel i guidens tre vyer och i heron: OK på något som sänds spelar
 * kanalen, på något kommande växlar påminnelsen, på något som sänts spelar
 * reprisen (när kanalen har arkiv — annars kanalen). Håll OK öppnar skalets
 * glasmeny; Titta nu, Favorit, Kanaldetaljer, Multivy och Lås finns redan
 * där, så här läggs bara det programmet själv tillför.
 */
export type ProgrammeState = 'past' | 'live' | 'future'

export function programmeState(p: Pick<EpgProgramme, 'start' | 'stop'>, nowMs: number): ProgrammeState {
  if (p.stop <= nowMs) return 'past'
  if (p.start > nowMs) return 'future'
  return 'live'
}

/** Reprisen av ett avslutat program, om det ligger inom kanalens arkivfönster. */
function replayUrl(channel: M3uChannel, p: EpgProgramme, nowMs: number): string | null {
  if (!channelSupportsCatchUp(channel)) return null
  if (p.start < nowMs - channel.archive!.days * 86_400_000) return null
  return buildTimeshiftUrl(channel, p.start, p.stop - p.start)
}

/** Ett pågående program från början, via samma timeshift som reprisen. */
function restartUrl(channel: M3uChannel, p: EpgProgramme): string | null {
  return channelSupportsCatchUp(channel) ? buildTimeshiftUrl(channel, p.start, p.stop - p.start) : null
}

interface Ctx { channel: M3uChannel; programme: EpgProgramme | null; nav: TvNav; nowMs: number }

export function okAction({ channel, programme, nav, nowMs }: Ctx): () => void {
  return () => {
    if (!programme) { nav.play({ channel }); return }
    const state = programmeState(programme, nowMs)
    if (state === 'future') { toggleReminder(channel, programme, nowMs); return }
    if (state === 'past') {
      const url = replayUrl(channel, programme, nowMs)
      nav.play(url ? { channel, url, label: displayTitle(programme.title) } : { channel })
      return
    }
    nav.play({ channel })
  }
}

type TT = (key: TvStringKey, vars?: Record<string, string | number>) => string

export function holdMenu(ctx: Ctx & { element: HTMLElement; tt: TT; locale: string }): void {
  const { channel, programme, nav, nowMs, element, tt, locale } = ctx
  const extra: TvGlassMenuAction[] = []
  if (programme) {
    const state = programmeState(programme, nowMs)
    if (state === 'future') {
      extra.push(isReminded(channel, programme)
        ? { key: 'reminder', label: tt('removeReminder'), run: () => { toggleReminder(channel, programme, nowMs) } }
        : { key: 'reminder', label: tt('remindMeAt', { time: formatClock(programme.start, locale) }), run: () => { toggleReminder(channel, programme, nowMs) } })
    } else if (state === 'live') {
      const url = restartUrl(channel, programme)
      if (url) extra.push({ key: 'restart', label: tt('restartFromStart'), run: () => nav.play({ channel, url, label: displayTitle(programme.title) }) })
    } else {
      const url = replayUrl(channel, programme, nowMs)
      if (url) extra.push({ key: 'replay', label: tt('playReplay'), run: () => nav.play({ channel, url, label: displayTitle(programme.title) }) })
    }
  }
  // Bevaka titeln (epg-watches.ts): samma program nästa gång, på vilken kanal som helst.
  if (programme) {
    const query = normalizeWatchQuery(displayTitle(programme.title))
    const lang = locale.slice(0, 2)
    if (hasEpgWatch(query)) {
      extra.push({ key: 'watch', label: hubText(lang, 'epgWatchStop', { query }), run: () => {
        const found = getEpgWatches().find((w) => w.query.toLowerCase() === query.toLowerCase())
        if (found) removeEpgWatch(found.id)
      } })
    } else {
      extra.push({ key: 'watch', label: hubText(lang, 'epgWatchThis', { query }), run: () => { addEpgWatch(query) } })
    }
  }
  nav.channelMenu(channel, element, extra)
}
