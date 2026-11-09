import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
vi.mock('@/lib/plugin-sdk', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/lib/plugin-sdk')
  return { ...actual, isAndroidTauriEnv: true }
})
import { __resetForTests } from '@/lib/plugin-sdk'
import { RecordingSettingsDesktop, RecordingSettingsRows, RecordingSettingsTvRows } from './recording-settings'
import { getTvSettings } from './tv/tv-settings-store'
import { tvText, type TvStringKey } from './tv/tv-strings'

const tt = (key: TvStringKey, vars?: Record<string, string | number>) => tvText('en', key, vars)
afterEach(() => { cleanup(); __resetForTests() })

describe('timeshift on this device — Android', () => {
  it('shows the per-device switch on all three surfaces', () => {
    render(<RecordingSettingsRows settings={getTvSettings()} tt={tt} phone onOpen={() => {}} />)
    expect(screen.getByTestId('setting-timeshiftDevice')).toHaveTextContent('Pause live TV on this device')
    cleanup()
    render(<RecordingSettingsDesktop tvSettings={getTvSettings()} tt={tt} />)
    expect(screen.getByTestId('lt-timeshift-device')).toBeTruthy()
    cleanup()
    render(<RecordingSettingsTvRows tvSettings={getTvSettings()} tt={tt} />)
    expect(screen.getByTestId('tv-timeshift-device')).toBeTruthy()
  })
})
