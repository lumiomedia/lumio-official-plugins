'use client'

import { useEffect, useRef } from 'react'
import type { M3uChannel } from '../live-tv-data'
import { ChannelArt, Tag, TV, dp, station } from './tv-ui'
import { useVideoSurface } from './video-surface'
import { logSurfaceStack } from './surface-diagnostics'

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
  // Kanalbilden ligger kvar tills FÖRSTA BILDRUTAN är ritad (`ready`), inte
  // bara tills ytan finns — samma regel som LivePreviewArt. På ett konto med
  // en anslutning kan starten ta länge, och rutan stod svart under tiden.
  const showsVideo = enabled && surface.live && surface.ready && !surface.failed
  const starting = enabled && surface.live && !surface.ready && !surface.failed
  // Samma felsökningsrad som multivyn: när bilden är ritad men rutan ändå är
  // svart (Jerry 2026-11-10, efter att en kanal spelats) säger loggen vilket
  // element som målar över ytan — inget av det syns annars i appens logg.
  useEffect(() => {
    if (!showsVideo) return
    const tiles = () => (ref.current ? [ref.current] : [])
    const timers = [1500, 5000].map((ms) => window.setTimeout(() => logSurfaceStack(`guide-förhandsvisning +${ms} ms`, tiles()), ms))
    return () => { for (const t of timers) window.clearTimeout(t) }
  }, [showsVideo])
  return (
    // Samma regel som multivyns ruta: en NATIV yta ritas UNDER webbvyn, så
    // plattan måste bort medan bilden spelar (skalet klipper hålet i sin
    // bakgrund). Etiketten och LIVE-taggen är överlager inne i rutan.
    //
    // `minHeight` speglar alltid `height`: rutan är en station (`role="button"`)
    // och får inte klämmas ihop av en flex-förälder under sin uttalade höjd.
    <div ref={ref} {...station(onOk, undefined, extra)}
      style={{ width, height, minHeight: height, borderRadius: dp(14), border: `1px solid ${TV.lineCard}`, position: 'relative', overflow: 'hidden', background: showsVideo ? 'transparent' : '#05070d', flexShrink: 0, cursor: 'pointer' }}>
      {channel && !showsVideo ? <ChannelArt channel={channel} style={{ position: 'absolute', inset: 0, borderRadius: 0 }} /> : null}
      <span style={{ position: 'absolute', top: dp(12), left: dp(14), fontFamily: TV.mono, fontSize: dp(12), letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(243,244,248,0.55)' }}>{label}</span>
      {live ? <span style={{ position: 'absolute', left: dp(14), bottom: dp(12) }}><Tag variant="live">LIVE</Tag></span> : null}
      {starting ? (
        <span data-testid="preview-spinner" aria-hidden="true" style={{ position: 'absolute', top: dp(10), right: dp(10), width: dp(22), height: dp(22), borderRadius: '50%', background: 'rgba(17,19,26,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}>
          <style>{'@keyframes lumio-livetv-spin{to{transform:rotate(360deg)}}'}</style>
          <span style={{ width: dp(12), height: dp(12), borderRadius: '50%', border: '2px solid rgba(255,255,255,0.25)', borderTopColor: 'rgba(255,255,255,0.9)', animation: 'lumio-livetv-spin 0.7s linear infinite' }} />
        </span>
      ) : null}
    </div>
  )
}
