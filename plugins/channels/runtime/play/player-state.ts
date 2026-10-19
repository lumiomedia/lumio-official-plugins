/**
 * Kanalspelarens tillståndsmaskin, ren och testbar.
 *
 * Varje start (kanalbyte, Från början, programbyte, felhopp) är en BEGÄRAN
 * med löpnummer. Planering och resolve-svar bär begärans nummer och tappas
 * om en nyare begäran hunnit före. Det som visas (`onScreen`) ligger kvar
 * medan nästa ström slås upp och byts först när den är klar, så spelaren
 * inte rivs och helskärmen inte tappas vid varje byte.
 */
import type { PoolItem } from '../data/pool'
import type { ProgrammeSlot, RestSlot } from '../model/schedule'
import type { Playable } from './resolve'
import type { PlayMode } from './player-logic'

export type Status = 'resolving' | 'playing' | 'nosignal' | 'between' | 'rest' | 'empty'

export interface Request { channelId: string; mode: PlayMode; seq: number }

export interface Plan {
  seq: number
  slot: ProgrammeSlot<PoolItem>
  initialTime: number
  /** Väggklocka då visningen ska gå vidare till nästa program. */
  deadline: number
  mode: PlayMode
}

export interface Shown extends Plan { playable: Playable }

/** Så nära startpositionen räknas värdens position som "framme" (sekunder). */
export const POSITION_SLACK_S = 20
/** onFirstPlay senare än så efter monteringen kan vara värdens 5 s-reserv utan bild. */
export const TRUSTED_FIRST_PLAY_MS = 4800

/** Högst så många versioner av samma program provas innan "Ingen signal". */
export const MAX_VERSIONS = 3

/** Ett program i tablån: samma post på samma sändningsplats. */
export const slotKey = (slot: { item: { ref: string }; start: number }): string => `${slot.item.ref}@${slot.start}`

export interface PlayerState {
  request: Request
  status: Status
  /** Det som spelas just nu; ligger kvar under nästa uppslag. */
  onScreen: Shown | null
  /** Planerat men ännu inte uppslaget. */
  pending: Plan | null
  rest: RestSlot | null
  /** Adresser som redan fallerat för programmet `key` (nästa version frågas förbi dem). */
  /**
   * `pastEnd`: en version tog slut före liveläget (filen kortare än tablåns
   * plats). Då provas högst EN annan version; sedan "Programmet är slut".
   */
  /** `again`: samma version har redan öppnats om en gång efter ett avbrott. */
  tried: { key: string; urls: string[]; pastEnd?: boolean; again?: boolean } | null
  /** Ingen version fungerade: programmet och när kanalen försöker igen (nästa programgräns). */
  noSignal: { slot: ProgrammeSlot<PoolItem>; retryAt: number } | null
  /**
   * Källan tog slut före programgränsen (filen kortare än tablåns längd):
   * kanalen väntar på gränsen i stället för att starta nästa program i förväg.
   */
  between: { slot: ProgrammeSlot<PoolItem>; until: number } | null
  /** Den visning (seq) vars första bild syns. Inställningskortet ligger kvar tills dess. */
  framedSeq: number | null
  /**
   * onFirstPlay kom men kan vara värdens 5 s-reserv (mpv söker fortfarande
   * fram till livepositionen): bilden räknas först när positionen bekräftar.
   */
  firstPlaySeq: number | null
}

