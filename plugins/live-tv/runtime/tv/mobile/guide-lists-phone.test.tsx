import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { flushLiveTvIndex } from '../../../src/__test-stubs__/live-tv-index'
import { computeGroups, type LiveTvList } from '../../live-tv-data'
import { mountPhone, phoneChannel, phoneList, phonePins } from './__phone-mount'
import { getGuideMode } from '../tv-settings-store'
import { MT } from './mobile-tokens'

// Spelaren (runtime/live-tv-player, två steg upp) mockas till en markör så
// att "tryck på rad spelar" kan läsas av. Som den riktiga spelaren äger
// markören Escape medan den är monterad (skalet står tillbaka) och ropar
// `onClose` — Bakåt-kedjan efter uppspelning testas nedan.
vi.mock('../../live-tv-player', async () => {
  const { useEffect } = await import('react')
  const LiveTvPlayer = ({ channel, onClose }: { channel: { name: string }; onClose: () => void }) => {
    useEffect(() => {
      const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); onClose() } }
      window.addEventListener('keydown', onKey, true)
      return () => window.removeEventListener('keydown', onKey, true)
    }, [onClose])
    return <div data-testid="player">{channel.name}</div>
  }
  return { LiveTvPlayer }
})

/** Guiden i spellistläget: fixturen är l1 "Xtream" med A, B (Sport) + C (News), A pinnad. */
const mountLists = async (opts: Parameters<typeof mountPhone>[1] = {}) => {
  const mounted = mountPhone({ view: 'guide' }, { guideMode: 'playlists', ...opts })
  await flushLiveTvIndex()
  await screen.findByTestId('lists-phone')
  return mounted
}

describe('Guiden · Lists på telefon — nivå 1', () => {
  it('sidhuvud, segment och filterfält; listans namn som sektionsrubrik och kategorirader', async () => {
    await mountLists()
    // Flikraden heter också "Guide" — sidhuvudet läses ur vyns egen låda.
    expect(within(screen.getByTestId('lists-phone')).getByText('Guide')).toBeInTheDocument()
    expect(screen.getByTestId('guide-mode')).toBeInTheDocument()
    expect(screen.getByText('Lists').closest('[aria-pressed]')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('lists-section-l1')).toHaveTextContent('Xtream')
    expect(screen.getByTestId('lists-group-l1-Sport')).toHaveTextContent('Sport')
    expect(screen.getByTestId('lists-group-l1-News')).toHaveTextContent('News')
    // Skrivbordets tre kolumner finns inte här.
    expect(screen.queryByTestId('playlists-column')).toBeNull()
    expect(screen.queryByTestId('pl-detail')).toBeNull()
  })

  it('filterfältet är 44 px högt och 16 px text (iOS zoomar annars in på fokus)', async () => {
    await mountLists()
    const input = screen.getByTestId('lists-filter')
    expect(input.tagName).toBe('INPUT')
    expect(input).toHaveStyle({ fontSize: '16px', minHeight: '44px' })
    expect(input).toHaveAttribute('placeholder', 'Filter categories')
  })

  it('scrollytan har bottenluft för flikraden', async () => {
    await mountLists()
    expect(screen.getByTestId('lists-phone')).toHaveStyle({ paddingBottom: MT.SCROLL_PAD_BOTTOM })
  })

  it('kategoriraden är minst 52 px, namnet krymper med ellips och antalet står högerställt', async () => {
    await mountLists()
    const row = screen.getByTestId('lists-group-l1-Sport')
    expect(row).toHaveStyle({ minHeight: '52px' })
    expect(row.style.height).toBe('')
    const name = within(row).getByText('Sport')
    expect(name.style.flex).toContain('1')
    expect(name.style.minWidth).toBe('0')
    expect(name.style.textOverflow).toBe('ellipsis')
    expect(name.style.whiteSpace).toBe('nowrap')
    const count = within(row).getByTestId('lists-group-count')
    expect(count).toHaveTextContent('2')
    expect(count).toHaveStyle({ flexShrink: '0' })
  })

  it('listrubriken bär totalantalet högerställt', async () => {
    await mountLists()
    const section = screen.getByTestId('lists-section-l1')
    expect(within(section).getByTestId('lists-list-count')).toHaveTextContent('3')
  })

  it('Favourites-sektionen ligger först när pins finns, med hjärtat och antalet', async () => {
    await mountLists()
    const favs = screen.getByTestId('lists-favs')
    expect(favs).toHaveTextContent('Favourites')
    expect(favs).toHaveTextContent('1')
    expect(favs.querySelector('svg')).not.toBeNull()
    const root = screen.getByTestId('lists-phone')
    const sections = root.querySelectorAll('[data-testid^="lists-section-"], [data-testid="lists-favs-section"]')
    expect(sections[0]).toHaveAttribute('data-testid', 'lists-favs-section')
  })

  it('Favourites-sektionen saknas utan pins', async () => {
    await mountLists({ pins: [] })
    expect(screen.queryByTestId('lists-favs')).toBeNull()
  })

  it('filtret sållar kategorierna skiftlägesokänsligt', async () => {
    await mountLists()
    fireEvent.change(screen.getByTestId('lists-filter'), { target: { value: 'ne' } })
    expect(screen.queryByTestId('lists-group-l1-Sport')).toBeNull()
    expect(screen.getByTestId('lists-group-l1-News')).toBeInTheDocument()
  })

  it('visar de 6 första kategorierna och en Visa alla-rad som expanderar', async () => {
    const groups = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8']
    const big: LiveTvList = { ...phoneList, channels: groups.map((g) => phoneChannel(`K${g}`, g)) }
    await mountLists({ lists: [big], pins: [] })
    expect(screen.getAllByTestId(/^lists-group-l1-/)).toHaveLength(6)
    const more = screen.getByTestId('lists-show-all-l1')
    expect(more).toHaveTextContent('Show all 8 categories')
    expect(more).toHaveStyle({ minHeight: '44px' })
    fireEvent.click(more)
    expect(screen.getAllByTestId(/^lists-group-l1-/)).toHaveLength(8)
    expect(screen.queryByTestId('lists-show-all-l1')).toBeNull()
  })

  it('kategoriantalet utelämnas när listans kanaler inte är laddade', async () => {
    // Efter lagring v2 bär listorna bara metadata; kanalerna bor i indexet
    // och laddas först på nivå 2. Utan kanaler hos listan finns inget antal.
    const meta: LiveTvList = {
      ...phoneList,
      kind: 'm3u', source: 'http://a.tld/list.m3u', url: 'http://a.tld/list.m3u',
      channels: [], channelCount: 3, groups: computeGroups(phoneList.channels ?? []),
    } as LiveTvList
    await mountLists({ lists: [meta], pins: [] })
    const row = screen.getByTestId('lists-group-l1-Sport')
    expect(within(row).queryByTestId('lists-group-count')).toBeNull()
    expect(row).toHaveTextContent('Sport')
  })
})

