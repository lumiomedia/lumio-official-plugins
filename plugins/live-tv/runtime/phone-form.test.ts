import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { __resetPhoneFormForTests, phoneFormSupported, playlistFromPhone, usePhoneForm, type PhoneFormSpec } from './phone-form'

const spec: PhoneFormSpec = { title: 'T', lang: 'en', fields: [{ id: 'm3u', label: 'M3U', kind: 'multiline' }] }
const json = (body: unknown, status = 200) => Promise.resolve({ ok: status < 400, status, json: async () => body } as unknown as Response)

beforeEach(() => { __resetPhoneFormForTests(); vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe('telefonens svar', () => {
  it('M3U-adresser per rad (bara http/https, inga dubbletter) och en hel Xtream-inloggning', () => {
    expect(playlistFromPhone({ m3u: ' http://a/x.m3u \r\nnot a url\nhttps://b/y\nhttp://a/x.m3u', server: '', username: '', password: '' }))
      .toEqual({ urls: ['http://a/x.m3u', 'https://b/y'], xtream: null })
    expect(playlistFromPhone({ server: 'http://panel:8080', username: 'u', password: 'p' }).xtream).toEqual({ server: 'http://panel:8080', username: 'u', password: 'p' })
    expect(playlistFromPhone({ server: 'http://panel:8080', username: 'u', password: '' }).xtream).toBeNull()
  })
})

describe('värdens väg', () => {
  it('finns när värden svarar med ett tillstånd, inte på 404 eller fel', async () => {
    vi.stubGlobal('fetch', vi.fn(() => json({ state: 'expired' })))
    expect(await phoneFormSupported()).toBe(true)
    __resetPhoneFormForTests()
    vi.stubGlobal('fetch', vi.fn(() => json({}, 404)))
    expect(await phoneFormSupported()).toBe(false)
    __resetPhoneFormForTests()
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('x'))))
    expect(await phoneFormSupported()).toBe(false)
  })

  it('pollar tills värdena kommer, levererar dem en gång och avbryter inte en levererad kod', async () => {
    const calls: string[] = []
    let polls = 0
    vi.stubGlobal('fetch', vi.fn((input: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? 'GET'} ${input}`)
      if (init?.method === 'POST') return json({ code: 'c1', url: 'http://lan:3012/form?c=c1' })
      polls++
      return json(polls < 2 ? { state: 'waiting' } : { state: 'received', values: { m3u: 'http://a/x' } })
    }))
    const onValues = vi.fn()
    const { result, unmount } = renderHook(() => usePhoneForm(true, spec, onValues))
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(result.current.url).toBe('http://lan:3012/form?c=c1')
    await act(async () => { await vi.advanceTimersByTimeAsync(4_100) })
    expect(onValues).toHaveBeenCalledTimes(1)
    expect(onValues).toHaveBeenCalledWith({ m3u: 'http://a/x' })
    unmount()
    expect(calls.some((c) => c.startsWith('DELETE'))).toBe(false)
  })

  it('stängd ruta avbryter koden; ingen LAN-adress = misslyckat', async () => {
    const methods: string[] = []
    vi.stubGlobal('fetch', vi.fn((_input: string, init?: RequestInit) => {
      methods.push(init?.method ?? 'GET')
      return init?.method === 'POST' ? json({ code: 'c2', url: 'http://lan:3012/form?c=c2' }) : json({ state: 'waiting' })
    }))
    const { unmount } = renderHook(() => usePhoneForm(true, spec, () => {}))
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    unmount()
    expect(methods).toContain('DELETE')

    vi.stubGlobal('fetch', vi.fn((_input: string, init?: RequestInit) => (init?.method === 'POST' ? json({ code: 'c3', url: null }) : json({ ok: true }))))
    const { result } = renderHook(() => usePhoneForm(true, spec, () => {}))
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(result.current.failed).toBe(true)
  })
})
