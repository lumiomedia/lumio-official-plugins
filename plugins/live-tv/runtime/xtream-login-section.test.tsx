import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { __resetForTests } from '@/lib/plugin-sdk'
import { __resetXtreamAccountCacheForTests, getLiveTvLists, getXtreamLogins } from './live-tv-data'
import { XtreamLoginSection } from './xtream-login-section'

beforeEach(() => { __resetForTests(); __resetXtreamAccountCacheForTests() })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('XtreamLoginSection (handoff §3 block 4)', () => {
  it('tre rader — Server URL, Username, Password — och knappen Log in & fetch', () => {
    render(<XtreamLoginSection />)
    expect(screen.getByLabelText('Server URL')).toHaveAttribute('placeholder', 'http://host:8080')
    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: 'Log in & fetch' })).toBeInTheDocument()
    // Kontokorten bor på spellistans kort nu, inte här.
    expect(screen.queryByText(/expires/)).toBeNull()
  })
  it('nekad inloggning visas med handoffens text', async () => {
    vi.stubGlobal('fetch', ((input: RequestInfo | URL) => {
      const raw = typeof input === 'string' ? input : String(input)
      if (raw.includes('player_api.php')) return Promise.resolve({ ok: true, status: 200, json: async () => ({ user_info: { auth: 0 } }) } as unknown as Response)
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) } as unknown as Response)
    }) as typeof fetch)
    render(<XtreamLoginSection />)
    fireEvent.change(screen.getByLabelText('Server URL'), { target: { value: 'http://panel.test:8080' } })
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'u' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'p' } })
    fireEvent.click(screen.getByRole('button', { name: 'Log in & fetch' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Login rejected — check the username and password.')
    expect(getXtreamLogins()).toHaveLength(0)
  })
  it('lyckad inloggning sparar inloggningen, importerar listan och ropar onImported', async () => {
    const json = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: async () => body } as unknown as Response)
    vi.stubGlobal('fetch', ((input: RequestInfo | URL) => {
      const raw = typeof input === 'string' ? input : String(input)
      if (raw.includes('player_api.php')) return json({ user_info: { auth: 1, status: 'Active', allowed_output_formats: ['ts'] } })
      const path = new URL(raw, 'http://localhost').pathname
      if (path === '/api/live-tv/import') return json({ job: 'job-1' })
      if (path === '/api/live-tv/import/status') return json({ state: 'done', received: 5, total: 5, result: { total: 5, groups: [], urlTvg: null, truncated: false } })
      return json({})
    }) as typeof fetch)
    const onImported = vi.fn()
    render(<XtreamLoginSection onImported={onImported} />)
    fireEvent.change(screen.getByLabelText('Server URL'), { target: { value: 'http://panel.test:8080' } })
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'u' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'p' } })
    fireEvent.click(screen.getByRole('button', { name: 'Log in & fetch' }))
    await waitFor(() => expect(onImported).toHaveBeenCalledTimes(1))
    expect(onImported.mock.calls[0][1]).toBe(false)
    expect(getXtreamLogins()).toHaveLength(1)
    expect(getLiveTvLists()[0]?.kind).toBe('xtream')
    expect(getLiveTvLists()[0]?.channelCount).toBe(5)
  })
})
