/**
 * Kanaler och titelpool i pluginets lagring, plus React-hooks för vyerna.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChannelDef } from '../model/channel'
import { buildRundown, programmeAt } from '../model/schedule'
import { capPool, MAX_POOL_ITEMS, poolRules, poolSignature, type PoolItem } from '../data/pool'
import { packPool, unpackPool } from '../data/pool-pack'
import { loadPoolProgressive, type SourceDeps } from '../data/sources'
import { onChannelsChanged, prunePoolCaches, readChannels, readPoolCache, removePoolCache, sourceDeps, sourceSignatures, writeChannels, writePoolCache } from '../host'

export function saveChannel(def: ChannelDef): void {
  const all = readChannels()
  writeChannels(all.some((c) => c.id === def.id) ? all.map((c) => (c.id === def.id ? def : c)) : [...all, def])
}

export function deleteChannel(id: string): void {
  writeChannels(readChannels().filter((c) => c.id !== id))
  removePoolCache(id)
}

/**
 * Poolens läge för en kanal. `pool` är null tills första källan svarat;
 * `complete` när alla källor och all metadataberikning är klara (först då
 * sparas poolcachen). `stale` = sparad pool med samma regler vars
 * källsignatur inte är kontrollerad än (visas medan den omprövas).
 */
export interface PoolView { pool: PoolItem[] | null; complete: boolean; stale?: boolean }

/** En pågående (eller klar) progressiv laddning, delad av alla som visar kanalen. */
interface PoolJob {
  view: PoolView
  subscribe(fn: (view: PoolView) => void): () => void
  done: Promise<PoolItem[]>
}

const inflightPools = new Map<string, PoolJob>()

function settledJob(pool: PoolItem[]): PoolJob {
  return { view: { pool, complete: true }, subscribe: () => () => {}, done: Promise.resolve(pool) }
}

function startJob(channel: ChannelDef, sig: string, deps: SourceDeps, key: string): PoolJob {
  const listeners = new Set<(view: PoolView) => void>()
  const job: PoolJob = {
    view: { pool: null, complete: false },
    subscribe(fn) { listeners.add(fn); return () => { listeners.delete(fn) } },
    done: Promise.resolve(EMPTY),
  }
  const publish = (view: PoolView) => {
    job.view = view
    for (const fn of [...listeners]) fn(view)
  }
  job.done = loadPoolProgressive(channel, deps, (partial) => publish({ pool: capPool(partial, MAX_POOL_ITEMS, channel.seed), complete: false }))
    .then((items) => {
      const pool = packPool(capPool(items, MAX_POOL_ITEMS, channel.seed))
      // Samma form som en cacheträff, så tablån blir identisk före och efter omstart.
      const final = unpackPool(pool)!
      // Cachen skrivs bara för en komplett pool; visningen får den även om skrivningen faller.
      try { writePoolCache(channel.id, { sig, pool }) } finally { publish({ pool: final, complete: true }) }
      return final
    })
  const release = () => { if (inflightPools.get(key) === job) inflightPools.delete(key) }
  job.done.then(release, () => {
    release()
    if (!job.view.complete) publish({ pool: job.view.pool ?? EMPTY, complete: true })
  })
  return job
}

/**
 * Poolen räknas om bara när reglerna eller källornas ändringsmärke ändrats.
 * Hemrad, tablårad och spelare för samma kanal delar en pågående laddning.
 */
async function openPoolJob(channel: ChannelDef, deps: SourceDeps): Promise<PoolJob> {
  const sig = poolSignature(channel, await sourceSignatures())
  const cached = readPoolCache(channel.id)
  if (cached && cached.sig === sig) {
    const items = unpackPool(cached.pool)
    if (items) return settledJob(items)
  }
  const key = `${channel.id}|${sig}`
  const running = inflightPools.get(key)
  if (running) return running
  const job = startJob(channel, sig, deps, key)
  inflightPools.set(key, job)
  return job
}

/** Hela poolen när den är komplett (tester, och den som inte vill ha delresultat). */
export async function loadPoolCached(channel: ChannelDef, deps: SourceDeps = sourceDeps): Promise<PoolItem[]> {
  return (await openPoolJob(channel, deps)).done
}

/** Sparad pool utan uppslag: null när cachen är kall. Signaturen kontrolleras inte (visning, inte planering). */
export function readCachedPool(channelId: string): PoolItem[] | null {
  const cached = readPoolCache(channelId)
  return cached ? unpackPool(cached.pool) : null
}

/** Sparad pool med samma regler som kanalen (källsignaturen okontrollerad), annars null. */
function readStalePool(channel: ChannelDef): PoolItem[] | null {
  const cached = readPoolCache(channel.id)
  if (!cached) return null
  try {
    const parsed = JSON.parse(cached.sig) as { rules?: unknown }
    if (JSON.stringify(parsed.rules) !== JSON.stringify(poolRules(channel))) return null
  } catch {
    return null
  }
  return unpackPool(cached.pool)
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

export interface ChannelPoolState {
  pool: PoolItem[]
  rundown: PoolItem[]
  /** Inget att visa än (ingen källa har svarat). */
  loading: boolean
  /** Poolen visas men fler källor/metadata är på väg. */
  partial: boolean
}

/**
 * Poolen progressivt: tablån visas så snart första källan svarat och byggs om
 * när fler kommer. Finns en sparad pool med samma regler visas den direkt och
 * byts först mot en komplett ny (inga hopp via halvfärdiga delpooler).
 */
export function useChannelPool(channel: ChannelDef | null): ChannelPoolState {
  const [state, setState] = useState<{ key: string; view: PoolView } | null>(null)
  // Bara regler som påverkar poolen styr omladdning; namn och nummer gör det inte.
  const key = channel
    ? JSON.stringify([channel.id, channel.sources, channel.genres, channel.era, channel.length, channel.kind])
    : ''
  const latest = useRef(channel)
  latest.current = channel
  // Synkront vid första målningen, så en sparad kanal aldrig blinkar "laddar".
  const stale = useMemo(() => (channel ? readStalePool(channel) : null), [key]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!channel) return
    let alive = true
    let unsubscribe = () => {}
    const set = (view: PoolView) => { if (alive) setState({ key, view }) }
    if (stale) set({ pool: stale, complete: false, stale: true })
    const apply = (view: PoolView) => { if (view.complete || !stale) set(view) }
    void openPoolJob(latest.current!, sourceDeps)
      .then((job) => {
        if (!alive) return
        if (job.view.pool) apply(job.view)
        unsubscribe = job.subscribe(apply)
      })
      .catch(() => set({ pool: stale ?? EMPTY, complete: true }))
    return () => { alive = false; unsubscribe() }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  const view: PoolView | null = channel ? (state?.key === key ? state.view : stale ? { pool: stale, complete: false, stale: true } : null) : null
  const pool = view?.pool ?? EMPTY
  const rundown = useMemo(
    () => (channel ? buildRundown(pool, channel.order, channel.seed) : EMPTY),
    [pool, channel?.order, channel?.seed], // eslint-disable-line react-hooks/exhaustive-deps
  )
  return {
    pool, rundown,
    loading: channel != null && view?.pool == null,
    partial: view != null && view.pool != null && !view.complete && !view.stale,
  }
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
