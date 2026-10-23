'use client'

import { LtBtn, LtCard, LtNote, LtSection, UI, fmtInt, useToast } from './settings-ui'
import { useHubText } from './hub-strings'
import { useTvText } from './tv/tv-strings'
import { useVodLibrarySources, type VodLibraryController } from './hooks/useVodLibrarySources'
import type { VodLibraryRow } from './vod-library-rows'
import { useState } from 'react'
import { VodCategoriesDialog, usePendingVodSources } from './vod-categories-picker'
import { applyVodCategoryChoice } from './vod-category-apply'

/**
 * USE AS LIBRARY på skrivbordet och telefonen (handoff §3 block 6): rubrik +
 * note, ett kort med värden, `N titles ready to index` / `Library built · N
 * titles indexed` och Build library / Rebuild, och noten om var läget slås
 * på — kortet bygger indexet, det gör INTE biblioteket till startsida (det
 * valet bor i kärnans inställningar, Jerry 2026-09-03).
 *
 * Samma hook som TV-inställningarnas sektion, så de två ytorna inte kan visa
 * olika antal för samma källa.
 */
export function VodLibraryCard({ bare = false }: { bare?: boolean } = {}) {
  return <VodLibraryCardView controller={useVodLibrarySources()} bare={bare} />
}

/** Kortet med en kontroller utifrån — inställningssidan läser samma hook för sektionens sammanfattning. */
export function VodLibraryCardView({ controller, bare = false }: { controller: VodLibraryController; bare?: boolean }) {
  const { h, locale } = useHubText()
  const { tt } = useTvText()
  const toast = useToast()
  const { rows, progress, error, build, disabled } = controller
  const [catsFor, setCatsFor] = useState<VodLibraryRow | null>(null)
  const pending = new Set(usePendingVodSources().map((source) => source.id))
  if (rows.length === 0) return null

  const statusText = (row: VodLibraryRow) => {
    if (progress?.libraryId === row.libraryId) return tt('vodLibraryBuilding', { count: fmtInt(progress.done, locale) })
    if (row.importing) return tt('vodLibraryImporting')
    if (row.indexedTitles === null) return h('titlesReady', { count: fmtInt(row.vodTitles, locale) })
    return h('libraryBuilt', { count: fmtInt(row.indexedTitles, locale) })
  }
  const run = async (row: VodLibraryRow) => {
    await build(row)
    toast(h('libraryBuiltToast', { count: fmtInt(row.vodTitles, locale) }))
  }

  return (
    <div>
      {bare ? <LtSection hint={h('useAsLibraryHint')} /> : <LtSection eyebrow={h('useAsLibrary')} hint={h('useAsLibraryHint')} />}
      <LtCard gap={12} testId="vod-library-desktop">
        {rows.map((row) => (
          <div key={row.libraryId} data-testid={`vod-library-${row.vodSource}`} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
            <div style={{ minWidth: 0, flex: '1 1 12rem' }}>
              <p style={{ margin: 0, fontSize: 13.5, color: UI.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.label}</p>
              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: UI.muted }}>{statusText(row)}</p>
            </div>
            <LtBtn style={{ padding: '7px 14px', fontSize: 12.5 }} testId={`vod-categories-${row.vodSource}`} onClick={() => setCatsFor(row)}>
              {tt('vodCategoriesButton')}
            </LtBtn>
            <LtBtn variant="accent" style={{ padding: '7px 14px', fontSize: 12.5 }} disabled={disabled(row)} onClick={() => { void run(row) }}>
              {row.indexedTitles === null ? tt('vodLibraryBuild') : tt('vodLibraryRebuild')}
            </LtBtn>
            {pending.has(row.vodSource) ? (
              <div data-testid={`vod-choice-pending-${row.vodSource}`} style={{ flexBasis: '100%', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9, background: UI.inset }}>
                <p style={{ margin: 0, flex: '1 1 16rem', fontSize: 12.5, color: UI.text }}>
                  {tt('vodChoicePendingBody', { count: fmtInt(row.vodTitles, locale), name: row.label })}
                </p>
                <LtBtn variant="accent" style={{ padding: '7px 14px', fontSize: 12.5 }} onClick={() => setCatsFor(row)}>{tt('vodChoiceChoose')}</LtBtn>
                <LtBtn style={{ padding: '7px 14px', fontSize: 12.5 }} onClick={() => { void applyVodCategoryChoice(row.vodSource, []) }}>{tt('vodChoiceIncludeAll')}</LtBtn>
              </div>
            ) : null}
          </div>
        ))}
        <LtNote style={error ? { color: UI.danger } : undefined}>{error ? tt('vodLibraryFailed', { error }) : tt('vodLibraryWhereToEnable')}</LtNote>
      </LtCard>
      {catsFor ? <VodCategoriesDialog source={catsFor.vodSource} name={catsFor.label} onClose={() => setCatsFor(null)} /> : null}
    </div>
  )
}
