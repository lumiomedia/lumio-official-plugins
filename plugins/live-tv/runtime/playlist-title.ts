import { getXtreamLogins, type LiveTvList } from './live-tv-data'

/**
 * Samma som `hostOf` i settings-ui, här för att datalagret (live-tv-model)
 * inte ska dra in UI-primitiverna — det gav en ny importcykel i bunten.
 */
function hostOf(url: string): string {
  try { return new URL(url).host || url } catch { return url }
}

/** Värden ur käll-URL:en för M3U, listnamnet (panelens värd) annars. */
export function playlistHost(list: LiveTvList): string {
  return list.kind === 'm3u' && list.url ? hostOf(list.url) : list.name
}

/**
 * Det namn en spellista visas med överallt: kortet, väljaren, TV-inställningarna.
 *
 * Användarens eget namn vinner. Annars värden — men delar flera listor samma
 * värd (två Xtream-konton hos samma leverantör) skiljs de åt med kontots
 * användarnamn, eller med ett löpnummer när inget sådant finns. Två rader med
 * exakt samma text gick inte att välja mellan (testare 2026-10-17).
 */
export function playlistTitle(list: LiveTvList, all: readonly LiveTvList[]): string {
  const own = list.label?.trim()
  if (own) return own
  const host = playlistHost(list)
  const sameHost = all.filter((other) => !other.label?.trim() && playlistHost(other) === host)
  if (sameHost.length < 2) return host
  if (list.kind === 'xtream') {
    const user = getXtreamLogins().find((login) => login.id === list.xtreamLoginId)?.username?.trim()
    if (user) return `${host} · ${user}`
  }
  return `${host} (${sameHost.findIndex((other) => other.id === list.id) + 1})`
}
