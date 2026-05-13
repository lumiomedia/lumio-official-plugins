import { describe, it, expect } from 'vitest'
import { readPluginJson, writePluginJson, __resetForTests } from '@/lib/plugin-sdk'

describe('vitest bootstrap smoke', () => {
  it('runs at all', () => {
    expect(1 + 1).toBe(2)
  })

  it('resolves the @/lib/plugin-sdk stub', () => {
    __resetForTests()
    writePluginJson('com.lumio.live-tv', 'smoke', { ok: true })
    expect(readPluginJson<{ ok: boolean }>('com.lumio.live-tv', 'smoke', { ok: false })).toEqual({ ok: true })
  })
})
