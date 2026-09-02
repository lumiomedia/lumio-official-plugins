import { beforeEach, describe, expect, it } from 'vitest'
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
