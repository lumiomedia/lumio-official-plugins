/**
 * Kanalspelarens rena logik: startposition, kanalsteg, programgränser och
 * zappminne. Ingen React, inget SDK — testas för sig.
 */
import type { ChannelDef } from '../model/channel'
import { programmeAt, type ProgrammeSlot } from '../model/schedule'
import type { PoolItem } from '../data/pool'

export type PlayMode = 'live' | 'start'

/** Live: så långt in i programmet som tablån säger (golv 0). Från början: 0. */
export function startSeconds(slot: ProgrammeSlot<PoolItem>, mode: PlayMode): number {
  if (mode === 'start') return 0
  return Math.max(0, slot.minsIn * 60)
}

/** CH ▲▼ går i kanalnummerordning och wrappar runt. */
export function stepChannel(channels: ChannelDef[], currentId: string, delta: 1 | -1): ChannelDef {
  const sorted = [...channels].sort((a, b) => a.number - b.number)
  const index = sorted.findIndex((c) => c.id === currentId)
  if (index < 0) return sorted[0]!
  return sorted[(index + delta + sorted.length) % sorted.length]!
}

/** Gränsen vinner alltid, även om strömmen är längre än katalogens runtime. */
export function nextBoundaryAction(input: { now: number; slotStop: number; preloadLeadMs: number; preloaded: boolean }): 'none' | 'preload' | 'advance' {
  if (input.now >= input.slotStop) return 'advance'
  if (!input.preloaded && input.slotStop - input.now <= input.preloadLeadMs) return 'preload'
  return 'none'
}

/** Byte till samma kanal ändrar inget; annars blir nuvarande kanal "förra". */
export function rememberZap(
  memory: { lastChannelId: string | null; previousChannelId: string | null },
  nextId: string,
): { lastChannelId: string; previousChannelId: string | null } {
  if (memory.lastChannelId === nextId) return { lastChannelId: nextId, previousChannelId: memory.previousChannelId }
  return { lastChannelId: nextId, previousChannelId: memory.lastChannelId }
}

/** Väntan innan ett kanalbyte slår upp strömmen. */
export const ZAP_RESOLVE_DELAY_MS = 300

/**
 * Snabb zappning ska inte starta ett strömuppslag per kanal man passerar:
 * vid kanalbyte väntar uppslaget ~300 ms (OSD:n och inställningsvyn byts
 * direkt). Biblioteksposter slås upp lokalt och väntar inte; strömsök och
 * debrid går mot leverantörer och gör det.
 */
export function resolveDelayMs(playType: 'library' | 'stream' | 'debrid', channelChanged: boolean): number {
  return channelChanged && playType !== 'library' ? ZAP_RESOLVE_DELAY_MS : 0
}

/** Så nära slutet räknas som slut (mpv stannar på sista bilden med keep-open). */
const END_SLACK_S = 2
/** Mindre spelat än så här innan slutet = källan bar inte, inte ett färdigt program. */
const MIN_PLAYED_S = 60

/**
 * Appens spelare säger aldrig onPlaybackEnded på mpv: den stannar pausad på
 * sista bilden (position = längd). Det ser ut som att kanalen inte startar —
 * särskilt när filen är kortare än livepositionen (en trasig 33-minutersfil av
 * en 143-minutersfilm: hoppet landar i filslutet). Avgörs ur onTimeUpdate:
 * slut strax efter start = 'failed' (felhoppet), slut efter en stunds
 * uppspelning = 'ended' (nästa program).
 */
export function endOfSourceAction(input: { position: number; duration: number; startedAt: number }): 'failed' | 'ended' | null {
  const { position, duration, startedAt } = input
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(position)) return null
  if (position < duration - END_SLACK_S) return null
  return position - startedAt < MIN_PLAYED_S ? 'failed' : 'ended'
}

/** Så länge efter första bilden innan grannkanalerna förladdas (uppspelningen först). */
export const NEIGHBOUR_PREFETCH_DELAY_MS = 3000

/**
 * Det CH ▲▼ skulle landa på just nu, för förladdning i bakgrunden. Bara
 * biblioteks- och debridposter (lokalt uppslag resp. en fil att låsa upp) —
 * aldrig strömsök, som går mot leverantörer och rate limits. Grannar utan
 * sparad tablå hoppas över (ingen poolladdning för en gissning).
 */
export function neighbourPrefetch(
  channels: ChannelDef[],
  currentId: string,
  rundownOf: (c: ChannelDef) => PoolItem[] | null,
  now: number,
): PoolItem[] {
  if (channels.length < 2) return []
  const ids = new Set<string>()
  const out: PoolItem[] = []
  for (const delta of [1, -1] as const) {
    const c = stepChannel(channels, currentId, delta)
    if (c.id === currentId || ids.has(c.id)) continue
    ids.add(c.id)
    const rundown = rundownOf(c)
    if (!rundown || rundown.length === 0) continue
    const slot = programmeAt(rundown, c.airWindow, now)
    if (slot.kind !== 'programme') continue
    if (slot.item.play.type === 'library' || slot.item.play.type === 'debrid') out.push(slot.item)
  }
  return out
}
