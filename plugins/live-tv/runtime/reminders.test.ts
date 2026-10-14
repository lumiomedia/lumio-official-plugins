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
