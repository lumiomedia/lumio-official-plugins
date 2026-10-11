import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { __resetPluginStorageForTests, __setLangForTests, __setTvModeForTests } from '@/lib/plugin-sdk'
import { SportBackdropSettingsDesktop, SportBackdropSettingsTv } from './sport-backdrop-settings'
import { getSportSettings, setSportSettings } from './sport-store'
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

const SCOPES = ['all', 'football', 'hockey', 'basketball', 'motorsport', 'tennis', 'other']
const OWN = { football: 'standard', hockey: 'standard', basketball: 'standard', motorsport: 'standard', tennis: 'standard' } as const
const thumb = (scope: string) => screen.getByTestId(`sport-backdrop-thumb-${scope}`).getAttribute('data-src')
const row = (scope: string) => screen.getByTestId(`sport-backdrop-row-${scope}`)

describe('Bakgrund i Sport, skrivbordskortet', () => {
  it('en rad per sport med miniatyr, ingen handbollsrad; nya användare har Standard med sportens egen bild, Övrigt följer Alla sporter', () => {
    render(<SportBackdropSettingsDesktop />)
    for (const k of SCOPES) expect(row(k)).toBeTruthy()
    expect(screen.queryByTestId('sport-backdrop-row-handball')).toBeNull()
    expect(screen.queryByTestId('sport-backdrop-scope')).toBeNull()
    expect(row('all').textContent).toContain('Alla sporter')
    expect(row('all').textContent).toContain('Standard')
    expect(row('hockey').textContent).toContain('Standard')
    expect(row('hockey').textContent).not.toContain('Som Alla sporter')
    expect(row('other').textContent).toContain('Som Alla sporter')
    expect(thumb('football')).toBe('/sport-backgrounds/football.webp')
    expect(thumb('hockey')).toBe('/sport-backgrounds/hockey.webp')
  })
  it('Automatisk sparad före omtaget, utan nyckel: raden visar Standard-bilden som miniatyr', () => {
    setSportSettings({ backdrops: { all: 'auto', sports: {} } })
    render(<SportBackdropSettingsDesktop />)
    expect(row('all').textContent).toContain('Automatisk')
    expect(thumb('tennis')).toBe('/sport-backgrounds/tennis.webp')
  })
  it('välj en annan medföljande bild för en sport, och ärv igen', () => {
    render(<SportBackdropSettingsDesktop />)
    fireEvent.click(row('hockey'))
    const chooser = screen.getByTestId('sport-backdrop-chooser')
    for (const k of ['inherit', 'standard', 'image:football', 'image:hockey', 'image:basketball', 'image:motorsport', 'image:tennis', 'auto', 'custom', 'off']) {
      expect(chooser.querySelector(`[data-testid="sport-backdrop-opt-${k}"]`)).toBeTruthy()
    }
    expect(screen.getByTestId('sport-backdrop-opt-standard').textContent).toContain('Ishockey')
    fireEvent.click(screen.getByTestId('sport-backdrop-opt-image:tennis'))
    expect(getSportSettings().backdrops).toEqual({ all: 'standard', sports: { ...OWN, hockey: 'image:tennis' } })
    expect(screen.queryByTestId('sport-backdrop-chooser')).toBeNull()
    expect(thumb('hockey')).toBe('/sport-backgrounds/tennis.webp')
    expect(row('hockey').textContent).toContain('Bild: Tennis')
    fireEvent.click(row('hockey'))
    fireEvent.click(screen.getByTestId('sport-backdrop-opt-inherit'))
    expect(getSportSettings().backdrops).toEqual({ all: 'standard', sports: { ...OWN, hockey: 'inherit' } })
    expect(row('hockey').textContent).toContain('Som Alla sporter')
  })
  it('Alla sporter har inget "Som Alla sporter"; dess val ärvs av sporterna utan eget', () => {
    render(<SportBackdropSettingsDesktop />)
    fireEvent.click(row('all'))
    expect(screen.queryByTestId('sport-backdrop-opt-inherit')).toBeNull()
    fireEvent.click(screen.getByTestId('sport-backdrop-opt-image:motorsport'))
    expect(getSportSettings().backdrops.all).toBe('image:motorsport')
    expect(thumb('other')).toBe('/sport-backgrounds/motorsport.webp')
    expect(thumb('football')).toBe('/sport-backgrounds/football.webp')
  })
  it('Egen bild: filväljaren laddar upp till sportens plats', async () => {
    render(<SportBackdropSettingsDesktop />)
    fireEvent.click(row('hockey'))
    fireEvent.click(screen.getByTestId('sport-backdrop-opt-custom'))
    expect(getSportSettings().backdrops.sports).toEqual({ ...OWN, hockey: 'custom' })
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
    expect(getSportSettings().cards).toEqual({ opacity: 40, tone: 'image' })
    fireEvent.click(screen.getByText('Svart'))
    expect(getSportSettings().cards.tone).toBe('black')
    fireEvent.click(screen.getByText('Mörkgrå'))
    expect(getSportSettings().cards.tone).toBe('gray')
  })
})

