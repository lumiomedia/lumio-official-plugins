'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties, type ReactNode } from 'react'
import { getTvGlassMenu, requestBrowseBack, type BrowsePageProps, type TvGlassMenuAction, type TvGlassMenuTarget } from '@/lib/plugin-sdk'
import { channelKey, type M3uChannel } from '../live-tv-data'
import { qualityFromName, useLiveTvModel, type LiveTvModel } from '../live-tv-model'
import { LIVE_TV_BROWSE_PAGE_ID, encodeChannelParams, type PlayRequest } from '../live-tv-shell'
import { PinGate } from '../live-tv-ui'
import { activeProfileHasPin, isUnlockedThisSession, markUnlockedThisSession, pinSupportAvailable, toggleChannelLock, verifyActiveProfilePin } from '../channel-locks'
import { useTvText } from './tv-strings'
import { TV, TvFocusStyle, dp, station, Icons } from './tv-ui'
import { useTvSettings, type TvSettings } from './tv-settings-store'
import { addToFirstFree, getMultiviewState, setMultiviewState } from './tv-multiview-store'
import { createZapBuffer, resolveZap } from './tv-zap'
import { releaseAllSurfaces } from './video-surface'
import type { LiveTvPlayerTvProps } from './tv-player-types'
import { TV_VIEWS } from './tv-views'

export type TvView = 'hub' | 'guide' | 'favs' | 'channel' | 'search' | 'multi' | 'settings'
const VIEWS: TvView[] = ['hub', 'guide', 'favs', 'channel', 'search', 'multi', 'settings']

export interface TvNav {
  view: TvView
  params: Record<string, string>
  go(view: TvView, params?: Record<string, string>): void
  back(): void
  play(request: PlayRequest): void
  openChannel(channel: M3uChannel, programmeStart?: number): void
  openMenu(target: TvGlassMenuTarget): void
  channelMenu(channel: M3uChannel, element: HTMLElement, extra?: TvGlassMenuAction[]): void
  addToMultiview(channel: M3uChannel): void
  pushLayer(close: () => void): () => void
  toast(text: string): void
  playerOpen: boolean
}

export interface TvViewProps { model: LiveTvModel; nav: TvNav; params: Record<string, string>; settings: TvSettings }

type PlayerComponent = ComponentType<{
  channel: M3uChannel
  onClose: () => void
  listId?: string | null
  epgUrls?: string[]
  onSwitchChannel?: (channel: M3uChannel) => void
  tv?: LiveTvPlayerTvProps
}>

const BACK_KEYS = new Set(['Escape', 'Backspace', 'GoBack', 'BrowserBack'])
const ZAP_TIMEOUT_MS = 1500

function viewFromParams(params?: Record<string, string>): TvView {
  const raw = params?.view
  if (raw && (VIEWS as string[]).includes(raw)) return raw as TvView
  if (!raw && params?.url) return 'channel'
  return 'hub'
}

