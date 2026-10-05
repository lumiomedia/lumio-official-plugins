import { describe, expect, it, vi } from 'vitest'
import { createDeviceAuth, type OauthToken } from './device-auth'

type Reply = { status: number; data: Record<string, unknown> }

function setup(replies: Reply[], initialToken: OauthToken | null = null) {
  let clock = 1_000_000
  let token = initialToken
  let scope = 'p1'
  const scheduled: Array<{ fn: () => void; ms: number }> = []
  const oauth = vi.fn(async () => replies.shift() ?? { status: 500, data: {} })
  const onConnected = vi.fn(async () => {})
  const auth = createDeviceAuth({
    oauth,
    readToken: () => token,
    writeToken: (next) => { token = next },
    now: () => clock,
    schedule: (fn, ms) => { scheduled.push({ fn, ms }); return scheduled.length },
    cancel: () => {},
    clientId: 'cid',
    log: () => {},
    onConnected,
    scopeId: () => scope,
  })
  const runNext = async () => {
    const next = scheduled.shift()
    if (!next) throw new Error('inget schemalagt')
    clock += next.ms
    next.fn()
    await new Promise((r) => setTimeout(r, 0))
    return next.ms
  }
  return {
    auth, oauth, onConnected, runNext, scheduled, token: () => token, tick: (ms: number) => { clock += ms },
    setToken: (t: OauthToken | null) => { token = t }, setScope: (s: string) => { scope = s },
  }
}

const deviceReply: Reply = {
  status: 200,
  data: {
    device_code: 'DEV', user_code: 'WDJB-MJHT', verification_uri: 'https://mdblist.com/oauth/device/',
    verification_uri_complete: 'https://mdblist.com/oauth/device/?user_code=WDJB-MJHT', expires_in: 300, interval: 5,
  },
}

describe('enhetsflödet', () => {
  it('start visar koden och schemalägger polling enligt interval', async () => {
    const { auth, oauth, scheduled } = setup([deviceReply])
    await auth.start()
    expect(oauth).toHaveBeenCalledWith('device-authorization', { client_id: 'cid', scope: 'write' })
    expect(auth.state()).toMatchObject({
      phase: 'waiting', userCode: 'WDJB-MJHT',
      verificationUriComplete: 'https://mdblist.com/oauth/device/?user_code=WDJB-MJHT',
    })
    expect(scheduled[0].ms).toBe(5_000)
  })

  it('authorization_pending fortsätter, slow_down ökar intervallet med 5 s', async () => {
    const { auth, runNext, scheduled } = setup([
      deviceReply,
      { status: 400, data: { error: 'authorization_pending' } },
      { status: 400, data: { error: 'slow_down' } },
    ])
    await auth.start()
    await runNext()
    expect(scheduled[0].ms).toBe(5_000)
    await runNext()
    expect(scheduled[0].ms).toBe(10_000)
    expect(auth.state().phase).toBe('waiting')
  })

  it('en token sparas, värden kontrollerar, och fasen blir done', async () => {
    const { auth, runNext, onConnected, token, oauth } = setup([
      deviceReply,
      { status: 200, data: { access_token: 'A', refresh_token: 'R', expires_in: 2_592_000 } },
    ])
    await auth.start()
    await runNext()
    expect(oauth).toHaveBeenLastCalledWith('token', {
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code', device_code: 'DEV', client_id: 'cid',
    })
    expect(token()).toMatchObject({ accessToken: 'A', refreshToken: 'R' })
    expect(onConnected).toHaveBeenCalled()
    expect(auth.state().phase).toBe('done')
  })

  it('expired_token och access_denied avslutar', async () => {
    const a = setup([deviceReply, { status: 400, data: { error: 'expired_token' } }])
    await a.auth.start()
    await a.runNext()
    expect(a.auth.state().phase).toBe('expired')
    const b = setup([deviceReply, { status: 400, data: { error: 'access_denied' } }])
    await b.auth.start()
    await b.runNext()
    expect(b.auth.state().phase).toBe('denied')
  })

  it('koden går ut av sig själv efter expires_in', async () => {
    const { auth, runNext, tick, oauth } = setup([deviceReply])
    await auth.start()
    tick(300_000)
    await runNext()
    expect(auth.state().phase).toBe('expired')
    expect(oauth).toHaveBeenCalledTimes(1)
  })
})

