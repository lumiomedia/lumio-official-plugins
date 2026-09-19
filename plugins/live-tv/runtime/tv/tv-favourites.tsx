'use client'

import { useEffect, useRef } from 'react'
import { channelKey, movePinnedLiveTvChannel } from '../live-tv-data'
import { qualityFromName } from '../live-tv-model'
import { formatClock, progressOf } from '../live-tv-ui'
import type { TvViewProps } from './tv-shell'
import { ChannelArt, Progress, Tag, TV, cardStyle, dp, station } from './tv-ui'
import { useTvText } from './tv-strings'
import { TvFavouritesPhone } from './mobile/favourites-phone'

function escapeKey(key: string): string {
  return typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(key) : key.replace(/"/g, '\\"')
}

/**
 * Tidig gren för telefonen: ett EGET komponentträd, inte en `if` inne i
 * skrivbordsvyn (samma mönster som `TvPlayerChrome`). `phone` läses ur lådans
 * bredd och kan slå om vid körning (rotation, fönster som breddas); två
 * separata komponenter monteras om rent, och grenen själv anropar inga krokar
 * — så kan ingen krok hamna före returen och ge "rendered more/fewer hooks".
 */
export function TvFavourites(props: TvViewProps) {
  return props.phone ? <TvFavouritesPhone {...props} /> : <TvFavouritesDesktop {...props} />
}

function TvFavouritesDesktop(props: TvViewProps) {
  const { model, nav } = props
  const { tt, locale } = useTvText()
  const favourites = model.favouriteChannels
  const gridRef = useRef<HTMLDivElement | null>(null)
  const refocusKey = useRef<string | null>(null)

  // Efter Flytta upp/ner: fokus följer kortet till dess nya plats.
  useEffect(() => {
    const key = refocusKey.current
    if (!key) return
    refocusKey.current = null
    gridRef.current?.querySelector<HTMLElement>(`[data-fav-key="${escapeKey(key)}"]`)?.focus({ preventScroll: true })
  }, [favourites])

  const move = (key: string, delta: -1 | 1) => {
    movePinnedLiveTvChannel(key, delta)
    refocusKey.current = key
  }

  return (
    <div data-scroll="" style={{ flex: 1, overflowY: 'auto', padding: `${dp(34)}px ${dp(48)}px 0`, display: 'flex', flexDirection: 'column', gap: dp(22) }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: dp(16) }}>
        <span style={{ fontSize: dp(34), fontWeight: 600 }}>{tt('favourites')}</span>
        <span style={{ fontSize: dp(18), color: 'rgba(243,244,248,0.5)' }}>{tt('favouritesSub', { count: favourites.length })}</span>
        <div {...station(() => nav.go('guide', { group: 'all' }), undefined, favourites.length === 0 ? { 'data-init': '' } : {})} style={{ marginLeft: 'auto', height: dp(48), minHeight: dp(48), padding: `0 ${dp(22)}px`, borderRadius: 999, border: `1px solid ${TV.lineStrong}`, background: TV.s06, display: 'inline-flex', alignItems: 'center', fontSize: dp(18), cursor: 'pointer' }}>{tt('addFromGuide')}</div>
      </div>
      {favourites.length === 0 ? <div style={{ fontSize: dp(20), color: TV.muted }}>{tt('favouritesEmpty')}</div> : null}
      <div ref={gridRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: dp(16) }}>
        {favourites.map((channel, index) => {
          const key = channelKey(channel)
          const info = model.nowFor(channel)
          const quality = qualityFromName(channel.name)
          return (
            <div
              key={key}
              data-testid="fav-card"
              data-fav-key={key}
              {...station(
                () => nav.play({ channel }),
                (el) => nav.channelMenu(channel, el, [
                  ...(index > 0 ? [{ key: 'up', label: tt('menuMoveUp'), run: () => move(key, -1) }] : []),
                  ...(index < favourites.length - 1 ? [{ key: 'down', label: tt('menuMoveDown'), run: () => move(key, 1) }] : []),
                ]),
                index === 0 ? { 'data-init': '' } : undefined,
              )}
              style={{ ...cardStyle, borderRadius: dp(16), cursor: 'pointer' }}
            >
              <ChannelArt channel={channel} height={dp(130)}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.75))' }} />
                {quality ? <span style={{ position: 'absolute', top: dp(10), right: dp(12) }}><Tag variant="quality">{quality}</Tag></span> : null}
                <span style={{ position: 'absolute', left: dp(14), bottom: dp(10), fontSize: dp(15), color: 'rgba(243,244,248,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70%' }}>{`${index + 1} · ${channel.name}`}</span>
              </ChannelArt>
              <div style={{ padding: `${dp(14)}px ${dp(16)}px`, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: dp(8) }}>
                <div style={{ fontSize: dp(21), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.now?.title ?? tt('noProgramme')}</div>
                {info.now ? <div style={{ display: 'flex', alignItems: 'center', gap: dp(10) }}><Progress value={progressOf(info.now.start, info.now.stop, model.nowMs)} height={dp(4)} style={{ flex: 1 }} /><span style={{ fontSize: dp(14), color: 'rgba(243,244,248,0.5)' }}>{Math.max(0, Math.round((info.now.stop - model.nowMs) / 60_000))} min</span></div> : null}
                {info.next ? <div style={{ fontSize: dp(16), color: 'rgba(243,244,248,0.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tt('next')} {info.next.title} · {formatClock(info.next.start, locale)}</div> : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
