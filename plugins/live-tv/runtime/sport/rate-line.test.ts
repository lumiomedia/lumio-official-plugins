import { describe, expect, it } from 'vitest'
import { everyText, rateLine } from './rate-line'
import { tvText } from '../tv/tv-strings'

const tt = (k: Parameters<typeof tvText>[1], v?: Record<string, string | number>) => tvText('sv', k, v)
const base = { provider: 'api-sports' as const, state: 'ok' as const, intervalMs: 180_000, remainingToday: 41, pausedUntil: null, paid: false }
const opts = { lang: 'sv', locale: 'sv-SE', tz: 'Europe/Stockholm' }

describe('rate-line', () => {
  it('svenska ordningstal', () => {
    expect(everyText(180_000, 'sv')).toBe('var 3:e min')
    expect(everyText(120_000, 'sv')).toBe('var 2:a min')
    expect(everyText(60_000, 'sv')).toBe('varje minut')
    expect(everyText(15_000, 'sv')).toBe('var 15:e s')
    expect(everyText(21 * 60_000, 'sv')).toBe('var 21:a min')
    expect(everyText(11 * 60_000, 'sv')).toBe('var 11:e min')
    expect(everyText(180_000, 'en')).toBe('every 3 min')
  })
  it('"Uppdateras var 3:e min · 41 anrop kvar i dag" och länken till betald nyckel', () => {
    expect(rateLine(base, tt, opts)).toEqual({ text: 'Uppdateras var 3:e min · 41 anrop kvar i dag', showPaidLink: true })
  })
  it('betald nyckel eller TheSportsDB: ingen länk, ingen dagskvot', () => {
    expect(rateLine({ ...base, paid: true }, tt, opts)?.showPaidLink).toBe(false)
    expect(rateLine({ ...base, provider: 'thesportsdb', remainingToday: null, intervalMs: 120_000, paid: true }, tt, opts)).toEqual({ text: 'Uppdateras var 2:a min', showPaidLink: false })
  })
  it('ingen match pågår', () => {
    expect(rateLine({ ...base, intervalMs: null }, tt, opts)?.text).toBe('Inga matcher pågår · 41 anrop kvar i dag')
  })
  it('pausat till 02:00 (00:00 UTC i Stockholm, sommartid)', () => {
    expect(rateLine({ ...base, state: 'paused', pausedUntil: Date.UTC(2026, 9, 11) }, tt, opts)).toEqual({ text: 'Resultat pausade till 02:00 – dagens anrop är slut', showPaidLink: false })
  })
  it('fel nyckel och ingen nyckel', () => {
    expect(rateLine({ ...base, state: 'invalid-key' }, tt, opts)?.text).toBe('Nyckeln fungerar inte längre')
    expect(rateLine({ ...base, state: 'no-key' }, tt, opts)).toBeNull()
  })
})
