'use client'

/**
 * Kanalspelaren: appens VideoPlayerModal med kanalens OSD ovanpå.
 *
 * Tablån bestämmer vad som spelas och var i programmet; spelaren följer den.
 * Vid programgränsen byts strömmen (förladdad ~30 s innan), CH ▲▼ byter kanal
 * och återgår till live. Inget mediaId/tmdbId/imdbId till spelaren: kanaler
 * ska inte hamna i Fortsätt titta eller skrobblas.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties, type MutableRefObject, type ReactNode } from 'react'
import { useTvMode } from '@/lib/plugin-sdk'
import type { ChannelDef } from '../model/channel'
import { hueGradient } from '../model/channel'
import { programmeAt, type ProgrammeSlot, type RestSlot } from '../model/schedule'
import type { PoolItem } from '../data/pool'
import { createLatestGate, type Playable } from '../play/resolve'
import { nextBoundaryAction, rememberZap, startSeconds, stepChannel, type PlayMode } from '../play/player-logic'
import { readZapMemory, resolver, writeZapMemory } from '../host'
import { useChannelClock, useChannelPool } from '../state/store'
import { ChannelBadge } from './badge'
import { C, FONT, RADIUS } from './tokens'
import { useText } from './use-text'

export interface ChannelPlayerProps {
  channels: ChannelDef[]
  initialChannelId: string
  mode: PlayMode
  /** Zappläget (Task 9) tar över härifrån; spelaren skickar bara vidare. */
  startInZap?: boolean
  onClose(): void
  onOpenGuide?(): void
  /** ZAPP-knappen. Utan den syns ingen knapp. */
  onZap?(): void
  /** "Redigera" på en kanal utan innehåll. */
  onEditChannel?(id: string): void
}

const PRELOAD_LEAD_MS = 30_000
const OSD_HIDE_MS = 5_000

type Status = 'resolving' | 'playing' | 'error' | 'rest' | 'empty'

/** En startbegäran: kanal, läge och tidpunkt i tablån (null = nu). */
interface Request { channelId: string; mode: PlayMode; at: number | null; seq: number }

interface Current {
  slot: ProgrammeSlot<PoolItem>
  playable: Playable | null
  initialTime: number
  /** Väggklocka då programmet ska vara slut för just den här visningen. */
  deadline: number
  mode: PlayMode
}

type PlayerComponent = ComponentType<Record<string, unknown>>

/** Efter gränsen: live från nu. Före (strömmen tog slut tidigt, eller fel): nästa program från 0. */
const afterSlot = (slot: ProgrammeSlot<PoolItem>): number | null => (Date.now() >= slot.stop ? null : slot.stop + 1000)

