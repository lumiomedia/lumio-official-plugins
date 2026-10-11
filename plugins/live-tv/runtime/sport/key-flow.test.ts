import { beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetPluginStorageForTests } from '@/lib/plugin-sdk'
import { cleanKey, isPaidPlan, maskKey, removeKey, saveValidatedKey } from './key-flow'
import { getSportSettings, setSportSettings } from './sport-store'
import status from './__fixtures__/api-sports/status.json'

const okFetch = vi.fn(async () => ({ data: status, cached: false, fresh: true, fetchedAt: 1, quota: null, error: null }))
const badFetch = vi.fn(async () => ({ data: null, cached: false, fresh: false, fetchedAt: null, quota: null, error: 'unauthorized' as const }))
const offlineFetch = vi.fn(async () => ({ data: null, cached: false, fresh: false, fetchedAt: null, quota: null, error: 'network' as const }))

beforeEach(() => { __resetPluginStorageForTests(); vi.clearAllMocks() })

describe('nyckeln', () => {
  it('whitespace_is_stripped', () => {
    expect(cleanKey('  ab12\ncd34 \t')).toBe('ab12cd34')
    expect(cleanKey('   ')).toBeNull()
    expect(cleanKey('bad key!')).toBeNull()
  })
  it('maskeras med de fyra sista tecknen', () => {
    expect(maskKey('0123456789abcdef3f9a')).toBe('••••3f9a')
  })
  it('godkänd nyckel sparas med källa och plan', async () => {
    const r = await saveValidatedKey('api-sports', ' 0123456789abcdef ', { fetch: okFetch as never })
    expect(r).toMatchObject({ ok: true, key: '0123456789abcdef', check: { ok: true, plan: 'Free', used: 12, limit: 100 } })
    expect(getSportSettings()).toMatchObject({ apiKey: '0123456789abcdef', provider: 'api-sports', keyPlan: 'Free' })
  })
  it('rejected_key_never_overwrites_saved_key', async () => {
    setSportSettings({ apiKey: 'good12345', provider: 'api-sports', keyPlan: 'Free' })
    expect(await saveValidatedKey('thesportsdb', 'wrong999', { fetch: badFetch as never })).toEqual({ ok: false, reason: 'rejected' })
    expect(getSportSettings()).toMatchObject({ apiKey: 'good12345', provider: 'api-sports' })
  })
  it('nätfel sparar inget', async () => {
    expect(await saveValidatedKey('api-sports', 'abc12345', { fetch: offlineFetch as never })).toEqual({ ok: false, reason: 'network' })
    expect(getSportSettings().apiKey).toBeNull()
  })
  it('tom nyckel anropar ingenting', async () => {
    expect(await saveValidatedKey('api-sports', '  ', { fetch: okFetch as never })).toEqual({ ok: false, reason: 'empty' })
    expect(okFetch).not.toHaveBeenCalled()
  })
  it('Ta bort nyckel', () => {
    setSportSettings({ apiKey: 'good12345', keyPlan: 'Free' })
    removeKey()
    expect(getSportSettings()).toMatchObject({ apiKey: null, keyPlan: null })
  })
  it('betald plan', () => {
    expect(isPaidPlan('Free', 'api-sports')).toBe(false)
    expect(isPaidPlan('Pro', 'api-sports')).toBe(true)
    expect(isPaidPlan(null, 'thesportsdb')).toBe(true)
  })
  it('lagringen tål äldre poster utan fas 2-fälten', () => {
    setSportSettings({ apiKey: 'abc12345' })
    expect(getSportSettings()).toMatchObject({ provider: 'api-sports', keyPlan: null, goalAlertMatches: {} })
  })
})

describe('en nyckel per källa, flera källor samtidigt', () => {
  const leagues = { success: true, data: [{ id: 24, name: 'Premier League' }] }
  const sportApiFetch = vi.fn(async () => ({ data: leagues, cached: false, fresh: true, fetchedAt: 1, quota: { bucket: 'football', limit: 2000, remaining: 1988, minuteLimit: null, minuteRemaining: null, blockedUntil: null, reason: null, plan: null }, error: null }))

  it('en godkänd sportapi.ai-nyckel läggs till BREDVID API-Sports; förbrukningen kommer ur kvotheadern', async () => {
    await saveValidatedKey('api-sports', 'aaaa1111', { fetch: okFetch as never })
    const r = await saveValidatedKey('sportapi', 'sk_live_1', { fetch: sportApiFetch as never })
    expect(r).toMatchObject({ ok: true, check: { ok: true, used: 12, limit: 2000 } })
    expect(Object.keys(getSportSettings().keys).sort()).toEqual(['api-sports', 'sportapi'])
  })
  it('en andra nyckel för SAMMA källa ersätter den första (ingen rotation av gratisnycklar)', async () => {
    await saveValidatedKey('sportapi', 'sk_live_1', { fetch: sportApiFetch as never })
    await saveValidatedKey('sportapi', 'sk_live_2', { fetch: sportApiFetch as never })
    expect(getSportSettings().keys).toEqual({ sportapi: { key: 'sk_live_2', plan: null } })
  })
  it('Ta bort en källas nyckel lämnar de andra', async () => {
    await saveValidatedKey('api-sports', 'aaaa1111', { fetch: okFetch as never })
    await saveValidatedKey('sportapi', 'sk_live_1', { fetch: sportApiFetch as never })
    removeKey('sportapi')
    expect(Object.keys(getSportSettings().keys)).toEqual(['api-sports'])
  })
  it('sportapi.ai utan plan räknas som gratis', () => {
    expect(isPaidPlan(null, 'sportapi')).toBe(false)
  })
})
