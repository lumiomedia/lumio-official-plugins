'use client'

/**
 * Kanalspelaren: appens VideoPlayerModal med kanalens OSD ovanpå.
 *
 * Tablån bestämmer vad som spelas och var i programmet; spelaren följer den.
 * Vid programgränsen byts strömmen (förladdad ~30 s innan), CH ▲▼ byter kanal
 * och återgår till live. Det som spelas ligger kvar under nästa uppslag och
 * byts först när nästa ström är klar, så spelaren inte rivs vid varje byte.
 * Inget mediaId/tmdbId/imdbId till spelaren: kanaler ska inte hamna i
 * Fortsätt titta eller skrobblas.
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ComponentType, type CSSProperties, type MutableRefObject, type ReactNode } from 'react'
import { useTvMode } from '@/lib/plugin-sdk'
import type { ChannelDef } from '../model/channel'
import { programmeAt } from '../model/schedule'
import { createLatestGate } from '../play/resolve'
import { channelByNumber, createDigitBuffer, OSD_IDLE_MS } from '../play/zap-logic'
import { endOfSourceAction, nextBoundaryAction, rememberZap, resolveDelayMs, startSeconds, stepChannel, type PlayMode } from '../play/player-logic'
import { initialPlayerState, playerReducer, type Request } from '../play/player-state'
import { readZapMemory, rememberPlayedStream, resolver, writeZapMemory } from '../host'
import { useChannelClock, useChannelPool } from '../state/store'
import { ChannelBadge } from './badge'
import { useHostControls } from './host-controls'
import { C, FONT, glass, RADIUS } from './tokens'
import { useText } from './use-text'
import { ZapOverlay } from './zap-overlay'

export interface ChannelPlayerProps {
  channels: ChannelDef[]
  initialChannelId: string
  mode: PlayMode
  /** Starta direkt i zappläget ("gamla TV:n"). */
  startInZap?: boolean
  onClose(): void
  onOpenGuide?(): void
  /** Meddelas när zappläget slås på (ZAPP-knappen); zappläget i sig ägs av spelaren. */
  onZap?(): void
  /** "Redigera" på en kanal utan innehåll. */
  onEditChannel?(id: string): void
}

const PRELOAD_LEAD_MS = 30_000
const OSD_HIDE_MS = 5_000
/** Bakåt: samma tangenter som värdens fokusmotor (Escape/Backspace) plus webbens namn. */
const BACK_KEYS = new Set(['Escape', 'Backspace', 'GoBack', 'BrowserBack'])

type PlayerComponent = ComponentType<Record<string, unknown>>

