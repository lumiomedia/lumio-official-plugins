'use client'

import { useMemo, useState } from 'react'
import { useTvMode } from '@/lib/plugin-sdk'
import { channelKey, type M3uChannel } from '../live-tv-data'
import { startOfLocalDay } from '../live-tv-model'
import { formatClock, progressOf } from '../live-tv-ui'
import type { TvViewProps } from './tv-shell'
import { TV, dp, station } from './tv-ui'
import { useTvText } from './tv-strings'
import { TvTextField } from './tv-text-entry'
import { searchChannels, suggestions } from './tv-search-logic'
import { useProgrammeSearch } from '../hooks/useProgrammeSearch'
import { TvSearchPhone } from './mobile/search-phone'
import { useVodPage } from '../hooks/useVodLibrary'
import { getVodMode } from '../vod-data'
import type { VodItem } from '../vod-client'
import type { ProgrammeSearchHit } from '../hooks/useProgrammeSearch'
import type { EpgProgramme } from '../epg/types'
import type { LiveTvModel } from '../live-tv-model'
import type { TvNav } from './tv-shell'
import { ACCENT, GUIDE_CELL_RADIUS, GUIDE_ROW_GAP, GUIDE_ROW_H, GuideChannelCellV2, accentMix, ellipsis } from './guide-nowsen-view'
import { V2 } from './v2-tokens'
import { holdMenu, programmeState } from './programme-actions'
import { displayTitle } from '../display-title'

/**
 * Sökets omfång. Sessionstillstånd med flit — den som sökte film igår vill
 * inte att nästa kanalsökning tyst filtreras bort.
 */
type SearchScope = 'all' | 'ch' | 'vod'

/**
 * Tidig gren för telefonen: ett EGET komponentträd, inte en `if` inne i
 * skrivbordsvyn (samma mönster som `TvPlayerChrome`). `phone` läses ur lådans
 * bredd och kan slå om vid körning (rotation, fönster som breddas); två
 * separata komponenter monteras om rent, och grenen själv anropar inga krokar
 * — så kan ingen krok hamna före returen och ge "rendered more/fewer hooks".
 */
export function TvSearch(props: TvViewProps) {
  return props.phone ? <TvSearchPhone {...props} /> : <TvSearchDesktop {...props} />
}

