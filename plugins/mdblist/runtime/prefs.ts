export const PREF_KEYS = {
  scrobble: 'mdblist_scrobble_enabled',
  watched: 'mdblist_sync_watched_enabled',
  watchlist: 'mdblist_sync_watchlist_enabled',
} as const

export type PrefKind = keyof typeof PREF_KEYS

export interface Prefs {
  isOn(kind: PrefKind): boolean
  setOn(kind: PrefKind, on: boolean): void
}

/** Allt är av tills användaren slår på det (specen, "Vad som får gå till MDBList"). */
export function createPrefs(
  storage: { get(key: string): string | null; set(key: string, value: string): void },
  onChange: () => void,
): Prefs {
  return {
    isOn: (kind) => storage.get(PREF_KEYS[kind]) === '1',
    setOn: (kind, on) => {
      storage.set(PREF_KEYS[kind], on ? '1' : '0')
      onChange()
    },
  }
}
