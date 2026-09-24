'use client'

import { LtBtn, LtCard, LtNote, LtSection, UI, fmtInt, useToast } from './settings-ui'
import { useHubText } from './hub-strings'
import { useTvText } from './tv/tv-strings'
import { useVodLibrarySources } from './hooks/useVodLibrarySources'
import type { VodLibraryRow } from './vod-library-rows'

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
export function VodLibraryCard() {
  const { h, locale } = useHubText()
  const { tt } = useTvText()
  const toast = useToast()
  const { rows, progress, error, build, disabled } = useVodLibrarySources()
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
      <LtSection eyebrow={h('useAsLibrary')} hint={h('useAsLibraryHint')} />
      <LtCard gap={12} testId="vod-library-desktop">
        {rows.map((row) => (
          <div key={row.libraryId} data-testid={`vod-library-${row.vodSource}`} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
            <div style={{ minWidth: 0, flex: '1 1 12rem' }}>
              <p style={{ margin: 0, fontSize: 13.5, color: UI.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.label}</p>
              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: UI.muted }}>{statusText(row)}</p>
            </div>
            <LtBtn variant="accent" style={{ padding: '7px 14px', fontSize: 12.5 }} disabled={disabled(row)} onClick={() => { void run(row) }}>
              {row.indexedTitles === null ? tt('vodLibraryBuild') : tt('vodLibraryRebuild')}
            </LtBtn>
          </div>
        ))}
        <LtNote style={error ? { color: UI.danger } : undefined}>{error ? tt('vodLibraryFailed', { error }) : tt('vodLibraryWhereToEnable')}</LtNote>
      </LtCard>
    </div>
  )
}
