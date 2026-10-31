/**
 * FJÄRRENS KNAPPAR (Jerry 2026-10-31, #1 på önskelistan). Användaren väljer vad
 * varje knapp gör i Live TV — kort tryck och håll. Allt utom mediaknapparna når
 * webbvyn som vanliga tangenttryck (MainActivity släpper igenom dem), så
 * mappningen bor helt i pluginet. Mediaknapparna (spola, nästa, föregående)
 * kommer via värdens `lumio-media-key` utan keyup — där finns bara kort tryck.
 *
 * Pilarna kan bara få ett HÅLL, och bara medan en kanal spelas: deras korta
 * tryck är navigeringen. Siffrorna, kanal upp/ner, OK och Bakåt är fasta.
 *
 * Knappar som inte finns i förvalen lärs in ("Lägg till en knapp"): id:t är
 * `KeyboardEvent.key`, eller `code:<keyCode>` när webbvyn inte känner igen
 * knappen (`Unidentified`).
 */

export type RemoteAction =
  | 'none' | 'lastChannel' | 'guide' | 'miniGuide' | 'menu' | 'info' | 'favourite'
  | 'multiview' | 'playPause' | 'channelUp' | 'channelDown' | 'search' | 'voiceSearch' | 'favourites' | 'sport' | 'home'

/** I den ordning åtgärderna visas i väljaren. */
export const REMOTE_ACTIONS: readonly RemoteAction[] = [
  'none', 'lastChannel', 'guide', 'miniGuide', 'menu', 'info', 'favourite', 'multiview',
  'playPause', 'channelUp', 'channelDown', 'search', 'voiceSearch', 'favourites', 'sport', 'home',
]

export interface RemoteBinding { key: string; short: RemoteAction; long: RemoteAction }

export const DPAD_REMOTE_KEYS: readonly string[] = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
export const MEDIA_REMOTE_KEYS: readonly string[] = ['media:rewind', 'media:fastforward', 'media:next', 'media:previous']

/** Knapparna som alltid visas i inställningarna, i den ordningen. */
export const PRESET_REMOTE_KEYS: readonly string[] = [
  'ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue',
  'Info', 'Guide', 'ContextMenu', 'MediaLast', 'BrowserSearch',
  ...MEDIA_REMOTE_KEYS,
  ...DPAD_REMOTE_KEYS,
]

const DEFAULT_SHORT: Partial<Record<string, RemoteAction>> = {
  Info: 'info',
  Guide: 'guide',
  ContextMenu: 'menu',
  MediaLast: 'lastChannel',
  // Fjärrens Sök-knapp (MainActivity skickar den som BrowserSearch).
  BrowserSearch: 'voiceSearch',
  // Dagens beteende i spelaren (live-tv-player.tsx): nästa/föregående zappar.
  'media:next': 'channelUp',
  'media:previous': 'channelDown',
}

export const DEFAULT_REMOTE_BINDINGS: RemoteBinding[] = PRESET_REMOTE_KEYS.map((key) => ({ key, short: DEFAULT_SHORT[key] ?? 'none', long: 'none' }))

const RESERVED = new Set([
  'Enter', ' ', 'Escape', 'Backspace', 'GoBack', 'Tab', 'Shift', 'Control', 'Alt', 'Meta',
  'ChannelUp', 'ChannelDown', 'PageUp', 'PageDown',
  ...DPAD_REMOTE_KEYS,
  // Värden gör om dessa till `lumio-media-key` (android-media-keys.ts).
  'MediaPlayPause', 'MediaPlay', 'MediaPause', 'MediaStop', 'MediaTrackNext', 'MediaTrackPrevious', 'MediaRewind', 'MediaFastForward',
  'AudioVolumeUp', 'AudioVolumeDown', 'AudioVolumeMute',
])

/** Knappar som aldrig går att lära in: navigering, OK, Bakåt, siffror (zapp), kanal upp/ner. */
export function isReservedRemoteKey(key: string): boolean {
  return RESERVED.has(key) || /^[0-9]$/.test(key)
}

/** Knappens id ur ett tangenttryck; `null` när varken key eller keyCode säger något. */
export function remoteKeyId(event: { key: string; keyCode?: number }): string | null {
  if (event.key && event.key !== 'Unidentified') return event.key
  return event.keyCode ? `code:${event.keyCode}` : null
}

