'use client'

import { Textarea } from '@heroui/react'
import { useEffect, useState } from 'react'
import {
  disableHomeOverridePlugin,
  getHomeOverridePluginId,
  onHomeOverridePluginChanged,
  onProfileChanged,
  tryEnableHomeOverridePlugin,
  useLang,
} from '@/lib/plugin-sdk'
import {
  applyM3uUrls,
  clearLiveTvMemoryCache,
  clearStoredLiveTvChannels,
  getLiveTvLists,
  upsertLiveTvListFromFetch,
  getM3uDraftUrls,
  onLiveTvListsChanged,
  setM3uDraftUrls,
  updateLiveTvListEpg,
  type LiveTvList,
} from './live-tv-data'
import { EpgSourcesSection } from './epg-sources-section'

const textareaClassNames = {
  base: 'w-full',
  inputWrapper: [
    'bg-white/8 border border-white/10 !shadow-none rounded-[1.1rem]',
    'hover:bg-white/10 hover:!border-white/10',
    'group-data-[focus=true]:bg-white/10 group-data-[focus=true]:!border-white/10 group-data-[focus=true]:!shadow-none',
    'transition-all duration-200',
  ].join(' '),
  input: 'text-sm text-slate-50 placeholder:text-slate-500 resize-y',
}

const settingsActionButtonClass =
  'rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/30 hover:text-white disabled:opacity-50'
const HOME_OVERRIDE_PLUGIN_ID = 'com.lumio.live-tv'

export function LiveTvSettingsSection() {
  const { t } = useLang()
  const [m3uText, setM3uText] = useState('')
  const [m3uFetchState, setM3uFetchState] = useState<'idle' | 'fetching' | 'done' | 'error'>('idle')
  const [homeOverrideEnabled, setHomeOverrideEnabled] = useState(false)
  const [homeOverrideError, setHomeOverrideError] = useState('')
  const [lists, setLists] = useState<LiveTvList[]>([])

  useEffect(() => {
    const sync = () => setLists(getLiveTvLists())
    sync()
    return onLiveTvListsChanged(sync)
  }, [])

  useEffect(() => {
    const sync = () => setM3uText(getM3uDraftUrls().join('\n'))
    sync()
    return onProfileChanged(sync)
  }, [])

  useEffect(() => {
    const sync = () => {
      setHomeOverrideEnabled(getHomeOverridePluginId() === HOME_OVERRIDE_PLUGIN_ID)
      setHomeOverrideError('')
    }
    sync()
    return onHomeOverridePluginChanged(sync)
  }, [])

  async function handleFetchM3uList() {
    const urls = m3uText.split('\n').map((u) => u.trim()).filter(Boolean)
    setM3uFetchState('fetching')

    try {
      setM3uDraftUrls(urls)
      clearLiveTvMemoryCache()
      clearStoredLiveTvChannels()

      for (const url of urls) {
        const response = await fetch('/api/m3u', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        })
        if (!response.ok) throw new Error('m3u fetch failed')
        const parsed = (await response.json().catch(() => ({}))) as {
          channels?: unknown[]
          urlTvg?: string | null
        }
        const channels = Array.isArray(parsed.channels)
          ? (parsed.channels as Array<{ name?: unknown; logo?: unknown; group?: unknown; url?: unknown; tvgId?: unknown }>).map((c) => ({
              name: String(c.name ?? 'Unknown'),
              logo: typeof c.logo === 'string' ? c.logo : null,
              group: String(c.group ?? 'Other'),
              url: String(c.url ?? ''),
              tvgId: typeof c.tvgId === 'string' ? c.tvgId : null,
            }))
          : []
        upsertLiveTvListFromFetch(url, parsed.urlTvg ?? null, channels)
      }

      applyM3uUrls(urls)
      setM3uFetchState('done')
      window.setTimeout(() => setM3uFetchState('idle'), 1800)
    } catch {
      setM3uFetchState('error')
      window.setTimeout(() => setM3uFetchState('idle'), 2200)
    }
  }

  function handleHomeOverrideToggle(checked: boolean) {
    setHomeOverrideError('')
    if (!checked) {
      disableHomeOverridePlugin(HOME_OVERRIDE_PLUGIN_ID)
      return
    }
    const result = tryEnableHomeOverridePlugin(HOME_OVERRIDE_PLUGIN_ID)
    if (!result.ok) {
      setHomeOverrideError(t('homeOverrideAlreadySet'))
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <label className="flex items-center gap-3 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={homeOverrideEnabled}
            onChange={(event) => handleHomeOverrideToggle(event.target.checked)}
            className="h-4 w-4 accent-amber-400"
          />
          {t('homeOverrideUseAsHome')}
        </label>
        <p className="mt-2 text-xs text-slate-500">
          {t('liveTvHomeOverrideDesc')}
        </p>
        {homeOverrideError ? <p className="mt-2 text-xs text-rose-300">{homeOverrideError}</p> : null}
      </div>
      <Textarea
        value={m3uText}
        onValueChange={setM3uText}
        placeholder={t('m3uUrlsPlaceholder')}
        minRows={2}
        maxRows={6}
        radius="lg"
        classNames={textareaClassNames}
      />
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => void handleFetchM3uList()}
          disabled={m3uFetchState === 'fetching'}
          className={settingsActionButtonClass}
        >
          {m3uFetchState === 'fetching'
            ? t('m3uLoading')
            : m3uFetchState === 'done'
              ? t('m3uFetchListDone')
              : m3uFetchState === 'error'
                ? t('m3uFetchListError')
                : t('m3uFetchList')}
        </button>
      </div>
      {lists.length > 0 ? (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          {lists.map((list) => (
            <div key={list.id} className="space-y-2 border-b border-white/5 pb-4 last:border-b-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-2">
                <h4 className="text-sm font-semibold text-white">{list.name}</h4>
                <span className="text-[10px] uppercase tracking-wider text-slate-500">
                  {list.channels.length} {t('m3uChannels')}
                </span>
              </div>
              <EpgSourcesSection
                autoUrl={list.urlTvg}
                manualUrls={list.epgUrls}
                onChangeManual={(epgUrls) => updateLiveTvListEpg(list.id, { epgUrls })}
                listId={list.id}
                allUrls={[list.urlTvg, ...list.epgUrls].filter((url): url is string => Boolean(url))}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
