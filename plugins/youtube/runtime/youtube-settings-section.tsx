'use client'

import { Input } from '@heroui/react'
import { useEffect, useState } from 'react'
import { resolveAuthCapabilityStatus } from '@/lib/auth-capabilities'
import { useLang } from '@/lib/i18n'
import { loadGoogleIdentityServices } from './youtube-auth'
import {
  clearYouTubeCache,
  getYouTubeSettings,
  onYouTubePluginChanged,
  setYouTubeSettings,
} from './youtube-storage'

const inputClassNames = {
  base: 'w-full',
  inputWrapper: [
    'bg-white/8 border border-white/10 !shadow-none rounded-[1.1rem]',
    'hover:bg-white/10 hover:!border-white/10',
    'group-data-[focus=true]:bg-white/10 group-data-[focus=true]:!border-white/10 group-data-[focus=true]:!shadow-none',
    'transition-all duration-200 min-h-12',
  ].join(' '),
  input: 'text-sm text-slate-50 placeholder:text-slate-500 !shadow-none outline-none',
}

const settingsActionButtonClass =
  'rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-300 transition hover:border-white/20 hover:text-white disabled:opacity-40'

const settingsPrimaryActionButtonClass =
  'rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-200 transition hover:border-white/20 hover:text-white disabled:opacity-40'

