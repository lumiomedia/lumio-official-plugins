import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_REMOTE_BINDINGS, PRESET_REMOTE_KEYS, addLearnedKey, createRemoteHold, isReservedRemoteKey, remoteKeyId,
  removeLearnedKey, sanitizeRemoteBindings, setRemoteBinding, type RemoteBinding,
} from './remote-keys'

const find = (list: RemoteBinding[], key: string) => list.find((b) => b.key === key)!

describe('fjärrens knappar (Jerry 2026-10-31)', () => {
  it('standard: alla förinställda knappar i ordning, med dagens beteende för nästa/föregående', () => {
    const list = sanitizeRemoteBindings(undefined)
    expect(list.map((b) => b.key)).toEqual(PRESET_REMOTE_KEYS)
    expect(find(list, 'media:next').short).toBe('channelUp')
    expect(find(list, 'media:previous').short).toBe('channelDown')
    expect(find(list, 'Info').short).toBe('info')
    expect(find(list, 'MediaLast').short).toBe('lastChannel')
    expect(list).toEqual(DEFAULT_REMOTE_BINDINGS)
  })

  it('sanering: okända åtgärder blir "none", pilarnas korta tryck och mediaknapparnas håll går inte att sätta', () => {
    const list = sanitizeRemoteBindings([
      { key: 'ColorF0Red', short: 'bogus', long: 'guide' },
      { key: 'ArrowLeft', short: 'guide', long: 'lastChannel' },
      { key: 'media:rewind', short: 'lastChannel', long: 'guide' },
    ])
    expect(find(list, 'ColorF0Red')).toEqual({ key: 'ColorF0Red', short: 'none', long: 'guide' })
    expect(find(list, 'ArrowLeft')).toEqual({ key: 'ArrowLeft', short: 'none', long: 'lastChannel' })
    expect(find(list, 'media:rewind')).toEqual({ key: 'media:rewind', short: 'lastChannel', long: 'none' })
  })

  it('inlärda knappar sparas efter de förinställda; reserverade och dubbletter tas bort', () => {
    const list = sanitizeRemoteBindings([
      { key: 'code:183', short: 'guide', long: 'none' },
      { key: 'code:183', short: 'search', long: 'none' },
      { key: 'Enter', short: 'guide', long: 'none' },
      { key: '5', short: 'guide', long: 'none' },
    ])
    expect(list.slice(PRESET_REMOTE_KEYS.length)).toEqual([{ key: 'code:183', short: 'guide', long: 'none' }])
  })

  it('reserverade knappar: navigering, OK, Bakåt, siffror och kanal upp/ner', () => {
    for (const k of ['Enter', ' ', 'Escape', 'Backspace', 'GoBack', '0', '9', 'ChannelUp', 'PageDown', 'ArrowUp', 'Tab', 'MediaPlayPause']) {
      expect(isReservedRemoteKey(k)).toBe(true)
    }
    expect(isReservedRemoteKey('ColorF0Red')).toBe(false)
    expect(isReservedRemoteKey('code:183')).toBe(false)
  })

  it('knappens id: key, eller keyCode när webbvyn inte känner igen den', () => {
    expect(remoteKeyId({ key: 'ColorF0Red', keyCode: 403 })).toBe('ColorF0Red')
    expect(remoteKeyId({ key: 'Unidentified', keyCode: 183 })).toBe('code:183')
    expect(remoteKeyId({ key: '', keyCode: 0 })).toBe(null)
  })

  it('sätt, lär in och ta bort', () => {
    let list = setRemoteBinding(DEFAULT_REMOTE_BINDINGS, 'ColorF0Red', 'long', 'multiview')
    expect(find(list, 'ColorF0Red').long).toBe('multiview')
    list = addLearnedKey(list, 'code:183')
    expect(find(list, 'code:183')).toEqual({ key: 'code:183', short: 'none', long: 'none' })
    expect(addLearnedKey(list, 'code:183')).toEqual(list)
    expect(addLearnedKey(list, 'Enter')).toEqual(list)
    expect(removeLearnedKey(list, 'code:183').some((b) => b.key === 'code:183')).toBe(false)
    expect(removeLearnedKey(list, 'ColorF0Red')).toEqual(list)
  })
})

describe('håll-detektering', () => {
  const setup = () => {
    vi.useFakeTimers()
    const fire = vi.fn()
    const hold = createRemoteHold({ holdMs: 650, fire })
    return { hold, fire }
  }

  it('bara kort tryck: åtgärden körs direkt på keydown', () => {
    const { hold, fire } = setup()
    expect(hold.down('ColorF0Red', { key: 'ColorF0Red', short: 'guide', long: 'none' })).toBe('swallow')
    expect(fire).toHaveBeenCalledWith('guide')
    vi.useRealTimers()
  })

  it('med håll: kort släpp kör kort, långt kör håll en gång (även med Android-upprepningar utan repeat-flagga)', () => {
    const { hold, fire } = setup()
    const b: RemoteBinding = { key: 'ColorF0Red', short: 'guide', long: 'search' }
    hold.down('ColorF0Red', b)
    expect(fire).not.toHaveBeenCalled()
    expect(hold.up('ColorF0Red')).toBe(true)
    expect(fire).toHaveBeenLastCalledWith('guide')

    fire.mockClear()
    hold.down('ColorF0Red', b)
    vi.advanceTimersByTime(500)
    expect(hold.down('ColorF0Red', b)).toBe('swallow')
    vi.advanceTimersByTime(200)
    expect(fire).toHaveBeenCalledTimes(1)
    expect(fire).toHaveBeenCalledWith('search')
    hold.down('ColorF0Red', b)
    hold.up('ColorF0Red')
    expect(fire).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('pilarna: första trycket släpps igenom (navigering), upprepningar sväljs, håll kör åtgärden', () => {
    const { hold, fire } = setup()
    const b: RemoteBinding = { key: 'ArrowLeft', short: 'none', long: 'lastChannel' }
    expect(hold.down('ArrowLeft', b, { passFirst: true })).toBe('pass')
    expect(hold.down('ArrowLeft', b, { passFirst: true })).toBe('swallow')
    vi.advanceTimersByTime(700)
    expect(fire).toHaveBeenCalledWith('lastChannel')
    hold.up('ArrowLeft')
    expect(fire).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('bara kort tryck, knappen hålls (Android: upprepade keydown): åtgärden körs EN gång tills släppet', () => {
    const { hold, fire } = setup()
    const b: RemoteBinding = { key: 'Guide', short: 'miniGuide', long: 'none' }
    expect(hold.down('Guide', b)).toBe('swallow')
    expect(hold.down('Guide', b)).toBe('swallow')
    expect(hold.down('Guide', b)).toBe('swallow')
    expect(fire).toHaveBeenCalledTimes(1)
    expect(hold.up('Guide')).toBe(true)
    hold.down('Guide', b)
    expect(fire).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })

  it('ingen åtgärd alls: släpps igenom', () => {
    const { hold, fire } = setup()
    expect(hold.down('Info', { key: 'Info', short: 'none', long: 'none' })).toBe('pass')
    expect(hold.up('Info')).toBe(false)
    expect(fire).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('en annan knapp mitt i ett håll avbryter det första', () => {
    const { hold, fire } = setup()
    hold.down('ColorF0Red', { key: 'ColorF0Red', short: 'guide', long: 'search' })
    hold.down('ColorF1Green', { key: 'ColorF1Green', short: 'multiview', long: 'none' })
    vi.advanceTimersByTime(1000)
    expect(fire.mock.calls).toEqual([['multiview']])
    vi.useRealTimers()
  })
})
