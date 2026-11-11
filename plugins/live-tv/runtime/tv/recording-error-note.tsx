'use client'

import { formatBytes } from '../recordings'
import type { RecordingError } from '../use-channel-recording'
import { TV } from './tv-ui'
import type { TvStringKey } from './tv-strings'

type TT = (key: TvStringKey, vars?: Record<string, string | number>) => string

/**
 * Varför inspelningen inte startade, vid knappen i sex sekunder. 507 från
 * appen = disken ligger redan under marginalen (Jerry 2026-11-10: Mi TV med
 * 1,5 GB ledigt fick "disk full" med noll byte och bara Radera).
 */
export function RecordingErrorNote({ error, ps, tt }: { error: RecordingError; ps: (n: number) => number; tt: TT }) {
  const text = error.kind === 'noSpace'
    ? tt('recNoSpace', { free: formatBytes(error.freeBytes, 'en'), keep: formatBytes(error.keepFreeBytes, 'en') })
    : tt('recStartFailed')
  return (
    <div data-testid="rec-error" role="status" style={{ marginBottom: ps(10), padding: `${ps(8)}px ${ps(12)}px`, borderRadius: ps(10), background: 'rgba(255,92,92,0.16)', border: '1px solid rgba(255,92,92,0.45)', color: TV.text, fontSize: ps(15), maxWidth: ps(640) }}>
      {text}
    </div>
  )
}
