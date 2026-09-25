'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { getTvKeyboardPanel, useLang } from '@/lib/plugin-sdk'
import { TVS, TvBtns, TvConfirmPanel, TvEyebrow, TvFocusStyle, TvNote, TvPanel, TvRow } from './tv-settings-ui'
import { fmtInt, useToast } from './settings-ui'
import { formatDisplayMetrics, isViewportMismatch, readDisplayMetrics } from './display-metrics'
import { useHubText } from './hub-strings'
import { useLiveTvSettings, type CurationTarget } from './live-tv-settings-section'
import { useXtreamAccountMeta, useXtreamLoginForm } from './xtream-login-section'
import { applyServerCategories, isCategorySelected, toggleCategory, useXtreamCategories, useXtreamCategoryCount } from './server-categories'
import { completeLogos } from './index-client'
import { curationSummary, formatFetchedAt, playlistHost } from './playlist-card'
import { useEpgStatus } from './hooks/useEpgStatus'
import { useVodLibrarySources } from './hooks/useVodLibrarySources'
import { useTvText } from './tv/tv-strings'
import { listGroups } from './index-client'
import { mergeNameConflict, normalizeCuration, renameMerge } from './list-curation'
import {
  getXtreamLogins,
  isLogoFallbackEnabled,
  markListCurationSeen,
  setLogoFallbackEnabled,
  updateLiveTvListCuration,
  updateLiveTvListEpg,
  type ListCuration,
  type LiveTvList,
  type XtreamLogin,
} from './live-tv-data'

/* ------------------------------------------------------------ hjälpare */

function kindLabel(list: LiveTvList, h: ReturnType<typeof useHubText>['h']): string {
  return list.kind === 'xtream' ? h('kindXtream') : list.kind === 'm3u' ? h('kindM3u') : h('kindCustom')
}

/** `N categories` + ` · N hidden` + ` · N merged`, nollor utelämnade (TV-raden, facit 2622). */
function shortSummary(list: LiveTvList, h: ReturnType<typeof useHubText>['h']): string {
  const s = curationSummary(list)
  return [h('nCategories', { n: s.categories }), s.hidden ? h('nHidden', { n: s.hidden }) : null, s.merged ? h('nMerged', { n: s.merged }) : null].filter(Boolean).join(' · ')
}

/**
 * En textrad som öppnar värdens tangentbordspanel på OK. Ett vanligt <input>
 * fick fokus av fjärrens navigering och drog upp systemets tangentbord bara
 * av att man passerade fältet — här skrivs ett fält i taget.
 */
function TvTextRow({ label, hint, value, placeholder, secret = false, onChange, testId }: {
  label: string
  hint?: string
  value: string
  placeholder?: string
  secret?: boolean
  onChange: (value: string) => void
  testId?: string
}) {
  const { h } = useHubText()
  const Keyboard = getTvKeyboardPanel()
  const [open, setOpen] = useState(false)
  const shown = value ? (secret ? '•'.repeat(Math.min(value.length, 24)) : value) : h('tvNotSet')
  // Äldre värd utan tangentbordspanel: raden säger varför i stället för att
  // tyst göra ingenting (granskning 2026-09-24).
  return (
    <>
      <TvRow label={label} hint={Keyboard ? hint : h('tvNoKeyboard')} value={shown} valueTone={value ? 'accent' : 'muted'} glyph="⌨" onOk={() => setOpen(true)} disabled={!Keyboard} testId={testId} />
      {open && Keyboard ? (
        <Keyboard title={label} placeholder={placeholder ?? ''} initial={value} onDone={(next) => { onChange(next); setOpen(false) }} onClose={() => setOpen(false)} />
      ) : null}
    </>
  )
}

/* ------------------------------------------------------------- sidan */

/**
 * TV-SIDAN (handoff §4.2, facit rad 1143–1162): växlar, PLAYLISTS-rader,
 * M3U, XTREAM LOGIN, PROGRAMME GUIDE STATUS, USE AS LIBRARY — som rader i
 * appens TV-inställningars stil. OK på en spellista öppnar L:list.
 */
