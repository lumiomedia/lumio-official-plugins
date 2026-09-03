'use client'

import { useEffect, useState } from 'react'
import { requestOpenBrowsePage } from '@/lib/plugin-sdk'
import { encodeChannelParams } from './live-tv-shell'
import { reminderToChannel, startReminderScheduler, tryNativeNotification, type Reminder } from './reminders'
import { useHubText } from './hub-strings'
import { Btn, LT } from './live-tv-ui'

/**
 * App-övergripande påminnelser: schemat körs från pluginets bootstrap, inte
 * från Live TV-sidan — annars kom notisen bara när man redan stod i Live TV
 * (Jerry 2026-09-03). Native notis + en banner i appen; Se nu öppnar kanalen
 * via värdens sidöppning (äldre värdar utan den får bara notisen).
 */
export function LiveTvRemindersMount() {
  const { h } = useHubText()
  const [banner, setBanner] = useState<Reminder | null>(null)
  useEffect(
    () =>
      startReminderScheduler((reminder) => {
        setBanner(reminder)
        tryNativeNotification(reminder.title, h('startsNow', { channel: reminder.channelName }))
      }),
    [h],
  )
  useEffect(() => {
    if (!banner) return
    const timer = window.setTimeout(() => setBanner(null), 20_000)
    return () => window.clearTimeout(timer)
  }, [banner])
  if (!banner) return null
  const channel = reminderToChannel(banner)
  return (
    <div
      role="status"
      style={{
        position: 'fixed', right: 20, bottom: 24, zIndex: 400, maxWidth: 380,
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
        borderRadius: LT.radiusLg, background: 'rgba(11,16,32,0.96)', border: `1px solid ${LT.line}`,
        boxShadow: '0 18px 40px rgba(0,0,0,0.45)', color: LT.text,
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', color: LT.dim }}>{h('startsNow', { channel: banner.channelName })}</div>
        <div className="truncate" style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{banner.title}</div>
      </div>
      <Btn
        variant="primary"
        small
        onClick={() => {
          setBanner(null)
          // autoplay: kanalsidan startar strömmen direkt — Se nu ska inte landa på detaljer (Jerry).
          requestOpenBrowsePage({ pageId: 'live-tv-browse', params: { view: 'channel', autoplay: '1', ...encodeChannelParams(channel) } })
        }}
      >
        {h('hubWatchNow')}
      </Btn>
      <Btn variant="ghost" small onClick={() => setBanner(null)}>{h('back')}</Btn>
    </div>
  )
}
