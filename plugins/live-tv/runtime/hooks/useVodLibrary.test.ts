import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import type { VodCategory, VodItem } from '../vod-client'

const listVodCategories = vi.fn()
const queryVod = vi.fn()

vi.mock('../vod-client', async () => {
  const actual = await vi.importActual<typeof import('../vod-client')>('../vod-client')
  return {
    ...actual,
    listVodCategories: (...args: unknown[]) => listVodCategories(...args),
    queryVod: (...args: unknown[]) => queryVod(...args),
  }
})

const { useVodCategories, useVodPage } = await import('./useVodLibrary')

function cat(id: string, name: string, kind: 'movie' | 'series', count: number): VodCategory {
  return { id, name, kind, count }
}

function item(key: string, title: string): VodItem {
  return { key, kind: 'movie', title, categoryId: '5', categoryName: 'MOVIE: Swedish' }
}

describe('useVodCategories', () => {
  beforeEach(() => {
    listVodCategories.mockReset()
    vi.useRealTimers()
  })
  afterEach(cleanup)

  it('hämtar kategorierna för källan', async () => {
    listVodCategories.mockResolvedValue({
      categories: [cat('5', 'MOVIE: Swedish', 'movie', 214)],
      total: 214,
      known: true,
      importing: false,
    })
    const { result } = renderHook(() => useVodCategories('panel'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.categories).toHaveLength(1)
    expect(result.current.total).toBe(214)
    expect(result.current.known).toBe(true)
  })

  it('frågar inte alls utan källa', async () => {
    const { result } = renderHook(() => useVodCategories(null))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(listVodCategories).not.toHaveBeenCalled()
  })

  it('fortsätter fråga medan värden importerar, och slutar när den är klar', async () => {
    vi.useFakeTimers()
    listVodCategories
      .mockResolvedValueOnce({ categories: [], total: 0, known: true, importing: true })
      .mockResolvedValueOnce({
        categories: [cat('5', 'MOVIE: Swedish', 'movie', 3)],
        total: 3,
        known: true,
        importing: false,
      })
    const { result } = renderHook(() => useVodCategories('panel'))
    await vi.waitFor(() => expect(result.current.importing).toBe(true))
    expect(result.current.total).toBe(0)

    await vi.advanceTimersByTimeAsync(2_000)
    await vi.waitFor(() => expect(result.current.importing).toBe(false))
    expect(result.current.total).toBe(3)

    // Klar = inga fler frågor. Annars pollar vyn panelen i all evighet.
    const calls = listVodCategories.mock.calls.length
    await vi.advanceTimersByTimeAsync(10_000)
    expect(listVodCategories.mock.calls.length).toBe(calls)
    vi.useRealTimers()
  })

  it('bär felet i stället för att se tomt ut', async () => {
    listVodCategories.mockRejectedValue(new Error('/api/live-tv/vod/categories returned 404'))
    const { result } = renderHook(() => useVodCategories('panel'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toContain('404')
  })
})

describe('useVodPage', () => {
  beforeEach(() => {
    queryVod.mockReset()
  })
  afterEach(cleanup)

  it('hämtar första sidan med filtret i värden', async () => {
    queryVod.mockResolvedValue({ items: [item('vod:1', 'Dune')], total: 1, known: true })
    const { result } = renderHook(() =>
      useVodPage({ source: 'panel', categoryId: '5', sort: 'az' }),
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(queryVod).toHaveBeenCalledWith(expect.objectContaining({ source: 'panel', categoryId: '5', sort: 'az', offset: 0 }))
    expect(result.current.items).toHaveLength(1)
    expect(result.current.hasMore).toBe(false)
  })

  it('börjar om på sida ett när kategorin byts', async () => {
    queryVod.mockResolvedValue({ items: [item('vod:1', 'Dune')], total: 400, known: true })
    const { result, rerender } = renderHook(
      (props: { categoryId: string }) => useVodPage({ source: 'panel', sort: 'new', ...props }),
      { initialProps: { categoryId: '5' } },
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    result.current.loadMore()
    await waitFor(() => expect(queryVod).toHaveBeenCalledWith(expect.objectContaining({ limit: 240 })))

    rerender({ categoryId: '9' })
    await waitFor(() =>
      expect(queryVod).toHaveBeenLastCalledWith(expect.objectContaining({ categoryId: '9', limit: 120 })),
    )
  })

  it('vet när det finns mer att hämta', async () => {
    queryVod.mockResolvedValue({ items: [item('vod:1', 'Dune')], total: 42, known: true })
    const { result } = renderHook(() => useVodPage({ source: 'panel', sort: 'new' }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.hasMore).toBe(true)
  })

  it('ligger still när den är avstängd', async () => {
    const { result } = renderHook(() => useVodPage({ source: 'panel', sort: 'new', enabled: false }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(queryVod).not.toHaveBeenCalled()
  })

  it('skiljer okänd källa från tomt bibliotek', async () => {
    queryVod.mockResolvedValue({ items: [], total: 0, known: false })
    const { result } = renderHook(() => useVodPage({ source: 'panel', sort: 'new' }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.known).toBe(false)
    expect(result.current.items).toHaveLength(0)
  })
})
