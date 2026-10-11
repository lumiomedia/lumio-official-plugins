import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetPluginStorageForTests, __setHomeBackgroundUrlsForTests, __setLangForTests } from '@/lib/plugin-sdk'
import { SportBackdropSettingsDesktop, SportBackdropSettingsTv } from './sport-backdrop-settings'
import { getSportSettings } from './sport-store'

beforeEach(() => { __resetPluginStorageForTests(); __setLangForTests('sv') })
afterEach(() => { cleanup(); __setLangForTests('en') })

describe('Bakgrund i Sport, inställningen', () => {
  it('skrivbord: Automatisk som standard; Egen bild med startsidans bilder och en länk; Av', () => {
    __setHomeBackgroundUrlsForTests(['https://img.example/a.jpg', 'data:image/png;base64,AA'])
    render(<SportBackdropSettingsDesktop />)
    expect(getSportSettings().backdrop).toBe('auto')
    fireEvent.click(screen.getByText('Egen bild'))
    expect(getSportSettings().backdrop).toBe('custom')
    fireEvent.click(screen.getByTestId('sport-backdrop-home-1'))
    expect(getSportSettings().backdropCustom).toEqual({ from: 'home', index: 1 })
    fireEvent.change(screen.getByPlaceholderText('https://…'), { target: { value: 'https://min.server/bild.jpg' } })
    fireEvent.click(screen.getByText('Använd'))
    expect(getSportSettings().backdropCustom).toEqual({ from: 'url', url: 'https://min.server/bild.jpg' })
    fireEvent.click(screen.getByText('Av'))
    expect(getSportSettings().backdrop).toBe('off')
  })
  it('TV-raderna: läget stegar Automatisk → Egen bild → Av, och startsidans bilder stegas', () => {
    __setHomeBackgroundUrlsForTests(['https://img.example/a.jpg', 'https://img.example/b.jpg'])
    render(<SportBackdropSettingsTv />)
    fireEvent.click(screen.getByTestId('sport-backdrop-mode'))
    expect(getSportSettings().backdrop).toBe('custom')
    fireEvent.click(screen.getByTestId('sport-backdrop-home'))
    expect(getSportSettings().backdropCustom).toEqual({ from: 'home', index: 0 })
    fireEvent.click(screen.getByTestId('sport-backdrop-home'))
    expect(screen.getByText('Bild 2 av 2')).toBeTruthy()
    fireEvent.click(screen.getByTestId('sport-backdrop-mode'))
    expect(getSportSettings().backdrop).toBe('off')
    expect(screen.queryByTestId('sport-backdrop-home')).toBeNull()
  })
})
