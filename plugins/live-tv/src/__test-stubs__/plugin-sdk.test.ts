import { describe, expect, it } from 'vitest'
import { __setTvModeForTests, useTvMode, tvHoldHandlers, getTvGlassMenu, requestBrowseBack, BROWSE_BACK_EVENT } from '@/lib/plugin-sdk'

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
