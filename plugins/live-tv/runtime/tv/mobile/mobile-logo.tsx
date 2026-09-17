import { useState } from 'react'
import * as sdk from '@/lib/plugin-sdk'
import { channelKey, getLiveTvLogoSrc, type M3uChannel } from '../../live-tv-data'
import { LiveTvLogoImage } from '../../live-tv-logo-image'
import { USE_PLAYER_FRAMES } from '../tv-ui'
import { initialsOf } from '../../live-tv-ui'
import { MT } from './mobile-tokens'

/**
 * Kanalbild i äkta px: samma kedja som `ChannelArt` i `tv-ui.tsx` (sparad
 * bildruta → logotyp → initialer), men utan barn/overlay — raderna lägger
 * text bredvid, inte ovanpå.
 */
export function MobileLogo({ channel, width, height, radius = 8, frame = true }: {
  channel: Pick<M3uChannel, 'name' | 'logo' | 'logoFallback' | 'url'>
  width: number
  height: number
  radius?: number
  frame?: boolean
}) {
  const [frameFailed, setFrameFailed] = useState(false)
  const [logoFailed, setLogoFailed] = useState(false)
  // Sparade bildrutor av — samma beslut som ChannelArt (USE_PLAYER_FRAMES).
  const frameSrc = USE_PLAYER_FRAMES && frame && !frameFailed && channel.url ? sdk.playerFrameUrl(channelKey(channel), null) : null
  const primaryLogo = getLiveTvLogoSrc(channel.logo)
  const fallbackLogo = getLiveTvLogoSrc(channel.logoFallback)
  const logo = logoFailed ? null : primaryLogo ?? fallbackLogo
  return (
    <div style={{ position: 'relative', width, height, flexShrink: 0, borderRadius: radius, overflow: 'hidden', background: MT.s06, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {frameSrc ? (
        <img src={frameSrc} alt="" onError={() => setFrameFailed(true)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : logo ? (
        <LiveTvLogoImage
          src={logo}
          fallbackSrc={primaryLogo ? fallbackLogo : undefined}
          alt=""
          className="lumio-tv-logo-img"
          onError={() => setLogoFailed(true)}
        />
      ) : (
        <span data-initials="" aria-hidden="true" style={{ fontSize: 13, fontWeight: 600, color: MT.dim, letterSpacing: '0.04em' }}>{initialsOf(channel.name)}</span>
      )}
    </div>
  )
}
