'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import type { TvGlassMenuAction } from '@/lib/plugin-sdk'
import { channelKey, type M3uChannel } from '../../live-tv-data'
import { formatClock, progressOf } from '../../live-tv-ui'
import type { LiveTvPlayerControls, LiveTvPlayerTvProps } from '../tv-player-types'
import { station } from '../tv-ui'
import { useTvText } from '../tv-strings'
import { MT, clamp2, ellipsis } from './mobile-tokens'
import { MIcons } from './mobile-icons'
import { MobileLogo } from './mobile-logo'
import { MobileChannelRow } from './mobile-channel-row'
import { MobileSheet } from './mobile-sheet'

/**
 * Scenens låda i porträtt (handoffen §10: video överst, 16:9 + lite luft).
 *
 * Delad med `live-tv-player.tsx`, som ger själva scenen samma mått, så att
 * överlägget här (absolut i spelarroten) alltid täcker exakt videon och
 * inget av infokolumnen under. `maxHeight` håller videon ovanför mitten på
 * korta, breda telefoner så zap-listan alltid får plats.
 */
export const PHONE_STAGE_BOX: CSSProperties = { aspectRatio: '16 / 9', maxHeight: '45vh' }

/** Rader på var sida om den spelande kanalen i zap-listan (utöver favoriterna). */
const ZAP_WINDOW = 25

/**
 * Arken inne i spelaren ligger UTANFÖR skalets lagerstack: spelaren är en
 * portal på `document.body` och skalets `pushLayer` finns inte här. Escape
 * hanteras därför av kromets egen tangentlyssnare nedan. Stabil referens —
 * arkets effekt beror på `pushLayer`.
 */
const noLayer = () => () => {}

/** Sidopadding i liggande: 60 px, men aldrig innanför telefonens urtag. */
const SAFE_SIDE_L = 'max(60px, env(safe-area-inset-left, 0px))'
const SAFE_SIDE_R = 'max(60px, env(safe-area-inset-right, 0px))'

type Sheet = 'audio' | 'more' | null

function Round({ size, label, onPress, background = 'rgba(0,0,0,0.55)', children }: { size: number; label: string; onPress: () => void; background?: string; children: ReactNode }) {
  return (
    <div {...station(onPress, undefined, { 'aria-label': label })} style={{ width: size, height: size, minHeight: size, flexShrink: 0, borderRadius: 999, background, color: MT.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
      {children}
    </div>
  )
}

function Pill({ label, onPress, disabled = false }: { label: string; onPress?: () => void; disabled?: boolean }) {
  const shared: CSSProperties = { height: 44, minHeight: 44, padding: '0 16px', borderRadius: 999, background: MT.s10, border: `1px solid ${MT.line08}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', boxSizing: 'border-box', flexShrink: 0 }
  if (disabled || !onPress) return <div aria-disabled="true" style={{ ...shared, color: MT.muted }}>{label}</div>
  return <div {...station(onPress)} style={{ ...shared, color: MT.text, cursor: 'pointer' }}>{label}</div>
}

function LiveTag({ label }: { label: string }) {
  return <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', padding: '3px 7px', borderRadius: 7, background: MT.liveSoft, color: MT.liveText, flexShrink: 0 }}>{label}</span>
}

function ProgressBar({ value, height }: { value: number; height: number }) {
  return (
    <div style={{ flex: 1, minWidth: 0, height, borderRadius: height, background: 'rgba(252,252,255,0.22)', overflow: 'hidden' }}>
      <div style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`, height: '100%', background: MT.acc }} />
    </div>
  )
}

/**
 * Telefonens spelarkrom (handoffen §10–11).
 *
 * Porträtt: överlägget täcker BARA videon (`PHONE_STAGE_BOX`) och allt annat
 * — kanalrad, titel, knapprutnät, zap-lista — ligger i en rullbar kolumn
 * UNDER den, som flex-barn i spelarroten. Info och kontroller kan därför
 * aldrig överlappa varandra eller bilden.
 *
 * Liggande: scenen fyller skärmen, toppraden och bannern ligger ovanpå med
 * safe-area-luft; bannerns infoblock krymper (`flex 1; minWidth 0`) medan
 * kontrollerna behåller sin bredd (`flex 0 0 auto`) och förloppet får en
 * egen rad — de tre reglerna som tog bort det gamla överlappet.
 *
 * Ingen mini-guide, ingen klocka i porträtt, ingen glasmeny: telefonens
 * bottenark (`MobileSheet`) ersätter allt sådant. Inga fönsterlyssnare för
 * pekarrörelse — ett tryck på videon visar/döljer överlägget.
 */
