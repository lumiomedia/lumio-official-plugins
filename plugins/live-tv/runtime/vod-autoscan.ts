import { fetchLibraryStatus, isLibraryScanRunning, readPluginJson, runLibraryScan, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, getLiveTvLists } from './live-tv-data'
import { vodStatus } from './vod-client'
import { vodLibraryProvider } from './vod-library-provider'
import { vodLibraryRows, type VodLibraryRow } from './vod-library-rows'
import { VOD_LIBRARY_PROVIDER_ID } from './vod-library-map'
import { vodHiddenForActivePlaylist } from './vod-home'
import { ensureVodChoiceMigrated, isVodChoiceMade } from './vod-category-filter'

/**
 * Försöken per källa (`xtream-vod:<konto>` → antal och senaste försök).
 *
 * Ersätter `live_tv_vod_autoscan_v1`, en enda flagga för ALLA källor som
 * sattes innan första genomgången. En avbruten genomgång (appen stängd, TV-boxen
 * i bakgrunden, nätfel) lämnade den satt för alltid, och en spellista som lades
 * till senare indexerades aldrig: Hem sade "förbereds" i timmar utan att något
 * kördes (användarrapport 2026-10-24). Den gamla flaggan läses inte, så de som
 * fastnat får ett nytt försök.
 */
const ATTEMPTS_KEY = 'live_tv_vod_autoscan_v2'
interface Attempt { n: number; at: number }
type Attempts = Record<string, Attempt>

/** Väntan efter n misslyckade försök: 10 min, 1 h, sedan var sjätte timme. Skyddar mot en krasch-loop. */
export function retryDelayMs(n: number): number {
  return n <= 0 ? 0 : n === 1 ? 10 * 60_000 : n === 2 ? 60 * 60_000 : 6 * 60 * 60_000
}

const readAttempts = (): Attempts => {
  const raw = readPluginJson<Attempts | null>(LIVE_TV_PLUGIN_ID, ATTEMPTS_KEY, null)
  return raw && typeof raw === 'object' ? raw : {}
}
const writeAttempts = (a: Attempts): void => { writePluginJson(LIVE_TV_PLUGIN_ID, ATTEMPTS_KEY, a, { emitChange: false }) }

/** Skydd mot två samtidiga anrop inom samma session. */
let inFlight = false

/** Skickas på `window` när en genomgång härifrån gjorde ett bibliotek färdigt — Hem går att öppna. */
export const VOD_READY_EVENT = 'lumio-live-tv-vod-ready'

type LibraryStatusLike = Awaited<ReturnType<typeof fetchLibraryStatus>> | null
const fullySynced = (library: LibraryStatusLike, row: VodLibraryRow): boolean =>
  !!library?.sources?.some((entry) => entry.id === row.libraryId && entry.lastFullSync)

/**
 * Indexerar källor med VOD som saknar ett färdigt bibliotek. Aldrig när
 * VOD-läget är 'off', aldrig medan katalogen hämtas eller en annan genomgång
 * kör, och aldrig innan användaren valt kategorier för en ny källa.
 *
 * Varje källa för sin egen bok: försöket räknas innan genomgången startar (en
 * krasch mitt i blir ett försök, inte en loop), och en källa som inte blev
 * färdig försöker igen efter `retryDelayMs`. `force` (användaren tryckte på Hem
 * eller valde kategorier) struntar i väntan.
 */
export async function maybeAutoScanVod(opts: { force?: boolean; now?: number } = {}): Promise<'started' | 'skipped'> {
  if (inFlight) return 'skipped'
  if (vodHiddenForActivePlaylist()) return 'skipped'
  if (isLibraryScanRunning()) return 'skipped'
  inFlight = true
  try {
    const now = opts.now ?? Date.now()
    const [sources, library] = await Promise.all([vodStatus(), fetchLibraryStatus()])
    // Källor som fanns före kategorivalet räknas som valda; först därefter
    // kan en ny källa sägas vänta på sitt val.
    await ensureVodChoiceMigrated(async () => sources)
    const attempts = readAttempts()
    const rows = vodLibraryRows(sources, library)
      .filter((row) => !fullySynced(library, row))
      .filter((row) => isVodChoiceMade(row.vodSource))
      .filter((row) => {
        const a = attempts[row.libraryId]
        return opts.force || !a || now - a.at >= retryDelayMs(a.n)
      })
    if (rows.length === 0) return 'skipped'
    // Värden hämtar fortfarande katalogen: en genomgång nu blir ofullständig. Inget försök räknas.
    if (rows.some((row) => row.importing)) return 'skipped'
    if (isLibraryScanRunning()) return 'skipped'
    for (const row of rows) attempts[row.libraryId] = { n: (attempts[row.libraryId]?.n ?? 0) + 1, at: now }
    writeAttempts(attempts)
    for (const row of rows) {
      try {
        await runLibraryScan(vodLibraryProvider, { id: row.libraryId, name: row.label, cursor: null }, { mode: 'full' })
      } catch (err) {
        console.warn('[live-tv] VOD-autoindex', err)
      }
    }
    // Blev något bibliotek färdigt säger vi till, så skalet kan berätta att Hem är redo.
    const after = await fetchLibraryStatus().catch(() => null)
    if (rows.some((row) => fullySynced(after, row))) window.dispatchEvent(new Event(VOD_READY_EVENT))
    return 'started'
  } catch (err) {
    console.warn('[live-tv] VOD-autoindex', err)
    return 'skipped'
  } finally {
    inFlight = false
  }
}

