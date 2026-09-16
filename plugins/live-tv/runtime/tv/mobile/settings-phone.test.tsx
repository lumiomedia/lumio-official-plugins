import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import type { LiveTvList } from '../../live-tv-data'
import { getGuideMode, getTvSettings } from '../tv-settings-store'
import { mountPhone, phoneChannel } from './__phone-mount'

// Spelaren behöver inte finnas för att inställningarna ska ritas.
vi.mock('../../live-tv-player', () => ({ LiveTvPlayer: () => null }))

// En M3U-lista med källa: bara importerbara listor får Hämta om-knappen,
// och det är den knappraden testet nedan letar efter.
const m3uList: LiveTvList = { id: 'l1', name: 'iptv.example.com', kind: 'm3u', source: 'http://iptv.example.com/list.m3u', channels: [phoneChannel('A', 'Sport')], createdAt: '', urlTvg: null, epgUrls: ['http://x/epg.xml'], autoEpgDisabled: false, fetchedAt: '2026-09-12T10:00:00Z' }

describe('Inställningar på telefon', () => {
  it('ingen flikkolumn och inga TV-val (förhandsvisning, nummertangenter, banner)', async () => {
    mountPhone({ view: 'settings' })
    expect(await screen.findByTestId('setting-startOnLastChannel')).toBeInTheDocument()
    expect(screen.queryByTestId('tab-appearance')).toBeNull()
    expect(screen.queryByTestId('setting-previewEnabled')).toBeNull()
    expect(screen.queryByTestId('setting-numericZap')).toBeNull()
    expect(screen.queryByTestId('setting-bannerHideMs')).toBeNull()
  })

  it('Håll skärmen tänd och Helskärm vid rotation finns och skriver till lagret', async () => {
    mountPhone({ view: 'settings' })
    expect(getTvSettings().keepAwake).toBe(true)
    fireEvent.click(await screen.findByTestId('setting-keepAwake'))
    expect(getTvSettings().keepAwake).toBe(false)
    expect(getTvSettings().fullscreenOnRotate).toBe(true)
    fireEvent.click(screen.getByTestId('setting-fullscreenOnRotate'))
    expect(getTvSettings().fullscreenOnRotate).toBe(false)
    fireEvent.click(screen.getByTestId('setting-startOnLastChannel'))
    expect(getTvSettings().startOnLastChannel).toBe(true)
  })

  it('guidens standardvy är ett segment (Now/Timeline/Lists) som skriver guideläget', async () => {
    mountPhone({ view: 'settings' })
    fireEvent.click(await screen.findByTestId('segment-grid'))
    expect(getGuideMode()).toBe('grid')
    fireEvent.click(screen.getByTestId('segment-playlists'))
    expect(getGuideMode()).toBe('playlists')
    expect(screen.queryByTestId('guide-default-tl')).toBeNull()
  })

  it('spellistekortet: knapparna ligger i en egen rad under namnet', async () => {
    mountPhone({ view: 'settings' }, { lists: [m3uList] })
    const row = await screen.findByTestId('list-row-l1')
    const refetch = screen.getByTestId('list-refetch-l1')
    const actions = refetch.closest('[data-list-actions]')
    expect(actions).not.toBeNull()
    expect(row.contains(actions)).toBe(true)
    // Namnet står utanför knappraden — aldrig på samma rad som knapparna.
    const name = screen.getByText('iptv.example.com')
    expect(actions!.contains(name)).toBe(false)
    expect(screen.getByTestId('list-remove-l1').closest('[data-list-actions]')).toBe(actions)
    expect(screen.getByText('Add M3U URL')).toBeInTheDocument()
    expect(screen.getByText('Create list')).toBeInTheDocument()
  })

  it('Mer: EPG-källor och Föräldrakontroll navigerar till respektive flik', async () => {
    const { onNavigate } = mountPhone({ view: 'settings' })
    fireEvent.click(await screen.findByText('EPG sources'))
    expect(onNavigate).toHaveBeenCalledWith({ pageId: 'live-tv-browse', params: { view: 'settings', tab: 'epg' } })
    fireEvent.click(screen.getByText('Parental control'))
    expect(onNavigate).toHaveBeenCalledWith({ pageId: 'live-tv-browse', params: { view: 'settings', tab: 'parental' } })
  })

  it('tab=epg visar tillbaka-knappen och EPG-adresserna; Bakåt går till inställningarna', async () => {
    const { onNavigate } = mountPhone({ view: 'settings', tab: 'epg' }, { lists: [m3uList] })
    // Adressen står både som källrad och i diagnostiken (samma siffror som skrivbordet).
    expect((await screen.findAllByText('http://x/epg.xml')).length).toBeGreaterThan(0)
    expect(screen.queryByTestId('setting-keepAwake')).toBeNull()
    expect(screen.queryByTestId('tab-appearance')).toBeNull()
    fireEvent.click(screen.getByTestId('header-back'))
    expect(onNavigate).toHaveBeenCalledWith({ pageId: 'live-tv-browse', params: { view: 'settings' } })
  })

  it('tab=parental visar föräldrakontrollen med tillbaka-knapp', async () => {
    mountPhone({ view: 'settings', tab: 'parental' })
    expect(await screen.findByTestId('header-back')).toBeInTheDocument()
    expect(screen.getByText('No locked channels')).toBeInTheDocument()
  })

  it('inga fjärrkontrollstexter', async () => {
    const { box } = mountPhone({ view: 'settings' }, { lists: [m3uList] })
    await screen.findByTestId('list-row-l1')
    expect(box.textContent).not.toMatch(/\bOK\b|håll|hold OK/)
  })
})
