'use client'

import { useEffect, useRef } from 'react'
import { requestOpenBrowsePage, showSystemNotification } from '@/lib/plugin-sdk'
import { encodeChannelParams } from './live-tv-shell'
import { reminderToChannel, startReminderScheduler, tryNativeNotification, type Reminder } from './reminders'
import { startEpgWatchSync } from './epg-watches'
import { startSportAlertSync } from './sport/sport-alerts'
import { useHubText } from './hub-strings'
import { ToastCenter, pushToast } from './toast-center'
import { displayTitle } from './display-title'

/**
 * App-övergripande påminnelser: schemat körs från pluginets bootstrap, inte
 * från Live TV-sidan — annars kom notisen bara när man redan stod i Live TV
 * (Jerry 2026-09-03). Native notis + en banner i appen; Se nu öppnar kanalen
 * via värdens sidöppning (äldre värdar utan den får bara notisen).
 */
const channelPage = (reminder: Reminder) => ({
  pageId: 'live-tv-browse',
  params: { view: 'channel', autoplay: '1', ...encodeChannelParams(reminderToChannel(reminder)) },
})

/**
 * Systemnotis (Android-notis via värden, annars webbens). Äldre värdar utan
 * seamen får den gamla bästa-ansträngningsnotisen.
 */
function notify(id: string, title: string, body: string, reminder: Reminder): void {
  if (typeof showSystemNotification !== 'function') { tryNativeNotification(title, body); return }
  void showSystemNotification({ id, title, body, openPage: channelPage(reminder) }).catch(() => tryNativeNotification(title, body))
}

export function LiveTvRemindersMount() {
  const { h, locale } = useHubText()
  useEffect(
    () =>
      startReminderScheduler((reminder) => {
        notify(`reminder:${reminder.id}`, displayTitle(reminder.title), h('startsNow', { channel: reminder.channelName }), reminder)
        const channel = reminderToChannel(reminder)
        pushToast({
          key: `reminder:${reminder.id}`,
          kicker: h('startsNow', { channel: reminder.channelName }),
          title: displayTitle(reminder.title),
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
  // Bevaka i tablån: sökord som dyker upp i guiden (epg-watches.ts). Texterna
  // läses via ref: synken ska inte startas om (och tappa sitt startfönster)
  // varje gång monteringen ritas om.
  const textRef = useRef({ h, locale })
  textRef.current = { h, locale }
  useEffect(
    () =>
      startEpgWatchSync((watch, reminders) => {
        const { h: hh, locale: loc } = textRef.current
        const first = reminders[0]
        if (!first) return
        const when = new Date(first.start).toLocaleString(loc, { weekday: 'short', hour: '2-digit', minute: '2-digit' })
        const title = hh('epgWatchFoundTitle', { query: watch.query })
        const line = hh('epgWatchFoundBody', { title: first.title, when, channel: first.channelName })
        // EN notis per sökord och synk, hur många träffar det än blev.
        const body = reminders.length > 1 ? `${line} · ${hh('epgWatchMore', { n: reminders.length - 1 })}` : line
        notify(`watch:${watch.id}`, title, body, first)
        pushToast({
          key: `watch:${watch.id}`,
          kicker: title,
          title: reminders.length > 1 ? `${first.title} · ${when} · ${hh('epgWatchMore', { n: reminders.length - 1 })}` : `${first.title} · ${when}`,
          watchLabel: hh('hubWatchNow'),
          onWatch: () => requestOpenBrowsePage(channelPage(first)),
          dismissLabel: hh('back'),
          timeoutMs: 15_000,
        })
      }),
    [],
  )
  // Stapeln för alla notiser i appen (påminnelser och mål), fjärrbar på TV — toast-center.tsx.
  return <ToastCenter />
}
