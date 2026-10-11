import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetPluginStorageForTests, __setLangForTests, __setTvModeForTests } from '@/lib/plugin-sdk'
import { SportKeySettingsDesktop, SportKeySettingsTv } from './sport-key-settings'
import { getSportSettings, setProviderKey, setSportSettings } from './sport-store'
import { __resetRouterForTests as __resetBudgetForTests } from './router'

beforeEach(() => { __resetPluginStorageForTests(); __resetBudgetForTests(); __setLangForTests('sv') })
afterEach(() => { cleanup(); __setLangForTests('en'); __setTvModeForTests(false) })

describe('nyckeln i inställningarna', () => {
  it('skrivbord: ett minimalt kort per källa — namn, täckning, statuspiller; ingen nyckel och inga Ta bort-rader', () => {
    setSportSettings({ apiKey: '0123456789abcdef3f9a', provider: 'api-sports', keyPlan: 'Free' })
    render(<SportKeySettingsDesktop />)
    const row = screen.getByTestId('sport-key-row-api-sports')
    expect(row.textContent).toContain('Alla sporter · 100/dag per sport gratis')
    expect(screen.getByTestId('sport-key-status-api-sports').textContent).toBe('Aktiv')
    expect(row.textContent).not.toContain('••••')
    expect(screen.getByTestId('sport-key-status-sportapi').textContent).toBe('Ingen nyckel')
    expect(screen.getByTestId('sport-key-row-sportapi').textContent).toContain('Fotboll · 2 000 anrop/dag gratis')
    expect(screen.queryByText(/0123456789abcdef3f9a/)).toBeNull()
    expect(screen.queryByTestId('sport-key-remove')).toBeNull()
    expect(screen.queryByText(/Källa per sport/)).toBeNull()
  })
  it('skrivbord: kortet öppnar redigeraren med nuvarande nyckel och Ta bort nyckel (med bekräftelse)', () => {
    setSportSettings({ apiKey: '0123456789abcdef3f9a', provider: 'api-sports', keyPlan: 'Free' })
    render(<SportKeySettingsDesktop />)
    fireEvent.click(screen.getByTestId('sport-key-row-api-sports'))
    expect(screen.getByText('API-Sports · Byt nyckel')).toBeTruthy()
    expect(screen.getByTestId('sport-key-current').textContent).toContain('Nuvarande nyckel: ••••3f9a')
    expect(screen.getByTestId('sport-key-input')).toBeTruthy()
    fireEvent.click(screen.getByTestId('sport-key-remove'))
    fireEvent.click(screen.getByTestId('sport-key-remove-confirm-confirm'))
    expect(getSportSettings().apiKey).toBeNull()
  })
  it('utan nyckel visas nyckelkortet direkt', () => {
    render(<SportKeySettingsDesktop />)
    expect(screen.getByTestId('sport-key-card-settings')).toBeTruthy()
  })
  it('skrivbord: en källa utan nyckel öppnar kortet för just den källan, utan Ta bort', () => {
    setProviderKey('api-sports', 'aaaa1111', 'Free')
    render(<SportKeySettingsDesktop />)
    fireEvent.click(screen.getByTestId('sport-key-row-sportapi'))
    expect(screen.getByText('sportapi.ai · Lägg till nyckel')).toBeTruthy()
    expect(screen.getByText('Fotboll: 2 000 anrop/dag gratis')).toBeTruthy()
    expect(screen.queryByTestId('sport-key-remove')).toBeNull()
  })
  it('TV: OK på en källa öppnar redigeraren (telefonens QR) med nuvarande nyckel; Ta bort nyckel tar bort den', () => {
    __setTvModeForTests(true)
    setSportSettings({ apiKey: 'abcdefgh3f9a', provider: 'thesportsdb' })
    setProviderKey('sportapi', 'sk_live_1', null)
    render(<SportKeySettingsTv />)
    expect(screen.getByTestId('sport-key-api-sports').textContent).toContain('Ingen nyckel')
    expect(screen.queryByText(/Ta bort nyckel/)).toBeNull()
    fireEvent.click(screen.getByTestId('sport-key-thesportsdb'))
    expect(screen.getByText('TheSportsDB · Byt nyckel')).toBeTruthy()
    expect(screen.getByText('Skriv in med telefonen')).toBeTruthy()
    expect(screen.getByTestId('sport-key-current').textContent).toContain('••••3f9a')
    fireEvent.click(screen.getByTestId('sport-key-remove'))
    expect(getSportSettings().keys).toEqual({ sportapi: { key: 'sk_live_1', plan: null } })
    expect(screen.getByTestId('sport-key-thesportsdb').textContent).toContain('Ingen nyckel')
  })
  it('TV: en källa utan nyckel öppnar kortet för den, Avbryt stänger', () => {
    setProviderKey('sportapi', 'sk_live_1', null)
    render(<SportKeySettingsTv />)
    fireEvent.click(screen.getByTestId('sport-key-api-sports'))
    expect(screen.getByText('API-Sports · Lägg till nyckel')).toBeTruthy()
    fireEvent.click(screen.getByTestId('sport-key-cancel'))
    expect(screen.getByTestId('sport-key-api-sports')).toBeTruthy()
  })
  it('telefon: Ta bort nyckel i redigeraren med bekräftelse', () => {
    setProviderKey('sportapi', 'sk_live_1', null)
    setProviderKey('api-sports', 'aaaa1111', 'Free')
    render(<SportKeySettingsTv phone />)
    fireEvent.click(screen.getByTestId('sport-key-api-sports'))
    fireEvent.click(screen.getByTestId('sport-key-remove'))
    fireEvent.click(screen.getByTestId('sport-key-remove-confirm-confirm'))
    expect(Object.keys(getSportSettings().keys)).toEqual(['sportapi'])
  })
})
