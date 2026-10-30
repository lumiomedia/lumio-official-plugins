import { TV } from './tv-ui'
import type { LiveBackground } from './v2-settings'

/**
 * FÄRGERNA I KANALGUIDE V2 OCH KANALER (handoff `design_handoff_live_tv 2`, README "Colours").
 *
 * Bara Kanaler och guiden målar med de här — `TV.bg` (#000) står kvar för
 * sport, multivy och kanalsidan. Accenten är appens (`TV.acc`), inte
 * handoffens fasta korall: guiden ska ha samma accent som resten av appen.
 */
export const V2 = {
  rail: '#222734',
  text: '#f3f4f8',
  text2: 'rgba(243,244,248,0.75)',
  text3: 'rgba(243,244,248,0.6)',
  onLight: '#11131a',
  line: 'rgba(255,255,255,0.08)',
  surface1: 'rgba(252,252,255,0.05)',
  surface2: 'rgba(252,252,255,0.07)',
  surface3: 'rgba(252,252,255,0.10)',
  surface4: 'rgba(252,252,255,0.14)',
  surface5: 'rgba(252,252,255,0.20)',
  accText: '#ffd9c9',
  onAcc: '#1a1d26',
  liveBg: 'rgba(251,113,133,0.22)',
  liveText: '#fecdd3',
  liveDot: '#fb7185',
  liveSolid: 'rgba(251,113,133,0.9)',
  logoPlate: '#f3f4f8',
  logoPlateInner: '#e3e5ec',
  logoText: '#3a3f4c',
  noArt: 'linear-gradient(180deg,#2b3142,#242938)',
  menuBg: 'rgba(58,59,66,0.96)',
  menuLine: 'rgba(255,255,255,0.10)',
  scrim: 'rgba(0,0,0,0.6)',
  /** Kategorifärgerna i Utforska (README "Kategorier Utforska tiles"). */
  categoryTints: { sport: '#7a3424', news: '#2a3f6a', film: '#4a2f5a', kids: '#2f5a48', docs: '#5a4a2a', other: '#3a3f4c' },
} as const

const BACKGROUNDS: Record<LiveBackground, string> = { slate: '#161a23', graphite: '#1b1b1f', night: '#0f1219' }

export function v2Bg(bg: LiveBackground): string {
  return BACKGROUNDS[bg]
}

function rgbOf(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** `mix(a aPct%, b)` ur handoffen, uträknad (gamla webbvyer saknar `color-mix`). */
export function mixHex(a: string, b: string, aPct: number): string {
  const [ar, ag, ab] = rgbOf(a)
  const [br, bg, bb] = rgbOf(b)
  const t = Math.max(0, Math.min(100, aPct)) / 100
  const m = (x: number, y: number) => Math.round(x * t + y * (1 - t))
  return `rgb(${m(ar, br)},${m(ag, bg)},${m(ab, bb)})`
}

/**
 * DEN GEMENSAMMA BAKGRUNDEN för guiden och Kanaler (båda layouterna): neutral
 * radiell ton uppe till höger mot sidtonen — Upplevelses kategorihero, som
 * Jerry valde 2026-10-30 ("så här på guide samt channel, även när det finns
 * ett förhandsfönster"). Den tonas inte av logor eller programbilder.
 */
export function v2Ambient(bg: LiveBackground): string {
  const base = v2Bg(bg)
  return `radial-gradient(1500px 900px at 70% 10%, ${mixHex(V2.categoryTints.other, base, 75)}, ${base} 75%)`
}

/** Fokus på kort/celler (Hem), inset i guiden där cellerna står tätt, och på knappar/chips. */
export const FOCUS_CARD = `0 0 0 3px ${TV.acc}, 0 24px 60px rgba(0,0,0,.55), 0 0 40px ${TV.accMix(35)}`
export const FOCUS_INSET = `inset 0 0 0 2px ${TV.acc}, 0 0 24px ${TV.accMix(35)}`
export const FOCUS_BTN = `0 0 0 3px ${TV.acc}, 0 0 26px ${TV.accMix(42)}`
