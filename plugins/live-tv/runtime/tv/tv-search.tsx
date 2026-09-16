'use client'

import { useMemo, useState, type CSSProperties } from 'react'
import { useTvMode } from '@/lib/plugin-sdk'
import { channelKey } from '../live-tv-data'
import { startOfLocalDay } from '../live-tv-model'
import { formatClock } from '../live-tv-ui'
import type { TvViewProps } from './tv-shell'
import { ChannelArt, TV, dp, station } from './tv-ui'
import { useTvText } from './tv-strings'
import { TvTextField } from './tv-text-entry'
import { searchChannels, suggestions } from './tv-search-logic'
import { useProgrammeSearch } from '../hooks/useProgrammeSearch'

export function TvSearch({ model, nav, phone }: TvViewProps) {
  const { tt, locale } = useTvText()
  const tvMode = useTvMode()
  const [query, setQuery] = useState('')
  /**
   * Programsökningen är fördröjd, kanalsökningen inte.
   *
   * `searchChannels` går igenom de laddade kanalnamnen en gång, i minnet.
   * Programsökningen går till appen (`/epg/search`) — den kostar ett anrop, och
   * på TV skrivs frågan en bokstav i taget med fjärrkontrollen. Fördröjningen
   * (150 ms i `useProgrammeSearch`) är kortare än ett bekvämt tryckintervall,
   * så den som slutat skriva ser svaret som omedelbart medan en snabb serie
   * tryck bara ger EN sökning.
   */
  const day = useMemo(() => { const start = startOfLocalDay(model.nowMs); return { start, end: start + 86_400_000 } }, [model.nowMs])
  const channels = useMemo(() => searchChannels(query, model.channels), [query, model.channels])
  // Den globala EPG-listan, inte `model.epgListId`: appen kan ha en tablå även
  // när pluginet inte har någon EPG-URL i lagringen (Xtream-härledd källa).
  const { hits: programmes, loading: programmesLoading } = useProgrammeSearch(query, day.start, day.end)
  const hints = useMemo(() => suggestions(query, model.channels, programmes.map((p) => p.programme.title)), [query, model.channels, programmes])
  const focusFirstResult = () => {
    const first = document.querySelector<HTMLElement>('[data-live-tv-search-results] [data-f]')
    first?.focus({ preventScroll: true })
  }

  /**
   * PORTRÄTTBEHANDLING (granskning M-P4, FYND 2).
   *
   * Vänsterkolumnen (sökfält + förslag) var fast 760 dp på en 780 dp scen —
   * resultatlistan fick ~20 dp. Samma stapling som kanaldetaljsidan: sök-
   * kolumnen läggs ovanpå, resultaten under, med sidans egen scroll i
   * stället för två nästlade scrollytor.
   */
  const outerStyle: CSSProperties = phone
    ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }
    : { flex: 1, minHeight: 0, display: 'flex' }
  const queryColStyle: CSSProperties = phone
    ? { width: '100%', flexShrink: 0, padding: `${dp(20)}px ${dp(20)}px 0`, display: 'flex', flexDirection: 'column', gap: dp(18) }
    : { width: dp(760), flexShrink: 0, borderRight: `1px solid ${TV.line}`, padding: `${dp(34)}px ${dp(40)}px 0 ${dp(48)}px`, display: 'flex', flexDirection: 'column', gap: dp(18) }
  const resultsStyle: CSSProperties = phone
    ? { width: '100%', padding: `${dp(20)}px ${dp(20)}px 0`, display: 'flex', flexDirection: 'column', gap: dp(28) }
    : { flex: 1, minWidth: 0, overflowY: 'auto', padding: `${dp(34)}px ${dp(48)}px 0 ${dp(40)}px`, display: 'flex', flexDirection: 'column', gap: dp(28) }

  return (
    <div data-testid="search-view-root" style={outerStyle}>
      <div data-testid="search-query-col" style={queryColStyle}>
        {tvMode ? (
          // TvKeyboard visar ingen text själv — den här raden är fältets enda
          // display i TV-läge. Utanför TV visar `TvTextField`s riktiga
          // <input> texten själv, så raden hade bara dublett:at den.
          <div style={{ height: dp(64), borderRadius: dp(14), background: TV.s10, display: 'flex', alignItems: 'center', padding: `0 ${dp(20)}px`, fontSize: dp(28), color: query ? TV.text : 'rgba(243,244,248,0.5)' }}>
            {query || <span style={{ fontSize: dp(18) }}>{tt('searchPlaceholder')}</span>}
            <span aria-hidden="true" style={{ width: 2, height: dp(32), background: TV.acc, marginLeft: dp(4) }} />
          </div>
        ) : null}
        <div data-row="" style={{ display: 'flex', gap: dp(8), overflowX: 'auto', minHeight: dp(44) }}>
          {hints.map((hint) => (
            <div key={hint} data-testid="search-suggestion" {...station(() => setQuery(hint))} style={{ height: dp(44), minHeight: dp(44), padding: `0 ${dp(18)}px`, borderRadius: 999, background: TV.s08, display: 'inline-flex', alignItems: 'center', fontSize: dp(18), whiteSpace: 'nowrap', cursor: 'pointer' }}>{hint}</div>
          ))}
        </div>
        <TvTextField value={query} onChange={setQuery} onSubmit={focusFirstResult} placeholder={tt('searchPlaceholder')} autoFocus />
      </div>
      <div data-live-tv-search-results="" data-scroll="" style={resultsStyle}>
        <section data-testid="search-channels" style={{ display: 'flex', flexDirection: 'column', gap: dp(8) }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: dp(12) }}><span style={{ fontSize: dp(24), fontWeight: 600 }}>{tt('searchChannels')}</span><span style={{ fontSize: dp(16), color: 'rgba(243,244,248,0.5)' }}>{tt('hits', { count: channels.length })}</span></div>
          {query && channels.length === 0 ? <div style={{ color: TV.dim, fontSize: dp(18) }}>{model.channelsLoading ? tt('loadingChannels') : tt('noResults')}</div> : null}
          {channels.map((channel) => {
            const info = model.nowFor(channel)
            return (
              <div key={channelKey(channel)} {...station(() => nav.openChannel(channel), (el) => nav.channelMenu(channel, el))} style={{ height: dp(80), minHeight: dp(80), borderRadius: dp(12), display: 'flex', alignItems: 'center', gap: dp(14), padding: `0 ${dp(12)}px`, cursor: 'pointer' }}>
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
          {/* Sökningen går till appen: en tom lista betyder "hämtar" tills
              svaret kommit, inte "inga träffar". */}
          {query && programmes.length === 0 ? <div data-testid="search-programmes-empty" style={{ color: TV.dim, fontSize: dp(18) }}>{programmesLoading ? tt('loadingGuide') : tt('noResults')}</div> : null}
          {programmes.map((hit) => (
            <div key={`${channelKey(hit.channel)}:${hit.programme.start}`} {...station(() => nav.openChannel(hit.channel, hit.programme.start))} style={{ height: dp(64), minHeight: dp(64), borderRadius: dp(12), display: 'flex', alignItems: 'center', gap: dp(16), padding: `0 ${dp(12)}px`, cursor: 'pointer' }}>
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
