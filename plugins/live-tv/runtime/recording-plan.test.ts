import { describe, expect, it } from 'vitest'
import { RECORD_NO_EPG_MS, planFromNow, planFromProgramme } from './recording-plan'
import type { M3uChannel } from './live-tv-data'

const channel: M3uChannel = { name: 'SVT1', logo: 'http://x/l.png', group: 'SE', url: 'http://x/1.ts', tvgId: 'svt1' }
const programme = { title: 'Rapport', start: 1_000_000, stop: 2_000_000 }

describe('inspelningsplan', () => {
  it('planFromProgramme applies margins', () => {
    const body = planFromProgramme(channel, programme, { startEarlyMin: 1, endLateMin: 5 })
    expect(body.startAt).toBe(940_000)
    expect(body.stopAt).toBe(2_300_000)
    expect(body.programmeStart).toBe(1_000_000)
    expect(body.programmeStop).toBe(2_000_000)
    expect(body.title).toBe('Rapport')
    expect(body.channelName).toBe('SVT1')
    expect(body.channelKey).toBe('SVT1::http://x/1.ts')
    expect(body.playUrl).toBe('http://x/1.ts')
    expect(body.logo).toBe('http://x/l.png')
  })

  it('planFromNow without epg records three hours', () => {
    const body = planFromNow(channel, null, 5_000_000, { startEarlyMin: 1, endLateMin: 5 })
    expect(body.startAt).toBe(5_000_000)
    expect(body.stopAt - body.startAt).toBe(RECORD_NO_EPG_MS)
    expect(body.title).toBe('SVT1')
    expect(body.programmeStart).toBeUndefined()
  })

  it('planFromNow with epg stops at programme end plus margin', () => {
    const body = planFromNow(channel, programme, 1_500_000, { startEarlyMin: 1, endLateMin: 5 })
    expect(body.startAt).toBe(1_500_000)
    expect(body.stopAt).toBe(2_300_000)
    expect(body.programmeStart).toBe(1_000_000)
    expect(body.title).toBe('Rapport')
  })
})
