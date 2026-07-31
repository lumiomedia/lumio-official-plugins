export interface TwitchStream {
  id: string
  user_id: string
  user_login: string
  user_name: string
  game_id: string
  game_name: string
  title: string
  viewer_count: number
  thumbnail_url: string
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