describe('Bakgrund i Sport, TV-raderna', () => {
  it('en rad per sport; raden öppnar glasmenyn och en bild kan väljas', () => {
    __setTvModeForTests(true)
    render(<SportBackdropSettingsTv />)
    for (const k of SCOPES) expect(row(k)).toBeTruthy()
    expect(thumb('basketball')).toBe('/sport-backgrounds/basketball.webp')
    fireEvent.click(row('football'))
    const menu = screen.getByTestId('tv-glass-menu')
    expect(menu.textContent).toContain('Som Alla sporter')
    fireEvent.click(screen.getByText('Bild: Ishockey'))
    expect(getSportSettings().backdrops.sports).toEqual({ ...OWN, football: 'image:hockey' })
    expect(screen.queryByTestId('tv-glass-menu')).toBeNull()
    expect(thumb('football')).toBe('/sport-backgrounds/hockey.webp')
  })
  it('TV:n har ingen filväljare: Egen bild tas emot från telefonen via QR', async () => {
    __setTvModeForTests(true)
    render(<SportBackdropSettingsTv />)
    fireEvent.click(row('all'))
    fireEvent.click(screen.getByText('Egen bild'))
    expect(getSportSettings().backdrops.all).toBe('custom')
    expect(screen.queryByTestId('sport-backdrop-file')).toBeNull()
    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.url === '/api/live-tv/sport/backdrop-handoff?slot=all')).toBe(true))
    expect(await screen.findByTestId('sport-backdrop-qr')).toBeTruthy()
  })
  it('kortens opacitet och färg stegas', () => {
    render(<SportBackdropSettingsTv />)
    fireEvent.click(screen.getByTestId('sport-cards-opacity-row'))
    expect(getSportSettings().cards.opacity).toBe(70)
    fireEvent.click(screen.getByTestId('sport-cards-opacity-row'))
    fireEvent.click(screen.getByTestId('sport-cards-opacity-row'))
    expect(getSportSettings().cards.opacity).toBe(100)
    fireEvent.click(screen.getByTestId('sport-cards-opacity-row'))
    expect(getSportSettings().cards.opacity).toBe(0)
    fireEvent.click(screen.getByTestId('sport-cards-tone-row'))
    expect(getSportSettings().cards.tone).toBe('black')
  })
})

describe('Bakgrund i Sport, luft och textstorlek', () => {
  it('två sektioner med Live TV-inställningarnas luft emellan; hjälptexterna i beskrivningarnas storlek', () => {
    render(<SportBackdropSettingsTv />)
    const root = screen.getByTestId('sport-backdrop-settings-tv')
    expect(root.style.gap).toBe('36px')
    expect(screen.getByTestId('sport-backdrop-section').parentElement).toBe(root)
    expect(screen.getByTestId('sport-cards-section').parentElement).toBe(root)
    expect(screen.getByTestId('sport-backdrop-note').style.fontSize).toBe('18px')
    expect(screen.getByText('Välj bakgrund per sport. Varje sport visar sin egen bild som standard, Övrigt följer Alla sporter.', { exact: false }).style.fontSize).toBe('18px')
  })
})

describe('Bakgrund i Sport, telefonen', () => {
  it('raden öppnar ett bottenark med valen', () => {
    render(<SportBackdropSettingsTv phone pushLayer={() => () => {}} />)
    fireEvent.click(row('tennis'))
    expect(screen.getByTestId('sport-backdrop-sheet')).toBeTruthy()
    fireEvent.click(screen.getByText('Av'))
    expect(getSportSettings().backdrops.sports).toEqual({ ...OWN, tennis: 'off' })
    expect(thumb('tennis')).toBeNull()
  })
})
