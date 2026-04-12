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
  getM3uDraftUrls,
  setM3uDraftUrls,
} from './live-tv-data'

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
      setHomeOverrideError('Det finns redan en egen startsida satt. Avmarkera den först innan du väljer en annan plugin.')
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
          Anvand som startsida
        </label>
        <p className="mt-2 text-xs text-slate-500">
          Ersatter vanliga Home-rader med Live TV-vyn men behaller hero och resten av startsidan.
        </p>
        {homeOverrideError ? <p className="mt-2 text-xs text-rose-300">{homeOverrideError}</p> : null}
      </div>
      <Textarea
        value={m3uText}
        onValueChange={setM3uText}
        placeholder={t('m3uUrlsPlaceholder')}
        minRows={6}
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
    </div>
  )
}
