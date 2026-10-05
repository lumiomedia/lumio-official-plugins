'use client'

import { useEffect, useState } from 'react'
import {
  Card,
  PillBtn,
  TOKENS,
  cancelLibraryScan,
  fetchLibraryStatus,
  getActiveLibraryScan,
  getLibraryMode,
  onLibraryModeChanged,
  onLibraryScanChanged,
  resetLibrarySource,
  runLibraryScan,
  setLibraryMode,
  useLang,
} from '@/lib/plugin-sdk'
import type { LibraryScanProgress, LibraryStatus } from '@/lib/plugin-sdk'
import { ensureCanonicalPlexSettings } from './plex-storage'
import { getPlexAuth } from './plex-storage'
import { plexLibraryProvider, plexLibrarySourceRef } from './plex-library-provider'

/** Pluginlokal: värdens strängtabell följer appens version, inte pluginets. */
const BUSY_ELSEWHERE = {
  en: 'Another library is being indexed. Try again when it is done.',
  sv: 'Ett annat bibliotek indexeras. Försök igen när det är klart.',
}

/**
 * Inställningsvy: bygg/uppdatera Plex-indexet med förlopp, se status, och
 * välj om Plex ska ta över startsidan (kärnans biblioteksläge).
 */
export function PlexLibraryIndexPanel() {
  const { t, lang } = useLang()
  const [status, setStatus] = useState<LibraryStatus | null>(null)
  // Förloppet läses ur värdens delade skanning, inte ur egen state:
  // skanningen överlever panelen. Med egen state tappades den vid
  // navigering medan låset satt kvar, och nästa knapptryck svarade
  // "library scan already running" (Emby-rapporten 2026-10-02).
  const [active, setActive] = useState(() => getActiveLibraryScan())
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState(() => getLibraryMode())
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
  useEffect(() => onLibraryScanChanged((scan) => {
    setActive(scan)
    if (!scan) refresh()
  }), [])

  const mine = status?.sources.find((entry) => entry.id === source?.id) ?? null
  const progress: LibraryScanProgress | null = active && source && active.sourceId === source.id ? active.progress : null
  // Låset är ett för alla bibliotek: en Jellyfin-skanning håller det också.
  const running = active !== null
  const busyElsewhere = active !== null && progress === null

  const run = async (kind: 'full' | 'delta') => {
    if (!source || running) return
    setError(null)
    try {
      await runLibraryScan(plexLibraryProvider, { ...source, cursor: mine?.cursor ?? null }, { mode: kind })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      refresh()
    }
  }

  const clear = async () => {
    if (!source || running) return
    await resetLibrarySource(source.id)
    if (mode?.sourceIds.includes(source.id)) {
      const rest = mode.sourceIds.filter((id) => id !== source.id)
      setLibraryMode(rest.length > 0 ? { sourceIds: rest } : null)
    }
    refresh()
  }

  const formatWhen = (seconds: number | null | undefined) =>
    seconds ? new Date(seconds * 1000).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '–'

  const pct = progress?.total ? Math.min(100, Math.round((progress.done / Math.max(1, progress.total)) * 100)) : null

  return (
    <Card>
      <div style={{ fontSize: 14.5, fontWeight: 600, color: TOKENS.text }}>{t('plexIndexTitle')}</div>
      <p style={{ margin: '4px 0 0', fontSize: 12, lineHeight: 1.5, color: TOKENS.textMute }}>{t('plexIndexDesc')}</p>

      <div style={{ marginTop: 12, fontSize: 12, color: TOKENS.textDim }}>
        {mine ? (
          <>
            <span style={{ color: TOKENS.text }}>{t('plexIndexStatus').replace('{titles}', String(mine.titles)).replace('{unmatched}', String(status?.unmatched ?? 0))}</span>
            <span style={{ margin: '0 8px', color: TOKENS.textMute }}>·</span>
            {t('plexIndexLastSync')}: {formatWhen(mine.lastDeltaSync ?? mine.lastFullSync)}
          </>
        ) : (
          t('plexIndexEmpty')
        )}
      </div>

      {progress ? (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: TOKENS.textDim }}>
            <span>
              {progress.section ? `${progress.section} · ` : ''}
              {t('plexIndexRunning').replace('{done}', String(progress.done))}
              {progress.total ? ` / ${progress.total}` : ''}
            </span>
            <PillBtn size="sm" onClick={() => cancelLibraryScan()}>{t('cancel')}</PillBtn>
          </div>
          <div style={{ marginTop: 8, height: 6, width: '100%', overflow: 'hidden', borderRadius: 999, background: TOKENS.surface0 }}>
            <div style={{ height: '100%', borderRadius: 999, background: TOKENS.accent, width: pct != null ? `${pct}%` : '35%', transition: 'width .3s' }} />
          </div>
        </div>
      ) : null}
      {busyElsewhere ? <p style={{ margin: '8px 0 0', fontSize: 12, color: TOKENS.textDim }}>{lang === 'sv' ? BUSY_ELSEWHERE.sv : BUSY_ELSEWHERE.en}</p> : null}
      {error ? <p style={{ margin: '8px 0 0', fontSize: 12, color: TOKENS.red }}>{error}</p> : null}

      <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <PillBtn variant="accent" disabled={!connected || running} onClick={() => void run('full')}>
          {mine ? t('plexIndexRebuild') : t('plexIndexBuild')}
        </PillBtn>
        {mine ? <PillBtn disabled={running} onClick={() => void run('delta')}>{t('plexIndexUpdate')}</PillBtn> : null}
        {mine ? <PillBtn variant="danger" disabled={running} onClick={() => void clear()}>{t('plexIndexClear')}</PillBtn> : null}
      </div>
      {/* "Använd som startsida" bor i appens inställningar (Hem → Layout →
          Bibliotek): inställningen är kärnans och gäller alla leverantörer. */}
    </Card>
  )

}