export type Action =
  | { type: 'goto'; channelId: string; mode: PlayMode }
  | { type: 'planned'; plan: Plan }
  | { type: 'resolved'; seq: number; playable: Playable }
  /**
   * `url`: den versionen spelades och fallerade (laddfel, tidigt filslut) —
   * nästa version provas på liveläget. Utan: uppslaget hittade ingen (fler)
   * version — "Ingen signal" till nästa programgräns.
   */
  | { type: 'failed'; seq: number; now: number; url?: string; pastEnd?: boolean }
  | { type: 'rest'; seq: number; rest: RestSlot }
  | { type: 'empty'; seq: number }
  | { type: 'advance'; seq: number; now: number }
  /** `trusted`: kom så tidigt att värdens startvakt verkligen såg bild på rätt ställe. */
  | { type: 'firstPlay'; seq: number; trusted?: boolean }
  /** Värdens position för visningen (onTimeUpdate). */
  | { type: 'progress'; seq: number; position: number }
  /** Reserv: visa ändå (positionen bekräftade aldrig). */
  | { type: 'reveal'; seq: number }
  /**
   * Strömmen dog efter att ha spelat (tidigt filslut, hopp till början): samma
   * version öppnas om EN gång på `initialTime` (liveläget nu) — utan nytt
   * uppslag. Andra gången räknas den som fallerad (nästa version).
   */
  | { type: 'retrySame'; seq: number; initialTime: number; now: number }

export function initialPlayerState(channelId: string, mode: PlayMode): PlayerState {
  return {
    request: { channelId, mode, seq: 0 },
    status: 'resolving', onScreen: null, pending: null, rest: null, tried: null, noSignal: null, between: null, framedSeq: null, firstPlaySeq: null,
  }
}

/**
 * Väntar spelaren på en bild för den aktuella begäran? Då täcker
 * inställningskortet allt (uppslag, och den nya spelarens tomma ruta före
 * första bilden).
 */
export function awaitingPicture(s: PlayerState): boolean {
  if (s.status === 'resolving') return true
  return s.status === 'playing' && !!s.onScreen && s.framedSeq !== s.onScreen.seq
}

/**
 * Poolen räknades om (fler källor svarade, sparad pool byttes mot ny) under
 * samma begäran. Det som spelas eller slås upp för begäran rörs aldrig — ett
 * byte mitt i programmet var "en annan film startar" och fladdret i
 * kanallistan. Nya tablån gäller från nästa programgräns. Bara en kanal som
 * visar tomt eller vila planeras om direkt.
 */
export function replanOnNewRundown(s: PlayerState): boolean {
  return s.status === 'empty' || s.status === 'rest'
}

/** Redan provade adresser för det här programmet (tom lista för ett annat program). */
export function triedFor(s: PlayerState, slot: { item: { ref: string }; start: number }): string[] {
  return s.tried && s.tried.key === slotKey(slot) ? s.tried.urls : []
}

/** Den plan (visad eller på väg) som begäran `seq` gäller. */
const planFor = (s: PlayerState, seq: number): Plan | null =>
  s.pending?.seq === seq ? s.pending : s.onScreen?.seq === seq ? s.onScreen : null

const next = (s: PlayerState, patch: Partial<Request>): Request => ({ ...s.request, ...patch, seq: s.request.seq + 1 })

/**
 * Felpolicyn (Jerry 2026-10-14: "då är det inte live"): ett program som
 * fallerar hoppas aldrig över mitt i sin plats. Först nästa VERSION av samma
 * program på liveläget (högst MAX_VERSIONS); fungerar ingen visas "Ingen
 * signal" och kanalen försöker igen live vid nästa programgräns.
 */
