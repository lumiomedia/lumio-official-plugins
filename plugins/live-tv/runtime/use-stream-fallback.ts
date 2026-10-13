'use client'

import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { channelKey, type M3uChannel } from './live-tv-data'
import { useSportRows } from './sport/home-rows/rows-feed'
import { currentResults } from './sport/results-controller'
import { rankedSources } from './sport/sport-day-model'
import { sourceChannel, type SportMatch } from './sport/sport-model'
import { getOverrides } from './sport/sport-store'
import { fallbackCandidates, initialStall, stallStep, type StallEvent, type StallState } from './stream-fallback'

const TICK_MS = 1_000

function sportSourcesFor(key: string, matches: SportMatch[], now: number): M3uChannel[] {
  const m = matches.find((x) => x.start <= now && now < x.stop && x.sources.some((s) => s.channelKey === key))
  return m ? rankedSources(m, getOverrides()).map(sourceChannel) : []
}

/**
 * Hackar kanalen om och om igen föreslås nästa källa (matchens andra kanaler,
 * sedan samma kanal i en annan variant). `target` visas av StreamFallbackPrompt;
 * bytet sker via `onSwitch`. Provade källor kommer ihåg så länge bytena kom
 * härifrån, så att två dåliga källor aldrig turas om.
 */
export function useStreamFallback(args: { channel: M3uChannel; pausedForCache: boolean; userPaused: boolean; channels: M3uChannel[]; onSwitch?: (c: M3uChannel) => void }) {
  const { channel, pausedForCache, userPaused, channels, onSwitch } = args
  const key = channelKey(channel)
  const rows = useSportRows()
  const [state, dispatch] = useReducer((s: { st: StallState; hit: number }, e: StallEvent) => {
    const r = stallStep(s.st, e)
    return { st: r.state, hit: r.trigger ? s.hit + 1 : s.hit }
  }, { st: initialStall, hit: 0 })
  const [target, setTarget] = useState<M3uChannel | null>(null)
  const tried = useRef(new Set<string>())
  const viaFallback = useRef(false)

  // Ny kanal = ny start. Byttes den av användaren glöms de provade källorna.
  useEffect(() => {
    if (!viaFallback.current) tried.current = new Set()
    viaFallback.current = false
    setTarget(null)
    dispatch({ type: 'start', at: Date.now() })
  }, [key])

  useEffect(() => { if (!userPaused) dispatch({ type: 'cache', paused: pausedForCache, at: Date.now() }) }, [pausedForCache, userPaused])

  const stalled = pausedForCache && !userPaused
  useEffect(() => {
    if (!stalled) return
    const t = setInterval(() => dispatch({ type: 'tick', at: Date.now() }), TICK_MS)
    return () => clearInterval(t)
  }, [stalled])

  useEffect(() => {
    if (state.hit === 0 || !onSwitch) return
    const now = Date.now()
    const matches = [...(currentResults()?.merged() ?? []), ...rows.matches]
    const next = fallbackCandidates(channel, { sportSources: sportSourcesFor(key, matches, now), channels, tried: tried.current })[0]
    if (next) setTarget(next)
    // Bara när en ny utlösning kommer; övriga beroenden läses i stunden.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.hit])

  const switchNow = useCallback(() => {
    if (!target || !onSwitch) return
    tried.current.add(key)
    viaFallback.current = true
    setTarget(null)
    onSwitch(target)
  }, [target, onSwitch, key])
  const stay = useCallback(() => setTarget(null), [])
  return { target, switchNow, stay }
}
