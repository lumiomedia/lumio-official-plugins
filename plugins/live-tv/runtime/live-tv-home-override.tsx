'use client'

import { useEffect, useMemo, useState, type ComponentType } from 'react'
import { useLang, type HomeOverrideProps } from '@/lib/plugin-sdk'
import { LiveTvGrid } from './live-tv-grid'
import { LiveTvLogoImage } from './live-tv-logo-image'
import { NowNextLaterRow } from './now-next-later-row'
import {
  channelKey,
  getLiveTvLists,
  getLiveTvLogoSrc,
  onLiveTvListsChanged,
  type LiveTvList,
  type M3uChannel,
} from './live-tv-data'
import { useHubText } from './hub-strings'
import { useChannelsPage } from './view-helpers'
import { useLiveTvModel } from './live-tv-model'
import { LIVE_TV_BROWSE_PAGE_ID, encodeChannelParams } from './live-tv-shell'
import { useTvSettings } from './tv/tv-settings-store'
import { buildTvPlayerProps } from './tv/tv-player-props'
import { addToFirstFree, getMultiviewState, setMultiviewState } from './tv/tv-multiview-store'
import type { LiveTvPlayerTvProps } from './tv/tv-player-types'

interface FocusedTarget {
  list: LiveTvList
  channel: M3uChannel
  index: number
  total: number
}

const PLACEHOLDER_NAME_RE = /^[\s=\-_*•·]+|=+/

/**
 * Hjältekortet visar EN kanal och ett löpnummer — och laddade ändå varje
 * listas hela innehåll för att kunna räkna dem.
 *
 * Antalet står i indexsvarets `total`, och kanalen som ska ritas ligger i ett
 * fönster på femtio runt det aktuella numret. Prev/next kliver inom fönstret;
 * kliver man ut ur det hämtas nästa. En 17 000-kanalspanel kostar alltså femtio
 * poster, inte sjutton tusen.
 */
const HERO_WINDOW = 50

function isPlayableChannel(channel: M3uChannel): boolean {
  if (!channel.url) return false
  const trimmedName = channel.name.trim()
  if (!trimmedName) return false
  // Common iptv-list separators look like "=== Sweden [SE] ===" / "── Sweden ──"
  // and have no real stream. Filter them out so the hero focuses something useful.
  if (PLACEHOLDER_NAME_RE.test(trimmedName) && !channel.tvgId) return false
  return true
}

