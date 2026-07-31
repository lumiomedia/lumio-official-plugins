import type { TwitchStream, TwitchCategory, TwitchVideo, TwitchClip } from './twitch-types'

export function helixUrl(path: string, params: Record<string, string | number | undefined> = {}): string {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')
  return `/api/plugins/twitch/helix/${path}${qs ? `?${qs}` : ''}`
}

export function thumb(url: string, w: number, h: number): string {
  return url.replace('{width}', String(w)).replace('%{width}', String(w))
    .replace('{height}', String(h)).replace('%{height}', String(h))
}

async function helixGet<T>(url: string, userToken?: string): Promise<{ data: T[]; cursor: string | null }> {
  const headers: Record<string, string> = {}
  if (userToken) headers['x-twitch-user-token'] = userToken
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`Twitch request failed (${res.status})`)
  const json = await res.json() as { data?: T[]; pagination?: { cursor?: string } }
  return { data: json.data ?? [], cursor: json.pagination?.cursor ?? null }
}

export async function getTopStreams(cursor?: string) {
  const { data, cursor: next } = await helixGet<TwitchStream>(helixUrl('streams', { first: 30, after: cursor }))
  return { streams: data, cursor: next }
}
export async function getStreamsByGame(gameId: string, cursor?: string) {
  const { data, cursor: next } = await helixGet<TwitchStream>(helixUrl('streams', { game_id: gameId, first: 30, after: cursor }))
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
export async function searchChannels(query: string) {
  const { data } = await helixGet<TwitchStream>(helixUrl('search/channels', { query, first: 20, live_only: 'true' }))
  return data
}
export async function searchCategories(query: string) {
  const { data } = await helixGet<TwitchCategory>(helixUrl('search/categories', { query, first: 20 }))
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
