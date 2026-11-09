import { afterEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { __resetForTests, readPluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from './live-tv-data'
import { TIMESHIFT_DEVICE_KEY, getTimeshiftOnDevice, setTimeshiftOnDevice, useTimeshiftOnDevice } from './timeshift-device'

afterEach(() => __resetForTests())

describe('timeshift on this device', () => {
  it('is off until the device turns it on, and lives in its own key', () => {
    expect(getTimeshiftOnDevice()).toBe(false)
    setTimeshiftOnDevice(true)
    expect(getTimeshiftOnDevice()).toBe(true)
    expect(readPluginJson(LIVE_TV_PLUGIN_ID, TIMESHIFT_DEVICE_KEY, null)).toBe(true)
    expect(TIMESHIFT_DEVICE_KEY).toBe('live_tv_timeshift_device_v1')
  })
  it('the hook follows changes', () => {
    const { result } = renderHook(() => useTimeshiftOnDevice())
    expect(result.current).toBe(false)
    act(() => setTimeshiftOnDevice(true))
    expect(result.current).toBe(true)
  })
})
