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

export function LivePreviewArt({ channel, live, enabled, height, aspect, radius, children, style }: {
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
  const showsVideo = wanted && surface.live && !surface.failed

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
      {showsVideo ? null : (
        <ChannelArt channel={channel} height={height} aspect={aspect} radius={radius} style={{ position: 'absolute', inset: 0, height: '100%', borderRadius: 'inherit' }} />
      )}
      {children}
    </div>
  )
}
