import { channelKey, type M3uChannel } from './live-tv-data'
import { displayTitle } from './display-title'
import type { EpgProgramme } from './epg/types'
import type { ScheduleBody } from './recordings'

/** Marginalerna ur `TvSettings` (minuter). */
export interface RecordMargins {
  startEarlyMin: number
  endLateMin: number
}

export const RECORD_START_EARLY_OPTIONS = [0, 1, 2, 5] as const
export const RECORD_END_LATE_OPTIONS = [0, 5, 10, 15] as const
export const RECORD_KEEP_FREE_OPTIONS = [1, 2, 5, 10] as const
export type RecordStartEarlyMin = (typeof RECORD_START_EARLY_OPTIONS)[number]
export type RecordEndLateMin = (typeof RECORD_END_LATE_OPTIONS)[number]
/** Utan tablå spelas det in så här länge, tills man stoppar själv. */
export const RECORD_NO_EPG_MS = 3 * 60 * 60 * 1000

const MIN = 60_000

function base(channel: M3uChannel): Pick<ScheduleBody, 'channelName' | 'channelKey' | 'playUrl' | 'logo'> {
  return { channelName: channel.name, channelKey: channelKey(channel), playUrl: channel.url, logo: channel.logo ?? undefined }
}

/** Ett kommande (eller pågående) program: programtiderna plus marginalerna. */
export function planFromProgramme(channel: M3uChannel, programme: Pick<EpgProgramme, 'title' | 'start' | 'stop'>, margins: RecordMargins): ScheduleBody {
  return {
    ...base(channel),
    title: displayTitle(programme.title) || channel.name,
    startAt: programme.start - margins.startEarlyMin * MIN,
    stopAt: programme.stop + margins.endLateMin * MIN,
    programmeStart: programme.start,
    programmeStop: programme.stop,
  }
}

/** Spela in från nu: till programmets slut plus marginal, eller tre timmar utan tablå. */
export function planFromNow(channel: M3uChannel, now: Pick<EpgProgramme, 'title' | 'start' | 'stop'> | null, nowMs: number, margins: RecordMargins): ScheduleBody {
  if (!now) {
    return { ...base(channel), title: channel.name, startAt: nowMs, stopAt: nowMs + RECORD_NO_EPG_MS }
  }
  return {
    ...base(channel),
    title: displayTitle(now.title) || channel.name,
    startAt: nowMs,
    stopAt: now.stop + margins.endLateMin * MIN,
    programmeStart: now.start,
    programmeStop: now.stop,
  }
}
