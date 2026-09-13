import { describe, expect, it, vi } from 'vitest'
import { createZapBuffer, resolveZap } from './tv-zap'

const ch = (name: string) => ({ name, group: '', url: `http://x/${name}`, tvgId: null })

describe('resolveZap', () => {
  const favs = [ch('F1'), ch('F2')]
  const all = [ch('A'), ch('B'), ch('C')]
  it('favoriter først', () => {
    expect(resolveZap('1', favs, all)?.name).toBe('F1')
    expect(resolveZap('2', favs, all)?.name).toBe('F2')
  })
  it('listnummer när favoriterna tar slut', () => {
    expect(resolveZap('3', favs, all)?.name).toBe('C')
  })
  it('utan favoriter räknas listan från 1', () => {
    expect(resolveZap('1', [], all)?.name).toBe('A')
  })
  it('miss ger null', () => {
    expect(resolveZap('9', favs, all)).toBeNull()
    expect(resolveZap('0', favs, all)).toBeNull()
  })
})

describe('createZapBuffer', () => {
  it('samlar siffror och committar efter timeout', () => {
    vi.useFakeTimers()
    const onCommit = vi.fn()
    const onChange = vi.fn()
    const buffer = createZapBuffer({ timeoutMs: 1500, onCommit, onChange })
    buffer.push('1')
    buffer.push('2')
    expect(onChange).toHaveBeenLastCalledWith('12')
    vi.advanceTimersByTime(1499)
    expect(onCommit).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onCommit).toHaveBeenCalledWith('12')
    expect(onChange).toHaveBeenLastCalledWith('')
    vi.useRealTimers()
  })
  it('commit direkt vid OK och max fyra siffror', () => {
    vi.useFakeTimers()
    const onCommit = vi.fn()
    const buffer = createZapBuffer({ timeoutMs: 1500, onCommit, onChange: () => {} })
    '12345'.split('').forEach((d) => buffer.push(d))
    buffer.commit()
    expect(onCommit).toHaveBeenCalledWith('1234')
    vi.useRealTimers()
  })
})
