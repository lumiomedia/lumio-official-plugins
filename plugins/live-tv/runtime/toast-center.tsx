'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { onTvFocusEdge, useTvMode } from '@/lib/plugin-sdk'
import { playingChannel } from './sport/goal-alerts'

/*
  NOTISERNA I APPEN (mål och avspark) — användbara med fjärren (Jerry
  2026-10-12: målnotisen gick inte att nå på TV).

  · En stapel nere till höger, nyast överst; varje notis har Titta (om det
    finns något att titta på) och Stäng, båda fokusstopp.
  · TV: när en notis dyker upp flyttas fokus till dess Titta (annars Stäng) —
    UTOM när ett textfält har fokus, spelaren är öppen eller ett annat lager
    (en panel) har fokus. Då nås notisen med ▸ eller ▾ vid kanten av det som
    har fokus (motorns kanttryck; bara om ingen annan tagit trycket).
  · Bakåt/Esc med fokus i notisen stänger den och lämnar tillbaka fokus dit
    det stod innan. Försvinner notisen av sig själv (tidsgränsen) med fokus i
    sig går fokus också tillbaka.
  · Stapeln är en fokusfälla (`data-panel-root`) BARA medan fokus står i den —
    annars hade en synlig notis stulit pilarna från sidan.
  · Skrivbord: riktiga knappar, nåbara med Tab. Telefon: som förut (inget
    fokusflytt; där trycker man).
*/

export interface Toast {
  id: string
  kicker?: string
  title: string
  body?: string | null
  watchLabel?: string
  onWatch?: () => void
  dismissLabel: string
  timeoutMs: number
  /** Ett aktivt Stäng (knappen eller Bakåt), aldrig tidsgränsen eller Titta. Soffläge stänger då målet på telefonerna också. */
  onDismiss?: () => void
  /** `goal`: måltoasten (handoff 2a) — märke, korall överrad, knapparna under texten och en nedräkningslinje. Samma stapel. */
  look?: 'goal'
  /** Märkets text (lagets förkortning) i målutseendet. */
  badge?: string
  /** Sätts av `pushToast`: när notisen försvinner av sig själv. */
  expiresAt?: number
}

type Listener = () => void
let toasts: Toast[] = []
const listeners = new Set<Listener>()
const emit = () => { for (const l of [...listeners]) l() }
let seq = 0

export function pushToast(t: Omit<Toast, 'id'>): string {
  const id = `t${++seq}`
  toasts = [{ ...t, id, expiresAt: Date.now() + t.timeoutMs }, ...toasts]
  emit()
  return id
}
export function dismissToast(id: string): void {
  if (!toasts.some((t) => t.id === id)) return
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}
/** Synlig notis? Sportens lager släpper då ▸/▾ vid kanten, så att notisen går att nå. */
export function hasToasts(): boolean { return toasts.length > 0 }
export function __resetToastsForTests(): void { toasts = []; seq = 0; emit() }

function useToasts(): Toast[] {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb) } }, () => toasts, () => toasts)
}

const BACK_KEYS = new Set(['Escape', 'Backspace', 'GoBack', 'BrowserBack'])
const ACC = 'rgb(var(--accent-500, 244 132 95))'
const TINT = `color-mix(in srgb, ${ACC} 18%, transparent)`
/** Handoff 2a: MÅL! och nedräkningslinjen. */
const GOAL_CORAL = '#f4845f'
/** Samma fokusspråk som Sport: ton + kant innanför; accentknappen får vit kant och ljusning. */
const TOAST_CSS = `
@keyframes lt-toast-countdown { from { transform: scaleX(1); } to { transform: scaleX(0); } }
[data-lt-toasts] [data-toast-btn] { transition: box-shadow 120ms ease-out, background-image 120ms ease-out; outline: none; }
[data-lt-toasts] [data-toast-btn]:focus-visible, [data-lt-toasts] [data-toast-btn][data-fcur="1"], :root[data-tv="1"] [data-lt-toasts] [data-toast-btn]:focus { box-shadow: inset 0 0 0 2px ${ACC} !important; background-image: linear-gradient(${TINT}, ${TINT}) !important; outline: none !important; }
[data-lt-toasts] [data-toast-btn="watch"]:focus-visible, [data-lt-toasts] [data-toast-btn="watch"][data-fcur="1"], :root[data-tv="1"] [data-lt-toasts] [data-toast-btn="watch"]:focus { box-shadow: inset 0 0 0 3px rgba(255,255,255,0.92) !important; background-image: linear-gradient(rgba(255,255,255,0.14), rgba(255,255,255,0.14)) !important; }
`

