import { describe, expect, it, vi } from 'vitest'
import { buildTvRows, type TvView } from './rows'

const base: TvView = {
  status: { connection: 'ok', username: 'jerry', supporter: false, accountKey: 'id:1', lastSyncAt: null, lastChanges: 0, pausedUntil: 0, syncing: false },
  prefs: { scrobble: true, watched: false, watchlist: true },
  hasAuth: true,
  viaOauth: true,
  device: { phase: 'idle' },
  traktConnected: false,
  now: 0,
}
const actions = () => ({ setPref: vi.fn(), syncNow: vi.fn(), connect: vi.fn(), cancelConnect: vi.fn(), disconnect: vi.fn() })
const types = (view: TvView) => buildTvRows(view, actions()).map((r) => r.t)

describe('TV-raderna', () => {
  it('ansluten: konto, tre reglage, synkrad och knapp', () => {
    expect(types(base)).toEqual(['eyebrow', 'action', 'action', 'eyebrow', 'toggle', 'toggle', 'toggle', 'note', 'action'])
    const account = buildTvRows(base, actions())[1] as { value: { sv: string } }
    expect(account.value.sv).toBe('Ansluten som jerry')
  })

  it('inte ansluten: bara knappen Anslut, inga reglage', () => {
    const view = { ...base, hasAuth: false, viaOauth: false, status: { ...base.status, connection: 'none' as const, username: null } }
    const rows = buildTvRows(view, actions())
    expect(rows.map((r) => r.t)).toEqual(['eyebrow', 'action'])
    expect((rows[1] as { label: { sv: string } }).label.sv).toBe('Anslut med MDBList')
  })

  it('väntar på godkännande: kod som qr-rad med länk, nedräkning och Avbryt', () => {
    const view: TvView = {
      ...base, hasAuth: false, viaOauth: false, now: 0,
      device: { phase: 'waiting', userCode: 'WDJB-MJHT', verificationUriComplete: 'https://mdblist.com/oauth/device/?user_code=WDJB-MJHT', expiresAt: 272_000 },
    }
    const rows = buildTvRows(view, actions())
    const qr = rows.find((r) => r.t === 'qr') as { value: string; url?: string }
    expect(qr.value).toBe('WDJB-MJHT')
    expect(qr.url).toContain('user_code=WDJB-MJHT')
    expect(rows.some((r) => r.t === 'note' && (r as { text: { sv: string } }).text.sv.includes('4:32'))).toBe(true)
  })

  it('utgången kod: förklaring och Visa ny kod', () => {
    const a = actions()
    const rows = buildTvRows({ ...base, hasAuth: false, device: { phase: 'expired' } }, a)
    const retry = rows.find((r) => r.t === 'action' && (r as { label: { sv: string } }).label.sv === 'Visa ny kod') as { run: () => void }
    retry.run()
    expect(a.connect).toHaveBeenCalled()
  })

  it('Trakt anslutet och scrobble på → tipset som note', () => {
    const rows = buildTvRows({ ...base, traktConnected: true }, actions())
    expect(rows.some((r) => r.t === 'note' && (r as { text: { sv: string } }).text.sv.includes('Trakt'))).toBe(true)
  })

  it('reglaget anropar setPref', () => {
    const a = actions()
    const rows = buildTvRows(base, a)
    const watched = rows.filter((r) => r.t === 'toggle')[1] as { set: (v: boolean) => void }
    watched.set(true)
    expect(a.setPref).toHaveBeenCalledWith('watched', true)
  })
})
