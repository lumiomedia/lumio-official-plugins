import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __setTvModeForTests, useTvMode, tvHoldHandlers, tvPointerHoldHandlers, TV_HOLD_MS, getTvGlassMenu, requestBrowseBack, BROWSE_BACK_EVENT } from '@/lib/plugin-sdk'

describe('plugin-sdk stub, TV', () => {
  it('växlar TV-läge för tester', () => {
    __setTvModeForTests(true)
    expect(useTvMode()).toBe(true)
    __setTvModeForTests(false)
    expect(useTvMode()).toBe(false)
  })
  it('ger en glasmeny-komponent', () => {
    expect(typeof getTvGlassMenu()).toBe('function')
  })
  it('håll OK fyrar onHold efter 650 ms och onShort vid snabbt släpp', () => {
    let short = 0
    let hold = 0
    const el = document.createElement('button')
    const h = tvHoldHandlers(() => short++, () => hold++)
    const ev = (key: string) => ({ key, repeat: false, currentTarget: el, preventDefault() {} })
    h.onKeyDown(ev('Enter'))
    h.onKeyUp(ev('Enter'))
    expect(short).toBe(1)
    expect(hold).toBe(0)
  })
  it('requestBrowseBack skickar händelsen', () => {
    let fired = 0
    window.addEventListener(BROWSE_BACK_EVENT, () => fired++)
    requestBrowseBack()
    expect(fired).toBe(1)
  })
})

/**
 * HÅLLKÄLLAN — speglar appens `lib/__tests__/tv-hold-pointer.test.ts` @0176d92.
 *
 * Stubben är en RIKTIG kopia av appens `lib/tv-hold.ts`, alltså ska den också
 * bära appens testfall: annars glider kopian tyst isär från originalet.
 */
function fakeEvent(
  currentTarget: EventTarget | null,
  extra: Partial<{ button: number; pointerType: string; target: EventTarget | null }> = {},
) {
  return {
    currentTarget,
    target: currentTarget,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    ...extra,
  }
}

const keyDown = (el: EventTarget) => ({ key: 'Enter', repeat: false, currentTarget: el, preventDefault: vi.fn() })
const keyUp = (el: EventTarget) => ({ key: 'Enter', currentTarget: el })

describe('tvHoldHandlers + tvPointerHoldHandlers — varje väg river bara sitt eget håll', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('pointerleave mitt i en TANGENThållning dödar inte OK', () => {
    const onShort = vi.fn()
    const onHold = vi.fn()
    const keys = tvHoldHandlers(onShort, onHold)
    const pointer = tvPointerHoldHandlers(onShort, onHold)
    const el = document.createElement('div')

    // Enter trycks ned medan musen vilar på kortet …
    keys.onKeyDown(keyDown(el))
    // … och musen knuffas av kortet innan tangenten släpps.
    pointer.onPointerLeave(fakeEvent(el))
    keys.onKeyUp(keyUp(el))

    expect(onShort).toHaveBeenCalledTimes(1)
    expect(onHold).not.toHaveBeenCalled()
  })

  it('pointercancel och pointerup rör inte heller en tangenthållning', () => {
    for (const abort of ['onPointerCancel', 'onPointerUp'] as const) {
      const onShort = vi.fn()
      const keys = tvHoldHandlers(onShort, vi.fn())
      const pointer = tvPointerHoldHandlers(onShort, vi.fn())
      const el = document.createElement('div')

      keys.onKeyDown(keyDown(el))
      pointer[abort](fakeEvent(el))
      keys.onKeyUp(keyUp(el))

      expect(onShort).toHaveBeenCalledTimes(1)
    }
  })

  it('keyup river inte ett PEKARhåll (och fyrar alltså inget OK för det)', () => {
    const onShort = vi.fn()
    const onHold = vi.fn()
    const keys = tvHoldHandlers(onShort, onHold)
    const pointer = tvPointerHoldHandlers(onShort, onHold)
    const el = document.createElement('div')

    pointer.onPointerDown(fakeEvent(el))
    // Ett keyup utan föregående keydown (tangenten trycktes ned i en annan vy)
    // ska inte kunna kapa pekarens håll.
    keys.onKeyUp(keyUp(el))
    vi.advanceTimersByTime(TV_HOLD_MS)

    expect(onHold).toHaveBeenCalledTimes(1)
    expect(onShort).not.toHaveBeenCalled()
  })

  it('ett nytt pekartryck tar över en kvarlämnad tangenthållning', () => {
    // Glasmenyn sväljer Enter-KEYUP i capture-fasen, så en tangenthållning som
    // öppnat menyn kan bli kvar i kartan för alltid. Pekarens nedtryck måste
    // därför få kapa den, annars blir stationen permanent död för långtryck.
    const onHold = vi.fn()
    const keys = tvHoldHandlers(vi.fn(), onHold)
    const pointer = tvPointerHoldHandlers(vi.fn(), onHold)
    const el = document.createElement('div')

    keys.onKeyDown(keyDown(el))
    vi.advanceTimersByTime(TV_HOLD_MS)
    expect(onHold).toHaveBeenCalledTimes(1)
    // Inget keyup (menyn svalde det). Nytt långtryck med fingret:
    pointer.onPointerDown(fakeEvent(el))
    vi.advanceTimersByTime(TV_HOLD_MS)

    expect(onHold).toHaveBeenCalledTimes(2)
  })
})

describe('tvPointerHoldHandlers — contextmenu efter ett redan fyrat håll', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('systemets contextmenu efter 650 ms ger INTE ett andra onHold', () => {
    const onHold = vi.fn()
    const handlers = tvPointerHoldHandlers(vi.fn(), onHold)
    const el = document.createElement('div')

    handlers.onPointerDown(fakeEvent(el))
    vi.advanceTimersByTime(TV_HOLD_MS)
    expect(onHold).toHaveBeenCalledTimes(1)

    // OS:et skickar sin egen långtrycksmeny först efteråt.
    const event = fakeEvent(el)
    handlers.onContextMenu(event)

    expect(onHold).toHaveBeenCalledTimes(1)
    // Systemmenyn ska ändå inte fram: hållmenyn är redan öppen.
    expect(event.preventDefault).toHaveBeenCalledTimes(1)
  })

  it('contextmenu efter ett AVBRUTET håll ger fortfarande onHold', () => {
    // Spärren gäller ett FYRAT håll, inte varje tidigare nedtryck: högerklick
    // efter ett kort, avbrutet tryck är en ny handling.
    const onHold = vi.fn()
    const handlers = tvPointerHoldHandlers(vi.fn(), onHold)
    const el = document.createElement('div')

    handlers.onPointerDown(fakeEvent(el))
    vi.advanceTimersByTime(TV_HOLD_MS - 100)
    handlers.onPointerUp(fakeEvent(el))

    const event = fakeEvent(el)
    handlers.onContextMenu(event)

    expect(onHold).toHaveBeenCalledTimes(1)
    expect(event.preventDefault).toHaveBeenCalledTimes(1)
  })
})
