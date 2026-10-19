import { describe, expect, it } from 'vitest'
import { awaitingPicture, initialPlayerState, playerReducer, replanOnNewRundown, triedFor, type Plan, type PlayerState } from './player-state'

const slot = (ref: string, stop: number) => ({ kind: 'programme', item: { ref }, start: 0, stop } as never)
const plan = (seq: number, ref = 'a', stop = 100_000): Plan => ({ seq, slot: slot(ref, stop), initialTime: 0, deadline: stop, mode: 'live' })
const playing = (): PlayerState => {
  let s = initialPlayerState('c1', 'live')
  s = playerReducer(s, { type: 'planned', plan: plan(0) })
  return playerReducer(s, { type: 'resolved', seq: 0, playable: { url: 'u1' } })
}

describe('spelarens tillstånd', () => {
  it('det visade ligger kvar medan nästa slås upp', () => {
    let s = playerReducer(playing(), { type: 'advance', seq: 0, now: 100_500 })
    s = playerReducer(s, { type: 'planned', plan: plan(1, 'b', 200_000) })
    expect(s.status).toBe('resolving')
    expect(s.onScreen?.playable.url).toBe('u1')
    s = playerReducer(s, { type: 'resolved', seq: 1, playable: { url: 'u2' } })
    expect(s.onScreen?.playable.url).toBe('u2')
    expect(s.status).toBe('playing')
  })

  it('dubbelt programbyte samma tick blir ett', () => {
    let s = playerReducer(playing(), { type: 'advance', seq: 0, now: 100_500 })
    s = playerReducer(s, { type: 'advance', seq: 0, now: 100_500 })
    expect(s.request.seq).toBe(1)
  })

  it('källan slut före gränsen: inget nästa program från början i förväg — vänta på gränsen', () => {
    const early = playerReducer(playing(), { type: 'advance', seq: 0, now: 50_000 })
    expect(early.status).toBe('between')
    expect(early.between?.until).toBe(100_000)
    expect(early.onScreen).toBeNull()
    // Ingen ny begäran: inget uppslag, ingen film från 0.
    expect(early.request.seq).toBe(0)
    const atBoundary = playerReducer(playing(), { type: 'advance', seq: 0, now: 100_000 })
    expect(atBoundary.status).toBe('resolving')
    expect(atBoundary.request).toMatchObject({ seq: 1, mode: 'live' })
    // Ett kanalbyte lämnar väntan.
    expect(playerReducer(early, { type: 'goto', channelId: 'c2', mode: 'live' }).between).toBeNull()
  })

  it('strömmen dog efter start: samma version öppnas om en gång på liveläget, utan uppslag', () => {
    let s = playerReducer(playing(), { type: 'firstPlay', seq: 0 })
    s = playerReducer(s, { type: 'retrySame', seq: 0, initialTime: 42, now: 50_000 })
    expect(s.status).toBe('playing')
    expect(s.request.seq).toBe(1)
    expect(s.onScreen).toMatchObject({ seq: 1, initialTime: 42, playable: { url: 'u1' } })
    expect(s.tried?.urls).toEqual([])
    expect(awaitingPicture(s)).toBe(true)
    // Andra avbrottet: versionen räknas som fallerad — nästa version live.
    s = playerReducer(s, { type: 'retrySame', seq: 1, initialTime: 60, now: 60_000 })
    expect(s.status).toBe('resolving')
    expect(s.request.seq).toBe(2)
    expect(s.tried?.urls).toEqual(['u1'])
    // En gammal visnings avbrott rör inget.
    expect(playerReducer(s, { type: 'retrySame', seq: 1, initialTime: 1, now: 1 })).toBe(s)
  })

  it('en fallerad version: nästa version av SAMMA program live, inget hopp till nästa program', () => {
    const s = playerReducer(playing(), { type: 'failed', seq: 0, now: 50_000, url: 'u1' })
    expect(s.status).toBe('resolving')
    expect(s.request).toMatchObject({ seq: 1, mode: 'live' })
    expect(s.tried?.urls).toEqual(['u1'])
    expect(triedFor(s, plan(1).slot)).toEqual(['u1'])
    // Ett annat program har inga provade adresser.
    expect(triedFor(s, plan(1, 'b').slot)).toEqual([])
  })

  it('högst tre versioner, sedan Ingen signal till programgränsen', () => {
    let s = playing()
    s = playerReducer(s, { type: 'failed', seq: 0, now: 50_000, url: 'u1' })
    s = playerReducer(s, { type: 'planned', plan: plan(1) })
    s = playerReducer(s, { type: 'resolved', seq: 1, playable: { url: 'u2' } })
    s = playerReducer(s, { type: 'failed', seq: 1, now: 51_000, url: 'u2' })
    s = playerReducer(s, { type: 'planned', plan: plan(2) })
    s = playerReducer(s, { type: 'resolved', seq: 2, playable: { url: 'u3' } })
    s = playerReducer(s, { type: 'failed', seq: 2, now: 52_000, url: 'u3' })
    expect(s.status).toBe('nosignal')
    expect(s.onScreen).toBeNull()
    expect(s.noSignal?.retryAt).toBe(100_000)
    expect(s.request.seq).toBe(2)
  })

  it('ingen (fler) version att hitta: Ingen signal direkt', () => {
    let s = initialPlayerState('c1', 'live')
    s = playerReducer(s, { type: 'planned', plan: plan(0) })
    s = playerReducer(s, { type: 'failed', seq: 0, now: 10_000 })
    expect(s.status).toBe('nosignal')
    expect(s.noSignal?.slot.item.ref).toBe('a')
  })

  it('gamla svar ignoreras; kanalbyte och programbyte nollar försöken', () => {
    let s = playerReducer(playing(), { type: 'failed', seq: 0, now: 50_000, url: 'u1' })
    s = playerReducer(s, { type: 'resolved', seq: 0, playable: { url: 'gammal' } })
    expect(s.onScreen?.playable.url).toBe('u1')
    const switched = playerReducer(s, { type: 'goto', channelId: 'c2', mode: 'live' })
    expect(switched.tried).toBeNull()
    // Den gamla kanalen tystnar direkt: ingen spelare under uppslaget.
    expect(switched.onScreen).toBeNull()
    expect(switched.request).toMatchObject({ channelId: 'c2', seq: 2 })
    const advanced = playerReducer(playing(), { type: 'advance', seq: 0, now: 100_500 })
    expect(advanced.tried).toBeNull()
  })

  it('inställningskortet: uppslag och ny visning utan bild väntar, första bilden släpper', () => {
    let s = initialPlayerState('c1', 'live')
    expect(awaitingPicture(s)).toBe(true)
    s = playerReducer(s, { type: 'planned', plan: plan(0) })
    s = playerReducer(s, { type: 'resolved', seq: 0, playable: { url: 'u1' } })
    expect(s.status).toBe('playing')
    expect(awaitingPicture(s)).toBe(true)
    s = playerReducer(s, { type: 'firstPlay', seq: 0 })
    expect(awaitingPicture(s)).toBe(false)
    // Kanalbyte: kortet direkt, och kvar tills den nya visningen har bild.
    s = playerReducer(s, { type: 'goto', channelId: 'c2', mode: 'live' })
    expect(awaitingPicture(s)).toBe(true)
    s = playerReducer(s, { type: 'planned', plan: plan(1, 'b') })
    // En sen firstPlay från den gamla visningen släpper inte kortet.
    s = playerReducer(s, { type: 'resolved', seq: 1, playable: { url: 'u2' } })
    s = playerReducer(s, { type: 'firstPlay', seq: 0 })
    expect(awaitingPicture(s)).toBe(true)
    s = playerReducer(s, { type: 'firstPlay', seq: 1 })
    expect(awaitingPicture(s)).toBe(false)
  })

  it('ny rundown under samma begäran byter aldrig det som spelas eller slås upp', () => {
    const s = playing()
    expect(replanOnNewRundown(s)).toBe(false)
    expect(replanOnNewRundown(playerReducer(initialPlayerState('c1', 'live'), { type: 'planned', plan: plan(0) }))).toBe(false)
    expect(replanOnNewRundown(playerReducer(s, { type: 'failed', seq: 0, now: 1 }))).toBe(false)
    expect(replanOnNewRundown(playerReducer(initialPlayerState('c1', 'live'), { type: 'empty', seq: 0 }))).toBe(true)
  })

  it('sen onFirstPlay (värdens 5 s-reserv) släpper inte kortet förrän positionen är framme', () => {
    let s = initialPlayerState('c1', 'live')
    s = playerReducer(s, { type: 'planned', plan: { ...plan(0), initialTime: 600 } })
    s = playerReducer(s, { type: 'resolved', seq: 0, playable: { url: 'u1' } })
    s = playerReducer(s, { type: 'firstPlay', seq: 0, trusted: false })
    expect(awaitingPicture(s)).toBe(true)
    // mpv söker fortfarande: positionen står på 0.
    s = playerReducer(s, { type: 'progress', seq: 0, position: 0 })
    expect(awaitingPicture(s)).toBe(true)
    s = playerReducer(s, { type: 'progress', seq: 0, position: 601 })
    expect(awaitingPicture(s)).toBe(false)
    // Reserven: visa ändå.
    let r = initialPlayerState('c1', 'live')
    r = playerReducer(r, { type: 'planned', plan: plan(0) })
    r = playerReducer(r, { type: 'resolved', seq: 0, playable: { url: 'u1' } })
    r = playerReducer(r, { type: 'firstPlay', seq: 0, trusted: false })
    r = playerReducer(r, { type: 'reveal', seq: 0 })
    expect(awaitingPicture(r)).toBe(false)
  })

  describe('filen kortare än platsen (liveläget efter filens slut)', () => {
    it('en annan version provas en gång; ingen annan = Programmet är slut, aldrig Ingen signal', () => {
      let s = playerReducer(playing(), { type: 'failed', seq: 0, now: 50_000, url: 'u1', pastEnd: true })
      expect(s.status).toBe('resolving')
      expect(s.request.seq).toBe(1)
      expect(triedFor(s, plan(1).slot)).toEqual(['u1'])
      s = playerReducer(s, { type: 'planned', plan: plan(1) })
      // Värden hade ingen annan version (exclude u1): slut, inte Ingen signal.
      s = playerReducer(s, { type: 'failed', seq: 1, now: 51_000 })
      expect(s.status).toBe('between')
      expect(s.between?.until).toBe(100_000)
      expect(s.noSignal).toBeNull()
      expect(s.request.seq).toBe(1)
    })

    it('även den andra versionen för kort: slut, ingen tredje', () => {
      let s = playerReducer(playing(), { type: 'failed', seq: 0, now: 50_000, url: 'u1', pastEnd: true })
      s = playerReducer(s, { type: 'planned', plan: plan(1) })
      s = playerReducer(s, { type: 'resolved', seq: 1, playable: { url: 'u2' } })
      s = playerReducer(s, { type: 'failed', seq: 1, now: 51_000, url: 'u2', pastEnd: true })
      expect(s.status).toBe('between')
      expect(s.request.seq).toBe(1)
      expect(s.onScreen).toBeNull()
    })

    it('den andra versionen faller på annat sätt: också slut (bara EN extra version)', () => {
      let s = playerReducer(playing(), { type: 'failed', seq: 0, now: 50_000, url: 'u1', pastEnd: true })
      s = playerReducer(s, { type: 'planned', plan: plan(1) })
      s = playerReducer(s, { type: 'resolved', seq: 1, playable: { url: 'u2' } })
      s = playerReducer(s, { type: 'failed', seq: 1, now: 51_000, url: 'u2' })
      expect(s.status).toBe('between')
    })

    it('kanalbyte nollställer: nästa gång provas versionerna på nytt', () => {
      let s = playerReducer(playing(), { type: 'failed', seq: 0, now: 50_000, url: 'u1', pastEnd: true })
      s = playerReducer(s, { type: 'goto', channelId: 'c1', mode: 'live' })
      expect(s.tried).toBeNull()
    })
  })
})
