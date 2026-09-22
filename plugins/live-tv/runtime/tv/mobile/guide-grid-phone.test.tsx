import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { flushLiveTvIndex } from '../../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../../live-tv-data'
import { startOfLocalDay } from '../../live-tv-model'
import type { EpgCacheEntry } from '../../epg/types'
import { PHONE_CHANNEL_COL_PX, PHONE_PX_PER_MIN, nowLinePx } from '../epg-grid-geometry'
import { mountPhone, phoneChannel, phonePins } from './__phone-mount'
import { MT } from './mobile-tokens'

// Spelaren (runtime/live-tv-player, två steg upp) mockas bort — tablån
// öppnar kanalvyn, den spelar inte direkt.
vi.mock('../../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string } }) => <div data-testid="player">{channel.name}</div> }))

const M = 60_000
const now = Date.now()
/** Samma fönster som vyn: 30 min före nu, nedåt till halvtimme … i morgon 06:00. */
const windowStart = Math.floor((now - 30 * M) / (30 * M)) * (30 * M)
const windowEnd = startOfLocalDay(now, 1) + 6 * 3_600_000

// A har tablå (a.tv), B och C saknar — de faller bort ur rutnätet.
const list: LiveTvList = {
  id: 'l1', name: 'Xtream',
  channels: [{ ...phoneChannel('A', 'Sport'), tvgId: 'a.tv' }, phoneChannel('B', 'Sport'), phoneChannel('C', 'News')],
  createdAt: '', urlTvg: 'http://x/epg', epgUrls: [], autoEpgDisabled: false, fetchedAt: null,
}
const cache: EpgCacheEntry = {
  index: {
    'a.tv': [
      { title: 'Now A', start: now - 10 * M, stop: now + 20 * M },
      { title: 'Next A', start: now + 20 * M, stop: now + 80 * M },
    ],
  },
  fetchedAt: now,
  sources: ['http://x/epg'],
}

const mountGrid = async () => {
  const mounted = mountPhone({ view: 'guide' }, { lists: [list], pins: phonePins, cache, guideMode: 'grid' })
  await flushLiveTvIndex()
  await screen.findAllByTestId('grid-block')
  return mounted
}

describe('Guiden · Tablå (Timeline) på telefon', () => {
  it('scrollytan, nu-linjen, segmentet, chipsen och datumraden finns; ingen dagväljare eller detaljremsa', async () => {
    await mountGrid()
    const scroll = screen.getByTestId('grid-phone-scroll')
    expect(scroll).toHaveAttribute('data-scroll')
    expect(scroll).toHaveStyle({ paddingBottom: MT.SCROLL_PAD_BOTTOM })
    expect(screen.getByTestId('grid-now-line')).toBeInTheDocument()
    expect(screen.getByTestId('guide-mode')).toBeInTheDocument()
    expect(screen.getByTestId('guide-groups')).toBeInTheDocument()
    expect(screen.getByTestId('grid-phone-date')).toHaveTextContent(
      // Samma locale som `useTvText()` ger på engelska (en-GB → "Tue 15 Sep", handoffens form).
      new Date(now).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
    )
    expect(screen.queryByTestId('grid-day-0')).toBeNull()
    expect(screen.queryByTestId('grid-day-1')).toBeNull()
    expect(screen.queryByTestId('grid-detail')).toBeNull()
    expect(screen.queryByTestId('grid-scroll')).toBeNull()
  })

  it('kanalkolumnen är 112 px och sticky; blocken ligger på top 8 med höjd 48', async () => {
    await mountGrid()
    const cells = screen.getAllByTestId('grid-phone-channel')
    expect(cells).toHaveLength(1)
    expect(cells[0]).toHaveStyle({ width: `${PHONE_CHANNEL_COL_PX}px`, position: 'sticky', left: '0px' })
    expect(cells[0]).toHaveTextContent('A')
    const blocks = screen.getAllByTestId('grid-block')
    expect(blocks).toHaveLength(2)
    for (const block of blocks) expect(block).toHaveStyle({ top: '8px', height: '48px', borderRadius: '10px' })
    expect(screen.getByText('Now A')).toBeInTheDocument()
  })

  it('pågående block är accentfärgat, kommande neutralt', async () => {
    await mountGrid()
    const live = screen.getByText('Now A').closest('[data-testid="grid-block"]')
    const next = screen.getByText('Next A').closest('[data-testid="grid-block"]')
    expect(live).toHaveAttribute('data-live', '1')
    expect(next).not.toHaveAttribute('data-live')
  })

  it('tidsetiketterna kommer var 30:e minut och är 11 px', async () => {
    await mountGrid()
    const labels = screen.getAllByTestId('grid-time-label')
    const expected = Math.ceil((windowEnd - windowStart) / (30 * M))
    expect(labels).toHaveLength(expected)
    const ms = labels.map((el) => Number(el.getAttribute('data-ms')))
    expect(ms[0]).toBe(windowStart)
    for (let i = 1; i < ms.length; i += 1) expect(ms[i] - ms[i - 1]).toBe(30 * M)
    expect(labels[0]).toHaveStyle({ fontSize: '11px', width: `${30 * PHONE_PX_PER_MIN}px` })
  })

  it('nu-linjen står vid 112 + nowLinePx i telefonskalan', async () => {
    await mountGrid()
    const line = screen.getByTestId('grid-now-line')
    const expected = PHONE_CHANNEL_COL_PX + nowLinePx(now, windowStart, PHONE_PX_PER_MIN)
    // Klockan tickar mellan fixtur och rendering — en minut tolerans räcker.
    expect(Number.parseFloat(line.style.left)).toBeCloseTo(expected, -1)
  })

  it('Nu-knappen scrollar tillbaka till nu (max(0, nowLeft − 40))', async () => {
    await mountGrid()
    const scroll = screen.getByTestId('grid-phone-scroll')
    scroll.scrollLeft = 0
    fireEvent.click(screen.getByTestId('grid-now-btn'))
    const expected = Math.max(0, nowLinePx(now, windowStart, PHONE_PX_PER_MIN) - 40)
    expect(scroll.scrollLeft).toBeCloseTo(expected, -1)
    expect(scroll.scrollLeft).toBeGreaterThan(0)
  })

  it('tryck på ett block öppnar kanalvyn på programmets start', async () => {
    const { onNavigate } = await mountGrid()
    fireEvent.click(screen.getByText('Next A').closest('[data-testid="grid-block"]')!)
    expect(onNavigate).toHaveBeenCalledWith(expect.objectContaining({
      params: expect.objectContaining({ view: 'channel', programme: String(now + 20 * M) }),
    }))
  })

  it('chip filtrerar: News har ingen tablå → tomtext', async () => {
    await mountGrid()
    fireEvent.click(screen.getByTestId('chip-News'))
    await flushLiveTvIndex()
    expect(screen.queryAllByTestId('grid-block')).toHaveLength(0)
    expect(screen.getByTestId('grid-phone-empty')).toBeInTheDocument()
  })

  it('Visa fler när fler kanaler med tablå finns bortom de 80 första', async () => {
    // 81 kanaler med tablå: 80 rader först, Visa fler ger den 81:a.
    const many = Array.from({ length: 81 }, (_, i) => ({ ...phoneChannel(`K${i}`, 'Sport'), tvgId: `k${i}.tv` }))
    const index: EpgCacheEntry['index'] = {}
    for (const channel of many) index[channel.tvgId!] = [{ title: `P ${channel.name}`, start: now - 10 * M, stop: now + 50 * M }]
    mountPhone({ view: 'guide' }, { lists: [{ ...list, channels: many }], pins: [], cache: { index, fetchedAt: now, sources: [] }, guideMode: 'grid' })
    await flushLiveTvIndex()
    await screen.findAllByTestId('grid-block')
    expect(screen.getAllByTestId('grid-phone-channel')).toHaveLength(80)
    fireEvent.click(screen.getByTestId('show-more'))
    await flushLiveTvIndex()
    expect(screen.getAllByTestId('grid-phone-channel')).toHaveLength(81)
    expect(screen.queryByTestId('show-more')).toBeNull()
  })

  it('inga fjärrkontrollstexter', async () => {
    const { box } = await mountGrid()
    expect(box.textContent).not.toMatch(/\bOK\b|håll|hold OK/)
  })
})
