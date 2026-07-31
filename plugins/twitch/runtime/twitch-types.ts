export interface TwitchStream {
  id: string
  user_id: string
  user_login: string
  user_name: string
  game_id: string
  game_name: string
  title: string
  // Absent on rows normalized from `GET /search/channels`, which does not
  // report a viewer count. Consumers must guard before formatting/rendering.
  viewer_count?: number
  thumbnail_url: string
  // Only present on rows normalized from `GET /search/channels`.
  is_live?: boolean
}

// Raw shape returned by Helix `GET /search/channels`. It does NOT include
// user_id/user_login/user_name/viewer_count — those must be mapped from
// id/broadcaster_login/display_name, and viewer_count has no equivalent.
export interface TwitchSearchChannelRow {
  id: string
  broadcaster_login: string
  display_name: string
  game_id?: string
  game_name?: string
  title?: string
  thumbnail_url?: string
  is_live?: boolean
}

export interface TwitchCategory {
  id: string
  name: string
  box_art_url: string
}

export interface TwitchVideo {
  id: string
  title: string
  thumbnail_url: string
  url: string
  created_at: string
}

export interface TwitchClip {
  id: string
  title: string
  thumbnail_url: string
  embed_url: string
  broadcaster_id: string
}

export interface TwitchUser {
  id: string
  login: string
  display_name: string
  profile_image_url: string
}

// Raw shape returned by Helix `GET /channels/followed` (requires a user token
// with `user:read:follows`). Lists every channel the user follows, live or not.
export interface TwitchFollowedChannel {
  broadcaster_id: string
  broadcaster_login: string
  broadcaster_name: string
  followed_at: string
}

// A followed channel enriched for display: profile image from `GET /users`
// and a live flag cross-referenced against the followed live streams.
export interface EnrichedFollowedChannel {
  id: string
  login: string
  displayName: string
  profileImageUrl: string
  isLive: boolean
  gameName?: string
  title?: string
}
