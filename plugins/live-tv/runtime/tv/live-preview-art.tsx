'use client'

/**
 * Kanalbild SOM SPELAR när kanalen sänder.
 *
 * Den omdesignade guiden (Grid / Now-Next / Timeline) ritade sin bildruta med
 * `ChannelArt` rakt av och hade därmed ingen förhandsvisning alls — varken i
 * infobannern eller i detaljpanelen. Handoffen §2 skrev "ingen TvPreview,
 * ingen ström — det är en stillbild", och det följdes ordagrant. Men bara
 * STILLBILDEN skulle bort; live-förhandsvisningen var aldrig menad att
 * försvinna (Jerry 2026-09-20: "det var ett misstag som jag vill ha fixat,
 * live preview ska finnas").
 *
 * Komponenten är därför inte en ny design utan en INSLAGNING: samma låda,
 * samma mått, samma barn (LIVE-taggen, gradienter) som `ChannelArt` — den
 * byter bara ut innehållet mot en levande yta när det går.
 *
 * Reservkedjan är oförändrad: spelar ytan inte, ritas `ChannelArt` precis som
 * förut. Det gäller varje skäl den kan låta bli — kanalen sänder inget just
 * nu, inställningen är av, ytan är upptagen av spelaren, eller uppslaget
 * misslyckades. Rutan står alltså aldrig tom.
 */

import { useRef, type CSSProperties, type ReactNode } from 'react'
import type { M3uChannel } from '../live-tv-data'
import { ChannelArt } from './tv-ui'
import { useVideoSurface } from './video-surface'

export function LivePreviewArt({ channel, live, enabled, height, aspect, radius, children, style, fallback }: {
  channel: M3uChannel | null
  /** Kanalen sänder just nu. Utan program finns inget att visa. */
  live: boolean
  /** Inställningen "förhandsvisning" i Live TV:s egna inställningar. */
  enabled: boolean
  height?: number
  aspect?: string
  radius?: number
  children?: ReactNode
  style?: CSSProperties
  /** Det som ritas när ingen video spelar. Standard: `ChannelArt`. */
  fallback?: ReactNode
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const wanted = Boolean(channel) && live && enabled
  const surface = useVideoSurface(
    ref,
    channel && wanted ? { channel, url: channel.url } : null,
    // Tyst, och aldrig ljudägare: det här är en förhandsvisning bredvid en
    // lista, inte uppspelning. Ljudet hör till spelaren.
    { muted: true, audio: false, enabled: wanted },
  )
  // Reservbilden ligger kvar tills FÖRSTA BILDRUTAN är ritad (`ready`), inte
  // bara tills ytan finns: en live-kanal tar sekunder att starta, och under
  // tiden stod rutan svart (Jerry 2026-10-30).
  const showsVideo = wanted && surface.live && surface.ready && !surface.failed
  // Strömmen startar (ytan finns, ingen bild än): en liten spinner visar att
  // något händer — en live-kanal tar ett par sekunder (Jerry 2026-10-30).
  const starting = wanted && surface.live && !surface.ready && !surface.failed

  if (!channel) return null
  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        height,
        aspectRatio: aspect,
        borderRadius: radius,
        overflow: 'hidden',
        /*
          Genomskinlig MEDAN bilden spelar. En nativ yta (mpv/droid) ritas
          UNDER webbvyn, och skalet klipper hål i sin bakgrund där rutan står
          — en ogenomskinlig platta här hade lagt sig över hålet och gett ljud
          utan bild. HTML-motorn lägger i stället sin video inuti rutan och
          bryr sig inte.
        */
        background: showsVideo ? 'transparent' : undefined,
        ...style,
      }}
    >
      {showsVideo ? null : fallback !== undefined ? fallback : (
        <ChannelArt channel={channel} height={height} aspect={aspect} radius={radius} style={{ position: 'absolute', inset: 0, height: '100%', borderRadius: 'inherit' }} />
      )}
      {starting ? (
        <span data-testid="preview-spinner" aria-hidden="true" style={{ position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: '50%', background: 'rgba(17,19,26,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}>
          <style>{'@keyframes lumio-livetv-spin{to{transform:rotate(360deg)}}'}</style>
          <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.25)', borderTopColor: 'rgba(255,255,255,0.9)', animation: 'lumio-livetv-spin 0.7s linear infinite' }} />
        </span>
      ) : null}
      {children}
    </div>
  )
}