function TvSearchDesktop(props: TvViewProps) {
  const { model, nav, params } = props
  const { tt, locale } = useTvText()
  const tvMode = useTvMode()
  const [query, setQuery] = useState('')
  // Bibliotekets Sök-knapp öppnar söket med film och serier förvalt.
  const [scope, setScope] = useState<SearchScope>(() => (params.scope === 'vod' ? 'vod' : 'all'))
  // `off` betyder att VOD inte ska synas i Live TV alls — då finns varken
  // chips eller VOD-avsnitt att välja.
  const vodHidden = getVodMode(model.activePlaylistId) === 'off'
  const showChannels = vodHidden || scope !== 'vod'
  const showVod = !vodHidden && scope !== 'ch'
  const vod = useVodPage({
    source: model.activeSource,
    q: query,
    sort: 'new',
    enabled: showVod && query.trim().length > 0,
    limit: 20,
  })
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
   * En lodrät stapel: sökraden överst i full bredd (fält, förslag och — på
   * TV — skärmtangentbordet under förslagen), resultaten under den.
   * Tidigare låg fältet inboxat i en 760 dp bred vänsterspalt med tom yta
   * under sig och resultaten till höger. Hela vyn är EN rullningsyta, så den
   * som går ▾ från tangentbordet ner i träffarna rullar sökraden ur bild i
   * stället för att träffarna trängs i det som blir över under den.
   * Bakgrunden målas av skalet.
   */
  const outerStyle = { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: `${dp(34)}px ${dp(48)}px ${dp(48)}px`, gap: dp(28) } as const
  const topStyle = { flexShrink: 0, display: 'flex', flexDirection: 'column', gap: dp(14) } as const
  // Tangentbordets tangenter är ett rutnät som fyller bredden — utsträckt
  // över hela vyns bredd blev varje tangent orimligt bred. Fältet och
  // förslagen tar full bredd, tangentbordet stannar vid ungefär sin gamla
  // bredd, direkt under fältet och förslagen.
  const keyboardStyle = { width: '100%', maxWidth: dp(900) } as const
  // Samma element på två platser: på skrivbord ligger det riktiga fältet
  // först med förslagen direkt under; på TV är fältet displayraden ovan och
  // tangentbordet hamnar under förslagen. Bara den ena grenen monteras.
  const field = <TvTextField value={query} onChange={setQuery} onSubmit={focusFirstResult} placeholder={tt('searchPlaceholder')} autoFocus />
  const resultsStyle = { flexShrink: 0, display: 'flex', flexDirection: 'column', gap: dp(28) } as const

  return (
    <div data-testid="search-view-root" data-scroll="" style={outerStyle}>
      <div data-testid="search-top" style={topStyle}>
        {tvMode ? (
          // TvKeyboard visar ingen text själv — den här raden är fältets enda
          // display i TV-läge. Utanför TV visar `TvTextField`s riktiga
          // <input> texten själv, så raden hade bara dublett:at den.
          <div style={{ height: dp(64), borderRadius: dp(14), background: TV.s10, display: 'flex', alignItems: 'center', padding: `0 ${dp(20)}px`, fontSize: dp(28), color: query ? TV.text : 'rgba(243,244,248,0.5)' }}>
            {query || <span style={{ fontSize: dp(18) }}>{tt('searchPlaceholder')}</span>}
            <span aria-hidden="true" style={{ width: 2, height: dp(32), background: TV.acc, marginLeft: dp(4) }} />
          </div>
        ) : field}
        <div data-row="" style={{ display: 'flex', gap: dp(8), overflowX: 'auto', minHeight: dp(44) }}>
          {hints.map((hint) => (
            <div key={hint} data-testid="search-suggestion" {...station(() => setQuery(hint))} style={{ height: dp(44), minHeight: dp(44), padding: `0 ${dp(18)}px`, borderRadius: 999, background: TV.s08, display: 'inline-flex', alignItems: 'center', fontSize: dp(18), whiteSpace: 'nowrap', cursor: 'pointer' }}>{hint}</div>
          ))}
        </div>
        {tvMode ? <div style={keyboardStyle}>{field}</div> : null}
      </div>
      <div data-testid="search-results" data-live-tv-search-results="" style={resultsStyle}>
        {vodHidden ? null : (
          <div data-row="" style={{ display: 'flex', gap: dp(10) }}>
            {([['all', tt('scopeAll')], ['ch', tt('scopeChannels')], ['vod', tt('scopeVod')]] as const).map(([key, label]) => (
              <div
                key={key}
                data-testid={`search-scope-${key}`}
                data-active={key === scope ? '' : undefined}
                {...station(() => setScope(key))}
                style={{ height: dp(44), padding: `0 ${dp(20)}px`, borderRadius: 999, display: 'inline-flex', alignItems: 'center', fontSize: dp(18), cursor: 'pointer', background: key === scope ? TV.s16 : TV.s06, color: key === scope ? '#fff' : 'rgba(243,244,248,0.6)' }}
              >
                {label}
              </div>
            ))}
          </div>
        )}
        {showVod ? (
          <section data-testid="search-vod" style={{ display: 'flex', flexDirection: 'column', gap: dp(10) }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: dp(12) }}>
              <span style={{ fontSize: dp(24), fontWeight: 600 }}>{tt('searchVod')}</span>
              <span style={{ fontSize: dp(16), color: 'rgba(243,244,248,0.5)' }}>
                {tt('searchVodSub', { playlist: model.activePlaylistName ?? '' })}
              </span>
            </div>
            {query && vod.items.length === 0 ? (
              <div style={{ color: TV.dim, fontSize: dp(18) }}>{vod.loading ? tt('libraryLoading') : tt('noResults')}</div>
            ) : null}
            <div data-row="" style={{ display: 'flex', gap: dp(POSTER_GAP), overflowX: 'auto', paddingBottom: dp(4) }}>
              {vod.items.map((item) => (
                // Samma väg som Biblioteket och hubbens rad: Live TV:s egen
                // detaljvy, inte appens sida.
                <VodHit key={item.key} item={item} onOpen={() => nav.go('title', { key: item.key })} />
              ))}
            </div>
          </section>
        ) : null}
        {showChannels ? (
        <section data-testid="search-channels" style={{ display: 'flex', flexDirection: 'column', gap: dp(8) }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: dp(12) }}><span style={{ fontSize: dp(24), fontWeight: 600 }}>{tt('searchChannels')}</span><span style={{ fontSize: dp(16), color: 'rgba(243,244,248,0.5)' }}>{tt('hits', { count: channels.length })}</span></div>
          {query && channels.length === 0 ? <div style={{ color: TV.dim, fontSize: dp(18) }}>{model.channelsLoading ? tt('loadingChannels') : tt('noResults')}</div> : null}
          {channels.map((channel) => (
            <ChannelHit key={channelKey(channel)} channel={channel} model={model} nav={nav} />
          ))}
        </section>
        ) : null}
        {showChannels ? (
        <section data-testid="search-programmes" style={{ display: 'flex', flexDirection: 'column', gap: dp(6) }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: dp(12) }}><span style={{ fontSize: dp(24), fontWeight: 600 }}>{tt('searchProgrammes')}</span><span style={{ fontSize: dp(16), color: 'rgba(243,244,248,0.5)' }}>{tt('hits', { count: programmes.length })}</span></div>
          {/* Sökningen går till appen: en tom lista betyder "hämtar" tills
              svaret kommit, inte "inga träffar". */}
          {query && programmes.length === 0 ? <div data-testid="search-programmes-empty" style={{ color: TV.dim, fontSize: dp(18) }}>{programmesLoading ? tt('loadingGuide') : tt('noResults')}</div> : null}
          {programmes.map((hit) => (
            <ProgrammeHit key={`${channelKey(hit.channel)}:${hit.programme.start}`} hit={hit} model={model} nav={nav} />
          ))}
        </section>
        ) : null}
      </div>
    </div>
  )
}

