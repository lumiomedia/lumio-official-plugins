import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { localDayKey } from '../sport-epg'
import { writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from '../../live-tv-data'
import { SPORT_SETTINGS_KEY, getFollows, getSportSettings } from '../sport-store'
import { getReminders } from '../../reminders'
import { HOUR, MIN, fxMatch, fxSource, mountSport } from '../__sport-fixture'
import { mountPhone } from '../../tv/mobile/__phone-mount'

vi.mock('../../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string } }) => <div data-testid="player">{channel.name}</div> }))

const now = Date.now()
const today = localDayKey(now)
const live = fxMatch({ id: 'live', home: 'GAIS', away: 'Sirius', start: now - 30 * MIN, stop: now + 90 * MIN })
const later = fxMatch({ id: 'later', home: 'AIK', away: 'Hammarby', start: now + 2 * HOUR })
const REMOTE_WORDS = /\bOK\b|håll OK|hold OK|◂|▸/
const hammarby = { sport: 'football' as const, kind: 'team' as const, key: 'hammarby', name: 'Hammarby' }

describe('Sport på telefon: rubriken och sektionsarket', () => {
  it('"LIVE TV" + "Sport ▾"; arket har Kanaler, Guide, Sport, Favoriter, Multiview och byter sektion', async () => {
    const { onNavigate } = mountSport({}, { phone: true, days: { [today]: [later] } })
    const title = await screen.findByTestId('sport-phone-title')
    expect(title).toHaveTextContent(/Live TV\s*Sport/i)
    fireEvent.click(title)
    const sheet = await screen.findByTestId('sport-phone-sections')
    expect(within(sheet).getAllByTestId(/^sport-phone-section-/).map((r) => r.textContent)).toEqual(['Channels', 'Guide', 'Sport', 'Favourites', 'Multiview'])
    expect(within(sheet).getByTestId('sport-phone-section-sport').getAttribute('aria-pressed')).toBe('true')
    // Sport (där vi står) stänger bara arket.
    fireEvent.click(within(sheet).getByTestId('sport-phone-section-sport'))
    expect(screen.queryByTestId('sport-phone-sections')).toBeNull()
    expect(onNavigate).not.toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('sport-phone-title'))
    fireEvent.click(within(await screen.findByTestId('sport-phone-sections')).getByTestId('sport-phone-section-guide'))
    expect(onNavigate).toHaveBeenCalledWith({ pageId: 'live-tv-browse', params: { view: 'guide' } })
  })
  it('inga egna bottenflikar: skalets flikrad är den enda', async () => {
    mountSport({}, { phone: true, days: { [today]: [later] } })
    await screen.findByTestId('sport-phone-title')
    expect(screen.getAllByRole('navigation')).toHaveLength(1)
    expect(screen.getByTestId('mobile-tab-bar')).toBeTruthy()
  })
  it('toppflikarna Översikt / Tabeller & resultat / Mina lag; Matchdag/Flöde bara på Översikt och sparas', async () => {
    mountSport({}, { phone: true, days: { [today]: [later] } })
    const tabs = await screen.findByTestId('sport-phone-tabs')
    expect(within(tabs).getAllByRole('tab').map((t) => t.textContent)).toEqual(['Overview', 'Tables & results', 'My teams'])
    fireEvent.click(screen.getByTestId('sport-phone-view-feed'))
    expect(getSportSettings().phoneView).toBe('feed')
    fireEvent.click(within(tabs).getByText('My teams'))
    expect(screen.queryByTestId('sport-phone-view')).toBeNull()
  })
})

describe('Översikt – startvy på telefon', () => {
  it('Matchdag när telefonen inte valt, även om skrivbordets delade val är Flöde; eget val bevaras', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, { view: 'feed' })
    mountSport({}, { phone: true, days: { [today]: [later] } })
    expect((await screen.findByTestId('sport-phone-view-matchday')).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByTestId('sport-phone-view-feed'))
    expect(getSportSettings()).toMatchObject({ phoneView: 'feed' })
    expect(screen.getByTestId('sport-phone-view-feed').getAttribute('aria-pressed')).toBe('true')
  })
})

