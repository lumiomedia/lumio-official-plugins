// runtime/sport/key-model.test.ts
import { describe, expect, it } from 'vitest'
import { bucketsOf, keyRowText, keyRows, moveProvider, orderRows } from './key-model'
import { SportRouter } from './router'
import { tvText } from '../tv/tv-strings'
import type { SportQuota } from './sport-fetch'

const NOW = Date.UTC(2026, 9, 10, 18)
const tt = (k: Parameters<typeof tvText>[1], v?: Record<string, string | number>) => tvText('sv', k, v)
const opts = { locale: 'sv-SE', tz: 'Europe/Stockholm' }
/** Intl skriver tusental med hårt mellanslag. */
const text = (...a: Parameters<typeof keyRowText>) => keyRowText(...a).replace(/\u00a0|\u202f/g, ' ')
const q = (bucket: string, over: Partial<SportQuota> = {}): SportQuota => ({ bucket, limit: 2000, remaining: 1988, minuteLimit: null, minuteRemaining: null, blockedUntil: null, reason: null, plan: null, ...over })
const KEYS = { sportapi: { key: 'sk_live_3f9a', plan: null }, 'api-sports': { key: 'aaaa1111', plan: 'Free' } }

describe('Nycklar', () => {
  it('en rad per källa: ingen nyckel, OK med dagens kvot, pausad till HH:MM', () => {
    const router = new SportRouter(KEYS, {}, { now: () => NOW })
    router.budget('sportapi')!.noteQuota(q('football'))
    router.budget('api-sports')!.noteQuota(q('football', { limit: 100, remaining: 0, blockedUntil: Date.UTC(2026, 9, 11), reason: 'exhausted' }))
    router.budget('api-sports')!.noteQuota(q('hockey', { limit: 100, remaining: 97 }))
    const rows = keyRows({ keys: KEYS }, (id) => router.budget(id), NOW)
    expect(rows.map((r) => [r.id, r.state])).toEqual([['sportapi', 'ok'], ['api-sports', 'paused'], ['thesportsdb', 'none']])
    expect(text(rows[0], tt, opts)).toBe('OK · ••••3f9a · 12 / 2 000 i dag')
    expect(text(rows[1], tt, opts)).toBe('Pausad till 02:00 · ••••1111 · fotboll 100 / 100 i dag, ishockey 3 / 100 i dag')
    expect(text(rows[2], tt, opts)).toBe('Ingen nyckel')
  })
  it('TheSportsDB har ingen dygnsgräns; en ogiltig nyckel syns', () => {
    const keys = { thesportsdb: { key: '123456', plan: 'Premium' } }
    const router = new SportRouter(keys, {}, { now: () => NOW })
    expect(text(keyRows({ keys }, (id) => router.budget(id), NOW)[2], tt, opts)).toBe('OK · ••••3456 · Ingen dagsgräns')
    expect(bucketsOf('thesportsdb')).toEqual(['all'])
    expect(bucketsOf('api-sports')).toEqual(['football', 'hockey', 'basketball', 'handball'])
  })
})

describe('Källa per sport', () => {
  it('hela ordningen med nyckelstatus; flytta upp/ned', () => {
    expect(orderRows({ keys: KEYS, order: {} }, 'football')).toEqual([
      { id: 'sportapi', label: 'sportapi.ai', hasKey: true },
      { id: 'api-sports', label: 'API-Sports', hasKey: true },
      { id: 'thesportsdb', label: 'TheSportsDB', hasKey: false },
    ])
    expect(orderRows({ keys: KEYS, order: {} }, 'hockey').map((r) => r.id)).toEqual(['api-sports', 'thesportsdb'])
    expect(moveProvider(['sportapi', 'api-sports', 'thesportsdb'], 'api-sports', -1)).toEqual(['api-sports', 'sportapi', 'thesportsdb'])
    expect(moveProvider(['sportapi', 'api-sports'], 'sportapi', -1)).toEqual(['sportapi', 'api-sports'])
    expect(moveProvider(['sportapi', 'api-sports'], 'sportapi', 1)).toEqual(['api-sports', 'sportapi'])
  })
})
