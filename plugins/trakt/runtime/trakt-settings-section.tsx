'use client'

import { useEffect, useRef, useState } from 'react'
import {
  clearPendingTraktSync,
  clearTraktAuth,
  fetchTraktProfile,
  getTraktAuth,
  importTraktWatched,
  importTraktWatchlist,
  onProfileChanged,
  onTraktAuthChanged,
  setTraktAuth,
  syncLocalDataToTrakt,
  type TraktAuthState,
  useLang,
} from '@/lib/plugin-sdk'

const settingsActionButtonClass =
  'rounded-full border border-white/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-300 transition hover:border-white/20 hover:text-white disabled:opacity-50'
const settingsDangerActionButtonClass =
  'rounded-full border border-red-400/30 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-red-300 transition hover:border-red-400/40 hover:text-red-300 disabled:opacity-50'

export function TraktSettingsSection() {
  const { t } = useLang()
  const [traktAuth, setTraktAuthState] = useState<TraktAuthState | null>(() => getTraktAuth())
  const [traktLoginState, setTraktLoginState] = useState<'idle' | 'starting' | 'polling' | 'error'>('idle')
  const [traktLoginError, setTraktLoginError] = useState('')
  const [traktImportState, setTraktImportState] = useState<'idle' | 'importing' | 'done' | 'error'>('idle')
  const [traktDeviceCode, setTraktDeviceCode] = useState('')
  const [traktVerificationUrl, setTraktVerificationUrl] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const sync = () => setTraktAuthState(getTraktAuth())
    sync()
    const stopAuth = onTraktAuthChanged(sync)
    const stopProfile = onProfileChanged(sync)
    return () => {
      stopAuth()
      stopProfile()
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  async function handleTraktConnect() {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }

    setTraktLoginError('')
    setTraktLoginState('starting')

    try {
      const response = await fetch('/api/trakt/device/start', { method: 'POST' })
      const payload = (await response.json()) as {
        device_code?: string
        user_code?: string
        verification_url?: string
        interval?: number
        error?: string
      }

      if (!response.ok || !payload.device_code || !payload.user_code || !payload.verification_url) {
        throw new Error(payload.error || t('traktStartLoginFailed'))
      }

      setTraktDeviceCode(payload.user_code)
      setTraktVerificationUrl(payload.verification_url)
      setTraktLoginState('polling')

      const intervalMs = Math.max(3, payload.interval ?? 5) * 1000
      pollRef.current = setInterval(() => {
        void (async () => {
          const pollResponse = await fetch('/api/trakt/device/poll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceCode: payload.device_code }),
          })

          if ([400, 404, 409, 429].includes(pollResponse.status)) return

          const pollPayload = (await pollResponse.json()) as {
            ok?: boolean
            auth?: TraktAuthState
            error?: string
          }

          if (!pollResponse.ok || !pollPayload.ok || !pollPayload.auth) {
            if (pollRef.current) {
              clearInterval(pollRef.current)
              pollRef.current = null
            }
            setTraktLoginError(pollPayload.error || t('traktLoginFailed'))
            setTraktLoginState('error')
            return
          }

          if (pollRef.current) {
            clearInterval(pollRef.current)
            pollRef.current = null
          }

          setTraktAuth(pollPayload.auth)
          setTraktAuthState(pollPayload.auth)
          setTraktLoginState('idle')
          setTraktDeviceCode('')
          setTraktVerificationUrl('')
          await fetchTraktProfile()
          await importTraktWatched()
          await importTraktWatchlist()
        })().catch((error) => {
          if (pollRef.current) {
            clearInterval(pollRef.current)
            pollRef.current = null
          }
          setTraktLoginError(error instanceof Error ? error.message : t('traktLoginFailed'))
          setTraktLoginState('error')
        })
      }, intervalMs)
    } catch (error) {
      setTraktLoginError(error instanceof Error ? error.message : t('traktStartLoginFailed'))
      setTraktLoginState('error')
    }
  }

  async function handleTraktImport() {
    setTraktLoginError('')
    setTraktImportState('importing')
    try {
      clearPendingTraktSync()
      await importTraktWatched()
      const watchlistResult = await importTraktWatchlist()
      await syncLocalDataToTrakt(watchlistResult.snapshot)
      setTraktAuthState(getTraktAuth())
      setTraktImportState('done')
      window.setTimeout(() => {
        setTraktImportState((current) => (current === 'done' ? 'idle' : current))
      }, 2500)
    } catch (error) {
      setTraktAuthState(getTraktAuth())
      setTraktImportState('error')
      setTraktLoginError(error instanceof Error ? error.message : t('traktImportFailed'))
    }
  }

  function handleTraktDisconnect() {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    clearTraktAuth()
    setTraktAuthState(null)
    setTraktLoginState('idle')
    setTraktLoginError('')
    setTraktImportState('idle')
    setTraktDeviceCode('')
    setTraktVerificationUrl('')
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      {traktAuth ? (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-white">
              {t('traktSignedInAs')} {traktAuth.name || traktAuth.username || t('traktSignedInFallback')}
            </p>
            <p className="text-xs text-slate-500">{t('traktSyncDesc')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void handleTraktImport()} disabled={traktImportState === 'importing'} className={settingsActionButtonClass}>
              {traktImportState === 'importing' ? t('traktImporting') : t('traktImportData')}
            </button>
            <button type="button" onClick={handleTraktDisconnect} className={settingsDangerActionButtonClass}>
              {t('traktDisconnect')}
            </button>
          </div>
          {traktImportState === 'done' ? <p className="text-xs text-emerald-300">{t('traktImportDone')}</p> : null}
        </div>
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => void handleTraktConnect()}
            disabled={traktLoginState === 'starting' || traktLoginState === 'polling'}
            className={settingsActionButtonClass}
          >
            {traktLoginState === 'starting' || traktLoginState === 'polling' ? t('traktWaiting') : t('traktConnect')}
          </button>
          {traktDeviceCode ? (
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-300">{t('traktOpenLinkAndCode')}</p>
              <p className="mt-1 text-sm text-white">{traktVerificationUrl}</p>
              <p className="mt-2 text-xl font-semibold tracking-[0.22em] text-emerald-200">{traktDeviceCode}</p>
            </div>
          ) : null}
        </div>
      )}
      {traktLoginError ? <p className="mt-3 text-sm text-red-300">{traktLoginError}</p> : null}
    </div>
  )
}