export function TvSettingsPage() {
  const { t } = useLang()
  const { h, locale } = useHubText()
  const { tt } = useTvText()
  const toast = useToast()
  const s = useLiveTvSettings()
  const form = useXtreamLoginForm({ onImported: (listId, existedBefore) => { if (!existedBefore) s.maybeOpenCurationAfterImport(listId) } })
  const [openList, setOpenList] = useState<string | null>(null)
  const [displayMetrics, setDisplayMetrics] = useState(() => readDisplayMetrics())
  useEffect(() => {
    const sync = () => setDisplayMetrics(readDisplayMetrics())
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])
  const epg = useEpgStatus()
  const vod = useVodLibrarySources()

  const openedList = openList ? s.lists.find((l) => l.id === openList) ?? null : null
  // Stängs när listan tas bort under panelen.
  useEffect(() => { if (openList && !openedList) setOpenList(null) }, [openList, openedList])

  const fetchHint = s.fetchProgress.status === 'fetching'
    ? h('m3uFetchProgress', { current: s.fetchProgress.current, total: s.fetchProgress.total })
    : s.fetchProgress.status === 'error'
      ? h('m3uFetchFailedOn', { host: s.fetchProgress.url ?? '', error: s.fetchProgress.error ?? '' })
      : s.fetchProgress.status === 'done'
        ? s.fetchProgress.results.map((r) => h('channelsCount', { count: fmtInt(r.channels, locale) })).join(' · ')
        : h('tvFetchHint')
  const loginHint = form.state === 'authError' ? h('loginRejected') : form.state === 'netError' ? h('loginUnreachable') : form.importProgress
    ? (form.importProgress.total ? h('listImportProgress', { received: fmtInt(form.importProgress.received, locale), total: fmtInt(form.importProgress.total, locale) }) : h('listImportProgressUnknown'))
    : h('tvLoginHint')
  const loginValue = form.state === 'working' ? h('loggingIn') : form.state === 'done' ? h('loginFetched') : h('tvLogin')

  const fetchedAt = (ms: number | null) => {
    if (!ms) return null
    return formatFetchedAt(new Date(ms).toISOString(), locale)
  }
  const guideFetched = fetchedAt(epg.status?.fetchedAt ?? null)
  const refetchGuide = async () => {
    await epg.refresh()
    toast(h('guideFetchedToast', { programmes: fmtInt(epg.status?.programmes ?? 0, locale) }))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, color: TVS.text }}>
      <TvFocusStyle />
      <TvRow label={h('useAsHome')} hint={s.homeOverrideError || h('useAsHomeDesc')} toggle={s.homeOverrideEnabled} onToggle={s.toggleHomeOverride} />
      <TvRow label={h('hideHero')} hint={h('hideHeroDesc')} toggle={s.hideHero} onToggle={s.setHideHero} />

      <TvEyebrow>{h('playlists')}</TvEyebrow>
      {s.lists.length === 0 ? <TvNote>{h('noPlaylistsYet')}</TvNote> : null}
      {s.lists.map((list) => (
        <TvRow
          key={list.id}
          testId={`tv-playlist-row-${list.id}`}
          label={playlistHost(list)}
          hint={s.listProgress?.listId === list.id ? h('fetching') : h('playlistMeta', { kind: kindLabel(list, h), channels: fmtInt(list.channelCount ?? 0, locale), fetched: list.fetchedAt ? h('m3uFetchedAt', { time: formatFetchedAt(list.fetchedAt, locale) }) : h('m3uNeverFetched') })}
          value={list.kind === 'custom' ? undefined : shortSummary(list, h)}
          caret
          onOk={() => setOpenList(list.id)}
        />
      ))}

      <TvEyebrow>{h('kindM3u')}</TvEyebrow>
      <TvTextRow label={h('tvM3uUrls')} hint={h('tvM3uHint')} value={s.m3uText} placeholder={t('m3uUrlsPlaceholder')} onChange={s.setM3uText} />
      <TvRow label={h('fetchList')} hint={fetchHint} value={s.fetchProgress.status === 'fetching' ? h('fetching') : h('tvFetch')} caret onOk={() => void s.fetchM3u()} disabled={s.fetchProgress.status === 'fetching'} />

      <TvEyebrow>{h('xtreamLogin')}</TvEyebrow>
      <TvTextRow label={h('serverUrl')} hint="http://host:8080" value={form.server} placeholder="http://host:8080" onChange={form.setServer} />
      <TvTextRow label={h('username')} value={form.username} onChange={form.setUsername} />
      <TvTextRow label={h('password')} value={form.password} secret onChange={form.setPassword} />
      <TvRow label={h('loginAndFetch')} hint={loginHint} value={loginValue} caret onOk={() => void form.connect()} disabled={form.state === 'working'} />

      {epg.urls.length > 0 ? (
        <>
          <TvEyebrow>{h('epgStatusTitle')}</TvEyebrow>
          <TvNote>{h('epgStatusAllLists')}</TvNote>
          <TvRow
            label={epg.refreshing ? h('fetchingGuide') : guideFetched ? h('tvGuideFetched', { time: guideFetched }) : h('epgNeverFetched')}
            hint={h('epgSourceStats', { channels: fmtInt(epg.status?.channels ?? 0, locale), programmes: fmtInt(epg.status?.programmes ?? 0, locale) })}
            value={h('epgRefresh')}
            onOk={() => void refetchGuide()}
            disabled={epg.refreshing}
          />
        </>
      ) : null}

      {vod.rows.length > 0 ? (
        <>
          <TvEyebrow>{h('useAsLibrary')}</TvEyebrow>
          <TvNote>{h('useAsLibraryHint')}</TvNote>
          {vod.rows.map((row) => (
            <TvRow
              key={row.libraryId}
              label={row.label}
              hint={vod.progress?.libraryId === row.libraryId
                ? tt('vodLibraryBuilding', { count: fmtInt(vod.progress.done, locale) })
                : row.importing
                  ? tt('vodLibraryImporting')
                  : row.indexedTitles === null
                    ? h('titlesReady', { count: fmtInt(row.vodTitles, locale) })
                    : h('libraryBuilt', { count: fmtInt(row.indexedTitles, locale) })}
              value={row.indexedTitles === null ? tt('vodLibraryBuild') : tt('vodLibraryRebuild')}
              disabled={vod.disabled(row)}
              onOk={() => { void vod.build(row).then(() => toast(h('libraryBuiltToast', { count: fmtInt(row.vodTitles, locale) }))) }}
            />
          ))}
          <TvNote tone={vod.error ? 'danger' : 'muted'}>{vod.error ? tt('vodLibraryFailed', { error: vod.error }) : tt('vodLibraryWhereToEnable')}</TvNote>
        </>
      ) : null}

      {/* Skärmens mått, att fotografera.

          Rapporten "channels are zoomed in and there is a white box issue"
          (Fire TV Cube 2026-09-25) syns varken i skrivbordets TV-läge eller i
          Television_4K-emulatorn — där är layouten och den synliga ytan
          identiska (mätt: 960×540 mot 960×540 @1). Den som kan reproducera
          felet når inte debug-loggen, men kan fota en skärm, och han sitter i
          DEN HÄR vyn — inte i skrivbordets kortstapel, där kortet först låg. */}
      <TvEyebrow>Display</TvEyebrow>
      <TvRow
        label={displayMetrics ? formatDisplayMetrics(displayMetrics) : '—'}
        hint={displayMetrics && isViewportMismatch(displayMetrics)
          ? 'The page is drawn against a larger area than the screen shows — that is the zoom fault.'
          : 'Layout and visible area match, which is what a healthy screen looks like.'}
      />

      {openedList ? (
        <TvPlaylistPanel
          list={openedList}
          busy={s.listProgress?.listId === openedList.id}
          onClose={() => setOpenList(null)}
          onUpdate={() => void s.refetchList(openedList)}
          onRemove={() => { setOpenList(null); s.removeList(openedList) }}
          onRelogin={() => { setOpenList(null); s.relogin(openedList) }}
          onCategories={() => s.setCurationList({ list: openedList, mode: 'settings' })}
        />
      ) : null}
      {s.curationList ? (
        <TvCategoriesPanel
          target={s.curationList}
          crumb={openedList ? playlistHost(openedList) : undefined}
          onClose={() => s.setCurationList(null)}
        />
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------- L:list */

/**
 * L:list (facit 1957–1993): Status/Channels som info, Categories → L:cats,
 * Update channels/Refetch, EPG SOURCES med Remove per källa och Add XMLTV
 * URL via tangentbordet, logotypväxeln, PLAYLIST → Remove playlist (med
 * bekräftelsevy), Complete.
 */
export function TvPlaylistPanel({ list, busy, onClose, onUpdate, onRemove, onRelogin, onCategories }: {
  list: LiveTvList
  busy: boolean
  onClose: () => void
  onUpdate: () => void
  onRemove: () => void
  onRelogin: () => void
  onCategories: () => void
}) {
  const { h, locale } = useHubText()
  const toast = useToast()
  const Keyboard = getTvKeyboardPanel()
  const [adding, setAdding] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [serverCats, setServerCats] = useState(false)
  const [completing, setCompleting] = useState(false)
  const login = list.kind === 'xtream' ? getXtreamLogins().find((entry) => entry.id === list.xtreamLoginId) ?? null : null
  const categoryTotal = useXtreamCategoryCount(login)
  const needsLogin = list.kind === 'xtream' && !login
  const account = useXtreamAccountMeta(login)
  const importable = list.kind === 'm3u' || list.kind === 'xtream'
  const host = playlistHost(list)
  const kind = kindLabel(list, h)
  const summary = curationSummary(list)
  const statusMeta = busy
    ? h('fetching')
    : needsLogin
      ? h('xtreamNeedsLogin')
      : account
        ? account.text
        : list.lastImportError
          ? h('listImportFailed', { error: list.lastImportError })
          : list.needsReimport
            ? h('listNeedsReimport')
            : list.truncated
              ? h('listTruncated')
              : '—'
  const epgSources: { url: string; auto: boolean; disabled: boolean; remove: () => void }[] = []
  if (list.urlTvg) {
    epgSources.push({ url: list.urlTvg, auto: true, disabled: list.autoEpgDisabled, remove: () => { updateLiveTvListEpg(list.id, { autoEpgDisabled: !list.autoEpgDisabled }); toast(h('epgSourceRemoved')) } })
  }
  list.epgUrls.forEach((url, i) => epgSources.push({ url, auto: false, disabled: false, remove: () => { updateLiveTvListEpg(list.id, { epgUrls: list.epgUrls.filter((_, j) => j !== i) }); toast(h('epgSourceRemoved')) } }))
  const addUrl = (raw: string) => {
    const url = raw.trim()
    if (!url) {
      toast(h('pasteXmltvFirst'))
      return
    }
    updateLiveTvListEpg(list.id, { epgUrls: [...list.epgUrls, url] })
    toast(h('epgSourceAdded'))
  }
  const serverMeta = login
    ? (login.categoryIds.length === 0
        ? h('tvAllFetched')
        : categoryTotal !== null
          ? h('tvNOfFetched', { n: login.categoryIds.length, total: categoryTotal })
          : h('tvNSelected', { n: login.categoryIds.length }))
    : ''
  const runCompleteLogos = async () => {
    if (!list.source) return
    setCompleting(true)
    try {
      const result = await completeLogos(list.source)
      toast(h('logoCompleteResult', { matched: fmtInt(result.matched, locale), total: fmtInt(result.total, locale) }))
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err))
    } finally {
      setCompleting(false)
    }
  }

  return (
    <TvPanel title={host} hint={`${kind} · ${h('channelsCount', { count: fmtInt(list.channelCount ?? 0, locale) })}`} onBack={onClose} testId="tv-playlist-panel">
      <TvRow size="panel" label={h('tvStatus')} hint={statusMeta} value={kind} />
      <TvRow size="panel" label={h('tvChannels')} hint={list.fetchedAt ? h('m3uFetchedAt', { time: formatFetchedAt(list.fetchedAt, locale) }) : h('m3uNeverFetched')} value={fmtInt(list.channelCount ?? 0, locale)} />
      {importable ? (
        <TvRow size="panel" init label={h('categories')} hint={h('curationSummary', { groups: summary.categories, hidden: summary.hidden, merged: summary.merged })} value={h('tvEdit')} onOk={onCategories} />
      ) : null}
      {login ? (
        <TvRow size="panel" label={h('serverCategories')} hint={serverMeta} value={h('tvEdit')} onOk={() => setServerCats(true)} />
      ) : null}
      {needsLogin ? (
        <TvRow size="panel" label={h('xtreamRelogin')} hint={h('xtreamNeedsLogin')} value={h('tvLogin')} onOk={onRelogin} />
      ) : importable ? (
        <TvRow size="panel" label={list.kind === 'xtream' ? h('updateChannels') : h('listRefetch')} hint={busy ? h('fetching') : h('tvUpdateHint')} value={busy ? '…' : h('tvUpdate')} onOk={onUpdate} disabled={busy} />
      ) : null}
      <TvEyebrow size="panel">{h('epgSources')}</TvEyebrow>
      {epgSources.map((src) => (
        <TvRow key={src.url} size="panel" label={src.url} hint={src.auto ? h('tvAutoEpgMeta') : h('tvManualEpgMeta')} value={src.disabled ? h('on') : h('remove')} onOk={src.remove} style={src.disabled ? { opacity: 0.55 } : undefined} />
      ))}
      {epgSources.filter((s) => !s.disabled).length === 0 ? <TvNote size="panel">{h('noEpgSourceYet')}</TvNote> : null}
      <TvRow size="panel" label={h('tvAddXmltv')} hint={Keyboard ? h('tvAddXmltvMeta') : h('tvNoKeyboard')} value={h('add')} onOk={() => setAdding(true)} disabled={!Keyboard} />
      <TvRow size="panel" label={h('logoFallbackToggle')} hint={h('logoFallbackHint')} toggle={isLogoFallbackEnabled(list)} onToggle={(value) => setLogoFallbackEnabled(list.id, value)} disabled={list.kind === 'custom'} />
      <TvRow size="panel" label={h('logoCompleteButton')} hint={h('completeLogosHint')} value={completing ? h('logoCompleteRunning') : h('tvUpdate')} onOk={() => void runCompleteLogos()} disabled={completing || !isLogoFallbackEnabled(list) || list.kind === 'custom'} />
      <TvEyebrow size="panel">{h('tvPlaylistEyebrow')}</TvEyebrow>
      <TvRow size="panel" label={h('tvRemovePlaylist')} hint={h('tvRemovePlaylistMeta')} value={h('remove')} onOk={() => setConfirm(true)} />
      <TvBtns buttons={[{ label: h('tvComplete'), style: 'accent', onOk: onClose }]} />
      {adding && Keyboard ? (
        <Keyboard title={h('tvAddXmltv')} hint={h('tvAddXmltvMeta')} placeholder="https://" initial="" onDone={(value) => { addUrl(value); setAdding(false) }} onClose={() => setAdding(false)} />
      ) : null}
      {serverCats && login ? (
        <TvServerCategoriesPanel login={login} host={host} onClose={() => setServerCats(false)} onApplied={onUpdate} />
      ) : null}
      {confirm ? (
        <TvConfirmPanel
          title={h('removePlaylistTitle', { host })}
          body={h('removePlaylistBody')}
          cancelLabel={h('cancel')}
          confirmLabel={h('remove')}
          crumb={host}
          onCancel={() => setConfirm(false)}
          onConfirm={() => { setConfirm(false); onRemove() }}
        />
      ) : null}
    </TvPanel>
  )
}

