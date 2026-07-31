import type {
  TwitchStream,
  TwitchCategory,
  TwitchVideo,
  TwitchClip,
  TwitchSearchChannelRow,
  TwitchFollowedChannel,
  TwitchUser,
} from './twitch-types'

export function helixUrl(path: string, params: Record<string, string | number | undefined> = {}): string {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')
  return `/api/plugins/twitch/helix/${path}${qs ? `?${qs}` : ''}`
}

export function thumb(url: string, w: number, h: number): string {
  // Match the `%{width}`/`%{height}` form (used by Helix `/videos` thumbnails)
  // before the plain `{width}`/`{height}` form, since `%?` makes the leading
  // `%` optional and covers both in a single pass.
  return url.replace(/%?\{width\}/g, String(w)).replace(/%?\{height\}/g, String(h))
}

async function helixGet<T>(url: string, userToken?: string): Promise<{ data: T[]; cursor: string | null }> {
  const headers: Record<string, string> = {}
  if (userToken) headers['x-twitch-user-token'] = userToken
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`Twitch request failed (${res.status})`)
  const json = await res.json() as { data?: T[]; pagination?: { cursor?: string } }
  return { data: json.data ?? [], cursor: json.pagination?.cursor ?? null }
}

// `language` is an ISO 639-1 code (e.g. 'sv', 'en') passed to Helix `/streams`
// to filter by stream language; omit or pass '' for all languages.
export async function getTopStreams(cursor?: string, language?: string) {
  const { data, cursor: next } = await helixGet<TwitchStream>(helixUrl('streams', { first: 30, after: cursor, language }))
  return { streams: data, cursor: next }
}
export async function getStreamsByGame(gameId: string, cursor?: string, language?: string) {
  const { data, cursor: next } = await helixGet<TwitchStream>(helixUrl('streams', { game_id: gameId, first: 30, after: cursor, language }))
  return { streams: data, cursor: next }
}
export async function getTopCategories(cursor?: string) {
  const { data, cursor: next } = await helixGet<TwitchCategory>(helixUrl('games/top', { first: 30, after: cursor }))
  return { categories: data, cursor: next }
}
export async function getFollowedStreams(userId: string, userToken: string, cursor?: string) {
  const { data, cursor: next } = await helixGet<TwitchStream>(helixUrl('streams/followed', { user_id: userId, first: 30, after: cursor }), userToken)
  return { streams: data, cursor: next }
}
export async function searchChannels(query: string): Promise<TwitchStream[]> {
  // No `live_only` filter: Twitch's own channel search returns matching
  // channels whether or not they're currently live, so the channel a user is
  // actually looking for shows up even when it's offline. The `is_live` flag on
  // each row drives the LIVE badge in the UI.
  const { data } = await helixGet<TwitchSearchChannelRow>(
    helixUrl('search/channels', { query, first: 20 }),
  )
  // `GET /search/channels` rows don't share the `streams` endpoint's shape:
  // normalize `id`/`broadcaster_login`/`display_name` into
  // `user_id`/`user_login`/`user_name` so downstream UI (StreamCard,
  // openChannel -> TwitchChannelPage) gets valid identifiers. There is no
  // `viewer_count` for search results — leave it undefined.
  return data.map((row) => ({
    id: row.id,
    user_id: row.id,
    user_login: row.broadcaster_login,
    user_name: row.display_name,
    game_id: row.game_id ?? '',
    game_name: row.game_name ?? '',
    title: row.title ?? '',
    thumbnail_url: row.thumbnail_url ?? '',
    is_live: row.is_live,
  }))
}
export async function searchCategories(query: string) {
  const { data } = await helixGet<TwitchCategory>(helixUrl('search/categories', { query, first: 20 }))
  return data
}
export async function getFollowedChannels(userId: string, userToken: string, cursor?: string) {
  const { data, cursor: next } = await helixGet<TwitchFollowedChannel>(
    helixUrl('channels/followed', { user_id: userId, first: 100, after: cursor }),
    userToken,
  )
  return { channels: data, cursor: next }
}
export async function getUsersByIds(ids: string[]): Promise<TwitchUser[]> {
  if (ids.length === 0) return []
  // `GET /users` takes repeated `id` params (max 100), which the record-based
  // `helixUrl` can't express — build the query string directly.
  const qs = ids.slice(0, 100).map((id) => `id=${encodeURIComponent(id)}`).join('&')
  const { data } = await helixGet<TwitchUser>(`/api/plugins/twitch/helix/users?${qs}`)
  return data
}
export async function getChannelVideos(userId: string) {
  const { data } = await helixGet<TwitchVideo>(helixUrl('videos', { user_id: userId, first: 20, type: 'archive' }))
  return data
}
export async function getChannelClips(broadcasterId: string) {
  const { data } = await helixGet<TwitchClip>(helixUrl('clips', { broadcaster_id: broadcasterId, first: 20 }))
  return data
}
