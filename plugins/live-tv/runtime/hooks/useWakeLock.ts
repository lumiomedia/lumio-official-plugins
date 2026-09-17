import { useEffect } from 'react'

interface WakeLockSentinelLike {
  released?: boolean
  release(): Promise<void>
  addEventListener?(type: 'release', listener: () => void): void
  removeEventListener?(type: 'release', listener: () => void): void
}

interface WakeLockLike {
  request(type: 'screen'): Promise<WakeLockSentinelLike>
}

function wakeLockOf(): WakeLockLike | null {
  if (typeof navigator === 'undefined') return null
  const candidate = (navigator as Navigator & { wakeLock?: WakeLockLike }).wakeLock
  return candidate && typeof candidate.request === 'function' ? candidate : null
}

/**
 * Håller skärmen vaken medan `active` (telefonens spelare, inställningen
 * `keepAwake`).
 *
 * Systemet släpper låset själv när fliken göms eller skärmen släcks, och
 * ger det INTE tillbaka — därför återtas det på `visibilitychange → visible`.
 * Utan `navigator.wakeLock` (äldre WebKit, jsdom) gör hooken ingenting alls.
 *
 * `cancelled` skyddar mot kapplöpningen där `request()` löser upp EFTER att
 * effekten städats (active → false eller unmount): ett sådant sent lås
 * släpps direkt i stället för att bli hängande.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    const wakeLock = wakeLockOf()
    if (!wakeLock) return
    let cancelled = false
    let sentinel: WakeLockSentinelLike | null = null
    const onReleased = () => { sentinel = null }
    const acquire = async () => {
      if (cancelled || sentinel) return
      try {
        const next = await wakeLock.request('screen')
        if (cancelled) { void next.release().catch(() => {}); return }
        sentinel = next
        next.addEventListener?.('release', onReleased)
      } catch {
        // Nekas t.ex. när sidan ligger i bakgrunden eller batterisparläge
        // råder — då finns inget att hålla, och nästa synlighetsbyte försöker igen.
      }
    }
    const onVisibility = () => { if (document.visibilityState === 'visible') void acquire() }
    document.addEventListener('visibilitychange', onVisibility)
    void acquire()
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      const held = sentinel
      sentinel = null
      if (held) {
        held.removeEventListener?.('release', onReleased)
        void held.release().catch(() => {})
      }
    }
  }, [active])
}
