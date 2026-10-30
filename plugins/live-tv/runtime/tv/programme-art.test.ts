import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { __resetForTests } from '@/lib/plugin-sdk'
import type { M3uChannel } from '../live-tv-data'
import { __resetProgrammeArtForTests, looksLikeBroadcast, lookUpArt, normaliseTitle, useProgrammeArt } from './programme-art'

const ch = (name: string, group = 'Entertainment'): M3uChannel => ({ name, group, url: `http://x/${name}`, tvgId: null, logo: null })
const prog = (title: string, extra: Record<string, unknown> = {}) => ({ title, start: 0, stop: 1, ...extra })
const ok = (items: unknown[]) => Promise.resolve({ ok: true, json: () => Promise.resolve({ items }) } as Response)

beforeEach(() => { __resetForTests(); __resetProgrammeArtForTests() })
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

describe('programme-art', () => {
  it('normaliserar titlar', () => {
    expect(normaliseTitle('  Amélie — Le Film! ')).toBe('amelie le film')
  })
  it('känner igen sändningar som inte är verk', () => {
    const tv4 = ch('TV4 HD')
    expect(looksLikeBroadcast('Ryder Cup Day 2 Fourballs', tv4)).toBe(true)
    expect(looksLikeBroadcast('BBC News at Five', tv4)).toBe(true)
    expect(looksLikeBroadcast('Live: College GameDay', tv4)).toBe(true)
    expect(looksLikeBroadcast('Arsenal vs Chelsea', tv4)).toBe(true)
    expect(looksLikeBroadcast('TV4 HD', tv4)).toBe(true)
    expect(looksLikeBroadcast('Silo', ch('Sky Sports Main', 'Sport'))).toBe(true)
    expect(looksLikeBroadcast('Silo', tv4)).toBe(false)
    expect(looksLikeBroadcast('Vertigo', tv4)).toBe(false)
  })
  it('XMLTV-ikonen vinner utan uppslag', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderHook(() => useProgrammeArt(ch('TV4'), prog('Silo', { icon: 'http://i/silo.jpg' }), { lookup: true }))
    expect(result.current.url).toBe('http://i/silo.jpg')
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('lookup:false slår aldrig upp', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderHook(() => useProgrammeArt(ch('TV4'), prog('Silo'), { lookup: false }))
    expect(result.current.url).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('exakt titelträff ger bakgrundsbilden; träff och miss cachas', async () => {
    const fetchMock = vi.fn((url: string) => ok(url.includes('Silo') ? [{ title: 'Silo', backdropUrl: 'b.jpg' }] : [{ title: 'Vertigo 2' }]))
    vi.stubGlobal('fetch', fetchMock)
    expect(await lookUpArt('Silo')).toBe('b.jpg')
    expect(fetchMock.mock.calls[0]![0]).toContain('/api/media?titleQuery=Silo')
    expect(await lookUpArt('Vertigo')).toBeNull()
    expect(await lookUpArt('Silo')).toBe('b.jpg')
    expect(await lookUpArt('Vertigo')).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
  it('searchTitles räknas som träff', async () => {
    vi.stubGlobal('fetch', vi.fn(() => ok([{ title: 'Chicago P.D.', searchTitles: ['Chicago Police Department'], backdropUrl: 'c.jpg' }])))
    expect(await lookUpArt('Chicago Police Department')).toBe('c.jpg')
  })
  it('nätfel ger null men cachas inte som miss', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error('down')).mockImplementation(() => ok([{ title: 'Silo', backdropUrl: 'b.jpg' }]))
    vi.stubGlobal('fetch', fetchMock)
    expect(await lookUpArt('Silo')).toBeNull()
    expect(await lookUpArt('Silo')).toBe('b.jpg')
  })
  it('högst två uppslag samtidigt', async () => {
    let active = 0, peak = 0
    const resolvers: (() => void)[] = []
    vi.stubGlobal('fetch', vi.fn(() => { active++; peak = Math.max(peak, active); return new Promise<Response>((res) => resolvers.push(() => { active--; res({ ok: true, json: () => Promise.resolve({ items: [] }) } as Response) })) }))
    const all = ['A1', 'B1', 'C1', 'D1', 'E1'].map((t) => lookUpArt(t))
    for (let i = 0; i < 5; i++) { await waitFor(() => expect(resolvers.length).toBeGreaterThan(i)); resolvers[i]!() }
    await Promise.all(all)
    expect(peak).toBe(2)
  })
  it('högst 30 uppslag per minut', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] })
    const fetchMock = vi.fn(() => ok([]))
    vi.stubGlobal('fetch', fetchMock)
    const all = Array.from({ length: 31 }, (_, i) => lookUpArt(`Title ${i}`))
    await vi.advanceTimersByTimeAsync(1000)
    expect(fetchMock).toHaveBeenCalledTimes(30)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(fetchMock).toHaveBeenCalledTimes(31)
    await Promise.all(all)
  })
  it('kroken slår upp och returnerar bilden', async () => {
    vi.stubGlobal('fetch', vi.fn(() => ok([{ title: 'Silo', backdropUrl: 'b.jpg' }])))
    const { result } = renderHook(() => useProgrammeArt(ch('TV4'), prog('Silo'), { lookup: true }))
    await waitFor(() => expect(result.current.url).toBe('b.jpg'))
  })
})
