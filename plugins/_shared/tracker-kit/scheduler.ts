const INITIAL_DELAY_MS = 50_000
const INTERVAL_MS = 15 * 60_000

/// 50 s efter start (Trakts kör efter 20 s — de ska inte krocka med varandra
/// eller med appstarten), sedan var 15:e minut. Bara intervallet skickar
/// sedd-historik; start, ny nyckel, reglage och profilbyte hämtar bara.
export function startScheduler(deps: {
  run(opts: { pushWatched: boolean; reason: string }): Promise<unknown>
  onKeyChanged(listener: () => void): () => void
  onPrefsChanged(listener: () => void): () => void
  onProfileChanged(listener: () => void): () => void
}): () => void {
  const initial = setTimeout(() => { void deps.run({ pushWatched: false, reason: 'start' }) }, INITIAL_DELAY_MS)
  const interval = setInterval(() => { void deps.run({ pushWatched: true, reason: 'intervall' }) }, INTERVAL_MS)
  const offs = [
    deps.onKeyChanged(() => { void deps.run({ pushWatched: false, reason: 'ny nyckel' }) }),
    deps.onPrefsChanged(() => { void deps.run({ pushWatched: false, reason: 'ändrade reglage' }) }),
    deps.onProfileChanged(() => { void deps.run({ pushWatched: false, reason: 'profilbyte' }) }),
  ]
  return () => {
    clearTimeout(initial)
    clearInterval(interval)
    for (const off of offs) off()
  }
}
