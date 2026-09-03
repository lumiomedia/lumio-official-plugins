'use client'

import { useEffect, useState } from 'react'
import { Card, Checkbox, PillBtn, TOKENS } from '@/lib/plugin-sdk'
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

  const warning = (title: string, body: string) => (
    <div style={{ padding: '10px 14px', borderRadius: 12, border: `1px solid ${TOKENS.warn}`, background: 'rgba(243,201,105,0.08)' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: TOKENS.warn }}>{title}</div>
      <div style={{ marginTop: 4, fontSize: 12, lineHeight: 1.5, color: TOKENS.textDim }}>{body}</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {traktAuth ? (
        <>
          <Card>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: TOKENS.text }}>
              {t('traktSignedInAs')} {traktAuth.name || traktAuth.username || t('traktSignedInFallback')}
            </div>
            <p style={{ margin: '4px 0 12px', fontSize: 12, lineHeight: 1.5, color: TOKENS.textMute }}>{t('traktSyncDesc')}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <PillBtn variant="accent" onClick={() => void handleTraktImport()} disabled={traktImportState === 'importing'}>
                {traktImportState === 'importing' ? t('traktImporting') : t('traktImportData')}
              </PillBtn>
              <PillBtn variant="danger" onClick={handleTraktDisconnect}>{t('traktDisconnect')}</PillBtn>
            </div>
            {traktImportState === 'done' ? <p style={{ margin: '10px 0 0', fontSize: 12, color: TOKENS.mint }}>{t('traktImportDone')}</p> : null}
            {historyRefused ? <div style={{ marginTop: 12 }}>{warning(t('traktHistoryRefused'), t('traktHistoryRefusedBody'))}</div> : null}
            {limitSummary.hit ? (
              <div style={{ marginTop: 12 }}>{warning(t('traktMirrorIncomplete'), t('traktMirrorIncompleteBody').replace('{count}', String(limitSummary.total)))}</div>
            ) : null}
          </Card>
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Checkbox
                checked={autoRemoveMovies}
                onChange={(value) => {
                  setAutoRemoveWatchedMoviesEnabled(value)
                  setAutoRemoveMovies(value)
                }}
                label={t('traktAutoRemoveMovies')}
                hint={t('traktAutoRemoveMoviesHint')}
              />
              <Checkbox
                checked={autoUnfollowSeries}
                onChange={(value) => {
                  setAutoUnfollowFinishedSeriesEnabled(value)
                  setAutoUnfollowSeries(value)
                }}
                label={t('traktAutoUnfollowSeries')}
                hint={t('traktAutoUnfollowSeriesHint')}
              />
            </div>
          </Card>
        </>
      ) : (
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <PillBtn variant="accent" onClick={login.start} disabled={busy} style={{ alignSelf: 'flex-start' }}>
              {busy ? t('traktWaiting') : t('traktConnect')}
            </PillBtn>
            {login.userCode ? (
              <TraktDeviceCodePanel
                userCode={login.userCode}
                verificationUrl={login.verificationUrl}
                notice={login.notice}
                waiting={login.phase === 'waiting'}
              />
            ) : null}
          </div>
        </Card>
      )}
      {login.error ? <p style={{ margin: 0, fontSize: 13, color: TOKENS.red }}>{login.error}</p> : null}
      {traktImportError ? <p style={{ margin: 0, fontSize: 13, color: TOKENS.red }}>{traktImportError}</p> : null}
    </div>
  )

}
