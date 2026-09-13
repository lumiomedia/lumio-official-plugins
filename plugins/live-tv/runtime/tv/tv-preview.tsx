'use client'

import { useRef } from 'react'
import type { M3uChannel } from '../live-tv-data'
import { ChannelArt, Tag, TV, dp, station } from './tv-ui'
import { useVideoSurface } from './video-surface'

export function TvPreview({ channel, enabled, live, width, height, label, onOk, extra }: {
  channel: M3uChannel | null
  /** Inställningen "förhandsvisning" – av = sparad bildruta. */
  enabled: boolean
  /** Kanalen sänder just nu (LIVE-tagg). */
  live: boolean
  width: number | string
  height: number
  label: string
  onOk: () => void
  extra?: Record<string, string>
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const surface = useVideoSurface(ref, channel && enabled ? { channel, url: channel.url } : null, { muted: true, audio: false, enabled })
  const showsVideo = enabled && surface.live && !surface.failed
  return (
    <div ref={ref} {...station(onOk, undefined, extra)} style={{ width, height, borderRadius: dp(14), border: `1px solid ${TV.lineCard}`, position: 'relative', overflow: 'hidden', background: '#05070d', flexShrink: 0, cursor: 'pointer' }}>
      {channel && !showsVideo ? <ChannelArt channel={channel} style={{ position: 'absolute', inset: 0, borderRadius: 0 }} /> : null}
      <span style={{ position: 'absolute', top: dp(12), left: dp(14), fontFamily: TV.mono, fontSize: dp(12), letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(243,244,248,0.55)' }}>{label}</span>
      {live ? <span style={{ position: 'absolute', left: dp(14), bottom: dp(12) }}><Tag variant="live">LIVE</Tag></span> : null}
    </div>
  )
}
