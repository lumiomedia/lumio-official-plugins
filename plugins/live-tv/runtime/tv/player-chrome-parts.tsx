'use client'

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import { channelKey, getLiveTvLogoSrc, type M3uChannel } from '../live-tv-data'
import { LiveTvLogoImage } from '../live-tv-logo-image'
import { formatClock, initialsOf, progressOf } from '../live-tv-ui'
import { startOfLocalDay } from '../live-tv-model'
import { sliceSchedule } from '../epg/lookup'
import type { EpgProgramme, NowNextLater } from '../epg/types'
import { useSchedules } from '../hooks/useSchedules'
import { isReminded, onRemindersChanged, toggleReminder } from '../reminders'
import type { LiveTvPlayerControls, LiveTvPlayerTvProps } from './tv-player-types'
import { Icons, Progress, TV, Tag, station } from './tv-ui'
import { useTvText } from './tv-strings'

/*
 * Spelarkromets delar (skrivbord + TV) — den gamla layouten (före
 * 2026-09-14) i pluginets egna primitiver: toppfält med logotyp, namn och
 * "nu"-rad, Sen-kort i mitten, kontrollrad med 44 px-knappar, favoritrad och
 * EPG-överlägg på Guide.
 *
 * Måtten är ÄKTA px på skrivbordet: spelaren är en portal på `document.body`
 * och ligger utanför scenlådan. I TV-läget skalas kroppens scen, så alla mått
 * går genom `ps()` (1,4× på TV) i stället för `dp()`.
 *
 * Filen importerar ALDRIG kromet (`tv-player-chrome.tsx`) — envägsimport.
 */

/** Måttfunktion: äkta px på skrivbordet, 1,4× i TV-läget. */
export type PlayerScale = (n: number) => number
export function playerScale(isTv: boolean): PlayerScale {
  return (n: number) => (isTv ? Math.round(n * 1.4) : n)
}

/** Favoriter först, sedan ett fönster runt den spelande kanalen (som telefonens zap-lista). */
const FAV_WINDOW = 25
const DAY_MS = 86_400_000
/** Ett pilsteg på volymreglaget (spec 4.1: tangentbordet ska nå allt). */
const VOLUME_STEP = 0.1

