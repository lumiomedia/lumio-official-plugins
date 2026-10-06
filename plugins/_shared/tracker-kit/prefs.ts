export type PrefKind = 'scrobble' | 'watched' | 'watchlist'

/** Reglagens lagringsnycklar för ett plugin: `<prefix>_scrobble_enabled` osv. */
export function prefKeys(prefix: string): Record<PrefKind, string> {
  return {
    scrobble: `${prefix}_scrobble_enabled`,
    watched: `${prefix}_sync_watched_enabled`,
    watchlist: `${prefix}_sync_watchlist_enabled`,
  }
}

export interface Prefs {
  isOn(kind: PrefKind): boolean
  setOn(kind: PrefKind, on: boolean): void
}

/** Allt är av tills användaren slår på det (specen, "Vad som får gå till MDBList"). */
export function createPrefs(
  storage: { get(key: string): string | null; set(key: string, value: string): void },
  onChange: () => void,
  prefix: string,
): Prefs {
  const keys = prefKeys(prefix)
  return {
    isOn: (kind) => storage.get(keys[kind]) === '1',
    setOn: (kind, on) => {
      storage.set(keys[kind], on ? '1' : '0')
      onChange()
    },
  }
}
