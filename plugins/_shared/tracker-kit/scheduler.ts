const INITIAL_DELAY_MS = 50_000
const FIRST_SYNC_DELAY_MS = 5_000
const INTERVAL_MS = 15 * 60_000

/// 50 s efter start (Trakts kör efter 20 s — de ska inte krocka med varandra
/// eller med appstarten), sedan var 15:e minut (eller `intervalMs`). Bara intervallet skickar
/// sedd-historik; start, ny nyckel, reglage och profilbyte hämtar bara.
///
/// Undantaget är FÖRSTA synken (`neverSynced`): ansluten men aldrig synkad.
/// Det är läget direkt efter onboardingen — kortet sparar inloggningen innan
/// pluginet installeras, så "ny nyckel" slår aldrig till, och användaren hade
/// annars väntat 50 s på sin historik och en halvtimme på att Lumios sedda
/// nådde kontot. Den körs efter 5 s och åt båda hållen, som Trakts import i
/// onboardingen. En gång: efter den finns en senaste synk.
export function startScheduler(deps: {
  run(opts: { pushWatched: boolean; reason: string }): Promise<unknown>
  /** Ansluten men aldrig synkad — då körs första synken direkt. */
  neverSynced?(): boolean
  /** Intervallet mellan körningar; standard 15 min. SIMKL tar 30 (kvot per användare). */
  intervalMs?: number
  onKeyChanged(listener: () => void): () => void
  onPrefsChanged(listener: () => void): () => void
  onProfileChanged(listener: () => void): () => void
}): () => void {
  const first = deps.neverSynced?.() ?? false
  const initial = first
    ? setTimeout(() => { void deps.run({ pushWatched: true, reason: 'första synk' }) }, FIRST_SYNC_DELAY_MS)
    : setTimeout(() => { void deps.run({ pushWatched: false, reason: 'start' }) }, INITIAL_DELAY_MS)
  const interval = setInterval(() => { void deps.run({ pushWatched: true, reason: 'intervall' }) }, deps.intervalMs ?? INTERVAL_MS)
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
