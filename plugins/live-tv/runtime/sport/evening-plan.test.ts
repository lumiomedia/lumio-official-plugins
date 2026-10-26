import { beforeEach, describe, expect, it, vi } from 'vitest'
import { writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from '../live-tv-data'
import { EVENING_PLAN_KEY, getEveningPlan, isPlanned } from './evening-plan'
import { buildSportCtx } from './sport-ctx'
import { fakeCtx, fxMatch, fxSource } from './__sport-fixture'
import { getReminders, REMINDERS_KEY } from '../reminders'

const H = 3_600_000
const now = Date.now()

beforeEach(() => {
  writePluginJson(LIVE_TV_PLUGIN_ID, EVENING_PLAN_KEY, [])
  writePluginJson(LIVE_TV_PLUGIN_ID, REMINDERS_KEY, [])
})

/** Kontexten med aktuell plan och påminnelser (som useSportCtx bygger om vid varje ändring). */
function ctxNow() {
  const base = fakeCtx({ now })
  return buildSportCtx({ model: base.model, nav: base.nav, tt: base.tt, locale: 'en-GB', follows: [], overrides: {}, settings: base.settings, reminders: getReminders(), plan: getEveningPlan(), openMatch: vi.fn(), openFollowPicker: vi.fn() })
}

describe('kvällsplanen', () => {
  it('en match utan kanal bockas in i planen och ur igen', () => {
    const m = fxMatch({ id: 'fx:espn:esp.1:1', home: 'Barcelona', away: 'Real Madrid', start: now + 3 * H, sources: [] })
    ctxNow().toggleRemind(m)
    expect(getEveningPlan()).toHaveLength(1)
    expect(ctxNow().isReminded(m)).toBe(true)
    expect(ctxNow().hasReminder(m)).toBe(false)
    ctxNow().toggleRemind(m)
    expect(getEveningPlan()).toHaveLength(0)
  })

  it('samma match från tablån senare (annat id, kanal, avspark 15 min senare) känns igen och får sin påminnelse', () => {
    const espn = fxMatch({ id: 'fx:espn:esp.1:1', home: 'Barcelona', away: 'Real Madrid', start: now + 3 * H, sources: [] })
    ctxNow().toggleRemind(espn)
    const epg = fxMatch({ id: 'football|la-liga|barcelona|real madrid', home: 'FC Barcelona', away: 'Real Madrid', homeKey: 'barcelona', awayKey: 'real madrid', start: now + 3 * H + 15 * 60_000, sources: [fxSource('V Sport Fotboll FHD', { programmeStart: now + 3 * H, programmeStop: now + 5 * H })] })
    expect(isPlanned(getEveningPlan(), epg)).toBe(true)
    expect(ctxNow().hasReminder(epg)).toBe(false)
    ctxNow().ensureReminder(epg)
    expect(ctxNow().hasReminder(epg)).toBe(true)
    // Av: både planen och påminnelsen försvinner.
    ctxNow().toggleRemind(epg)
    expect(getEveningPlan()).toHaveLength(0)
    expect(ctxNow().hasReminder(epg)).toBe(false)
  })

  it('en match med kanal: bocken sätter påminnelse och plan; andra lag eller annan dag räknas inte', () => {
    const m = fxMatch({ id: 'a', home: 'AIK', away: 'Hammarby', start: now + 2 * H, sources: [fxSource('TV4 Fotboll', { programmeStart: now + 2 * H, programmeStop: now + 4 * H })] })
    ctxNow().toggleRemind(m)
    expect(ctxNow().hasReminder(m)).toBe(true)
    expect(getEveningPlan()).toHaveLength(1)
    expect(isPlanned(getEveningPlan(), fxMatch({ id: 'b', home: 'AIK', away: 'Djurgården', start: now + 2 * H }))).toBe(false)
    expect(isPlanned(getEveningPlan(), fxMatch({ id: 'c', home: 'AIK', away: 'Hammarby', start: now + 30 * H }))).toBe(false)
  })
})
