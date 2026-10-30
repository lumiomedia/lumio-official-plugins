'use client'

import { useMemo, type JSX } from 'react'
import { channelKey, getLiveTvLogoSrc, type M3uChannel } from '../live-tv-data'
import type { CatchUpItem } from '../catch-up'
import type { EpgProgramme } from '../epg/types'
import { formatClock, progressOf } from '../live-tv-ui'
import { qualityFromName } from '../live-tv-model'
import { useTvMode } from '@/lib/plugin-sdk'
import type { TvViewProps } from './tv-shell'
import { Chip, Icons, TV, dp, station, useTvClockNode } from './tv-ui'
import { useTvText } from './tv-strings'
import type { SpotlightPick, SpotlightReason } from './tv-spotlight'
import { ALL_STEP, useHubData } from './hub-data'
import { MORE_GROUPS, useGuideGroups } from './tv-guide-shared'
import { groupCounts } from './group-chips'
import { useGroupPicker } from './tv-group-picker'
import { holdMenu } from './programme-actions'
import { useProgrammeArt } from './programme-art'
import { useTint } from './tint'
import { V2, mixHex, v2Ambient, v2Bg } from './v2-tokens'
import { LivePill, LogoPlate, ProgrammeArtBox, V2FocusStyle } from './v2-ui'
import { AccentTag, HubEmptyState, HubGreeting, HubPlaylistPill, V2Progress } from './hub-shared'

/**
 * KANALER, LAYOUT KLASSISK (handoff v2 "Screen 1b").
 *
 * Rullande sida: topprad → spotlight (3 kolumner) → Favoriter → Fortsätt
 * titta → Alla kanaler (6 kolumner, kategorichips). Navigeringen är appens
 * geometriska fokusmotor — inga egna pilar här. Datat är hubbens
 * (`useHubData`, delat med telefonen) och ändras inte.
 */

const SPOTLIGHT_COUNT = 3
const ALL_CHANNELS_COLUMNS = 6
const NO_CHANNEL: M3uChannel = { name: '', logo: null, group: '', url: '', tvgId: null }

/** Kortyta enligt README: yta 2 + 1 px kant. Fokus = `data-v2f="inset"`. */
const CARD = { background: V2.surface2, border: '1px solid rgba(255,255,255,0.10)', overflow: 'hidden', cursor: 'pointer' } as const
const ellipsis = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as const

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: dp(14) }}>
      <span style={{ fontSize: dp(26), fontWeight: 600 }}>{title}</span>
      {sub ? <span style={{ fontSize: dp(17), color: 'rgba(243,244,248,0.55)' }}>{sub}</span> : null}
    </div>
  )
}

