'use client'

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { cutoutClipPath, useSurfaceCutouts } from './surface-cutouts'

/**
 * EN BAKGRUND MED HÅL ÅT NATIVA VIDEOYTOR — för v2-vyernas egna ytor.
 *
 * Samma knep som skalets `SurfaceBackdrop` (`tv-shell.tsx`), men absolut
 * placerad i vyn i stället för fixerad över skärmen: guiden och Kanaler målar
 * egna ogenomskinliga bakgrunder (sidtonen, heronas fält, Upplevelses
 * ambient), och mpv ritar förhandsrutan UNDER webbvyn. Utan hål syntes bara
 * reservbilden (Jerry 2026-10-30: "inga kanaler spelar i förhandsvisning").
 *
 * Hålen kommer i skärmpixlar; lagret mäter sig självt och räknar om till sina
 * egna layoutpixlar (TV-scenen skalar sidan med en transform). Utan levande
 * ytor klipps ingenting.
 */
export function CutoutLayer({ background, style, testId, children, data }: { background: string; style?: CSSProperties; testId?: string; children?: ReactNode; data?: Record<string, string> }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const cutouts = useSurfaceCutouts()
  const [clip, setClip] = useState<string | undefined>(undefined)
  useLayoutEffect(() => {
    if (cutouts.length === 0) { setClip(undefined); return }
    const measure = () => {
      const el = ref.current
      if (!el) return
      const box = el.getBoundingClientRect()
      const scale = el.offsetWidth > 0 && box.width > 0 ? box.width / el.offsetWidth : 1
      setClip(cutoutClipPath(cutouts.map((c) => ({
        left: (c.left - box.left) / scale,
        top: (c.top - box.top) / scale,
        width: c.width / scale,
        height: c.height / scale,
        radius: c.radius / scale,
      }))))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [cutouts])
  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-testid={testId}
      {...data}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', ...style, background, ...(clip ? { clipPath: clip, WebkitClipPath: clip } : null) }}
    >
      {children}
    </div>
  )
}
