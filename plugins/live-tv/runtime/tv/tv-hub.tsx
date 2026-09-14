'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { channelKey, type M3uChannel } from '../live-tv-data'
import { catchUpAcross, type CatchUpItem } from '../catch-up'
import { pickReplayChannels } from '../view-helpers'
import { formatClock, progressOf } from '../live-tv-ui'
import { qualityFromName, startOfLocalDay } from '../live-tv-model'
import { useEpgLoadStatus } from '../hooks/useEpgLoadStatus'
import { usePhoneSurface } from '../hooks/usePhoneSurface'
import { useSchedules } from '../hooks/useSchedules'
import type { TvViewProps } from './tv-shell'
import { ChannelArt, Chip, Icons, Progress, Tag, TV, cardStyle, dp, station, useTvClockNode } from './tv-ui'
import { useTvText } from './tv-strings'
import { pickSpotlight, type SpotlightReason } from './tv-spotlight'

// Spotlight: 3 kolumner på skrivbord/TV, 2 i porträtt (spec §3).
const SPOTLIGHT_COUNT_DESKTOP = 3
const SPOTLIGHT_COUNT_PHONE = 2
// "Alla kanaler": den gamla specen kallade DETTA rutnät "hubbens
// sexkolumnsrutnät" (inte spotlighten, som alltid varit 3) — sex på
// skrivbord/TV, två i porträtt, samma behandling som spotlighten.
const ALL_CHANNELS_COLUMNS_DESKTOP = 6
const ALL_CHANNELS_COLUMNS_PHONE = 2
const ALL_STEP = 36
const MAX_CHIPS = 12
/** Repriser: hur långt bakåt tablån hämtas (urvalet av kanaler görs i view-helpers). */
const REPLAY_DAYS = 3

