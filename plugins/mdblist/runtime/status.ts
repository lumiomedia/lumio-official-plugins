export interface StatusState {
  connection: 'none' | 'checking' | 'ok' | 'bad-key' | 'offline'
  username: string | null
  supporter: boolean
  /** Kontot enligt `/user` — synkens snapshot är bunden till det. */
  accountKey: string | null
  lastSyncAt: number | null
  lastChanges: number
  pausedUntil: number
  syncing: boolean
}

export function createStatus(initial?: Partial<StatusState>) {
  let state: StatusState = {
    connection: 'none', username: null, supporter: false, accountKey: null, lastSyncAt: null, lastChanges: 0, pausedUntil: 0, syncing: false,
    ...initial,
  }
  const listeners = new Set<() => void>()
  return {
    get: () => state,
    set(patch: Partial<StatusState>) {
      state = { ...state, ...patch }
      for (const listener of listeners) listener()
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
  }
}

export type Status = ReturnType<typeof createStatus>
