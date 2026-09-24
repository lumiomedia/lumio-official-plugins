'use client'

import { useState } from 'react'
import { LtBtn, LtCard, LtCheck, LtConfirm, UI, fmtInt, hostOf } from './settings-ui'
import { useHubText } from './hub-strings'
import { EpgSourcesSection } from './epg-sources-section'
import { useXtreamAccountMeta } from './xtream-login-section'
import { ServerCategoriesDialog, serverCategoriesLabel, useXtreamCategoryCount } from './server-categories'
import { completeLogos } from './index-client'
import { getXtreamLogins, isLogoFallbackEnabled, setLogoFallbackEnabled, updateLiveTvListEpg, type LiveTvList } from './live-tv-data'

/**
 * Kvittots tidsstämpel. Idag räcker klockslaget; är hämtningen äldre säger
 * bara "09:41" inget alls om huruvida listan är färsk, så då kommer datumet
 * med.
 */
export function formatFetchedAt(iso: string, locale: string): string {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return iso
  const now = new Date()
  const sameDay = then.toDateString() === now.toDateString()
  return sameDay
    ? then.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    : then.toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/** Kortets rubrik: värden ur käll-URL:en för M3U, listnamnet (panelens värd) annars. */
export function playlistHost(list: LiveTvList): string {
  return list.kind === 'm3u' && list.url ? hostOf(list.url) : list.name
}

/**
 * Sammanfattningen `N categories · N hidden · N merged` (§3.1): kategorier =
 * listans ORIGINALKATEGORIER ur importkvittot (inte de kurerade), dolda = de
 * dolda som finns i listan, ihopslagna = mergarna som har någon känd medlem.
 */
export function curationSummary(list: LiveTvList): { categories: number; hidden: number; merged: number } {
  const known = new Set((list.groups ?? []).map((g) => g.name))
  const curation = list.curation
  return {
    categories: known.size,
    hidden: (curation?.hidden ?? []).filter((g) => known.has(g)).length,
    merged: (curation?.merges ?? []).filter((m) => m.groups.some((g) => known.has(g))).length,
  }
}

/**
 * SPELLISTAN SOM EN ENHET (handoff §3.1): ett kort per spellista med värd,
 * meta, status, knapparna Categories · Update channels/Refetch · Remove,
 * sammanfattningsraden som öppnar kategorierna, EPG-källorna och
 * logotypvalet. Remove kräver en bekräftelse med handoffens text.
 *
 * Kortet läser inget själv utom Xtream-kontot: `list` kommer från sidan, som
 * prenumererar på lagringen, så en ändring (EPG, logotyper) syns via ny prop.
 */
export function PlaylistCard({ list, busy, onCategories, onUpdate, onRemove, onRelogin }: {
  list: LiveTvList
  busy: boolean
  onCategories: () => void
  onUpdate: () => void
  onRemove: () => void
  onRelogin: () => void
}) {
  const { h, locale } = useHubText()
  const [confirm, setConfirm] = useState(false)
  const [serverCats, setServerCats] = useState(false)
  // Komplettera-knappens eget tillstånd — en handling, skild från kryssrutan
  // som bara styr OM reserven får användas (Jerrys ord efter test).
  const [logoComplete, setLogoComplete] = useState<
    | { status: 'running' }
    | { status: 'done'; matched: number; total: number }
    | { status: 'error'; error: string }
    | null
  >(null)
  const kind = list.kind
  const importable = kind === 'm3u' || kind === 'xtream'
  const login = kind === 'xtream' ? getXtreamLogins().find((entry) => entry.id === list.xtreamLoginId) ?? null : null
  // Enhetsöverföringen speglar `lists` men inte `xtream_logins` (lösenord):
  // en överförd Xtream-lista har en källa som ingen inloggning svarar mot.
  const needsLogin = kind === 'xtream' && !login
  const account = useXtreamAccountMeta(login)
  const categoryTotal = useXtreamCategoryCount(login)
  const host = playlistHost(list)
  /**
   * `completeLogos` sänder `emitIndexChanged()` själv vid ett lyckat svar
   * (index-client.ts) — den ropas INTE här igen, det hade blivit en dubbelsändning.
   */
  const runCompleteLogos = async () => {
    if (!list.source) return
    setLogoComplete({ status: 'running' })
    try {
      const result = await completeLogos(list.source)
      setLogoComplete({ status: 'done', matched: result.matched, total: result.total })
    } catch (err) {
      setLogoComplete({ status: 'error', error: err instanceof Error ? err.message : String(err) })
    }
  }
  const kindLabel = kind === 'xtream' ? h('kindXtream') : kind === 'm3u' ? h('kindM3u') : h('kindCustom')
  const meta = busy
    ? h('fetching')
    : h('playlistMeta', {
        kind: kindLabel,
        channels: fmtInt(list.channelCount ?? 0, locale),
        fetched: list.fetchedAt ? h('m3uFetchedAt', { time: formatFetchedAt(list.fetchedAt, locale) }) : h('m3uNeverFetched'),
      })
  const summary = curationSummary(list)
  const updateLabel = busy ? h('fetching') : kind === 'xtream' ? h('updateChannels') : h('listRefetch')
  const lineStyle = { margin: '2px 0 0', fontSize: 12.5, color: UI.muted } as const

  return (
    <LtCard testId={`playlist-card-${list.id}`}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ minWidth: 0, flex: '1 1 12rem' }}>
          <p style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13.5, fontWeight: 500, color: UI.text }}>{host}</p>
          <p style={{ margin: '4px 0 0', fontSize: 12.5, color: UI.muted }}>{meta}</p>
          {needsLogin ? <p style={lineStyle}>{h('xtreamNeedsLogin')}</p> : null}
          {account ? <p style={{ ...lineStyle, color: account.failed ? UI.danger : UI.muted }}>{account.text}</p> : null}
          {list.needsReimport ? <p style={lineStyle}>{h('listNeedsReimport')}</p> : null}
          {!busy && list.lastImportError ? <p role="alert" style={{ ...lineStyle, color: UI.danger }}>{h('listImportFailed', { error: list.lastImportError })}</p> : null}
          {/* Kapad spellista: jobbet svarade `done`, så utan raden ser en HALV lista ut som en hel. */}
          {list.truncated ? <p role="alert" data-testid={`list-truncated-${list.id}`} style={{ ...lineStyle, color: '#e2c489' }}>{h('listTruncated')}</p> : null}
        </div>
        <div style={{ display: 'flex', flex: 'none', flexWrap: 'wrap', gap: 8 }}>
          {importable ? <LtBtn onClick={onCategories}>{h('categories')}</LtBtn> : null}
          {login ? <LtBtn onClick={() => setServerCats(true)}>{serverCategoriesLabel(login, categoryTotal, h)}</LtBtn> : null}
          {needsLogin ? (
            <LtBtn variant="accent" onClick={onRelogin}>{h('xtreamRelogin')}</LtBtn>
          ) : importable ? (
            <LtBtn onClick={onUpdate} disabled={busy}>{updateLabel}</LtBtn>
          ) : null}
          <LtBtn variant="danger" onClick={() => setConfirm(true)}>{h('remove')}</LtBtn>
        </div>
      </div>
      {importable ? (
        <button
          type="button"
          onClick={onCategories}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, border: 0, borderRadius: 9, background: UI.inset, padding: '11px 13px', textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', color: UI.soft }}
        >
          <span style={{ fontSize: 12.5 }}>{h('curationSummary', { groups: summary.categories, hidden: summary.hidden, merged: summary.merged })}</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={UI.muted} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m9 18 6-6-6-6" /></svg>
        </button>
      ) : null}
      <EpgSourcesSection
        testId={`epg-sources-${list.id}`}
        autoUrl={list.urlTvg}
        manualUrls={list.epgUrls}
        onChangeManual={(epgUrls) => updateLiveTvListEpg(list.id, { epgUrls })}
        autoDisabled={list.autoEpgDisabled}
        onToggleAuto={(disabled) => updateLiveTvListEpg(list.id, { autoEpgDisabled: disabled })}
      />
      {/* Egna listors kanaler renderas via `withIndexTwins` (tvillingen bär
          URSPRUNGSLISTANS switch-tillstånd) — den egna listans val filtrerar
          ingenting och spärras därför. */}
      <LtCheck
        testId={`logo-fallback-toggle-${list.id}`}
        checked={isLogoFallbackEnabled(list)}
        onChange={(value) => setLogoFallbackEnabled(list.id, value)}
        disabled={kind === 'custom'}
        label={h('logoFallbackToggle')}
        hint={h('logoFallbackHint')}
      />
      {/* Egen rad med avdelare: kryssrutan ÄR inställningen, knappen är HANDLINGEN. */}
      <div style={{ borderTop: `1px solid ${UI.lineSoft}`, paddingTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <LtBtn
          onClick={() => void runCompleteLogos()}
          disabled={!isLogoFallbackEnabled(list) || kind === 'custom' || logoComplete?.status === 'running'}
        >
          {logoComplete?.status === 'running' ? h('logoCompleteRunning') : h('logoCompleteButton')}
        </LtBtn>
        <span style={{ fontSize: 12.5, color: logoComplete?.status === 'error' ? UI.danger : UI.muted }} role={logoComplete?.status === 'error' ? 'alert' : undefined}>
          {logoComplete?.status === 'done'
            ? h('logoCompleteResult', { matched: fmtInt(logoComplete.matched, locale), total: fmtInt(logoComplete.total, locale) })
            : logoComplete?.status === 'error'
              ? logoComplete.error
              : h('completeLogosHint')}
        </span>
      </div>
      {serverCats && login ? (
        <ServerCategoriesDialog login={login} host={host} onClose={() => setServerCats(false)} onApplied={onUpdate} />
      ) : null}
      {confirm ? (
        <LtConfirm
          testId={`remove-playlist-${list.id}`}
          title={h('removePlaylistTitle', { host })}
          body={h('removePlaylistBody')}
          cancelLabel={h('cancel')}
          confirmLabel={h('remove')}
          onCancel={() => setConfirm(false)}
          onConfirm={() => { setConfirm(false); onRemove() }}
        />
      ) : null}
    </LtCard>
  )
}
