'use client'

import { Card, PillBtn, TOKENS, eyebrowStyle } from '@/lib/plugin-sdk'
import { useTvText } from './tv/tv-strings'
import { useVodLibrarySources } from './hooks/useVodLibrarySources'
import type { VodLibraryRow } from './vod-library-rows'

/**
 * "Använd som bibliotek" på SKRIVBORDET (och telefonen) — fas A3.
 *
 * Samma tillstånd som TV-inställningarnas sektion, ur samma hook, så de två
 * ytorna inte kan visa olika antal för samma källa.
 *
 * Kortet bygger indexet. Det gör INTE biblioteket till startsida: det valet
 * bor i kärnans inställningar (Jerry 2026-09-03). Sista raden pekar dit i
 * stället för att duplicera reglaget här.
 *
 * Texterna kommer ur `tv-strings` trots namnet: `useTvText` beror bara på
 * `useLang()` och fungerar på varje yta. En andra kopia av samma elva nycklar
 * i `hub-strings` hade glidit isär.
 */
export function VodLibraryCard() {
  const { tt, locale } = useTvText()
  const { rows, progress, error, build, disabled } = useVodLibrarySources()
  if (rows.length === 0) return null

  const statusText = (row: VodLibraryRow) => {
    if (progress?.libraryId === row.libraryId) return tt('vodLibraryBuilding', { count: progress.done.toLocaleString(locale) })
    if (row.importing) return tt('vodLibraryImporting')
    if (row.indexedTitles === null) return tt('vodLibraryNotBuilt', { count: row.vodTitles.toLocaleString(locale) })
    return tt('vodLibraryBuilt', { count: row.indexedTitles.toLocaleString(locale) })
  }

  return (
    <Card>
      <div style={{ ...eyebrowStyle, marginBottom: 6 }}>{tt('vodLibraryHeading')}</div>
      <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.5, color: TOKENS.textDim }}>{tt('vodLibraryHint')}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} data-testid="vod-library-desktop">
        {rows.map((row) => (
          <div
            key={row.libraryId}
            data-testid={`vod-library-${row.vodSource}`}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, color: TOKENS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.vodSource}</div>
              <div style={{ fontSize: 12.5, color: TOKENS.textDim }}>{statusText(row)}</div>
            </div>
            <PillBtn
              variant="accent"
              size="sm"
              disabled={disabled(row)}
              onClick={() => { void build(row) }}
            >
              {row.indexedTitles === null ? tt('vodLibraryBuild') : tt('vodLibraryRebuild')}
            </PillBtn>
          </div>
        ))}
      </div>
      <p style={{ margin: '12px 0 0', fontSize: 12.5, color: error ? TOKENS.red : TOKENS.textDim }}>
        {error ? tt('vodLibraryFailed', { error }) : tt('vodLibraryWhereToEnable')}
      </p>
    </Card>
  )
}
