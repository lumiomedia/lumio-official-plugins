'use client'

import { useEffect, useState } from 'react'
import type { Rgb } from '../sport/backdrop'

/**
 * RÄLSENS TON FRÅN BILDEN BAKOM (Jerry 2026-10-30: "sport ska också ta färg av
 * bilden bakom"). En vy med en stor bakgrundsbild — i dag sporten — publicerar
 * bildens medelton här medan den visas; skalets räls tonar sig efter den och
 * går tillbaka till sin vanliga yta när vyn släpper tonen. Hem-ramen har sin
 * egen ton (herons) men samma `railTone`.
 */
let current: Rgb | null = null
const listeners = new Set<() => void>()

export function setRailTint(tone: Rgb | null): void {
  if (tone === current || (tone && current && tone.every((v, i) => v === current![i]))) return
  current = tone
  for (const l of listeners) l()
}

export function useRailTint(): Rgb | null {
  const [tone, setTone] = useState(current)
  useEffect(() => {
    const l = () => setTone(current)
    listeners.add(l)
    l()
    return () => { listeners.delete(l) }
  }, [])
  return tone
}

export function __resetRailTintForTests(): void {
  current = null
  for (const l of listeners) l()
}

/**
 * Rälsens ton ur bildens medelton. `darkTone` (sportens, luminans ≈ 42) låg så
 * nära sidtonen att rälsen såg platt ut; här ljusas inget upp, men mörkas bara
 * ner till luminans 64 — vit text läses fortfarande (kontrast ≈ 8:1).
 */
export function railTone([r, g, b]: Rgb): Rgb {
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  const f = lum > 64 ? 64 / lum : 1
  return [Math.round(r * f), Math.round(g * f), Math.round(b * f)]
}

const rgba = ([r, g, b]: Rgb, a: number) => `rgba(${r},${g},${b},${a})`

/** Rälsens yta i en ton: tät upptill, mot nästan svart nertill. */
export function railTintBackground(tone: Rgb): string {
  const t = railTone(tone)
  return `linear-gradient(180deg, ${rgba(t, 0.92)} 0%, ${rgba(t, 0.8)} 55%, ${rgba([12, 14, 18], 0.9)} 100%)`
}
