import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
// Raderna läser inspelningslistan (ledigt utrymme); ingen app i testet.
beforeEach(() => { vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ recordings: [], folder: '/r', freeBytes: 5_000_000_000, keepFreeBytes: 2_000_000_000 }), { status: 200, headers: { 'content-type': 'application/json' } }))) })
afterEach(() => { cleanup(); __resetForTests(); vi.unstubAllGlobals() })

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

describe('recording settings parity (Jerry 2026-11-10: every setting on every surface)', () => {
  it('the TV rows and the plugin rows carry keep-free and free-space like the desktop card', () => {
    render(<RecordingSettingsTvRows tvSettings={getTvSettings()} tt={tt} />)
    expect(screen.getByTestId('tv-record-keep-free')).toHaveTextContent('Keep free')
    expect(screen.getByTestId('tv-record-free-space')).toBeTruthy()
    cleanup()
    render(<RecordingSettingsRows settings={getTvSettings()} tt={tt} phone onOpen={() => {}} />)
    expect(screen.getByTestId('setting-recordKeepFree')).toHaveTextContent('Keep free')
    expect(screen.getByTestId('setting-recordFreeSpace')).toBeTruthy()
  })
})
