'use client'

import { useState } from 'react'
import { LtBtn, LtCard, LtCheck, LtChevron, LtConfirm, LtOverflowMenu, LtTextRow, UI, fmtInt, useLtNarrow } from './settings-ui'
import { useHubText } from './hub-strings'
import { EpgSourcesSection } from './epg-sources-section'
import { useXtreamAccountMeta } from './xtream-login-section'
import { ServerCategoriesDialog, serverCategoriesLabel, useXtreamCategoryCount } from './server-categories'
import { completeLogos } from './index-client'
import { getLiveTvLists, getXtreamLogins, isLogoFallbackEnabled, renameLiveTvList, setLogoFallbackEnabled, updateLiveTvListEpg, type LiveTvList } from './live-tv-data'
import { playlistTitle } from './playlist-title'

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

export { playlistHost } from './playlist-title'

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
export function PlaylistCard({ list, busy, onCategories, onUpdate, onRemove, onRelogin, defaultOpen = true }: {
  list: LiveTvList
  busy: boolean
  onCategories: () => void
  onUpdate: () => void
  onRemove: () => void
  onRelogin: () => void
  /**
   * Kortet är hopfällbart (Jerry 2026-10-15): rubriken — värd, typ, antal
   * kanaler, hämtningstid och status — syns alltid; kategorier, EPG-källor,
   * logotyper och knapparna först när kortet är öppet.
   */
  defaultOpen?: boolean
}) {
  const { h, locale } = useHubText()
  const narrow = useLtNarrow()
  const [open, setOpen] = useState(defaultOpen)
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
  const allLists = getLiveTvLists()
  const host = playlistTitle(list, allLists)
  // Namnfältet: utkast tills det sparas, så varje tangenttryck inte skriver om listan.
  const [nameDraft, setNameDraft] = useState(list.label ?? '')
  const saveName = () => renameLiveTvList(list.id, nameDraft)
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

  /*
   * Handlingarna. Raden radbryts (flex-wrap, krymper) och går aldrig utanför
   * kortet; på telefon står bara de två primära kvar som knappar och resten
   * ligger i ⋯-menyn — "Server categories · 2 of 140" + "Update channels" +
   * Remove fick inte plats på 360 px (Jerrys skärmbild 2026-10-15).
   */
  const serverCatsLabel = login ? serverCategoriesLabel(login, categoryTotal, h) : null
  const secondary: { key: string; label: string; onSelect: () => void; danger?: boolean }[] = []
  if (narrow) {
    if (serverCatsLabel) secondary.push({ key: 'server-categories', label: serverCatsLabel, onSelect: () => setServerCats(true) })
    secondary.push({ key: 'remove', label: h('remove'), onSelect: () => setConfirm(true), danger: true })
  }
  const status = needsLogin
    ? { text: h('xtreamNeedsLogin'), color: UI.danger }
    : !busy && list.lastImportError
      ? { text: h('listImportFailed', { error: list.lastImportError }), color: UI.danger }
      : list.truncated
        ? { text: h('listTruncated'), color: '#e2c489' }
        : list.needsReimport
          ? { text: h('listNeedsReimport'), color: UI.muted }
          : null

  return (
    <LtCard testId={`playlist-card-${list.id}`} style={narrow ? { minWidth: 0, padding: '14px 12px' } : { minWidth: 0 }}>
      <button
        type="button"
        aria-expanded={open}
        data-testid={`playlist-card-toggle-${list.id}`}
        onClick={() => setOpen((v) => !v)}
        style={{ display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%', minWidth: 0, border: 0, padding: 0, background: 'transparent', textAlign: 'left', fontFamily: 'inherit', color: UI.text, cursor: 'pointer' }}
      >
        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: 'block', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13.5, fontWeight: 500, color: UI.text }}>{host}</span>
          <span style={{ display: 'block', margin: '4px 0 0', fontSize: 12.5, color: UI.muted }}>{meta}</span>
          {!open && status ? (
            <span data-testid={`playlist-status-${list.id}`} style={{ display: 'block', margin: '2px 0 0', fontSize: 12.5, color: status.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{status.text}</span>
          ) : null}
        </span>
        <LtChevron open={open} style={{ marginTop: 2 }} />
      </button>
      {open ? (
      <>
      <LtTextRow
        label={h('playlistName')}
        value={nameDraft}
        onChange={setNameDraft}
        placeholder={playlistTitle({ ...list, label: undefined }, allLists)}
        fieldWidth={narrow ? 180 : 240}
        button={h('save')}
        onButton={saveName}
        onEnter={saveName}
        buttonDisabled={nameDraft.trim() === (list.label ?? '')}
        first
        testId={`playlist-name-${list.id}`}
      />
      {needsLogin || account || list.needsReimport || (!busy && list.lastImportError) || list.truncated ? (
        <div style={{ minWidth: 0, marginTop: -8 }}>
          {needsLogin ? <p style={lineStyle}>{h('xtreamNeedsLogin')}</p> : null}
          {account ? <p style={{ ...lineStyle, color: account.failed ? UI.danger : UI.muted }}>{account.text}</p> : null}
          {list.needsReimport ? <p style={lineStyle}>{h('listNeedsReimport')}</p> : null}
          {!busy && list.lastImportError ? <p role="alert" style={{ ...lineStyle, color: UI.danger, overflowWrap: 'anywhere' }}>{h('listImportFailed', { error: list.lastImportError })}</p> : null}
          {/* Kapad spellista: jobbet svarade `done`, så utan raden ser en HALV lista ut som en hel. */}
          {list.truncated ? <p role="alert" data-testid={`list-truncated-${list.id}`} style={{ ...lineStyle, color: '#e2c489' }}>{h('listTruncated')}</p> : null}
        </div>
      ) : null}
      <div data-testid={`playlist-actions-${list.id}`} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, minWidth: 0, maxWidth: '100%' }}>
        {importable ? <LtBtn onClick={onCategories}>{h('categories')}</LtBtn> : null}
        {!narrow && serverCatsLabel ? <LtBtn onClick={() => setServerCats(true)}>{serverCatsLabel}</LtBtn> : null}
        {needsLogin ? (
          <LtBtn variant="accent" onClick={onRelogin}>{h('xtreamRelogin')}</LtBtn>
        ) : importable ? (
          <LtBtn onClick={onUpdate} disabled={busy}>{updateLabel}</LtBtn>
        ) : null}
        {!narrow ? <LtBtn variant="danger" onClick={() => setConfirm(true)}>{h('remove')}</LtBtn> : null}
        {narrow ? (
          <span style={{ marginLeft: 'auto' }}>
            <LtOverflowMenu label={h('moreActions')} items={secondary} testId={`playlist-more-${list.id}`} />
          </span>
        ) : null}
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
      </>
      ) : null}
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
