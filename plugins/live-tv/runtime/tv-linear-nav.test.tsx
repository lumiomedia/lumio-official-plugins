import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, waitFor } from '@testing-library/react'
import { useRef } from 'react'
import { __resetForTests, __setTvModeForTests } from '@/lib/plugin-sdk'
import { useLinearTvNav } from './tv-linear-nav'

function Section() {
  const ref = useRef<HTMLDivElement | null>(null)
  useLinearTvNav(ref)
  return (
    <div ref={ref}>
      <div><button type="button" data-f="" id="a">A</button></div>
      <div><button type="button" data-f="" id="b1">B1</button><button type="button" data-f="" id="b2">B2</button></div>
      <div><button type="button" data-f="" id="c">C</button></div>
      <div data-panel-root=""><button type="button" data-f="" id="panel">P</button></div>
    </div>
  )
}

beforeEach(() => { __resetForTests(); __setTvModeForTests(true) })
afterEach(() => { cleanup(); __setTvModeForTests(false) })

describe('useLinearTvNav', () => {
  it('nedåt går till nästa rad i dokumentordning, uppåt till föregående, och paneler lämnas utanför', async () => {
    render(<Section />)
    await waitFor(() => expect(document.getElementById('a')).toHaveAttribute('data-f-down'))
    const down = (id: string) => document.querySelector<HTMLElement>(document.getElementById(id)!.getAttribute('data-f-down')!)
    const up = (id: string) => document.querySelector<HTMLElement>(document.getElementById(id)!.getAttribute('data-f-up')!)
    expect(down('a')?.id).toBe('b1')
    expect(down('b1')?.id).toBe('c')
    expect(down('b2')?.id).toBe('c')
    expect(up('c')?.id).toBe('b1')
    expect(up('b2')?.id).toBe('a')
    expect(document.getElementById('c')).not.toHaveAttribute('data-f-down')
    expect(document.getElementById('a')).not.toHaveAttribute('data-f-up')
    expect(document.getElementById('panel')).not.toHaveAttribute('data-f-down')
  })
  it('gör ingenting utanför TV-läget', () => {
    __setTvModeForTests(false)
    render(<Section />)
    expect(document.getElementById('a')).not.toHaveAttribute('data-f-down')
  })
})
