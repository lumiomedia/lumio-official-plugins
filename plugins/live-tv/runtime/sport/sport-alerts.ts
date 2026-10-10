'use client'

import { onPluginStorageChanged } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, channelKey } from '../live-tv-data'
import { reminderId, replaceSportReminders, type Reminder } from '../reminders'
import { fetchSportDay, localDayKey, shiftDay } from './sport-epg'
import { matchTitle, sourceChannel, type SportDay } from './sport-model'
import { followState, rankedSources, statusAt } from './sport-day-model'
import {
  SPORT_FOLLOWS_KEY, SPORT_OVERRIDES_KEY, SPORT_SETTINGS_KEY, getFollows, getOverrides, getSportSettings,
  type KickoffAlert, type SportFollow, type SportOverrides,
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

export function kickoffReminders(
  days: (SportDay | null)[],
  follows: SportFollow[],
  alert: KickoffAlert,
  overrides: SportOverrides,
  now: number,
): Reminder[] {
  if (alert === 'off' || follows.length === 0) return []
  const out: Reminder[] = []
  for (const day of days) {
    for (const m of day?.matches ?? []) {
      if (m.rerun || statusAt(m, now) !== 'upcoming' || !followState(m, follows).any) continue
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
        leadMs: KICKOFF_LEAD_MS[alert],
        origin: 'sport',
      })
    }
  }
  return out
}

export async function syncKickoffReminders(now: number = Date.now()): Promise<void> {
  const follows = getFollows()
  const { alert } = getSportSettings()
  if (alert === 'off' || follows.length === 0) {
    replaceSportReminders([], now)
    return
  }
  const today = localDayKey(now)
  const days = await Promise.all([today, shiftDay(today, 1)].map((day) => fetchSportDay(day, now).catch(() => null)))
  replaceSportReminders(kickoffReminders(days, follows, alert, getOverrides(), now), now)
}

export function startSportAlertSync(): () => void {
  let stopped = false
  const run = () => {
    if (!stopped) void syncKickoffReminders().catch(() => {})
  }
  run()
  const timer = window.setInterval(run, SPORT_ALERT_SYNC_MS)
  const offs = [SPORT_FOLLOWS_KEY, SPORT_SETTINGS_KEY, SPORT_OVERRIDES_KEY].map((key) => onPluginStorageChanged(LIVE_TV_PLUGIN_ID, key, run))
  return () => {
    stopped = true
    window.clearInterval(timer)
    for (const off of offs) off()
  }
}
