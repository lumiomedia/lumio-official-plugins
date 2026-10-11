'use client'

import { onPluginStorageChanged } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, channelKey } from '../live-tv-data'
import { reminderId, replaceSportReminders, type Reminder } from '../reminders'
import { fetchSportDay, localDayKey, shiftDay } from './sport-epg'
import { matchTitle, sourceChannel, type SportDay } from './sport-model'
import { followState, rankedSources, statusAt } from './sport-day-model'
import {
  SPORT_ALERT_SKIP_KEY, SPORT_FOLLOWS_KEY, SPORT_OVERRIDES_KEY, SPORT_SETTINGS_KEY, getAlertSkips, getFollows, getOverrides, getSportSettings,
  followAlert, type KickoffAlert, type SportFollow, type SportOverrides,
} from './sport-store'

/*
  AVSPARKSNOTISEN = VANLIGA PÅMINNELSER.

  Följda lags kommande matcher blir `Reminder` med `origin: 'sport'` och en
  egen förvarning. Schemaläggaren i `reminders.ts` visar dem som vilken
  påminnelse som helst — bara medan appen körs (spec). Synken läser dagen
  lokalt (`/sport/day`) och anropar ingenting alls när inget följs.
*/

export const KICKOFF_LEAD_MS = { '15': 15 * 60_000, kickoff: 0 } as const
export const SPORT_ALERT_SYNC_MS = 30 * 60_000

/** Finns det någon klocka på alls? Annars behöver synken inte läsa någon dag. */
export const anyAlertOn = (follows: SportFollow[], global: KickoffAlert) => follows.some((f) => followAlert(f, global) !== 'off')
const EARLIEST: KickoffAlert[] = ['15', 'kickoff']

export function kickoffReminders(
  days: (SportDay | null)[],
  follows: SportFollow[],
  alert: KickoffAlert,
  overrides: SportOverrides,
  now: number,
  /** Matcher där användaren bockat av påminnelsen (`sport_alert_skip_v1`). */
  skip: Record<string, number> = {},
): Reminder[] {
  if (!anyAlertOn(follows, alert)) return []
  const out: Reminder[] = []
  for (const day of days) {
    for (const m of day?.matches ?? []) {
      if (m.rerun || m.id in skip || statusAt(m, now) !== 'upcoming') continue
      // Flera följda på samma match (lag + liga): den tidigaste förvarningen gäller.
      const wanted = new Set(follows.filter((f) => followState(m, [f]).any).map((f) => followAlert(f, alert)))
      const lead = EARLIEST.find((a) => wanted.has(a))
      if (!lead) continue
      const source = rankedSources(m, overrides)[0]
      if (!source) continue
      const channel = sourceChannel(source)
      out.push({
        id: reminderId(channel, { start: source.programmeStart }),
        channelKey: channelKey(channel),
        channelName: channel.name,
        channelUrl: channel.url,
        channelLogo: channel.logo ?? null,
        channelGroup: channel.group,
        channelTvgId: channel.tvgId,
        title: matchTitle(m),
        start: source.programmeStart,
        stop: source.programmeStop,
        createdAt: now,
        leadMs: KICKOFF_LEAD_MS[lead as '15' | 'kickoff'],
        origin: 'sport',
      })
    }
  }
  return out
}

export async function syncKickoffReminders(now: number = Date.now()): Promise<void> {
  const follows = getFollows()
  const { alert } = getSportSettings()
  if (!anyAlertOn(follows, alert)) {
    replaceSportReminders([], now)
    return
  }
  const today = localDayKey(now)
  const days = await Promise.all([today, shiftDay(today, 1)].map((day) => fetchSportDay(day, now).catch(() => null)))
  replaceSportReminders(kickoffReminders(days, follows, alert, getOverrides(), now, getAlertSkips()), now)
}

/** Första synken väntar så att appstarten (och en film som startas direkt) inte delar tid med EPG-läsningen. */
export const SPORT_ALERT_START_DELAY_MS = 60_000

const hidden = () => typeof document !== 'undefined' && document.visibilityState === 'hidden'

/*
  `/sport/day` läser hela EPG-lagret till minnet. Därför: aldrig medan appen
  ligger i bakgrunden (Android släpper lagret där — en tick skulle läsa in det
  igen), och inte förrän en stund efter start. Blir appen synlig igen körs en
  ikappsynk.
*/
export function startSportAlertSync(): () => void {
  let stopped = false
  let ready = false
  const run = () => {
    if (stopped || !ready || hidden()) return
    void syncKickoffReminders().catch(() => {})
  }
  const startTimer = window.setTimeout(() => {
    ready = true
    run()
  }, SPORT_ALERT_START_DELAY_MS)
  const timer = window.setInterval(run, SPORT_ALERT_SYNC_MS)
  const onVisibility = () => { if (!hidden()) run() }
  document.addEventListener('visibilitychange', onVisibility)
  const offs = [SPORT_FOLLOWS_KEY, SPORT_SETTINGS_KEY, SPORT_OVERRIDES_KEY, SPORT_ALERT_SKIP_KEY].map((key) => onPluginStorageChanged(LIVE_TV_PLUGIN_ID, key, run))
  return () => {
    stopped = true
    window.clearTimeout(startTimer)
    window.clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisibility)
    for (const off of offs) off()
  }
}
