import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'

import { LIBRARY_STUB, __resetLibraryStubForTests } from '../src/__test-stubs__/plugin-sdk'
import { VodLibraryCard } from './vod-library-card'

/**
 * Fas A3:s acceptanskriterier — raden finns bara för källor som HAR VOD, och
 * knappen är avstängd medan en genomgång kör (värdens lås, inte vårt eget).
 */

const svar = (sources: unknown[]) => ({
  ok: true,
  status: 200,
  json: async () => ({ sources }),
  text: async () => JSON.stringify({ sources }),
})

const källa = (over: Record<string, unknown> = {}) => ({
  id: 'kkzbigserver', total: 41_000, movies: 32_000, series: 9_000, updatedAt: 1_758_000_000, importing: false, ...over,
})

beforeEach(() => {
  __resetLibraryStubForTests()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function medVodStatus(sources: unknown[]) {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
    if (url.includes('/api/live-tv/vod/status')) return svar(sources) as unknown as Response
    throw new Error(`oväntat anrop: ${url}`)
  }))
}

describe('VodLibraryCard', () => {
  it('visar en rad för en källa som har VOD', async () => {
    medVodStatus([källa()])
    render(<VodLibraryCard />)
    await waitFor(() => expect(screen.getByTestId('vod-library-kkzbigserver')).toBeTruthy())
  })

  it('ritar ingenting för en ren kanalpanel', async () => {
    medVodStatus([källa({ id: 'bara-kanaler', total: 0 })])
    const { container } = render(<VodLibraryCard />)
    await waitFor(() => expect(container.textContent).toBe(''))
  })

  it('knappen är avstängd medan VÄRDENS genomgång kör', async () => {
    LIBRARY_STUB.scanning = true
    medVodStatus([källa()])
    render(<VodLibraryCard />)
    await waitFor(() => expect(screen.getByTestId('vod-library-kkzbigserver')).toBeTruthy())
    // Låset syns först när hooken hunnit läsa det: knappen frågar `disabled`
    // vid varje rendering, och `isLibraryScanRunning` är värdens svar.
    const knapp = screen.getByRole('button', { name: /bygg|build/i })
    await waitFor(() => expect(knapp.hasAttribute('disabled') || knapp.getAttribute('aria-disabled') === 'true').toBe(true))
  })

  it('knappen är avstängd medan panelen fortfarande importeras', async () => {
    medVodStatus([källa({ importing: true })])
    render(<VodLibraryCard />)
    await waitFor(() => expect(screen.getByTestId('vod-library-kkzbigserver')).toBeTruthy())
    const knapp = screen.getByRole('button', { name: /bygg|build/i })
    expect(knapp.hasAttribute('disabled') || knapp.getAttribute('aria-disabled') === 'true').toBe(true)
  })
})
