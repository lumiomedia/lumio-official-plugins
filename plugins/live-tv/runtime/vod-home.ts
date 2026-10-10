import { fetchLibraryStatus } from '@/lib/plugin-sdk'
import { LIVE_TV_BROWSE_PAGE_ID } from './live-tv-shell'
import { VOD_LIBRARY_PROVIDER_ID } from './vod-library-map'

export const LIVE_TV_FRAME_ID = 'live-tv'

/** Live TV:s Hem: kärnans startsida skopad till VOD, med rälsen som ram (spec 2026-10-10). */
export function vodHomeTarget() {
  return {
    pageId: 'library' as const,
    params: { provider: VOD_LIBRARY_PROVIDER_ID, frame: LIVE_TV_FRAME_ID, fallbackPageId: LIVE_TV_BROWSE_PAGE_ID },
  }
}

/** Finns minst en indexerad xtream-vod-källa? Fel i anropet räknas som inget index. */
export async function hasVodIndex(): Promise<boolean> {
  try {
    const status = await fetchLibraryStatus()
    return Boolean(status?.sources?.some((entry) => entry.id.startsWith(`${VOD_LIBRARY_PROVIDER_ID}:`) && entry.lastFullSync))
  } catch {
    return false
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