export function playerReducer(s: PlayerState, a: Action): PlayerState {
  switch (a.type) {
    case 'goto':
      // Manuellt byte: nya försök, ingen gammal felvy. Den gamla kanalens
      // spelare rivs direkt — annars hördes dess ljud under hela uppslaget
      // (strömuppslag 1–10 s, 2026-10-18). Inställningskortet täcker bytet.
      return { ...s, request: next(s, { channelId: a.channelId, mode: a.mode }), onScreen: null, pending: null, status: 'resolving', tried: null, noSignal: null, between: null }
    case 'planned':
      if (a.plan.seq !== s.request.seq) return s
      return { ...s, pending: a.plan, status: 'resolving', rest: null, noSignal: null, between: null }
    case 'resolved': {
      if (a.seq !== s.request.seq || !s.pending || s.pending.seq !== a.seq) return s
      return { ...s, onScreen: { ...s.pending, playable: a.playable }, pending: null, status: 'playing' }
    }
    case 'failed': {
      if (a.seq !== s.request.seq) return s
      const plan = planFor(s, a.seq)
      if (!plan) return s
      const key = slotKey(plan.slot)
      const urls = a.url ? [...triedFor(s, plan.slot), a.url] : triedFor(s, plan.slot)
      const pastEndBefore = !!s.tried && s.tried.key === key && !!s.tried.pastEnd
      // Filen kortare än platsen (liveläget efter filens slut): en annan
      // version provas en gång. Ingen annan, eller även den bar inte: programmet
      // är slut — aldrig "Ingen signal", och samma fil öppnas aldrig igen.
      if (pastEndBefore || (a.pastEnd && !a.url)) {
        return { ...s, status: 'between', onScreen: null, pending: null, tried: { key, urls, pastEnd: true }, noSignal: null, between: { slot: plan.slot, until: plan.slot.stop } }
      }
      if (a.pastEnd && a.url) {
        return { ...s, tried: { key, urls, pastEnd: true }, pending: null, status: 'resolving', request: next(s, { mode: plan.mode }) }
      }
      if (a.url && urls.length < MAX_VERSIONS) {
        // Samma program, nästa version, på liveläget (eller från början om det var valt).
        return { ...s, tried: { key, urls }, pending: null, status: 'resolving', request: next(s, { mode: plan.mode }) }
      }
      return {
        ...s, status: 'nosignal', onScreen: null, pending: null, tried: { key, urls },
        noSignal: { slot: plan.slot, retryAt: plan.slot.stop },
      }
    }
    case 'rest':
      if (a.seq !== s.request.seq) return s
      return { ...s, status: 'rest', rest: a.rest, onScreen: null, pending: null, noSignal: null, between: null }
    case 'empty':
      if (a.seq !== s.request.seq) return s
      return { ...s, status: 'empty', rest: null, onScreen: null, pending: null, noSignal: null, between: null }
    case 'advance': {
      // Timer och onPlaybackEnded kan komma samma tick: bara den första som
      // gäller den visade begäran räknas.
      if (a.seq !== s.request.seq || !s.onScreen || s.onScreen.seq !== a.seq) return s
      const slot = s.onScreen.slot
      // Före gränsen (källan kortare än tablån): nästa program startas INTE i
      // förväg från början — då är kanalen inte live längre. Vänta på gränsen.
      if (a.now < slot.stop) {
        return { ...s, status: 'between', onScreen: null, pending: null, tried: null, between: { slot, until: slot.stop } }
      }
      return { ...s, pending: null, status: 'resolving', tried: null, request: next(s, { mode: 'live' }) }
    }
    case 'firstPlay':
      if (!s.onScreen || s.onScreen.seq !== a.seq || s.framedSeq === a.seq) return s
      if (a.trusted === false) return s.firstPlaySeq === a.seq ? s : { ...s, firstPlaySeq: a.seq }
      return { ...s, framedSeq: a.seq }
    case 'progress':
      if (!s.onScreen || s.onScreen.seq !== a.seq || s.framedSeq === a.seq || s.firstPlaySeq !== a.seq) return s
      return Math.abs(a.position - s.onScreen.initialTime) <= POSITION_SLACK_S ? { ...s, framedSeq: a.seq } : s
    case 'retrySame': {
      if (a.seq !== s.request.seq || !s.onScreen || s.onScreen.seq !== a.seq) return s
      const shown = s.onScreen
      const key = slotKey(shown.slot)
      const urls = triedFor(s, shown.slot)
      if (s.tried && s.tried.key === key && s.tried.again) {
        return playerReducer(s, { type: 'failed', seq: a.seq, now: a.now, url: shown.playable.url })
      }
      const request = next(s, { mode: shown.mode })
      return {
        ...s, request, status: 'playing', pending: null, noSignal: null, between: null,
        tried: { key, urls, again: true },
        onScreen: { ...shown, seq: request.seq, initialTime: a.initialTime },
      }
    }
    case 'reveal':
      if (!s.onScreen || s.onScreen.seq !== a.seq || s.framedSeq === a.seq) return s
      return { ...s, framedSeq: a.seq }
  }
}