export function TvHub({ model, nav }: TvViewProps) {
  const { tt, locale } = useTvText()
  const clock = useTvClockNode(locale)
  const phone = usePhoneSurface()
  const spotlightCount = phone ? SPOTLIGHT_COUNT_PHONE : SPOTLIGHT_COUNT_DESKTOP
  const allChannelsColumns = phone ? ALL_CHANNELS_COLUMNS_PHONE : ALL_CHANNELS_COLUMNS_DESKTOP
  const [group, setGroup] = useState<string | null>(null)
  const [visible, setVisible] = useState(ALL_STEP)
  const [playlistOpen, setPlaylistOpen] = useState(false)
  const pillRef = useRef<HTMLDivElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const epgStatus = useEpgLoadStatus(model.epgListId, model.epgUrls)

  const favourites = model.favouriteChannels
  const recent = useMemo(() => model.history.map((h) => model.byUrl.get(h.url)).filter((c): c is M3uChannel => Boolean(c)), [model.history, model.byUrl])
  const spotlight = useMemo(() => pickSpotlight({ favourites, recent, channels: model.channels, nowFor: model.nowFor, count: spotlightCount }), [favourites, recent, model.channels, model.nowFor, spotlightCount])
  /**
   * Repriser: favoriter och nyss sedda kanaler med arkiv (Xtream tv_archive),
   * inte hela spellistan. Tablån bor i appen sedan lagring v2, så varje kanal
   * i urvalet är en nyckel i ett fönsteranrop — 200 kanaler × 3 dygn vid varje
   * montering för ett band med åtta kort var den dyraste frågan i hela vyn.
   */
  const replayChannels = useMemo(() => pickReplayChannels(favourites, recent), [favourites, recent])
  const replayWindow = useMemo(() => {
    const to = startOfLocalDay(model.nowMs, 1)
    return { from: to - REPLAY_DAYS * 86_400_000, to }
  }, [model.nowMs])
  const { schedules: replaySchedules } = useSchedules(replayChannels, replayWindow.from, replayWindow.to)
  const replays = useMemo(() => catchUpAcross(replayChannels, replaySchedules, model.nowMs, 8), [replayChannels, replaySchedules, model.nowMs])
  const chips = useMemo(() => model.groups.slice(0, MAX_CHIPS), [model.groups])
  const filtered = useMemo(() => {
    if (group === '__favs') return favourites
    if (group) return model.channels.filter((c) => c.group === group)
    return model.channels
  }, [group, favourites, model.channels])
  const shown = filtered.slice(0, visible)
  const noProgrammeLabel = epgStatus === 'loading' ? tt('loadingGuide') : tt('noProgramme')

  // Spellistmenyn är ett lager: Back stänger, fokus tillbaka till pillen.
  //
  // Effekten beror BARA på `playlistOpen` — en gång per öppning. Med `nav` i
  // listan kördes den om vid varje omrender av skalet (minuttick,
  // lagringsändring) och flyttade då fokus tillbaka till [data-init] mitt i
  // att användaren pilade i menyn. `nav` läses i stället ur en ref.
  const navRef = useRef(nav)
  useEffect(() => { navRef.current = nav })
  useEffect(() => {
    if (!playlistOpen) return
    const close = () => { setPlaylistOpen(false); window.setTimeout(() => pillRef.current?.focus({ preventScroll: true }), 0) }
    const off = navRef.current.pushLayer(close)
    window.setTimeout(() => menuRef.current?.querySelector<HTMLElement>('[data-init]')?.focus({ preventScroll: true }), 0)
    return off
  }, [playlistOpen])

  const reasonLabel = (reason: SpotlightReason) =>
    reason === 'favouriteLive' ? tt('spotlightFavouriteLive') : reason === 'favourite' ? tt('spotlightFavourite') : reason === 'recent' ? tt('spotlightRecent') : tt('spotlightOnNow')
  const minutesLeft = (stop: number) => tt('minutesLeft', { min: Math.max(0, Math.round((stop - model.nowMs) / 60_000)) })
  const cardStation = (channel: M3uChannel, extra?: Record<string, string>) => station(() => nav.play({ channel }), (el) => nav.channelMenu(channel, el), extra)

  if (model.allChannels.length === 0) {
    return (
      <div style={{ padding: dp(48), display: 'flex', flexDirection: 'column', gap: dp(16) }}>
        {/* Kanalerna kommer ur appens index: tomt betyder "hämtar" tills
            sidhämtningen är klar, annars "lägg till en spellista". Utan
            skillnaden möttes varje kallstart av tomsidan i en halv sekund. */}
        <div style={{ fontSize: dp(34), fontWeight: 600 }}>{model.channelsLoading ? tt('loadingChannels') : tt('emptyTitle')}</div>
        <div style={{ fontSize: dp(20), color: TV.muted }}>{model.channelsLoading ? '' : tt('emptyBody')}</div>
        <div {...station(() => nav.go('settings'), undefined, { 'data-init': '' })} style={{ alignSelf: 'flex-start', height: dp(52), padding: `0 ${dp(24)}px`, borderRadius: 999, background: TV.acc, color: TV.onAcc, display: 'inline-flex', alignItems: 'center', fontSize: dp(19), fontWeight: 600 }}>{tt('openSettings')}</div>
      </div>
    )
  }

  return (
    <div data-scroll="" style={{ flex: 1, overflowY: 'auto', padding: `${dp(30)}px ${dp(48)}px ${dp(48)}px`, display: 'flex', flexDirection: 'column', gap: dp(22), scrollPaddingTop: dp(120) }}>
      {/* Appen saknar v2-endpointerna (0.1.596+): starten hoppade över
          migreringen med flit, så vyn kan vara tom utan att något är trasigt. */}
      {model.appTooOld ? (
        <div data-testid="live-tv-app-too-old" style={{ padding: `${dp(12)}px ${dp(18)}px`, borderRadius: dp(12), background: 'rgba(244,132,95,0.18)', color: '#f4845f', fontSize: dp(19) }}>{tt('appTooOld')}</div>
      ) : null}
      {/*
        Topprad. `flex-wrap` av samma skäl som guidens rubrikrader (spec 5):
        i breddgrenen (1280 designpixlar, skrivbordets TV-läge i ett fönster
        smalare än 16:9) ryms inte titel + spellistpill + sökchip (min 420) +
        kanalguideknapp + klocka på en rad. Utan brytning pressades sökchipet
        in i klockan; nu går det som inte får plats ner på nästa rad, och
        klockan — värdens tvåradiga `TvClock` — behåller sin bredd i stället
        för att krympa in i grannen. Vid 1920 ryms allt och inget ändras.
      */}
      <div data-testid="hub-topbar" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: dp(20), rowGap: dp(12) }}>
        <div style={{ fontSize: dp(34), fontWeight: 600 }}>{tt('liveTv')}</div>
        <div style={{ position: 'relative' }}>
          <div ref={pillRef} data-testid="playlist-pill" {...station(() => setPlaylistOpen(true), undefined, spotlight.length === 0 && shown.length === 0 ? { 'data-init': '' } : undefined)} style={{ height: dp(52), padding: `0 ${dp(22)}px`, borderRadius: 999, background: TV.s12, display: 'inline-flex', alignItems: 'center', gap: dp(10), fontSize: dp(20), fontWeight: 600, cursor: 'pointer' }}>
            {model.activePlaylistName ?? tt('allPlaylists')} <Icons.ChevronDown />
          </div>
          {playlistOpen ? (
            <div ref={menuRef} role="menu" data-panel-root="" data-scroll="" data-live-tv-layer="" style={{ position: 'absolute', top: `calc(100% + ${dp(8)}px)`, left: 0, zIndex: 60, width: dp(380), padding: dp(8), borderRadius: dp(16), background: 'rgba(58,59,66,0.98)', boxShadow: '0 24px 64px rgba(0,0,0,0.55)', maxHeight: dp(560), overflowY: 'auto' }}>
              {[{ id: null as string | null, name: tt('allPlaylists'), count: model.allChannels.length }, ...model.playlists].map((p) => {
                const active = (model.activePlaylistId ?? null) === p.id
                return (
                  <div key={p.id ?? '__all'} data-testid={`playlist-${p.id ?? 'all'}`} data-live-tv-menu-item="" {...station(() => { model.setActivePlaylist(p.id); setPlaylistOpen(false); setGroup(null); setVisible(ALL_STEP); window.setTimeout(() => pillRef.current?.focus({ preventScroll: true }), 0) }, undefined, active ? { 'data-init': '' } : {})} style={{ height: dp(56), padding: `0 ${dp(16)}px`, borderRadius: dp(12), display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: active ? TV.s12 : 'transparent', cursor: 'pointer' }}>
                    <span style={{ fontSize: dp(19), fontWeight: 600 }}>{p.name}</span>
                    <span style={{ fontSize: dp(14), color: 'rgba(243,244,248,0.5)' }}>{tt('channelsCount', { count: p.count })}</span>
                  </div>
                )
              })}
              <div data-live-tv-menu-item="" {...station(() => { setPlaylistOpen(false); nav.go('settings', { tab: 'playlists' }) })} style={{ height: dp(56), padding: `0 ${dp(16)}px`, display: 'flex', alignItems: 'center', fontSize: dp(17), color: 'rgba(243,244,248,0.65)', borderTop: `1px solid ${TV.line}`, marginTop: dp(4), cursor: 'pointer' }}>{tt('addPlaylist')}</div>
            </div>
          ) : null}
        </div>
        <div {...station(() => nav.go('search'))} style={{ height: dp(52), minWidth: dp(420), padding: `0 ${dp(22)}px`, borderRadius: 999, background: TV.s10, display: 'inline-flex', alignItems: 'center', gap: dp(12), color: 'rgba(243,244,248,0.7)', fontSize: dp(20), cursor: 'pointer' }}>
          <Icons.Search size={dp(20)} /> {tt('searchPlaceholder')}
        </div>
        <div {...station(() => nav.go('guide'))} style={{ height: dp(52), padding: `0 ${dp(22)}px`, borderRadius: 999, border: `1px solid ${TV.lineStrong}`, background: TV.s06, display: 'inline-flex', alignItems: 'center', gap: dp(10), fontSize: dp(20), cursor: 'pointer' }}>
          <Icons.Calendar /> {tt('railGuide')}
        </div>
        <div data-testid="hub-clock" style={{ marginLeft: 'auto', flexShrink: 0, textAlign: 'right' }}>{clock}</div>
      </div>

      {/* Spotlight */}
      {spotlight.length > 0 ? (
        <div data-testid="hub-spotlight" data-row="" style={{ display: 'grid', gridTemplateColumns: `repeat(${spotlightCount}, minmax(0, 1fr))`, gap: dp(20) }}>
          {spotlight.map((pick, index) => {
            const info = model.nowFor(pick.channel)
            const number = model.channelNumber(pick.channel)
            return (
              <div key={channelKey(pick.channel)} {...cardStation(pick.channel, index === 0 ? { 'data-init': '' } : undefined)} style={{ ...cardStyle, borderRadius: dp(18), cursor: 'pointer' }}>
                <ChannelArt channel={pick.channel} height={dp(150)}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.75))' }} />
                  <div style={{ position: 'absolute', top: dp(12), right: dp(12) }}><Tag variant="reason">{reasonLabel(pick.reason)}</Tag></div>
                  <div style={{ position: 'absolute', left: dp(16), bottom: dp(12), display: 'flex', alignItems: 'center', gap: dp(10), fontSize: dp(16), color: 'rgba(243,244,248,0.75)' }}>
                    {info.now ? <Tag variant="live">{tt('live')}</Tag> : null}
                    <span>{number ? `${number} · ` : ''}{pick.channel.name}</span>
                  </div>
                </ChannelArt>
                <div style={{ padding: `${dp(16)}px ${dp(18)}px`, display: 'flex', flexDirection: 'column', gap: dp(8) }}>
                  <div style={{ fontSize: dp(24), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.now ? info.now.title : noProgrammeLabel}</div>
                  {info.now ? (
                    <>
                      <div style={{ fontSize: dp(17), color: 'rgba(243,244,248,0.6)' }}>{`${formatClock(info.now.start, locale)}–${formatClock(info.now.stop, locale)} · ${minutesLeft(info.now.stop)}`}</div>
                      <Progress value={progressOf(info.now.start, info.now.stop, model.nowMs)} />
                    </>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {/* Favoriter */}
      {favourites.length > 0 ? (
        <section style={{ display: 'flex', flexDirection: 'column', gap: dp(14) }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: dp(14) }}><span style={{ fontSize: dp(26), fontWeight: 600 }}>{tt('favourites')}</span><span style={{ fontSize: dp(17), color: 'rgba(243,244,248,0.5)' }}>{tt('channelsCount', { count: favourites.length })}</span></div>
          <div data-row="" style={{ display: 'flex', gap: dp(14), overflowX: 'auto', paddingBottom: dp(4) }}>
            {favourites.map((channel) => {
              const info = model.nowFor(channel)
              return (
                <div key={channelKey(channel)} {...station(() => nav.openChannel(channel), (el) => nav.channelMenu(channel, el))} style={{ ...cardStyle, background: TV.s08, width: dp(300), height: dp(88), flexShrink: 0, display: 'flex', alignItems: 'center', gap: dp(14), padding: `0 ${dp(14)}px`, cursor: 'pointer' }}>
                  <ChannelArt channel={channel} style={{ width: dp(76), height: dp(50), flexShrink: 0 }} radius={dp(8)} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: dp(19), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{channel.name}</div>
                    <div style={{ fontSize: dp(16), color: 'rgba(243,244,248,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.now?.title ?? noProgrammeLabel}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

      {/* Fortsätt titta */}
      {replays.length > 0 || recent.length > 0 ? (
        <section style={{ display: 'flex', flexDirection: 'column', gap: dp(14) }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: dp(14) }}><span style={{ fontSize: dp(26), fontWeight: 600 }}>{tt('continueWatching')}</span><span style={{ fontSize: dp(17), color: 'rgba(243,244,248,0.5)' }}>{tt('continueSub')}</span></div>
          <div data-row="" style={{ display: 'flex', gap: dp(14), overflowX: 'auto', paddingBottom: dp(4) }}>
            {replays.map((item: CatchUpItem) => (
              <div key={`${channelKey(item.channel)}:${item.programme.start}`} {...station(() => nav.play({ channel: item.channel, url: item.url, label: item.programme.title }), (el) => nav.channelMenu(item.channel, el))} style={{ ...cardStyle, width: dp(300), flexShrink: 0, cursor: 'pointer' }}>
                <ChannelArt channel={item.channel} height={dp(120)}>
                  <div style={{ position: 'absolute', top: dp(10), right: dp(10) }}><Tag variant="replay">{tt('replay')}</Tag></div>
                  <div style={{ position: 'absolute', left: dp(12), bottom: dp(10), color: TV.text }}><Icons.Play size={dp(28)} /></div>
                </ChannelArt>
                <div style={{ padding: `${dp(12)}px ${dp(14)}px` }}>
                  <div style={{ fontSize: dp(19), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.programme.title}</div>
                  <div style={{ fontSize: dp(15), color: 'rgba(243,244,248,0.55)' }}>{`${item.channel.name} · ${formatClock(item.programme.start, locale)} · ${Math.round((item.programme.stop - item.programme.start) / 60_000)} min`}</div>
                </div>
              </div>
            ))}
            {recent.filter((c) => !replays.some((r) => channelKey(r.channel) === channelKey(c))).slice(0, 8).map((channel) => {
              const info = model.nowFor(channel)
              return (
                <div key={`recent:${channelKey(channel)}`} {...cardStation(channel)} style={{ ...cardStyle, width: dp(300), flexShrink: 0, cursor: 'pointer' }}>
                  <ChannelArt channel={channel} height={dp(120)}>
                    <div style={{ position: 'absolute', top: dp(10), right: dp(10) }}><Tag variant="reason">{tt('spotlightRecent')}</Tag></div>
                    <div style={{ position: 'absolute', left: dp(12), bottom: dp(10), color: TV.text }}><Icons.Play size={dp(28)} /></div>
                  </ChannelArt>
                  <div style={{ padding: `${dp(12)}px ${dp(14)}px` }}>
                    <div style={{ fontSize: dp(19), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.now?.title ?? channel.name}</div>
                    <div style={{ fontSize: dp(15), color: 'rgba(243,244,248,0.55)' }}>{channel.name}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

      {/* Alla kanaler */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: dp(14) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: dp(14) }}>
          <span style={{ fontSize: dp(26), fontWeight: 600 }}>{tt('allChannels')}</span>
          <span style={{ fontSize: dp(17), color: 'rgba(243,244,248,0.5)' }}>{tt('allChannelsSub', { playlist: model.activePlaylistName ?? tt('allPlaylists'), count: filtered.length })}</span>
          <div data-row="" style={{ marginLeft: 'auto', display: 'flex', gap: dp(10), overflowX: 'auto', maxWidth: '55%' }}>
            {[{ key: null as string | null, label: tt('allGroups'), id: 'all' }, ...(favourites.length ? [{ key: '__favs', label: tt('favourites'), id: 'favs' }] : []), ...chips.map((g) => ({ key: g, label: g, id: g }))].map((chip) => (
              <Chip key={chip.id} active={group === chip.key} {...station(() => { setGroup(chip.key); setVisible(ALL_STEP) }, undefined, { 'data-testid': `chip-${chip.id}` })} style={{ height: dp(40), fontSize: dp(16), padding: `0 ${dp(18)}px` }}>{chip.label}</Chip>
            ))}
          </div>
        </div>
        <div data-testid="all-channels" style={{ display: 'grid', gridTemplateColumns: `repeat(${allChannelsColumns}, minmax(0, 1fr))`, gap: dp(14) }}>
          {shown.map((channel, index) => {
            const info = model.nowFor(channel)
            const number = model.channelNumber(channel)
            const pinned = model.pinnedSet.has(channelKey(channel))
            return (
              <div key={channelKey(channel)} {...cardStation(channel, spotlight.length === 0 && index === 0 ? { 'data-init': '' } : undefined)} style={{ ...cardStyle, cursor: 'pointer' }}>
                <ChannelArt channel={channel} aspect="16 / 10">
                  <span style={{ position: 'absolute', top: dp(8), left: dp(10), fontSize: dp(13), color: 'rgba(243,244,248,0.55)' }}>{number ?? ''}</span>
                  {pinned ? <span style={{ position: 'absolute', top: dp(8), right: dp(10), color: TV.acc }}><Icons.Heart size={dp(16)} filled /></span> : null}
                  {model.locked.has(channelKey(channel)) ? <span style={{ position: 'absolute', bottom: dp(10), right: dp(10), color: 'rgba(243,244,248,0.55)' }}><Icons.Lock size={dp(16)} /></span> : null}
                  {info.now ? <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}><Progress value={progressOf(info.now.start, info.now.stop, model.nowMs)} height={dp(3)} track="rgba(0,0,0,0.4)" style={{ borderRadius: 0 }} /></div> : null}
                </ChannelArt>
                <div style={{ padding: `${dp(10)}px ${dp(12)}px` }}>
                  <div style={{ fontSize: dp(17), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{channel.name}</div>
                  <div style={{ fontSize: dp(15), color: 'rgba(243,244,248,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.now?.title ?? (qualityFromName(channel.name) ?? channel.group)}</div>
                </div>
              </div>
            )
          })}
        </div>
        {filtered.length > visible ? (
          <div {...station(() => setVisible((v) => v + ALL_STEP))} style={{ alignSelf: 'center', height: dp(48), padding: `0 ${dp(24)}px`, borderRadius: 999, background: TV.s10, display: 'inline-flex', alignItems: 'center', fontSize: dp(18), cursor: 'pointer' }}>{tt('showMore')}</div>
        ) : null}
        <div style={{ fontSize: dp(16), color: TV.faint }}>{tt('helpHub')}</div>
      </section>
    </div>
  )
}
