import { describe, expect, it } from 'vitest'
import { DEAD_TTL_MS, dropDeadFiles, isDeadUnlock, MAX_DEAD, pruneDead } from './dead-files'
import type { PoolItem } from './pool'

const item = (ref: string, play: PoolItem['play']): PoolItem =>
  ({ ref, title: ref, kind: 'movie', source: 'debrid', genres: [], year: null, runtimeMin: 90, runtimeKnown: true, play } as PoolItem)

describe('döda molnfiler', () => {
  it('bara ett tydligt "finns inte" är dött; nyckel, anropsgräns, server och nät är tillfälliga', () => {
    expect(isDeadUnlock(404, null)).toBe(true)
    expect(isDeadUnlock(410, null)).toBe(true)
    expect(isDeadUnlock(503, { error_code: 7 })).toBe(false)
    expect(isDeadUnlock(400, { error: 'unknown_ressource', error_code: 7 })).toBe(true)
    expect(isDeadUnlock(200, { success: false, error: 'DOWNLOAD_NOT_FOUND', detail: 'No torrent found' })).toBe(true)
    expect(isDeadUnlock(200, { status: 'error', error: { code: 'LINK_DOWN', message: 'This link is not available on the file hoster website' } })).toBe(false)
    expect(isDeadUnlock(401, { error: 'not found' })).toBe(false)
    expect(isDeadUnlock(429, null)).toBe(false)
    expect(isDeadUnlock(0, 'TypeError: Load failed')).toBe(false)
    expect(isDeadUnlock(200, { success: false, error: 'DATABASE_ERROR' })).toBe(false)
  })

  it('minnet gäller ett dygn och håller högst MAX_DEAD', () => {
    const now = 10 * DEAD_TTL_MS
    expect(pruneDead({ a: now - 1000, b: now - DEAD_TTL_MS - 1 }, now)).toEqual({ a: now - 1000 })
    const many = Object.fromEntries(Array.from({ length: MAX_DEAD + 5 }, (_, i) => [`k${i}`, now - i]))
    const kept = pruneDead(many, now)
    expect(Object.keys(kept)).toHaveLength(MAX_DEAD)
    expect('k0' in kept && !(`k${MAX_DEAD + 4}` in kept)).toBe(true)
  })

  it('en död huvudfil ger nästa version samma ref; utan levande version faller posten', () => {
    const dead = { 'torbox:1|378': 1 }
    const keep = item('db:torbox:1|378', { type: 'debrid', provider: 'torbox', fileRef: '1|378', alts: [{ provider: 'torbox', fileRef: '2|5' }] })
    const gone = item('db:torbox:1|378b', { type: 'debrid', provider: 'torbox', fileRef: '1|378' })
    const lib = item('lib:x', { type: 'library', key: 'x', mediaType: 'movie' })
    const out = dropDeadFiles([keep, gone, lib], dead)
    expect(out.map((i) => i.ref)).toEqual(['db:torbox:1|378', 'lib:x'])
    expect(out[0]!.play).toEqual({ type: 'debrid', provider: 'torbox', fileRef: '2|5' })
    const same = [lib]
    expect(dropDeadFiles(same, dead)).toBe(same)
  })
})