export function TvPlayerChromePhone({ channel, tv, controls, paused, onTogglePause, onClose, landscape }: { channel: M3uChannel; tv: LiveTvPlayerTvProps; controls?: LiveTvPlayerControls; paused: boolean; onTogglePause: () => void; onClose: () => void; landscape: boolean }) {
  const { tt } = useTvText()
  const [visible, setVisible] = useState(true)
  const [sheet, setSheet] = useState<Sheet>(null)
  const timerRef = useRef<number | null>(null)
  const info = tv.nowFor(channel)
  const hideMs = tv.bannerHideMs

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])
  // Samma göm-timer som skrivbordskromet: 0 = dölj aldrig, och ett öppet ark
  // håller överlägget kvar tills arket stängts.
  const reveal = useCallback(() => {
    setVisible(true)
    clearTimer()
    if (hideMs > 0 && !sheet) timerRef.current = window.setTimeout(() => setVisible(false), hideMs)
  }, [hideMs, sheet, clearTimer])
  useEffect(() => { reveal(); return clearTimer }, [reveal, clearTimer, channel])

  // Tryck i videon: på en knapp → håll överlägget framme (timern om), annars
  // växla. Ingen `pointermove` på fönstret — på telefon finns ingen mus, och
  // varje rullning i infokolumnen hade annars räknats som "musen rör sig".
  const onStageTap = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target instanceof Element ? event.target : null
    if (target?.closest('[role="button"]')) { reveal(); return }
    if (visible) { clearTimer(); setVisible(false) } else reveal()
  }, [visible, reveal, clearTimer])

  // Escape/Bakåt: ett öppet ark stängs först — spelaren stängs bara när inget
  // ark är uppe. Capture + stopImmediatePropagation av samma skäl som i
  // skrivbordskromet: spelaren och skalet lyssnar på samma fönster.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' && event.key !== 'Backspace') return
      if (tv.gateOpen) return
      event.preventDefault()
      event.stopImmediatePropagation()
      if (sheet) { setSheet(null); return }
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [sheet, tv.gateOpen, onClose])

  const closeSheet = useCallback(() => setSheet(null), [])

  /**
   * Zap-listan: favoriterna först, sedan ett FÖNSTER runt den spelande
   * kanalen. `tv.neighbours` är hela spellistan (tiotusentals rader i IPTV),
   * och varje rad slår upp EPG — samma skäl som skrivbordskromets mini-guide
   * fönstrar. Numret är kanalens plats i listan, som modellens numrering utan
   * aktiv källa.
   */
  const pinnedSet = useMemo(() => new Set(tv.pinnedKeys), [tv.pinnedKeys])
  const zap = useMemo(() => {
    const current = channelKey(channel)
    const pinned: { channel: M3uChannel; number: number }[] = []
    const rest: { channel: M3uChannel; number: number }[] = []
    tv.neighbours.forEach((c, i) => (pinnedSet.has(channelKey(c)) ? pinned : rest).push({ channel: c, number: i + 1 }))
    const index = rest.findIndex((entry) => channelKey(entry.channel) === current)
    const window = index < 0 ? rest.slice(0, ZAP_WINDOW * 2) : rest.slice(Math.max(0, index - ZAP_WINDOW), index + ZAP_WINDOW + 1)
    return [...pinned, ...window]
  }, [tv.neighbours, pinnedSet, channel])

  const numberName = `${tv.channelNumber ? `${tv.channelNumber} · ` : ''}${channel.name}`
  const minutesLeft = info.now ? tt('minutesLeft', { min: Math.max(0, Math.round((info.now.stop - tv.nowMs) / 60_000)) }) : null
  const timeLine = info.now ? `${formatClock(info.now.start, tv.locale)}–${formatClock(info.now.stop, tv.locale)} · ${minutesLeft}` : null
  const nextLine = info.next ? `${tt('nextLabel')} ${info.next.title} · ${formatClock(info.next.start, tv.locale)}` : null
  const progress = info.now ? progressOf(info.now.start, info.now.stop, tv.nowMs) : 0
  const qualityLabel = tv.quality ?? tt('autoQuality')
  const favLabel = tv.favourite ? tt('menuRemoveFavourite') : tt('menuAddFavourite')

  const audioItems: TvGlassMenuAction[] = controls
    ? [
        { key: 'aspect', label: `${tt('playerAspect')}: ${controls.aspectLabel}`, run: controls.onCycleAspect },
        { key: 'mute', label: controls.muted ? tt('playerUnmute') : tt('playerMute'), run: controls.onToggleMute },
      ]
    : []
  // Skrivbordskromets ⋯-poster utom `guide` — guiden har en egen pill i bannern.
  const moreItems: TvGlassMenuAction[] = [
    { key: 'multi', label: tt('menuMultiview'), run: tv.onOpenMultiview },
    { key: 'pause', label: paused ? tt('menuResume') : tt('menuPause'), run: onTogglePause },
    { key: 'fav', label: favLabel, run: tv.onToggleFavourite },
    { key: 'info', label: tt('menuChannelDetails'), run: tv.onOpenChannelDetails },
  ]
  const sheetNode = sheet ? (
    <MobileSheet
      title={sheet === 'audio' ? tt('audioSubs') : channel.name}
      subtitle={info.now?.title}
      items={sheet === 'audio' ? audioItems : moreItems}
      onClose={closeSheet}
      pushLayer={noLayer}
      testId={sheet === 'audio' ? 'phone-audio-sheet' : 'phone-more-sheet'}
    />
  ) : null

  const fade: CSSProperties = { opacity: visible ? 1 : 0, transition: 'opacity 200ms', pointerEvents: visible ? 'auto' : 'none' }
  const muteBtn = (size: number) => (controls ? (
    <Round size={size} label={controls.muted ? tt('playerUnmute') : tt('playerMute')} onPress={controls.onToggleMute} background={size >= 44 ? MT.s10 : 'rgba(0,0,0,0.55)'}>
      {controls.muted ? <MIcons.SpeakerSlash size={22} /> : <MIcons.SpeakerHigh size={22} />}
    </Round>
  ) : null)

  if (landscape) {
    return (
      <>
        <div data-testid="phone-landscape" onPointerDown={onStageTap} style={{ position: 'absolute', inset: 0, zIndex: 30, color: MT.text, fontFamily: MT.font }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: `max(44px, env(safe-area-inset-top, 0px)) ${SAFE_SIDE_R} 0 ${SAFE_SIDE_L}`, display: 'flex', alignItems: 'center', gap: 12, ...fade }}>
            <Round size={40} label={tt('back')} onPress={onClose}><MIcons.CaretLeft size={22} /></Round>
            <span style={{ flex: 1, fontSize: 15, color: 'rgba(243,244,248,0.78)', ...ellipsis }}>{numberName}</span>
            <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'rgba(243,244,248,0.78)' }}>
              {info.now ? <LiveTag label={tt('live')} /> : null}
              <span>{[tv.quality, formatClock(tv.nowMs, tv.locale)].filter(Boolean).join(' · ')}</span>
            </span>
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: `72px ${SAFE_SIDE_R} max(22px, env(safe-area-inset-bottom, 0px)) ${SAFE_SIDE_L}`, background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.9) 55%)', display: 'flex', flexDirection: 'column', gap: 12, ...fade }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
              <div data-testid="phone-landscape-info" style={{ flex: 1, minWidth: '0px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 26, fontWeight: 600, ...ellipsis }}>{info.now?.title ?? channel.name}</div>
                {timeLine ? <div style={{ fontSize: 14, color: MT.muted70, ...ellipsis }}>{timeLine}{nextLine ? ` · ${nextLine}` : ''}</div> : null}
              </div>
              <div data-testid="phone-landscape-controls" style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                {muteBtn(44)}
                <Pill label={qualityLabel} disabled />
                <Pill label={tt('menuGuide')} onPress={tv.onOpenGuide} />
                <Round size={44} label={tt('moreActions')} onPress={() => setSheet('more')} background={MT.s10}><MIcons.DotsThree size={22} /></Round>
              </div>
            </div>
            <div data-testid="phone-landscape-progress" style={{ display: 'flex' }}>
              <ProgressBar value={progress} height={5} />
            </div>
          </div>
        </div>
        {sheetNode}
      </>
    )
  }

  return (
    <>
      <div data-testid="phone-stage-tap" onPointerDown={onStageTap} style={{ position: 'absolute', top: 0, left: 0, right: 0, ...PHONE_STAGE_BOX, zIndex: 30, color: MT.text, fontFamily: MT.font }}>
        <div data-testid="phone-overlay" style={{ position: 'absolute', inset: 0, ...fade }}>
          <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Round size={40} label={tt('back')} onPress={onClose}><MIcons.CaretLeft size={22} /></Round>
            <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(243,244,248,0.85)' }}>
              {info.now ? <LiveTag label={tt('live')} /> : null}
              {tv.quality ? <span>{tv.quality}</span> : null}
            </span>
          </div>
          <div style={{ position: 'absolute', left: 12, right: 12, bottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            {muteBtn(40)}
            <ProgressBar value={progress} height={4} />
            {controls ? (
              <Round size={40} label={tt('playerFullscreen')} onPress={controls.onToggleFullscreen}><MIcons.ArrowsOut size={22} /></Round>
            ) : null}
          </div>
        </div>
      </div>
      <div data-testid="phone-info" style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: 16, paddingBottom: `calc(16px + ${MT.SAFE_BOTTOM})`, display: 'flex', flexDirection: 'column', gap: 14, background: MT.bg, color: MT.text, fontFamily: MT.font }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 44 }}>
          <MobileLogo channel={channel} width={52} height={34} />
          <span style={{ flex: 1, fontSize: 14, color: MT.muted70, ...ellipsis }}>{numberName}</span>
          <Round size={44} label={favLabel} onPress={tv.onToggleFavourite} background={tv.favourite ? MT.accMix(22) : MT.s10}>
            <span style={{ display: 'flex', color: tv.favourite ? MT.acc : MT.text }}><MIcons.Heart size={22} filled={tv.favourite} /></span>
          </Round>
        </div>
        <div data-testid="phone-title" style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.2, ...clamp2 }}>{info.now?.title ?? channel.name}</div>
        {timeLine ? <div style={{ fontSize: 14, color: MT.muted70, ...ellipsis }}>{timeLine}</div> : null}
        {nextLine ? <div style={{ fontSize: 14, color: MT.muted, ...ellipsis }}>{nextLine}</div> : null}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <GridBtn label={tt('audioSubs')} onPress={() => setSheet('audio')} />
          <GridBtn label={qualityLabel} />
          <GridBtn label={tt('menuChannelDetails')} onPress={tv.onOpenChannelDetails} />
          <GridBtn label={tt('menuGuide')} onPress={tv.onOpenGuide} />
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>{tt('zapList')}</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {zap.map((entry) => (
            <MobileChannelRow
              key={channelKey(entry.channel)}
              channel={entry.channel}
              number={entry.number}
              now={tv.nowFor(entry.channel)}
              nowMs={tv.nowMs}
              locale={tv.locale}
              pinned={pinnedSet.has(channelKey(entry.channel))}
              variant="zap"
              noProgrammeLabel={tt('noProgramme')}
              onPress={() => tv.onSwitchChannel(entry.channel)}
            />
          ))}
        </div>
      </div>
      {sheetNode}
    </>
  )
}

/** Knapprutnätets ruta (46 px, radius 12); utan `onPress` ritas den som ett passivt värde. */
function GridBtn({ label, onPress }: { label: string; onPress?: () => void }) {
  const shared: CSSProperties = { minHeight: 46, padding: '0 12px', borderRadius: 12, background: MT.s08, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, boxSizing: 'border-box' }
  if (!onPress) return <div aria-disabled="true" style={{ ...shared, color: MT.muted }}><span style={ellipsis}>{label}</span></div>
  return <div {...station(onPress)} style={{ ...shared, color: MT.text, cursor: 'pointer' }}><span style={ellipsis}>{label}</span></div>
}
