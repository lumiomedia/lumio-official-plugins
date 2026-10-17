/**
 * TV-lägets mått och fokus, enligt appens TV-kontrakt (spa/src/index.css):
 *
 * - Layout: skrivbordets px gånger `--tv-u` (appens TV-enhet, 1,54 designpx
 *   vid 100 % och gånger gränssnittsskalan). Råa px blev fasta, små mått i
 *   1920-scenen medan texten (rem) växte — tablåblocken klipptes av texten.
 * - Typografi: appens tokens `--st-label|small|body|h3|h2|h1` (TV-värden under
 *   [data-tv="1"]), aldrig ett numeriskt fontSize (React gör det till px).
 * - Fokus: vyns `data-init` får fokus när vyn öppnas, via värdens motor
 *   (`useTvFocus().focusInit`) och en kort självhävdande slinga som live-tv:s
 *   spelarkrom — värden flyttar fokus sent när en sida monteras.
 */
import { useEffect, type RefObject } from 'react'
import { useTvFocus } from '@/lib/tv-focus'

/** n designpx i appens TV-enhet. */
export const tvu = (n: number): string => `calc(${n} * var(--tv-u, 1px))`

/** Layoutmått: px på skrivbord/mobil, TV-enheter på TV (`tvPx` om TV vill ha ett eget tal). */
export const dim = (px: number, tv: boolean, tvPx: number = px): number | string => (tv ? tvu(tvPx) : px)

/** Som `dim` men alltid en sträng (för sammansatta värden som padding). */
export const dimS = (px: number, tv: boolean, tvPx: number = px): string => (tv ? tvu(tvPx) : `${px}px`)

export type TypeRole = 'micro' | 'label' | 'small' | 'body' | 'h3' | 'h2' | 'h1'

/** Appens TV-tal per token (i --tv-u), för reserven om en värd saknar variabeln. */
const TV_TYPE_U: Record<TypeRole, number> = { micro: 12, label: 13, small: 15.5, body: 16, h3: 20, h2: 23, h1: 32 }

/** Skrivbordsstorleken → appens typografiroll (samma trappa som appens skrivbordstokens). */
export function typeRole(px: number): TypeRole {
  if (px <= 10) return 'micro'
  if (px <= 11.5) return 'label'
  if (px <= 13) return 'small'
  if (px <= 15) return 'body'
  if (px <= 17) return 'h3'
  if (px <= 22) return 'h2'
  return 'h1'
}

/** Textstorlek: px på skrivbord/mobil, appens typografitoken på TV. */
export function typeSize(px: number, tv: boolean, role?: TypeRole): string {
  if (!tv) return `${px}px`
  const r = role ?? typeRole(px)
  return `var(--st-${r}, ${tvu(TV_TYPE_U[r])})`
}

/**
 * Herons titel på TV: appens TV-hero (text-4xl = 2.25rem), rem så att
 * textstorleken i TV-inställningarna följer med.
 */
export const TV_HERO_TITLE = '2.25rem'

/** Appens TV-innehållslinje (TV_CONTENT_LEFT_PX i appens lib/tv-metrics.ts): herons text och radrubriker. */
// Jerry 2026-10-17: samma marginal på båda sidor (60), inte appens 100-linje.
export const TV_CONTENT_LEFT = 60
/** Högermarginalen på TV-sidor. */
export const TV_CONTENT_RIGHT = 60

/**
 * Herons knappar som appens heroknappar (h-10, px-6, text-sm), gånger
 * användarens knappstorlek (`--tv-button-scale`, satt av värden bara när den
 * avviker från 100 %).
 */
export function tvHeroButton(): { height: string; minHeight: string; padding: string; fontSize: string } {
  const k = 'var(--tv-button-scale, 1)'
  return {
    height: `calc(2.5rem * ${k})`,
    minHeight: `calc(2.5rem * ${k})`,
    padding: `0 calc(1.5rem * ${k})`,
    fontSize: `calc(0.875rem * ${k})`,
  }
}

// ── Fokus ──────────────────────────────────────────────────────────────────

const usable = (el: HTMLElement): boolean =>
  !(el as HTMLButtonElement).disabled && !el.closest('[aria-hidden="true"], [data-visible="0"]')

/** Startfokus i en vy: dess `data-init`, annars första användbara station. */
export function pickInitTarget(root: ParentNode): HTMLElement | null {
  const init = Array.from(root.querySelectorAll<HTMLElement>('[data-init]')).find(usable)
  if (init) return init
  return Array.from(root.querySelectorAll<HTMLElement>('[data-f]')).find(usable) ?? null
}

/** Hur länge vyn håller fast vid sitt startfokus om värden flyttar det sent. */
const ASSERT_MS = 900

/**
 * Sätter TV-fokus på vyns startstation när vyn öppnas (och när `key` byts).
 * Slingan ger upp vid första tangenttrycket — användaren styr därefter.
 */
export function useTvViewFocus(rootRef: RefObject<HTMLElement | null>, isTv: boolean, key: unknown = null): void {
  const api = useTvFocus()
  useEffect(() => {
    if (!isTv) return
    const root = rootRef.current
    if (!root) return
    let frame = 0
    let stopped = false
    const stop = () => { stopped = true }
    window.addEventListener('keydown', stop, true)
    const deadline = Date.now() + ASSERT_MS
    const place = () => {
      const target = pickInitTarget(root)
      if (target && document.activeElement !== target && !root.contains(document.activeElement)) target.focus({ preventScroll: false })
    }
    if (api?.focusInit && root.querySelector('[data-init]')) api.focusInit(root)
    place()
    const tick = () => {
      if (stopped || !root.isConnected) return
      place()
      if (Date.now() < deadline) frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('keydown', stop, true)
    }
  }, [isTv, key]) // eslint-disable-line react-hooks/exhaustive-deps
}

/** Fokus till en station efter att React tagit bort ett lager (aldrig kvar på body). */
export function refocusLater(find: () => HTMLElement | null | undefined): void {
  window.setTimeout(() => find()?.focus({ preventScroll: true }), 0)
}

/** En typografitoken direkt (TV-ytor som bara finns i TV-grenen). */
export const tvType = (role: TypeRole): string => typeSize(0, true, role)
