/** Kanalbadge: initialer på kanalens färgton. Storleken i px styr allt annat. */
import type { CSSProperties } from 'react'
import { channelInitials, hueTint, type ChannelDef } from '../model/channel'
import { C, FONT } from './tokens'
import { tvu } from './tv'

/** `isTv`: storleken räknas i appens TV-enhet (se tv.ts), som resten av TV-layouten. */
export function ChannelBadge({ channel, size = 44, isTv = false, style }: { channel: Pick<ChannelDef, 'name' | 'hue'>; size?: number; isTv?: boolean; style?: CSSProperties }) {
  return (
    <span
      aria-hidden="true"
      data-channel-badge=""
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        width: isTv ? tvu(size) : size,
        height: isTv ? tvu(size) : size,
        borderRadius: isTv ? tvu(Math.round(size * 0.18)) : Math.round(size * 0.18),
        background: hueTint(channel.hue, 0.26),
        border: `1px solid ${hueTint(channel.hue, 0.45)}`,
        color: C.text,
        fontFamily: FONT.mono,
        fontWeight: 700,
        // Relativt badgen, inte en fast px-storlek för text.
        fontSize: isTv ? tvu(size * 0.34) : `${(size * 0.34) / 16}rem`,
        lineHeight: 1,
        letterSpacing: '0.02em',
        ...style,
      }}
    >
      {channelInitials(channel.name) || '#'}
    </span>
  )
}
