/**
 * TABLÅLÅS: det som visats ska vara det som sänds.
 *
 * Tablån räknas fram ur rundownen, och rundownen ändras när poolen gör det
 * (en ny källa svarar, en verklig fillängd rättas, metadata kommer in). Utan
 * lås kunde tablån därför flytta sig efter att den visats — man såg "Alien
 * 21:00" och fick något annat. Låset sparar de närmaste sex timmarnas
 * konkreta program per kanal ({ref, start, stopp}) och programAt/listing
 * läser dem först. En ändrad pool påverkar bara tiden efter låsets horisont.
 * Låset förlängs rullande (när mindre än tre timmar återstår fylls det på
 * till sex) och slängs när kanalens regler ändras (signaturen).
 *
 * Absoluta tidsstämplar: sommartidsbyten flyttar ingenting i ett lagt lås.
 * Ren logik; lagringen sköts av state/store.ts.
 */
import type { ChannelDef } from './channel'
import type { ScheduleItem } from './schedule'

const MIN = 60_000
/** Hur långt fram låset lägger tablån. */
export const LOCK_SPAN_MS = 6 * 3600_000
/** Förläng när mindre än så här återstår. */
export const LOCK_RENEW_MS = 3 * 3600_000
/** Passerade program som sparas kvar (det pågående och lite historik). */
const LOCK_KEEP_PAST_MS = 3600_000

/** Ett låst program: ref ('' = vila), start, stopp (ms) och filposition vid start (min). */
export interface LockedSlot { r: string; s: number; e: number; o: number }
export interface ScheduleLock { sig: string; slots: LockedSlot[] }

/** Reglerna som avgör tablån; ändras de gäller inte låset längre. */
export function lockSignature(channel: Pick<ChannelDef, 'sources' | 'genres' | 'era' | 'length' | 'kind' | 'order' | 'airWindow' | 'seed'>): string {
  const { sources, genres, era, length, kind, order, airWindow, seed } = channel
  return JSON.stringify([sources, genres, era, length, kind, order, airWindow, seed])
}

/** Låsets horisont: slutet på sista låsta programmet (null utan lås). */
export function lockHorizon(lock: ScheduleLock | null | undefined): number | null {
  const last = lock?.slots[lock.slots.length - 1]
  return last ? last.e : null
}

type BaseSlot = { kind: 'programme'; item: ScheduleItem; start: number; stop: number; minsIn: number } | { kind: 'rest'; start: number; stop: number }

/**
 * Lägger, förlänger eller behåller låset. `slotAt` är den OLÅSTA tablån
 * (programmeAt på rundownen utan lås). Returnerar samma objekt när inget
 * ändrats, så anroparen vet när det ska sparas.
 */
export function extendLock(
  lock: ScheduleLock | null,
  sig: string,
  slotAt: (t: number) => BaseSlot | { kind: 'empty' },
  now: number,
): ScheduleLock | null {
  const valid = lock && lock.sig === sig ? lock : null
  const kept = valid ? valid.slots.filter((x) => x.e > now - LOCK_KEEP_PAST_MS) : []
  const horizon = kept.length > 0 ? kept[kept.length - 1]!.e : null
  const live = horizon != null && horizon > now
  if (valid && live && horizon - now >= LOCK_RENEW_MS) {
    return kept.length === valid.slots.length ? valid : { sig, slots: kept }
  }
  const extending = live && kept.length > 0
  const slots = extending ? [...kept] : []
  let t = extending ? horizon! : now
  const until = now + LOCK_SPAN_MS
  let guard = 0
  while (t < until && guard < 400) {
    guard += 1
    const slot = slotAt(t)
    if (slot.kind === 'empty') break
    const stop = slot.stop > t ? slot.stop : t + MIN
    // Förlängning: programmet vid horisonten kan ha börjat före den (poolen
    // ändrades) — det klipps där, så låsta program aldrig överlappar.
    // Första läggningen behåller programmets verkliga start (21:13–22:53).
    const start = extending && slot.start < t ? t : slot.start
    if (slot.kind === 'rest') slots.push({ r: '', s: start, e: stop, o: 0 })
    else slots.push({ r: slot.item.ref, s: start, e: stop, o: Math.max(0, slot.minsIn - (t - start) / MIN) })
    t = stop
  }
  if (slots.length === 0) return valid && kept.length === valid.slots.length ? valid : kept.length > 0 ? { sig, slots: kept } : null
  return { sig, slots }
}

/** Det låsta programmet som täcker t, eller null (utanför låset). */
export function lockedSlotAt(lock: ScheduleLock, t: number): LockedSlot | null {
  const slots = lock.slots
  if (slots.length === 0 || t < slots[0]!.s || t >= slots[slots.length - 1]!.e) return null
  let lo = 0
  let hi = slots.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (slots[mid]!.s <= t) lo = mid
    else hi = mid - 1
  }
  const hit = slots[lo]!
  return t < hit.e ? hit : null
}

/** Packad form för lagringen är objektet självt (redan kompakt); läsning tål skräp. */
export function parseLock(raw: unknown): ScheduleLock | null {
  if (!raw || typeof raw !== 'object') return null
  const { sig, slots } = raw as { sig?: unknown; slots?: unknown }
  if (typeof sig !== 'string' || !Array.isArray(slots)) return null
  const ok = slots.every((x) => x && typeof x === 'object' && typeof (x as LockedSlot).r === 'string'
    && Number.isFinite((x as LockedSlot).s) && Number.isFinite((x as LockedSlot).e) && Number.isFinite((x as LockedSlot).o))
  return ok ? { sig, slots: slots as LockedSlot[] } : null
}
