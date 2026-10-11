import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetPluginStorageForTests, __setLangForTests } from '@/lib/plugin-sdk'
import { SportKeySettingsDesktop, SportKeySettingsTv } from './sport-key-settings'
import { getSportSettings, setSportSettings } from './sport-store'
import { __resetBudgetForTests } from './budget'

beforeEach(() => { __resetPluginStorageForTests(); __resetBudgetForTests(); __setLangForTests('sv') })
afterEach(() => { cleanup(); __setLangForTests('en') })

describe('nyckeln i inställningarna', () => {
  it('skrivbord: maskerad nyckel, källa, och Ta bort nyckel med bekräftelse', () => {
    setSportSettings({ apiKey: '0123456789abcdef3f9a', provider: 'api-sports', keyPlan: 'Free' })
    render(<SportKeySettingsDesktop />)
    expect(screen.getByText('••••3f9a')).toBeTruthy()
    expect(screen.getByText('API-Sports')).toBeTruthy()
    expect(screen.queryByText('0123456789abcdef3f9a')).toBeNull()
    fireEvent.click(screen.getByText('Ta bort nyckel'))
    fireEvent.click(screen.getAllByText('Ta bort nyckel').at(-1)!)
    expect(getSportSettings().apiKey).toBeNull()
  })
  it('utan nyckel visas nyckelkortet direkt', () => {
    render(<SportKeySettingsDesktop />)
    expect(screen.getByTestId('sport-key-card-settings')).toBeTruthy()
  })
  it('TV-raderna: Nyckel ••••3f9a och Ta bort nyckel', () => {
    setSportSettings({ apiKey: 'abcdefgh3f9a', provider: 'thesportsdb' })
    render(<SportKeySettingsTv />)
    expect(screen.getByText('••••3f9a')).toBeTruthy()
    expect(screen.getByText('TheSportsDB')).toBeTruthy()
    expect(screen.getByText('Ta bort nyckel')).toBeTruthy()
  })
})
