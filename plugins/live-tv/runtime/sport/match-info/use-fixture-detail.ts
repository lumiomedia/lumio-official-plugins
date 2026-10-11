'use client'

import { useEffect, useState } from 'react'
import { useResultsController } from '../results-controller'
import { usePollDemand } from '../live-poller'
import type { FixtureDetail, ProviderId } from '../provider'
import type { SportMatch } from '../sport-model'

export type DetailState = 'none' | 'loading' | 'ready'

/**
 * Matchinfons ENDA källanrop: fixturen (fotboll: händelser, statistik och
 * uppställningar i ett anrop). Alla undersidor läser samma svar — inga
 * fler anrop när man går in i Händelser, Laguppställningar eller Arena.
 */
export function useFixtureDetail(match: SportMatch): { detail: FixtureDetail | null; state: DetailState } {
  const controller = useResultsController()
  const [detail, setDetail] = useState<FixtureDetail | null>(null)
  const [done, setDone] = useState(false)
  const covered = match.coverage === 'full' && !!match.fixture
  usePollDemand('match-center', covered && match.status === 'live')

  useEffect(() => {
    if (!covered || !controller || !match.fixture) return
    let cancelled = false
    void controller.loadFixture(match.kind, { provider: match.fixture.provider as ProviderId, id: match.fixture.id }, match.status === 'finished').then((d) => {
      if (cancelled) return
      setDetail(d)
      setDone(true)
    })
    return () => { cancelled = true }
    // Pågående match: hämta om BARA när ställning eller status ändras. Minuten
    // ändras vid varje livepollning, och en omhämtning per pollning dubblade
    // förbrukningen. Omhämtningen räknas som live i kvothanteraren.
  }, [covered, controller, match.kind, match.fixture?.id, match.status, match.score?.home, match.score?.away])

  if (!covered || !controller) return { detail: null, state: 'none' }
  return { detail, state: detail || done ? 'ready' : 'loading' }
}