export function LiveTvHomeOverride({ onNavigate }: HomeOverrideProps) {
  const { t } = useLang()
  const { locale } = useHubText()
  const model = useLiveTvModel()
  const tvSettings = useTvSettings()
  /**
   * Startsidan är en HEMVY, inte bläddringssidan — guiden, multivyn och
   * kanalsidan bor i `live-tv-browse`. Både rutnätet och spelarkromet
   * navigerar dit i stället för att öppna egna överlagringar.
   */
  const goBrowse = (view: string, params: Record<string, string> = {}) => {
    onNavigate?.({ pageId: LIVE_TV_BROWSE_PAGE_ID, params: { view, ...params } })
  }
  const [lists, setLists] = useState<LiveTvList[]>([])
  /** Löpnummer i den sammanslagna kanalföljden över alla listor. */
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
  const [LiveTvPlayerComponent, setLiveTvPlayerComponent] = useState<
    ComponentType<{
      channel: M3uChannel
      onClose: () => void
      listId?: string | null
      epgUrls?: string[]
      tv?: LiveTvPlayerTvProps
    }> | null
  >(null)
  const [activeChannel, setActiveChannel] = useState<M3uChannel | null>(null)
  const [activeList, setActiveList] = useState<LiveTvList | null>(null)

  useEffect(() => {
    const sync = () => setLists(getLiveTvLists())
    sync()
    return onLiveTvListsChanged(sync)
  }, [])

  /**
   * Kanalerna kommer ur appens index, per lista och SIDVIS (lagring v2).
   *
   * Här stod `preferredChannels(lists)`, som läste listornas INBÄDDADE
   * `channels`. Migreringen tömmer det fältet, så hjältekortet hade blivit
   * osynligt på varje enhet som kört v2 — vyn såg ut att sakna kanaler fast
   * indexet var fullt. Kopplingen kanal → lista är exakt: varje kanal kommer
   * ur uppslaget för SIN listas källa, inte ur en gissning i modellen.
   */
  const { byListId: firstPages, totalByListId } = useChannelsPage(lists, HERO_WINDOW, 0)

  /** Listornas plats i den sammanslagna följden: [startnummer, antal]. */
  const spans = useMemo(() => {
    let start = 0
    return lists.map((list) => {
      const count = totalByListId[list.id] ?? 0
      const span = { list, start, count }
      start += count
      return span
    })
  }, [lists, totalByListId])
  const total = spans.reduce((sum, span) => sum + span.count, 0)

  /**
   * Förvalet är första kanalen MED tvg-id (den har tablå att visa) bland de
   * första sidorna — resten av utbudet laddas inte för att leta efter en
   * bättre kandidat.
   */
  const defaultIndex = useMemo(() => {
    for (const span of spans) {
      const page = firstPages[span.list.id] ?? []
      const hit = page.findIndex((channel) => isPlayableChannel(channel) && Boolean(channel.tvgId))
      if (hit >= 0) return span.start + hit
    }
    return 0
  }, [spans, firstPages])
  const index = focusedIndex ?? defaultIndex

  /** Vilken lista och vilket fönster numret hamnar i. */
  const placement = useMemo(() => {
    const span = spans.find((entry) => index >= entry.start && index < entry.start + entry.count) ?? spans[0] ?? null
    if (!span || span.count === 0) return null
    const offsetInList = index - span.start
    return { span, offsetInList, windowStart: Math.floor(offsetInList / HERO_WINDOW) * HERO_WINDOW }
  }, [spans, index])

  const windowLists = useMemo(() => (placement ? [placement.span.list] : []), [placement])
  const { byListId: windowPages } = useChannelsPage(windowLists, HERO_WINDOW, placement?.windowStart ?? 0)

  const focused: FocusedTarget | null = useMemo(() => {
    if (!placement || total === 0) return null
    const listId = placement.span.list.id
    const page = (placement.windowStart === 0 ? firstPages[listId] : windowPages[listId]) ?? windowPages[listId] ?? []
    const channel = page[placement.offsetInList - placement.windowStart]
    if (!channel) return null
    return { list: placement.span.list, channel, index, total }
  }, [placement, firstPages, windowPages, index, total])

  useEffect(() => {
    if (!activeChannel || LiveTvPlayerComponent) return
    let cancelled = false
    void import('./live-tv-player')
      .then((mod) => {
        if (!cancelled) setLiveTvPlayerComponent(() => mod.LiveTvPlayer)
      })
      .catch(() => {
        if (!cancelled) setActiveChannel(null)
      })
    return () => {
      cancelled = true
    }
  }, [activeChannel, LiveTvPlayerComponent])

  function moveFocus(delta: number) {
    if (total === 0) return
    setFocusedIndex(((index + delta) % total + total) % total)
  }

  function closePlayer() {
    setActiveChannel(null)
    setActiveList(null)
  }

  function playFocused() {
    if (!focused) return
    setActiveList(focused.list)
    setActiveChannel(focused.channel)
  }

  const epgUrls = useMemo(() => {
    if (!focused) return [] as string[]
    return [focused.list.autoEpgDisabled ? null : focused.list.urlTvg, ...focused.list.epgUrls].filter(
      (url): url is string => Boolean(url),
    )
  }, [focused])

  const activeEpgUrls = useMemo(() => {
    if (!activeList) return [] as string[]
    return [activeList.autoEpgDisabled ? null : activeList.urlTvg, ...activeList.epgUrls].filter(
      (url): url is string => Boolean(url),
    )
  }, [activeList])

  return (
    <div className="space-y-6">
      {focused ? (
        <div className="space-y-3 rounded-3xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex flex-wrap items-center gap-3">
            {(() => {
              const primarySrc = getLiveTvLogoSrc(focused.channel.logo)
              const fallbackSrc = getLiveTvLogoSrc(focused.channel.logoFallback)
              const logoSrc = primarySrc ?? fallbackSrc
              return logoSrc ? (
                <LiveTvLogoImage
                  src={logoSrc}
                  fallbackSrc={primarySrc ? fallbackSrc : undefined}
                  alt=""
                  className="h-10 w-10 rounded object-contain bg-slate-800/90 p-1"
                />
              ) : null
            })()}
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-white">{focused.channel.name}</p>
              {focused.channel.group ? (
                <p className="truncate text-xs text-slate-400">{focused.channel.group}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.22em] text-white/40">
                {focused.index + 1} / {focused.total}
              </span>
              <button
                type="button"
                onClick={() => moveFocus(-1)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-transparent bg-[#fcfcff14] backdrop-blur-md text-white transition hover:bg-[#fcfcff22]"
                aria-label={t('liveTvPreviousChannel')}
                title={t('liveTvPreviousChannel')}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => moveFocus(1)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-transparent bg-[#fcfcff14] backdrop-blur-md text-white transition hover:bg-[#fcfcff22]"
                aria-label={t('liveTvNextChannel')}
                title={t('liveTvNextChannel')}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={playFocused}
                className="flex h-9 items-center gap-2 rounded-full border border-emerald-300/60 bg-emerald-400/15 px-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-100 transition hover:border-emerald-200/80 hover:bg-emerald-400/25"
              >
                <svg className="h-3.5 w-3.5 translate-x-[1px]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                {t('play')}
              </button>
            </div>
          </div>
          <NowNextLaterRow
            channel={focused.channel}
            listId={focused.list.id}
            urls={epgUrls}
          />
        </div>
      ) : null}
      <LiveTvGrid onNavigate={onNavigate} />
      {activeChannel && LiveTvPlayerComponent ? (
        <LiveTvPlayerComponent
          channel={activeChannel}
          onClose={closePlayer}
          listId={activeList?.id ?? null}
          epgUrls={activeEpgUrls}
          // Spelaren ritar krom bara när `tv` följer med. Hjältekortets
          // uppspelning saknade det och fick den gamla skrivbordsgrenen —
          // raderad med de ersatta vyerna.
          tv={buildTvPlayerProps({
            model,
            settings: tvSettings,
            channel: activeChannel,
            locale,
            gateOpen: false,
            // Startsidan lever utanför TV-scenen — ingen telefonmätning finns.
            phone: false,
            onOpenGuide: () => { closePlayer(); goBrowse('guide') },
            onOpenMultiview: () => { closePlayer(); goBrowse('multi') },
            onOpenChannelDetails: () => { const channel = activeChannel; closePlayer(); goBrowse('channel', encodeChannelParams(channel)) },
            onAddToMultiview: (channel) => {
              setMultiviewState(addToFirstFree(getMultiviewState(), channelKey(channel)))
              closePlayer()
              goBrowse('multi')
            },
            onSwitchChannel: (channel) => setActiveChannel(channel),
          })}
        />
      ) : null}
    </div>
  )
}
