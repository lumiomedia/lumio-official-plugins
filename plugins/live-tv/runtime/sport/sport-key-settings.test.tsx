import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetPluginStorageForTests, __setLangForTests } from '@/lib/plugin-sdk'
import { SportKeySettingsDesktop, SportKeySettingsTv } from './sport-key-settings'
import { getSportSettings, setProviderKey, setSportSettings } from './sport-store'
import { __resetRouterForTests as __resetBudgetForTests } from './router'

beforeEach(() => { __resetPluginStorageForTests(); __resetBudgetForTests(); __setLangForTests('sv') })
afterEach(() => { cleanup(); __setLangForTests('en') })

describe('nyckeln i inställningarna', () => {
  it('skrivbord: Nycklar med status per källa, och Ta bort nyckel med bekräftelse', () => {
    setSportSettings({ apiKey: '0123456789abcdef3f9a', provider: 'api-sports', keyPlan: 'Free' })
    render(<SportKeySettingsDesktop />)
    expect(screen.getByTestId('sport-key-row-api-sports').textContent).toContain('••••3f9a')
    expect(screen.getByTestId('sport-key-row-sportapi').textContent).toContain('Ingen nyckel')
    expect(screen.queryByText(/0123456789abcdef3f9a/)).toBeNull()
    fireEvent.click(screen.getByTestId('sport-key-remove-api-sports'))
    fireEvent.click(screen.getAllByText('Ta bort nyckel').at(-1)!)
    expect(getSportSettings().apiKey).toBeNull()
  })
  it('utan nyckel visas nyckelkortet direkt', () => {
    render(<SportKeySettingsDesktop />)
    expect(screen.getByTestId('sport-key-card-settings')).toBeTruthy()
  })
  it('skrivbord: Lägg till för en källa öppnar kortet för just den källan; flera källor samtidigt', () => {
    setProviderKey('api-sports', 'aaaa1111', 'Free')
    render(<SportKeySettingsDesktop />)
    fireEvent.click(screen.getByTestId('sport-key-add-sportapi'))
    expect(screen.getByText('sportapi.ai · Lägg till nyckel')).toBeTruthy()
    expect(screen.getByText('Fotboll: 2 000 anrop/dag gratis')).toBeTruthy()
  })
  it('skrivbord: Källa per sport visar ordningen och flyttar upp/ned', () => {
    setProviderKey('api-sports', 'aaaa1111', 'Free')
    setProviderKey('sportapi', 'sk_live_1', null)
    render(<SportKeySettingsDesktop />)
    expect(screen.getByTestId('sport-order-football').textContent).toMatch(/1\. sportapi\.ai.*2\. API-Sports.*3\. TheSportsDB \(ingen nyckel\)/)
    fireEvent.click(screen.getByTestId('sport-order-up-football-api-sports'))
    expect(getSportSettings().order.football).toEqual(['api-sports', 'sportapi', 'thesportsdb'])
    expect(screen.queryByTestId('sport-order-motorsport')).toBeNull()
  })
  it('TV-raderna: en rad per källa, Ta bort per källa, och OK flyttar en källa upp', () => {
    setSportSettings({ apiKey: 'abcdefgh3f9a', provider: 'thesportsdb' })
    setProviderKey('sportapi', 'sk_live_1', null)
    render(<SportKeySettingsTv />)
    expect(screen.getByTestId('sport-key-thesportsdb').textContent).toContain('••••3f9a')
    expect(screen.getByTestId('sport-key-api-sports').textContent).toContain('Ingen nyckel')
    expect(screen.getByText('Ta bort nyckel · TheSportsDB')).toBeTruthy()
    fireEvent.click(screen.getByTestId('sport-order-football-thesportsdb'))
    expect(getSportSettings().order.football).toEqual(['sportapi', 'thesportsdb', 'api-sports'])
    fireEvent.click(screen.getByText('Ta bort nyckel · TheSportsDB'))
    expect(getSportSettings().keys).toEqual({ sportapi: { key: 'sk_live_1', plan: null } })
  })
  it('TV: OK på en källa öppnar nyckelkortet för den (telefonens QR), Avbryt stänger', () => {
    setProviderKey('sportapi', 'sk_live_1', null)
    render(<SportKeySettingsTv />)
    fireEvent.click(screen.getByTestId('sport-key-api-sports'))
    expect(screen.getByText('API-Sports · Lägg till nyckel')).toBeTruthy()
    fireEvent.click(screen.getByTestId('sport-key-cancel'))
    expect(screen.getByTestId('sport-key-api-sports')).toBeTruthy()
  })
})