function isTvRoot(): boolean {
  return typeof document !== 'undefined' && document.documentElement.getAttribute('data-tv') === '1'
}

/** Får notisen ta fokus nu? Inte från ett textfält, en öppen spelare eller ett annat lager. */
export function mayTakeFocus(active: Element | null): boolean {
  if (playingChannel()) return false
  if (!active || active === document.body) return true
  const el = active as HTMLElement
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable) return false
  if (el.closest('[data-panel-root], [data-live-tv-layer]')) return false
  return true
}

export function ToastCenter() {
  const list = useToasts()
  const tv = useTvMode() || isTvRoot()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const restoreRef = useRef<HTMLElement | null>(null)
  const [inside, setInside] = useState(false)
  const listRef = useRef(list)
  useEffect(() => { listRef.current = list })
  const newest = list[0]?.id ?? null

  const focusNewest = () => {
    const btn = rootRef.current?.querySelector<HTMLElement>('[data-toast] [data-toast-btn]')
    if (!btn) return false
    if (!rootRef.current?.contains(document.activeElement)) restoreRef.current = document.activeElement as HTMLElement | null
    btn.focus({ preventScroll: true })
    return true
  }
  const restore = () => {
    const to = restoreRef.current
    restoreRef.current = null
    if (to && to.isConnected) to.focus({ preventScroll: true })
    else (document.activeElement as HTMLElement | null)?.blur?.()
  }
  /** `active`: användaren stängde (Stäng eller Bakåt), inte tidsgränsen. */
  const close = (id: string, active = false) => {
    const wasInside = !!rootRef.current?.contains(document.activeElement)
    const t = toasts.find((x) => x.id === id)
    dismissToast(id)
    if (active) t?.onDismiss?.()
    if (wasInside) window.setTimeout(restore, 0)
  }

  // Ny notis: fokus till den på TV, när det går.
  useEffect(() => {
    if (!newest || !tv) return
    const t = window.setTimeout(() => { if (mayTakeFocus(document.activeElement) || rootRef.current?.contains(document.activeElement)) focusNewest() }, 0)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newest, tv])

  // Tidsgräns per notis; försvinner den med fokus i sig går fokus tillbaka.
  useEffect(() => {
    // Räknat från när notisen kom: en ny notis i stapeln startar inte om de andras tid.
    const timers = list.map((t) => window.setTimeout(() => close(t.id), Math.max(0, (t.expiresAt ?? Date.now() + t.timeoutMs) - Date.now())))
    return () => { for (const id of timers) window.clearTimeout(id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list])

  // Bakåt med fokus i notisen: stäng den. Capture-fasen och registrerad vid start,
  // så att spelarens och Live TV:s egna bakåtlyssnare aldrig hinner före.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!BACK_KEYS.has(event.key)) return
      const at = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>('[data-lt-toasts] [data-toast]')
      if (!at) return
      event.preventDefault()
      event.stopImmediatePropagation()
      close(at.getAttribute('data-toast')!, true)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Notisen utan fokus: ▸ eller ▾ vid kanten tar dit (om ingen annan tog trycket).
  useEffect(() => onTvFocusEdge((dir, meta) => {
    if (dir !== 'right' && dir !== 'down') return
    if (listRef.current.length === 0 || rootRef.current?.contains(document.activeElement)) return
    queueMicrotask(() => {
      if (meta?.claimed) return
      meta?.claim?.()
      focusNewest()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [])

  if (list.length === 0) return null
  const s = tv ? { title: 22, goalTitle: 28, body: 18, kicker: 15, btn: 20, h: 52, pad: 18, w: 520, badge: 56 } : { title: 14, goalTitle: 20, body: 12, kicker: 11, btn: 13, h: 34, pad: 12, w: 380, badge: 40 }
  return (
    <div ref={rootRef} data-lt-toasts="" {...(inside ? { 'data-panel-root': '' } : {})}
      onFocus={() => setInside(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setInside(false) }}
      style={{ position: 'fixed', right: 20, bottom: 24, zIndex: 400, display: 'flex', flexDirection: 'column', gap: 10, width: s.w, maxWidth: 'calc(100vw - 40px)' }}>
      <style>{TOAST_CSS}</style>
      {list.map((t) => {
        const goal = t.look === 'goal'
        const watch = t.onWatch ? (
          <button type="button" data-f="" data-toast-btn="watch" onClick={() => { const w = t.onWatch!; dismissToast(t.id); restoreRef.current = null; w() }}
            style={{ height: s.h, padding: `0 ${s.h / 2}px`, borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: s.btn, fontWeight: 700, background: ACC, color: '#fff', flexShrink: 0, ...(goal ? { flex: 1 } : {}) }}>
            {goal ? '\u25B6 ' : ''}{t.watchLabel}
          </button>
        ) : null
        const dismiss = (
          <button type="button" data-f="" data-toast-btn="dismiss" aria-label={t.dismissLabel} title={t.dismissLabel} onClick={() => close(t.id, true)}
            style={{ height: s.h, minWidth: s.h, padding: `0 ${Math.round(s.h / 3)}px`, borderRadius: 12, border: '1px solid rgba(255,255,255,0.16)', cursor: 'pointer', fontSize: s.btn, fontWeight: 600, background: 'rgba(252,252,255,0.10)', color: '#f3f4f8', flexShrink: 0, ...(goal ? { flex: 1 } : {}) }}>
            {goal ? t.dismissLabel : '\u2715'}
          </button>
        )
        if (goal) {
          // Nedräkningen räknas från när notisen kom (som tidsgränsen), även om stapeln ritas om.
          const left = Math.max(0, (t.expiresAt ?? Date.now() + t.timeoutMs) - Date.now())
          return (
            <div key={t.id} data-toast={t.id} data-toast-look="goal" role="status"
              style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: s.pad - 4, padding: s.pad, borderRadius: 18, background: 'rgba(18,18,22,0.88)', border: '1px solid rgba(255,255,255,0.16)', boxShadow: '0 18px 40px rgba(0,0,0,0.45)', color: '#f3f4f8', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                {t.badge ? (
                  <div data-testid="toast-badge" style={{ width: s.badge, height: s.badge, borderRadius: 999, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(252,252,255,0.14)', fontSize: Math.round(s.badge * 0.3), fontWeight: 700, letterSpacing: 0.5 }}>{t.badge}</div>
                ) : null}
                <div style={{ minWidth: 0, flex: 1 }}>
                  {t.kicker ? <div style={{ fontSize: s.kicker, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: GOAL_CORAL }}>{t.kicker}</div> : null}
                  <div style={{ fontSize: s.goalTitle, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{t.title}</div>
                  {t.body ? <div style={{ fontSize: s.body, color: 'rgba(243,244,248,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.body}</div> : null}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>{watch}{dismiss}</div>
              <div data-toast-countdown="" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, background: GOAL_CORAL, transformOrigin: 'left center', animation: `lt-toast-countdown ${t.timeoutMs}ms linear ${left - t.timeoutMs}ms forwards` }} />
            </div>
          )
        }
        return (
          <div key={t.id} data-toast={t.id} role="status"
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: `${s.pad}px ${s.pad + 2}px`, borderRadius: 16, background: '#141519', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 18px 40px rgba(0,0,0,0.45)', color: '#f3f4f8' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              {t.kicker ? <div style={{ fontSize: s.kicker, letterSpacing: 0.8, textTransform: 'uppercase', color: 'rgba(243,244,248,0.7)' }}>{t.kicker}</div> : null}
              <div style={{ fontSize: s.title, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
              {t.body ? <div style={{ fontSize: s.body, color: 'rgba(243,244,248,0.7)' }}>{t.body}</div> : null}
            </div>
            {watch}
            {dismiss}
          </div>
        )
      })}
    </div>
  )
}
