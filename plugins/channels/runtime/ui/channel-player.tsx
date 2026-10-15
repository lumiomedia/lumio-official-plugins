'use client'

/**
 * Kanalspelaren: appens VideoPlayerModal med kanalens OSD ovanpå.
 *
 * Tablån bestämmer vad som spelas och var i programmet; spelaren följer den.
 * Vid programgränsen byts strömmen (förladdad ~30 s innan), CH ▲▼ byter kanal
 * och återgår till live. Varje byte visar direkt inställningskortet (kanal,
 * program, bild) som ligger kvar tills den nya strömmen visat sin första bild.
 * TABLÅ öppnar tablån som lager i spelaren; ZAPP slår på zappläget (1b).
 * Inget mediaId/tmdbId/imdbId till spelaren: kanaler ska inte hamna i
 * Fortsätt titta eller skrobblas.
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ComponentType, type CSSProperties, type MutableRefObject, type ReactNode } from 'react'
import { useTvMode } from '@/lib/plugin-sdk'
import type { ChannelDef } from '../model/channel'
import type { PoolItem } from '../data/pool'
import { programmeAt } from '../model/schedule'
import { createLatestGate } from '../play/resolve'
import { channelByNumber, createDigitBuffer, NOISE_MS, OSD_IDLE_MS } from '../play/zap-logic'
import { allowsCatalog, endOfSourceAction, NEAR_BOUNDARY_MS, neighbourPrefetch, NEIGHBOUR_PREFETCH_DELAY_MS, nextBoundaryAction, rememberZap, resolveDelayMs, startSeconds, stepChannel, type PlayMode } from '../play/player-logic'
import { awaitingPicture, initialPlayerState, playerReducer, replanOnNewRundown, triedFor, TRUSTED_FIRST_PLAY_MS, type Request } from '../play/player-state'
import { readRuntimeFixes, readZapMemory, rememberPlayedStream, resolver, writeRuntimeFixes, writeZapMemory } from '../host'
import { noteDuration } from '../data/runtime-fix'
import { readCachedRundown, useChannelClock, useChannelPool } from '../state/store'
import { ChannelBadge } from './badge'
import { GuideOverlay } from './guide-overlay'
import { HIDE_HOST_CHROME_CSS, useHostControls, useHostTopbarBottom } from './host-controls'
import { C, FONT, glass, RADIUS } from './tokens'
import { pickInitTarget, tvType } from './tv'
import { TuningCard } from './tuning-card'
import { useText } from './use-text'
import { ZapOverlay } from './zap-overlay'

export interface ChannelPlayerProps {
  channels: ChannelDef[]
  initialChannelId: string
  mode: PlayMode
  /** Starta direkt i zappläget ("gamla TV:n"). */
  startInZap?: boolean
  onClose(): void
  /** Meddelas när zappläget slås på (ZAPP-knappen); zappläget i sig ägs av spelaren. */
  onZap?(): void
  /** "Redigera" på en kanal utan innehåll. */
  onEditChannel?(id: string): void
}

const PRELOAD_LEAD_MS = 30_000
/** Två byten tätare än så = snabbzappning: först då väntar uppslaget (resolveDelayMs). */
const RAPID_ZAP_MS = 700
/** Bekräftar positionen aldrig bilden visas den ändå efter så här lång tid. */
const REVEAL_FALLBACK_MS = 12_000
/** Ett laddfel räknas inte medan strömmen visat framsteg så här nyligen. */
const PROGRESS_GRACE_MS = 30_000
const OSD_HIDE_MS = 5_000
/** Bakåt: samma tangenter som värdens fokusmotor (Escape/Backspace) plus webbens namn. */
const BACK_KEYS = new Set(['Escape', 'Backspace', 'GoBack', 'BrowserBack'])

type PlayerComponent = ComponentType<Record<string, unknown>>

/** Sparad tablå utan uppslag (null vid kall cache): kanallistan och grannförladdningen. */
function cachedRundown(c: ChannelDef): PoolItem[] | null {
  // Med tablålåset: samma tablå som tablån och heron visar.
  return readCachedRundown(c)
}

