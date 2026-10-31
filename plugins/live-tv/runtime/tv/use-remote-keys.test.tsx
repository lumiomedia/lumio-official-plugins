import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRef } from 'react'
import { DEFAULT_REMOTE_BINDINGS, setRemoteBinding } from './remote-keys'
import { REMOTE_ACTION_EVENT, deferMediaKeyToRemote, useRemoteKeys, type RemoteKeysState } from './use-remote-keys'

const mounted: Array<() => void> = []

function mount(partial: Partial<RemoteKeysState>) {
  const run = vi.fn()
  const state: RemoteKeysState = {
    bindings: setRemoteBinding(DEFAULT_REMOTE_BINDINGS, 'ColorF0Red', 'short', 'guide'),
    playerOpen: false,
    blocked: () => false,
    run,
    ...partial,
  }
  const hook = renderHook(() => {
    const ref = useRef(state)
    useRemoteKeys(true, ref)
  })
  mounted.push(() => hook.unmount())
  return { run, hook }
}

const press = (key: string, type: 'keydown' | 'keyup' = 'keydown') => {
  const event = new KeyboardEvent(type, { key, bubbles: true, cancelable: true })
  window.dispatchEvent(event)
  return event
}

describe('fjärrens knappar i skalet', () => {
  afterEach(() => { vi.useRealTimers(); while (mounted.length) mounted.pop()!() })

  it('en mappad knapp kör skalets åtgärd och sväljs', () => {
    const { run } = mount({})
    const event = press('ColorF0Red')
    expect(run).toHaveBeenCalledWith('guide')
    expect(event.defaultPrevented).toBe(true)
  })

  it('kromet tar spelarens åtgärd först (preventDefault) — då kör skalet inget', () => {
    const { run } = mount({ bindings: setRemoteBinding(DEFAULT_REMOTE_BINDINGS, 'ColorF0Red', 'short', 'playPause') })
    const chrome = (e: Event) => e.preventDefault()
    window.addEventListener(REMOTE_ACTION_EVENT, chrome)
    press('ColorF0Red')
    window.removeEventListener(REMOTE_ACTION_EVENT, chrome)
    expect(run).not.toHaveBeenCalled()
  })

  it('spärrad (lager, glasmeny, textfält): knappen släpps igenom orörd', () => {
    const { run } = mount({ blocked: () => true })
    const event = press('ColorF0Red')
    expect(run).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  it('pilarnas håll gäller bara medan en kanal spelas', () => {
    vi.useFakeTimers()
    const bindings = setRemoteBinding(DEFAULT_REMOTE_BINDINGS, 'ArrowLeft', 'long', 'lastChannel')
    const closed = mount({ bindings })
    press('ArrowLeft'); vi.advanceTimersByTime(800); press('ArrowLeft', 'keyup')
    expect(closed.run).not.toHaveBeenCalled()
    mounted.pop()!()

    const open = mount({ bindings, playerOpen: true })
    const first = press('ArrowLeft')
    expect(first.defaultPrevented).toBe(false)
    vi.advanceTimersByTime(800)
    press('ArrowLeft', 'keyup')
    expect(open.run).toHaveBeenCalledWith('lastChannel')
  })

  it('spelarens mediaknappar följer mappningen; utan mappning gäller spelarens gamla beteende', () => {
    const { run } = mount({ bindings: setRemoteBinding(DEFAULT_REMOTE_BINDINGS, 'media:rewind', 'short', 'lastChannel') })
    expect(deferMediaKeyToRemote('rewind')).toBe(true)
    expect(run).toHaveBeenCalledWith('lastChannel')
    // Standard: nästa = nästa kanal (kromets åtgärd, här skalets reserv).
    expect(deferMediaKeyToRemote('next')).toBe(true)
    expect(run).toHaveBeenLastCalledWith('channelUp')
    expect(deferMediaKeyToRemote('fastforward')).toBe(false)
  })
})
