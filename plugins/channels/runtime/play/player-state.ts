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

export type Status = 'resolving' | 'playing' | 'error' | 'rest' | 'empty'

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

export interface PlayerState {
  request: Request
  status: Status
  /** Det som spelas just nu; ligger kvar under nästa uppslag. */
  onScreen: Shown | null
  /** Planerat men ännu inte uppslaget. */
  pending: Plan | null
  rest: RestSlot | null
  notice: 'skipping' | null
  failedOnce: boolean
}

export type Action =
  | { type: 'goto'; channelId: string; mode: PlayMode }
  | { type: 'planned'; plan: Plan }
  | { type: 'resolved'; seq: number; playable: Playable }
  | { type: 'failed'; seq: number; now: number }
  | { type: 'rest'; seq: number; rest: RestSlot }
  | { type: 'empty'; seq: number }
  | { type: 'advance'; seq: number; now: number }
  | { type: 'firstPlay'; seq: number }

export function initialPlayerState(channelId: string, mode: PlayMode): PlayerState {
  return {
    request: { channelId, mode, at: null, seq: 0 },
    status: 'resolving', onScreen: null, pending: null, rest: null, notice: null, failedOnce: false,
  }
}

/** Efter gränsen: live från nu. Före (strömmen tog slut tidigt, eller fel): nästa program vid gränsen. */
export function afterSlot(slot: { stop: number }, now: number): number | null {
  return now >= slot.stop ? null : slot.stop + 1000
}

/** Den plan (visad eller på väg) som begäran `seq` gäller. */
const planFor = (s: PlayerState, seq: number): Plan | null =>
  s.pending?.seq === seq ? s.pending : s.onScreen?.seq === seq ? s.onScreen : null

const next = (s: PlayerState, patch: Partial<Request>): Request => ({ ...s.request, ...patch, seq: s.request.seq + 1 })

export function playerReducer(s: PlayerState, a: Action): PlayerState {
  switch (a.type) {
    case 'goto':
      // Manuellt byte: ny chans för felhoppet, gammal notis bort.
      return { ...s, request: next(s, { channelId: a.channelId, mode: a.mode, at: null }), pending: null, status: 'resolving', failedOnce: false, notice: null }
    case 'planned':
      if (a.plan.seq !== s.request.seq) return s
      return { ...s, pending: a.plan, status: 'resolving', rest: null }
    case 'resolved': {
      if (a.seq !== s.request.seq || !s.pending || s.pending.seq !== a.seq) return s
      return { ...s, onScreen: { ...s.pending, playable: a.playable }, pending: null, status: 'playing' }
    }
    case 'failed': {
      if (a.seq !== s.request.seq) return s
      const plan = planFor(s, a.seq)
      if (!plan) return s
      if (!s.failedOnce) {
        return { ...s, failedOnce: true, notice: 'skipping', pending: null, status: 'resolving', request: next(s, { mode: 'live', at: afterSlot(plan.slot, a.now) }) }
      }
      return { ...s, status: 'error', onScreen: null, pending: null, notice: null }
    }
    case 'rest':
      if (a.seq !== s.request.seq) return s
      return { ...s, status: 'rest', rest: a.rest, onScreen: null, pending: null }
    case 'empty':
      if (a.seq !== s.request.seq) return s
      return { ...s, status: 'empty', rest: null, onScreen: null, pending: null }
    case 'advance': {
      // Timer och onPlaybackEnded kan komma samma tick: bara den första som
      // gäller den visade begäran räknas.
      if (a.seq !== s.request.seq || !s.onScreen || s.onScreen.seq !== a.seq) return s
      return { ...s, pending: null, status: 'resolving', request: next(s, { mode: 'live', at: afterSlot(s.onScreen.slot, a.now) }) }
    }
    case 'firstPlay':
      if (a.seq !== s.onScreen?.seq) return s
      return { ...s, failedOnce: false, notice: null }
  }
}