export function ChannelPlayer({ channels, initialChannelId, mode: initialMode, startInZap, onClose, onOpenGuide, onZap, onEditChannel }: ChannelPlayerProps) {
  const t = useText()
  const isTv = useTvMode()
  const [request, setRequest] = useState<Request>({ channelId: initialChannelId, mode: initialMode, at: null, seq: 0 })
  const channel = useMemo(
    () => channels.find((c) => c.id === request.channelId) ?? channels[0] ?? null,
    [channels, request.channelId],
  )
  const { rundown, loading } = useChannelPool(channel)
  const now = useChannelClock(channel ? [{ rundown, channel }] : [])

  const [status, setStatus] = useState<Status>('resolving')
  const [current, setCurrent] = useState<Current | null>(null)
  const [rest, setRest] = useState<RestSlot | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [preloaded, setPreloaded] = useState<{ forRef: string; playable: Playable | null } | null>(null)
  const [localTick, setLocalTick] = useState(0)
  const failedOnce = useRef(false)
  const gate = useMemo(() => createLatestGate(), [])
  const currentRef = useRef(current)
  currentRef.current = current

  // Appens spelare laddas som i live-tv: en äldre värd utan exporten stänger
  // spelaren i stället för att lämna en död skärm.
  const [Player, setPlayer] = useState<PlayerComponent | null>(null)
  useEffect(() => {
    let cancelled = false
    void import('@/lib/plugin-sdk')
      .then((mod) => {
        const component = (mod as unknown as { VideoPlayerModal?: PlayerComponent }).VideoPlayerModal
        if (cancelled) return
        if (component) setPlayer(() => component)
        else onClose()
      })
      .catch(() => { if (!cancelled) onClose() })
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Zappläget hör till Task 9; startInZap lämnas vidare dit vid första montering.
  const zapStarted = useRef(false)
  useEffect(() => {
    if (startInZap && onZap && !zapStarted.current) {
      zapStarted.current = true
      onZap()
    }
  }, [startInZap, onZap])

  // Förra/senaste kanal vid varje kanalbyte.
  const channelId = channel?.id ?? null
  useEffect(() => {
    if (channelId) writeZapMemory(rememberZap(readZapMemory(), channelId))
  }, [channelId])

  // ── Start: slå upp programmet för begäran och lös strömmen ────────────────
  useEffect(() => {
    if (!channel) {
      setStatus('empty')
      setCurrent(null)
      return
    }
    if (loading) {
      gate.begin()
      setStatus('resolving')
      setCurrent(null)
      return
    }
    const token = gate.begin()
    const t0 = request.at ?? Date.now()
    const slot = programmeAt(rundown, channel.airWindow, t0)
    setPreloaded(null)
    if (slot.kind === 'empty') {
      setStatus('empty')
      setCurrent(null)
      return
    }
    if (slot.kind === 'rest') {
      setStatus('rest')
      setRest(slot)
      setCurrent(null)
      return
    }
    setRest(null)
    // En framtida tidpunkt (programbyte före gränsen) startar alltid från 0.
    const initialTime = request.at != null ? 0 : startSeconds(slot, request.mode)
    const deadline = request.mode === 'start' && request.at == null
      ? Date.now() + Math.max(1, slot.item.runtimeMin) * 60_000
      : slot.stop
    setCurrent({ slot, playable: null, initialTime, deadline, mode: request.mode })
    setStatus('resolving')
    void resolver.resolve(slot.item).then((playable) => {
      if (!gate.isCurrent(token)) return
      if (playable) {
        setCurrent((prev) => (prev && prev.slot.item.ref === slot.item.ref ? { ...prev, playable } : prev))
        setStatus('playing')
      } else {
        fail(slot)
      }
    })
    // fail är stabil nog via refs; begäran, kanal och rundown styr.
  }, [request, channel?.id, channel?.airWindow, loading, rundown]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Nästa program: efter gränsen live från nu, annars från 0 vid gränsen. */
  const advance = useCallback(() => {
    const cur = currentRef.current
    if (!cur) return
    const at = afterSlot(cur.slot)
    setRequest((r) => ({ channelId: r.channelId, mode: 'live', at, seq: r.seq + 1 }))
  }, [])

  const fail = useCallback((slot: ProgrammeSlot<PoolItem>) => {
    resolver.forget(slot.item.ref)
    if (!failedOnce.current) {
      failedOnce.current = true
      setNotice(t('playerSkipping'))
      setRequest((r) => ({ channelId: r.channelId, mode: 'live', at: afterSlot(slot), seq: r.seq + 1 }))
      return
    }
    gate.begin()
    setCurrent(null)
    setStatus('error')
  }, [gate, t])

  const goToChannel = useCallback((id: string) => {
    failedOnce.current = false
    setNotice(null)
    setRequest((r) => ({ channelId: id, mode: 'live', at: null, seq: r.seq + 1 }))
  }, [])

  const step = useCallback((delta: 1 | -1) => {
    if (!channel || channels.length === 0) return
    goToChannel(stepChannel(channels, channel.id, delta).id)
  }, [channel, channels, goToChannel])

  const fromStart = useCallback(() => {
    if (!channel) return
    setRequest((r) => ({ channelId: r.channelId, mode: 'start', at: null, seq: r.seq + 1 }))
  }, [channel])

  // ── Klocka: förladdning och programbyte ────────────────────────────────────
  // Egen väckning vid förladdnings- och slutpunkten; klockan tickar annars var 30 s.
  useEffect(() => {
    if (!current || status !== 'playing') return
    const times = [current.deadline - PRELOAD_LEAD_MS, current.deadline].map((x) => x - Date.now()).filter((d) => d > 0)
    const timers = times.map((d) => window.setTimeout(() => setLocalTick((n) => n + 1), d + 50))
    return () => { for (const id of timers) window.clearTimeout(id) }
  }, [current, status])

  useEffect(() => {
    if (status === 'rest' && rest && Date.now() >= rest.stop) {
      setRequest((r) => ({ ...r, mode: 'live', at: null, seq: r.seq + 1 }))
      return
    }
    if (!current || status !== 'playing' || !channel) return
    const action = nextBoundaryAction({
      now: Date.now(),
      slotStop: current.deadline,
      preloadLeadMs: PRELOAD_LEAD_MS,
      preloaded: preloaded?.forRef === current.slot.item.ref,
    })
    if (action === 'advance') advance()
    else if (action === 'preload') {
      const forRef = current.slot.item.ref
      setPreloaded({ forRef, playable: null })
      const next = programmeAt(rundown, channel.airWindow, current.slot.stop + 1000)
      // Resolvern cachar: när bytet kommer är strömmen redan uppslagen.
      if (next.kind === 'programme') {
        void resolver.resolve(next.item).then((playable) => {
          setPreloaded((p) => (p && p.forRef === forRef ? { forRef, playable } : p))
        })
      }
    }
  }, [now, localTick]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── OSD-synlighet ──────────────────────────────────────────────────────────
  const [osdVisible, setOsdVisible] = useState(true)
  const hideTimer = useRef<number | null>(null)
  const poke = useCallback(() => {
    setOsdVisible(true)
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => setOsdVisible(false), OSD_HIDE_MS)
  }, [])
  useEffect(() => {
    poke()
    return () => { if (hideTimer.current !== null) window.clearTimeout(hideTimer.current) }
  }, [request.seq, poke])
  useEffect(() => {
    if (notice) poke()
  }, [notice, poke])

  // ── Tangenter ──────────────────────────────────────────────────────────────
  const osdRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const inOsd = !!osdRef.current && osdRef.current.contains(document.activeElement)
      let delta: 1 | -1 | 0 = 0
      if (event.key === 'ChannelUp' || event.key === 'PageUp') delta = 1
      else if (event.key === 'ChannelDown' || event.key === 'PageDown') delta = -1
      else if (!isTv && inOsd && event.key === 'ArrowUp') delta = 1
      else if (!isTv && inOsd && event.key === 'ArrowDown') delta = -1
      if (delta === 0) {
        poke()
        return
      }
      event.preventDefault()
      event.stopPropagation()
      step(delta)
    }
    // Fångstfasen: spelarens egna lyssnare ska inte också reagera på kanalknapparna.
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [isTv, step, poke])

  // ── Rendering ──────────────────────────────────────────────────────────────
  const nextTitle = useMemo(() => {
    if (!current || !channel) return null
    const next = programmeAt(rundown, channel.airWindow, current.slot.stop + 1000)
    return next.kind === 'programme' ? next.item.title : null
  }, [current, channel, rundown])

  if (!channel) {
    return (
      <Screen background={C.base} isTv={isTv} onClose={onClose} t={t}>
        <p style={msgStyle}>{t('playerEmpty')}</p>
      </Screen>
    )
  }

  const minsLeft = current ? Math.max(0, (current.deadline - now) / 60_000) : 0
  const metaParts = [t('playerChannelN', { n: channel.number })]
  if (current) metaParts.push(t('playerMinsLeft', { n: Math.max(1, Math.ceil(minsLeft)) }))
  if (nextTitle) metaParts.push(t('playerThen', { title: nextTitle }))

  const osd = (
    <ChannelOsd
      osdRef={osdRef}
      visible={osdVisible || status !== 'playing'}
      channel={channel}
      meta={metaParts.join(' · ')}
      title={current?.slot.item.title ?? null}
      mode={current?.mode ?? request.mode}
      notice={notice}
      isTv={isTv}
      t={t}
      onClose={onClose}
      onFromStart={current ? fromStart : undefined}
      onChDown={() => step(-1)}
      onChUp={() => step(1)}
      onGuide={onOpenGuide}
      onZap={onZap}
      onActivity={poke}
    />
  )

  if (status === 'playing' && current?.playable && Player) {
    const { playable, slot } = current
    return (
      <div data-channels-player="" onMouseMove={poke}>
        <Player
          key={playable.url}
          url={playable.url}
          requestHeaders={playable.requestHeaders}
          forceProxy={playable.forceProxy}
          initialTime={current.initialTime}
          title={slot.item.title}
          posterUrl={slot.item.posterUrl ?? undefined}
          backdropUrl={slot.item.backdropUrl ?? undefined}
          autoFullscreen
          hideStartSplash
          onClose={onClose}
          onPlaybackEnded={advance}
          onFirstPlay={() => {
            failedOnce.current = false
            setNotice(null)
          }}
          // Sant = vi byter själva (nästa program eller felvyn); spelaren stänger inte.
          onLoadFailed={() => {
            fail(slot)
            return true
          }}
          overlayContent={osd}
        />
      </div>
    )
  }

  const backdropUrl = current?.slot.item.backdropUrl
  const background = backdropUrl
    ? `linear-gradient(180deg, rgba(5,8,22,0.35), rgba(5,8,22,0.85)), url("${backdropUrl}") center / cover no-repeat, ${hueGradient(channel.hue)}`
    : hueGradient(channel.hue)

  return (
    <Screen background={background} isTv={isTv} onMouseMove={poke}>
      {status === 'rest' && rest ? (
        <p style={msgStyle}>{t('playerRest', { time: clock(rest.nextAir) })}</p>
      ) : status === 'empty' ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <p style={msgStyle}>{t('playerEmpty')}</p>
          {onEditChannel ? <OsdButton onClick={() => onEditChannel(channel.id)} isTv={isTv}>{t('playerEdit')}</OsdButton> : null}
        </div>
      ) : status === 'error' ? (
        <p style={msgStyle}>{t('playerError')}</p>
      ) : (
        <div data-channels-tuning="" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <ChannelBadge channel={channel} size={88} />
          <p style={{ ...msgStyle, fontFamily: FONT.title, fontSize: '1.75rem' }}>{current?.slot.item.title ?? channel.name}</p>
          <p style={{ ...msgStyle, fontSize: '0.8rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: C.textDim }}>{t('playerTuning')}</p>
        </div>
      )}
      {osd}
    </Screen>
  )
}

// ── Delar ────────────────────────────────────────────────────────────────────

const msgStyle: CSSProperties = { margin: 0, color: C.text, fontFamily: FONT.ui, fontSize: '1.25rem', textAlign: 'center', maxWidth: '36rem' }

function clock(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Helskärmsyta när appens spelare inte visas (inställning, vila, tomt, fel). */
function Screen({ background, isTv, children, onMouseMove, onClose, t }: {
  background: string
  isTv: boolean
  children: ReactNode
  onMouseMove?: () => void
  onClose?: () => void
  t?: ReturnType<typeof useText>
}) {
  return (
    <div
      data-channels-player=""
      data-panel-root={isTv ? '1' : undefined}
      onMouseMove={onMouseMove}
      style={{
        position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 1rem', background, color: C.text, fontFamily: FONT.ui,
      }}
    >
      {children}
      {onClose && t ? (
        <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
          <OsdButton onClick={onClose} isTv={isTv}>{t('playerClose')}</OsdButton>
        </div>
      ) : null}
    </div>
  )
}

/** Fokusbar knapp i OSD:n. `data-f` gör den nåbar för värdens TV-fokusmotor. */
function OsdButton({ children, onClick, isTv, label, accent, init }: {
  children: ReactNode
  onClick(): void
  isTv: boolean
  label?: string
  accent?: boolean
  init?: boolean
}) {
  return (
    <button
      type="button"
      data-f=""
      data-init={init ? '' : undefined}
      aria-label={label}
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
        minHeight: isTv ? '2.75rem' : '2.25rem', padding: isTv ? '0 1.1rem' : '0 0.9rem',
        borderRadius: RADIUS.pill, border: `1px solid ${C.pillBorder}`,
        background: accent ? C.accent : C.pillBg, color: accent ? C.base : C.text,
        fontFamily: FONT.ui, fontSize: isTv ? '1rem' : '0.8rem', fontWeight: 600, letterSpacing: '0.12em',
        cursor: 'pointer', whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

interface OsdProps {
  osdRef: MutableRefObject<HTMLDivElement | null>
  visible: boolean
  channel: ChannelDef
  meta: string
  title: string | null
  mode: PlayMode
  notice: string | null
  isTv: boolean
  t: ReturnType<typeof useText>
  onClose(): void
  onFromStart?(): void
  onChDown(): void
  onChUp(): void
  onGuide?(): void
  onZap?(): void
  onActivity(): void
}

/** Kanalens OSD: toppen (badge, namn, meta, Stäng) och bottenpanelen. */
function ChannelOsd(props: OsdProps) {
  const { osdRef, visible, channel, meta, title, mode, notice, isTv, t } = props
  const fade: CSSProperties = { opacity: visible ? 1 : 0, transition: 'opacity 240ms ease', pointerEvents: visible ? 'auto' : 'none' }
  return (
    <div
      ref={osdRef}
      data-channels-osd=""
      onFocus={props.onActivity}
      style={{ position: 'absolute', inset: 0, zIndex: 55, pointerEvents: 'none', fontFamily: FONT.ui, color: C.text }}
    >
      <div
        style={{
          ...fade, position: 'absolute', top: 0, left: 0, right: 0,
          display: 'flex', alignItems: 'center', gap: '0.85rem',
          padding: 'calc(var(--android-inset-top, 0px) + 1.5rem) 1.75rem 2.5rem',
          background: 'linear-gradient(180deg, rgba(5,8,22,0.75), rgba(5,8,22,0))',
        }}
      >
        <ChannelBadge channel={channel} size={44} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: isTv ? '1.35rem' : '1.05rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{channel.name}</div>
          <div style={{ fontSize: isTv ? '0.95rem' : '0.8rem', color: C.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta}</div>
        </div>
        <OsdButton onClick={props.onClose} isTv={isTv}>{t('playerClose')}</OsdButton>
      </div>

      {notice ? (
        <div
          role="status"
          style={{
            position: 'absolute', top: '6.5rem', left: '50%', transform: 'translateX(-50%)',
            maxWidth: 'calc(100vw - 2rem)', padding: '0.7rem 1.2rem', borderRadius: RADIUS.osd,
            background: C.osdBg, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            fontSize: isTv ? '1rem' : '0.85rem', textAlign: 'center',
          }}
        >
          {notice}
        </div>
      ) : null}

      <div
        data-channels-osd-bar=""
        style={{
          ...fade, position: 'absolute', left: '1.5rem', right: '1.5rem',
          // Över appens egna kontroller längst ner.
          bottom: 'calc(var(--android-inset-bottom, 0px) + 6.5rem)',
          display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap',
          padding: '0.75rem 1rem', borderRadius: RADIUS.osd, border: '1px solid rgba(255,255,255,0.08)',
          background: C.osdBg, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        {props.onFromStart ? <OsdButton onClick={props.onFromStart} isTv={isTv}>⟲ {t('playerFromStart')}</OsdButton> : null}
        <OsdButton onClick={props.onChDown} isTv={isTv} label={t('playerChDown')}>CH ▼</OsdButton>
        <OsdButton onClick={props.onChUp} isTv={isTv} label={t('playerChUp')} init>CH ▲</OsdButton>
        {props.onGuide ? <OsdButton onClick={props.onGuide} isTv={isTv}>{t('playerGuide')}</OsdButton> : null}
        {props.onZap ? <OsdButton onClick={props.onZap} isTv={isTv}>{t('playerZap')}</OsdButton> : null}
        <div style={{ flex: 1 }} />
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', padding: '0.2rem 0.6rem', borderRadius: RADIUS.pill,
            background: mode === 'live' ? C.accent : C.pillBg, color: mode === 'live' ? C.base : C.text,
            border: mode === 'live' ? 'none' : `1px solid ${C.pillBorder}`,
            fontSize: isTv ? '0.85rem' : '0.7rem', fontWeight: 700, letterSpacing: '0.18em',
          }}
        >
          {mode === 'live' ? `● ${t('playerLive')}` : t('playerFromStartBadge')}
        </span>
        {title ? (
          <span style={{ fontFamily: FONT.title, fontSize: isTv ? '1.1rem' : '0.9rem', maxWidth: '40%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {channel.number} · {title}
          </span>
        ) : null}
      </div>
    </div>
  )
}
