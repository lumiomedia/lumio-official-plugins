import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as sdk from '@/lib/plugin-sdk'
import { writePluginJson, __resetForTests } from '@/lib/plugin-sdk'
import { __resetLogoQueueForTests } from './live-tv-logo-image'

vi.mock('./live-tv-player', () => ({ LiveTvPlayer: () => <div data-testid="player" /> }))
// Pagineringen kommer från värdens @heroui/react, som inte finns i testträdet.
vi.mock('./results-pagination', () => ({ ResultsPagination: () => null }))

import { LiveTvGrid } from './live-tv-grid'
import { LIVE_TV_PLUGIN_ID, getLiveTvLogoSrc } from './live-tv-data'

const PLAYLIST_URL = 'http://example.test/playlist.m3u8'

// Leverantörens bildserver kan svara 502/404/timeout — dessa URL:er
// simulerar just det scenariot i stället för att låta ALLT lyckas (det
// döljer regressionen den här filen finns för att fånga).
// `preloadLiveTvLogo` tar emot den redan proxyade URL:en (samma som
// `getLiveTvLogoSrc` producerar), inte kanalens råa logo-fält — bygg
// listan med samma funktion, annars matchar den aldrig.
const FAILING_PRELOAD_URLS = new Set(
  [getLiveTvLogoSrc('http://p/leverantor-nere.png')].filter((src): src is string => Boolean(src)),
)

const CHANNELS = [
  {
    // Leverantörens logotyp FALLERAR (502) — reserven ska ta över, både i
    // förladdningen och på kortet. Det är huvudfallet hela P3/P3-fix1 gäller:
    // proxyn svarar 502 långt oftare än att fältet helt saknas i datan.
    name: 'Leverantoren nere',
    logo: 'http://p/leverantor-nere.png',
    logoFallback: 'http://p/reserv-fungerar.png',
    group: 'Sport',
    url: 'http://example.test/1.m3u8',
    tvgId: null,
    key: 'Leverantoren nere::http://example.test/1.m3u8',
    number: 1,
    tvgIdResolved: null,
  },
  {
    name: 'Bara reserv',
    logo: null,
    logoFallback: 'http://p/c.png',
    group: 'Sport',
    url: 'http://example.test/2.m3u8',
    tvgId: null,
    key: 'Bara reserv::http://example.test/2.m3u8',
    number: 2,
    tvgIdResolved: null,
  },
  {
    name: 'Ingen logotyp',
    logo: null,
    logoFallback: null,
    group: 'Sport',
    url: 'http://example.test/3.m3u8',
    tvgId: null,
    key: 'Ingen logotyp::http://example.test/3.m3u8',
    number: 3,
    tvgIdResolved: null,
  },
  {
    // Leverantörens logotyp laddas fint i FÖRLADDNINGEN, men den riktiga
    // <img>-taggen fallerar ändå vid render (cache-utkastning, nätverksblip
    // mellan preload och render). Kortet ska ändå ha fått `fallbackSrc` med
    // sig, så LiveTvLogoImage kan byta till reserven live.
    name: 'Live-fel efter lyckad forladdning',
    logo: 'http://p/ok.png',
    logoFallback: 'http://p/reserv-live.png',
    group: 'Sport',
    url: 'http://example.test/4.m3u8',
    tvgId: null,
    key: 'Live-fel efter lyckad forladdning::http://example.test/4.m3u8',
    number: 4,
    tvgIdResolved: null,
  },
]

afterEach(cleanup)
afterEach(() => {
  vi.restoreAllMocks()
})

beforeEach(() => {
  __resetLogoQueueForTests()
  __resetForTests()
  writePluginJson(LIVE_TV_PLUGIN_ID, 'm3u_urls', [PLAYLIST_URL])
  // happy-dom har en riktig IntersectionObserver som aldrig rapporterar
  // intersection i test — utan den odefinierad hänger kortets logotyp i
  // laddkön för evigt och `src`-attributet sätts aldrig.
  vi.stubGlobal('IntersectionObserver', undefined)
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ items: CHANNELS, total: CHANNELS.length, known: true }),
    })),
  )
  // Preload-nätet simuleras aldrig i happy-dom: de flesta URL:er "lyckas"
  // direkt, men de som står i FAILING_PRELOAD_URLS "fallerar" — precis som
  // en 502 från proxyn — så testerna faktiskt kan skilja på om reserven
  // provas eller inte.
  vi.spyOn(sdk, 'preloadPluginImage').mockImplementation(async (...args: unknown[]) => {
    const src = args[1]
    const ok = !(typeof src === 'string' && FAILING_PRELOAD_URLS.has(src))
    return ok as unknown as void
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('kanalkortets förladdning av reservlogotypen', () => {
  it('leverantörens logotyp fallerar i förladdningen — reserven tar över', async () => {
    render(<LiveTvGrid />)
    const img = await screen.findByAltText('Leverantoren nere')
    // Bildens `src` sätts i en egen passiv effekt (LiveTvLogoImage) EFTER att
    // elementet redan hunnit in i trädet — vänta in den innan vi läser den.
    await waitFor(() => expect(img.getAttribute('src')).not.toBeNull())
    // Reserven ska visas — INTE leverantörens (fallerade) URL.
    expect(img.getAttribute('src')).toContain(encodeURIComponent('http://p/reserv-fungerar.png'))
    expect(img.getAttribute('src')).not.toContain(encodeURIComponent('http://p/leverantor-nere.png'))
  })

  it('kanal utan leverantörslogotyp går direkt på reserven', async () => {
    render(<LiveTvGrid />)
    const img = await screen.findByAltText('Bara reserv')
    await waitFor(() => expect(img.getAttribute('src')).not.toBeNull())
    expect(img.getAttribute('src')).toContain(encodeURIComponent('http://p/c.png'))
  })

  it('kanal utan både och visar ingen förladdad logotyp', async () => {
    render(<LiveTvGrid />)
    // De andra kanalernas bilder hinner fram — det är beviset på att
    // förladdningen kört klart och att den tredje kanalen medvetet uteblir.
    await screen.findByAltText('Leverantoren nere')
    expect(screen.queryByAltText('Ingen logotyp')).toBeNull()
  })

  it('leverantörens logotyp fallerar LIVE efter en lyckad förladdning — kortet har fått reserven med sig', async () => {
    render(<LiveTvGrid />)
    const img = await screen.findByAltText('Live-fel efter lyckad forladdning')
    await waitFor(() => expect(img.getAttribute('src')).not.toBeNull())
    expect(img.getAttribute('src')).toContain(encodeURIComponent('http://p/ok.png'))

    fireEvent.error(img)

    expect(img.getAttribute('src')).toContain(encodeURIComponent('http://p/reserv-live.png'))
  })
})
