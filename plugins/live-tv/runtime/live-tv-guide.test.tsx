import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from './live-tv-data'
import { __resetLiveTvModelForTests } from './live-tv-model'
import { __resetScheduleCacheForTests } from './epg/schedule-cache'
import { LiveTvGuide } from './live-tv-guide'

const SOURCE = 'http://panel.tld/list.m3u'
const now = Date.now()

/**
 * 260 kanaler, och BARA nummer 250 har tablå.
 *
 * Det är fallet som gamla taket missade: guiden tog de första 400 (efter att
 * ha laddat hela listan) och frågade om tablå för dem. Med taket sänkt till en
 * sida — eller med en panel där de första hundratals kanalerna saknar tablå —
 * blev guiden tom fast listan var full av kanaler med program.
 */
const CHANNELS = Array.from({ length: 260 }, (_, i) => ({
  name: `K${i}`,
  logo: null,
  group: 'Alla',
  url: `http://x/${i}`,
  tvgId: null,
  key: `K${i}::http://x/${i}`,
  number: i + 1,
  tvgIdResolved: null,
}))
const WITH_EPG = CHANNELS[250]

const list: LiveTvList = {
  id: 'l1',
  name: 'Panel',
  kind: 'm3u',
  source: SOURCE,
  url: SOURCE,
  createdAt: '',
  urlTvg: 'http://panel.tld/xmltv',
  epgUrls: [],
  autoEpgDisabled: false,
  fetchedAt: null,
  channels: [],
} as LiveTvList

let queryLimits: number[] = []

function json(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as unknown as Response
}

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  __resetLiveTvModelForTests()
  __resetScheduleCacheForTests()
  __setTvModeForTests(false)
  queryLimits = []
  writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_storage_v2_migrated', true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])

  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost')
    if (url.pathname === '/api/live-tv/status') return json({ sources: [SOURCE] })
    if (url.pathname === '/api/live-tv/query') {
      const offset = Number(url.searchParams.get('offset') ?? 0)
      const limit = Number(url.searchParams.get('limit') ?? 5000)
      queryLimits.push(limit)
      return json({ items: CHANNELS.slice(offset, offset + limit), total: CHANNELS.length, known: true })
    }
    if (url.pathname === '/api/live-tv/epg/schedule') {
      const body = JSON.parse(String(init?.body ?? '{}')) as { keys?: string[] }
      const items: Record<string, unknown> = {}
      if ((body.keys ?? []).includes(WITH_EPG.key)) {
        items[WITH_EPG.key] = [{ title: 'Sen kväll', start: now, stop: now + 3_600_000 }]
      }
      return json({ items })
    }
    if (url.pathname === '/api/live-tv/epg/now') return json({ at: now, fetchedAt: now, items: {} })
    return json({})
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('LiveTvGuide', () => {
  it('hämtar fler kanalsidor tills raderna med tablå hittats', async () => {
    render(<LiveTvGuide open onClose={() => {}} onPlayChannel={() => {}} />)

    // Kanalen ligger bortom första sidan — guiden måste ha hämtat en till.
    expect(await screen.findByText('Sen kväll')).toBeInTheDocument()
    expect(screen.getAllByText('K250').length).toBeGreaterThan(0)
    await waitFor(() => expect(Math.max(...queryLimits)).toBeGreaterThan(200))
  })

  it('laddar aldrig hela panelen — sidan är kapad', async () => {
    render(<LiveTvGuide open onClose={() => {}} onPlayChannel={() => {}} />)
    await screen.findByText('Sen kväll')
    // 260 kanaler finns; guiden bad aldrig om alla på en gång.
    expect(queryLimits.every((limit) => limit <= 1000)).toBe(true)
    expect(queryLimits[0]).toBe(200)
  })
})