/* ------------------------------------------------- serverkategorier */

/**
 * Xtreams kategorival på servern som egen vy (samma stil som L:cats):
 * "All categories" + en växel per kategori, Apply & fetch sparar valet på
 * kontot och hämtar om listan. Ingen funktionalitet får försvinna (Jerry
 * 2026-09-24) — det här fanns i det gamla kontokortet.
 */
export function TvServerCategoriesPanel({ login, host, onClose, onApplied }: { login: XtreamLogin; host: string; onClose: () => void; onApplied: () => void }) {
  const { h } = useHubText()
  const categories = useXtreamCategories(login)
  const [selected, setSelected] = useState<Set<string>>(() => new Set(login.categoryIds))
  const allIds = (categories ?? []).map((c) => c.id)
  const toggle = (id: string) => setSelected((cur) => toggleCategory(cur, id, allIds))
  const apply = () => {
    applyServerCategories(login, [...selected])
    onApplied()
    onClose()
  }
  return (
    <TvPanel title={h('serverCategoriesTitle', { host })} hint={h('serverCategoriesBody')} crumb={host} onBack={onClose} testId="tv-server-categories-panel">
      <TvRow size="panel" init label={h('allCategories')} toggle={selected.size === 0} onToggle={() => setSelected(new Set())} />
      {categories === null ? <TvNote size="panel">{h('listImportProgressUnknown')}</TvNote> : null}
      {(categories ?? []).map((c) => (
        <TvRow key={c.id} size="panel" label={c.name} toggle={isCategorySelected(selected, c.id)} onToggle={() => toggle(c.id)} />
      ))}
      <TvBtns buttons={[
        { label: h('cancel'), style: 'ghost', onOk: onClose },
        { label: h('applyAndFetch'), style: 'accent', onOk: apply },
      ]} />
    </TvPanel>
  )
}

