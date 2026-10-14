'use client'

/**
 * Kanaler-sidan: hero för vald kanal + tablå, tomvy utan kanaler och
 * kanalspelaren ovanpå när sidan öppnas med `play`/`zap` (hemkorten går
 * rakt till live).
 *
 * Sidparametrar: `channelId?`, `play?: 'live' | 'start'`, `zap?: '1'`,
 * `studio?: 'new' | <kanal-id>`. Spelare och studio är lokalt tillstånd som
 * sätts från parametrarna — värden har ingen historik inom en sida, och
 * samma sida med samma parametrar igen skulle stänga den.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLang, useTvMode, type BrowsePageProps } from '@/lib/plugin-sdk'
import type { ChannelDef } from '../model/channel'
import type { PoolItem } from '../data/pool'
import type { PlayMode } from '../play/player-logic'
import { hostReady, readZapMemory } from '../host'
import { readCachedPool, restoreDefaultChannels, seedDefaultChannels, useChannelClock, useChannels } from '../state/store'
import { buildRundown } from '../model/schedule'
import { onAirNow, pickStartChannel } from './start-channel'
import { heroSlides, stepSlide } from './hero-carousel-logic'
import { ChannelGuide } from './channel-guide'
import { ChannelHero } from './channel-hero'
import { ChannelPlayer } from './channel-player'
import { ChannelStudio } from './studio'
import { ChannelManager } from './channel-manager'
import { EmptyState } from './empty-state'
import { guideWindow } from './guide-layout'
import { C, FONT, fontSize } from './tokens'
import { useText } from './use-text'

interface PlayerState { channelId: string; mode: PlayMode; zap: boolean }
type Params = Record<string, string>

const HALF_HOUR = 30 * 60_000
/** TV: hur långt fram tidsaxeln kan rullas (halvtimmar). */
const MAX_SHIFT = 46

/** Sparad tablå (synkront, utan uppslag) — null när cachen är kall. */
function cachedRundown(channel: ChannelDef): PoolItem[] | null {
  const pool = readCachedPool(channel.id)
  return pool ? buildRundown(pool, channel.order, channel.seed) : null
}

/**
 * Kanal att börja på: en uttryckligen angiven kanal vinner; annars en som
 * sänder nu (senast sedda först), se start-channel.ts.
 */
function startChannel(sorted: ChannelDef[], params: Params, rundownOf: (c: ChannelDef) => PoolItem[] | null = cachedRundown): ChannelDef | null {
  const explicit = params.channelId ? sorted.find((c) => c.id === params.channelId) : undefined
  return explicit ?? pickStartChannel(sorted, readZapMemory().lastChannelId, Date.now(), rundownOf)
}

function initialSelection(sorted: ChannelDef[], params: Params): string | null {
  return startChannel(sorted, params)?.id ?? null
}

function initialPlayer(sorted: ChannelDef[], params: Params): PlayerState | null {
  if (!params.play && params.zap !== '1') return null
  if (!hostReady()) return null
  const channel = startChannel(sorted, params)
  if (!channel) return null
  return { channelId: channel.id, mode: params.play === 'start' ? 'start' : 'live', zap: params.zap === '1' }
}

function useIsMobile(): boolean {
  const query = '(max-width: 639px)'
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches)
  useEffect(() => {
    const mq = window.matchMedia?.(query)
    if (!mq) return
    const update = () => setMobile(mq.matches)
    update()
    // addListener för äldre WebView (addEventListener på MediaQueryList saknas före Chromium 45/Safari 14).
    if (mq.addEventListener) mq.addEventListener('change', update)
    else mq.addListener(update)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', update)
      else mq.removeListener(update)
    }
  }, [])
  return mobile
}

