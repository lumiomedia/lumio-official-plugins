'use client'

import { useState, type ReactNode } from 'react'
import type { TvGlassMenuAction } from '@/lib/plugin-sdk'
import { channelKey, type M3uChannel } from '../../live-tv-data'
import type { CatchUpItem } from '../../catch-up'
import { formatClock, progressOf } from '../../live-tv-ui'
import { qualityFromName } from '../../live-tv-model'
import type { TvViewProps } from '../tv-shell'
import { ChannelArt, Progress, station } from '../tv-ui'
import { useTvText } from '../tv-strings'
import { ALL_STEP, useHubData } from '../hub-data'
import type { SpotlightReason } from '../tv-spotlight'
import { MT, clamp2, ellipsis } from './mobile-tokens'
import { MIcons } from './mobile-icons'
import { MobileHeader } from './mobile-header'
import { VodRowPhone } from './vod-row-phone'
import { getVodMode } from '../../vod-data'
import { MobileSheet } from './mobile-sheet'
import { MobileLogo } from './mobile-logo'
import { MobileChips } from './mobile-chips'

// Telefonen visar ETT spotlightkort i full bredd (handoffen §1), inte tre.
const SPOTLIGHT_COUNT_PHONE = 1
const RECENT_MAX = 8

/** Kortets yta: samma toner som skrivbordets `cardStyle`, men i äkta px. */
/**
 * `flexShrink: 0` är inte kosmetik — utan den FÖRSVINNER kortet.
 *
 * Hubben är en kolumn-flexbox vars innehåll är många gånger högre än skärmen.
 * Flex-items krymper som standard, och ett item vars `min-height: auto` går
 * att lösa till noll krymper hela vägen. `overflow: hidden` — som kortet har
 * för sina rundade hörn — är precis det som får `auto` att bli noll i stället
 * för innehållets höjd. Spotlightkortet kollapsade därför till 2 px: de två
 * 1px-ramarna, och inget mer. På telefonen såg det ut som en tom orange
 * strimma (fokusringen runt ingenting).
 */
const card = { background: MT.s07, border: `1px solid ${MT.line08}`, overflow: 'hidden' as const, cursor: 'pointer' as const, flexShrink: 0 }

/**
 * Taggarna i bildytorna är handoffens egna 11 px-mått — inte `Tag` ur
 * `tv-ui.tsx`, vars mått är TV-scenens (13 px + dp-padding).
 */
function LiveTag({ children }: { children: ReactNode }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 24, padding: '0 10px', borderRadius: 8, background: MT.liveSoft, color: MT.liveText, fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
      <span style={{ width: 7, height: 7, borderRadius: 999, background: MT.live }} />
      {children}
    </span>
  )
}
function ReasonTag({ children }: { children: ReactNode }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', minHeight: 22, padding: '0 8px', borderRadius: 7, background: 'rgba(0,0,0,0.5)', color: MT.text, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{children}</span>
}
function ReplayTag({ children }: { children: ReactNode }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', minHeight: 22, padding: '0 8px', borderRadius: 7, background: MT.accMix(22), color: '#ffd9c9', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{children}</span>
}

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0 }}>
      <span style={{ fontSize: 17, fontWeight: 600, ...ellipsis }}>{title}</span>
      {sub ? <span style={{ fontSize: 13, color: MT.dim, flexShrink: 0 }}>{sub}</span> : null}
    </div>
  )
}

/**
 * Hubben på telefon (fas 3, handoffen §1). Samma data som skrivbordsgrenen
 * (`useHubData`), egen layout i äkta CSS-px: ett spotlightkort, sidoscrollande
 * band och ett tvåkolumnsrutnät. Ingen klocka, inga fjärrkontrollstexter.
 */
