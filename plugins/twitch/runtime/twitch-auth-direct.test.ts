import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let clientId = 'cid-123'

vi.mock('@/lib/plugin-sdk', () => ({
  isPluginDesktopHost: () => false,
  launchPluginProgram: async () => {},
  getScopedStorageItem: () => null,
  setScopedStorageItem: () => {},
  notifyAuthCapabilitiesChanged: () => {},
}))
vi.mock('./twitch-app-credentials', () => ({
  getTwitchClientId: () => clientId,
  hasTwitchClientId: () => clientId.length > 0,
}))

import { requestDeviceCode, exchangeDeviceCode, DEVICE_URL, TOKEN_URL } from './twitch-auth'

beforeEach(() => { clientId = 'cid-123' })
afterEach(() => { vi.restoreAllMocks() })

describe('device code request', () => {
  it('asks Twitch directly, carrying the user\'s own client id', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        device_code: 'dev', user_code: 'ABCD', verification_uri: 'https://twitch.tv/activate',
        expires_in: 1800, interval: 5,
      }),
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const started = await requestDeviceCode()

    const [url] = fetchMock.mock.calls[0]
    expect(String(url).startsWith(DEVICE_URL)).toBe(true)
    expect(String(url)).toContain('client_id=cid-123')
    expect(started.user_code).toBe('ABCD')
  })
})

describe('device code exchange', () => {
  // Twitch svarar 400 med "authorization_pending" så länge användaren inte
  // godkänt än. Det är INTE ett fel — läses det som ett avbryts inloggningen
  // direkt i stället för att vänta in godkännandet.
  it('reports authorization_pending as a non-fatal pending state', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ status: 400, message: 'authorization_pending' }),
    }) as unknown as typeof fetch

    const result = await exchangeDeviceCode('dev')

    expect(result.ok).toBe(false)
    expect(result.error).toBe('authorization_pending')
  })

  it('returns the rotated tokens on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'at', refresh_token: 'rt', expires_in: 3600 }),
    }) as unknown as typeof fetch

    const result = await exchangeDeviceCode('dev')

    expect(result.ok).toBe(true)
    expect(result.accessToken).toBe('at')
    expect(result.refreshToken).toBe('rt')
    expect(typeof result.expiresAt).toBe('number')
  })

  it('posts to Twitch\'s token endpoint with the device-code grant', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'at', refresh_token: 'rt', expires_in: 3600 }),
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    await exchangeDeviceCode('dev')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(TOKEN_URL)
    expect(init.method).toBe('POST')
    expect(String(init.body)).toContain('grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Adevice_code')
    expect(String(init.body)).toContain('client_id=cid-123')
    // Ingen hemlighet skickas: appen registreras som public client, och en
    // client_secret i webview-lagring vore ett onödigt skyddsvärde.
    expect(String(init.body)).not.toContain('client_secret')
  })
})
