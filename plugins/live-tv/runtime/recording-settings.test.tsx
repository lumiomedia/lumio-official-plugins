import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
vi.mock('@/lib/plugin-sdk', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/lib/plugin-sdk')
  return { ...actual, isAndroidTauriEnv: false }
})
import { __resetForTests } from '@/lib/plugin-sdk'
import { RecordingSettingsDesktop, RecordingSettingsRows, RecordingSettingsTvRows } from './recording-settings'
import { getTvSettings } from './tv/tv-settings-store'
import { tvText, type TvStringKey } from './tv/tv-strings'

const tt = (key: TvStringKey, vars?: Record<string, string | number>) => tvText('en', key, vars)
afterEach(() => { cleanup(); __resetForTests() })

describe('timeshift on this device — not Android', () => {
  it('hides the per-device switch where mpv handles the buffer itself', () => {
    render(<RecordingSettingsRows settings={getTvSettings()} tt={tt} phone onOpen={() => {}} />)
    expect(screen.queryByTestId('setting-timeshiftDevice')).toBeNull()
    expect(screen.getByTestId('setting-timeshiftEnabled')).toBeTruthy()
    cleanup()
    render(<RecordingSettingsDesktop tvSettings={getTvSettings()} tt={tt} />)
    expect(screen.queryByTestId('lt-timeshift-device')).toBeNull()
    cleanup()
    render(<RecordingSettingsTvRows tvSettings={getTvSettings()} tt={tt} />)
    expect(screen.queryByTestId('tv-timeshift-device')).toBeNull()
  })
})
