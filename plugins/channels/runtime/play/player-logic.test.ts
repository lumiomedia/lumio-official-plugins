import { describe, expect, it } from 'vitest'
import { endOfSourceAction, neighbourPrefetch, nextBoundaryAction, rememberZap, resolveDelayMs, startSeconds, stepChannel, ZAP_RESOLVE_DELAY_MS } from './player-logic'
import type { PoolItem } from '../data/pool'
import { createChannel, emptyDraft, type ChannelDef } from '../model/channel'

const ch = (number: number, id = `c${number}`): ChannelDef => ({ ...createChannel({ ...emptyDraft(), name: id }, [], 1, () => 0.1), id, number })

describe('spelarlogiken', () => {
  it('startposition live och från början', () => {
    const slot = { kind: 'programme', minsIn: 12.5 } as never
    expect(startSeconds(slot, 'live')).toBe(750)
    expect(startSeconds(slot, 'start')).toBe(0)
  })

  it('CH ▲▼ följer nummer och wrappar', () => {
    const list = [ch(3), ch(1), ch(2)]
    expect(stepChannel(list, 'c1', 1).id).toBe('c2')
    expect(stepChannel(list, 'c3', 1).id).toBe('c1')
    expect(stepChannel(list, 'c1', -1).id).toBe('c3')
  })

  it('förladdar ~30 s före gränsen och byter vid gränsen', () => {
    const base = { slotStop: 100_000, preloadLeadMs: 30_000 }
    expect(nextBoundaryAction({ ...base, now: 60_000, preloaded: false })).toBe('none')
    expect(nextBoundaryAction({ ...base, now: 75_000, preloaded: false })).toBe('preload')
    expect(nextBoundaryAction({ ...base, now: 75_000, preloaded: true })).toBe('none')
    expect(nextBoundaryAction({ ...base, now: 100_000, preloaded: true })).toBe('advance')
    // strömmen är längre än katalogens runtime: gränsen vinner ändå
    expect(nextBoundaryAction({ ...base, now: 130_000, preloaded: false })).toBe('advance')
  })

  it('minns förra kanalen', () => {
    expect(rememberZap({ lastChannelId: 'a', previousChannelId: null }, 'b')).toEqual({ lastChannelId: 'b', previousChannelId: 'a' })
    expect(rememberZap({ lastChannelId: 'b', previousChannelId: 'a' }, 'b')).toEqual({ lastChannelId: 'b', previousChannelId: 'a' })
  })

  it('kanalbyte väntar med strömsök och debrid men inte med biblioteket', () => {
    expect(resolveDelayMs('stream', true)).toBe(ZAP_RESOLVE_DELAY_MS)
    expect(resolveDelayMs('debrid', true)).toBe(ZAP_RESOLVE_DELAY_MS)
    expect(resolveDelayMs('library', true)).toBe(0)
    // Programbyte, Från början och felhopp på samma kanal väntar aldrig.
    expect(resolveDelayMs('stream', false)).toBe(0)
  })
})

describe('källans slut (mpv ger inget onPlaybackEnded)', () => {
  it('fil kortare än liveläget: slut direkt efter start = fel, inte "pausad i slutet"', () => {
    // Come And See: 549 MB-filen har bara 33:05, live ville 33:05 eller senare.
    expect(endOfSourceAction({ position: 1985, duration: 1985, startedAt: 1985 })).toBe('failed')
    expect(endOfSourceAction({ position: 1985, duration: 1985, startedAt: 4229.7 })).toBe('failed')
  })
  it('spelat en stund och nått slutet = programmet är slut', () => {
    expect(endOfSourceAction({ position: 5399.5, duration: 5400, startedAt: 600 })).toBe('ended')
  })
  it('mitt i filen eller okänd längd = inget', () => {
    expect(endOfSourceAction({ position: 1200, duration: 5400, startedAt: 600 })).toBeNull()
    expect(endOfSourceAction({ position: 30, duration: 0, startedAt: 0 })).toBeNull()
  })

  it('grannförladdning: CH ▲▼ nu, bara bibliotek och debrid, aldrig strömsök', () => {
    const it_ = (ref: string, play: PoolItem['play']): PoolItem =>
      ({ ref, title: ref, runtimeMin: 600, runtimeKnown: true, year: null, kind: 'movie', source: 'library', genres: [], play })
    const list = [ch(1), ch(2), ch(3), ch(4)]
    const rundowns: Record<string, PoolItem[] | null> = {
      c1: [it_('lib', { type: 'library', key: 'k', mediaType: 'movie' })],
      c3: [it_('str', { type: 'stream', imdbId: 'tt1', mediaType: 'movie' })],
      c4: null,
    }
    const of = (c: ChannelDef) => rundowns[c.id] ?? null
    expect(neighbourPrefetch(list, 'c2', of, Date.now()).map((i) => i.ref)).toEqual(['lib'])
    rundowns.c3 = [it_('deb', { type: 'debrid', provider: 'torbox', fileRef: '1|2' })]
    expect(neighbourPrefetch(list, 'c2', of, Date.now()).map((i) => i.ref)).toEqual(['deb', 'lib'])
    // Kall cache (c4) och ensam kanal: inget.
    expect(neighbourPrefetch(list, 'c1', of, Date.now()).map((i) => i.ref)).toEqual([])
    expect(neighbourPrefetch([ch(1)], 'c1', of, Date.now())).toEqual([])
  })
})
