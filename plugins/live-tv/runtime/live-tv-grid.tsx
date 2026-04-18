'use client'

import { useEffect, useRef, useState, type ComponentType } from 'react'
import {
  closeMpvPlayer,
  isTauriEnv,
  useLang,
} from '@/lib/plugin-sdk'
import { LiveTvLogoImage } from './live-tv-logo-image'
import { ResultsPagination } from './results-pagination'
import {
  addChannelToLiveTvList,
  clearLiveTvMemoryCache,
  clearStoredLiveTvChannels,
  createLiveTvList,
  deleteLiveTvList,
  getLiveTvLists,
  getLiveTvLogoSrc,
  getLiveTvMemoryCache,
  getLiveTvUrlsKey,
  getM3uUrls,
  isChannelInLiveTvList,
  isLiveTvLogoLoaded,
  isPinnedLiveTvChannel,
  onLiveTvListsChanged,
  onM3uUrlsChanged,
  preloadLiveTvLogo,
  readStoredLiveTvChannels,
  removeChannelFromLiveTvList,
  setLiveTvMemoryCache,
  sortChannelsWithPins,
  storeLiveTvChannels,
  togglePinnedLiveTvChannel,
  type LiveTvList,
} from './live-tv-data'

interface M3uChannel {
  name: string
  logo: string | null
  group: string
  url: string
}

const rememberedChannelLogoSrcs = new Map<string, string>()
const CHANNELS_PER_PAGE = 28
const neutralPillClass = 'rounded-full border border-white/[0.08] bg-white/[0.04] text-slate-300 transition hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white'
const activePillClass = 'border-accent-400/50 bg-accent-400/10 text-accent-300'

function logLiveTvStage(message: string, details?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  const payload = {
    message: `[live-tv] ${message}`,
    stack: details ? JSON.stringify(details, null, 2) : undefined,
    href: window.location.href,
    userAgent: navigator.userAgent,
    ts: new Date().toISOString(),
  }
  void fetch('/api/client-crash', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {})
}

function sanitizeChannels(channels: unknown[]): M3uChannel[] {
  return channels
    .filter((channel): channel is Record<string, unknown> => Boolean(channel) && typeof channel === 'object')
    .map((channel) => ({
      name: String(channel.name ?? 'Unknown').trim() || 'Unknown',
      logo: typeof channel.logo === 'string' && channel.logo.trim().length > 0 ? channel.logo.trim() : null,
      group: String(channel.group ?? 'Other').trim() || 'Other',
      url: String(channel.url ?? '').trim(),
    }))
    .filter((channel) => channel.url.length > 0)
}

