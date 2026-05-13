// Test-only stub of @/lib/plugin-sdk. Mirrors the surface the live-tv plugin
// uses, with no real persistence. Spies should re-mock per test via vi.spyOn.

type Listener = () => void

const memory = new Map<string, unknown>()
const listeners = new Map<string, Set<Listener>>()

function key(pluginId: string, k: string): string {
  return `${pluginId}::${k}`
}

export function readPluginJson<T>(pluginId: string, k: string, fallback: T): T {
  const value = memory.get(key(pluginId, k))
  return (value as T) ?? fallback
}

export function writePluginJson<T>(pluginId: string, k: string, value: T): void {
  memory.set(key(pluginId, k), value)
}

export function emitPluginStorageChanged(pluginId: string, k: string): void {
  const set = listeners.get(key(pluginId, k))
  if (set) for (const cb of set) cb()
}

export function onPluginStorageChanged(pluginId: string, k: string, cb: Listener): () => void {
  const id = key(pluginId, k)
  let set = listeners.get(id)
  if (!set) {
    set = new Set()
    listeners.set(id, set)
  }
  set.add(cb)
  return () => set!.delete(cb)
}

export function clearPluginMemoryCacheByPrefix(_pluginId: string, _prefix: string): void {}
export function setPluginMemoryCache<T>(_pluginId: string, _k: string, _v: T): void {}
export function getPluginMemoryCache<T>(_pluginId: string, _k: string): T | undefined { return undefined }
export function removePluginStorageByPrefix(_pluginId: string, _prefix: string, _opts?: { emitChange?: boolean }): void {}

// __resetForTests is convenient for tests that need a clean slate
export function __resetForTests(): void {
  memory.clear()
  listeners.clear()
}
