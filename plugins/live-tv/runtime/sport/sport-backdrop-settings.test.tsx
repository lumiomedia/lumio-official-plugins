import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { __resetPluginStorageForTests, __setLangForTests, __setTvModeForTests } from '@/lib/plugin-sdk'
import { SportBackdropSettingsDesktop, SportBackdropSettingsTv } from './sport-backdrop-settings'
import { getSportSettings } from './sport-store'
import { notifyBackdropUploadsChanged } from './backdrop'

type Call = { url: string; method: string; body: unknown }
let calls: Call[] = []
let handoffState: Record<string, unknown> = { state: 'waiting' }
const realFetch = globalThis.fetch

beforeEach(() => {
  __resetPluginStorageForTests(); __setLangForTests('sv')
  calls = []
  handoffState = { state: 'waiting' }
  notifyBackdropUploadsChanged()
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    calls.push({ url, method, body: init?.body })
    const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { 'content-type': 'application/json' } })
    if (url.startsWith('/api/live-tv/sport/backdrops')) return json({ slots: {} })
    if (url.startsWith('/api/live-tv/sport/backdrop-handoff') && method === 'POST') return json({ code: 'c0de', url: 'http://192.168.1.2:3012/sport-image?c=c0de' })
    if (url.startsWith('/api/live-tv/sport/backdrop-handoff')) return json(handoffState)
    if (url.startsWith('/api/live-tv/sport/backdrop?') && method === 'POST') return json({ slot: 'hockey', version: 1 })
    return json({})
  }) as unknown as typeof fetch
})
afterEach(() => { cleanup(); __setLangForTests('en'); __setTvModeForTests(false); globalThis.fetch = realFetch })

describe('Bakgrund i Sport, skrivbordskortet', () => {
  it('Standard som standard; läge för Alla sporter; en sport kan ha eget val och ärva igen', () => {
    render(<SportBackdropSettingsDesktop />)
    expect(screen.getByTestId('sport-backdrop-standard').getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByTestId('sport-backdrop-auto'))
    expect(getSportSettings().backdrops).toEqual({ all: 'auto', sports: {} })
    fireEvent.click(screen.getByTestId('sport-backdrop-scope-hockey'))
    expect(screen.getByTestId('sport-backdrop-inherit').getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByTestId('sport-backdrop-off'))
    expect(getSportSettings().backdrops).toEqual({ all: 'auto', sports: { hockey: 'off' } })
    fireEvent.click(screen.getByTestId('sport-backdrop-inherit'))
    expect(getSportSettings().backdrops).toEqual({ all: 'auto', sports: {} })
  })
  it('Egen bild: filväljaren laddar upp till värden för sportens plats; ingen länkruta finns kvar', async () => {
    render(<SportBackdropSettingsDesktop />)
    fireEvent.click(screen.getByTestId('sport-backdrop-scope-hockey'))
    fireEvent.click(screen.getByTestId('sport-backdrop-custom'))
    expect(getSportSettings().backdrops.sports).toEqual({ hockey: 'custom' })
    expect(screen.queryByPlaceholderText('https://…')).toBeNull()
    const input = screen.getByTestId('sport-backdrop-file') as HTMLInputElement
    expect(input.getAttribute('accept')).toBe('image/jpeg,image/png,image/webp')
    const file = new File([new Uint8Array([1, 2, 3])], 'hall.jpg', { type: 'image/jpeg' })
    await act(async () => { fireEvent.change(input, { target: { files: [file] } }) })
    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.url === '/api/live-tv/sport/backdrop?slot=hockey')).toBe(true))
    expect(calls.find((c) => c.method === 'POST')!.body).toBe(file)
  })
  it('kortens bakgrund: opacitet och färg', () => {
    render(<SportBackdropSettingsDesktop />)
    fireEvent.change(screen.getByTestId('sport-cards-opacity'), { target: { value: '40' } })
    expect(getSportSettings().cards).toEqual({ opacity: 40, tone: 'black' })
    fireEvent.click(screen.getByText('Ton från bilden'))
    expect(getSportSettings().cards.tone).toBe('image')
    fireEvent.click(screen.getByText('Mörkgrå'))
    expect(getSportSettings().cards.tone).toBe('gray')
  })
})

describe('Bakgrund i Sport, TV-raderna', () => {
  it('platsen och läget stegas; en sport börjar med "Som Alla sporter"', () => {
    __setTvModeForTests(true)
    render(<SportBackdropSettingsTv />)
    const mode = () => screen.getByTestId('sport-backdrop-mode')
    fireEvent.click(mode())
    expect(getSportSettings().backdrops.all).toBe('auto')
    fireEvent.click(mode()); fireEvent.click(mode())
    expect(getSportSettings().backdrops.all).toBe('off')
    fireEvent.click(mode())
    expect(getSportSettings().backdrops.all).toBe('standard')
    fireEvent.click(screen.getByTestId('sport-backdrop-scope'))
    expect(screen.getByTestId('sport-backdrop-scope').textContent).toContain('Fotboll')
    expect(mode().textContent).toContain('Som Alla sporter')
    fireEvent.click(mode())
    expect(getSportSettings().backdrops.sports).toEqual({ football: 'standard' })
  })
  it('TV:n har ingen filväljare: Egen bild tas emot från telefonen via QR', async () => {
    __setTvModeForTests(true)
    render(<SportBackdropSettingsTv />)
    fireEvent.click(screen.getByTestId('sport-backdrop-mode')); fireEvent.click(screen.getByTestId('sport-backdrop-mode'))
    expect(getSportSettings().backdrops.all).toBe('custom')
    expect(screen.queryByTestId('sport-backdrop-file')).toBeNull()
    fireEvent.click(screen.getByTestId('sport-backdrop-phone'))
    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.url === '/api/live-tv/sport/backdrop-handoff?slot=all')).toBe(true))
    expect(await screen.findByTestId('sport-backdrop-qr')).toBeTruthy()
  })
  it('kortens opacitet och färg stegas', () => {
    render(<SportBackdropSettingsTv />)
    fireEvent.click(screen.getByTestId('sport-cards-opacity-row'))
    expect(getSportSettings().cards.opacity).toBe(100)
    fireEvent.click(screen.getByTestId('sport-cards-opacity-row'))
    expect(getSportSettings().cards.opacity).toBe(0)
    fireEvent.click(screen.getByTestId('sport-cards-tone-row'))
    expect(getSportSettings().cards.tone).toBe('gray')
  })
})