export function HubClassic({ model, nav, settings }: TvViewProps): JSX.Element {
  const { tt, locale } = useTvText()
  const isTv = useTvMode()
  const clock = useTvClockNode(locale)
  const { favourites, recent, spotlight, replays, filtered, shown, group, setGroup, visible, setVisible, epgStatus } = useHubData(model, SPOTLIGHT_COUNT)
  const noProgrammeLabel = epgStatus === 'loading' ? tt('loadingGuide') : tt('noProgramme')
  // Kategorichippen i "Alla kanaler". Fler grupper än taket → "Alla grupper
  // (N)" sist, som öppnar grupplistan.
  const chipItems = useGuideGroups(model, tt, group)
  const counts = useMemo(() => groupCounts(model.channels), [model.channels])
  const pickGroup = (key: string | null) => { setGroup(key); setVisible(ALL_STEP) }
  const groupPicker = useGroupPicker({ nav, phone: false, groups: model.groups, counts, value: group, onPick: pickGroup })
  const onChip = (key: string | null) => (key === MORE_GROUPS ? groupPicker.open() : pickGroup(key))

  // Bakgrunden: radial ton ur första spotlightkortets bild (annars logon),
  // README: `radial-gradient(1400px 700px at 20% 0%, mix(tint 38%, bg), bg 70%)`.
  const lead = spotlight[0]?.channel ?? null
  const leadNow = lead ? model.nowFor(lead).now : null
  const { url: leadArt } = useProgrammeArt(lead ?? NO_CHANNEL, lead ? leadNow : null, { lookup: lead !== null })
  const leadLogo = lead ? getLiveTvLogoSrc(lead.logo) ?? getLiveTvLogoSrc(lead.logoFallback) : null
  const tone = useTint(leadArt ?? leadLogo, settings.heroTint && lead !== null)
  const bg = v2Bg(settings.liveBackground)
  const background = settings.heroTint && lead ? `radial-gradient(${dp(1400)}px ${dp(700)}px at 20% 0%, ${mixHex(tone, bg, 38)}, ${bg} 70%)` : v2Ambient(settings.liveBackground)

  const hold = (channel: M3uChannel, programme: EpgProgramme | null) => (el: HTMLElement) => holdMenu({ channel, programme, nav, nowMs: model.nowMs, element: el, tt, locale })
  const liveHold = (channel: M3uChannel) => hold(channel, model.nowFor(channel).now)

  if (model.allChannels.length === 0) return <HubEmptyState testId="hub-classic" model={model} nav={nav} background={bg} />

  const recentRow = recent.filter((c) => !replays.some((r) => channelKey(r.channel) === channelKey(c))).slice(0, 8)
  const pillInit = spotlight.length === 0 && shown.length === 0

  return (
    <div data-testid="hub-classic" data-scroll="" data-bg={background} style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', background, color: V2.text, transition: 'background .6s ease', padding: `${dp(30)}px ${dp(48)}px ${dp(56)}px`, display: 'flex', flexDirection: 'column', gap: dp(30), scrollPaddingTop: dp(120) }}>
      <V2FocusStyle />
      {/* Appen saknar v2-endpointerna (0.1.596+): starten hoppade över
          migreringen med flit, så vyn kan vara tom utan att något är trasigt. */}
      {model.appTooOld ? (
        <div data-testid="live-tv-app-too-old" style={{ padding: `${dp(12)}px ${dp(18)}px`, borderRadius: dp(12), background: TV.accMix(18), color: TV.acc, fontSize: dp(19) }}>{tt('appTooOld')}</div>
      ) : null}
      {/*
        Topprad. `flex-wrap`: i breddgrenen (1280 designpixlar, skrivbordets
        TV-läge i ett fönster smalare än 16:9) ryms inte titel + sökpill (min
        420) + spellista + kanalguide + hälsning/klocka på en rad; det som inte
        får plats går ner på nästa rad i stället för att pressas in i klockan.
      */}
      <div data-testid="hub-topbar" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: dp(16), rowGap: dp(12), flexShrink: 0 }}>
        <div style={{ fontSize: dp(34), fontWeight: 600, marginRight: dp(8) }}>{tt('liveTv')}</div>
        <div {...station(() => nav.go('search'), undefined, { 'data-v2f': 'btn' })} style={{ height: dp(52), minHeight: dp(52), minWidth: dp(420), padding: `0 ${dp(22)}px`, borderRadius: 999, background: V2.surface3, border: '1px solid rgba(255,255,255,0.10)', boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', gap: dp(12), color: 'rgba(243,244,248,0.7)', fontSize: dp(20), cursor: 'pointer' }}>
          <Icons.Search size={dp(20)} /> {tt('searchPlaceholder')}
        </div>
        <HubPlaylistPill model={model} nav={nav} init={pillInit} height={52} onPicked={() => { setGroup(null); setVisible(ALL_STEP) }} />
        <div {...station(() => nav.go('guide'), undefined, { 'data-v2f': 'btn' })} style={{ height: dp(52), minHeight: dp(52), padding: `0 ${dp(22)}px`, borderRadius: 999, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(252,252,255,0.06)', boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', gap: dp(10), fontSize: dp(20), whiteSpace: 'nowrap', cursor: 'pointer' }}>
          <Icons.Calendar /> {tt('guideV2Title')}
        </div>
        <HubGreeting nowMs={model.nowMs} clock={clock} />
      </div>

      {spotlight.length > 0 ? (
        <div data-testid="hub-spotlight" data-row="" style={{ display: 'grid', gridTemplateColumns: `repeat(${SPOTLIGHT_COUNT}, minmax(0, 1fr))`, gap: dp(20), flexShrink: 0 }}>
          {spotlight.map((pick, index) => (
            <SpotlightCard key={channelKey(pick.channel)} pick={pick} init={index === 0} model={model} onOk={() => nav.play({ channel: pick.channel })} onHold={liveHold(pick.channel)} noProgrammeLabel={noProgrammeLabel} />
          ))}
        </div>
      ) : null}

      {favourites.length > 0 ? (
        <section data-testid="hub-favourites" style={{ display: 'flex', flexDirection: 'column', gap: dp(14), flexShrink: 0 }}>
          {/* Fjärrhjälpen bara i TV-läge — utanför finns ingen OK-knapp. */}
          <SectionHead title={tt('favourites')} sub={isTv ? tt('favouritesHubSub', { count: favourites.length }) : tt('channelsCount', { count: favourites.length })} />
          <div data-row="" style={{ display: 'flex', gap: dp(14), overflowX: 'auto', scrollbarWidth: 'none', padding: dp(4) }}>
            {favourites.map((channel) => {
              const info = model.nowFor(channel)
              // OK öppnar kanalguiden med fokus på kanalen (guideskalet läser `params.channel`).
              return (
                <div key={channelKey(channel)} data-testid="hub-favourite" {...station(() => nav.go('guide', { channel: channelKey(channel) }), liveHold(channel), { 'data-v2f': 'inset' })} style={{ ...CARD, flex: `0 0 ${dp(330)}px`, height: dp(96), minHeight: dp(96), borderRadius: dp(14), boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: dp(14), padding: `0 ${dp(16)}px` }}>
                  <LogoPlate channel={channel} width={100} height={58} radius={8} number={model.channelNumber(channel)} />
                  <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: dp(5) }}>
                    <div style={{ fontSize: dp(19), fontWeight: 600, ...ellipsis }}>{channel.name}</div>
                    <div style={{ fontSize: dp(16), color: 'rgba(243,244,248,0.65)', ...ellipsis }}>{info.now?.title ?? noProgrammeLabel}</div>
                    {info.now ? <V2Progress value={progressOf(info.now.start, info.now.stop, model.nowMs)} height={3} track="rgba(252,252,255,.14)" /> : null}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

      {replays.length > 0 || recentRow.length > 0 ? (
        <section data-testid="hub-continue" style={{ display: 'flex', flexDirection: 'column', gap: dp(14), flexShrink: 0 }}>
          <SectionHead title={tt('continueWatching')} sub={tt('continueSub')} />
          <div data-row="" style={{ display: 'flex', gap: dp(14), overflowX: 'auto', scrollbarWidth: 'none', padding: dp(4) }}>
            {replays.map((item: CatchUpItem) => (
              <ContinueCard
                key={`${channelKey(item.channel)}:${item.programme.start}`}
                channel={item.channel}
                programme={item.programme}
                tag={tt('replay')}
                meta={`${item.channel.name} · ${formatClock(item.programme.start, locale)} · ${Math.round((item.programme.stop - item.programme.start) / 60_000)} min`}
                progress={null}
                onOk={() => nav.play({ channel: item.channel, url: item.url, label: item.programme.title })}
                onHold={hold(item.channel, item.programme)}
              />
            ))}
            {recentRow.map((channel) => {
              const now = model.nowFor(channel).now
              return (
                <ContinueCard
                  key={`recent:${channelKey(channel)}`}
                  channel={channel}
                  programme={now}
                  tag={tt('tagContinue')}
                  meta={now ? `${channel.name} · ${tt('minutesLeft', { min: Math.max(0, Math.round((now.stop - model.nowMs) / 60_000)) })}` : channel.name}
                  progress={now ? progressOf(now.start, now.stop, model.nowMs) : null}
                  onOk={() => nav.play({ channel })}
                  onHold={hold(channel, now)}
                />
              )
            })}
          </div>
        </section>
      ) : null}

      <section style={{ display: 'flex', flexDirection: 'column', gap: dp(14), flexShrink: 0 }}>
        {isTv ? (
          // TV: rubrik + underrad på en rad, chippen i högerkant (README 5).
          <div style={{ display: 'flex', alignItems: 'center', gap: dp(14) }}>
            <span style={{ fontSize: dp(26), fontWeight: 600, flexShrink: 0 }}>{tt('allChannels')}</span>
            <span style={{ fontSize: dp(17), color: 'rgba(243,244,248,0.55)', flexShrink: 0 }}>{tt('allChannelsSub', { playlist: model.activePlaylistName ?? tt('allPlaylists'), count: filtered.length })}</span>
            <div data-row="" data-testid="all-channels-filter-row" style={{ marginLeft: 'auto', display: 'flex', gap: dp(8), overflowX: 'auto', scrollbarWidth: 'none', maxWidth: '55%', padding: dp(4) }}>
              {chipItems.map((chip) => (
                <Chip key={chip.id} active={group === chip.key} {...station(() => onChip(chip.key), undefined, { 'data-testid': `chip-${chip.id}`, 'data-v2f': 'btn' })} style={chipStyle(group === chip.key)}>{chip.label}</Chip>
              ))}
            </div>
          </div>
        ) : (
          // Skrivbord (Jerrys återkoppling 2026-09-14): rubriken är bara
          // antalet, filterraden på egen rad med glasytan så chippen syns
          // som klickbara.
          <>
            <span style={{ fontSize: dp(26), fontWeight: 600 }}>{tt('allChannelsCount', { count: filtered.length.toLocaleString(locale) })}</span>
            <div data-row="" data-testid="all-channels-filter-row" style={{ display: 'flex', gap: dp(8), overflowX: 'auto', width: '100%' }}>
              {chipItems.map((chip) => (
                <Chip key={chip.id} active={group === chip.key} glass {...station(() => onChip(chip.key), undefined, { 'data-testid': `chip-${chip.id}`, 'data-v2f': 'btn' })} style={{ height: dp(42), minHeight: dp(42), fontSize: dp(16), padding: `0 ${dp(18)}px` }}>{chip.label}</Chip>
              ))}
            </div>
          </>
        )}
        <div data-testid="all-channels" style={{ display: 'grid', gridTemplateColumns: `repeat(${ALL_CHANNELS_COLUMNS}, minmax(0, 1fr))`, gap: dp(14) }}>
          {shown.map((channel, index) => {
            const info = model.nowFor(channel)
            const number = model.channelNumber(channel)
            const key = channelKey(channel)
            return (
              <div key={key} {...station(() => nav.play({ channel }), liveHold(channel), { 'data-v2f': 'inset', ...(spotlight.length === 0 && index === 0 ? { 'data-init': '' } : {}) })} style={{ ...CARD, borderRadius: dp(14), display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', background: V2.noArt }}>
                  {/* Logoplattan inramad 30 px runt om, 18 px nedtill (README 5). */}
                  <LogoPlate channel={channel} width={0} height={84} radius={8} style={{ position: 'absolute', left: dp(30), right: dp(30), top: dp(30), bottom: dp(18), width: 'auto', height: 'auto', boxShadow: 'none' }} />
                  <span style={{ position: 'absolute', top: dp(6), left: dp(8), fontSize: dp(13), fontWeight: 600, color: 'rgba(243,244,248,0.8)', fontVariantNumeric: 'tabular-nums' }}>{number ?? ''}</span>
                  {model.pinnedSet.has(key) ? <span style={{ position: 'absolute', top: dp(8), right: dp(9), color: TV.acc }}><Icons.Heart size={dp(16)} filled /></span> : null}
                  {model.locked.has(key) ? <span style={{ position: 'absolute', bottom: dp(8), right: dp(9), color: 'rgba(243,244,248,0.55)' }}><Icons.Lock size={dp(16)} /></span> : null}
                  {info.now ? <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}><V2Progress value={progressOf(info.now.start, info.now.stop, model.nowMs)} height={3} track="rgba(0,0,0,0.35)" /></div> : null}
                </div>
                <div style={{ padding: `${dp(10)}px ${dp(12)}px ${dp(12)}px` }}>
                  <div style={{ fontSize: dp(17), fontWeight: 600, ...ellipsis }}>{channel.name}</div>
                  <div style={{ fontSize: dp(15), color: 'rgba(243,244,248,0.65)', ...ellipsis }}>{info.now?.title ?? (qualityFromName(channel.name) ?? channel.group)}</div>
                </div>
              </div>
            )
          })}
        </div>
        {filtered.length > visible ? (
          <div {...station(() => setVisible((v) => v + ALL_STEP), undefined, { 'data-v2f': 'btn' })} style={{ alignSelf: 'center', height: dp(48), minHeight: dp(48), padding: `0 ${dp(24)}px`, borderRadius: 999, background: V2.surface3, display: 'inline-flex', alignItems: 'center', fontSize: dp(18), cursor: 'pointer' }}>{tt('showMore')}</div>
        ) : null}
      </section>
      {groupPicker.node}
    </div>
  )
}

/** Kategorichip i TV-läge (README 5): 42 px, vald = yta .18 + kant .24. */
function chipStyle(active: boolean) {
  return { height: dp(42), minHeight: dp(42), fontSize: dp(16), padding: `0 ${dp(18)}px`, background: active ? 'rgba(252,252,255,0.18)' : 'rgba(252,252,255,0.06)', color: active ? V2.text : V2.text2, border: `1px solid ${active ? 'rgba(255,255,255,0.24)' : 'transparent'}` }
}

function reasonKey(reason: SpotlightReason) {
  return reason === 'favouriteLive' ? 'spotlightFavouriteLive' : reason === 'favourite' ? 'spotlightFavourite' : reason === 'recent' ? 'spotlightRecent' : 'spotlightOnNow'
}

/** Spotlightkort: bild 220 px (programbild eller logoplatta 300×150), text under — aldrig över logon. */
function SpotlightCard({ pick, init, model, onOk, onHold, noProgrammeLabel }: {
  pick: SpotlightPick
  init: boolean
  model: TvViewProps['model']
  onOk: () => void
  onHold: (el: HTMLElement) => void
  noProgrammeLabel: string
}) {
  const { tt, locale } = useTvText()
  const { channel } = pick
  const now = model.nowFor(channel).now
  const number = model.channelNumber(channel)
  const { url } = useProgrammeArt(channel, now, { lookup: true })
  return (
    <div {...station(onOk, onHold, { 'data-v2f': 'inset', ...(init ? { 'data-init': '' } : {}) })} style={{ ...CARD, borderRadius: dp(18), display: 'flex', flexDirection: 'column' }}>
      <ProgrammeArtBox url={url} channel={channel} plate={[300, 150]} height={220} radius={0} />
      <div style={{ padding: `${dp(16)}px ${dp(18)}px ${dp(18)}px`, display: 'flex', flexDirection: 'column', gap: dp(8) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: dp(10), minWidth: 0 }}>
          {now ? <LivePill label={tt('live')} /> : null}
          <span style={{ fontSize: dp(16), color: V2.text2, minWidth: 0, ...ellipsis }}>{number ? `${number} · ` : ''}{channel.name}</span>
          <span style={{ marginLeft: 'auto', flexShrink: 0, fontSize: dp(13), padding: `${dp(4)}px ${dp(10)}px`, borderRadius: dp(6), background: 'rgba(252,252,255,0.12)', color: 'rgba(243,244,248,0.85)', whiteSpace: 'nowrap' }}>{tt(reasonKey(pick.reason))}</span>
        </div>
        <div style={{ fontSize: dp(24), fontWeight: 600, ...ellipsis }}>{now ? now.title : noProgrammeLabel}</div>
        {now ? (
          <>
            <div style={{ fontSize: dp(17), color: 'rgba(243,244,248,0.65)' }}>{`${formatClock(now.start, locale)}–${formatClock(now.stop, locale)} · ${tt('minutesLeft', { min: Math.max(0, Math.round((now.stop - model.nowMs) / 60_000)) })}`}</div>
            <V2Progress value={progressOf(now.start, now.stop, model.nowMs)} height={5} />
          </>
        ) : null}
      </div>
    </div>
  )
}

/** Fortsätt titta-kort: bild 170 px med 4 px förlopp i underkant, ▶ + titel + tagg under. */
function ContinueCard({ channel, programme, tag, meta, progress, onOk, onHold }: {
  channel: M3uChannel
  programme: EpgProgramme | null
  tag: string
  meta: string
  progress: number | null
  onOk: () => void
  onHold: (el: HTMLElement) => void
}) {
  const { url } = useProgrammeArt(channel, programme, { lookup: true })
  return (
    <div data-testid="hub-continue-card" {...station(onOk, onHold, { 'data-v2f': 'inset' })} style={{ ...CARD, flex: `0 0 ${dp(330)}px`, borderRadius: dp(14), display: 'flex', flexDirection: 'column' }}>
      <ProgrammeArtBox url={url} channel={channel} plate={[220, 110]} height={170} radius={0}>
        {progress !== null ? <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}><V2Progress value={progress} height={4} track="rgba(0,0,0,0.4)" /></div> : null}
      </ProgrammeArtBox>
      <div style={{ padding: `${dp(12)}px ${dp(16)}px ${dp(14)}px`, display: 'flex', flexDirection: 'column', gap: dp(4) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: dp(10), minWidth: 0 }}>
          <span style={{ flexShrink: 0, display: 'inline-flex' }}><Icons.Play size={dp(18)} /></span>
          <span style={{ fontSize: dp(19), fontWeight: 600, minWidth: 0, flex: 1, ...ellipsis }}>{programme?.title ?? channel.name}</span>
          <AccentTag>{tag}</AccentTag>
        </div>
        <div style={{ fontSize: dp(15), color: V2.text3, ...ellipsis }}>{meta}</div>
      </div>
    </div>
  )
}
