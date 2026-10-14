/**
 * Kanaler och titelpool i pluginets lagring, plus React-hooks för vyerna.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChannelDef } from '../model/channel'
import { buildRundown, programmeAt } from '../model/schedule'
import { capPool, MAX_POOL_ITEMS, poolSignature, type PoolItem } from '../data/pool'
import { packPool, unpackPool } from '../data/pool-pack'
import { loadPool, type SourceDeps } from '../data/sources'
import { onChannelsChanged, prunePoolCaches, readChannels, readPoolCache, removePoolCache, sourceDeps, sourceSignatures, writeChannels, writePoolCache } from '../host'

export function saveChannel(def: ChannelDef): void {
  const all = readChannels()
  writeChannels(all.some((c) => c.id === def.id) ? all.map((c) => (c.id === def.id ? def : c)) : [...all, def])
}

export function deleteChannel(id: string): void {
  writeChannels(readChannels().filter((c) => c.id !== id))
  removePoolCache(id)
}

/** Poolen räknas om bara när reglerna eller källornas ändringsmärke ändrats. */
export async function loadPoolCached(channel: ChannelDef, deps: SourceDeps = sourceDeps): Promise<PoolItem[]> {
  const sig = poolSignature(channel, await sourceSignatures())
  const cached = readPoolCache(channel.id)
  if (cached && cached.sig === sig) {
    const items = unpackPool(cached.pool)
    if (items) return items
  }
  // Hemrad och tablårad för samma kanal laddar samtidigt: dela ett pågående uppslag.
  const key = `${channel.id}|${sig}`
  const running = inflightPools.get(key)
  if (running) return running
  const job = loadPool(channel, deps)
    .then((items) => {
      const pool = packPool(capPool(items, MAX_POOL_ITEMS, channel.seed))
      writePoolCache(channel.id, { sig, pool })
      // Samma form som en cacheträff, så tablån blir identisk före och efter omstart.
      return unpackPool(pool)!
    })
    .finally(() => inflightPools.delete(key))
  inflightPools.set(key, job)
  return job
}

const inflightPools = new Map<string, Promise<PoolItem[]>>()

/** Sparad pool utan uppslag: null när cachen är kall. Signaturen kontrolleras inte (visning, inte planering). */
export function readCachedPool(channelId: string): PoolItem[] | null {
  const cached = readPoolCache(channelId)
  return cached ? unpackPool(cached.pool) : null
}

export function useChannels(): ChannelDef[] {
  const [channels, setChannels] = useState<ChannelDef[]>(readChannels)
  useEffect(() => {
    const refresh = () => setChannels(readChannels())
    refresh()
    // En gång vid start: släpp poolcache för kanaler som försvunnit (t.ex. via synk).
    prunePoolCaches(readChannels().map((c) => c.id))
    return onChannelsChanged(refresh)
  }, [])
  return channels
}

const EMPTY: PoolItem[] = []

export function useChannelPool(channel: ChannelDef | null): { pool: PoolItem[]; rundown: PoolItem[]; loading: boolean } {
  const [state, setState] = useState<{ key: string; pool: PoolItem[] } | null>(null)
  // Bara regler som påverkar poolen styr omladdning; namn och nummer gör det inte.
  const key = channel
    ? JSON.stringify([channel.id, channel.sources, channel.genres, channel.era, channel.length, channel.kind])
    : ''
  const latest = useRef(channel)
  latest.current = channel
  useEffect(() => {
    if (!channel) return
    let alive = true
    void loadPoolCached(latest.current!)
      .then((pool) => { if (alive) setState({ key, pool }) })
      .catch(() => { if (alive) setState({ key, pool: EMPTY }) })
    return () => { alive = false }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  const pool = channel && state?.key === key ? state.pool : EMPTY
  const rundown = useMemo(
    () => (channel ? buildRundown(pool, channel.order, channel.seed) : EMPTY),
    [pool, channel?.order, channel?.seed], // eslint-disable-line react-hooks/exhaustive-deps
  )
  return { pool, rundown, loading: channel != null && state?.key !== key }
}

const MAX_TICK_MS = 30_000

/** Nu i ms; tickar var 30 s och vid närmaste programgräns. Inga timers utan rundown. */
export function useChannelClock(rundowns: Array<{ rundown: PoolItem[]; channel: ChannelDef }>): number {
  const [now, setNow] = useState(Date.now)
  const ref = useRef(rundowns)
  ref.current = rundowns
  const active = rundowns.some((r) => r.rundown.length > 0)
  const key = rundowns.map((r) => `${r.channel.id}:${r.channel.airWindow}:${r.rundown.length}:${r.rundown[0]?.ref ?? ''}`).join('|')
  useEffect(() => {
    if (!active) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const schedule = () => {
      const t = Date.now()
      let delay = MAX_TICK_MS
      for (const { rundown, channel } of ref.current) {
        const slot = programmeAt(rundown, channel.airWindow, t)
        if (slot.kind !== 'empty' && slot.stop > t) delay = Math.min(delay, slot.stop - t + 50)
      }
      timer = setTimeout(() => { setNow(Date.now()); schedule() }, Math.max(50, delay))
    }
    setNow(Date.now())
    schedule()
    return () => { if (timer) clearTimeout(timer) }
  }, [active, key])
  return now
}