describe('token', () => {
  const fresh = (expiresAt: number): OauthToken => ({ accessToken: 'A', refreshToken: 'R', expiresAt })

  it('en token med mer än ett dygn kvar används som den är', async () => {
    const { auth, oauth } = setup([], fresh(1_000_000 + 3 * 86_400_000))
    expect(await auth.getAccessToken()).toBe('A')
    expect(oauth).not.toHaveBeenCalled()
  })

  it('förnyas när mindre än ett dygn återstår', async () => {
    const { auth, oauth, token } = setup(
      [{ status: 200, data: { access_token: 'A2', refresh_token: 'R2', expires_in: 2_592_000 } }],
      fresh(1_000_000 + 3_600_000),
    )
    expect(await auth.getAccessToken()).toBe('A2')
    expect(oauth).toHaveBeenCalledWith('token', { grant_type: 'refresh_token', refresh_token: 'R', client_id: 'cid' })
    expect(token()?.refreshToken).toBe('R2')
  })

  it('invalid_grant vid förnyelse raderar token', async () => {
    const { auth, token } = setup([{ status: 400, data: { error: 'invalid_grant' } }], fresh(1_000_000 + 3_600_000))
    expect(await auth.getAccessToken()).toBeNull()
    expect(token()).toBeNull()
  })

  it('nätverksfel vid förnyelse behåller en giltig token', async () => {
    const { auth, token } = setup([{ status: 502, data: {} }], fresh(1_000_000 + 3_600_000))
    expect(await auth.getAccessToken()).toBe('A')
    expect(token()).not.toBeNull()
  })

  it('koppla från återkallar och raderar', async () => {
    const { auth, oauth, token } = setup([{ status: 200, data: {} }], fresh(1_000_000 + 3 * 86_400_000))
    await auth.disconnect()
    expect(oauth).toHaveBeenCalledWith('revoke_token', { token: 'A', client_id: 'cid' })
    expect(token()).toBeNull()
  })

  it('I6: en misslyckad förnyelse försöks inte igen förrän efter 5 minuter', async () => {
    const { auth, oauth, tick } = setup([{ status: 502, data: {} }, { status: 502, data: {} }], fresh(1_000_000 + 3_600_000))
    await auth.getAccessToken()
    await auth.getAccessToken()
    expect(oauth).toHaveBeenCalledTimes(1)
    tick(5 * 60_000 + 1)
    await auth.getAccessToken()
    expect(oauth).toHaveBeenCalledTimes(2)
  })

  it('I6: invalid_grant när en annan enhet redan förnyat — den nya token används, inget raderas', async () => {
    const replies: Reply[] = []
    const s = setup(replies, fresh(1_000_000 + 3_600_000))
    replies.push({ status: 400, data: { error: 'invalid_grant' } })
    s.oauth.mockImplementationOnce(async () => {
      s.setToken({ accessToken: 'B', refreshToken: 'R-other', expiresAt: 1_000_000 + 30 * 86_400_000 })
      return { status: 400, data: { error: 'invalid_grant' } }
    })
    expect(await s.auth.getAccessToken()).toBe('B')
    expect(s.token()?.accessToken).toBe('B')
  })

  it('I6: en förnyelse som landar efter frånkoppling skriver inte tillbaka token', async () => {
    let release: (r: Reply) => void = () => {}
    const s = setup([], fresh(1_000_000 + 3_600_000))
    s.oauth.mockImplementationOnce(() => new Promise<Reply>((resolve) => { release = resolve }))
    const pending = s.auth.getAccessToken()
    await s.auth.disconnect()
    release({ status: 200, data: { access_token: 'A2', refresh_token: 'R2', expires_in: 100 } })
    await pending
    expect(s.token()).toBeNull()
  })

  it('I1: en förnyelse som landar efter profilbyte skriver inte i den nya profilen', async () => {
    let release: (r: Reply) => void = () => {}
    const s = setup([], fresh(1_000_000 + 3_600_000))
    s.oauth.mockImplementationOnce(() => new Promise<Reply>((resolve) => { release = resolve }))
    const pending = s.auth.getAccessToken()
    s.setScope('p2')
    s.setToken(null)
    release({ status: 200, data: { access_token: 'A2', refresh_token: 'R2', expires_in: 100 } })
    await pending
    expect(s.token()).toBeNull()
  })
})
