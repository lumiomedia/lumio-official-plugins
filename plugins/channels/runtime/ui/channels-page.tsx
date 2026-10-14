'use client'

/**
 * Kanaler-sidan, uppifrån och ned: appens meny (TV: värdens toppkrom via
 * keepsTvTopChrome), en stillastående kompakt hero för kanalen tablån pekar
 * på, och tablån i en egen rullbehållare under den — raderna rullar upp under
 * heron och tonar ut vid dess nederkant. Tomvy utan kanaler, och
 * kanalspelaren ovanpå när sidan öppnas med `play`/`zap`.
 *
 * TV: OK på en rad = Titta live; håll OK = glasmenyn (Från början, Redigera
 * kanal, Zappa). Skrivbord/mobil: klick väljer raden (heron följer; på
 * skrivbordet följer heron också pekaren), klick på vald rad eller
 * dubbelklick = Titta live. Kanalerna hanteras i pluginets inställningar.
 *
 * Sidparametrar: `channelId?`, `play?: 'live' | 'start'`, `zap?: '1'`,
 * `studio?: 'new' | <kanal-id>` (inställningarnas Redigera/Ny kanal).
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { getTvGlassMenu, useLang, useTvMode, type BrowsePageProps, type TvGlassMenuTarget } from '@/lib/plugin-sdk'
import type { ChannelDef } from '../model/channel'
import type { PoolItem } from '../data/pool'
import type { PlayMode } from '../play/player-logic'
import { hostReady, readZapMemory } from '../host'
import { readCachedRundown, restoreDefaultChannels, seedDefaultChannels, useChannelClock, useChannels } from '../state/store'
import { onAirNow, pickStartChannel } from './start-channel'
import { ChannelGuide } from './channel-guide'
import { ChannelHero } from './channel-hero'
import { ChannelPlayer } from './channel-player'
import { ChannelStudio } from './studio'
import { EmptyState } from './empty-state'
import { guideWindow } from './guide-layout'
import { C, FONT, fontSize } from './tokens'
import { tvu, useTvViewFocus } from './tv'
import { useText } from './use-text'

interface PlayerState { channelId: string; mode: PlayMode; zap: boolean }
type Params = Record<string, string>

const HALF_HOUR = 30 * 60_000
/** TV: hur långt fram tidsaxeln kan rullas (halvtimmar). */
const MAX_SHIFT = 46

