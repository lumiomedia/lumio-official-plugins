'use client'

import { useMemo, useState } from 'react'
import { channelKey } from '../../live-tv-data'
import { startOfLocalDay } from '../../live-tv-model'
import { formatClock } from '../../live-tv-ui'
import type { TvViewProps } from '../tv-shell'
import { station } from '../tv-ui'
import { useTvText } from '../tv-strings'
import { searchChannels, suggestions } from '../tv-search-logic'
import { useProgrammeSearch } from '../../hooks/useProgrammeSearch'
import { MT, ellipsis } from './mobile-tokens'
import { MIcons } from './mobile-icons'
import { MobileHeader } from './mobile-header'
import { MobileChips } from './mobile-chips'
import { MobileChannelRow } from './mobile-channel-row'

/**
 * Sök på telefon (fas 3, Task 10, handoffen §7). Systemets tangentbord i
 * stället för TV:ns tangentbordspanel — ett vanligt `<input>` räcker, ingen
 * `TvTextField`/`TvKeyboardPanel`. Datan är densamma som skrivbordets
 * `TvSearch` (`searchChannels`, `useProgrammeSearch`, `suggestions`), men den
 * här filen importerar MEDVETET INGET från `tv-search.tsx`
 * (importcykel-regeln, se `tv-favourites.tsx`): logiken hämtas direkt ur
 * `tv-search-logic.ts` och `hooks/useProgrammeSearch.ts`.
 */
export function TvSearchPhone({ model, nav }: TvViewProps) {
  const { tt, locale } = useTvText()
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)

  // Samma dags-fönster som skrivbordet: den globala EPG-listan, inte
  // `model.epgListId` — appen kan ha en tablå även utan EPG-URL i lagringen.
  const day = useMemo(() => { const start = startOfLocalDay(model.nowMs); return { start, end: start + 86_400_000 } }, [model.nowMs])
  const channels = useMemo(() => searchChannels(query, model.channels), [query, model.channels])
  const { hits: programmes, loading: programmesLoading } = useProgrammeSearch(query, day.start, day.end)
  const hints = useMemo(() => suggestions(query, model.channels, programmes.map((p) => p.programme.title)), [query, model.channels, programmes])
  const noProgrammeLabel = model.epgLoading ? tt('loadingGuide') : tt('noProgramme')

  // Handoffen §7, sista punkten: tomma träfflistor ska inte visas som två
  // rubriker ("Channels 0 hits" / "Programmes today 0 hits") på en annars tom
  // yta — då visas ETT centrerat meddelande i stället. Så fort NÅGON av
  // grupperna har ett svar (träffar eller pågår) ritas de vanliga sektionerna.
  const isEmptyResult = query !== '' && channels.length === 0 && programmes.length === 0 && !programmesLoading

  return (
    <div data-testid="search-phone" data-scroll="" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: `0 ${MT.PAD}px`, paddingBottom: MT.SCROLL_PAD_BOTTOM }}>
      <div style={{ margin: `0 -${MT.PAD}px` }}><MobileHeader title={tt('tabSearch')} /></div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10 }}>
        <input
          data-testid="search-input"
          type="text"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={tt('searchPlaceholder')}
          aria-label={tt('searchPlaceholder')}
          style={{
            flex: 1, minHeight: 44, borderRadius: 14, background: MT.s10,
            border: `1px solid ${focused ? MT.accMix(50) : 'transparent'}`,
            padding: '0 14px', fontSize: 16, color: MT.text, caretColor: MT.acc,
            outline: 'none', fontFamily: MT.font, boxSizing: 'border-box',
          }}
        />
        <div data-testid="search-cancel" {...station(() => nav.back())} style={{ minHeight: 44, flexShrink: 0, display: 'flex', alignItems: 'center', fontSize: 15, cursor: 'pointer' }}>{tt('cancel')}</div>
      </div>

      {hints.length > 0 ? (
        <MobileChips items={hints.map((hint) => ({ key: hint, label: hint, id: hint }))} value={query} onChange={setQuery} testId="search-hints" />
      ) : null}

      {query === '' ? (
        <div data-testid="search-empty" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center', padding: 24 }}>
          <span style={{ color: MT.faint, display: 'inline-flex' }}><MIcons.MagnifyingGlass size={32} /></span>
          <span style={{ fontSize: 15, color: MT.muted }}>{tt('searchEmptyHint')}</span>
        </div>
      ) : isEmptyResult ? (
        <div data-testid="search-no-results" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24, fontSize: 15, color: MT.dim }}>
          {model.channelsLoading ? tt('loadingChannels') : tt('noResults')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          <section data-testid="search-channels" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minHeight: 24 }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{tt('searchChannels')}</span>
              <span style={{ fontSize: 13, color: MT.dim }}>{tt('hits', { count: channels.length })}</span>
            </div>
            {channels.length === 0 ? (
              <div data-testid="search-channels-empty" style={{ padding: '16px 0', fontSize: 14, color: MT.dim }}>{model.channelsLoading ? tt('loadingChannels') : tt('noResults')}</div>
            ) : (
              channels.map((channel) => {
                const key = channelKey(channel)
                return (
                  <MobileChannelRow
                    key={key}
                    channel={channel}
                    number={model.channelNumber(channel)}
                    now={model.nowFor(channel)}
                    nowMs={model.nowMs}
                    locale={locale}
                    variant="search"
                    noProgrammeLabel={noProgrammeLabel}
                    onPress={() => nav.openChannel(channel)}
                    onLongPress={(el) => nav.channelMenu(channel, el)}
                  />
                )
              })
            )}
          </section>

          <section data-testid="search-programmes" style={{ display: 'flex', flexDirection: 'column', marginTop: 6 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minHeight: 24 }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{tt('searchProgrammes')}</span>
              <span style={{ fontSize: 13, color: MT.dim }}>{tt('hits', { count: programmes.length })}</span>
            </div>
            {/* Sökningen går till appen: en tom lista betyder "hämtar" tills
                svaret kommit, inte "inga träffar". */}
            {programmes.length === 0 ? (
              <div data-testid="search-programmes-empty" style={{ padding: '16px 0', fontSize: 14, color: MT.dim }}>{programmesLoading ? tt('loadingGuide') : tt('noResults')}</div>
            ) : (
              programmes.map((hit) => (
                <div
                  key={`${channelKey(hit.channel)}:${hit.programme.start}`}
                  data-testid="search-programme-row"
                  {...station(() => nav.openChannel(hit.channel, hit.programme.start))}
                  style={{ minHeight: 56, display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${MT.line07}`, cursor: 'pointer' }}
                >
                  <span style={{ width: 46, flexShrink: 0, fontSize: 14, color: MT.dim, fontVariantNumeric: 'tabular-nums' }}>{formatClock(hit.programme.start, locale)}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 15, ...ellipsis }}>{hit.programme.title}</span>
                  <span style={{ maxWidth: '40%', fontSize: 12, color: MT.dim, ...ellipsis }}>{hit.channel.name}</span>
                </div>
              ))
            )}
          </section>
        </div>
      )}
    </div>
  )
}