export function YouTubeSettingsSection() {
  const { lang, t } = useLang()
  const [clientId, setClientId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [sessionLabel, setSessionLabel] = useState('')
  const [sessionDetail, setSessionDetail] = useState('')
  const [busy, setBusy] = useState<'idle' | 'connecting' | 'disconnecting'>('idle')
  const [error, setError] = useState('')
  const [hideShorts, setHideShorts] = useState(false)
  const [hero, setHero] = useState(false)
  const [keepHero, setKeepHero] = useState(false)

  useEffect(() => {
    const sync = () => {
      const settings = getYouTubeSettings()
      setClientId(settings.clientId)
      setApiKey(settings.apiKey)
      setHideShorts(settings.hideShorts)
      setHero(settings.hero)
      setKeepHero(settings.keepHero)
      void resolveAuthCapabilityStatus('youtube-auth').then((status) => {
        if (!status) {
          setSessionLabel(t('pluginYoutubeNotConnected'))
          setSessionDetail('')
          return
        }
        if (status.state === 'connected' && status.accountLabel) {
          setSessionLabel(`${t('connectedAs')} ${status.accountLabel}`)
        } else if (status.state === 'expired') {
          setSessionLabel(t('pluginYoutubeNotConnected'))
        } else {
          setSessionLabel(t('pluginYoutubeNotConnected'))
        }
        setSessionDetail(status.detail ? (typeof status.detail === 'string' ? status.detail : status.detail[lang] ?? status.detail.en ?? status.detail.sv ?? '') : '')
      }).catch(() => {
        setSessionLabel(t('pluginYoutubeNotConnected'))
        setSessionDetail('')
      })
    }
    sync()
    const offPlugin = onYouTubePluginChanged(sync)
    return () => {
      offPlugin()
    }
  }, [])

  useEffect(() => {
    if (!clientId.trim()) return
    void loadGoogleIdentityServices().catch(() => {})
  }, [clientId])

  function persist(next: {
    clientId?: string
    apiKey?: string
    hideShorts?: boolean
    hero?: boolean
    keepHero?: boolean
  }) {
    const current = getYouTubeSettings()
    setYouTubeSettings({
      clientId: next.clientId ?? current.clientId,
      apiKey: next.apiKey ?? current.apiKey,
      hideShorts: next.hideShorts ?? current.hideShorts,
      hero: next.hero ?? current.hero,
      keepHero: next.keepHero ?? current.keepHero,
    })
  }

  async function handleConnect() {
    setBusy('connecting')
    setError('')
    persist({ clientId, apiKey, hideShorts, hero, keepHero })
    try {
      const providerStatus = await resolveAuthCapabilityStatus('youtube-auth')
      await providerStatus?.provider.connect?.()
      const nextStatus = await resolveAuthCapabilityStatus('youtube-auth')
      setSessionLabel(
        nextStatus?.state === 'connected' && nextStatus.accountLabel
          ? `${t('connectedAs')} ${nextStatus.accountLabel}`
          : t('pluginYoutubeNotConnected'),
      )
      setSessionDetail(nextStatus?.detail ? (typeof nextStatus.detail === 'string' ? nextStatus.detail : nextStatus.detail[lang] ?? nextStatus.detail.en ?? nextStatus.detail.sv ?? '') : '')
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : t('pluginYoutubeConnectError'))
    } finally {
      setBusy('idle')
    }
  }

  async function handleDisconnect() {
    setBusy('disconnecting')
    setError('')
    try {
      const providerStatus = await resolveAuthCapabilityStatus('youtube-auth')
      await providerStatus?.provider.disconnect?.()
      setSessionLabel(t('pluginYoutubeNotConnected'))
      setSessionDetail('')
    } catch (disconnectError) {
      setError(disconnectError instanceof Error ? disconnectError.message : t('pluginYoutubeDisconnectError'))
    } finally {
      setBusy('idle')
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{t('pluginYoutubeConnection')}</p>
        <p className="mt-2 text-sm text-slate-300">{sessionLabel}</p>
        {sessionDetail ? (
          <p className="mt-2 text-xs text-amber-300">{sessionDetail}</p>
        ) : null}
        <p className="mt-2 text-xs text-slate-500">
          {t('pluginYoutubeConnectionNote')}
        </p>
      </div>
      <div className="space-y-1.5">
        <label className="block text-xs text-slate-400">{t('pluginYoutubeClientId')}</label>
        <Input
          type="text"
          value={clientId}
          onValueChange={(value) => {
            setClientId(value)
            persist({ clientId: value, apiKey, hideShorts, hero, keepHero })
          }}
          placeholder="1234567890-xxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com"
          radius="lg"
          classNames={inputClassNames}
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs text-slate-400">{t('pluginYoutubeApiKey')}</label>
        <Input
          type="password"
          value={apiKey}
          onValueChange={(value) => {
            setApiKey(value)
            persist({ clientId, apiKey: value, hideShorts, hero, keepHero })
          }}
          placeholder="AIza..."
          radius="lg"
          classNames={inputClassNames}
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{t('pluginYoutubeOwnAppTitle')}</p>
        <ol className="mt-3 space-y-2 text-sm text-slate-300">
          <li>{t('pluginYoutubeOwnAppStep1')}</li>
          <li>{t('pluginYoutubeOwnAppStep2')}</li>
          <li>{t('pluginYoutubeOwnAppStep3')}</li>
          <li>{t('pluginYoutubeOwnAppStep4')}</li>
          <li>{t('pluginYoutubeOwnAppStep5')}</li>
          <li>{t('pluginYoutubeOwnAppStep6')}</li>
        </ol>
        <p className="mt-3 text-xs text-slate-500">
          {t('pluginYoutubeOwnAppNote')}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{t('pluginYoutubeVideoOptions')}</p>
        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={hero}
              onChange={(event) => {
                const next = event.target.checked
                setHero(next)
                persist({ clientId, apiKey, hideShorts, hero: next, keepHero })
              }}
              className="h-4 w-4 accent-amber-400"
            />
            {t('pluginYoutubeHero')}
          </label>
          <p className="text-xs text-slate-500">
            {t('pluginYoutubeHeroHelp')}
          </p>
          <label className="flex items-center gap-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={keepHero}
              onChange={(event) => {
                const next = event.target.checked
                setKeepHero(next)
                persist({ clientId, apiKey, hideShorts, hero, keepHero: next })
              }}
              className="h-4 w-4 accent-amber-400"
            />
            {t('pluginYoutubeKeepHero')}
          </label>
          <p className="text-xs text-slate-500">
            {t('pluginYoutubeKeepHeroHelp')}
          </p>
          <label className="flex items-center gap-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={hideShorts}
              onChange={(event) => {
                const next = event.target.checked
                setHideShorts(next)
                clearYouTubeCache()
                persist({ clientId, apiKey, hideShorts: next, hero, keepHero })
              }}
              className="h-4 w-4 accent-amber-400"
            />
            {t('pluginYoutubeHideShorts')}
          </label>
          <p className="text-xs text-slate-500">
            {t('pluginYoutubeHideShortsHelp')}
          </p>
        </div>
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleConnect}
          disabled={busy !== 'idle' || !clientId.trim()}
          className={settingsPrimaryActionButtonClass}
        >
          {busy === 'connecting' ? t('pluginYoutubeConnecting') : t('pluginYoutubeConnect')}
        </button>
        <button
          type="button"
          onClick={handleDisconnect}
          disabled={busy !== 'idle'}
          className={settingsActionButtonClass}
        >
          {busy === 'disconnecting' ? t('pluginYoutubeDisconnecting') : t('pluginYoutubeDisconnect')}
        </button>
        <button
          type="button"
          onClick={() => clearYouTubeCache()}
          className={settingsActionButtonClass}
        >
          {t('pluginYoutubeClearCache')}
        </button>
      </div>
    </div>
  )
}