describe('Översikt – Matchdag', () => {
  it('hero med delad Titta-knapp: källarket väljer källa, Titta spelar den', async () => {
    const two = fxMatch({ id: 'two', home: 'GAIS', away: 'Sirius', start: now - 30 * MIN, stop: now + 90 * MIN, sources: [fxSource('TV4 Fotboll FHD SE', { quality: 'FHD' }), fxSource('B', { quality: 'HD' })] })
    const { box } = mountSport({}, { phone: true, days: { [today]: [two, later] } })
    const hero = await screen.findByTestId('sport-phone-hero')
    expect(box.textContent).not.toMatch(REMOTE_WORDS)
    expect(within(hero).getByTestId('sport-phone-hero-watch')).toHaveTextContent('Watch· FHD · 2 sources')
    fireEvent.click(within(hero).getByTestId('sport-phone-hero-sources'))
    const sheet = await screen.findByTestId('sport-phone-source-sheet')
    const rows = within(sheet).getAllByTestId('sport-phone-source-row')
    expect(rows.map((r) => r.textContent)).toEqual(['TV4 Fotboll FHD SEPlaylist · bestFHD', 'BPlaylistHD'])
    fireEvent.click(rows[1]!)
    expect(screen.queryByTestId('sport-phone-source-sheet')).toBeNull()
    fireEvent.click(within(hero).getByTestId('sport-phone-hero-watch'))
    expect(await screen.findByTestId('player')).toHaveTextContent('B')
  })
  it('Live nu / Senare idag / Avslutade som kort; tryck öppnar matchinfon som bottenark; Titta spelar', async () => {
    const done = fxMatch({ id: 'done', home: 'Malmö', away: 'Sirius', start: now - 4 * HOUR, stop: now - 2 * HOUR })
    mountSport({}, { phone: true, days: { [today]: [later, live, done] }, follows: [hammarby] })
    await screen.findByTestId('sport-phone-section-live')
    expect(screen.getAllByTestId(/^sport-phone-section-(live|later|finished)$/).map((s) => s.firstElementChild?.textContent)).toEqual(['Live now1 matches', 'Later today1 matches', 'Finished1 matches'])
    const laterCard = within(screen.getByTestId('sport-phone-section-later')).getByTestId('sport-phone-card')
    // Följt lag: korallkant och det orange hjärtat (inte handoffens stjärna).
    expect(laterCard.getAttribute('data-followed')).toBe('1')
    expect(within(laterCard).getAllByTestId('phone-card-heart')).toHaveLength(1)
    fireEvent.click(within(screen.getByTestId('sport-phone-section-live')).getByTestId('sport-phone-card'))
    const drawer = await screen.findByTestId('match-center')
    expect(drawer.style.bottom).toBe('0px')
    expect(drawer.style.maxHeight).toBe('92%')
    expect(within(drawer).queryByTestId('mc-close')).toBeNull()
    fireEvent.click(within(drawer).getByTestId('mc-watch'))
    expect(await screen.findByTestId('player')).toHaveTextContent('TV4 Fotboll FHD SE')
  })
  it('tidslinjen visar bara matcher på dina kanaler och har en nu-linje', async () => {
    const noChannel = fxMatch({ id: 'nochan', home: 'Lazio', away: 'Roma', start: now + HOUR, sources: [], resultOnly: true })
    mountSport({}, { phone: true, days: { [today]: [live, later, noChannel] } })
    const tl = await screen.findByTestId('sport-phone-timeline')
    expect(tl.querySelectorAll('[data-testid^="sport-phone-block-"]')).toHaveLength(2)
    expect(within(tl).queryByTestId('sport-phone-block-nochan')).toBeNull()
    expect(within(tl).getByTestId('sport-phone-now')).toBeTruthy()
    fireEvent.click(within(tl).getByTestId('sport-phone-block-later'))
    expect(await screen.findByTestId('match-center')).toBeTruthy()
  })
})

