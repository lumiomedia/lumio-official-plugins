import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetForTests } from '@/lib/plugin-sdk'
import { dueReminders, getReminders, reminderId, replaceSportReminders, toggleReminder } from '../reminders'
import { KICKOFF_LEAD_MS, SPORT_ALERT_START_DELAY_MS, kickoffReminders, startSportAlertSync, syncKickoffReminders } from './sport-alerts'
import { setSportSettings, toggleFollow } from './sport-store'
import { sourceChannel } from './sport-model'
import { HOUR, MIN, fxDay, fxMatch, stubSportDays } from './__sport-fixture'
import { localDayKey } from './sport-epg'

beforeEach(() => __resetForTests())

const now = Date.now()
const hammarby = { sport: 'football' as const, kind: 'team' as const, key: 'hammarby', name: 'Hammarby' }

describe('kickoffReminders', () => {
  it('följd kommande match → påminnelse på bästa källan med vald förvarning', () => {
    const m = fxMatch({ start: now + 2 * HOUR })
    const [r, ...rest] = kickoffReminders([fxDay('d', [m])], [hammarby], '15', {}, now)
    expect(rest).toEqual([])
    expect(r).toMatchObject({ origin: 'sport', leadMs: 15 * MIN, title: 'AIK - Hammarby', start: m.start, channelName: 'TV4 Fotboll FHD SE' })
    expect(r!.id).toBe(reminderId(sourceChannel(m.sources[0]!), { start: m.start }))
    expect(kickoffReminders([fxDay('d', [m])], [hammarby], 'kickoff', {}, now)[0]!.leadMs).toBe(KICKOFF_LEAD_MS.kickoff)
  })
  it('inget för ofölj, avslutade, pågående, repriser eller avstängd notis', () => {
    const m = fxMatch({ start: now + HOUR })
    expect(kickoffReminders([fxDay('d', [m])], [], '15', {}, now)).toEqual([])
    expect(kickoffReminders([fxDay('d', [m])], [hammarby], 'off', {}, now)).toEqual([])
    expect(kickoffReminders([fxDay('d', [fxMatch({ start: now - 10 * MIN })])], [hammarby], '15', {}, now)).toEqual([])
    expect(kickoffReminders([fxDay('d', [fxMatch({ start: now + HOUR, rerun: true })])], [hammarby], '15', {}, now)).toEqual([])
    expect(kickoffReminders([null], [hammarby], '15', {}, now)).toEqual([])
  })
})

describe('replaceSportReminders', () => {
  it('manuell påminnelse på samma program ger ingen dubblett, och avföljning tar bara bort den automatiska', () => {
    const m = fxMatch({ start: now + 2 * HOUR })
    const channel = sourceChannel(m.sources[0]!)
    toggleReminder(channel, { title: 'AIK - Hammarby', start: m.start, stop: m.stop }, now)
    const other = fxMatch({ id: 'other', home: 'Bajen', away: 'Hammarby', start: now + 5 * HOUR, sources: [{ ...m.sources[0]!, channelKey: 'B::http://x/B', name: 'B', url: 'http://x/B', programmeStart: now + 5 * HOUR }] })
    replaceSportReminders(kickoffReminders([fxDay('d', [m, other])], [hammarby], '15', {}, now), now)
    const list = getReminders(now)
    expect(list).toHaveLength(2)
    expect(list.filter((r) => r.origin === 'sport').map((r) => r.channelName)).toEqual(['B'])
    replaceSportReminders([], now)
    expect(getReminders(now).map((r) => r.origin ?? 'manual')).toEqual(['manual'])
  })
  it('förvarningen per påminnelse styr när den förfaller', () => {
    const at = fxMatch({ start: now + 20 * MIN })
    replaceSportReminders(kickoffReminders([fxDay('d', [at])], [hammarby], 'kickoff', {}, now), now)
    expect(dueReminders(now + 19 * MIN)).toHaveLength(0)
    replaceSportReminders(kickoffReminders([fxDay('d', [at])], [hammarby], '15', {}, now), now)
    expect(dueReminders(now + 6 * MIN)).toHaveLength(1)
  })
})

describe('syncKickoffReminders', () => {
  it('utan följda görs inget anrop alls', async () => {
    const spy = stubSportDays({})
    await syncKickoffReminders(now)
    expect(spy).not.toHaveBeenCalled()
  })
  it('med följda läses idag och imorgon och påminnelserna skrivs', async () => {
    toggleFollow(hammarby)
    setSportSettings({ alert: '15' })
    const spy = stubSportDays({ [localDayKey(now)]: [fxMatch({ start: now + HOUR })] })
    await syncKickoffReminders(now)
    expect(spy).toHaveBeenCalledTimes(2)
    expect(getReminders(now).filter((r) => r.origin === 'sport')).toHaveLength(1)
  })
})

describe('startSportAlertSync', () => {
  const setVisibility = (state: 'visible' | 'hidden') => {
    Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  }
  afterEach(() => {
    vi.useRealTimers()
    Reflect.deleteProperty(document, 'visibilityState')
  })

  it('väntar en stund efter start innan dagen läses', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
    toggleFollow(hammarby)
    const spy = stubSportDays({})
    const stop = startSportAlertSync()
    await vi.advanceTimersByTimeAsync(SPORT_ALERT_START_DELAY_MS - 1000)
    expect(spy).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1000)
    expect(spy).toHaveBeenCalledTimes(2)
    stop()
  })
  it('läser aldrig i bakgrunden — körs igen när appen blir synlig', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
    toggleFollow(hammarby)
    const spy = stubSportDays({})
    setVisibility('hidden')
    const stop = startSportAlertSync()
    await vi.advanceTimersByTimeAsync(SPORT_ALERT_START_DELAY_MS + 3 * 30 * MIN)
    setSportSettings({ alert: 'kickoff' })
    await vi.advanceTimersByTimeAsync(0)
    expect(spy).not.toHaveBeenCalled()
    setVisibility('visible')
    await vi.advanceTimersByTimeAsync(0)
    expect(spy).toHaveBeenCalledTimes(2)
    stop()
  })
  it('synlig före fördröjningen startar inget i förtid', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
    toggleFollow(hammarby)
    const spy = stubSportDays({})
    const stop = startSportAlertSync()
    setVisibility('hidden')
    setVisibility('visible')
    await vi.advanceTimersByTimeAsync(0)
    expect(spy).not.toHaveBeenCalled()
    stop()
  })
})
