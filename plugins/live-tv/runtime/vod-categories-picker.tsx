'use client'

import { useEffect, useMemo, useState } from 'react'
import { LtBtn, LtCheckMark, LtDialog, LtInput, LtNote, UI, fmtInt } from './settings-ui'
import { getTvKeyboardPanel } from '@/lib/plugin-sdk'
import { useTextPrompt } from './tv/tv-text-entry'
import { TvBtns, TvNote, TvPanel, TvRow } from './tv-settings-ui'
import { useTvText } from './tv/tv-strings'
import { listVodCategories, onVodChanged, vodStatus, type VodCategory, type VodKind, type VodSourceStatus } from './vod-client'
import { ensureVodChoiceMigrated, getVodCategoryChoice, isVodChoiceMade, isVodChoiceMigrated, onVodCategoryChoiceChanged, vodCategoryKey, type VodCategoryMerge } from './vod-category-filter'
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
  const [merges, setMerges] = useState<VodCategoryMerge[]>(() => getVodCategoryChoice(source).merges)
  const [marking, setMarking] = useState(false)
  const [marked, setMarked] = useState<Set<string>>(() => new Set())
  useEffect(() => {
    let live = true
    setCategories(null)
    const choice = getVodCategoryChoice(source)
    setExcluded(new Set(choice.excluded))
    setMerges(choice.merges)
    listVodCategories(source)
      .then((result) => { if (live) setCategories(result.categories) })
      .catch(() => { if (live) setCategories([]) })
    return () => { live = false }
  }, [source])

  const keyOf = (c: VodCategory) => vodCategoryKey(c.id, c.name)
  const byKind = useMemo(() => ({
    movie: (categories ?? []).filter((c) => c.kind === 'movie'),
    series: (categories ?? []).filter((c) => c.kind === 'series'),
  }), [categories])
  const claimed = useMemo(() => new Set(merges.flatMap((m) => m.keys)), [merges])
  /** Sammanslagningarna för en sort, med de medlemmar panelen fortfarande har. */
  const mergesOf = (kind: VodKind) => merges
    .map((m) => {
      const members = byKind[kind].filter((c) => m.keys.includes(keyOf(c)))
      return { name: m.name, members, count: members.reduce((sum, c) => sum + c.count, 0) }
    })
    .filter((m) => m.members.length > 0)
  /** Kategorierna som inte ingår i någon sammanslagning. */
  const plainOf = (kind: VodKind) => byKind[kind].filter((c) => !claimed.has(keyOf(c)))

  const isIn = (c: VodCategory) => !excluded.has(keyOf(c))
  const toggle = (c: VodCategory) => setExcluded((cur) => {
    const next = new Set(cur)
    const key = keyOf(c)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })
  /** "Alla" för en sort: alla med om någon saknas, annars alla bort. */
  const toggleAll = (kind: VodKind) => setExcluded((cur) => {
    const ids = byKind[kind].map(keyOf)
    const allIn = ids.every((id) => !cur.has(id))
    const next = new Set(cur)
    for (const id of ids) {
      if (allIn) next.add(id)
      else next.delete(id)
    }
    return next
  })
  const allIn = (kind: VodKind) => byKind[kind].every(isIn)

  const startMarking = () => { setMarking(true); setMarked(new Set()) }
  const stopMarking = () => { setMarking(false); setMarked(new Set()) }
  const isMarked = (c: VodCategory) => marked.has(keyOf(c))
  const toggleMark = (c: VodCategory) => setMarked((cur) => {
    const next = new Set(cur)
    const key = keyOf(c)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })
  /** Felkod, eller null när sammanslagningen gjordes. */
  const commitMerge = (raw: string): 'few' | 'empty' | 'taken' | null => {
    const name = raw.trim()
    const kinds = new Set((categories ?? []).filter((c) => marked.has(keyOf(c))).map((c) => c.kind))
    if (marked.size < 2 || kinds.size > 1) return 'few'
    if (!name) return 'empty'
    const lower = name.toLowerCase()
    if (merges.some((m) => m.name.toLowerCase() === lower) || (categories ?? []).some((c) => c.name.toLowerCase() === lower && !marked.has(keyOf(c)))) return 'taken'
    const keys = [...marked]
    setMerges((cur) => [...cur.map((m) => ({ ...m, keys: m.keys.filter((k) => !marked.has(k)) })).filter((m) => m.keys.length > 0), { name, keys }])
    stopMarking()
    return null
  }
  const split = (name: string) => setMerges((cur) => cur.filter((m) => m.name !== name))

  // Bara id:n panelen faktiskt har: ett gammalt val för en kategori som inte
  // längre finns ska inte ligga kvar för evigt.
  const save = () => {
    const known = new Set((categories ?? []).map(keyOf))
    const kept = categories && categories.length > 0 ? [...excluded].filter((id) => known.has(id)) : [...excluded]
    return applyVodCategoryChoice(source, kept, merges)
  }
  const includedCount = (categories ?? []).filter(isIn).length
  return {
    categories, byKind, isIn, toggle, toggleAll, allIn, save, includedCount,
    mergesOf, plainOf, marking, startMarking, stopMarking, isMarked, toggleMark, markedCount: marked.size, commitMerge, split,
  }
}