describe('Översikt – Flöde', () => {
  it('Dina lag, Just nu och Kvällsplan; bocken sätter en påminnelse', async () => {
    mountSport({}, { phone: true, days: { [today]: [live, later] }, follows: [hammarby] })
    fireEvent.click(await screen.findByTestId('sport-phone-view-feed'))
    const teams = await screen.findByTestId('sport-phone-teams')
    expect(within(teams).getAllByTestId('sport-phone-team')[0]!.getAttribute('data-ring')).toBe('today')
    expect(within(screen.getByTestId('sport-phone-now-list')).getAllByTestId('sport-phone-now-row')).toHaveLength(1)
    const check = within(screen.getByTestId('sport-phone-plan')).getByTestId('sport-phone-plan-check')
    fireEvent.click(check)
    await waitFor(() => expect(getReminders(now)).toHaveLength(1))
    await waitFor(() => expect(screen.getByTestId('sport-phone-plan-sum')).toHaveTextContent('1 chosen'))
    expect(screen.queryByTestId('match-center')).toBeNull() // bocken öppnar inte matchen
    fireEvent.click(within(teams).getByTestId('sport-phone-teams-add'))
    expect(await screen.findByTestId('sport-follows-meta')).toBeTruthy()
  })
})

describe('Mina lag', () => {
  it('nästa match, klockan per lag (Av → 15 min → Avspark) och hjärtat; Lägg till lag öppnar arket', async () => {
    mountSport({}, { phone: true, days: { [today]: [later] }, follows: [hammarby] })
    fireEvent.click(await screen.findByText('My teams'))
    await waitFor(() => expect(screen.getByTestId('sport-phone-follow')).toHaveTextContent(/Hammarby.*Today \d\d:\d\d · vs AIK/))
    const bell = screen.getByTestId('sport-phone-follow-bell')
    expect(bell.getAttribute('data-alert')).toBe('15') // den allmänna klockan
    fireEvent.click(bell)
    await waitFor(() => expect(getFollows()[0]!.alert).toBe('kickoff'))
    expect(screen.queryByTestId('match-center')).toBeNull()
    const heart = screen.getByTestId('sport-phone-follow-heart')
    expect(heart.querySelector('svg path')?.getAttribute('d')).toMatch(/^M12 21s/)
    fireEvent.click(screen.getByTestId('sport-phone-follow-add-football'))
    const sheet = await screen.findByTestId('sport-phone-follow-sheet')
    fireEvent.click(within(sheet).getByTestId('sport-phone-candidate-aik'))
    await waitFor(() => expect(getFollows().map((f) => f.key)).toContain('aik'))
  })
  it('Tabeller & resultat visar nyckelkortet utan nyckel; dagstegaren står kvar', async () => {
    mountSport({}, { phone: true, days: { [today]: [later] } })
    fireEvent.click(await screen.findByText('Tables & results'))
    expect(await screen.findByTestId('sport-key-card-tab')).toBeTruthy()
    expect(screen.getByTestId('sport-day-label')).toHaveTextContent('Today')
  })
  it('Sport är en flik i flikraden och Favoriter ligger i Mer-arket', async () => {
    const { onNavigate } = mountPhone({ view: 'hub' })
    fireEvent.click(screen.getByTestId('tab-more'))
    fireEvent.click(within(await screen.findByRole('dialog')).getByText('Favourites'))
    expect(onNavigate).toHaveBeenCalledWith({ pageId: 'live-tv-browse', params: { view: 'favs' } })
  })
})

describe('Sport på telefon: repriser', () => {
  const replay = fxMatch({ id: 'rp', home: 'Mjällby AIF', away: 'Degerfors IF', start: now - 30 * MIN, stop: now + HOUR, rerun: true })
  it('egen grupp sist med neutral REPRIS-tagg, inte i Live nu; en dag med bara repriser är inte tom', async () => {
    mountSport({}, { phone: true, days: { [today]: [live, replay] } })
    const group = await screen.findByTestId('sport-phone-replays')
    expect(within(group).getByTestId('sport-phone-replay-tag')).toHaveTextContent('Replay')
    expect(within(group).getByTestId('sport-phone-replay-row')).toHaveTextContent('Mjällby AIF - Degerfors IF')
    expect(within(group).getByTestId('sport-phone-replay-row')).not.toHaveTextContent(/LIVE/)
    expect(within(screen.getByTestId('sport-phone-section-live')).queryByText(/Mjällby/)).toBeNull()
    const body = screen.getByTestId('sport-phone-body')
    expect(body.lastElementChild).toBe(group)
  })
  it('bara repriser: ingen tom-text, gruppen syns', async () => {
    mountSport({}, { phone: true, days: { [today]: [replay] } })
    expect(await screen.findByTestId('sport-phone-replays')).toBeInTheDocument()
    expect(screen.queryByTestId('sport-phone-notice')).toBeNull()
  })
})
