'use client'

import { useEffect, useMemo, useState } from 'react'
import { channelKey } from '../live-tv-data'
import { startOfLocalDay } from '../live-tv-model'
import { formatClock } from '../live-tv-ui'
import type { TvViewProps } from './tv-shell'
import { ChannelArt, TV, dp, station } from './tv-ui'
import { useTvText } from './tv-strings'
import { TvKeyboard } from './tv-keyboard'
import { searchChannels, searchProgrammes, suggestions } from './tv-search-logic'

export function TvSearch({ model, nav }: TvViewProps) {
  const { tt, locale } = useTvText()
  const [query, setQuery] = useState('')
  /**
   * Programsökningen är fördröjd, kanalsökningen inte.
   *
   * `searchChannels` går igenom kanalnamnen en gång. `searchProgrammes` slår i
   * stället upp HELA dagens tablå för VARJE kanal (`model.scheduleFor` per
   * kanal) — i en stor spellista tiotusentals uppslag. På TV skrivs frågan en
   * bokstav i taget med fjärrkontrollen, och varje bokstav körde om hela den
   * genomsökningen synkront: tangentbordet hakade upp sig mellan trycken.
   * 150 ms är kortare än ett bekvämt tryckintervall på fjärrkontrollen, så en
   * användare som slutat skriva ser resultatet som omedelbart, medan en snabb
   * serie tryck bara ger EN genomsökning.
   */
  const [deferredQuery, setDeferredQuery] = useState('')
  useEffect(() => {
    const timer = window.setTimeout(() => setDeferredQuery(query), 150)
    return () => window.clearTimeout(timer)
  }, [query])
  const day = useMemo(() => { const start = startOfLocalDay(model.nowMs); return { start, end: start + 86_400_000 } }, [model.nowMs])
  const channels = useMemo(() => searchChannels(query, model.channels), [query, model.channels])
  const programmes = useMemo(() => searchProgrammes(deferredQuery, model.channels, model.scheduleFor, day), [deferredQuery, model.channels, model.scheduleFor, day])
  const hints = useMemo(() => suggestions(query, model.channels, programmes.map((p) => p.programme.title)), [query, model.channels, programmes])
  const focusFirstResult = () => {
    const first = document.querySelector<HTMLElement>('[data-live-tv-search-results] [data-f]')
    first?.focus({ preventScroll: true })
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
      <div style={{ width: dp(760), flexShrink: 0, borderRight: `1px solid ${TV.line}`, padding: `${dp(34)}px ${dp(40)}px 0 ${dp(48)}px`, display: 'flex', flexDirection: 'column', gap: dp(18) }}>
        <div style={{ height: dp(64), borderRadius: dp(14), background: TV.s10, display: 'flex', alignItems: 'center', padding: `0 ${dp(20)}px`, fontSize: dp(28), color: query ? TV.text : 'rgba(243,244,248,0.5)' }}>
          {query || <span style={{ fontSize: dp(18) }}>{tt('searchPlaceholder')}</span>}
          <span aria-hidden="true" style={{ width: 2, height: dp(32), background: TV.acc, marginLeft: dp(4) }} />
        </div>
        <div data-row="" style={{ display: 'flex', gap: dp(8), overflowX: 'auto', minHeight: dp(44) }}>
          {hints.map((hint) => (
            <div key={hint} data-testid="search-suggestion" {...station(() => setQuery(hint))} style={{ height: dp(44), padding: `0 ${dp(18)}px`, borderRadius: 999, background: TV.s08, display: 'inline-flex', alignItems: 'center', fontSize: dp(18), whiteSpace: 'nowrap', cursor: 'pointer' }}>{hint}</div>
          ))}
        </div>
        <TvKeyboard value={query} onChange={setQuery} onDone={focusFirstResult} initFocus />
      </div>
      <div data-live-tv-search-results="" data-scroll="" style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: `${dp(34)}px ${dp(48)}px 0 ${dp(40)}px`, display: 'flex', flexDirection: 'column', gap: dp(28) }}>
        <section data-testid="search-channels" style={{ display: 'flex', flexDirection: 'column', gap: dp(8) }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: dp(12) }}><span style={{ fontSize: dp(24), fontWeight: 600 }}>{tt('searchChannels')}</span><span style={{ fontSize: dp(16), color: 'rgba(243,244,248,0.5)' }}>{tt('hits', { count: channels.length })}</span></div>
          {query && channels.length === 0 ? <div style={{ color: TV.dim, fontSize: dp(18) }}>{tt('noResults')}</div> : null}
          {channels.map((channel) => {
            const info = model.nowFor(channel)
            return (
              <div key={channelKey(channel)} {...station(() => nav.openChannel(channel), (el) => nav.channelMenu(channel, el))} style={{ height: dp(80), borderRadius: dp(12), display: 'flex', alignItems: 'center', gap: dp(14), padding: `0 ${dp(12)}px`, cursor: 'pointer' }}>
                <span style={{ width: dp(44), fontSize: dp(16), color: 'rgba(243,244,248,0.5)', textAlign: 'right' }}>{model.channelNumber(channel) ?? ''}</span>
                <ChannelArt channel={channel} style={{ width: dp(76), height: dp(50), flexShrink: 0 }} radius={dp(8)} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: dp(20), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{channel.name}</div>
                  <div style={{ fontSize: dp(16), color: 'rgba(243,244,248,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.now ? `${tt('colNow')}: ${info.now.title}` : tt('noProgramme')}</div>
                </div>
                <span style={{ fontSize: dp(15), color: 'rgba(243,244,248,0.5)' }}>{channel.group}</span>
              </div>
            )
          })}
        </section>
        <section data-testid="search-programmes" style={{ display: 'flex', flexDirection: 'column', gap: dp(6) }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: dp(12) }}><span style={{ fontSize: dp(24), fontWeight: 600 }}>{tt('searchProgrammes')}</span><span style={{ fontSize: dp(16), color: 'rgba(243,244,248,0.5)' }}>{tt('hits', { count: programmes.length })}</span></div>
          {programmes.map((hit) => (
            <div key={`${channelKey(hit.channel)}:${hit.programme.start}`} {...station(() => nav.openChannel(hit.channel, hit.programme.start))} style={{ height: dp(64), borderRadius: dp(12), display: 'flex', alignItems: 'center', gap: dp(16), padding: `0 ${dp(12)}px`, cursor: 'pointer' }}>
              <span style={{ width: dp(80), fontSize: dp(18), color: 'rgba(243,244,248,0.6)', fontVariantNumeric: 'tabular-nums' }}>{formatClock(hit.programme.start, locale)}</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: dp(20), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hit.programme.title}</span>
              <span style={{ fontSize: dp(16), color: 'rgba(243,244,248,0.5)' }}>{hit.channel.name}</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}
