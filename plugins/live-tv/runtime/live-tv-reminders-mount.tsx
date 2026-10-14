'use client'

import { useEffect } from 'react'
import { requestOpenBrowsePage } from '@/lib/plugin-sdk'
import { encodeChannelParams } from './live-tv-shell'
import { reminderToChannel, startReminderScheduler, tryNativeNotification } from './reminders'
import { startSportAlertSync } from './sport/sport-alerts'
import { useHubText } from './hub-strings'
import { ToastCenter, pushToast } from './toast-center'

/**
 * App-övergripande påminnelser: schemat körs från pluginets bootstrap, inte
 * från Live TV-sidan — annars kom notisen bara när man redan stod i Live TV
 * (Jerry 2026-09-03). Native notis + en banner i appen; Se nu öppnar kanalen
 * via värdens sidöppning (äldre värdar utan den får bara notisen).
 */
export function LiveTvRemindersMount() {
  const { h } = useHubText()
  useEffect(
    () =>
      startReminderScheduler((reminder) => {
        tryNativeNotification(reminder.title, h('startsNow', { channel: reminder.channelName }))
        const channel = reminderToChannel(reminder)
        pushToast({
          key: `reminder:${reminder.id}`,
          kicker: h('startsNow', { channel: reminder.channelName }),
          title: reminder.title,
          watchLabel: h('hubWatchNow'),
          // autoplay: kanalsidan startar strömmen direkt — Se nu ska inte landa på detaljer (Jerry).
          onWatch: () => requestOpenBrowsePage({ pageId: 'live-tv-browse', params: { view: 'channel', autoplay: '1', ...encodeChannelParams(channel) } }),
          dismissLabel: h('back'),
          timeoutMs: 20_000,
        })
      }),
    [h],
  )
  // Avsparksnotisen: följda lags matcher blir påminnelser (spec: Följer).
  useEffect(() => startSportAlertSync(), [])
  // Stapeln för alla notiser i appen (påminnelser och mål), fjärrbar på TV — toast-center.tsx.
  return <ToastCenter />
}
