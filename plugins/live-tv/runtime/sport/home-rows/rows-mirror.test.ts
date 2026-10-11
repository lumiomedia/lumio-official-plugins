import { describe, expect, it } from 'vitest'
import { HOUR, MIN, fxMatch, fxSource } from '../__sport-fixture'
import { tvText } from '../../tv/tv-strings'
import { formatClock } from '../../live-tv-ui'
import type { SportMatch } from '../sport-model'
import { sportHeroBackdrop, sportHeroMirror, type SportMirrorDeps } from './rows-mirror'

const now = new Date(2026, 9, 11, 18, 0).getTime()
const tt = (k: Parameters<typeof tvText>[1], v?: Record<string, string | number>) => tvText('sv', k, v)
const deps = (over: Partial<SportMirrorDeps> = {}): SportMirrorDeps => ({
  now, locale: 'sv-SE', tt, overrides: {}, follows: [], uploads: {}, hideScore: false,
  settings: { keys: {}, backdrops: { all: 'standard', sports: {} } },
  ...over,
})
const full = (over: Partial<SportMatch>): SportMatch => fxMatch({ coverage: 'full', fixture: { provider: 'api-sports', id: '1' }, ...over })

describe('heron för ett sportkort', () => {
  it('live: LIVE · minut, lagen som titel, liga · sport · arena · ställning, kanal · källor · kvalitet · tid · följer', () => {
    const m = full({
      home: 'GAIS', away: 'Sirius', homeKey: 'gais', start: now - 70 * MIN, stop: now + 50 * MIN, status: 'live', minute: 67, score: { home: 2, away: 1 }, venue: 'Ullevi',
      sources: [fxSource('TV4 Fotboll', { quality: 'FHD' }), fxSource('C More')],
    })
    const h = sportHeroMirror(m, deps({ follows: [{ sport: 'football', kind: 'team', key: 'gais', name: 'GAIS' }] }))
    expect(h.kicker).toBe("LIVE · 67'")
    expect(h.title).toBe('GAIS – Sirius')
    expect(h.metaLine).toBe('Allsvenskan · Fotboll · Ullevi · 2–1')
    expect(h.overview).toBe(`TV4 Fotboll · ${tvText('sv', 'sportSourcesShort', { n: 2 })} · FHD · ${formatClock(m.start, 'sv-SE')}–${formatClock(m.stop, 'sv-SE')} · Du följer GAIS`)
  })
  it('dölj ställning: ingen ställning i metaraden', () => {
    const m = full({ start: now - 4 * HOUR, stop: now - 2 * HOUR, status: 'finished', score: { home: 1, away: 0 } })
    const h = sportHeroMirror(m, deps({ hideScore: true }))
    expect(h.metaLine).not.toMatch(/1–0/)
    expect(h.kicker).toBe('SLUT')
  })
  it('kommande: avsparkstid; event utan lag ger eventets namn', () => {
    const m = fxMatch({ home: null, away: null, event: 'Indonesian Grand Prix: MotoGP Race', kind: 'motorsport', league: 'MotoGP', leagueKey: 'motogp', start: now + 2 * HOUR })
    const h = sportHeroMirror(m, deps())
    expect(h.kicker).toBe(`Avspark ${formatClock(m.start, 'sv-SE')}`)
    expect(h.title).toBe('Indonesian Grand Prix: MotoGP Race')
    expect(h.metaLine).toBe('MotoGP · Motorsport')
  })
  it('bakgrunden: sportens Standard-bild; Av ger ändå Standard; Egen bild med uppladdning', () => {
    const m = fxMatch({ kind: 'hockey' })
    expect(sportHeroBackdrop(m, deps())).toBe('/sport-backgrounds/hockey.webp')
    expect(sportHeroBackdrop(m, deps({ settings: { keys: {}, backdrops: { all: 'off', sports: {} } } }))).toBe('/sport-backgrounds/hockey.webp')
    expect(sportHeroBackdrop(m, deps({ settings: { keys: {}, backdrops: { all: 'custom', sports: {} } }, uploads: { all: 3 } }))).toBe('/api/live-tv/sport/backdrop?slot=all&v=3')
  })
})
