import { useEffect, useState } from 'react'

export type Orientation = 'portrait' | 'landscape'

const QUERY = '(orientation: landscape)'

function read(): Orientation {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'portrait'
  return window.matchMedia(QUERY).matches ? 'landscape' : 'portrait'
}

/**
 * Skärmens orientering via `matchMedia('(orientation: landscape)')`.
 *
 * Läser mediafrågan i stället för `screen.orientation`: den senare saknas i
 * äldre WebKit och jsdom, och mediafrågan följer dessutom det som faktiskt
 * ritas (delad skärm, fönster på skrivbordet). Utan `matchMedia` — jsdom,
 * äldre värdar — svarar hooken alltid `'portrait'` och lyssnar på inget.
 */
export function useOrientation(): Orientation {
  const [orientation, setOrientation] = useState<Orientation>(read)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(QUERY)
    const onChange = (event: { matches: boolean }) => setOrientation(event.matches ? 'landscape' : 'portrait')
    setOrientation(mql.matches ? 'landscape' : 'portrait')
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return orientation
}
