'use client'

import { useEffect, useState } from 'react'
import {
  TraktDeviceCodePanel,
  clearPendingTraktSync,
  clearTraktAuth,
  fetchTraktProfile,
  getTraktAuth,
  getTraktLimitSummary,
  isAutoRemoveWatchedMoviesEnabled,
  setAutoRemoveWatchedMoviesEnabled,
  isAutoUnfollowFinishedSeriesEnabled,
  setAutoUnfollowFinishedSeriesEnabled,
  isTraktAccountLimitError,
  importTraktWatched,
  importTraktWatchlist,
  notifyAuthCapabilitiesChanged,
  onProfileChanged,
  onTraktAuthChanged,
  syncLocalDataToTrakt,
  useLang,
  useTraktDeviceLogin,
  type TraktAuthState,
} from '@/lib/plugin-sdk'

const settingsActionButtonClass =
  'rounded-full border border-white/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-300 transition hover:border-white/20 hover:text-white disabled:opacity-50'
const settingsDangerActionButtonClass =
  'rounded-full border border-red-400/30 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-red-300 transition hover:border-red-400/40 hover:text-red-300 disabled:opacity-50'

export function TraktSettingsSection() {
  const { t } = useLang()
  const [traktAuth, setTraktAuthState] = useState<TraktAuthState | null>(() => getTraktAuth())
  const [traktImportState, setTraktImportState] = useState<'idle' | 'importing' | 'done' | 'error'>('idle')
  const [traktImportError, setTraktImportError] = useState('')
  const [limitSummary, setLimitSummary] = useState(() => getTraktLimitSummary())
  const [historyRefused, setHistoryRefused] = useState(false)
  const [autoRemoveMovies, setAutoRemoveMovies] = useState(() => isAutoRemoveWatchedMoviesEnabled())
  const [autoUnfollowSeries, setAutoUnfollowSeries] = useState(() => isAutoUnfollowFinishedSeriesEnabled())

  // The device flow itself (start, polling, retries, error texts, activation
  // link) is core — see lib/trakt-device-login. Onboarding drives the exact
  // same hook, so the two entry points can never drift apart.
  const login = useTraktDeviceLogin({
    onConnected: async () => {
      setTraktAuthState(getTraktAuth())
      notifyAuthCapabilitiesChanged()
      await fetchTraktProfile()
      setTraktAuthState(getTraktAuth())
      await importTraktWatched()
      await importTraktWatchlist()
    },
  })

  useEffect(() => {
    const sync = () => setTraktAuthState(getTraktAuth())
    sync()
    const stopAuth = onTraktAuthChanged(sync)
    const stopProfile = onProfileChanged(sync)
    return () => {
      stopAuth()
      stopProfile()
    }
  }, [])

  async function handleTraktImport() {
    setTraktImportError('')
    setHistoryRefused(false)
    setTraktImportState('importing')
    try {
      clearPendingTraktSync()
      // Watchlist first, and watched history second.
      //
      // The watchlist round-trip is small and idempotent; the watched import is
      // thousands of items against a rate-limited API. With the old order a
      // failing watched import meant the watchlist push never ran at all — the
      // button reported an error and the user's local-only shows stayed local,
      // with nothing saying which half had failed.
      //
      // The pull is additive (it no longer deletes local entries Trakt lacks —
      // see importTraktWatchlist), so the push that follows still has them to
      // send. In the old order the pull deleted them a moment before the push
      // looked for them, which made the push a guaranteed no-op.
      const watchlistResult = await importTraktWatchlist()
      await syncLocalDataToTrakt(watchlistResult.snapshot)
      await importTraktWatched()
      setTraktAuthState(getTraktAuth())
      setTraktImportState('done')
      window.setTimeout(() => {
        setTraktImportState((current) => (current === 'done' ? 'idle' : current))
      }, 2500)
    } catch (error) {
      setTraktAuthState(getTraktAuth())
      // Trakt refusing one of the two mirrors is not a failed sync: the data is
      // local, the calendar is fed from TMDB, and Lumio keeps working. So this
      // reports as done with an informational note rather than a red error that
      // makes a working app look broken. And WHICH
      // one it refused decides what the user is told. A 420 on /sync/history
      // (the 100K play cap) says nothing about the watchlist, which may have
      // gone up perfectly — reporting it as a generic failure is what made a
      // history-cap problem look like a broken watchlist push.
      if (isTraktAccountLimitError(error)) {
        setTraktImportState('done')
        if (error.operation === 'history') setHistoryRefused(true)
        return
      }
      setTraktImportState('error')
      // The message now carries "Trakt POST /sync/... failed (nnn)" from
      // src-tauri/src/trakt_client.rs, so the operation is always visible.
      setTraktImportError(error instanceof Error ? error.message : t('traktImportFailed'))
    } finally {
      setLimitSummary(getTraktLimitSummary())
    }
  }

  function handleTraktDisconnect() {
    login.cancel()
    clearTraktAuth()
    setTraktAuthState(null)
    setTraktImportState('idle')
    setTraktImportError('')
    // Repaints the status dot in Settings without waiting for a remount.
    notifyAuthCapabilitiesChanged()
  }

  const busy = login.phase === 'starting' || login.phase === 'waiting'

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
          {historyRefused ? (
            <div className="rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2">
              <p className="text-xs font-medium text-amber-200">{t('traktHistoryRefused')}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{t('traktHistoryRefusedBody')}</p>
            </div>
          ) : null}
          {limitSummary.hit ? (
            <div className="rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2">
              <p className="text-xs font-medium text-amber-200">{t('traktMirrorIncomplete')}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                {t('traktMirrorIncompleteBody').replace('{count}', String(limitSummary.total))}
              </p>
            </div>
          ) : null}
          <div className="space-y-2 border-t border-white/5 pt-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={autoRemoveMovies}
                onChange={(event) => {
                  setAutoRemoveWatchedMoviesEnabled(event.target.checked)
                  setAutoRemoveMovies(event.target.checked)
                }}
                className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-400"
              />
              <span>
                <span className="block text-xs font-medium text-white">{t('traktAutoRemoveMovies')}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{t('traktAutoRemoveMoviesHint')}</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={autoUnfollowSeries}
                onChange={(event) => {
                  setAutoUnfollowFinishedSeriesEnabled(event.target.checked)
                  setAutoUnfollowSeries(event.target.checked)
                }}
                className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-400"
              />
              <span>
                <span className="block text-xs font-medium text-white">{t('traktAutoUnfollowSeries')}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{t('traktAutoUnfollowSeriesHint')}</span>
              </span>
            </label>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            onClick={login.start}
            disabled={busy}
            className={settingsActionButtonClass}
          >
            {busy ? t('traktWaiting') : t('traktConnect')}
          </button>
          {login.userCode ? (
            <TraktDeviceCodePanel
              userCode={login.userCode}
              verificationUrl={login.verificationUrl}
              notice={login.notice}
              waiting={login.phase === 'waiting'}
            />
          ) : null}
        </div>
      )}
      {login.error ? <p className="mt-3 text-sm text-red-300">{login.error}</p> : null}
      {traktImportError ? <p className="mt-3 text-sm text-red-300">{traktImportError}</p> : null}
    </div>
  )
}
