'use client'

import { useState, type CSSProperties, type ReactNode } from 'react'
import { getLiveTvLogoSrc, type M3uChannel } from '../live-tv-data'
import { LiveTvLogoImage } from '../live-tv-logo-image'
import { initialsOf } from '../live-tv-ui'
import { dp } from './tv-ui'
import { FOCUS_BTN, FOCUS_INSET, V2 } from './v2-tokens'

type LogoChannel = Pick<M3uChannel, 'name' | 'logo' | 'logoFallback'>

/**
 * Den ljusa logoplattan (handoff v2): riktiga logor på `#f3f4f8` med luft runt,
 * initialer som reserv. Kanalnumret ligger som en liten mörk bricka i plattans
 * övre vänstra hörn — aldrig över själva logon.
 */
export function LogoPlate({ channel, width, height, number, radius, style }: {
  channel: LogoChannel
  width: number
  height: number
  number?: number | null
  radius?: number
  style?: CSSProperties
}) {
  const [failed, setFailed] = useState(false)
  const primary = getLiveTvLogoSrc(channel.logo)
  const fallback = getLiveTvLogoSrc(channel.logoFallback)
  const logo = failed ? null : primary ?? fallback
  const r = radius ?? Math.max(6, Math.min(14, Math.round(height / 7)))
  return (
    <div data-testid="logo-plate" style={{ position: 'relative', width: dp(width), height: dp(height), flexShrink: 0, borderRadius: dp(r), background: V2.logoPlate, boxShadow: '0 8px 24px rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...style }}>
      {logo ? (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '78%', height: '70%' }}>
          <LiveTvLogoImage src={logo} fallbackSrc={primary ? fallback : undefined} alt="" className="lumio-v2-logo-img" onError={() => setFailed(true)} />
        </span>
      ) : (
        <span aria-hidden="true" style={{ color: V2.logoText, fontWeight: 800, fontSize: dp(Math.round(height * 0.36)), letterSpacing: '0.02em' }}>{initialsOf(channel.name)}</span>
      )}
      {number != null ? (
        <span data-testid="logo-plate-number" style={{ position: 'absolute', top: dp(3), left: dp(3), padding: `0 ${dp(5)}px`, borderRadius: dp(5), background: 'rgba(17,19,26,.78)', color: V2.text, fontSize: dp(Math.max(11, Math.round(height * 0.2))), fontWeight: 700, lineHeight: 1.35, fontVariantNumeric: 'tabular-nums' }}>{number}</span>
      ) : null}
    </div>
  )
}

/** LIVE-pillen: mjuk på ytor, solid på bild (Sänds nu-korten). */
export function LivePill({ solid = false, label = 'LIVE' }: { solid?: boolean; label?: string }) {
  return (
    <span data-testid="live-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: dp(6), height: dp(24), padding: `0 ${dp(9)}px`, borderRadius: dp(8), background: solid ? V2.liveSolid : V2.liveBg, color: solid ? '#fff' : V2.liveText, fontSize: dp(12), fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', flexShrink: 0 }}>
      <span style={{ width: dp(8), height: dp(8), borderRadius: 999, background: solid ? '#fff' : V2.liveDot }} />{label}
    </span>
  )
}

/** Tangentlocket i Upplevelses tangentlegend (`[OK] Titta nu`). */
export function KeyCap({ children }: { children: ReactNode }) {
  return <span style={{ padding: `${dp(6)}px ${dp(14)}px`, borderRadius: dp(8), background: 'rgba(252,252,255,.12)', fontWeight: 700 }}>{children}</span>
}

/** Bildytan när programmet saknar bild. */
export function NoArt({ children, style }: { children?: ReactNode; style?: CSSProperties }) {
  return <div style={{ position: 'absolute', inset: 0, background: V2.noArt, display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}>{children}</div>
}

/** Programbild om den finns, annars utan-bild-ytan med en centrerad logoplatta. */
export function ProgrammeArtBox({ url, channel, plate, height, radius, children, style }: {
  url: string | null
  channel: LogoChannel
  plate: [number, number]
  height: number
  radius: number
  children?: ReactNode
  style?: CSSProperties
}) {
  const [broken, setBroken] = useState<string | null>(null)
  const showImage = url !== null && broken !== url
  return (
    <div style={{ position: 'relative', height: dp(height), borderRadius: dp(radius), overflow: 'hidden', flexShrink: 0, ...style }}>
      {showImage ? (
        <img data-testid="programme-art-img" src={url} alt="" onError={() => setBroken(url)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <NoArt><LogoPlate channel={channel} width={plate[0]} height={plate[1]} /></NoArt>
      )}
      {children}
    </div>
  )
}

/**
 * v2-fokusringen (handoff "Focus"): stationer med `data-v2f="inset"` (guidens
 * celler, tätt packade) eller `data-v2f="btn"` (segment, chips, pills) får
 * accentringen som box-shadow i stället för appens outline. Samma grind som
 * `TvFocusStyle`: ingen ring när fokus kom från pekaren.
 */
export function V2FocusStyle() {
  const on = ':root:not([data-focus-source="pointer"]) [data-live-tv-tv-root]:not([data-lt-phone="1"])'
  return (
    <style>{`
[data-live-tv-tv-root] [data-v2f][data-f] { outline: none !important; }
${on} [data-v2f="inset"][data-f]:focus, ${on} [data-v2f="inset"][data-f][data-fcur="1"] { box-shadow: ${FOCUS_INSET} !important; }
${on} [data-v2f="btn"][data-f]:focus, ${on} [data-v2f="btn"][data-f][data-fcur="1"] { box-shadow: ${FOCUS_BTN} !important; }
`}</style>
  )
}
