/**
 * Guidens förvärmning (skrivbordet): programmet just nu på varje kanal får
 * filens huvud och index i appens cache medan guiden är öppen, så första
 * bytet till en kanal slipper rundresorna (7–9 s kallt mot ~2 s varmt,
 * 2026-10-20). En kanal i taget, varje programplats en gång.
 *
 * Med: bibliotek (egen server) och molnfiler — en upplåsning per kanal och
 * program, som bytet sedan återanvänder (resolverns cache). Inte med:
 * strömuppslag (resolverns anropsgräns) och IPTV-VOD (leverantörer tillåter
 * ofta en anslutning; en förvärmning kunde bryta pågående tittande). Ren logik.
 */
import type { ChannelDef } from '../model/channel'
import type { PoolItem } from '../data/pool'
import { programmeAt } from '../model/schedule'

export interface GuideWarmTarget { channel: ChannelDef; item: PoolItem; key: string }

export function guideWarmTargets(
  channels: ChannelDef[],
  rundowns: Record<string, { rundown: PoolItem[] } | undefined>,
  now: number,
  done: ReadonlySet<string>,
): GuideWarmTarget[] {
  const out: GuideWarmTarget[] = []
  for (const channel of channels) {
    const rundown = rundowns[channel.id]?.rundown
    if (!rundown || rundown.length === 0) continue
    const slot = programmeAt(rundown, channel.airWindow, now)
    if (slot.kind !== 'programme') continue
    const { item } = slot
    if (item.play.type === 'stream' || item.source === 'vod') continue
    const key = `${item.ref}@${slot.start}`
    if (done.has(key)) continue
    out.push({ channel, item, key })
  }
  return out
}
