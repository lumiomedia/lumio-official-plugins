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

export type Status = 'resolving' | 'playing' | 'nosignal' | 'rest' | 'empty'

export interface Request { channelId: string; mode: PlayMode; at: number | null; seq: number }

export interface Plan {
  seq: number
  slot: ProgrammeSlot<PoolItem>
  initialTime: number
  /** Väggklocka då visningen ska gå vidare till nästa program. */
  deadline: number
  mode: PlayMode
}

export interface Shown extends Plan { playable: Playable }

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
  tried: { key: string; urls: string[] } | null
  /** Ingen version fungerade: programmet och när kanalen försöker igen (nästa programgräns). */
  noSignal: { slot: ProgrammeSlot<PoolItem>; retryAt: number } | null
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
  | { type: 'failed'; seq: number; now: number; url?: string }
  | { type: 'rest'; seq: number; rest: RestSlot }
  | { type: 'empty'; seq: number }
  | { type: 'advance'; seq: number; now: number }
  | { type: 'firstPlay'; seq: number }

export function initialPlayerState(channelId: string, mode: PlayMode): PlayerState {
  return {
    request: { channelId, mode, at: null, seq: 0 },
    status: 'resolving', onScreen: null, pending: null, rest: null, tried: null, noSignal: null,
  }
}

/** Efter gränsen: live från nu. Före (strömmen tog slut tidigt): nästa program vid gränsen. */
export function afterSlot(slot: { stop: number }, now: number): number | null {
  return now >= slot.stop ? null : slot.stop + 1000
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
      // Manuellt byte: nya försök, ingen gammal felvy.
      return { ...s, request: next(s, { channelId: a.channelId, mode: a.mode, at: null }), pending: null, status: 'resolving', tried: null, noSignal: null }
    case 'planned':
      if (a.plan.seq !== s.request.seq) return s
      return { ...s, pending: a.plan, status: 'resolving', rest: null, noSignal: null }
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
      if (a.url && urls.length < MAX_VERSIONS) {
        // Samma program, nästa version, på liveläget (eller från början om det var valt).
        return { ...s, tried: { key, urls }, pending: null, status: 'resolving', request: next(s, { mode: plan.mode, at: null }) }
      }
      return {
        ...s, status: 'nosignal', onScreen: null, pending: null, tried: { key, urls },
        noSignal: { slot: plan.slot, retryAt: plan.slot.stop },
      }
    }
    case 'rest':
      if (a.seq !== s.request.seq) return s
      return { ...s, status: 'rest', rest: a.rest, onScreen: null, pending: null, noSignal: null }
    case 'empty':
      if (a.seq !== s.request.seq) return s
      return { ...s, status: 'empty', rest: null, onScreen: null, pending: null, noSignal: null }
    case 'advance': {
      // Timer och onPlaybackEnded kan komma samma tick: bara den första som
      // gäller den visade begäran räknas.
      if (a.seq !== s.request.seq || !s.onScreen || s.onScreen.seq !== a.seq) return s
      return { ...s, pending: null, status: 'resolving', tried: null, request: next(s, { mode: 'live', at: afterSlot(s.onScreen.slot, a.now) }) }
    }
    case 'firstPlay':
      return s
  }
}