/**
 * En programträff som en guiderad (Jerry 2026-10-30: "mer som EPG:n"):
 * guidens kanalcell (logoplatta med nummer, namn, kategori) och en programcell
 * som Nu/Sen-cellerna — titel, "HH:MM–HH:MM" och, för det som sänds nu,
 * accenttonad bakgrund, tunt förlopp och "N min kvar". Bara programcellen är
 * en station (som i guiden); OK går till guiden fokuserad på kanalen, håll
 * ger programmenyn (påminnelse / starta om / repris).
 */
function ProgrammeHit({ hit, model, nav }: { hit: ProgrammeSearchHit; model: LiveTvModel; nav: TvNav }) {
  const { tt, locale } = useTvText()
  const { channel, programme } = hit
  const { nowMs } = model
  const props = station(
    () => nav.go('guide', { channel: channelKey(channel) }),
    (element) => holdMenu({ channel, programme, nav, nowMs, element, tt, locale }),
    { 'data-v2f': 'inset', 'data-testid': 'search-programme-cell' },
  )
  return (
    <div data-testid="search-programme-hit" style={hitRowStyle}>
      <GuideChannelCellV2 channel={channel} model={model} selected={false} />
      <SearchProgrammeCell programme={programme} nowMs={nowMs} stationProps={props} />
    </div>
  )
}

/**
 * En kanalträff i samma form (Jerry 2026-10-30): guidens kanalcell och en
 * programcell för det som sänds NU, med "Sen …" på tidsraden när nästa
 * program är känt. Utan tablå blir cellen neutral med "ingen
 * programinformation". OK går till guiden fokuserad på kanalen, håll ger
 * kanalmenyn som förut — träffen är en kanal, inte ett program.
 */
function ChannelHit({ channel, model, nav }: { channel: M3uChannel; model: LiveTvModel; nav: TvNav }) {
  const { tt, locale } = useTvText()
  const info = model.nowFor(channel)
  const props = station(
    () => nav.go('guide', { channel: channelKey(channel) }),
    (element) => nav.channelMenu(channel, element),
    { 'data-v2f': 'inset', 'data-testid': 'search-channel-now-cell' },
  )
  const next = info.now && info.next ? `${tt('next')} ${displayTitle(info.next.title)} · ${formatClock(info.next.start, locale)}` : null
  return (
    <div data-testid="search-channel-hit" style={hitRowStyle}>
      <GuideChannelCellV2 channel={channel} model={model} selected={false} />
      <SearchProgrammeCell programme={info.now} nowMs={model.nowMs} stationProps={props} next={next} />
    </div>
  )
}

