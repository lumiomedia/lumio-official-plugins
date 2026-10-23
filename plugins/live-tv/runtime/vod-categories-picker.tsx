'use client'

import { useEffect, useMemo, useState } from 'react'
import { LtBtn, LtCheckMark, LtDialog, LtNote, UI, fmtInt } from './settings-ui'
import { TvBtns, TvNote, TvPanel, TvRow } from './tv-settings-ui'
import { useTvText } from './tv/tv-strings'
import { listVodCategories, onVodChanged, vodStatus, type VodCategory, type VodKind, type VodSourceStatus } from './vod-client'
import { getVodCategoryChoice, isVodChoiceMade, isVodChoiceMigrated, onVodCategoryChoiceChanged } from './vod-category-filter'
import { applyVodCategoryChoice } from './vod-category-apply'
import type { TvNav } from './tv/tv-shell'
import { Check, PickerPanel } from './tv/picker-panel'
import { Chip, TV, dp, station } from './tv/tv-ui'

/**
 * VÄLJAREN för film- och seriekategorier — samma utkast på tre ytor:
 * skrivbordets dialog, TV-skalets panel (även telefon) och appens
 * TV-inställningsrader. Kategorierna läses ur värdens VOD-index, ofiltrerade:
 * en bortvald kategori ska gå att välja tillbaka.
 *
 * Utkastet sparas först med Spara (skrivbord/TV-rader) eller när panelen
 * stängs (TV-skalet, där Bakåt är enda vägen ut) — och ett sparat val räknas
 * alltid som ett val, också "allt med". Det är det som släpper det väntande
 * bibliotekssvepet för en ny spellista.
 */