interface SwitchTiming {
  seq: number
  ch: number
  t0: number
  /** Kom tätt efter förra bytet (snabbzappning). */
  rapid: boolean
  type?: string
  marks: Partial<Record<'pool' | 'resolveStart' | 'resolved' | 'mount' | 'hostFirstPlay', number>>
}

const clockNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

export function ChannelPlayer({ channels, initialChannelId, mode: initialMode, startInZap, onClose, onZap, onEditChannel }: ChannelPlayerProps) {
  const t = useText()
  const isTv = useTvMode()
  const [state, dispatch] = useReducer(playerReducer, undefined, () => initialPlayerState(initialChannelId, initialMode))
  const { request, status, onScreen, pending, rest, noSignal, between } = state
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
  // Tablån som lager i spelaren (TABLÅ-knappen).
  const [guideOpen, setGuideOpen] = useState(false)
  const zapRef = useRef({ zapOn, listOpen, guideOpen })
  zapRef.current = { zapOn, listOpen, guideOpen }
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

  // Brus i zappläget vid varje kanalbyte. Ägs här, inte i zapplagret: värdspelaren
  // (och allt i dess overlayContent) monteras om vid bytet, och ett brus i lagret
  // hann aldrig visas.
  const [noise, setNoise] = useState(false)
  const firstChannel = useRef(true)
  useEffect(() => {
    if (firstChannel.current) { firstChannel.current = false; return }
    if (!zapRef.current.zapOn) return
    setNoise(true)
    const id = window.setTimeout(() => setNoise(false), NOISE_MS)
    return () => window.clearTimeout(id)
  }, [channelId])

  // Bytestid per fas, till konsolen när bilden släpps: tablå klar, uppslag
  // start/slut (och typ), värdspelaren monterad, värdens onFirstPlay, bild.
  const timing = useRef<SwitchTiming | null>(null)
  const lastGotoAt = useRef<number | null>(null)
  useEffect(() => {
    const t0 = clockNow()
    const rapid = lastGotoAt.current != null && t0 - lastGotoAt.current < RAPID_ZAP_MS
    lastGotoAt.current = t0
    timing.current = { seq: request.seq, ch: channel?.number ?? 0, t0, rapid, marks: {} }
  }, [request.seq]) // eslint-disable-line react-hooks/exhaustive-deps
  const mark = useCallback((seq: number, name: keyof SwitchTiming['marks']) => {
    const tm = timing.current
    if (tm && tm.seq === seq && tm.marks[name] == null) tm.marks[name] = Math.round(clockNow() - tm.t0)
  }, [])

  // ── Planering: varje begäran planeras EN gång ──────────────────────────────
  const plannedSeq = useRef<number | null>(null)
  const plannedChannel = useRef<string | null>(null)
  // Vid unmount: ett uppslag som väntar på zappfördröjningen ska aldrig starta.
  useEffect(() => () => { gate.begin() }, [gate])

  const plan = useCallback((req: Request, ch: ChannelDef) => {
    const nowMs = Date.now()
    // Alltid tablåns läge NU: ett byte landar live, aldrig på ett program i förväg.
    const slot = programmeAt(rundown, ch.airWindow, nowMs)
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
    mark(req.seq, 'pool')
    const initialTime = startSeconds(slot, req.mode)
    const deadline = req.mode === 'start' ? nowMs + Math.max(1, slot.item.runtimeMin) * 60_000 : slot.stop
    dispatch({ type: 'planned', plan: { seq: req.seq, slot, initialTime, deadline, mode: req.mode } })
    const token = gate.begin()
    const channelChanged = plannedChannel.current != null && plannedChannel.current !== ch.id
    plannedChannel.current = ch.id
    const run = () => {
      // Zappat vidare under väntan: den här kanalen slås aldrig upp.
      if (!gate.isCurrent(token)) return
      mark(req.seq, 'resolveStart')
      const tm0 = timing.current
      if (tm0 && tm0.seq === req.seq) tm0.type = slot.item.play.type
      // Efter en fallerad version: nästa version förbi de redan provade adresserna.
      void resolver.resolve(slot.item, triedFor(stateRef.current, slot), { allowCatalog: allowsCatalog(ch) }).then((playable) => {
        if (!gate.isCurrent(token)) return
        if (playable) {
          mark(req.seq, 'resolved')
          dispatch({ type: 'resolved', seq: req.seq, playable })
        } else {
          // Ingen (fler) version: Ingen signal till nästa programgräns.
          resolver.forget(slot.item.ref)
          dispatch({ type: 'failed', seq: req.seq, now: Date.now() })
        }
      })
    }
    // Redan uppslagen (förladdad granne, nästa program): ingen anledning att vänta.
    // Väntan bara vid snabbzappning (två byten tätt): ett ensamt byte slås upp direkt.
    const rapid = timing.current?.seq === req.seq && timing.current.rapid
    const delay = resolver.peek(slot.item.ref, allowsCatalog(ch)) ? 0 : resolveDelayMs(slot.item.play.type, channelChanged && rapid)
    if (delay > 0) window.setTimeout(run, delay)
    else run()
  }, [rundown, gate, mark])

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
    // Samma begäran men ny rundown (fler källor svarade, sparad pool byttes):
    // det som spelas rörs inte, nya tablån gäller från nästa gräns.
    if (replanOnNewRundown(s)) dispatch({ type: 'goto', channelId: channel.id, mode: 'live' })
  }, [request.seq, channel?.id, channel?.airWindow, loading, rundown, plan]) // eslint-disable-line react-hooks/exhaustive-deps

  const goToChannel = useCallback((id: string) => dispatch({ type: 'goto', channelId: id, mode: 'live' }), [])
  // Tablålagret stängt (utan byte): fokus tillbaka till TABLÅ-knappen, aldrig kvar på body.
  const closeGuide = useCallback(() => {
    setGuideOpen(false)
    window.setTimeout(() => document.querySelector<HTMLElement>('[data-osd-guide]')?.focus({ preventScroll: true }), 0)
  }, [])
  // Från tablålagret: samma kanal stänger bara lagret (ingen ny begäran för inget).
  const playFromGuide = useCallback((id: string) => {
    setGuideOpen(false)
    if (id !== stateRef.current.request.channelId) goToChannel(id)
  }, [goToChannel])

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
      if (next.kind === 'programme') void resolver.resolve(next.item, [], { allowCatalog: allowsCatalog(channel) })
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
  // Ingen signal, eller källan slut före gränsen: live igen vid nästa programgräns, inte tidigare.
  const waitUntil = status === 'nosignal' ? noSignal?.retryAt ?? null : status === 'between' ? between?.until ?? null : null
  useEffect(() => {
    if (waitUntil == null) return
    const id = window.setTimeout(() => {
      dispatch({ type: 'goto', channelId: stateRef.current.request.channelId, mode: 'live' })
    }, Math.max(0, waitUntil - Date.now()) + 1000)
    return () => window.clearTimeout(id)
  }, [waitUntil])

  // Grannkanalerna (CH ▲▼) förladdas när bilden stått en stund — bara bibliotek/debrid.
  const framedNow = !!onScreen && state.framedSeq === onScreen.seq && onScreen.seq === request.seq
  useEffect(() => {
    if (!framedNow) return
    const id = window.setTimeout(() => {
      const current = stateRef.current.request.channelId
      for (const { item, allowCatalog } of neighbourPrefetch(channelsRef.current, current, cachedRundown, Date.now())) void resolver.resolve(item, [], { allowCatalog })
    }, NEIGHBOUR_PREFETCH_DELAY_MS)
    return () => window.clearTimeout(id)
  }, [framedNow, request.seq])

  // Värdspelaren monterad för en visning: klockan för onFirstPlay-tilliten.
  const shownAt = useRef<{ seq: number; at: number } | null>(null)
  const shownSeq = onScreen?.seq ?? null
  useEffect(() => {
    if (shownSeq == null) return
    shownAt.current = { seq: shownSeq, at: clockNow() }
    mark(shownSeq, 'mount')
  }, [shownSeq, mark])
  // Senaste tecknet på att visningen faktiskt spelar (tiden går, bild, position).
  const progressAt = useRef<{ seq: number; at: number } | null>(null)
  const noteProgress = useCallback((seq: number) => { progressAt.current = { seq, at: clockNow() } }, [])
  // Reserv om positionen aldrig bekräftar en sen onFirstPlay.
  useEffect(() => {
    const seq = state.firstPlaySeq
    if (seq == null || state.framedSeq === seq) return
    const id = window.setTimeout(() => dispatch({ type: 'reveal', seq }), REVEAL_FALLBACK_MS)
    return () => window.clearTimeout(id)
  }, [state.firstPlaySeq, state.framedSeq])
  // Bilden släpps: hela bytet till konsolen.
  useEffect(() => {
    const seq = state.framedSeq
    const tm = timing.current
    if (seq == null || !tm || tm.seq !== seq) return
    timing.current = null
    const m = tm.marks
    const ms = (v: number | undefined) => (v == null ? '?' : `${v}`)
    console.info(`[channels] switch ${tm.ch} resolve=${ms(m.resolved)}ms firstFrame=${Math.round(clockNow() - tm.t0)}ms`
      + ` (pool=${ms(m.pool)} resolveStart=${ms(m.resolveStart)} type=${tm.type ?? '?'} mount=${ms(m.mount)} hostFirstPlay=${ms(m.hostFirstPlay)}${tm.rapid ? ' rapid' : ''})`)
  }, [state.framedSeq])

  // Kanallistans tablåer: en gång per öppning, och kvar när värdspelaren monteras om.
  const listRundowns = useMemo(
    () => (listOpen ? new Map(channels.map((c) => [c.id, cachedRundown(c)] as const)) : null),
    [listOpen, channels],
  )

  // ── Tangenter ──────────────────────────────────────────────────────────────
  const modalMounted = !!(onScreen && Player)
  const osdRef = useRef<HTMLDivElement | null>(null)
  const pokeRef = useRef(poke)
  pokeRef.current = poke
  // Kanal-OSD:n tonar med värdspelarens kontrollrad (samma vilotid, framme
  // under paus). Utan läsbar rad: vår egen timer. Zappläget har egen takt.
  const playerKey = onScreen && Player ? `${onScreen.seq}|${onScreen.playable.url}` : null
  // Bara medan kanal-OSD:n faktiskt är monterad (inte i zappläget, tablålagret eller under kortet).
  const hostControls = useHostControls(osdRef, zapOn || guideOpen || awaitingPicture(state) ? null : playerKey)
  const osdIdleVisible = hostControls ? hostControls.visible : osdVisible
  // Kanalpillen under värdens topprad (mätt; raden kan ligga lägre än sina 52 px).
  const hostTopbar = useHostTopbarBottom(osdRef, zapOn || guideOpen || awaitingPicture(state) ? null : playerKey)
  // Samma villkor som OSD:n renderas med.
  const osdShownRef = useRef(true)
  osdShownRef.current = (zapOn ? osdVisible : osdIdleVisible) || status !== 'playing'
  // En källa avgörs en gång per visning (onTimeUpdate tickar vidare i slutet).
  const endHandledFor = useRef<number | null>(null)
  const durationNotedFor = useRef<number | null>(null)

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
      if (zap.guideOpen) {
        // Tablålagret: Bakåt (och TABLÅ-tangenten) stänger lagret, inte spelaren.
        if (BACK_KEYS.has(event.key) || event.key === 'Guide') {
          event.preventDefault()
          event.stopImmediatePropagation()
          closeGuide()
          return
        }
        // Skrivbord: pilar och siffror ska inte spola eller byta kanal bakom lagret.
        // TV: pilarna tillhör fokusmotorn (rader och ◀▶ på tidsaxeln).
        if (!isTv && (event.key.startsWith('Arrow') || /^[0-9]$/.test(event.key))) {
          event.stopImmediatePropagation()
          return
        }
      }
      if (event.key === 'Guide') {
        event.preventDefault()
        event.stopImmediatePropagation()
        setGuideOpen(true)
        return
      }
      if (zap.zapOn && !zap.guideOpen) {
        // Bakåt i zappläget: lista öppen → stäng listan, annars lämna zappläget.
        // Konsumeras bara här; annars går Bakåt vidare till den vanliga kedjan.
        if (BACK_KEYS.has(event.key)) {
          event.preventDefault()
          event.stopImmediatePropagation()
          if (zap.listOpen) setListOpen(false)
          else exitZap()
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
      // Sifferval (fjärrens sifferknappar) i båda lägena, inte bakom tablålagret.
      if (!zap.guideOpen && /^[0-9]$/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault()
        event.stopImmediatePropagation()
        poke()
        pushDigit(Number(event.key))
        return
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

  // ── TV-fokus mellan lagren ────────────────────────────────────────────────
  // Varje lager (kanal-OSD, zappläget, kanallistan) har en data-init-station.
  // Byts lagret får dess startstation fokus; annars bara om fokus tappats
  // (OSD:n avmonteras under inställningskortet vid varje byte, och fokus föll
  // då till body där fjärren inte kan gå vidare). Tablålagret fokuserar själv.
  const tuningShown = awaitingPicture(state)
  const layer = guideOpen ? 'guide' : zapOn ? (listOpen ? 'zaplist' : 'zap') : 'osd'
  const lastLayer = useRef<string | null>(null)
  useEffect(() => {
    if (!isTv || layer === 'guide' || tuningShown) return
    const changed = lastLayer.current !== layer
    lastLayer.current = layer
    const id = window.setTimeout(() => {
      const scope = document.querySelector<HTMLElement>(layer === 'zaplist' ? '[data-zap-list]' : layer === 'zap' ? '[data-zap-osd]' : '[data-channels-osd]')
      if (!scope) return
      const active = document.activeElement as HTMLElement | null
      const lost = !active || active === document.body || !active.isConnected
      // Första OSD:n vid öppning lämnas åt värdspelaren om den redan satt fokus.
      if ((changed && layer !== 'osd') || lost) pickInitTarget(scope)?.focus({ preventScroll: true })
    }, 0)
    return () => window.clearTimeout(id)
  }, [isTv, layer, tuningShown, modalMounted])

  // ── Rendering ──────────────────────────────────────────────────────────────
  // Det OSD:n beskriver: det som är på väg, annars det som spelas för den
  // aktuella begäran (inte en gammal kanals bild under ett kanalbyte).
  const described = pending ?? (onScreen && onScreen.seq === request.seq ? onScreen : null)
  const nextTitle = useMemo(() => {
    const after = described?.slot.stop ?? between?.until
    if (after == null || !channel) return null
    const next = programmeAt(rundown, channel.airWindow, after + 1000)
    return next.kind === 'programme' ? next.item.title : null
  }, [described, between, channel, rundown])

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
      notice={null}
      hasPrevious={!!prevId && prevId !== channel.id && channels.some((c) => c.id === prevId)}
      noise={noise}
      chromeHidden={awaitingPicture(state)}
      listRundowns={listRundowns}
      isTv={isTv}
      t={t}
      onSelect={(id) => { setListOpen(false); if (id !== stateRef.current.request.channelId) goToChannel(id) }}
      onPrevious={() => { if (prevId) goToChannel(prevId) }}
      onChUp={() => step(1)}
      onChDown={() => step(-1)}
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
      topbarBottom={hostTopbar}
      channel={channel}
      meta={metaParts.join(' · ')}
      title={described?.slot.item.title ?? null}
      mode={described?.mode ?? request.mode}
      notice={null}
      digits={digits}
      closeIsInit={!modalMounted}
      hostBar={modalMounted && !isTv}
      isTv={isTv}
      t={t}
      onClose={onClose}
      onFromStart={described ? fromStart : undefined}
      onChDown={() => step(-1)}
      onChUp={() => step(1)}
      onGuide={() => setGuideOpen(true)}
      onZap={enterZap}
      onActivity={poke}
    />
  )
  // En OSD åt gången: zappläget ersätter kanal-OSD:n; tablålagret ersätter båda.
  // Medan inställningskortet visas syns ingen krom alls (bara zappens brus).
  const tuningNow = awaitingPicture(state)
  const osd = guideOpen ? null : zapOn ? zapOverlay : tuningNow ? null : normalOsd
  const guide = guideOpen ? (
    <GuideOverlay channels={channels} currentId={channel.id} now={now} isTv={isTv} t={t} onPlay={playFromGuide} onClose={closeGuide} />
  ) : null

  // Inställningskortet: målkanalen och (när det är planerat) programmet och dess bild.
  const tuningItem = described?.slot.item ?? null
  const tuningCard = (
    <TuningCard
      channel={channel}
      title={tuningItem ? (tuningItem.kind === 'episode' && tuningItem.seriesTitle ? `${tuningItem.seriesTitle} · ${tuningItem.title}` : tuningItem.title) : null}
      imageUrl={tuningItem?.backdropUrl ?? tuningItem?.posterUrl ?? null}
      visible={tuningNow}
      isTv={isTv}
      t={t}
    />
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
          // Värdens startvakt: tiden går (ljud) eller bild renderad — strömmen lever.
          onStartProgress={() => noteProgress(seq)}
          onTimeUpdate={(position: number, duration: number) => {
            noteProgress(seq)
            // Filens verkliga längd: gäller posten från nästa poolbygge (en gång per visning).
            if (durationNotedFor.current !== seq && Number.isFinite(duration) && duration > 0) {
              durationNotedFor.current = seq
              const next = noteDuration(readRuntimeFixes(), slot.item.ref, duration)
              if (next) writeRuntimeFixes(next)
            }
            const cur = stateRef.current
            if (cur.firstPlaySeq === seq && cur.framedSeq !== seq) dispatch({ type: 'progress', seq, position })
            if (endHandledFor.current === seq) return
            const action = endOfSourceAction({ position, duration, startedAt: onScreen.initialTime, runtimeS: slot.item.runtimeMin * 60 })
            if (!action) return
            endHandledFor.current = seq
            if (action === 'ended') {
              dispatch({ type: 'advance', seq, now: Date.now() })
              return
            }
            // Filen tog slut strax efter start: den här versionen bar inte — nästa version.
            resolver.forget(slot.item.ref)
            dispatch({ type: 'failed', seq, now: Date.now(), url: playable.url })
          }}
          onFirstPlay={() => {
            // Först nu, när bilden syns, blir strömvalet ihågkommet (bara strömsök).
            if (slot.item.play.type === 'stream') rememberPlayedStream(playable.rememberToken)
            mark(seq, 'hostFirstPlay')
            // Värdens startvakt släpper efter 5 s även om mpv fortfarande söker
            // fram till livepositionen (mittfilsstart tar 10–13 s): då väntar
            // kortet på att positionen bekräftar, annars blev det svart emellan.
            const mounted = shownAt.current?.seq === seq ? shownAt.current.at : null
            const trusted = mounted == null || clockNow() - mounted < TRUSTED_FIRST_PLAY_MS
            dispatch({ type: 'firstPlay', seq, trusted })
          }}
          // Sant = vi byter själva (nästa version eller felvyn); spelaren stänger inte.
          onLoadFailed={() => {
            // Värdens bildrutevakt ger load-failed efter ~30 s utan räknade bildrutor
            // även när mpv spelar (playback-restart i loggen, tiden går). Ett fel
            // räknas bara utan framsteg — annars är det ingen Ingen signal.
            const p = progressAt.current
            if (p && p.seq === seq && clockNow() - p.at < PROGRESS_GRACE_MS) {
              console.info(`[channels] värdens laddfel ignoreras: strömmen ${channel.number} spelar`)
              dispatch({ type: 'reveal', seq })
              return true
            }
            // Utan längd från värden (filen tog slut innan bild): ett laddfel nära
            // programgränsen är programmets slut — liveläget låg efter filens slut.
            if (onScreen.mode === 'live' && slot.stop - Date.now() <= NEAR_BOUNDARY_MS) {
              dispatch({ type: 'advance', seq, now: Date.now() })
              return true
            }
            resolver.forget(slot.item.ref)
            dispatch({ type: 'failed', seq, now: Date.now(), url: playable.url })
            return true
          }}
          overlayContent={(
            <>
              {tuningNow ? <style>{HIDE_HOST_CHROME_CSS}</style> : null}
              {tuningCard}
              {osd}
              {guide}
            </>
          )}
        />
      </div>
    )
  }

  const backdropUrl = described?.slot.item.backdropUrl ?? between?.slot.item.backdropUrl ?? undefined

  return (
    <Screen backdropUrl={status === 'resolving' ? undefined : backdropUrl} isTv={isTv} onMouseMove={poke}>
      {status === 'rest' && rest ? (
        <p style={msgStyle}>{t('playerRest', { time: clock(rest.nextAir) })}</p>
      ) : status === 'empty' ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <p style={msgStyle}>{t('playerEmpty')}</p>
          {onEditChannel ? <OsdButton onClick={() => onEditChannel(channel.id)} isTv={isTv}>{t('playerEdit')}</OsdButton> : null}
        </div>
      ) : status === 'nosignal' && noSignal ? (
        <div data-channels-nosignal="" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <ChannelBadge channel={channel} size={72} isTv={isTv} />
          <p style={{ ...msgStyle, fontSize: '1.6rem', fontWeight: 700, letterSpacing: '0.04em' }}>{t('playerNoSignal')}</p>
          <p style={{ ...msgStyle, fontFamily: FONT.title }}>{noSignal.slot.item.kind === 'episode' && noSignal.slot.item.seriesTitle ? noSignal.slot.item.seriesTitle : noSignal.slot.item.title}</p>
          <p style={{ ...msgStyle, fontSize: '0.9rem', color: C.textDim }}>{t('playerNoSignalRetry', { time: clock(noSignal.retryAt) })}</p>
        </div>
      ) : status === 'between' && between ? (
        <div data-channels-between="" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <ChannelBadge channel={channel} size={72} isTv={isTv} />
          <p style={{ ...msgStyle, fontSize: '1.4rem', fontWeight: 700 }}>{t('playerBetween')}</p>
          <p style={{ ...msgStyle, fontFamily: FONT.title }}>
            {nextTitle ? t('playerBetweenNext', { time: clock(between.until), title: nextTitle }) : t('playerBetweenNextUntitled', { time: clock(between.until) })}
          </p>
        </div>
      ) : null}
      {tuningCard}
      {osd}
      {guide}
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
function OsdButton({ children, onClick, isTv, label, accent, init, data }: {
  children: ReactNode
  onClick(): void
  isTv: boolean
  label?: string
  accent?: boolean
  init?: boolean
  /** Eget data-attribut (t.ex. "osd-guide"), för att hitta knappen igen. */
  data?: string
}) {
  return (
    <button
      type="button"
      data-f=""
      data-init={init ? '' : undefined}
      {...(data ? { [`data-${data}`]: '' } : {})}
      aria-label={label}
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
        minHeight: isTv ? '2.75rem' : '2.25rem', padding: isTv ? '0 1.1rem' : '0 0.9rem',
        ...glass(isTv, { fill: accent ? C.accent : C.pillBg, blur: 20 }),
        borderRadius: RADIUS.pill, border: `1px solid ${accent ? C.accent : C.pillBorder}`,
        color: accent ? C.onAccent : C.text,
        fontFamily: FONT.ui, fontSize: isTv ? tvType('body') : '0.8rem', fontWeight: 600, letterSpacing: '0.12em',
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
  /** Värdens topprads nederkant i px från OSD:ns överkant (mätt); null = okänd. */
  topbarBottom?: number | null
  channel: ChannelDef
  meta: string
  title: string | null
  mode: PlayMode
  notice: string | null
  /** Sifferval som matas in just nu (fjärrens sifferknappar). */
  digits?: string
  /** Utan appens spelare landar TV-fokus på Stäng, annars på CH ▲. */
  closeIsInit: boolean
  /** Värdens topprad (skrivbord) finns: pillen under den; Stäng är värdens egen. */
  hostBar: boolean
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
      {/* Toppen: en kompakt pill uppe till vänster (badge, namn, en metarad) och Stäng som rund knapp uppe till höger. */}
      <div
        data-channels-osd-top=""
        style={{
          ...fade, ...glass(isTv, { fill: C.osdBg, blur: 12 }),
          // Under värdens 52 px-topprad, annars på appens sidlinje (--page-top-line:
          // macOS-titelraden/trafikljusen, Android-inset och TV-inset ingår).
          position: 'absolute',
          top: props.topbarBottom != null && props.topbarBottom > 0
            ? `calc(${props.topbarBottom}px + 0.5rem)`
            : props.hostBar ? 'calc(52px + 0.5rem)' : 'calc(var(--page-top-line, 1rem) + 0.25rem)',
          left: '1rem',
          maxWidth: 'min(26rem, calc(100vw - 6rem))',
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          padding: '0.35rem 0.9rem 0.35rem 0.35rem', borderRadius: RADIUS.pill,
        }}
      >
        <ChannelBadge channel={channel} size={30} isTv={isTv} style={{ borderRadius: RADIUS.pill }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: isTv ? tvType('body') : '0.8rem', fontWeight: 700, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{channel.name}</div>
          <div style={{ fontSize: isTv ? tvType('small') : '0.66rem', lineHeight: 1.25, color: C.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta}</div>
        </div>
      </div>
      {/* En stängning: med värdspelaren monterad är det värdens Stäng (anropar onClose); utan den vår ×. */}
      {props.closeIsInit ? (
      <button
        type="button"
        data-f=""
        data-init=""
        data-channels-close=""
        aria-label={t('playerClose')}
        onClick={props.onClose}
        style={{
          ...fade, ...glass(isTv, { fill: C.osdBg, blur: 12 }),
          position: 'absolute', top: 'calc(var(--page-top-line, 1rem) + 0.25rem)', right: '1rem', zIndex: 1,
          width: isTv ? '2.75rem' : '2.25rem', height: isTv ? '2.75rem' : '2.25rem', padding: 0, borderRadius: RADIUS.pill,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: C.text, fontFamily: FONT.ui, fontSize: isTv ? tvType('h2') : '1.05rem', lineHeight: 1, cursor: 'pointer',
        }}
      >
        ×
      </button>
      ) : null}

      {props.digits ? (
        <div
          data-channels-digits=""
          aria-live="polite"
          style={{
            position: 'absolute', top: 'calc(var(--page-top-line, 1rem) + 3.75rem)', right: '1.5rem',
            fontFamily: FONT.title, fontSize: '2.875rem', lineHeight: 1, color: C.text, textShadow: '0 2px 12px rgba(0,0,0,0.8)',
          }}
        >
          {props.digits}
        </div>
      ) : null}

      {notice ? (
        <div
          role="status"
          style={{
            position: 'absolute', top: '6.5rem', left: '50%', transform: 'translateX(-50%)',
            maxWidth: 'calc(100vw - 2rem)', padding: '0.7rem 1.2rem', borderRadius: RADIUS.osd,
            ...glass(isTv, { fill: C.osdBg, blur: 12 }),
            fontSize: isTv ? tvType('body') : '0.85rem', textAlign: 'center',
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
        {props.onGuide ? <OsdButton onClick={props.onGuide} isTv={isTv} data="osd-guide">{t('playerGuide')}</OsdButton> : null}
        {props.onZap ? <OsdButton onClick={props.onZap} isTv={isTv}>{t('playerZap')}</OsdButton> : null}
        <div style={{ flex: 1 }} />
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', padding: '0.2rem 0.6rem', borderRadius: RADIUS.pill,
            background: mode === 'live' ? C.accent : C.pillBg, color: mode === 'live' ? C.onAccent : C.text,
            border: mode === 'live' ? 'none' : `1px solid ${C.pillBorder}`,
            fontSize: isTv ? tvType('small') : '0.7rem', fontWeight: 700, letterSpacing: '0.18em',
          }}
        >
          {mode === 'live' ? `● ${t('playerLive')}` : t('playerFromStartBadge')}
        </span>
        {title ? (
          <span style={{ fontFamily: FONT.title, fontSize: isTv ? tvType('h3') : '0.9rem', maxWidth: '40%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {channel.number} · {title}
          </span>
        ) : null}
      </div>
    </div>
  )
}
