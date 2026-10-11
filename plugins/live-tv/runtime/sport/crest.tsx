'use client'

import { useState } from 'react'
import { getPluginHttpAssetUrl } from '@/lib/plugin-sdk'
import { dp } from '../tv/tv-ui'
import { crestText } from './sport-model'
import { crestColor } from './sport-day-model'

/**
 * Handoffens initialcirkel. Med `src` (källans märke) ritas märket via appens
 * bildcache i stället. Bor utanför sport/tv så att matchinfon (delad av TV,
 * skrivbord och telefon) kan rita den utan att bryta importcykelregeln.
 */
export function Crest({ name, colorKey, size = dp(56), src }: { name: string; colorKey: string; size?: number; src?: string | null }) {
  const [broken, setBroken] = useState(false)
  const url = src && !broken ? getPluginHttpAssetUrl('/api/m3u-logo', src) : null
  if (url) {
    return <img data-crest="" src={url} alt="" width={size} height={size} onError={() => setBroken(true)} style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }} />
  }
  return (
    <span data-crest="" aria-hidden="true" style={{ width: size, height: size, borderRadius: 999, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: crestColor(colorKey), color: '#fff', fontSize: Math.round(size * 0.32), fontWeight: 700, boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.18)' }}>
      {crestText(name)}
    </span>
  )
}