export function useVodCategoryDraft(source: string) {
  const [categories, setCategories] = useState<VodCategory[] | null>(null)
  const [excluded, setExcluded] = useState<Set<string>>(() => new Set(getVodCategoryChoice(source).excluded))
  useEffect(() => {
    let live = true
    setCategories(null)
    setExcluded(new Set(getVodCategoryChoice(source).excluded))
    listVodCategories(source)
      .then((result) => { if (live) setCategories(result.categories) })
      .catch(() => { if (live) setCategories([]) })
    return () => { live = false }
  }, [source])

  const byKind = useMemo(() => ({
    movie: (categories ?? []).filter((c) => c.kind === 'movie'),
    series: (categories ?? []).filter((c) => c.kind === 'series'),
  }), [categories])

  const toggle = (id: string) => setExcluded((cur) => {
    const next = new Set(cur)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
  /** "Alla" för en sort: alla med om någon saknas, annars alla bort. */
  const toggleAll = (kind: VodKind) => setExcluded((cur) => {
    const ids = byKind[kind].map((c) => c.id)
    const allIn = ids.every((id) => !cur.has(id))
    const next = new Set(cur)
    for (const id of ids) {
      if (allIn) next.add(id)
      else next.delete(id)
    }
    return next
  })
  const allIn = (kind: VodKind) => byKind[kind].every((c) => !excluded.has(c.id))
  // Bara id:n panelen faktiskt har: ett gammalt val för en kategori som inte
  // längre finns ska inte ligga kvar för evigt.
  const save = () => {
    const known = new Set((categories ?? []).map((c) => c.id))
    const kept = categories && categories.length > 0 ? [...excluded].filter((id) => known.has(id)) : [...excluded]
    return applyVodCategoryChoice(source, kept)
  }
  const includedCount = (categories ?? []).filter((c) => !excluded.has(c.id)).length
  return { categories, byKind, excluded, toggle, toggleAll, allIn, save, includedCount }
}

/** "3 av 120 kategorier" — utan hämtning, ur det sparade valet. */
export function vodCategoriesSummary(tt: ReturnType<typeof useTvText>['tt'], excludedCount: number, total: number | null): string {
  if (total === null || total === 0) return ''
  return tt('vodCategoriesSummary', { included: Math.max(0, total - excludedCount), total })
}

/* ------------------------------------------------------------ skrivbord */

export function VodCategoriesDialog({ source, name, onClose }: { source: string; name: string; onClose: () => void }) {
  const { tt, locale } = useTvText()
  const draft = useVodCategoryDraft(source)
  const [kind, setKind] = useState<VodKind>('movie')
  const rows = draft.byKind[kind]
  const rowBase = { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', width: '100%', background: 'transparent', border: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' } as const
  return (
    <LtDialog title={`${tt('vodCategoriesTitle')} · ${name}`} body={tt('vodCategoriesHint')} width={620} onClose={onClose} testId="vod-categories-dialog">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['movie', 'series'] as const).map((k) => (
            <LtBtn key={k} active={kind === k} onClick={() => setKind(k)} testId={`vod-categories-kind-${k}`}>
              {k === 'movie' ? tt('vodCategoriesMovies') : tt('vodCategoriesSeries')} ({draft.byKind[k].length})
            </LtBtn>
          ))}
        </div>
        <div style={{ display: 'flex', maxHeight: 340, flexDirection: 'column', overflowY: 'auto', borderRadius: 9, background: UI.inset, padding: '0 12px' }}>
          {draft.categories === null ? <LtNote style={{ padding: '10px 0' }}>{tt('vodCategoriesLoading')}</LtNote> : null}
          {draft.categories !== null && rows.length === 0 ? <LtNote style={{ padding: '10px 0' }}>{tt('vodCategoriesNone')}</LtNote> : null}
          {rows.length > 0 ? (
            <button type="button" role="checkbox" aria-checked={draft.allIn(kind)} onClick={() => draft.toggleAll(kind)} style={{ ...rowBase, color: UI.text }}>
              <LtCheckMark on={draft.allIn(kind)} />
              <span style={{ fontSize: 13.5 }}>{kind === 'movie' ? tt('vodCategoriesAllMovies') : tt('vodCategoriesAllSeries')}</span>
            </button>
          ) : null}
          {rows.map((c) => {
            const on = !draft.excluded.has(c.id)
            return (
              <button key={c.id} type="button" role="checkbox" aria-checked={on} aria-label={c.name} onClick={() => draft.toggle(c.id)} style={{ ...rowBase, borderTop: `1px solid ${UI.lineSoft}`, color: on ? UI.text : UI.muted }}>
                <LtCheckMark on={on} />
                <span style={{ fontSize: 13.5, minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                <span style={{ fontSize: 12.5, color: UI.muted }}>{fmtInt(c.count, locale)}</span>
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <LtBtn size="md" onClick={onClose}>{tt('vodCategoriesCancel')}</LtBtn>
          <LtBtn size="md" variant="accent" testId="vod-categories-save" disabled={draft.categories === null} onClick={() => { void draft.save(); onClose() }}>{tt('vodCategoriesSave')}</LtBtn>
        </div>
      </div>
    </LtDialog>
  )
}

/* ------------------------------------------------- TV-skalet och telefonen */

/**
 * Panelen i TV-skalet. Sorten byts med chipsen överst; valet sparas när
 * panelen stängs, eftersom Bakåt är den enda vägen ut ur en PickerPanel.
 */
export function TvVodCategoryPicker({ nav, source, onClose }: { nav: TvNav; source: string; onClose: () => void }) {
  const { tt, locale } = useTvText()
  const draft = useVodCategoryDraft(source)
  const [kind, setKind] = useState<VodKind>('movie')
  const rows = draft.byKind[kind]
  const rowStyle = { height: dp(64), minHeight: dp(64), borderRadius: dp(12), display: 'flex', alignItems: 'center', gap: dp(14), padding: `0 ${dp(12)}px`, fontSize: dp(19), cursor: 'pointer' } as const
  return (
    <PickerPanel
      nav={nav}
      title={tt('vodCategoriesTitle')}
      testId="vod-categories-picker"
      onClose={() => { if (draft.categories !== null) void draft.save(); onClose() }}
      chips={(
        <div data-row="" style={{ display: 'flex', gap: dp(8) }}>
          {(['movie', 'series'] as const).map((k) => (
            <Chip key={k} active={kind === k} {...station(() => setKind(k))} style={{ height: dp(40), minHeight: dp(40), fontSize: dp(16), padding: `0 ${dp(18)}px` }}>
              {k === 'movie' ? tt('vodCategoriesMovies') : tt('vodCategoriesSeries')} ({draft.byKind[k].length})
            </Chip>
          ))}
        </div>
      )}
      rows={(
        <>
          {draft.categories === null ? <div style={{ padding: dp(12), fontSize: dp(17), color: TV.dim }}>{tt('vodCategoriesLoading')}</div> : null}
          {draft.categories !== null && rows.length === 0 ? <div style={{ padding: dp(12), fontSize: dp(17), color: TV.dim }}>{tt('vodCategoriesNone')}</div> : null}
          {rows.length > 0 ? (
            <div data-testid="vod-picker-all" {...station(() => draft.toggleAll(kind), undefined, { 'data-init': '' })} style={rowStyle}>
              <Check on={draft.allIn(kind)} label="all" />
              {kind === 'movie' ? tt('vodCategoriesAllMovies') : tt('vodCategoriesAllSeries')}
            </div>
          ) : null}
          {rows.map((c) => (
            <div key={c.id} data-testid={`vod-picker-row-${c.name}`} {...station(() => draft.toggle(c.id))} style={rowStyle}>
              <Check on={!draft.excluded.has(c.id)} label={c.name} />
              <span style={{ minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
              <span style={{ fontSize: dp(16), color: TV.dim }}>{fmtInt(c.count, locale)}</span>
            </div>
          ))}
        </>
      )}
    />
  )
}

/* ------------------------------------------- appens TV-inställningsrader */

export function TvVodCategoriesPanel({ source, name, onClose }: { source: string; name: string; onClose: () => void }) {
  const { tt, locale } = useTvText()
  const draft = useVodCategoryDraft(source)
  const [kind, setKind] = useState<VodKind>('movie')
  const rows = draft.byKind[kind]
  return (
    <TvPanel title={tt('vodCategoriesTitle')} hint={tt('vodCategoriesHint')} crumb={name} onBack={onClose} testId="tv-vod-categories-panel">
      <TvRow
        size="panel"
        init
        label={kind === 'movie' ? tt('vodCategoriesMovies') : tt('vodCategoriesSeries')}
        value={`${kind === 'movie' ? tt('vodCategoriesSeries') : tt('vodCategoriesMovies')} ›`}
        onOk={() => setKind(kind === 'movie' ? 'series' : 'movie')}
      />
      {draft.categories === null ? <TvNote size="panel">{tt('vodCategoriesLoading')}</TvNote> : null}
      {draft.categories !== null && rows.length === 0 ? <TvNote size="panel">{tt('vodCategoriesNone')}</TvNote> : null}
      {rows.length > 0 ? (
        <TvRow size="panel" label={kind === 'movie' ? tt('vodCategoriesAllMovies') : tt('vodCategoriesAllSeries')} toggle={draft.allIn(kind)} onToggle={() => draft.toggleAll(kind)} />
      ) : null}
      {rows.map((c) => (
        <TvRow key={c.id} size="panel" label={c.name} hint={fmtInt(c.count, locale)} toggle={!draft.excluded.has(c.id)} onToggle={() => draft.toggle(c.id)} />
      ))}
      <TvBtns buttons={[
        { label: tt('vodCategoriesCancel'), style: 'ghost', onOk: onClose },
        { label: tt('vodCategoriesSave'), style: 'accent', onOk: () => { void draft.save(); onClose() } },
      ]} />
    </TvPanel>
  )
}

/* ------------------------------------------------------- väntande val */

/**
 * Källor vars film och serier har kommit in men väntar på ett kategorival —
 * en spellista som lagts till efter den här versionen. Uppmaningen visas där
 * man ser biblioteket; svepet startar först när valet är gjort.
 */
export function usePendingVodSources(): VodSourceStatus[] {
  const [sources, setSources] = useState<VodSourceStatus[]>([])
  const [nonce, setNonce] = useState(0)
  useEffect(() => onVodCategoryChoiceChanged(() => setNonce((n) => n + 1)), [])
  useEffect(() => {
    let live = true
    const load = () => {
      void vodStatus()
        .then((all) => { if (live) setSources(all) })
        .catch(() => { if (live) setSources([]) })
    }
    load()
    const off = onVodChanged(load)
    return () => { live = false; off() }
  }, [nonce])
  if (!isVodChoiceMigrated()) return []
  return sources.filter((s) => s.total > 0 && !s.importing && !isVodChoiceMade(s.id))
}
