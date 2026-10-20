import { describe, expect, it } from 'vitest'
import { prefetchUrlFor, warmUrlFor } from './warm'

const desk = { androidDirect: false }

describe('förvärmning av filens huvud och index', () => {
  it('WebDAV via appens proxy: proxyns förvärmning med samma källa och sökväg', () => {
    const url = 'http://127.0.0.1:3011/api/webdav-library/stream?source=abc&path=%2FFilm%2FA.mkv&library=webdav'
    expect(warmUrlFor({ url }, 'library', desk)).toBe('/api/webdav-library/warm?source=abc&path=%2FFilm%2FA.mkv&library=webdav')
    // Även på Android: proxyn används där också.
    expect(warmUrlFor({ url }, 'library', { androidDirect: true })).toMatch(/^\/api\/webdav-library\/warm\?/)
  })

  it('Plex/Jellyfin och upplåst debrid: källcachens förvärmning, med addonens headers', () => {
    const plex = 'http://192.168.1.10:32400/library/parts/1/file.mkv?X-Plex-Token=t'
    expect(warmUrlFor({ url: plex }, 'library', desk)).toBe(`/api/source-cache/warm?u=${encodeURIComponent(plex)}`)
    const rd = 'https://abc.download.real-debrid.com/d/XYZ/Film.mkv'
    expect(warmUrlFor({ url: rd, requestHeaders: { Referer: 'x' } }, 'debrid', desk))
      .toBe(`/api/source-cache/warm?u=${encodeURIComponent(rd)}&h=${encodeURIComponent('{"Referer":"x"}')}`)
  })

  it('aldrig strömuppslag (resolverns anropsgräns), aldrig live, inte Android utan källcache', () => {
    expect(warmUrlFor({ url: 'https://torrentio.strem.fun/resolve/torbox/k/h/1/x.mkv' }, 'stream', desk)).toBeNull()
    expect(warmUrlFor({ url: 'http://iptv.example/live/u/p/1.m3u8' }, 'library', desk)).toBeNull()
    expect(warmUrlFor({ url: 'https://abc.download.real-debrid.com/d/XYZ/Film.mkv' }, 'debrid', { androidDirect: true })).toBeNull()
    expect(warmUrlFor({ url: 'file:///x.mkv' }, 'library', desk)).toBeNull()
  })

  it('direktströmning: spelaren förhämtar upplösta filer, aldrig strömuppslag, live eller WebDAV-proxyn', () => {
    const direct = { androidDirect: true }
    const rd = 'https://abc.download.real-debrid.com/d/XYZ/Film.mkv'
    expect(prefetchUrlFor({ url: rd }, 'debrid', direct)).toBe(rd)
    expect(prefetchUrlFor({ url: 'http://192.168.1.10:32400/library/parts/1/file.mkv?X-Plex-Token=t' }, 'library', direct)).toMatch(/^http:/)
    expect(prefetchUrlFor({ url: 'https://torrentio.strem.fun/resolve/torbox/k/h/1/x.mkv' }, 'stream', direct)).toBeNull()
    expect(prefetchUrlFor({ url: 'http://iptv.example/live/u/p/1.m3u8' }, 'library', direct)).toBeNull()
    expect(prefetchUrlFor({ url: 'http://127.0.0.1:3011/api/webdav-library/stream?source=a&path=x' }, 'library', direct)).toBeNull()
    expect(prefetchUrlFor({ url: rd }, 'debrid', desk)).toBeNull()
  })
})
