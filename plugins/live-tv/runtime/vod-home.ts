import { fetchLibraryStatus } from '@/lib/plugin-sdk'
import { LIVE_TV_BROWSE_PAGE_ID } from './live-tv-shell'
import { VOD_LIBRARY_PROVIDER_ID } from './vod-library-map'
import { getVodMode } from './vod-data'
import { getActivePlaylistId } from './tv/tv-settings-store'

export const LIVE_TV_FRAME_ID = 'live-tv'

/** Live TV:s Hem: kärnans startsida skopad till VOD, med rälsen som ram (spec 2026-10-10). */
export function vodHomeTarget() {
  return {
    pageId: 'library' as const,
    params: { provider: VOD_LIBRARY_PROVIDER_ID, frame: LIVE_TV_FRAME_ID, fallbackPageId: LIVE_TV_BROWSE_PAGE_ID },
  }
}

/**
 * Har användaren valt "Dölj VOD helt" för den aktiva spellistan? Då finns inget
 * Hem: ingen omdirigering, ingen navigering dit och ingen automatisk indexering.
 */
export function vodHiddenForActivePlaylist(): boolean {
  return getVodMode(getActivePlaylistId()) === 'off'
}

/**
 * Hur länge statusfrågan får ta innan vi ger upp och visar Kanaler (ett
 * stockat index får aldrig lämna hubben tom). Inte kortare: vid kallstart
 * köar webbvyn anropet bakom appens egna (uppmätt 2026-10-10, telefon:
 * ~2,9 s innan anropet ens skickades, svaret sedan 0,2 s) — med 1,5 s
 * hamnade Live TV då alltid på Kanaler i stället för Hem.
 */
export const VOD_INDEX_TIMEOUT_MS = 5000

/** Finns minst en indexerad xtream-vod-källa? Fel eller timeout i anropet räknas som inget index. */
export async function hasVodIndex(timeoutMs = VOD_INDEX_TIMEOUT_MS): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const timeout = new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), timeoutMs) })
    const status = await Promise.race([fetchLibraryStatus(), timeout])
    return Boolean(status?.sources?.some((entry) => entry.id.startsWith(`${VOD_LIBRARY_PROVIDER_ID}:`) && entry.lastFullSync))
  } catch {
    return false
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

const REDIRECT_COOLDOWN_MS = 10_000
let lastRedirect = -Infinity

/**
 * Ska Live TV hoppa vidare till Hem? Bara när sidan öppnas utan params
 * (menyvalet / värdens reserv), och högst en gång per 10 s: reserven öppnar
 * sidan utan params, så om vi tror att index finns men värden inte gör det
 * skulle vi annars studsa för evigt.
 */
export function shouldRedirectToVodHome(params: Record<string, string> | undefined, now: number): boolean {
  if (params && (params.view || params.url)) return false
  return now - lastRedirect >= REDIRECT_COOLDOWN_MS
}

export function markVodHomeRedirect(now: number): void { lastRedirect = now }

/** Bara för tester: nollställ spärren. */
export function resetVodHomeRedirectForTests(): void { lastRedirect = -Infinity }
