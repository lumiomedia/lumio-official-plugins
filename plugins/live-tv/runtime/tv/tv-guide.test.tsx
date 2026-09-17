import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { TV_SCENE_BOX_ATTR, __resetForTests, __setDesktopTauriEnvForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { flushLiveTvIndex, seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'
import { getGuideMode } from './tv-settings-store'
import { dp } from './tv-ui'
import type { EpgCacheEntry } from '../epg/types'

vi.mock('../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string } }) => <div data-testid="player">{channel.name}</div> }))
import { LiveTvTvShell } from './tv-shell'

const now = Date.now()
const ch = (name: string, group: string, tvgId: string | null = null) => ({ name, logo: null, group, url: `http://x/${name}`, tvgId })
const list: LiveTvList = { id: 'l1', name: 'Xtream', channels: [ch('A', 'Sport', 'a.tv'), ch('B', 'Sport'), ch('C', 'News')], createdAt: '', urlTvg: 'http://x/epg', epgUrls: [], autoEpgDisabled: false, fetchedAt: null }
const cache: EpgCacheEntry = {
  index: { 'a.tv': [
    { title: 'Now A', start: now - 10 * 60_000, stop: now + 20 * 60_000 },
    { title: 'Next A', start: now + 20 * 60_000, stop: now + 50 * 60_000 },
    { title: 'Later A', start: now + 50 * 60_000, stop: now + 80 * 60_000 },
  ] },
  fetchedAt: now, sources: ['http://x/epg'],
}

afterEach(() => { cleanup(); __setDesktopTauriEnvForTests(false) })
/**
 * LAN/FJÄRR-SVITEN. "Kanalguiden städad på skrivbord och TV" (0.10.0) lade
 * TV-läget och skrivbordsappen bakom `useNewGuideSurface` (`guide-surface.ts`)
 * → `TvGuideShell`, vars beteende (lägesstack, Bakåt, paneler, TV-rester)
 * bor i `guide-shell.test.tsx` och vy-testerna. Den gamla Nu/Sen · Tablå ·
 * Rutnät · Spellistor-guiden (`TvGuideStandard`) lever orört kvar på
 * LAN/fjärr-webbklienten (spec "Beslut", Var; "Avgränsningar"), och det är
 * DEN som testas här: inget TV-läge, ingen Tauri-flagga. `TvGuide: ny yta`
 * längst ner täcker själva ytgrinden.
 */
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(false)
  __setDesktopTauriEnvForTests(false)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  seedLiveTvIndex({ cache: cache })
})

/** Tablån kommer från appen: modellen och vyn får landa innan något läses av. */
const mount = async (params: Record<string, string> = { view: 'guide' }) => {
  const rendered = render(<LiveTvTvShell pageId="live-tv-browse" params={params} onNavigate={() => {}} onOpenDetails={() => {}} />)
  await flushLiveTvIndex()
  return rendered
}

describe('TvGuideStandard (LAN/fjärr)', () => {
  it('den gamla guiden finns kvar: fyra lägen i segmentet, toppband och förhandsvisning — inget nytt skal', async () => {
    await mount()
    expect(screen.queryByTestId('guide-control-row')).not.toBeInTheDocument()
    const options = screen.getAllByTestId('tv-segment-option')
    expect(options.map((o) => o.textContent)).toEqual(['Now / Next', 'Timeline', 'Grid', 'Playlists'])
    expect(screen.getByTestId('guide-headline')).toBeInTheDocument()
    // `TvPreview` (sparad bildruta när förhandsvisningen är av) med sin OK-etikett.
    expect(screen.getByText(/OK = fullscreen/)).toBeInTheDocument()
  })
  it('visar Nu/Sen/Senare för kanalen med tablå och tomtext för de utan', async () => {
    await mount()
    // "Nu" står både på raden och i toppbandet för den valda kanalen.
    expect(screen.getAllByText('Now A').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Next A').length).toBeGreaterThan(0)
    expect(screen.getByText('Later A')).toBeInTheDocument()
    expect(screen.getAllByText('No programme information').length).toBeGreaterThan(0)
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
  })
  it('tomlägets nod ligger kvar när raderna kommit — bara stationen flyttar', async () => {
    // Noden bar `data-init` under laddningen och AVMONTERADES när raderna kom:
    // fokusmotorn stod utan startstation i ögonblicket däremellan.
    await mount()
    const empty = screen.getByTestId('guide-empty')
    expect(empty).toBeInTheDocument()
    expect(empty).not.toHaveAttribute('data-f')
    expect(empty).not.toHaveAttribute('data-init')
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
  })

  it('fokus på en rad uppdaterar toppbandet', async () => {
    await mount()
    const rows = screen.getAllByTestId('guide-row')
    fireEvent.focus(rows[2])
    expect(screen.getByTestId('guide-headline')).toHaveTextContent('C')
  })
  it('tablåläget visar "Hämtar tablå…" tills fönstret landat, sedan raderna', async () => {
    // Tablån bor i appen sedan lagring v2: raden har ingen tablå att visa
    // förrän fönstret svarat, och "Ingen programinformation" dessförinnan
    // hade varit en lögn om data som är på väg.
    await mount()
    fireEvent.click(screen.getByText('Timeline'))
    expect(screen.getAllByText('Fetching guide…').length).toBeGreaterThan(0)
    await flushLiveTvIndex()
    expect(screen.queryByText('Fetching guide…')).not.toBeInTheDocument()
    expect(screen.getAllByText('Now A').length).toBeGreaterThan(0)
    // Kanalerna utan tablå får tomtexten — först NU, när svaret är läst.
    expect(screen.getAllByText('No programme information').length).toBeGreaterThan(0)
  })
  it('segmentväxeln byter till tablåläge med nu-linje', async () => {
    await mount()
    fireEvent.click(screen.getByText('Timeline'))
    await flushLiveTvIndex()
    expect(screen.getByTestId('now-line')).toBeInTheDocument()
    expect(screen.getAllByText('Now A').length).toBeGreaterThan(0)
  })
  it('OK på raden spelar kanalen', async () => {
    mount()
    fireEvent.click(screen.getAllByTestId('guide-row')[1])
    expect(await screen.findByTestId('player')).toHaveTextContent('B')
  })
  it('▸ på en rad byter kategori och tar med sig valet till nya första raden', async () => {
    await mount()
    const rows = screen.getAllByTestId('guide-row')
    fireEvent.focus(rows[2])
    expect(screen.getByTestId('guide-headline')).toHaveTextContent('C')
    // Alla → Sport. Toppbandet ska visa Sports första kanal direkt, utan att
    // användaren först måste pila upp/ner för att avfyra en ny onFocus.
    fireEvent.keyDown(rows[2], { key: 'ArrowRight' })
    expect(screen.getAllByTestId('guide-row')).toHaveLength(2)
    expect(screen.getByTestId('guide-headline')).toHaveTextContent('Now A')
  })
  it('vald rad utanför de synliga raderna ger ändå exakt en data-init', async () => {
    // 60 kanaler: listan visar 40 åt gången. Efter "Visa fler" + fokus på rad
    // 45 nollställer ett lägesbyte `visible` till 40 — den valda raden ritas
    // då inte längre, och `selected ? focused : index === 0` gav NOLL
    // data-init i hela vyn, alltså ingen startstation för fokusmotorn.
    const many = Array.from({ length: 60 }, (_, i) => ch(`K${i + 1}`, 'Sport'))
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [{ ...list, channels: many }])
    seedLiveTvIndex({ cache })
    await mount()
    fireEvent.click(screen.getByText('Show more'))
    const rows = screen.getAllByTestId('guide-row')
    expect(rows.length).toBeGreaterThan(45)
    fireEvent.focus(rows[45])
    fireEvent.click(screen.getByText('Timeline'))
    const after = screen.getAllByTestId('guide-row')
    expect(after).toHaveLength(40)
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
    expect(after[0]).toHaveAttribute('data-init')
  })
  it('okänd group-parameter faller tillbaka till Alla i stället för en tom vy', async () => {
    await mount({ view: 'guide', group: 'Nonexistent' })
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
    expect(screen.getAllByTestId('guide-row')).toHaveLength(3)
  })
})

/**
 * Lägesbytet i guiden (Nu/Sen · Tablå · Spellistor) är en navigering INNE i
 * vyn. Skalets Back kände bara till vyer: Back ur ett bytt läge lämnade hela
 * guiden, och eftersom läget sparas landade nästa besök i samma bytta läge —
 * spellistevyn hade dessutom ingen växel alls, så vägen tillbaka till den nya
 * guidevyn fanns helt enkelt inte (Jerry, riktig TV, plugin 0.5.0).
 *
 * Den städade guidens stack (två byten = två Bakåt, tom stack lämnar guiden)
 * testas i `guide-shell.test.tsx`; här står LAN-grenens egen stack kvar.
 */
describe('TvGuideStandard (LAN/fjärr): lägesbyte och Bakåt', () => {
  const mountWithNav = async (onNavigate: (arg: unknown) => void, params: Record<string, string> = { view: 'guide' }) => {
    const rendered = render(<LiveTvTvShell pageId="live-tv-browse" params={params} onNavigate={onNavigate} onOpenDetails={() => {}} />)
    await flushLiveTvIndex()
    return rendered
  }

  it('spellisteläget behåller lägesväxeln — vägen tillbaka till guiden finns kvar', async () => {
    await mount()
    fireEvent.click(screen.getByText('Playlists'))
    await flushLiveTvIndex()
    expect(screen.getAllByTestId('pl-row').length).toBeGreaterThan(0)
    // Exakt en startstation även här.
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
    // Och en station som tar användaren tillbaka.
    fireEvent.click(screen.getByText('Now / Next'))
    await flushLiveTvIndex()
    expect(screen.getAllByTestId('guide-row').length).toBeGreaterThan(0)
    expect(getGuideMode()).toBe('now')
  })

  it('Bakåt efter ett lägesbyte går tillbaka till läget före — inte ut ur guiden', async () => {
    const onNavigate = vi.fn()
    await mountWithNav(onNavigate)
    fireEvent.click(screen.getByText('Playlists'))
    await flushLiveTvIndex()
    fireEvent.keyDown(window, { key: 'Backspace' })
    await flushLiveTvIndex()
    expect(screen.getAllByTestId('guide-row').length).toBeGreaterThan(0)
    expect(getGuideMode()).toBe('now')
    expect(onNavigate).not.toHaveBeenCalled()
    // Stacken är tom: nästa Bakåt lämnar guiden som förut.
    fireEvent.keyDown(window, { key: 'Backspace' })
    expect(onNavigate).toHaveBeenCalledTimes(1)
    expect((onNavigate.mock.calls[0][0] as { params: Record<string, string> }).params.view).toBe('hub')
  })
})

describe('TvGuideStandard (LAN/fjärr): kanalkolumnens layoutkontext (fixrunda 1)', () => {
  // Lådan måste bort i `afterEach` — se M-P2:s skaltest/rapport.
  let box: HTMLElement | null = null
  afterEach(() => { box?.remove(); box = null })

  const mountInBox = async () => {
    box = document.createElement('div')
    box.setAttribute(TV_SCENE_BOX_ATTR, '1')
    document.body.appendChild(box)
    const rendered = render(<LiveTvTvShell pageId="live-tv-browse" params={{ view: 'guide' }} onNavigate={() => {}} onOpenDetails={() => {}} />, { container: box })
    await flushLiveTvIndex()
    return rendered
  }

  // FYND 1 (granskning): ett gemensamt TAL räckte inte — `ChannelCell` fyller
  // alltid ut till 100 %, så det som faktiskt avgör bredden är layouten på
  // wrappern (`guide-row`) och rubrikkolumnen. Testerna nedan läser DEN
  // stilen, inte cellens egen (som alltid är '100%'). Fas 2:s telefongren
  // (flex 1 + breddgolv) är borta sedan fas 3 — telefonen får en egen guide.
  it('rubrikkolumnen bär EXAKT samma layout som raden', async () => {
    await mountInBox()
    const header = screen.getByTestId('guide-channel-col-header')
    const row = screen.getAllByTestId('guide-row')[0]
    for (const prop of ['flexGrow', 'flexShrink', 'flexBasis', 'minWidth', 'width'] as const) {
      expect(header.style[prop]).toBe(row.style[prop])
    }
  })

  it('raden och rubrikkolumnen behåller 520 dp och ingen krympning på skrivbordet/TV', async () => {
    await mountInBox()
    const row = screen.getAllByTestId('guide-row')[0]
    const header = screen.getByTestId('guide-channel-col-header')
    expect(row.style.width).toBe(`${dp(520)}px`)
    expect(row.style.flexShrink).toBe('0')
    expect(header.style.width).toBe(`${dp(520)}px`)
    expect(header.style.flexShrink).toBe('0')
  })
})

describe('TvGuideStandard (LAN/fjärr): orimligt långa kanalnamn klipps', () => {
  // FYND 2 (granskning): `width: '100%'` i en osizead wrapper triggar
  // sannolikt aldrig ellipsen — cellen växer med namnet i stället för att
  // klippa. Egen kanallista med ett orimligt långt namn, isolerad till detta
  // describe-block så den inte stör de andra testernas A/B/C-antaganden.
  const longName = 'X'.repeat(180) + ' Ett Orimligt Långt Kanalnamn Som Aldrig Ska Få Spränga Raden'
  let box: HTMLElement | null = null
  afterEach(() => { box?.remove(); box = null })
  beforeEach(() => {
    const longList: LiveTvList = { id: 'l1', name: 'Xtream', channels: [ch(longName, 'Sport')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [longList])
    seedLiveTvIndex()
  })

  it('kanalcellens namnrad klipper i stället för att sprängas', async () => {
    box = document.createElement('div')
    box.setAttribute(TV_SCENE_BOX_ATTR, '1')
    document.body.appendChild(box)
    render(<LiveTvTvShell pageId="live-tv-browse" params={{ view: 'guide' }} onNavigate={() => {}} onOpenDetails={() => {}} />, { container: box })
    await flushLiveTvIndex()
    const cell = screen.getByTestId('guide-channel-cell')
    const nameEl = within(cell).getByText(longName)
    expect(nameEl).toHaveStyle({ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })
    // Raden som håller cellen bär den delade layoutkontexten (fast bredd,
    // ingen krympning) — inte en bredd som sväller med innehållet.
    const row = screen.getByTestId('guide-row')
    expect(row.style.width).toBe(`${dp(520)}px`)
    expect(row.style.flexShrink).toBe('0')
  })
})

// Jerrys uppföljning: fjärrhjälpen ("OK watch · hold OK menu · ◂▸ category")
// ska bort HELT, ingen ersättningstext någonstans. På TV/skrivbord når ingen
// längre den här guiden (skalet har egen grind i `guide-shell.test.tsx`).
describe('TvGuideStandard (LAN/fjärr) fjärrhjälp (borttagen, Jerrys uppföljning)', () => {
  it('renderas aldrig', async () => {
    await mount()
    expect(screen.queryByText('OK watch · hold OK menu · ◂▸ category')).not.toBeInTheDocument()
  })
})

/**
 * Ytgrinden (spec 1, "Guidens skal"): TV-läget OCH skrivbordsappen (Tauri,
 * inte telefon) går via `useNewGuideSurface` → `TvGuideShell`. Skalets egen
 * svit (`guide-shell.test.tsx`) täcker normalisering, paneler, Bakåt och
 * TV-resterna — här bara att grenen tas och att den gamla guiden inte
 * ritas bredvid.
 */
describe('TvGuide: ny yta (newGuide → TvGuideShell)', () => {
  it('TV-läget grenar till skalet: kontrollrad, inga gamla spellistkolumner', async () => {
    __setTvModeForTests(true)
    writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_guide_mode_v1', 'playlists')
    await mount()
    expect(screen.getByTestId('guide-control-row')).toBeInTheDocument()
    expect(screen.queryByTestId('playlists-column')).not.toBeInTheDocument()
    expect(screen.queryByTestId('guide-headline')).not.toBeInTheDocument()
  })

  it('skrivbordsappen (Tauri, inte TV-läge) grenar också till skalet — utan toppband och förhandsvisning', async () => {
    __setDesktopTauriEnvForTests(true)
    await mount()
    expect(screen.getByTestId('guide-control-row')).toBeInTheDocument()
    expect(screen.queryByTestId('guide-headline')).not.toBeInTheDocument()
    expect(screen.queryByText(/OK = fullscreen/)).not.toBeInTheDocument()
  })
})