/** Sparad tablå (synkront, utan uppslag) — null när cachen är kall. */
function cachedRundown(channel: ChannelDef): PoolItem[] | null {
  // Med tablålåset: samma tablå som tablån och heron visar.
  return readCachedRundown(channel)
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

/**
 * Sidans höjd: resten av fönstret (TV: scenen) från sidans överkant, så
 * tablån rullar i sin egen behållare och sidan själv aldrig rullar. Mäts i
 * sidans egna px (TV-scenen är skalad: skärmpx / skala).
 */
function useFillHeight(ref: { current: HTMLElement | null }, key: unknown): number | null {
  const [height, setHeight] = useState<number | null>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || typeof window === 'undefined') return
    const measure = () => {
      const r = el.getBoundingClientRect()
      const k = el.offsetWidth > 0 && r.width > 0 ? r.width / el.offsetWidth : 1
      const top = r.top + (window.scrollY || 0)
      // Kolumnens bottenpadding (skrivbord/mobil) räknas bort, annars rullade dokumentet den biten.
      const column = el.closest('[data-app-column]')
      const padBottom = column ? parseFloat(getComputedStyle(column).paddingBottom) || 0 : 0
      const next = Math.max(320, Math.floor((window.innerHeight - top - padBottom) / k))
      setHeight((prev) => (prev === next ? prev : next))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return height
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
  // Självvald startkanal (ingen channelId, inget val än): får bytas om den
  // visar sig vila när tablåerna laddats.
  const autoPick = useRef(!p.channelId)
  const [player, setPlayer] = useState<PlayerState | null>(() => initialPlayer(sorted, p))
  const [studio, setStudio] = useState<string | null>(() => p.studio ?? null)
  const [shift, setShift] = useState(0)
  // Skrivbord: raden under pekaren styr heron medan pekaren står där.
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [menu, setMenu] = useState<TvGlassMenuTarget | null>(null)
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

  const selected = useMemo(
    () => (selectedId ? sorted.find((c) => c.id === selectedId) : undefined) ?? startChannel(sorted, {}),
    [sorted, selectedId],
  )

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
  const play = useCallback((id: string, mode: PlayMode, zap = false) => {
    if (!canPlay) return
    autoPick.current = false
    setSelectedId(id)
    setPlayer({ channelId: id, mode, zap })
  }, [canPlay])
  const onPlayRow = useCallback((id: string) => play(id, 'live'), [play])
  // Pekaren bara på skrivbordet (mobilens tryck ger ingen hovring att lita på).
  const onHover = useCallback((id: string | null) => setHoverId(id), [])

  // TV: håll OK på en rad → värdens glasmeny.
  const sortedRef = useRef(sorted)
  sortedRef.current = sorted
  const onHold = useCallback((id: string, element: HTMLElement) => {
    const channel = sortedRef.current.find((c) => c.id === id)
    if (!channel) return
    setMenu({
      title: t('zapChannelLine', { n: channel.number, name: channel.name }),
      element,
      actions: [
        ...(canPlay ? [{ key: 'start', label: t('menuFromStart'), run: () => play(id, 'start') }] : []),
        { key: 'edit', label: t('menuEdit'), run: () => { autoPick.current = false; setSelectedId(id); setStudio(id) } },
        ...(canPlay ? [{ key: 'zap', label: t('menuZap'), run: () => play(id, 'live', true) }] : []),
      ],
    })
  }, [t, play, canPlay])
  const TvGlassMenu = isTv ? getTvGlassMenu() : null

  const playerRef = useRef(player)
  playerRef.current = player

  // TV: varje vy får sitt startfokus när den öppnas (sidan: vald kanals rad;
  // studion: namnfältet; tomvyn: Återställ). Spelaren äger sitt eget.
  const viewRef = useRef<HTMLDivElement | null>(null)
  const view = player && sorted.length > 0 ? 'player' : studio ? `studio:${studio}` : selected ? 'main' : 'empty'
  useTvViewFocus(viewRef, isTv && view !== 'player', view)
  const fillHeight = useFillHeight(viewRef, view)

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
        onEditChannel={(id) => {
          setPlayer(null)
          autoPick.current = false
          setSelectedId(id)
          setStudio(id)
        }}
      />
    )
  }

  if (studio) {
    return (
      <div ref={viewRef} data-channels-page="" style={{ minHeight: '100%' }}>
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
      </div>
    )
  }

  const banner = canPlay ? null : (
    <div
      role="status"
      style={{
        position: 'relative', zIndex: 1,
        padding: isTv ? `${tvu(10)} ${tvu(100)}` : '10px 16px', background: 'rgba(244,132,95,0.14)', borderBottom: '1px solid rgba(244,132,95,0.35)',
        color: C.accentLight, fontFamily: FONT.ui, fontSize: fontSize(13, isTv), flexShrink: 0,
      }}
    >
      {t('pageHostTooOld')}
    </div>
  )

  if (!selected) {
    return (
      <div ref={viewRef} data-channels-page="" style={{ background: C.base, minHeight: '100%' }}>
        {banner}
        <EmptyState
          isTv={isTv}
          isMobile={isMobile}
          t={t}
          onRestore={() => {
            restoreDefaultChannels(uiLang)
            setSelectedId(null)
          }}
        />
      </div>
    )
  }

  // Heron visar raden under pekaren (skrivbord), annars vald (= fokus på TV, tryckt på mobil).
  const hovered = !isTv && !isMobile && hoverId ? sorted.find((c) => c.id === hoverId) : undefined
  const heroChannel = hovered ?? selected
  const heroData = rundowns[heroChannel.id]
  // Bakgrundslagret: visad kanal och grannarna i tablån (förladdade, osynliga).
  const at = sorted.findIndex((c) => c.id === heroChannel.id)
  const images = [sorted[at - 1], heroChannel, sorted[at + 1]]
    .filter((c): c is ChannelDef => !!c)
    .filter((c, i, list) => list.findIndex((x) => x.id === c.id) === i)
    .map((channel) => ({ channel, rundown: rundowns[channel.id]?.rundown ?? [] }))
  return (
    // Ingen egen bakgrund: herobilden ligger under sidan (z −1) kant i kant.
    // Fast höjd: bara tablåns behållare rullar, heron står still.
    <div
      ref={viewRef}
      data-channels-page=""
      style={{ height: fillHeight ?? 'var(--lumio-vh, 100vh)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {banner}
      <ChannelHero
        channel={heroChannel}
        rundown={heroData?.rundown ?? []}
        loading={heroData?.loading ?? true}
        partial={heroData?.partial ?? false}
        now={now}
        isTv={isTv}
        isMobile={isMobile}
        canPlay={canPlay}
        t={t}
        onPlay={(mode) => play(heroChannel.id, mode)}
        images={images}
      />
      <ChannelGuide
        channels={sorted}
        selectedId={selected.id}
        window={win}
        now={now}
        isTv={isTv}
        isMobile={isMobile}
        t={t}
        fill
        initId={isTv ? selected.id : null}
        onSelect={onSelect}
        onPlay={onPlayRow}
        onRundown={onRundown}
        onShift={onShift}
        onHover={isTv || isMobile ? undefined : onHover}
        onHold={isTv ? onHold : undefined}
      />
      {TvGlassMenu && menu ? <TvGlassMenu target={menu} onClose={() => setMenu(null)} /> : null}
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
