import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetForTests } from '@/lib/plugin-sdk'
import { RemoteTab } from './remote-settings'
import { DEFAULT_REMOTE_BINDINGS, setRemoteBinding } from './remote-keys'
import { getTvSettings } from './tv-settings-store'
import { tvText } from './tv-strings'

const tt = (key: Parameters<typeof tvText>[1], vars?: Record<string, string | number>) => tvText('en', key, vars)
const nav = { pushLayer: () => () => {}, toast: vi.fn() }

beforeEach(() => __resetForTests())
afterEach(cleanup)

describe('Fjärrkontroll-fliken', () => {
  it('en rad per förvald knapp med vad den gör; pilarna visar håll', () => {
    render(<RemoteTab bindings={setRemoteBinding(DEFAULT_REMOTE_BINDINGS, 'ArrowLeft', 'long', 'lastChannel')} nav={nav} tt={tt} />)
    expect(screen.getByTestId('remote-key-Info')).toHaveTextContent('Channel info')
    expect(screen.getByTestId('remote-key-ColorF0Red')).toHaveTextContent('Not set')
    expect(screen.getByTestId('remote-key-ArrowLeft')).toHaveTextContent('Hold: Last channel')
    expect(screen.getByTestId('remote-key-media:next')).toHaveTextContent('Next channel')
  })

  it('Lägg till en knapp: nästa okända knapp sparas som en ny rad; reserverade avvisas', () => {
    render(<RemoteTab bindings={DEFAULT_REMOTE_BINDINGS} nav={nav} tt={tt} />)
    fireEvent.keyDown(screen.getByTestId('remote-add'), { key: 'Enter' })
    fireEvent.keyUp(screen.getByTestId('remote-add'), { key: 'Enter' })
    expect(screen.getByTestId('remote-learn')).toBeInTheDocument()
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: '5', cancelable: true })) })
    expect(screen.getByTestId('remote-learn-reserved')).toBeInTheDocument()
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Unidentified', keyCode: 183, cancelable: true })) })
    expect(getTvSettings().remoteKeys.some((b) => b.key === 'code:183')).toBe(true)
    expect(screen.queryByTestId('remote-learn')).toBeNull()
  })
})
