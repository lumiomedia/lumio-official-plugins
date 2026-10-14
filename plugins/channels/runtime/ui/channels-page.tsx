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
import { useTvMode, type BrowsePageProps } from '@/lib/plugin-sdk'
import { createChannel, type ChannelDef, PRESETS } from '../model/channel'
import type { PoolItem } from '../data/pool'
import type { PlayMode } from '../play/player-logic'
import { hostReady, readZapMemory } from '../host'
import { saveChannel, useChannelClock, useChannels } from '../state/store'
import { ChannelGuide } from './channel-guide'
import { ChannelHero } from './channel-hero'
import { ChannelPlayer } from './channel-player'
import { EmptyState, PRESET_TEXT } from './empty-state'
import { guideWindow } from './guide-layout'
import { C, FONT, RADIUS, fontSize } from './tokens'
import { useText } from './use-text'

interface PlayerState { channelId: string; mode: PlayMode; zap: boolean }
type Params = Record<string, string>

const HALF_HOUR = 30 * 60_000
/** TV: hur långt fram tidsaxeln kan rullas (halvtimmar). */
const MAX_SHIFT = 46

function pickChannel(sorted: ChannelDef[], wanted: string | null | undefined): ChannelDef | null {
  return (wanted ? sorted.find((c) => c.id === wanted) : undefined) ?? sorted[0] ?? null
}

function initialSelection(sorted: ChannelDef[], params: Params): string | null {
  return pickChannel(sorted, params.channelId ?? readZapMemory().lastChannelId)?.id ?? null
}

function initialPlayer(sorted: ChannelDef[], params: Params): PlayerState | null {
  if (!params.play && params.zap !== '1') return null
  if (!hostReady()) return null
  const channel = pickChannel(sorted, params.channelId ?? readZapMemory().lastChannelId)
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
  const isTv = useTvMode()
  const isMobile = useIsMobile() && !isTv
  const channels = useChannels()
  const sorted = useMemo(() => [...channels].sort((a, b) => a.number - b.number), [channels])
  const canPlay = useMemo(() => hostReady(), [])
  const p = params ?? {}

  const [selectedId, setSelectedId] = useState<string | null>(() => initialSelection(sorted, p))
  const [player, setPlayer] = useState<PlayerState | null>(() => initialPlayer(sorted, p))
  const [studio, setStudio] = useState<string | null>(() => p.studio ?? null)
  const [shift, setShift] = useState(0)
  const [rundowns, setRundowns] = useState<Record<string, { rundown: PoolItem[]; loading: boolean }>>({})

  // Nya parametrar medan sidan redan är öppen (hemkort, inställningarnas
  // Redigera): läs om vald kanal, spelare och studio.
  const paramsKey = JSON.stringify(p)
  const seenKey = useRef(paramsKey)
  useEffect(() => {
    if (seenKey.current === paramsKey) return
    seenKey.current = paramsKey
    const next = JSON.parse(paramsKey) as Params
    setSelectedId(initialSelection(sorted, next))
    setPlayer(initialPlayer(sorted, next))
    setStudio(next.studio ?? null)
  }, [paramsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const selected = pickChannel(sorted, selectedId)

  const onRundown = useCallback((id: string, rundown: PoolItem[], loading: boolean) => {
    setRundowns((prev) => (prev[id]?.rundown === rundown && prev[id]?.loading === loading ? prev : { ...prev, [id]: { rundown, loading } }))
  }, [])
  const clockInput = sorted.map((channel) => ({ channel, rundown: rundowns[channel.id]?.rundown ?? [] }))
  const now = useChannelClock(clockInput)
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
  const onSelect = useCallback((id: string) => setSelectedId(id), [])
  const play = useCallback((id: string, mode: PlayMode) => {
    if (!canPlay) return
    setSelectedId(id)
    setPlayer({ channelId: id, mode, zap: false })
  }, [canPlay])
  const onPlayRow = useCallback((id: string) => play(id, 'live'), [play])

  const playerRef = useRef(player)
  playerRef.current = player
  const closePlayer = useCallback(() => {
    const current = playerRef.current
    // Sidan visar kanalen man senast tittade på, inte den man öppnade med.
    if (current) setSelectedId(readZapMemory().lastChannelId ?? current.channelId)
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
          setSelectedId(id)
          setStudio(id)
        }}
      />
    )
  }

  if (studio) {
    return (
      <ChannelStudioSlot
        studio={studio}
        channels={sorted}
        isTv={isTv}
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
          onPreset={(id) => {
            const preset = PRESETS.find((x) => x.id === id)
            if (!preset) return
            const def = createChannel({ ...preset.draft, name: t(PRESET_TEXT[id].name) }, channels)
            saveChannel(def)
            setSelectedId(def.id)
          }}
          onCustom={() => setStudio('new')}
        />
      </div>
    )
  }

  const selectedData = rundowns[selected.id]
  return (
    <div data-channels-page="" style={{ background: C.base, minHeight: '100%' }}>
      {banner}
      <ChannelHero
        channel={selected}
        rundown={selectedData?.rundown ?? []}
        loading={selectedData?.loading ?? true}
        now={now}
        isTv={isTv}
        isMobile={isMobile}
        canPlay={canPlay}
        t={t}
        onPlay={(mode) => play(selected.id, mode)}
        onEdit={() => setStudio(selected.id)}
        onNewChannel={() => setStudio('new')}
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
 * Studions plats på sidan. Kanalstudion byggs i ett senare steg och ersätter
 * innehållet här; `studio` är 'new' eller kanalens id, `onDone` tar emot id:t
 * på en sparad kanal (eller inget vid Avbryt).
 */
function ChannelStudioSlot({ studio, channels, isTv, t, onDone }: {
  studio: string
  channels: ChannelDef[]
  isTv: boolean
  t: ReturnType<typeof useText>
  onDone(savedId?: string): void
}) {
  const editing = studio === 'new' ? null : channels.find((c) => c.id === studio) ?? null
  return (
    <div data-channels-studio="" style={{ background: C.base, minHeight: 330, padding: isTv ? '1.75rem 2.5rem' : '24px 16px', color: C.text, fontFamily: FONT.ui }}>
      <button
        type="button"
        data-f=""
        data-init=""
        onClick={() => onDone(editing?.id)}
        style={{
          minHeight: isTv ? '2.25rem' : 30, padding: isTv ? '0 1rem' : '0 14px', borderRadius: RADIUS.pill, cursor: 'pointer',
          border: `1px solid ${C.pillBorder}`, background: C.pillBg, color: C.text, fontFamily: FONT.ui, fontSize: fontSize(12, isTv), fontWeight: 600,
        }}
      >
        {t('studioBack')}
      </button>
      <h1 style={{ margin: '32px 0 0', fontFamily: FONT.title, fontWeight: 400, fontSize: fontSize(30, isTv) }}>{t('studioSoon')}</h1>
      {editing ? <p style={{ margin: '8px 0 0', color: C.textDim, fontSize: fontSize(14, isTv) }}>{editing.name}</p> : null}
    </div>
  )
}