export function LiveTvGrid({ initialChannel = null }: { initialChannel?: M3uChannel | null }) {
  const MAX_TOTAL_CHANNELS = 2000
  const { t } = useLang()
  const [channels, setChannels] = useState<M3uChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [urls, setUrls] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [activeChannel, setActiveChannel] = useState<M3uChannel | null>(null)
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false)
  const [pinVersion, setPinVersion] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [refreshing, setRefreshing] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const [loadedLogoUrls, setLoadedLogoUrls] = useState<Record<string, string>>({})
  const [lists, setLists] = useState<LiveTvList[]>([])
  const [activeListId, setActiveListId] = useState<string | null>(null)
  const [listPickerChannelKey, setListPickerChannelKey] = useState<string | null>(null)
  const [createListOpen, setCreateListOpen] = useState(false)
  const [createListName, setCreateListName] = useState('')
  const [pendingChannelForNewList, setPendingChannelForNewList] = useState<M3uChannel | null>(null)
  const [LiveTvPlayerComponent, setLiveTvPlayerComponent] = useState<ComponentType<{
    channel: M3uChannel
    onClose: () => void
  }> | null>(null)
  const urlsKey = getLiveTvUrlsKey(urls)
  const m3uErrorText = t('m3uError')
  const groupDropdownRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const syncUrls = () => {
      try {
        setUrls(getM3uUrls())
      } catch {
        setUrls([])
      }
    }

    syncUrls()
    return onM3uUrlsChanged(syncUrls)
  }, [])

  useEffect(() => {
    const syncLists = () => {
      const nextLists = getLiveTvLists()
      setLists(nextLists)
      setActiveListId((current) => {
        if (current === null) return null
        if (current && nextLists.some((list) => list.id === current)) return current
        return null
      })
    }

    syncLists()
    return onLiveTvListsChanged(syncLists)
  }, [])

  useEffect(() => {
    if (!groupDropdownOpen) return
    function handleClickOutside(event: MouseEvent) {
      if (groupDropdownRef.current && !groupDropdownRef.current.contains(event.target as Node)) {
        setGroupDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [groupDropdownOpen, groupDropdownRef])

  useEffect(() => {
    if (!isTauriEnv) return
    void closeMpvPlayer().catch(() => {})
    document.documentElement.classList.remove('mpv-playing')
    return () => {
      document.documentElement.classList.remove('mpv-playing')
      void closeMpvPlayer().catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (!isTauriEnv || activeChannel) return
    document.documentElement.classList.remove('mpv-playing')
    void closeMpvPlayer().catch(() => {})
  }, [activeChannel])

  useEffect(() => {
    if (!initialChannel) return
    setActiveChannel(initialChannel)
  }, [initialChannel])

  function handleRefreshChannels() {
    if (!urlsKey) return
    clearLiveTvMemoryCache(urlsKey)
    clearStoredLiveTvChannels(urlsKey)
    setError(null)
    setRefreshing(true)
    setReloadToken((value) => value + 1)
  }

  function handleCreateList(name: string): LiveTvList | null {
    if (!name.trim()) return null
    const created = createLiveTvList(name)
    setActiveListId(created.id)
    return created
  }

  function handleOpenCreateListModal() {
    setCreateListName('')
    setPendingChannelForNewList(null)
    setCreateListOpen(true)
    setListPickerChannelKey(null)
  }

  function handleSubmitCreateList() {
    const created = handleCreateList(createListName)
    if (!created) return
    if (pendingChannelForNewList) {
      addChannelToLiveTvList(created.id, pendingChannelForNewList)
    }
    setCreateListOpen(false)
    setCreateListName('')
    setPendingChannelForNewList(null)
  }

  function handleToggleChannelInActiveList(channel: M3uChannel) {
    if (!activeListId) return
    if (isChannelInLiveTvList(activeListId, channel)) {
      removeChannelFromLiveTvList(activeListId, channel)
      return
    }
    addChannelToLiveTvList(activeListId, channel)
  }

  function handleOpenListPicker(channel: M3uChannel) {
    const key = `${channel.name}::${channel.url}`
    if (lists.length === 0) {
      setCreateListName('')
      setPendingChannelForNewList(channel)
      setCreateListOpen(true)
      return
    }
    setListPickerChannelKey((current) => current === key ? null : key)
  }

  useEffect(() => {
    let cancelled = false
    logLiveTvStage('loaded m3u urls', { count: urls.length })
    if (urls.length === 0) {
      setChannels([])
      setLoading(false)
      logLiveTvStage('no m3u urls configured')
      return
    }

    const storedChannels = readStoredLiveTvChannels(urlsKey)
    const cached = getLiveTvMemoryCache(urlsKey)
    const initialChannels = storedChannels.length > 0 ? storedChannels : (cached?.channels ?? [])

    if (initialChannels.length > 0) {
      setChannels(initialChannels)
      setError(null)
      setLoading(false)
      logLiveTvStage('channels restored from persistent cache', { total: initialChannels.length })
    }

    if (cached) {
      setChannels(cached.channels)
      setError(null)
      setLoading(false)
      setRefreshing(false)
      logLiveTvStage('channels restored from memory cache', { total: cached.channels.length })
      return
    }

    if (initialChannels.length > 0 && reloadToken === 0) {
      setRefreshing(false)
      return
    }

    setLoading(initialChannels.length === 0)
    setRefreshing(initialChannels.length > 0)
    void (async () => {
      try {
        const nextChannels: M3uChannel[] = []

        for (const url of urls) {
          if (cancelled || nextChannels.length >= MAX_TOTAL_CHANNELS) break
          logLiveTvStage('fetching playlist', { url })

          const result = await fetch('/api/m3u', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
          })
            .then((r) => r.json())
            .then((data: { channels?: unknown[] }) => sanitizeChannels(data.channels ?? []))
            .catch(() => [] as M3uChannel[])

          if (cancelled) break
          nextChannels.push(...result)
          logLiveTvStage('playlist fetched', { url, fetched: result.length, accumulated: nextChannels.length })

          // Keep the UI and WebView responsive by yielding between large playlist loads.
          await new Promise((resolve) => setTimeout(resolve, 0))
        }

        if (!cancelled) {
          const committedChannels = nextChannels.slice(0, MAX_TOTAL_CHANNELS)
          setLiveTvMemoryCache(urlsKey, committedChannels)
          storeLiveTvChannels(urlsKey, committedChannels)
          setChannels(committedChannels)
          setError(null)
          logLiveTvStage('channels committed to state', {
            total: nextChannels.length,
            committed: Math.min(nextChannels.length, MAX_TOTAL_CHANNELS),
          })
        }
      } catch {
        if (!cancelled) {
          const fallbackChannels = initialChannels
          if (fallbackChannels.length > 0) {
            setChannels(fallbackChannels)
            setError(null)
            logLiveTvStage('using cached channels after fetch failure', { total: fallbackChannels.length })
          } else {
            setError(t('m3uError'))
          }
        }
        logLiveTvStage('live tv load failed')
      } finally {
        if (!cancelled) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [urlsKey, m3uErrorText, reloadToken])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, activeGroup, activeListId])

  const activeList = activeListId
    ? (lists.find((list) => list.id === activeListId) ?? null)
    : null

  const visibleChannels = activeList?.channels ?? channels

  const categories = Array.from(
    new Set(
      visibleChannels.flatMap((c) =>
        String(c.group ?? '')
          .split(';')
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    ),
  ).sort()

  const filtered = sortChannelsWithPins(
    visibleChannels.filter((c) => {
      const name = String(c.name ?? '')
      const groups = String(c.group ?? '')
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
      const matchSearch = !search || name.toLowerCase().includes(search.toLowerCase())
      const matchGroup = !activeGroup || groups.includes(activeGroup)
      return matchSearch && matchGroup
    }),
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / CHANNELS_PER_PAGE))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const pageStart = (safeCurrentPage - 1) * CHANNELS_PER_PAGE
  const pagedChannels = filtered.slice(pageStart, pageStart + CHANNELS_PER_PAGE)
  const visibleChannelKey = pagedChannels.map((channel) => channel.url).join('|')

  useEffect(() => {
    if (currentPage !== safeCurrentPage) setCurrentPage(safeCurrentPage)
  }, [currentPage, safeCurrentPage])

  useEffect(() => {
    let cancelled = false
    const logoEntries = pagedChannels
      .map((channel) => ({ key: channel.url, src: getLiveTvLogoSrc(channel.logo) }))
      .filter((entry): entry is { key: string; src: string } => Boolean(entry.src))

    if (logoEntries.length === 0) {
      setLoadedLogoUrls({})
      return
    }

    const initialLoaded = Object.fromEntries(
      logoEntries
        .filter((entry) => rememberedChannelLogoSrcs.get(entry.key) === entry.src || isLiveTvLogoLoaded(entry.src))
        .map((entry) => [entry.key, entry.src]),
    ) as Record<string, string>

    Object.entries(initialLoaded).forEach(([key, src]) => rememberedChannelLogoSrcs.set(key, src))
    setLoadedLogoUrls((current) => ({ ...current, ...initialLoaded }))

    void (async () => {
      const pendingEntries = logoEntries.filter((entry) => !initialLoaded[entry.key])
      const batchSize = isTauriEnv ? 3 : 8

      for (let i = 0; i < pendingEntries.length; i += batchSize) {
        if (cancelled) break
        const batch = pendingEntries.slice(i, i + batchSize)
        const results = await Promise.all(
          batch.map(async (entry) => ({
            key: entry.key,
            src: entry.src,
            ok: await preloadLiveTvLogo(entry.src),
          })),
        )

        if (cancelled) break

        const batchLoaded = Object.fromEntries(
          results.filter((result) => result.ok).map((result) => [result.key, result.src]),
        ) as Record<string, string>

        Object.entries(batchLoaded).forEach(([key, src]) => rememberedChannelLogoSrcs.set(key, src))
        if (Object.keys(batchLoaded).length > 0) {
          setLoadedLogoUrls((current) => ({ ...current, ...batchLoaded }))
        }

        if (isTauriEnv && i + batchSize < pendingEntries.length) {
          await new Promise((resolve) => setTimeout(resolve, 40))
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [visibleChannelKey])

  useEffect(() => {
    if (LiveTvPlayerComponent || !isTauriEnv) return
    let cancelled = false
    void import('./live-tv-player')
      .then((mod) => {
        if (!cancelled) setLiveTvPlayerComponent(() => mod.LiveTvPlayer)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [LiveTvPlayerComponent])

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

  useEffect(() => {
    if (!loading) {
      logLiveTvStage('render state ready', {
        channels: channels.length,
        filtered: filtered.length,
        visible: pagedChannels.length,
        hasError: Boolean(error),
      })
    }
  }, [loading, channels.length, filtered.length, pagedChannels.length, error])

  if (urls.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <svg className="h-12 w-12 text-slate-600" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z" />
        </svg>
        <p className="text-slate-400">{t('m3uNoUrl')}</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-slate-800" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: CHANNELS_PER_PAGE }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-800" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return <p className="py-8 text-center text-red-400">{error}</p>
  }

  return (
    <>
      <div className="space-y-4">
        {/* Search + group filter */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('m3uSearch')}
            className="h-9 w-56 rounded-full border border-white/[0.14] bg-white/[0.04] px-4 text-[12px] text-white placeholder:text-white/70 outline-none transition hover:border-white/[0.18] hover:bg-white/[0.05] focus:border-white/[0.18] focus:bg-white/[0.05]"
          />
          <div ref={groupDropdownRef} className="relative w-56">
            <button
              type="button"
              onClick={() => {
                if (categories.length === 0) return
                setGroupDropdownOpen((open) => !open)
              }}
              disabled={categories.length === 0}
              className={`flex h-9 w-full items-center justify-between rounded-full border px-4 text-[0.6rem] font-normal uppercase tracking-[0.2em] transition-all whitespace-nowrap ${
                groupDropdownOpen ? activePillClass : neutralPillClass
              } disabled:cursor-default disabled:opacity-60`}
            >
              <span className="truncate text-left">
                {activeGroup ?? t('allCategories')}
              </span>
              <svg
                className={`h-3 w-3 flex-none transition-transform ${groupDropdownOpen ? 'rotate-180' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {groupDropdownOpen ? (
              <div className="absolute left-0 top-full z-50 mt-2 min-w-full overflow-hidden rounded-2xl border border-white/10 bg-[#080c1a] py-2 shadow-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setActiveGroup(null)
                    setGroupDropdownOpen(false)
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-all hover:bg-white/6 ${
                    activeGroup === null
                      ? 'text-accent-300'
                      : 'text-slate-200'
                  }`}
                >
                  <span>{t('allCategories')}</span>
                  {activeGroup === null ? (
                    <svg className="h-3.5 w-3.5 flex-shrink-0 text-accent-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                </button>
                {categories.map((cat) => {
                  const isActive = activeGroup === cat
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setActiveGroup(cat)
                        setGroupDropdownOpen(false)
                      }}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-all hover:bg-white/6 ${
                        isActive
                          ? 'text-accent-300'
                          : 'text-slate-200'
                      }`}
                    >
                      <span>{cat}</span>
                      {isActive ? (
                        <svg className="h-3.5 w-3.5 flex-shrink-0 text-accent-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleOpenCreateListModal}
            className={`flex h-9 items-center px-4 text-[0.6rem] font-normal uppercase tracking-[0.2em] ${neutralPillClass}`}
          >
            {t('liveTvCreateList')}
          </button>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-white">{filtered.length} / {visibleChannels.length} {t('m3uChannels')}</span>
            {refreshing && visibleChannels.length > 0 ? <span className="text-xs text-slate-500">Uppdaterar...</span> : null}
            <button
              type="button"
              onClick={handleRefreshChannels}
              disabled={refreshing || urls.length === 0}
              className={`inline-flex h-9 w-9 items-center justify-center ${neutralPillClass} disabled:cursor-default disabled:opacity-50`}
              aria-label={t('refreshStatus')}
              title={t('refreshStatus')}
            >
              <svg className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                <path d="M21 3v6h-6" />
              </svg>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {lists.length === 0 ? (
            <p className="text-sm text-slate-500">{t('liveTvNoLists')}</p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveListId(null)}
                className={`h-9 rounded-full border px-4 text-[0.6rem] font-normal uppercase tracking-[0.2em] whitespace-nowrap transition ${
                  activeListId === null
                    ? activePillClass
                    : neutralPillClass
                }`}
              >
                {t('all')}
              </button>
              {lists.map((list) => (
                <div key={list.id} className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveListId(list.id)}
                    className={`inline-flex h-9 items-center gap-2 rounded-full border px-4 pr-10 text-[0.6rem] font-normal uppercase tracking-[0.2em] whitespace-nowrap transition ${
                      activeListId === list.id
                        ? activePillClass
                        : neutralPillClass
                    }`}
                  >
                    <span>{list.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] tracking-[0.08em] ${
                      activeListId === list.id
                        ? 'bg-accent-400/15 text-accent-200'
                        : 'bg-white/5 text-slate-400'
                    }`}>
                      {list.channels.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (activeListId === list.id) setActiveListId(null)
                      deleteLiveTvList(list.id)
                    }}
                    className="absolute right-1.5 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-slate-400 transition hover:border-accent-400/40 hover:bg-accent-400/10 hover:text-accent-300"
                    title={t('liveTvDeleteList')}
                  >
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Channel grid */}
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-slate-400">{t('m3uNoResults')}</p>
        ) : (
          <div className="space-y-4">
            <div className={`grid gap-4 ${isTauriEnv ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
              {pagedChannels.map((channel, i) => {
                const logoSrc = loadedLogoUrls[channel.url] ?? null
                const channelListKey = `${channel.name}::${channel.url}`
                const isListPickerOpen = listPickerChannelKey === channelListKey
                const isInAnyList = lists.some((list) => isChannelInLiveTvList(list.id, channel))
                return (
                  <div
                    key={`${channel.url}-${i}-${pinVersion}`}
                    className={`group relative flex min-h-[10.5rem] flex-col items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/95 p-4 ${isTauriEnv ? '' : 'transition hover:-translate-y-0.5 hover:border-accent-400/30 hover:bg-slate-800'}`}
                  >
                    <button
                      type="button"
                      title={isPinnedLiveTvChannel(channel) ? t('unpinChannel') : t('pinChannel')}
                      onClick={(event) => {
                        event.stopPropagation()
                        togglePinnedLiveTvChannel(channel)
                        setPinVersion((value) => value + 1)
                      }}
                    className={`absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border transition ${
                        isPinnedLiveTvChannel(channel)
                          ? 'border-amber-400/40 bg-amber-400/15 text-amber-300'
                          : 'border-white/10 bg-black/40 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={isPinnedLiveTvChannel(channel) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                        <path d="M12 17v5" strokeLinecap="round" />
                        <path d="M8 3h8l-1 6 3 3v2H6v-2l3-3-1-6Z" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      title={t('liveTvAddToList')}
                      onClick={(event) => {
                        event.stopPropagation()
                        handleOpenListPicker(channel)
                      }}
                      className={`absolute left-2 top-2 z-10 flex h-8 min-w-8 items-center justify-center rounded-full border px-1.5 transition ${
                        isInAnyList
                          ? 'border-accent-400/40 bg-accent-400/15 text-accent-300'
                          : 'border-white/10 bg-black/40 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14" />
                        <path d="M5 12h14" />
                      </svg>
                    </button>
                    {isListPickerOpen ? (
                      <div className="absolute left-2 top-11 z-20 min-w-44 rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-2xl backdrop-blur">
                        <div className="flex flex-col gap-1">
                          {lists.map((list) => {
                            const isInList = isChannelInLiveTvList(list.id, channel)
                            return (
                              <button
                                key={list.id}
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  if (isInList) removeChannelFromLiveTvList(list.id, channel)
                                  else addChannelToLiveTvList(list.id, channel)
                                  setListPickerChannelKey(null)
                                }}
                                className={`flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                                  isInList ? 'bg-accent-400/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                                }`}
                              >
                                <span className="truncate">{list.name}</span>
                                {isInList ? (
                                  <svg className="h-3.5 w-3.5 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="m20 6-11 11-5-5" />
                                  </svg>
                                ) : null}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setActiveChannel(channel)}
                      className="flex w-full flex-1 flex-col items-center gap-3"
                    >
                      <div className={`flex w-full items-center justify-center overflow-hidden rounded-xl bg-slate-800 ${isTauriEnv ? 'h-28' : 'h-28'}`}>
                        {logoSrc ? (
                          <LiveTvLogoImage
                            src={logoSrc}
                            alt={channel.name}
                            className="h-full w-full object-contain p-2"
                            onError={() => {}}
                          />
                        ) : null}
                        <svg className={`${isTauriEnv ? 'h-7 w-7' : 'h-6 w-6'} text-slate-600 ${logoSrc ? 'hidden' : ''}`} viewBox="0 0 24 24" fill="currentColor">
                          <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z" />
                        </svg>
                      </div>
                      <p className={`w-full text-center text-slate-300 ${isTauriEnv ? 'line-clamp-3 text-[14px] leading-5' : 'line-clamp-3 text-[13px] leading-5 group-hover:text-white'}`}>
                        {channel.name}
                      </p>
                      {isTauriEnv && channel.group ? (
                        <p className="w-full truncate text-center text-[11px] text-slate-500">{channel.group}</p>
                      ) : null}
                    </button>
                  </div>
                )
              })}
            </div>
            <ResultsPagination currentPage={safeCurrentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        )}
      </div>

      {activeChannel && LiveTvPlayerComponent && (
        <LiveTvPlayerComponent channel={activeChannel} onClose={() => setActiveChannel(null)} />
      )}

      {createListOpen ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-md"
          onClick={() => {
            setCreateListOpen(false)
            setCreateListName('')
            setPendingChannelForNewList(null)
          }}
        >
          <div
            className="w-full max-w-md rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 space-y-2">
              <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">{t('liveTvCreateList')}</p>
              <h3 className="text-2xl font-semibold text-white">{t('liveTvListName')}</h3>
              <p className="text-sm text-slate-400">Skapa en egen kanalrad för Live TV.</p>
            </div>
            <input
              type="text"
              value={createListName}
              onChange={(event) => setCreateListName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  handleSubmitCreateList()
                }
                if (event.key === 'Escape') {
                  setCreateListOpen(false)
                  setCreateListName('')
                  setPendingChannelForNewList(null)
                }
              }}
              placeholder={t('liveTvListName')}
              autoFocus
              className="w-full rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-accent-400/50 focus:bg-white/[0.06]"
            />
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setCreateListOpen(false)
                  setCreateListName('')
                  setPendingChannelForNewList(null)
                }}
                className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleSubmitCreateList}
                disabled={!createListName.trim()}
                className="rounded-full border border-accent-400/40 bg-accent-400/15 px-5 py-2.5 text-sm text-white transition hover:border-accent-400/60 hover:bg-accent-400/20 disabled:cursor-default disabled:opacity-50"
              >
                {t('liveTvCreateList')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