/**
 * Varför Hem inte går att öppna, i den ordning användaren kan göra något åt det.
 * - `ready`: biblioteket finns.
 * - `hidden`: VOD är dolt för spellistan.
 * - `no-playlist`: ingen M3U- eller Xtream-lista alls — inget att vänta på.
 * - `no-vod`: spellistan har inga filmer eller serier (vanlig M3U, ren kanalpanel).
 * - `choose`: en källa väntar på kategorivalet.
 * - `importing`: katalogen hämtas fortfarande från panelen.
 * - `indexing`: en genomgång kör.
 * - `failed`: senaste försöket blev inte färdigt; ett nytt görs efter en stund.
 * - `waiting`: inget har prövats än (startar strax).
 */
export type VodHomeState = 'ready' | 'hidden' | 'no-playlist' | 'no-vod' | 'choose' | 'importing' | 'indexing' | 'failed' | 'waiting'

export interface VodHomeStatus {
  state: VodHomeState
  /** Titlar som hittills hamnat i biblioteket, eller null innan något byggts. */
  indexed: number | null
  /** Titlar panelen har totalt, eller null när ingen källa med VOD finns. */
  total: number | null
}

export async function vodHomeState(): Promise<VodHomeState> {
  return (await vodHomeStatus()).state
}

/** Som `vodHomeState`, med hur långt genomgången kommit — så beskedet kan säga "400 av 8 148". */
export async function vodHomeStatus(): Promise<VodHomeStatus> {
  const only = (state: VodHomeState): VodHomeStatus => ({ state, indexed: null, total: null })
  if (vodHiddenForActivePlaylist()) return only('hidden')
  try {
    const [sources, library] = await Promise.all([vodStatus(), fetchLibraryStatus()])
    if (library?.sources?.some((entry) => entry.id.startsWith(`${VOD_LIBRARY_PROVIDER_ID}:`) && entry.lastFullSync)) return only('ready')
    const rows = vodLibraryRows(sources, library)
    if (rows.length === 0) {
      if (sources.some((s) => s.importing)) return only('importing')
      // Biblioteket känner en VOD-källa fast VOD-statusen är tom (värden svarade inte): säg inte "inga filmer".
      const known = library?.sources?.some((entry) => entry.id.startsWith(`${VOD_LIBRARY_PROVIDER_ID}:`)) ?? false
      if (known) return only('waiting')
      // Utan någon M3U- eller Xtream-lista alls finns inget som kan bli film och serier.
      const hasPlaylist = getLiveTvLists().some((list) => list.kind === 'm3u' || list.kind === 'xtream')
      return only(hasPlaylist ? 'no-vod' : 'no-playlist')
    }
    const counted = rows.filter((row) => row.indexedTitles !== null)
    const progress = {
      indexed: counted.length > 0 ? counted.reduce((sum, row) => sum + (row.indexedTitles ?? 0), 0) : null,
      total: rows.reduce((sum, row) => sum + row.vodTitles, 0),
    }
    await ensureVodChoiceMigrated(async () => sources)
    if (rows.some((row) => !isVodChoiceMade(row.vodSource))) return { state: 'choose', ...progress }
    if (rows.some((row) => row.importing)) return { state: 'importing', ...progress }
    if (isLibraryScanRunning()) return { state: 'indexing', ...progress }
    const attempts = readAttempts()
    return { state: rows.some((row) => attempts[row.libraryId]) ? 'failed' : 'waiting', ...progress }
  } catch {
    return only('waiting')
  }
}

/** Bara för tester: nollställ boken och vakten. */
export function resetVodAutoScanForTests(): void {
  inFlight = false
  writePluginJson(LIVE_TV_PLUGIN_ID, ATTEMPTS_KEY, {}, { emitChange: false })
}
