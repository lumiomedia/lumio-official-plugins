import { afterAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { flushLiveTvIndex } from '../../../src/__test-stubs__/live-tv-index'
import { channelKey, getPinnedLiveTvKeys, type LiveTvList } from '../../live-tv-data'
import type { EpgCacheEntry } from '../../epg/types'
import { getReminders } from '../../reminders'
import { mountPhone, phoneList, phonePins } from './__phone-mount'

// Spelaren (runtime/live-tv-player, två steg upp) mockas till en markör så
// att "primärknappen spelar" och timeshift-URL:en kan läsas av.
vi.mock('../../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string; url: string } }) => <div data-testid="player">{channel.name}|{channel.url}</div> }))

/**
 * Klockan låst till mitt på dagen INNAN `now` nedan läses av: fixturens
 * `now ± 5h` (Morgon…Fotboll) får annars kalenderdygnet att välta över
 * midnatt beroende på när i sjön testkörningen råkar starta —
 * `dayStart`/`dayStart + DAY_MS` (`channel-detail.ts`) tappar då rader som i
 * verkligheten hör till "Idag". Måste stå som toppnivåkod (inte i en
 * `beforeAll`): `const now = Date.now()` några rader ner körs vid
 * modulinläsning, före några testkrokar. `toFake: ['Date']` rör inte
 * `setTimeout`/`Promise`, så `flushLiveTvIndex` och övriga async-flöden
 * nedan påverkas inte.
 */
vi.useFakeTimers({ toFake: ['Date'] })
vi.setSystemTime(new Date(2026, 8, 16, 12, 0, 0))
afterAll(() => {
  vi.useRealTimers()
})

/** Fixturens A (Sport, pinnad) — utan tablå. */
const paramsA = { view: 'channel', url: 'http://x/A', name: 'A', group: 'Sport' }
const mountA = async (opts: Parameters<typeof mountPhone>[1] = {}) => {
  const mounted = mountPhone(paramsA, opts)
  await flushLiveTvIndex()
  await screen.findByTestId('channel-phone')
  return mounted
}

/** En arkivkanal MED tablå: passerat, pågående och kommande program. */
const now = Date.now()
const H = 3_600_000
const espn = { name: 'ESPN', logo: null, group: 'Sport', url: 'http://x/ESPN', tvgId: 'espn.tv', archive: { days: 3, streamId: 7, base: 'http://panel', username: 'u', password: 'p' } }
const espnList: LiveTvList = { ...phoneList, channels: [espn] }
const cache: EpgCacheEntry = { index: { 'espn.tv': [
  { title: 'Morning', start: now - 5 * H, stop: now - 4 * H, description: 'Old' },
  { title: 'GameDay', start: now - H, stop: now + H, description: 'Live now' },
  { title: 'Football', start: now + H, stop: now + 2 * H },
] }, fetchedAt: now, sources: [] }
const paramsEspn = { view: 'channel', url: espn.url, name: espn.name, group: espn.group, tvgId: espn.tvgId }
const mountEspn = async (extra: Record<string, string> = {}) => {
  const mounted = mountPhone({ ...paramsEspn, ...extra }, { lists: [espnList], pins: [], cache })
  await flushLiveTvIndex()
  await screen.findByTestId('channel-phone')
  await screen.findByText('GameDay')
  return mounted
}
const rowOf = (title: string) => screen.getByText(title).closest('[data-testid="programme-row"]') as HTMLElement

describe('Kanaldetalj på telefon — utan tablå', () => {
  it('sidhuvudet visar kanalnamnet och en tillbaka-knapp; skrivbordets kolumner finns inte', async () => {
    await mountA()
    const header = screen.getByTestId('channel-header')
    expect(header).toHaveTextContent('A')
    expect(within(header).getByTestId('header-back')).toBeInTheDocument()
    expect(screen.queryByTestId('day-picker')).toBeNull()
    expect(screen.queryByTestId('detail')).toBeNull()
    expect(screen.queryByTestId('channel-view-root')).toBeNull()
  })

  it('primärknappen finns med Titta nu, är 48 px, rund och bär data-init', async () => {
    await mountA()
    const primary = screen.getByTestId('channel-primary')
    expect(primary).toHaveTextContent('Watch now')
    expect(primary).toHaveAttribute('data-init')
    expect(primary).toHaveStyle({ minHeight: '48px', borderRadius: '999px', fontSize: '16px', fontWeight: '600' })
    expect(primary.style.height).toBe('')
  })

  it('programlistan är tom-tålig: ingen rad, ingen krasch, tom-text', async () => {
    await mountA()
    expect(screen.queryAllByTestId('programme-row')).toHaveLength(0)
    expect(screen.getByTestId('channel-empty')).toHaveTextContent('No programme information')
  })

  it('hjärtknappen är 44×44 och togglar favoriten', async () => {
    await mountA()
    const heart = screen.getByTestId('channel-pin')
    expect(heart).toHaveStyle({ width: '44px', height: '44px' })
    const key = channelKey({ name: 'A', url: 'http://x/A' })
    expect(getPinnedLiveTvKeys()).toContain(key)
    fireEvent.click(heart)
    expect(getPinnedLiveTvKeys()).not.toContain(key)
    fireEvent.click(heart)
    expect(getPinnedLiveTvKeys()).toContain(key)
  })

  it('tillbaka går till guiden via skalets back()', async () => {
    const { onNavigate } = await mountA()
    fireEvent.click(screen.getByTestId('header-back'))
    expect(onNavigate).toHaveBeenCalledWith({ pageId: 'live-tv-browse', params: { view: 'guide' } })
  })

  it('dagchipsen finns: Idag är vit, passerade dagar dämpade, byte ropar dagväljaren', async () => {
    await mountA()
    const today = screen.getByTestId('chip-0')
    expect(today).toHaveTextContent('Today')
    expect(today).toHaveStyle({ background: '#f3f4f8', color: '#111' })
    expect(screen.getByTestId('chip--1')).toHaveTextContent('Yesterday')
    expect(screen.getByTestId('chip--1')).toHaveStyle({ opacity: '0.65' })
    expect(screen.getByTestId('chip--2')).toHaveStyle({ opacity: '0.65' })
    expect(screen.getByTestId('chip-1')).toHaveTextContent('Tomorrow')
    expect(screen.getByTestId('chip-1').style.opacity).toBe('')
    fireEvent.click(screen.getByTestId('chip-1'))
    expect(screen.getByTestId('chip-1')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('chip-0')).toHaveAttribute('aria-pressed', 'false')
  })

  it('kanalraden visar nr · grupp · kvalitet och ingen repristext utan arkiv', async () => {
    await mountA()
    const row = screen.getByTestId('channel-row')
    expect(row).toHaveTextContent('1 · Sport')
    expect(row).not.toHaveTextContent('Replay available')
  })

  it('kanalraden öppnar kanalinfo-arket även utan tablå (låsning och multivy nås därifrån)', async () => {
    await mountA()
    fireEvent.click(screen.getByTestId('channel-row'))
    const sheet = screen.getByTestId('channel-info-sheet')
    expect(sheet).toHaveTextContent('Quality')
    expect(sheet).toHaveTextContent('Source')
    expect(sheet).toHaveTextContent('Xtream')
    expect(sheet).toHaveTextContent('Replay')
    expect(sheet).toHaveTextContent('None')
    expect(within(sheet).getByText('Add to multiview')).toBeInTheDocument()
    // Ingen PIN på profilen → ingen låsrad.
    expect(within(sheet).queryByText('Lock with PIN')).toBeNull()
  })

  it('scrollytan har sidluft 16 px, bottenluft för flikraden och inga fjärrkontrollsord', async () => {
    await mountA()
    const root = screen.getByTestId('channel-phone')
    expect(root).toHaveStyle({ paddingBottom: '96px', paddingLeft: '16px', paddingRight: '16px', overflowY: 'auto' })
    expect(root.textContent).not.toMatch(/\bOK\b/)
  })
})

describe('Kanaldetalj på telefon — med tablå', () => {
  it('pågående rad har LIVE-tagg, yta, fet titel och förlopp; passerad rad är dämpad med Repris; kommande har klocka', async () => {
    await mountEspn()
    const nowRow = rowOf('GameDay')
    expect(nowRow).toHaveAttribute('data-kind', 'now')
    expect(within(nowRow).getByText('LIVE')).toBeInTheDocument()
    expect(nowRow).toHaveStyle({ background: 'rgba(252,252,255,0.06)', borderRadius: '12px' })
    expect(within(nowRow).getByText('GameDay')).toHaveStyle({ fontWeight: '600' })
    expect(within(nowRow).getByTestId('programme-progress')).toHaveStyle({ height: '4px' })

    const past = rowOf('Morning')
    expect(past).toHaveAttribute('data-kind', 'past')
    expect(past).toHaveStyle({ opacity: '0.6' })
    expect(within(past).getByText('Replay')).toBeInTheDocument()
    expect(within(past).queryByTestId('programme-progress')).toBeNull()

    const future = rowOf('Football')
    expect(future).toHaveAttribute('data-kind', 'future')
    expect(within(future).getByTestId('programme-bell')).toBeInTheDocument()
    expect(within(future).queryByText('LIVE')).toBeNull()
  })

  it('raden är minst 60 px (aldrig fast höjd), tiden 46 px tabular och titeln krymper på två rader', async () => {
    await mountEspn()
    const row = rowOf('GameDay')
    expect(row).toHaveStyle({ minHeight: '60px' })
    expect(row.style.height).toBe('')
    const time = within(row).getByTestId('programme-time')
    expect(time).toHaveStyle({ width: '46px', fontSize: '14px', fontVariantNumeric: 'tabular-nums', flexShrink: '0' })
    const title = within(row).getByText('GameDay')
    // `-webkit-line-clamp` går inte att läsa tillbaka via `toHaveStyle` i jsdom:
    // React sätter den (liksom `WebkitBoxOrient`/`display:-webkit-box`) med en
    // rak `style.WebkitLineClamp = …`-tilldelning, men jsdom:s CSSStyleDeclaration
    // saknar en IDL-accessor för den egenskapen — värdet försvinner tyst och når
    // aldrig cssText/getComputedStyle (verifierat separat mot flera jsdom-vägar:
    // rå `style[prop] =`, `toHaveStyle`s egen normalisering och `getComputedStyle`
    // ger samma resultat). `overflow: hidden` är den del av klippningen (`clamp2`
    // i `mobile-tokens.ts`) som FAKTISKT syns i DOM:en och går att verifiera.
    expect(title).toHaveStyle({ fontSize: '15px', overflow: 'hidden' })
    const stack = title.parentElement as HTMLElement
    expect(stack.style.flex).toContain('1')
    expect(stack.style.minWidth).toBe('0px')
  })

  it('primärknappen följer valt program: pågående är förvalt (Titta nu) och programme-param förväljer', async () => {
    await mountEspn()
    expect(screen.getByTestId('channel-primary')).toHaveTextContent('Watch now')
    fireEvent.click(screen.getByTestId('channel-primary'))
    expect(await screen.findByTestId('player')).toHaveTextContent('ESPN|http://x/ESPN')
  })

  it('programme-param förväljer raden så primärknappen blir Påminn mig', async () => {
    await mountEspn({ programme: String(now + H) })
    expect(screen.getByTestId('channel-primary')).toHaveTextContent('Remind me')
  })

  it('tryck på passerat program öppnar programarket: tid, beskrivning, Spela repris som spelar timeshift', async () => {
    await mountEspn()
    fireEvent.click(rowOf('Morning'))
    const sheet = screen.getByTestId('programme-sheet')
    expect(sheet).toHaveTextContent('Morning')
    expect(sheet).toHaveTextContent('–') // "hh:mm–hh:mm"
    expect(within(sheet).getByTestId('sheet-body')).toHaveTextContent('Old')
    const items = within(sheet).getAllByText(/Play replay|Channel info/)
    expect(items[0]).toHaveTextContent('Play replay')
    expect(items[1]).toHaveTextContent('Channel info')
    // Valet följer med till primärknappen bakom arket.
    expect(screen.getByTestId('channel-primary')).toHaveTextContent('Play replay')
    fireEvent.click(items[0])
    expect(screen.queryByTestId('programme-sheet')).toBeNull()
    expect(await screen.findByTestId('player')).toHaveTextContent('/timeshift/')
  })

  it('tryck på kommande program: arkets första post är Påminn mig och sätter påminnelsen', async () => {
    await mountEspn()
    fireEvent.click(rowOf('Football'))
    const sheet = screen.getByTestId('programme-sheet')
    const remind = within(sheet).getByText('Remind me')
    fireEvent.click(remind)
    expect(getReminders(now)).toHaveLength(1)
    expect(screen.getByTestId('channel-primary')).toHaveTextContent('Remove reminder')
    expect(within(rowOf('Football')).getByTestId('programme-bell').querySelector('svg')).toHaveAttribute('fill', 'currentColor')
  })

  it('Kanalinfo i programarket öppnar kanalinfo-arket med kvalitet, källa, reprisdagar och multivy', async () => {
    await mountEspn()
    fireEvent.click(rowOf('GameDay'))
    fireEvent.click(within(screen.getByTestId('programme-sheet')).getByText('Channel info'))
    expect(screen.queryByTestId('programme-sheet')).toBeNull()
    const info = screen.getByTestId('channel-info-sheet')
    const body = within(info).getByTestId('sheet-body')
    expect(body).toHaveTextContent('Quality')
    expect(body).toHaveTextContent('Source')
    expect(body).toHaveTextContent('Xtream')
    expect(body).toHaveTextContent('3 days')
    expect(within(info).getByText('Add to multiview')).toBeInTheDocument()
  })

  it('Bakåt (Escape) stänger programarket i stället för att lämna kanalen', async () => {
    const { onNavigate } = await mountEspn()
    fireEvent.click(rowOf('GameDay'))
    expect(screen.getByTestId('programme-sheet')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByTestId('programme-sheet')).toBeNull()
    expect(onNavigate).not.toHaveBeenCalled()
    expect(screen.getByTestId('channel-phone')).toBeInTheDocument()
  })

  it('kanalraden visar reprisdagar för arkivkanaler', async () => {
    await mountEspn()
    expect(screen.getByTestId('channel-row')).toHaveTextContent('Replay available 3 days')
  })

  it('byte av dag rensar valet och tömmer listan för en dag utan tablå', async () => {
    await mountEspn()
    fireEvent.click(rowOf('Football'))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.getByTestId('channel-primary')).toHaveTextContent('Remind me')
    fireEvent.click(screen.getByTestId('chip-2'))
    expect(screen.queryAllByTestId('programme-row')).toHaveLength(0)
    expect(screen.getByTestId('channel-primary')).toHaveTextContent('Watch now')
  })
})

describe('Kanaldetalj på telefon — favoritfixturen', () => {
  it('pinnad kanal ritar hjärtat fyllt', async () => {
    await mountA({ pins: phonePins })
    expect(screen.getByTestId('channel-pin').querySelector('svg')).toHaveAttribute('fill', 'currentColor')
  })
})