/* ------------------------------------------------------------- L:cats */

type Group = { name: string; count: number }

/**
 * L:cats (facit 2027–2076): sammanfattning, knappraden (Show all · Hide all ·
 * Merge categories, eller i markeringsläge Cancel · Merge N categories),
 * MERGED med Rename → L:name och Split, kategorierna som växlar (eller
 * Mark/Marked i markeringsläge), hjälpnoten och Save. Utkastet är lokalt;
 * Bakåt utan Save kastar det.
 */
export function TvCategoriesPanel({ target, crumb, onClose }: { target: NonNullable<CurationTarget>; crumb?: string; onClose: () => void }) {
  const { list, mode } = target
  const { h, locale } = useHubText()
  const toast = useToast()
  const keyboardAvailable = getTvKeyboardPanel() !== null
  const [groups, setGroups] = useState<Group[] | null>(null)
  const [draft, setDraft] = useState<ListCuration>(() => ({
    hidden: [...(list.curation?.hidden ?? [])],
    merges: (list.curation?.merges ?? []).map((m) => ({ name: m.name, groups: [...m.groups] })),
  }))
  const [marking, setMarking] = useState(false)
  const [marked, setMarked] = useState<string[]>([])
  const [naming, setNaming] = useState<{ edit: number | null } | null>(null)

  useEffect(() => {
    let live = true
    listGroups(list.source ?? null)
      .then((fetched) => { if (live) setGroups(fetched.length > 0 ? fetched : (list.groups ?? [])) })
      .catch(() => { if (live) setGroups(list.groups ?? []) })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.id, list.source])

  const known = useMemo(() => new Set((groups ?? []).map((g) => g.name)), [groups])
  const countOf = useMemo(() => new Map((groups ?? []).map((g) => [g.name, g.count])), [groups])
  const claimed = useMemo(() => new Set(draft.merges.flatMap((m) => m.groups)), [draft.merges])
  const merges = draft.merges
    .map((m, index) => ({ index, name: m.name, members: m.groups.filter((g) => known.has(g)), count: m.groups.reduce((sum, g) => sum + (countOf.get(g) ?? 0), 0) }))
    .filter((m) => m.members.length > 0)
  const plain = (groups ?? []).filter((g) => !claimed.has(g.name)).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  const summary = h('curationSummary', {
    groups: known.size,
    hidden: draft.hidden.filter((g) => known.has(g)).length,
    merged: draft.merges.filter((m) => m.groups.some((g) => known.has(g))).length,
  })

  const toggleHidden = (name: string) => setDraft((d) => ({ ...d, hidden: d.hidden.includes(name) ? d.hidden.filter((g) => g !== name) : [...d.hidden, name] }))
  const toggleMark = (name: string) => setMarked((m) => (m.includes(name) ? m.filter((x) => x !== name) : [...m, name]))
  const startNaming = () => {
    if (marked.length < 2) {
      toast(h('tvMarkAtLeastTwo'))
      return
    }
    if (!keyboardAvailable) {
      toast(h('tvNoKeyboard'))
      return
    }
    setNaming({ edit: null })
  }
  const commitName = (raw: string): boolean => {
    const name = raw.trim()
    if (!naming) return false
    if (naming.edit === null) {
      const conflict = mergeNameConflict(name, groups ?? [], draft, marked)
      if (conflict) {
        toast(conflict === 'empty' ? h('giveCategoryName') : conflict === 'duplicate' ? h('mergeNameTaken') : h('mergeNameIsGroup'))
        return false
      }
      setDraft((d) => ({ ...d, merges: [...d.merges, { name, groups: [...marked] }] }))
      setMarked([])
      setMarking(false)
      toast(h('mergedInto', { name }))
      return true
    }
    if (!name) {
      toast(h('giveCategoryName'))
      return false
    }
    const next = renameMerge(draft, naming.edit, name)
    if (next.merges[naming.edit]?.name !== name) {
      toast(h('mergeNameTaken'))
      return false
    }
    setDraft(next)
    toast(h('renamedTo', { name }))
    return true
  }
  const split = (index: number) => {
    const name = draft.merges[index]?.name ?? ''
    setDraft((d) => ({ ...d, merges: d.merges.filter((_, i) => i !== index) }))
    toast(h('splitDone', { name }))
  }
  const save = () => {
    updateLiveTvListCuration(list.id, normalizeCuration(draft))
    toast(h('categoriesSaved'))
    onClose()
  }
  const dismiss = () => {
    if (mode === 'after-import') markListCurationSeen(list.id)
    onClose()
  }

  const namingMembers = naming ? (naming.edit === null ? marked : (draft.merges[naming.edit]?.groups ?? [])) : []

  return (
    <TvPanel title={h('categoriesTitle', { host: playlistHost(list) })} hint={h('categoriesBody')} crumb={crumb} onBack={dismiss} testId="tv-categories-panel">
      <TvNote size="panel">{groups ? summary : h('listImportProgressUnknown')}</TvNote>
      {mode === 'after-import' ? <TvNote size="panel">{h('curationIntro')}</TvNote> : null}
      {marking ? (
        <TvBtns buttons={[
          { label: h('cancel'), style: 'ghost', onOk: () => { setMarking(false); setMarked([]) } },
          { label: marked.length >= 2 ? h('tvMergeNCategories', { n: marked.length }) : h('tvMarkTwoOrMore'), style: 'accent', onOk: startNaming },
        ]} />
      ) : (
        <TvBtns buttons={[
          { label: h('showAll'), style: 'ghost', onOk: () => setDraft((d) => ({ ...d, hidden: [] })), init: true },
          { label: h('hideAll'), style: 'ghost', onOk: () => setDraft((d) => ({ ...d, hidden: plain.map((g) => g.name) })) },
          { label: h('tvMergeCategories'), style: 'accent', onOk: () => { setMarking(true); setMarked([]) } },
        ]} />
      )}
      {merges.length > 0 ? (
        <>
          <TvEyebrow size="panel">{h('merged')}</TvEyebrow>
          {merges.map((m) => (
            <div key={`m:${m.index}`} style={{ display: 'contents' }}>
              <TvRow size="panel" label={m.name} hint={h('mergedMeta', { members: m.members.join(' · '), channels: fmtInt(m.count, locale) })} value={h('tvRename')} onOk={() => setNaming({ edit: m.index })} disabled={!keyboardAvailable} />
              <TvRow size="panel" label={h('tvSplitName', { name: m.name })} hint={h('tvSplitMeta')} value={h('splitMerge')} onOk={() => split(m.index)} />
            </div>
          ))}
        </>
      ) : null}
      <TvEyebrow size="panel">{marking ? h('tvMarkEyebrow') : h('categories')}</TvEyebrow>
      {groups && groups.length === 0 ? <TvNote size="panel">{h('noCategoriesInList')}</TvNote> : null}
      {plain.map((g) => marking ? (
        <TvRow key={`g:${g.name}`} size="panel" label={g.name} hint={h('channelsCount', { count: fmtInt(g.count, locale) })} value={marked.includes(g.name) ? h('marked') : h('mark')} onOk={() => toggleMark(g.name)} />
      ) : (
        <TvRow key={`g:${g.name}`} size="panel" label={g.name} hint={h('channelsCount', { count: fmtInt(g.count, locale) })} toggle={!draft.hidden.includes(g.name)} onToggle={() => toggleHidden(g.name)} />
      ))}
      <TvNote size="panel">{h('tvMergeHelp')}</TvNote>
      <TvBtns buttons={[{ label: h('save'), style: 'accent', onOk: save, testId: 'tv-categories-save' }]} />
      {naming ? (
        <TvNamePanel
          editing={naming.edit !== null}
          initial={naming.edit !== null ? (draft.merges[naming.edit]?.name ?? '') : ''}
          members={namingMembers}
          onCommit={commitName}
          onClose={() => setNaming(null)}
        />
      ) : null}
    </TvPanel>
  )
}

