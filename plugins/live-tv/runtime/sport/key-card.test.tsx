import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { __resetPluginStorageForTests, __setLangForTests, __setTvModeForTests } from '@/lib/plugin-sdk'
import { KeyCard } from './key-card'
import { getSportSettings, setProviderKey } from './sport-store'
import { __resetRouterForTests as __resetBudgetForTests } from './router'
import status from './__fixtures__/api-sports/status.json'

function stubFetch(kind: 'ok' | 'bad') {
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.startsWith('/api/live-tv/sport/key-handoff') && init?.method === 'POST') return new Response(JSON.stringify({ code: 'c0de', url: 'http://192.168.1.5:3012/sport-key?c=c0de' }))
    if (url.startsWith('/api/live-tv/sport/key-handoff')) return new Response('{"state":"waiting"}')
    if (kind === 'bad') return new Response(JSON.stringify({ data: null, cached: false, fresh: false, fetchedAt: null, quota: null, error: 'unauthorized' }))
    return new Response(JSON.stringify({ data: status, cached: false, fresh: true, fetchedAt: 1, quota: null, error: null }))
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

beforeEach(() => { __resetPluginStorageForTests(); __resetBudgetForTests(); __setTvModeForTests(false); __setLangForTests('sv') })
afterEach(() => { cleanup(); vi.unstubAllGlobals(); __setLangForTests('en') })

describe('KeyCard', () => {
  it('titel, källval och QR till registreringen; bara täckta sporter nämns; sportapi.ai erbjuds först', () => {
    render(<KeyCard variant="banner" />)
    expect(screen.getByText('Visa resultat och tabeller – gratis, tar 1 minut')).toBeTruthy()
    expect(screen.getByTestId('qr').getAttribute('data-value')).toBe('https://sportapi.ai/pricing')
    expect(screen.getByText('Fotboll: 2 000 anrop/dag gratis')).toBeTruthy()
    expect(screen.getByText('Resultat för fotboll.')).toBeTruthy()
    fireEvent.click(screen.getByText('API-Sports'))
    expect(screen.queryByText('Fotboll: 2 000 anrop/dag gratis')).toBeNull()
    expect(screen.getByTestId('qr').getAttribute('data-value')).toBe('https://dashboard.api-football.com/register')
    expect(screen.getByText(/fotboll, ishockey, basket och handboll/)).toBeTruthy()
    expect(screen.queryByText(/tennis/i)).toBeNull()
    fireEvent.click(screen.getByText('TheSportsDB'))
    expect(screen.getByTestId('qr').getAttribute('data-value')).toBe('https://www.thesportsdb.com/pricing')
  })

  it('godkänd nyckel: visar kvoten och sparar', async () => {
    stubFetch('ok')
    render(<KeyCard variant="banner" />)
    fireEvent.click(screen.getByText('API-Sports'))
    fireEvent.change(screen.getByTestId('sport-key-input'), { target: { value: ' 0123456789abcdef \n' } })
    fireEvent.click(screen.getByText('Kontrollera och spara'))
    await waitFor(() => expect(screen.getByText('Nyckeln fungerar · 12 av 100 anrop i dag · Gratisnivå')).toBeTruthy())
    expect(getSportSettings()).toMatchObject({ apiKey: '0123456789abcdef', provider: 'api-sports' })
  })

  it('underkänd nyckel: "Nyckeln godtogs inte" och inget sparas', async () => {
    stubFetch('bad')
    render(<KeyCard variant="banner" />)
    fireEvent.change(screen.getByTestId('sport-key-input'), { target: { value: 'wrong123' } })
    fireEvent.click(screen.getByText('Kontrollera och spara'))
    await waitFor(() => expect(screen.getByText('Nyckeln godtogs inte')).toBeTruthy())
    expect(getSportSettings().apiKey).toBeNull()
  })

  it('TV: "Skriv in med telefonen" visar telefonsidans QR', async () => {
    __setTvModeForTests(true)
    stubFetch('ok')
    render(<KeyCard variant="banner" />)
    expect(screen.queryByTestId('sport-key-input')).toBeNull()
    fireEvent.click(screen.getByText('Skriv in med telefonen'))
    await waitFor(() => expect(screen.getAllByTestId('qr').some((q) => q.getAttribute('data-value') === 'http://192.168.1.5:3012/sport-key?c=c0de')).toBe(true))
  })

  it('startar på första källan utan nyckel; med en fast källa ERSÄTTS dess nyckel och de andra står kvar', async () => {
    setProviderKey('sportapi', 'sk_live_1', null)
    stubFetch('ok')
    const { unmount } = render(<KeyCard variant="banner" />)
    expect(screen.getByTestId('qr').getAttribute('data-value')).toBe('https://dashboard.api-football.com/register')
    unmount()
    setProviderKey('api-sports', 'aaaa1111', 'Free')
    const done = vi.fn()
    render(<KeyCard variant="settings" provider="api-sports" onDone={done} />)
    expect(screen.queryAllByTestId('tv-segment')).toHaveLength(0)
    expect(screen.getByText('API-Sports · Byt nyckel')).toBeTruthy()
    fireEvent.change(screen.getByTestId('sport-key-input'), { target: { value: 'bbbb2222' } })
    fireEvent.click(screen.getByText('Kontrollera och spara'))
    await waitFor(() => expect(done).toHaveBeenCalled())
    expect(getSportSettings().keys).toEqual({ sportapi: { key: 'sk_live_1', plan: null }, 'api-sports': { key: 'bbbb2222', plan: 'Free' } })
  })
})
