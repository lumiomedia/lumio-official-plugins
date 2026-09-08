import { describe, expect, it } from 'vitest'
import { HOST_PROXY_MIME, hostProxyUrl, nativeFailureAction } from './live-tv-playback-fallback'

describe('hostProxyUrl', () => {
  it('kodar hela käll-URL:en så frågetecken och &-tecken överlever', () => {
    const out = hostProxyUrl('http://127.0.0.1:3011', 'https://p.example/live?ch=1&hd=1')
    expect(out).toBe('http://127.0.0.1:3011/api/m3u?stream=https%3A%2F%2Fp.example%2Flive%3Fch%3D1%26hd%3D1')
  })
})

describe('nativeFailureAction', () => {
  it('skickar första laddfelet till värdens strömproxy', () => {
    expect(nativeFailureAction('load-failed', 0, 0)).toBe('retry-proxy')
  })

  it('ger upp när proxyvägen också misslyckas', () => {
    expect(nativeFailureAction('load-failed', 1, 0)).toBe('fail')
  })

  it('går vidare till proxyn även när första försöket bara tystnar', () => {
    expect(nativeFailureAction('no-start', 0, 0)).toBe('retry-proxy')
  })

  it('låter en ljudkanal utan bildruta spela vidare', () => {
    expect(nativeFailureAction('no-start', 1, 12.5)).toBe('settle')
  })

  it('räknar ett uttalat laddfel som fel även om strömmen hann spela', () => {
    expect(nativeFailureAction('load-failed', 1, 42)).toBe('fail')
  })

  it('bär containertypen proxyvägen behöver', () => {
    expect(HOST_PROXY_MIME).toBe('application/x-mpegURL')
  })
})