export function ChannelsPage({ params }: BrowsePageProps) {
  const t = useText()
  const { lang } = useLang()
  const uiLang = lang === 'sv' ? 'sv' : 'en'
  // Första öppningen i profilen: standardkanalerna skapas FÖRE första läsningen,
  // så sidan aldrig blinkar tomvyn. En gång per profil (flagga i lagringen).
  useState(() => seedDefaultChannels(uiLang))
  const isTv = useTvMode()
  const isMobile = useIsMobile() && !isTv
  const channels = useChannels()
  const sorted = useMemo(() => [...channels].sort((a, b) => a.number - b.number), [channels])
  const canPlay = useMemo(() => hostReady(), [])
  const p = params ?? {}

  const [selectedId, setSelectedId] = useState<string | null>(() => initialSelection(sorted, p))
  // Självvald startkanal (ingen channelId, inget klick än): får bytas om den
  // visar sig vila när tablåerna laddats.
  const autoPick = useRef(!p.channelId)
  const [player, setPlayer] = useState<PlayerState | null>(() => initialPlayer(sorted, p))
  const [studio, setStudio] = useState<string | null>(() => p.studio ?? null)
  const [shift, setShift] = useState(0)
  const [manage, setManage] = useState(false)
  const [rundowns, setRundowns] = useState<Record<string, { rundown: PoolItem[]; loading: boolean; partial: boolean }>>({})

  // Nya parametrar medan sidan redan är öppen (hemkort, inställningarnas
  // Redigera): läs om vald kanal, spelare och studio.
  const paramsKey = JSON.stringify(p)
  const seenKey = useRef(paramsKey)
  useEffect(() => {
    if (seenKey.current === paramsKey) return
    seenKey.current = paramsKey
    const next = JSON.parse(paramsKey) as Params
    autoPick.current = !next.channelId
    setSelectedId(initialSelection(sorted, next))
    setPlayer(initialPlayer(sorted, next))
    setStudio(next.studio ?? null)
  }, [paramsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedRef = useRef<string | null>(null)
  const selected = useMemo(
    () => (selectedId ? sorted.find((c) => c.id === selectedId) : undefined) ?? startChannel(sorted, {}),
    [sorted, selectedId],
  )
  selectedRef.current = selected?.id ?? null

  const onRundown = useCallback((id: string, rundown: PoolItem[], loading: boolean, partial: boolean) => {
    setRundowns((prev) => {
      const cur = prev[id]
      return cur?.rundown === rundown && cur.loading === loading && cur.partial === partial ? prev : { ...prev, [id]: { rundown, loading, partial } }
    })
  }, [])
  const clockInput = sorted.map((channel) => ({ channel, rundown: rundowns[channel.id]?.rundown ?? [] }))
  const now = useChannelClock(clockInput)
  // Startkanalen valdes på sparade tablåer (eller sändningstiden vid kall
  // cache). Visar den laddade tablån att den vilar: välj om bland de laddade.
  useEffect(() => {
    if (!autoPick.current || !selected) return
    const own = rundowns[selected.id]
    if (!own || own.loading || onAirNow(selected, own.rundown, now)) return
    const loaded = (c: ChannelDef) => {
      const r = rundowns[c.id]
      return r && !r.loading ? r.rundown : cachedRundown(c)
    }
    const next = pickStartChannel(sorted, readZapMemory().lastChannelId, now, loaded)
    if (next && next.id !== selected.id) setSelectedId(next.id)
  }, [rundowns, selected, sorted, now])

  // Heroskarusellen: sändande kanaler + vald, i nummerordning.
  const slides = useMemo(
    () => heroSlides(sorted, (id) => rundowns[id]?.rundown, now, selected?.id ?? null)
      .map((channel) => ({ channel, rundown: rundowns[channel.id]?.rundown ?? [] })),
    [sorted, rundowns, now, selected],
  )
  const slidesRef = useRef(slides)
  slidesRef.current = slides
  const onSlide = useCallback((id: string) => { autoPick.current = false; setSelectedId(id) }, [])
  const onStep = useCallback((dir: -1 | 1) => {
    const id = stepSlide(slidesRef.current.map((s) => s.channel), selectedRef.current, dir)
    if (id) onSlide(id)
  }, [onSlide])

  const win = useMemo(() => guideWindow(now + shift * HALF_HOUR), [now, shift])

  // Ref vid sidan av tillståndet: svaret behövs synkront i tangenthanteraren.
  const shiftRef = useRef(0)
  const onShift = useCallback((dir: -1 | 1) => {
    const next = Math.min(MAX_SHIFT, Math.max(0, shiftRef.current + dir))
    // Vänster vid nu ger falskt så fokusmotorn får trycket (t.ex. till sidomenyn).
    if (next === shiftRef.current) return dir === 1
    shiftRef.current = next
    setShift(next)
    return true
  }, [])
  const onSelect = useCallback((id: string) => { autoPick.current = false; setSelectedId(id) }, [])
  const play = useCallback((id: string, mode: PlayMode) => {
    if (!canPlay) return
    autoPick.current = false
    setSelectedId(id)
    setPlayer({ channelId: id, mode, zap: false })
  }, [canPlay])
  const onPlayRow = useCallback((id: string) => play(id, 'live'), [play])

  const playerRef = useRef(player)
  playerRef.current = player
  const closePlayer = useCallback(() => {
    const current = playerRef.current
    // Sidan visar kanalen man senast tittade på, inte den man öppnade med.
    if (current) { autoPick.current = false; setSelectedId(readZapMemory().lastChannelId ?? current.channelId) }
    setPlayer(null)
  }, [])

  if (player && sorted.length > 0) {
    return (
      <ChannelPlayer
        channels={sorted}
        initialChannelId={player.channelId}
        mode={player.mode}
        startInZap={player.zap}
        onClose={closePlayer}
        onOpenGuide={closePlayer}
        onEditChannel={(id) => {
          setPlayer(null)
          autoPick.current = false
          setSelectedId(id)
          setStudio(id)
        }}
      />
    )
  }

  if (manage && !studio) {
    return (
      <div data-channels-page="" style={{ background: C.base, minHeight: '100%' }}>
        <ChannelManager
          isTv={isTv}
          isMobile={isMobile}
          t={t}
          onBack={() => setManage(false)}
          onEdit={(id) => { setManage(false); setSelectedId(id); setStudio(id) }}
          onCreate={() => { setManage(false); setStudio('new') }}
        />
      </div>
    )
  }

  if (studio) {
    return (
      <ChannelStudioSlot
        studio={studio}
        channels={sorted}
        isTv={isTv}
        isMobile={isMobile}
        t={t}
        onDone={(id) => {
          setStudio(null)
          if (id) setSelectedId(id)
        }}
      />
    )
  }

  const banner = canPlay ? null : (
    <div
      role="status"
      style={{
        padding: isTv ? '0.625rem 2.5rem' : '10px 16px', background: 'rgba(244,132,95,0.14)', borderBottom: '1px solid rgba(244,132,95,0.35)',
        color: C.accentLight, fontFamily: FONT.ui, fontSize: fontSize(13, isTv),
      }}
    >
      {t('pageHostTooOld')}
    </div>
  )

  if (!selected) {
    return (
      <div data-channels-page="" style={{ background: C.base, minHeight: '100%' }}>
        {banner}
        <EmptyState
          isTv={isTv}
          isMobile={isMobile}
          t={t}
          onRestore={() => {
            restoreDefaultChannels(uiLang)
            setSelectedId(null)
          }}
          onCustom={() => setStudio('new')}
        />
      </div>
    )
  }

  const selectedData = rundowns[selected.id]
  return (
    // Ingen egen bakgrund här: herobilden ligger under sidan (z −1) och ska
    // synas kant i kant; appens grund under är redan svart.
    <div data-channels-page="" style={{ minHeight: '100%' }}>
      {banner}
      <ChannelHero
        channel={selected}
        rundown={selectedData?.rundown ?? []}
        loading={selectedData?.loading ?? true}
        partial={selectedData?.partial ?? false}
        now={now}
        isTv={isTv}
        isMobile={isMobile}
        canPlay={canPlay}
        t={t}
        onPlay={(mode) => play(selected.id, mode)}
        onEdit={() => setStudio(selected.id)}
        onNewChannel={() => setStudio('new')}
        onManage={() => setManage(true)}
        slides={slides}
        onSlide={onSlide}
        onStep={onStep}
      />
      <ChannelGuide
        channels={sorted}
        selectedId={selected.id}
        window={win}
        now={now}
        isTv={isTv}
        isMobile={isMobile}
        t={t}
        onSelect={onSelect}
        onPlay={onPlayRow}
        onRundown={onRundown}
        onShift={onShift}
      />
    </div>
  )
}

/**
 * Studions plats på sidan: `studio` är 'new' eller kanalens id, `onDone` tar
 * emot id:t på en sparad kanal (Avbryt på en befintlig kanal ger dess id,
 * borttagning inget).
 */
function ChannelStudioSlot({ studio, channels, isTv, isMobile, t, onDone }: {
  studio: string
  channels: ChannelDef[]
  isTv: boolean
  isMobile: boolean
  t: ReturnType<typeof useText>
  onDone(savedId?: string): void
}) {
  // Ny nyckel per kanal: studion läser kanalen en gång när den öppnas.
  return <ChannelStudio key={studio} studio={studio} channels={channels} isTv={isTv} isMobile={isMobile} t={t} onDone={onDone} />
}
