export interface EpgProgramme {
  title: string
  description?: string
  start: number
  stop: number
}

export interface EpgSourceChannel {
  id: string
  displayNames: string[]
}

export interface EpgSourceStat {
  url: string
  ok: boolean
  channelCount: number
  programmeCount: number
  channels: EpgSourceChannel[]
}

export interface EpgSourceFailure {
  url?: string
  error: string
}

export interface EpgCacheEntry {
  index: Record<string, EpgProgramme[]>
  fetchedAt: number
  sources: string[]
  requestedSources?: string[]
  sourceStats?: EpgSourceStat[]
  failures?: EpgSourceFailure[]
}

export interface NowNextLater {
  now: EpgProgramme | null
  next: EpgProgramme | null
  later: EpgProgramme | null
}

export type EpgLoadStatus = 'idle' | 'loading' | 'empty' | 'ready' | 'error'
