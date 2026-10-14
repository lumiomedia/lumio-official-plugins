import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetPluginStorageForTests, __setLangForTests } from '@/lib/plugin-sdk'
import { SportSpoilerSettingsDesktop, SportSpoilerSettingsTv } from './sport-spoiler-settings'
import { getSportSettings } from './sport-store'

beforeEach(() => { __resetPluginStorageForTests(); __setLangForTests('sv') })
afterEach(() => { cleanup(); __setLangForTests('en') })

describe('Dölj resultat i repriser', () => {
  it('TV: raden är en station och OK växlar', () => {
    render(<SportSpoilerSettingsTv />)
    const row = screen.getByTestId('sport-spoiler-toggle')
    expect(row).toHaveAttribute('data-f')
    expect(row).toHaveTextContent('Dölj resultat i repriser')
    fireEvent.click(row)
    expect(getSportSettings().spoilerReplays).toBe(false)
    fireEvent.click(row)
    expect(getSportSettings().spoilerReplays).toBe(true)
  })
  it('telefon: samma rad', () => {
    render(<SportSpoilerSettingsTv phone />)
    fireEvent.click(screen.getByTestId('sport-spoiler-toggle'))
    expect(getSportSettings().spoilerReplays).toBe(false)
  })
  it('skrivbord: växeln', () => {
    render(<SportSpoilerSettingsDesktop />)
    const sw = screen.getByRole('switch', { name: 'Dölj resultat i repriser' })
    expect(sw).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(sw)
    expect(getSportSettings().spoilerReplays).toBe(false)
  })
})
