import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { useWakeLock } from './useWakeLock'

type ReleaseListener = () => void

function stubWakeLock() {
  const sentinels: { release: ReturnType<typeof vi.fn>; fire: () => void }[] = []
  const request = vi.fn(async (_type: 'screen') => {
    const listeners = new Set<ReleaseListener>()
    const sentinel = {
      released: false,
      release: vi.fn(async () => { sentinel.released = true }),
      addEventListener: (_: string, fn: ReleaseListener) => { listeners.add(fn) },
      removeEventListener: (_: string, fn: ReleaseListener) => { listeners.delete(fn) },
    }
    sentinels.push({ release: sentinel.release, fire: () => { sentinel.released = true; listeners.forEach((fn) => fn()) } })
    return sentinel
  })
  Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true })
  return { request, sentinels }
}

afterEach(() => {
  cleanup()
  Reflect.deleteProperty(navigator, 'wakeLock')
})

describe('useWakeLock', () => {
  it('kraschar inte utan wakeLock i navigator', () => {
    expect(() => renderHook(() => useWakeLock(true))).not.toThrow()
  })
  it("begär 'screen' när active och släpper när active blir falskt", async () => {
    const stub = stubWakeLock()
    const { rerender } = renderHook(({ active }) => useWakeLock(active), { initialProps: { active: true } })
    await waitFor(() => expect(stub.request).toHaveBeenCalledWith('screen'))
    await waitFor(() => expect(stub.sentinels).toHaveLength(1))
    rerender({ active: false })
    await waitFor(() => expect(stub.sentinels[0].release).toHaveBeenCalled())
  })
  it('begär inget alls när active är falskt', async () => {
    const stub = stubWakeLock()
    renderHook(() => useWakeLock(false))
    await act(async () => { await Promise.resolve() })
    expect(stub.request).not.toHaveBeenCalled()
  })
  it('släpper vid unmount', async () => {
    const stub = stubWakeLock()
    const { unmount } = renderHook(() => useWakeLock(true))
    await waitFor(() => expect(stub.sentinels).toHaveLength(1))
    unmount()
    await waitFor(() => expect(stub.sentinels[0].release).toHaveBeenCalled())
  })
  it('återtar låset när fliken blir synlig igen efter att systemet släppt det', async () => {
    const stub = stubWakeLock()
    renderHook(() => useWakeLock(true))
    await waitFor(() => expect(stub.sentinels).toHaveLength(1))
    // Systemet släpper låset när skärmen släcks/fliken göms (release-händelsen).
    act(() => stub.sentinels[0].fire())
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    await waitFor(() => expect(stub.request).toHaveBeenCalledTimes(2))
    Reflect.deleteProperty(document, 'visibilityState')
  })
})
