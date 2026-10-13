'use client'
import { useEffect } from 'react'

/** Vad TV:n visar, för telefonens sportläge (Soffläge): Sport-sidan och Multiview markerar sig själva. */
type Kind = 'sport-page' | 'multiview'
const counts = new Map<Kind, number>()
const listeners = new Set<() => void>()
const emit = () => { for (const cb of [...listeners]) cb() }

export function acquireCouchMark(kind: Kind): () => void {
  counts.set(kind, (counts.get(kind) ?? 0) + 1)
  emit()
  let done = false
  return () => {
    if (done) return
    done = true
    const n = (counts.get(kind) ?? 1) - 1
    if (n <= 0) counts.delete(kind)
    else counts.set(kind, n)
    emit()
  }
}

export function useCouchMark(kind: Kind, active: boolean): void {
  useEffect(() => (active ? acquireCouchMark(kind) : undefined), [kind, active])
}

export const couchMarks = (): { sportPage: boolean; multiview: boolean } => ({ sportPage: counts.has('sport-page'), multiview: counts.has('multiview') })

export function onCouchMarksChanged(cb: () => void): () => void {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

export function __resetCouchMarksForTests(): void { counts.clear(); listeners.clear() }
