import { describe, expect, it, vi } from 'vitest'
import { createCloudServices, evaluateCloudServices, fetchCloudServicesCode, CLOUD_SERVICES_URL, type StoredCloudServices } from './cloud-services'

const FILE = (name: string) => `(function () {
  return { version: 1, sourceId: 'older-cloud-id', services: [
    { id: 'svc-a', name: '${name}', base: 'https://api.svc-a.example', legacyHeader: 'x-a',
      list: async function () { return { files: [], failed: false } },
      unlock: async function () { return { r: { data: null, failure: null }, url: 'https://cdn.example/x.mkv' } } },
    { id: 'broken', name: 'No functions', base: 'https://b.example' },
  ] }
})()`

describe('evaluateCloudServices', () => {
  it('tolkar filen och släpper bara igenom tjänster som går att anropa', () => {
    const file = evaluateCloudServices(FILE('Service A'))!
    expect(file.version).toBe(1)
    expect(file.sourceId).toBe('older-cloud-id')
    expect(file.services.map((s) => s.id)).toEqual(['svc-a'])
    expect(file.services[0].name).toBe('Service A')
  })

  it('trasig eller oväntad kod ger null i stället för att kasta', () => {
    expect(evaluateCloudServices('(function () { throw new Error("x") })()')).toBeNull()
    expect(evaluateCloudServices('this is not code')).toBeNull()
    expect(evaluateCloudServices('({ services: "no" })')).toBeNull()
    expect(evaluateCloudServices('')).toBeNull()
  })
})

describe('fetchCloudServicesCode', () => {
  it('hämtar genom appens rutt för pluginkod', async () => {
    const seen: string[] = []
    const fetchImpl = (async (url: string) => { seen.push(url); return new Response(JSON.stringify({ code: 'CODE' })) }) as unknown as typeof fetch
    expect(await fetchCloudServicesCode(fetchImpl)).toBe('CODE')
    expect(seen).toEqual([`/api/plugins/runtime?url=${encodeURIComponent(CLOUD_SERVICES_URL)}`])
  })

  it('fel, tomt svar och nätfel ger null', async () => {
    const answer = (body: unknown, status = 200) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch
    expect(await fetchCloudServicesCode(answer({ error: 'x' }, 502))).toBeNull()
    expect(await fetchCloudServicesCode(answer({ code: '  ' }))).toBeNull()
    expect(await fetchCloudServicesCode((async () => { throw new Error('offline') }) as unknown as typeof fetch)).toBeNull()
  })
})

describe('createCloudServices', () => {
  function setup(stored: StoredCloudServices | null, answers: Array<string | null>, startAt = 1_000_000) {
    let now = startAt
    let saved = stored
    const fetchCode = vi.fn(async () => (answers.length > 1 ? answers.shift()! : answers[0] ?? null))
    const registry = createCloudServices({ read: () => saved, write: (v) => { saved = v }, fetchCode, now: () => now })
    return { registry, fetchCode, saved: () => saved, advance: (ms: number) => { now += ms } }
  }

  it('en färsk sparad kopia gäller direkt och hämtas inte om', () => {
    const { registry, fetchCode } = setup({ code: FILE('Stored'), at: 1_000_000 - 60_000 }, [FILE('Fetched')])
    expect(registry.get()!.services[0].name).toBe('Stored')
    expect(fetchCode).not.toHaveBeenCalled()
  })

  it('en gammal kopia gäller medan en ny hämtas i bakgrunden, och den nya sparas', async () => {
    const { registry, fetchCode, saved } = setup({ code: FILE('Stored'), at: 1_000_000 - 25 * 3_600_000 }, [FILE('Fetched')])
    expect(registry.get()!.services[0].name).toBe('Stored')
    await registry.refresh()
    expect(fetchCode).toHaveBeenCalledTimes(1)
    expect(registry.get()!.services[0].name).toBe('Fetched')
    expect(saved()!.code).toContain('Fetched')
  })

  it('utan kopia: ready väntar in hämtningen', async () => {
    const { registry } = setup(null, [FILE('Fetched')])
    expect(registry.get()).toBeNull()
    expect((await registry.ready())!.services[0].id).toBe('svc-a')
  })

  it('en misslyckad eller trasig hämtning rör inte kopian och försöker inte igen på tio minuter', async () => {
    const { registry, fetchCode, saved, advance } = setup({ code: FILE('Stored'), at: 1_000_000 - 25 * 3_600_000 }, [null, 'not code', FILE('Later')])
    registry.get()
    await registry.refresh()
    expect(registry.get()!.services[0].name).toBe('Stored')
    expect(saved()!.code).toContain('Stored')
    const calls = fetchCode.mock.calls.length
    advance(60_000)
    registry.get()
    expect(fetchCode.mock.calls.length).toBe(calls)
    advance(10 * 60_000)
    registry.get()
    await registry.refresh()
    expect(registry.get()!.services[0].name).toBe('Stored')
    advance(11 * 60_000)
    registry.get()
    await registry.refresh()
    expect(registry.get()!.services[0].name).toBe('Later')
  })
})