export function LiveTvTvShell({ params, onNavigate }: BrowsePageProps) {
  const { tt, locale } = useTvText()
  const model = useLiveTvModel()
  const settings = useTvSettings()
  const view = viewFromParams(params)
  const viewParams = params ?? {}

  const [Player, setPlayer] = useState<PlayerComponent | null>(null)
  const [active, setActive] = useState<PlayRequest | null>(null)
  const [pending, setPending] = useState<PlayRequest | null>(null)
  const [menu, setMenu] = useState<TvGlassMenuTarget | null>(null)
  const [zapDigits, setZapDigits] = useState('')
  const [toastText, setToastText] = useState<string | null>(null)
  const layersRef = useRef<Array<() => void>>([])
  const TvGlassMenu = getTvGlassMenu()

  useEffect(() => {
    if (!active || Player) return
    let cancelled = false
    // Castet: LiveTvPlayer accepterar ännu inte `tv` (Task 16), men PlayerComponent
    // deklarerar den som valfri — samma FunctionComponent/ReactNode-mismatch som
    // redan finns i live-tv-shell.tsx:s motsvarande laddning.
    void import('../live-tv-player').then((mod) => { if (!cancelled) setPlayer(() => mod.LiveTvPlayer as PlayerComponent) }).catch(() => { if (!cancelled) setActive(null) })
    return () => { cancelled = true }
  }, [active, Player])

  const go = useCallback((next: TvView, extra: Record<string, string> = {}) => {
    onNavigate({ pageId: LIVE_TV_BROWSE_PAGE_ID, params: { view: next, ...extra } })
  }, [onNavigate])

  const toast = useCallback((text: string) => {
    setToastText(text)
    window.setTimeout(() => setToastText((current) => (current === text ? null : current)), 1800)
  }, [])

  const play = useCallback((request: PlayRequest) => {
    const locked = model.locked.has(channelKey(request.channel))
    if (locked && !isUnlockedThisSession() && pinSupportAvailable() && activeProfileHasPin()) {
      setPending(request)
      return
    }
    void releaseAllSurfaces().finally(() => setActive(request))
  }, [model.locked])

  const openChannel = useCallback((channel: M3uChannel, programmeStart?: number) => {
    go('channel', { ...encodeChannelParams(channel), ...(programmeStart ? { programme: String(programmeStart) } : {}) })
  }, [go])

  const addToMultiview = useCallback((channel: M3uChannel) => {
    setMultiviewState(addToFirstFree(getMultiviewState(), channelKey(channel)))
    toast(tt('addedToMultiview'))
  }, [toast, tt])

  const channelMenu = useCallback((channel: M3uChannel, element: HTMLElement, extra: TvGlassMenuAction[] = []) => {
    const key = channelKey(channel)
    const pinned = model.pinnedSet.has(key)
    const locked = model.locked.has(key)
    setMenu({
      title: channel.name,
      element,
      actions: [
        { key: 'play', label: tt('watchNow'), run: () => play({ channel }) },
        { key: 'pin', label: pinned ? tt('menuRemoveFavourite') : tt('menuAddFavourite'), run: () => model.togglePin(channel) },
        { key: 'info', label: tt('menuChannelDetails'), run: () => openChannel(channel) },
        { key: 'multi', label: tt('menuAddMultiview'), run: () => addToMultiview(channel) },
        ...extra,
        ...(pinSupportAvailable() && activeProfileHasPin()
          ? [{ key: 'lock', label: locked ? tt('menuUnlock') : tt('menuLock'), run: () => { toggleChannelLock(channel) } }]
          : []),
      ],
    })
  }, [model, tt, play, openChannel, addToMultiview])

  const pushLayer = useCallback((close: () => void) => {
    layersRef.current.push(close)
    return () => { layersRef.current = layersRef.current.filter((c) => c !== close) }
  }, [])

  const back = useCallback(() => {
    const top = layersRef.current[layersRef.current.length - 1]
    if (top) { top(); return }
    if (pending) { setPending(null); return }
    if (active) { setActive(null); return }
    if (view === 'channel') { go('guide'); return }
    if (view !== 'hub') { go('hub'); return }
    requestBrowseBack()
  }, [pending, active, view, go])

  // Back i capture-fas. Glasmenyn sköter sin egen Back, därför avstår skalet
  // medan den är öppen.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!BACK_KEYS.has(event.key)) return
      if (menu) return
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      // Värdens egna paneler (TV-tangentbordet) stänger sig själva.
      if (target?.closest?.('[data-live-tv-host-ui]')) return
      event.preventDefault()
      event.stopPropagation()
      back()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [back, menu])

  // Nummertangenter: favoriter 1–N först, sedan listnummer.
  const favourites = model.favouriteChannels
  const channels = model.channels
  // Senaste versionen av allt onCommit behöver, i en ref: skapas EN gång
  // (nedan) så en pågående zapp-timer aldrig kapas av ett orelaterat
  // omrender. `play` byter identitet varje rendering (model.locked är en ny
  // Set per anrop i channel-locks.ts), och hade annars gjort om bufferten —
  // och nollställt dess timer — innan 1500 ms hunnit gå.
  const zapDepsRef = useRef({ favourites, channels, play, toast, tt })
  useEffect(() => { zapDepsRef.current = { favourites, channels, play, toast, tt } })
  const zapRef = useRef<ReturnType<typeof createZapBuffer> | null>(null)
  useEffect(() => {
    const buffer = createZapBuffer({
      timeoutMs: ZAP_TIMEOUT_MS,
      onChange: setZapDigits,
      onCommit: (digits) => {
        const { favourites, channels, play, toast, tt } = zapDepsRef.current
        const hit = resolveZap(digits, favourites, channels)
        if (hit) play({ channel: hit })
        else toast(tt('zapMiss', { n: digits }))
      },
    })
    zapRef.current = buffer
    return () => { buffer.dispose(); zapRef.current = null }
  }, [])
  useEffect(() => {
    if (!settings.numericZap) return
    const onKey = (event: KeyboardEvent) => {
      if (menu || layersRef.current.length > 0) return
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      if (target?.closest?.('[data-live-tv-keyboard]')) return
      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault()
        event.stopPropagation()
        zapRef.current?.push(event.key)
      } else if (event.key === 'Enter' && zapDigits) {
        event.preventDefault()
        event.stopPropagation()
        zapRef.current?.commit()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [settings.numericZap, menu, zapDigits])

  // Starta på senaste kanalen: bara när hubben öppnas utan parametrar.
  const startedRef = useRef(false)
  useEffect(() => {
    if (startedRef.current || !settings.startOnLastChannel || view !== 'hub' || params?.url) return
    const last = model.history[0]
    const channel = last ? model.byUrl.get(last.url) : null
    if (!channel) return
    startedRef.current = true
    play({ channel })
  }, [settings.startOnLastChannel, view, params, model.history, model.byUrl, play])

  const nav: TvNav = useMemo(() => ({
    view, params: viewParams, go, back, play, openChannel, openMenu: setMenu, channelMenu, addToMultiview, pushLayer, toast, playerOpen: active !== null,
  }), [view, viewParams, go, back, play, openChannel, channelMenu, addToMultiview, pushLayer, toast, active])

  const View = TV_VIEWS[view]
  const activeChannel: M3uChannel | null = active
    ? active.url ? { ...active.channel, url: active.url, name: active.label ?? active.channel.name } : active.channel
    : null

  const rail: { key: TvView; label: string; icon: ReactNode }[] = [
    { key: 'search', label: tt('railSearch'), icon: <Icons.Search /> },
    { key: 'hub', label: tt('railHome'), icon: <Icons.Home /> },
    { key: 'guide', label: tt('railGuide'), icon: <Icons.Tv /> },
    { key: 'multi', label: tt('railMultiview'), icon: <Icons.SquaresFour /> },
    { key: 'favs', label: tt('railFavourites'), icon: <Icons.Heart /> },
  ]
  const railItem = (item: { key: TvView; label: string; icon: ReactNode }, extraStyle?: CSSProperties) => {
    const activeItem = item.key === view || (item.key === 'guide' && view === 'channel')
    return (
      <div
        key={item.key}
        {...station(() => go(item.key), undefined, { 'data-testid': `rail-${item.key}`, 'aria-label': item.label, title: item.label })}
        style={{ width: dp(60), height: dp(60), borderRadius: dp(16), display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: activeItem ? TV.s14 : 'transparent', color: activeItem ? TV.text : 'rgba(243,244,248,0.55)', ...extraStyle }}
      >
        {item.icon}
      </div>
    )
  }

  const tvPlayerProps: LiveTvPlayerTvProps | undefined = activeChannel
    ? {
        channelNumber: model.channelNumber(activeChannel),
        quality: qualityFromName(activeChannel.name),
        favourite: model.pinnedSet.has(channelKey(activeChannel)),
        bannerHideMs: settings.bannerHideMs,
        neighbours: model.channels,
        nowFor: model.nowFor,
        nowMs: model.nowMs,
        locale,
        onToggleFavourite: () => model.togglePin(activeChannel),
        onOpenChannelDetails: () => { setActive(null); openChannel(activeChannel) },
        onOpenMultiview: () => { setActive(null); go('multi') },
        onOpenGuide: () => { setActive(null); go('guide') },
        onAddToMultiview: addToMultiview,
        onSwitchChannel: (channel) => setActive({ channel }),
      }
    : undefined

  return (
    <div data-live-tv-tv-root="" style={{ display: 'flex', height: '100%', minHeight: 0, background: TV.bg, color: TV.text, fontFamily: TV.font, fontSize: dp(22), lineHeight: 1.3 }}>
      <TvFocusStyle />
      {/* Ikonrad: pluginets egen navigation inne i Live TV. Inte data-col="side" —
          värdens Back-regel hade då flyttat fokus hit i stället för att gå bakåt. */}
      <nav aria-label={tt('liveTv')} style={{ width: dp(104), flexShrink: 0, borderRight: `1px solid ${TV.line}`, background: 'linear-gradient(180deg, rgba(252,252,255,0.05), rgba(252,252,255,0.02))', padding: `${dp(36)}px 0 ${dp(32)}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: dp(14) }}>
        <div aria-hidden="true" style={{ width: dp(44), height: dp(44), borderRadius: dp(12), background: TV.acc, color: TV.onAcc, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: dp(22), marginBottom: dp(24) }}>L</div>
        {rail.map((item) => railItem(item))}
        {railItem({ key: 'settings', label: tt('railSettings'), icon: <Icons.Gear /> }, { marginTop: 'auto' })}
      </nav>
      <main style={{ flex: 1, minWidth: 0, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <View key={view} model={model} nav={nav} params={viewParams} settings={settings} />
      </main>

      {activeChannel && Player ? (
        <Player channel={activeChannel} onClose={() => setActive(null)} listId={model.epgListId} epgUrls={model.epgUrls} onSwitchChannel={(channel) => setActive({ channel })} tv={tvPlayerProps} />
      ) : null}
      <PinGate
        open={pending !== null}
        title={tt('enterPin')}
        wrongText={tt('pinWrong')}
        unlockLabel={tt('unlock')}
        cancelLabel={tt('cancel')}
        onVerify={verifyActiveProfilePin}
        onClose={() => setPending(null)}
        onUnlocked={() => { markUnlockedThisSession(); const request = pending; setPending(null); if (request) void releaseAllSurfaces().finally(() => setActive(request)) }}
      />
      {TvGlassMenu && menu ? <TvGlassMenu target={menu} onClose={() => setMenu(null)} /> : null}
      {zapDigits ? (
        <div style={{ position: 'fixed', top: dp(36), right: dp(48), zIndex: 80, padding: `${dp(10)}px ${dp(22)}px`, borderRadius: dp(12), background: TV.glass, fontSize: dp(34), fontWeight: 600, letterSpacing: '0.1em' }}>{zapDigits}</div>
      ) : null}
      {toastText ? (
        <div role="status" data-live-tv-layer="" style={{ position: 'fixed', bottom: dp(40), left: '50%', transform: 'translateX(-50%)', zIndex: 80, padding: `${dp(12)}px ${dp(24)}px`, borderRadius: 999, background: TV.glass, fontSize: dp(19) }}>{toastText}</div>
      ) : null}
    </div>
  )
}
