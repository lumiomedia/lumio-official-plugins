/**
 * Vilken kanal sidan (och spelaren/zappen) börjar på när ingen kanal är
 * angiven: senast sedda om den sänder nu, annars den lägsta numrerade som
 * sänder nu, annars den lägsta numrerade. "Sänder nu" = tablån har ett
 * program just nu; är tablån inte känd än (kall cache) räcker att kanalen är
 * inom sin sändningstid. Ren logik.
 */
import type { ChannelDef } from '../model/channel'
import { isOnAir, programmeAt, type ScheduleItem } from '../model/schedule'

export function onAirNow(channel: ChannelDef, rundown: ScheduleItem[] | null, now: number): boolean {
  if (rundown == null) return isOnAir(channel.airWindow, now)
  return rundown.length > 0 && programmeAt(rundown, channel.airWindow, now).kind === 'programme'
}

/** `sorted` i nummerordning; `rundownOf` ger null när tablån inte är känd. */
export function pickStartChannel(
  sorted: ChannelDef[],
  lastId: string | null | undefined,
  now: number,
  rundownOf: (channel: ChannelDef) => ScheduleItem[] | null,
): ChannelDef | null {
  const live = (c: ChannelDef) => onAirNow(c, rundownOf(c), now)
  const last = lastId ? sorted.find((c) => c.id === lastId) : undefined
  if (last && live(last)) return last
  return sorted.find(live) ?? sorted[0] ?? null
}
