// Test-only stub of @/lib/plugin-sdk. Mirrors the surface the live-tv plugin
// uses, with no real persistence. Spies should re-mock per test via vi.spyOn.

import { createElement, type ReactNode } from 'react'

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

export function writePluginJson<T>(pluginId: string, k: string, value: T, options?: { emitChange?: boolean }): void {
  memory.set(key(pluginId, k), value)
  if (options?.emitChange !== false) emitPluginStorageChanged(pluginId, k)
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

// Formprimitiverna som KOMPONENTER. Stubben är en .ts-fil, så de byggs med
// createElement i stället för JSX. De ritar riktig semantik och inte bara
// divar: testen letar efter roller ("button", "textbox") och etiketter, så en
// PillBtn som inte är ett <button> hade gjort sviten oanvändbar för allt som
// faktiskt klickas.
export function PillBtn({ children, onClick, disabled, type, title, style }: {
  children?: ReactNode
  onClick?: () => void
  variant?: string
  size?: string
  disabled?: boolean
  icon?: string
  type?: 'button' | 'submit'
  title?: string
  style?: Record<string, unknown>
}) {
  return createElement('button', { type: type ?? 'button', onClick, disabled, title, style }, children)
}

export function Card({ children, style }: { children?: ReactNode; padding?: number | string; style?: Record<string, unknown> }) {
  return createElement('div', { style }, children)
}

export function Section({ eyebrow, title, hint, children, action }: {
  eyebrow?: ReactNode
  title?: ReactNode
  hint?: ReactNode
  children?: ReactNode
  action?: ReactNode
}) {
  return createElement('section', null, eyebrow, title, hint, action, children)
}

export function Checkbox({ checked, onChange, disabled, label, hint, right }: {
  checked: boolean
  onChange?: (v: boolean) => void
  disabled?: boolean
  label?: ReactNode
  hint?: ReactNode
  right?: ReactNode
}) {
  return createElement(
    'label',
    null,
    createElement('input', {
      type: 'checkbox',
      checked,
      disabled,
      onChange: (event: { target: { checked: boolean } }) => onChange?.(event.target.checked),
    }),
    label,
    hint,
    right,
  )
}

// Formprimitiverna: sektionerna ritar med TOKENS/eyebrowStyle/inputStyle, och
// utan dem föll varje render på "Cannot read properties of undefined". Värdena
// speglar components/settings/redesigned/primitives.tsx i appen; testen bryr
// sig om att nycklarna FINNS, inte om exakta färger.
export const TOKENS = {
  bg: 'var(--tk-bg)',
  surface0: 'var(--tk-surface0)',
  surface1: 'var(--tk-surface1)',
  surface2: 'var(--tk-surface2)',
  surface3: 'var(--tk-surface3)',
  border: 'var(--tk-border)',
  borderStrong: 'var(--tk-border-strong)',
  text: '#EAEEF6',
  textDim: '#9AA5BC',
  textMute: '#6B7691',
  accent: '#7C8CFF',
  accentSoft: 'rgba(124,140,255,0.22)',
  mint: '#3CD6A3',
  orange: '#FF8B5A',
  red: '#FF5A6A',
  cyan: '#5FD3E8',
  warn: '#F3C969',
}

export const eyebrowStyle = { fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: TOKENS.textMute } as const
export const inputStyle = { width: '100%', minHeight: 44, borderRadius: 10, border: `1px solid ${TOKENS.border}` } as const
export const monoFont = 'ui-monospace, monospace'

export function playerFrameUrl(key: string, version?: number | string | null): string {
  const v = version == null ? '' : `&v=${encodeURIComponent(String(version))}`
  return `/api/player-frame?key=${encodeURIComponent(key)}${v}`
}

// Minnescachen speglar appens lib/plugin-storage.ts: en processglobal Map med
// nyckeln `${pluginId}:${key}`. Den var tidigare en no-op här, vilket dolde
// skillnaden mellan "cachen svarade" och "cachen är tom" — modellen (P3)
// lagrar kanallistan i den, så stubben måste minnas som värden gör.
const pluginMemoryCache = new Map<string, unknown>()

function pluginMemoryCacheKey(pluginId: string, key: string): string {
  return `${pluginId}:${key}`
}

export function clearPluginMemoryCacheByPrefix(pluginId: string, prefix: string): void {
  const full = `${pluginId}:${prefix}`
  for (const key of [...pluginMemoryCache.keys()]) {
    if (key.startsWith(full)) pluginMemoryCache.delete(key)
  }
}
export function setPluginMemoryCache<T>(pluginId: string, key: string, value: T): void {
  pluginMemoryCache.set(pluginMemoryCacheKey(pluginId, key), value)
}
export function getPluginMemoryCache<T>(pluginId: string, key: string): T | undefined {
  return pluginMemoryCache.get(pluginMemoryCacheKey(pluginId, key)) as T | undefined
}
/**
 * Raderar på riktigt, precis som värden gör.
 *
 * Var en no-op, vilket gjorde `storage-v2-migration`-testet blint: det kunde
 * bara kontrollera ATT funktionen anropades, inte att `channels:`-nycklarna
 * faktiskt försvann — själva poängen med migreringen.
 */
export function removePluginStorageByPrefix(pluginId: string, prefix: string, opts?: { emitChange?: boolean }): void {
  const full = key(pluginId, prefix)
  for (const stored of [...memory.keys()]) {
    if (!stored.startsWith(full)) continue
    memory.delete(stored)
    if (opts?.emitChange !== false) emitPluginStorageChanged(pluginId, stored.slice(`${pluginId}::`.length))
  }
}

// The host resolves t() against its own strings.en/strings.sv catalogue. Tests
// only need stable, readable output, so keys that assertions look for carry
// their English text here and everything else falls back to the key itself.
const TEST_STRINGS: Record<string, string> = {
  add: 'Add',
  remove: 'Remove',
  next: 'Next',
  liveTvNow: 'Now',
  liveTvLater: 'Later',
  liveTvNoEpg: 'No EPG',
  liveTvNoGuideAvailable: 'No guide available',
  liveTvNoEpgSourcesPrefix: 'No EPG sources yet.',
  liveTvEpgSources: 'EPG sources',
  liveTvEpgSourceStats: '{channels} channels · {programmes} programmes',
  liveTvRemaining: '{time} left',
}

export function useLang() {
  return {
    lang: 'en' as const,
    setLang: (_lang: 'en' | 'sv') => {},
    t: (key: string) => TEST_STRINGS[key] ?? key,
  }
}

// __resetForTests is convenient for tests that need a clean slate
export function __resetForTests(): void {
  memory.clear()
  listeners.clear()
  pluginMemoryCache.clear()
  pinForTests = null
}

// ---- Profil-PIN (föräldrakontroll) ----
// channel-locks.ts läser de här två DYNAMISKT ur SDK:n (de finns bara i appar
// från 0.1.57), så `pinSupportAvailable()` är sant här medan
// `activeProfileHasPin()` styrs av testet. Ingen PIN är satt som standard,
// vilket är precis vad en profil utan PIN ser.
let pinForTests: string | null = null
export function __setProfilePinForTests(pin: string | null): void {
  pinForTests = pin
}
export function activeProfileHasPin(): boolean {
  return pinForTests !== null
}
export async function verifyActiveProfilePin(pin: string): Promise<boolean> {
  return pinForTests !== null && pin === pinForTests
}

// Ytterligare SDK-yta som hubben och datalagret rör vid utan att testa den.
export function getPluginHttpAssetUrl(path: string, asset: string | null | undefined): string | null {
  return asset ? `${path}?src=${encodeURIComponent(asset)}` : null
}
export function isPluginImageLoaded(): boolean {
  return false
}
export async function preloadPluginImage(): Promise<void> {}
// Samma signatur som appens lib/plugin-storage.ts: pluginId är OBLIGATORISKT,
// nyckeln valfri (utan nyckel töms hela pluginets del av cachen).
export function clearPluginMemoryCache(pluginId: string, key?: string): void {
  if (!key) {
    clearPluginMemoryCacheByPrefix(pluginId, '')
    return
  }
  pluginMemoryCache.delete(pluginMemoryCacheKey(pluginId, key))
}
// ---- TV-läge ----
let tvModeForTests = false
export function __setTvModeForTests(on: boolean): void {
  tvModeForTests = on
}
export function useTvMode(): boolean {
  return tvModeForTests
}
export function detectTvMode(): boolean {
  return tvModeForTests
}
export const BROWSE_BACK_EVENT = 'lumio-browse-back'
export function requestBrowseBack(): void {
  window.dispatchEvent(new CustomEvent(BROWSE_BACK_EVENT))
}
export function onTvFocusEdge(_handler: (dir: string, meta?: { claimed: boolean; claim(): void }) => void): () => void {
  return () => {}
}

export const TV_HOLD_MS = 650
const holds = new WeakMap<EventTarget, { timer: number; fired: boolean }>()
export function tvHoldHandlers(
  onShort: () => void,
  onHold: (element: HTMLElement) => void,
): { onKeyDown: (event: { key: string; repeat: boolean; currentTarget: EventTarget | null; preventDefault(): void }) => void; onKeyUp: (event: { key: string; currentTarget: EventTarget | null }) => void } {
  return {
    onKeyDown: (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      if (event.repeat || !event.currentTarget) return
      const hold = { timer: 0, fired: false }
      const element = event.currentTarget as HTMLElement
      hold.timer = window.setTimeout(() => {
        hold.fired = true
        onHold(element)
      }, TV_HOLD_MS)
      holds.set(event.currentTarget, hold)
    },
    onKeyUp: (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      if (!event.currentTarget) return
      const hold = holds.get(event.currentTarget)
      if (!hold) return
      window.clearTimeout(hold.timer)
      holds.delete(event.currentTarget)
      if (!hold.fired) onShort()
    },
  }
}

/**
 * HÅLL OK MED PEKARE — en RIKTIG kopia av appens `lib/tv-hold.ts`
 * (`tvPointerHoldHandlers`, A4), inte en attrapp: pluginets tester ska testa
 * BETEENDET. Ändras appens variant ska den här följa med, annars testar vi
 * något som inte finns i produkten.
 *
 * Samma `TV_HOLD_MS` och samma modul-`WeakMap` som `tvHoldHandlers` ovan:
 * en station kan aldrig hållas med tangent och pekare samtidigt, och en delad
 * karta gör att ett avbrott i den ena vägen städar den andra.
 */
export interface TvPointerEvent {
  pointerType?: string
  button?: number
  target?: EventTarget | null
  currentTarget: EventTarget | null
  preventDefault(): void
  stopPropagation?(): void
}

/**
 * Ett fyrat håll ska svälja det click som pekaruppsläppet skickar.
 *
 * Flaggan ligger PER ELEMENT på modulnivå, inte i handlarobjektets closure.
 * `station()` bygger nya handlare vid varje rendering, och `onHold` öppnar en
 * meny — alltså kommer en omrendering MELLAN `pointerup` och `click`, och en
 * closure-flagga hade varit borta när `onClickCapture` läste den. Då hade både
 * menyn och OK körts. Appens `lib/tv-hold.ts` (6def2de) har flaggan i en
 * closure och behöver rättas på samma sätt.
 */
const pointerHoldSuppressed = new WeakMap<EventTarget, number>()
/**
 * Undertryckningen släpper efter en bildruta. Utan den hade ett håll som
 * ALDRIG följs av ett klick (fingret lyfts utanför elementet) spärrat nästa
 * klick på samma station för alltid.
 */
const CLICK_SUPPRESS_MS = 16

function suppressNextClick(element: EventTarget): void {
  const running = pointerHoldSuppressed.get(element)
  if (running !== undefined) window.clearTimeout(running)
  pointerHoldSuppressed.set(element, window.setTimeout(() => pointerHoldSuppressed.delete(element), CLICK_SUPPRESS_MS))
}

function releaseClickSuppression(element: EventTarget): void {
  const running = pointerHoldSuppressed.get(element)
  if (running !== undefined) window.clearTimeout(running)
  pointerHoldSuppressed.delete(element)
}

function isTextEntryTarget(node: EventTarget | null | undefined): boolean {
  let el: Element | null = node instanceof Element ? node : null
  while (el) {
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return true
    const editable = el.getAttribute('contenteditable')
    if (editable !== null && editable !== 'false') return true
    el = el.parentElement
  }
  return false
}

export function tvPointerHoldHandlers(
  onShort: () => void,
  onHold: (element: HTMLElement) => void,
): {
  onPointerDown: (event: TvPointerEvent) => void
  onPointerUp: (event: TvPointerEvent) => void
  onPointerCancel: (event: TvPointerEvent) => void
  onPointerLeave: (event: TvPointerEvent) => void
  onContextMenu: (event: TvPointerEvent) => void
  onClickCapture: (event: TvPointerEvent) => void
} {
  // onShort ingår i signaturen för symmetri med tvHoldHandlers, men anropas
  // ALDRIG härifrån: det korta trycket når onOk via elementets vanliga
  // onClick. Ropa inte på den här — då fyras OK två gånger.
  void onShort
  const abort = (event: TvPointerEvent) => {
    const target = event.currentTarget
    if (!target) return
    const hold = holds.get(target)
    if (!hold) return
    window.clearTimeout(hold.timer)
    holds.delete(target)
  }
  return {
    onPointerDown: (event) => {
      const target = event.currentTarget
      if (!target) return
      // Bara vänsterknapp. Högerklicket har sin egen väg (onContextMenu).
      if (event.button !== undefined && event.button !== 0) return
      const previous = holds.get(target)
      if (previous) window.clearTimeout(previous.timer)
      const hold = { timer: 0, fired: false }
      const element = target as HTMLElement
      hold.timer = window.setTimeout(() => {
        hold.fired = true
        // Spärras redan här, inte bara vid uppsläppet: lyfts fingret utanför
        // elementet kommer inget pointerup, men webbläsaren kan ändå skicka
        // ett click. Fönstret startas om vid uppsläppet nedan, så ett LÅNGT
        // håll (två sekunder) inte hinner släppa spärren före klicket.
        suppressNextClick(element)
        onHold(element)
      }, TV_HOLD_MS)
      holds.set(target, hold)
    },
    onPointerUp: (event) => {
      const target = event.currentTarget
      const fired = target ? holds.get(target)?.fired === true : false
      abort(event)
      // Starta om spärrfönstret precis före det click som följer.
      if (target && fired) suppressNextClick(target)
    },
    onPointerCancel: abort,
    onPointerLeave: abort,
    onContextMenu: (event) => {
      // Undantag: i ett textfält ska systemmenyn (klistra in, stavning) fram.
      if (isTextEntryTarget(event.target)) return
      event.preventDefault()
      const target = event.currentTarget
      if (!target) return
      abort(event)
      onHold(target as HTMLElement)
    },
    onClickCapture: (event) => {
      const target = event.currentTarget
      if (!target || !pointerHoldSuppressed.has(target)) return
      releaseClickSuppression(target)
      event.preventDefault()
      event.stopPropagation?.()
    },
  }
}

export interface TvGlassMenuAction { key: string; label: string; run: () => void }
export interface TvGlassMenuTarget { title: string; element: HTMLElement; actions: TvGlassMenuAction[] }
function TvGlassMenuStub({ target, onClose }: { target: TvGlassMenuTarget; onClose: () => void }) {
  return createElement(
    'div',
    { role: 'menu', 'data-panel-root': '', 'data-testid': 'tv-glass-menu' },
    createElement('div', null, target.title),
    ...target.actions.map((action, index) =>
      createElement('button', {
        key: action.key,
        type: 'button',
        'data-f': '',
        ...(index === 0 ? { 'data-init': '' } : {}),
        onClick: () => { action.run(); onClose() },
      }, action.label),
    ),
  )
}
export function getTvGlassMenu(): typeof TvGlassMenuStub | null {
  return TvGlassMenuStub
}
// Värdens TV-tangentbord. Testet skriver i `tv-keyboard-input` och trycker
// Done — utan ett fält kunde ingen text matas in alls, och varje "lägg till
// URL"-väg såg ut att lyckas med tom sträng (dvs. gjorde ingenting).
function TvKeyboardPanelStub({ title, initial, onDone, onClose }: { title: string; initial: string; onDone: (value: string) => void; onClose: () => void; hint?: string; placeholder?: string }) {
  let value = initial
  return createElement(
    'div',
    { role: 'dialog', 'data-panel-root': '', 'data-testid': 'tv-keyboard-panel' },
    createElement('div', null, title),
    createElement('input', {
      'data-testid': 'tv-keyboard-input',
      defaultValue: initial,
      onChange: (event: { target: { value: string } }) => { value = event.target.value },
    }),
    // Klar anropar BÅDE onDone och onClose — precis som värdens panel gör
    // (components/tv/tv-settings-rows.tsx: `onDone(value.trim()); onClose()`,
    // både på Klar-tangenten och på Enter i systemtangentbordet). Stubben
    // ropade bara onDone, och därför gick en KEDJA av prompts (Xtream:
    // server → användarnamn → lösenord) igenom i testet men aldrig på en
    // riktig TV: värdens onClose stängde det steg som onDone just öppnat.
    createElement('button', { type: 'button', 'data-f': '', 'data-init': '', onClick: () => { onDone(value); onClose() } }, 'Done'),
    createElement('button', { type: 'button', 'data-f': '', onClick: onClose }, 'Close'),
  )
}
export function getTvKeyboardPanel(): typeof TvKeyboardPanelStub | null {
  return TvKeyboardPanelStub
}

// ---- Motorer (ingen riktig uppspelning i test) ----
export const isTauriEnv = false
export const isDesktopTauriEnv = false
export const isAndroidTauriEnv = false
export const surfaceCalls: string[] = []
export async function openMpvPlayer(args: { url: string }): Promise<void> { surfaceCalls.push(`mpv:open:${args.url}`) }
export async function closeMpvPlayer(): Promise<void> { surfaceCalls.push('mpv:close') }
export function mpvSetBounds(_rect: { left: number; top: number; width: number; height: number }): void { surfaceCalls.push('mpv:bounds') }
export async function mpvSetPropertyStrings(props: Array<{ name: string; value: string }>): Promise<void> { surfaceCalls.push(`mpv:prop:${props.map((p) => `${p.name}=${p.value}`).join(',')}`) }
export async function setMpvPause(paused: boolean): Promise<void> { surfaceCalls.push(`mpv:pause:${paused}`) }
export async function openNativePlayer(opts: { url: string; mimeType?: string }): Promise<void> { surfaceCalls.push(`droid:open:${opts.url}`) }
export async function closeNativePlayer(): Promise<void> { surfaceCalls.push('droid:close') }
export function nativeSetBounds(_rect: { left: number; top: number; width: number; height: number }): void { surfaceCalls.push('droid:bounds') }
export async function capturePlayerFrame(_key: string, _video?: HTMLVideoElement | null): Promise<boolean> { return false }
export function getHls(): null { return null }
export function getControlsHideAfterSeconds(): number { return 3 }
export function lockBodyScroll(): void {}
export function unlockBodyScroll(): void {}