export function TvHubPhone({ model, nav }: TvViewProps) {
  const { tt, locale } = useTvText()
  const [playlistOpen, setPlaylistOpen] = useState(false)
  const { favourites, recent, spotlight, replays, chips, filtered, shown, group, setGroup, visible, setVisible, epgStatus } = useHubData(model, SPOTLIGHT_COUNT_PHONE)
  const noProgrammeLabel = epgStatus === 'loading' ? tt('loadingGuide') : tt('noProgramme')
  const reasonLabel = (reason: SpotlightReason) =>
    reason === 'favouriteLive' ? tt('spotlightFavouriteLive') : reason === 'favourite' ? tt('spotlightFavourite') : reason === 'recent' ? tt('spotlightRecent') : tt('spotlightOnNow')
  const minutesLeft = (stop: number) => tt('minutesLeft', { min: Math.max(0, Math.round((stop - model.nowMs) / 60_000)) })
  const cardStation = (channel: M3uChannel, extra?: Record<string, string>) => station(() => nav.play({ channel }), (el) => nav.channelMenu(channel, el), extra)

  const chipItems: { key: string | null; label: string; id: string }[] = [
    { key: null, label: tt('allGroups'), id: 'all' },
    ...(favourites.length ? [{ key: '__favs', label: tt('favourites'), id: 'favs' }] : []),
    ...chips.map((g) => ({ key: g, label: g, id: g })),
  ]

  // Spellistvalet är ett bottenark (inte skrivbordets nedfällda meny):
  // arket registrerar sig i Bakåt-kedjan självt via `pushLayer`.
  const playlistItems: TvGlassMenuAction[] = [
    ...[{ id: null as string | null, name: tt('allPlaylists') }, ...model.playlists].map((p) => ({
      key: p.id ?? '__all',
      label: p.name,
      run: () => { model.setActivePlaylist(p.id); setGroup(null); setVisible(ALL_STEP) },
    })),
    { key: '__add', label: tt('addPlaylist'), run: () => nav.go('settings', { tab: 'playlists' }) },
  ]

  const pill = (
    <div data-testid="playlist-pill" {...station(() => setPlaylistOpen(true))} style={{ minHeight: 36, padding: '0 12px', borderRadius: 999, background: MT.s12, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer', maxWidth: 180 }}>
      <span style={ellipsis}>{model.activePlaylistName ?? tt('allPlaylists')}</span>
      <span style={{ flexShrink: 0, display: 'inline-flex' }}><MIcons.CaretDown size={16} /></span>
    </div>
  )
  const sheet = playlistOpen ? <MobileSheet title={tt('playlists')} items={playlistItems} onClose={() => setPlaylistOpen(false)} pushLayer={nav.pushLayer} testId="playlist-sheet" /> : null
  // Sidhuvudet äger sina egna kanter (60 px vänster för värdens menychip,
  // 16 höger) — kolumnens 16 px-luft dras tillbaka runt det.
  const header = <div style={{ margin: `0 -${MT.PAD}px` }}><MobileHeader title={tt('liveTv')} right={pill} /></div>

  if (model.allChannels.length === 0) {
    return (
      <div data-scroll="" style={{ flex: 1, overflowY: 'auto', padding: `0 ${MT.PAD}px`, paddingBottom: MT.SCROLL_PAD_BOTTOM, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {header}
        {/* Kanalerna kommer ur appens index: tomt betyder "hämtar" tills
            sidhämtningen är klar, annars "lägg till en spellista". */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 32, gap: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{model.channelsLoading ? tt('loadingChannels') : tt('emptyTitle')}</div>
          <div style={{ fontSize: 15, color: MT.muted }}>{model.channelsLoading ? '' : tt('emptyBody')}</div>
          <div {...station(() => nav.go('settings'), undefined, { 'data-init': '' })} style={{ marginTop: 8, minHeight: 48, padding: '0 24px', borderRadius: 999, background: MT.acc, color: MT.onAcc, display: 'inline-flex', alignItems: 'center', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>{tt('openSettings')}</div>
        </div>
        {sheet}
      </div>
    )
  }

  const pick = spotlight[0]
  const recentCards = recent.filter((c) => !replays.some((r) => channelKey(r.channel) === channelKey(c))).slice(0, RECENT_MAX)

  return (
    <div data-scroll="" style={{ flex: 1, overflowY: 'auto', padding: `0 ${MT.PAD}px`, paddingBottom: MT.SCROLL_PAD_BOTTOM, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {header}
      {model.appTooOld ? (
        <div data-testid="live-tv-app-too-old" style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(244,132,95,0.18)', color: '#f4845f', fontSize: 14 }}>{tt('appTooOld')}</div>
      ) : null}

      {/* Sökfält: leder till sökvyn (systemets tangentbord bor där). */}
      <div data-testid="hub-search" {...station(() => nav.go('search'))} style={{ minHeight: 44, borderRadius: 14, background: MT.s10, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <span style={{ display: 'inline-flex', color: 'rgba(243,244,248,0.55)', flexShrink: 0 }}><MIcons.MagnifyingGlass size={18} /></span>
        <span style={{ fontSize: 15, color: 'rgba(243,244,248,0.55)', ...ellipsis, flex: 1 }}>{tt('searchPlaceholder')}</span>
      </div>

      {/* Spotlight: ett kort, urvalsregeln är dagens (`tv-spotlight.ts`). */}
      {pick ? (() => {
        const info = model.nowFor(pick.channel)
        const number = model.channelNumber(pick.channel)
        return (
          <div data-testid="hub-spotlight" {...cardStation(pick.channel, { 'data-init': '' })} style={{ ...card, borderRadius: 18 }}>
            {/* Inte MobileLogo: en 186 px-yta ska visa bildruta/logotyp i
                full storlek, med initialer i samma kedja som skrivbordet. */}
            <ChannelArt channel={pick.channel} height={186} radius={0}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 42%, rgba(0,0,0,0.78))' }} />
              {info.now ? <div style={{ position: 'absolute', top: 10, left: 10 }}><LiveTag>{tt('live')}</LiveTag></div> : null}
              <div style={{ position: 'absolute', top: 10, right: 10 }}><ReasonTag>{reasonLabel(pick.reason)}</ReasonTag></div>
              <div style={{ position: 'absolute', left: 12, right: 12, bottom: 10, fontSize: 13, color: 'rgba(243,244,248,0.8)', ...ellipsis }}>{number ? `${number} · ` : ''}{pick.channel.name}</div>
            </ChannelArt>
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 18, fontWeight: 600, ...ellipsis }}>{info.now ? info.now.title : noProgrammeLabel}</div>
              {info.now ? (
                <>
                  <div style={{ fontSize: 13, color: MT.muted, ...ellipsis }}>{`${formatClock(info.now.start, locale)}–${formatClock(info.now.stop, locale)} · ${minutesLeft(info.now.stop)}`}</div>
                  <Progress value={progressOf(info.now.start, info.now.stop, model.nowMs)} height={5} />
                </>
              ) : null}
            </div>
          </div>
        )
      })() : null}

      {/* Favoriter: sidoscroll med snap på kortkant, 2,5 kort synliga. */}
      {favourites.length > 0 ? (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
          <SectionTitle title={tt('favourites')} sub={tt('channelsCount', { count: favourites.length })} />
          <div data-row="" data-testid="hub-favourites" style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollSnapType: 'x mandatory', margin: `0 -${MT.PAD}px`, padding: `0 ${MT.PAD}px`, scrollPaddingLeft: MT.PAD }}>
            {favourites.map((channel) => {
              const info = model.nowFor(channel)
              return (
                <div key={channelKey(channel)} {...station(() => nav.openChannel(channel), (el) => nav.channelMenu(channel, el))} style={{ width: 156, minHeight: 72, flexShrink: 0, scrollSnapAlign: 'start', borderRadius: 14, background: MT.s08, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <MobileLogo channel={channel} width={44} height={30} radius={6} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.25, ...clamp2 }}>{channel.name}</div>
                    <div style={{ fontSize: 12, color: MT.muted, ...ellipsis }}>{info.now?.title ?? noProgrammeLabel}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

      {/* Fortsätt titta: repriser + senast sedda, som på skrivbordet. */}
      {replays.length > 0 || recentCards.length > 0 ? (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
          <SectionTitle title={tt('continueWatching')} />
          <div data-row="" data-testid="hub-continue" style={{ display: 'flex', gap: 10, overflowX: 'auto', margin: `0 -${MT.PAD}px`, padding: `0 ${MT.PAD}px` }}>
            {replays.map((item: CatchUpItem) => (
              <div key={`${channelKey(item.channel)}:${item.programme.start}`} {...station(() => nav.play({ channel: item.channel, url: item.url, label: item.programme.title }), (el) => nav.channelMenu(item.channel, el))} style={{ ...card, width: 170, flexShrink: 0, borderRadius: 14 }}>
                <ChannelArt channel={item.channel} height={96} radius={0}>
                  <div style={{ position: 'absolute', top: 8, right: 8 }}><ReplayTag>{tt('replay')}</ReplayTag></div>
                  <div style={{ position: 'absolute', left: 8, bottom: 6, color: MT.text, display: 'inline-flex' }}><MIcons.Play size={22} /></div>
                </ChannelArt>
                <div style={{ padding: '8px 10px', minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, ...ellipsis }}>{item.programme.title}</div>
                  <div style={{ fontSize: 12, color: MT.muted, ...ellipsis }}>{`${item.channel.name} · ${formatClock(item.programme.start, locale)} · ${Math.round((item.programme.stop - item.programme.start) / 60_000)} min`}</div>
                </div>
              </div>
            ))}
            {recentCards.map((channel) => {
              const info = model.nowFor(channel)
              return (
                <div key={`recent:${channelKey(channel)}`} {...cardStation(channel)} style={{ ...card, width: 170, flexShrink: 0, borderRadius: 14 }}>
                  <ChannelArt channel={channel} height={96} radius={0}>
                    <div style={{ position: 'absolute', top: 8, right: 8 }}><ReasonTag>{tt('spotlightRecent')}</ReasonTag></div>
                    <div style={{ position: 'absolute', left: 8, bottom: 6, color: MT.text, display: 'inline-flex' }}><MIcons.Play size={22} /></div>
                  </ChannelArt>
                  <div style={{ padding: '8px 10px', minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, ...ellipsis }}>{info.now?.title ?? channel.name}</div>
                    <div style={{ fontSize: 12, color: MT.muted, ...ellipsis }}>{channel.name}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

      {/* Film & serier — under Fortsätt titta, över Alla kanaler, som på TV. */}
      <VodRowPhone
        mode={getVodMode(model.activePlaylistId)}
        source={model.activeSource}
        playlistName={model.activePlaylistName ?? tt('allPlaylists')}
        nav={nav}
      />

      {/* Alla kanaler: chips i sidoscroll, rutnät i två kolumner, Visa fler i steg. */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
        <SectionTitle title={tt('allChannelsCount', { count: filtered.length.toLocaleString(locale) })} />
        <MobileChips items={chipItems} value={group} onChange={(k) => { setGroup(k); setVisible(ALL_STEP) }} testId="all-channels-filter-row" />
        <div data-testid="all-channels" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          {shown.map((channel, index) => {
            const info = model.nowFor(channel)
            const number = model.channelNumber(channel)
            const pinned = model.pinnedSet.has(channelKey(channel))
            return (
              <div key={channelKey(channel)} {...cardStation(channel, !pick && index === 0 ? { 'data-init': '' } : undefined)} style={{ ...card, borderRadius: 14, minWidth: 0 }}>
                <ChannelArt channel={channel} aspect="16 / 10" radius={12}>
                  <span style={{ position: 'absolute', top: 6, left: 8, fontSize: 12, color: 'rgba(243,244,248,0.6)' }}>{number ?? ''}</span>
                  {pinned ? <span style={{ position: 'absolute', top: 6, right: 8, color: MT.acc, display: 'inline-flex' }}><MIcons.Heart size={14} filled /></span> : null}
                  {model.locked.has(channelKey(channel)) ? <span style={{ position: 'absolute', bottom: 6, right: 8, color: 'rgba(243,244,248,0.6)', display: 'inline-flex' }}><MIcons.Lock size={14} /></span> : null}
                  {info.now ? <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}><Progress value={progressOf(info.now.start, info.now.stop, model.nowMs)} height={3} track="rgba(0,0,0,0.4)" style={{ borderRadius: 0 }} /></div> : null}
                </ChannelArt>
                <div style={{ padding: '8px 10px', minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, ...ellipsis }}>{channel.name}</div>
                  <div style={{ fontSize: 12, color: MT.muted, ...ellipsis }}>{info.now?.title ?? (qualityFromName(channel.name) ?? channel.group)}</div>
                </div>
              </div>
            )
          })}
        </div>
        {filtered.length > visible ? (
          <div data-testid="show-more" {...station(() => setVisible((v) => v + ALL_STEP))} style={{ minHeight: 44, borderRadius: 12, background: MT.s08, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>{tt('showMore')}</div>
        ) : null}
      </section>
      {sheet}
    </div>
  )
}
