import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let clientId = ''
let sessionToken: string | null = null

vi.mock('./twitch-app-credentials', () => ({
  getTwitchClientId: () => clientId,
  hasTwitchClientId: () => clientId.length > 0,
}))
vi.mock('./twitch-storage', () => ({
  getTwitchSession: () => (sessionToken ? { accessToken: sessionToken } : null),
}))

import { getTopCategories, TwitchNotConfiguredError } from './twitch-client'

function mockFetchOk() {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: [], pagination: {} }),
  })
  globalThis.fetch = fetchMock as unknown as typeof fetch
  return fetchMock
}

beforeEach(() => { clientId = 'cid-123'; sessionToken = 'tok-abc' })
afterEach(() => { vi.restoreAllMocks() })

describe('helix requests', () => {
  it('sends the user\'s own Client-Id and their bearer token', async () => {
    const fetchMock = mockFetchOk()
    await getTopCategories()
    const [, init] = fetchMock.mock.calls[0]
    expect((init.headers as Record<string, string>)['Client-Id']).toBe('cid-123')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok-abc')
  })

  // Utan proxyn finns inget app-token att falla tillbaka på: varje anrop bärs
  // av användarens eget token. Saknas registreringen ska det sägas rakt ut i
  // stället för att Twitch svarar 401 och gränssnittet visar en tom sida —
  // det var precis vad testarna såg ("Twitch no working").
  it('fails with a configuration error when no app is registered', async () => {
    clientId = ''
    mockFetchOk()
    await expect(getTopCategories()).rejects.toBeInstanceOf(TwitchNotConfiguredError)
  })

  it('fails with a configuration error when nobody is signed in', async () => {
    sessionToken = null
    mockFetchOk()
    await expect(getTopCategories()).rejects.toBeInstanceOf(TwitchNotConfiguredError)
  })

  it('does not call Twitch at all when unconfigured', async () => {
    clientId = ''
    const fetchMock = mockFetchOk()
    await getTopCategories().catch(() => {})
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