describe('Guiden · Lists på telefon — nivå 2 (drill-down)', () => {
  it('tryck på en kategori öppnar kategorinamnet som sidtitel med guide-row-rader', async () => {
    await mountLists()
    fireEvent.click(screen.getByTestId('lists-group-l1-Sport'))
    await flushLiveTvIndex()
    const header = await screen.findByTestId('lists-level2-header')
    expect(header).toHaveTextContent('Sport')
    expect(within(header).getByTestId('header-back')).toBeInTheDocument()
    const rows = screen.getAllByTestId('guide-row')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('A')
    expect(rows[1]).toHaveTextContent('B')
    // Nivå 1 är borta så länge nivå 2 står.
    expect(screen.queryByTestId('lists-filter')).toBeNull()
  })

  it('hela listan öppnas via sektionsrubriken med listnamnet som titel', async () => {
    await mountLists()
    fireEvent.click(screen.getByTestId('lists-section-l1'))
    await flushLiveTvIndex()
    expect(await screen.findByTestId('lists-level2-header')).toHaveTextContent('Xtream')
    expect(screen.getAllByTestId('guide-row')).toHaveLength(3)
  })

  it('Favourites-kortet öppnar favoriterna', async () => {
    await mountLists()
    fireEvent.click(screen.getByTestId('lists-favs'))
    expect(await screen.findByTestId('lists-level2-header')).toHaveTextContent('Favourites')
    const rows = screen.getAllByTestId('guide-row')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveTextContent('A')
  })

  it('Bakåt (Escape) går tillbaka till nivå 1, inte till hubben', async () => {
    const { onNavigate } = await mountLists()
    fireEvent.click(screen.getByTestId('lists-group-l1-News'))
    await screen.findByTestId('lists-level2-header')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(await screen.findByTestId('lists-filter')).toBeInTheDocument()
    expect(screen.queryByTestId('lists-level2-header')).toBeNull()
    expect(screen.getByTestId('guide-mode')).toBeInTheDocument()
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('bakåtknappen i sidhuvudet går tillbaka till nivå 1', async () => {
    await mountLists()
    fireEvent.click(screen.getByTestId('lists-group-l1-News'))
    fireEvent.click(await screen.findByTestId('header-back'))
    expect(await screen.findByTestId('lists-filter')).toBeInTheDocument()
  })

  it('tryck på en kanalrad spelar', async () => {
    await mountLists()
    fireEvent.click(screen.getByTestId('lists-group-l1-News'))
    fireEvent.click((await screen.findAllByTestId('guide-row'))[0])
    expect(await screen.findByTestId('player')).toHaveTextContent('C')
  })

  // Slutgranskningen: guidens lägeslager (Now → Lists) och nivå 2-lagret
  // ligger båda i skalets kedja. Av-/återregistrering runt uppspelningen
  // kastade om deras ordning (barnets effekt kör först), så Bakåt efter
  // spelningen bytte läge i stället för att stänga nivå 2. Nu står lagren
  // kvar och spelaren stängs före dem.
  it('Bakåt efter uppspelning i nivå 2 går till nivå 1, inte tillbaka till Now', async () => {
    const { onNavigate } = mountPhone({ view: 'guide' })
    await flushLiveTvIndex()
    fireEvent.click(await screen.findByText('Lists'))
    await screen.findByTestId('lists-phone')
    expect(getGuideMode()).toBe('playlists')
    fireEvent.click(screen.getByTestId('lists-group-l1-News'))
    await screen.findByTestId('lists-level2-header')
    fireEvent.click((await screen.findAllByTestId('guide-row'))[0])
    expect(await screen.findByTestId('player')).toHaveTextContent('C')
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByTestId('player')).toBeNull())
    expect(screen.getByTestId('lists-level2-header')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(await screen.findByTestId('lists-filter')).toBeInTheDocument()
    expect(screen.queryByTestId('lists-level2-header')).toBeNull()
    expect(getGuideMode()).toBe('playlists')
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('Visa fler sidindelar en stor kategori i steg om 40', async () => {
    const big: LiveTvList = { ...phoneList, channels: Array.from({ length: 100 }, (_, i) => phoneChannel(`K${i}`, 'Alla')) }
    await mountLists({ lists: [big], pins: [] })
    fireEvent.click(screen.getByTestId('lists-group-l1-Alla'))
    expect(await screen.findAllByTestId('guide-row')).toHaveLength(40)
    fireEvent.click(screen.getByTestId('show-more'))
    expect(screen.getAllByTestId('guide-row')).toHaveLength(80)
  })
})
