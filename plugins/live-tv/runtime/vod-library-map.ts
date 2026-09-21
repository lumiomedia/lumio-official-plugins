'use client'

/**
 * VOD-post → bibliotekstitel.
 *
 * Xtream-panelens film- och seriekatalog ligger redan i VÄRDENS index
 * (`live-tv-vod-index.json`, importerad en gång). Biblioteksläget läser ur
 * KÄRNANS index (`library-index.json`), och den här filen är bron mellan dem.
 *
 * Bara en översättning — ingen hämtning, inga inloggningar, inget nät. Det är
 * poängen: katalogskanningen ska aldrig röra panelen igen, och ett Xtream-
 * lösenord ska aldrig kunna hamna i biblioteksindexet.
 *
 * Se planen `Moviefinder/docs/superpowers/plans/2026-09-20-vod-bibliotekslage.md`,
 * Task A1.
 */

import type { LibraryEpisode, LibraryMedia, LibraryTitle } from '@/lib/plugin-sdk'
import type { VodEpisode, VodItem } from './vod-client'

/** Leverantörens id i `LibrarySource.provider`. */
export const VOD_LIBRARY_PROVIDER_ID = 'xtream-vod'

/**
 * Bibliotekskällans id för en VOD-källa.
 *
 * Ett konto = en källa (planens beslut S). Det gör att kkzbigserver kan vara
 * startsida utan cleannordy, och det håller `forget`/`reset` symmetriskt
 * mellan de två indexen.
 */
export function vodLibrarySourceId(vodSource: string): string {
  return `${VOD_LIBRARY_PROVIDER_ID}:${vodSource}`
}

/** `series:<id>` → `<id>`. Serie-id:t bärs av nyckeln, inte av ett eget fält. */
export function seriesIdFromKey(key: string): number | null {
  const match = /^series:(\d+)$/.exec(key)
  if (!match) return null
  const id = Number(match[1])
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

/**
 * Versionen för en film.
 *
 * `playRef` är panelens färdiga uppspelnings-URL. Kärnan tolkar den aldrig —
 * den lämnas tillbaka till leverantören i `resolvePlayback`, som får hämta en
 * färsk adress om panelen kräver det.
 *
 * Kategorinamnet blir versionens etikett och INTE en genre (planens beslut K):
 * `MOVIE: Swedish` beskriver var titeln ligger hos leverantören, inte vad
 * filmen handlar om.
 */
function movieMedia(item: VodItem): LibraryMedia[] {
  if (!item.url) return []
  return [{ key: item.key, label: item.categoryName ?? '', playRef: item.url }]
}

/**
 * Ett avsnitt ur panelen → bibliotekets avsnitt PLUS dess version.
 *
 * `LibraryEpisode` bär inga versioner själv — de ligger i titelns `media` med
 * `episodeKey`. Nyckeln byggs på titelns nyckel + säsong/avsnitt, så den är
 * stabil mellan hämtningar: samma avsnitt hämtat två gånger ger samma nyckel,
 * och upserten skriver över i stället för att dubblera.
 */
export function vodEpisodeToLibrary(ep: VodEpisode, titleKey: string): { episode: LibraryEpisode; media: LibraryMedia } {
  const key = `${titleKey}:s${ep.season}e${ep.episode}`
  return {
    episode: {
      key,
      season: ep.season,
      episode: ep.episode,
      title: ep.title ?? '',
      runtimeMin: ep.runtimeMin ?? null,
      stillUrl: ep.stillUrl ?? null,
    },
    media: { key, label: '', playRef: ep.url, episodeKey: key },
  }
}

export function vodItemToLibraryTitle(item: VodItem, vodSource: string): LibraryTitle | null {
  const key = typeof item.key === 'string' ? item.key.trim() : ''
  const title = typeof item.title === 'string' ? item.title.trim() : ''
  // En post utan nyckel eller titel går inte att visa och går inte att slå upp
  // igen. Den hoppas över i stället för att fylla indexet med tomma kort.
  if (!key || !title) return null

  const sourceId = vodLibrarySourceId(vodSource)
  const series = item.kind === 'series'

  return {
    // Nyckeln MÅSTE bära samma sourceId som batchen skickas med — annars
    // hoppar `batch_handler` över titeln utan ett ljud (library_index.rs:355).
    key: `${sourceId}:${key}`,
    sourceId,
    kind: series ? 'series' : 'movie',
    title,
    tmdbId: item.tmdbId ?? null,
    imdbId: item.imdbId ?? null,
    year: item.year ?? null,
    rating: item.rating ?? null,
    posterUrl: item.posterUrl ?? null,
    // `addedAt` är Unix-SEKUNDER på båda sidor: `VodItem.addedAt` kommer ur
    // panelens `added`/`last_modified`, och `LibraryTitle.addedAt` är
    // dokumenterad som sekunder i lib/library/types.ts (samma enhet som
    // lokala mappar skriver, `as_secs()` i src-tauri/src/local_files.rs).
    // Ingen konvertering — en sådan hade sorterat hela biblioteket till år 33 000.
    addedAt: item.addedAt,
    /*
      Panelerna ger TMDB-id på 65–97 % av raderna. Svansen får `unmatched`,
      precis som en Plex-fil utan match: synlig i biblioteket och i sök,
      frånvarande ur de TMDB-drivna raderna. Det är hela skälet att
      `matchState` finns.
    */
    matchState: item.tmdbId || item.imdbId ? 'matched' : 'unmatched',
    /*
      Genrer och beskrivning lämnas tomma med flit (planens beslut G).
      `VodItem` har dem inte, och startsidans genrerader kommer från
      TMDB-rader filtrerade mot indexet — den vägen behöver bara `tmdbId`.
      Att gissa en genre ur kategorinamnet hade gett "Movie: Swedish" som genre.
    */
    genres: [],
    // Serier har inga versioner på titelnivå — avsnitten bär sina egna (fas B).
    media: series ? [] : movieMedia(item),
    episodes: [],
  }
}