export function ChannelPlayer({ channels, initialChannelId, mode: initialMode, startInZap, onClose, onOpenGuide, onZap, onEditChannel }: ChannelPlayerProps) {
  const t = useText()
  const isTv = useTvMode()
  const [state, dispatch] = useReducer(playerReducer, undefined, () => initialPlayerState(initialChannelId, initialMode))
  const { request, status, onScreen, pending, rest, notice } = state
  const stateRef = useRef(state)
  stateRef.current = state
  const channel = useMemo(
    () => channels.find((c) => c.id === request.channelId) ?? channels[0] ?? null,
    [channels, request.channelId],
  )
  const { rundown, loading } = useChannelPool(channel)
  const now = useChannelClock(channel ? [{ rundown, channel }] : [])
  const gate = useMemo(() => createLatestGate(), [])
  const [localTick, setLocalTick] = useState(0)
  const preloadedFor = useRef<number | null>(null)

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

  // Zappläge: på/av, kanallista, sifferval och förra kanal.
  const [zapOn, setZapOn] = useState(!!startInZap)
  const [listOpen, setListOpen] = useState(false)
  const [digits, setDigits] = useState('')
  const [prevId, setPrevId] = useState<string | null>(null)
  const zapRef = useRef({ zapOn, listOpen })
  zapRef.current = { zapOn, listOpen }
  const channelsRef = useRef(channels)
  channelsRef.current = channels
  const digitBuf = useMemo(() => createDigitBuffer(1500), [])
  const digitTimer = useRef<number | null>(null)
  useEffect(() => () => { if (digitTimer.current !== null) window.clearTimeout(digitTimer.current) }, [])
  const enterZap = useCallback(() => {
    setZapOn(true)
    onZap?.()
  }, [onZap])
  const exitZap = useCallback(() => {
    setZapOn(false)
    setListOpen(false)
    setDigits('')
    // Halvfärdigt sifferval ska inte dyka upp som ett byte efteråt.
    if (digitTimer.current !== null) window.clearTimeout(digitTimer.current)
    digitBuf.flush(Infinity)
  }, [digitBuf])

  // Förra/senaste kanal vid varje kanalbyte.
  const channelId = channel?.id ?? null
  useEffect(() => {
    if (!channelId) return
    const next = rememberZap(readZapMemory(), channelId)
    writeZapMemory(next)
    setPrevId(next.previousChannelId)
  }, [channelId])

  // ── Planering: varje begäran planeras EN gång ──────────────────────────────
  const plannedSeq = useRef<number | null>(null)
  const plannedChannel = useRef<string | null>(null)
  // Vid unmount: ett uppslag som väntar på zappfördröjningen ska aldrig starta.
  useEffect(() => () => { gate.begin() }, [gate])

  const plan = useCallback((req: Request, ch: ChannelDef) => {
    const nowMs = Date.now()
    // `at` gäller bara om den fortfarande ligger framåt; annars live från nu.
    const future = req.at != null && req.at > nowMs
    const slot = programmeAt(rundown, ch.airWindow, future ? req.at! : nowMs)
    if (slot.kind === 'empty') {
      gate.begin()
      dispatch({ type: 'empty', seq: req.seq })
      return
    }
    if (slot.kind === 'rest') {
      gate.begin()
      dispatch({ type: 'rest', seq: req.seq, rest: slot })
      return
    }
    const initialTime = future ? 0 : startSeconds(slot, req.mode)
    const deadline = req.mode === 'start' ? nowMs + Math.max(1, slot.item.runtimeMin) * 60_000 : slot.stop
    dispatch({ type: 'planned', plan: { seq: req.seq, slot, initialTime, deadline, mode: req.mode } })
    const token = gate.begin()
    const channelChanged = plannedChannel.current != null && plannedChannel.current !== ch.id
    plannedChannel.current = ch.id
    const run = () => {
      // Zappat vidare under väntan: den här kanalen slås aldrig upp.
      if (!gate.isCurrent(token)) return
      void resolver.resolve(slot.item).then((playable) => {
        if (!gate.isCurrent(token)) return
        if (playable) {
          dispatch({ type: 'resolved', seq: req.seq, playable })
        } else {
          resolver.forget(slot.item.ref)
          dispatch({ type: 'failed', seq: req.seq, now: Date.now() })
        }
      })
    }
    const delay = resolveDelayMs(slot.item.play.type, channelChanged)
    if (delay > 0) window.setTimeout(run, delay)
    else run()
  }, [rundown, gate])

  useEffect(() => {
    const s = stateRef.current
    if (!channel) {
      dispatch({ type: 'empty', seq: s.request.seq })
      return
    }
    // Poolen laddas: det som visas ligger kvar tills nästa är planerat.
    if (loading) return
    if (plannedSeq.current !== s.request.seq) {
      plannedSeq.current = s.request.seq
      plan(s.request, channel)
      return
    }
    // Samma begäran men ny rundown (poolen räknades om). Spelar vi något som
    // finns kvar i kanalen rör vi det inte; annars börja om live.
    if (s.status === 'error') return
    const shownRef = (s.pending ?? s.onScreen)?.slot.item.ref
    if ((s.status === 'playing' || s.status === 'resolving') && shownRef && rundown.some((i) => i.ref === shownRef)) return
    dispatch({ type: 'goto', channelId: channel.id, mode: 'live' })
  }, [request.seq, channel?.id, channel?.airWindow, loading, rundown, plan]) // eslint-disable-line react-hooks/exhaustive-deps

  const goToChannel = useCallback((id: string) => dispatch({ type: 'goto', channelId: id, mode: 'live' }), [])

  const step = useCallback((delta: 1 | -1) => {
    if (!channel || channels.length === 0) return
    goToChannel(stepChannel(channels, channel.id, delta).id)
  }, [channel, channels, goToChannel])

  const fromStart = useCallback(() => {
    dispatch({ type: 'goto', channelId: stateRef.current.request.channelId, mode: 'start' })
  }, [])

  // ── Klocka: förladdning och programbyte ────────────────────────────────────
  // Egen väckning vid förladdnings- och slutpunkten; klockan tickar annars var 30 s.
  useEffect(() => {
    if (!onScreen || status !== 'playing') return
    const times = [onScreen.deadline - PRELOAD_LEAD_MS, onScreen.deadline].map((x) => x - Date.now()).filter((d) => d > 0)
    const timers = times.map((d) => window.setTimeout(() => setLocalTick((n) => n + 1), d + 50))
    return () => { for (const id of timers) window.clearTimeout(id) }
  }, [onScreen, status])

  useEffect(() => {
    const s = stateRef.current
    if (s.status === 'rest' && s.rest && Date.now() >= s.rest.stop) {
      dispatch({ type: 'goto', channelId: s.request.channelId, mode: 'live' })
      return
    }
    const shown = s.onScreen
    // Bara när det visade är det aktuella: under ett uppslag väntar klockan.
    if (!shown || s.status !== 'playing' || s.pending || shown.seq !== s.request.seq || !channel) return
    const action = nextBoundaryAction({
      now: Date.now(),
      slotStop: shown.deadline,
      preloadLeadMs: PRELOAD_LEAD_MS,
      preloaded: preloadedFor.current === shown.seq,
    })
    if (action === 'advance') dispatch({ type: 'advance', seq: shown.seq, now: Date.now() })
    else if (action === 'preload') {
      preloadedFor.current = shown.seq
      // Det program som tar vid efter visningen. Resolvern cachar: när bytet
      // kommer är strömmen redan uppslagen.
      const after = Math.max(shown.deadline, shown.slot.stop) + 1000
      const next = programmeAt(rundown, channel.airWindow, after)
      if (next.kind === 'programme') void resolver.resolve(next.item)
    }
  }, [now, localTick]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── OSD-synlighet ──────────────────────────────────────────────────────────
  const [osdVisible, setOsdVisible] = useState(true)
  const hideTimer = useRef<number | null>(null)
  const poke = useCallback(() => {
    setOsdVisible(true)
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current)
    // Zappläget tonar ut snabbare än den vanliga kanal-OSD:n.
    hideTimer.current = window.setTimeout(() => setOsdVisible(false), zapRef.current.zapOn ? OSD_IDLE_MS : OSD_HIDE_MS)
  }, [])
  useEffect(() => { poke() }, [zapOn, poke])
  useEffect(() => {
    poke()
    return () => { if (hideTimer.current !== null) window.clearTimeout(hideTimer.current) }
  }, [request.seq, poke])
  useEffect(() => {
    if (notice) poke()
  }, [notice, poke])

  // ── Tangenter ──────────────────────────────────────────────────────────────
  const modalMounted = !!(onScreen && Player)
  const osdRef = useRef<HTMLDivElement | null>(null)
  const pokeRef = useRef(poke)
  pokeRef.current = poke
  // Kanal-OSD:n tonar med värdspelarens kontrollrad (samma vilotid, framme
  // under paus). Utan läsbar rad: vår egen timer. Zappläget har egen takt.
  const playerKey = onScreen && Player ? `${onScreen.seq}|${onScreen.playable.url}` : null
  const hostControls = useHostControls(osdRef, zapOn ? null : playerKey)
  const osdIdleVisible = hostControls ? hostControls.visible : osdVisible
  // Samma villkor som OSD:n renderas med.
  const osdShownRef = useRef(true)
  osdShownRef.current = (zapOn ? osdVisible : osdIdleVisible) || status !== 'playing'
  // En källa avgörs en gång per visning (onTimeUpdate tickar vidare i slutet).
  const endHandledFor = useRef<number | null>(null)

  // Sifferval: bufferten levererar efter 1,5 s eller tre siffror.
  const commitNumber = useCallback((n: number) => {
    setDigits('')
    const target = channelByNumber(channelsRef.current, n)
    // Det egna numret är ett icke-byte (annars brus och ny begäran för inget).
    if (target && target.id !== stateRef.current.request.channelId) goToChannel(target.id)
  }, [goToChannel])
  const pushDigit = useCallback((digit: number) => {
    const r = digitBuf.push(digit, Date.now())
    if (digitTimer.current !== null) window.clearTimeout(digitTimer.current)
    if (r.commit !== null) {
      commitNumber(r.commit)
      return
    }
    setDigits(r.pending)
    digitTimer.current = window.setTimeout(() => {
      const n = digitBuf.flush(Date.now())
      if (n !== null) commitNumber(n)
      else setDigits('')
    }, 1520)
  }, [digitBuf, commitNumber])

  const onKey = (event: KeyboardEvent) => {
      const zap = zapRef.current
      if (zap.zapOn) {
        // Bakåt i zappläget: lista öppen → stäng listan, annars lämna zappläget.
        // Konsumeras bara här; annars går Bakåt vidare till den vanliga kedjan.
        if (BACK_KEYS.has(event.key)) {
          event.preventDefault()
          event.stopImmediatePropagation()
          if (zap.listOpen) setListOpen(false)
          else exitZap()
          return
        }
        if (/^[0-9]$/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault()
          event.stopImmediatePropagation()
          poke()
          pushDigit(Number(event.key))
          return
        }
        // OK med dold OSD visar den i stället för att trycka på en osynlig knapp.
        if (event.key === 'Enter' && !zap.listOpen && !osdShownRef.current) {
          event.preventDefault()
          event.stopImmediatePropagation()
          poke()
          return
        }
        // ▲▼ zappar när listan är stängd (knapparna ligger i rad, pilarna behövs inte för fokus).
        if (!zap.listOpen && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
          event.preventDefault()
          event.stopImmediatePropagation()
          step(event.key === 'ArrowUp' ? 1 : -1)
          return
        }
      }
      // Utan appens spelare finns ingen som tar Bakåt: vi stänger själva.
      if (!modalMounted && BACK_KEYS.has(event.key)) {
        event.preventDefault()
        event.stopImmediatePropagation()
        onClose()
        return
      }
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
      event.stopImmediatePropagation()
      step(delta)
    }
  // Lyssnaren registreras EN gång vid montering och körs alltså före värdspelarens
  // egna fångstlyssnare (modalen monteras senare, och om per program). Därför kan
  // zappen ta pilar/OK före spelarens TV-fjärr, som annars stoppar dem.
  const keyRef = useRef(onKey)
  keyRef.current = onKey
  useEffect(() => {
    const handler = (event: KeyboardEvent) => keyRef.current(event)
    // Fångstfasen: spelarens egna lyssnare ska inte också reagera på kanalknapparna.
    window.addEventListener('keydown', handler, true)
    // Beröring/mus väcker den tonade OSD:n.
    const touch = () => pokeRef.current()
    window.addEventListener('pointerdown', touch, true)
    return () => {
      window.removeEventListener('keydown', handler, true)
      window.removeEventListener('pointerdown', touch, true)
    }
  }, [])

  // ── Rendering ──────────────────────────────────────────────────────────────
  // Det OSD:n beskriver: det som är på väg, annars det som spelas för den
  // aktuella begäran (inte en gammal kanals bild under ett kanalbyte).
  const described = pending ?? (onScreen && onScreen.seq === request.seq ? onScreen : null)
  const nextTitle = useMemo(() => {
    if (!described || !channel) return null
    const next = programmeAt(rundown, channel.airWindow, described.slot.stop + 1000)
    return next.kind === 'programme' ? next.item.title : null
  }, [described, channel, rundown])

  if (!channel) {
    return (
      <Screen isTv={isTv} onClose={onClose} t={t}>
        <p style={msgStyle}>{t('playerEmpty')}</p>
      </Screen>
    )
  }

  const minsLeft = described ? Math.max(0, (described.deadline - now) / 60_000) : 0
  const metaParts = [t('playerChannelN', { n: channel.number })]
  if (described) metaParts.push(t('playerMinsLeft', { n: Math.max(1, Math.ceil(minsLeft)) }))
  if (nextTitle) metaParts.push(t('playerThen', { title: nextTitle }))

  const zapProgramme = described ? { title: described.slot.item.title, start: described.slot.start, stop: described.slot.stop } : null
  const zapOverlay = (
    <ZapOverlay
      channel={channel}
      channels={channels}
      programme={zapProgramme}
      nextTitle={nextTitle}
      now={now}
      pendingDigits={digits}
      osdVisible={osdVisible || status !== 'playing'}
      listOpen={listOpen}
      notice={notice ? t('playerSkipping') : null}
      hasPrevious={!!prevId && prevId !== channel.id && channels.some((c) => c.id === prevId)}
      isTv={isTv}
      t={t}
      onSelect={(id) => { goToChannel(id); setListOpen(false) }}
      onPrevious={() => { if (prevId) goToChannel(prevId) }}
      onToggleList={() => setListOpen((v) => !v)}
      onCloseList={() => setListOpen(false)}
      onExit={exitZap}
      onActivity={poke}
    />
  )

  const normalOsd = (
    <ChannelOsd
      osdRef={osdRef}
      visible={osdIdleVisible || status !== 'playing'}
      lift={hostControls?.lift ?? null}
      channel={channel}
      meta={metaParts.join(' · ')}
      title={described?.slot.item.title ?? null}
      mode={described?.mode ?? request.mode}
      notice={notice ? t('playerSkipping') : null}
      closeIsInit={!modalMounted}
      isTv={isTv}
      t={t}
      onClose={onClose}
      onFromStart={described ? fromStart : undefined}
      onChDown={() => step(-1)}
      onChUp={() => step(1)}
      onGuide={onOpenGuide}
      onZap={enterZap}
      onActivity={poke}
    />
  )
  // En OSD åt gången: zappläget ersätter kanal-OSD:n.
  const osd = zapOn ? zapOverlay : normalOsd

  const tuning = (
    <div data-channels-tuning="" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <ChannelBadge channel={channel} size={88} />
      <p style={{ ...msgStyle, fontFamily: FONT.title, fontSize: '1.75rem' }}>{described?.slot.item.title ?? channel.name}</p>
      <p style={{ ...msgStyle, fontSize: '0.8rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: C.textDim }}>{t('playerTuning')}</p>
    </div>
  )

  if (onScreen && Player) {
    const { playable, slot, seq } = onScreen
    return (
      <div data-channels-player="" onMouseMove={poke}>
        <Player
          // Ny visning = ny instans: initialTime läses bara vid montering, och
          // "Från början" på samma program har samma URL.
          key={`${seq}|${playable.url}`}
          url={playable.url}
          requestHeaders={playable.requestHeaders}
          forceProxy={playable.forceProxy}
          initialTime={onScreen.initialTime}
          title={slot.item.title}
          posterUrl={slot.item.posterUrl ?? undefined}
          backdropUrl={slot.item.backdropUrl ?? undefined}
          // Ingen autoFullscreen: helskärm väljer användaren med spelarens knapp,
          // och bytet (ny nyckel) rör inte fönstrets helskärmsläge.
          hideStartSplash
          onClose={onClose}
          onPlaybackEnded={() => dispatch({ type: 'advance', seq, now: Date.now() })}
          // mpv säger aldrig onPlaybackEnded: den står pausad på sista bilden.
          onTimeUpdate={(position: number, duration: number) => {
            if (endHandledFor.current === seq) return
            const action = endOfSourceAction({ position, duration, startedAt: onScreen.initialTime })
            if (!action) return
            endHandledFor.current = seq
            if (action === 'ended') {
              dispatch({ type: 'advance', seq, now: Date.now() })
              return
            }
            resolver.forget(slot.item.ref)
            dispatch({ type: 'failed', seq, now: Date.now() })
          }}
          onFirstPlay={() => {
            // Först nu, när bilden syns, blir strömvalet ihågkommet (bara strömsök).
            if (slot.item.play.type === 'stream') rememberPlayedStream(playable.rememberToken)
            dispatch({ type: 'firstPlay', seq })
          }}
          // Sant = vi byter själva (nästa program eller felvyn); spelaren stänger inte.
          onLoadFailed={() => {
            resolver.forget(slot.item.ref)
            dispatch({ type: 'failed', seq, now: Date.now() })
            return true
          }}
          overlayContent={(
            <>
              {status === 'resolving' ? (
                // Inställning ovanpå den gamla bilden tills nästa ström är klar.
                <div style={{ position: 'absolute', inset: 0, zIndex: 54, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.scrim, pointerEvents: 'none' }}>
                  {tuning}
                </div>
              ) : null}
              {osd}
            </>
          )}
        />
      </div>
    )
  }

  const backdropUrl = described?.slot.item.backdropUrl

  return (
    <Screen backdropUrl={backdropUrl} isTv={isTv} onMouseMove={poke}>
      {status === 'rest' && rest ? (
        <p style={msgStyle}>{t('playerRest', { time: clock(rest.nextAir) })}</p>
      ) : status === 'empty' ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <p style={msgStyle}>{t('playerEmpty')}</p>
          {onEditChannel ? <OsdButton onClick={() => onEditChannel(channel.id)} isTv={isTv}>{t('playerEdit')}</OsdButton> : null}
        </div>
      ) : status === 'error' ? (
        <p style={msgStyle}>{t('playerError')}</p>
      ) : tuning}
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
function Screen({ backdropUrl, isTv, children, onMouseMove, onClose, t }: {
  /** Programmets bild bakom en platt mörkning; utan bild appens svarta grund. */
  backdropUrl?: string
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
        padding: '0 1rem', background: C.base, color: C.text, fontFamily: FONT.ui,
      }}
    >
      {/* z −1 i ytans egen staplingskontext: över grunden, under allt innehåll. */}
      {backdropUrl ? (
        <>
          <span aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: -1, background: `url("${backdropUrl}") center / cover no-repeat` }} />
          <span aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: -1, background: C.scrim }} />
        </>
      ) : null}
      {children}
      {onClose && t ? (
        <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
          <OsdButton onClick={onClose} isTv={isTv} init>{t('playerClose')}</OsdButton>
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
        ...glass(isTv, { fill: accent ? C.accent : C.pillBg, blur: 20 }),
        borderRadius: RADIUS.pill, border: `1px solid ${accent ? C.accent : C.pillBorder}`,
        color: accent ? C.onAccent : C.text,
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
  /** Värdens kontrollrads innehållshöjd i px: knappraden läggs precis ovanför seekraden. */
  lift: number | null
  channel: ChannelDef
  meta: string
  title: string | null
  mode: PlayMode
  notice: string | null
  /** Utan appens spelare landar TV-fokus på Stäng, annars på CH ▲. */
  closeIsInit: boolean
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
          ...fade, ...glass(isTv, { fill: C.osdBg, blur: 12 }),
          position: 'absolute', top: 'calc(var(--android-inset-top, 0px) + 1.25rem)', left: '1.5rem', right: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '0.85rem',
          padding: '0.75rem 1rem', borderRadius: RADIUS.osd,
        }}
      >
        <ChannelBadge channel={channel} size={44} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: isTv ? '1.35rem' : '1.05rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{channel.name}</div>
          <div style={{ fontSize: isTv ? '0.95rem' : '0.8rem', color: C.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta}</div>
        </div>
        <OsdButton onClick={props.onClose} isTv={isTv} init={props.closeIsInit}>{t('playerClose')}</OsdButton>
      </div>

      {notice ? (
        <div
          role="status"
          style={{
            position: 'absolute', top: '6.5rem', left: '50%', transform: 'translateX(-50%)',
            maxWidth: 'calc(100vw - 2rem)', padding: '0.7rem 1.2rem', borderRadius: RADIUS.osd,
            ...glass(isTv, { fill: C.osdBg, blur: 12 }),
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
          display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap',
          ...(props.lift != null
            // I värdens egen gradient, direkt ovanför seekraden: en kontrollyta, inte två paneler.
            ? { bottom: props.lift + 10, padding: 0 }
            // Okänd rad: egen panel över appens kontroller.
            : {
                bottom: 'calc(var(--android-inset-bottom, 0px) + 6.5rem)',
                padding: '0.75rem 1rem', borderRadius: RADIUS.osd,
                ...glass(isTv, { fill: C.osdBg, blur: 12 }),
              }),
        }}
      >
        {props.onFromStart ? <OsdButton onClick={props.onFromStart} isTv={isTv}>⟲ {t('playerFromStart')}</OsdButton> : null}
        <OsdButton onClick={props.onChDown} isTv={isTv} label={t('playerChDown')}>CH ▼</OsdButton>
        <OsdButton onClick={props.onChUp} isTv={isTv} label={t('playerChUp')} init={!props.closeIsInit}>CH ▲</OsdButton>
        {props.onGuide ? <OsdButton onClick={props.onGuide} isTv={isTv}>{t('playerGuide')}</OsdButton> : null}
        {props.onZap ? <OsdButton onClick={props.onZap} isTv={isTv}>{t('playerZap')}</OsdButton> : null}
        <div style={{ flex: 1 }} />
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', padding: '0.2rem 0.6rem', borderRadius: RADIUS.pill,
            background: mode === 'live' ? C.accent : C.pillBg, color: mode === 'live' ? C.onAccent : C.text,
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
