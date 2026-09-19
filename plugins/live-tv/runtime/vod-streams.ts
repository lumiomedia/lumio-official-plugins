'use client'

/**
 * Bibliotekets strömmar till appens detaljvy.
 *
 * Detaljvyn är appens egen: kortet i Biblioteket öppnar `movie-<tmdb>` och
 * appen ritar TMDB-sidan. Men Spela-knappen där vet ingenting om panelen —
 * den frågar registrerade strömleverantörer. Det här är den leverantören:
 * given en TMDB-identitet svarar den med panelens URL, om panelen har titeln.
 *
 * Vägen tillbaka går genom `tmdbId` i VOD-indexet. Det är samma fält som
 * panelen skickade in, så uppslaget är exakt — ingen titelmatchning, ingen
 * gissning.
 */

import { getXtreamLogins, getLiveTvLists, type LiveTvList, type XtreamLogin } from './live-tv-data'
import { fetchVodEpisodes, queryVod, type VodItem, type XtreamVodImportSource } from './vod-client'

/** En källa med sin inloggning — allt som krävs för att slå upp OCH spela. */
interface XtreamSource {
  source: string
  login: XtreamLogin
}

function xtreamSources(): XtreamSource[] {
  const logins = getXtreamLogins()
  return getLiveTvLists()
    .filter((list: LiveTvList) => list.kind === 'xtream' && list.source && list.xtreamLoginId)
    .map((list) => {
      const login = logins.find((entry) => entry.id === list.xtreamLoginId)
      return login && list.source ? { source: list.source, login } : null
    })
    .filter((entry): entry is XtreamSource => entry !== null)
}

function importSourceOf(login: XtreamLogin): XtreamVodImportSource {
  return { base: login.base, username: login.username, password: login.password, format: login.format }
}

/**
 * Titeln i någon av användarens paneler, med källan den kom ur.
 *
 * Söker källa för källa i stället för att fråga hela indexet på en gång: den
 * som hittas måste kunna paras ihop med SIN inloggning för att serieavsnitt
 * ska gå att hämta, och svaret bär inte källan. Uppslagen går till värdens
 * index i samma process — inte till panelen — så de är billiga, och de flesta
 * har en eller två paneler.
 */
async function findByTmdb(tmdbId: number, kind: 'movie' | 'series'): Promise<{ item: VodItem; from: XtreamSource } | null> {
  for (const from of xtreamSources()) {
    const page = await queryVod({ source: from.source, tmdbId, kind, offset: 0, limit: 1 }).catch(() => null)
    const item = page?.items[0]
    if (item) return { item, from }
  }
  return null
}

export interface VodStreamCandidate {
  id: string
  label: string
  directUrl: string
}

/**
 * Strömmarna för en titel i detaljvyn. Tom lista = panelen har den inte, och
 * appen visar sina andra källor i stället.
 */
export async function getVodStreams(query: {
  mediaType: 'movie' | 'tv'
  tmdbId?: string | null
  season?: number | null
  episode?: number | null
}): Promise<VodStreamCandidate[]> {
  const tmdbId = Number.parseInt(String(query.tmdbId ?? ''), 10)
  if (!Number.isFinite(tmdbId) || tmdbId <= 0) return []

  if (query.mediaType === 'movie') {
    const hit = await findByTmdb(tmdbId, 'movie')
    if (!hit?.item.url) return []
    return [{ id: `xtream-vod:${hit.item.key}`, label: labelFor(hit.item), directUrl: hit.item.url }]
  }

  // Serier: panelens avsnitt är numrerade som TMDB:s, så säsong och avsnitt
  // räcker för att peka ut rätt fil. Utan dem finns inget att spela — appen
  // frågar per avsnitt, inte per serie.
  if (query.season == null || query.episode == null) return []
  const hit = await findByTmdb(tmdbId, 'series')
  if (!hit?.item.seriesId) return []
  const episodes = await fetchVodEpisodes(hit.from.source, hit.item.seriesId, importSourceOf(hit.from.login)).catch(() => [])
  const match = episodes.find((entry) => entry.season === query.season && entry.episode === query.episode)
  if (!match) return []
  return [
    {
      id: `xtream-vod:${hit.item.key}:s${match.season}e${match.episode}`,
      label: labelFor(hit.item),
      directUrl: match.url,
    },
  ]
}

/**
 * Etiketten användaren ser i strömlistan: panelens värdnamn, inte titeln —
 * listan står redan under titeln, och det som skiljer källorna åt är VILKEN
 * panel de kom ur.
 */
function labelFor(item: VodItem): string {
  const ext = item.url?.split('.').pop()?.toUpperCase()
  return ext && ext.length <= 4 ? `Xtream · ${ext}` : 'Xtream'
}
