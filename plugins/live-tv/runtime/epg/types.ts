export interface EpgProgramme {
  title: string
  description?: string
  start: number
  stop: number
}

export interface EpgCacheEntry {
  index: Record<string, EpgProgramme[]>
  fetchedAt: number
  sources: string[]
}

export interface NowNextLater {
  now: EpgProgramme | null
  next: EpgProgramme | null
  later: EpgProgramme | null
}

export type EpgLoadStatus = 'idle' | 'loading' | 'empty' | 'ready' | 'error'
