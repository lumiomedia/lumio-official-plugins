export interface YouTubeChannel {
  id: string
  title: string
  description?: string
  thumbnailUrl?: string | null
  subscriberCount?: number | null
  videoCount?: number | null
  subscriptionId?: string | null
}

export interface YouTubePlaylist {
  id: string
  title: string
  description?: string
  thumbnailUrl?: string | null
  itemCount?: number | null
  channelTitle?: string | null
}

export interface YouTubeVideo {
  id: string
  title: string
  description?: string
  thumbnailUrl?: string | null
  channelId?: string | null
  channelTitle?: string | null
  publishedAt?: string | null
  playlistItemId?: string | null
  durationSeconds?: number | null
  isShort?: boolean | null
}

export interface YouTubeSession {
  accessToken: string
  expiresAt: number
  scope: string
  channelId: string
  channelTitle: string
  channelThumbnailUrl?: string | null
  uploadsPlaylistId?: string | null
  likesPlaylistId?: string | null
  watchLaterPlaylistId?: string | null
}

export interface YouTubePluginSettings {
  clientId: string
  apiKey: string
  hideShorts: boolean
  homeRows: {
    following: boolean
    watchLater: boolean
    playlists: boolean
  }
}