/** 44 px-knapp i kontrollraden: rund, svag yta, `data-guide-row` för TV:ns grå fokuskant. */
function ctlStyle(ps: PlayerScale, active = false): CSSProperties {
  return {
    height: ps(44), minHeight: ps(44), minWidth: ps(44), padding: `0 ${ps(12)}px`, borderRadius: 999, boxSizing: 'border-box', flexShrink: 0,
    background: active ? 'rgba(252,252,255,0.20)' : 'rgba(252,252,255,0.10)', border: `1px solid ${active ? TV.lineStrong : 'rgba(255,255,255,0.15)'}`,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: ps(6), color: TV.text, cursor: 'pointer', fontSize: ps(12), fontWeight: 600, whiteSpace: 'nowrap',
  }
}

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
const CtlIcon = ({ size, children, fill }: { size: number; children: ReactNode; fill?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'}>{children}</svg>
)
const PlayIcon = ({ size }: { size: number }) => <CtlIcon size={size} fill><path d="M8 5v14l11-7z" /></CtlIcon>
const PauseIcon = ({ size }: { size: number }) => <CtlIcon size={size} fill><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></CtlIcon>
const FullscreenIcon = ({ size }: { size: number }) => <CtlIcon size={size}><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5" /></CtlIcon>
const ExitFullscreenIcon = ({ size }: { size: number }) => <CtlIcon size={size}><path d="M3 8h5V3M21 8h-5V3M16 21v-5h5M8 21v-5H3" /></CtlIcon>
const GuideIcon = ({ size }: { size: number }) => <CtlIcon size={size}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M8 2v4M16 2v4M3 10h18M7 14h4M7 18h10" /></CtlIcon>
const SpeakerOn = ({ size, level }: { size: number; level: number }) => <CtlIcon size={size}><path d="M11 5 6 9H3v6h3l5 4V5Z" />{level > 0.33 ? <path d="M15.5 8.5a5 5 0 0 1 0 7" /> : null}{level > 0.66 ? <path d="M19 4.5a10 10 0 0 1 0 15" /> : null}</CtlIcon>
const SpeakerOff = ({ size }: { size: number }) => <CtlIcon size={size}><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="m22 9-6 6M16 9l6 6" /></CtlIcon>
const AspectIcon = ({ size }: { size: number }) => <CtlIcon size={size}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 9h18M9 5v14" /></CtlIcon>
const CloseIcon = ({ size }: { size: number }) => <CtlIcon size={size}><path d="M6 6l12 12M18 6 6 18" /></CtlIcon>

/** Liten kanalbild (logotyp → initialer) i äkta px — `ChannelArt` ritar initialer i dp(22) och passar inte en 32 px-ruta. */
function SmallLogo({ channel, size, radius }: { channel: M3uChannel; size: number; radius: number }) {
  const [failed, setFailed] = useState(false)
  const primary = getLiveTvLogoSrc(channel.logo)
  const fallback = getLiveTvLogoSrc(channel.logoFallback)
  const logo = failed ? null : primary ?? fallback
  return (
    <div style={{ width: size, height: size, flexShrink: 0, borderRadius: radius, overflow: 'hidden', background: 'rgba(30,41,59,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {logo ? (
        <LiveTvLogoImage src={logo} fallbackSrc={primary ? fallback : undefined} alt="" className="lumio-tv-logo-img" onError={() => setFailed(true)} />
      ) : (
        <span data-initials="" aria-hidden="true" style={{ fontSize: Math.round(size * 0.36), fontWeight: 600, color: TV.dim, letterSpacing: '0.04em' }}>{initialsOf(channel.name)}</span>
      )}
    </div>
  )
}

function remaining(stopMs: number, nowMs: number): string {
  const mins = Math.max(0, Math.round((stopMs - nowMs) / 60_000))
  if (mins >= 60) {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  return `${mins}m`
}

/** Påminnelsestatus som svarar på lagringen (Påminn mig-knappen ritas om när en annan yta togglar). */
function useReminded(channel: M3uChannel, programme: EpgProgramme | null): boolean {
  const [tick, setTick] = useState(0)
  useEffect(() => onRemindersChanged(() => setTick((v) => v + 1)), [])
  void tick
  return programme ? isReminded(channel, programme) : false
}

/* ---------------------------------------------------------------- Toppfält */

export function PlayerTopBar({ channel, tv, info, ps, visible, clock, onClose, onKeep, onRelease }: {
  channel: M3uChannel
  tv: LiveTvPlayerTvProps
  info: NowNextLater
  ps: PlayerScale
  visible: boolean
  clock: ReactNode
  onClose: () => void
  onKeep: () => void
  onRelease: () => void
}) {
  const { tt } = useTvText()
  return (
    <div
      data-testid="top-bar"
      onMouseEnter={onKeep}
      onMouseLeave={onRelease}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: ps(16), padding: `${ps(16)}px ${ps(20)}px ${ps(16)}px`, background: 'linear-gradient(180deg, rgba(0,0,0,0.75), rgba(0,0,0,0.45) 60%, transparent)', opacity: visible ? 1 : 0, transition: 'opacity 200ms', pointerEvents: visible ? 'auto' : 'none', fontFamily: TV.font, color: TV.text }}
    >
      <div style={{ minWidth: 0, flex: '1 1 0', display: 'flex', alignItems: 'center', gap: ps(12) }}>
        <SmallLogo channel={channel} size={ps(32)} radius={ps(6)} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: ps(14), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tv.channelNumber ? `${tv.channelNumber} · ` : ''}{channel.name}</div>
          {info.now ? (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: ps(8), fontSize: ps(12), color: 'rgba(203,213,225,0.9)', minWidth: 0 }} title={info.now.title}>
              <span style={{ fontSize: ps(9), fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(110,231,183,0.85)', flexShrink: 0 }}>{tt('gridNow')}</span>
              <span style={{ fontWeight: 500, color: 'rgba(255,255,255,0.9)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.now.title}</span>
              <span style={{ color: 'rgba(255,255,255,0.45)', flexShrink: 0 }}>{formatClock(info.now.start, tv.locale)}–{formatClock(info.now.stop, tv.locale)}</span>
            </div>
          ) : null}
        </div>
      </div>
      <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', justifyContent: 'center' }}>
        <PlayerNextUpCard channel={channel} next={info.next} nowMs={tv.nowMs} locale={tv.locale} ps={ps} />
      </div>
      <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: ps(12), fontSize: ps(13) }}>
        {info.now ? <Tag variant="live" style={{ fontSize: ps(11), padding: `${ps(4)}px ${ps(10)}px` }}>{tt('live')}</Tag> : null}
        {tv.quality ? <span style={{ color: 'rgba(243,244,248,0.75)' }}>{tv.quality}</span> : null}
        {clock}
        <div {...station(onClose, undefined, { 'aria-label': tt('playerClose'), 'data-guide-row': '' })} style={{ ...ctlStyle(ps), width: ps(36), height: ps(36), minHeight: ps(36), minWidth: ps(36), padding: 0, background: 'rgba(0,0,0,0.45)' }}>
          <CloseIcon size={ps(18)} />
        </div>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- Sen-kortet */

/** "Sen: titel · start" med Påminn mig — läser samma EPG-svar som resten av kromet (`tv.nowFor`). */
export function PlayerNextUpCard({ channel, next, nowMs, locale, ps }: {
  channel: M3uChannel
  next: EpgProgramme | null
  nowMs: number
  locale: string
  ps: PlayerScale
}) {
  const { tt } = useTvText()
  const reminded = useReminded(channel, next)
  if (!next) return null
  return (
    <div data-testid="next-up" style={{ display: 'flex', alignItems: 'center', gap: ps(12), padding: `${ps(8)}px ${ps(10)}px ${ps(8)}px ${ps(12)}px`, borderRadius: ps(12), background: 'rgba(8,12,24,0.78)', border: `1px solid ${TV.line}`, boxShadow: '0 12px 40px rgba(0,0,0,0.45)', maxWidth: ps(360), minWidth: 0 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: ps(11), color: TV.dim }}>{tt('nextLabel')}</div>
        <div style={{ fontSize: ps(13), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={next.title}>
          {next.title} · {formatClock(next.start, locale)}
        </div>
      </div>
      <div
        data-testid="next-up-remind"
        {...station(() => { toggleReminder(channel, next, nowMs) }, undefined, { 'aria-pressed': reminded ? 'true' : 'false', 'data-guide-row': '' })}
        style={{ ...ctlStyle(ps, reminded), height: ps(30), minHeight: ps(30), minWidth: 0, padding: `0 ${ps(10)}px`, fontSize: ps(12), color: reminded ? TV.accText : TV.text }}
      >
        <Icons.Bell size={ps(14)} filled={reminded} /> {reminded ? tt('reminderSet') : tt('remindMe')}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- Kontrollrad */

export function PlayerControlRow({ channel, tv, info, ps, isTv, paused, onTogglePause, controls, guideOpen, onToggleGuide, dotsRef, onOpenMenu, volumeRef }: {
  channel: M3uChannel
  tv: LiveTvPlayerTvProps
  info: NowNextLater
  ps: PlayerScale
  isTv: boolean
  paused: boolean
  onTogglePause: () => void
  controls?: LiveTvPlayerControls
  guideOpen: boolean
  onToggleGuide: () => void
  dotsRef: RefObject<HTMLDivElement | null>
  onOpenMenu: (element: HTMLElement) => void
  volumeRef: RefObject<HTMLDivElement | null>
}) {
  const { tt } = useTvText()
  const icon = ps(20)
  const volumePercent = Math.round((controls?.volume ?? 0) * 100)
  const setVolumeFromPointer = (clientX: number) => {
    const rect = volumeRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0 || !controls) return
    controls.onVolume(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)))
  }
  const onVolumeKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!controls) return
    const delta = event.key === 'ArrowRight' ? VOLUME_STEP : event.key === 'ArrowLeft' ? -VOLUME_STEP : 0
    if (delta === 0) return
    event.preventDefault()
    event.stopPropagation()
    // Avrundning till hundradelar: 0.5 + 0.1 är 0.6000000000000001 i flyttal,
    // och det talet hade läckt hela vägen ut i aria-valuenow och mpv.
    controls.onVolume(Math.max(0, Math.min(1, Math.round((controls.volume + delta) * 100) / 100)))
  }
  return (
    <>
      {info.now ? (
        <div data-testid="programme-progress" style={{ display: 'flex', flexDirection: 'column', gap: ps(6), padding: `0 ${ps(4)}px`, marginBottom: ps(8) }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: ps(12), fontSize: ps(12), color: 'rgba(203,213,225,0.9)' }}>
            <span style={{ fontWeight: 600, color: TV.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.now.title}</span>
            <span style={{ flexShrink: 0 }}>{formatClock(info.now.start, tv.locale)}–{formatClock(info.now.stop, tv.locale)} · {tt('minutesLeft', { min: Math.max(0, Math.round((info.now.stop - tv.nowMs) / 60_000)) })}</span>
          </div>
          <Progress value={progressOf(info.now.start, info.now.stop, tv.nowMs)} height={ps(4)} track="rgba(255,255,255,0.2)" />
        </div>
      ) : null}
      {/* Raden scrollar i sidled hellre än radbryter: ett smalt fönster drar i raden som i en spelarkontroll. */}
      <div data-testid="control-row" data-row="" style={{ display: 'flex', alignItems: 'center', gap: ps(12), overflowX: 'auto', scrollbarWidth: 'none', borderRadius: ps(16), border: `1px solid ${TV.lineCard}`, background: 'rgba(0,0,0,0.55)', padding: `${ps(10)}px ${ps(14)}px`, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div {...station(onTogglePause, undefined, { 'aria-label': paused ? tt('menuResume') : tt('menuPause'), 'data-guide-row': '' })} style={{ ...ctlStyle(ps), padding: 0 }}>
          {paused ? <PlayIcon size={icon} /> : <PauseIcon size={icon} />}
        </div>
        {controls ? (
          <div {...station(controls.onToggleFullscreen, undefined, { 'aria-label': controls.fullscreen ? tt('playerExitFullscreen') : tt('playerFullscreen'), 'aria-pressed': controls.fullscreen ? 'true' : 'false', 'data-guide-row': '' })} style={{ ...ctlStyle(ps, controls.fullscreen), padding: 0 }}>
            {controls.fullscreen ? <ExitFullscreenIcon size={icon} /> : <FullscreenIcon size={icon} />}
          </div>
        ) : null}
        <div {...station(onToggleGuide, undefined, { 'aria-label': tt('playerGuide'), 'aria-pressed': guideOpen ? 'true' : 'false', 'data-guide-row': '' })} style={{ ...ctlStyle(ps, guideOpen), padding: 0 }}>
          <GuideIcon size={icon} />
        </div>
        {controls ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: ps(8), flexShrink: 0 }}>
            <div {...station(controls.onToggleMute, undefined, { 'aria-label': controls.muted ? tt('playerUnmute') : tt('playerMute'), 'aria-pressed': controls.muted ? 'true' : 'false', 'data-guide-row': '' })} style={{ ...ctlStyle(ps), padding: 0 }}>
              {controls.muted || controls.volume === 0 ? <SpeakerOff size={icon} /> : <SpeakerOn size={icon} level={controls.volume} />}
            </div>
            {/* Reglaget ritas INTE på TV: en station som sväljer sidopilarna
                låser fjärren, så ljud av/på är TV:ns hela volymkontroll. */}
            {!isTv ? (
              <div
                {...station(controls.onToggleMute, undefined, { 'aria-label': tt('playerVolume'), 'data-guide-row': '' })}
                ref={volumeRef}
                role="slider"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={volumePercent}
                onKeyDown={onVolumeKey}
                onPointerDown={(event: ReactPointerEvent<HTMLDivElement>) => setVolumeFromPointer(event.clientX)}
                onPointerMove={(event: ReactPointerEvent<HTMLDivElement>) => { if (event.buttons === 1) setVolumeFromPointer(event.clientX) }}
                // Klicket gör om samma sak som pointerdown: samma X ger samma
                // värde, så den här extra vägen är gratis och räddar miljöer
                // utan pekarhändelser.
                onClick={(event: { clientX: number }) => setVolumeFromPointer(event.clientX)}
                style={{ width: ps(96), height: ps(44), minHeight: ps(44), display: 'inline-flex', alignItems: 'center', padding: `0 ${ps(4)}px`, borderRadius: 999, cursor: 'pointer', touchAction: 'none', boxSizing: 'border-box', flexShrink: 0 }}
              >
                <span style={{ position: 'relative', width: '100%', height: ps(4), borderRadius: 999, background: 'rgba(252,252,255,0.22)' }}>
                  <span style={{ position: 'absolute', inset: 0, right: `${100 - volumePercent}%`, borderRadius: 999, background: '#fff' }} />
                  <span style={{ position: 'absolute', top: '50%', left: `${volumePercent}%`, width: ps(12), height: ps(12), marginTop: ps(-6), marginLeft: ps(-6), borderRadius: 999, background: '#fff' }} />
                </span>
              </div>
            ) : null}
          </div>
        ) : null}
        {controls ? (
          <div {...station(controls.onCycleAspect, undefined, { 'aria-label': tt('playerAspect'), title: `${tt('playerAspect')}: ${controls.aspectLabel}`, 'data-guide-row': '' })} style={ctlStyle(ps)}>
            <AspectIcon size={ps(16)} />
            <span style={{ fontSize: ps(11), fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{controls.aspectLabel}</span>
          </div>
        ) : null}
        <div ref={dotsRef} {...station(() => { if (dotsRef.current) onOpenMenu(dotsRef.current) }, (el) => onOpenMenu(el), { 'data-init': '', 'aria-label': tt('moreActions'), 'data-guide-row': '' })} style={{ ...ctlStyle(ps), padding: 0 }}>
          <Icons.Dots size={icon} />
        </div>
        {/* Infoblocket har ett golv: `flex: 1` krymper till noll i en överfull rad och namnet försvann. */}
        <div style={{ flex: 1, minWidth: ps(176), display: 'flex', flexDirection: 'column', gap: ps(3), justifyContent: 'center', alignItems: 'flex-end', textAlign: 'right' }}>
          <div style={{ fontSize: ps(13), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{channel.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: ps(8), fontSize: ps(11), color: 'rgba(203,213,225,0.85)', whiteSpace: 'nowrap' }}>
            <span>{paused ? tt('menuPause') : tt('live')}</span>
            {controls && typeof controls.timePos === 'number' ? <><span style={{ color: 'rgba(148,163,184,0.5)' }}>/</span><span data-testid="elapsed" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatElapsed(controls.timePos)}</span></> : null}
            {channel.group ? <><span style={{ color: 'rgba(148,163,184,0.5)' }}>/</span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{channel.group}</span></> : null}
          </div>
        </div>
      </div>
    </>
  )
}

/** Sekunder → h:mm:ss / m:ss (spelad tid i sessionen, mpv:s time-pos). */
export function formatElapsed(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`
}

/* ---------------------------------------------------------------- Favoritrad */

/**
 * Favoriterna först (i listans ordning), sedan ett fönster runt den spelande
 * kanalen — som telefonens zap-lista. `tv.neighbours` är hela spellistan
 * (tiotusentals rader i IPTV) och varje chip slår upp `tv.nowFor`, så raden
 * får aldrig rita allt.
 */
export function favouriteRowChannels(channel: M3uChannel, tv: Pick<LiveTvPlayerTvProps, 'neighbours' | 'pinnedKeys'>): M3uChannel[] {
  const pinnedSet = new Set(tv.pinnedKeys)
  const current = channelKey(channel)
  const pinned: M3uChannel[] = []
  const rest: M3uChannel[] = []
  for (const c of tv.neighbours) (pinnedSet.has(channelKey(c)) ? pinned : rest).push(c)
  const index = rest.findIndex((c) => channelKey(c) === current)
  const window = index < 0 ? rest.slice(0, FAV_WINDOW * 2) : rest.slice(Math.max(0, index - FAV_WINDOW), index + FAV_WINDOW + 1)
  const list = [...pinned, ...window]
  // Den spelande kanalen ska alltid finnas i raden, även utanför listan.
  return list.some((c) => channelKey(c) === current) ? list : [channel, ...list]
}

export function PlayerFavouritesRow({ channel, tv, ps, onSwitch, onHold, style }: {
  channel: M3uChannel
  tv: LiveTvPlayerTvProps
  ps: PlayerScale
  onSwitch: (channel: M3uChannel) => void
  /** Håll OK / högerklick på ett chip (glasmenyn: lägg till i multivy). */
  onHold?: (channel: M3uChannel, element: HTMLElement) => void
  style?: CSSProperties
}) {
  const { tt } = useTvText()
  const items = useMemo(() => favouriteRowChannels(channel, tv), [channel, tv])
  const currentKey = channelKey(channel)
  return (
    <div data-testid="favourites-row" data-row="" style={{ display: 'flex', gap: ps(8), overflowX: 'auto', scrollbarWidth: 'none', padding: `${ps(8)}px 0 ${ps(2)}px`, ...style }}>
      {items.map((c) => {
        const current = channelKey(c) === currentKey
        const n = tv.nowFor(c)
        return (
          <div
            key={channelKey(c)}
            data-testid="favourite-chip"
            data-guide-row=""
            aria-current={current ? 'true' : undefined}
            {...station(() => onSwitch(c), onHold ? (el) => onHold(c, el) : undefined, { title: c.name })}
            // Fjärren flyttar fokus chip för chip: det fokuserade ska synas.
            onFocus={(event: { currentTarget: HTMLElement }) => event.currentTarget.scrollIntoView?.({ inline: 'nearest', block: 'nearest' })}
            style={{ width: ps(190), flexShrink: 0, display: 'flex', alignItems: 'center', gap: ps(8), padding: `${ps(6)}px ${ps(10)}px`, borderRadius: ps(10), boxSizing: 'border-box', background: current ? TV.accMix(16) : 'rgba(252,252,255,0.08)', border: `1px solid ${current ? TV.accMix(45) : TV.line}`, color: TV.text, cursor: 'pointer', textAlign: 'left' }}
          >
            <SmallLogo channel={c} size={ps(26)} radius={ps(5)} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: ps(12), fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.now?.title ?? tt('noProgramme')}</div>
              <div style={{ fontSize: ps(10), color: TV.dim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ---------------------------------------------------------------- EPG-överlägg */

/**
 * Guide-knappens överlägg: dagens tablå för kanalen (nu markerad, passerat
 * dämpat, kommande med Påminn mig) och favoritraden för kanalbyte.
 * Tablån hämtas per fönster via `useSchedules` — samma cache som guiden.
 */
export function PlayerScheduleOverlay({ channel, tv, ps, open, onClose, onSwitch, onHoldChip, overlayRef }: {
  channel: M3uChannel
  tv: LiveTvPlayerTvProps
  ps: PlayerScale
  open: boolean
  onClose: () => void
  onSwitch: (channel: M3uChannel) => void
  onHoldChip?: (channel: M3uChannel, element: HTMLElement) => void
  overlayRef: RefObject<HTMLDivElement | null>
}) {
  const { tt } = useTvText()
  const dayStart = startOfLocalDay(tv.nowMs)
  const scheduleChannels = useMemo(() => (open ? [channel] : []), [open, channel])
  const { schedules, loading } = useSchedules(scheduleChannels, dayStart, dayStart + DAY_MS)
  const programmes = useMemo(() => sliceSchedule(schedules[channelKey(channel)] ?? [], dayStart, dayStart + DAY_MS), [schedules, channel, dayStart])
  const [tick, setTick] = useState(0)
  useEffect(() => onRemindersChanged(() => setTick((v) => v + 1)), [])
  void tick
  const nowMs = tv.nowMs
  const nowIndex = programmes.findIndex((p) => p.start <= nowMs && p.stop > nowMs)

  // Fokus in i överlägget när det öppnas: nu-raden (eller första raden), och
  // den ska synas — listan är rullbar.
  useEffect(() => {
    if (!open) return
    const root = overlayRef.current
    const target = root?.querySelector<HTMLElement>('[data-now]') ?? root?.querySelector<HTMLElement>('[data-testid="schedule-row"]') ?? root?.querySelector<HTMLElement>('[data-f]')
    target?.focus({ preventScroll: true })
    target?.scrollIntoView?.({ block: 'start' })
  }, [open, nowIndex, overlayRef])

  if (!open) return null
  return (
    <div ref={overlayRef} data-testid="schedule-overlay" data-live-tv-layer="" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 40, pointerEvents: 'auto', maxHeight: '55%', display: 'flex', flexDirection: 'column', borderTop: `1px solid ${TV.lineCard}`, borderRadius: `${ps(24)}px ${ps(24)}px 0 0`, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: '0 -20px 60px rgba(0,0,0,0.5)', fontFamily: TV.font, color: TV.text }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: ps(12), padding: `${ps(12)}px ${ps(20)}px`, borderBottom: `1px solid ${TV.line}`, flexShrink: 0 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: ps(10), letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(110,231,183,0.85)' }}>{tt('today')}</div>
          <div style={{ fontSize: ps(14), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{channel.name}</div>
        </div>
        <div {...station(onClose, undefined, { 'aria-label': tt('playerClose'), 'data-guide-row': '' })} style={{ ...ctlStyle(ps), height: ps(32), minHeight: ps(32), fontSize: ps(10), letterSpacing: '0.22em', textTransform: 'uppercase', background: 'rgba(252,252,255,0.06)' }}>
          {tt('playerClose')}
        </div>
      </div>
      <div data-scroll="" style={{ overflowY: 'auto', minHeight: 0, flex: 1, scrollbarWidth: 'thin' }}>
        {programmes.length === 0 ? (
          <div style={{ padding: `${ps(24)}px ${ps(20)}px`, fontSize: ps(13), color: TV.dim }}>{loading ? tt('loadingGuide') : tt('noProgramme')}</div>
        ) : (
          programmes.map((p, i) => {
            const live = i === nowIndex
            const past = p.stop <= nowMs
            const future = p.start > nowMs
            const reminded = future && isReminded(channel, p)
            const progress = live ? progressOf(p.start, p.stop, nowMs) : null
            const act = future ? () => { toggleReminder(channel, p, nowMs) } : onClose
            return (
              <div
                key={`${p.start}-${i}`}
                data-testid="schedule-row"
                data-guide-row=""
                {...(live ? { 'data-now': '' } : {})}
                {...(past ? {} : station(act, undefined, { 'aria-label': p.title }))}
                style={{ position: 'relative', display: 'grid', gridTemplateColumns: `${ps(80)}px 1fr auto`, gap: ps(16), alignItems: 'start', padding: `${ps(10)}px ${ps(20)}px`, borderBottom: `1px solid ${TV.s05}`, background: live ? 'rgba(16,185,129,0.10)' : 'transparent', opacity: past ? 0.4 : 1, cursor: past ? 'default' : 'pointer' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: ps(13), fontVariantNumeric: 'tabular-nums', color: live ? 'rgb(110,231,183)' : 'rgba(255,255,255,0.7)' }}>{formatClock(p.start, tv.locale)}</span>
                  {live ? <span style={{ marginTop: ps(2), fontSize: ps(9), fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(110,231,183,0.85)' }}>{tt('gridNow')}</span> : null}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: ps(13), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
                  {p.description ? <div data-selectable-text="" style={{ marginTop: ps(2), fontSize: ps(11), color: 'rgba(255,255,255,0.55)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.description}</div> : null}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: ps(8), fontSize: ps(11), color: 'rgba(255,255,255,0.55)', flexShrink: 0 }}>
                  {live ? remaining(p.stop, nowMs) : formatClock(p.stop, tv.locale)}
                  {future ? (
                    <span data-testid="schedule-remind" style={{ display: 'inline-flex', alignItems: 'center', gap: ps(4), color: reminded ? TV.accText : 'rgba(243,244,248,0.6)' }}>
                      <Icons.Bell size={ps(13)} filled={reminded} /> {reminded ? tt('reminderSet') : tt('remindMe')}
                    </span>
                  ) : null}
                </div>
                {progress !== null ? <div aria-hidden="true" style={{ position: 'absolute', left: 0, bottom: 0, height: ps(2), width: `${Math.round(progress * 100)}%`, background: 'rgb(52,211,153)' }} /> : null}
              </div>
            )
          })
        )}
      </div>
      <div style={{ flexShrink: 0, padding: `0 ${ps(20)}px ${ps(10)}px`, borderTop: `1px solid ${TV.line}` }}>
        <PlayerFavouritesRow channel={channel} tv={tv} ps={ps} onSwitch={onSwitch} onHold={onHoldChip} />
      </div>
    </div>
  )
}
