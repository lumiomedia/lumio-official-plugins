import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
// Raderna läser inspelningslistan (ledigt utrymme); ingen app i testet.
beforeEach(() => { vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ recordings: [], folder: '/r', freeBytes: 5_000_000_000, keepFreeBytes: 2_000_000_000 }), { status: 200, headers: { 'content-type': 'application/json' } }))) })
afterEach(() => { cleanup(); __resetForTests(); vi.unstubAllGlobals() })

describe('timeshift on this device — Android', () => {
  it('shows ONE Pause live TV row per surface, bound to this device (Jerry 2026-11-10: two rows were confusing)', () => {
    render(<RecordingSettingsRows settings={getTvSettings()} tt={tt} phone onOpen={() => {}} />)
    expect(screen.getByTestId('setting-timeshiftDevice')).toHaveTextContent('Pause live TV')
    expect(screen.queryByTestId('setting-timeshiftEnabled')).toBeNull()
    cleanup()
    render(<RecordingSettingsDesktop tvSettings={getTvSettings()} tt={tt} />)
    expect(screen.getByTestId('lt-timeshift-device')).toBeTruthy()
    expect(screen.queryByTestId('lt-timeshift-enabled')).toBeNull()
    cleanup()
    render(<RecordingSettingsTvRows tvSettings={getTvSettings()} tt={tt} />)
    expect(screen.getByTestId('tv-timeshift-device')).toBeTruthy()
    expect(screen.queryByTestId('tv-timeshift-enabled')).toBeNull()
  })
})