type VodDraft = ReturnType<typeof useVodCategoryDraft>

function mergeErrorText(tt: ReturnType<typeof useTvText>['tt'], code: 'few' | 'empty' | 'taken'): string {
  return code === 'few' ? tt('vodMergeNeedTwo') : code === 'empty' ? tt('mergeNameEmpty') : tt('mergeNameTaken')
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
  const [mergeName, setMergeName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const merges = draft.mergesOf(kind)
  const rows = draft.plainOf(kind)
  const any = draft.byKind[kind].length > 0
  const rowBase = { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', width: '100%', background: 'transparent', border: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' } as const
  const chooseKind = (k: VodKind) => { setKind(k); draft.stopMarking(); setError(null) }
  const merge = () => {
    const code = draft.commitMerge(mergeName)
    if (code) { setError(mergeErrorText(tt, code)); return }
    setMergeName('')
    setError(null)
  }
  return (
    <LtDialog title={`${tt('vodCategoriesTitle')} · ${name}`} body={tt('vodCategoriesHint')} width={620} onClose={onClose} testId="vod-categories-dialog">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <LtBtn onClick={onClose} testId="vod-categories-back" title={tt('back')}>‹ {tt('back')}</LtBtn>
          {(['movie', 'series'] as const).map((k) => (
            <LtBtn key={k} active={kind === k} onClick={() => chooseKind(k)} testId={`vod-categories-kind-${k}`}>
              {k === 'movie' ? tt('vodCategoriesMovies') : tt('vodCategoriesSeries')} ({draft.byKind[k].length})
            </LtBtn>
          ))}
          <span style={{ flex: 1 }} />
          {any ? (
            <LtBtn active={draft.marking} onClick={() => { if (draft.marking) draft.stopMarking(); else draft.startMarking(); setError(null) }} testId="vod-categories-merge-mode">
              {draft.marking ? tt('cancel') : tt('mergeInto')}
            </LtBtn>
          ) : null}
        </div>
        {draft.marking ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <LtInput title={tt('mergeNameLabel')} placeholder={tt('mergeNameLabel')} value={mergeName} onChange={setMergeName} style={{ flex: '1 1 200px' }} />
            <LtBtn variant="accent" onClick={merge} disabled={draft.markedCount < 2} testId="vod-categories-merge">{tt('mergeSelected', { n: draft.markedCount })}</LtBtn>
          </div>
        ) : null}
        {error ? <p role="alert" style={{ margin: 0, fontSize: 12.5, color: UI.danger }}>{error}</p> : null}
        <div style={{ display: 'flex', maxHeight: 340, flexDirection: 'column', overflowY: 'auto', borderRadius: 9, background: UI.inset, padding: '0 12px' }}>
          {draft.categories === null ? <LtNote style={{ padding: '10px 0' }}>{tt('vodCategoriesLoading')}</LtNote> : null}
          {draft.categories !== null && !any ? <LtNote style={{ padding: '10px 0' }}>{tt('vodCategoriesNone')}</LtNote> : null}
          {any && !draft.marking ? (
            <button type="button" role="checkbox" aria-checked={draft.allIn(kind)} onClick={() => draft.toggleAll(kind)} style={{ ...rowBase, color: UI.text }}>
              <LtCheckMark on={draft.allIn(kind)} />
              <span style={{ fontSize: 13.5 }}>{kind === 'movie' ? tt('vodCategoriesAllMovies') : tt('vodCategoriesAllSeries')}</span>
            </button>
          ) : null}
          {merges.map((m) => (
            <div key={`m:${m.name}`} style={{ ...rowBase, cursor: 'default', borderTop: `1px solid ${UI.lineSoft}`, color: UI.text }}>
              <LtCheckMark on />
              <span style={{ fontSize: 13.5, minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.name}
                <span style={{ color: UI.muted, fontSize: 12.5 }}> · {tt('mergeContains', { groups: m.members.map((c) => c.name).join(', ') })}</span>
              </span>
              <span style={{ fontSize: 12.5, color: UI.muted }}>{fmtInt(m.count, locale)}</span>
              <LtBtn onClick={() => draft.split(m.name)} testId={`vod-categories-split-${m.name}`}>{tt('splitMerge')}</LtBtn>
            </div>
          ))}
          {rows.map((c) => {
            const on = draft.marking ? draft.isMarked(c) : draft.isIn(c)
            return (
              <button key={c.id} type="button" role="checkbox" aria-checked={on} aria-label={c.name} onClick={() => (draft.marking ? draft.toggleMark(c) : draft.toggle(c))} style={{ ...rowBase, borderTop: `1px solid ${UI.lineSoft}`, color: on ? UI.text : UI.muted }}>
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
 * Panelen i TV-skalet, byggd som spellistans kategoripanel (tv-curation-
 * picker.tsx): Spara / Avbryt / Slå ihop till… överst, sammanslagningarna
 * (OK = dela upp) och sedan kategorierna. En ‹ i rubriken går tillbaka utan
 * att spara — samma som Bakåt. Sorten byts med chipsen.
 */
export function TvVodCategoryPicker({ nav, source, onClose }: { nav: TvNav; source: string; onClose: () => void }) {
  const { tt, locale } = useTvText()
  const draft = useVodCategoryDraft(source)
  const keyboard = useTextPrompt({ pushLayer: nav.pushLayer })
  const [kind, setKind] = useState<VodKind>('movie')
  const [error, setError] = useState<string | null>(null)
  const merges = draft.mergesOf(kind)
  const rows = draft.plainOf(kind)
  const any = draft.byKind[kind].length > 0
  const rowStyle = { height: dp(64), minHeight: dp(64), borderRadius: dp(12), display: 'flex', alignItems: 'center', gap: dp(14), padding: `0 ${dp(12)}px`, fontSize: dp(19), cursor: 'pointer' } as const
  const finishMerge = () => {
    if (draft.markedCount < 2) { setError(tt('vodMergeNeedTwo')); return }
    keyboard.ask(tt('mergeNameLabel'), '', (value) => {
      const code = draft.commitMerge(value)
      setError(code ? mergeErrorText(tt, code) : null)
    })
  }
  return (
    <>
    <PickerPanel
      nav={nav}
      title={tt('vodCategoriesTitle')}
      testId="vod-categories-picker"
      backButton={tt('back')}
      onClose={onClose}
      chips={(
        <div data-row="" style={{ display: 'flex', gap: dp(8) }}>
          {(['movie', 'series'] as const).map((k) => (
            <Chip key={k} active={kind === k} {...station(() => { setKind(k); draft.stopMarking(); setError(null) })} style={{ height: dp(40), minHeight: dp(40), fontSize: dp(16), padding: `0 ${dp(18)}px` }}>
              {k === 'movie' ? tt('vodCategoriesMovies') : tt('vodCategoriesSeries')} ({draft.byKind[k].length})
            </Chip>
          ))}
        </div>
      )}
      rows={(close) => (
        <>
          <div data-testid="vod-picker-save" {...station(() => { if (draft.categories !== null) void draft.save(); close() }, undefined, { 'data-init': '' })} style={{ ...rowStyle, color: TV.acc }}>{tt('vodCategoriesSave')}</div>
          <div data-testid="vod-picker-cancel" {...station(close)} style={rowStyle}>{tt('vodCategoriesCancel')}</div>
          {any ? (
            <div data-testid="vod-picker-merge-mode" {...station(() => { if (draft.marking) draft.stopMarking(); else draft.startMarking(); setError(null) })} style={{ ...rowStyle, color: draft.marking ? TV.acc : undefined }}>
              {tt('mergeInto')}
            </div>
          ) : null}
          {draft.marking ? (
            <div data-testid="vod-picker-merge-done" {...station(finishMerge)} style={{ ...rowStyle, color: draft.markedCount >= 2 ? TV.acc : TV.dim }}>
              {tt('mergeSelected', { n: draft.markedCount })}
            </div>
          ) : null}
          {error ? <div role="alert" style={{ padding: dp(12), fontSize: dp(16), color: '#fca5a5' }}>{error}</div> : null}
          {draft.categories === null ? <div style={{ padding: dp(12), fontSize: dp(17), color: TV.dim }}>{tt('vodCategoriesLoading')}</div> : null}
          {draft.categories !== null && !any ? <div style={{ padding: dp(12), fontSize: dp(17), color: TV.dim }}>{tt('vodCategoriesNone')}</div> : null}
          {any && !draft.marking ? (
            <div data-testid="vod-picker-all" {...station(() => draft.toggleAll(kind))} style={rowStyle}>
              <Check on={draft.allIn(kind)} label="all" />
              {kind === 'movie' ? tt('vodCategoriesAllMovies') : tt('vodCategoriesAllSeries')}
            </div>
          ) : null}
          {merges.map((m) => (
            <div key={`m:${m.name}`} data-testid={`vod-picker-merge-${m.name}`} {...station(() => draft.split(m.name))} style={rowStyle}>
              <Check on label={m.name} />
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.name}
                <span style={{ color: TV.dim, fontSize: dp(15) }}> · {tt('mergeContains', { groups: m.members.map((c) => c.name).join(', ') })} · {tt('splitMerge')}</span>
              </span>
              <span style={{ fontSize: dp(16), color: TV.dim }}>{fmtInt(m.count, locale)}</span>
            </div>
          ))}
          {rows.map((c) => (
            <div key={c.id} data-testid={`vod-picker-row-${c.name}`} {...station(() => (draft.marking ? draft.toggleMark(c) : draft.toggle(c)))} style={rowStyle}>
              <Check on={draft.marking ? draft.isMarked(c) : draft.isIn(c)} label={c.name} />
              <span style={{ minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
              <span style={{ fontSize: dp(16), color: TV.dim }}>{fmtInt(c.count, locale)}</span>
            </div>
          ))}
        </>
      )}
    />
    {keyboard.node}
    </>
  )
}

/* ------------------------------------------- appens TV-inställningsrader */

export function TvVodCategoriesPanel({ source, name, onClose }: { source: string; name: string; onClose: () => void }) {
  const { tt, locale } = useTvText()
  const draft = useVodCategoryDraft(source)
  const [kind, setKind] = useState<VodKind>('movie')
  const [naming, setNaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const Keyboard = getTvKeyboardPanel()
  const merges = draft.mergesOf(kind)
  const rows = draft.plainOf(kind)
  const any = draft.byKind[kind].length > 0
  return (
    <TvPanel title={tt('vodCategoriesTitle')} hint={tt('vodCategoriesHint')} crumb={name} onBack={onClose} testId="tv-vod-categories-panel">
      <TvRow
        size="panel"
        init
        label={kind === 'movie' ? tt('vodCategoriesMovies') : tt('vodCategoriesSeries')}
        value={`${kind === 'movie' ? tt('vodCategoriesSeries') : tt('vodCategoriesMovies')} ›`}
        onOk={() => { setKind(kind === 'movie' ? 'series' : 'movie'); draft.stopMarking(); setError(null) }}
      />
      {draft.marking ? (
        <TvBtns buttons={[
          { label: tt('cancel'), style: 'ghost', onOk: () => { draft.stopMarking(); setError(null) } },
          { label: tt('mergeSelected', { n: draft.markedCount }), style: 'accent', onOk: () => { if (draft.markedCount < 2) setError(tt('vodMergeNeedTwo')); else if (Keyboard) setNaming(true) } },
        ]} />
      ) : any && Keyboard ? (
        <TvRow size="panel" label={tt('mergeInto')} onOk={() => { draft.startMarking(); setError(null) }} />
      ) : null}
      {error ? <TvNote size="panel" tone="danger">{error}</TvNote> : null}
      {draft.categories === null ? <TvNote size="panel">{tt('vodCategoriesLoading')}</TvNote> : null}
      {draft.categories !== null && !any ? <TvNote size="panel">{tt('vodCategoriesNone')}</TvNote> : null}
      {any && !draft.marking ? (
        <TvRow size="panel" label={kind === 'movie' ? tt('vodCategoriesAllMovies') : tt('vodCategoriesAllSeries')} toggle={draft.allIn(kind)} onToggle={() => draft.toggleAll(kind)} />
      ) : null}
      {merges.map((m) => (
        <TvRow key={`m:${m.name}`} size="panel" label={m.name} hint={tt('mergeContains', { groups: m.members.map((c) => c.name).join(', ') })} value={tt('splitMerge')} onOk={() => draft.split(m.name)} />
      ))}
      {rows.map((c) => (
        <TvRow key={c.id} size="panel" label={c.name} hint={fmtInt(c.count, locale)} toggle={draft.marking ? draft.isMarked(c) : draft.isIn(c)} onToggle={() => (draft.marking ? draft.toggleMark(c) : draft.toggle(c))} />
      ))}
      <TvBtns buttons={[
        { label: tt('vodCategoriesCancel'), style: 'ghost', onOk: onClose },
        { label: tt('vodCategoriesSave'), style: 'accent', onOk: () => { void draft.save(); onClose() } },
      ]} />
      {naming && Keyboard ? (
        <Keyboard
          title={tt('mergeNameLabel')}
          hint={tt('mergeNameLabel')}
          placeholder=""
          initial=""
          onDone={(value) => { const code = draft.commitMerge(value); setError(code ? mergeErrorText(tt, code) : null); setNaming(false) }}
          onClose={() => setNaming(false)}
        />
      ) : null}
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
  // Migreringen kör vid pluginstart; misslyckades den där (värden svarade
  // inte) görs den här, annars hade uppmaningen aldrig kunnat visas.
  useEffect(() => {
    if (!isVodChoiceMigrated()) void ensureVodChoiceMigrated(vodStatus).then(() => setNonce((n) => n + 1)).catch(() => {})
  }, [])
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

/** Har källan film eller serier i indexet? Styr om kategoridialogerna visar vägen hit. */
export function useSourceHasVod(source: string | null | undefined): boolean {
  const [has, setHas] = useState(false)
  useEffect(() => {
    if (!source) { setHas(false); return }
    let live = true
    listVodCategories(source)
      .then((result) => { if (live) setHas(result.total > 0) })
      .catch(() => { if (live) setHas(false) })
    return () => { live = false }
  }, [source])
  return has
}
