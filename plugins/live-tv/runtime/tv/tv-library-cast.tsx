'use client'

import { useEffect, useState, type ComponentType } from 'react'
import type { TvViewProps } from './tv-shell'
import { TV, dp } from './tv-ui'
import { useTvText } from './tv-strings'

/**
 * Rollistan inne i Live TV.
 *
 * APPENS egen sida (`FullCastPage`), monterad i Live TV-skalet så ikonraden
 * står kvar — inte en kopia. Två rollistor som driver isär vore värre än en
 * delad komponent, och den här bär redan TV-layout, sökning, avdelningsfilter
 * och personvy (design_handoff_full_cast).
 *
 * Laddas dynamiskt: sidan drar in TMDB-kreditlagret och ska inte kosta något
 * för den som aldrig öppnar den. En app som saknar exporten visar en notis i
 * stället för en död yta.
 */
export function TvLibraryCast({ nav, params }: TvViewProps) {
  const { tt } = useTvText()
  const tmdbId = params.tmdbId ?? ''
  const mediaType = params.type === 'tv' ? 'tv' : 'movie'
  const [Page, setPage] = useState<ComponentType<Record<string, unknown>> | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let cancelled = false
    void import('@/lib/plugin-sdk')
      .then((mod) => {
        if (cancelled) return
        const component = (mod as unknown as { FullCastPage?: ComponentType<Record<string, unknown>> }).FullCastPage
        if (component) setPage(() => component)
        else setMissing(true)
      })
      .catch(() => { if (!cancelled) setMissing(true) })
    return () => { cancelled = true }
  }, [])

  const back = () => nav.go('title', { key: params.key ?? '' })

  if (!tmdbId || missing) {
    return (
      <div data-testid="tv-library-cast" style={{ flex: 1, padding: dp(48), fontSize: dp(20), color: TV.dim }}>
        {tt('libraryNoDetails')}
      </div>
    )
  }
  if (!Page) {
    return (
      <div data-testid="tv-library-cast" style={{ flex: 1, padding: dp(48), fontSize: dp(20), color: TV.dim }}>
        {tt('libraryLoading')}
      </div>
    )
  }
  return (
    <div data-testid="tv-library-cast" style={{ flex: 1, minHeight: 0, position: 'relative' }}>
      <Page tmdbId={tmdbId} mediaType={mediaType} initialTitle={params.title ?? ''} onClose={back} />
    </div>
  )
}
