/** Kanalbadge: initialer på kanalens färgton. Storleken i px styr allt annat. */
import type { CSSProperties } from 'react'
import { channelInitials, hueTint, type ChannelDef } from '../model/channel'
import { C, FONT } from './tokens'

export function ChannelBadge({ channel, size = 44, style }: { channel: Pick<ChannelDef, 'name' | 'hue'>; size?: number; style?: CSSProperties }) {
  return (
    <span
      aria-hidden="true"
      data-channel-badge=""
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.18),
        background: hueTint(channel.hue, 0.26),
        border: `1px solid ${hueTint(channel.hue, 0.45)}`,
        color: C.text,
        fontFamily: FONT.mono,
        fontWeight: 700,
        // Relativt badgen, inte en fast px-storlek för text.
        fontSize: `${(size * 0.34) / 16}rem`,
        letterSpacing: '0.02em',
        ...style,
      }}
    >
      {channelInitials(channel.name) || '#'}
    </span>
  )
}