/* ------------------------------------------------------------- L:name */

/**
 * L:name (facit 1994–2026): värdens tangentbordspanel med knapparna
 * Use “X” (första medlemmen utan `Live: `, bara när fältet är tomt), Clear
 * och Merge / Save name under fältet. Panelens egen Klar-tangent gör samma
 * sak som Merge/Save name. Use/Clear byter panelens startvärde genom att
 * montera om den (panelen äger sitt fält).
 */
export function TvNamePanel({ editing, initial, members, onCommit, onClose }: {
  editing: boolean
  initial: string
  members: string[]
  onCommit: (value: string) => boolean
  onClose: () => void
}) {
  const { h } = useHubText()
  const Keyboard = getTvKeyboardPanel()
  const [seed, setSeed] = useState(0)
  const [prefill, setPrefill] = useState(initial)
  const [value, setValue] = useState(initial)
  const suggest = members.length > 0 ? members[0].replace(/^Live:\s*/, '') : ''
  if (!Keyboard) return null
  const reset = (next: string) => { setPrefill(next); setValue(next); setSeed((n) => n + 1) }
  const commit = (raw: string) => { if (onCommit(raw)) onClose() }
  const extra: ReactNode = (
    <TvBtns buttons={[
      ...(suggest && !value.trim() ? [{ label: h('tvUseName', { name: suggest }), style: 'ghost' as const, onOk: () => reset(suggest) }] : []),
      { label: h('tvClear'), style: 'ghost', onOk: () => reset('') },
      { label: editing ? h('tvSaveName') : h('mergeAction'), style: 'accent', onOk: () => commit(value) },
    ]} />
  )
  return (
    <Keyboard
      key={seed}
      title={editing ? h('tvRenameMerged') : h('tvNameMerged')}
      hint={members.join(' · ')}
      initial={prefill}
      placeholder={h('mergeNameSuggest')}
      onChange={setValue}
      onDone={commit}
      onClose={onClose}
      extra={extra}
      hideFooter
    />
  )
}