const hitRowStyle = { display: 'flex', gap: dp(GUIDE_ROW_GAP), height: dp(GUIDE_ROW_H), minHeight: dp(GUIDE_ROW_H), flexShrink: 0 } as const

/**
 * Programcellen som båda träfftyperna delar. `programme` null = ingen tablå:
 * neutral cell med "ingen programinformation".
 */
function SearchProgrammeCell({ programme, nowMs, stationProps, next = null }: { programme: EpgProgramme | null | undefined; nowMs: number; stationProps: ReturnType<typeof station>; next?: string | null }) {
  const { tt, locale } = useTvText()
  const live = programme ? programmeState(programme, nowMs) === 'live' : false
  return (
    <div {...stationProps} style={{ flex: 1, minWidth: 0, borderRadius: dp(GUIDE_CELL_RADIUS), padding: `0 ${dp(18)}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: dp(6), boxSizing: 'border-box', cursor: 'pointer', background: live ? accentMix(18) : V2.surface3 }}>
      {programme ? (
        <>
          <div style={{ fontSize: dp(20), fontWeight: 600, ...ellipsis }}>{displayTitle(programme.title)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: dp(12), fontSize: dp(15), color: 'rgba(243,244,248,0.6)', fontVariantNumeric: 'tabular-nums', minWidth: 0 }}>
            <span data-testid="search-programme-time" style={{ flexShrink: 0 }}>{`${formatClock(programme.start, locale)}–${formatClock(programme.stop, locale)}`}</span>
            {live ? (
              <>
                <div style={{ flex: 1, maxWidth: dp(320), minWidth: dp(60), height: dp(4), borderRadius: dp(4), background: 'rgba(252,252,255,0.16)', overflow: 'hidden' }}>
                  <div data-testid="search-programme-progress" style={{ height: '100%', width: `${Math.round(progressOf(programme.start, programme.stop, nowMs) * 100)}%`, background: ACCENT }} />
                </div>
                <span style={{ flexShrink: 0, fontSize: dp(14) }}>{tt('minutesLeft', { min: Math.max(0, Math.ceil((programme.stop - nowMs) / 60_000)) })}</span>
              </>
            ) : null}
            {next ? <span data-testid="search-channel-next" style={{ marginLeft: 'auto', paddingLeft: dp(12), minWidth: 0, fontSize: dp(14), color: 'rgba(243,244,248,0.5)', ...ellipsis }}>{next}</span> : null}
          </div>
        </>
      ) : (
        <div style={{ fontSize: dp(17), color: 'rgba(243,244,248,0.5)', ...ellipsis }}>{tt('noProgramme')}</div>
      )}
    </div>
  )
}

/**
 * En VOD-träff i söket: liten affisch, titel och år. 104 dp bred (≈ 80 % av
 * de tidigare 130 — Jerry 2026-10-30: "lite mindre affischer"), 2:3.
 */
/**
 * Postrarna i sökraden: en ANDEL av radens bredd, inte fasta pixlar — 7,5 syns
 * (halvan i kanten visar att raden går att rulla) både i TV:ns 1920-scen och i
 * ett skrivbordsfönster av vilken bredd som helst (Jerry 2026-10-30: "för många
 * i rad … tänk på att TV-läge kanske inte är fasta pixlar").
 */
export const SEARCH_POSTERS_VISIBLE = 7.5
const POSTER_GAP = 12

export function VodHit({ item, onOpen }: { item: VodItem; onOpen: () => void }) {
  return (
    <div data-testid="search-vod-hit" data-visible={SEARCH_POSTERS_VISIBLE} {...station(onOpen)} style={{ width: `calc((100% - ${dp(POSTER_GAP) * (SEARCH_POSTERS_VISIBLE - 0.5)}px) / ${SEARCH_POSTERS_VISIBLE})`, flexShrink: 0, cursor: 'pointer' }}>
      <div data-testid="search-vod-poster" style={{ position: 'relative', aspectRatio: '2 / 3', borderRadius: dp(10), border: `1px solid ${TV.lineCard}`, background: TV.s07, overflow: 'hidden' }}>
        {item.posterUrl ? (
          <img src={item.posterUrl} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : null}
      </div>
      <div style={{ fontSize: dp(15), fontWeight: 600, marginTop: dp(6), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
      <div style={{ fontSize: dp(13), color: 'rgba(243,244,248,0.55)' }}>{item.year ?? ''}</div>
    </div>
  )
}
