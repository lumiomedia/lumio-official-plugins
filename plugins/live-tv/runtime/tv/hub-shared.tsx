'use client'

import { useEffect, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react'
import { channelKey, type M3uChannel } from '../live-tv-data'
import { progressOf } from '../live-tv-ui'
import { qualityFromName, type LiveTvModel } from '../live-tv-model'
import type { TvNav } from './tv-shell'
import { Icons, TV, dp, station } from './tv-ui'
import { useTvText } from './tv-strings'
import { V2 } from './v2-tokens'
import { LogoPlate, V2FocusStyle } from './v2-ui'

/**
 * DELAT MELLAN KANALERS TVÅ LAYOUTER (Klassisk och Upplevelse): hälsningen i
 * topraden och spellistpillen med sin meny. Telefonen har egna (mobile/).
 */


/**
 * Värdens klocka, högerställd. Ingen egen hälsning: värdens klocknod hälsar
 * redan ("God kväll Lumio"), och två rader hälsning stod på varandra.
 */
export function HubGreeting({ clock }: { nowMs?: number; clock: ReactNode }) {
  return (
    <div data-testid="hub-clock" style={{ marginLeft: 'auto', flexShrink: 0, textAlign: 'right' }}>
      {clock}
    </div>
  )
}

/**
 * Spellistpillen och dess meny. Menyn är ett lager: Bakåt stänger, fokus
 * tillbaka till pillen.
 *
 * Effekten beror BARA på `open` — en gång per öppning. Med `nav` i listan
 * kördes den om vid varje omrender av skalet (minuttick, lagringsändring) och
 * flyttade då fokus tillbaka till [data-init] mitt i att användaren pilade i
 * menyn. `nav` läses i stället ur en ref.
 */
export function HubPlaylistPill({ model, nav, init, height, onPicked }: {
  model: LiveTvModel
  nav: TvNav
  /** Pillen bär vyns `data-init` (inga kort att landa på). */
  init: boolean
  height: number
  /** Efter byte av spellista: vyn nollställer sitt filter. */
  onPicked: () => void
}) {
  const { tt } = useTvText()
  const [open, setOpen] = useState(false)
  const pillRef = useRef<HTMLDivElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const navRef = useRef(nav)
  useEffect(() => { navRef.current = nav })
  useEffect(() => {
    if (!open) return
    const close = () => { setOpen(false); window.setTimeout(() => pillRef.current?.focus({ preventScroll: true }), 0) }
    const off = navRef.current.pushLayer(close)
    window.setTimeout(() => menuRef.current?.querySelector<HTMLElement>('[data-init]')?.focus({ preventScroll: true }), 0)
    return off
  }, [open])

  return (
    <div style={{ position: 'relative' }}>
      <div ref={pillRef} data-testid="playlist-pill" {...station(() => setOpen(true), undefined, { 'data-v2f': 'btn', ...(init ? { 'data-init': '' } : {}) })} style={{ height: dp(height), minHeight: dp(height), padding: `0 ${dp(22)}px`, borderRadius: 999, background: V2.surface4, display: 'inline-flex', alignItems: 'center', gap: dp(10), fontSize: dp(20), fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer' }}>
        {model.activePlaylistName ?? tt('allPlaylists')} <Icons.ChevronDown />
      </div>
      {open ? (
        <div ref={menuRef} role="menu" data-panel-root="" data-scroll="" data-live-tv-layer="" style={{ position: 'absolute', top: `calc(100% + ${dp(8)}px)`, left: 0, zIndex: 60, width: dp(380), padding: dp(8), borderRadius: dp(16), background: 'rgba(58,59,66,0.98)', boxShadow: '0 24px 64px rgba(0,0,0,0.55)', maxHeight: dp(560), overflowY: 'auto' }}>
          {[{ id: null as string | null, name: tt('allPlaylists'), count: model.allChannels.length }, ...model.playlists].map((p) => {
            const active = (model.activePlaylistId ?? null) === p.id
            return (
              <div key={p.id ?? '__all'} data-testid={`playlist-${p.id ?? 'all'}`} data-live-tv-menu-item="" {...station(() => { model.setActivePlaylist(p.id); setOpen(false); onPicked(); window.setTimeout(() => pillRef.current?.focus({ preventScroll: true }), 0) }, undefined, active ? { 'data-init': '' } : {})} style={{ height: dp(56), minHeight: dp(56), padding: `0 ${dp(16)}px`, borderRadius: dp(12), display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: active ? TV.s12 : 'transparent', cursor: 'pointer' }}>
                <span style={{ fontSize: dp(19), fontWeight: 600 }}>{p.name}</span>
                <span style={{ fontSize: dp(14), color: 'rgba(243,244,248,0.5)' }}>{tt('channelsCount', { count: p.count })}</span>
              </div>
            )
          })}
          <div data-live-tv-menu-item="" {...station(() => { setOpen(false); nav.go('settings', { tab: 'playlists' }) })} style={{ height: dp(56), minHeight: dp(56), padding: `0 ${dp(16)}px`, display: 'flex', alignItems: 'center', fontSize: dp(17), color: 'rgba(243,244,248,0.65)', borderTop: `1px solid ${TV.line}`, marginTop: dp(4), cursor: 'pointer' }}>{tt('addPlaylist')}</div>
        </div>
      ) : null}
    </div>
  )
}

/**
 * Inga kanaler. Kanalerna kommer ur appens index: tomt betyder "hämtar" tills
 * sidhämtningen är klar, annars "lägg till en spellista". Utan skillnaden
 * möttes varje kallstart av tomsidan i en halv sekund.
 */
export function HubEmptyState({ testId, model, nav, background }: { testId: string; model: LiveTvModel; nav: TvNav; background: string }) {
  const { tt } = useTvText()
  return (
    <div data-testid={testId} style={{ flex: 1, background, color: V2.text, padding: dp(48), display: 'flex', flexDirection: 'column', gap: dp(16) }}>
      <V2FocusStyle />
      <div style={{ fontSize: dp(34), fontWeight: 600 }}>{model.channelsLoading ? tt('loadingChannels') : tt('emptyTitle')}</div>
      <div style={{ fontSize: dp(20), color: TV.muted }}>{model.channelsLoading ? '' : tt('emptyBody')}</div>
      <div {...station(() => nav.go('settings'), undefined, { 'data-init': '', 'data-v2f': 'btn' })} style={{ alignSelf: 'flex-start', height: dp(52), minHeight: dp(52), padding: `0 ${dp(24)}px`, borderRadius: 999, background: TV.acc, color: TV.onAcc, display: 'inline-flex', alignItems: 'center', fontSize: dp(19), fontWeight: 600 }}>{tt('openSettings')}</div>
    </div>
  )
}

/** Accentfärgad tagg (Fortsätt/Repris) — handoffens `accent` + `accent.onAccent`. */
export function AccentTag({ children }: { children: ReactNode }) {
  return <span style={{ flexShrink: 0, fontSize: dp(13), fontWeight: 600, letterSpacing: '0.04em', padding: `${dp(3)}px ${dp(10)}px`, borderRadius: dp(6), background: TV.acc, color: V2.onAcc, whiteSpace: 'nowrap' }}>{children}</span>
}

/** Tunn accentstapel; `track` = spårets färg. */
export function V2Progress({ value, height, track = 'rgba(252,252,255,.16)' }: { value: number; height: number; track?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div style={{ height: dp(height), borderRadius: dp(height), background: track, overflow: 'hidden' }}>
      <div data-fill="" style={{ width: `${pct}%`, height: '100%', background: TV.acc }} />
    </div>
  )
}

/** Kortyta enligt README: yta 2 + 1 px kant. */
export const HUB_CARD = { background: V2.surface2, border: '1px solid rgba(255,255,255,0.10)', overflow: 'hidden', cursor: 'pointer' } as const
const ellipsis = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as const

/**
 * "Alla kanaler"-kortet (README 5), delat av Klassisk och Upplevelsens
 * kategorirutnät: 16:9-yta med ljus logoplatta, nummer uppe till vänster,
 * hjärta för favorit, 3 px förlopp, namn + det som sänds under. Ingen
 * programbild och ingen tablåhämtning — bara `model.nowFor`, så tusentals
 * kort kostar ingenting extra. Stationens props (fokus, OK, håll) och stilen
 * kommer från vyn; `faceHeight` ger en fast ytahöjd i stället för 16:9
 * (TV-rutnätet räknar radernas toppar).
 */
export function ChannelGridCard({ channel, model, faceHeight, captionPadRight, style, ...rest }: {
  channel: M3uChannel
  model: LiveTvModel
  faceHeight?: number
  /** Bildtexten håller undan så här långt från högerkanten (pekarens "…"-knapp nere till höger). */
  captionPadRight?: number
  style?: CSSProperties
} & Omit<HTMLAttributes<HTMLDivElement>, 'style'>) {
  const info = model.nowFor(channel)
  const number = model.channelNumber(channel)
  const key = channelKey(channel)
  return (
    <div {...rest} style={{ ...HUB_CARD, borderRadius: dp(14), display: 'flex', flexDirection: 'column', ...style }}>
      <div style={{ position: 'relative', width: '100%', ...(faceHeight ? { height: dp(faceHeight), flexShrink: 0 } : { aspectRatio: '16 / 9' }), background: V2.noArt }}>
        {/* Logoplattan inramad 30 px runt om, 18 px nedtill (README 5). */}
        <LogoPlate channel={channel} width={0} height={84} radius={8} style={{ position: 'absolute', left: dp(30), right: dp(30), top: dp(30), bottom: dp(18), width: 'auto', height: 'auto', boxShadow: 'none' }} />
        <span style={{ position: 'absolute', top: dp(6), left: dp(8), fontSize: dp(13), fontWeight: 600, color: 'rgba(243,244,248,0.8)', fontVariantNumeric: 'tabular-nums' }}>{number ?? ''}</span>
        {model.pinnedSet.has(key) ? <span style={{ position: 'absolute', top: dp(8), right: dp(9), color: TV.acc }}><Icons.Heart size={dp(16)} filled /></span> : null}
        {model.locked.has(key) ? <span style={{ position: 'absolute', bottom: dp(8), right: dp(9), color: 'rgba(243,244,248,0.55)' }}><Icons.Lock size={dp(16)} /></span> : null}
        {info.now ? <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}><V2Progress value={progressOf(info.now.start, info.now.stop, model.nowMs)} height={3} track="rgba(0,0,0,0.35)" /></div> : null}
      </div>
      <div style={{ padding: `${dp(10)}px ${dp(captionPadRight ?? 12)}px ${dp(12)}px ${dp(12)}px` }}>
        <div style={{ fontSize: dp(17), fontWeight: 600, ...ellipsis }}>{channel.name}</div>
        <div style={{ fontSize: dp(15), color: 'rgba(243,244,248,0.65)', ...ellipsis }}>{info.now?.title ?? (qualityFromName(channel.name) ?? channel.group)}</div>
      </div>
    </div>
  )
}
