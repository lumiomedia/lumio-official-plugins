// runtime/sport/key-model.test.ts
import { describe, expect, it } from 'vitest'
import { ORDER_SPORTS, PROVIDER_BLURB_KEY, bucketsOf, keyQuotaDetail, keyRows, keyStatus, sportLabel } from './key-model'
import { SportRouter } from './router'
import { tvText } from '../tv/tv-strings'
import type { SportQuota } from './sport-fetch'

const NOW = Date.UTC(2026, 9, 10, 18)
const tt = (k: Parameters<typeof tvText>[1], v?: Record<string, string | number>) => tvText('sv', k, v)
const opts = { locale: 'sv-SE', tz: 'Europe/Stockholm' }
const q = (bucket: string, over: Partial<SportQuota> = {}): SportQuota => ({ bucket, limit: 2000, remaining: 1988, minuteLimit: null, minuteRemaining: null, blockedUntil: null, reason: null, plan: null, ...over })
const KEYS = { sportapi: { key: 'sk_live_3f9a', plan: null }, 'api-sports': { key: 'aaaa1111', plan: 'Free' } }

describe('Nycklar', () => {
  it('en rad per källa: ingen nyckel, OK, pausad; TheSportsDB utan dygnsgräns', () => {
    const router = new SportRouter(KEYS, {}, { now: () => NOW })
    router.budget('api-sports')!.noteQuota(q('football', { limit: 100, remaining: 0, blockedUntil: Date.UTC(2026, 9, 11), reason: 'exhausted' }))
    const rows = keyRows({ keys: KEYS }, (id) => router.budget(id), NOW)
    expect(rows.map((r) => [r.id, r.state, r.masked])).toEqual([['sportapi', 'ok', '••••3f9a'], ['api-sports', 'paused', '••••1111'], ['thesportsdb', 'none', null]])
    expect(bucketsOf('thesportsdb')).toEqual(['all'])
    expect(bucketsOf('api-sports')).toEqual(['football', 'hockey', 'basketball', 'handball'])
  })
})

describe('Nycklar som kort', () => {
  it('statuspillret: Aktiv med kvar i dag, Ingen nyckel, Pausad, Nyckeln godtogs inte', () => {
    const router = new SportRouter(KEYS, {}, { now: () => NOW })
    router.budget('sportapi')!.noteQuota(q('football', { remaining: 47 }))
    router.budget('api-sports')!.noteQuota(q('football', { limit: 100, remaining: 0, blockedUntil: Date.UTC(2026, 9, 11), reason: 'exhausted' }))
    router.budget('api-sports')!.noteQuota(q('hockey', { limit: 100, remaining: 97 }))
    const rows = keyRows({ keys: KEYS }, (id) => router.budget(id), NOW)
    const st = (i: number) => keyStatus(rows[i], tt, opts)
    expect(st(0)).toEqual({ text: 'Aktiv · 47 kvar idag', tone: 'ok' })
    expect(st(1)).toEqual({ text: 'Pausad till 02:00', tone: 'warn' })
    expect(st(2)).toEqual({ text: 'Ingen nyckel', tone: 'none' })
    expect(keyQuotaDetail(rows[1], tt, opts.locale)).toBe('Kvar idag: Fotboll 0 · Ishockey 97')
    expect(keyQuotaDetail(rows[0], tt, opts.locale)).toBeNull()
    const bad = { ...rows[0], state: 'invalid' as const }
    expect(keyStatus(bad, tt, opts)).toEqual({ text: 'Nyckeln godtogs inte', tone: 'bad' })
    const tsdb = { ...rows[2], state: 'ok' as const, masked: '••••3456' }
    expect(keyStatus(tsdb, tt, opts).text).toBe('Aktiv · Ingen dagsgräns')
  })
  it('en rad om täckning och gräns per källa', () => {
    expect(tt(PROVIDER_BLURB_KEY.sportapi)).toBe('Fotboll · 2 000 anrop/dag gratis')
    expect(tt(PROVIDER_BLURB_KEY['api-sports'])).toBe('Alla sporter · 100/dag per sport gratis')
    expect(tt(PROVIDER_BLURB_KEY.thesportsdb)).toBe('Alla sporter · 9 USD/mån')
  })
})

describe('Sportnamn', () => {
  it('sporternas namn är översatta och med versal', () => {
    expect(sportLabel('football', tt)).toBe('Fotboll')
    expect(sportLabel('hockey', tt)).toBe('Ishockey')
    expect(sportLabel('hockey', (k, v) => tvText('en', k, v))).toBe('Ice hockey')
    expect(ORDER_SPORTS).toEqual(['football', 'hockey', 'basketball', 'handball'])
  })
})
