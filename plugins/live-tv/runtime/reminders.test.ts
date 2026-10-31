import { beforeEach, describe, expect, it, vi } from 'vitest'
import { writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from './live-tv-data'
import {
  REMINDERS_KEY,
  REMINDER_LEAD_MS,
  dueReminders,
  getReminders,
  isReminded,
  markReminderNotified,
  reminderId,
  removeReminder,
  __resetShownRemindersForTests,
  startReminderScheduler,
  toggleReminder,
} from './reminders'

const channel = { name: 'SVT1', url: 'http://x/svt1', group: 'Nyheter', logo: null, tvgId: 'svt1.se' }
// Relativt riktiga klockan: getReminders() utan argument rensar mot Date.now().
const NOW = Date.now()
const prog = (offsetMin: number, title = 'Rapport') => ({ title, start: NOW + offsetMin * 60_000, stop: NOW + (offsetMin + 30) * 60_000 })

describe('reminders', () => {
  beforeEach(() => writePluginJson(LIVE_TV_PLUGIN_ID, REMINDERS_KEY, []))

  it('toggles a reminder on and off', () => {
    toggleReminder(channel, prog(60), NOW)
    expect(isReminded(channel, prog(60))).toBe(true)
    toggleReminder(channel, prog(60), NOW)
    expect(isReminded(channel, prog(60))).toBe(false)
  })

  it('sorts by start time and drops reminders whose programme is long past', () => {
    toggleReminder(channel, prog(120, 'Sent'), NOW)
    toggleReminder(channel, prog(30, 'Tidigt'), NOW)
    toggleReminder(channel, prog(-60, 'Passerat'), NOW)
    expect(getReminders(NOW).map((r) => r.title)).toEqual(['Tidigt', 'Sent'])
  })

  it('reports due reminders once the lead window opens, and only until notified', () => {
    toggleReminder(channel, prog(4), NOW)
    expect(dueReminders(NOW).map((r) => r.title)).toEqual(['Rapport'])
    expect(dueReminders(NOW - REMINDER_LEAD_MS)).toEqual([])
    const [due] = dueReminders(NOW)
    markReminderNotified(due.id, NOW)
    expect(dueReminders(NOW)).toEqual([])
  })

  it('removes by id', () => {
    const [r] = toggleReminder(channel, prog(60), NOW)
    removeReminder(r.id)
    expect(getReminders(NOW)).toEqual([])
  })
})

describe('dubbla påminnelser (synk mellan enheter)', () => {
  beforeEach(() => { writePluginJson(LIVE_TV_PLUGIN_ID, REMINDERS_KEY, []); __resetShownRemindersForTests() })
  it('en påminnelse som en annan enhet skriver tillbaka utan notifiedAt visas inte igen', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    const shown: string[] = []
    const ch = { name: 'V Sport Ultra UHD SE', url: 'http://x/30095.ts', logo: null, group: 'g', tvgId: null }
    toggleReminder(ch, { title: 'Manchester City - PSG', start: NOW + 60_000, stop: NOW + 3_600_000 })
    const before = getReminders(NOW)
    const stop = startReminderScheduler((r) => shown.push(r.title))
    expect(shown).toEqual(['Manchester City - PSG'])
    // WebDAV-synken skriver tillbaka listan från en enhet som aldrig visade den.
    writePluginJson(LIVE_TV_PLUGIN_ID, REMINDERS_KEY, before)
    vi.advanceTimersByTime(30_000)
    expect(shown).toEqual(['Manchester City - PSG'])
    stop()
    vi.useRealTimers()
  })
})

describe('påminnelsecachen (guiden frågar per block)', () => {
  beforeEach(() => writePluginJson(LIVE_TV_PLUGIN_ID, REMINDERS_KEY, []))

  /** Lagrat värde som räknar hur många gånger listan läses (stubben ger tillbaka samma objekt). */
  const countingStore = (list: unknown[]) => {
    let reads = 0
    const proxy = new Proxy(list, { get(target, prop, receiver) { if (prop === '0') reads++; return Reflect.get(target, prop, receiver) } })
    writePluginJson(LIVE_TV_PLUGIN_ID, REMINDERS_KEY, proxy)
    return () => reads
  }

  it('läser och tolkar lagringen en gång per synkront pass, inte per anrop', async () => {
    toggleReminder(channel, prog(60), NOW)
    const stored = getReminders(NOW)
    await Promise.resolve()
    const reads = countingStore(stored)
    for (let i = 0; i < 200; i++) isReminded(channel, prog(i))
    expect(reads()).toBe(1)
    expect(isReminded(channel, prog(60))).toBe(true)
  })

  it('en skrivning från en annan vy (lagringshändelsen) syns direkt', () => {
    expect(isReminded(channel, prog(60))).toBe(false)
    const other = { ...channel, name: 'SVT2', url: 'http://x/svt2' }
    toggleReminder(other, prog(30), NOW)
    const list = getReminders(NOW)
    writePluginJson(LIVE_TV_PLUGIN_ID, REMINDERS_KEY, [...list, { ...list[0], id: reminderId(channel, prog(60)), start: prog(60).start }])
    expect(isReminded(channel, prog(60))).toBe(true)
  })

  it('en tyst skrivning (utan händelse) syns i nästa pass', async () => {
    expect(isReminded(channel, prog(60))).toBe(false)
    toggleReminder(channel, prog(60), NOW)
    const list = getReminders(NOW)
    writePluginJson(LIVE_TV_PLUGIN_ID, REMINDERS_KEY, [], { emitChange: false })
    await Promise.resolve()
    expect(isReminded(channel, prog(60))).toBe(false)
    writePluginJson(LIVE_TV_PLUGIN_ID, REMINDERS_KEY, list, { emitChange: false })
    await Promise.resolve()
    expect(isReminded(channel, prog(60))).toBe(true)
  })

  it('en påminnelse vars program är långt förbi räknas inte', () => {
    toggleReminder(channel, prog(-60), NOW)
    expect(isReminded(channel, prog(-60))).toBe(false)
  })
})