const isAction = (value: unknown): value is RemoteAction => typeof value === 'string' && (REMOTE_ACTIONS as readonly string[]).includes(value)
const MAX_LEARNED = 20

function normalise(b: RemoteBinding): RemoteBinding {
  if (DPAD_REMOTE_KEYS.includes(b.key)) return { ...b, short: 'none' }
  if (MEDIA_REMOTE_KEYS.includes(b.key)) return { ...b, long: 'none' }
  return b
}

/** Förvalen i fast ordning (sparade val ovanpå), sedan giltiga inlärda knappar. */
export function sanitizeRemoteBindings(raw: unknown): RemoteBinding[] {
  const stored = new Map<string, RemoteBinding>()
  const learned: RemoteBinding[] = []
  for (const entry of Array.isArray(raw) ? raw : []) {
    if (!entry || typeof entry !== 'object') continue
    const e = entry as { key?: unknown; short?: unknown; long?: unknown }
    if (typeof e.key !== 'string' || !e.key || stored.has(e.key)) continue
    const b = { key: e.key, short: isAction(e.short) ? e.short : 'none', long: isAction(e.long) ? e.long : 'none' } satisfies RemoteBinding
    stored.set(e.key, b)
    if (!PRESET_REMOTE_KEYS.includes(e.key) && !isReservedRemoteKey(e.key) && learned.length < MAX_LEARNED) learned.push(b)
  }
  const presets = DEFAULT_REMOTE_BINDINGS.map((d) => normalise(stored.get(d.key) ?? d))
  return [...presets, ...learned]
}

export function setRemoteBinding(list: readonly RemoteBinding[], key: string, slot: 'short' | 'long', action: RemoteAction): RemoteBinding[] {
  return list.map((b) => (b.key === key ? normalise({ ...b, [slot]: action }) : b))
}

export function addLearnedKey(list: readonly RemoteBinding[], key: string): RemoteBinding[] {
  if (isReservedRemoteKey(key) || list.some((b) => b.key === key)) return [...list]
  return [...list, { key, short: 'none', long: 'none' }]
}

/** Bara inlärda knappar tas bort; ett förval nollställs i stället med `setRemoteBinding`. */
export function removeLearnedKey(list: readonly RemoteBinding[], key: string): RemoteBinding[] {
  return PRESET_REMOTE_KEYS.includes(key) ? [...list] : list.filter((b) => b.key !== key)
}

/**
 * Kort tryck mot håll. Android-fjärrar skickar en hållen knapp som flera
 * keydown UTAN repeat-flagga (uppmätt 2026-10-14), så varje keydown för samma
 * knapp medan den är nere räknas som upprepning. Håll löser ut på timern —
 * eller på en upprepning när timern hunnit gå (strypta timers i en upptagen
 * webbvy).
 *
 * `passFirst` (pilarna): första trycket släpps igenom som navigering, bara
 * upprepningarna sväljs.
 */
export function createRemoteHold({ holdMs, fire, now = () => Date.now() }: { holdMs: number; fire: (action: RemoteAction) => void; now?: () => number }) {
  let held: { key: string; binding: RemoteBinding; at: number; fired: boolean; timer: ReturnType<typeof setTimeout> } | null = null
  const reset = () => { if (held) clearTimeout(held.timer); held = null }
  const fireLong = () => {
    if (!held || held.fired) return
    held.fired = true
    fire(held.binding.long)
  }
  return {
    down(key: string, binding: RemoteBinding, opts?: { passFirst?: boolean }): 'pass' | 'swallow' {
      if (held && held.key === key) {
        if (!held.fired && now() - held.at >= holdMs) fireLong()
        return 'swallow'
      }
      reset()
      if (binding.long === 'none') {
        if (binding.short === 'none' || opts?.passFirst) return 'pass'
        fire(binding.short)
        return 'swallow'
      }
      held = { key, binding, at: now(), fired: false, timer: setTimeout(fireLong, holdMs) }
      return opts?.passFirst ? 'pass' : 'swallow'
    },
    /** `true` när släppet hörde till ett pågående håll (och ska sväljas). */
    up(key: string): boolean {
      if (!held || held.key !== key) return false
      const { fired, binding } = held
      reset()
      if (!fired && binding.short !== 'none' && !DPAD_REMOTE_KEYS.includes(key)) fire(binding.short)
      return true
    },
    reset,
  }
}
