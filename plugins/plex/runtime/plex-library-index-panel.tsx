'use client'

import { useEffect, useRef, useState } from 'react'
import { fetchLibraryStatus, getLibraryMode, onLibraryModeChanged, resetLibrarySource, runLibraryScan, setLibraryMode, useLang } from '@/lib/plugin-sdk'
import type { LibraryScanProgress, LibraryStatus } from '@/lib/plugin-sdk'
import { ensureCanonicalPlexSettings } from './plex-storage'
import { getPlexAuth } from './plex-storage'
import { plexLibraryProvider, plexLibrarySourceRef } from './plex-library-provider'

/**
 * Inställningsvy: bygg/uppdatera Plex-indexet med förlopp, se status, och
 * välj om Plex ska ta över startsidan (kärnans biblioteksläge).
 */
export function PlexLibraryIndexPanel() {
  const { t } = useLang()
  const [status, setStatus] = useState<LibraryStatus | null>(null)
  const [progress, setProgress] = useState<LibraryScanProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState(() => getLibraryMode())
  const abortRef = useRef<AbortController | null>(null)
  const settings = ensureCanonicalPlexSettings()
  const source = plexLibrarySourceRef(settings)
  const connected = Boolean(getPlexAuth() && settings.serverUri && settings.libraries.length > 0)

  const refresh = () => {
    void fetchLibraryStatus().then(setStatus).catch(() => setStatus(null))
  }
  useEffect(() => {
    refresh()
    return onLibraryModeChanged(() => setMode(getLibraryMode()))
  }, [])

  const mine = status?.sources.find((entry) => entry.id === source?.id) ?? null
  const running = progress !== null && progress.phase !== 'done'

  const run = async (kind: 'full' | 'delta') => {
    if (!source || running) return
    setError(null)
    const controller = new AbortController()
    abortRef.current = controller
    setProgress({ phase: 'listing', done: 0 })
    try {
      await runLibraryScan(plexLibraryProvider, { ...source, cursor: mine?.cursor ?? null }, {
        mode: kind,
        signal: controller.signal,
        onProgress: setProgress,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setProgress(null)
      abortRef.current = null
      refresh()
    }
  }

  const clear = async () => {
    if (!source || running) return
    await resetLibrarySource(source.id)
    if (mode?.sourceId === source.id) setLibraryMode(null)
    refresh()
  }

  const formatWhen = (seconds: number | null | undefined) =>
    seconds ? new Date(seconds * 1000).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '–'

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-sm font-semibold text-slate-100">{t('plexIndexTitle')}</p>
      <p className="mt-1 text-xs text-slate-500">{t('plexIndexDesc')}</p>

      <div className="mt-3 text-xs text-slate-400">
        {mine ? (
          <>
            <span className="text-slate-200">{t('plexIndexStatus').replace('{titles}', String(mine.titles)).replace('{unmatched}', String(status?.unmatched ?? 0))}</span>
            <span className="mx-2 text-slate-600">·</span>
            {t('plexIndexLastSync')}: {formatWhen(mine.lastDeltaSync ?? mine.lastFullSync)}
          </>
        ) : (
          t('plexIndexEmpty')
        )}
      </div>

      {progress ? (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>
              {progress.section ? `${progress.section} · ` : ''}
              {t('plexIndexRunning').replace('{done}', String(progress.done))}
              {progress.total ? ` / ${progress.total}` : ''}
            </span>
            <button type="button" onClick={() => abortRef.current?.abort()} className="text-slate-500 hover:text-white">
              {t('cancel')}
            </button>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-amber-400 transition-[width]"
              style={{ width: progress.total ? `${Math.min(100, Math.round((progress.done / Math.max(1, progress.total)) * 100))}%` : '35%' }}
            />
          </div>
        </div>
      ) : null}
      {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!connected || running}
          onClick={() => void run('full')}
          className="rounded-full bg-amber-400/90 px-4 py-1.5 text-xs font-semibold text-black transition hover:bg-amber-300 disabled:opacity-40"
        >
          {mine ? t('plexIndexRebuild') : t('plexIndexBuild')}
        </button>
        {mine ? (
          <button
            type="button"
            disabled={running}
            onClick={() => void run('delta')}
            className="rounded-full border border-white/15 px-4 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-white/40 disabled:opacity-40"
          >
            {t('plexIndexUpdate')}
          </button>
        ) : null}
        {mine ? (
          <button type="button" disabled={running} onClick={() => void clear()} className="text-xs text-slate-500 hover:text-white disabled:opacity-40">
            {t('plexIndexClear')}
          </button>
        ) : null}
      </div>

      <label className="mt-4 flex items-center gap-3 text-sm text-slate-200">
        <input
          type="checkbox"
          disabled={!mine}
          checked={Boolean(source && mode?.sourceId === source.id)}
          onChange={(event) => setLibraryMode(event.target.checked && source ? { sourceId: source.id } : null)}
          className="h-4 w-4 accent-amber-400"
        />
        {t('plexIndexUseAsHome')}
      </label>
      <p className="mt-1 text-xs text-slate-500">{t('plexIndexUseAsHomeDesc')}</p>
    </div>
  )
}
